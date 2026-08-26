import { redirect, notFound } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { AppShell } from "@/components/AppShell";
import { BackLink } from "@/components/ui/BackLink";
import { NovoAtendimentoForm } from "./NovoAtendimentoForm";
import { BotaoBaixa } from "./BotaoBaixa";
import { ResponsavelPaciente } from "./ResponsavelPaciente";
import { EvolucaoAcoes } from "./EvolucaoAcoes";
import { EditarPacienteForm } from "./EditarPacienteForm";
import { PacotesPaciente } from "./PacotesPaciente";
import { calcularIdade, formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import type { Atendimento, Documento, Evolucao, Paciente, Pacote, Usuario } from "@/lib/types";

const LABEL_LOCAL: Record<string, string> = { clinica: "Clínica", home_care: "Home Care" };
const LABEL_TIPO_DOCUMENTO: Record<string, string> = {
  laudo_fisioterapeutico: "Laudo fisioterapêutico",
  relatorio_evolucao: "Relatório de evolução",
  declaracao: "Declaração",
  encaminhamento: "Encaminhamento",
};
const LABEL_STATUS_DOCUMENTO: Record<string, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  assinado: "Assinado",
};

export default async function FichaPacientePage({ params }: { params: { id: string } }) {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  const db = getAdminDb();
  const pacienteRef = db.collection("pacientes").doc(params.id);
  const [pacienteSnap, atendimentosSnap, evolucoesSnap, documentosSnap, pacotesSnap] = await Promise.all([
    pacienteRef.get(),
    pacienteRef.collection("atendimentos").orderBy("dataHora", "desc").get(),
    pacienteRef.collection("evolucoes").orderBy("dataHora", "desc").get(),
    db.collection("documentos").where("pacienteId", "==", params.id).orderBy("criadoEm", "desc").get(),
    pacienteRef.collection("pacotes").orderBy("criadoEm", "desc").get(),
  ]);

  if (!pacienteSnap.exists) notFound();

  const paciente = pacienteSnap.data() as Paciente;

  if (usuario.papel !== "admin" && paciente.profissionalResponsavelId !== usuario.uid) {
    notFound();
  }

  let responsavelNome: string | null = null;
  if (paciente.profissionalResponsavelId) {
    const responsavelSnap = await db.collection("usuarios").doc(paciente.profissionalResponsavelId).get();
    responsavelNome = responsavelSnap.exists ? (responsavelSnap.data() as Usuario).nome : null;
  }
  const atendimentos = atendimentosSnap.docs.map((d) => d.data() as Atendimento);
  const evolucoes = evolucoesSnap.docs.map((d) => d.data() as Evolucao);
  const documentos = documentosSnap.docs.map((d) => d.data() as Documento);
  const pacotes = pacotesSnap.docs.map((d) => d.data() as Pacote);
  // "Ao criar um atendimento, o sistema deve identificar se há pacote
  // ativo" — seção 1.2. Só considera pacote com sessão disponível.
  const pacoteAtivo =
    pacotes.find((p) => p.status === "ativo" && p.sessoesRealizadas < p.quantidadeSessoes) ?? null;
  const podeEditarPaciente = usuario.papel === "admin" || usuario.uid === paciente.profissionalResponsavelId;

  const valorTotal = atendimentos.reduce((s, a) => s + a.valor, 0);
  const valorPendente = atendimentos
    .filter((a) => a.statusPagamento === "pendente")
    .reduce((s, a) => s + a.valor, 0);

  // Timeline única: atendimentos + evoluções, ordenados por data (mais recente primeiro).
  type ItemTimeline =
    | { tipo: "atendimento"; data: string; item: Atendimento }
    | { tipo: "evolucao"; data: string; item: Evolucao };

  const timeline: ItemTimeline[] = [
    ...atendimentos.map((a): ItemTimeline => ({ tipo: "atendimento", data: a.dataHora, item: a })),
    ...evolucoes.map((e): ItemTimeline => ({ tipo: "evolucao", data: e.dataHora, item: e })),
  ].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <AppShell usuario={usuario}>
      <BackLink href="/pacientes" label="Voltar para pacientes" />
      <div className="mb-6 rounded-xl bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-main">{paciente.nomeCompleto}</h1>
            <p className="text-sm text-text-secondary">
              {calcularIdade(paciente.dataNascimento)} anos
              {paciente.telefone && ` · ${paciente.telefone}`}
            </p>
            <p className="mt-1 text-sm text-text-main">
              <span className="text-text-secondary">Diagnóstico: </span>
              {paciente.diagnostico}
            </p>
            {paciente.endereco && (
              <p className="text-sm text-text-secondary">Endereço: {paciente.endereco}</p>
            )}
            {paciente.observacoes && (
              <p className="text-sm text-text-secondary">Observações clínicas: {paciente.observacoes}</p>
            )}
            {paciente.observacoesInternas && (
              <p className="text-sm text-text-secondary">
                Observações internas: {paciente.observacoesInternas}
              </p>
            )}
            <div className="mt-1">
              <ResponsavelPaciente
                pacienteId={paciente.id}
                responsavelId={paciente.profissionalResponsavelId}
                responsavelNome={responsavelNome}
                podeEditar={usuario.papel === "admin"}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-support-soft pt-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-text-secondary">Atendimentos</p>
            <p className="font-medium text-text-main">{atendimentos.length}</p>
          </div>
          <div>
            <p className="text-text-secondary">Último atendimento</p>
            <p className="font-medium text-text-main">
              {atendimentos[0] ? formatarData(atendimentos[0].dataHora) : "—"}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Valor total</p>
            <p className="font-medium text-text-main">{formatarMoeda(valorTotal)}</p>
          </div>
          <div>
            <p className="text-text-secondary">Pendente</p>
            <p className={valorPendente > 0 ? "font-medium text-red-600" : "font-medium text-success"}>
              {formatarMoeda(valorPendente)}
            </p>
          </div>
        </div>
      </div>

      {podeEditarPaciente && (
        <div className="mb-6">
          <EditarPacienteForm paciente={paciente} />
        </div>
      )}

      <NovoAtendimentoForm
        pacienteId={paciente.id}
        enderecoPaciente={paciente.endereco}
        pacoteAtivo={pacoteAtivo}
      />

      <PacotesPaciente pacienteId={paciente.id} pacotes={pacotes} podeEditar={podeEditarPaciente} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-text-main">Documentos</h2>
        <a
          href={`/pacientes/${paciente.id}/documentos/novo`}
          className="rounded-md bg-support px-3 py-1.5 text-sm font-medium text-support-foreground hover:opacity-90"
        >
          + Novo documento
        </a>
      </div>
      {documentos.length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">Nenhum documento ainda.</p>
      ) : (
        <ul className="mt-2 divide-y divide-support-soft rounded-xl bg-card shadow-sm">
          {documentos.map((doc) => (
            <li key={doc.id}>
              <a
                href={`/pacientes/${paciente.id}/documentos/${doc.id}`}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-secondary"
              >
                <span className="text-sm text-text-main">{LABEL_TIPO_DOCUMENTO[doc.tipo]}</span>
                <span className="text-xs text-text-secondary">
                  {LABEL_STATUS_DOCUMENTO[doc.status]} · {formatarData(doc.criadoEm)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-6 text-sm font-medium text-text-main">Histórico</h2>
      {timeline.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum registro ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {timeline.map((entrada) =>
            entrada.tipo === "atendimento" ? (
              <li key={`at-${entrada.item.id}`} className="rounded-lg bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-medium text-text-main">
                    Atendimento · {LABEL_LOCAL[entrada.item.local]}
                    {entrada.item.pacoteId && (
                      <span className="ml-2 rounded-full bg-support-soft px-2 py-0.5 text-xs font-normal text-support-foreground">
                        Pacote
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">{formatarDataHora(entrada.item.dataHora)}</p>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <p className="text-text-secondary">{formatarMoeda(entrada.item.valor)}</p>
                  {entrada.item.pacoteId ? (
                    <span className="text-xs font-medium text-success">Coberto pelo pacote</span>
                  ) : entrada.item.statusPagamento === "pago" ? (
                    <span className="text-xs font-medium text-success">
                      Pago · {entrada.item.formaPagamento}
                    </span>
                  ) : (
                    <BotaoBaixa pacienteId={paciente.id} atendimentoId={entrada.item.id} />
                  )}
                </div>
              </li>
            ) : (
              <EvolucaoAcoes
                key={`ev-${entrada.item.id}`}
                pacienteId={paciente.id}
                evolucao={entrada.item}
                podeEditar={usuario.papel === "admin" || usuario.uid === entrada.item.profissionalId}
              />
            )
          )}
        </ul>
      )}
    </AppShell>
  );
}
