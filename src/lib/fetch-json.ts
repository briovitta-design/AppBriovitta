"use client";

/**
 * fetch() que nunca quebra ao tentar ler JSON de uma resposta vazia.
 * Se o servidor responder com erro sem corpo (ex.: uma exceção que escapou
 * de alguma rota), isso vira uma mensagem de erro legível — não um crash.
 */
export async function fetchJson<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(input, init);
  const texto = await resp.text();

  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      // resposta não era JSON (ex.: página de erro em HTML) — segue com dados = null
    }
  }

  if (!resp.ok) {
    const mensagem =
      (dados && typeof dados === "object" && "error" in dados && typeof (dados as any).error === "string"
        ? (dados as any).error
        : null) ?? "Ocorreu um erro inesperado. Tente novamente em instantes.";
    throw new Error(mensagem);
  }

  return dados as T;
}
