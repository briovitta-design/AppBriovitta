import { NextResponse, type NextRequest } from "next/server";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { registrarLog } from "@/lib/audit";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken ausente" }, { status: 400 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: 60 * 60 * 24 * 5, // 5 dias, em segundos
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    await registrarLog({
      usuarioId: decoded.uid,
      acao: "login",
      entidade: "usuario",
      entidadeId: decoded.uid,
    });

    return response;
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    return NextResponse.json(
      { error: "Não foi possível autenticar." },
      { status: 401 }
    );
  }
}
