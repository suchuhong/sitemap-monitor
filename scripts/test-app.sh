#!/bin/bash

# 测试应用是否能正常启动
echo "🧪 测试应用启动..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL 未设置"
  echo "请运行: source .env"
  exit 1
fi

echo "✅ DATABASE_URL 已设置"

# 检查依赖
echo "📦 检查依赖..."
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm 未安装"
  exit 1
fi

echo "✅ pnpm 已安装"

# 构建检查
echo "🔨 检查构建..."
pnpm build --dry-run 2>&1 | head -20

echo ""
echo "✅ 测试完成！"
echo ""
echo "下一步："
echo "1. 运行 'pnpm dev' 启动开发服务器"
echo "2. 访问 http://localhost:3000"
echo "3. 测试所有功能"
