import { Resend } from 'resend';
import { RESEND_API_KEY, MAIL_FROM } from '../config/env.js';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * 发送验证邮件
 * @param {string} to 收件人
 * @param {string} link 验证链接
 */
export async function sendVerifyEmail(to, link) {
  if (!resend) {
    console.warn('Resend 未配置，跳过发送邮件');
    return;
  }
  await resend.emails.send({
    from: MAIL_FROM,
    to,
    subject: '请验证您的邮箱',
    html: `<p>点击下方链接完成邮箱验证：</p><p><a href="${link}">${link}</a></p>`
  });
}
