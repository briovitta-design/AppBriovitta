import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { uploadDocumentoPrivado } from "@/lib/cloudinary";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";

const COLECOES_RAIZ = ["usuarios", "pacientes", "documentos", "assinaturas", "templates", "logsAuditoria"];
const SUBCOLECOES_PACIENTE = ["atendimentos", "evolucoes"];

// Chamado manualmente pelo Admin (botão) ou por um Vercel Cron Job diário
// (ver vercel.json), autenticado por CRON_SECRET — não depende do Firebase
// Storage nem de nenhum recurso pago; o snapshot é um .json guardado como
// arquivo privado no Cloudinary, na pasta briovitta/backups/.
async function executarBackup(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const autorizadoPorCron = Boolean(
    process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  );

  let usuarioAdmin = null;
  if (!autorizadoPorCron) {
    const usuario = await getCurrentUsuario();
    if (!usuario || usuario.papel !== "admin") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }
    usuarioAdmin = usuario;
  }

  try {
    const db = getAdminDb();
    const snapshot: Record<string, unknown> = {};

    for (const colecao of COLECOES_RAIZ) {
      const snap = await db.collection(colecao).get();
      snapshot[colecao] = snap.docs.map((d) => d.data());
    }

    const pacientesSnap = await db.collection("pacientes").get();
    const pacientesComSubcolecoes = [];
    for (const pacienteDoc of pacientesSnap.docs) {
      const paciente: Record<string, unknown> = { ...pacienteDoc.data() };
      for (const sub of SUBCOLECOES_PACIENTE) {
        const subSnap = await pacienteDoc.ref.collection(sub).get();
        paciente[sub] = subSnap.docs.map((d) => d.data());
      }
      pacientesComSubcolecoes.push(paciente);
    }
    snapshot.pacientes = pacientesComSubcolecoes;

    const dataHoje = new Date().toISOString().slice(0, 10);
    const buffer = Buffer.from(JSON.stringify(snapshot, null, 2));

    const { publicId } = await uploadDocumentoPrivado({
      buffer,
      publicId: `briovitta/backups/backup_${dataHoje}`,
    });

    if (usuarioAdmin) {
      await registrarLog({
        usuarioId: usuarioAdmin.uid,
        acao: "gerar_backup",
        entidade: "sistema",
        entidadeId: publicId,
      });
    }

    return NextResponse.json({ ok: true, publicId });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível gerar o backup.");
  }
}

// Vercel Cron faz GET com header "Authorization: Bearer <CRON_SECRET>"
// quando a variável de ambiente CRON_SECRET está configurada.
export async function GET(request: NextRequest) {
  return executarBackup(request);
}

// Botão "Gerar backup agora" no painel do Admin usa POST com a sessão normal.
export async function POST(request: NextRequest) {
  return executarBackup(request);
}
