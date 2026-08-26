"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, User, LogOut } from "lucide-react";
import { getPageTitle } from "@/lib/nav";
import type { Usuario } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LogoutButton } from "@/components/LogoutButton";

const LABEL_PAPEL: Record<string, string> = {
  matheus: "Matheus",
  vitoria: "Vitória",
  admin: "Admin",
};

export function Topbar({ usuario, onOpenSidebar }: { usuario: Usuario; onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-secondary lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-display text-lg font-semibold text-text-main">
            {getPageTitle(pathname)}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <ThemeSwitcher uid={usuario.uid} />
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-bg-secondary"
            >
              <Avatar nome={usuario.nome} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-text-main">
                  {usuario.nome.split(" ")[0]}
                </span>
                <span className="block text-xs leading-tight text-text-secondary">
                  {LABEL_PAPEL[usuario.papel]}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            </button>

            {menuAberto && (
              <div className="absolute right-0 top-full mt-2 w-52 animate-slide-up rounded-xl border border-border bg-card p-1.5 shadow-popover">
                <div className="border-b border-border px-3 py-2 sm:hidden">
                  <ThemeSwitcher uid={usuario.uid} />
                </div>
                <Link
                  href="/perfil"
                  onClick={() => setMenuAberto(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-main hover:bg-bg-secondary"
                >
                  <User className="h-4 w-4" /> Perfil e preferências
                </Link>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft">
                  <LogOut className="h-4 w-4" />
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
