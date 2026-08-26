"use client";

import { useTheme } from "@/components/ThemeProvider";
import { THEMES, type ThemeName } from "@/lib/theme/tokens";

export function ThemeSwitcher({ uid }: { uid: string }) {
  const { theme, setTheme } = useTheme();

  async function handleChange(novoTema: ThemeName) {
    setTheme(novoTema); // aplica na hora, sem esperar a rede
    try {
      await fetch(`/api/usuarios/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema: novoTema }),
      });
    } catch (err) {
      console.error("Não foi possível salvar a preferência de tema:", err);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className="text-sm text-text-secondary">
        Aparência
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => handleChange(e.target.value as ThemeName)}
        className="rounded-md border border-disabled bg-card px-2 py-1 text-sm text-text-main"
      >
        {Object.entries(THEMES).map(([key, tokens]) => (
          <option key={key} value={key}>
            {tokens.label}
          </option>
        ))}
      </select>
    </div>
  );
}
