import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

type PortfolioDashboard3DProps = {
  blend: number;
  mobile?: boolean;
};

const METRICS = [
  { label: "Units tracked", value: "48" },
  { label: "Open tickets", value: "6" },
  { label: "Leases renewing", value: "4" },
  { label: "Collections queue", value: "12" },
];

export function PortfolioDashboard3D({ blend, mobile }: PortfolioDashboard3DProps) {
  const opacity = clamp01(blend);
  if (opacity < 0.15 || mobile) return null;

  return (
    <Html position={[0, 3.2, 0]} center distanceFactor={10} style={{ opacity, pointerEvents: "none" }}>
      <div className="mk-cinema-dash-3d" aria-hidden="true">
        <p className="mk-cinema-dash-3d__eyebrow">Portfolio · illustrative preview</p>
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
