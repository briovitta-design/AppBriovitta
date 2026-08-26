import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";
import { FinanceiroLista } from "./FinanceiroLista";

export default async function FinanceiroPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  return (
    <AppShell usuario={usuario}>
      <h1 className="mb-6 text-lg font-semibold text-text-main">Financeiro</h1>
      <FinanceiroLista />
    </AppShell>
  );
}
