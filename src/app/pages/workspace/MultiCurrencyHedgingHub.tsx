import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
/**
 * BaytMiftah REOS — Multi-Currency FX & Dual-Currency Hedging Hub
 * 
 * Financial command center for:
 * - Bank of Ghana (BOG) live exchange rate monitoring
 * - Dual-currency rent indexing & invoice calculator (USD/GHS)
 * - Portfolio currency risk & FX collar hedging simulator
 */

import React, { useEffect, useState } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  Percent,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  ArrowRightLeft,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Copy,
  Receipt,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  multiCurrencyFxService,
  type FXRate,
  type DualCurrencyLeaseCalculation,
  type FXHedgingScenario,
} from '../../../lib/multi-currency-fx.service';
import { OperationalQueryState, WorkspacePageShell } from '../../components/ux';

export function MultiCurrencyHedgingHub() {
  const [rates, setRates] = useState<FXRate[]>(() => multiCurrencyFxService.getLiveRates());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dual-Currency Calculator State
  const [baseAmountUSD, setBaseAmountUSD] = useState<number>(2500);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [enableCollar, setEnableCollar] = useState<boolean>(true);
  const [collarPct, setCollarPct] = useState<number>(5);
  const [tenantName, setTenantName] = useState<string>('Kwesi Annan (Expat Diplomat)');
  const [propertyName, setPropertyName] = useState<string>('Airport Residential Villa 4B');

  // Hedging Simulator State
  const [portfolioMonthlyUSD, setPortfolioMonthlyUSD] = useState<number>(12500);
  const [projectedDepreciation, setProjectedDepreciation] = useState<number>(15);

  const activeRate = rates.find((rate) => rate.pair === `${selectedCurrency}/GHS`);

  const dualCalc: DualCurrencyLeaseCalculation | null = activeRate ? multiCurrencyFxService.calculateDualCurrencyRent({
    baseAmount: baseAmountUSD,
    baseCurrency: selectedCurrency,
    collarPct: enableCollar ? collarPct : undefined,
  }) : null;

  const hedgingScenario: FXHedgingScenario | null = rates.some((rate) => rate.pair === 'USD/GHS') ? multiCurrencyFxService.evaluateHedgingScenario(
    portfolioMonthlyUSD,
    12,
    projectedDepreciation
  ) : null;

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      setRates(await multiCurrencyFxService.syncRatesFromProvider());
      toast.success('Exchange rates synchronized successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Exchange rates are unavailable.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { void handleRefreshRates(); }, []);

  const handleCopyInvoiceDetails = () => {
    if (!dualCalc) return;
    const text = [
      `🏢 BAYTMIFTAH DUAL-CURRENCY RENT INVOICE`,
      `Tenant: ${tenantName}`,
      `Property: ${propertyName}`,
      `Base Denominated Rent: ${selectedCurrency} ${baseAmountUSD.toLocaleString()}`,
      `Provider Rate: ${dualCalc.effectiveRate.toFixed(4)} GHS/${selectedCurrency}`,
      `GHS Payable Total: GHS ${dualCalc.ghsPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `Payment Rails: MTN MoMo / Telecel Cash / Bank Interbank Transfer`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    toast.success('Dual-currency invoice details copied!');
  };

  const queryPhase = loadError
    ? 'error'
    : isRefreshing || !dualCalc || !hedgingScenario
      ? 'loading'
      : 'ready';

  return (
    <WorkspacePageShell
      tone="finance"
      title="Multi-Currency FX & Hedging Engine"
      description="Bank of Ghana interbank rate synchronization, USD-pegged rent indexing, and FX collar hedging."
      actions={
        <Button
            onClick={handleRefreshRates}
            disabled={isRefreshing}
            variant="outline"
            className="gap-2 border-surface-border bg-surface text-ink hover:bg-surface-hover"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing Rates...' : 'Sync BOG Rates'}
          </Button>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void handleRefreshRates()}
      >
      <div className="space-y-6">
      {/* Live Exchange Rate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rates.map((r) => {
          const isUp = r.change24h >= 0;
          return (
            <Card key={r.pair} className="p-4 border-surface-border bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">{r.pair}</span>
                <span
                  className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                    isUp ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? `+${r.change24h}%` : `${r.change24h}%`}
                </span>
              </div>

              <div className="mt-2">
                <p className="text-2xl font-black text-ink">
                  ₵{r.interbankRate.toFixed(4)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-ink-secondary mt-1">
                  <span>Market: ₵{r.marketRate.toFixed(2)}</span>
                  <span className="text-ink-muted">BOG Official</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Grid: Invoicing Calculator & Hedging Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dual-Currency Rent Invoicing Studio */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 border-surface-border bg-surface shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                USD-Pegged Rent Invoice Indexer
              </h3>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                Ghana Act 220 & BOG FX Compliant
              </Badge>
            </div>

            <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
              Ghana law requires leases to be settled in Ghana Cedis. Use this tool to peg base rent in foreign currency while generating lawful, transparent GHS invoices on payment day.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink-secondary">Tenant Name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink-secondary">Property Unit</label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-ink-secondary">Base Rent Amount</label>
                  <div className="flex items-center gap-2 mt-1">
                    <NativeSelectControl
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value as any)}
                      className="bg-input-background border border-border rounded-lg px-2 py-2 text-xs text-ink outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </NativeSelectControl>
                    <input
                      type="number"
                      value={baseAmountUSD}
                      onChange={(e) => setBaseAmountUSD(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-ink-secondary">Spot Rate</label>
                  <div className="p-2 bg-surface-subtle border border-surface-border rounded-lg text-xs font-mono font-bold text-ink mt-1 text-center">
                    ₵{activeRate.interbankRate.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* FX Collar Toggle */}
              <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border mt-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCollar}
                      onChange={(e) => setEnableCollar(e.target.checked)}
                      className="rounded text-primary border-border"
                    />
                    <span className="text-xs font-semibold text-ink">Enable FX Hedging Collar Band</span>
                  </label>
                  {enableCollar && (
                    <span className="text-xs font-bold text-primary">+/- {collarPct}% Band</span>
                  )}
                </div>
                {enableCollar && (
                  <p className="text-[11px] text-ink-muted mt-1">
                    Protects both parties against extreme exchange rate spikes during the lease tenure.
                  </p>
                )}
              </div>
            </div>

            {/* Generated Breakdown Card */}
            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-secondary">Base Rent:</span>
                <span className="font-bold text-ink">
                  {selectedCurrency} {baseAmountUSD.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-secondary">Effective Rate Used:</span>
                <span className="font-bold text-ink font-mono">
                  ₵{dualCalc.effectiveRate.toFixed(4)} / {selectedCurrency}
                </span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex justify-between items-center text-sm font-black text-primary">
                <span>Total GHS Payable:</span>
                <span className="text-lg font-black">
                  GHS {dualCalc.ghsPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-surface-border mt-4">
              <Button
                onClick={handleCopyInvoiceDetails}
                className="w-full gap-2 bg-primary text-primary-foreground font-semibold"
              >
                <Copy className="w-4 h-4" />
                Copy Dual-Currency Invoice
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Portfolio FX Risk & Hedging Strategy Simulator */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 border-surface-border bg-surface shadow-sm">
            <h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Portfolio FX Risk & Hedging Simulator
            </h3>
            <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
              Model annual currency volatility exposure on foreign-currency denominated rental portfolios.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-secondary flex justify-between">
                  <span>Monthly Portfolio Rental Revenue (USD)</span>
                  <span className="font-bold text-ink">${portfolioMonthlyUSD.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={500}
                  value={portfolioMonthlyUSD}
                  onChange={(e) => setPortfolioMonthlyUSD(parseFloat(e.target.value))}
                  className="w-full mt-2 accent-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-secondary flex justify-between">
                  <span>Projected Annual GHS Depreciation</span>
                  <span className="font-bold text-ink">{projectedDepreciation}% per annum</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={projectedDepreciation}
                  onChange={(e) => setProjectedDepreciation(parseFloat(e.target.value))}
                  className="w-full mt-2 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Simulation Results */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border">
                  <p className="text-[11px] font-semibold text-ink-muted uppercase">Unhedged Annual Yield</p>
                  <p className="text-lg font-black text-ink mt-1">
                    GHS {(hedgingScenario.unhedgedGhsYield / 1000).toFixed(1)}k
                  </p>
                  <span className="text-[10px] text-amber-500 font-medium">Spot price exposed</span>
                </div>

                <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border">
                  <p className="text-[11px] font-semibold text-ink-muted uppercase">Collar Hedged Yield</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    GHS {(hedgingScenario.hedgedGhsYield / 1000).toFixed(1)}k
                  </p>
                  <span className="text-[10px] text-emerald-500 font-medium">Protected variance</span>
                </div>
              </div>

              {/* Recommended Strategy Badge */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-ink">Recommended Strategy</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs">
                    {hedgingScenario.currencyRiskLevel} Risk
                  </Badge>
                </div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {hedgingScenario.recommendedStrategy}
                </p>
                <p className="text-xs text-ink-secondary mt-1">
                  Recommended for landlord agreements in Greater Accra luxury sub-markets.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
