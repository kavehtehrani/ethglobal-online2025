"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    // Update CSS variables, data attribute, and localStorage when theme changes
    const root = document.documentElement;

    // Set data-theme attribute for CSS selectors
    root.setAttribute("data-theme", theme);

    if (theme === "dark") {
      root.style.setProperty("--background", "#0f0f23");
      root.style.setProperty("--foreground", "#e2e8f0");
      root.style.setProperty("--card-bg", "#1e293b");
      root.style.setProperty("--card-border", "#334155");
      root.style.setProperty("--text-muted", "#94a3b8");
      root.style.setProperty("--text-secondary", "#64748b");
    } else {
      root.style.setProperty("--background", "#ffffff");
      root.style.setProperty("--foreground", "#171717");
      root.style.setProperty("--card-bg", "#f9fafb");
      root.style.setProperty("--card-border", "#e5e7eb");
      root.style.setProperty("--text-muted", "#6b7280");
      root.style.setProperty("--text-secondary", "#9ca3af");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
