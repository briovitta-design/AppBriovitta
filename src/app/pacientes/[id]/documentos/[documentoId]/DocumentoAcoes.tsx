"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { garantirHtml, htmlParaTextoSimples, textoSimplesParaHtml } from "@/lib/texto";
import type { Documento } from "@/lib/types";

const LABEL_STATUS: Record<Documento["status"], string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  assinado: "Assinado",
};

export function DocumentoAcoes({
  documento,
  pacienteId,
  podeAssinar,
}: {
  documento: Documento;
  pacienteId: string;
  podeAssinar: boolean;
}) {
  const router = useRouter();
  // Documentos criados antes do editor rico existir têm conteudo em texto
  // puro — garantirHtml() converte pra parágrafos HTML na primeira vez que
  // abrem aqui, sem precisar de migração manual no banco.
  const [conteudo, setConteudo] = useState(garantirHtml(documento.conteudo));
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function melhorarComIA() {
    setErro(null);
    setProcessando("melhorar-ia");
    try {
      const resp = await fetch("/api/ia/gerar-rascunho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          tipo: documento.tipo,
          modo: "melhorar",
          textoAtual: htmlParaTextoSimples(conteudo),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao melhorar com IA.");
      setConteudo(textoSimplesParaHtml(data.texto));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao melhorar com IA.");
    } finally {
      setProcessando(null);
    }
  }

  async function salvarEdicao() {
    setErro(null);
    setProcessando("salvar");
    try {
      const resp = await fetch(`/api/documentos/${documento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setProcessando(null);
    }
  }

  async function aprovar() {
    setErro(null);
    setProcessando("aprovar");
    try {
      const resp = await fetch(`/api/documentos/${documento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo, status: "aprovado" }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao aprovar.");
    } finally {
      setProcessando(null);
    }
  }

  async function gerarDocx() {
    setErro(null);
    setProcessando("docx");
    try {
      const resp = await fetch(`/api/documentos/${documento.id}/gerar-docx`, { method: "POST" });
      if (!resp.ok) throw new Error((await resp.json()).error);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar o Word.");
    } finally {
      setProcessando(null);
    }
  }

  async function assinar() {
    setErro(null);
    setProcessando("assinar");
    try {
      const resp = await fetch(`/api/documentos/${documento.id}/assinar`, { method: "POST" });
      if (!resp.ok) throw new Error((await resp.json()).error);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao assinar.");
    } finally {
      setProcessando(null);
    }
  }

  async function baixar() {
    setErro(null);
    setProcessando("download");
    try {
      const resp = await fetch(`/api/documentos/${documento.id}/download`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      window.open(data.url, "_blank");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar.");
    } finally {
      setProcessando(null);
    }
  }

  const editavel = documento.status !== "assinado";
  const semConteudo = !htmlParaTextoSimples(conteudo);

  return (
    <div className="rounded-xl bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-support-soft px-3 py-1 text-xs font-medium text-text-main">
          {LABEL_STATUS[documento.status]} · versão {documento.versao}
        </span>
        {documento.geradoPorIA && (
          <span className="text-xs text-text-secondary">Rascunho gerado com IA — revisado</span>
        )}
      </div>

      <RichTextEditor value={conteudo} onChange={setConteudo} editable={editavel} />

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        {documento.status === "rascunho" && (
          <>
            <button
              onClick={melhorarComIA}
              disabled={!!processando || semConteudo}
              className="rounded-md bg-support px-4 py-2 text-sm font-medium text-support-foreground hover:opacity-90 disabled:opacity-60"
            >
              {processando === "melhorar-ia" ? "Melhorando..." : "✨ Melhorar com IA"}
            </button>
            <button
              onClick={salvarEdicao}
              disabled={!!processando}
              className="rounded-md px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
            >
              {processando === "salvar" ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              onClick={aprovar}
              disabled={!!processando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {processando === "aprovar" ? "Aprovando..." : "Aprovar documento"}
            </button>
          </>
        )}

        {documento.status === "aprovado" && (
          <>
            <button
              onClick={gerarDocx}
              disabled={!!processando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {processando === "docx" ? "Gerando Word..." : "Gerar Word"}
            </button>
            {documento.cloudinaryPublicId && podeAssinar && (
              <button
                onClick={assinar}
                disabled={!!processando}
                className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {processando === "assinar" ? "Assinando..." : "Assinar documento"}
              </button>
            )}
          </>
        )}

        {documento.cloudinaryPublicId && (
          <button
            onClick={baixar}
            disabled={!!processando}
            className="rounded-md border border-disabled px-4 py-2 text-sm text-text-main hover:bg-bg-secondary disabled:opacity-60"
          >
            {processando === "download" ? "Gerando link..." : "Baixar Word"}
          </button>
        )}
      </div>
    </div>
  );
}
