import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createScopeColumnEnsurer,
  buildInsertTokenQuery,
  buildRotateInsertQuery,
  buildSelectTokenByIdText,
  buildFindReplacementText,
} from './scopeColumn.js';

// 构造一个可注入的假连接：记录执行过的 SQL，按 information_schema 查询返回指定行。
function makeFakeConnect({ columnExists, alterShouldThrow = false, selectShouldThrow = false }) {
  const calls = { connects: 0, releases: 0, queries: [] };
  const connect = async () => {
    calls.connects += 1;
    return {
      query: async (sql) => {
        const text = typeof sql === 'string' ? sql : sql.text;
        calls.queries.push(text);
        if (/information_schema\.columns/.test(text)) {
          if (selectShouldThrow) {
            throw new Error('boom-select');
          }
          return { rows: columnExists ? [{ '?column?': 1 }] : [] };
        }
        if (/ALTER TABLE/.test(text)) {
          if (alterShouldThrow) {
            throw new Error('no DDL permission');
          }
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {
        calls.releases += 1;
      },
    };
  };
  return { connect, calls };
}

test('ensurer: 列已存在 → true，不执行 ALTER，且缓存（多次调用只连一次）', async () => {
  const { connect, calls } = makeFakeConnect({ columnExists: true });
  const ensure = createScopeColumnEnsurer({ connect });
  assert.equal(await ensure(), true);
  assert.equal(await ensure(), true);
  assert.equal(calls.connects, 1, '应缓存，仅连接一次');
  assert.equal(calls.releases, 1);
  assert.ok(!calls.queries.some((q) => /ALTER TABLE/.test(q)), '不应执行 ALTER');
});

test('ensurer: 列缺失 → 执行一次 ALTER ... ADD COLUMN IF NOT EXISTS，返回 true', async () => {
  const { connect, calls } = makeFakeConnect({ columnExists: false });
  const ensure = createScopeColumnEnsurer({ connect });
  assert.equal(await ensure(), true);
  const alters = calls.queries.filter((q) => /ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS scope TEXT/.test(q));
  assert.equal(alters.length, 1, '应执行恰好一次补列');
});

test('ensurer: 探测/补列出错 → 返回 false 且降级，后续调用可重试', async () => {
  const { connect, calls } = makeFakeConnect({ columnExists: false, alterShouldThrow: true });
  const ensure = createScopeColumnEnsurer({ connect });
  assert.equal(await ensure(), false, '补列失败应降级为 false');
  // 失败后缓存被清空：再次调用应重新尝试（再连接一次）
  await ensure();
  assert.ok(calls.connects >= 2, '失败后应允许重试，而非永久缓存 false');
});

test('buildInsertTokenQuery: 带 scope 变体含 scope 列与 9 个值', () => {
  const td = { id: 'i', userId: 'u', encryptedToken: 'e', deviceInfo: 'd', expiresAt: 'x', createdAt: 'c', scope: 'a b' };
  const q = buildInsertTokenQuery(true, {
    names: { withScope: 'WS', noScope: 'NS' },
    tokenData: td,
    parentId: 'p',
    clientId: 'cid',
  });
  assert.equal(q.name, 'WS');
  assert.match(q.text, /, scope\)/);
  assert.match(q.text, /\$9/);
  assert.equal(q.values.length, 9);
  assert.equal(q.values[8], 'a b');
});

test('buildInsertTokenQuery: 不带 scope 变体绝不引用 scope 列，只有 8 个值', () => {
  const td = { id: 'i', userId: 'u', encryptedToken: 'e', deviceInfo: 'd', expiresAt: 'x', createdAt: 'c', scope: 'a b' };
  const q = buildInsertTokenQuery(false, {
    names: { withScope: 'WS', noScope: 'NS' },
    tokenData: td,
    parentId: 'p',
    clientId: 'cid',
  });
  assert.equal(q.name, 'NS');
  assert.ok(!/scope/.test(q.text), '降级变体不得引用 scope 列');
  assert.ok(!/\$9/.test(q.text));
  assert.equal(q.values.length, 8);
});

test('buildRotateInsertQuery: 带/不带 scope 两种变体的列数与取值正确', () => {
  const td = { id: 'i', userId: 'u', encryptedToken: 'e', deviceInfo: 'd', expiresAt: 'x', createdAt: 'c' };
  const withScope = buildRotateInsertQuery(true, {
    names: { withScope: 'WS', noScope: 'NS' },
    tokenData: td,
    parentId: 'parent',
    clientId: 'cid',
    scope: 'openid security.read',
  });
  assert.equal(withScope.name, 'WS');
  assert.match(withScope.text, /, scope\)/);
  assert.equal(withScope.values.length, 9);
  assert.equal(withScope.values[4], 'parent');
  assert.equal(withScope.values[8], 'openid security.read');

  const noScope = buildRotateInsertQuery(false, {
    names: { withScope: 'WS', noScope: 'NS' },
    tokenData: td,
    parentId: 'parent',
    clientId: 'cid',
    scope: 'openid security.read',
  });
  assert.equal(noScope.name, 'NS');
  assert.ok(!/scope/.test(noScope.text));
  assert.equal(noScope.values.length, 8);
});

test('buildSelectTokenByIdText: 仅在 hasScope 时选择 scope 列', () => {
  assert.match(buildSelectTokenByIdText(true), /client_id, scope/);
  assert.ok(!/scope/.test(buildSelectTokenByIdText(false)));
});

test('buildFindReplacementText: 仅在 hasScope 时选择 scope 列', () => {
  assert.match(buildFindReplacementText(true), /created_at, scope/);
  assert.ok(!/scope/.test(buildFindReplacementText(false)));
});
