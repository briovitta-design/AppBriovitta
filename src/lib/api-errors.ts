import "server-only";
import { NextResponse } from "next/server";

/**
 * Mensagens em português para os códigos de erro mais comuns do Firebase.
 * Qualquer código não mapeado cai na mensagem padrão do chamador.
 */
const MENSAGENS_FIREBASE: Record<string, string> = {
  "auth/email-already-exists": "Já existe um usuário cadastrado com esse e-mail.",
  "auth/invalid-email": "O e-mail informado é inválido.",
  "auth/invalid-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/weak-password": "Senha muito fraca — use pelo menos 8 caracteres, com letras e números.",
  "auth/user-not-found": "Usuário não encontrado.",
  "auth/uid-already-exists": "Já existe um usuário com esse identificador.",
};

interface ErroComCodigo {
  code?: string | number;
  message?: string;
}

/**
 * Ponto único de tratamento de erro para as rotas de API.
 *
 * Por que isso existe: sem capturar o erro, uma falha do Firebase (ou de
 * qualquer código) derruba a rota inteira e o Next.js devolve uma resposta
 * de erro SEM corpo — o front-end tenta ler isso como JSON e quebra com uma
 * mensagem sem sentido para quem está usando o sistema. Toda rota deve
 * chamar esta função dentro de um catch, para o usuário sempre receber uma
 * mensagem compreensível, e para o erro real ficar registrado no terminal
 * (onde roda "npm run dev") para quem for investigar depois.
 */
export function apiErrorResponse(erro: unknown, mensagemPadrao = "Ocorreu um erro. Tente novamente.") {
  // Sempre loga o erro real no servidor — é isso que aparece no terminal.
  console.error(erro);

  const e = erro as ErroComCodigo;
  const codigo = typeof e?.code === "string" ? e.code : undefined;

  // Erro clássico de índice ausente no Firestore: o código é 9 (FAILED_PRECONDITION)
  // e a mensagem sempre traz um link para criar o índice automaticamente.
  const ehIndiceAusente =
    e?.code === 9 || (typeof e?.message === "string" && e.message.includes("requires an index"));

  if (ehIndiceAusente) {
    return NextResponse.json(
      {
        error:
          "Esta consulta precisa de um índice do Firestore que ainda não foi criado. " +
          "Veja o link no terminal onde o servidor está rodando (mensagem começando com " +
          '"FAILED_PRECONDITION") e abra esse link — ele cria o índice automaticamente.',
      },
      { status: 500 }
    );
  }

  const mensagem = (codigo && MENSAGENS_FIREBASE[codigo]) || mensagemPadrao;
  const status = codigo === "auth/email-already-exists" || codigo === "auth/uid-already-exists" ? 409 : 500;

  return NextResponse.json({ error: mensagem }, { status });
}
