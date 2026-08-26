import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { gerarDocxDocumento } from "@/lib/docx/gerarDocxDocumento";
import { CIDADE_PADRAO } from "@/lib/docx/constantes";
import { garantirHtml } from "@/lib/texto";
import { calcularHashDocumento, gerarIdentificadorVerificacao } from "@/lib/docx/hash";
import { uploadDocumentoPrivado } from "@/lib/cloudinary";
import type { Assinatura, Documento, Usuario } from "@/lib/types";

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

    // Só o próprio profissional assina o que é seu — nem o admin assina no lugar dele
    // (a assinatura representa autoria/responsabilidade clínica, seção 9.1).
    if (usuario.uid !== documento.profissionalId) {
      return NextResponse.json(
        { error: "Só o profissional responsável pode assinar este documento." },
        { status: 403 }
      );
    }
    if (documento.status !== "aprovado") {
      return NextResponse.json(
        { error: "O documento precisa estar aprovado antes de assinar." },
        { status: 409 }
      );
    }

    const profissionalSnap = await db.collection("usuarios").doc(documento.profissionalId).get();
    const profissional = profissionalSnap.data() as Usuario;
    if (!profissional?.letterheadImagemUrl) {
      return NextResponse.json(
        { error: "Este profissional ainda não tem timbrado cadastrado." },
        { status: 422 }
      );
    }

    const identificador = gerarIdentificadorVerificacao();

    const docxBytes = await gerarDocxDocumento({
      conteudoHtml: garantirHtml(documento.conteudo),
      timbradoUrl: profissional.letterheadImagemUrl,
      nomeProfissional: profissional.nome,
      registroProfissional: profissional.registroProfissional,
      cidade: CIDADE_PADRAO,
      assinaturaUrl: profissional.assinaturaImagemUrl,
      identificadorAssinatura: identificador,
    });

    const hash = calcularHashDocumento(docxBytes);
    const publicId = `briovitta/documentos/pacientes/${documento.pacienteId}/${documento.id}_v${documento.versao}_assinado.docx`;
    const { publicId: cloudinaryPublicId } = await uploadDocumentoPrivado({
      buffer: docxBytes,
      publicId,
    });

    const agora = new Date().toISOString();

    await ref.update({
      status: "assinado",
      cloudinaryPublicId,
      hash,
      atualizadoEm: agora,
    });

    const assinaturaRef = db.collection("assinaturas").doc();
    const assinatura: Assinatura = {
      id: assinaturaRef.id,
      documentoId: documento.id,
      usuarioId: usuario.uid,
      dataHora: agora,
      hash,
      identificador,
      versaoDocumento: documento.versao,
    };
    await assinaturaRef.set(assinatura);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "assinar_documento",
      entidade: "documento",
      entidadeId: documento.id,
      metadados: { identificador },
    });

    return NextResponse.json({ ok: true, assinatura });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível assinar o documento.");
  }
}
