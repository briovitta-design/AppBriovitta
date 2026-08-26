import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";
import { NovoPacienteForm } from "./NovoPacienteForm";
import { ListaPacientes } from "./ListaPacientes";

export default async function PacientesPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  return (
    <AppShell usuario={usuario}>
      <h1 className="mb-6 text-lg font-semibold text-text-main">Pacientes</h1>
      <NovoPacienteForm usuarioAtual={usuario} />
      <ListaPacientes />
    </AppShell>
  );
}
