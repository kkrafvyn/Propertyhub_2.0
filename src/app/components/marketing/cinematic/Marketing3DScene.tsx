import { Suspense, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PropertyModel } from "./PropertyModel";
import { PortfolioCity } from "./PortfolioCity";
import { SceneLights } from "./SceneLights";
import { SceneCameraRig } from "./SceneCameraRig";
import { FloatingProductPanels } from "./FloatingProductPanels";
import { ConsumerPhone3D } from "./ConsumerPhone3D";
import { AiNetwork } from "./AiNetwork";
import { PortfolioDashboard3D } from "./PortfolioDashboard3D";
import { PortfolioConnections } from "./PortfolioConnections";
import { marketingScrollState } from "./marketingScrollState";
import { useMarketing3DScalars } from "./useMarketing3DScalars";

type Marketing3DSceneProps = {
  mobile?: boolean;
  reducedMotion?: boolean;
  onContextLost?: () => void;
};

function CanvasInvalidateBridge() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    marketingScrollState.registerInvalidate(invalidate);
    return () => marketingScrollState.registerInvalidate(null);
  }, [invalidate]);
  useFrame(() => {
    /* Keep subtle idle motion alive while scroll-driven updates call invalidate separately. */
  });
  return null;
}

function SceneInner({ mobile, reducedMotion }: Marketing3DSceneProps) {
  const s = useMarketing3DScalars();

  return (
    <>
      <CanvasInvalidateBridge />
      <SceneLights mobile={mobile} />
      <SceneCameraRig mobile={mobile} reducedMotion={reducedMotion} />

      <group position={[1.15, -0.15, 0]} visible={s.singleBuildingOpacity > 0.05}>
        <group scale={(1 - s.brandFade * 0.35) * 0.88}>
          <PropertyModel scrollDriven />
        </group>
      </group>

      <PortfolioCity visible={s.portfolioBlend} blend={s.portfolioBlend} mobile={mobile} />
      <PortfolioConnections blend={s.portfolioBlend} mobile={mobile} />

      <FloatingProductPanels strength={s.platformPanels} mobile={mobile} />
      <PortfolioDashboard3D blend={s.portfolioBlend} mobile={mobile} />
      <ConsumerPhone3D blend={s.consumerBlend} mobile={mobile} />
      <AiNetwork blend={s.aiBlend} />

    </>
  );
}

export function Marketing3DScene({ mobile, reducedMotion, onContextLost }: Marketing3DSceneProps) {
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const dpr: [number, number] = mobile ? [1, 1.15] : [1, 1.5];

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (reducedMotion) return null;

  return (
    <div className={`mk-cinema-canvas-wrap${ready ? " is-ready" : ""}`} aria-hidden="true">
      {!ready ? <div className="mk-cinema-canvas-loader" aria-hidden="true" /> : null}
      <div className="mk-cinema-vignette" aria-hidden="true" />
      <Canvas
        onCreated={({ gl, invalidate }) => {
          setReady(true);
          marketingScrollState.registerInvalidate(invalidate);
          gl.shadowMap.enabled = false;
          gl.shadowMap.type = THREE.PCFShadowMap;
          const canvas = gl.domElement;
          const onLost = (event: Event) => {
            event.preventDefault();
            onContextLost?.();
          };
          canvas.addEventListener("webglcontextlost", onLost, { passive: false });
        }}
        dpr={dpr}
        shadows={false}
        camera={{ fov: 42, near: 0.1, far: 100, position: [5, 2.8, 7.5] }}
        gl={{
          antialias: !mobile,
          powerPreference: "high-performance",
          alpha: true,
        }}
        frameloop={paused ? "never" : "demand"}
      >
        <Suspense fallback={null}>
          <SceneInner mobile={mobile} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
