import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars } from "./experience-scalars";

export function MaintenanceUnitMarker() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const s = experienceScalars(marketingScrollState.progress);
    const mesh = ref.current;
    if (!mesh) return;
    const on = s.maintenance > 0.12 && s.maintenance < 0.92;
    mesh.visible = on;
    if (on) {
      const pulse = 0.85 + Math.sin(marketingScrollState.progress * 40) * 0.08;
      mesh.scale.setScalar(0.06 * pulse);
    }
  });

  return (
    <mesh ref={ref} position={[0.12, 1.12, 0.38]} visible={false}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color="#c9a962" transparent opacity={0.75} />
    </mesh>
  );
}
