// src/R2RCanvas.jsx
import { useRef, useState } from "react";

const typeColor = {
  UNWIND: "#3b82f6",
  ROLLER: "#22c55e",
  DANCER: "#f97316",
  PITCH: "#38bdf8",
  REWIND: "#a855f7",
};

const typeLabel = {
  UNWIND: "Unwind",
  ROLLER: "Roller",
  DANCER: "Dancer",
  PITCH: "Drive Roller (Pitch)",
  REWIND: "Rewind",
};


export default function R2RCanvas({
  nodes,
  lineLength,
  onNodeChange,
  onDeleteNode,
}) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const handleMouseDown = (id, e) => {
    e.preventDefault();
    setDraggingId(id);
  };

  const handleMouseMove = (e) => {
    if (!draggingId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPx = e.clientX - rect.left;
    let xPercent = (xPx / rect.width) * 100;
    xPercent = Math.max(0, Math.min(100, xPercent));
    onNodeChange(draggingId, xPercent);
  };

  const handleMouseUp = () => setDraggingId(null);
  const handleDoubleClick = (id) => onDeleteNode && onDeleteNode(id);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "relative",
        width: "100%",
        height: "260px",
        border: "1px solid #4b5563",
        borderRadius: "12px",
        padding: "20px",
        boxSizing: "border-box",
        background: "#020617",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "5%",
          right: "5%",
          top: "50%",
          height: "2px",
          background:
            "linear-gradient(to right, rgba(148,163,184,0.7) 50%, transparent 50%)",
          backgroundSize: "18px 2px",
        }}
      />

      {nodes.map((node) => {
        const posM = (node.x / 100) * lineLength;
        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onDoubleClick={() => handleDoubleClick(node.id)}
            style={{
              position: "absolute",
              top: "50%",
              left: `${node.x}%`,
              transform: "translate(-50%, -50%)",
              width: "90px",
              cursor: "grab",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "42px",
                borderRadius: "999px",
                backgroundColor: typeColor[node.type],
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                fontSize: "12px",
                userSelect: "none",
              }}
            >
              {typeLabel[node.type]}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#9ca3af",
                marginTop: "4px",
              }}
            >
              x ≈ {posM.toFixed(2)} m / {lineLength.toFixed(2)} m
            </div>
          </div>
        );
      })}
    </div>
  );
}
