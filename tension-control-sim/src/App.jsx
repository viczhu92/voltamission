// src/App.jsx
import { useMemo, useState } from "react";
import R2RCanvas from "./R2RCanvas";
import SimulationPanel from "./SimulationPanel";
import { simulateTensionControl, calculateTensionRange } from "./simulateTensionControl";

// 材料库
const MATERIALS = {
  copper_foil: {
    label: "Copper foil",
    E: 110e9,
    baseStrain: 5e-5,
    strainStep: 5e-5,
    maxStrain: 3e-4,
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
    maxStrain: 6e-4,
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
    maxStrain: 1.2e-3,
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
  { id: "pitch1", type: "PITCH", x: 50 },  // Drive roller pushes material
  { id: "roller2", type: "ROLLER", x: 65 },
  { id: "roller3", type: "ROLLER", x: 75 },
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
      index: i,
    });
  }
  return zones;
}

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [lineLength, setLineLength] = useState(10); // m
  const [simResult, setSimResult] = useState(null);
  const [nextId, setNextId] = useState(2);

  // 材料 & 厚度 & 宽度
  const [materialKey, setMaterialKey] = useState("copper_foil");
  const [thicknessUm, setThicknessUm] = useState(70);
  const [widthM, setWidthM] = useState(0.12);

  // Tension control parameters
  const [T_unwind, setT_unwind] = useState(40); // N - Higher at unwind (holds back)
  const [T_rewind, setT_rewind] = useState(25); // N - Lower at rewind (accepts material)
  const [frictionCoeff, setFrictionCoeff] = useState(0.02);
  const [lineSpeed, setLineSpeed] = useState(1.0); // m/s

  const zones = useMemo(
    () => buildZones(nodes, lineLength),
    [nodes, lineLength]
  );

  const EA = useMemo(() => {
    const mat = MATERIALS[materialKey];
    if (!mat) return 2e5;
    const t_m = thicknessUm * 1e-6;
    return mat.E * t_m * widthM;
  }, [materialKey, thicknessUm, widthM]);

  // 推荐张力范围
  const tensionRange = useMemo(() => {
    return calculateTensionRange(EA, MATERIALS[materialKey]);
  }, [EA, materialKey]);

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
    const result = simulateTensionControl(nodes, zones, lineLength, {
      EA,
      T_unwind,
      T_rewind,
      frictionCoeff,
      lineSpeed,
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
        <h1 style={{ marginBottom: 4 }}>
          Tension-Control R2R Simulator
        </h1>
        <p style={{ color: "#9ca3af", marginTop: 0, marginBottom: 12 }}>
          <strong>Hybrid Tension Control Mode</strong>: Unwind/Rewind servos control tension, while Pitch Roller(s) drive material forward.
          This allows Unwind tension ≥ Rewind tension (material is pushed, not just pulled).
        </p>

        {/* 运行仿真按钮 */}
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={handleRunSimulation}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "1px solid #3b82f6",
              cursor: "pointer",
              fontWeight: 600,
              background: "#1e3a8a",
              color: "#f9fafb",
              fontSize: 15,
            }}
          >
            ▶ Run Simulation
          </button>
        </div>

        {/* 材料参数 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
            padding: "14px",
            background: "#111827",
            borderRadius: "8px",
            border: "1px solid #374151",
          }}
        >
          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>
              Material
            </label>
            <select
              value={materialKey}
              onChange={(e) => setMaterialKey(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
              }}
            >
              {Object.entries(MATERIALS).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>
              Thickness (µm)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={thicknessUm}
              onChange={(e) => setThicknessUm(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>
              Width (m)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={widthM}
              onChange={(e) => setWidthM(Math.max(0.01, Number(e.target.value) || 0.01))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>
              Line Length (m)
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={lineLength}
              onChange={(e) => setLineLength(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            EA = {EA.toExponential(2)} N | Recommended tension: {tensionRange.T_min}–{tensionRange.T_max} N
          </div>
        </div>

        {/* 张力控制参数 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
            padding: "14px",
            background: "#1e293b",
            borderRadius: "8px",
            border: "1px solid #0ea5e9",
          }}
        >
          <div>
            <label style={{ fontSize: 12, color: "#7dd3fc", display: "block", marginBottom: 4 }}>
              Unwind Tension (N)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={T_unwind}
              onChange={(e) => setT_unwind(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #0ea5e9",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#7dd3fc", display: "block", marginBottom: 4 }}>
              Rewind Tension (N)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={T_rewind}
              onChange={(e) => setT_rewind(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #0ea5e9",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#7dd3fc", display: "block", marginBottom: 4 }}>
              Friction Coeff
            </label>
            <input
              type="number"
              min="0"
              max="0.5"
              step="0.01"
              value={frictionCoeff}
              onChange={(e) => setFrictionCoeff(Math.max(0, Number(e.target.value) || 0))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #0ea5e9",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#7dd3fc", display: "block", marginBottom: 4 }}>
              Line Speed (m/s)
            </label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={lineSpeed}
              onChange={(e) => setLineSpeed(Math.max(0.1, Number(e.target.value) || 0.1))}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #0ea5e9",
                background: "#020617",
                color: "#f9fafb",
              }}
            />
          </div>
        </div>

        {/* 添加节点按钮 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button
            onClick={() => handleAddNode("ROLLER")}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #4ade80",
              cursor: "pointer",
              fontSize: 12,
              background: "#022c22",
              color: "#bbf7d0",
            }}
          >
            + Roller
          </button>
          <button
            onClick={() => handleAddNode("DANCER")}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #fb923c",
              cursor: "pointer",
              fontSize: 12,
              background: "#451a03",
              color: "#fed7aa",
            }}
          >
            + Dancer
          </button>
          <button
            onClick={() => handleAddNode("PITCH")}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #38bdf8",
              cursor: "pointer",
              fontSize: 12,
              background: "#082f49",
              color: "#bae6fd",
            }}
          >
            + Drive Roller (Pitch)
          </button>
          <span style={{ fontSize: 11, color: "#9ca3af", alignSelf: "center" }}>
            (Double-click to remove)
          </span>
        </div>

        {/* Canvas + 结果 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <R2RCanvas
            nodes={nodes}
            lineLength={lineLength}
            onNodeChange={handleNodeChange}
            onDeleteNode={handleDeleteNode}
          />

          <SimulationPanel
            zones={zones}
            result={simResult}
            material={material}
            EA={EA}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
