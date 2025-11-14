// src/TensionChart.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TensionChart({ zones, result, material, EA }) {
  if (!result) return null;

  const { time, zoneResults, strainResults } = result;

  const data = time.map((t, idx) => {
    const row = { time: t };
    zones.forEach((z) => {
      const series = zoneResults[z.id];
      if (series) row[z.id] = series[idx];
    });
    return row;
  });

  const colors = [
    "#60a5fa",
    "#34d399",
    "#f97316",
    "#a78bfa",
    "#facc15",
    "#f472b6",
  ];

  // Determine which sections are dangerous
  const maxStrain = material?.maxStrain ?? null;
  const dangerousZoneIds = new Set();
  if (maxStrain != null && strainResults) {
    zones.forEach((z) => {
      const epsHistory = strainResults[z.id];
      if (!epsHistory || epsHistory.length === 0) return;
      const epsFinal = epsHistory[epsHistory.length - 1];
      if (epsFinal > maxStrain) {
        dangerousZoneIds.add(z.id);
      }
    });
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#e5e7eb" }}
            label={{
              value: "Time (s)",
              position: "insideBottomRight",
              offset: -4,
              fontSize: 11,
              fill: "#e5e7eb",
            }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#e5e7eb" }}
            label={{
              value: "Tension (N)",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "#e5e7eb",
            }}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10, color: "#e5e7eb" }} />
          {zones.map((z, idx) => {
            const isDangerous = dangerousZoneIds.has(z.id);
            return (
              <Line
                key={z.id}
                type="monotone"
                dataKey={z.id}
                name={`Section ${idx + 1}${isDangerous ? " ⚠" : ""}`}
                stroke={isDangerous ? "#ef4444" : colors[idx % colors.length]}
                dot={false}
                strokeWidth={isDangerous ? 3 : 2}
                isAnimationActive={false}
                strokeOpacity={isDangerous ? 1 : 0.7}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
