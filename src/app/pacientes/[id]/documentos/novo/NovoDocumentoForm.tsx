"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LABEL_TIPO_DOCUMENTO, TIPOS_DOCUMENTO } from "@/lib/templates";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { textoSimplesParaHtml, htmlParaTextoSimples } from "@/lib/texto";
import type { TipoDocumento } from "@/lib/types";
import type { ModoGeracaoIA } from "@/lib/ia/gerarRascunho";

const BOTOES_MODO: { modo: ModoGeracaoIA; label: string }[] = [
  { modo: "completo", label: "✨ Gerar documento completo" },
  { modo: "melhorar", label: "✨ Melhorar texto existente" },
  { modo: "resumir", label: "✨ Resumir evolução do período" },
];

export function NovoDocumentoForm({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoDocumento>("laudo_fisioterapeutico");
  const [instrucaoExtra, setInstrucaoExtra] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [geradoPorIA, setGeradoPorIA] = useState(false);
  const [modoGerando, setModoGerando] = useState<ModoGeracaoIA | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const conteudoTextoPlano = htmlParaTextoSimples(conteudo);

  async function gerarComIA(modo: ModoGeracaoIA) {
    setErro(null);
    setModoGerando(modo);
    try {
      const resp = await fetch("/api/ia/gerar-rascunho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          tipo,
          modo,
          instrucaoExtra: instrucaoExtra || undefined,
          // A IA trabalha em texto simples — o editor guarda HTML, então
          // convertemos antes de mandar (ela lida melhor sem tags soltas).
          textoAtual: modo === "melhorar" ? conteudoTextoPlano : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar com IA.");
      setConteudo(textoSimplesParaHtml(data.texto));
      setGeradoPorIA(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar com IA.");
    } finally {
      setModoGerando(null);
    }
  }

  async function salvarRascunho() {
    setErro(null);
    setSalvando(true);
    try {
      const resp = await fetch(`/api/pacientes/${pacienteId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, conteudo, geradoPorIA }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao salvar documento.");
      router.push(`/pacientes/${pacienteId}/documentos/${data.documento.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar documento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl bg-card p-6 shadow-sm">
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-text-secondary">Tipo de documento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumento)}
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          >
            {TIPOS_DOCUMENTO.map((valor) => (
              <option key={valor} value={valor}>
                {LABEL_TIPO_DOCUMENTO[valor]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-secondary">
            Instrução adicional (opcional)
          </label>
          <input
            value={instrucaoExtra}
            onChange={(e) => setInstrucaoExtra(e.target.value)}
            placeholder="ex: focar em melhora de amplitude de movimento"
            className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {BOTOES_MODO.map(({ modo, label }) => (
          <button
            key={modo}
            onClick={() => gerarComIA(modo)}
            disabled={!!modoGerando || (modo === "melhorar" && !conteudoTextoPlano)}
            title={
              modo === "melhorar" && !conteudoTextoPlano
                ? "Escreva ou gere algo primeiro para poder melhorar"
                : undefined
            }
            className="rounded-md bg-support px-4 py-2 text-sm font-medium text-support-foreground hover:opacity-90 disabled:opacity-60"
          >
            {modoGerando === modo ? "Gerando..." : label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm text-text-secondary">
        Conteúdo do documento (revise sempre antes de aprovar)
      </label>
      <RichTextEditor
        value={conteudo}
        onChange={(html) => {
          setConteudo(html);
          setGeradoPorIA(false);
        }}
        placeholder="Escreva manualmente ou gere com IA acima..."
      />

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={salvarRascunho}
          disabled={salvando || !conteudoTextoPlano}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar rascunho"}
        </button>
      </div>
    </div>
  );
}
