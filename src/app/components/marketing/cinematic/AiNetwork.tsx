import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

type AiNetworkProps = {
  blend: number;
};

/** Operational connection lines — no orb / brain metaphor. */
export function AiNetwork({ blend }: AiNetworkProps) {
  const opacity = clamp01(blend);
  const nodes = useMemo(
    () =>
      [
        [0, 1.8, 0],
        [-1.5, 1.2, 0.8],
        [1.4, 1.1, 0.6],
        [-0.8, 0.5, 1.2],
        [1.1, 0.6, 1.1],
        [0, 0.3, 1.4],
      ] as [number, number, number][],
    [],
  );

  if (opacity < 0.05) return null;

  const hub = nodes[0];

  return (
    <group visible={opacity > 0.02}>
      {nodes.slice(1).map((pos, i) => (
        <Line
          key={i}
          points={[hub, pos]}
          color="#8a9a90"
          transparent
          opacity={0.32 * opacity}
          lineWidth={1}
        />
      ))}
    </group>
  );
}
