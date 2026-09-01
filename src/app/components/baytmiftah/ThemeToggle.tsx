import { useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  ThemeSunIcon,
  ThemeMoonIcon,
  ThemeSystemIcon,
} from "./ThemeIcons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Check } from "lucide-react";

export function ThemeToggle({
  className = "",
  showMenu = true,
}: {
  className?: string;
  showMenu?: boolean;
}) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const icon = useMemo(() => {
    if (theme === "system") {
      return <ThemeSystemIcon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />;
    }
    return resolvedTheme === "dark" ? (
      <ThemeMoonIcon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 text-emerald-400" />
    ) : (
      <ThemeSunIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 text-amber-500" />
    );
  }, [theme, resolvedTheme]);

  const label = useMemo(() => {
    if (theme === "system") return "Theme: Auto (System)";
    return resolvedTheme === "dark" ? "Theme: Dark Mode" : "Theme: Light Mode";
  }, [theme, resolvedTheme]);

  if (!showMenu) {
    return (
      <button
        type="button"
        onClick={(e) => toggleTheme(e)}
        className={`group relative flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface text-ink shadow-sm transition-all duration-200 hover:bg-surface-hover hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        aria-label={label}
        title={label}
      >
        {icon}
      </button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`group relative flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface text-ink shadow-sm transition-all duration-200 hover:border-surface-border hover:bg-surface-hover hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-primary ${className}`}
          aria-label={label}
          title={label}
        >
          {icon}
          {theme === "system" && (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-brand-orange ring-1 ring-white"
              title="System sync active"
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-48 overflow-hidden rounded-xl border border-surface-border bg-surface p-1 text-ink shadow-menu"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Appearance
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={(e) => setTheme("light", e)}
          className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
        >
          <div className="flex items-center gap-2.5">
            <ThemeSunIcon className="h-4 w-4 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => setTheme("dark", e)}
          className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
        >
          <div className="flex items-center gap-2.5">
            <ThemeMoonIcon className="h-4 w-4 text-emerald-400" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => setTheme("system", e)}
          className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-ink transition hover:bg-surface-hover"
        >
          <div className="flex items-center gap-2.5">
            <ThemeSystemIcon className="h-4 w-4 text-ink-secondary" />
            <span>System Auto</span>
          </div>
          {theme === "system" && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
