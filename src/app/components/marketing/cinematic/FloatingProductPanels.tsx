import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

const PANELS = [
  { title: "Listings", sub: "Discovery & inventory", pos: [-2.2, 2.2, 0.8] as [number, number, number] },
  { title: "CRM", sub: "Leads & relationships", pos: [2.3, 2.4, 0.5] as [number, number, number] },
  { title: "Finance", sub: "Collections & ledger", pos: [-2.4, 1.2, 1.2] as [number, number, number] },
  { title: "Maintenance", sub: "Tickets & field ops", pos: [2.1, 1.1, 1.3] as [number, number, number] },
  { title: "Leasing", sub: "Apply · sign · renew", pos: [-1.8, 0.2, 1.6] as [number, number, number] },
  { title: "AI", sub: "Governed automation", pos: [2, 0.3, 1.5] as [number, number, number] },
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
          distanceFactor={8}
          style={{
            opacity,
            pointerEvents: "none",
            transition: "opacity 0.4s ease",
          }}
        >
          <div className="mk-cinema-panel-3d" aria-hidden="true">
            <span className="mk-cinema-panel-3d__title">{panel.title}</span>
            <span className="mk-cinema-panel-3d__sub">{panel.sub}</span>
          </div>
        </Html>
      ))}
    </group>
  );
}
