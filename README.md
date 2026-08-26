# Briovitta — Sistema de Gestão Clínica

Entrega completa da V1, cobrindo as 9 fases combinadas: Base/autenticação,
Pacientes, Atendimentos, Evoluções, Documentos, Assinatura, IA, Dashboard
e Hardening.

## Arquitetura

```
Vercel (Next.js, App Router)
 ├── Firebase Authentication  → login de Matheus, Vitória e Admin
 ├── Firestore (Spark, grátis) → dados estruturados
 ├── Cloudinary                → timbrados, PDFs gerados, documentos assinados, backups
 └── OpenAI                    → rascunhos de laudos/relatórios (Fase 7)
```

Nenhum arquivo binário é salvo no Firestore ou no Firebase Storage — o
projeto não usa Firebase Storage (ver `docs/modelagem-firestore.md`).
Tudo fica no plano gratuito: Firebase Spark, Vercel Hobby, Cloudinary Free.

## Pré-requisitos

- Node.js 20+
- Conta no [Firebase](https://console.firebase.google.com) (projeto já criado)
- Conta na [Vercel](https://vercel.com) e no [Cloudinary](https://cloudinary.com) (já criadas)
- Conta na [OpenAI](https://platform.openai.com), com algum crédito

## 1. Instalar dependências

```bash
npm install
```

> Este projeto foi escrito neste ambiente sem acesso à internet, então o
> `npm install` e o `npm run build` ainda não foram executados de fato.
> Rode os dois localmente antes de tudo — se aparecer algum erro de
> versão de pacote ou de tipo, me mostre a mensagem que eu corrijo.

## 2. Configurar o Firebase

1. **Authentication** → ative o provedor **E-mail/senha**.
2. **Firestore Database** → crie o banco em modo produção.
3. **Configurações do projeto → Geral** → copie o "SDK config" do app Web
   para as variáveis `NEXT_PUBLIC_FIREBASE_*`.
4. **Configurações do projeto → Contas de serviço** → gere uma chave
   privada (JSON) e preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`
   e `FIREBASE_PRIVATE_KEY`.

```bash
cp .env.example .env.local
```
Preencha todas as variáveis (Firebase, Cloudinary, OpenAI, CRON_SECRET).

## 3. Publicar as regras e índices do Firestore

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # selecione o projeto Briovitta
firebase deploy --only firestore:rules,firestore:indexes
```

A tela de Financeiro e a de Dashboard usam consultas "collection group"
(todos os atendimentos de todos os pacientes de uma vez) — os índices
necessários já estão em `firestore.indexes.json`.

## 4. Criar o primeiro usuário Administrador

Não existe autocadastro. Em vez de criar pelo console do Firebase, use o
script — ele cria o usuário no Firebase Authentication **e** o documento
correspondente no Firestore em um passo só:

1. Adicione no `.env.local`:
   ```
   SUPERADMIN_NOME="Seu Nome"
   SUPERADMIN_EMAIL=admin@briovitta.com.br
   SUPERADMIN_SENHA=uma-senha-forte-temporaria
   ```
2. Rode:
   ```bash
   node -r dotenv/config scripts/seed-admin.js dotenv_config_path=.env.local
   ```

O script é idempotente — se rodar de novo com o mesmo e-mail, ele só
garante que o papel continua "admin" e a conta ativa, em vez de dar erro
de usuário duplicado. Depois disso, o próprio Admin cria Matheus e
Vitória pela tela `/admin/usuarios`, sem precisar rodar mais scripts.

## 5. Subir os timbrados dos profissionais

Os timbrados (PDF) precisam estar no Cloudinary e referenciados no
Firestore antes da Fase 5/6 funcionar (geração de PDF e assinatura). Use
o script pronto:

```bash
node -r dotenv/config scripts/seed-timbrados.js dotenv_config_path=.env.local \
  --matheus ./Timbrado_matheus.pdf --matheusUid <uid_do_matheus> \
  --vitoria ./Timbrado_Briovitta_Vitoria.pdf --vitoriaUid <uid_da_vitoria>
```

(os UIDs você pega no Firebase Authentication depois de criar cada usuário)

## 6. Rodar localmente

```bash
npm run dev
```

## 6.1. Zerar os dados de teste (opcional)

Enquanto estiver testando antes de entregar para o cliente, use este comando
para apagar pacientes, atendimentos, evoluções, documentos, assinaturas e
logs de auditoria — sem apagar os logins de Matheus, Vitória e Admin:

```bash
npm run reset-db
```

O script pede para você digitar o ID do projeto Firebase como confirmação,
como proteção contra rodar sem querer. Se quiser já recriar alguns pacientes
de teste depois de zerar, rode:

```bash
node -r dotenv/config scripts/reset-db.js dotenv_config_path=.env.local --seed
```

> Atenção: como o projeto usa um único banco Firebase (não há um banco de
> teste separado), este script mexe nos dados reais desse projeto. Só rode
> quando tiver certeza de que quer apagar o que está lá.

## 7. Deploy na Vercel

1. Suba o projeto para um repositório Git.
2. Vercel → **New Project** → importe o repositório.
3. Cole todas as variáveis de ambiente do `.env.local`.
4. Deploy.
5. Domínio: Vercel → **Domains** → adicione `app.briovitta.com.br` e
   configure o CNAME no seu provedor de DNS do domínio `briovitta.com.br`.
6. **Backup automático**: o `vercel.json` já define um cron diário
   (3h da manhã) chamando `/api/admin/backup`. A Vercel envia
   automaticamente o header `Authorization: Bearer <CRON_SECRET>` quando
   a variável `CRON_SECRET` está configurada no projeto — sem custo
   extra no plano Hobby (1 execução/dia).

## O que está implementado

**Fase 1 — Base:** login com sessão em cookie `httpOnly`, bloqueio após
tentativas erradas, 3 papéis com permissões distintas, troca de tema
instantânea, administração de usuários (sem autocadastro), auditoria.

**Fase 2 — Pacientes:** cadastro (sem CPF/e-mail), busca por nome, ficha
com resumo financeiro e clínico.

**Fase 3 — Atendimentos:** Clínica × Home Care, endereço herdado do
paciente em Home Care, situação de pagamento, "dar baixa" na ficha do
paciente ou no Financeiro, indicadores e filtros no Financeiro.

**Fase 4 — Evoluções:** completa e rápida, registrável junto da
finalização do atendimento, timeline única na ficha do paciente.

**Fase 5 — Documentos:** 4 tipos (laudo, relatório de evolução,
declaração, encaminhamento), rascunho editável, geração de PDF sobre o
timbrado do profissional (via `pdf-lib`), upload como arquivo **privado**
no Cloudinary — nunca público.

**Fase 6 — Assinatura:** só o profissional responsável assina; ao
assinar, o PDF final é regravado com um código de verificação, o hash
SHA-256 é calculado e salvo, e o documento vira imutável (nova correção
= nova versão, nunca sobrescrita).

**Fase 7 — IA:** rascunho de documento via OpenAI, contexto limitado às
últimas evoluções do paciente (nunca o histórico inteiro), modelo
econômico (`gpt-4o-mini` por padrão), teto de tokens por geração, sempre
com revisão humana antes de aprovar/assinar.

**Fase 8 — Dashboard:** pacientes, atendimentos do mês, faturado,
recebido, pendente, Clínica × Home Care, alternância entre "Minha visão"
e "Visão da clínica" (Admin sempre vê consolidado).

**Fase 9 — Hardening:** cabeçalhos de segurança HTTP, regras do
Firestore por papel, download de documento sempre via backend validando
permissão (nunca URL pública direta), backup diário automático (JSON de
todas as coleções, salvo como arquivo privado no Cloudinary).

## Limitações conhecidas / próximos ajustes recomendados

- O rate-limit de tentativas de login é só no navegador (localStorage);
  o Firebase Authentication já limita força bruta no servidor, mas para
  um controle mais fino valeria adicionar um rate-limit também na rota
  `/api/auth/session` (ex: Upstash Redis, gratuito até um certo volume).
- A quebra de linha do gerador de PDF (`gerarDocumentoPdf.ts`) é simples
  (por largura de caractere); para textos muito longos ou com
  formatação rica, vale trocar por uma lib de layout de texto mais
  robusta futuramente.
- Templates de documento são únicos por tipo (não por profissional)
  nesta entrega — a coleção `templates` já existe no modelo de dados
  para quando isso for necessário.
- Este código não foi compilado/rodado neste ambiente (sem acesso à
  internet). Rode `npm install && npm run build` localmente como
  primeiro passo de validação.
