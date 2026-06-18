import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldIssueRefreshToken,
  resolveRefreshScope,
  buildRefreshTokenPayload,
} from './refreshPolicy.js';

test('shouldIssueRefreshToken: 开启 issue_refresh_token 即签发，不再额外强依赖 offline_access', () => {
  // 修复「普通登录无法续期」：只要管理员为客户端开启了 issue_refresh_token 就应签发，
  // 即使过滤后的 scope 不含 offline_access。
  assert.equal(shouldIssueRefreshToken({ issue_refresh_token: true }), true);
  assert.equal(
    shouldIssueRefreshToken({ issue_refresh_token: true, scopes: '["openid"]' }),
    true,
  );
});

test('shouldIssueRefreshToken: 未开启或缺省时不签发', () => {
  assert.equal(shouldIssueRefreshToken({ issue_refresh_token: false }), false);
  assert.equal(shouldIssueRefreshToken({}), false);
  assert.equal(shouldIssueRefreshToken(null), false);
  assert.equal(shouldIssueRefreshToken(undefined), false);
});

test('resolveRefreshScope: 优先取 DB 列上的 scope（修复续期后 scope 丢失）', () => {
  const scope = resolveRefreshScope(
    { scope: 'openid profile security.read security.write offline_access' },
    { scope: 'openid' },
  );
  assert.equal(scope, 'openid profile security.read security.write offline_access');
});

test('resolveRefreshScope: DB 无 scope 时回退到 JWT 载荷的 scope', () => {
  assert.equal(resolveRefreshScope({ scope: null }, { scope: 'openid profile' }), 'openid profile');
  assert.equal(resolveRefreshScope(null, { scope: 'openid' }), 'openid');
});

test('resolveRefreshScope: 都缺失时返回 null（而非 undefined）', () => {
  assert.equal(resolveRefreshScope(null, null), null);
  assert.equal(resolveRefreshScope({}, {}), null);
  assert.equal(resolveRefreshScope(undefined, undefined), null);
});

test('buildRefreshTokenPayload: 存在 scope 时写入载荷，使其随轮换流转', () => {
  const payload = buildRefreshTokenPayload({
    id: 'jti-1',
    userId: 'user-1',
    deviceInfo: 'UA/1.0',
    scope: 'openid security.read',
  });
  assert.deepEqual(payload, {
    jti: 'jti-1',
    uid: 'user-1',
    device: 'UA/1.0',
    scope: 'openid security.read',
  });
});

test('buildRefreshTokenPayload: 无 scope 时不写入 scope 字段', () => {
  const payload = buildRefreshTokenPayload({ id: 'jti-2', userId: 'user-2', deviceInfo: 'UA' });
  assert.equal('scope' in payload, false);
  assert.deepEqual(payload, { jti: 'jti-2', uid: 'user-2', device: 'UA' });

  const emptyScope = buildRefreshTokenPayload({ id: 'jti-3', userId: 'u', deviceInfo: 'x', scope: '' });
  assert.equal('scope' in emptyScope, false);
});
