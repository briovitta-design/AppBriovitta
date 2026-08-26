import "server-only";
import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

// Falha alto e claro se alguma credencial estiver faltando no .env.local —
// sem isso, o erro que aparece é o genérico da própria Cloudinary
// ("Must supply api_key"), que não diz qual variável é nem onde ela mora.
const faltando = [
  !CLOUDINARY_CLOUD_NAME && "CLOUDINARY_CLOUD_NAME",
  !CLOUDINARY_API_KEY && "CLOUDINARY_API_KEY",
  !CLOUDINARY_API_SECRET && "CLOUDINARY_API_SECRET",
].filter(Boolean);

if (faltando.length > 0) {
  console.error(
    `[cloudinary] Variável(is) de ambiente faltando: ${faltando.join(", ")}. ` +
      `Confira o .env.local (veja .env.example) e reinicie "npm run dev" — ` +
      `o Next só lê o .env.local quando o servidor inicia.`
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Sobe um documento (hoje, .docx — antes era .pdf, gerado via Chromium)
 * como recurso PRIVADO (type: "authenticated") — não gera URL pública
 * permanente. Ver seção de segurança do documento de arquitetura:
 * "Documentos clínicos NÃO devem ficar públicos".
 *
 * IMPORTANTE: assim como o timbrado, recursos "raw" na Cloudinary exigem a
 * extensão dentro do próprio public_id — os chamadores já devem passar
 * publicId terminando na extensão certa (ex.: ".docx").
 */
export async function uploadDocumentoPrivado(params: {
  buffer: Buffer;
  publicId: string;
}): Promise<{ publicId: string }> {
  const resultado = await new Promise<{ public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "authenticated",
        public_id: params.publicId,
        overwrite: false, // documentos assinados nunca são sobrescritos — nova versão = novo public_id
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result as unknown as { public_id: string });
      }
    );
    stream.end(params.buffer);
  });

  return { publicId: resultado.public_id };
}

/**
 * Gera uma URL assinada e com expiração curta para download — o backend
 * só chama isso depois de validar que o usuário tem permissão (seção
 * "Download de PDFs" da arquitetura).
 *
 * publicId já vem com ".pdf" embutido (ver uploadPdfPrivado). attachment:
 * true força o header Content-Disposition com esse nome de arquivo, então
 * o navegador salva/abre como .pdf de verdade em vez de um arquivo sem
 * extensão que só abre "escolhendo o programa manualmente".
 */
export function gerarUrlDownloadTemporaria(publicId: string): string {
  const expiraEm = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutos
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: expiraEm,
    attachment: true,
  });
}

export async function uploadImagemPublica(params: {
  buffer: Buffer;
  publicId: string;
}): Promise<{ publicId: string; url: string }> {
  // Timbrados/logo não são dados sensíveis de paciente — podem ser públicos,
  // isso simplifica a montagem do PDF (basta buscar a URL direto).
  const resultado = await new Promise<{ public_id: string; secure_url: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", public_id: params.publicId, overwrite: true },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result as unknown as { public_id: string; secure_url: string });
        }
      );
      stream.end(params.buffer);
    }
  );

  return { publicId: resultado.public_id, url: resultado.secure_url };
}

/**
 * Sobe a imagem de assinatura de um profissional (PNG/JPG com fundo
 * transparente de preferência) — desenhada no rodapé dos PDFs gerados.
 * Diferente do timbrado, "image" na Cloudinary já lida com a extensão
 * sozinha, então guardamos a secure_url pronta em vez de montar a URL na mão.
 */
export async function uploadAssinaturaImagem(params: {
  buffer: Buffer;
  uid: string;
}): Promise<{ url: string }> {
  const { url } = await uploadImagemPublica({
    buffer: params.buffer,
    publicId: `briovitta/assinaturas/${params.uid}/assinatura`,
  });
  return { url };
}

/**
 * Sobe a imagem do timbrado de um profissional (PNG/JPG, página inteira,
 * A4) — usada como fundo repetido em cada página do PDF gerado. Antes era
 * um PDF renderizado com pdf-lib; agora que o motor de geração vira
 * HTML+Chromium, o timbrado é imagem de fundo via CSS, então usa o mesmo
 * caminho de upload da assinatura (image, URL pronta, sem a pegadinha de
 * extensão que "raw" tinha).
 */
export async function uploadTimbradoImagem(params: {
  buffer: Buffer;
  uid: string;
}): Promise<{ url: string }> {
  const { url } = await uploadImagemPublica({
    buffer: params.buffer,
    publicId: `briovitta/timbrados/${params.uid}/timbrado`,
  });
  return { url };
}
