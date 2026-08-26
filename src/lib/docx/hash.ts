import "server-only";
import { createHash } from "crypto";

export function calcularHashDocumento(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function gerarIdentificadorVerificacao(): string {
  // Código curto e legível, exibido no rodapé do documento assinado, que o
  // paciente/terceiro pode conferir contra o hash salvo no Firestore.
  //
  // IMPORTANTE (mudou com a virada pra Word): esse hash agora é calculado
  // em cima dos bytes do .docx gerado pelo servidor — não do PDF final que
  // o profissional exporta na própria máquina (Word > Ctrl+P > Salvar como
  // PDF). Como essa exportação final não é controlada pelo servidor, o
  // hash comprova a integridade do .docx que foi assinado, mas não bate
  // necessariamente byte a byte com o PDF que a pessoa acaba enviando pro
  // paciente. Decisão consciente, conversada com o Gustavo.
  return `BRV-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}
