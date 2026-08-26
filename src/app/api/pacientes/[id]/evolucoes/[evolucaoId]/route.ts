import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Evolucao } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; evolucaoId: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const db = getAdminDb();
    const ref = db
      .collection("pacientes")
      .doc(params.id)
      .collection("evolucoes")
      .doc(params.evolucaoId);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Evolução não encontrada." }, { status: 404 });
    }
    const evolucao = snap.data() as Evolucao;

    // Registro clínico: só quem escreveu (ou o admin) pode corrigir.
    if (usuario.papel !== "admin" && usuario.uid !== evolucao.profissionalId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const atualizacao: Partial<Evolucao> = {};
    const editaveis: (keyof Evolucao)[] =
      evolucao.tipo === "rapida"
        ? ["textoRapido"]
        : [
            "queixaEstadoAtual",
            "condutaRealizada",
            "respostaObservada",
            "orientacoesPlano",
            "observacoesAdicionais",
          ];

    for (const campo of editaveis) {
      if (body[campo] !== undefined) (atualizacao as any)[campo] = body[campo];
    }

    if (Object.keys(atualizacao).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    await ref.update(atualizacao);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "editar_evolucao",
      entidade: "evolucao",
      entidadeId: params.evolucaoId,
      metadados: { pacienteId: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar a evolução.");
  }
}
