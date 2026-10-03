import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { sampleExperienceCamera } from "./experience-camera";

type ExperienceCameraRigProps = {
  mobile?: boolean;
  reducedMotion?: boolean;
};

export function ExperienceCameraRig({ mobile, reducedMotion }: ExperienceCameraRigProps) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 1.2, 0));
  const parallax = mobile ? 0.04 : 0.12;

  useFrame((_, delta) => {
    const progress = marketingScrollState.progress;
    const { pos, target } = sampleExperienceCamera(reducedMotion ? 0 : progress);
    lookAt.current.lerp(target, 1 - Math.pow(0.0015, delta));

    const desired = pos.clone();
    if (!reducedMotion) {
      desired.x += marketingScrollState.pointer.x * parallax;
      desired.y += marketingScrollState.pointer.y * parallax * 0.35;
    }
    if (mobile) desired.multiplyScalar(0.88);

    camera.position.lerp(desired, 1 - Math.pow(0.0006, delta));
    const persp = camera as THREE.PerspectiveCamera;
    if ("fov" in persp) {
      persp.fov = THREE.MathUtils.lerp(persp.fov, mobile ? 44 : 42, 0.05);
      persp.updateProjectionMatrix();
    }
    camera.lookAt(lookAt.current);
  });

  return null;
}
