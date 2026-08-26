import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Atendimento, Paciente } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const db = getAdminDb();
    const snap = await db.collection("pacientes").doc(params.id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }
    const paciente = snap.data() as Paciente;

    if (usuario.papel !== "admin" && paciente.profissionalResponsavelId !== usuario.uid) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const atendimentosSnap = await db
      .collection("pacientes")
      .doc(params.id)
      .collection("atendimentos")
      .orderBy("dataHora", "desc")
      .get();
    const atendimentos = atendimentosSnap.docs.map((d) => d.data() as Atendimento);

    const valorTotal = atendimentos.reduce((soma, a) => soma + a.valor, 0);
    const valorPendente = atendimentos
      .filter((a) => a.statusPagamento === "pendente")
      .reduce((soma, a) => soma + a.valor, 0);

    const resumo = {
      quantidadeAtendimentos: atendimentos.length,
      ultimoAtendimento: atendimentos[0]?.dataHora ?? null,
      valorTotal,
      valorPendente,
    };

    return NextResponse.json({ paciente, resumo, atendimentos });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar o paciente.");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const db = getAdminDb();
    const pacienteSnap = await db.collection("pacientes").doc(params.id).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }
    const pacienteAtual = pacienteSnap.data() as Paciente;
    if (usuario.papel !== "admin" && pacienteAtual.profissionalResponsavelId !== usuario.uid) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const camposPermitidos: Partial<Paciente> = {};
    const editaveis: (keyof Paciente)[] = [
      "nomeCompleto",
      "dataNascimento",
      "telefone",
      "diagnostico",
      "tipoHabitual",
      "endereco",
      "observacoes",
      "observacoesInternas",
    ];
    for (const campo of editaveis) {
      if (body[campo] !== undefined) (camposPermitidos as any)[campo] = body[campo];
    }

    // Reatribuir o responsável muda quem enxerga o paciente — só o admin
    // faz isso, pra ninguém perder acesso ao próprio paciente sem querer.
    if (body.profissionalResponsavelId !== undefined) {
      if (usuario.papel !== "admin") {
        return NextResponse.json(
          { error: "Só o admin pode alterar o profissional responsável." },
          { status: 403 }
        );
      }
      const responsavelSnap = await db
        .collection("usuarios")
        .doc(body.profissionalResponsavelId)
        .get();
      const responsavel = responsavelSnap.data();
      if (!responsavelSnap.exists || !responsavel?.ativo || responsavel.papel === "admin") {
        return NextResponse.json({ error: "Profissional responsável inválido." }, { status: 400 });
      }
      camposPermitidos.profissionalResponsavelId = body.profissionalResponsavelId;
    }

    if (Object.keys(camposPermitidos).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    camposPermitidos.atualizadoEm = new Date().toISOString();

    await db.collection("pacientes").doc(params.id).update(camposPermitidos);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "editar_paciente",
      entidade: "paciente",
      entidadeId: params.id,
      metadados: { campos: Object.keys(camposPermitidos) },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar o paciente.");
  }
}
