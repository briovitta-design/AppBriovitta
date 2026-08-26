/**
 * Uso (na sua máquina, com internet — não roda no ambiente do Claude):
 *
 *   node scripts/seed-timbrados.js \
 *     --matheus ./Timbrado_matheus.pdf --matheusUid <uid_do_matheus> \
 *     --vitoria ./Timbrado_Briovitta_Vitoria.pdf --vitoriaUid <uid_da_vitoria>
 *
 * Requer as mesmas variáveis de ambiente do .env.local (Cloudinary +
 * Firebase Admin) exportadas no shell, ou um arquivo .env.local carregado
 * via `node -r dotenv/config scripts/seed-timbrados.js dotenv_config_path=.env.local ...`
 *
 * O que ele faz:
 *   1. Sobe cada PDF de timbrado como recurso "raw" público no Cloudinary
 *      (não é dado de paciente, então pode ser público — ver
 *      docs/modelagem-firestore.md).
 *   2. Grava `letterheadPublicId` no documento usuarios/{uid} de cada
 *      profissional, para o gerador de PDF (Fase 5/6) encontrar o timbrado.
 */

const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");
const admin = require("firebase-admin");

function lerArgumento(nome) {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function main() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  const db = admin.firestore();

  const profissionais = [
    { chave: "matheus", nomePasta: "matheus" },
    { chave: "vitoria", nomePasta: "vitoria" },
  ];

  for (const p of profissionais) {
    const caminhoArquivo = lerArgumento(p.chave);
    const uid = lerArgumento(`${p.chave}Uid`);
    if (!caminhoArquivo || !uid) {
      console.log(`Pulando ${p.chave}: use --${p.chave} <arquivo.pdf> --${p.chave}Uid <uid>`);
      continue;
    }

    // Recursos "raw" na Cloudinary exigem a extensão dentro do próprio
    // public_id — ela não é acrescentada sozinha como em image/video.
    const publicId = `briovitta/timbrados/${p.nomePasta}/timbrado.pdf`;
    console.log(`Enviando timbrado de ${p.chave} para ${publicId}...`);

    await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", public_id: publicId, overwrite: true },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(fs.readFileSync(caminhoArquivo));
    });

    await db.collection("usuarios").doc(uid).update({ letterheadPublicId: publicId });
    console.log(`OK: usuarios/${uid}.letterheadPublicId = ${publicId}`);
  }

  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
