# R2R 模拟器模式对比

## 📊 两种控制模式

VoltaMission 提供两个独立的 R2R 模拟器，分别针对不同的工艺场景：

### 1. Speed Match (速度匹配模式)
📁 **目录**: `r2r-sim original/`
🔗 **访问**: `/r2r-sim/`

### 2. Tension Control (张力控制模式)
📁 **目录**: `tension-control-sim/`
🔗 **访问**: `/tension-control-sim/`

---

## 🔧 核心区别

### Speed Match 模式

**控制原理:**
- **Pitch Roller (驱动辊)** 主动控制速度
- Unwind/Rewind 被动跟随
- 张力是速度不匹配的结果

**物理模型:**
```
dε/dt = strainGain × Δv - damping × (ε - ε_set)
T = EA × ε
```

**应用场景:**
- ✅ 涂布线（coating）
- ✅ 分切线（slitting）
- ✅ 烘干工序
- ✅ 连续生产线

**优势:**
- 速度控制简单可靠
- 适合高速生产
- 分区独立控制

**劣势:**
- 张力波动较大
- 对材料变化敏感
- 需要精确的速度匹配

---

### Tension Control 模式

**控制原理:**
- **Unwind/Rewind 伺服电机** 主动控制张力
- 中间辊子被动传递
- 速度是张力平衡的结果

**物理模型:**
```
dT/dt = -k × (T - T_setpoint)
ε = T / EA
```

**应用场景:**
- ✅ 精密复合（lamination）
- ✅ 极片叠片（stacking）
- ✅ 多层对位（registration）
- ✅ 柔性材料处理

**优势:**
- 张力控制精确
- 适合柔性材料
- 全线张力平滑

**劣势:**
- 控制复杂度高
- 需要高性能伺服
- 成本较高

---

## 📈 参数对比

| 参数 | Speed Match | Tension Control |
|------|-------------|-----------------|
| **控制变量** | 速度 (m/s) | 张力 (N) |
| **Unwind** | 被动放卷 | 伺服张力控制 |
| **Rewind** | 被动收卷 | 伺服张力控制 |
| **Pitch Roller** | 主动驱动 | 不需要 |
| **Dancer** | 缓冲速度差 | 缓冲张力波动 |
| **张力分布** | 分区递增 | 线性过渡 |
| **摩擦影响** | 小 | 显著 |

---

## 🎯 选择指南

### 选择 Speed Match，如果你的工艺是：

1. **高速连续生产**
   - 线速度 > 5 m/s
   - 产能优先
   
2. **刚性材料**
   - 铜箔、铝箔
   - 涂层基材
   
3. **单一工序**
   - 涂布
   - 烘干
   - 分切

4. **成本敏感**
   - 标准电机即可
   - 控制系统简单

---

### 选择 Tension Control，如果你的工艺是：

1. **精密复合**
   - 多层对位精度 < 50 µm
   - 需要恒张力
   
2. **柔性材料**
   - 隔膜
   - 薄膜
   - 易变形材料
   
3. **多工序集成**
   - 涂布 + 复合
   - 分切 + 叠片
   
4. **高端产品**
   - 质量优先
   - 废品率要求低

---

## 🔬 物理模型深度对比

### Speed Match: 应变驱动模型

**状态变量**: 应变 ε
**控制输入**: 速度差 Δv
**输出**: 张力 T = EA × ε

**动力学**:
```
每个 zone:
  dε/dt = (v_in - v_out) / L - damping × (ε - ε_set)
  T = EA × ε
```

**关键机制**:
- Pitch Roller 分割张力区
- 每区独立应变目标
- Dancer 增加阻尼

---

### Tension Control: 张力驱动模型

**状态变量**: 张力 T
**控制输入**: 张力设定 T_setpoint
**输出**: 应变 ε = T / EA

**动力学**:
```
每个 zone:
  dT/dt = -k × (T - T_desired)
  T_desired = f(位置, 摩擦, 边界条件)
  ε = T / EA
```

**关键机制**:
- Unwind/Rewind 伺服控制
- 张力沿线线性分布
- 摩擦导致张力梯度

---

## 🧪 典型参数设置

### Speed Match 示例

```javascript
// 铜箔涂布线
{
  material: "copper_foil",
  thickness: 70 µm,
  width: 0.12 m,
  lineSpeed: 1.0 m/s,
  baseStrain: 5e-5,  // 0.005%
  strainStep: 5e-5,  // 每区递增 0.005%
}
```

### Tension Control 示例

```javascript
// 隔膜复合线
{
  material: "separator",
  thickness: 20 µm,
  width: 0.15 m,
  T_unwind: 20 N,
  T_rewind: 35 N,
  frictionCoeff: 0.02,
  lineSpeed: 0.5 m/s,
}
```

---

## 🚀 快速上手

### 运行 Speed Match 模拟器

```bash
cd "r2r-sim original"
npm install
npm run dev
```

### 运行 Tension Control 模拟器

```bash
cd tension-control-sim
npm install
npm run dev
```

---

## 📚 进一步学习

### Speed Match 详细文档
- 查看 `r2r-sim original/src/simulate.js`
- 关键概念: Pitch Roller, 应变分区

### Tension Control 详细文档
- 查看 `tension-control-sim/src/simulateTensionControl.js`
- 关键概念: 伺服控制, 摩擦模型

---

## 💡 实际生产线案例

### 案例1: 铜箔涂布线 (Speed Match)

**配置:**
- 3个 Pitch Rollers
- 每区 2-3 个 Roller
- 2个 Dancer 缓冲

**效果:**
- 张力分3区独立控制
- 涂布区、烘干区、收卷区
- 产能: 20 m/min

---

### 案例2: 隔膜叠片线 (Tension Control)

**配置:**
- Unwind 伺服: 15 N
- Rewind 伺服: 25 N
- 4个 Dancer 平滑张力

**效果:**
- 全线张力 15-25 N 平滑过渡
- 对位精度 ±30 µm
- 废品率 < 0.5%

---

## 🎓 总结

| 维度 | Speed Match | Tension Control |
|------|-------------|-----------------|
| **难度** | ⭐⭐ | ⭐⭐⭐⭐ |
| **成本** | 💰💰 | 💰💰💰💰 |
| **精度** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **速度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **柔性** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

**建议:**
- 涂布、分切 → Speed Match
- 复合、叠片 → Tension Control
- 实际生产线可能混合使用两种模式

---

## 📞 技术支持

- Email: vzhu@voltamission.com
- Website: voltamission.com
- GitHub: github.com/viczhu92/voltamission
