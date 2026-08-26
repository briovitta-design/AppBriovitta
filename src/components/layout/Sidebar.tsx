"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import type { Usuario } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  usuario,
  mobileOpen,
  onClose,
}: {
  usuario: Usuario;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.papeis || item.papeis.includes(usuario.papel));

  const conteudo = (
    <div className="flex h-full flex-col bg-sidebar-bg">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <img src="/logo-briovitta.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight text-sidebar-text">
            Briovitta
          </span>
        </Link>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-sidebar-text-muted hover:bg-sidebar-active lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-text"
                  : "text-sidebar-text-muted hover:bg-sidebar-active/60 hover:text-sidebar-text"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-gradient" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs text-sidebar-text-muted">Briovitta &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: sidebar fixa e persistente */}
      <aside className="hidden w-[264px] shrink-0 border-r border-sidebar-border lg:block">
        <div className="fixed h-screen w-[264px]">{conteudo}</div>
      </aside>

      {/* Mobile/tablet: drawer sobreposto */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-[280px] animate-slide-in-left shadow-popover">
            {conteudo}
          </div>
        </div>
      )}
    </>
  );
}
