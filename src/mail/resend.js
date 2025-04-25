import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import { RESEND_API_KEY, MAIL_FROM } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../email-templates');

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

const compiledTemplates = new Map();
function getCompiledTemplate(templateName) {
  if (compiledTemplates.has(templateName)) {
    return compiledTemplates.get(templateName);
  }
  try {
    const templatePath = path.join(templatesDir, `${templateName}.html`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);
    compiledTemplates.set(templateName, compiledTemplate);
    return compiledTemplate;
  } catch (error) {
    console.error(`加载邮件模板 ${templateName} 失败:`, error);
    throw new Error(`无法加载邮件模板 ${templateName}`);
  }
}

/**
 * 通用邮件发送函数
 * @param {string} to 收件人
 * @param {string} subject 主题
 * @param {string} templateName 模板文件名 (不含.html后缀)
 * @param {object} data 模板数据
 * @returns {Promise<boolean>} 发送是否成功
 */
async function sendEmail(to, subject, templateName, data) {
  if (!resend) {
    console.warn('Resend 未配置，跳过发送邮件。请检查 RESEND_API_KEY 环境变量。');
    return false;
  }

  if (!canSendEmail(to)) {
    console.warn(`邮箱 ${to} 触发发送频率限制（每小时最多10封）`);
    return false;
  }

  try {
    const template = getCompiledTemplate(templateName);
    // 添加当前年份到模板数据
    const fullData = { ...data, currentYear: new Date().getFullYear() };
    const htmlContent = template(fullData);

    console.log(`正在发送邮件 (${subject}) 到 ${to}`);
    const result = await resend.emails.send({
      from: MAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html: htmlContent,
    });

    console.log(`邮件发送结果:`, result);
    return !!(result?.data?.id);
  } catch (error) {
    console.error(`发送邮件 (${subject}) 到 ${to} 失败:`, error);
    return false;
  }
}

/**
 * 发送验证邮件
 * @param {string} to 收件人
 * @param {string} link 验证链接
 * @returns {Promise<boolean>} 发送是否成功
 */
export async function sendVerifyEmail(to, link) {
  return sendEmail(to, '请验证您的邮箱', 'verify-email', { link });
}

/**
 * 发送重置密码邮件
 * @param {string} to 收件人
 * @param {string} link 重置密码链接
 * @returns {Promise<boolean>} 发送是否成功
 */
export async function sendResetPasswordEmail(to, link) {
  return sendEmail(to, '重置您的密码', 'reset-password', { link });
}
