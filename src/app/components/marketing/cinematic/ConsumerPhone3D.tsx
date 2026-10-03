import { Html } from "@react-three/drei";
import { clamp01 } from "./scene-phases";

const STEPS = ["Search & apply", "Sign lease", "Pay rent", "Get support"] as const;

type ConsumerPhone3DProps = {
  blend: number;
  mobile?: boolean;
};

export function ConsumerPhone3D({ blend, mobile }: ConsumerPhone3DProps) {
  const opacity = clamp01(blend);
  if (opacity < 0.08) return null;

  const activeIndex = Math.min(STEPS.length - 1, Math.floor(opacity * STEPS.length));

  if (mobile) return null;

  return (
    <group position={[1.2, 1.5, 0.6]}>
      <Html center distanceFactor={6} style={{ opacity, pointerEvents: "none" }}>
        <div className="mk-cinema-phone" aria-hidden="true">
          <div className="mk-cinema-phone__bezel">
            <div className="mk-cinema-phone__screen">
              <p className="mk-cinema-phone__label">Resident · preview</p>
              <ul className="mk-cinema-phone__steps">
                {STEPS.map((step, i) => (
                  <li key={step} className={i === activeIndex ? "is-active" : ""}>
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
