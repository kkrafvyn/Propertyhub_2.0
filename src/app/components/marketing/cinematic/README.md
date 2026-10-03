# Cinematic marketing 3D

## Replace placeholder building with GLB

1. Export from Blender/Spline as `.glb` (Draco or Meshopt compression recommended).
2. Place under `public/models/baytmiftah-tower.glb`.
3. In `PropertyModel.tsx`, load with `@react-three/drei`:

```tsx
import { useGLTF } from "@react-three/drei";

export function PropertyModel(props: PropertyModelProps) {
  const { scene } = useGLTF("/models/baytmiftah-tower.glb");
  const groupRef = useRef<THREE.Group>(null);
  // clone scene, apply layerSeparation to named floor nodes
  return <group ref={groupRef}><primitive object={scene.clone()} scale={...} /></group>;
}
```

Keep the same `PropertyModel` export and props so `Marketing3DScene` unchanged.

## Scroll choreography

Camera keyframes live in `SceneCameraRig.tsx`. Scroll progress comes from GSAP `ScrollTrigger` on `.mk-cinema-scroll` (`useMarketingSceneProgress.ts`).
