# Quick Start Guide

## 🚀 开发环境运行

```bash
cd tension-control-sim

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问: http://localhost:5173

## 📦 构建部署

### 方法1: 手动构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 方法2: 使用脚本

```bash
./build.sh
```

## 🌐 部署到 GitHub Pages

### 选项A: 直接部署到根目录

```bash
# 1. 构建项目
npm run build

# 2. 复制到根目录的 tension-control-sim 文件夹
mkdir -p ../tension-control-sim-deployed
cp -r dist/* ../tension-control-sim-deployed/

# 3. 提交到 gh-pages 分支
git add ../tension-control-sim-deployed
git commit -m "Deploy tension control simulator"
git push origin gh-pages
```

### 选项B: 作为子项目部署

在主网站的导航菜单中添加链接：

```html
<a href="/tension-control-sim/" target="_blank">Tension Control Sim</a>
```

## 📝 修改配置

如果需要修改部署路径，编辑 `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/your-path/',  // 修改这里
})
```

## 🔧 项目结构

```
tension-control-sim/
├── src/
│   ├── App.jsx                      # 主应用组件
│   ├── simulateTensionControl.js   # 物理模型核心
│   ├── R2RCanvas.jsx               # 可视化画布
│   ├── TensionChart.jsx            # 张力图表
│   └── SimulationPanel.jsx         # 结果面板
├── index.html                       # HTML 入口
├── package.json                     # 依赖配置
├── vite.config.js                  # Vite 配置
└── README.md                        # 项目文档
```

## 🎯 主要特性

1. **伺服张力控制**: Unwind/Rewind 主动控制
2. **材料数据库**: 6种锂电池常用材料
3. **实时拖拽**: 调整辊子位置
4. **危险预警**: 超应变自动检测
5. **摩擦模型**: 考虑辊子摩擦影响

## 🛠️ 技术栈

- React 18.3
- Vite 6.0
- 原生 JavaScript (物理引擎)
- Canvas API (可视化)

## 📊 与 Speed Match 模式对比

| 特性 | Speed Match | Tension Control |
|------|-------------|-----------------|
| Unwind | 被动 | 伺服控制 |
| Rewind | 被动 | 伺服控制 |
| 张力分布 | 分区递增 | 平滑过渡 |
| 应用场景 | 涂布、分切 | 复合、叠片 |

## 🐛 故障排除

### 依赖安装失败

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install
```

### 端口被占用

修改端口：
```bash
npm run dev -- --port 3000
```

### 构建失败

检查 Node.js 版本：
```bash
node --version  # 需要 >= 18.0.0
```

## 📞 支持

问题反馈: vzhu@voltamission.com
