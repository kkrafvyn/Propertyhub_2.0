type SceneLightsProps = {
  mobile?: boolean;
};

export function SceneLights({ mobile }: SceneLightsProps) {
  const intensity = mobile ? 0.85 : 1;

  return (
    <>
      <color attach="background" args={["#060e0b"]} />
      <fog attach="fog" args={["#060e0b", 12, 28]} />
      <hemisphereLight
        intensity={0.5 * intensity}
        color="#d8e2dc"
        groundColor="#0a1612"
      />
      <ambientLight intensity={0.28 * intensity} color="#c8d4cc" />
      <directionalLight
        position={[6, 8, 4]}
        intensity={1.1 * intensity}
        color="#f5efe6"
        castShadow={false}
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
      <directionalLight position={[-5, 2, 6]} intensity={0.55 * intensity} color="#dfc07a" />
      <pointLight position={[2.5, 1.2, 3]} intensity={0.25 * intensity} color="#c9a962" distance={12} />
    </>
  );
}
