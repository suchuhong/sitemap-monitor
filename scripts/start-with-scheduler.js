#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 设置环境变量
process.env.ENABLE_INTERNAL_SCHEDULER = 'true';
process.env.SCHEDULER_TYPE = process.env.SCHEDULER_TYPE || 'advanced';
process.env.SCAN_CRON_SCHEDULE = process.env.SCAN_CRON_SCHEDULE || '*/5 * * * *';
process.env.SCHEDULER_TIMEZONE = process.env.SCHEDULER_TIMEZONE || 'Asia/Shanghai';

console.log('🚀 Starting application with internal scheduler...');
console.log(`📅 Scheduler type: ${process.env.SCHEDULER_TYPE}`);
console.log(`⏰ Scan schedule: ${process.env.SCAN_CRON_SCHEDULE}`);
console.log(`🌍 Timezone: ${process.env.SCHEDULER_TIMEZONE}`);

// 启动 Next.js 应用
const nextProcess = spawn('npm', ['run', process.env.NODE_ENV === 'production' ? 'start' : 'dev'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  nextProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  nextProcess.kill('SIGTERM');
});

nextProcess.on('exit', (code) => {
  console.log(`\n✅ Application exited with code ${code}`);
  process.exit(code);
});