import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { gerarRascunhoIA, type ModoGeracaoIA } from "@/lib/ia/gerarRascunho";
import type { Evolucao, Paciente, Usuario } from "@/lib/types";

const MODOS_VALIDOS: ModoGeracaoIA[] = ["completo", "melhorar", "resumir"];

export async function POST(request: NextRequest) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const { pacienteId, tipo, instrucaoExtra, textoAtual } = body;
    const modo: ModoGeracaoIA = MODOS_VALIDOS.includes(body.modo) ? body.modo : "completo";

    if (!pacienteId || !tipo) {
      return NextResponse.json(
        { error: "Campos obrigatórios: pacienteId, tipo." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const pacienteSnap = await db.collection("pacientes").doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }
    const paciente = pacienteSnap.data() as Paciente;

    const evolucoesSnap = await db
      .collection("pacientes")
      .doc(pacienteId)
      .collection("evolucoes")
      .orderBy("dataHora", "desc")
      .limit(8) // já limita na consulta — não traz o histórico inteiro pro servidor
      .get();
    const evolucoes = evolucoesSnap.docs.map((d) => d.data() as Evolucao);

    // A chamada à IA tem seu próprio catch porque merece uma mensagem
    // específica (502, "tente de novo ou escreva manualmente") em vez do
    // erro genérico do apiErrorResponse — é uma falha de serviço externo,
    // não do nosso banco.
    try {
      const texto = await gerarRascunhoIA({
        modo,
        tipo,
        paciente,
        profissional: usuario,
        evolucoes,
        instrucaoExtra,
        textoAtual,
      });

      await registrarLog({
        usuarioId: usuario.uid,
        acao: "gerar_rascunho_ia",
        entidade: "paciente",
        entidadeId: pacienteId,
        metadados: { tipo, modo },
      });

      return NextResponse.json({ texto });
    } catch (error) {
      // Falta de texto no modo "melhorar" é erro de uso, não de serviço —
      // 400 com a mensagem exata em vez do 502 genérico.
      if (error instanceof Error && error.message.includes("texto no documento")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("Erro ao gerar rascunho com IA:", error);
      return NextResponse.json(
        { error: "Não foi possível gerar o rascunho com IA agora. Tente novamente ou escreva manualmente." },
        { status: 502 }
      );
    }
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível gerar o rascunho.");
  }
}
