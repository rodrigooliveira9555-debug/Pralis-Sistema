# Backend do CICLUZ — login, banco e sincronização

Estrutura copiada do Sistema Pralis (Fastify + better-auth + Drizzle + Postgres + Zod + Vitest com
Testcontainers), dentro de `servidor/`. O site continua em `dist/`, sem build.

```
servidor/
  api/       Fastify — auth/, documentos/, usuarios/, saude/ (controller → service → repository)
  db/        Drizzle — schema + migrations SQL (db/migrations)
  shared/    Zod — contratos e a lista de chaves sincronizadas (fonte única)
  tests/     Vitest + Testcontainers (Postgres real em container)
dist/
  entrar.html, entrar.css, entrar.js, entrar-tema.js   tela de entrada
  cicluz-sync.js      chamadas à API e marcas de sincronização (usado pelas duas páginas)
  cicluz-sessao.js    porteiro do index: exige login e envia cada gravação ao servidor
```

## Como funciona

1. `index.html` carrega `cicluz-sessao.js` no `<head>`. Aba sem dados preparados → vai para `entrar.html`.
2. `entrar.html`: e-mail e senha → sessão em cookie httpOnly (12 h, renovada com o uso).
3. Primeira vez da empresa: **só o administrador** vê "Importação inicial" e envia os dados do
   aparelho escolhido (o iPad em uso). Antes disso nenhum aparelho grava no servidor.
4. Depois: a tela de entrada envia o que ficou pendente no aparelho, guarda no histórico o que ele
   tinha de diferente (só na primeira vez do aparelho) e troca os dados do aparelho pelos do servidor.
5. Nas telas, cada gravação de dado de negócio no `localStorage` sobe num lote único (tudo ou nada),
   com a versão base da aba. Outro aparelho gravou antes → 409: nada se perde (o lote vai para
   `documentos_historico`) e a tela pede "Atualizar".
6. Sair: só com tudo enviado; apaga do aparelho os dados de negócio da empresa.

Dados que vão para o banco: a lista fechada em `servidor/shared/src/documentos.ts`. Preferências de
tela (tema, ordem de menus) e o Cadastro completo (CPF) ficam só no aparelho (PROJECT_BRAIN/11, P-11).

## Rodar no computador

```bash
cd servidor
cp .env.example .env            # ajuste o BETTER_AUTH_SECRET
npm install
npm run db:subir                # Postgres em 127.0.0.1:5545 (Docker)
npm run db:migrar
CICLUZ_EMPRESA="Cicluz" CICLUZ_NOME="Seu nome" CICLUZ_EMAIL="voce@exemplo.com" \
  CICLUZ_SENHA="uma-senha-forte" CICLUZ_PAPEL=administrador npm run usuario:criar
npm run dev                     # API + site em http://localhost:4200/entrar.html
```

Qualidade: `npm run lint`, `npm run check`, `npm test` (os testes antigos de `tests/*.cjs` + 20 de integração).

## Publicar (ainda NÃO feito — decisão P-13)

Ordem obrigatória: **API primeiro, site depois.** Se o site com login for publicado sem a API no ar,
ninguém entra.

1. Banco Postgres de produção + `npm run db:migrar` com o `DATABASE_URL` dele.
2. API (`npm start` em `servidor/`) com `NODE_ENV=production`, `BETTER_AUTH_SECRET` próprio,
   `AUTH_BASE_URL` = domínio do site, `WEB_ORIGINS` = domínio do site, `SERVIR_SITE=0`.
3. No Vercel, repassar `/api/*` para a API (rewrite), para o cookie ser do próprio site (o Safari do
   iPad bloqueia cookie de outro domínio). Os previews do Vercel não podem apontar para a API de produção.
4. Criar a conta do administrador com `npm run usuario:criar` e fazer a importação no iPad.

O `.vercelignore` tira `servidor/` do deploy estático.

## Banco (migration `0000_inicial.sql`)

| Tabela | Para quê |
| ------ | -------- |
| `user`, `session`, `account`, `verification` | better-auth (iguais ao Sistema Pralis) |
| `empresas` | empresa; `dados_importados_em` marca a importação inicial |
| `perfis_usuarios` | usuário → empresa, nome, papel (`administrador` / `usuario`), ativo |
| `documentos` | versão atual de cada chave por empresa (`valor` texto, `versao` ≥ 1) |
| `documentos_historico` | só INSERT: gravada, conflito, substituida_pelo_servidor, removida |

## Próximas entregas (doc 12, fases 1–5)

Trocar a ponte de documentos por tabelas próprias por assunto, começando pelo financeiro (grupos,
contas, tipos de venda, bandeiras, operadoras e taxas por vigência), cada uma como entrega vertical
(tela + API + teste + remoção do caminho antigo).
