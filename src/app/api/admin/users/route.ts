import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import { DEFAULT_THEME } from "@/lib/theme/tokens";
import type { Usuario } from "@/lib/types";

// Não há autocadastro no Briovitta — só o Administrador cria usuários
// (seção 13, tela de Login: "recuperação de acesso pelo administrador").

async function exigirAdmin() {
  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.papel !== "admin") {
    return null;
  }
  return usuario;
}

export async function GET() {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("usuarios").orderBy("nome").get();
    const usuarios = snap.docs.map((d) => d.data() as Usuario);
    return NextResponse.json({ usuarios });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os usuários.");
  }
}

export async function POST(request: NextRequest) {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nome, login, senhaTemporaria, papel, registroProfissional, especialidade } = body;

    if (!nome || !login || !senhaTemporaria || !papel) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, login, senhaTemporaria, papel." },
        { status: 400 }
      );
    }

    if (!["matheus", "vitoria", "admin"].includes(papel)) {
      return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const authUser = await adminAuth.createUser({
      email: login,
      password: senhaTemporaria,
      displayName: nome,
    });

    const agora = new Date().toISOString();
    const novoUsuario: Usuario = {
      uid: authUser.uid,
      nome,
      login,
      papel,
      tema: DEFAULT_THEME,
      ativo: true,
      registroProfissional,
      especialidade,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await getAdminDb().collection("usuarios").doc(authUser.uid).set(novoUsuario);

    await registrarLog({
      usuarioId: admin.uid,
      acao: "criar_usuario",
      entidade: "usuario",
      entidadeId: authUser.uid,
      metadados: { papel },
    });

    return NextResponse.json({ usuario: novoUsuario }, { status: 201 });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível criar o usuário.");
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await exigirAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { uid, ativo, novaSenha } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid é obrigatório." }, { status: 400 });
    }

    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    if (typeof ativo === "boolean") {
      await db.collection("usuarios").doc(uid).update({
        ativo,
        atualizadoEm: new Date().toISOString(),
      });
      await adminAuth.updateUser(uid, { disabled: !ativo });
      await registrarLog({
        usuarioId: admin.uid,
        acao: ativo ? "reativar_usuario" : "desativar_usuario",
        entidade: "usuario",
        entidadeId: uid,
      });
    }

    if (novaSenha) {
      await adminAuth.updateUser(uid, { password: novaSenha });
      // revoga sessões antigas ao redefinir a senha
      await adminAuth.revokeRefreshTokens(uid);
      await registrarLog({
        usuarioId: admin.uid,
        acao: "redefinir_senha",
        entidade: "usuario",
        entidadeId: uid,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível atualizar o usuário.");
  }
}
