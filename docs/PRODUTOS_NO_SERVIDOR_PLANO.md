# Produtos no servidor — plano para aprovação (Zé e Marco)

> **Status:** plano **aprovado pelo Zé em 09/11/2026** (de acordo também com o Marco, segundo o Zé), **nada implementado**.
> É **melhoria**, sem urgência: a PR #45 já resolve o pedido do Rodrigo com o armazenamento de hoje. Responde à P-24 (doc 11).
> Depende da PR #45 (importação do app de produtos), que já põe os 7.214 produtos da TNP no S2 do jeito atual.

## 1. Por que

Hoje cada parte do S2 é um **documento** (um bloco de texto JSON por chave). O navegador guarda uma cópia
completa de cada um e o servidor guarda o mesmo bloco em `documentos`. Os produtos moram dentro do
`cicluz-compras-v1`, e os inativos ficam compactados em `cicluz-produtos-arquivo-v1`. Isso funciona hoje
(2,8 MB de ~5 MB do navegador), mas tem quatro limites:

1. **Teto de tamanho:** são 4 MB por documento (`TAMANHO_MAXIMO_DOCUMENTO`) e ~5 MB por site no navegador.
   O catálogo cresce e divide esse espaço com Agenda, Produção, pessoas etc.
2. **Peso de cada gravação:** qualquer mudança no Compras (um pedido, uma cotação) reenvia o bloco
   inteiro, de 2,2 MB, e grava uma versão inteira no histórico.
3. **Código interno sem garantia entre aparelhos:** dois aparelhos criando produto ao mesmo tempo podem
   gerar o mesmo código. Só o servidor consegue garantir que não se repete.
4. **Busca e filtro no aparelho:** com 7 mil itens funciona, mas não escala.

## 2. O que muda (visão)

| Hoje | Depois |
|---|---|
| Produtos dentro do `cicluz-compras-v1` + arquivo compactado | **Tabela `produtos`** no Postgres, por empresa |
| A tela filtra a lista inteira no aparelho | A tela pede **uma página** à API (busca, filtros, ordenação, contagens de alerta) |
| Código interno calculado no aparelho | Código interno gerado **no servidor**, numa transação, sem repetir |
| Importação grava o documento | Importação manda os produtos em **lotes** para a API, que grava sem duplicar |
| Saldo e movimentos no produto e no Compras | **Continuam no `cicluz-compras-v1`** (fase 1), ligados pelo id do produto |

O id do produto **não muda** (`pi-<código>`, `p-…` dos cadastrados no S2). Pedidos, catálogo, movimentos,
fichas da Produção e tudo o que aponta para `produtoId` continuam valendo.

## 3. Tabela (SQL proposto — NÃO aplicado; migration só com aprovação)

```sql
-- 0006_produtos.sql (proposta)
create table produtos (
  empresa_id        uuid        not null references empresas(id),
  id                text        not null,              -- mesmo id de hoje (pi-13001, p-xxxx)
  codigo_interno    text        not null,              -- código do PDV
  codigo_barras     text,
  nome              text        not null,              -- nome do catálogo
  descricao         text        not null,
  marca             text,
  tipo              text        not null check (tipo in ('revenda','transformacao')),
  status            text        not null check (status in ('ativo','inativo')),
  liberado_compra   boolean     not null default true,
  grupo_id          text,                              -- item de fin_grupos (sem FK: tabela derivada)
  subgrupo_id       text,
  local_id          text,                              -- nó de locais (sem FK: tabela derivada)
  custo             numeric(14,2),                     -- 2 casas (decisão do Zé, 09/11/2026)
  margem            numeric(9,6),                      -- fração (0,35 = 35%)
  preco_venda       numeric(14,2),
  calculo_automatico boolean    not null default false,
  dados             jsonb       not null default '{}', -- resto do cadastro: embalagem, medidas, estoques mín/máx,
                                                       -- locais de venda, fiscal, transformação, promoções,
                                                       -- conversões, origemApp, vinculoManual, foto
  app_id            text,                              -- id da BASE no app de produtos
  app_loja_id       text,                              -- id da cópia TNP no app
  criado_em         timestamptz not null default now(),
  criado_por        uuid,
  atualizado_em     timestamptz not null default now(),
  versao            integer     not null default 1,     -- para recusar gravação em cima de versão velha
  primary key (empresa_id, id),
  unique (empresa_id, codigo_interno),
  unique (empresa_id, app_id)
);
create index produtos_busca on produtos (empresa_id, status, nome);
create index produtos_barras on produtos (empresa_id, codigo_barras);
create index produtos_grupo on produtos (empresa_id, grupo_id, subgrupo_id);

-- Maior código já usado (app + S2), para o próximo nunca repetir código do PDV.
create table produtos_codigo (
  empresa_id uuid primary key references empresas(id),
  ultimo     integer not null
);
```

