import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCurrentUsuario } from "@/lib/auth/session";
import { registrarLog } from "@/lib/audit";

export async function POST() {
  // O logout sempre limpa o cookie primeiro: mesmo se o log de auditoria
  // falhar (rede, Firestore fora do ar), o usuário não pode ficar preso
  // numa sessão que ele já pediu pra encerrar.
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });

  try {
    const usuario = await getCurrentUsuario();
    if (usuario) {
      await registrarLog({
        usuarioId: usuario.uid,
        acao: "logout",
        entidade: "usuario",
        entidadeId: usuario.uid,
      });
    }
  } catch (erro) {
    console.error(erro);
  }

  return response;
}
