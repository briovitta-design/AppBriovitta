"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarDataHora } from "@/lib/format";
import type { Evolucao } from "@/lib/types";

const LABEL_TIPO: Record<string, string> = { completa: "Evolução completa", rapida: "Evolução rápida" };

export function EvolucaoAcoes({
  pacienteId,
  evolucao,
  podeEditar,
}: {
  pacienteId: string;
  evolucao: Evolucao;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [textoRapido, setTextoRapido] = useState(evolucao.textoRapido ?? "");
  const [queixaEstadoAtual, setQueixaEstadoAtual] = useState(evolucao.queixaEstadoAtual ?? "");
  const [condutaRealizada, setCondutaRealizada] = useState(evolucao.condutaRealizada ?? "");
  const [respostaObservada, setRespostaObservada] = useState(evolucao.respostaObservada ?? "");
  const [orientacoesPlano, setOrientacoesPlano] = useState(evolucao.orientacoesPlano ?? "");
  const [observacoesAdicionais, setObservacoesAdicionais] = useState(evolucao.observacoesAdicionais ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const payload =
        evolucao.tipo === "rapida"
          ? { textoRapido }
          : { queixaEstadoAtual, condutaRealizada, respostaObservada, orientacoesPlano, observacoesAdicionais };

      const resp = await fetch(`/api/pacientes/${pacienteId}/evolucoes/${evolucao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao atualizar evolução.");
      }
      setEditando(false);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar evolução.");
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <li className="rounded-lg bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-main">{LABEL_TIPO[evolucao.tipo]}</p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-text-secondary">{formatarDataHora(evolucao.dataHora)}</p>
            {podeEditar && (
              <button
                onClick={() => setEditando(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Editar
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {evolucao.tipo === "rapida" ? evolucao.textoRapido : evolucao.queixaEstadoAtual}
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-lg bg-card p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium text-text-main">Editar {LABEL_TIPO[evolucao.tipo].toLowerCase()}</p>
      {evolucao.tipo === "rapida" ? (
        <textarea
          value={textoRapido}
          onChange={(e) => setTextoRapido(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          rows={3}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            placeholder="Queixa / estado atual"
            value={queixaEstadoAtual}
            onChange={(e) => setQueixaEstadoAtual(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            rows={2}
          />
          <textarea
            placeholder="Conduta realizada"
            value={condutaRealizada}
            onChange={(e) => setCondutaRealizada(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            rows={2}
          />
          <textarea
            placeholder="Resposta ou evolução observada"
            value={respostaObservada}
            onChange={(e) => setRespostaObservada(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            rows={2}
          />
          <textarea
            placeholder="Orientações / plano"
            value={orientacoesPlano}
            onChange={(e) => setOrientacoesPlano(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            rows={2}
          />
          <textarea
            placeholder="Observações adicionais"
            value={observacoesAdicionais}
            onChange={(e) => setObservacoesAdicionais(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            rows={2}
          />
        </div>
      )}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3 flex gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={() => setEditando(false)}
          className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </li>
  );
}
