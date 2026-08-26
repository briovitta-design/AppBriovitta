import "server-only";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Header,
  HeadingLevel,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  convertMillimetersToTwip,
} from "docx";
import { parse } from "node-html-parser";
import type { Node as NoHtmlNode, HTMLElement as NoHtmlElement } from "node-html-parser";

const FONTE = "Verdana";
// docx mede tamanho de fonte em "half-points": 24 = 12pt (mesmo tamanho
// usado antes no PDF). Diferente do motor anterior (Chromium headless),
// aqui NÃO precisamos embutir a fonte — o Word usa a Verdana instalada
// no sistema de quem abre o arquivo, e é uma fonte padrão em praticamente
// todo Windows/Mac.
const TAMANHO_FONTE_PT = 24;
const TAMANHO_FONTE_VERIFICACAO_PT = 18; // 9pt

const LARGURA_PAGINA_MM = 210;
const ALTURA_PAGINA_MM = 297;
// Dimensões do timbrado em pixels (96dpi) — mesma referência usada antes
// no gerador de PDF, pra imagem cobrir a folha A4 inteira sem distorcer.
const LARGURA_PAGINA_PX = 794;
const ALTURA_PAGINA_PX = 1123;

// Margens do texto — o Word reserva esse espaço automaticamente em TODA
// página (diferente do que a gente tentou simular na mão com o PDF via
// Chromium), então aqui não existe o problema de texto invadindo o
// rodapé ou faltar margem a partir da 2ª página.
export const MARGEM_TOPO_CM = 3.8;
export const MARGEM_BASE_CM = 3;
export const MARGEM_LATERAL_CM = 1.5;

type TipoImagemDocx = "jpg" | "png" | "gif" | "bmp";

type ImagemBuscada = { buffer: Buffer; tipo: TipoImagemDocx };

/** Deduz o tipo de imagem aceito pelo ImageRun do docx a partir do content-type
 *  HTTP (mais confiável que a extensão da URL, já que a Cloudinary às vezes
 *  serve extensão diferente do formato real). Cai em "png" como fallback. */
function tipoImagemDoContentType(contentType: string | null): TipoImagemDocx {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("bmp")) return "bmp";
  return "png";
}

async function buscarImagemComoBuffer(url: string): Promise<ImagemBuscada | null> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      console.warn(`[docx] Não foi possível buscar a imagem (HTTP ${resposta.status}): ${url}`);
      return null;
    }
    const buffer = Buffer.from(await resposta.arrayBuffer());
    const tipo = tipoImagemDoContentType(resposta.headers.get("content-type"));
    return { buffer, tipo };
  } catch (erro) {
    console.warn(`[docx] Erro ao buscar imagem: ${url}`, erro);
    return null;
  }
}

type Marcas = { negrito?: boolean; italico?: boolean; sublinhado?: boolean };

/** Converte os nós inline de um elemento (texto, <strong>, <em>, <u>, <br>) em TextRuns do docx. */
function inlineParaRuns(el: NoHtmlNode, marcas: Marcas = {}): TextRun[] {
  const runs: TextRun[] = [];
  for (const filho of el.childNodes) {
    if (filho.nodeType === 3) {
      // nó de texto puro
      const texto = (filho as unknown as { rawText: string }).rawText;
      if (texto) {
        runs.push(
          new TextRun({
            text: texto,
            font: FONTE,
            size: TAMANHO_FONTE_PT,
            bold: marcas.negrito,
            italics: marcas.italico,
            underline: marcas.sublinhado ? {} : undefined,
          })
        );
      }
      continue;
    }
    if (filho.nodeType !== 1) continue; // ignora comentários etc.
    const elFilho = filho as NoHtmlElement;
    const tag = elFilho.tagName?.toLowerCase();

    if (tag === "br") {
      runs.push(new TextRun({ text: "", break: 1, font: FONTE, size: TAMANHO_FONTE_PT }));
      continue;
    }
    if (tag === "strong" || tag === "b") {
      runs.push(...inlineParaRuns(elFilho, { ...marcas, negrito: true }));
      continue;
    }
    if (tag === "em" || tag === "i") {
      runs.push(...inlineParaRuns(elFilho, { ...marcas, italico: true }));
      continue;
    }
    if (tag === "u") {
      runs.push(...inlineParaRuns(elFilho, { ...marcas, sublinhado: true }));
      continue;
    }
    // tag inline desconhecida — entra em profundidade tratando como texto simples
    runs.push(...inlineParaRuns(elFilho, marcas));
  }
  return runs;
}

