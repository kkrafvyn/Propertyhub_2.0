import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clamp01, chapterLocalProgress } from "./scene-phases";
import type { ScenePointer } from "./useMarketingSceneProgress";

type SceneCameraRigProps = {
  progress: number;
  pointer: ScenePointer;
  mobile?: boolean;
  reducedMotion?: boolean;
};

const KEYFRAMES: { p: number; pos: THREE.Vector3; target: THREE.Vector3 }[] = [
  { p: 0, pos: new THREE.Vector3(5, 2.8, 7.5), target: new THREE.Vector3(0, 1, 0) },
  { p: 0.14, pos: new THREE.Vector3(3.2, 2.2, 5.5), target: new THREE.Vector3(0, 1.2, 0) },
  { p: 0.28, pos: new THREE.Vector3(1.6, 1.4, 3.2), target: new THREE.Vector3(0, 1.4, 0) },
  { p: 0.42, pos: new THREE.Vector3(2.8, 2.4, 6.5), target: new THREE.Vector3(0, 1.2, 0) },
  { p: 0.57, pos: new THREE.Vector3(9, 4.5, 11), target: new THREE.Vector3(0, 0.8, 0) },
  { p: 0.71, pos: new THREE.Vector3(2.2, 1.6, 4.5), target: new THREE.Vector3(0, 1.3, 0) },
  { p: 0.86, pos: new THREE.Vector3(7, 3.5, 9), target: new THREE.Vector3(0, 1, 0) },
  { p: 1, pos: new THREE.Vector3(0, 7, 14), target: new THREE.Vector3(0, 0.5, 0) },
];

function sampleCamera(progress: number) {
  const p = clamp01(progress);
  let i = 0;
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].p < p) i += 1;
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];
  const t = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
  return {
    pos: a.pos.clone().lerp(b.pos, t),
    target: a.target.clone().lerp(b.target, t),
  };
}

export function SceneCameraRig({ progress, pointer, mobile, reducedMotion }: SceneCameraRigProps) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 1, 0));
  const parallaxScale = mobile ? 0.08 : 0.22;

  useFrame((_, delta) => {
    const { pos, target } = sampleCamera(progress);
    lookAt.current.copy(target);

    if (!reducedMotion) {
      pos.x += pointer.x * parallaxScale;
      pos.y += pointer.y * parallaxScale * 0.5;
    }

    const travelScale = mobile ? 0.72 : 1;
    const desired = pos.clone().multiply(new THREE.Vector3(travelScale, travelScale, travelScale));

    camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
    camera.lookAt(lookAt.current);
  });

  return null;
}

export function sceneScalars(progress: number) {
  const layerSeparation = chapterLocalProgress(progress, 0.14, 0.32);
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
