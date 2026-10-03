import { Html } from "@react-three/drei";
import { ProductPresentation } from "../cinematic/ProductPresentation";
import { useExperienceScalars } from "./useExperienceScalars";

type ExperienceProductLayersProps = {
  mobile?: boolean;
};

export function ExperienceProductLayers({ mobile }: ExperienceProductLayersProps) {
  const s = useExperienceScalars();

  if (mobile) return null;

  const fade = (strength: number, min = 0.08) =>
    strength > min ? Math.min(1, (strength - min) * 2.2) : 0;

  const opOperating = fade(s.operating);
  const opPortfolio = fade(s.portfolio, 0.12);
  const opLeasing = fade(s.leasing);
  const opFinance = fade(s.finance);
  const opMaint = fade(s.maintenance);

  const leasingStage = Math.floor(s.leasingStage * 5.5);
  const maintStage = Math.floor(s.maintenanceStage * 5.5);

  return (
    <group>
      {opOperating > 0 ? (
        <Html
          position={[-2.35, 2.55, 0.5]}
          transform
          distanceFactor={1.35}
          style={{ opacity: opOperating, pointerEvents: "none" }}
        >
          <ProductPresentation variant="dashboard" compact />
        </Html>
      ) : null}

      {opPortfolio > 0 ? (
        <Html
          position={[0, 3.2, -0.2]}
          transform
          distanceFactor={1.5}
          style={{ opacity: opPortfolio, pointerEvents: "none" }}
        >
          <ProductPresentation variant="portfolio" compact />
        </Html>
      ) : null}

      {opLeasing > 0 ? (
        <Html
          position={[1.85, 1.35, 0.55]}
          transform
          distanceFactor={1.25}
          style={{ opacity: opLeasing, pointerEvents: "none" }}
        >
          <ProductPresentation variant="leasing" stage={leasingStage} compact />
        </Html>
      ) : null}

      {opFinance > 0 ? (
        <Html
          position={[0, 2.85, 0.85]}
          transform
          distanceFactor={1.4}
          style={{ opacity: opFinance, pointerEvents: "none" }}
        >
          <ProductPresentation variant="finance" compact />
        </Html>
      ) : null}

      {opMaint > 0 ? (
        <Html
          position={[-1.65, 1.25, 0.65]}
          transform
          distanceFactor={1.2}
          style={{ opacity: opMaint, pointerEvents: "none" }}
        >
          <ProductPresentation variant="maintenance" stage={maintStage} compact />
        </Html>
      ) : null}
    </group>
  );
}
