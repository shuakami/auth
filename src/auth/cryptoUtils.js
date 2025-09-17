/* 
 * AES-256-GCM 加/解密实现
 */
import crypto from 'crypto';
import { APP_KEY } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
// AES-256-GCM 推荐使用 12 字节 (96 位) IV
const IV_LENGTH = 12;
// GCM 会生成 16 字节 (128 位) 的认证标签
const AUTH_TAG_LENGTH = 16;

// 将环境变量中的 16 进制密钥转换为 Buffer（此处不抛错，保持与原行为一致，失败在调用时处理）
let _key = null;
if (typeof APP_KEY === 'string') {
  try {
    const maybe = Buffer.from(APP_KEY, 'hex');
    if (maybe.length === 32) {
      _key = maybe;
    }
  } catch {
    // 忽略：在 encrypt/decrypt 内部统一处理为失败分支
  }
}

/**
 * 轻量获取已解析密钥
 * @returns {Buffer|null}
 */
function getKey() {
  return _key;
}

/**
 * 加密文本
 * @param {string} text - 需要加密的明文
 * @returns {string} - 加密后的字符串，格式为 "iv_hex:tag_hex:encrypted_hex"
 * @throws {Error} 如果加密失败
 */
export function encrypt(text) {
  try {
    const key = getKey();
    if (!key) {
      // 与原实现保持等价的失败外观：抛出同样的错误信息
      throw new Error('Invalid key');
    }

    // 1) 生成随机 IV（原位填充，减少一次额外分配开销）
    const iv = crypto.randomFillSync(Buffer.allocUnsafe(IV_LENGTH));

    // 2) 创建加密器实例
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 3) 以 Buffer 输出，避免多段 hex 字符串中间态
    const p1 = cipher.update(text, 'utf8'); // Buffer
    const p2 = cipher.final();              // Buffer

    // 4) 仅在必要时做 concat，减少一次内存拷贝
    let encryptedBuf;
    if (p1.length === 0) {
      encryptedBuf = p2;
    } else if (p2.length === 0) {
      encryptedBuf = p1;
    } else {
      encryptedBuf = Buffer.concat([p1, p2], p1.length + p2.length);
    }

    // 5) 获取认证标签
    const tag = cipher.getAuthTag();

    // 6) 统一在末尾做一次 hex 转换
    const ivHex = iv.toString('hex');
    const tagHex = tag.toString('hex');
    const encryptedHex = encryptedBuf.toString('hex');

    // 7) 合成最终字符串
    // 注意：字符串拼接比 Array.join 更省分配，因我们已知仅有两次冒号
    return ivHex + ':' + tagHex + ':' + encryptedHex;
  } catch (error) {
    // 与原实现保持一致的日志与对外错误
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
    const key = getKey();
    if (!key) {
      console.error('解密失败: 无效的密钥长度');
      return null;
    }

    // 1) 手写解析，避免 split 带来的中间数组与多余子串
    const c1 = encryptedText.indexOf(':');
    if (c1 < 0) {
      console.error('解密失败: 加密文本格式无效');
      return null;
    }
    const c2 = encryptedText.indexOf(':', c1 + 1);
    if (c2 < 0) {
      console.error('解密失败: 加密文本格式无效');
      return null;
    }

    const ivHex = encryptedText.slice(0, c1);
    const tagHex = encryptedText.slice(c1 + 1, c2);
    const encryptedHex = encryptedText.slice(c2 + 1);

    // 2) 将 hex 编码转回 Buffer（一次性完成）
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // 3) 长度检查（IV 与 Tag）
    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
      console.error('解密失败: IV 或 Tag 长度无效');
      return null;
    }

    // 4) 创建解密器实例，并设置认证标签
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // 5) 以 Buffer 解密，最终一次性转为 utf8
    const d1 = decipher.update(encrypted); // Buffer
    const d2 = decipher.final();           // Buffer

    if (d1.length === 0 && d2.length === 0) {
      return '';
    }
    if (d2.length === 0) {
      return d1.toString('utf8');
    }
    if (d1.length === 0) {
      return d2.toString('utf8');
    }
    return Buffer.concat([d1, d2], d1.length + d2.length).toString('utf8');
  } catch (error) {
    // 捕获解密或认证失败
    console.error('解密失败或认证标签不匹配:', error && error.message ? error.message : error);
    return null;
  }
}
