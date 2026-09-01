import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type ThemeAccent = "emerald" | "midnight" | "oasis";

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accent: ThemeAccent;
  setTheme: (theme: ThemeMode, event?: React.MouseEvent | MouseEvent) => void;
  toggleTheme: (event?: React.MouseEvent | MouseEvent) => void;
  setAccent: (accent: ThemeAccent) => void;
}

const STORAGE_THEME_KEY = "baytmiftah_theme";
const STORAGE_ACCENT_KEY = "baytmiftah_accent";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  accent: "emerald",
  setTheme: () => {},
  toggleTheme: () => {},
  setAccent: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncThemeMeta(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#081713" : "#fcfbf9");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_THEME_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return "system";
  });

  const [accent, setAccentState] = useState<ThemeAccent>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACCENT_KEY);
      if (stored === "emerald" || stored === "midnight" || stored === "oasis") {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return "emerald";
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Listen to OS system theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    return theme === "system" ? systemTheme : theme;
  }, [theme, systemTheme]);

  // Apply classes and data attributes
  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    root.classList.toggle("dark", isDark);
    root.dataset.theme = resolvedTheme;
    root.dataset.themeMode = theme;
    root.dataset.accent = accent;

    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
      localStorage.setItem(STORAGE_ACCENT_KEY, accent);
    } catch {
      /* ignore */
    }

    syncThemeMeta(resolvedTheme);
  }, [theme, resolvedTheme, accent]);

  // Handle smooth transition with View Transitions API or smooth CSS class
  const applyThemeWithTransition = useCallback(
    (newTheme: ThemeMode, event?: React.MouseEvent | MouseEvent) => {
      const targetResolved: ResolvedTheme =
        newTheme === "system" ? getSystemTheme() : newTheme;

      if (targetResolved === resolvedTheme && newTheme === theme) {
        return;
      }

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Use document.startViewTransition if available and motion is enabled
      const doc = document as unknown as {
        startViewTransition?: (callback: () => void) => {
          ready: Promise<void>;
          finished: Promise<void>;
        };
      };

      if (
        !prefersReducedMotion &&
        typeof doc.startViewTransition === "function" &&
        event
      ) {
        const x = event.clientX;
        const y = event.clientY;
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );

        const transition = doc.startViewTransition(() => {
          setThemeState(newTheme);
        });

        transition.ready.then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];

          document.documentElement.animate(
            {
              clipPath:
                targetResolved === "dark"
                  ? clipPath
                  : [...clipPath].reverse(),
            },
            {
              duration: 400,
              easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              pseudoElement:
                targetResolved === "dark"
                  ? "::view-transition-new(root)"
                  : "::view-transition-old(root)",
            },
          );
        });
        return;
      }

      // Smooth CSS fallback transition
      if (!prefersReducedMotion && typeof document !== "undefined" && document.documentElement) {
        document.documentElement.classList.add("theme-transitioning");
        setTimeout(() => {
          if (typeof document !== "undefined" && document.documentElement) {
            document.documentElement.classList.remove("theme-transitioning");
          }
        }, 400);
      }

      setThemeState(newTheme);
    },
    [theme, resolvedTheme],
  );

  const toggleTheme = useCallback(
    (event?: React.MouseEvent | MouseEvent) => {
      const nextTheme: ThemeMode =
        resolvedTheme === "dark" ? "light" : "dark";
      applyThemeWithTransition(nextTheme, event);
    },
    [resolvedTheme, applyThemeWithTransition],
  );

  const setAccent = useCallback((newAccent: ThemeAccent) => {
    setAccentState(newAccent);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      accent,
      setTheme: applyThemeWithTransition,
      toggleTheme,
      setAccent,
    }),
    [theme, resolvedTheme, accent, applyThemeWithTransition, toggleTheme, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
