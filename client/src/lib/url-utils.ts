/**
 * 检查给定的 URI 是否是允许的域内的安全重定向目标。
 * 仅允许 https 协议和 *.sdjz.wiki 或 sdjz.wiki 域。
 * @param uri 要验证的 URI 字符串。
 * @returns 如果 URI 安全，则为 true，否则为 false。
 */
export function isSafeRedirectUri(uri: string | null | undefined): uri is string {
  if (!uri) {
    return false;
  }
  try {
    const url = new URL(uri);
    // 允许根域和所有子域，强制 HTTPS
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'sdjz.wiki' || url.hostname.endsWith('.sdjz.wiki'))
    );
  } catch (e) {
    // 无效的 URL 格式
    console.error('[isSafeRedirectUri] Invalid redirect URI format:', uri, e);
    return false;
  }
} 