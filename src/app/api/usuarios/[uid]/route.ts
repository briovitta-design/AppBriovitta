import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/api-errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  const usuarioLogado = await getCurrentUsuario();
  if (!usuarioLogado) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Cada usuário só edita a si mesmo; admin pode editar qualquer um
  // (seção 2: "edição deve continuar vinculada ao profissional responsável",
  // exceto para o Administrador).
  const podeEditar =
    usuarioLogado.uid === params.uid || usuarioLogado.papel === "admin";
  if (!podeEditar) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const camposPermitidos: Record<string, unknown> = {};

    if (body.tema && ["matheus", "vitoria"].includes(body.tema)) {
      camposPermitidos.tema = body.tema;
    }

    if (Object.keys(camposPermitidos).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    camposPermitidos.atualizadoEm = new Date().toISOString();

    await getAdminDb().collection("usuarios").doc(params.uid).update(camposPermitidos);

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar o usuário.");
  }
}
