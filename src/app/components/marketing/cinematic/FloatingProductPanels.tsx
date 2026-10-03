import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";
import { CinematicProductPanel } from "./CinematicProductPanel";

const PANELS = [
  {
    title: "Listings",
    sub: "Discovery & inventory",
    variant: "listings" as const,
    pos: [-2.4, 2.35, 0.6] as [number, number, number],
  },
  {
    title: "CRM",
    sub: "Leads & relationships",
    variant: "default" as const,
    pos: [2.5, 2.5, 0.4] as [number, number, number],
  },
  {
    title: "Finance",
    sub: "Collections & ledger",
    variant: "finance" as const,
    pos: [-2.6, 1.15, 1] as [number, number, number],
  },
  {
    title: "Maintenance",
    sub: "Tickets & field ops",
    variant: "maintenance" as const,
    pos: [2.3, 1.05, 1.1] as [number, number, number],
  },
  {
    title: "Leasing",
    sub: "Apply · sign · renew",
    variant: "default" as const,
    pos: [-2, 0.15, 1.5] as [number, number, number],
  },
  {
    title: "AI",
    sub: "Governed automation",
    variant: "default" as const,
    pos: [2.15, 0.25, 1.4] as [number, number, number],
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
