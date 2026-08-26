// Paletas dos dois temas visuais da Briovitta.
// O tema não altera dados nem permissões — só a camada visual.
// Cada tema mantém sua própria personalidade: Matheus é uma sidebar escura
// e técnica (clínico/tech); Vitória é uma sidebar clara e acolhedora
// (boutique/delicado). As cores usadas são exatamente as da paleta oficial
// de cada perfil — nenhuma cor nova foi inventada.

export type ThemeName = "matheus" | "vitoria";

export interface ThemeTokens {
  label: string;
  colors: {
    bg: string;
    bgSecondary: string;
    card: string;
    border: string;
    primary: string;
    primaryHover: string;
    primarySoft: string;
    support: string;
    supportSoft: string;
    // Cor de texto/ícone garantida com contraste sobre `support` — não dá
    // pra usar textMain aqui porque em alguns temas "support" é um tom claro
    // (precisa de texto escuro) e em outros é escuro (precisa de texto claro).
    // Foi exatamente essa mistura que deixava "Novo documento" e o ícone de
    // Home Care invisíveis no tema Matheus.
    supportForeground: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    info: string;
    infoSoft: string;
    textMain: string;
    textSecondary: string;
    textOnPrimary: string;
    disabled: string;
    ring: string;
    // Camada da sidebar (independente do card/bg principal)
    sidebarBg: string;
    sidebarText: string;
    sidebarTextMuted: string;
    sidebarActiveBg: string;
    sidebarBorder: string;
    // Gradiente de assinatura visual do tema (usado com moderação:
    // item ativo da sidebar, botão primário, faixa de destaque dos KPIs)
    gradientFrom: string;
    gradientTo: string;
  };
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  matheus: {
    label: "Tema Matheus",
    colors: {
      bg: "#F8FAFC",
      bgSecondary: "#EEF2F7",
      card: "#FFFFFF",
      border: "#E5E7EB",
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
      primarySoft: "#DBEAFE",
      support: "#1E3A5F",
      supportSoft: "#E7ECF3",
      supportForeground: "#F8FAFC",
      success: "#22C55E",
      successSoft: "#DCFCE7",
      warning: "#D97706",
      warningSoft: "#FEF3C7",
      danger: "#DC2626",
      dangerSoft: "#FEE2E2",
      info: "#2563EB",
      infoSoft: "#DBEAFE",
      textMain: "#1E3A5F",
      textSecondary: "#5B6B80",
      textOnPrimary: "#FFFFFF",
      disabled: "#B7C0CC",
      ring: "#2563EB",
      sidebarBg: "#1E3A5F",
      sidebarText: "#F8FAFC",
      sidebarTextMuted: "#93A9C4",
      sidebarActiveBg: "#2A4A73",
      sidebarBorder: "#2A4A73",
      gradientFrom: "#2563EB",
      gradientTo: "#1E3A5F",
    },
  },
  vitoria: {
    label: "Tema Vitória",
    colors: {
      bg: "#FAF8F7",
      bgSecondary: "#F5F1F0",
      card: "#FFFFFF",
      border: "#F0E4E6",
      primary: "#D98C9B",
      primaryHover: "#C97889",
      primarySoft: "#FBECEF",
      support: "#F3D6DB",
      supportSoft: "#FBECEF",
      supportForeground: "#332B2D",
      success: "#22C55E",
      successSoft: "#DCFCE7",
      warning: "#D97706",
      warningSoft: "#FEF3C7",
      danger: "#C9455A",
      dangerSoft: "#FBE4E7",
      info: "#8FA3C9",
      infoSoft: "#EBF0F9",
      textMain: "#332B2D",
      textSecondary: "#75696C",
      textOnPrimary: "#FFFFFF",
      disabled: "#AAA0A2",
      ring: "#D98C9B",
      sidebarBg: "#F5F1F0",
      sidebarText: "#332B2D",
      sidebarTextMuted: "#75696C",
      sidebarActiveBg: "#FBECEF",
      sidebarBorder: "#F0E4E6",
      gradientFrom: "#D98C9B",
      gradientTo: "#C97889",
    },
  },
};

export const DEFAULT_THEME: ThemeName = "vitoria";

export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  return {
    "--color-bg": theme.colors.bg,
    "--color-bg-secondary": theme.colors.bgSecondary,
    "--color-card": theme.colors.card,
    "--color-border": theme.colors.border,
    "--color-primary": theme.colors.primary,
    "--color-primary-hover": theme.colors.primaryHover,
    "--color-primary-soft": theme.colors.primarySoft,
    "--color-support": theme.colors.support,
    "--color-support-soft": theme.colors.supportSoft,
    "--color-support-foreground": theme.colors.supportForeground,
    "--color-success": theme.colors.success,
    "--color-success-soft": theme.colors.successSoft,
    "--color-warning": theme.colors.warning,
    "--color-warning-soft": theme.colors.warningSoft,
    "--color-danger": theme.colors.danger,
    "--color-danger-soft": theme.colors.dangerSoft,
    "--color-info": theme.colors.info,
    "--color-info-soft": theme.colors.infoSoft,
    "--color-text-main": theme.colors.textMain,
    "--color-text-secondary": theme.colors.textSecondary,
    "--color-text-on-primary": theme.colors.textOnPrimary,
    "--color-disabled": theme.colors.disabled,
    "--color-ring": theme.colors.ring,
    "--color-sidebar-bg": theme.colors.sidebarBg,
    "--color-sidebar-text": theme.colors.sidebarText,
    "--color-sidebar-text-muted": theme.colors.sidebarTextMuted,
    "--color-sidebar-active-bg": theme.colors.sidebarActiveBg,
    "--color-sidebar-border": theme.colors.sidebarBorder,
    "--color-gradient-from": theme.colors.gradientFrom,
    "--color-gradient-to": theme.colors.gradientTo,
  };
}
