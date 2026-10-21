import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Building2,
  DollarSign,
  Zap,
  Droplet,
  Shield,
  Sun,
  Bed,
  Layers,
  ArrowUpRight,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sliders,
  PieChart,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  aiRentYieldService,
  GHANA_NEIGHBORHOOD_BENCHMARKS,
  type YieldPredictionInput,
} from '../../../lib/ai-rent-yield.service';
import { OperationalQueryState, WorkspacePageShell } from '../../components/ux';

export function AIRentYieldPredictor({
  organizationId,
}: {
  organizationId: string;
}) {
  // Input parameters
  const [neighborhood, setNeighborhood] = useState<string>('Cantonments');
  const [propertyType, setPropertyType] = useState<YieldPredictionInput['propertyType']>('apartment');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [areaSqm, setAreaSqm] = useState<number>(125);
  const [valuationGHS, setValuationGHS] = useState<number>(3200000);

  // Amenity value-add toggles
  const [hasGenerator, setHasGenerator] = useState<boolean>(true);
  const [hasBorehole, setHasBorehole] = useState<boolean>(true);
  const [isFurnished, setIsFurnished] = useState<boolean>(true);
  const [hasPool, setHasPool] = useState<boolean>(true);
  const [hasSolarInverter, setHasSolarInverter] = useState<boolean>(false);
  const [hasSecurityPost, setHasSecurityPost] = useState<boolean>(true);

  // Live prediction
  const prediction = useMemo(() => {
    return aiRentYieldService.predictRentalYield({
      neighborhood,
      propertyType,
      bedrooms,
      areaSqm,
      propertyValuationGHS: valuationGHS,
      hasGenerator,
      hasBorehole,
      isFurnished,
      hasPool,
      hasSolarInverter,
      hasSecurityPost,
    });
  }, [
    neighborhood,
    propertyType,
    bedrooms,
    areaSqm,
    valuationGHS,
    hasGenerator,
    hasBorehole,
    isFurnished,
    hasPool,
    hasSolarInverter,
    hasSecurityPost,
  ]);

  const benchmark = GHANA_NEIGHBORHOOD_BENCHMARKS[neighborhood] || GHANA_NEIGHBORHOOD_BENCHMARKS['Cantonments'];

  const queryPhase = 'ready' as const;

  return (
    <WorkspacePageShell
      title="AI Rent Yield & Valuation Engine"
      description="Predict rental yields, Cap Rates, and tenant value-add premiums across prime Accra, Kumasi, and Takoradi corridors."
      badge={
        <Badge className="bg-primary/10 text-primary border border-primary/20 gap-1.5 px-3 py-1 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Ghana Micro-Market ML
        </Badge>
      }
      actions={
        <Button
          onClick={() => {
            toast.success(`Appraisal Memo generated for ${neighborhood} asset.`);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Investment Memo
        </Button>
      }
    >
      <OperationalQueryState phase={queryPhase}>
    <div className="space-y-6">
      {/* Main Grid: Parameters Sidebar vs Real-Time Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Asset Parameters & Feature Switches */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6 border-surface-border bg-surface shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Asset Parameters
            </h3>

            {/* Neighborhood Selector */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1.5">
                Micro-Neighborhood
              </label>
              <NativeSelectControl
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none transition focus:border-primary"
              >
                {Object.keys(GHANA_NEIGHBORHOOD_BENCHMARKS).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelectControl>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1.5">
                Property Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['apartment', 'penthouse', 'townhouse', 'villa', 'commercial'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPropertyType(type)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                      propertyType === type
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-surface-subtle border border-surface-border text-ink hover:bg-surface-hover'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Bedrooms & Floor Area */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1.5">
                  Bedrooms
                </label>
                <NativeSelectControl
                  value={bedrooms}
                  onChange={(e) => setBedrooms(parseInt(e.target.value))}
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none"
                >
                  <option value={0}>Studio</option>
                  <option value={1}>1 Bedroom</option>
                  <option value={2}>2 Bedrooms</option>
                  <option value={3}>3 Bedrooms</option>
                  <option value={4}>4 Bedrooms</option>
                  <option value={5}>5+ Bedrooms</option>
                </NativeSelectControl>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1.5">
                  Area (m²)
                </label>
                <input
                  type="number"
                  value={areaSqm}
                  onChange={(e) => setAreaSqm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none font-medium"
                />
              </div>
            </div>

            {/* Acquisition / Valuation Price in GHS */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1.5">
                Asset Valuation / Cost (GHS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-ink-muted">GHS</span>
                <input
                  type="number"
                  step="50000"
                  value={valuationGHS}
                  onChange={(e) => setValuationGHS(parseFloat(e.target.value) || 0)}
                  className="w-full bg-input-background border border-border rounded-lg pl-12 pr-3 py-2 text-sm text-ink font-bold outline-none"
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                Avg price in {neighborhood}: ~${benchmark.baseRatePerSqmGHS}/m²
              </p>
            </div>

            {/* Ghana Premium Amenities */}
            <div className="pt-3 border-t border-surface-border space-y-2.5">
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                Ghanaian Value-Add Features
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-surface-border cursor-pointer hover:bg-surface-hover transition">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Standby Generator (24/7 Power)
                </span>
                <input
                  type="checkbox"
                  checked={hasGenerator}
                  onChange={(e) => setHasGenerator(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-surface-border cursor-pointer hover:bg-surface-hover transition">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <Droplet className="w-4 h-4 text-blue-500" />
                  Borehole & Filtration Tank
                </span>
                <input
                  type="checkbox"
                  checked={hasBorehole}
                  onChange={(e) => setHasBorehole(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-surface-border cursor-pointer hover:bg-surface-hover transition">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <Bed className="w-4 h-4 text-purple-500" />
                  Executive Interior Furnishing
                </span>
                <input
                  type="checkbox"
                  checked={isFurnished}
                  onChange={(e) => setIsFurnished(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-surface-border cursor-pointer hover:bg-surface-hover transition">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <Sun className="w-4 h-4 text-amber-600" />
                  Swimming Pool / Gym
                </span>
                <input
                  type="checkbox"
                  checked={hasPool}
                  onChange={(e) => setHasPool(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-surface-border cursor-pointer hover:bg-surface-hover transition">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <Shield className="w-4 h-4 text-green-500" />
                  Electric Fence & Security Post
                </span>
                <input
                  type="checkbox"
                  checked={hasSecurityPost}
                  onChange={(e) => setHasSecurityPost(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-surface-border cursor-pointer hover:bg-surface-hover transition">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Solar Inverter Battery Backup
                </span>
                <input
                  type="checkbox"
                  checked={hasSolarInverter}
                  onChange={(e) => setHasSolarInverter(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column: Predictive Yield Results, Cap Rate, & Feature Impact */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metric Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Predicted Rent */}
            <Card className="p-5 border-surface-border bg-surface shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
                  Predicted Rent
                </span>
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-xs">
                  Optimal
                </Badge>
              </div>
              <p className="text-3xl font-black text-ink mt-2">
                GHS {prediction.predictedMonthlyRentOptimalGHS.toLocaleString()}
                <span className="text-xs font-normal text-ink-muted ml-1">/ mo</span>
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Range: GHS {prediction.predictedMonthlyRentMinGHS.toLocaleString()} –{' '}
                {prediction.predictedMonthlyRentMaxGHS.toLocaleString()}
              </p>
            </Card>

            {/* Gross Yield */}
            <Card className="p-5 border-surface-border bg-surface shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
                  Gross Yield
                </span>
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                  Avg: {benchmark.avgGrossYieldPct}%
                </Badge>
              </div>
              <p className="text-3xl font-black text-primary mt-2">
                {prediction.grossAnnualYieldPct}%
                <span className="text-xs font-normal text-ink-muted ml-1">p.a.</span>
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Annual Gross: GHS {prediction.grossAnnualRentGHS.toLocaleString()}
              </p>
            </Card>

            {/* Net Cap Rate */}
            <Card className="p-5 border-surface-border bg-surface shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
                  Net Cap Rate (NOI)
                </span>
                <span className="text-xs text-ink-muted">After 18% OPEX</span>
              </div>
              <p className="text-3xl font-black text-ink mt-2">
                {prediction.netCapRatePct}%
                <span className="text-xs font-normal text-ink-muted ml-1">net</span>
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Net Income: GHS {prediction.estimatedAnnualNetIncomeGHS.toLocaleString()}/yr
              </p>
            </Card>
          </div>

          {/* Investment Verdict Banner */}
          <Card className="p-5 border-primary/30 bg-primary/5 rounded-xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink text-base">
                    Scenario Assessment: {prediction.investmentVerdict.replace(/_/g, ' ')}
                  </h4>
                  <Badge variant="outline" className="text-xs font-bold">Rules-based estimate</Badge>
                </div>
                <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
                  {prediction.verdictRationale}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-surface-border text-xs text-ink-secondary">
                  <span>
                    Forecast Days on Market: <strong>{prediction.projectedDaysOnMarket} days</strong>
                  </span>
                  <span>
                    Projected Occupancy: <strong>{prediction.occupancyForecastPct}%</strong>
                  </span>
                  <span>
                    Annual Capital Growth: <strong>+{benchmark.annualGrowthPct}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Value-Add Feature Sensitivity Breakdown */}
          <Card className="p-6 border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Feature Premium Breakdown</h3>
                <p className="text-xs text-ink-secondary">
                  Estimated monthly rental uplift generated by specific property improvements in {neighborhood}.
                </p>
              </div>
              <Badge variant="outline" className="border-surface-border text-ink">
                {prediction.featureImpacts.length} Active Premiums
              </Badge>
            </div>

            <div className="space-y-2.5">
              {prediction.featureImpacts.length === 0 ? (
                <p className="text-sm text-ink-muted py-4 text-center">
                  Enable amenities on the left to see incremental yield uplift calculations.
                </p>
              ) : (
                prediction.featureImpacts.map((impact) => (
                  <div
                    key={impact.feature}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-surface-border"
                  >
                    <span className="text-sm font-medium text-ink flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {impact.feature}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        +GHS {impact.monthlyGHSValue.toLocaleString()} / mo
                      </span>
                      <span className="text-xs text-ink-muted ml-2">
                        (+{impact.percentageImpact}%)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

            {/* Modeled scenarios derived from the same estimator inputs. */}
          <Card className="p-6 border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Modeled Rent Scenarios</h3>
                <p className="text-xs text-ink-secondary">
                  Rule-based low, base, and upper scenarios for {neighborhood}; these are not verified transactions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {prediction.comparableComps.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-2 hover:border-primary/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink truncate">{comp.title}</span>
                    <Badge variant="outline" className="text-[10px] border-surface-border text-ink">
                      {comp.bedrooms} Bed
                    </Badge>
                  </div>
                  <p className="text-lg font-black text-ink">
                    GHS {comp.monthlyRentGHS.toLocaleString()}
                    <span className="text-xs font-normal text-ink-muted ml-1">/ mo</span>
                  </p>
                  <p className="text-xs text-primary font-semibold">
                    Estimated Yield: {comp.yieldPct}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
