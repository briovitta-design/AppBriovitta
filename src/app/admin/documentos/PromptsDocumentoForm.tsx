"use client";

import { useEffect, useState } from "react";
import { LABEL_TIPO_DOCUMENTO, TIPOS_DOCUMENTO } from "@/lib/templates";
import type { ConfiguracaoDocumento, TipoDocumento } from "@/lib/types";

export function PromptsDocumentoForm() {
  const [tipoAtivo, setTipoAtivo] = useState<TipoDocumento>(TIPOS_DOCUMENTO[0]);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    fetch("/api/admin/documentos")
      .then((r) => r.json())
      .then((data) => {
        const mapa: Record<string, string> = {};
        (data.configuracoes ?? []).forEach((c: ConfiguracaoDocumento) => {
          mapa[c.tipo] = c.promptIA;
        });
        setPrompts(mapa);
      })
      .finally(() => setCarregando(false));
  }, []);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      const resp = await fetch(`/api/admin/documentos/${tipoAtivo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptIA: prompts[tipoAtivo] ?? "" }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      setSucesso(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-text-secondary">Carregando...</p>;
  }

  return (
    <div className="rounded-xl bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2">
        {TIPOS_DOCUMENTO.map((tipo) => (
          <button
            key={tipo}
            onClick={() => {
              setTipoAtivo(tipo);
              setSucesso(false);
              setErro(null);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tipoAtivo === tipo
                ? "bg-primary text-white"
                : "bg-bg-secondary text-text-secondary hover:text-text-main"
            }`}
          >
            {LABEL_TIPO_DOCUMENTO[tipo]}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm text-text-secondary">
        Instruções de IA para "{LABEL_TIPO_DOCUMENTO[tipoAtivo]}"
      </label>
      <textarea
        value={prompts[tipoAtivo] ?? ""}
        onChange={(e) => setPrompts((p) => ({ ...p, [tipoAtivo]: e.target.value }))}
        rows={22}
        className="w-full rounded-md border border-disabled bg-bg px-3 py-2 font-mono text-xs text-text-main"
      />

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="mt-2 text-sm text-success">Instruções salvas.</p>}

      <button
        onClick={salvar}
        disabled={salvando}
        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar instruções"}
      </button>
    </div>
  );
}
