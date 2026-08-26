import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";
import { PromptsDocumentoForm } from "./PromptsDocumentoForm";

export default async function AdminDocumentosPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");
  if (usuario.papel !== "admin") redirect("/dashboard");

  return (
    <AppShell usuario={usuario}>
      <h1 className="mb-2 text-lg font-semibold text-text-main">Configuração de documentos</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Instruções que a IA segue ao gerar cada tipo de documento. Assinatura e timbrado de
        cada profissional ficam em Perfil.
      </p>
      <PromptsDocumentoForm />
    </AppShell>
  );
}
