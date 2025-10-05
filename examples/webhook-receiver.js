/**
 * Sitemap Monitor Webhook 接收器示例
 * 
 * 使用方法：
 * 1. npm install express
 * 2. node examples/webhook-receiver.js
 * 3. 配置 Webhook URL: http://localhost:4000/webhook
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 4000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key';

// 保存原始请求体用于签名验证
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// 验证 Webhook 签名
function verifySignature(body, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Webhook 端点
app.post('/webhook', (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('📨 收到 Webhook 请求');
  console.log('='.repeat(60));
  
  // 验证签名
  const signature = req.headers['x-sitemap-signature'];
  if (signature) {
    const isValid = verifySignature(req.rawBody, signature, WEBHOOK_SECRET);
    console.log(`🔐 签名验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);
    
    if (!isValid) {
      console.log('⚠️  签名不匹配，拒绝请求');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } else {
    console.log('⚠️  未提供签名');
  }
  
  // 立即响应（避免超时）
  res.status(200).json({ received: true });
  
  // 异步处理通知
  const notification = req.body;
  
  console.log(`\n📋 通知类型: ${notification.type}`);
  console.log(`🌐 站点: ${notification.siteSlug || notification.siteId}`);
  console.log(`🆔 扫描 ID: ${notification.scanId}`);
  
  if (notification.type === 'scan.complete') {
    handleScanComplete(notification);
  } else if (notification.type === 'sitemap.change') {
    handleSitemapChange(notification);
  }
  
  console.log('='.repeat(60) + '\n');
});

// 处理扫描完成通知
function handleScanComplete(notification) {
  console.log(`\n📊 扫描完成通知`);
  console.log(`状态: ${notification.status === 'success' ? '✅ 成功' : '❌ 失败'}`);
  
  if (notification.status === 'success') {
    console.log(`\n统计信息:`);
    console.log(`  • 总 Sitemap 数: ${notification.totalSitemaps || 0}`);
    console.log(`  • 总 URL 数: ${notification.totalUrls || 0}`);
    console.log(`  • 新增: ${notification.added || 0}`);
    console.log(`  • 删除: ${notification.removed || 0}`);
    console.log(`  • 更新: ${notification.updated || 0}`);
    
    if (notification.duration) {
      console.log(`  • 耗时: ${(notification.duration / 1000).toFixed(2)} 秒`);
    }
    
    // 业务逻辑示例
    if (notification.added > 0) {
      console.log(`\n💡 发现 ${notification.added} 个新页面，可以触发索引更新`);
    }
    
    if (notification.removed > 0) {
      console.log(`\n⚠️  有 ${notification.removed} 个页面被移除，可能需要处理 404`);
    }
  } else {
    console.log(`\n❌ 错误信息: ${notification.error || '未知错误'}`);
    
    if (notification.duration) {
      console.log(`⏱️  失败前耗时: ${(notification.duration / 1000).toFixed(2)} 秒`);
    }
    
    // 失败处理示例
    console.log(`\n💡 建议: 检查站点可访问性或 Sitemap 格式`);
  }
  
  console.log(`\n🕐 时间: ${new Date(notification.ts * 1000).toLocaleString()}`);
}

// 处理 Sitemap 变更通知
function handleSitemapChange(notification) {
  console.log(`\n🔄 Sitemap 变更通知`);
  console.log(`  • 新增: ${notification.added || 0}`);
  console.log(`  • 删除: ${notification.removed || 0}`);
  console.log(`  • 更新: ${notification.updated || 0}`);
  console.log(`\n🕐 时间: ${new Date(notification.ts * 1000).toLocaleString()}`);
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Webhook 接收器已启动');
  console.log('='.repeat(60));
  console.log(`📍 监听端口: ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Secret: ${WEBHOOK_SECRET}`);
  console.log(`\n💡 配置方法:`);
  console.log(`   curl -X POST "http://localhost:3000/api/sites/{siteId}/notifications" \\`);
  console.log(`     -H "Cookie: session=your-session" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"type":"webhook","target":"http://localhost:${PORT}/webhook","secret":"${WEBHOOK_SECRET}"}'`);
  console.log('='.repeat(60) + '\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n👋 正在关闭服务器...');
  process.exit(0);
});
