#!/bin/bash

# 改进的构建和部署脚本

set -e  # 遇到错误时退出

echo "🚀 开始构建和部署到 Cloudflare Pages..."

# 1. 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf .next .vercel

# 2. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 3. 构建 Next.js 应用
echo "🔨 构建 Next.js 应用..."
pnpm run build

# 4. 使用 next-on-pages 转换为 Cloudflare Pages 格式
echo "⚡ 转换为 Cloudflare Pages 格式..."
pnpm run build:cf

# 5. 部署到 Cloudflare Pages
echo "☁️ 部署到 Cloudflare Pages..."
pnpm run deploy

echo "✅ 部署完成！"
echo "🌐 你的应用现在应该在 Cloudflare Pages 上运行了"