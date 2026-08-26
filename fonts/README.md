# Fonte Verdana (opcional, mas recomendado em produção)

A Verdana é uma fonte proprietária da Microsoft — não pode ser
distribuída junto com o código-fonte do projeto.

No seu **Windows local**, você não precisa fazer nada: o Chrome que gera
o PDF já acha a Verdana instalada nativamente no sistema.

Em **produção (Vercel)**, o ambiente é Linux e não tem Verdana instalada
— sem o arquivo aqui, o PDF cai pra uma fonte padrão parecida (sem
quebrar nada, só não fica pixel-perfect). Pra ter Verdana de verdade lá
também:

1. Copie `C:\Windows\Fonts\verdana.ttf` pra esta pasta (`fonts/verdana.ttf`
   na raiz do projeto).
2. Reinicie `npm run dev` (local) ou faça o deploy de novo (produção).

Esta pasta está no `.gitignore` — o arquivo nunca vai parar num commit ou
repositório compartilhado. Isso significa que, se ele só existir na sua
máquina, a Vercel **não vai ter esse arquivo no deploy**. Se quiser
Verdana também em produção, você vai precisar de outra forma de levar o
arquivo até lá (ex.: variável de ambiente com o conteúdo em base64, ou
publicá-lo num storage privado e buscar em runtime) — me avise quando
chegar nessa etapa que a gente resolve.
