import { useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { clamp01 } from "./scene-phases";

type AiNetworkProps = {
  blend: number;
};

export function AiNetwork({ blend }: AiNetworkProps) {
  const opacity = clamp01(blend);
  const linesRef = useRef<Group>(null);

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

  useFrame(({ clock }) => {
    const g = linesRef.current;
    if (!g || opacity < 0.05) return;
    g.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.08;
  });

  if (opacity < 0.05) return null;

  return (
    <group visible={opacity > 0.02}>
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial
          color="#c9a962"
          emissive="#3d3520"
          emissiveIntensity={0.6 * opacity}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <group ref={linesRef}>
        {nodes.slice(1).map((pos, i) => (
          <group key={i}>
            <mesh position={pos as [number, number, number]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#9cb8a8" emissive="#1b4332" emissiveIntensity={0.4} />
            </mesh>
            <Line
              points={[
                [0, 1.6, 0],
                pos,
              ]}
              color="#c9a962"
              transparent
              opacity={0.35 * opacity}
              lineWidth={1}
            />
          </group>
        ))}
      </group>
    </group>
  );
}
