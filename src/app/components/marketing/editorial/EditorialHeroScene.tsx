import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PropertyModel } from "../cinematic/PropertyModel";
import { SceneLights } from "../cinematic/SceneLights";

type EditorialHeroSceneProps = {
  onFailure?: () => void;
};

function HeroSceneInner() {
  return (
    <>
      <SceneLights mobile={false} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} color="#fff8ef" />
      <directionalLight position={[-3, 2, 4]} intensity={0.45} color="#dfc07a" />
      <group position={[0, -0.35, 0]} rotation={[0, 0.35, 0]} scale={0.92}>
        <PropertyModel layerSeparation={0.05} spin={0.12} floatPhase={0} />
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
        camera={{ fov: 38, position: [4.2, 2.4, 5.8] }}
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
