import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { matFrame, matGlass, matPanel, matPodium, matSoffit } from "../cinematic/building-materials";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars } from "./experience-scalars";

const FLOOR_SPECS = [
  { label: "Leasing", h: 0.55, w: 1.5, d: 1.1 },
  { label: "Residents", h: 0.5, w: 1.45, d: 1.08 },
  { label: "Operations", h: 0.48, w: 1.42, d: 1.05 },
  { label: "Finance", h: 0.46, w: 1.38, d: 1.02 },
  { label: "AI", h: 0.42, w: 1.32, d: 0.98 },
] as const;

export type ArchitecturalPropertyProps = {
  /** When set and loadable, replaces procedural mesh (see PROPERTY_GLB_PATH). */
  glbSrc?: string | null;
  mobile?: boolean;
};

export function ArchitecturalProperty({ mobile }: ArchitecturalPropertyProps) {
  const floorRefs = useRef<(THREE.Group | null)[]>([]);
  const windowLights = useMemo(() => {
    const mats: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < 24; i++) {
      mats.push(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.12, 0.35, 0.55 + Math.random() * 0.25),
          transparent: true,
          opacity: 0.15,
        }),
      );
    }
    return mats;
  }, []);

  useFrame(({ clock }) => {
    const s = experienceScalars(marketingScrollState.progress);
    const sep = s.floorSeparation * (mobile ? 0.55 : 1);
    let y = 0.35;
    floorRefs.current.forEach((group, index) => {
      if (!group) return;
      const baseY = y;
      y += FLOOR_SPECS[index].h + 0.08;
      const spread = sep * (index + 1) * 0.22;
      group.position.y = baseY + spread;
    });
    const flicker = 0.85 + Math.sin(clock.elapsedTime * 0.8) * 0.08;
    windowLights.forEach((m, i) => {
      m.opacity = (0.12 + s.exteriorLight * 0.35) * (i % 3 === 0 ? flicker : 1);
    });
  });

  let stackY = 0.35;

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[mobile ? 4 : 5.5, 48]} />
        <meshStandardMaterial color="#0a1210" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.08, 0]} material={matPodium}>
        <boxGeometry args={[1.75, 0.16, 1.35]} />
      </mesh>

      {FLOOR_SPECS.map((floor, index) => {
        const y0 = stackY;
        stackY += floor.h + 0.08;
        return (
          <group
            key={floor.label}
            ref={(el) => {
              floorRefs.current[index] = el;
            }}
            position={[0, y0, 0]}
          >
            <mesh material={matSoffit}>
              <boxGeometry args={[floor.w, floor.h, floor.d]} />
            </mesh>
            <mesh position={[0, 0, floor.d / 2 + 0.02]} material={matGlass}>
              <boxGeometry args={[floor.w * 0.88, floor.h * 0.75, 0.04]} />
            </mesh>
            {Array.from({ length: 4 }, (_, wi) => (
              <mesh
                key={wi}
                position={[(wi - 1.5) * (floor.w * 0.22), floor.h * 0.1, floor.d / 2 + 0.025]}
                material={windowLights[(index * 4 + wi) % windowLights.length]}
              >
                <planeGeometry args={[floor.w * 0.18, floor.h * 0.35]} />
              </mesh>
            ))}
            <mesh position={[floor.w / 2 + 0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={matPanel}>
              <boxGeometry args={[floor.d, floor.h, 0.03]} />
            </mesh>
            <mesh position={[0, floor.h / 2 + 0.02, 0]} material={matFrame}>
              <boxGeometry args={[floor.w * 0.7, 0.02, floor.d * 0.35]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
