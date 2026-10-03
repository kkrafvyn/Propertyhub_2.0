import * as THREE from "three";

/** Architectural palette — restrained concrete, glass, forest podium. */
export const BUILDING_PALETTE = {
  panel: "#6e757c",
  panelDark: "#52585e",
  soffit: "#7a8288",
  concrete: "#8a9096",
  glass: "#5a7278",
  glassTint: "#3d5258",
  frame: "#343b42",
  podium: "#152820",
  landscape: "#0c1612",
  warmInterior: "#e6dcc8",
  woodAccent: "#6b5a48",
  goldAccent: "#a8925c",
} as const;

export const matPanel = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.panel,
  roughness: 0.72,
  metalness: 0.12,
});

export const matPanelDark = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.panelDark,
  roughness: 0.78,
  metalness: 0.08,
});

export const matSoffit = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.soffit,
  roughness: 0.68,
  metalness: 0.1,
});

export const matConcrete = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.concrete,
  roughness: 0.88,
  metalness: 0.04,
});

export const matFrame = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.frame,
  roughness: 0.55,
  metalness: 0.22,
});

export const matPodium = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.podium,
  roughness: 0.92,
  metalness: 0.02,
});

export const matWood = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.woodAccent,
  roughness: 0.82,
  metalness: 0.05,
});

export const matGlass = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.glassTint,
  roughness: 0.22,
  metalness: 0.08,
  transparent: true,
  opacity: 0.38,
});

export const matGold = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.goldAccent,
  roughness: 0.45,
  metalness: 0.35,
});
