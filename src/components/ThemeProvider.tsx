"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { THEMES, themeToCssVars, DEFAULT_THEME, type ThemeName } from "@/lib/theme/tokens";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme?: ThemeName;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme ?? DEFAULT_THEME);

  useEffect(() => {
    const tokens = THEMES[theme];
    const vars = themeToCssVars(tokens);
    const root = document.documentElement;
    // Troca instantânea (seção 3.3): só reescreve variáveis CSS, sem reload.
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  function setTheme(novoTema: ThemeName) {
    setThemeState(novoTema);
    // Persistência real (Firestore) é feita pelo componente que chama isso,
    // via PATCH em /api/usuarios/[uid] — este provider só cuida da camada visual.
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
