# Backend e app do CICLUZ — login, banco, tabelas por assunto, usuários e Lançamentos

Estrutura copiada do Sistema Pralis (Fastify + better-auth + Drizzle + Postgres + Zod + Vitest com
Testcontainers), dentro de `servidor/`. O site continua em `dist/`, sem build.

```
servidor/
  api/       Fastify — auth/, documentos/, projecoes/, consultas/, usuarios/, saude/
             (controller → service → repository)
  db/        Drizzle — schema + migrations SQL (db/migrations) + dados/cargos-referencia.json
  shared/    Zod — contratos e a lista de chaves sincronizadas (fonte única)
  web/       app das telas novas (Nuxt 4 + Vuetify + TS, igual ao web-vue do principal), em /app/
  tests/     Vitest + Testcontainers (Postgres real em container)
  Dockerfile, docker-compose.coolify.yml   deploy no Coolify (a imagem gera o app e a API o entrega)
dist/
  entrar.html, entrar.css, entrar.js, entrar-tema.js   tela de entrada
  usuarios.html, usuarios.css, usuarios.js              minha senha, acessos e situação dos dados
  cicluz-sync.js      chamadas à API e marcas de sincronização (usado pelas páginas avulsas)
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
7. **Tabelas por assunto:** na mesma transação de cada gravação, o servidor reconstrói as tabelas
   relacionais do assunto (financeiro, contas, cargos, salários, ficha de cargos, locais, organograma,
   identidade). As regras do banco (FK, CHECK, vigências sem sobreposição) valem nessas tabelas. Se o
   dado da tela ferir uma regra, a tela salva assim mesmo e o assunto aparece como "Precisa de
   correção" na tela Usuários (e em toda consulta, no campo `situacao`), com a mensagem de onde corrigir; as tabelas
   ficam na última versão boa. Gravações simultâneas do mesmo assunto projetam uma de cada vez. Na
   subida da API (e no deploy) o servidor reconstrói o que ficou defasado em relação aos documentos.
   Valores de dinheiro não são convertidos nem arredondados: ficam como a tela gravou.
8. **Consultas** (só leitura, sempre da empresa da sessão): `/api/financeiro/grupos`, `/tipos-venda`,
   `/bandeiras`, `/operadoras`, `/taxas?operadora=&bandeira=&data=`; `/api/contas`, `/api/cargos`,
   `/api/salarios/vigentes?data=AAAA-MM-DD` (mesma regra da tela), `/api/locais`, `/api/organograma`,
   `/api/ficha-de-cargos`, `/api/projecoes`.
9. **Usuários** (nome do usuário no rodapé do menu): todos trocam a própria senha; o administrador
   cria contas, muda papel, tira/devolve acesso (encerra as sessões na hora) e define senha nova.

10. **App novo (`/app/`)**: telas novas nascem aqui, gravando direto na API (banco como fonte da
   verdade). Usa o mesmo login (`entrar.html`) e a mesma saída (`entrar.html?sair=1`) do site. A
   primeira tela é **Lançamentos** (Despesas, Mercadorias, Retiradas; Entradas só consulta), com as
   regras do Sistema Pralis: ver `PROJECT_BRAIN/13_LANCAMENTOS.md`. O menu "Lançamentos" do site
   abre o app; a maquete antiga foi removida.

Dados que vão para o banco: a lista fechada em `servidor/shared/src/documentos.ts`. Preferências de
tela (tema, ordem de menus) e o Cadastro completo (CPF) ficam só no aparelho (PROJECT_BRAIN/11, P-11).

## Rodar no computador

```bash
cd servidor
cp .env.example .env            # ajuste o BETTER_AUTH_SECRET
npm install
npm run db:subir                # Postgres em 127.0.0.1:5545 (Docker)
npm run db:migrar
read -rs CICLUZ_SENHA && export CICLUZ_SENHA   # digita a senha sem eco
CICLUZ_EMPRESA="Cicluz" CICLUZ_EMPRESA_NOVA=1 CICLUZ_NOME="Seu nome" \
  CICLUZ_EMAIL="voce@exemplo.com" CICLUZ_PAPEL=administrador npm run usuario:criar
