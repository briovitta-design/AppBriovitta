"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FormaPagamento, LocalAtendimento, Pacote, TipoEvolucao } from "@/lib/types";

export function NovoAtendimentoForm({
  pacienteId,
  enderecoPaciente,
  pacoteAtivo,
}: {
  pacienteId: string;
  enderecoPaciente?: string;
  /** Pacote com status "ativo" e sessões restantes, se houver (seção 1.2). */
  pacoteAtivo?: Pacote | null;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [dataHora, setDataHora] = useState(() => new Date().toISOString().slice(0, 16));
  const [local, setLocal] = useState<LocalAtendimento>(pacoteAtivo?.tipoHabitual ?? "clinica");
  const [enderecoAtendimento, setEnderecoAtendimento] = useState(enderecoPaciente ?? "");
  // "Permitir atendimento avulso mesmo quando existir pacote ativo" — vem
  // marcado por padrão quando há pacote, mas o profissional pode desmarcar.
  const [usarPacote, setUsarPacote] = useState(Boolean(pacoteAtivo));
  const [valor, setValor] = useState("");
  const [statusPagamento, setStatusPagamento] = useState<"pago" | "pendente">("pendente");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");

  const [incluirEvolucao, setIncluirEvolucao] = useState(true);
  const [tipoEvolucao, setTipoEvolucao] = useState<TipoEvolucao>("rapida");
  const [textoRapido, setTextoRapido] = useState("");
  const [queixaEstadoAtual, setQueixaEstadoAtual] = useState("");
  const [condutaRealizada, setCondutaRealizada] = useState("");
  const [respostaObservada, setRespostaObservada] = useState("");
  const [orientacoesPlano, setOrientacoesPlano] = useState("");
  const [observacoesAdicionais, setObservacoesAdicionais] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const evolucaoPayload = incluirEvolucao
        ? tipoEvolucao === "rapida"
          ? { tipo: "rapida", textoRapido }
          : {
              tipo: "completa",
              queixaEstadoAtual,
              condutaRealizada,
              respostaObservada,
              orientacoesPlano,
              observacoesAdicionais,
            }
        : undefined;

      const resp = await fetch(`/api/pacientes/${pacienteId}/atendimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataHora: new Date(dataHora).toISOString(),
          local,
          enderecoAtendimento: local === "home_care" ? enderecoAtendimento : undefined,
          pacoteId: usarPacote && pacoteAtivo ? pacoteAtivo.id : undefined,
          valor: usarPacote && pacoteAtivo ? undefined : Number(valor),
          statusPagamento,
          formaPagamento: statusPagamento === "pago" ? formaPagamento : undefined,
          evolucao: evolucaoPayload,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao registrar atendimento.");
      }

      setAberto(false);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar atendimento.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Novo atendimento
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-card p-6 shadow-sm"
    >
      <h3 className="sm:col-span-2 text-sm font-medium text-text-main">Novo atendimento</h3>

      {pacoteAtivo && (
        <label className="sm:col-span-2 flex items-center gap-2 rounded-md bg-bg-secondary px-3 py-2 text-sm text-text-main">
          <input
            type="checkbox"
            checked={usarPacote}
            onChange={(e) => setUsarPacote(e.target.checked)}
          />
          Usar sessão do pacote ({pacoteAtivo.sessoesRealizadas} de {pacoteAtivo.quantidadeSessoes}{" "}
          realizadas · {pacoteAtivo.quantidadeSessoes - pacoteAtivo.sessoesRealizadas} restante
          {pacoteAtivo.quantidadeSessoes - pacoteAtivo.sessoesRealizadas === 1 ? "" : "s"})
        </label>
      )}

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Data e hora *</label>
        <input
          type="datetime-local"
          required
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Local *</label>
        <select
          value={local}
          onChange={(e) => setLocal(e.target.value as LocalAtendimento)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        >
          <option value="clinica">Clínica</option>
          <option value="home_care">Home Care</option>
        </select>
      </div>

      {local === "home_care" && (
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-text-secondary">
            Endereço deste atendimento
          </label>
          <input
            value={enderecoAtendimento}
            onChange={(e) => setEnderecoAtendimento(e.target.value)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          />
        </div>
      )}

      {!usarPacote && (
        <>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Situação *</label>
            <select
              value={statusPagamento}
              onChange={(e) => setStatusPagamento(e.target.value as "pago" | "pendente")}
              className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>

          {statusPagamento === "pago" && (
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Forma de pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
              >
                <option value="pix">Pix</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          )}
        </>
      )}

      <div className="sm:col-span-2 border-t border-support-soft pt-4">
        <label className="mb-2 flex items-center gap-2 text-sm text-text-main">
          <input
            type="checkbox"
            checked={incluirEvolucao}
            onChange={(e) => setIncluirEvolucao(e.target.checked)}
          />
          Registrar evolução ao finalizar (recomendado)
        </label>

        {incluirEvolucao && (
          <div className="rounded-lg bg-bg-secondary p-4">
            <div className="mb-3 flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={tipoEvolucao === "rapida"}
                  onChange={() => setTipoEvolucao("rapida")}
                />
                Evolução rápida
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={tipoEvolucao === "completa"}
                  onChange={() => setTipoEvolucao("completa")}
                />
                Evolução completa
              </label>
            </div>

            {tipoEvolucao === "rapida" ? (
              <textarea
                placeholder="Registro livre da sessão..."
                value={textoRapido}
                onChange={(e) => setTextoRapido(e.target.value)}
                className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
                rows={3}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="Queixa / estado atual"
                  value={queixaEstadoAtual}
                  onChange={(e) => setQueixaEstadoAtual(e.target.value)}
                  className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
                  rows={2}
                />
                <textarea
                  placeholder="Conduta realizada"
                  value={condutaRealizada}
                  onChange={(e) => setCondutaRealizada(e.target.value)}
                  className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
                  rows={2}
                />
                <textarea
                  placeholder="Resposta ou evolução observada"
                  value={respostaObservada}
                  onChange={(e) => setRespostaObservada(e.target.value)}
                  className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
                  rows={2}
                />
                <textarea
                  placeholder="Orientações / plano"
                  value={orientacoesPlano}
                  onChange={(e) => setOrientacoesPlano(e.target.value)}
                  className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
                  rows={2}
                />
                <textarea
                  placeholder="Observações adicionais"
                  value={observacoesAdicionais}
                  onChange={(e) => setObservacoesAdicionais(e.target.value)}
                  className="w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
                  rows={2}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {erro && <p className="sm:col-span-2 text-sm text-red-600">{erro}</p>}

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? "Salvando..." : "Finalizar atendimento"}
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
