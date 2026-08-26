import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Todas as cores puxam de variáveis CSS trocadas pelo ThemeProvider,
        // conforme o tema ativo do usuário (Matheus ou Vitória).
        bg: "var(--color-bg)",
        "bg-secondary": "var(--color-bg-secondary)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          soft: "var(--color-primary-soft)",
        },
        support: {
          DEFAULT: "var(--color-support)",
          soft: "var(--color-support-soft)",
          foreground: "var(--color-support-foreground)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          soft: "var(--color-success-soft)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          soft: "var(--color-warning-soft)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          soft: "var(--color-info-soft)",
        },
        "text-main": "var(--color-text-main)",
        "text-secondary": "var(--color-text-secondary)",
        "text-on-primary": "var(--color-text-on-primary)",
        disabled: "var(--color-disabled)",
        ring: "var(--color-ring)",
        sidebar: {
          bg: "var(--color-sidebar-bg)",
          text: "var(--color-sidebar-text)",
          "text-muted": "var(--color-sidebar-text-muted)",
          active: "var(--color-sidebar-active-bg)",
          border: "var(--color-sidebar-border)",
        },
        "gradient-from": "var(--color-gradient-from)",
        "gradient-to": "var(--color-gradient-to)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-lexend)", "var(--font-inter)", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        popover: "var(--shadow-popover)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 220ms ease-out",
        "slide-in-right": "slide-in-right 220ms ease-out",
        "slide-in-left": "slide-in-left 220ms ease-out",
        shimmer: "shimmer 1.6s infinite linear",
      },
    },
  },
  plugins: [],
};

export default config;
