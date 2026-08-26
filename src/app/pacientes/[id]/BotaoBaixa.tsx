"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormaPagamento } from "@/lib/types";

export function BotaoBaixa({
  pacienteId,
  atendimentoId,
}: {
  pacienteId: string;
  atendimentoId: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    try {
      await fetch(`/api/pacientes/${pacienteId}/atendimentos/${atendimentoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusPagamento: "pago", formaPagamento: forma }),
      });
      setAberto(false);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-primary hover:underline"
      >
        Dar baixa
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={forma}
        onChange={(e) => setForma(e.target.value as FormaPagamento)}
        className="rounded border border-disabled bg-card px-1 py-0.5 text-xs text-text-main"
      >
        <option value="pix">Pix</option>
        <option value="cartao">Cartão</option>
        <option value="dinheiro">Dinheiro</option>
        <option value="outro">Outro</option>
      </select>
      <button
        onClick={confirmar}
        disabled={enviando}
        className="text-xs font-medium text-success hover:underline"
      >
        Confirmar
      </button>
      <button
        onClick={() => setAberto(false)}
        className="text-xs text-text-secondary hover:underline"
      >
        Cancelar
      </button>
    </div>
  );
}
