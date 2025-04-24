import { Resend } from 'resend';
import { RESEND_API_KEY, MAIL_FROM } from '../config/env.js';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// 限流器 / 每个邮箱每小时最多10封
const emailSendMap = new Map();
const EMAIL_LIMIT = 10;
const EMAIL_WINDOW = 60 * 60 * 1000; // 1小时

function canSendEmail(to) {
  const now = Date.now();
  const record = emailSendMap.get(to) || { count: 0, ts: now };
  if (now - record.ts > EMAIL_WINDOW) {
    // 窗口过期，重置
    emailSendMap.set(to, { count: 1, ts: now });
    return true;
  }
  if (record.count < EMAIL_LIMIT) {
    emailSendMap.set(to, { count: record.count + 1, ts: record.ts });
    return true;
  }
  return false;
}

/**
 * 发送验证邮件
 * @param {string} to 收件人
 * @param {string} link 验证链接
 * @returns {Promise<boolean>} 发送是否成功
 */
export async function sendVerifyEmail(to, link) {
  if (!resend) {
    console.warn('Resend 未配置，跳过发送邮件。请检查 RESEND_API_KEY 环境变量。');
    return false;
  }
  
  if (!canSendEmail(to)) {
    console.warn(`邮箱 ${to} 触发发送频率限制（每小时最多10封）`);
    return false;
  }
  
  try {
    console.log(`正在发送验证邮件到 ${to}`);
    const result = await resend.emails.send({
      from: MAIL_FROM || 'onboarding@resend.dev',
    to,
    subject: '请验证您的邮箱',
    html: `<p>点击下方链接完成邮箱验证：</p><p><a href="${link}">${link}</a></p>`
  });
    
    console.log(`邮件发送结果:`, result);
    return !!(result?.data?.id);
  } catch (error) {
    console.error('发送验证邮件失败:', error);
    return false;
  }
}

/**
 * 发送重置密码邮件
 * @param {string} to 收件人
 * @param {string} link 重置密码链接
 * @returns {Promise<boolean>} 发送是否成功
 */
export async function sendResetPasswordEmail(to, link) {
  if (!resend) {
    console.warn('Resend 未配置，跳过发送邮件。请检查 RESEND_API_KEY 环境变量。');
    return false;
  }
  
  if (!canSendEmail(to)) {
    console.warn(`邮箱 ${to} 触发发送频率限制（每小时最多10封）`);
    return false;
  }
  
  try {
    console.log(`正在发送重置密码邮件到 ${to}`);
    const result = await resend.emails.send({
      from: MAIL_FROM || 'onboarding@resend.dev',
      to,
      subject: '重置您的密码',
      html: `<p>您请求了重置密码操作。</p><p>请点击下方链接重置您的密码（30分钟内有效）：</p><p><a href="${link}">${link}</a></p>`
    });
    console.log(`重置密码邮件发送结果:`, result);
    return !!(result?.data?.id);
  } catch (error) {
    console.error('发送重置密码邮件失败:', error);
    return false;
  }
}
