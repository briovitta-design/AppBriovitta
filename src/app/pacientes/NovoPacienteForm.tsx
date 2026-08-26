"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Usuario } from "@/lib/types";

interface Profissional {
  uid: string;
  nome: string;
  papel: string;
}

export function NovoPacienteForm({
  usuarioAtual,
  onCriado,
}: {
  usuarioAtual: Usuario;
  onCriado?: () => void;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tipoHabitual, setTipoHabitual] = useState<"clinica" | "home_care" | "">("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  // Se quem está cadastrando já é um profissional, o formulário já vem
  // pré-selecionado nele mesmo (o caso mais comum); admin escolhe do zero.
  const [profissionalResponsavelId, setProfissionalResponsavelId] = useState(
    usuarioAtual.papel !== "admin" ? usuarioAtual.uid : ""
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => setProfissionais(data.profissionais ?? []));
  }, [aberto]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const resp = await fetch("/api/pacientes", {
        method: "POST",
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
          profissionalResponsavelId,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao cadastrar paciente.");
      }

      const { paciente } = await resp.json();
      setAberto(false);
      onCriado?.();
      router.push(`/pacientes/${paciente.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar paciente.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mb-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        + Novo paciente
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-card p-6 shadow-sm"
    >
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Nome completo *</label>
        <input
          required
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Data de nascimento *</label>
        <input
          type="date"
          required
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Telefone</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Diagnóstico *</label>
        <textarea
          required
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          rows={2}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Profissional responsável *</label>
        <select
          required
          value={profissionalResponsavelId}
          onChange={(e) => setProfissionalResponsavelId(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
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
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Tipo habitual</label>
        <select
          value={tipoHabitual}
          onChange={(e) => setTipoHabitual(e.target.value as any)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
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
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Observações clínicas</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          rows={2}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-text-secondary">Observações internas/operacionais</label>
        <textarea
          value={observacoesInternas}
          onChange={(e) => setObservacoesInternas(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          rows={2}
        />
      </div>

      {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? "Salvando..." : "Salvar paciente"}
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
