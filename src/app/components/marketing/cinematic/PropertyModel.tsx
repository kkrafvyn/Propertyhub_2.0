import { useMemo, useRef, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUILDING_PALETTE,
  matFrame,
  matGlass,
  matGold,
  matPanel,
  matPanelDark,
  matPodium,
  matSoffit,
} from "./building-materials";

export type PropertyModelProps = {
  layerSeparation?: number;
  spin?: number;
  modelRef?: React.RefObject<THREE.Group | null>;
  floatPhase?: number;
};

/** Stacked cantilever volumes — inspired by offset high-rise forum architecture. */
const VOLUMES = [
  { w: 1.45, h: 0.52, d: 1.05, ox: 0, oz: 0, oy: 0.28, rot: 0 },
  { w: 1.38, h: 0.48, d: 1.02, ox: 0.14, oz: -0.1, oy: 0.84, rot: 0.06 },
  { w: 1.32, h: 0.46, d: 0.98, ox: -0.11, oz: 0.12, oy: 1.36, rot: -0.05 },
  { w: 1.28, h: 0.44, d: 0.94, ox: 0.18, oz: 0.08, oy: 1.86, rot: 0.08 },
  { w: 1.22, h: 0.42, d: 0.9, ox: -0.16, oz: -0.06, oy: 2.34, rot: -0.07 },
  { w: 1.15, h: 0.4, d: 0.86, ox: 0.1, oz: -0.14, oy: 2.8, rot: 0.04 },
] as const;

function RibbedCladding({
  width,
  height,
  depth,
  axis = "x",
}: {
  width: number;
  height: number;
  depth: number;
  axis?: "x" | "z";
}) {
  const ribs = 14;
  const ribElements = useMemo(() => {
    const items: ReactElement[] = [];
    for (let i = 0; i < ribs; i += 1) {
      const t = (i / (ribs - 1) - 0.5) * (axis === "x" ? width : depth);
      items.push(
        <mesh
          key={i}
          material={i % 3 === 0 ? matPanelDark : matPanel}
          position={
            axis === "x"
              ? [t, 0, depth / 2 + 0.006]
              : [width / 2 + 0.006, 0, t]
          }
        >
          <boxGeometry args={axis === "x" ? [0.018, height * 0.98, 0.012] : [0.012, height * 0.98, 0.018]} />
        </mesh>,
      );
    }
    return items;
  }, [width, height, depth, axis]);

  return (
    <group>
      <mesh material={matPanel} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      {ribElements}
    </group>
  );
}

function GlassCurtain({
  width,
  height,
  z,
  cols = 4,
  rows = 3,
}: {
  width: number;
  height: number;
  z: number;
  cols?: number;
  rows?: number;
}) {
  const paneW = width / cols;
  const paneH = height / rows;

  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const x = (col - (cols - 1) / 2) * paneW;
          const y = (row - (rows - 1) / 2) * paneH;
          return (
            <group key={`${row}-${col}`} position={[x, y, 0]}>
              <mesh material={matGlass}>
                <boxGeometry args={[paneW * 0.88, paneH * 0.88, 0.035]} />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[paneW * 0.75, paneH * 0.78]} />
                <meshBasicMaterial
                  color={BUILDING_PALETTE.warmInterior}
                  transparent
                  opacity={0.12 + ((row + col) % 3) * 0.08}
                />
              </mesh>
            </group>
          );
        }),
      )}
      {/* perimeter frame */}
      <mesh position={[0, 0, 0.04]} material={matFrame}>
        <boxGeometry args={[width + 0.04, height + 0.04, 0.02]} />
      </mesh>
    </group>
  );
}

function StackedVolume({
  index,
  spec,
  layerSeparation,
}: {
  index: number;
  spec: (typeof VOLUMES)[number];
  layerSeparation: number;
}) {
  const spread = layerSeparation * (index + 1) * 0.09;
  const y = spec.oy + spread;

  return (
    <group position={[spec.ox, y, spec.oz]} rotation={[0, spec.rot, 0]}>
      {/* primary mass */}
      <mesh castShadow receiveShadow material={matSoffit}>
        <boxGeometry args={[spec.w, spec.h, spec.d]} />
      </mesh>
      {/* front curtain wall */}
      <GlassCurtain width={spec.w * 0.92} height={spec.h * 0.88} z={spec.d / 2 + 0.02} />
      {/* side glass (90°) */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <GlassCurtain width={spec.d * 0.85} height={spec.h * 0.82} z={spec.w / 2 + 0.02} cols={3} rows={3} />
      </group>
      {/* ribbed side + back */}
      <group position={[0, 0, -spec.d / 2 - 0.01]}>
        <RibbedCladding width={spec.w} height={spec.h} depth={0.04} axis="x" />
      </group>
      <group position={[spec.w / 2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <RibbedCladding width={spec.d} height={spec.h} depth={0.04} axis="z" />
      </group>
      {/* cantilever soffit */}
      <mesh position={[0, -spec.h / 2 - 0.015, 0]} material={matSoffit} receiveShadow>
        <boxGeometry args={[spec.w * 1.02, 0.03, spec.d * 1.02]} />
      </mesh>
    </group>
  );
}

export function PropertyModel({
  layerSeparation = 0,
  spin = 0,
  modelRef: externalRef,
  floatPhase = 0,
}: PropertyModelProps) {
  const internalRef = useRef<THREE.Group>(null);
  const groupRef = externalRef ?? internalRef;

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, spin * 0.35, delta * 2);
    g.position.y = Math.sin(clock.elapsedTime * 0.55 + floatPhase) * 0.03;
  });

  const topY =
    VOLUMES[VOLUMES.length - 1].oy + VOLUMES[VOLUMES.length - 1].h / 2 + layerSeparation * VOLUMES.length * 0.09;

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#0a1210" roughness={1} />
      </mesh>

      {/* low podium */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow material={matPodium}>
        <boxGeometry args={[1.65, 0.24, 1.25]} />
      </mesh>
      <mesh position={[0, 0.26, 0.62]} material={matGold}>
        <boxGeometry args={[0.55, 0.32, 0.04]} />
      </mesh>

      {/* structural core (visible when volumes separate) */}
      <mesh position={[0, 1.55 + layerSeparation * 0.4, 0]}>
        <boxGeometry args={[0.35, 2.8 + layerSeparation * 0.5, 0.35]} />
        <meshStandardMaterial color={BUILDING_PALETTE.frame} roughness={0.85} metalness={0.2} />
      </mesh>

      {VOLUMES.map((spec, index) => (
        <StackedVolume key={index} index={index} spec={spec} layerSeparation={layerSeparation} />
      ))}

      {/* roof cap */}
      <mesh position={[VOLUMES[5].ox, topY + 0.08, VOLUMES[5].oz]} material={matPanelDark}>
        <boxGeometry args={[VOLUMES[5].w * 0.9, 0.06, VOLUMES[5].d * 0.9]} />
      </mesh>
    </group>
  );
}
