import { Line } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

const GRID: [number, number, number][] = [
  [-2.8, 0.5, -2.8],
  [0, 0.5, -2.8],
  [2.8, 0.5, -2.8],
  [-2.8, 0.5, 0],
  [2.8, 0.5, 0],
  [-2.8, 0.5, 2.8],
  [0, 0.5, 2.8],
  [2.8, 0.5, 2.8],
];

type PortfolioConnectionsProps = {
  blend: number;
  mobile?: boolean;
};

export function PortfolioConnections({ blend, mobile }: PortfolioConnectionsProps) {
  const opacity = clamp01(blend);
  if (opacity < 0.2 || mobile) return null;

  const hub: [number, number, number] = [0, 2.8, 0];

  return (
    <group>
      {GRID.map((pos, i) => (
        <Line
          key={i}
          points={[pos, hub]}
          color="#c9a962"
          transparent
          opacity={0.22 * opacity}
          lineWidth={1}
        />
      ))}
    </group>
  );
}
