"use client";

import { useState } from "react";

export function BotaoBackup() {
  const [status, setStatus] = useState<"idle" | "processando" | "ok" | "erro">("idle");

  async function gerar() {
    setStatus("processando");
    try {
      const resp = await fetch("/api/admin/backup", { method: "POST" });
      setStatus(resp.ok ? "ok" : "erro");
    } catch {
      setStatus("erro");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={gerar}
        disabled={status === "processando"}
        className="rounded-md border border-disabled px-4 py-2 text-sm text-text-main hover:bg-bg-secondary disabled:opacity-60"
      >
        {status === "processando" ? "Gerando backup..." : "Gerar backup agora"}
      </button>
      {status === "ok" && <span className="text-sm text-success">Backup salvo.</span>}
      {status === "erro" && <span className="text-sm text-red-600">Erro ao gerar backup.</span>}
    </div>
  );
}
