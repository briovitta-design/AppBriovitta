import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Documento } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const snap = await getAdminDb().collection("documentos").doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    return NextResponse.json({ documento: snap.data() as Documento });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar o documento.");
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
    const ref = db.collection("documentos").doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    const documento = snap.data() as Documento;

    if (documento.status === "assinado") {
      return NextResponse.json(
        { error: "Documento assinado é imutável. Crie uma nova versão." },
        { status: 409 }
      );
    }

    if (usuario.papel !== "admin" && usuario.uid !== documento.profissionalId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const atualizacao: Partial<Documento> = { atualizadoEm: new Date().toISOString() };
    if (body.conteudo !== undefined) atualizacao.conteudo = body.conteudo;
    if (body.status === "aprovado") atualizacao.status = "aprovado";

    await ref.update(atualizacao);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: body.status === "aprovado" ? "aprovar_documento" : "editar_documento",
      entidade: "documento",
      entidadeId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar o documento.");
  }
}