npm run dev                     # API + site em http://localhost:4200/entrar.html
npm run build:web               # gera o app; a API o entrega em http://localhost:4200/app/
npm run dev:web                 # (opcional) app com recarga ao vivo em http://localhost:3100/app/
```

`CICLUZ_EMPRESA_NOVA=1` só na primeira conta da empresa; as outras o administrador cria na tela Usuários.

Qualidade: `npm run lint`, `npm run check`, `npm test` (os testes antigos de `tests/*.cjs` + os de integração).

Catálogo dos 32 cargos de referência: fica no código da tela (`referenceJobs` no `index.html`). O
servidor usa a cópia `servidor/db/dados/cargos-referencia.json`; se o Rodrigo mudar o catálogo, rode
`node scripts/extrair-cargos-referencia.mjs` (um teste falha enquanto as duas divergirem).

## Publicar no Coolify (decidido em 03/11/2026; ainda NÃO feito)

Ordem obrigatória: **API primeiro, site depois.** Se o site com login for publicado sem a API no ar,
ninguém entra.

1. No Coolify: um Postgres novo (banco separado do Sistema Pralis) e um recurso Docker Compose deste
   repositório com Base Directory `/servidor` e compose `/docker-compose.coolify.yml`. O serviço
   `migrate` aplica as migrations e reconstrói as tabelas; a `api` só sobe depois dele.
2. Variáveis no painel: `DATABASE_URL`, `BETTER_AUTH_SECRET` próprio, `AUTH_BASE_URL` e `WEB_ORIGINS`
   = domínio https do site (http é recusado no boot) e `PROXIES_CONFIAVEIS` = número exato de proxies
   na frente (Vercel → Traefik = 2). A API **não** deve ter domínio público direto: só o proxy chega nela.
3. No Vercel, repassar `/api/*` para a API (rewrite), para o cookie ser do próprio site (o Safari do
   iPad bloqueia cookie de outro domínio). Os previews do Vercel não podem apontar para a API de produção.
   Acrescentar os cabeçalhos do site: `X-Frame-Options: DENY`, `Content-Security-Policy:
   frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`.
4. Criar a conta do administrador com `npm run usuario:criar` (terminal do container da API) e fazer a
   importação no iPad. As outras contas o administrador cria na tela Usuários.

O `.vercelignore` tira `servidor/` do deploy estático.

## Banco (migrations `0000_inicial`, `0001_tabelas_por_assunto`, `0002_lancamentos`)

| Tabela | Para quê |
| ------ | -------- |
| `user`, `session`, `account`, `verification` | better-auth (iguais ao Sistema Pralis) |
| `empresas` | empresa; `dados_importados_em` marca a importação inicial |
| `perfis_usuarios` | usuário → empresa, nome, papel (`administrador` / `usuario`), ativo |
| `usuarios_auditoria` | só INSERT: quem criou, alterou ou definiu senha de quem, e quando |
| `documentos` | versão atual de cada chave por empresa (`valor` texto, `versao` ≥ 1) |
| `documentos_historico` | só INSERT: gravada, conflito, substituida_pelo_servidor, removida |
| `projecoes` | situação de cada assunto (ok / falha + mensagem), versão de cada documento usado e versão da regra |
| `fin_grupos`, `fin_tipos_venda`, `fin_bandeiras`, `fin_operadoras`, `fin_taxas`, `fin_transferencias` | financeiro; % e tarifa (R$) exatamente como a tela grava, com até 4 casas; chave da taxa = operadora + bandeira + posição; EXCLUDE de vigência/parcela sobreposta |
| `contas` | contas por nome (como a tela), situação ATIVA/INATIVA |
| `cargos`, `salarios_vigencias`, `salarios_valores` | catálogo de cargos (referência + locais) e salários em reais, exatos como a tela grava |
| `perfis_areas`, `perfis_requisitos`, `perfis_cargos`, `perfis_cargos_requisitos` | ficha de cargos |
| `locais`, `locais_transferencias` | Área › Setor › Local › Sublocal |
| `organograma_posicoes`, `organograma_versoes` | organograma |
| `icones_personalizados`, `cores_personalizadas` | identidade visual cadastrada |
| `lancamentos`, `lancamentos_itens`, `lancamentos_recorrencias` | Lançamentos (fonte da verdade): reais numeric(14,2), conta em centavos, itens com rateio, séries |

## O que este backend NÃO faz (de propósito)

- As telas continuam gravando no `localStorage` e sincronizando; as tabelas são derivadas (decisão de
  03/11/2026: não reescrever os arquivos que o Rodrigo edita todos os dias).
- Cadastro completo (CPF) fica só no aparelho até a decisão P-11.
- Referências que a tela guarda por nome (conta na taxa, cargo no organograma) continuam por nome.
