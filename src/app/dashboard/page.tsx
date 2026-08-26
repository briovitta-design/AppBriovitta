import { redirect } from "next/navigation";
import Link from "next/link";
import { UserPlus, Wallet, Users } from "lucide-react";
import { getCurrentUsuario } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";
import { DashboardView } from "@/components/dashboard/DashboardView";

function saudacaoPeriodo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <AppShell usuario={usuario}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-main">
            {saudacaoPeriodo()}, {usuario.nome.split(" ")[0]}
          </h1>
          <p className="text-sm capitalize text-text-secondary">{hoje}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pacientes"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-on-primary shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" /> Novo paciente
          </Link>
          <Link
            href="/pacientes"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-main shadow-sm transition-all hover:bg-bg-secondary active:scale-[0.98]"
          >
            <Users className="h-4 w-4" /> Ver pacientes
          </Link>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-main shadow-sm transition-all hover:bg-bg-secondary active:scale-[0.98]"
          >
            <Wallet className="h-4 w-4" /> Ver financeiro
          </Link>
        </div>
      </div>

      <DashboardView ehAdmin={usuario.papel === "admin"} />
    </AppShell>
  );
}
