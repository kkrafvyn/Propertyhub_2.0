import { clamp01, chapterLocalProgress } from "../cinematic/scene-phases";

/** Derived animation weights from global scroll progress — single source for 3D + Html layers. */
export function experienceScalars(progress: number) {
  const p = clamp01(progress);

  const approach = chapterLocalProgress(p, 0, 0.17);
  const explode = chapterLocalProgress(p, 0.14, 0.32);
  const operating = chapterLocalProgress(p, 0.25, 0.4);
  const portfolio = chapterLocalProgress(p, 0.35, 0.52);
  const unitZoom = chapterLocalProgress(p, 0.45, 0.6);
  const hierarchyDepth = clamp01((unitZoom - 0.08) / 0.85);
  const leasing = chapterLocalProgress(p, 0.55, 0.7);
  const finance = chapterLocalProgress(p, 0.65, 0.78);
  const maintenance = chapterLocalProgress(p, 0.74, 0.86);
  const resident = chapterLocalProgress(p, 0.82, 0.92);
  const ai = chapterLocalProgress(p, 0.88, 0.98);
  const final = chapterLocalProgress(p, 0.94, 1);

  const exteriorLight = clamp01(0.32 + approach * 0.58);
  const floorSeparation = Math.pow(explode, 0.92) * (1 - portfolio * 0.55);
  const portfolioWorld = portfolio * (1 - final * 0.35);
  const labelsApproach = chapterLocalProgress(p, 0.06, 0.2);
  const spine = explode * (1 - ai * 0.35);
  const financeDarken = finance * 0.38;
  const heroOnly = 1 - clamp01(p * 4);
  const leasingStage = clamp01((leasing - 0.05) * 1.15);
  const maintenanceStage = clamp01((maintenance - 0.05) * 1.12);

  return {
    approach,
    explode,
    operating,
    portfolio,
    unitZoom,
    hierarchyDepth,
    leasing,
    finance,
    maintenance,
    resident,
    ai,
    final,
    exteriorLight,
    floorSeparation,
    portfolioWorld,
    labelsApproach,
    spine,
    financeDarken,
    heroOnly,
    leasingStage,
    maintenanceStage,
    progress: p,
  };
}

export type ExperienceScalars = ReturnType<typeof experienceScalars>;
