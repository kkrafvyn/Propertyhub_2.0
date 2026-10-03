import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  BUILDING_PALETTE,
  matBronze,
  matGlass,
  matGlassBalcony,
  matGold,
  matLimestone,
  matPodium,
  matRail,
  matSpandrel,
} from "./building-materials";

export type PropertyModelProps = {
  layerSeparation?: number;
  spin?: number;
  modelRef?: React.RefObject<THREE.Group | null>;
  floatPhase?: number;
};

const FLOOR_H = 0.36;
const RES_FLOORS = 9;
const PODIUM_H = 0.52;
const WIDTH = 1.55;
const DEPTH = 1.05;

function floorY(index: number, layerSeparation: number) {
  const base = PODIUM_H + 0.08 + index * FLOOR_H;
  const spread = layerSeparation * (index + 1) * 0.07;
  return base + spread;
}

function WindowBay({
  x,
  y,
  z,
  w,
  h,
  depth = 0.04,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  depth?: number;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, depth / 2]} material={matGlass}>
        <boxGeometry args={[w, h, depth]} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.008]} material={matBronze}>
        <boxGeometry args={[w + 0.02, 0.025, 0.012]} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.008]} material={matBronze}>
        <boxGeometry args={[0.025, h + 0.02, 0.012]} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w * 0.85, h * 0.88]} />
        <meshBasicMaterial color={BUILDING_PALETTE.warmInterior} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Balcony({ y, z, width }: { y: number; z: number; width: number }) {
  return (
    <group position={[0, y, z]}>
      <mesh position={[0, -0.02, 0.12]} castShadow receiveShadow material={matLimestone}>
        <boxGeometry args={[width, 0.04, 0.22]} />
      </mesh>
      <mesh position={[0, 0.06, 0.22]} material={matGlassBalcony}>
        <boxGeometry args={[width, 0.12, 0.015]} />
      </mesh>
      <mesh position={[-width / 2 + 0.02, 0.03, 0.12]} material={matRail}>
        <boxGeometry args={[0.02, 0.08, 0.22]} />
      </mesh>
      <mesh position={[width / 2 - 0.02, 0.03, 0.12]} material={matRail}>
        <boxGeometry args={[0.02, 0.08, 0.22]} />
      </mesh>
    </group>
  );
}

function ResidentialFloor({
  index,
  layerSeparation,
  isSetback,
}: {
  index: number;
  layerSeparation: number;
  isSetback: boolean;
}) {
  const y = floorY(index, layerSeparation);
  const taper = isSetback ? 0.88 : 1;
  const w = WIDTH * taper;
  const d = DEPTH * taper;
  const winW = w * 0.22;
  const winH = FLOOR_H * 0.55;
  const frontZ = d / 2 + 0.01;

  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -FLOOR_H * 0.38, frontZ - 0.02]} castShadow material={matSpandrel}>
        <boxGeometry args={[w * 0.98, FLOOR_H * 0.12, 0.06]} />
      </mesh>
      <RoundedBox
        args={[w, FLOOR_H * 0.92, d]}
        radius={0.02}
        smoothness={4}
        castShadow
        receiveShadow
        material={matLimestone}
      />
      {[-winW * 1.35, 0, winW * 1.35].map((ox) => (
        <WindowBay key={ox} x={ox} y={0} z={frontZ} w={winW} h={winH} />
      ))}
      {index % 2 === 1 ? <Balcony y={-FLOOR_H * 0.15} z={frontZ} width={winW * 1.15} /> : null}
      <WindowBay x={w / 2 + 0.01} y={0} z={0} w={0.08} h={winH * 0.9} depth={0.03} />
    </group>
  );
}

function Podium({ layerSeparation }: { layerSeparation: number }) {
  const y = PODIUM_H / 2 + layerSeparation * 0.02;

  return (
    <group position={[0, y, 0]}>
      <RoundedBox
        args={[WIDTH * 1.12, PODIUM_H, DEPTH * 1.08]}
        radius={0.03}
        smoothness={4}
        castShadow
        receiveShadow
        material={matPodium}
      />
      <mesh position={[0, 0, DEPTH * 0.54 + 0.02]} material={matGlass}>
        <boxGeometry args={[WIDTH * 0.55, PODIUM_H * 0.75, 0.05]} />
      </mesh>
      <mesh position={[0, -PODIUM_H * 0.35, DEPTH * 0.62]} castShadow material={matGold}>
        <boxGeometry args={[0.7, 0.04, 0.35]} />
      </mesh>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, -PODIUM_H * 0.15, DEPTH * 0.58]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, PODIUM_H * 0.5, 12]} />
          <meshStandardMaterial color={BUILDING_PALETTE.stoneDark} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

function Crown({ topY }: { topY: number }) {
  return (
    <group position={[0, topY + 0.12, 0]}>
      <mesh castShadow material={matLimestone}>
        <boxGeometry args={[WIDTH * 0.75, 0.14, DEPTH * 0.75]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={matGold}>
        <boxGeometry args={[WIDTH * 0.55, 0.08, DEPTH * 0.55]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.35 + i * 0.22, 0.22, 0]} material={matBronze}>
          <boxGeometry args={[0.04, 0.18, DEPTH * 0.5]} />
        </mesh>
      ))}
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
  const floorIndices = useMemo(() => Array.from({ length: RES_FLOORS }, (_, i) => i), []);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, spin * 0.35, delta * 2);
    g.position.y = Math.sin(clock.elapsedTime * 0.55 + floatPhase) * 0.035;
  });

  const topFloorY = floorY(RES_FLOORS - 1, layerSeparation);

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[2.8, 64]} />
        <meshStandardMaterial color="#0a1210" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[1.35, 2.5, 64]} />
        <meshStandardMaterial color="#142820" roughness={0.95} />
      </mesh>

      <Podium layerSeparation={layerSeparation} />

      {floorIndices.map((i) => (
        <ResidentialFloor
          key={i}
          index={i}
          layerSeparation={layerSeparation}
          isSetback={i >= RES_FLOORS - 2}
        />
      ))}

      <Crown topY={topFloorY + FLOOR_H * 0.5} />

      {layerSeparation > 0.05 ? (
        <mesh position={[0, PODIUM_H + (topFloorY - PODIUM_H) / 2, 0]}>
          <boxGeometry args={[WIDTH * 0.35, topFloorY - PODIUM_H + FLOOR_H, DEPTH * 0.35]} />
          <meshStandardMaterial color={BUILDING_PALETTE.stoneDark} roughness={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}
