// src/simulate.js
// -----------------------------------------------------------
// Simplified R2R tension model (per-section strain dynamics)
//
// 每个 section（Zone）都有：
//   - 目标应变 eps_set = baseStrain + localIdx * strainStep
//   - 目标张力 T_set = EA * eps_set
//
// 这里的关键：
//   - 沿 web 从左到右遍历 zones
//   - 每遇到一个 PITCH roller，它右侧的第一个 zone 重新从 localIdx = 0 开始
//     -> 等效于 "Pitch Roller 把两边张力区分开"
//
// 动态方程：
//   dε/dt = -damping * (ε - ε_set)           // 一阶收敛到目标应变
//   T = EA * ε
//
// EA、baseStrain、strainStep 都从外部传入（由材料和厚度决定）。
// 我们同时返回张力历史和应变历史，用于危险工况检测。
// -----------------------------------------------------------

/**
 * @param {Array} nodes - 节点列表（Unwind / Roller / Dancer / PITCH / Rewind）
 * @param {Array} zones - 区段列表，每个包含 { id, from, to, length_m, ... }
 * @param {number} lineLength - 整条线长度（米），当前版本没直接用到
 * @param {Object} params - 物性和应变参数
 *   - EA: 等效 EA (N)，通常 = E * thickness * width
 *   - baseStrain: 每个张力区第一段的工作应变
 *   - strainStep: 在同一张力区内，每个 section 递增的应变
 */
export function simulateTension(nodes, zones, lineLength, params) {
  // ===== 时间轴设置 =====
  const dt = 0.01; // s
  const totalTime = 6; // s
  const steps = Math.floor(totalTime / dt) + 1;
  const time = Array.from({ length: steps }, (_, i) =>
    parseFloat((i * dt).toFixed(2))
  );

  // ===== 线速度（目前只用来做“启动过程”的意义） =====
  const vTarget = 1.0; // m/s，标称线速度
  const rampTime = 1.5; // s
  const lineSpeed = (t) =>
    t < rampTime ? (vTarget * t) / rampTime : vTarget;

  // ===== 材料参数（从外部传入，带默认值以防报错） =====
  const EA = params?.EA ?? 2e5; // N
  const baseStrain0 = params?.baseStrain ?? 1.5e-4; // 0.015%
  const strainStep = params?.strainStep ?? 2e-5; // 每段递增的应变

  // 各节点类型映射，方便识别 PITCH / DANCER
  const nodeTypeById = Object.fromEntries(
    nodes.map((n) => [n.id, n.type])
  );

  // dancer 用来增加阻尼
  const dancerIds = nodes
    .filter((n) => n.type === "DANCER")
    .map((n) => n.id);

  // ===== 预处理每个 section 的参数 =====
  const zoneParams = [];
  let groupIndex = 0;   // 第几个张力区（Pitch Roller 右边 +1）
  let localIdx = 0;     // 当前张力区内的 section 序号（0,1,2,...）

  zones.forEach((z, globalIdx) => {
    const length_m = Math.max(0.2, z.length_m || 0.2); // m，避免 0

    // 如果这个 zone 的 from 是 PITCH，则说明它是一个新张力区的起点
    const fromType = nodeTypeById[z.from.id];
    if (fromType === "PITCH" && globalIdx > 0) {
      groupIndex += 1;
      localIdx = 0;
    }

    // 目标应变 / 张力：在张力区内根据 localIdx 递增
    const eps_set = baseStrain0 + localIdx * strainStep;
    const T_set = EA * eps_set;

    // 阻尼：有 dancer 的 section 阻尼更大，张力更稳
    let damping = 4;
    const hasDancer =
      dancerIds.includes(z.from.id) || dancerIds.includes(z.to.id);
    if (hasDancer) damping *= 2.5;

    const strainGain = 1.0 / length_m; // 预留接口给 dv 使用

    zoneParams.push({
      id: z.id,
      fromId: z.from.id,
      toId: z.to.id,
      length_m,
      eps_set,
      T_set,
      damping,
      strainGain,
      index: globalIdx,   // 全局 section 索引
      groupIndex,         // 属于第几个张力区（0,1,2,...）
      localIndex: localIdx,
    });

    // 下一段在同一张力区内，localIdx + 1
    localIdx += 1;
  });

  // ===== 状态变量：每个 section 的 ε 和 T =====
  const eps = Object.fromEntries(zoneParams.map((zp) => [zp.id, 0]));
  const T = Object.fromEntries(zoneParams.map((zp) => [zp.id, 0]));

  // 存储结果：
  //   zoneResults[zoneId]   = [T(t0), T(t1), ...]
  //   strainResults[zoneId] = [eps(t0), eps(t1), ...]
  const zoneResults = {};
  const strainResults = {};
  zoneParams.forEach((zp) => {
    zoneResults[zp.id] = [];
    strainResults[zp.id] = [];
  });

  // ===== 主仿真循环 =====
  for (const t of time) {
    const v_line = lineSpeed(t);

    zoneParams.forEach((zp) => {
      // 当前版本假设 speed match 完美：v_up ≈ v_down ≈ v_line
      const v_up = v_line;
      const v_down = v_line;
      const dv = v_up - v_down; // 目前为 0，只保留结构，未来可以在这里加 mismatch

      // dε/dt = strainGain * dv - damping * (ε - ε_set)
      const depsdt =
        zp.strainGain * dv - zp.damping * (eps[zp.id] - zp.eps_set);

      eps[zp.id] += depsdt * dt;

      // 张力 = EA * ε
      T[zp.id] = EA * eps[zp.id];
      if (T[zp.id] < 0) T[zp.id] = 0;

      zoneResults[zp.id].push(parseFloat(T[zp.id].toFixed(2)));
      strainResults[zp.id].push(eps[zp.id]);
    });
  }

  return { time, zoneResults, strainResults };
}
