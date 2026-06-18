import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isDefaultTrue,
  createIssueRefreshTokenDefaultEnsurer,
} from './issueRefreshTokenDefault.js';

function makeFakeConnect({ columnDefault, throwOn = null }) {
  const calls = { connects: 0, releases: 0, queries: [] };
  const connect = async () => {
    calls.connects += 1;
    return {
      query: async (sql) => {
        const text = typeof sql === 'string' ? sql : sql.text;
        calls.queries.push(text);
        if (throwOn && throwOn.test(text)) {
          throw new Error('boom');
        }
        if (/information_schema\.columns/.test(text)) {
          return { rows: [{ column_default: columnDefault }] };
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

test('isDefaultTrue: 仅在字符串含 true 时为真', () => {
  assert.equal(isDefaultTrue('true'), true);
  assert.equal(isDefaultTrue('TRUE'), true);
  assert.equal(isDefaultTrue('false'), false);
  assert.equal(isDefaultTrue(null), false);
  assert.equal(isDefaultTrue(undefined), false);
});

test('ensurer: 默认已为 TRUE → 跳过 backfill/ALTER（尊重后续显式关闭），且缓存', async () => {
  const { connect, calls } = makeFakeConnect({ columnDefault: 'true' });
  const ensure = createIssueRefreshTokenDefaultEnsurer({ connect });
  assert.equal(await ensure(), true);
  assert.equal(await ensure(), true);
  assert.equal(calls.connects, 1, '应缓存，仅连接一次');
  assert.ok(!calls.queries.some((q) => /UPDATE oauth_applications/.test(q)), '不应 backfill');
  assert.ok(!calls.queries.some((q) => /ALTER TABLE/.test(q)), '不应改默认');
});

test('ensurer: 默认为 FALSE → backfill 存量为 TRUE 并把默认改成 TRUE', async () => {
  const { connect, calls } = makeFakeConnect({ columnDefault: 'false' });
  const ensure = createIssueRefreshTokenDefaultEnsurer({ connect });
  assert.equal(await ensure(), true);
  const updates = calls.queries.filter((q) => /UPDATE oauth_applications SET issue_refresh_token = TRUE/.test(q));
  const alters = calls.queries.filter((q) => /ALTER COLUMN issue_refresh_token SET DEFAULT TRUE/.test(q));
  assert.equal(updates.length, 1, '应 backfill 一次');
  assert.equal(alters.length, 1, '应改默认一次');
});

test('ensurer: 无默认(null) → 视为未迁移，执行 backfill', async () => {
  const { connect, calls } = makeFakeConnect({ columnDefault: null });
  const ensure = createIssueRefreshTokenDefaultEnsurer({ connect });
  assert.equal(await ensure(), true);
  assert.ok(calls.queries.some((q) => /UPDATE oauth_applications/.test(q)));
});

test('ensurer: 出错 → 返回 false 且清缓存可重试', async () => {
  const { connect, calls } = makeFakeConnect({ columnDefault: 'false', throwOn: /ALTER TABLE/ });
  const ensure = createIssueRefreshTokenDefaultEnsurer({ connect });
  assert.equal(await ensure(), false);
  await ensure();
  assert.ok(calls.connects >= 2, '失败后应允许重试');
});
