import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { experienceScalars } from "./experience-scalars";

type ExperienceDynamicLightsProps = {
  mobile?: boolean;
};

export function ExperienceDynamicLights({ mobile }: ExperienceDynamicLightsProps) {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.HemisphereLight>(null);
  const intensity = mobile ? 0.85 : 1;

  useFrame(() => {
    const s = experienceScalars(marketingScrollState.progress);
    if (keyRef.current) {
      keyRef.current.intensity = (0.45 + s.exteriorLight * 0.85) * intensity;
    }
    if (fillRef.current) {
      fillRef.current.intensity = (0.38 - s.financeDarken * 0.12) * intensity;
    }
  });

  return (
    <>
      <color attach="background" args={["#060e0b"]} />
      <fog attach="fog" args={["#060e0b", 10, mobile ? 22 : 28]} />
      <hemisphereLight
        ref={fillRef}
        intensity={0.5 * intensity}
        color="#d8e2dc"
        groundColor="#0a1612"
      />
      <ambientLight intensity={0.26 * intensity} color="#c8d4cc" />
      <directionalLight
        ref={keyRef}
        position={[6, 8, 4]}
        intensity={0.9 * intensity}
        color="#f5efe6"
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.32} color="#1b4332" />
      <spotLight
        position={[0, 6, 2]}
        angle={0.45}
        penumbra={0.85}
        intensity={0.55 * intensity}
        color="#e8dcc8"
      />
      <directionalLight position={[-5, 2, 6]} intensity={0.38 * intensity} color="#c4b896" />
      <pointLight position={[2.5, 1.2, 3]} intensity={0.18 * intensity} color="#e6dcc8" distance={10} />
    </>
  );
}
