import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { registrarLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Paciente } from "@/lib/types";

export async function GET(request: NextRequest) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const busca = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();

    const db = getAdminDb();
    const snap = await db.collection("pacientes").orderBy("nomeCompleto").get();
    let pacientes = snap.docs.map((d) => d.data() as Paciente);

    // Cada paciente só aparece pro profissional responsável (admin vê todos).
    // Pacientes cadastrados antes desta função existir, sem responsável
    // definido, ficam visíveis só pro admin até alguém atribuir um na ficha.
    if (usuario.papel !== "admin") {
      pacientes = pacientes.filter((p) => p.profissionalResponsavelId === usuario.uid);
    }

    if (busca) {
      pacientes = pacientes.filter((p) =>
        p.nomeCompleto.toLowerCase().includes(busca)
      );
    }

    return NextResponse.json({ pacientes });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os pacientes.");
  }
}

export async function POST(request: NextRequest) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const {
      nomeCompleto,
      dataNascimento,
      telefone,
      diagnostico,
      tipoHabitual,
      endereco,
      observacoes,
      observacoesInternas,
      profissionalResponsavelId,
    } = body;

    if (!nomeCompleto || !dataNascimento || !diagnostico) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nomeCompleto, dataNascimento, diagnostico." },
        { status: 400 }
      );
    }

    if (!profissionalResponsavelId) {
      return NextResponse.json(
        { error: "Selecione o profissional responsável pelo paciente." },
        { status: 400 }
      );
    }

    if (tipoHabitual === "home_care" && !endereco) {
      return NextResponse.json(
        { error: "Endereço é obrigatório para pacientes de Home Care." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Confere que o responsável escolhido é mesmo um profissional ativo —
    // evita paciente órfão de um uid inválido/desativado.
    const responsavelSnap = await db.collection("usuarios").doc(profissionalResponsavelId).get();
    const responsavel = responsavelSnap.data();
    if (!responsavelSnap.exists || !responsavel?.ativo || responsavel.papel === "admin") {
      return NextResponse.json(
        { error: "Profissional responsável inválido." },
        { status: 400 }
      );
    }

    const ref = db.collection("pacientes").doc();
    const agora = new Date().toISOString();

    const paciente: Paciente = {
      id: ref.id,
      nomeCompleto,
      dataNascimento,
      telefone,
      diagnostico,
      tipoHabitual,
      endereco,
      observacoes,
      observacoesInternas,
      profissionalResponsavelId,
      criadoPor: usuario.uid,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    await ref.set(paciente);

    await registrarLog({
      usuarioId: usuario.uid,
      acao: "criar_paciente",
      entidade: "paciente",
      entidadeId: ref.id,
    });

    return NextResponse.json({ paciente }, { status: 201 });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível cadastrar o paciente.");
  }
}
