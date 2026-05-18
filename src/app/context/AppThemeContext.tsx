import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type AppThemePreference = "system" | "light";
export type ResolvedAppTheme = "light";

export const APP_THEME_STORAGE_KEY = "baytmiftah:theme-preference";

export const APP_THEME_OPTIONS: Array<{
  value: AppThemePreference;
  label: string;
  detail: string;
}> = [
  {
    value: "system",
    label: "System",
    detail: "Use BaytMiftah's original light palette.",
  },
  {
    value: "light",
    label: "Miftah Light",
    detail: "Bright, clean, and high contrast.",
  },
];

interface AppThemeContextValue {
  preference: AppThemePreference;
  resolvedTheme: ResolvedAppTheme;
  setPreference: (preference: AppThemePreference) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

function isAppThemePreference(value: string | null): value is AppThemePreference {
  return APP_THEME_OPTIONS.some((option) => option.value === value);
}

function getStoredPreference(): AppThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
    return isAppThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(_preference: AppThemePreference): ResolvedAppTheme {
  return "light";
}

function applyDocumentTheme(preference: AppThemePreference) {
  const resolvedTheme = resolveTheme(preference);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.appTheme = resolvedTheme;
    document.documentElement.dataset.appThemePreference = preference;
    document.documentElement.classList.remove("dark");
  }

  return resolvedTheme;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<AppThemePreference>(() => getStoredPreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppTheme>(() =>
    applyDocumentTheme(getStoredPreference())
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, preference);
    } catch {
      // Theme persistence is a nice-to-have; the UI should still switch instantly.
    }

    const syncTheme = () => setResolvedTheme(applyDocumentTheme(preference));
    syncTheme();
  }, [preference]);

  return (
    <AppThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }

  return context;
}
