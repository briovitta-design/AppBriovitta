"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarDataHora } from "@/lib/format";

export function TimbradoForm({
  uid,
  temTimbrado,
  urlAtual,
  atualizadoEm,
}: {
  uid: string;
  temTimbrado: boolean;
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
      setErro("Escolha um arquivo primeiro.");
      return;
    }

    setErro(null);
    setSucesso(false);
    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const resp = await fetch(`/api/usuarios/${uid}/timbrado`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Erro ao enviar o timbrado.");
      }

      setSucesso(true);
      setArquivoNome(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar o timbrado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm text-text-secondary">
        {temTimbrado ? (
          <>
            Timbrado cadastrado{atualizadoEm && ` · atualizado em ${formatarDataHora(atualizadoEm)}`}
          </>
        ) : (
          "Nenhum timbrado cadastrado ainda — os documentos gerados por PDF precisam de um."
        )}
      </p>
      <p className="mb-3 text-xs text-text-secondary">
        Envie a página inteira em PNG ou JPG (tamanho A4) — logo, cores e rodapé de contato
        inclusos. Ela é usada como fundo de cada página do PDF. Enviar um novo arquivo substitui o
        timbrado atual.
      </p>

      {temTimbrado && urlAtual && (
        <img
          src={urlAtual}
          alt="Timbrado atual"
          className="mb-3 h-40 rounded border border-disabled bg-white object-contain p-1"
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
          {enviando ? "Enviando..." : temTimbrado ? "Substituir timbrado" : "Enviar timbrado"}
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="mt-2 text-sm text-success">Timbrado atualizado com sucesso.</p>}
    </div>
  );
}
