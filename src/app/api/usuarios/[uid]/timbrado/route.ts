import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { uploadTimbradoImagem } from "@/lib/cloudinary";

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB — imagem A4 em boa resolução, sobra de margem
const TIPOS_ACEITOS = ["image/png", "image/jpeg"];

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  const usuarioLogado = await getCurrentUsuario();
  if (!usuarioLogado) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Mesma regra do resto do perfil: cada um sobe o seu, admin pode subir
  // pra qualquer profissional (ex.: ajudando alguém que não conseguiu).
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
      return NextResponse.json({ error: "O timbrado precisa ser PNG ou JPG." }, { status: 400 });
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande (máximo 10MB)." }, { status: 400 });
    }

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const { url } = await uploadTimbradoImagem({ buffer, uid: params.uid });

    const agora = new Date().toISOString();
    await getAdminDb().collection("usuarios").doc(params.uid).update({
      letterheadImagemUrl: url,
      letterheadAtualizadoEm: agora,
      atualizadoEm: agora,
    });

    await registrarLog({
      usuarioId: usuarioLogado.uid,
      acao: "atualizar_timbrado",
      entidade: "usuario",
      entidadeId: params.uid,
    });

    return NextResponse.json({ ok: true, url, letterheadAtualizadoEm: agora });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível enviar o timbrado.");
  }
}
