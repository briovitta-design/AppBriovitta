import { NextResponse } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Usuario } from "@/lib/types";

/**
 * Lista enxuta (uid, nome, papel) dos profissionais ativos — usada no
 * seletor de "responsável" ao cadastrar um paciente. Diferente de
 * /api/admin/users (que é admin-only e traz tudo), esta fica disponível
 * pra qualquer usuário logado porque qualquer um pode cadastrar paciente.
 */
export async function GET() {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const snap = await getAdminDb()
      .collection("usuarios")
      .where("ativo", "==", true)
      .get();

    const profissionais = snap.docs
      .map((d) => d.data() as Usuario)
      .filter((u) => u.papel !== "admin")
      .map((u) => ({ uid: u.uid, nome: u.nome, papel: u.papel }));

    return NextResponse.json({ profissionais });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os profissionais.");
  }
}
