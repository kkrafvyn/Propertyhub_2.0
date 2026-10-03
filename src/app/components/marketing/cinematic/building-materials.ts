import * as THREE from "three";

/** Reference-inspired palette: glass + ribbed metal, with BaytMiftah forest podium accent. */
export const BUILDING_PALETTE = {
  panel: "#7a828a",
  panelDark: "#5c636a",
  soffit: "#8b9299",
  glass: "#6e9098",
  glassTint: "#4a6670",
  frame: "#3d454c",
  podium: "#1a3329",
  warmInterior: "#e8dcc8",
  goldAccent: "#c4a055",
} as const;

export const matPanel = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.panel,
  roughness: 0.55,
  metalness: 0.42,
});

export const matPanelDark = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.panelDark,
  roughness: 0.65,
  metalness: 0.35,
});

export const matSoffit = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.soffit,
  roughness: 0.48,
  metalness: 0.38,
});

export const matFrame = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.frame,
  roughness: 0.4,
  metalness: 0.55,
});

export const matPodium = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.podium,
  roughness: 0.88,
  metalness: 0.05,
});

export const matGlass = new THREE.MeshPhysicalMaterial({
  color: BUILDING_PALETTE.glass,
  roughness: 0.05,
  metalness: 0.15,
  transparent: true,
  opacity: 0.52,
  transmission: 0.42,
  thickness: 0.2,
  envMapIntensity: 0.35,
});

export const matGold = new THREE.MeshStandardMaterial({
  color: BUILDING_PALETTE.goldAccent,
  roughness: 0.35,
  metalness: 0.58,
});
