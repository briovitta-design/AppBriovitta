import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { Usuario } from "@/lib/types";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };
const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 dias, alinhado ao requisito de sessão com expiração

/**
 * Troca um ID token do Firebase Auth (obtido no cliente após o login)
 * por um cookie de sessão HttpOnly — o front nunca guarda token em
 * localStorage, reduzindo a superfície de roubo de sessão.
 */
export async function createSessionCookie(idToken: string) {
  const adminAuth = getAdminAuth();
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_IN_MS,
  });
  return sessionCookie;
}

export async function getCurrentUsuario(): Promise<Usuario | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const db = getAdminDb();
    const snap = await db.collection("usuarios").doc(decoded.uid).get();
    if (!snap.exists) return null;

    const usuario = snap.data() as Usuario;
    if (!usuario.ativo) return null; // usuário desativado pelo admin não pode manter sessão

    return usuario;
  } catch {
    // cookie inválido, expirado ou revogado
    return null;
  }
}

export function isPapelPermitido(
  papelAtual: Usuario["papel"],
  papeisPermitidos: Usuario["papel"][]
): boolean {
  return papeisPermitidos.includes(papelAtual);
}
