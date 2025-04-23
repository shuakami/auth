import crypto from 'crypto';
import { APP_KEY } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
// AES-256-GCM 推荐使用 12 字节 (96 位) IV
const IV_LENGTH = 12;
// GCM 会生成 16 字节 (128 位) 的认证标签
const AUTH_TAG_LENGTH = 16;

// 从环境变量获取应用密钥 (必须是 32 字节)
const key = Buffer.from(APP_KEY, 'hex');

/**
 * 加密文本
 * @param {string} text - 需要加密的明文
 * @returns {string} - 加密后的字符串，格式为 "iv_hex:tag_hex:encrypted_hex"
 * @throws {Error} 如果加密失败
 */
export function encrypt(text) {
  try {
    // 1. 生成随机的初始向量 (IV)
    const iv = crypto.randomBytes(IV_LENGTH);

    // 2. 创建加密器实例
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 3. 更新加密内容 (输入为 utf8, 输出为 hex)
    let encrypted = cipher.update(text, 'utf8', 'hex');
    // 4. 结束加密 (获取剩余部分)
    encrypted += cipher.final('hex');

    // 5. 获取认证标签 (Authentication Tag)
    const tag = cipher.getAuthTag();

    // 6. 组合 IV, Tag 和密文，用 : 分隔 (全部用 hex 编码)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('Encryption failed.');
  }
}

/**
 * 解密文本
 * @param {string} encryptedText - 加密后的字符串，格式为 "iv_hex:tag_hex:encrypted_hex"
 * @returns {string | null} - 解密后的明文，如果解密或验证失败则返回 null
 */
export function decrypt(encryptedText) {
  try {
    // 1. 解析出 IV, Tag 和密文
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.error('解密失败: 加密文本格式无效');
      return null;
    }
    const [ivHex, tagHex, encryptedHex] = parts;

    // 2. 将 hex 编码转回 Buffer
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // 3. 检查长度是否符合预期 (简单校验)
    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
        console.error('解密失败: IV 或 Tag 长度无效');
        return null;
    }

    // 4. 创建解密器实例
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // 5. 设置认证标签 (必须在 update/final 之前设置)
    decipher.setAuthTag(tag);

    // 6. 更新解密内容 (输入为 hex, 输出为 utf8)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');

    // 7. 结束解密 (获取剩余部分)
    decrypted += decipher.final('utf8');

    // 8. 返回解密后的明文
    return decrypted;
  } catch (error) {
    // 捕获解密或验证失败的错误 (如 tag 不匹配)
    console.error('解密失败或认证标签不匹配:', error.message);
    return null;
  }
}
