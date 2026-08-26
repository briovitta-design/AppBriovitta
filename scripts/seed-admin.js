/**
 * Cria o primeiro usuário Administrador direto pelo terminal, sem
 * precisar mexer no console do Firebase.
 *
 * Uso:
 *   1. Adicione no seu .env.local:
 *        SUPERADMIN_NOME="Seu Nome"
 *        SUPERADMIN_EMAIL="admin@briovitta.com.br"
 *        SUPERADMIN_SENHA="uma-senha-forte-temporaria"
 *
 *   2. Rode:
 *        node -r dotenv/config scripts/seed-admin.js dotenv_config_path=.env.local
 *
 * O script é idempotente: se o e-mail já existir no Firebase Auth, ele
 * reaproveita o usuário (só garante que o papel no Firestore é "admin"
 * e que a conta está ativa) em vez de falhar.
 */

const admin = require("firebase-admin");

async function main() {
  const nome = process.env.SUPERADMIN_NOME;
  const email = process.env.SUPERADMIN_EMAIL;
  const senha = process.env.SUPERADMIN_SENHA;

  if (!nome || !email || !senha) {
    console.error(
      "Defina SUPERADMIN_NOME, SUPERADMIN_EMAIL e SUPERADMIN_SENHA no .env.local antes de rodar."
    );
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error("SUPERADMIN_SENHA precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  const auth = admin.auth();
  const db = admin.firestore();

  let usuarioAuth;
  try {
    usuarioAuth = await auth.getUserByEmail(email);
    console.log(`Usuário já existe no Firebase Auth (uid: ${usuarioAuth.uid}). Reaproveitando.`);
  } catch {
    usuarioAuth = await auth.createUser({ email, password: senha, displayName: nome });
    console.log(`Usuário criado no Firebase Auth (uid: ${usuarioAuth.uid}).`);
  }

  const agora = new Date().toISOString();
  await db.collection("usuarios").doc(usuarioAuth.uid).set(
    {
      uid: usuarioAuth.uid,
      nome,
      login: email,
      papel: "admin",
      tema: "vitoria",
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    },
    { merge: true }
  );

  console.log("\nPronto! Administrador configurado:");
  console.log(`  UID:   ${usuarioAuth.uid}`);
  console.log(`  Login: ${email}`);
  console.log("\nJá pode fazer login em /login com esse e-mail e senha.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
