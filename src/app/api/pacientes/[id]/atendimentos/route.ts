import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Atendimento, Evolucao, Paciente, Pacote } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const snap = await getAdminDb()
      .collection("pacientes")
      .doc(params.id)
      .collection("atendimentos")
      .orderBy("dataHora", "desc")
      .get();

    return NextResponse.json({
      atendimentos: snap.docs.map((d) => d.data() as Atendimento),
    });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os atendimentos.");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const {
      dataHora,
      local,
      enderecoAtendimento,
      valor,
      statusPagamento,
      formaPagamento,
      profissionalId,
      pacoteId, // opcional: seção 1.2 — sessão consumida de um pacote ativo
      evolucao, // opcional: { tipo, ...campos } — seção 5.1: finalizar já registra evolução
    } = body;

    if (!dataHora || !local || (!pacoteId && valor === undefined) || !statusPagamento) {
      return NextResponse.json(
        { error: "Campos obrigatórios: dataHora, local, valor (se não usar pacote), statusPagamento." },
        { status: 400 }
      );
    }

    // Por padrão o profissional é o usuário logado; só o admin pode atribuir a outro.
    const profissionalFinal =
      usuario.papel === "admin" && profissionalId ? profissionalId : usuario.uid;

    const db = getAdminDb();
    const pacienteRef = db.collection("pacientes").doc(params.id);
    const pacienteSnap = await pacienteRef.get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }
    const paciente = pacienteSnap.data() as Paciente;

    const atendimentoRef = pacienteRef.collection("atendimentos").doc();
    const agora = new Date().toISOString();

    // Sessão vinculada a pacote: não cobra valor individual de novo (seção
    // 1.2) — o valor já está coberto pela situação financeira do pacote.
    // Marca como "pago" pra não aparecer como pendência avulsa nos relatórios.
    const usandoPacote = Boolean(pacoteId);
    const valorFinal = usandoPacote ? 0 : Number(valor);
    const statusPagamentoFinal = usandoPacote ? "pago" : statusPagamento;
    const formaPagamentoFinal = usandoPacote ? undefined : (statusPagamento === "pago" ? formaPagamento : undefined);

    const novoAtendimento: Atendimento = {
      id: atendimentoRef.id,
      pacienteId: params.id,
      profissionalId: profissionalFinal,
      dataHora,
      local,
      enderecoAtendimento: local === "home_care" ? (enderecoAtendimento ?? paciente.endereco) : undefined,
      pacoteId: usandoPacote ? pacoteId : undefined,
      valor: valorFinal,
      statusPagamento: statusPagamentoFinal,
      formaPagamento: formaPagamentoFinal,
      dataBaixa: statusPagamentoFinal === "pago" ? agora : undefined,
      usuarioBaixa: statusPagamentoFinal === "pago" ? usuario.uid : undefined,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    if (usandoPacote) {
      // Transação: ler o pacote, validar que ainda tem sessão disponível, e
      // gravar o atendimento + o consumo da sessão atomicamente — evita que
      // duas sessões simultâneas estourem o limite do pacote.
      const pacoteRef = pacienteRef.collection("pacotes").doc(pacoteId);
      try {
        await db.runTransaction(async (tx) => {
          const pacoteSnap = await tx.get(pacoteRef);
          if (!pacoteSnap.exists) {
            throw new Error("Pacote não encontrado.");
          }
          const pacote = pacoteSnap.data() as Pacote;
          if (pacote.status !== "ativo") {
            throw new Error("Este pacote não está mais ativo.");
          }
          if (pacote.sessoesRealizadas >= pacote.quantidadeSessoes) {
            throw new Error("Este pacote não tem sessões restantes.");
          }

          const sessoesRealizadas = pacote.sessoesRealizadas + 1;
          const esgotouAgora = sessoesRealizadas >= pacote.quantidadeSessoes;

          tx.set(atendimentoRef, novoAtendimento);
          tx.update(pacoteRef, {
            sessoesRealizadas,
            // Conclui automaticamente quando a última sessão é usada — o
            // profissional ainda pode reabrir manualmente se precisar.
            status: esgotouAgora ? "concluido" : pacote.status,
            atualizadoEm: agora,
          });
        });
      } catch (erroTransacao) {
        const mensagem =
          erroTransacao instanceof Error ? erroTransacao.message : "Não foi possível usar este pacote.";
        return NextResponse.json({ error: mensagem }, { status: 409 });
      }
    } else {
      await atendimentoRef.set(novoAtendimento);
    }

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "criar_atendimento",
      entidade: "atendimento",
      entidadeId: atendimentoRef.id,
      metadados: { pacienteId: params.id, valor: valorFinal, local, pacoteId: usandoPacote ? pacoteId : undefined },
    });

    let novaEvolucao: Evolucao | null = null;
    if (evolucao) {
      const evolucaoRef = pacienteRef.collection("evolucoes").doc();
      novaEvolucao = {
        id: evolucaoRef.id,
        pacienteId: params.id,
        atendimentoId: atendimentoRef.id,
        profissionalId: profissionalFinal,
        tipo: evolucao.tipo,
        dataHora,
        queixaEstadoAtual: evolucao.queixaEstadoAtual,
        condutaRealizada: evolucao.condutaRealizada,
        respostaObservada: evolucao.respostaObservada,
        orientacoesPlano: evolucao.orientacoesPlano,
        observacoesAdicionais: evolucao.observacoesAdicionais,
        textoRapido: evolucao.textoRapido,
        criadoEm: agora,
      };
      await evolucaoRef.set(novaEvolucao);

      await registrarLog({
        usuarioId: usuario.uid,
        acao: "criar_evolucao",
        entidade: "evolucao",
        entidadeId: evolucaoRef.id,
        metadados: { pacienteId: params.id, atendimentoId: atendimentoRef.id },
      });
    }

    return NextResponse.json(
      { atendimento: novoAtendimento, evolucao: novaEvolucao },
      { status: 201 }
    );
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível registrar o atendimento.");
  }
}
