// src/App.jsx
import { useMemo, useState } from "react";
import R2RCanvas from "./R2RCanvas";
import SimulationPanel from "./SimulationPanel";
import { simulateTension } from "./simulate";

// 材料库：E = Young's modulus (Pa)
// baseStrain / strainStep 是推荐工作应变区间（无量纲）
const MATERIALS = {
  copper_foil: {
    label: "Copper foil",
    E: 110e9,
    baseStrain: 5e-5,    // 0.005 %
    strainStep: 5e-5,    // 每段 +0.005 %
    maxStrain: 3e-4,     // 0.03 % 以上认为危险
  },
  aluminum_foil: {
    label: "Aluminum foil",
    E: 70e9,
    baseStrain: 4e-5,
    strainStep: 4e-5,
    maxStrain: 3e-4,
  },
  cathode: {
    label: "Cathode electrode",
    E: 10e9,
    baseStrain: 8e-5,
    strainStep: 8e-5,
    maxStrain: 6e-4,     // 涂层可接受稍大一点
  },
  anode: {
    label: "Anode electrode",
    E: 8e9,
    baseStrain: 1.0e-4,
    strainStep: 8e-5,
    maxStrain: 6e-4,
  },
  separator: {
    label: "Separator film",
    E: 2e9,
    baseStrain: 2.0e-4,
    strainStep: 1.0e-4,
    maxStrain: 1.2e-3,   // 0.12 %
  },
  pet: {
    label: "PET web",
    E: 4e9,
    baseStrain: 1.5e-4,
    strainStep: 7e-5,
    maxStrain: 8e-4,
  },
};

const initialNodes = [
  { id: "unwind", type: "UNWIND", x: 5 },
  { id: "dancer1", type: "DANCER", x: 15 },
  { id: "roller1", type: "ROLLER", x: 25 },
  { id: "roller2", type: "ROLLER", x: 35 },
  { id: "roller3", type: "ROLLER", x: 45 },
  { id: "roller4", type: "ROLLER", x: 55 },
  { id: "roller5", type: "ROLLER", x: 65 },
  { id: "roller6", type: "ROLLER", x: 75 },
  { id: "dancer2", type: "DANCER", x: 85 },
  { id: "rewind", type: "REWIND", x: 95 },
];

