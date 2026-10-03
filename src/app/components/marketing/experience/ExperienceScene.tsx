import { Suspense, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { marketingScrollState } from "../cinematic/marketingScrollState";
import { ConsumerPhone3D } from "../cinematic/ConsumerPhone3D";
import { PortfolioConnections } from "../cinematic/PortfolioConnections";
import { ConnectionSpine } from "./ConnectionSpine";
import { ExperienceCameraRig } from "./ExperienceCameraRig";
import { ExperienceDynamicLights } from "./ExperienceDynamicLights";
import { ExperienceProductLayers } from "./ExperienceProductLayers";
import { PortfolioWorld } from "./PortfolioWorld";
import { PropertyModelExperience } from "./PropertyModelExperience";
import { SpatialLabels } from "./SpatialLabels";
import { useExperienceScalars } from "./useExperienceScalars";

type ExperienceSceneProps = {
  mobile?: boolean;
  reducedMotion?: boolean;
  onContextLost?: () => void;
  onReady?: () => void;
};

function CanvasInvalidateBridge() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    marketingScrollState.registerInvalidate(invalidate);
    return () => marketingScrollState.registerInvalidate(null);
  }, [invalidate]);
  useFrame(() => {
    /* demand frameloop — scroll + pointer call invalidate via marketingScrollState */
  });
  return null;
}

function ExperienceSceneInner({ mobile, reducedMotion }: ExperienceSceneProps) {
  const s = useExperienceScalars(48);

  return (
    <>
      <CanvasInvalidateBridge />
      <ExperienceDynamicLights mobile={mobile} />
      <ExperienceCameraRig mobile={mobile} reducedMotion={reducedMotion} />

      <group position={[0, -0.05, 0]}>
        <PropertyModelExperience mobile={mobile} />
      </group>

      <PortfolioWorld mobile={mobile} />
      <PortfolioConnections blend={s.portfolioWorld} mobile={mobile} />
      <ConnectionSpine />
      <SpatialLabels mobile={mobile} />
      <ExperienceProductLayers mobile={mobile} />
      <ConsumerPhone3D blend={s.resident} mobile={mobile} />
    </>
  );
}

export function ExperienceScene({ mobile, reducedMotion, onContextLost, onReady }: ExperienceSceneProps) {
  const [paused, setPaused] = useState(false);
  const dpr: [number, number] = mobile ? [1, 1.25] : [1, 1.5];

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (reducedMotion) return null;

  return (
    <div className="mk-cinema-canvas-wrap mk-xp-canvas-wrap" aria-hidden="true">
      <div className="mk-cinema-vignette" aria-hidden="true" />
      <Canvas
        onCreated={({ gl, invalidate }) => {
          onReady?.();
          marketingScrollState.registerInvalidate(invalidate);
          gl.shadowMap.enabled = false;
          const canvas = gl.domElement;
          const onLost = (event: Event) => {
            event.preventDefault();
            onContextLost?.();
          };
          canvas.addEventListener("webglcontextlost", onLost, { passive: false });
        }}
        dpr={dpr}
        shadows={false}
        camera={{ fov: 42, near: 0.1, far: 100, position: [5.5, 3.2, 8.5] }}
        gl={{
          antialias: !mobile,
          powerPreference: "high-performance",
          alpha: true,
        }}
        frameloop={paused ? "never" : "demand"}
      >
        <Suspense fallback={null}>
          <ExperienceSceneInner mobile={mobile} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
