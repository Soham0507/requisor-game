import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

// Same key the landing page's own toggle already wrote to (see
// src/pages/home.tsx) — sharing it means a preference set on one page is
// still there after navigating to another.
const STORAGE_KEY = "immerse-theme";

function readStoredTheme(): Theme {
  try {
    // Light is the default; dark only when the visitor has chosen it.
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Shared dark/light preference for the app shell (Navbar, /games,
 * /customize). Applies (or removes) `dark` on <html> so every page's
 * Tailwind `dark:` classes follow it. A pre-hydration script in index.html
 * applies the stored value before first paint so there's no flash — this
 * hook just keeps <html> and localStorage in sync after that.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private-mode storage can throw; theme still applies for this tab */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