function buildZones(nodes, lineLength) {
  const sorted = [...nodes].sort((a, b) => a.x - b.x);
  const zones = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const lengthPercent = to.x - from.x;
    const length_m = (lengthPercent / 100) * lineLength;
    zones.push({
      id: `${from.id}-${to.id}`,
      from,
      to,
      lengthPercent,
      length_m,
      index: i, // Section index
    });
  }
  return zones;
}

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [lineLength, setLineLength] = useState(10); // m
  const [simResult, setSimResult] = useState(null);
  const [nextId, setNextId] = useState(2);

  // 材料 & 厚度（um）& 宽度（m）
  const [materialKey, setMaterialKey] = useState("copper_foil");
  const [thicknessUm, setThicknessUm] = useState(70); // µm
  const [widthM, setWidthM] = useState(0.12); // m

  const zones = useMemo(
    () => buildZones(nodes, lineLength),
    [nodes, lineLength]
  );

  // 计算 EA：EA = E * thickness(m) * width(m)
  const EA = useMemo(() => {
    const mat = MATERIALS[materialKey];
    if (!mat) return 2e5;
    const t_m = thicknessUm * 1e-6;
    return mat.E * t_m * widthM; // N
  }, [materialKey, thicknessUm, widthM]);

  const handleNodeChange = (id, newX) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x: newX } : n))
    );
  };

  const handleDeleteNode = (id) => {
    setNodes((prev) => {
      const n = prev.find((x) => x.id === id);
      if (!n) return prev;
      if (n.type === "UNWIND" || n.type === "REWIND") return prev;
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleAddNode = (type) => {
    const newId = `${type.toLowerCase()}${nextId}`;
    setNodes((prev) => [...prev, { id: newId, type, x: 50 }]);
    setNextId((n) => n + 1);
  };

  const handleRunSimulation = () => {
    const material = MATERIALS[materialKey];
    const t_m = thicknessUm * 1e-6;

    const EA = material.E * t_m * widthM;

    const result = simulateTension(nodes, zones, lineLength, {
      EA,
      baseStrain: material.baseStrain,
      strainStep: material.strainStep,
    });

    setSimResult(result);
  };


  const material = MATERIALS[materialKey];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "16px 24px",
        fontFamily: "system-ui",
        color: "#f9fafb",
        background: "#05060a",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: 4 }}>Speed-Match R2R Simulator</h1>
        <p style={{ color: "#9ca3af", marginTop: 0 }}>
          Drag the nodes along the web. Positions are shown in meters based on
          total line length. Tension is computed from strain and EA
          (material × thickness).
        </p>

        {/* 顶部控制条 */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleRunSimulation}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              fontWeight: 500,
              background: "#111827",
              color: "#f9fafb",
            }}
          >
            Run Simulation
          </button>

          {/* 总长度 */}
          <label style={{ fontSize: 13, color: "#e5e7eb" }}>
            Total line length (m):{" "}
            <input
              type="number"
              min="1"
              step="0.5"
              value={lineLength}
              onChange={(e) =>
                setLineLength(Math.max(1, Number(e.target.value) || 1))
              }
              style={{
                width: "80px",
                padding: "4px 6px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
                marginLeft: "4px",
              }}
            />
          </label>

          {/* 材料选择 */}
          <label style={{ fontSize: 13, color: "#e5e7eb" }}>
            Material:{" "}
            <select
              value={materialKey}
              onChange={(e) => setMaterialKey(e.target.value)}
              style={{
                padding: "4px 6px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
                marginLeft: "4px",
              }}
            >
              {Object.entries(MATERIALS).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {/* 厚度 */}
          <label style={{ fontSize: 13, color: "#e5e7eb" }}>
            Thickness (µm):{" "}
            <input
              type="number"
              min="1"
              step="1"
              value={thicknessUm}
              onChange={(e) =>
                setThicknessUm(Math.max(1, Number(e.target.value) || 1))
              }
              style={{
                width: "70px",
                padding: "4px 6px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
                marginLeft: "4px",
              }}
            />
          </label>

          {/* 宽度 */}
          <label style={{ fontSize: 13, color: "#e5e7eb" }}>
            Width (m):{" "}
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={widthM}
              onChange={(e) =>
                setWidthM(Math.max(0.01, Number(e.target.value) || 0.01))
              }
              style={{
                width: "70px",
                padding: "4px 6px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
                marginLeft: "4px",
              }}
            />
          </label>

          {/* 显示 EA 粗略大小，方便你脑补 */}
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            EA ≈ {EA.toExponential(2)} N
          </span>
        </div>

        {/* 添加节点按钮 */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => handleAddNode("ROLLER")}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "1px solid #4ade80",
              cursor: "pointer",
              fontSize: "12px",
              background: "#022c22",
              color: "#bbf7d0",
            }}
          >
            + Roller
          </button>
          <button
            onClick={() => handleAddNode("DANCER")}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "1px solid #fb923c",
              cursor: "pointer",
              fontSize: "12px",
              background: "#451a03",
              color: "#fed7aa",
            }}
          >
            + Dancer
          </button>
          <button
            onClick={() => handleAddNode("PITCH")}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "1px solid #38bdf8",
              cursor: "pointer",
              fontSize: "12px",
              background: "#082f49",
              color: "#bae6fd",
            }}
          >
            + Drive Roller (Pitch)
          </button>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            (Double-click a Roller/Dancer/Pitch to remove it)
          </span>
        </div>

        {/* 主内容：上面 Canvas，下面整行的图 + 表 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <R2RCanvas
            nodes={nodes}
            lineLength={lineLength}
            onNodeChange={handleNodeChange}
            onDeleteNode={handleDeleteNode}
          />

          <SimulationPanel
            zones={zones}
            result={simResult}
            material={MATERIALS[materialKey]}
            EA={EA}
          />

        </div>
      </div>
    </div>
  );
}

export default App;
