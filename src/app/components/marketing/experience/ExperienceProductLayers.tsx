import { Html } from "@react-three/drei";
import { CinematicProductPanel } from "../cinematic/CinematicProductPanel";
import { useExperienceScalars } from "./useExperienceScalars";

type ExperienceProductLayersProps = {
  mobile?: boolean;
};

export function ExperienceProductLayers({ mobile }: ExperienceProductLayersProps) {
  const s = useExperienceScalars();

  if (mobile) return null;

  const panelOpacity = (strength: number) => Math.max(0, Math.min(1, strength));

  return (
    <group>
      {s.operating > 0.08 ? (
        <>
          <Html position={[-2.2, 2.4, 0.8]} center distanceFactor={8} style={{ opacity: panelOpacity(s.operating), pointerEvents: "none" }}>
            <CinematicProductPanel title="Portfolio" sub="Occupancy · preview" variant="listings" />
          </Html>
          <Html position={[2.1, 2.2, 0.6]} center distanceFactor={8} style={{ opacity: panelOpacity(s.operating), pointerEvents: "none" }}>
            <CinematicProductPanel title="Collections" sub="Ledger · preview" variant="payments" />
          </Html>
          <Html position={[-1.8, 1.2, 1.2]} center distanceFactor={8} style={{ opacity: panelOpacity(s.operating * 0.9), pointerEvents: "none" }}>
            <CinematicProductPanel title="Maintenance" sub="Queue · preview" variant="maintenance" />
          </Html>
        </>
      ) : null}

      {s.leasing > 0.15 ? (
        <Html position={[1.6, 1.4, 0.5]} center distanceFactor={7} style={{ opacity: panelOpacity(s.leasing), pointerEvents: "none" }}>
          <CinematicProductPanel title="Leasing" sub="Application · preview" variant="leads" />
        </Html>
      ) : null}

      {s.finance > 0.12 ? (
        <Html position={[0, 2.6, 1]} center distanceFactor={9} style={{ opacity: panelOpacity(s.finance), pointerEvents: "none" }}>
          <CinematicProductPanel title="Finance" sub="Statements · preview" variant="payments" />
        </Html>
      ) : null}

      {s.ai > 0.1 ? (
        <Html position={[0, 3.4, 0]} center distanceFactor={10} style={{ opacity: panelOpacity(s.ai), pointerEvents: "none" }}>
          <div className="mk-xp-ai-tag">AI layer · illustrative</div>
        </Html>
      ) : null}
    </group>
  );
}
