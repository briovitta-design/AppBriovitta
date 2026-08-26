import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { uploadAssinaturaImagem } from "@/lib/cloudinary";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB — sobra pra uma imagem de assinatura
const TIPOS_ACEITOS = ["image/png", "image/jpeg"];

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  const usuarioLogado = await getCurrentUsuario();
  if (!usuarioLogado) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const podeEditar = usuarioLogado.uid === params.uid || usuarioLogado.papel === "admin";
  if (!podeEditar) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Envie uma imagem (PNG ou JPG)." }, { status: 400 });
    }
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      return NextResponse.json({ error: "A assinatura precisa ser PNG ou JPG." }, { status: 400 });
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande (máximo 5MB)." }, { status: 400 });
    }

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const { url } = await uploadAssinaturaImagem({ buffer, uid: params.uid });

    const agora = new Date().toISOString();
    await getAdminDb().collection("usuarios").doc(params.uid).update({
      assinaturaImagemUrl: url,
      assinaturaAtualizadaEm: agora,
      atualizadoEm: agora,
    });

    await registrarLog({
      usuarioId: usuarioLogado.uid,
      acao: "atualizar_assinatura",
      entidade: "usuario",
      entidadeId: params.uid,
    });

    return NextResponse.json({ ok: true, url, assinaturaAtualizadaEm: agora });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível enviar a assinatura.");
  }
}
