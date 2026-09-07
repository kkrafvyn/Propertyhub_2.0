/** Simulations are disabled in all shipped builds. Only vitest may opt in. */
export function isDemoSimulationAllowed() {
  return import.meta.env.MODE === "test";
}

export function isProductionBuild() {
  return import.meta.env.PROD;
}
