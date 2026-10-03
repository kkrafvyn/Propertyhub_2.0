import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";
import { CinematicProductPanel } from "./CinematicProductPanel";

const PANELS = [
  {
    title: "Listings",
    sub: "Publish & status",
    variant: "listings" as const,
    pos: [-2.4, 2.35, 0.6] as [number, number, number],
  },
  {
    title: "Leads",
    sub: "Pipeline & tours",
    variant: "leads" as const,
    pos: [2.5, 2.5, 0.4] as [number, number, number],
  },
  {
    title: "Payments",
    sub: "Collections",
    variant: "payments" as const,
    pos: [-2.6, 1.15, 1] as [number, number, number],
  },
  {
    title: "Maintenance",
    sub: "Work orders",
    variant: "maintenance" as const,
    pos: [2.3, 1.05, 1.1] as [number, number, number],
  },
];

type FloatingProductPanelsProps = {
  strength: number;
  mobile?: boolean;
};

export function FloatingProductPanels({ strength, mobile }: FloatingProductPanelsProps) {
  if (mobile || strength < 0.05) return null;

  const opacity = clamp01(strength);

  return (
    <group>
      {PANELS.map((panel) => (
        <Html
          key={panel.title}
          position={panel.pos}
          center
          distanceFactor={7}
          style={{
            opacity,
            pointerEvents: "none",
            transition: "opacity 0.35s ease",
          }}
        >
          <CinematicProductPanel title={panel.title} sub={panel.sub} variant={panel.variant} />
        </Html>
      ))}
    </group>
  );
}
