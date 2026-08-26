"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Profissional {
  uid: string;
  nome: string;
  papel: string;
}

export function ResponsavelPaciente({
  pacienteId,
  responsavelId,
  responsavelNome,
  podeEditar,
}: {
  pacienteId: string;
  responsavelId?: string;
  responsavelNome: string | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selecionado, setSelecionado] = useState(responsavelId ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!editando) return;
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => setProfissionais(data.profissionais ?? []));
  }, [editando]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const resp = await fetch(`/api/pacientes/${pacienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profissionalResponsavelId: selecionado }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao atualizar responsável.");
      }
      setEditando(false);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar responsável.");
    } finally {
      setSalvando(false);
    }
  }

  if (!podeEditar) {
    return (
      <p className="text-sm text-text-secondary">
        Responsável: <span className="text-text-main">{responsavelNome ?? "Não definido"}</span>
      </p>
    );
  }

  if (!editando) {
    return (
      <p className="text-sm text-text-secondary">
        Responsável: <span className="text-text-main">{responsavelNome ?? "Não definido"}</span>{" "}
        <button onClick={() => setEditando(true)} className="text-primary hover:underline">
          alterar
        </button>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={selecionado}
        onChange={(e) => setSelecionado(e.target.value)}
        className="rounded-md border border-disabled bg-bg px-2 py-1 text-text-main"
      >
        <option value="" disabled>
          Selecione...
        </option>
        {profissionais.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.nome}
          </option>
        ))}
      </select>
      <button
        onClick={salvar}
        disabled={salvando || !selecionado}
        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>
      <button
        onClick={() => setEditando(false)}
        className="text-xs text-text-secondary hover:underline"
      >
        Cancelar
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
