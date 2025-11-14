// src/simulateTensionControl.js
// -----------------------------------------------------------
// R2R Hybrid Tension Control Model
//
// KEY DIFFERENCE from pure tension control:
// - Unwind/Rewind: Servo motors control tension (not speed)
// - Pitch Roller(s): Drive rollers PUSH material forward
// - This allows T_unwind ≥ T_rewind (material is driven, not pulled)
//
// Physical Model:
// 1. Unwind holds back material with tension T_unwind
// 2. Pitch roller(s) actively drive material forward
// 3. Rewind accepts material with lower tension T_rewind
// 4. Each zone responds with strain: ε = T / EA
//
// Control Logic:
// - Unwind: Higher tension (holds back) - adjustable
// - Rewind: Lower tension (accepts) - adjustable
// - Pitch Rollers: DECOUPLE tension zones (create independent segments)
// - Middle rollers: Passive transmission
// - Dancers: Buffer tension fluctuations
//
// Tension Distribution:
// - Each Pitch Roller creates an INDEPENDENT tension zone
// - Within each zone: smooth gradient (friction effect)
// - AT Pitch: Discontinuity (zones are decoupled)
// - Multiple Pitches → Multiple independent zones
// -----------------------------------------------------------

/**
 * 张力控制模式仿真
 * @param {Array} nodes - 节点列表
 * @param {Array} zones - 区段列表
 * @param {number} lineLength - 线长度 (m)
 * @param {Object} params - 参数
 *   - EA: 材料刚度 (N)
 *   - T_unwind: Unwind 目标张力 (N)
 *   - T_rewind: Rewind 目标张力 (N)
 *   - frictionCoeff: 辊子摩擦系数（无量纲）
 *   - lineSpeed: 线速度 (m/s)
 */
