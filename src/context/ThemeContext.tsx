import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";

export type AccentTheme = {
  id: string;
  label: string;
  primary: string;        // HSL values e.g. "180 100% 50%"
  primaryFg: string;
  ring: string;
  sidebarPrimary: string;
  sidebarRing: string;
};

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: "cyan",
    label: "Neon Cyan",
    primary: "180 100% 50%",
    primaryFg: "220 10% 4%",
    ring: "180 100% 50%",
    sidebarPrimary: "180 100% 50%",
    sidebarRing: "180 100% 50%",
  },
  {
    id: "violet",
    label: "Electric Violet",
    primary: "262 83% 65%",
    primaryFg: "0 0% 100%",
    ring: "262 83% 65%",
    sidebarPrimary: "262 83% 65%",
    sidebarRing: "262 83% 65%",
  },
  {
    id: "rose",
    label: "Hot Rose",
    primary: "330 85% 60%",
    primaryFg: "0 0% 100%",
    ring: "330 85% 60%",
    sidebarPrimary: "330 85% 60%",
    sidebarRing: "330 85% 60%",
  },
  {
    id: "amber",
    label: "Amber Gold",
    primary: "38 95% 55%",
    primaryFg: "220 10% 4%",
    ring: "38 95% 55%",
    sidebarPrimary: "38 95% 55%",
    sidebarRing: "38 95% 55%",
  },
  {
    id: "emerald",
    label: "Emerald",
    primary: "152 76% 45%",
    primaryFg: "0 0% 100%",
    ring: "152 76% 45%",
    sidebarPrimary: "152 76% 45%",
    sidebarRing: "152 76% 45%",
  },
  {
    id: "orange",
    label: "Neon Orange",
    primary: "24 100% 55%",
    primaryFg: "0 0% 100%",
    ring: "24 100% 55%",
    sidebarPrimary: "24 100% 55%",
    sidebarRing: "24 100% 55%",
  },
  {
    id: "blue",
    label: "Royal Blue",
    primary: "217 91% 60%",
    primaryFg: "0 0% 100%",
    ring: "217 91% 60%",
    sidebarPrimary: "217 91% 60%",
    sidebarRing: "217 91% 60%",
  },
  {
    id: "red",
    label: "Crimson",
    primary: "0 84% 60%",
    primaryFg: "0 0% 100%",
    ring: "0 84% 60%",
    sidebarPrimary: "0 84% 60%",
    sidebarRing: "0 84% 60%",
  },
];

type ThemeContextType = {
  theme: Theme;
  toggle: () => void;
  accent: AccentTheme;
  setAccent: (id: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyAccent(a: AccentTheme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", a.primary);
  root.style.setProperty("--primary-foreground", a.primaryFg);
  root.style.setProperty("--ring", a.ring);
  root.style.setProperty("--sidebar-primary", a.sidebarPrimary);
  root.style.setProperty("--sidebar-ring", a.sidebarRing);
  root.style.setProperty("--accent", a.primary.split(" ").slice(0, 3).join(" ") + " / 0.2");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("nxt-theme") as Theme) ?? "dark";
  });

  const [accent, setAccentState] = useState<AccentTheme>(() => {
    if (typeof window === "undefined") return ACCENT_THEMES[0];
    const saved = localStorage.getItem("nxt-accent");
    return ACCENT_THEMES.find((a) => a.id === saved) ?? ACCENT_THEMES[0];
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("nxt-theme", theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    localStorage.setItem("nxt-accent", accent.id);
  }, [accent]);

  function setAccent(id: string) {
    const found = ACCENT_THEMES.find((a) => a.id === id);
    if (found) setAccentState(found);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        accent,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
