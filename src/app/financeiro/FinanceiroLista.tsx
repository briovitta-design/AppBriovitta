"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import type { Atendimento, Paciente } from "@/lib/types";

interface Indicadores {
  faturado: number;
  recebido: number;
  pendente: number;
  quantidade: number;
}

type Periodo = "mes_atual" | "mes_anterior" | "personalizado";

// Formata uma Date local como "YYYY-MM-DD" pro <input type="date">, sem passar
// por toISOString (que converte pra UTC e pode voltar um dia, dependendo do fuso).
function paraInputDate(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
    data.getDate()
  ).padStart(2, "0")}`;
}

function limitesDoMes(offsetMeses: number): { de: string; ate: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses + 1, 0);
  return { de: paraInputDate(inicio), ate: paraInputDate(fim) };
}

export function FinanceiroLista() {
  const [status, setStatus] = useState<"" | "pago" | "pendente">("pendente");
  const [local, setLocal] = useState<"" | "clinica" | "home_care">("");
  const [somenteMeus, setSomenteMeus] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const [dataDe, setDataDe] = useState(() => limitesDoMes(0).de);
  const [dataAte, setDataAte] = useState(() => limitesDoMes(0).ate);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [nomesPacientes, setNomesPacientes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  // Trocar entre "mês atual"/"mês anterior" já ajusta as datas de dentro;
  // "personalizado" mantém o que a pessoa escolher nos campos de data.
  useEffect(() => {
    if (periodo === "mes_atual") {
      const { de, ate } = limitesDoMes(0);
      setDataDe(de);
      setDataAte(ate);
    } else if (periodo === "mes_anterior") {
      const { de, ate } = limitesDoMes(-1);
      setDataDe(de);
      setDataAte(ate);
    }
  }, [periodo]);

  const { de, ate } = useMemo(() => {
    // dataAte é a data local (00:00); some 1 dia e usa "<" implícito via
    // string ISO pra incluir o dia inteiro, já que dataHora é datetime completo.
    const fimDoDia = new Date(`${dataAte}T00:00:00`);
    fimDoDia.setDate(fimDoDia.getDate() + 1);
    return {
      de: new Date(`${dataDe}T00:00:00`).toISOString(),
      ate: fimDoDia.toISOString(),
    };
  }, [dataDe, dataAte]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (local) params.set("local", local);
    if (somenteMeus) params.set("somenteMeus", "true");
    if (dataDe) params.set("de", de);
    if (dataAte) params.set("ate", ate);

    setCarregando(true);
    fetch(`/api/financeiro?${params.toString()}`)
      .then((r) => r.json())
      .then(async (data) => {
        setAtendimentos(data.atendimentos ?? []);
        setIndicadores(data.indicadores ?? null);

        const idsUnicos = Array.from(
          new Set((data.atendimentos ?? []).map((a: Atendimento) => a.pacienteId))
        );
        const pacientesResp = await fetch("/api/pacientes");
        const pacientesData = await pacientesResp.json();
        const mapa: Record<string, string> = {};
        (pacientesData.pacientes ?? []).forEach((p: Paciente) => {
          if (idsUnicos.includes(p.id)) mapa[p.id] = p.nomeCompleto;
        });
        setNomesPacientes(mapa);
      })
      .finally(() => setCarregando(false));
  }, [status, local, somenteMeus, de, ate]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          className="rounded-md border border-disabled bg-card px-2 py-1 text-sm text-text-main"
        >
          <option value="mes_atual">Mês atual</option>
          <option value="mes_anterior">Mês anterior</option>
          <option value="personalizado">Personalizado</option>
        </select>

        {periodo === "personalizado" && (
          <>
            <input
              type="date"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
              className="rounded-md border border-disabled bg-card px-2 py-1 text-sm text-text-main"
            />
            <span className="text-sm text-text-secondary">até</span>
            <input
              type="date"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
              className="rounded-md border border-disabled bg-card px-2 py-1 text-sm text-text-main"
            />
          </>
        )}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-md border border-disabled bg-card px-2 py-1 text-sm text-text-main"
        >
          <option value="">Todas as situações</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>

        <select
          value={local}
          onChange={(e) => setLocal(e.target.value as any)}
          className="rounded-md border border-disabled bg-card px-2 py-1 text-sm text-text-main"
        >
          <option value="">Clínica e Home Care</option>
          <option value="clinica">Somente Clínica</option>
          <option value="home_care">Somente Home Care</option>
        </select>

        <label className="flex items-center gap-1 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={somenteMeus}
            onChange={(e) => setSomenteMeus(e.target.checked)}
          />
          Só meus atendimentos
        </label>
      </div>

      {indicadores && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Indicador label="Faturado" valor={formatarMoeda(indicadores.faturado)} />
          <Indicador label="Recebido" valor={formatarMoeda(indicadores.recebido)} />
          <Indicador label="Pendente" valor={formatarMoeda(indicadores.pendente)} destaque />
          <Indicador label="Atendimentos" valor={String(indicadores.quantidade)} />
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : atendimentos.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum atendimento encontrado.</p>
      ) : (
        <ul className="divide-y divide-support-soft rounded-xl bg-card shadow-sm">
          {atendimentos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
              <div>
                <Link
                  href={`/pacientes/${a.pacienteId}`}
                  className="text-sm font-medium text-text-main hover:text-primary"
                >
                  {nomesPacientes[a.pacienteId] ?? "Paciente"}
                </Link>
                <p className="text-xs text-text-secondary">
                  {formatarDataHora(a.dataHora)} · {a.local === "home_care" ? "Home Care" : "Clínica"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-main">{formatarMoeda(a.valor)}</p>
                <p
                  className={
                    a.statusPagamento === "pago"
                      ? "text-xs font-medium text-success"
                      : "text-xs font-medium text-red-600"
                  }
                >
                  {a.statusPagamento === "pago" ? `Pago · ${a.formaPagamento}` : "Pendente"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Indicador({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card p-4 text-center shadow-sm">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`text-lg font-semibold ${destaque ? "text-red-600" : "text-text-main"}`}>
        {valor}
      </p>
    </div>
  );
}
