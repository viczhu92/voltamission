# Tension Control R2R Simulator

伺服张力控制模式的卷对卷（Roll-to-Roll）制造模拟器。

## 核心特性

- **伺服张力控制**: Unwind 和 Rewind 都使用伺服电机主动控制张力
- **材料数据库**: 内置铜箔、铝箔、正负极、隔膜等锂电池材料
- **实时可视化**: 拖拽调整辊子位置，观察张力分布变化
- **危险预警**: 自动检测超应变区段

## 物理模型

### 与 Speed Match 模式的区别

| 特性 | Speed Match | Tension Control |
|------|-------------|-----------------|
| 控制方式 | 驱动辊控制速度 | 伺服电机控制张力 |
| Unwind | 被动放卷 | 主动张力控制 |
| Rewind | 被动收卷 | 主动张力控制 |
| 张力分布 | 分区递增 | 全线平滑过渡 |
| 适用场景 | 涂布、分切 | 精密复合、叠片 |

### 控制方程

```javascript
// 张力控制器
dT/dt = -k × (T - T_setpoint)

// 应变响应
ε = T / EA

// 边界条件
T_unwind = T_unwind_setpoint (伺服控制)
T_rewind = T_rewind_setpoint (伺服控制)
```

## 安装运行

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
```

构建产物在 `dist/` 目录，可直接部署到 GitHub Pages。

## 使用说明

1. **选择材料**: 铜箔、铝箔、正负极、隔膜等
2. **设置参数**: 厚度、宽度、线长度
3. **调整张力**: Unwind 和 Rewind 的目标张力
4. **布局辊子**: 拖拽辊子位置，添加 Dancer 缓冲
5. **运行仿真**: 观察张力分布和应变历史

## 技术栈

- React 18
- Vite 6
- 原生 Canvas API

## License

MIT
