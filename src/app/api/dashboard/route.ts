import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/api-errors";
import type { Atendimento, Paciente, Usuario } from "@/lib/types";

const MESES_HISTORICO = 6;
const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export async function GET(request: NextRequest) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const visao = request.nextUrl.searchParams.get("visao"); // 'pessoal' | 'clinica'
    const querConsolidado = visao === "clinica";
    const ehConsolidado = querConsolidado || usuario.papel === "admin";

    const db = getAdminDb();

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const inicioHistorico = new Date(inicioMes);
    inicioHistorico.setMonth(inicioHistorico.getMonth() - (MESES_HISTORICO - 1));

    const [pacientesSnap, atendimentosSnap, usuariosSnap] = await Promise.all([
      db.collection("pacientes").get(),
      db.collectionGroup("atendimentos").orderBy("dataHora", "desc").get(),
      db.collection("usuarios").get(),
    ]);

    const pacientesPorId = new Map<string, Paciente>();
    pacientesSnap.docs.forEach((d) => pacientesPorId.set(d.id, d.data() as Paciente));

    const usuariosPorId = new Map<string, Usuario>();
    usuariosSnap.docs.forEach((d) => usuariosPorId.set(d.id, d.data() as Usuario));

    let atendimentos = atendimentosSnap.docs.map((d) => d.data() as Atendimento);
    let pacientesVisiveis = pacientesSnap.docs.map((d) => d.data() as Paciente);

    // Visão pessoal (padrão para Matheus/Vitória) x visão consolidada (Admin
    // sempre vê consolidado; profissional pode alternar para ver a clínica toda).
    // Na visão pessoal, "meu" agora segue o paciente responsável (não quem
    // realizou o atendimento) — combina com a regra de "paciente só aparece
    // pro profissional responsável" cadastrada na tela de Pacientes.
    if (!ehConsolidado) {
      pacientesVisiveis = pacientesVisiveis.filter((p) => p.profissionalResponsavelId === usuario.uid);
      const idsPacientesVisiveis = new Set(pacientesVisiveis.map((p) => p.id));
      atendimentos = atendimentos.filter((a) => idsPacientesVisiveis.has(a.pacienteId));
    }

    const atendimentosDoMes = atendimentos.filter((a) => new Date(a.dataHora) >= inicioMes);

    const faturadoMes = atendimentosDoMes.reduce((s, a) => s + a.valor, 0);
    const recebidoMes = atendimentosDoMes
      .filter((a) => a.statusPagamento === "pago")
      .reduce((s, a) => s + a.valor, 0);
    const pendenteMes = atendimentosDoMes
      .filter((a) => a.statusPagamento === "pendente")
      .reduce((s, a) => s + a.valor, 0);
    const ticketMedio = atendimentosDoMes.length > 0 ? faturadoMes / atendimentosDoMes.length : 0;

    const clinicaCount = atendimentosDoMes.filter((a) => a.local === "clinica").length;
    const homeCareCount = atendimentosDoMes.filter((a) => a.local === "home_care").length;

    // Série dos últimos N meses (faturado x recebido), para o gráfico de evolução.
    const serieFaturamento = Array.from({ length: MESES_HISTORICO }).map((_, index) => {
      const refMes = new Date(inicioHistorico);
      refMes.setMonth(refMes.getMonth() + index);
      const inicio = new Date(refMes.getFullYear(), refMes.getMonth(), 1);
      const fim = new Date(refMes.getFullYear(), refMes.getMonth() + 1, 1);

      const doMes = atendimentos.filter((a) => {
        const data = new Date(a.dataHora);
        return data >= inicio && data < fim;
      });

      return {
        mes: `${NOMES_MES[refMes.getMonth()]}`,
        faturado: doMes.reduce((s, a) => s + a.valor, 0),
        recebido: doMes.filter((a) => a.statusPagamento === "pago").reduce((s, a) => s + a.valor, 0),
      };
    });

    const atendimentosRecentes = atendimentos.slice(0, 5).map((a) => ({
      id: a.id,
      pacienteId: a.pacienteId,
      pacienteNome: pacientesPorId.get(a.pacienteId)?.nomeCompleto ?? "Paciente",
      dataHora: a.dataHora,
      local: a.local,
      valor: a.valor,
      statusPagamento: a.statusPagamento,
    }));

    const pendenciasRecentes = atendimentos
      .filter((a) => a.statusPagamento === "pendente")
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        pacienteId: a.pacienteId,
        pacienteNome: pacientesPorId.get(a.pacienteId)?.nomeCompleto ?? "Paciente",
        dataHora: a.dataHora,
        valor: a.valor,
      }));

    let resumoPorProfissional: { uid: string; nome: string; faturadoMes: number; atendimentosMes: number }[] = [];
    if (ehConsolidado) {
      const porProfissional = new Map<string, { faturadoMes: number; atendimentosMes: number }>();
      atendimentosDoMes.forEach((a) => {
        const atual = porProfissional.get(a.profissionalId) ?? { faturadoMes: 0, atendimentosMes: 0 };
        atual.faturadoMes += a.valor;
        atual.atendimentosMes += 1;
        porProfissional.set(a.profissionalId, atual);
      });
      resumoPorProfissional = Array.from(porProfissional.entries())
        .map(([uid, dados]) => ({
          uid,
          nome: usuariosPorId.get(uid)?.nome ?? "Profissional",
          ...dados,
        }))
        .sort((a, b) => b.faturadoMes - a.faturadoMes);
    }

    return NextResponse.json({
      totalPacientes: pacientesVisiveis.length,
      atendimentosMes: atendimentosDoMes.length,
      faturadoMes,
      recebidoMes,
      pendenteMes,
      ticketMedio,
      distribuicaoLocal: { clinica: clinicaCount, homeCare: homeCareCount },
      serieFaturamento,
      atendimentosRecentes,
      pendenciasRecentes,
      resumoPorProfissional,
      visaoAtual: ehConsolidado ? "clinica" : "pessoal",
    });
  } catch (erro) {
    return apiErrorResponse(erro, "Não foi possível carregar os dados do dashboard.");
  }
}