**Por que uma parte vai em `dados` (jsonb):** são cerca de 60 campos e a maioria só é lida e gravada pela tela.
Em coluna própria fica só o que **busca, filtra, ordena, garante unicidade ou é dinheiro**. Assim a migration
fica pequena e a tela continua com o mesmo formato de produto.

## 4. API (`servidor/api/src/produtos/`, padrão controller → service → repository, contratos em `shared/`)

| Rota | Para quê | Permissão |
|---|---|---|
| `GET /api/produtos?busca=&status=&tipo=&grupo=&vinculo=&ordem=&pagina=` | Página da lista, total e contagens (sem grupo, sem local, pendentes) | `compras_visualizar` |
| `GET /api/produtos/resumo` | Lista **leve** dos ativos (id, código, nome, unidade, grupo, preço), usada por Compras, Produção e estoque | `compras_visualizar` |
| `GET /api/produtos/:id` | Produto completo para o formulário | `compras_visualizar` |
| `POST /api/produtos` | Cria; o servidor gera o código interno | nova: `produtos_editar` |
| `PUT /api/produtos/:id` | Edita (com `versao`; versão velha → 409 com mensagem) | `produtos_editar` |
| `POST /api/produtos/importacao` | Lote de até 500 produtos do app; grava sem duplicar (por `app_id`, senão código) | `produtos_importar` (administrador) |
| `POST /api/produtos/revincular` | Refaz grupo e local por nome onde o vínculo não é manual | `produtos_importar` |

Regras puras (casar grupo e local, mesclar, próximo código) **saem de `dist/compras/produto-importacao.js` para
`servidor/shared/`** e são usadas pela API. Ficam num lugar só.

## 5. Telas

- Um módulo único `CicluzProdutos` no front passa a ser **a única porta** para produto: busca paginada, resumo
  em memória (carregado uma vez por sessão e atualizado após cada gravação) e gravação pela API.
- **MER - Produtos** usa a página da API, e os filtros e chips continuam iguais.
- **Compras** (pedido, cotação, recebimento, contagem), **Produção** e **estoque** trocam `S.dados.produtos` pelo
  resumo. Saldo e movimentos continuam no `cicluz-compras-v1`.
- **Sem internet (decidido: precisa funcionar):** o resumo dos ativos fica guardado no aparelho; a lista completa usa a API.

## 6. Migração dos dados (sem perder nada)

1. Um script no servidor (`scripts/produtos-dos-documentos.ts`) lê, por empresa, o `cicluz-compras-v1 › produtos`
   e o `cicluz-produtos-arquivo-v1`, e grava na tabela com os mesmos ids. É idempotente: rodar de novo não duplica.
2. Ele confere a contagem antes e depois e para se algum produto não entrar.
3. O front ganha uma flag nova: depois que a migração estiver confirmada, os produtos saem do `cicluz-compras-v1`
   e o arquivo compactado é aposentado. Isso vai numa entrega **separada**, só depois de comprovar que a tabela
   tem tudo.

## 7. Testes

- **Integração** (Postgres real, como os de hoje): criar, editar, listar com filtro, outra empresa não enxerga,
  código interno sem repetir com duas criações ao mesmo tempo, importação repetida sem duplicar, versão velha
  recusada, permissão negada.
- **Telas** (Playwright, com o servidor de teste): MER - Produtos paginada e Compras/Produção lendo o resumo.
- **Migração:** documento real de teste (fictício) → tabela → contagem igual.

## 8. Fases e estimativa

