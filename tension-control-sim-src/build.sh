#!/bin/bash

# Tension Control Simulator 构建和部署脚本

echo "🔨 Building Tension Control Simulator..."

# 安装依赖
npm install

# 构建项目
npm run build

echo "✅ Build complete! Output in dist/"
echo ""
echo "📦 To deploy to GitHub Pages:"
echo "1. Copy dist/ contents to your gh-pages branch"
echo "2. Or run: cp -r dist/* ../tension-control-sim/"
echo ""
echo "🌐 Access at: https://yourdomain.com/tension-control-sim/"
