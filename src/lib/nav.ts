import { LayoutDashboard, Users, Wallet, ShieldCheck, FileCog, type LucideIcon } from "lucide-react";
import type { Papel } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Se definido, o item só aparece para estes papéis */
  papeis?: Papel[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/usuarios", label: "Administração", icon: ShieldCheck, papeis: ["admin"] },
  { href: "/admin/documentos", label: "Documentos", icon: FileCog, papeis: ["admin"] },
];

/** Título de contexto mostrado na topbar, derivado da rota atual. */
export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/pacientes/") && pathname.includes("/documentos")) return "Documentos";
  if (pathname.startsWith("/pacientes/")) return "Ficha do paciente";
  if (pathname.startsWith("/pacientes")) return "Pacientes";
  if (pathname.startsWith("/financeiro")) return "Financeiro";
  if (pathname.startsWith("/admin/documentos")) return "Configuração de documentos";
  if (pathname.startsWith("/admin")) return "Administração";
  if (pathname.startsWith("/perfil")) return "Perfil";
  return "Briovitta";
}
