import { useMemo, useState } from "react";
import { ArrowRight, Check, Globe2, MapPin } from "lucide-react";
import { useTranslation } from "../../i18n/LocaleContext";
import { useUserMarket } from "../../context/MarketContext";
import {
  MARKET_PRESETS,
  type MarketPreset,
} from "../../../lib/user-market.service";
import type { JurisdictionId } from "../../../lib/real-estate-compliance";

export function LocationOnboarding() {
  const { t } = useTranslation();
  const { completeOnboarding } = useUserMarket();
  const [selectedId, setSelectedId] = useState<JurisdictionId>("GH");
  const [cityIndex, setCityIndex] = useState(0);
  const [step, setStep] = useState<"market" | "city">("market");
  const [loading, setLoading] = useState(false);

  const selectedPreset = useMemo(
    () => MARKET_PRESETS.find((preset) => preset.jurisdictionId === selectedId) ?? MARKET_PRESETS[0],
    [selectedId],
  );

  const handleSelectMarket = (preset: MarketPreset) => {
    setSelectedId(preset.jurisdictionId);
    setCityIndex(0);
    if (preset.cities.length > 1) {
      setStep("city");
      return;
    }
    void finish(preset.jurisdictionId, 0);
  };

  const finish = async (jurisdictionId: JurisdictionId, nextCityIndex: number) => {
    try {
      setLoading(true);
      await completeOnboarding(jurisdictionId, nextCityIndex);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#0f2922] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(224,122,95,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_32%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              {t("onboarding.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("onboarding.title")}</h1>
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
          {t("onboarding.subtitle")}
        </p>

        {step === "market" ? (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-white/60">
              {t("onboarding.stepMarket")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MARKET_PRESETS.map((preset) => {
                const active = preset.jurisdictionId === selectedId;
                return (
                  <button
                    key={preset.jurisdictionId}
                    type="button"
                    onClick={() => handleSelectMarket(preset)}
                    disabled={loading}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-white bg-white text-[#0f2922] shadow-xl"
                        : "border-white/12 bg-white/6 text-white hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {preset.flag}
                      </span>
                      {active ? <Check className="h-5 w-5 shrink-0" /> : null}
                    </div>
                    <p className="mt-3 text-base font-semibold">{preset.label}</p>
                    <p className={`mt-1 text-sm ${active ? "text-[#0f2922]/70" : "text-white/65"}`}>
                      {preset.paymentHint}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section>
            <button
              type="button"
              onClick={() => setStep("market")}
              className="mb-4 text-sm font-medium text-white/70 hover:text-white"
            >
              ← {t("onboarding.stepMarket")}
            </button>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/60">
              {t("onboarding.stepCity")}
            </h2>
            <p className="mb-4 text-lg font-semibold">
              {selectedPreset.flag} {selectedPreset.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedPreset.cities.map((city, index) => {
                const active = cityIndex === index;
                return (
                  <button
                    key={`${city.city}-${city.region}`}
                    type="button"
                    onClick={() => setCityIndex(index)}
                    disabled={loading}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-white bg-white text-[#0f2922]"
                        : "border-white/12 bg-white/6 text-white hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-semibold">{city.city}</span>
                    </div>
                    <p className={`mt-1 text-sm ${active ? "text-[#0f2922]/70" : "text-white/65"}`}>
                      {city.region}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void finish(selectedPreset.jurisdictionId, cityIndex)}
              disabled={loading}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0f2922] transition hover:bg-white/90 disabled:opacity-60"
            >
              {loading ? t("onboarding.saving") : t("onboarding.continue")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        <p className="mt-auto pt-10 text-xs text-white/55">{t("onboarding.changeLater")}</p>
      </div>
    </div>
  );
}
