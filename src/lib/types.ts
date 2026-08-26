// Modelo de dados da V1 — ver docs/modelagem-firestore.md para a explicação
// completa de cada coleção, índices e regras de acesso.

import type { ThemeName } from "@/lib/theme/tokens";

export type Papel = "matheus" | "vitoria" | "admin";

/** Coleção: usuarios/{uid} — uid é o mesmo do Firebase Authentication */
export interface Usuario {
  uid: string;
  nome: string;
  login: string; // e-mail usado para login (Firebase Auth)
  papel: Papel;
  tema: ThemeName;
  ativo: boolean;
  registroProfissional?: string; // CREFITO, por ex., quando papel !== 'admin'
  especialidade?: string;
  letterheadImagemUrl?: string; // URL pública da imagem do timbrado (PNG/JPG), fundo repetido em cada página do Word gerado
  letterheadAtualizadoEm?: string; // ISO date — exibido em "Preferências" pro profissional saber se está desatualizado
  assinaturaImagemUrl?: string; // URL pública da imagem de assinatura, desenhada no bloco de fechamento dos documentos gerados
  assinaturaAtualizadaEm?: string;
  criadoEm: string; // ISO date
  atualizadoEm: string;
}

export type LocalAtendimento = "clinica" | "home_care";
export type StatusPagamento = "pago" | "pendente";
export type FormaPagamento = "pix" | "cartao" | "dinheiro" | "outro";
export type TipoHabitual = "clinica" | "home_care";

/** Coleção: pacientes/{id} */
export interface Paciente {
  id: string;
  nomeCompleto: string;
  dataNascimento: string; // ISO date
  telefone?: string;
  diagnostico: string;
  tipoHabitual?: TipoHabitual;
  endereco?: string;
  observacoes?: string; // observações clínicas
  observacoesInternas?: string; // observações internas/operacionais (não-clínicas)
  // uid do profissional (matheus/vitoria) dono deste paciente — escolhido no
  // cadastro. Controla quem vê o paciente fora do papel admin. Opcional só
  // por causa de pacientes cadastrados antes desta função existir; o admin
  // pode atribuir um responsável a eles na ficha do paciente.
  profissionalResponsavelId?: string;
  criadoPor: string; // uid
  criadoEm: string;
  atualizadoEm: string;
}

/** Subcoleção: pacientes/{id}/atendimentos/{atendimentoId} */
export interface Atendimento {
  id: string;
  pacienteId: string;
  profissionalId: string; // uid do usuário responsável
  dataHora: string; // ISO datetime
  local: LocalAtendimento;
  enderecoAtendimento?: string; // preenchido/alterado quando home_care
  // Quando preenchido, esta sessão consumiu 1 sessão do pacote (o valor não é
  // cobrado de novo individualmente — ver seção 1.2 do doc de melhorias).
  pacoteId?: string;
  valor: number;
  statusPagamento: StatusPagamento;
  formaPagamento?: FormaPagamento;
  dataBaixa?: string;
  usuarioBaixa?: string; // uid de quem deu baixa
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusPacote = "ativo" | "concluido" | "cancelado";
export type SituacaoFinanceiraPacote = "pago" | "pendente" | "parcial";

/** Subcoleção: pacientes/{id}/pacotes/{pacoteId} */
export interface Pacote {
  id: string;
  pacienteId: string;
  quantidadeSessoes: number;
  // sessoesRestantes é derivado (quantidadeSessoes - sessoesRealizadas), não
  // guardado à parte, pra nunca ficar dessincronizado.
  sessoesRealizadas: number;
  valorTotal: number;
  profissionalResponsavelId: string;
  tipoHabitual: TipoHabitual; // local esperado das sessões deste pacote
  dataInicio: string; // ISO date
  situacaoFinanceira: SituacaoFinanceiraPacote;
  valorRecebido: number; // relevante quando situacaoFinanceira === "parcial"
  status: StatusPacote;
  criadoPor: string; // uid
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoEvolucao = "completa" | "rapida";

/** Subcoleção: pacientes/{id}/evolucoes/{evolucaoId} */
export interface Evolucao {
  id: string;
  pacienteId: string;
  atendimentoId: string;
  profissionalId: string;
  tipo: TipoEvolucao;
  dataHora: string;
  // Modo completo
  queixaEstadoAtual?: string;
  condutaRealizada?: string;
  respostaObservada?: string;
  orientacoesPlano?: string;
  observacoesAdicionais?: string;
  // Modo rápido
  textoRapido?: string;
  criadoEm: string;
}

export type TipoDocumento =
  | "laudo_fisioterapeutico"
  | "relatorio_evolucao"
  | "declaracao"
  | "encaminhamento";

export type StatusDocumento = "rascunho" | "aprovado" | "assinado";

/** Coleção: documentos/{id} — o .docx em si mora no Cloudinary; aqui só metadados */
export interface Documento {
  id: string;
  pacienteId: string;
  profissionalId: string;
  tipo: TipoDocumento;
  templateId: string;
  conteudo: string; // texto/HTML do documento antes de virar Word
  status: StatusDocumento;
  versao: number;
  geradoPorIA: boolean;
  cloudinaryPublicId?: string; // preenchido após gerar o Word
  hash?: string; // calculado no momento da assinatura
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

/** Coleção: assinaturas/{id} */
export interface Assinatura {
  id: string;
  documentoId: string;
  usuarioId: string;
  dataHora: string;
  hash: string;
  identificador: string; // código único de verificação exibido no Word
  versaoDocumento: number;
}

/** Coleção: templates/{id} */
export interface Template {
  id: string;
  tipo: TipoDocumento;
  profissionalId: string; // ou 'todos' se compartilhado
  estrutura: string; // definição do template (placeholders)
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Coleção: logsAuditoria/{id} */
export interface LogAuditoria {
  id: string;
  usuarioId: string;
  acao: string; // ex: 'criar_paciente', 'editar_valor_atendimento', 'assinar_documento'
  entidade: string; // ex: 'paciente', 'atendimento', 'documento'
  entidadeId: string;
  dataHora: string;
  metadados?: Record<string, unknown>;
}

/** Coleção: configuracoesDocumento/{tipo} — instruções de IA por tipo de documento,
 *  editáveis pelo admin em /admin/documentos. Se não existir, usa PROMPTS_PADRAO. */
export interface ConfiguracaoDocumento {
  tipo: TipoDocumento;
  promptIA: string;
  atualizadoPor: string;
  atualizadoEm: string;
}

/** Coleção: configuracoes/sistema — documento único de config administrativa */
export interface ConfiguracaoSistema {
  iaAtiva: boolean;
  iaLimitePorDocumento: number;
  iaModelo: string;
  formasPagamentoDisponiveis: FormaPagamento[];
  temasDisponiveis: ThemeName[];
}
