import { useMemo } from "react";
import { PropertyModel } from "./PropertyModel";

type PortfolioCityProps = {
  visible: number;
  /** 0–1 portfolio chapter blend */
  blend: number;
  mobile?: boolean;
};

export function PortfolioCity({ visible, blend, mobile }: PortfolioCityProps) {
  const slots = useMemo(() => {
    const count = mobile ? 4 : 9;
    const positions: [number, number, number][] = [];
    const grid = mobile ? 2 : 3;
    let idx = 0;
    for (let row = 0; row < grid && idx < count; row++) {
      for (let col = 0; col < grid && idx < count; col++) {
        const x = (col - (grid - 1) / 2) * 2.8;
        const z = (row - (grid - 1) / 2) * 2.8;
        positions.push([x, 0, z]);
        idx++;
      }
    }
    return positions;
  }, [mobile]);

  return (
    <group visible={blend > 0.02}>
      {slots.slice(0, Math.ceil(slots.length * visible)).map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} scale={0.42 + blend * 0.12}>
          <PropertyModel layerSeparation={0} spin={i * 0.15} />
        </group>
      ))}
    </group>
  );
}
