import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Pacote, SituacaoFinanceiraPacote, TipoHabitual } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const {
      quantidadeSessoes,
      valorTotal,
      profissionalResponsavelId,
      tipoHabitual,
      dataInicio,
      situacaoFinanceira,
      valorRecebido,
    } = body as {
      quantidadeSessoes?: number;
      valorTotal?: number;
      profissionalResponsavelId?: string;
      tipoHabitual?: TipoHabitual;
      dataInicio?: string;
      situacaoFinanceira?: SituacaoFinanceiraPacote;
      valorRecebido?: number;
    };

    if (
      !quantidadeSessoes ||
      quantidadeSessoes <= 0 ||
      valorTotal === undefined ||
      valorTotal < 0 ||
      !profissionalResponsavelId ||
      !tipoHabitual ||
      !dataInicio ||
      !situacaoFinanceira
    ) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios: quantidadeSessoes (> 0), valorTotal, profissionalResponsavelId, tipoHabitual, dataInicio, situacaoFinanceira.",
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const pacienteRef = db.collection("pacientes").doc(params.id);
    const pacienteSnap = await pacienteRef.get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    const responsavelSnap = await db.collection("usuarios").doc(profissionalResponsavelId).get();
    const responsavel = responsavelSnap.data();
    if (!responsavelSnap.exists || !responsavel?.ativo || responsavel.papel === "admin") {
      return NextResponse.json({ error: "Profissional responsável inválido." }, { status: 400 });
    }

    const ref = pacienteRef.collection("pacotes").doc();
    const agora = new Date().toISOString();

    const pacote: Pacote = {
      id: ref.id,
      pacienteId: params.id,
      quantidadeSessoes,
      sessoesRealizadas: 0,
      valorTotal,
      profissionalResponsavelId,
      tipoHabitual,
      dataInicio,
      situacaoFinanceira,
      // Só faz sentido guardar valor recebido quando é pagamento parcial —
      // "pago" já significa recebido = total, "pendente" significa 0.
      valorRecebido:
        situacaoFinanceira === "parcial" ? Number(valorRecebido) || 0 : situacaoFinanceira === "pago" ? valorTotal : 0,
      status: "ativo",
      criadoPor: usuario.uid,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await ref.set(pacote);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "criar_pacote",
      entidade: "pacote",
      entidadeId: ref.id,
      metadados: { pacienteId: params.id, quantidadeSessoes, valorTotal },
    });

    return NextResponse.json({ pacote }, { status: 201 });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível criar o pacote.");
  }
}
