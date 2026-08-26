"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Paciente, TipoHabitual } from "@/lib/types";

export function EditarPacienteForm({ paciente }: { paciente: Paciente }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState(paciente.nomeCompleto);
  const [dataNascimento, setDataNascimento] = useState(paciente.dataNascimento);
  const [telefone, setTelefone] = useState(paciente.telefone ?? "");
  const [diagnostico, setDiagnostico] = useState(paciente.diagnostico);
  const [tipoHabitual, setTipoHabitual] = useState<TipoHabitual | "">(paciente.tipoHabitual ?? "");
  const [endereco, setEndereco] = useState(paciente.endereco ?? "");
  const [observacoes, setObservacoes] = useState(paciente.observacoes ?? "");
  const [observacoesInternas, setObservacoesInternas] = useState(paciente.observacoesInternas ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const resp = await fetch(`/api/pacientes/${paciente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCompleto,
          dataNascimento,
          telefone: telefone || undefined,
          diagnostico,
          tipoHabitual: tipoHabitual || undefined,
          endereco: endereco || undefined,
          observacoes: observacoes || undefined,
          observacoesInternas: observacoesInternas || undefined,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao salvar alterações.");
      }
      setAberto(false);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-sm text-primary hover:underline"
      >
        Editar paciente
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-bg-secondary p-4"
    >
      <h3 className="sm:col-span-2 text-sm font-medium text-text-main">Editar paciente</h3>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Nome completo *</label>
        <input
          required
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Data de nascimento *</label>
        <input
          type="date"
          required
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Telefone</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Diagnóstico *</label>
        <textarea
          required
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
          rows={2}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Atendimento habitual</label>
        <select
          value={tipoHabitual}
          onChange={(e) => setTipoHabitual(e.target.value as TipoHabitual | "")}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
        >
          <option value="">Não definido</option>
          <option value="clinica">Clínica</option>
          <option value="home_care">Home Care</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">
          Endereço {tipoHabitual === "home_care" && "*"}
        </label>
        <input
          required={tipoHabitual === "home_care"}
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Observações clínicas</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
          rows={2}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Observações internas/operacionais</label>
        <textarea
          value={observacoesInternas}
          onChange={(e) => setObservacoesInternas(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
          rows={2}
        />
      </div>

      {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
