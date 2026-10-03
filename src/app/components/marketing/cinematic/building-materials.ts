import * as THREE from "three";

export const BUILDING_PALETTE = {
  limestone: "#e8e0d2",
  spandrel: "#cfc6b8",
  stoneDark: "#3d4f47",
  podium: "#1a3329",
  glass: "#7fa892",
  bronze: "#8b7355",
  gold: "#c4a055",
  rail: "#2a3530",
  warmInterior: "#ffe8c8",
} as const;

export const matLimestone = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.limestone,
  roughness: 0.62,
  metalness: 0.06,
});

export const matSpandrel = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.spandrel,
  roughness: 0.7,
  metalness: 0.05,
});

export const matPodium = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.podium,
  roughness: 0.85,
  metalness: 0.04,
});

export const matBronze = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.bronze,
  roughness: 0.45,
  metalness: 0.35,
});

export const matRail = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.rail,
  roughness: 0.5,
  metalness: 0.4,
});

export const matGlass = new THREE.MeshPhysicalMaterial({
  color: BUILDING_PALETTE.glass,
  roughness: 0.08,
  metalness: 0.2,
  transparent: true,
  opacity: 0.55,
  transmission: 0.35,
  thickness: 0.15,
});

export const matGlassBalcony = new THREE.MeshPhysicalMaterial({
  color: BUILDING_PALETTE.glass,
  roughness: 0.1,
  metalness: 0.25,
  transparent: true,
  opacity: 0.4,
  transmission: 0.2,
});

export const matGold = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.gold,
  roughness: 0.32,
  metalness: 0.6,
});
