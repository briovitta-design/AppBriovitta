import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { LogAuditoria } from "@/lib/types";

/**
 * Toda ação sensível (seção 12: alterações de documentos, valores,
 * baixas e dados clínicos; seção 16: ações administrativas) deve
 * chamar esta função no mesmo caminho de código que executa a ação —
 * nunca de forma opcional ou "quando der tempo".
 */
export async function registrarLog(params: {
  usuarioId: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  metadados?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminDb();
  const doc: Omit<LogAuditoria, "id"> = {
    usuarioId: params.usuarioId,
    acao: params.acao,
    entidade: params.entidade,
    entidadeId: params.entidadeId,
    dataHora: new Date().toISOString(),
    metadados: params.metadados,
  };
  await db.collection("logsAuditoria").add(doc);
}
