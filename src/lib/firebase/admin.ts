import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Só roda no servidor (API routes / server actions da Vercel).
// NUNCA importar este arquivo de um componente "use client".

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // A chave privada vem com \n escapado nas env vars da Vercel.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Credenciais do Firebase Admin ausentes. Configure FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY nas variáveis de ambiente."
    );
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

// Usamos globalThis (não uma variável de módulo comum) porque, em dev, o
// Next.js compila cada rota de API como um bundle separado — cada uma
// carregaria sua PRÓPRIA cópia deste arquivo, com sua própria variável
// "já configurei" começando em false, mesmo todas apontando pro mesmo
// Firestore por baixo. Isso fazia a segunda rota chamada tentar rodar
// .settings() de novo num Firestore que outra rota já tinha configurado,
// o que o Admin SDK proíbe e derrubava a sessão de login (loop de redirect
// no /dashboard). globalThis é compartilhado pelo processo Node inteiro,
// então sobrevive a essa duplicação de módulos.
declare global {
  // eslint-disable-next-line no-var
  var __briovittaFirestoreConfigurado: boolean | undefined;
}

export function getAdminDb() {
  const db = getFirestore(getAdminApp());
  // Campos opcionais (telefone, endereço, observações, etc.) chegam como
  // `undefined` quando o formulário deixa em branco. Sem isso, o Admin SDK
  // lança uma exceção síncrona em qualquer .set()/.update() com um campo
  // undefined, o que derruba a rota e o front-end recebe uma resposta 500
  // sem corpo — daí o erro "Unexpected end of JSON input" na tela.
  if (!globalThis.__briovittaFirestoreConfigurado) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Segunda linha de defesa: se por algum outro motivo o Firestore já
      // tiver sido configurado antes desta flag ser vista, apenas seguimos
      // em frente em vez de derrubar a rota — settings() já vale o que
      // precisamos de qualquer forma.
    }
    globalThis.__briovittaFirestoreConfigurado = true;
  }
  return db;
}
