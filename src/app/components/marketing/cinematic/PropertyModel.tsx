import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type PropertyModelProps = {
  /** 0–1: floors peel apart for “inside the property” chapter */
  layerSeparation?: number;
  /** Subtle idle rotation + scroll-driven tilt */
  spin?: number;
  /** Replace root group via same ref contract when swapping in a GLB */
  modelRef?: React.RefObject<THREE.Group | null>;
};

const CREAM = "#e8e0d4";
const FOREST = "#1b4332";
const GLASS = "#9cb8a8";
const GOLD = "#c9a962";

/**
 * Placeholder architectural massing — swap this group's children with `<primitive object={gltf.scene} />`
 * from useGLTF('/models/baytmiftah-tower.glb') without changing parent scene logic.
 */
export function PropertyModel({
  layerSeparation = 0,
  spin = 0,
  modelRef: externalRef,
}: PropertyModelProps) {
  const internalRef = useRef<THREE.Group>(null);
  const groupRef = externalRef ?? internalRef;

  const floorCount = 5;
  const floors = useMemo(() => Array.from({ length: floorCount }, (_, i) => i), [floorCount]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, spin * 0.35, delta * 2);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Podium */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.4, 0.3, 1.6]} />
        <meshStandardMaterial color={FOREST} roughness={0.85} metalness={0.05} />
      </mesh>

      {floors.map((i) => {
        const y = 0.45 + i * 0.55;
        const spread = layerSeparation * (i + 1) * 0.08;
        return (
          <group key={i} position={[0, y + spread, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.6, 0.48, 1.1]} />
              <meshStandardMaterial color={CREAM} roughness={0.55} metalness={0.08} />
            </mesh>
            <mesh position={[0, 0, 0.56]}>
              <boxGeometry args={[1.5, 0.38, 0.04]} />
              <meshStandardMaterial
                color={GLASS}
                roughness={0.15}
                metalness={0.4}
                transparent
                opacity={0.45}
              />
            </mesh>
            {i === floorCount - 1 ? (
              <mesh position={[0, 0.32, 0]}>
                <boxGeometry args={[0.9, 0.12, 0.9]} />
                <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.55} />
              </mesh>
            ) : null}
          </group>
        );
      })}

      {/* Landscape hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#0a1612" roughness={1} />
      </mesh>
    </group>
  );
}
