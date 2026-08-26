"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarDataHora } from "@/lib/format";

export function AssinaturaForm({
  uid,
  temAssinatura,
  urlAtual,
  atualizadoEm,
}: {
  uid: string;
  temAssinatura: boolean;
  urlAtual?: string;
  atualizadoEm?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleEnviar() {
    const arquivo = inputRef.current?.files?.[0];
    if (!arquivo) {
      setErro("Escolha uma imagem primeiro.");
      return;
    }

    setErro(null);
    setSucesso(false);
    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const resp = await fetch(`/api/usuarios/${uid}/assinatura`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao enviar a assinatura.");
      }

      setSucesso(true);
      setArquivoNome(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar a assinatura.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm text-text-secondary">
        {temAssinatura ? (
          <>Assinatura cadastrada{atualizadoEm && ` · atualizada em ${formatarDataHora(atualizadoEm)}`}</>
        ) : (
          "Nenhuma assinatura cadastrada ainda — sem ela, o PDF assinado sai sem a imagem no rodapé."
        )}
      </p>
      <p className="mb-3 text-xs text-text-secondary">
        Use PNG com fundo transparente, se possível. Enviar uma nova imagem substitui a atual.
      </p>

      {temAssinatura && urlAtual && (
        <img
          src={urlAtual}
          alt="Assinatura atual"
          className="mb-3 h-16 rounded border border-disabled bg-white p-2"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setArquivoNome(e.target.files?.[0]?.name ?? null)}
          className="text-sm text-text-main file:mr-3 file:rounded-md file:border-0 file:bg-bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-main hover:file:bg-support-soft"
        />
        <button
          onClick={handleEnviar}
          disabled={enviando || !arquivoNome}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? "Enviando..." : temAssinatura ? "Substituir assinatura" : "Enviar assinatura"}
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="mt-2 text-sm text-success">Assinatura atualizada com sucesso.</p>}
    </div>
  );
}
