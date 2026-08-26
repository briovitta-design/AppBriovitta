import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { gerarUrlDownloadTemporaria } from "@/lib/cloudinary";
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

    const documento = snap.data() as Documento;

    // Qualquer usuário autenticado do sistema pode consultar (Matheus, Vitória,
    // Admin) — não há portal de paciente na V1, então não existe "acesso externo"
    // a validar aqui além de estar logado no sistema.
    if (!documento.cloudinaryPublicId) {
      return NextResponse.json(
        { error: "Este documento ainda não tem um Word gerado." },
        { status: 404 }
      );
    }

    const url = gerarUrlDownloadTemporaria(documento.cloudinaryPublicId);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "download_documento",
      entidade: "documento",
      entidadeId: documento.id,
    });

    return NextResponse.json({ url });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível gerar o link de download.");
  }
}
