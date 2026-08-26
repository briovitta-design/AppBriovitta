import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Atendimento } from "@/lib/types";

export async function GET(request: NextRequest) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status"); // 'pago' | 'pendente' | null (todos)
    const local = params.get("local"); // 'clinica' | 'home_care' | null
    const somenteMeus = params.get("somenteMeus") === "true";
    const de = params.get("de"); // ISO date, início do período (inclusive)
    const ate = params.get("ate"); // ISO date, fim do período (inclusive)

    const db = getAdminDb();
    // collectionGroup: consulta 'atendimentos' em todos os pacientes de uma vez,
    // necessário porque atendimentos vivem como subcoleção de cada paciente.
    let query = db.collectionGroup("atendimentos").orderBy("dataHora", "desc");

    const snap = await query.get();
    let atendimentos = snap.docs.map((d) => d.data() as Atendimento);

    if (status) atendimentos = atendimentos.filter((a) => a.statusPagamento === status);
    if (local) atendimentos = atendimentos.filter((a) => a.local === local);
    if (somenteMeus) atendimentos = atendimentos.filter((a) => a.profissionalId === usuario.uid);
    if (de) atendimentos = atendimentos.filter((a) => a.dataHora >= de);
    if (ate) atendimentos = atendimentos.filter((a) => a.dataHora <= ate);

    const faturado = atendimentos.reduce((s, a) => s + a.valor, 0);
    const recebido = atendimentos
      .filter((a) => a.statusPagamento === "pago")
      .reduce((s, a) => s + a.valor, 0);
    const pendente = atendimentos
      .filter((a) => a.statusPagamento === "pendente")
      .reduce((s, a) => s + a.valor, 0);

    return NextResponse.json({
      atendimentos,
      indicadores: { faturado, recebido, pendente, quantidade: atendimentos.length },
    });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os dados financeiros.");
  }
}
