import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  matConcrete,
  matFrame,
  matGlass,
  matPanel,
  matPanelDark,
  matPodium,
  matSoffit,
  matWood,
} from "../cinematic/building-materials";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars } from "./experience-scalars";

const FLOOR_SPECS = [
  { label: "Leasing", role: "Leasing", h: 0.52, w: 1.52, d: 1.12, slab: 0.06 },
  { label: "Residents", role: "Residents", h: 0.48, w: 1.48, d: 1.08, slab: 0.055 },
  { label: "Maintenance", role: "Maintenance", h: 0.46, w: 1.44, d: 1.05, slab: 0.05 },
  { label: "Finance", role: "Finance", h: 0.44, w: 1.4, d: 1.02, slab: 0.05 },
  { label: "Portfolio / AI", role: "Command", h: 0.4, w: 1.34, d: 0.98, slab: 0.045 },
] as const;

export type ArchitecturalPropertyProps = {
  glbSrc?: string | null;
  mobile?: boolean;
};

function FloorPlate({
  w,
  d,
  slab,
  y,
}: {
  w: number;
  d: number;
  slab: number;
  y: number;
}) {
  return (
    <mesh position={[0, y - slab / 2, 0]} material={matConcrete}>
      <boxGeometry args={[w * 1.02, slab, d * 1.02]} />
    </mesh>
  );
}

export function ArchitecturalProperty({ mobile }: ArchitecturalPropertyProps) {
  const floorRefs = useRef<(THREE.Group | null)[]>([]);
  const coreRef = useRef<THREE.Mesh>(null);
  const windowLights = useMemo(() => {
    const mats: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < 30; i++) {
      mats.push(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.1, 0.28, 0.52 + (i % 5) * 0.06),
          transparent: true,
          opacity: 0.14,
        }),
      );
    }
    return mats;
  }, []);

  useFrame(({ clock }) => {
    const s = experienceScalars(marketingScrollState.progress);
    const sep = s.floorSeparation * (mobile ? 0.5 : 1);
    const spreadBase = mobile ? 0.28 : 0.42;
    let y = 0.42;
    floorRefs.current.forEach((group, index) => {
      if (!group) return;
      const spec = FLOOR_SPECS[index];
      const baseY = y;
      y += spec.h + spec.slab + 0.04;
      const spread = sep * (index + 1) * spreadBase;
      group.position.y = baseY + spread;
    });
    if (coreRef.current) {
      coreRef.current.scale.y = 1 + sep * 0.85;
    }
    const flicker = 0.88 + Math.sin(clock.elapsedTime * 0.55 + 0.3) * 0.06;
    windowLights.forEach((m, i) => {
      m.opacity = (0.1 + s.exteriorLight * 0.32) * (i % 4 === 0 ? flicker : 1);
    });
  });

  let stackY = 0.42;
  const pathW = mobile ? 3.2 : 4.2;

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[mobile ? 4.2 : 6, 64]} />
        <meshStandardMaterial color="#0a1210" roughness={0.96} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0.9]}>
        <planeGeometry args={[pathW, 0.35]} />
        <meshStandardMaterial color="#141f1a" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.1, 0]} material={matPodium}>
        <boxGeometry args={[1.85, 0.18, 1.45]} />
      </mesh>
      <mesh position={[0, 0.22, 0.72]} material={matWood}>
        <boxGeometry args={[0.55, 0.28, 0.12]} />
      </mesh>
      <mesh position={[0, 0.38, 0.78]} material={matGlass}>
        <boxGeometry args={[0.48, 0.22, 0.04]} />
      </mesh>

      <mesh ref={coreRef} position={[0, 1.65, 0]} material={matFrame}>
        <boxGeometry args={[0.12, 2.8, 0.12]} />
      </mesh>

      {FLOOR_SPECS.map((floor, index) => {
        const y0 = stackY;
        stackY += floor.h + floor.slab + 0.04;
        const balcony = index % 2 === 0;
        return (
          <group
            key={floor.label}
            ref={(el) => {
              floorRefs.current[index] = el;
            }}
            position={[0, y0, 0]}
          >
            <FloorPlate w={floor.w} d={floor.d} slab={floor.slab} y={0} />
            <mesh position={[0, floor.h / 2, 0]} material={matSoffit}>
              <boxGeometry args={[floor.w, floor.h, floor.d]} />
            </mesh>
            <mesh position={[0, 0, floor.d / 2 + 0.015]} material={matPanelDark}>
              <boxGeometry args={[floor.w * 0.94, floor.h * 0.92, 0.06]} />
            </mesh>
            <mesh position={[0, 0, floor.d / 2 + 0.05]} material={matGlass}>
              <boxGeometry args={[floor.w * 0.82, floor.h * 0.68, 0.035]} />
            </mesh>
            {Array.from({ length: 5 }, (_, wi) => (
              <mesh
                key={wi}
                position={[(wi - 2) * (floor.w * 0.19), floor.h * 0.05, floor.d / 2 + 0.055]}
                material={windowLights[(index * 5 + wi) % windowLights.length]}
              >
                <planeGeometry args={[floor.w * 0.14, floor.h * 0.32]} />
              </mesh>
            ))}
            {balcony ? (
              <mesh position={[floor.w / 2 + 0.14, -floor.h * 0.15, 0.05]} material={matConcrete}>
                <boxGeometry args={[0.28, 0.04, floor.d * 0.55]} />
              </mesh>
            ) : null}
            <mesh position={[-floor.w / 2 - 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={matPanel}>
              <boxGeometry args={[floor.d, floor.h, 0.04]} />
            </mesh>
          </group>
        );
      })}

      <mesh position={[0, stackY + 0.08, 0]} material={matFrame}>
        <boxGeometry args={[1.05, 0.08, 0.85]} />
      </mesh>
    </group>
  );
}
