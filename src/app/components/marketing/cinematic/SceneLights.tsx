import { useMemo } from "react";

type SceneLightsProps = {
  mobile?: boolean;
};

export function SceneLights({ mobile }: SceneLightsProps) {
  const intensity = mobile ? 0.85 : 1;

  const shadow = useMemo(() => !mobile, [mobile]);

  return (
    <>
      <color attach="background" args={["#060e0b"]} />
      <fog attach="fog" args={["#060e0b", 12, 28]} />
      <ambientLight intensity={0.35 * intensity} color="#c8d4cc" />
      <directionalLight
        position={[6, 8, 4]}
        intensity={1.1 * intensity}
        color="#f5efe6"
        castShadow={shadow}
        shadow-mapSize-width={shadow ? 1024 : 0}
        shadow-mapSize-height={shadow ? 1024 : 0}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#1b4332" />
      <spotLight
        position={[0, 6, 2]}
        angle={0.45}
        penumbra={0.8}
        intensity={0.6 * intensity}
        color="#e8dcc8"
        castShadow={false}
      />
    </>
  );
}
