import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

type PortfolioDashboard3DProps = {
  blend: number;
  mobile?: boolean;
};

const METRICS = [
  { label: "Occupancy", value: "Illustrative" },
  { label: "Collections", value: "Live ledger" },
  { label: "Open maintenance", value: "Queue view" },
  { label: "Portfolio value", value: "Reporting" },
];

export function PortfolioDashboard3D({ blend, mobile }: PortfolioDashboard3DProps) {
  const opacity = clamp01(blend);
  if (opacity < 0.15 || mobile) return null;

  return (
    <Html position={[0, 3.2, 0]} center distanceFactor={10} style={{ opacity, pointerEvents: "none" }}>
      <div className="mk-cinema-dash-3d" aria-hidden="true">
        <p className="mk-cinema-dash-3d__eyebrow">Workspace · preview</p>
        <div className="mk-cinema-dash-3d__grid">
          {METRICS.map((m) => (
            <div key={m.label}>
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </Html>
  );
}
