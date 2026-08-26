# Modelagem de dados — Firestore

Adaptação do modelo conceitual (seção 15 do projeto descritivo) para
coleções do Firestore. Tipos TypeScript completos em `src/lib/types.ts`.

## Coleções de nível raiz

| Coleção | Documento | Observações |
|---|---|---|
| `usuarios/{uid}` | 1 por login | `uid` é o mesmo do Firebase Authentication. Guarda papel, tema e status ativo/inativo. |
| `pacientes/{id}` | 1 por paciente | Sem CPF, sem e-mail (decisão congelada). |
| `documentos/{id}` | 1 por documento gerado | Guarda só **metadados** — o .docx em si vive no Cloudinary (`cloudinaryPublicId`). |
| `assinaturas/{id}` | 1 por assinatura | Evidência de autoria/integridade (seção 9.2). Só o backend escreve. |
| `templates/{id}` | 1 por modelo | Um template por tipo de documento × profissional. |
| `logsAuditoria/{id}` | 1 por evento | Append-only; só leitura para Admin. |
| `configuracoes/sistema` | documento único | IA ativa/inativa, limites de uso, formas de pagamento, temas disponíveis. |

## Subcoleções (dentro de `pacientes/{id}`)

| Subcoleção | Por quê |
|---|---|
| `atendimentos/{atendimentoId}` | Sempre consultados no contexto de um paciente (linha do tempo). |
| `evolucoes/{evolucaoId}` | Idem — e referenciam o `atendimentoId` de origem. |
| `pacotes/{pacoteId}` | Pacotes de sessões contratados pelo paciente (melhoria pós-V1: ver `Pacote` em `types.ts`). Atendimentos que consomem sessão referenciam de volta via `Atendimento.pacoteId`. |

Isso mantém a "Ficha do paciente" (seção 4.1) como uma única leitura em
árvore, sem precisar de queries cruzadas para montar a timeline.

## Índices previstos (a criar quando o Firestore pedir, nas Fases 3/4/8)

- `atendimentos` (collection group) por `profissionalId` + `dataHora` — dashboard "Meus atendimentos".
- `atendimentos` (collection group) por `local` + `statusPagamento` — filtros do Financeiro.
- `documentos` por `pacienteId` + `criadoEm` — histórico de documentos.

O Firestore no plano Spark cria índices simples automaticamente; índices
compostos (mais de um campo) precisam ser criados manualmente ou aceitos
pelo link de erro que o próprio Firestore mostra em desenvolvimento.

## Por que nada de Cloud Storage

Por decisão do projeto, os arquivos (timbrados, documentos Word
assinados) ficam no **Cloudinary**, não no Firebase Storage — isso evita
depender do plano pago (Blaze) do Firebase. O Firestore guarda apenas o
`cloudinaryPublicId` e metadados (hash, quem assinou, quando). Detalhes
do fluxo de upload/download seguro estão na Fase 5/6 (ainda não
implementadas nesta entrega).
