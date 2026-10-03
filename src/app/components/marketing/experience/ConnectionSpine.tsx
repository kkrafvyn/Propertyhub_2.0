import { Line } from "@react-three/drei";
import { useExperienceScalars } from "./useExperienceScalars";

export function ConnectionSpine() {
  const s = useExperienceScalars(64);
  const opacity = s.spine * 0.65;
  if (opacity < 0.02) return null;

  return (
    <Line
      points={[
        [0, 0.2, 0],
        [0, 3.8, 0],
      ]}
      color="#c9a962"
      transparent
      opacity={opacity}
      lineWidth={1}
    />
  );
}
