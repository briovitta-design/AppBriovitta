import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// O middleware roda no Edge e não pode usar firebase-admin (precisa de Node.js APIs).
// Ele só verifica se existe cookie de sessão; a validação criptográfica completa
// (verifySessionCookie) e o controle fino por papel acontecem nas páginas/rotas
// server-side via getCurrentUsuario(), que é a fonte de verdade de permissão.

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, exceto:
     * - api routes (fazem sua própria checagem de sessão/papel)
     * - arquivos estáticos e internos do Next
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
