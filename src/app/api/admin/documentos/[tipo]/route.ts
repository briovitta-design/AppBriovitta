import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/api-errors";
import { TIPOS_DOCUMENTO } from "@/lib/templates";
import type { ConfiguracaoDocumento, TipoDocumento } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tipo: string } }
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (usuario.papel !== "admin") return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  if (!TIPOS_DOCUMENTO.includes(params.tipo as TipoDocumento)) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const promptIA = typeof body.promptIA === "string" ? body.promptIA.trim() : "";
    if (!promptIA) {
      return NextResponse.json({ error: "As instruções não podem ficar em branco." }, { status: 400 });
    }

    const config: ConfiguracaoDocumento = {
      tipo: params.tipo as TipoDocumento,
      promptIA,
      atualizadoPor: usuario.uid,
      atualizadoEm: new Date().toISOString(),
    };

    await getAdminDb().collection("configuracoesDocumento").doc(params.tipo).set(config);

    return NextResponse.json({ ok: true, configuracao: config });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível salvar as instruções.");
  }
}
