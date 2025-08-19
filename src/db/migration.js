#!/usr/bin/env node

/**
 * 独立的数据库迁移脚本
 * 用于在部署前预先初始化数据库
 * 避免在serverless函数启动时执行DDL
 */

import { init } from './index.js';

console.log('🚀 Starting database migration...');

try {
  await init();
  console.log('✅ Database migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Database migration failed:', error);
  process.exit(1);
}