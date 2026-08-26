import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { TIPOS_DOCUMENTO } from "@/lib/templates";
import type { Documento } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const snap = await getAdminDb()
      .collection("documentos")
      .where("pacienteId", "==", params.id)
      .orderBy("criadoEm", "desc")
      .get();

    return NextResponse.json({ documentos: snap.docs.map((d) => d.data() as Documento) });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os documentos.");
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
    const { tipo, conteudo, geradoPorIA } = body;

    if (!tipo || !TIPOS_DOCUMENTO.includes(tipo)) {
      return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    }
    if (!conteudo) {
      return NextResponse.json({ error: "Conteúdo do documento é obrigatório." }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection("documentos").doc();
    const agora = new Date().toISOString();

    const documento: Documento = {
      id: ref.id,
      pacienteId: params.id,
      profissionalId: usuario.uid,
      tipo,
      templateId: "padrao",
      conteudo,
      status: "rascunho",
      versao: 1,
      geradoPorIA: Boolean(geradoPorIA),
      criadoPor: usuario.uid,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await ref.set(documento);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "criar_documento",
      entidade: "documento",
      entidadeId: ref.id,
      metadados: { pacienteId: params.id, tipo, geradoPorIA: Boolean(geradoPorIA) },
    });

    return NextResponse.json({ documento }, { status: 201 });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível criar o documento.");
  }
}
