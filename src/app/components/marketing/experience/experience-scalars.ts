import { clamp01, chapterLocalProgress } from "../cinematic/scene-phases";

/** Derived animation weights from global scroll progress — single source for 3D + Html layers. */
export function experienceScalars(progress: number) {
  const p = clamp01(progress);

  const approach = chapterLocalProgress(p, 0, 0.17);
  const explode = chapterLocalProgress(p, 0.14, 0.3);
  const operating = chapterLocalProgress(p, 0.25, 0.4);
  const portfolio = chapterLocalProgress(p, 0.35, 0.52);
  const unitZoom = chapterLocalProgress(p, 0.45, 0.6);
  const leasing = chapterLocalProgress(p, 0.55, 0.7);
  const finance = chapterLocalProgress(p, 0.65, 0.78);
  const maintenance = chapterLocalProgress(p, 0.74, 0.86);
  const resident = chapterLocalProgress(p, 0.82, 0.92);
  const ai = chapterLocalProgress(p, 0.88, 0.98);
  const final = chapterLocalProgress(p, 0.94, 1);

  const exteriorLight = clamp01(0.35 + approach * 0.55);
  const floorSeparation = explode * (1 - portfolio * 0.65);
  const portfolioWorld = portfolio * (1 - final * 0.3);
  const labelsApproach = chapterLocalProgress(p, 0.06, 0.2);
  const spine = explode * (1 - ai * 0.4);
  const financeDarken = finance * 0.35;
  const heroOnly = 1 - clamp01(p * 4);

  return {
    approach,
    explode,
    operating,
    portfolio,
    unitZoom,
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
    progress: p,
  };
}

export type ExperienceScalars = ReturnType<typeof experienceScalars>;
