import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index.js';
import crypto from 'crypto';

/**
 * 生成指定数量的随机备份码
 * @param {number} count 需要生成的备份码数量，默认为 10
 * @returns {string[]} 生成的备份码数组
 */
function generateBackupCodes(count = 10) {
  // 生成 8 位随机字母数字组合的备份码
  const codes = [];
  for (let i = 0; i < count; i++) {
    // 使用 crypto.randomBytes 生成真随机数
    const bytes = crypto.randomBytes(4);
    // 转换为 8 位的字母数字字符串，去掉容易混淆的字符（0, O, 1, I, l）
    const code = bytes.toString('base64')
      .replace(/[+/]/g, '') // 移除 base64 的特殊字符
      .replace(/[01IOl]/g, '') // 移除容易混淆的字符
      .slice(0, 8) // 取前 8 位
      .toUpperCase(); // 转为大写
    codes.push(code);
  }
  return codes;
}

/**
 * 为用户生成并存储新的备份码
 * @param {string} userId 用户 ID
 * @returns {Promise<string[]>} 生成的备份码数组（明文，用于显示给用户）
 */
export async function generateAndSaveBackupCodes(userId) {
  const codes = generateBackupCodes();
  const client = await pool.connect();

  try {
    // 开启事务
    await client.query('BEGIN');

    // 删除用户现有的所有备份码
    await client.query('DELETE FROM backup_codes WHERE user_id = $1', [userId]);

    // 存储新的备份码
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      await client.query(
        'INSERT INTO backup_codes (id, user_id, code_hash) VALUES ($1, $2, $3)',
        [uuidv4(), userId, hash]
      );
    }

    // 提交事务
    await client.query('COMMIT');
    return codes; // 返回明文备份码，供显示给用户
  } catch (err) {
    // 如果出错，回滚事务
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 验证用户的备份码
 * @param {string} userId 用户 ID
 * @param {string} code 用户输入的备份码
 * @returns {Promise<boolean>} 验证是否成功
 */
export async function verifyBackupCode(userId, code) {
  const client = await pool.connect();

  try {
    // 开启事务
    await client.query('BEGIN');

    // 获取用户所有未使用的备份码
    const result = await client.query(
      'SELECT id, code_hash FROM backup_codes WHERE user_id = $1 AND used = false',
      [userId]
    );

    // 遍历所有未使用的备份码，尝试匹配
    for (const row of result.rows) {
      const match = await bcrypt.compare(code, row.code_hash);
      if (match) {
        // 找到匹配的备份码，将其标记为已使用
        await client.query(
          'UPDATE backup_codes SET used = true, used_at = CURRENT_TIMESTAMP WHERE id = $1',
          [row.id]
        );
        await client.query('COMMIT');
        return true;
      }
    }

    // 没有找到匹配的备份码
    await client.query('COMMIT');
    return false;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 检查用户是否还有可用的备份码
 * @param {string} userId 用户 ID
 * @returns {Promise<boolean>} 是否有可用的备份码
 */
export async function hasAvailableBackupCodes(userId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = $1 AND used = false',
    [userId]
  );
  return result.rows[0].count > 0;
}

/**
 * 获取用户剩余的未使用备份码数量
 * @param {string} userId 用户 ID
 * @returns {Promise<number>} 剩余的未使用备份码数量
 */
export async function getRemainingBackupCodesCount(userId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = $1 AND used = false',
    [userId]
  );
  return parseInt(result.rows[0].count);
} 