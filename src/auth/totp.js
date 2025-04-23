import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export function generateTotpSecret() {
  const secret = speakeasy.generateSecret({ length: 20 });
  return { base32: secret.base32, otpauth: secret.otpauth_url };
}

export function verifyTotp(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
}

export async function otpauthToDataURL(otpauth) {
  return await qrcode.toDataURL(otpauth);
}
