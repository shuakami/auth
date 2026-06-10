import { verifyAccessToken } from '../auth/jwt.js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function parseScopes(scope) {
  if (!scope || typeof scope !== 'string') {
    return [];
  }

  return scope.split(/\s+/).filter(Boolean);
}

export function requireOidcScopes(...requiredScopes) {
  return (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing Bearer access token'
      });
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.type !== 'access_token' || !payload.uid || !payload.client_id) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token is not a valid OIDC access token'
      });
    }

    const scopes = parseScopes(payload.scope);
    const hasRequiredScope = requiredScopes.some(scope => scopes.includes(scope));
    if (!hasRequiredScope) {
      res.set('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${requiredScopes.join(' ')}"`);
      return res.status(403).json({
        error: 'insufficient_scope',
        error_description: `Requires one of: ${requiredScopes.join(', ')}`,
        required_scopes: requiredScopes,
        granted_scopes: scopes
      });
    }

    req.user = { id: payload.uid };
    req.oidc = {
      clientId: payload.client_id,
      scopes,
      tokenPayload: payload
    };

    next();
  };
}
