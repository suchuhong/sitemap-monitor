#!/bin/bash

# 部署脚本 - 使用 OpenNext.js for Cloudflare

echo "🚀 开始部署到 Cloudflare Pages..."

# 1. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 2. 构建项目
echo "🔨 构建项目..."
pnpm run build

# 3. 部署到 Cloudflare Pages
echo "☁️ 部署到 Cloudflare Pages..."
pnpm run deploy

echo "✅ 部署完成！"