import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLATFORM_FEATURE_FLAGS,
  loadPlatformFeatureFlags,
  type PlatformFeatureFlags,
} from "../../lib/platform-feature-flags";

type PlatformFeaturesContextValue = {
  flags: PlatformFeatureFlags;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PlatformFeaturesContext = createContext<PlatformFeaturesContextValue | undefined>(undefined);

export function PlatformFeaturesProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<PlatformFeatureFlags>(DEFAULT_PLATFORM_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadPlatformFeatureFlags(true);
      setFlags(next);
    } catch {
      setFlags(DEFAULT_PLATFORM_FEATURE_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener("platform-feature-flags-updated", onUpdate);
    return () => window.removeEventListener("platform-feature-flags-updated", onUpdate);
  }, [refresh]);

  const value = useMemo(
    () => ({
      flags,
      loading,
      refresh,
    }),
    [flags, loading, refresh],
  );

  return (
    <PlatformFeaturesContext.Provider value={value}>{children}</PlatformFeaturesContext.Provider>
  );
}

export function usePlatformFeatures() {
  const ctx = useContext(PlatformFeaturesContext);
  if (!ctx) {
    throw new Error("usePlatformFeatures must be used within PlatformFeaturesProvider");
  }
  return ctx;
}