export function simulateTensionControl(nodes, zones, lineLength, params) {
  // ===== 时间轴设置 =====
  const dt = 0.01; // s
  const totalTime = 6; // s
  const steps = Math.floor(totalTime / dt) + 1;
  const time = Array.from({ length: steps }, (_, i) =>
    parseFloat((i * dt).toFixed(2))
  );

  // ===== Parameter parsing =====
  const EA = params?.EA ?? 2e5; // N
  const T_unwind_set = params?.T_unwind ?? 40; // N - Unwind tension (HIGHER - holds back)
  const T_rewind_set = params?.T_rewind ?? 25; // N - Rewind tension (LOWER - accepts material)
  const frictionCoeff = params?.frictionCoeff ?? 0.02; // Friction coefficient
  const vTarget = params?.lineSpeed ?? 1.0; // m/s
  const rampTime = 1.5; // s

  // 启动曲线
  const lineSpeed = (t) =>
    t < rampTime ? (vTarget * t) / rampTime : vTarget;

  // ===== 节点类型识别 =====
  const nodeTypeById = Object.fromEntries(
    nodes.map((n) => [n.id, n.type])
  );

  const dancerIds = nodes
    .filter((n) => n.type === "DANCER")
    .map((n) => n.id);

  const pitchIds = nodes
    .filter((n) => n.type === "PITCH")
    .map((n) => n.id);

  // ===== Zone parameters initialization =====
  const zoneParams = zones.map((z, idx) => {
    const length_m = Math.max(0.2, z.length_m || 0.2);

    // Dancer increases damping
    const hasDancer =
      dancerIds.includes(z.from.id) || dancerIds.includes(z.to.id);
    const damping = hasDancer ? 8.0 : 3.0;

    // Roller type affects friction
    const fromType = nodeTypeById[z.from.id];
    const toType = nodeTypeById[z.to.id];
    
    // Check if this zone touches a Dancer
    const touchesDancer = fromType === "DANCER" || toType === "DANCER";
    
    // Friction: Dancer has negligible friction (free-spinning)
    let frictionFactor = 0;
    if (!touchesDancer) {
      if (fromType === "ROLLER" || toType === "ROLLER") {
        frictionFactor = frictionCoeff;
      }
    } // Dancer zones: frictionFactor = 0

    return {
      id: z.id,
      fromId: z.from.id,
      toId: z.to.id,
      length_m,
      damping,
      frictionFactor,
      touchesDancer,
      index: idx,
    };
  });

  // ===== Tension distribution calculation (with Pitch Rollers) =====
  const numZones = zoneParams.length;
  
  // Find all pitch roller positions (zones that START after a pitch)
  const pitchPositions = [];
  zoneParams.forEach((zp, idx) => {
    if (pitchIds.includes(zp.fromId)) {
      pitchPositions.push(idx);
    }
  });
  
  // Determine tension zones (independent segments separated by pitch rollers)
  const tensionZones = [];
  let zoneStart = 0;
  
  pitchPositions.forEach((pitchPos) => {
    if (pitchPos > 0) {
      // Zone ends BEFORE the pitch
      tensionZones.push({ start: zoneStart, end: pitchPos - 1 });
      zoneStart = pitchPos; // New zone starts AFTER the pitch
    }
  });
  // Last zone goes to rewind
  tensionZones.push({ start: zoneStart, end: numZones - 1 });
  
  // Assign target tensions per independent tension zone
  zoneParams.forEach((zp, idx) => {
    // Find which tension zone this belongs to
    let zoneInfo = null;
    let zoneIndex = 0;
    for (let i = 0; i < tensionZones.length; i++) {
      if (idx >= tensionZones[i].start && idx <= tensionZones[i].end) {
        zoneInfo = tensionZones[i];
        zoneIndex = i;
        break;
      }
    }
    
    if (!zoneInfo) {
      zp.T_set = T_rewind_set;
      zp.eps_set = zp.T_set / EA;
      return;
    }
    
    const zoneLength = zoneInfo.end - zoneInfo.start + 1;
    const posInZone = idx - zoneInfo.start;
    
    // Count only non-dancer zones for progress calculation
    let effectiveZones = 0;
    let effectivePos = 0;
    for (let i = zoneInfo.start; i <= zoneInfo.end; i++) {
      if (!zoneParams[i].touchesDancer) {
        effectiveZones++;
        if (i < idx) effectivePos++;
      }
    }
    
    const progress = effectiveZones > 1 ? effectivePos / (effectiveZones - 1) : 0;
    
    // Each tension zone has its own boundary conditions
    let T_start, T_end;
    
    if (zoneIndex === 0) {
      // First zone: Unwind to first Pitch (or to Rewind if no pitch)
      T_start = T_unwind_set;
      T_end = tensionZones.length > 1 ? T_unwind_set * 0.85 : T_rewind_set;
    } else if (zoneIndex === tensionZones.length - 1) {
      // Last zone: After last Pitch to Rewind
      T_start = T_unwind_set * 0.6; // Pitch decouples, lower tension after drive
      T_end = T_rewind_set;
    } else {
      // Middle zone: Between two pitches
      T_start = T_unwind_set * 0.7;
      T_end = T_unwind_set * 0.6;
    }
    
    // Linear interpolation within each zone (only counting non-dancer zones)
    const T_base = T_start + (T_end - T_start) * progress;
    
    // Add friction effect (only from non-dancer zones)
    const frictionAccum = zoneParams
      .slice(zoneInfo.start, idx)
      .reduce((sum, z) => sum + z.frictionFactor, 0);
    const T_friction = -frictionAccum * T_base * 0.05;
    
    zp.T_set = Math.max(T_rewind_set * 0.5, T_base + T_friction);
    zp.eps_set = zp.T_set / EA;
  });

  // ===== 状态变量初始化 =====
  const T = Object.fromEntries(zoneParams.map((zp) => [zp.id, 0]));
  const eps = Object.fromEntries(zoneParams.map((zp) => [zp.id, 0]));

  // 结果存储
  const zoneResults = {};
  const strainResults = {};
  zoneParams.forEach((zp) => {
    zoneResults[zp.id] = [];
    strainResults[zp.id] = [];
  });

  // ===== 控制器状态（PID - 简化版） =====
  // Unwind 和 Rewind 有独立的张力控制器
  const unwindZone = zoneParams[0]; // 第一个 zone
  const rewindZone = zoneParams[numZones - 1]; // 最后一个 zone

  // ===== 主仿真循环 =====
  for (let step = 0; step < steps; step++) {
    const t = time[step];
    const v_line = lineSpeed(t);

    // 启动阶段：张力设定值按速度比例缩放
    const speedRatio = v_line / vTarget;
    const T_unwind_actual = T_unwind_set * speedRatio;
    const T_rewind_actual = T_rewind_set * speedRatio;

    zoneParams.forEach((zp) => {
      // 目标张力也根据启动阶段缩放
      const T_target = zp.T_set * speedRatio;

      // === Tension control logic ===
      // 1. Unwind zone: Force tracking T_unwind (HIGHER - holds back material)
      // 2. Rewind zone: Force tracking T_rewind (LOWER - accepts material)
      // 3. Middle zones: Natural response to gradient
      
      let T_desired;
      let control_strength = zp.damping;

      if (zp.id === unwindZone?.id) {
        // Unwind servo control (holds back with higher tension)
        T_desired = T_unwind_actual;
        control_strength = 15; // Strong control
      } else if (zp.id === rewindZone?.id) {
        // Rewind servo control (accepts with lower tension)
        T_desired = T_rewind_actual;
        control_strength = 15; // Strong control
      } else {
        // Middle zones: Natural gradient
        T_desired = T_target;
      }

      // === Dynamic equation ===
      // dT/dt = -k × (T - T_desired)
      const dTdt = -control_strength * (T[zp.id] - T_desired);
      T[zp.id] += dTdt * dt;

      // Prevent negative tension
      if (T[zp.id] < 0) T[zp.id] = 0;

      // Strain = Tension / Stiffness
      eps[zp.id] = T[zp.id] / EA;

      // 记录数据
      zoneResults[zp.id].push(parseFloat(T[zp.id].toFixed(2)));
      strainResults[zp.id].push(eps[zp.id]);
    });
  }

  return { time, zoneResults, strainResults };
}

/**
 * Calculate recommended tension range
 * @param {number} EA - Material stiffness
 * @param {Object} material - Material properties
 * @returns {Object} { T_min, T_nominal, T_max }
 */
export function calculateTensionRange(EA, material) {
  const baseStrain = material?.baseStrain ?? 1e-4;
  const maxStrain = material?.maxStrain ?? 5e-4;
  
  const T_min = EA * baseStrain * 0.5; // Minimum tension (prevent slack)
  const T_nominal = EA * baseStrain; // Nominal working tension
  const T_max = EA * maxStrain * 0.8; // Maximum safe tension (20% margin)

  return {
    T_min: Math.round(T_min),
    T_nominal: Math.round(T_nominal),
    T_max: Math.round(T_max),
  };
}
