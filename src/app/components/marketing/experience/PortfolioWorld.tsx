import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars } from "./experience-scalars";

type PortfolioWorldProps = {
  mobile?: boolean;
};

type BuildingSpec = {
  pos: [number, number, number];
  size: [number, number, number];
  rot: number;
};

export function PortfolioWorld({ mobile }: PortfolioWorldProps) {
  const groupRef = useRef<THREE.Group>(null);

  const buildings = useMemo((): BuildingSpec[] => {
    if (mobile) {
      return [
        { pos: [-1.8, 0, -1.6], size: [0.75, 1.0, 0.65], rot: 0.05 },
        { pos: [1.9, 0, -1.4], size: [0.8, 1.15, 0.7], rot: -0.04 },
        { pos: [-1.5, 0, 1.7], size: [0.7, 0.95, 0.6], rot: 0.08 },
        { pos: [1.6, 0, 1.5], size: [0.85, 1.05, 0.68], rot: -0.06 },
      ];
    }
    return [
      { pos: [-2.4, 0, -2.1], size: [0.85, 1.15, 0.72], rot: 0.04 },
      { pos: [0, 0, -2.6], size: [0.9, 1.25, 0.75], rot: 0 },
      { pos: [2.35, 0, -2.0], size: [0.78, 1.05, 0.68], rot: -0.05 },
      { pos: [-2.1, 0, 0.5], size: [0.72, 0.98, 0.62], rot: 0.07 },
      { pos: [2.2, 0, 0.45], size: [0.88, 1.2, 0.74], rot: -0.03 },
      { pos: [-1.7, 0, 2.3], size: [0.8, 1.08, 0.66], rot: 0.06 },
      { pos: [1.75, 0, 2.25], size: [0.76, 1.0, 0.64], rot: -0.07 },
    ];
  }, [mobile]);

  useFrame(() => {
    const s = experienceScalars(marketingScrollState.progress);
    const g = groupRef.current;
    if (!g) return;
    g.visible = s.portfolioWorld > 0.05;
    const scale = 0.55 + s.portfolioWorld * 0.55;
    g.scale.setScalar(scale);
  });

  const matBuilding = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a2622",
        roughness: 0.88,
        metalness: 0.06,
      }),
    [],
  );

  return (
    <group ref={groupRef} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[mobile ? 7 : 9, mobile ? 7 : 9]} />
        <meshStandardMaterial color="#0e1814" roughness={0.94} />
      </mesh>
      {!mobile ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -1.2]}>
            <planeGeometry args={[5.5, 0.22]} />
            <meshStandardMaterial color="#141f1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.1, 0.015, 0.8]}>
            <planeGeometry args={[0.18, 3.2]} />
            <meshStandardMaterial color="#141f1a" roughness={0.9} />
          </mesh>
        </>
      ) : null}
      {buildings.map((b, i) => (
        <group key={i} position={b.pos} rotation={[0, b.rot, 0]}>
          <mesh material={matBuilding}>
            <boxGeometry args={b.size} />
          </mesh>
          <mesh position={[0, b.size[1] / 2 + 0.02, b.size[2] / 2 + 0.01]}>
            <planeGeometry args={[b.size[0] * 0.75, b.size[1] * 0.45]} />
            <meshBasicMaterial color="#9cb0a4" transparent opacity={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
