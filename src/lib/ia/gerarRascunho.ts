import "server-only";
import OpenAI from "openai";
import { getAdminDb } from "@/lib/firebase/admin";
import { PROMPTS_PADRAO } from "@/lib/templates";
import type {
  ConfiguracaoDocumento,
  Evolucao,
  Paciente,
  TipoDocumento,
  Usuario,
} from "@/lib/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODELO = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Limite de segurança: nunca manda mais que as últimas N evoluções pro
// modelo, mesmo que o paciente tenha um histórico enorme — mantém o
// custo previsível (combinado: ~10 laudos/mês por profissional).
const MAX_EVOLUCOES_NO_CONTEXTO = 8;

export type ModoGeracaoIA = "completo" | "melhorar" | "resumir";

function resumirEvolucoes(evolucoes: Evolucao[]): string {
  if (evolucoes.length === 0) return "(nenhuma evolução registrada)";
  return evolucoes
    .slice(0, MAX_EVOLUCOES_NO_CONTEXTO)
    .map((e) => {
      const data = new Date(e.dataHora).toLocaleDateString("pt-BR");
      if (e.tipo === "rapida") return `- ${data}: ${e.textoRapido}`;
      return `- ${data}: queixa/estado: ${e.queixaEstadoAtual || "-"}; conduta: ${
        e.condutaRealizada || "-"
      }; resposta: ${e.respostaObservada || "-"}; plano: ${e.orientacoesPlano || "-"}`;
    })
    .join("\n");
}

function periodoAvaliado(evolucoes: Evolucao[]): string {
  if (evolucoes.length === 0) return "(sem registros)";
  const datas = evolucoes.map((e) => e.dataHora).sort();
  const inicio = new Date(datas[0]).toLocaleDateString("pt-BR");
  const fim = new Date(datas[datas.length - 1]).toLocaleDateString("pt-BR");
  return inicio === fim ? inicio : `${inicio} a ${fim}`;
}

/** Busca o prompt configurado pelo admin em /admin/documentos; usa o padrão
 *  embutido em PROMPTS_PADRAO se ainda não foi personalizado para o tipo. */
async function buscarPromptIA(tipo: TipoDocumento): Promise<string> {
  const snap = await getAdminDb().collection("configuracoesDocumento").doc(tipo).get();
  if (snap.exists) {
    const config = snap.data() as ConfiguracaoDocumento;
    if (config.promptIA?.trim()) return config.promptIA;
  }
  return PROMPTS_PADRAO[tipo];
}

async function chamarModelo(mensagens: { role: "system" | "user"; content: string }[]) {
  const resposta = await client.chat.completions.create({
    model: MODELO,
    messages: mensagens,
    temperature: 0.4,
    max_tokens: 1200,
  });
  return resposta.choices[0]?.message?.content?.trim() ?? "";
}

function contextoPacienteMensagem(params: {
  paciente: Paciente;
  profissional: Usuario;
  evolucoes: Evolucao[];
}): string {
  return `DADOS DISPONÍVEIS (use somente o que está aqui — nunca invente o que não estiver):
Paciente: ${params.paciente.nomeCompleto}
Diagnóstico: ${params.paciente.diagnostico}
Período avaliado: ${periodoAvaliado(params.evolucoes)}
Profissional responsável: ${params.profissional.nome}${
    params.profissional.registroProfissional ? ` (${params.profissional.registroProfissional})` : ""
  }

Evoluções registradas no prontuário:
${resumirEvolucoes(params.evolucoes)}`;
}

export async function gerarRascunhoIA(params: {
  modo: ModoGeracaoIA;
  tipo: TipoDocumento;
  paciente: Paciente;
  profissional: Usuario;
  evolucoes: Evolucao[];
  instrucaoExtra?: string;
  textoAtual?: string; // obrigatório no modo "melhorar"
}): Promise<string> {
  const promptIA = await buscarPromptIA(params.tipo);
  const contexto = contextoPacienteMensagem(params);
  const instrucao = params.instrucaoExtra
    ? `\n\nInstrução adicional do profissional para este documento: ${params.instrucaoExtra}`
    : "";

  if (params.modo === "melhorar") {
    if (!params.textoAtual?.trim()) {
      throw new Error("Não há texto no documento ainda para melhorar.");
    }
    return chamarModelo([
      { role: "system", content: promptIA },
      {
        role: "user",
        content: `${contexto}${instrucao}

Abaixo está um rascunho já escrito deste documento. Melhore a redação — clareza, fluidez, organização e tom profissional — SEM alterar nem inventar nenhum dado clínico que já esteja lá, e sem adicionar informações novas que não constem no rascunho ou nos dados acima.

Rascunho atual:
---
${params.textoAtual}
---

Responda somente com o texto final revisado, sem comentários.`,
      },
    ]);
  }

  if (params.modo === "resumir") {
    return chamarModelo([
      { role: "system", content: promptIA },
      {
        role: "user",
        content: `${contexto}${instrucao}

Em vez do documento completo, produza um RESUMO objetivo e curto (1 a 3 parágrafos) da evolução do paciente no período — só os pontos principais, sem repetir cada sessão individualmente. Mesmas regras: nunca invente dados, não inclua assinatura/CREFITO/cidade/data, sem Markdown.

Responda somente com o texto do resumo, sem comentários.`,
      },
    ]);
  }

  // modo "completo"
  return chamarModelo([
    { role: "system", content: promptIA },
    {
      role: "user",
      content: `${contexto}${instrucao}

Produza o documento completo seguindo as instruções acima. Responda somente com o texto final do documento, sem comentários.`,
    },
  ]);
}
