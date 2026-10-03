import * as THREE from "three";
import { clamp01 } from "../cinematic/scene-phases";

const BUILDING = new THREE.Vector3(0, 1.2, 0);

/** Cinematic camera keyframes — tuned for ~42mm feel, slow dolly/orbit. */
export const EXPERIENCE_CAMERA_KEYFRAMES: {
  p: number;
  pos: THREE.Vector3;
  target: THREE.Vector3;
}[] = [
  { p: 0, pos: new THREE.Vector3(5.5, 3.2, 8.5), target: BUILDING.clone() },
  { p: 0.08, pos: new THREE.Vector3(4.2, 2.6, 6.8), target: BUILDING.clone() },
  { p: 0.17, pos: new THREE.Vector3(2.4, 2.2, 4.5), target: new THREE.Vector3(0, 1.8, 0) },
  { p: 0.27, pos: new THREE.Vector3(3.2, 2.8, 5.8), target: BUILDING.clone() },
  { p: 0.37, pos: new THREE.Vector3(7.5, 4.5, 11), target: new THREE.Vector3(0, 0.8, 0) },
  { p: 0.47, pos: new THREE.Vector3(3.8, 2.4, 5.2), target: new THREE.Vector3(0, 1.4, 0) },
  { p: 0.57, pos: new THREE.Vector3(1.8, 1.6, 3.2), target: new THREE.Vector3(0, 1.2, 0.2) },
  { p: 0.67, pos: new THREE.Vector3(2.6, 2.1, 4.2), target: new THREE.Vector3(0, 1, 0) },
  { p: 0.76, pos: new THREE.Vector3(1.5, 1.35, 2.8), target: new THREE.Vector3(0, 1.1, 0.15) },
  { p: 0.84, pos: new THREE.Vector3(1.2, 1.25, 2.4), target: new THREE.Vector3(0.15, 1.05, 0.2) },
  { p: 0.91, pos: new THREE.Vector3(4.5, 3.5, 7.5), target: BUILDING.clone() },
  { p: 1, pos: new THREE.Vector3(1.2, 7.5, 14), target: new THREE.Vector3(0, 0.5, 0) },
];

export function sampleExperienceCamera(progress: number) {
  const p = clamp01(progress);
  let i = 0;
  while (i < EXPERIENCE_CAMERA_KEYFRAMES.length - 2 && EXPERIENCE_CAMERA_KEYFRAMES[i + 1].p < p) i += 1;
  const a = EXPERIENCE_CAMERA_KEYFRAMES[i];
  const b = EXPERIENCE_CAMERA_KEYFRAMES[Math.min(i + 1, EXPERIENCE_CAMERA_KEYFRAMES.length - 1)];
  const t = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
  const ease = t * t * (3 - 2 * t);
  return {
    pos: a.pos.clone().lerp(b.pos, ease),
    target: a.target.clone().lerp(b.target, ease),
  };
}
