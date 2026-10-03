import { Line } from "@react-three/drei";
import { useExperienceScalars } from "./useExperienceScalars";

const HUB: [number, number, number] = [0, 3.1, 0];

const NODES: [number, number, number][] = [
  [-2.2, 0.55, -1.8],
  [2.0, 0.6, -1.6],
  [-1.8, 0.5, 2.0],
  [1.9, 0.55, 1.85],
  [0, 1.2, 0.3],
];

export function OperationalAiLayer({ mobile }: { mobile?: boolean }) {
  const s = useExperienceScalars(64);
  if (mobile) return null;
  const opacity = s.ai * 0.55;
  if (opacity < 0.05) return null;

  return (
    <group>
      {NODES.map((node) => (
        <Line
          key={node.join("-")}
          points={[HUB, node]}
          color="#8a9a90"
          transparent
          opacity={opacity * 0.45}
          lineWidth={1}
        />
      ))}
    </group>
  );
}
