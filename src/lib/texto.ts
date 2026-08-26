/**
 * Converte texto puro (ex.: saída da IA, que responde em texto simples,
 * ou documentos antigos salvos antes do editor rico existir) em HTML
 * básico de parágrafos — pro editor/PDF, que agora trabalham em HTML.
 */
export function textoSimplesParaHtml(texto: string): string {
  const escapar = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return texto
    .split(/\n\s*\n/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean)
    .map((paragrafo) => `<p>${escapar(paragrafo).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Heurística simples: se já tem uma tag HTML, assume que já é HTML
 *  (vindo do editor rico); senão trata como texto puro (documento
 *  antigo, ou saída direta da IA ainda não inserida no editor). */
export function pareceHtml(conteudo: string): boolean {
  return /<[a-z][\s\S]*>/i.test(conteudo);
}

export function garantirHtml(conteudo: string): string {
  return pareceHtml(conteudo) ? conteudo : textoSimplesParaHtml(conteudo);
}

/** Direção inversa — usada antes de mandar o conteúdo pra IA "melhorar":
 *  ela trabalha melhor com texto simples do que com tags HTML soltas. */
export function htmlParaTextoSimples(html: string): string {
  return html
    .replace(/<\/p>|<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
