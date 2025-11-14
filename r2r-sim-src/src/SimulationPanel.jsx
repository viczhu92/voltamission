// src/SimulationPanel.jsx
import TensionChart from "./TensionChart";

export default function SimulationPanel({ zones, result, material, EA }) {
  const maxStrain = material?.maxStrain ?? null;

  // 找出所有危险 section
  const dangerousSections = [];
  if (result && result.strainResults && maxStrain != null) {
    zones.forEach((z, idx) => {
      const epsHistory = result.strainResults[z.id];
      if (!epsHistory || epsHistory.length === 0) return;
      const epsFinal = epsHistory[epsHistory.length - 1];
      if (epsFinal > maxStrain) {
        dangerousSections.push({
          index: idx + 1,
          span: `${z.from.id} → ${z.to.id}`,
          strain: epsFinal,
        });
      }
    });
  }

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #4b5563",
        borderRadius: "12px",
        padding: "16px",
        background: "#020617",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: "360px",
        boxSizing: "border-box",
      }}
    >
      {/* 上：整行张力曲线 */}
      <div style={{ flex: 1.5, minHeight: "220px" }}>
        <TensionChart zones={zones} result={result} material={material} EA={EA} />
      </div>

      {/* 如果有危险工况，给一个小警告条 */}
      {dangerousSections.length > 0 && (
        <div
          style={{
            fontSize: "11px",
            color: "#fecaca",
            background: "#7f1d1d",
            borderRadius: "6px",
            padding: "6px 8px",
          }}
        >
          ⚠ Potential over-strain in{" "}
          {dangerousSections
            .map((d) => `Section ${d.index}`)
            .join(", ")}{" "}
          for {material?.label || "web"}.
        </div>
      )}

      {/* 下：表格 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0, marginBottom: 6 }}>Sections &amp; Samples</h3>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #6b7280",
                    textAlign: "left",
                    padding: "4px",
                  }}
                >
                  Section
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #6b7280",
                    textAlign: "left",
                    padding: "4px",
                  }}
                >
                  Span
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #6b7280",
                    textAlign: "right",
                    padding: "4px",
                  }}
                >
                  Length (m)
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #6b7280",
                    textAlign: "right",
                    padding: "4px",
                  }}
                >
                  Tension (N, sample)
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #6b7280",
                    textAlign: "right",
                    padding: "4px",
                  }}
                >
                  Strain (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z, idx) => {
                const tensions =
                  result?.zoneResults && result.zoneResults[z.id]
                    ? result.zoneResults[z.id]
                    : null;
                const lastT = tensions ? tensions[tensions.length - 1] : null;

                const epsHistory =
                  result?.strainResults && result.strainResults[z.id]
                    ? result.strainResults[z.id]
                    : null;
                const epsFinal =
                  epsHistory && epsHistory.length > 0
                    ? epsHistory[epsHistory.length - 1]
                    : null;
                const strainPercent =
                  epsFinal != null ? (epsFinal * 100).toFixed(3) : "-";

                const isDangerous =
                  maxStrain != null && epsFinal != null && epsFinal > maxStrain;

                return (
                  <tr
                    key={z.id}
                    style={{
                      backgroundColor: isDangerous ? "#450a0a" : "transparent",
                    }}
                  >
                    <td
                      style={{
                        borderBottom: "1px solid #111827",
                        padding: "4px",
                        color: isDangerous ? "#fecaca" : undefined,
                      }}
                    >
                      Section {idx + 1}
                      {isDangerous && " ⚠"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #111827",
                        padding: "4px",
                        color: isDangerous ? "#fecaca" : undefined,
                      }}
                    >
                      {z.from.id} → {z.to.id}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #111827",
                        padding: "4px",
                        textAlign: "right",
                        color: isDangerous ? "#fecaca" : undefined,
                      }}
                    >
                      {z.length_m.toFixed(2)}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #111827",
                        padding: "4px",
                        textAlign: "right",
                        color: isDangerous ? "#fecaca" : "#4ade80",
                      }}
                    >
                      {lastT ?? "-"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #111827",
                        padding: "4px",
                        textAlign: "right",
                        color: isDangerous ? "#fecaca" : "#e5e7eb",
                      }}
                    >
                      {strainPercent}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