| Fase | Entrega | Estimativa |
|---|---|---|
| 1 | Tabela + API + regras no `shared/` + testes de integração — **feita em 09/11/2026** (migration 0006, `api/src/produtos/`, `shared/src/produtos.ts`; 8 testes de integração + 5 de unidade) | 1,5 dia |
| 2 | MER - Produtos e importação pela API — **feita em 09/11/2026** (`dist/compras/produtos-api.js`; formulário, lista, inativar em lote, importação e revincular pela API no modo servidor) | 1 dia |
| 3 | Compras, Produção e estoque lendo o resumo — **feita em 09/11/2026** (`S.dados.produtos` = resumo dos ativos do servidor + estado da loja do aparelho; as telas não mudaram) | 1 dia |
| 4 | Migração dos documentos + aposentar produtos do documento — **transferência feita** (automática no 1º aparelho de administrador: `POST /api/produtos/transferencia` + conclusão só se todos chegaram; depois o documento guarda só o estado da loja e o arquivo de inativos sai). **Fase 4 feita em 09/11/2026:** o modo antigo de GRAVAR saiu (formulário, inativar, importação e revincular só pela API; nada mais grava produto no documento nem no arquivo compactado); a regra do código interno ficou só no servidor; produto antigo sem código ganha o próximo na transferência; os testes de produtos rodam com a API real (`npm run test:telas-api`) e há `npm run local:api` para revisar localmente. **Concluído em 23/11/2026:** publicado (PR #65 + redeploy da API), transferência feita no ar; a chave `cicluz-produtos-arquivo-v1` saiu do servidor e a leitura do arquivo antigo (`lerArquivoAntigo`, `descompactar`) saiu do código. Aparelho que ainda tiver a cópia local a apaga ao abrir conectado. O documento antigo que ficou no banco não é lido nem gravado (apagá-lo seria uma operação no banco, não feita). | 0,5 dia |
| — | Publicar a API (com a migration) e o site; conferir no ar | com o Marco |

Cada fase é uma PR própria, com o caminho antigo removido na mesma entrega em que o novo passa a valer.

## 8a. Como ficou (fases 1 a 3, 09/11/2026)

- **Modo servidor** só quando o servidor diz que o catálogo está lá (`GET /api/produtos/resumo` → `ativado`). Antes disso, tudo segue
  como era (inclusive em sessão local de teste, sem API).
- **Transferência** (uma vez): o primeiro aparelho de administrador conectado manda os produtos do aparelho (Compras + arquivo de
  inativos, sem os 19 de exemplo) em lotes; o servidor só insere o que não existe; o catálogo passa a valer num pedido final de
  conclusão, que a tela só faz se **todos** chegaram. Se faltar algum (ex.: código interno repetido), nada muda e o administrador vê o aviso.
- **Resumo dos ativos** (cadastro completo) guardado no aparelho em `cicluz-produtos-resumo-v1` (não sincronizado): a loja vê e usa
  os produtos sem internet. O documento `cicluz-compras-v1` passa a guardar por produto só `saldo, vendas3m, compras3m, lucro3m`.
- **Inativos**: só pela listagem paginada da API (botão "Inativos" do cabeçalho da lista, desde a lista sem filtros de 17/11/2026).
- **Ambiente de teste de tela com a API real**: `npm run test:telas-api` (precisa do Docker).
- **Teto de pedidos** da API passou a valer só para `/api/` (os arquivos do site, servidos só no modo servidor único local, não contam).

## 9. Decisões (Zé, 09/11/2026)

- **Tabela e API:** de acordo (Zé e Marco).
- **Sem internet:** a loja vê os produtos sem internet. O resumo dos ativos fica guardado no aparelho e se atualiza
  quando há conexão; a lista completa (inativos, busca no catálogo inteiro) usa a API.
- **Permissões:** as de Compras que já existem. `compras_visualizar` para ver; para criar, editar e inativar, quem pede, cota,
  aprova ou recebe (`compras_solicitar`, `compras_cotar`, `compras_aprovar`, `compras_receber`); importar do app e revincular,
  só o administrador. **Confirmado pelo Zé em 23/11/2026.**
- **Dinheiro:** custo com **2 casas** (`numeric(14,2)`) e preço de venda com 2. Atenção na migração: custos do app com
  mais de 2 casas precisam de uma regra de arredondamento aprovada antes (fórmula de dinheiro: perguntar).
- **Quando:** como melhoria, depois que o Rodrigo montar a árvore de locais e revisar os grupos.

## 9a. Perguntas originais (respondidas acima)

1. **Marco:** de acordo com a tabela `produtos` e com a API acima? Tem algo em andamento no backend que conflite?
2. **Sem internet:** a loja precisa ver produtos sem internet? Se sim, o resumo dos ativos fica guardado no
   aparelho (~0,5 MB).
3. **Permissões:** criar `produtos_editar` e `produtos_importar` nos cargos de acesso, ou usar as de Compras que
   já existem?
4. **Dinheiro:** manter `custo` com 4 casas, como o app grava, e `preco_venda` com 2?
5. **Ordem:** fazer isto já, ou depois de o Rodrigo montar a árvore de locais e revisar os grupos?
