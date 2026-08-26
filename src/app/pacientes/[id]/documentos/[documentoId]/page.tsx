import { redirect, notFound } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { AppShell } from "@/components/AppShell";
import { BackLink } from "@/components/ui/BackLink";
import { DocumentoAcoes } from "./DocumentoAcoes";
import type { Documento } from "@/lib/types";

export default async function DocumentoPage({
  params,
}: {
  params: { id: string; documentoId: string };
}) {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  const snap = await getAdminDb().collection("documentos").doc(params.documentoId).get();
  if (!snap.exists) notFound();
  const documento = snap.data() as Documento;

  const podeAssinar = usuario.uid === documento.profissionalId;

  return (
    <AppShell usuario={usuario}>
      <BackLink href={`/pacientes/${params.id}`} label="Voltar para a ficha do paciente" />
      <h1 className="mb-6 text-lg font-semibold text-text-main">Documento</h1>
      <DocumentoAcoes documento={documento} pacienteId={params.id} podeAssinar={podeAssinar} />
    </AppShell>
  );
}
