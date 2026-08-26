import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Atendimento } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; atendimentoId: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const db = getAdminDb();
    const ref = db
      .collection("pacientes")
      .doc(params.id)
      .collection("atendimentos")
      .doc(params.atendimentoId);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });
    }
    const atendimento = snap.data() as Atendimento;

    // edição de valores/baixa só pelo profissional dono ou admin (seção 2.2)
    if (usuario.papel !== "admin" && usuario.uid !== atendimento.profissionalId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const agora = new Date().toISOString();
    const atualizacao: Record<string, unknown> = { atualizadoEm: agora };

    // Fluxo de "Dar baixa" (seção 14.3)
    if (body.statusPagamento === "pago") {
      atualizacao.statusPagamento = "pago";
      atualizacao.formaPagamento = body.formaPagamento;
      atualizacao.dataBaixa = agora;
      atualizacao.usuarioBaixa = usuario.uid;
    } else if (body.statusPagamento === "pendente") {
      // FieldValue.delete() é o jeito correto de apagar um campo num update();
      // atribuir `undefined` (como estava antes) faz o Admin SDK ignorar o
      // campo em silêncio — formaPagamento/dataBaixa/usuarioBaixa antigos
      // continuavam salvos mesmo depois de "desfazer baixa".
      atualizacao.statusPagamento = "pendente";
      atualizacao.formaPagamento = FieldValue.delete();
      atualizacao.dataBaixa = FieldValue.delete();
      atualizacao.usuarioBaixa = FieldValue.delete();
    }

    if (body.valor !== undefined) atualizacao.valor = body.valor;

    await ref.update(atualizacao);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: body.statusPagamento === "pago" ? "dar_baixa_atendimento" : "editar_atendimento",
      entidade: "atendimento",
      entidadeId: params.atendimentoId,
      metadados: { pacienteId: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar o atendimento.");
  }
}
