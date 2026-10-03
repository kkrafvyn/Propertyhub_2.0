import * as THREE from "three";
import { clamp01 } from "../cinematic/scene-phases";
import { easeInOutQuart, easeOutCubic } from "../cinematic/cinematic-easing";

const BUILDING = new THREE.Vector3(0, 1.35, 0);
const ENTRY = new THREE.Vector3(0, 0.55, 0.85);
const UNIT = new THREE.Vector3(0.08, 1.15, 0.35);

/** Chapter cinematography — ~40mm default, deliberate dolly / crane / push. */
export const EXPERIENCE_CAMERA_KEYFRAMES: {
  p: number;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  ease?: (t: number) => number;
}[] = [
  { p: 0, pos: new THREE.Vector3(6.2, 3.45, 9.2), target: BUILDING.clone(), ease: easeOutCubic },
  { p: 0.08, pos: new THREE.Vector3(4.6, 2.85, 7.2), target: BUILDING.clone() },
  { p: 0.17, pos: new THREE.Vector3(2.1, 2.35, 4.8), target: new THREE.Vector3(0, 2.1, 0) },
  { p: 0.27, pos: new THREE.Vector3(3.4, 3.1, 6.4), target: BUILDING.clone() },
  { p: 0.37, pos: new THREE.Vector3(8.2, 4.8, 11.5), target: new THREE.Vector3(0, 0.65, 0) },
  { p: 0.47, pos: new THREE.Vector3(5.5, 3.2, 8.5), target: new THREE.Vector3(0, 1.1, 0) },
  { p: 0.52, pos: new THREE.Vector3(3.6, 2.5, 5.8), target: new THREE.Vector3(0, 1.35, 0.15) },
  { p: 0.57, pos: new THREE.Vector3(2.2, 1.85, 3.9), target: UNIT.clone() },
  { p: 0.67, pos: new THREE.Vector3(2.4, 2.05, 4.4), target: new THREE.Vector3(0, 1.05, 0.12) },
  { p: 0.76, pos: new THREE.Vector3(1.65, 1.45, 3.1), target: UNIT.clone() },
  { p: 0.84, pos: new THREE.Vector3(1.35, 1.32, 2.65), target: new THREE.Vector3(0.12, 1.08, 0.28) },
  { p: 0.91, pos: new THREE.Vector3(5.2, 3.65, 8.2), target: BUILDING.clone() },
  { p: 1, pos: new THREE.Vector3(0.8, 8.2, 15), target: new THREE.Vector3(0, 0.45, 0) },
];

export function sampleExperienceCamera(progress: number) {
  const p = clamp01(progress);
  let i = 0;
  while (i < EXPERIENCE_CAMERA_KEYFRAMES.length - 2 && EXPERIENCE_CAMERA_KEYFRAMES[i + 1].p < p) i += 1;
  const a = EXPERIENCE_CAMERA_KEYFRAMES[i];
  const b = EXPERIENCE_CAMERA_KEYFRAMES[Math.min(i + 1, EXPERIENCE_CAMERA_KEYFRAMES.length - 1)];
  const rawT = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
  const easeFn = b.ease ?? easeInOutQuart;
  const t = easeFn(rawT);

  return {
    pos: a.pos.clone().lerp(b.pos, t),
    target: a.target.clone().lerp(b.target, t),
  };
}

export const EXPERIENCE_ANCHORS = {
  heroAnchor: BUILDING,
  entryAnchor: ENTRY,
  leasingAnchor: new THREE.Vector3(0.9, 0.9, 0.75),
  financeAnchor: new THREE.Vector3(-0.7, 2.4, 0.5),
  maintenanceAnchor: UNIT,
  residentAnchor: new THREE.Vector3(0.15, 1.12, 0.42),
  aiAnchor: new THREE.Vector3(0, 3.2, 0),
  roofAnchor: new THREE.Vector3(0, 3.5, 0),
} as const;