/** Converte os blocos de nível superior do HTML do editor (parágrafos, títulos, listas) em Paragraphs do docx. */
function htmlParaParagrafos(html: string): Paragraph[] {
  const root = parse(html);
  const paragrafos: Paragraph[] = [];

  function processarLista(listaEl: NoHtmlElement) {
    for (const item of listaEl.childNodes) {
      if (item.nodeType !== 1 || (item as NoHtmlElement).tagName?.toLowerCase() !== "li") continue;
      paragrafos.push(
        new Paragraph({
          bullet: { level: 0 },
          children: inlineParaRuns(item),
        })
      );
    }
  }

  for (const node of root.childNodes) {
    if (node.nodeType !== 1) continue; // só elementos
    const el = node as NoHtmlElement;
    const tag = el.tagName?.toLowerCase();

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const nivel =
        tag === "h1" ? HeadingLevel.HEADING_1 : tag === "h2" ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      paragrafos.push(
        new Paragraph({
          heading: nivel,
          spacing: { before: 200, after: 120 },
          children: inlineParaRuns(el, { negrito: true }),
        })
      );
      continue;
    }

    if (tag === "p") {
      paragrafos.push(new Paragraph({ spacing: { after: 160 }, children: inlineParaRuns(el) }));
      continue;
    }

    // listas numeradas também viram bullet por simplicidade — o conteúdo
    // clínico daqui não depende de numeração sequencial específica.
    if (tag === "ul" || tag === "ol") {
      processarLista(el);
      continue;
    }

    // qualquer outra tag de bloco: trata como parágrafo simples
    paragrafos.push(new Paragraph({ spacing: { after: 160 }, children: inlineParaRuns(el) }));
  }

  return paragrafos;
}

export async function gerarDocxDocumento(params: {
  conteudoHtml: string;
  timbradoUrl?: string;
  nomeProfissional: string;
  registroProfissional?: string;
  cidade: string;
  assinaturaUrl?: string;
  identificadorAssinatura?: string;
}): Promise<Buffer> {
  const [timbrado, assinatura] = await Promise.all([
    params.timbradoUrl ? buscarImagemComoBuffer(params.timbradoUrl) : Promise.resolve(null),
    params.assinaturaUrl ? buscarImagemComoBuffer(params.assinaturaUrl) : Promise.resolve(null),
  ]);

  const dataAtual = new Date().toLocaleDateString("pt-BR");

  // Timbrado como imagem flutuante, ATRÁS do texto, ancorada na PÁGINA
  // (não na margem/coluna) — colocada dentro do cabeçalho pra repetir
  // automaticamente em toda página. É o jeito nativo do Word de fazer
  // "papel timbrado" de página inteira, sem nada da complicação manual
  // que a gente teve tentando simular isso em HTML+Chromium.
  const header = timbrado
    ? new Header({
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: timbrado.buffer,
                type: timbrado.tipo,
                transformation: { width: LARGURA_PAGINA_PX, height: ALTURA_PAGINA_PX },
                floating: {
                  horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
                  verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
                  wrap: { type: TextWrappingType.NONE },
                  behindDocument: true,
                },
              }),
            ],
          }),
        ],
      })
    : undefined;

  const paragrafosConteudo = htmlParaParagrafos(params.conteudoHtml);

  const paragrafosFechamento: Paragraph[] = [
    new Paragraph({
      spacing: { before: 300, after: 200 },
      children: [new TextRun({ text: `${params.cidade}, ${dataAtual}.`, font: FONTE, size: TAMANHO_FONTE_PT })],
    }),
  ];

  if (assinatura) {
    // A imagem da assinatura já traz nome e registro escritos nela —
    // repetir como texto por baixo ficava redundante (mesmo critério do
    // gerador de PDF anterior).
    paragrafosFechamento.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: assinatura.buffer,
            type: assinatura.tipo,
            transformation: { width: 180, height: 70 },
          }),
        ],
      })
    );
  } else {
    paragrafosFechamento.push(
      new Paragraph({
        spacing: { before: 600 },
        children: [
          new TextRun({ text: "_______________________________", font: FONTE, size: TAMANHO_FONTE_PT }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: params.nomeProfissional, font: FONTE, size: TAMANHO_FONTE_PT })],
      })
    );
    if (params.registroProfissional) {
      paragrafosFechamento.push(
        new Paragraph({
          children: [new TextRun({ text: params.registroProfissional, font: FONTE, size: TAMANHO_FONTE_PT })],
        })
      );
    }
  }

  if (params.identificadorAssinatura) {
    paragrafosFechamento.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: `Verificação: ${params.identificadorAssinatura}`,
            font: FONTE,
            size: TAMANHO_FONTE_VERIFICACAO_PT,
            color: "888888",
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(LARGURA_PAGINA_MM),
              height: convertMillimetersToTwip(ALTURA_PAGINA_MM),
            },
            margin: {
              top: convertMillimetersToTwip(MARGEM_TOPO_CM * 10),
              bottom: convertMillimetersToTwip(MARGEM_BASE_CM * 10),
              left: convertMillimetersToTwip(MARGEM_LATERAL_CM * 10),
              right: convertMillimetersToTwip(MARGEM_LATERAL_CM * 10),
            },
          },
        },
        headers: header ? { default: header } : undefined,
        children: [...paragrafosConteudo, ...paragrafosFechamento],
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: FONTE, size: TAMANHO_FONTE_PT },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}
