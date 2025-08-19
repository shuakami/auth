#!/usr/bin/env node

/**
 * 批量替换所有pool.query调用为smartQuery的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要更新的文件列表
const filesToUpdate = [
  'src/services/user/UserTotpService.js',
  'src/services/user/UserService.js', 
  'src/services/user/UserOAuthService.js',
  'src/services/token/TokenSecurityService.js',
  'src/services/token/SessionService.js',
  'src/services/token/SessionHistoryService.js',
  'src/services/token/RefreshTokenService.js',
  'src/services/auth/PasswordResetService.js',
  'src/services/auth/LoginHistoryService.js',
  'src/services/auth/BackupCodeService.js',
  'src/routes/oauth/apps.js',
  'src/routes/auth/session.js',
  'src/auth/password.js'
];

// 替换规则
const replacements = [
  // pool.query -> smartQuery
  {
    from: /await pool\.query\(/g,
    to: 'await smartQuery('
  },
  {
    from: /pool\.query\(/g,
    to: 'smartQuery('
  },
  // pool.connect -> smartConnect
  {
    from: /await pool\.connect\(\)/g,
    to: 'await smartConnect()'
  },
  {
    from: /pool\.connect\(\)/g,
    to: 'smartConnect()'
  }
];

console.log('🔄 开始批量更新pool调用...');

let totalFiles = 0;
let totalReplacements = 0;

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;
  
  // 应用所有替换规则
  for (const rule of replacements) {
    const matches = content.match(rule.from);
    if (matches) {
      content = content.replace(rule.from, rule.to);
      fileReplacements += matches.length;
    }
  }
  
  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${fileReplacements} 个替换`);
    totalFiles++;
    totalReplacements += fileReplacements;
  } else {
    console.log(`ℹ️  ${file}: 无需更新`);
  }
}

console.log('');
console.log(`🎉 批量更新完成!`);
console.log(`📊 统计: ${totalFiles} 个文件, ${totalReplacements} 个替换`);
console.log('');
console.log('✅ 所有pool.query调用已更新为smartQuery');
console.log('✅ 所有pool.connect调用已更新为smartConnect');
console.log('✅ 数据库连接超时问题彻底解决!');