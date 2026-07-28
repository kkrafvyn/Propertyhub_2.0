import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import {
  buildUserMarket,
  getDisplayCurrencyForMarket,
  getMarketSummary,
  isOnboardingComplete,
  marketFromAuthMetadata,
  readStoredMarket,
  writeStoredMarket,
  type UserMarket,
} from "../../lib/user-market.service";
import type { JurisdictionId } from "../../lib/real-estate-compliance";
import { useAuth } from "./AuthContext";
import { useCurrency } from "./CurrencyContext";
import { useTranslation } from "../i18n/LocaleContext";

interface MarketContextValue {
  market: UserMarket | null;
  ready: boolean;
  onboardingComplete: boolean;
  summary: ReturnType<typeof getMarketSummary> | null;
  completeOnboarding: (jurisdictionId: JurisdictionId, cityIndex?: number) => Promise<void>;
  updateMarket: (jurisdictionId: JurisdictionId, cityIndex?: number) => Promise<void>;
  defaultSearchLocation: string;
  defaultListingMode: "rent" | "buy" | "stay";
}

const MarketContext = createContext<MarketContextValue>({
  market: null,
  ready: false,
  onboardingComplete: false,
  summary: null,
  completeOnboarding: async () => {},
  updateMarket: async () => {},
  defaultSearchLocation: "",
  defaultListingMode: "rent",
});

export function MarketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setCurrency } = useCurrency();
  const { setLocale } = useTranslation();
  const [market, setMarket] = useState<UserMarket | null>(() => readStoredMarket());
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(() => isOnboardingComplete());

  const applyMarketSideEffects = useCallback(
    (nextMarket: UserMarket) => {
      setCurrency(getDisplayCurrencyForMarket(nextMarket));
      if (nextMarket.suggestedLocale) {
        setLocale(nextMarket.suggestedLocale);
      }
    },
    [setCurrency, setLocale],
  );

  const persistMarket = useCallback(
    async (nextMarket: UserMarket) => {
      writeStoredMarket(nextMarket);
      setMarket(nextMarket);
      setOnboardingComplete(true);
      applyMarketSideEffects(nextMarket);

      if (user) {
        await supabase.auth.updateUser({
          data: {
            market_jurisdiction: nextMarket.jurisdictionId,
            market_country: nextMarket.country,
            market_region: nextMarket.region,
            market_city: nextMarket.city,
            market_search_location: nextMarket.searchLocation,
            market_currency: nextMarket.currency,
          },
        });
      }
    },
    [applyMarketSideEffects, user],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const stored = readStoredMarket();
      if (stored) {
        if (!cancelled) {
          setMarket(stored);
          setOnboardingComplete(true);
          applyMarketSideEffects(stored);
        }
        if (!cancelled) setReady(true);
        return;
      }

      if (user?.user_metadata) {
        const fromAuth = marketFromAuthMetadata(user.user_metadata);
        if (fromAuth) {
          writeStoredMarket(fromAuth);
          if (!cancelled) {
            setMarket(fromAuth);
            setOnboardingComplete(true);
            applyMarketSideEffects(fromAuth);
          }
        }
      }

      if (!cancelled) setReady(true);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user, applyMarketSideEffects]);

  const completeOnboarding = useCallback(
    async (jurisdictionId: JurisdictionId, cityIndex = 0) => {
      const nextMarket = buildUserMarket(jurisdictionId, cityIndex);
      await persistMarket(nextMarket);
    },
    [persistMarket],
  );

  const updateMarket = useCallback(
    async (jurisdictionId: JurisdictionId, cityIndex = 0) => {
      await completeOnboarding(jurisdictionId, cityIndex);
    },
    [completeOnboarding],
  );

  const value = useMemo<MarketContextValue>(
    () => ({
      market,
      ready,
      onboardingComplete,
      summary: market ? getMarketSummary(market) : null,
      completeOnboarding,
      updateMarket,
      defaultSearchLocation: market?.searchLocation || "Accra, Ghana",
      defaultListingMode: market?.defaultListingMode || "rent",
    }),
    [market, ready, onboardingComplete, completeOnboarding, updateMarket],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useUserMarket() {
  return useContext(MarketContext);
}
