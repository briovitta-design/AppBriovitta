import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Evolucao } from "@/lib/types";

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
      .collection("evolucoes")
      .orderBy("dataHora", "desc")
      .get();

    return NextResponse.json({ evolucoes: snap.docs.map((d) => d.data() as Evolucao) });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar as evoluções.");
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
    const { atendimentoId, tipo, dataHora } = body;

    if (!atendimentoId || !tipo || !dataHora) {
      return NextResponse.json(
        { error: "Campos obrigatórios: atendimentoId, tipo, dataHora." },
        { status: 400 }
      );
    }

    if (tipo === "rapida" && !body.textoRapido) {
      return NextResponse.json(
        { error: "textoRapido é obrigatório na evolução rápida." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const ref = db
      .collection("pacientes")
      .doc(params.id)
      .collection("evolucoes")
      .doc();

    const novaEvolucao: Evolucao = {
      id: ref.id,
      pacienteId: params.id,
      atendimentoId,
      profissionalId: usuario.uid,
      tipo,
      dataHora,
      queixaEstadoAtual: body.queixaEstadoAtual,
      condutaRealizada: body.condutaRealizada,
      respostaObservada: body.respostaObservada,
      orientacoesPlano: body.orientacoesPlano,
      observacoesAdicionais: body.observacoesAdicionais,
      textoRapido: body.textoRapido,
      criadoEm: new Date().toISOString(),
    };

    await ref.set(novaEvolucao);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "criar_evolucao",
      entidade: "evolucao",
      entidadeId: ref.id,
      metadados: { pacienteId: params.id, atendimentoId },
    });

    return NextResponse.json({ evolucao: novaEvolucao }, { status: 201 });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível registrar a evolução.");
  }
}
