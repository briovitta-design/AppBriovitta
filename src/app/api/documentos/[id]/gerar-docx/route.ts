import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { gerarDocxDocumento } from "@/lib/docx/gerarDocxDocumento";
import { CIDADE_PADRAO } from "@/lib/docx/constantes";
import { garantirHtml } from "@/lib/texto";
import { uploadDocumentoPrivado } from "@/lib/cloudinary";
import type { Documento, Usuario } from "@/lib/types";

export async function POST(
  _request: NextRequest,
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

    if (documento.status === "rascunho") {
      return NextResponse.json(
        { error: "Aprove o documento antes de gerar o Word." },
        { status: 409 }
      );
    }
    if (usuario.papel !== "admin" && usuario.uid !== documento.profissionalId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const profissionalSnap = await db.collection("usuarios").doc(documento.profissionalId).get();
    const profissional = profissionalSnap.data() as Usuario;
    if (!profissional?.letterheadImagemUrl) {
      return NextResponse.json(
        { error: "Este profissional ainda não tem timbrado cadastrado." },
        { status: 422 }
      );
    }

    const docxBytes = await gerarDocxDocumento({
      conteudoHtml: garantirHtml(documento.conteudo),
      timbradoUrl: profissional.letterheadImagemUrl,
      nomeProfissional: profissional.nome,
      registroProfissional: profissional.registroProfissional,
      cidade: CIDADE_PADRAO,
      assinaturaUrl: profissional.assinaturaImagemUrl,
    });

    const publicId = `briovitta/documentos/pacientes/${documento.pacienteId}/${documento.id}_v${documento.versao}.docx`;
    const { publicId: cloudinaryPublicId } = await uploadDocumentoPrivado({
      buffer: docxBytes,
      publicId,
    });

    await ref.update({
      cloudinaryPublicId,
      atualizadoEm: new Date().toISOString(),
    });

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "gerar_docx_documento",
      entidade: "documento",
      entidadeId: params.id,
    });

    return NextResponse.json({ ok: true, cloudinaryPublicId });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível gerar o Word do documento.");
  }
}
