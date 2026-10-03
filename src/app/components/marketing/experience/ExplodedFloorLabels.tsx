import { Html } from "@react-three/drei";
import { useExperienceScalars } from "./useExperienceScalars";

const BASE_FLOORS: { role: string; baseY: number; x: number }[] = [
  { role: "Leasing", baseY: 0.65, x: 0.95 },
  { role: "Residents", baseY: 1.25, x: 0.92 },
  { role: "Maintenance", baseY: 1.85, x: 0.88 },
  { role: "Finance", baseY: 2.42, x: 0.85 },
  { role: "Portfolio / AI", baseY: 3.05, x: 0.82 },
];

export function ExplodedFloorLabels({ mobile }: { mobile?: boolean }) {
  const s = useExperienceScalars(72);
  if (mobile) return null;
  const opacity = s.explode * (1 - s.operating * 0.7);
  if (opacity < 0.06) return null;

  const spread = s.floorSeparation * 0.42;

  return (
    <group>
      {BASE_FLOORS.map((f, index) => (
        <Html
          key={f.role}
          position={[f.x, f.baseY + spread * (index + 1), 0.15]}
          center
          distanceFactor={10}
          style={{ opacity, pointerEvents: "none" }}
        >
          <span className="mk-xp-floor-label">{f.role}</span>
        </Html>
      ))}
    </group>
  );
}
