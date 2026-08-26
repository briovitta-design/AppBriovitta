import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Pacote, SituacaoFinanceiraPacote, StatusPacote } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; pacoteId: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const db = getAdminDb();
    const ref = db
      .collection("pacientes")
      .doc(params.id)
      .collection("pacotes")
      .doc(params.pacoteId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Pacote não encontrado." }, { status: 404 });
    }
    const pacoteAtual = snap.data() as Pacote;

    const body = await request.json();
    const {
      quantidadeSessoes,
      valorTotal,
      situacaoFinanceira,
      valorRecebido,
      status,
    } = body as {
      quantidadeSessoes?: number;
      valorTotal?: number;
      situacaoFinanceira?: SituacaoFinanceiraPacote;
      valorRecebido?: number;
      status?: StatusPacote;
    };

    const atualizacoes: Partial<Pacote> = {};
    const alteracoesParaAuditoria: Record<string, { de: unknown; para: unknown }> = {};

    // "Permitir corrigir quantidade ou valor enquanto o pacote ainda
    // estiver ativo" — seção 1.3. Fora disso, o pacote já é histórico.
    if (quantidadeSessoes !== undefined || valorTotal !== undefined) {
      if (pacoteAtual.status !== "ativo") {
        return NextResponse.json(
          { error: "Só é possível ajustar quantidade ou valor enquanto o pacote está ativo." },
          { status: 409 }
        );
      }
      if (quantidadeSessoes !== undefined) {
        // Nunca reduzir abaixo do que já foi usado — "não apagar o histórico
        // das sessões já utilizadas".
        if (quantidadeSessoes < pacoteAtual.sessoesRealizadas) {
          return NextResponse.json(
            {
              error: `Não é possível reduzir a quantidade abaixo das ${pacoteAtual.sessoesRealizadas} sessões já realizadas.`,
            },
            { status: 400 }
          );
        }
        atualizacoes.quantidadeSessoes = quantidadeSessoes;
        alteracoesParaAuditoria.quantidadeSessoes = { de: pacoteAtual.quantidadeSessoes, para: quantidadeSessoes };
      }
      if (valorTotal !== undefined) {
        atualizacoes.valorTotal = valorTotal;
        alteracoesParaAuditoria.valorTotal = { de: pacoteAtual.valorTotal, para: valorTotal };
      }
    }

    if (situacaoFinanceira !== undefined) {
      atualizacoes.situacaoFinanceira = situacaoFinanceira;
      atualizacoes.valorRecebido =
        situacaoFinanceira === "parcial"
          ? Number(valorRecebido) || 0
          : situacaoFinanceira === "pago"
            ? (atualizacoes.valorTotal ?? pacoteAtual.valorTotal)
            : 0;
      alteracoesParaAuditoria.situacaoFinanceira = { de: pacoteAtual.situacaoFinanceira, para: situacaoFinanceira };
    }

    if (status !== undefined && status !== pacoteAtual.status) {
      atualizacoes.status = status;
      alteracoesParaAuditoria.status = { de: pacoteAtual.status, para: status };
    }

    if (Object.keys(atualizacoes).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    atualizacoes.atualizadoEm = new Date().toISOString();
    await ref.update(atualizacoes);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "ajustar_pacote",
      entidade: "pacote",
      entidadeId: params.pacoteId,
      metadados: { pacienteId: params.id, alteracoes: alteracoesParaAuditoria },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar o pacote.");
  }
}
