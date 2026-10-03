import { Html } from "@react-three/drei";
import { useExperienceScalars } from "./useExperienceScalars";

const SPATIAL_LABELS: { text: string; position: [number, number, number] }[] = [
  { text: "Leasing", position: [1.35, 2.1, 0.85] },
  { text: "Finance", position: [-1.25, 2.5, 0.7] },
  { text: "Maintenance", position: [1.1, 1.35, 1.05] },
  { text: "Residents", position: [-1.05, 1.55, 0.95] },
];

type SpatialLabelsProps = {
  mobile?: boolean;
};

export function SpatialLabels({ mobile }: SpatialLabelsProps) {
  const s = useExperienceScalars();
  if (mobile) return null;

  const opacity = Math.max(0, s.labelsApproach * (1 - s.explode * 0.85));
  if (opacity < 0.04) return null;

  return (
    <group>
      {SPATIAL_LABELS.map(({ text, position }) => (
        <Html key={text} position={position} center distanceFactor={10} style={{ opacity, pointerEvents: "none" }}>
          <span className="mk-xp-spatial-label">{text}</span>
        </Html>
      ))}
    </group>
  );
}
