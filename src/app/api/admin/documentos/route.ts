import { NextResponse } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/api-errors";
import { PROMPTS_PADRAO, TIPOS_DOCUMENTO } from "@/lib/templates";
import type { ConfiguracaoDocumento } from "@/lib/types";

export async function GET() {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (usuario.papel !== "admin") return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  try {
    const snap = await getAdminDb().collection("configuracoesDocumento").get();
    const configsSalvas = new Map(snap.docs.map((d) => [d.id, d.data() as ConfiguracaoDocumento]));

    // Sempre devolve os 4 tipos, mesmo os que ainda não têm config salva —
    // a tela usa PROMPTS_PADRAO como valor inicial nesse caso.
    const configuracoes = TIPOS_DOCUMENTO.map(
      (tipo) => configsSalvas.get(tipo) ?? { tipo, promptIA: PROMPTS_PADRAO[tipo], atualizadoPor: "", atualizadoEm: "" }
    );

    return NextResponse.json({ configuracoes });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar as configurações de documentos.");
  }
}
