import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";
import { BackLink } from "@/components/ui/BackLink";
import { NovoDocumentoForm } from "./NovoDocumentoForm";

export default async function NovoDocumentoPage({ params }: { params: { id: string } }) {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  return (
    <AppShell usuario={usuario}>
      <BackLink href={`/pacientes/${params.id}`} label="Voltar para a ficha do paciente" />
      <h1 className="mb-6 text-lg font-semibold text-text-main">Novo documento</h1>
      <NovoDocumentoForm pacienteId={params.id} />
    </AppShell>
  );
}
