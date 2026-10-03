import React, { Component, Suspense, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { ArchitecturalProperty } from "./ArchitecturalProperty";
import { PROPERTY_GLB_PATH } from "./experience-chapters";

export type PropertyModelExperienceProps = {
  mobile?: boolean;
  /** Set to PROPERTY_GLB_PATH when `/public/models/baytmiftah-property.glb` is available. */
  src?: string | null;
};

function GlbProperty({ src, mobile }: { src: string; mobile?: boolean }) {
  const { scene } = useGLTF(src);
  return (
    <group scale={mobile ? 0.88 : 1}>
      <primitive object={scene.clone()} />
    </group>
  );
}

class GlbErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function GlbLoader({ src, mobile }: { src: string; mobile?: boolean }) {
  const fallback = <ArchitecturalProperty mobile={mobile} />;
  return (
    <GlbErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbProperty src={src} mobile={mobile} />
      </Suspense>
    </GlbErrorBoundary>
  );
}

/** Procedural architecture by default; pass `src={PROPERTY_GLB_PATH}` to load a GLB. */
export function PropertyModelExperience({ mobile, src = null }: PropertyModelExperienceProps) {
  if (src) return <GlbLoader src={src} mobile={mobile} />;
  return <ArchitecturalProperty mobile={mobile} />;
}

export { PROPERTY_GLB_PATH };
