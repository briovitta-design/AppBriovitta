/**
 * Zera os dados de TESTE do Firestore (pacientes, atendimentos, evoluções,
 * documentos, assinaturas e logs de auditoria) — sem apagar os usuários
 * (login/senha de Matheus, Vitória e Admin continuam intactos).
 *
 * IMPORTANTE: como você optou por não ter um banco de teste separado, este
 * script mexe no MESMO Firebase configurado no seu .env.local. Por isso ele
 * tem uma trava de segurança: só roda se você confirmar digitando o ID do
 * projeto Firebase que está no seu .env.local.
 *
 * Uso:
 *   node -r dotenv/config scripts/reset-db.js dotenv_config_path=.env.local
 *
 * Opções:
 *   --seed        Depois de apagar, recria alguns pacientes/atendimentos de
 *                 teste, prontos pra você mexer na tela.
 *   --com-usuarios  Também apaga os usuários (login) — normalmente você NÃO
 *                   quer isso, pois teria que criar o admin de novo.
 */

const readline = require("readline");
const admin = require("firebase-admin");

const COLECOES_TESTE = ["pacientes", "documentos", "assinaturas", "logsAuditoria"];
const SUBCOLECOES_PACIENTE = ["atendimentos", "evolucoes", "documentos", "pacotes"];

function pergunta(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(texto, (resposta) => {
    rl.close();
    resolve(resposta.trim());
  }));
}

async function apagarColecao(db, caminho, tamanhoLote = 200) {
  const colecaoRef = db.collection(caminho);
  let apagados = 0;
  // Loop em lotes para não estourar limite de escrita do Firestore.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await colecaoRef.limit(tamanhoLote).get();
    if (snap.empty) break;
    const lote = db.batch();
    snap.docs.forEach((doc) => lote.delete(doc.ref));
    await lote.commit();
    apagados += snap.size;
  }
  return apagados;
}

async function apagarSubcolecoesDePacientes(db) {
  const pacientesSnap = await db.collection("pacientes").get();
  let total = 0;
  for (const pacienteDoc of pacientesSnap.docs) {
    for (const sub of SUBCOLECOES_PACIENTE) {
      total += await apagarColecao(db, `pacientes/${pacienteDoc.id}/${sub}`);
    }
  }
  return total;
}

async function seedDemo(db) {
  const agora = new Date().toISOString();

  const usuariosSnap = await db.collection("usuarios").where("ativo", "==", true).get();
  const profissional = usuariosSnap.docs.find((d) => d.data().papel !== "admin");
  const profissionalId = profissional ? profissional.id : "profissional-demo";

  const pacientesDemo = [
    { nomeCompleto: "Ana Beatriz Souza", diagnostico: "Lombalgia crônica", tipoHabitual: "clinica" },
    { nomeCompleto: "Carlos Eduardo Lima", diagnostico: "Pós-operatório de joelho", tipoHabitual: "home_care" },
    { nomeCompleto: "Fernanda Ribeiro", diagnostico: "Escoliose leve", tipoHabitual: "clinica" },
  ];

  for (const p of pacientesDemo) {
    const pacienteRef = db.collection("pacientes").doc();
    await pacienteRef.set({
      id: pacienteRef.id,
      nomeCompleto: p.nomeCompleto,
      dataNascimento: "1990-01-01",
      telefone: "(11) 90000-0000",
      diagnostico: p.diagnostico,
      tipoHabitual: p.tipoHabitual,
      endereco: p.tipoHabitual === "home_care" ? "Rua Exemplo, 123 — São Paulo/SP" : undefined,
      observacoes: "Paciente de demonstração criado pelo script de reset.",
      criadoPor: profissionalId,
      criadoEm: agora,
      atualizadoEm: agora,
    });

    const atendimentoRef = pacienteRef.collection("atendimentos").doc();
    await atendimentoRef.set({
      id: atendimentoRef.id,
      pacienteId: pacienteRef.id,
      profissionalId,
      dataHora: agora,
      local: p.tipoHabitual,
      valor: 150,
      statusPagamento: "pendente",
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  return pacientesDemo.length;
}

async function main() {
  const args = process.argv.slice(2);
  const querSeed = args.includes("--seed");
  const comUsuarios = args.includes("--com-usuarios");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("FIREBASE_PROJECT_ID não encontrado. Confira o seu .env.local.");
    process.exit(1);
  }

  console.log("\n⚠️  Este script vai APAGAR dados de teste do Firestore do projeto:");
  console.log(`    ${projectId}`);
  console.log("\n   Serão apagados: pacientes, atendimentos, evoluções, pacotes de sessões,");
  console.log("   documentos, assinaturas e logs de auditoria.");
  console.log(comUsuarios ? "   Os USUÁRIOS (login) também serão apagados (--com-usuarios)." : "   Os usuários (login) NÃO serão apagados.");
  console.log("\n   Isso NÃO pode ser desfeito.\n");

  const resposta = await pergunta(`Digite o ID do projeto ("${projectId}") para confirmar: `);
  if (resposta !== projectId) {
    console.log("\nID não confere. Nada foi apagado.");
    process.exit(0);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  const db = admin.firestore();

  console.log("\nApagando subcoleções de pacientes (atendimentos, evoluções, documentos)...");
  const totalSub = await apagarSubcolecoesDePacientes(db);
  console.log(`  -> ${totalSub} documento(s) apagado(s).`);

  for (const colecao of COLECOES_TESTE) {
    console.log(`Apagando coleção "${colecao}"...`);
    const total = await apagarColecao(db, colecao);
    console.log(`  -> ${total} documento(s) apagado(s).`);
  }

  if (comUsuarios) {
    console.log('Apagando coleção "usuarios"...');
    const total = await apagarColecao(db, "usuarios");
    console.log(`  -> ${total} documento(s) apagado(s).`);
    console.log("\nLembrete: rode o scripts/seed-admin.js de novo para recriar o Administrador.");
  }

  if (querSeed) {
    console.log("\nCriando pacientes de demonstração...");
    const total = await seedDemo(db);
    console.log(`  -> ${total} paciente(s) de teste criado(s), cada um com 1 atendimento pendente.`);
  }

  console.log("\n✅ Banco de dados zerado com sucesso.\n");
}

main().catch((err) => {
  console.error("\nErro ao zerar o banco:", err);
  process.exit(1);
});
