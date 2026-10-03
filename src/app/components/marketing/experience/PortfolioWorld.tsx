import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars } from "./experience-scalars";

type PortfolioWorldProps = {
  mobile?: boolean;
};

export function PortfolioWorld({ mobile }: PortfolioWorldProps) {
  const groupRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const count = mobile ? 5 : 8;
    const out: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 2.2 + (i % 3) * 0.4;
      out.push([Math.cos(angle) * r, 0, Math.sin(angle) * r]);
    }
    return out;
  }, [mobile]);

  useFrame(() => {
    const s = experienceScalars(marketingScrollState.progress);
    const g = groupRef.current;
    if (!g) return;
    g.visible = s.portfolioWorld > 0.05;
    g.scale.setScalar(0.6 + s.portfolioWorld * 0.5);
  });

  return (
    <group ref={groupRef} visible={false}>
      {positions.map(([x, , z], i) => (
        <group key={i} position={[x, 0.4 + (i % 3) * 0.15, z]} scale={0.35 + (i % 2) * 0.08}>
          <mesh>
            <boxGeometry args={[0.9, 1.2 + (i % 3) * 0.2, 0.75]} />
            <meshStandardMaterial color="#1a2a24" roughness={0.85} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.65, 0.38]}>
            <planeGeometry args={[0.7, 0.5]} />
            <meshBasicMaterial color="#c9d4cc" transparent opacity={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
