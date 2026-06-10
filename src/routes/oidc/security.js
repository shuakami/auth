import express from 'express';
import bcrypt from 'bcryptjs';
import { authLimiter } from '../../middlewares/rateLimit.js';
import { requireOidcScopes } from '../../middlewares/oidcResource.js';
import { generateTotpSecret, otpauthToDataURL, verifyTotp } from '../../auth/totp.js';
import { encrypt, decrypt } from '../../auth/cryptoUtils.js';
import {
  generateAndSaveBackupCodes,
  getRemainingBackupCodesCount,
  verifyBackupCode
} from '../../auth/backupCodes.js';
import * as User from '../../services/userService.js';
import * as WebAuthnCredential from '../../services/webauthnCredentialService.js';

const router = express.Router();

const requireSecurityRead = requireOidcScopes('security.read', 'security.write');
const requireSecurityWrite = requireOidcScopes('security.write');

function toCredentialResponse(credential) {
  return {
    id: credential.id,
    credentialId: credential.credential_id,
    name: credential.name,
    deviceType: credential.credential_device_type,
    backedUp: credential.credential_backed_up,
    transports: credential.transports ? JSON.parse(credential.transports) : [],
    createdAt: credential.created_at,
    lastUsedAt: credential.last_used_at
  };
}

async function requirePassword(user, password) {
  if (!user.password_hash) {
    const error = new Error('password_not_set');
    error.status = 409;
    throw error;
  }

  if (!password) {
    const error = new Error('password_required');
    error.status = 400;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const error = new Error('invalid_password');
    error.status = 401;
    throw error;
  }
}

function sendKnownError(res, error) {
  const status = error.status || 500;
  const descriptions = {
    password_not_set: 'The user has no password and cannot complete password confirmation',
    password_required: 'Password confirmation is required',
    invalid_password: 'Password confirmation failed'
  };

  return res.status(status).json({
    error: error.message,
    error_description: descriptions[error.message] || 'Security management request failed'
  });
}

router.get('/me/security', requireSecurityRead, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const [backupCodesRemaining, credentials] = await Promise.all([
      getRemainingBackupCodesCount(user.id),
      WebAuthnCredential.getCredentialsByUserId(user.id)
    ]);

    res.json({
      ok: true,
      data: {
        user: {
          sub: user.id,
          email: user.email,
          username: user.username
        },
        totp: {
          enabled: !!user.totp_enabled,
          configured: !!user.totp_secret
        },
        backupCodes: {
          remaining: backupCodesRemaining
        },
        webauthn: {
          enabled: credentials.length > 0,
          count: credentials.length,
          credentials: credentials.map(toCredentialResponse)
        },
        client: {
          clientId: req.oidc.clientId,
          scopes: req.oidc.scopes
        }
      }
    });
  } catch (error) {
    console.error('[OIDC Security] Failed to get security status:', error);
    res.status(500).json({ error: 'security_status_failed' });
  }
});

router.post('/me/security/totp/setup', requireSecurityWrite, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    await requirePassword(user, req.body?.password);

    const { base32, otpauth } = generateTotpSecret(user.email);
    const qr = await otpauthToDataURL(otpauth);
    await User.setTotp(user.id, encrypt(base32));
    const backupCodes = await generateAndSaveBackupCodes(user.id);

    res.json({
      ok: true,
      data: {
        qr,
        secret: base32,
        otpauthUrl: otpauth,
        backupCodes
      }
    });
  } catch (error) {
    if (error.status) return sendKnownError(res, error);
    console.error('[OIDC Security] Failed to set up TOTP:', error);
    res.status(500).json({ error: 'totp_setup_failed' });
  }
});

router.post('/me/security/totp/verify', requireSecurityWrite, authLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'token_required' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.totp_secret) {
      return res.status(409).json({ error: 'totp_not_configured' });
    }

    const secret = decrypt(user.totp_secret);
    if (!secret) {
      return res.status(500).json({ error: 'totp_secret_decrypt_failed' });
    }

    if (!verifyTotp(secret, token)) {
      return res.status(401).json({ error: 'invalid_totp_token' });
    }

    await User.enableTotp(user.id);
    res.json({ ok: true, data: { enabled: true } });
  } catch (error) {
    console.error('[OIDC Security] Failed to verify TOTP:', error);
    res.status(500).json({ error: 'totp_verify_failed' });
  }
});

router.delete('/me/security/totp', requireSecurityWrite, authLimiter, async (req, res) => {
  try {
    const { token, backupCode } = req.body || {};
    if (!token && !backupCode) {
      return res.status(400).json({ error: 'verification_required' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.totp_enabled) {
      return res.status(409).json({ error: 'totp_not_enabled' });
    }

    let verified = false;
    if (token) {
      const secret = decrypt(user.totp_secret);
      if (!secret) {
        return res.status(500).json({ error: 'totp_secret_decrypt_failed' });
      }
      verified = verifyTotp(secret, token);
    } else {
      verified = await verifyBackupCode(user.id, backupCode);
    }

    if (!verified) {
      return res.status(401).json({ error: 'invalid_second_factor' });
    }

    await User.disableTotp(user.id);
    res.json({ ok: true, data: { enabled: false } });
  } catch (error) {
    console.error('[OIDC Security] Failed to disable TOTP:', error);
    res.status(500).json({ error: 'totp_disable_failed' });
  }
});

router.post('/me/security/backup-codes', requireSecurityWrite, authLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    if (!user.totp_enabled) {
      return res.status(409).json({ error: 'totp_not_enabled' });
    }

    await requirePassword(user, req.body?.password);
    const codes = await generateAndSaveBackupCodes(user.id);

    res.json({ ok: true, data: { codes } });
  } catch (error) {
    if (error.status) return sendKnownError(res, error);
    console.error('[OIDC Security] Failed to regenerate backup codes:', error);
    res.status(500).json({ error: 'backup_codes_generate_failed' });
  }
});

router.get('/me/security/webauthn/credentials', requireSecurityRead, async (req, res) => {
  try {
    const credentials = await WebAuthnCredential.getCredentialsByUserId(req.user.id);
    res.json({
      ok: true,
      data: {
        credentials: credentials.map(toCredentialResponse),
        count: credentials.length
      }
    });
  } catch (error) {
    console.error('[OIDC Security] Failed to list WebAuthn credentials:', error);
    res.status(500).json({ error: 'webauthn_credentials_list_failed' });
  }
});

router.put('/me/security/webauthn/credentials/:credentialId/name', requireSecurityWrite, async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    if (!name) {
      return res.status(400).json({ error: 'name_required' });
    }

    const updated = await WebAuthnCredential.updateCredentialNameById(
      req.params.credentialId,
      req.user.id,
      name
    );
    if (!updated) {
      return res.status(404).json({ error: 'credential_not_found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('[OIDC Security] Failed to rename WebAuthn credential:', error);
    res.status(500).json({ error: 'webauthn_credential_rename_failed' });
  }
});

router.delete('/me/security/webauthn/credentials/:credentialId', requireSecurityWrite, authLimiter, async (req, res) => {
  try {
    const deleted = await WebAuthnCredential.deleteCredentialById(
      req.params.credentialId,
      req.user.id
    );
    if (!deleted) {
      return res.status(404).json({ error: 'credential_not_found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('[OIDC Security] Failed to delete WebAuthn credential:', error);
    res.status(500).json({ error: 'webauthn_credential_delete_failed' });
  }
});

export default router;
