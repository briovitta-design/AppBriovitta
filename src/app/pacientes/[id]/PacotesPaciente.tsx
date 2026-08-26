"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Pacote, SituacaoFinanceiraPacote, StatusPacote, TipoHabitual } from "@/lib/types";
import { formatarData, formatarMoeda } from "@/lib/format";

interface Profissional {
  uid: string;
  nome: string;
  papel: string;
}

const LABEL_STATUS: Record<StatusPacote, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const COR_STATUS: Record<StatusPacote, string> = {
  ativo: "text-success",
  concluido: "text-text-secondary",
  cancelado: "text-red-600",
};
const LABEL_SITUACAO: Record<SituacaoFinanceiraPacote, string> = {
  pago: "Pago",
  pendente: "Pendente",
  parcial: "Parcial",
};
const LABEL_LOCAL: Record<TipoHabitual, string> = { clinica: "Clínica", home_care: "Home Care" };

export function PacotesPaciente({
  pacienteId,
  pacotes,
  podeEditar,
}: {
  pacienteId: string;
  pacotes: Pacote[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [criandoNovo, setCriandoNovo] = useState(false);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-text-main">Pacotes de sessões</h2>
        {podeEditar && !criandoNovo && (
          <button
            onClick={() => setCriandoNovo(true)}
            className="rounded-md bg-support px-3 py-1.5 text-sm font-medium text-support-foreground hover:opacity-90"
          >
            + Novo pacote
          </button>
        )}
      </div>

      {criandoNovo && (
        <NovoPacoteForm
          pacienteId={pacienteId}
          onFechar={() => setCriandoNovo(false)}
          onCriado={() => {
            setCriandoNovo(false);
            router.refresh();
          }}
        />
      )}

      {pacotes.length === 0 && !criandoNovo ? (
        <p className="mt-2 text-sm text-text-secondary">Nenhum pacote cadastrado ainda.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {pacotes.map((pacote) => (
            <PacoteCard
              key={pacote.id}
              pacienteId={pacienteId}
              pacote={pacote}
              podeEditar={podeEditar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PacoteCard({
  pacienteId,
  pacote,
  podeEditar,
}: {
  pacienteId: string;
  pacote: Pacote;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [ajustando, setAjustando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const sessoesRestantes = pacote.quantidadeSessoes - pacote.sessoesRealizadas;

  async function mudarStatus(novoStatus: StatusPacote) {
    setErro(null);
    setProcessando(true);
    try {
      const resp = await fetch(`/api/pacientes/${pacienteId}/pacotes/${pacote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao atualizar pacote.");
      }
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar pacote.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <li className="rounded-lg bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-main">
          {pacote.sessoesRealizadas} de {pacote.quantidadeSessoes} realizadas · {sessoesRestantes} restante
          {sessoesRestantes === 1 ? "" : "s"}
        </p>
        <span className={`text-xs font-medium ${COR_STATUS[pacote.status]}`}>
          {LABEL_STATUS[pacote.status]}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span>{formatarMoeda(pacote.valorTotal)}</span>
        <span>{LABEL_SITUACAO[pacote.situacaoFinanceira]}</span>
        {pacote.situacaoFinanceira === "parcial" && (
          <span>
            Recebido {formatarMoeda(pacote.valorRecebido)} · Pendente{" "}
            {formatarMoeda(pacote.valorTotal - pacote.valorRecebido)}
          </span>
        )}
        <span>{LABEL_LOCAL[pacote.tipoHabitual]}</span>
        <span>Início em {formatarData(pacote.dataInicio)}</span>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      {podeEditar && pacote.status === "ativo" && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-support-soft pt-3 text-sm">
          <button
            onClick={() => setAjustando((v) => !v)}
            className="text-primary hover:underline"
          >
            {ajustando ? "Fechar ajuste" : "Ajustar quantidade/valor"}
          </button>
          <button
            disabled={processando}
            onClick={() => mudarStatus("concluido")}
            className="text-text-secondary hover:underline disabled:opacity-60"
          >
            Marcar como concluído
          </button>
          <button
            disabled={processando}
            onClick={() => mudarStatus("cancelado")}
            className="text-red-600 hover:underline disabled:opacity-60"
          >
            Cancelar pacote
          </button>
        </div>
      )}

      {ajustando && (
        <AjustarPacoteForm
          pacienteId={pacienteId}
          pacote={pacote}
          onFechar={() => setAjustando(false)}
          onSalvo={() => {
            setAjustando(false);
            router.refresh();
          }}
        />
      )}
    </li>
  );
}

function AjustarPacoteForm({
  pacienteId,
  pacote,
  onFechar,
  onSalvo,
}: {
  pacienteId: string;
  pacote: Pacote;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [quantidadeSessoes, setQuantidadeSessoes] = useState(String(pacote.quantidadeSessoes));
  const [valorTotal, setValorTotal] = useState(String(pacote.valorTotal));
  const [situacaoFinanceira, setSituacaoFinanceira] = useState<SituacaoFinanceiraPacote>(
    pacote.situacaoFinanceira
  );
  const [valorRecebido, setValorRecebido] = useState(String(pacote.valorRecebido));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const resp = await fetch(`/api/pacientes/${pacienteId}/pacotes/${pacote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantidadeSessoes: Number(quantidadeSessoes),
          valorTotal: Number(valorTotal),
          situacaoFinanceira,
          valorRecebido: situacaoFinanceira === "parcial" ? Number(valorRecebido) : undefined,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao ajustar pacote.");
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao ajustar pacote.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-bg-secondary p-3 text-sm"
    >
      <div>
        <label className="mb-1 block text-text-secondary">Quantidade de sessões</label>
        <input
          type="number"
          min={pacote.sessoesRealizadas}
          required
          value={quantidadeSessoes}
          onChange={(e) => setQuantidadeSessoes(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-2 py-1.5 text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-text-secondary">Valor total (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={valorTotal}
          onChange={(e) => setValorTotal(e.target.value)}
          className="w-full rounded-md border border-disabled bg-card px-2 py-1.5 text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-text-secondary">Situação financeira</label>
        <select
          value={situacaoFinanceira}
          onChange={(e) => setSituacaoFinanceira(e.target.value as SituacaoFinanceiraPacote)}
          className="w-full rounded-md border border-disabled bg-card px-2 py-1.5 text-text-main"
        >
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="parcial">Parcial</option>
        </select>
      </div>
      {situacaoFinanceira === "parcial" && (
        <div>
          <label className="mb-1 block text-text-secondary">Valor recebido (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorRecebido}
            onChange={(e) => setValorRecebido(e.target.value)}
            className="w-full rounded-md border border-disabled bg-card px-2 py-1.5 text-text-main"
          />
        </div>
      )}

      {erro && <p className="sm:col-span-2 text-red-600">{erro}</p>}

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar ajuste"}
        </button>
        <button type="button" onClick={onFechar} className="px-3 py-1.5 text-text-secondary hover:underline">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function NovoPacoteForm({
  pacienteId,
  onFechar,
  onCriado,
}: {
  pacienteId: string;
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [quantidadeSessoes, setQuantidadeSessoes] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [profissionalResponsavelId, setProfissionalResponsavelId] = useState("");
  const [tipoHabitual, setTipoHabitual] = useState<TipoHabitual>("clinica");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [situacaoFinanceira, setSituacaoFinanceira] = useState<SituacaoFinanceiraPacote>("pendente");
  const [valorRecebido, setValorRecebido] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => setProfissionais(data.profissionais ?? []));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resp = await fetch(`/api/pacientes/${pacienteId}/pacotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantidadeSessoes: Number(quantidadeSessoes),
          valorTotal: Number(valorTotal),
          profissionalResponsavelId,
          tipoHabitual,
          dataInicio: new Date(dataInicio).toISOString(),
          situacaoFinanceira,
          valorRecebido: situacaoFinanceira === "parcial" ? Number(valorRecebido) : undefined,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao criar pacote.");
      }
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar pacote.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-card p-6 shadow-sm"
    >
      <h3 className="sm:col-span-2 text-sm font-medium text-text-main">Novo pacote de sessões</h3>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Quantidade de sessões *</label>
        <input
          type="number"
          min="1"
          required
          value={quantidadeSessoes}
          onChange={(e) => setQuantidadeSessoes(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Valor total (R$) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={valorTotal}
          onChange={(e) => setValorTotal(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
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
        <label className="mb-1 block text-sm text-text-secondary">Tipo habitual *</label>
        <select
          value={tipoHabitual}
          onChange={(e) => setTipoHabitual(e.target.value as TipoHabitual)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        >
          <option value="clinica">Clínica</option>
          <option value="home_care">Home Care</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Data de início *</label>
        <input
          type="date"
          required
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Situação financeira *</label>
        <select
          value={situacaoFinanceira}
          onChange={(e) => setSituacaoFinanceira(e.target.value as SituacaoFinanceiraPacote)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        >
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="parcial">Parcial</option>
        </select>
      </div>

      {situacaoFinanceira === "parcial" && (
        <div>
          <label className="mb-1 block text-sm text-text-secondary">Valor recebido (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorRecebido}
            onChange={(e) => setValorRecebido(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          />
        </div>
      )}

      {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? "Salvando..." : "Criar pacote"}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded-md px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
