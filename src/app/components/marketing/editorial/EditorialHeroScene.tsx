import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PropertyModel } from "../cinematic/PropertyModel";

type EditorialHeroSceneProps = {
  onFailure?: () => void;
};

function HeroSceneInner() {
  return (
    <>
      <ambientLight intensity={1.05} color="#f7fbf8" />
      <hemisphereLight intensity={1.15} color="#ffffff" groundColor="#0d3b2b" />
      <directionalLight position={[5, 8, 6]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-4, 3, 3]} intensity={1.1} color="#8fbd9f" />
      <pointLight position={[1, 2, 4]} intensity={0.85} color="#ffffff" distance={12} />
      <group position={[0, -0.45, 0]} rotation={[0, 0.28, 0]} scale={1.02}>
        <PropertyModel layerSeparation={0.08} spin={0.18} floatPhase={0} />
      </group>
    </>
  );
}

export function EditorialHeroScene({ onFailure }: EditorialHeroSceneProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onFailure?.();
    }
  }, [onFailure]);

  return (
    <div className={`mk-ed-hero-scene${ready ? " is-ready" : ""}`} aria-hidden="true">
      {!ready ? <div className="mk-ed-hero-scene__loader" /> : null}
      <Canvas
        dpr={[1, 1.35]}
        shadows={false}
        camera={{ fov: 34, position: [4.6, 2.7, 6.2] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop="demand"
        onCreated={({ gl, invalidate }) => {
          setReady(true);
          gl.shadowMap.enabled = false;
          const canvas = gl.domElement;
          const onLost = (e: Event) => {
            e.preventDefault();
            onFailure?.();
          };
          canvas.addEventListener("webglcontextlost", onLost, { passive: false });
          invalidate();
        }}
      >
        <Suspense fallback={null}>
          <HeroSceneInner />
        </Suspense>
      </Canvas>
    </div>
  );
}
