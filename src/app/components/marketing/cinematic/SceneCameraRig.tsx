import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clamp01, chapterLocalProgress } from "./scene-phases";
import { easeInOutQuart } from "./cinematic-easing";
import { marketingScrollState } from "./marketingScrollState";

type SceneCameraRigProps = {
  mobile?: boolean;
  reducedMotion?: boolean;
};

const BUILDING_X = 1.15;

const KEYFRAMES: { p: number; pos: THREE.Vector3; target: THREE.Vector3 }[] = [
  { p: 0, pos: new THREE.Vector3(4.2, 2.6, 7.2), target: new THREE.Vector3(BUILDING_X, 1.1, 0) },
  { p: 0.14, pos: new THREE.Vector3(2.8, 2.1, 5.2), target: new THREE.Vector3(BUILDING_X, 1.25, 0) },
  { p: 0.28, pos: new THREE.Vector3(1.4, 1.35, 3.4), target: new THREE.Vector3(BUILDING_X, 1.45, 0) },
  { p: 0.42, pos: new THREE.Vector3(2.4, 2.35, 6.2), target: new THREE.Vector3(BUILDING_X, 1.2, 0) },
  { p: 0.57, pos: new THREE.Vector3(8.5, 4.2, 10.5), target: new THREE.Vector3(0, 0.9, 0) },
  { p: 0.71, pos: new THREE.Vector3(2.6, 1.55, 4.8), target: new THREE.Vector3(BUILDING_X, 1.35, 0) },
  { p: 0.86, pos: new THREE.Vector3(6.5, 3.4, 8.5), target: new THREE.Vector3(0.5, 1, 0) },
  { p: 1, pos: new THREE.Vector3(0.5, 6.5, 13), target: new THREE.Vector3(0, 0.6, 0) },
];

function sampleCamera(progress: number) {
  const p = clamp01(progress);
  let i = 0;
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].p < p) i += 1;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];
  const rawT = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
  const t = easeInOutQuart(rawT);
  return {
    pos: a.pos.clone().lerp(b.pos, t),
    target: a.target.clone().lerp(b.target, t),
  };
}

export function SceneCameraRig({ mobile, reducedMotion }: SceneCameraRigProps) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(BUILDING_X, 1, 0));
  const parallaxScale = mobile ? 0.06 : 0.18;

  useFrame((_, delta) => {
    const progress = marketingScrollState.progress;
    const pointer = marketingScrollState.pointer;
    const { pos, target } = sampleCamera(progress);
    lookAt.current.lerp(target, 1 - Math.pow(0.002, delta));

    if (!reducedMotion) {
      pos.x += pointer.x * parallaxScale;
      pos.y += pointer.y * parallaxScale * 0.45;
    }

    const travelScale = mobile ? 0.78 : 1;
    const desired = pos.clone().multiply(new THREE.Vector3(travelScale, travelScale, travelScale));

    camera.position.lerp(desired, 1 - Math.pow(0.0008, delta));
    camera.lookAt(lookAt.current);
  });

  return null;
}

export function sceneScalars(progress: number) {
  const layerSeparation = clamp01(chapterLocalProgress(progress, 0.14, 0.34) ** 1.05);
  const platformPanels = chapterLocalProgress(progress, 0.28, 0.42);
  const portfolioBlend = chapterLocalProgress(progress, 0.42, 0.57);
  const consumerBlend = chapterLocalProgress(progress, 0.57, 0.71);
  const aiBlend = chapterLocalProgress(progress, 0.71, 0.86);
  const brandFade = chapterLocalProgress(progress, 0.86, 1);
  const heroSpin = chapterLocalProgress(progress, 0, 0.14);

  return {
    layerSeparation,
    platformPanels,
    portfolioBlend,
    consumerBlend,
    aiBlend,
    brandFade,
    heroSpin,
    singleBuildingOpacity: 1 - portfolioBlend * 0.85 + brandFade * 0.5,
  };
}
