import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { PropertyModel } from "./PropertyModel";
import { PortfolioCity } from "./PortfolioCity";
import { SceneLights } from "./SceneLights";
import { SceneCameraRig, sceneScalars } from "./SceneCameraRig";
import { FloatingProductPanels } from "./FloatingProductPanels";
import { ConsumerPhone3D } from "./ConsumerPhone3D";
import { AiNetwork } from "./AiNetwork";
import { PortfolioDashboard3D } from "./PortfolioDashboard3D";
import type { ScenePointer } from "./useMarketingSceneProgress";

type Marketing3DSceneProps = {
  progress: number;
  pointer: ScenePointer;
  mobile?: boolean;
  reducedMotion?: boolean;
};

function SceneInner({
  progress,
  pointer,
  mobile,
  reducedMotion,
}: Marketing3DSceneProps) {
  const s = sceneScalars(progress);

  return (
    <>
      <SceneLights mobile={mobile} />
      <SceneCameraRig
        progress={progress}
        pointer={pointer}
        mobile={mobile}
        reducedMotion={reducedMotion}
      />

      <group visible={s.singleBuildingOpacity > 0.05}>
        <group scale={1 - s.brandFade * 0.35}>
          <PropertyModel
            layerSeparation={s.layerSeparation}
            spin={s.heroSpin + progress * 0.2}
          />
        </group>
      </group>

      <PortfolioCity
        visible={s.portfolioBlend}
        blend={s.portfolioBlend}
        mobile={mobile}
      />

      <FloatingProductPanels strength={s.platformPanels} mobile={mobile} />
      <PortfolioDashboard3D blend={s.portfolioBlend} mobile={mobile} />
      <ConsumerPhone3D blend={s.consumerBlend} mobile={mobile} />
      <AiNetwork blend={s.aiBlend} />

      {!mobile ? (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.35}
          scale={12}
          blur={2.5}
          far={8}
        />
      ) : null}
    </>
  );
}

export function Marketing3DScene({
  progress,
  pointer,
  mobile,
  reducedMotion,
}: Marketing3DSceneProps) {
  const [paused, setPaused] = useState(false);
  const dpr: [number, number] = mobile ? [1, 1.25] : [1, 1.75];

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (reducedMotion) return null;

  return (
    <div className="mk-cinema-canvas-wrap" aria-hidden="true">
      <Canvas
        dpr={dpr}
        shadows={!mobile}
        camera={{ fov: 42, near: 0.1, far: 100, position: [5, 2.8, 7.5] }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        frameloop={paused ? "never" : "always"}
      >
        <Suspense fallback={null}>
          <SceneInner
            progress={progress}
            pointer={pointer}
            mobile={mobile}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
