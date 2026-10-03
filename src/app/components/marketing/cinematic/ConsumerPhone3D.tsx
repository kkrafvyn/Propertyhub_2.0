import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

const STEPS = ["Search", "Apply", "Sign", "Pay", "Access", "Maintenance"] as const;

type ConsumerPhone3DProps = {
  blend: number;
  mobile?: boolean;
};

export function ConsumerPhone3D({ blend, mobile }: ConsumerPhone3DProps) {
  const opacity = clamp01(blend);
  if (opacity < 0.08) return null;

  const activeIndex = Math.min(STEPS.length - 1, Math.floor(opacity * STEPS.length * 0.95));

  if (mobile) return null;

  return (
    <group position={[0.22, 1.08, 0.42]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.22, 0.42, 0.02]} />
        <meshStandardMaterial color="#1a2220" roughness={0.85} metalness={0.15} />
      </mesh>
      <Html
        transform
        occlude
        distanceFactor={0.85}
        position={[0, 0, 0.015]}
        style={{ opacity, pointerEvents: "none" }}
      >
        <div className="mk-cinema-phone mk-cinema-phone--integrated" aria-hidden="true">
          <div className="mk-cinema-phone__bezel">
            <div className="mk-cinema-phone__screen">
              <p className="mk-cinema-phone__label">Resident</p>
              <ul className="mk-cinema-phone__steps">
                {STEPS.map((step, i) => (
                  <li key={step} className={i === activeIndex ? "is-active" : i < activeIndex ? "is-done" : ""}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
