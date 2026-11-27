# RAIO-X DO SISTEMA — CICLUZ · Gestão de Padaria

> Memorial técnico e de negócio de todo o sistema, lido **direto do código** em 27/11/2026 (commit-base `be801d1`, branch `feat/hierarquia-area-cargo-pessoa-20261124`; o `main` publicado está em `c58dd2a`).
> Feito para servir de **memória** a um assistente (Claude conversa) e a quem entrar no projeto.
> Quando este documento e o código discordarem, **o código vence**. Onde não foi possível confirmar no código está escrito "não confirmado".
> Não contém dado real de pessoa, conta, senha ou valor: só nomes de campos e exemplos genéricos.

## Como ler

| Parte | Responde |
| --- | --- |
| 0 · Abertura (esta) | o que é o sistema, glossário, mapa geral das ligações, onde os dados moram, o que é real × demonstração, problemas encontrados |
| A · Navegação, telas e sessão | árvore completa de menus, cartões, rotas, cores, cabeçalho/rodapé, login e envio ao servidor |
| B · Cadastros financeiros e de estrutura | grupos VND/DES/MER/RET, tipos de venda, bandeiras, operadoras e taxas, computadores, contas, locais, hierarquia, organograma, ícones |
| C · Gestão de Pessoas | do candidato à folha: cadastro simples e completo, exames, período de teste, ativação, cargos e salários, escalas, uniformes, ocorrências, documentos, ponto, folha |
| D · Compras, Mercadorias e cadastros de Venda | produtos, unidades, fornecedores, catálogo, agenda de compra, pedido, cotação, recebimento, estoque, conferência, clientes, contratos, horário de funcionamento |
| E · Operação do dinheiro | lançamentos DES/MER/RET, transferências, caixa (abertura → fechamento), tesouraria, gerência, vendas dos PDVs, comandas, extrato |
| F · Produção, Agenda, Configurações e backend | fichas técnicas, custos, mapa de produção, patrimônio, agenda, usuários e acessos, empresa, servidor (API, tabelas, login) |

Documentos de apoio no repositório: `PROJECT_BRAIN/` (00 a 16; **datados**, parte deles de 03/11/2026), `DESIGN_SYSTEM.md` (regras visuais vigentes, seções 28 a 34 são as mais recentes), `CLAUDE.md` e `AGENTS.md` (regras de trabalho), `UI_CHANGE_PROCESS.md`.

## O que é o sistema

- **CICLUZ · Gestão de Padaria** é o sistema de gestão de uma padaria (dono: Rodrigo). É um **site** (HTML/CSS/JS estático em `dist/`, sem etapa de build) publicado na Vercel (`https://pralis-sistema.vercel.app`), mais um **servidor** próprio (`servidor/`: Fastify + Drizzle + PostgreSQL + Zod + better-auth; app Nuxt em `/app/`; deploy no Coolify, a Vercel repassa `/api` e `/app`).
- Existe um **Sistema Pralis** "principal" (em produção, de outra equipe) de onde vêm vendas dos PDVs, comandas e regras de lançamento; o CICLUZ lê alguns dados dele ao vivo (Vendas dos PDVs, Comandas, Extrato TNP via Pluggy) e copia a estrutura de backend dele.
- **Público**: dono/gestão, DP (departamento pessoal), compras, estoque, produção, tesouraria e operadores de caixa — com permissões por cargo de acesso e por tela.
- **Aparelho principal**: iPad (os dados digitados lá são tratados como sagrados — mudança de formato exige migração sem perda).

## Glossário (origens e siglas)

| Sigla | Significado | Cor |
| --- | --- | --- |
| **VND** | Entradas · Vendas / Faturamento | amarelo `#eab308` |
| **CNT** | Contas e Transferências (bancos, cofres, caixas) | laranja `#f97316` |
| **DES** | Saídas · Despesas / Custos (inclui Gestão de Pessoas) | vermelho `#ef4444` |
| **MER** | Saídas · Mercadorias / CMV (compras, estoque) | verde `#22c55e` |
| **RET** | Saídas · Retiradas / Investimentos (patrimônio) | azul `#2563eb` |
| RES, CAR, PDV, Configurações, Agenda | Resultados, Cargos, PDV, configurações | roxo `#7c3aed` |

Outros termos: **PDV** (ponto de venda/computador do caixa), **MDR** (taxa da maquininha), **ASO** (atestado de saúde ocupacional), **CBO** (código de ocupação do cargo), **TACO** (tabela brasileira de composição de alimentos), **P-NN** (decisão pendente numerada no `PROJECT_BRAIN/11_DECISOES_PENDENTES.md`).

## Mapa geral das ligações (quem depende de quem)

```
ESTRUTURA
  Empresa (Matriz + filiais) ── Área › Setor › Local (location-tree) ── Hierarquia Área › Cargo › Colaborador
                                         │
CADASTROS FINANCEIROS                    │
  Grupos/Subgrupos VND · DES · MER · RET │
  Tipo de Venda ── Bandeira ── Operadora (máquinas, custos) ── Taxa por vigência ──► Grupo DES + Conta (pelo NOME)
  Computador/PDV ──► Subgrupo de Vendas (VND)            Conta CNT (banco/cofre/caixa) — SEM id próprio, ligada pelo nome
                                         │
GESTÃO DE PESSOAS                        │
  Pessoa (CANDIDATO/ATIVO/INATIVO) ── Cargo (salário por vigência, CBO) ── Setor/Local
     ├─ Exame admissional (APTO) ─► Período de teste ─► Cadastro completo (dependentes) ─► Ativação pelo DP (+ acesso)
     ├─ Horário/Escala · Uniformes · Ocorrências · Documentos · Ponto (importação) · Folha (importação contabilidade)
     └─ (nada de Gestão de Pessoas gera despesa automaticamente)
                                         │
COMPRAS / ESTOQUE (MER)                  │
  Produto ── Grupo MER ── Unidade (pela SIGLA) ── Fornecedor (vínculo/catálogo, preço-base) ── Contrato
  Agenda de compra ─► Pedido ─► Cotação (fornecedores respondem; compra automática) ─► "Comprado" ─► Recebimento ─► Estoque/Extrato
  Estoque ◄─► Produção (consumo de ingredientes, produção pronta, abastecimento, sobra)
VENDAS (VND)
  Cliente (4 modalidades) ── Contrato de cliente      Horário de Funcionamento (nome, identificador, faixas de dias/horas)
  Vendas dos PDVs / Comandas / Extrato TNP — só leitura ao vivo do sistema principal / Pluggy (nada é guardado nem conciliado)
DINHEIRO
  Lançamento DES/MER/RET (API real) ── Grupo (por ID, nos itens) ── Conta (pelo NOME)
  Transferência CNT (só confere, não grava) · Caixa/Tesouraria/Gerência (demonstração, memória)
PRODUÇÃO
  Ficha técnica ── Produto (do Compras) ── Ingredientes (estoque; TACO ainda não ligada) ── Equipamento (Patrimônio) ── Cargo (mão de obra)
  Pedido da loja ─► Ordem de produção ─► Mapa ─► Abastecimento ─► Fechamento
AGENDA / ACESSOS
  Compromisso ── pessoa/usuário ── tela vinculada (tarefas criadas pelas telas)
  Usuário ── Cargo de acesso ── Permissões por tela (Área › Cargo › Colaborador: o mais específico vence)
```

Os detalhes de cada seta (campo, id ou nome, arquivo) estão nas partes B a F.

## Onde os dados moram

- **No aparelho (localStorage)** e, para as chaves listadas em `servidor/shared/src/documentos.ts` (cerca de 30 chaves, lista fechada), **sobem ao servidor** em lote "tudo ou nada" pelo porteiro `dist/cicluz-sessao.js` + `dist/cicluz-sync.js` (versão por chave; 409 = outro aparelho gravou antes; 401 = sessão vencida, a fila fica no aparelho; sem rede tenta de novo em 5 s, 15 s e a cada 60 s). Ao sair, as chaves sincronizadas são apagadas do aparelho depois de enviar a fila.
- **Só no aparelho** (não sobem): entre outras, quase todo dado de pessoa (pessoas, cadastro completo, ponto, folha, ocorrências, uniformes, documentos, escalas), `cicluz-org-seed-v1`, `cicluz-hierarquia-v1`, `cicluz-acessos-telas-v1`, `cicluz-referencias-pagamento-v1`, `cicluz-horarios-funcionamento-v2`, imagens/áudios do patrimônio (IndexedDB).
- **Direto na API/banco**: lançamentos DES/MER/RET, produtos (com resumo local `cicluz-produtos-resumo-v1`), Agenda inteira (tabelas `agenda_*`), usuários, senhas, postos do caixa e cargos de acesso.
- Documento único do módulo Compras: `cicluz-compras-v1` (coleções de fornecedores, pedidos, cotações, estoque, clientes, contratos, empresa, salário mínimo… com 6 migrações marcadas). Produção: `cicluz-producao-v1`, `cicluz-taco-v1`, `cicluz-patrimonio-v1`.
- Lista completa de chaves, formatos e versões: partes B a F.

## O que é real e o que é demonstração (estado em 27/11/2026)

| Grava de verdade | Demonstração / só confere / só lê |
| --- | --- |
| Cadastros financeiros (grupos, tipos de venda, bandeiras, operadoras, taxas, contas, computadores, locais) | Caixa inteiro: abertura, turno, sangria, fechamento em 4 etapas, Tesouraria, Gerência, Fechamentos (dados fictícios em memória) |
| Lançamentos DES/MER/RET (API) | Nova Transferência CNT (confere e avisa "não gravado", P-48) |
| Compras: produtos, fornecedores, pedidos, cotação, recebimento, estoque, conferência, clientes, contratos | Vendas dos PDVs, Comandas CREARE, Extrato TNP (leitura ao vivo, nada guardado) |
| Gestão de Pessoas (no aparelho; parte sobe) | Envio por WhatsApp, links de fornecedor, assinatura digital (simulados) |
| Produção, Patrimônio, Agenda, Acessos | Entrevistas (tela reservada; `interviews.js` não é carregado) |

## Problemas e lacunas encontrados no raio-x (para decidir)

1. **Conta (CNT) sem id**: contas são ligadas pelo **nome** em lançamentos, taxas das operadoras e transferências — contraria a regra "vínculo por ID".
2. **Outros vínculos por nome/posição**: unidade de produto (sigla), área de estoque, locais/setores de venda, cargo ↔ salário vigente (posição + nome), ficha de cargos e uniformes (nome + CBO), horas extras, referência de pagamento por setor, empresa do exame, computador ↔ PDV do sistema principal (nome); ponto e folha casam a linha importada por CPF e, sem CPF, pelo nome; chave `local:N` dos cargos criados localmente depende da ordem da lista.
3. **Ids de seed repetidos** (`g0…`) entre Despesas, Mercadorias e Vendas.
4. **Excluir com transferência** não refaz os vínculos de outros cadastros; uma taxa ligada a um grupo DES excluído trava a gravação do financeiro no servidor.
5. **Operadora**: tarifa e custos das máquinas em reais com casas decimais (não em centavos); maquininha do Caixa é uma lista fixa no código, sem ligação com as Operadoras.
6. **Telas prontas sem cartão no menu** (só por rota): Prestadores, Contratos, Documentações, Horas Extras, Referências de Pagamento, Folhas Conplus, **Gerência de Caixas** e **CNT - Tesouraria** (sem elas, ninguém confere o retorno final do caixa pela navegação normal) — e outras de Gestão de Pessoas (10 telas com rota e sem item de menu).
7. **Gestão de Pessoas**: data de admissão e RG nunca são gravados (outras telas os leem); Cadastro Completo gravado em dois lugares; resultado do exame com dois caminhos (Registrar Resultado ou ASO); datas DD/MM/AA e DD/MM/AAAA convivendo; nada gera despesa ou desconto; projetado da folha sempre vazio; o ponto ignora a Escala Individual e não lê AFD.
8. **Dinheiro**: nada concilia extrato, vendas e lançamentos; o Caixa não usa as vendas reais; Lançamentos não gravam credor, fotos e IA (P-47); DES/MER sem campo Grupo no cabeçalho (só nos itens); RET não registra pagamento pela tela.
9. **Produção**: custo de mão de obra lê o campo "valor" da ficha do cargo e não o salário por vigência; ingredientes TACO não ligados às fichas; permissões de Produção não conferidas nas telas.
10. **Acessos**: as 8 permissões por tela ainda não bloqueiam telas (só decidem se a conta com colaborador entra); não há tela para criar cargos de acesso nem exceções por pessoa (só na API).
11. **Cliente** sem vínculo com grupo VND; regra de qual horário de funcionamento vence quando dois valem no mesmo dia ainda pendente (P-49).
12. **Documentação**: `PROJECT_BRAIN/02` e `/14` estão desatualizados em relação ao menu atual.

## Regras de trabalho do projeto (resumo de `CLAUDE.md`)

Nada é pronto enquanto o caminho antigo existir · fonte única (tokens de `ui-foundation.css`, validação de `field-validation.js`, datas de `date-fields.js`) · nenhum `!important` novo, `<style>` inline novo ou `MutationObserver` para estilo · dados do iPad são sagrados (migração com flag) · vínculo por ID · nunca inventar regra de negócio · parar e perguntar antes de fórmula de dinheiro, migration, mudança em massa de dados salvos e publicação · commit por passo · nunca gravar dado real de pessoa em seed, teste, print ou log · conferir em 320/390/1024, claro e escuro.

---


---

# Raio-x A — Navegação, mapa de telas e sessão

Sistema: **CICLUZ · Gestão de Padaria** (site estático em `dist/`, sem build; backend em `servidor/`).
Lido do código no commit `be801d1` (branch `feat/hierarquia-area-cargo-pessoa-20261124`), em 27/11/2026.
Regra deste documento: **o código vence a documentação antiga**. O que não deu para confirmar no código está marcado
"não confirmado". Nenhum dado real de pessoa foi copiado.

---

## 0. Onde a navegação mora (arquivos)

| Peça | Arquivo | O que faz |
| --- | --- | --- |
| Menu (fonte única das áreas, sub-áreas e cartões) | `dist/index.html` (script inline, linhas ~153–245) | `sections`, `menuTree`, `menuColor`, `menuCardsOf()`, `openSection()`, `route()`, `showTiGroup()`, `showJobs()`, `showSalaryUpdate()`, `showConfig()`, `addShortcuts()`, tema Luz/Sombra, `window.CicluzMenu` |
| Grupo Agenda/Entrevistas/Avaliações e divisórias GESTÃO / AGENDA / CONFIGURAÇÕES | `dist/agenda-menu.js` | Cria os itens de menu da Agenda, Entrevistas e Avaliações e os títulos recolhíveis das três seções |
| Rotas (`#/…`) | `dist/rotas.js` (último script do `index.html`) | Grava o caminho dos cliques no endereço, Voltar do navegador, F5 reabre a tela |
| Menu como gaveta + botão "Menu inicial" | `dist/mobile-menu.js` | Abre/fecha o menu lateral por cima do conteúdo |
| Layout do menu, rodapé do menu (usuário/Sair), busca do menu, seleção | `dist/navigation-layout.js` | Ver seção 3 |
| Rolagem do menu ao abrir um grupo | `dist/menu-reveal.js` | Garante que o grupo aberto fique visível |
| Ordem dos cartões (arrastar ⠿) | `dist/menu-order.js` | Guarda em `cicluz-menu-item-order-v1` |
| Cabeçalho padrão das telas | `dist/header-normalize.js`, `dist/header-save.js`, `addShortcuts()` no `index.html`, `criarTela()` em `dist/compras/ui.js` | Ícone, título/caminho, Voltar, Fechar, ✓ Salvar |
| Barra de baixo (rodapé de toda tela) | `dist/people-header-pilot.js` | Atalhos, busca, A/Z, período, +, agendar, Voltar, Fechar, ✓, três pontos |
| Sessão (porteiro) | `dist/cicluz-sessao.js` | Barra quem não entrou; sobe o localStorage para o servidor |
| Núcleo de sincronização | `dist/cicluz-sync.js` | API, fila de pendentes, envio em lote |
| Entrada | `dist/entrar.html`, `dist/entrar.js`, `dist/entrar-tema.js`, `dist/entrar-luz.js`, `dist/entrar.css` | Login, importação inicial, troca dos dados do aparelho, Sair |
| Lista de chaves sincronizadas (fonte única) | `servidor/shared/src/documentos.ts` | `CHAVES_SINCRONIZADAS`, `CHAVES_ADOTADAS_DO_APARELHO` |

Ordem de carga relevante no `index.html`: `cicluz-sync.js` → `cicluz-sessao.js` (logo depois dos CSS, antes de tudo) →
… `groups.js` … `agenda-menu.js` … `mobile-menu.js` → `marca-luz.js` → `navigation-layout.js` → `menu-reveal.js` →
`header-save.js` … `people-header-pilot.js` … módulos (`compras/`, `lancamentos/`, `transferencias/`, `producao/`,
`agenda/`, `caixa/`, `acessos/`, `vendas-pdv/`, `comandas-creare/`, `extrato-tnp/`) → **`rotas.js` por último**.

---

## 1. Árvore completa do menu

### 1.1 Como a árvore é montada

- `sections` (index.html) define 7 grupos na ordem: índice 0 Entradas, 1 Transferências, 2 Saídas·Despesas, 3 Saídas·Mercadorias,
  4 Saídas·Retiradas, 5 Resultados, 6 Configurações. Cada um vira um `<details data-menu-name="…">`; o texto antes de " · " é o
  nome grande e o depois é a linha pequena (ex.: "Entradas" / "Vendas / Faturamento").
- Cada nome da lista de sub-áreas vira um botão. Clicar chama `openSection(nomeDoGrupo, subArea, 'tree'|'empty', cor)`, que mostra
  a tela `#sector-view` com a grade de cartões de `menuCardsOf(índice, subÁrea, 'tree')`.
- `menuCardsOf` junta: os cartões fixos de `menuTree[índice][subÁrea]` **mais** os cartões que os módulos publicam
  (Compras, Produção, Caixa, Vendas PDV, Comandas, Extrato TNP, Configurações). Sub-área sem cartão mostra o texto
  *"Área prevista na estrutura do sistema. As opções deste setor serão definidas nas próximas etapas."*
- Cada cartão é `[título, descrição, alvo]`. O clique no cartão é um `if/else` grande dentro de `openSection` (index.html
  linha 241) que decide a função a chamar pelo **alvo** (a "chave de rota").
- `agenda-menu.js` acrescenta, antes de Configurações: **Agenda** (grupo), **Entrevistas** (item direto) e **Avaliações**
  (grupo), e separa o menu em três seções com título recolhível: **GESTÃO**, **AGENDA**, **CONFIGURAÇÕES**
  (estado aberto/fechado em `cicluz-sidebar-sections-v1`).
- **Visão Geral** é um botão no topo da árvore (`overview-link`) que mostra a tela `#overview`.
- O menu **não** esconde itens por permissão: não há no código filtro de cartões por `permissoes` (o Acesso por Tela ainda
  é esboço sem efeito; ver 1.10). As permissões valem na API.

### 1.2 Como identificar o tipo de cada tela (critério usado neste documento)

- **Real (grava no aparelho e sobe ao servidor)**: a chave do localStorage está em `CHAVES_SINCRONIZADAS`.
- **Real (grava só no aparelho)**: grava em localStorage/IndexedDB com chave fora da lista sincronizada.
- **Real (servidor)**: lê/grava pela API (`/api/...`) e não guarda dado de negócio no aparelho.
- **Demonstração**: o próprio arquivo diz "dados fictícios / nada é gravado" (ex.: Caixa).
- **Em construção / esboço**: o arquivo diz "em construção", "esboço", "em definição", "não grava".
- **Vazio ("Área prevista…")**: alvo `vz-…` sem tratamento próprio → abre `openSection(...,'empty')` com o texto acima.

### 1.3 Chave de rota `vz-…`

`vz(título, lista)` gera `'vz-' + lista + '-' + slug`, onde lista é `lan` (lançamento), `rel` (relatório), `est` (estoque) ou
`doc` (pasta de documentos). O slug **não tira acento direito**: a letra acentuada vira "letra + hífen"
(ex.: `CNT - Transferências` → `vz-lan-cnt-transfere-ncias`; `DES - Admissão / Contratação` → `vz-lan-des-admissa-o-contratac-a-o`).
Só 5 alvos `vz-` têm tela própria: `vz-lan-vnd-vendas` (Caixa), `vz-lan-cnt-transfere-ncias` (Transferências),
`vz-lan-des-despesas`, `vz-lan-mer-mercadorias`, `vz-lan-ret-retiradas` (`appLancamentos` → `CicluzLancamentos`).
Todos os outros `vz-` são **vazios** ("Área prevista…"), com o caminho "Grupo / Sub-área / Cartão" no cabeçalho.

---

### 1.4 SEÇÃO GESTÃO

#### Visão Geral
- Botão `overview-link` → `route('overview')` → `#overview`, título **"Visão Geral PRALIS"**, subtítulo "Resumo da operação.",
  texto "Esta área reunirá os principais números de despesas, loja, produção e pessoas."
- Tipo: **em construção** (só texto fixo, `dist/index.html` linha 144). Rota `#/visao-geral`.

#### 0 · Entradas — "Vendas / Faturamento" (cor `#eab308`, rota `entradas-vendas`)

| Sub-área | Cartão (título exato) | Descrição exata | Alvo / função | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Lançamentos | VND - Vendas | (vazia) | `vz-lan-vnd-vendas` → `CicluzCaixa.abrir('vendas')` | `dist/caixa/vendas.js` (+ `abertura.js`, `turno.js`, `fechamento*.js`, `modulo.js`) | **Demonstração** ("Dados FICTÍCIOS, em memória: nada é gravado"; aviso na tela). Tela com 3 etapas: Abertura de caixa, Turno do caixa, Fechamento de caixa |
| Relatórios | VND - Vendas | (vazia) | `vz-rel-vnd-vendas` | — | Vazio |
| Relatórios | VND - Fechamentos de Caixa | Fila, histórico, dossiê e conferência | `caixa:fechamentos` → `CicluzCaixa.abrir('fechamentos')` | `dist/caixa/fechamentos*.js` | **Demonstração** (casca do Caixa, estado em memória) |
| Cadastros Geral | VND - Clientes | (vazia) | `compras:clientes-vnd` → `CicluzComprasClientes.abrir()` | `dist/compras/clientes.js` | Real, sincronizado (`cicluz-compras-v1` → `clientes`). O "link de cadastro" é simulação (`compras/convite-link.js`: só funciona no mesmo navegador) |
| Cadastros Geral | VND - Grupos de Vendas | (vazia) | `ti-vendas` → `showTiGroup('vendas')` → `showFinancialGroup` | `dist/groups.js` | Real, sincronizado (`cicluz-financial-hierarchy-v1`) |
| Cadastros Geral | VND - Tipos de Venda | (vazia) | `ti-tipos-venda` | `dist/groups.js` | Real, sincronizado (idem) |
| Cadastros Geral | VND - Tipos de Bandeiras Cartões | (vazia) | `ti-bandeiras` | `dist/groups.js` | Real, sincronizado (idem) |
| Cadastros Geral | VND - Tipos de Operadoras Cartões | (vazia) | `ti-operadoras` | `dist/groups.js` + `dist/financeiro/operadoras-etapas.js` | Real, sincronizado (idem; taxas por vigência) |
| Cadastros Geral | VND - Computadores | (vazia) | `ti-computadores` | `dist/groups.js` | Real, sincronizado (idem) |
| Cadastros Geral | VND - Horário de Funcionamento | Horários com nome: dias da semana e feriado, hora de abrir e de fechar | `compras:horario-funcionamento` → `CicluzHorarioFuncionamento.abrir()` | `dist/compras/horario-funcionamento.js` | Real, **só no aparelho** (`cicluz-horarios-funcionamento-v2`, fora da lista sincronizada; v1 convertida uma vez e mantida como cópia). Regra de conflito entre horários: pendente (P-49) |
| Pastas Documentos | VND - Imagens Notas Vendas Lançadas | (vazia) | `vz-doc-…` | — | Vazio |
| Pastas Documentos | VND - Contratos Clientes | (vazia) | `vz-doc-…` | — | Vazio |
| Pastas Documentos | VND - Documentos Clientes | (vazia) | `vz-doc-…` | — | Vazio |
| API | VND - Vendas dos PDVs | Vendas do CREARE ao vivo, por PDV, horário e tipo de pagamento | `vendas-pdv:relatorio` → `CicluzVendasPdv.abrir('relatorio')` | `dist/vendas-pdv/tela.js` (+ `dados.js`, `filtros.js`, `popup.js`) | Real, servidor (`/api/vendas-pdv`; lê a cada 60 s enquanto à vista) |
| API | VND - Vendas / Sistema comandas | Comandas do CREARE ao vivo: abertas, puxadas no caixa, abandonadas e pagas | `comandas-creare:painel` → `CicluzComandasCreare.abrir('painel')` | `dist/comandas-creare/tela.js` (+ `dados.js`, `detalhe.js`) | Real, servidor; **só administrador** (403 → "O painel de comandas é só do administrador.") |

Cartões do Caixa que existem no código mas **não aparecem no menu**: `VND - Gerência de Caixas` ("Monitor, recebimento e
mensagens", grupo `caixa`) e `CNT - Tesouraria` ("Transferências, lacres, conferência e saldo das contas", grupo `tesouraria`)
em `dist/caixa/modulo.js`. `menuCardsOf` só pede `CicluzCaixa.cards('relatorios')`. As telas `gerencia` e `tesouraria` estão
registradas, mas sem cartão (órfãs). Abertura/Turno/Fechamento são abertas por dentro da tela VND - Vendas.

#### 1 · Transferências — "Contas / Locais" (cor `#f97316`, rota `transferencias-contas`)

| Sub-área | Cartão | Descrição | Alvo / função | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Lançamentos | CNT - Transferências | (vazia) | `vz-lan-cnt-transfere-ncias` → `CicluzTransferencias.abrir()` | `dist/transferencias/transferencias.js` | **Em construção**: o arquivo diz "TELA EM CONSTRUÇÃO… o Salvar só CONFERE o preenchimento e avisa que não gravou" (P-48). Lê contas ativas de `/api/contas` |
| Relatórios | CNT - Transferências | (vazia) | `vz-rel-cnt-transfere-ncias` | — | Vazio |
| Cadastros Geral | CNT - Grupos de Contas | (vazia) | `ti-contas` → `showTiGroup('contas')` (versão do `index.html`, tela laranja `account-orange`) + `editAccount()` | `dist/index.html` (linhas 341–372) | Real, sincronizado (`cicluz-ti-groups-v1`, `cicluz-ti-account-details-v1`, seed `cicluz-ti-contas-seed-v1`) |
| Pastas Documentos | CNT - Imagens Notas Transferências | (vazia) | `vz-doc-…` | — | Vazio |
| API | (nenhum) | — | — | — | Vazio ("Área prevista…") |

#### 2 · Saídas — "Despesas / Custos" (cor `#ef4444`, rota `saidas-despesas`)

| Sub-área | Cartão | Descrição | Alvo / função | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Lançamentos | DES - Despesas | (vazia) | `vz-lan-des-despesas` → `CicluzLancamentos.abrir('despesas')` | `dist/lancamentos/lancamentos.js` (+ `regras.js`) | Real, servidor (`/api/lancamentos/...`). Campos "só de tela" (tipo de credor, credor, fotos, bloco de discriminação) avisam que não gravam (P-47) |
| Lançamentos Colaboradores | DES - Despesas Colaboradores | (vazia) | `vz-lan-des-despesas-colaboradores` | — | Vazio |
| Lançamentos Colaboradores | DES - Exames Ocupacionais | Guia AcessaMed+ e exames ocupacionais | `exams` → `showExams()` | `dist/exams.js` (+ `exam-aso.js`) | Real, só no aparelho (registro de Pessoas `cicluz-pessoas-v1`; lista de exames complementares `cicluz-exames-complementares-v1` é sincronizada) |
| Lançamentos Colaboradores | DES - Uniformes Entrega (-) Recebimento (+) | Entregas, vendas, devoluções e estoque | `uniforms` → `showUniforms()` | `dist/uniforms.js` (+ `uniforms-data.js`, `uniforms-stock.js`) | Real, só no aparelho (`cicluz-uniformes-v1`) |
| Lançamentos Colaboradores | DES - Ocorrências | Declarações, faltas, advertências, suspensões e justa causa | `occurrences` → `showOccurrences()` | `dist/occurrences.js` (+ `occurrence-*.js`, `audio-nota.js`) | Real, só no aparelho (`cicluz-ocorrencias-v1`; anexos e campos médicos só na memória) |
| Lançamentos Colaboradores | DES - Período de Teste | Acompanhamento e decisão do DP após o exame APTO | `trial` → `showTrial()` | `dist/trial.js` | Real, só no aparelho (registro de Pessoas) |
| Lançamentos Colaboradores | DES - Ponto Eletrônico Importação | Importar o relógio de ponto e conferir o idealizado com o realizado | `ponto` → `showPontoEletronico()` | `dist/ponto.js` (+ `ponto-conferencia.js`) | Real, só no aparelho (`cicluz-ponto-v1`, fora da sincronização por LGPD/P-11) |
| Lançamentos Colaboradores | DES - Folha de Pagamento Importação Contabilidade | Importar o realizado da folha entregue pela contabilidade | `folha-importacao` → `showFolhaImportacao()` | `dist/folha-custos.js` (+ `folhas-csv.js`) | Real, só no aparelho (`cicluz-folha-custos-v1`, fora por P-11) |
| Lançamentos Colaboradores | DES - Admissão / Contratação | (vazia) | `vz-lan-des-admissa-o-contratac-a-o` | — | Vazio |
| Lançamentos Colaboradores | DES - Demissão / Desligamento | (vazia) | `vz-lan-des-demissa-o-desligamento` | — | Vazio |
| Lançamentos Colaboradores | DES - Capacitação / Desenvolvimento | (vazia) | `vz-lan-des-capacitac-a-o-desenvolvimento` | — | Vazio |
| Relatórios | DES - Despesas | (vazia) | `vz-rel-des-despesas` | — | Vazio |
| Relatórios | DES - Folha de Pagamento | Custo da folha por colaborador: projetado, realizado e diferença | `folha-custos` → `showFolhaCustos()` | `dist/folha-custos.js` | Real, só no aparelho (`cicluz-folha-custos-v1`) |
| Relatórios | DES - Uniformes | (vazia) | `vz-rel-des-uniformes` | — | Vazio |
| Relatórios | DES - Ocorrências | (vazia) | `vz-rel-des-ocorre-ncias` | — | Vazio |
| Relatórios | DES - Exames Ocupacionais | Exames pendentes, agendamentos próximos e realizados | `exams-report` → `showExamsReport()` | `dist/exam-report.js` | Real (só lê os registros existentes) |
| Relatórios | DES - Cadastro Colaborador | Ficha individual e acompanhamento da admissão | `collaborators` → `showCollaborators()` | `dist/collaborators.js` | Real (lê Pessoas, exames, ocorrências e uniformes pelo id) |
| Cadastros Geral | DES - Grupos de Despesas | (vazia) | `ti-despesas` | `dist/groups.js` | Real, sincronizado (`cicluz-financial-hierarchy-v1`) |
| Cadastros Geral | DES - Fornecedores | (vazia) | `compras:fornecedores-des` → `CicluzComprasCadastros.abrirFornecedores('des')` | `dist/compras/cadastros.js` | Real, sincronizado (`cicluz-compras-v1`; mesmo cadastro de MER - Fornecedores, na cor de Despesas) |
| Cadastros Geral Colaboradores | DES - Simples Colaborador | Primeira etapa: cadastro inicial do candidato | `simple` → mostra `#cadastro-simples` | `dist/people.js` (+ `gp-entrada.js`) | Real, só no aparelho (`cicluz-pessoas-v1`) |
| Cadastros Geral Colaboradores | DES - Completo Colaborador C/Dependente | Dados pessoais, endereço, documentos e dependentes | `form` → mostra `#cadastro-completo` | `dist/index.html` (formulário em 4 etapas) + `dist/complete-registration.js` + `dist/people.js` | Real, só no aparelho (`cicluz-cadastro-completo-v1`, fora da sincronização por ter CPF — P-11). Link `#cadastro-completo/<token>` tratado por `people.js` |
| Cadastros Geral Colaboradores | DES - Área / Setor / Local | Organizar grupos e subgrupos em quatro níveis | `config-area` → `showConfig('area')` → `showLocationTree()` | `dist/location-tree.js` (+ `org-units.js`) | Real, sincronizado (`cicluz-location-tree-v1`, `cicluz-location-custom-colors-v1`) |
| Cadastros Geral Colaboradores | DES - Cargos C/Salários | Cadastro e organização de cargos | `jobs` → `showJobs()` / `editJob()` | `dist/index.html` (linhas 251–330) + `dist/hierarquia.js` | Real, sincronizado (`cicluz-cargos-v1`, `cicluz-cargos-referencia-v1`, `cicluz-salarios-vigencias-v1`) |
| Cadastros Geral Colaboradores | DES - Atualização Salários Dissídio Coletivo | Valores e início de vigência | `salary-update` → `showSalaryUpdate()` | `dist/index.html` (linha 309) | Real, sincronizado (`cicluz-salarios-vigencias-v1`) |
| Cadastros Geral Colaboradores | DES - Ficha de Cargos | Exigências e entregas por área e cargo | `job-profiles` → `showJobProfiles()` | `dist/job-profiles.js` | Real, sincronizado (`cicluz-job-profiles-v1`) |
| Cadastros Geral Colaboradores | DES - Organograma | Estrutura da empresa | `config-organograma` → `showConfig('organograma')` → `showOrganogram()` | `dist/organogram.js` | Real, sincronizado (`cicluz-organogram-positions-v1`) |
| Cadastros Geral Colaboradores | DES - Horário / Escala | Dias de trabalho, horário de cada dia e setor | `jornada-shifts` → `showJornada('shifts')` | `dist/schedules.js` | Real, só no aparelho (`cicluz-jornadas-v1`); o dia a dia calculado vai ao servidor pela Agenda (`agenda/rotina.js`) |
| Cadastros Geral Colaboradores | DES - Tipos de Ocorrência | Categorias, modelos e regras de suspensão | `occurrence-catalog` → `showOccurrenceCatalog()` | `dist/occurrence-catalog.js` (+ `occurrence-matrix.js`) | Real; `cicluz-ocorrencias-matriz-v1` sincronizado, `cicluz-ocorrencias-catalogo-v1` só no aparelho |
| Cadastros Geral Colaboradores | DES - Tipos de Uniforme | Peças, tamanhos, grupos e vínculo com cargo | `uniform-types` → `showUniformTypes()` | `dist/uniform-types.js` (+ `uniforms-data.js`) | Real, sincronizado (`cicluz-uniformes-tipos-v1`) |
| Estoque | DES - Grupo Despesas | (vazia) | `vz-est-des-grupo-despesas` | — | Vazio |
| Estoque | DES - Uniformes | Saldo e estoque inicial de cada peça de uniforme | `uniforms-stock` → `showUniforms('stock')` | `dist/uniforms.js` | Real, só no aparelho (`cicluz-uniformes-v1`) |
| Pastas Documentos | DES - Imagens Notas Despesas Lançadas / DES - Contratos Colaboradores / DES - Contratos Fornecedores / DES - Documentos Colaboradores / DES - Documentos Fornecedores | (vazia) | `vz-doc-…` | — | Vazio (5 cartões) |
| API | (nenhum) | — | — | — | Vazio |

#### 3 · Saídas — "Mercadorias / CMV" (cor `#22c55e`, rota `saidas-mercadorias`)

| Sub-área | Cartão | Descrição | Alvo / função | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Lançamentos | MER - Mercadorias | (vazia) | `vz-lan-mer-mercadorias` → `CicluzLancamentos.abrir('mercadorias')` | `dist/lancamentos/lancamentos.js` | Real, servidor |
| Lançamentos | MER - Agenda de Pedidos | Pedidos de compra que se repetem | `compras:agendamento` | `dist/compras/telas-pedido.js` (+ `recorrencia.js`) | Real, sincronizado (`cicluz-compras-v1`) |
| Lançamentos | MER - Pedido de Compra | Fazer o pedido e enviar aos fornecedores | `compras:solicitacao` | `dist/compras/telas-pedido.js` | Real, sincronizado |
| Lançamentos | MER - Cotação por Fornecedor | Produtos em cotação e decisões | `compras:cotacao` | `dist/compras/telas-cotacao.js` (link do fornecedor: `dist/rodada.html?t=<token>`) | Real, sincronizado |
| Lançamentos | MER - Pedidos a Receber | O que foi comprado e o recebimento | `compras:pedidos` | `dist/compras/telas-recebimento.js` | Real, sincronizado |
| Lançamentos Produção | MER - Agenda de Produção | Produtos, janela de demanda e repetição | `producao:agendamento` | `dist/producao/telas-pedidos.js` | Real, sincronizado (`cicluz-producao-v1`) |
| Lançamentos Produção | MER - Pedidos de Produção | A loja pede; pedido extra pelo celular | `producao:pedidos` | `dist/producao/telas-pedidos.js` | Real, sincronizado |
| Lançamentos Produção | MER - Mapa de Produção | Por horário, processo, setor ou produto | `producao:mapa` | `dist/producao/telas-mapa.js` | Real, sincronizado |
| Lançamentos Produção | MER - Abastecimento | Entrega na loja, conferência, sobra e descarte | `producao:abastecimento` | `dist/producao/telas-mapa.js` | Real, sincronizado |
| Relatórios | MER - Mercadorias | (vazia) | `vz-rel-mer-mercadorias` | — | Vazio |
| Relatórios | MER - Pedidos | (vazia) | `vz-rel-mer-pedidos` | — | Vazio |
| Relatórios | MER - Produção | Mais produzidos, mais vendidos, sobra e descarte | `producao:relatorios` | `dist/producao/telas-relatorios.js` | Real (lê Produção e Compras; margem aguarda fórmulas) |
| Cadastros Geral | MER - Grupos de Mercadorias | (vazia) | `ti-mercadorias` | `dist/groups.js` | Real, sincronizado |
| Cadastros Geral | MER - Fornecedores | Quem vende para a loja | `compras:fornecedores` → `abrirFornecedores('mer')` | `dist/compras/cadastros.js` | Real, sincronizado |
| Cadastros Geral | MER - Produtos | Cadastro, como se compra e estoque mínimo | `compras:produtos` → `CicluzComprasProdutos.abrir()` | `dist/compras/telas-produto-*.js`, `produtos-api.js` | Real; migrando para servidor (`produtos-api.js`: "modo servidor" só depois que o catálogo inteiro sobe; resumo local `cicluz-produtos-resumo-v1`) |
| Cadastros Geral | Unidades de Medida | Siglas de embalagem, medida de compra e conversões | `compras:unidades` | `dist/compras/telas-produto-extras.js` | Real, sincronizado (`cicluz-compras-v1`) |
| Cadastros Geral | MER - Catálogo e Preço-Base | Quem vende o quê, histórico de compras e preço-base | `compras:cadastro` | `dist/compras/telas-cadastro.js` | Real, sincronizado |
| Cadastros Geral Produção | MER - Produtos da Produção | Como se pede: utensílio, fornada, mínimo e máximo | `producao:produtos` | `dist/producao/telas-produtos.js` | Real, sincronizado (`cicluz-producao-v1`) |
| Cadastros Geral Produção | MER - Ficha Técnica de Produtos | Etapas, ingredientes, equipamentos e tempos | `producao:fichas` | `dist/producao/telas-fichas.js` | Real, sincronizado |
| Cadastros Geral Produção | MER - Parâmetros de Custo | Horas por mês, encargos, preço do kWh e do gás | `producao:custos` | `dist/producao/telas-custos.js` | Real, sincronizado |
| Cadastros Geral Produção | MER - Ingredientes Ficha Técnica / Tabela TACO | Ingredientes ligados à tabela de nutrição pelo código | `producao:ingredientes` | `dist/producao/telas-ingredientes.js` (+ `taco.js`, `taco-dados.js`) | Real, sincronizado (`cicluz-taco-v1`) |
| Estoques | MER - Grupo Mercadorias | (vazia) | `compras:estoque` | `dist/compras/telas-recebimento.js` | Real, sincronizado |
| Estoques | MER - Contagem de Estoque | Contagem cega, recontagem e aprovação | `compras:conferencias` | `dist/compras/telas-conferencia.js` | Real, sincronizado |
| Pastas Documentos | MER - Imagens Notas Mercadorias Lançadas / MER - Contratos Fornecedores / MER - Documentos Fornecedores | (vazia) | `vz-doc-…` | — | Vazio (3 cartões) |
| API | (nenhum) | — | — | — | Vazio |

Obs.: o `iconeLinha` do `index.html` ainda cita "MER - Fornecedores" e "MER - Produtos" com ícone próprio, e `subIcone`
define o ícone de cada sub-área; isso é só desenho.

#### 4 · Saídas — "Retiradas / Investimentos" (cor `#2563eb`, rota `saidas-retiradas`)

| Sub-área | Cartão | Descrição | Alvo / função | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Lançamentos | RET - Retiradas | (vazia) | `vz-lan-ret-retiradas` → `CicluzLancamentos.abrir('retiradas')` | `dist/lancamentos/lancamentos.js` | Real, servidor (versão enxuta) |
| Relatórios | RET - Retiradas | (vazia) | `vz-rel-ret-retiradas` | — | Vazio |
| Cadastros Geral | RET - Grupos de Retiradas | (vazia) | `ti-retiradas` | `dist/groups.js` | Real, sincronizado |
| Cadastros Geral | RET - Patrimônios | Cadastro de bens e equipamentos | `asset` → `CicluzProducao.abrir('patrimonio')` | `dist/producao/telas-patrimonio.js` (+ `telas-patrimonio-form.js`, `patrimonio-dominio.js`, `qr.js`) | Real, sincronizado (`cicluz-patrimonio-v1`); imagens/documentos no IndexedDB só do aparelho |
| Estoque | RET - Grupo Patrimônio | (vazia) | `vz-est-ret-grupo-patrimo-nio` | — | Vazio |
| Pastas Documentos | RET - Imagens Notas Retiradas Lançadas / RET - Contratos Sócios / RET - Contratos Fornecedores / RET - Documentos Sócios / RET - Documentos Fornecedores | (vazia) | `vz-doc-…` | — | Vazio (5 cartões) |
| API | (nenhum) | — | — | — | Vazio |

#### 5 · Resultados — "Relatórios" (cor `#7c3aed`, rota `resultados-relatorios`)

| Sub-área | Cartão | Descrição | Alvo / função | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Lançamentos | RES - Resultado | (vazia) | `vz-lan-res-resultado` | — | Vazio |
| Lançamentos | CAR - Cartões Relatórios | (vazia) | `vz-lan-car-carto-es-relato-rios` | — | Vazio |
| Lançamentos | PDV - PDV Relatório | (vazia) | `vz-lan-pdv-pdv-relato-rio` | — | Vazio |
| Relatórios | RES - Resultado / CAR - Cartões Relatórios / PDV - PDV Relatório | (vazia) | `vz-rel-…` | — | Vazio (3 cartões) |
| API | Open Finance · Caixa TNP | Conta, poupança e cartão da Caixa PJ da TNP, pelo Meu Pluggy | `extrato-tnp:extrato` → `CicluzExtratoTnp.abrir('extrato')` | `dist/extrato-tnp/tela.js` (+ `dados.js`, `filtros.js`, `paineis.js`, `detalhe.js`) | Real, servidor (`/api/extrato-tnp`; o site não guarda extrato) |

---

### 1.5 SEÇÃO AGENDA (criada por `dist/agenda-menu.js`, cor `#7c3aed` fixa no ícone)

| Item de menu | Sub-item (botão) | O que abre | Arquivo | Tipo | Rota |
| --- | --- | --- | --- | --- | --- |
| **Agenda** · "Atividades" (`data-menu-name="Agenda/Atividades"`) | Agenda | `CicluzAgenda.abrir('')` — abas Listas, Calendário, Kanban, Mapa mental, Desempenho | `dist/agenda/telas.js` (+ `calendario.js`, `kanban.js`, `mapa*.js`, `conversa.js`, `alertas.js`, `dados.js`, `dominio.js`, `regras.js`) | Real, servidor (API da Agenda; cópia offline `cicluz-agenda-cache-v1`; documento antigo `cicluz-agenda-v1` transferido uma vez, marca `cicluz-agenda-transferida-v1`) | `#/agenda/agenda` |
| | Configurações da Agenda | `CicluzAgendaRotina.abrirConfiguracoes()` | `dist/agenda/rotina.js` | Real, servidor (liga conta ao colaborador, expediente, tempo parado) | `#/agenda/configuracoes-da-agenda` |
| **Entrevistas** · "Candidatos" (item direto, sem sub-itens) | — | `showEntrevistas()` → `#entrevistas-view` | `dist/avaliacoes.js` (linhas 205–209) | **Tela reservada / em construção**: texto "Tela reservada… ainda não há definição do que este espaço terá" (`dist/interviews.js` existe mas **não é carregado** pelo `index.html`) | `#/entrevistas` |
| **Avaliações** · "Pessoas e equipes" | Avaliação Individual | `showAvaliacoes('individual')` | `dist/avaliacoes.js` | **Esboço funcional** (o arquivo se chama assim); grava só no aparelho (`cicluz-avaliacoes-v1`) | `#/avaliacoes/avaliacao-individual` |
| | Avaliação em Equipe | `showAvaliacoes('equipe')` | idem | idem | `#/avaliacoes/avaliacao-em-equipe` |
| | Avaliação Geral | `showAvaliacoes('geral')` | idem | idem | `#/avaliacoes/avaliacao-geral` |
| | Vínculos do setor | `showAvaliacoes('vinculos')` | idem | idem | `#/avaliacoes/vinculos-do-setor` |
| | Avaliações salvas | `showAvaliacoes('salvas')` | idem | idem | `#/avaliacoes/avaliacoes-salvas` |

Agenda não tem cartões: os sub-itens abrem a tela direto (não passam por `openSection`).

---

### 1.6 SEÇÃO CONFIGURAÇÕES (índice 6, cor `#7c3aed`, rota `configuracoes`)

Cartões vêm de `CicluzAcessos.cards(setor)` em `dist/acessos/modulo.js`; alvo `acessos:<id>` → `CicluzAcessos.abrir(id)`.

| Sub-área | Cartão | Descrição exata | Alvo | Arquivo | Tipo |
| --- | --- | --- | --- | --- | --- |
| Empresa | Dados da Empresa | CNPJ, razão social, regime tributário, endereço e responsáveis | `acessos:empresa` | `dist/acessos/empresa.js` | Real, sincronizado (dentro de `cicluz-compras-v1` → `empresas`) |
| Empresa | Estrutura de Dados da Empresa | Em definição | `acessos:empresa-estrutura` | `dist/acessos/empresa.js` (linhas 567–575) | **Em construção** ("Em definição… Nada é gravado aqui") |
| Permissões | Acesso por Tela | O menu inteiro, com sete permissões por tela (esboço) | `acessos:telas` | `dist/acessos/telas.js` (+ `telas-dados.js`) | **Esboço**: "SEM backend: nada é gravado e nenhum acesso muda". Lê a lista de telas de `window.CicluzMenu` |
| Usuários | Pessoas com Acesso | Criar contas, postos do caixa e cargos | `acessos:usuarios` | `dist/acessos/usuarios.js` | Real, servidor (contas só existem no servidor) |
| Usuários | Dados no Servidor | Situação de cada assunto gravado | `acessos:dados` | `dist/acessos/dados.js` | Real, servidor (só administrador) |
| Senhas | Minha Senha | Trocar a sua senha | `acessos:senhas` | `dist/acessos/senhas.js` | Real, servidor (better-auth) |
| Senhas | Senha de Outra Pessoa | Quando alguém esqueceu a senha | `acessos:senha-outra` | `dist/acessos/senhas.js` | Real, servidor (só administrador) |
| Diversos | Salário Mínimo Vigente | Valor e início da vigência; base dos contratos | `acessos:salario-minimo` | `dist/acessos/salario-minimo.js` | Real, sincronizado (`cicluz-compras-v1` → `salariosMinimos`) |
| Design System | Formulário linha por linha (padrão da Transferência) | O padrão Apple: grupo com título, linhas de 52 px, data, hora, dias, anexo e a máscara ao passar o mouse | `acessos:ds-padrao` | `dist/acessos/design-system.js` | Só leitura (documentação viva; "nada é gravado") |
| Design System | Letras | A fonte do sistema, os pesos e o jeito de escrever | `acessos:ds-letras` | idem | Só leitura |
| Design System | Tamanho das Letras | O tamanho de cada tipo de texto, do título à nota | `acessos:ds-tamanhos` | idem | Só leitura |
| Design System | Cores | A cor de cada origem do menu e as cores fixas | `acessos:ds-cores` | idem | Só leitura |
| Design System | Espaçamento | As distâncias entre quadros, campos e linhas | `acessos:ds-espacamento` | idem | Só leitura |
| Design System | Ícones | O tamanho do ícone em cada lugar, o desenho e a sigla | `acessos:ds-icones` | idem | Só leitura |
| Design System | Cabeçalho e Barra de Baixo | O cabeçalho de cima e a barra de baixo, com medidas e botões | `acessos:ds-cabecalho` | idem | Só leitura |
| Design System | Botões | A biblioteca de botões: todos os tipos, medidas e onde usar | `acessos:ds-botoes` | idem | Só leitura |
| Design System | Campos de Preenchimento | Rótulo, obrigatório, situação e o aviso de campo vazio | `acessos:ds-campos` | idem | Só leitura |
| Design System | Máscaras | O formato que cada campo assume enquanto se digita | `acessos:ds-mascaras` | idem | Só leitura |
| Design System | Quadros e Molduras | Tudo dentro de quadro, com o título do grupo acima | `acessos:ds-quadros` | idem | Só leitura |
| Design System | Listas | O formato das telas de lista e o que cada toque faz | `acessos:ds-listas` | idem | Só leitura |
| Design System | Menu e Cartões | O menu principal, o submenu e os cartões de cada setor | `acessos:ds-menu` | idem | Só leitura |
| Design System | Janelas e Painéis | A janela de cadastro, a de confirmação e o painel flutuante | `acessos:ds-janelas` | idem | Só leitura |
| Design System | Mensagens e Avisos | Como o sistema avisa, confirma e mostra erro | `acessos:ds-mensagens` | idem | Só leitura |
| Design System | Conferência Final | O que conferir antes de dizer que uma tela está pronta | `acessos:ds-conferencia` | idem + `dist/acessos/ds-conferencia.js` | Só leitura (com conferência automática) |

O link do nome do usuário no rodapé do menu aponta para `#/configuracoes/senhas/acessos-senhas` (Minha Senha).

---

### 1.7 Telas que existem mas NÃO têm cartão no menu (órfãs)

O `if/else` de `openSection` trata estes alvos, mas nenhum cartão do `menuTree` (nem de módulo) os usa:

| Alvo | Função | Arquivo | Observação |
| --- | --- | --- | --- |
| `documents` | `showDocuments()` | `dist/documents.js` | Chamada por dentro de `contracts.js` |
| `doc-receive` | `showDocReceive()` | `dist/documents-ext.js` | Sem chamador encontrado |
| `contracts` | `showContracts()` | `dist/contracts.js` | Sem chamador encontrado |
| `prestadores` | `showPrestadores()` | `dist/prestadores.js` | Chave `cicluz-prestadores-v1` é sincronizada; sem cartão |
| `gp-config` | `showGpConfig()` | `dist/gp-common.js` | Chamada por dentro de `exam-aso.js` |
| `payment-refs` | `showPaymentRefs()` | `dist/payment-refs.js` | Sem chamador encontrado |
| `overtime` | `showOvertime()` | `dist/overtime.js` | Sem chamador encontrado |
| `folhaconplus-*` | `showFolhaConplus()` | `dist/folhas-conplus.js` | Dados fictícios (`folhas-conplus-demo.js`) |
| `uniform-purchases` | `showUniformPurchases()` | `dist/uniform-purchases.js` | Chamada por dentro do próprio arquivo |
| `ti-groups` | `openSection(...,'Grupos','ti-groups')` | `dist/index.html` | Subgrade antiga com os 9 grupos financeiros; nenhum cartão aponta para ela |
| `caixa:gerencia`, `caixa:tesouraria` | `CicluzCaixa.abrir(...)` | `dist/caixa/gerencia.js`, `tesouraria.js` | Ver 1.4/Entradas |
| `launch` (via `route`) | `location.href='/app/lancamentos/despesas'` | `dist/index.html` linha 151 | Leva ao app Nuxt (`servidor/web`, servido em `/app/`); nenhum botão atual chama |
| Vistas `#process`, `#records`, `#team`, `#rh`, `#dp`, `#pre`, `#reports` | `route(id)` | `dist/index.html` linhas 136–142 | Maquetes antigas com números e nomes fixos; o menu atual não leva até elas (o `nav` antigo é trocado pela árvore) |

Se a pessoa salvou uma rota para uma tela que sumiu, `rotas.js` abre só até onde dá e corrige o endereço.

---

## 2. Cores de cada área/origem

### 2.1 Fonte

- **Cor do menu**: `menuColor` em `dist/index.html` linha 222 (índice = posição em `sections`):

| Índice | Área | Sigla(s) | Cor | Texto escuro (`SECTION_TEXT`, linha 324) |
| --- | --- | --- | --- | --- |
| 0 | Entradas · Vendas / Faturamento | VND | `#eab308` (amarelo) | `#785600` |
| 1 | Transferências · Contas / Locais | CNT | `#f97316` (laranja) | `#9a3412` |
| 2 | Saídas · Despesas / Custos | DES | `#ef4444` (vermelho) | `#9c1c1c` |
| 3 | Saídas · Mercadorias / CMV | MER | `#22c55e` (verde) | `#12672e` |
| 4 | Saídas · Retiradas / Investimentos | RET | `#2563eb` (azul) | `#174ca1` |
| 5 | Resultados · Relatórios | RES, CAR, PDV | `#7c3aed` (roxo) | `#5520ad` |
| 6 | Configurações | — | `#7c3aed` | `#5520ad` |
| — | Agenda, Entrevistas, Avaliações | — | `#7c3aed` (fixo em `agenda-menu.js`) | — |

  Divergência pequena: o texto do item de menu de DES usa `#a11c1c` (`--item-text`, linha 224), enquanto `SECTION_TEXT` e
  `openSection` usam `#9c1c1c`.
- **Cor dos grupos financeiros**: `groupConfig` em `dist/groups.js` (linha 3) repete as mesmas cores: vendas, tipos-venda,
  bandeiras, operadoras, computadores `#eab308`; contas `#f97316`; despesas `#ef4444`; mercadorias `#22c55e`; retiradas `#2563eb`.
- **Cor do cartão** (`--card-color` em `openSection`): Clientes e Horário de Funcionamento = cor da área; DES - Fornecedores =
  `groupConfig.despesas.color`; MER - Fornecedores/Produtos/Estoque = `groupConfig.mercadorias.color` (ou verde do Compras);
  outros `compras:`/`producao:` = `CicluzComprasUI.COR` (`#22c55e`, `dist/compras/ui.js` linha 8); `ti-*`/`asset` =
  `groupConfig[...]`; `ti-contas` = `#f97316`; o resto = cor da área.
- **Cores fixas por módulo**: Caixa e Vendas PDV/Comandas `#eab308`/`#785600`; Configurações (acessos) e Extrato TNP `#7c3aed`/`#5520ad`;
  Produção = verde do Compras; Patrimônio (`COR_RET`) `#2563eb`/`#174ca1` (`dist/producao/modulo.js`); Lançamentos
  usam `menuColor[índice]`; telas de Pessoas usam `var(--section-accent,#ef4444)`.
- **Barra de baixo** (`people-header-pilot.js`): atalhos de lançamento VND `#eab308`, CNT `#f97316`, DES `#ef4444`, MER `#22c55e`,
  RET `#2563eb`, CAR/PDV/RES `#7c3aed`, FCH `#eab308`; ordenação por métrica VND `#eab308`, COM `#22c55e`, LUC `#2563eb`, RES `#7c3aed`.

### 2.2 Como a cor se propaga

`openSection` e `criarTela` chamam `setViewOriginColor(view, cor)` (`index.html` linha 326), que grava `--section-accent` e
`--section-text` na raiz e `--menu-accent`/`--panel-color` na tela; o CSS (`ui-foundation.css`, `compras.css` etc.) lê esses tokens.
Ao clicar num cartão, `applyOriginIcon` copia o ícone e a `--card-color` do cartão para o selo do cabeçalho da tela aberta.
Ícone da área: cifrão com variações (`moneyMark`) para as 6 áreas financeiras; engrenagem para Configurações.

---

## 3. Como a navegação funciona

### 3.1 Abertura e o menu como "tela inicial"

- `mobile-menu.js` usa `matchMedia('(min-width:0px)')`, que é **sempre verdadeiro**: o menu lateral funciona como gaveta
  por cima do conteúdo **em qualquer largura** e abre sozinho ao carregar (`setOpen(true,false)` no fim do arquivo).
- Tocar num item de menu (botão dentro de `.nav`) fecha a gaveta. Esc fecha; Tab fica preso dentro da gaveta aberta; o fundo
  (`.mobile-menu-backdrop`) fecha ao toque. Com a gaveta aberta, `main.inert = true`.
- Evento `cicluz-open-menu` abre a gaveta; `cicluz-close-menu` fecha. O botão "Menu inicial" (casinha, `.mobile-menu-open`)
  é posto no cabeçalho da tela visível (ou num "dock") por `navigation-layout.js`.
- Botões do topo do menu (`.side-controls`): Expandir menus, Recolher menus, Buscar no menu, tema Luz/Sombra e o botão
  recolher/expandir (`#toggleMenu`).
- Rodapé do menu (`navigation-layout.js`): círculo com as iniciais do usuário, nome (link para Minha Senha) e botão
  **Sair** (`aria-label="Sair do sistema"`) → `CicluzSessao.sair()`.
- Só um item fica marcado (`menu-selected`/`aria-current`), independente de quais grupos estão abertos.
- `menu-reveal.js` rola o menu para mostrar o grupo recém-aberto.

### 3.2 Endereço da tela (hash `#/…`) — `dist/rotas.js`

- Formato: `#/<menu>/<sub-área>/<cartão>[/<cartão>…]`, tudo em slug (sem acento, minúsculo, hífens).
  - `<menu>` = `slugMenu(data-menu-name)`: parte antes de " · " (até a primeira "/") + primeira palavra depois de " · ".
    Valores: `visao-geral`, `entradas-vendas`, `transferencias-contas`, `saidas-despesas`, `saidas-mercadorias`,
    `saidas-retiradas`, `resultados-relatorios`, `agenda`, `entrevistas`, `avaliacoes`, `configuracoes`.
  - `<sub-área>` = slug do texto do botão (ex.: `cadastros-geral-colaboradores`, `lancamentos-producao`).
  - `<cartão>` = slug do `data-target` do cartão (ex.: `compras:horario-funcionamento` → `compras-horario-funcionamento`;
    `ti-vendas` → `ti-vendas`; `acessos:senhas` → `acessos-senhas`).
  - Exemplos: `#/entradas-vendas/cadastros-geral/compras-horario-funcionamento`,
    `#/saidas-despesas/cadastros-geral-colaboradores/jobs`, `#/configuracoes/senhas/acessos-senhas`, `#/visao-geral`.
- **Gravar**: um ouvinte de clique em captura na `window` reconhece clique em item de menu, Visão Geral, item direto
  (Entrevistas) ou cartão (`.record-grid button[data-target]`) e faz `history.pushState`. Cada grade guarda em
  `data-rota` a rota em que apareceu, para o cartão somar a partir dela.
- `rotas.js` **embrulha `window.openSection`**: quando uma tela volta para a grade por código (seta Voltar), a rota é regravada
  (`[menu, sub-área]`), ou sobe um nível se a grade não é sub-área do menu.
- **Reabrir** (F5, link colado, Voltar/Avançar do navegador → `popstate`): repete os cliques reais — abre o `<details>`, clica no
  botão da sub-área e depois em cada cartão visível cujo slug bate (espera até 30×50 ms por cartão). Se algo não existe mais,
  para ali e corrige o endereço com `replaceState`. Ao terminar, fecha a gaveta do menu.
- Sem hash (`location.hash` vazio) no `popstate` → abre a gaveta do menu.
- Título da aba do navegador: último pedaço da trilha `#crumb` + " · " + título original.
- Fica **fora** das rotas: abas e filtros dentro de uma tela, janelas, e endereços que não começam com `#/`
  (ex.: `#cadastro-completo/<token>` tratado por `people.js`; `?cadastro-teste=` do link simulado de cadastro).
- API: `window.CicluzRotas = { slug, slugMenu, lerEndereco, montarEndereco, atual(), abrir(destino) }`.
- O comentário do topo de `rotas.js` cita o exemplo `#/transferencias-contas/lancamentos/caixa-abertura`, que **não existe** mais
  (comentário desatualizado).

### 3.3 Voltar e Fechar

- Cabeçalho: `addShortcuts(viewId, voltar)` põe dois círculos — **Voltar** (seta) e **Fechar** (X). O **Fechar só clica no
  Voltar** (mesma ação).
- Na grade de cartões (`#sector-view`) o Voltar chama `returnToNavigation()` → evento `cicluz-open-menu` (abre o menu).
  Quando a grade é de um cartão `vz-` vazio, o Voltar volta para a grade da sub-área.
- Nas telas abertas por cartão, o Voltar volta para a grade da sub-área: `menuBack(índice, subÁrea)` =
  `openSection(sections[i][0], subÁrea, 'tree', menuColor[i])` (Compras usa `voltarLancamentos/voltarCadastros/voltarEstoques`;
  Produção `voltarProducao/voltarCadastros/voltarRelatorios/voltarPatrimonio`; Configurações `voltarPara(setor)`;
  Caixa: etapas voltam para VND - Vendas). `showTiGroup` define o Voltar para "Cadastros Geral" da área certa (`tiOrigem`).
- Cadastro Simples/Completo: `#back-simple`/`#back-forms` → `menuBack(2,'Cadastros Geral Colaboradores')`.
- Botão Voltar do **navegador**: via `popstate` em `rotas.js` (3.2).

### 3.4 Cabeçalho (topo de cada tela)

- Estrutura `.view > .panel > .head` + `.content`. Telas de módulo nascem por `CicluzComprasUI.criarTela({id, titulo, caminho,
  icone, voltar, cor, corTexto})` (`dist/compras/ui.js` linha 51): selo com ícone na cor da origem, `<h2>` título, `<p>` caminho
  (ex.: "Configurações / Senhas / Minha Senha"), Voltar/Fechar; ao ativar, atualiza `#crumb` e `#title` do topo.
- `header-normalize.js` (com MutationObserver): garante selo de ícone, junta os botões do cabeçalho em `.shortcut-actions`,
  transforma botões de texto em círculos (ícone "+" para Novo/Nova/Adicionar, senão ícone de documento) e põe o botão
  **Recolher/Expandir título** (`header-identity-toggle`).
- `header-save.js` (MutationObserver): se a tela/janela visível tem um botão visível cujo texto começa com "Salvar", põe no
  cabeçalho um círculo **✓ "Salvar pelo cabeçalho"** que só clica nesse botão (mesma validação).
- `people-header-pilot.js` também transforma `<dialog>` e `.modal .dialog` no mesmo desenho (cabeçalho com caminho de origem,
  ✓ e X, selo de ícone).
- Barra superior antiga do app (`header.top` com `#crumb` e `#title`): continua existindo; recebe o texto da trilha.

### 3.5 Barra de baixo (rodapé de toda tela) — `dist/people-header-pilot.js`

Montada em toda `.view.show` com `.panel>.head` + `.panel>.content` e em janelas abertas (`footer.people-bottom-header`).

- **Esquerda** (`people-footer-left`): Menu inicial (casa → abre o menu), Buscar, Organizar A/Z (ciclo: original → A/Z → Z/A),
  Data de … a … (painel De/Até, filtra linhas com data), Adicionar (+, clica o "+" do cabeçalho; desabilitado se não houver),
  **Agendar tarefa desta tela** (ícone roxo → `CicluzAgendaRotina.agendarDaTela()`; até 600 px fica dentro do menu rápido).
- **Centro**: logotipo CICLUZ = abre/fecha o **menu rápido** (`people-bottom-tools`).
- **Direita** (`people-footer-right`): Voltar, Fechar, **✓ Salvar**, Mais atalhos (três pontos), recolher/mostrar cabeçalho superior.
  - Voltar = clica o Voltar do cabeçalho (ou fecha a janela). Fechar = clica o Fechar do cabeçalho; sem ele, fecha a janela ou
    abre o menu.
  - ✓ Salvar = clica o ✓ do cabeçalho (que clica o "Salvar" da tela); se a tela não tem Salvar, grava a configuração da barra e diz
    "Configuração salva".
- **Atalhos disponíveis** (três pontos / "Configurar menu rápido"): Posição da barra (cima/baixo), Maior/menor na horizontal,
  botões próprios da tela (copiados do cabeçalho), Atualizar, Imprimir, Baixar PDF, Exportar planilha, Exportar/Importar
  configuração (arquivo `cicluz-configuracao-cabecalho.json`), WhatsApp, Compartilhar, E-mail, Copiar, Câmera, Escanear código de
  barras, Anexar arquivo, Favoritar, Calculadora, Ajuda, ordenar por +VND/+COM/+LUC/+RES e atalhos de lançamento
  VND, CNT, DES, MER, RET, CAR, PDV, RES, FCH.
  - Funcionam de verdade: busca, A/Z, período, expandir, posição, largura, imprimir, exportar/importar configuração, ordenação por
    métrica (se as linhas têm o dado), e **FCH** (abre `CicluzCaixa.abrir('fechamento')`, que é demonstração).
  - Só avisam "ainda não disponível": WhatsApp, Copiar, Compartilhar, E-mail, Atualizar, Baixar PDF, Escanear, Câmera, Anexar,
    Exportar planilha, Favoritar, Calculadora, Ajuda e os atalhos VND/CNT/DES/MER/RET/CAR/PDV/RES.
  - Fixos sempre ligados: busca, A/Z, data, salvar. Todos os outros **começam desligados** em toda tela; cada botão fica em um
    lugar só: menu suspenso (três pontos), menu rápido (logotipo) ou desligado.
- Preferências **por tela, por aparelho** (não sobem ao servidor): `cicluz-screen-<contexto>-footer-buttons-v1`,
  `-footer-order-v1`, `-display-v1` (contexto = id da tela + título + subtítulo); a tela antiga "Gestão de Pessoas" usa o prefixo
  `cicluz-people-`.
- Esc fecha o painel aberto; clicar fora fecha menu rápido, três pontos e painel de data.

### 3.6 Busca

- **Busca do menu** (`navigation-layout.js`, lupa em `.side-controls`): filtra grupos e sub-áreas sem acento/maiúscula;
  grupo que bate mostra todas as sub-áreas; esconde títulos de seção vazios; "Nenhuma opção encontrada." Esc ou abrir/fechar o menu
  limpa e restaura. Não procura dentro dos cartões.
- **Busca da tela** (barra de baixo): usa a busca própria da tela, se existir (adota o `input[type=search]` do cabeçalho/conteúdo);
  senão filtra linhas (`.record`, `.job-item`, `tr`, …) pelo texto.

### 3.7 Ordem dos cartões

`menu-order.js` põe a alça ⠿ em cada cartão de `.record-grid` e em `#jobs-list`; arrastar ou setas do teclado reordenam;
guarda em `cicluz-menu-item-order-v1` (por aparelho), chave `cards:<id da tela>:<caminho>`.

### 3.8 Tema claro / escuro (Luz / Sombra)

- Botão em `.side-controls` (`index.html` linha 228): rótulo "Sombra" (lua) no claro e "Luz" (sol) no escuro.
- Liga/desliga a classe `body.dark-theme` e grava `localStorage['cicluz-tema']` = `'luz'` ou `'sombra'` (preferência do
  aparelho, **não** sincronizada).
- `entrar.html` lê a mesma chave em `entrar-tema.js` (classe `tema-sombra` e `theme-color #151419`).
- Não segue o tema do aparelho: não há `prefers-color-scheme` em nenhum arquivo de `dist/`.
- `mobile-edge-colors.js` ajusta `color-scheme` e a cor da borda do navegador ao tema.

### 3.9 Divisórias e seções do menu

`agenda-menu.js`: seção **GESTÃO** (Visão Geral + 6 áreas financeiras), **AGENDA** (Agenda, Entrevistas, Avaliações),
**CONFIGURAÇÕES**. Cada título recolhe a seção; o título GESTÃO é movido para cima do menu por `navigation-layout.js`.

---

## 4. Sessão e login

### 4.1 Peças

- Servidor: Fastify em `servidor/api` (rotas `auth`, `documentos`, `usuarios`, `acessos`, `acessos-por-tela`, `consultas`,
  `lancamentos`, `produtos`, `agenda`, `vendas-pdv`, `comandas-creare`, `extrato-tnp`; `servidor/api/src/app.ts`).
  Em produção o site estático é publicado pelo Vercel (`vercel.json`, `outputDirectory: dist`) e `/api/*` e `/app/*` são repassados
  ao servidor. Com `SERVIR_SITE=1` o próprio servidor serve `dist/` (`http://localhost:<PORT>/entrar.html`).
- Login: better-auth (`POST /api/auth/sign-in/email`, `POST /api/auth/sign-out`), cookie da mesma origem.
- Perfil (`servidor/shared/src/sessao.ts`): `{ usuarioId, nome, email, papel: 'administrador'|'usuario', permissoes[],
  empresa: { id, nome, dadosImportados } }`. Um usuário = uma empresa.

### 4.2 `entrar.html` / `entrar.js`

1. Formulário E-mail + Senha (olho para mostrar). Erros: 401 → "E-mail ou senha incorretos."; 429 → "Muitas tentativas. Aguarde um
   minuto e tente de novo."; "Esqueceu a senha? Fale com o administrador do sistema."
2. Após entrar, `prosseguir()`: `GET /api/sessao` → recebe `perfil`, `chavesSincronizadas`, `chavesAdotadas`.
   - 401 → volta ao formulário; 403 → "Acesso desativado"; sem rede → "Sem conexão… Seus dados continuam neste aparelho" + "Tentar de novo".
   - Se a fila de pendentes do aparelho é de **outra conta** → "Alterações de outra conta" (não envia com o cookie desta).
3. Se a empresa ainda não importou (`dadosImportados=false`):
   - não administrador → "Aguardando importação" (só Sair);
   - administrador → "Importação inicial": mostra quantos conjuntos e o tamanho; botão "Enviar dados" (ou "Começar do zero") →
     `POST /api/documentos/importacao` (vira a versão 1; uma vez por empresa; `IMPORT_ALREADY_DONE` 409 se já feita).
     Bloqueia se `cicluz-sync-dono` é de outra empresa.
4. `sincronizar()` — ordem fixa, para tudo antes de mexer no aparelho se algo falhar:
   1. envia a fila de pendentes desta conta (`PUT /api/documentos`); 409 de conflito é aceito (o servidor guardou no histórico) e a fila é limpa;
   2. `GET /api/documentos` (todos os documentos da empresa);
   3. **primeira vez neste aparelho** (sem `cicluz-sync-dono`): o que o aparelho tem de diferente vai como cópia para o histórico
      (`POST /api/documentos/copias`);
   4. troca o localStorage pelos valores do servidor usando o `setItem/removeItem` originais (sem gerar envio); chave que o servidor
      não tem é **removida** — exceto as **adotadas** (`CHAVES_ADOTADAS_DO_APARELHO`) quando o aparelho é da mesma empresa: ficam e
      entram na fila com versão base 0;
   5. se faltar espaço no meio, desfaz tudo ("Aparelho sem espaço");
   6. grava `cicluz-sync-dono` = `{usuarioId, empresaId, nome}` no localStorage e **`cicluz-sync-aba`** no sessionStorage =
      `{ id, perfil, chaves, versoes }`; vai para `?voltar=` (só mesma origem, `caminhoSeguro`) ou `index.html`.
5. **Sair** (`entrar.html?sair=1`, a saída única): confere a sessão; envia a fila; se a fila é de outra conta, só encerra a sessão e
   não apaga nada; se não há sessão mas há fila, não apaga e pede para entrar; senão `POST /api/auth/sign-out`, **apaga do
   aparelho todas as chaves sincronizadas**, `cicluz-agenda-cache-v1`, `cicluz-sync-dono` e `cicluz-sync-aba`.

### 4.3 O porteiro: `cicluz-sessao.js`

- Carregado no `<head>` do `index.html` logo após `cicluz-sync.js`, antes de qualquer tela.
- Lê `sessionStorage['cicluz-sync-aba']`. Sem ela (ou sem `perfil`/`chaves`) → `window.stop()` e
  `irParaEntrada()` (`entrar.html?voltar=<caminho+hash atual>`). Por isso **cada aba nova** passa pelo entrar (o sessionStorage é
  por aba); o login em si continua no cookie, então a entrada costuma seguir direto para a preparação.
- **Intercepta** `Storage.prototype.setItem` e `removeItem`: o valor é gravado normalmente; se for `localStorage` e a chave está
  na lista `chaves`, chama `registrarEdicao(chave)`.
- `registrarEdicao`: conta a edição; grava na fila `localStorage['cicluz-sync-pendentes']` =
  `{ usuarioId, empresaId, itens: { chave: { versaoBase, aba } } }` (guarda só o nome e a versão base, não o valor); se a chave
  já estava na fila, mantém a versão base antiga; agenda envio em **800 ms**. Sem espaço → aviso "O aparelho está sem espaço…".
- `enviar()`: junta as chaves da fila que são **desta aba**, lê o valor atual de cada uma e manda num lote só
  (`PUT /api/documentos`, corpo `{ itens: [{ chave, valor, versaoBase }] }`; `valor: null` = chave apagada). Tudo ou nada.
  Resposta: nova versão de cada chave (0 = removida). Se a chave foi editada de novo enquanto o lote viajava, continua na fila com a
  versão nova como base; senão sai da fila. Atualiza `versoes` em `cicluz-sync-aba`. Se sobrou algo, reenvia em 300 ms.
- Tratamento de falhas (`tratarFalha`):
  - **409 `DOCUMENT_VERSION_CONFLICT`**: outro aparelho gravou antes; o servidor guardou o lote no histórico; tira da fila, **para de
    enviar nesta aba** e mostra "Outro aparelho salvou antes de você… Atualize para continuar com a versão atual." (botão Atualizar →
    `entrar.html`, que recarrega os dados do servidor).
  - **403 `NO_PERMISSIONS`**: conta sem permissões liberadas; para de enviar; nada se perde no aparelho.
  - **401/403**: "Sua sessão terminou. As alterações estão guardadas neste aparelho e serão enviadas quando você entrar de novo." (botão Entrar).
  - **400/413**: servidor recusou; para de enviar; a alteração fica no aparelho.
  - **429**: muitas gravações; tenta de novo em 60 s.
  - **Sem rede / servidor fora** (status 0 `NETWORK` ou outro): "Sem conexão com o servidor. Suas alterações estão salvas neste
    aparelho e serão enviadas quando a conexão voltar." e tenta de novo em 5 s, 15 s e depois a cada 60 s.
- Também envia: ao voltar para a aba (`visibilitychange`), ao voltar a conexão (`online`) e 1,5 s depois de abrir (sobras de uma
  visita anterior).
- `conferirVersoes()` a cada 60 s e ao voltar para a aba: `GET /api/documentos/versoes` (com cabeçalho `X-Cicluz-Automatico: 1`,
  que não conta como uso); se há versão mais nova de uma chave que não está na fila → aviso "Há dados novos salvos em outro
  aparelho." (Atualizar).
- Avisos: duas regiões fixas (`role=status` para rede/novos; `role=alert` para conflito/sessão/erro), prioridade
  conflito > sessão > erro > rede > novos; todo aviso tem X.
- `window.CicluzSessao = { perfil, sair }`. `sair()` envia a fila e vai para `entrar.html?sair=1`.

### 4.4 Chaves que sobem ao servidor (`servidor/shared/src/documentos.ts`)

Lista fechada (a API recusa outras): `cicluz-financial-hierarchy-v1`, `cicluz-ti-groups-v1`, `cicluz-ti-account-details-v1`,
`cicluz-cargos-v1`, `cicluz-cargos-referencia-v1`, `cicluz-salarios-vigencias-v1`, `cicluz-job-profiles-v1`,
`cicluz-organogram-positions-v1`, `cicluz-location-tree-v1`, `cicluz-location-custom-colors-v1`, `cicluz-icon-library-v1`,
`cicluz-custom-colors-v1`, `cicluz-compras-v1`, `cicluz-agenda-v1`, `cicluz-producao-v1`, `cicluz-patrimonio-v1`,
`cicluz-taco-v1`, `cicluz-prestadores-v1`, `cicluz-gp-config-v1`, `cicluz-exames-complementares-v1`,
`cicluz-ocorrencias-matriz-v1`, `cicluz-uniformes-tipos-v1`, e as marcas de seed `cicluz-financial-import-complete-v3-ret`,
`cicluz-financial-legacy-import-v1`, `cicluz-bandeiras-import-v1`, `cicluz-operadoras-import-v1`, `cicluz-ti-contas-seed-v1`,
`cicluz-icon-pilot-migrated-v1`, `cicluz-job-icon-pilot-v1` (vão no mesmo lote para um aparelho novo não reimportar o seed).

- **Adotadas do aparelho** (sobem na primeira entrada se o servidor não tem): `cicluz-compras-v1`, `cicluz-agenda-v1`,
  `cicluz-producao-v1`, `cicluz-patrimonio-v1`, `cicluz-taco-v1`, `cicluz-prestadores-v1`, `cicluz-gp-config-v1`,
  `cicluz-exames-complementares-v1`, `cicluz-ocorrencias-matriz-v1`, `cicluz-uniformes-tipos-v1`.
- **Ficam fora de propósito**: preferências do aparelho (tema, ordem/visibilidade de menus, barra de baixo, busca) e dados com
  dado pessoal de colaborador — `cicluz-cadastro-completo-v1`, `cicluz-ponto-v1`, `cicluz-folha-custos-v1` (LGPD, P-11). Também
  ficam só no aparelho, por não estarem na lista: `cicluz-pessoas-v1`, `cicluz-uniformes-v1`, `cicluz-ocorrencias-v1`,
  `cicluz-ocorrencias-catalogo-v1`, `cicluz-jornadas-v1`, `cicluz-documentos-v1`, `cicluz-contratos-v1`, `cicluz-horas-v1`,
  `cicluz-referencias-pagamento-v1`, `cicluz-avaliacoes-v1`, `cicluz-horarios-funcionamento-v2`, `cicluz-produtos-resumo-v1`.
- Limites: 4 MB por documento (`TAMANHO_MAXIMO_DOCUMENTO`), 16 MB por lote (`LIMITE_CORPO_LOTE`), no máximo uma vez cada chave
  por lote, `versaoBase` inteiro ≥ 0 (0 = "acho que não existe").
- Chaves de controle (nunca vão ao servidor): `cicluz-sync-dono` e `cicluz-sync-pendentes` (localStorage) e `cicluz-sync-aba`
  (sessionStorage).

### 4.5 Sem conexão

- **Com a aba já aberta**: tudo continua gravando no localStorage; as chaves sincronizadas ficam na fila
  (`cicluz-sync-pendentes`) e sobem sozinhas quando a rede volta (5 s / 15 s / 60 s, evento `online`, ao voltar para a aba).
  Aviso "Sem conexão com o servidor…".
- **Abrindo uma aba nova sem rede**: o porteiro manda para `entrar.html`, que mostra "Sem conexão" e "Tentar de novo"; não abre
  o sistema até falar com o servidor (não há modo offline de entrada).
- Telas que dependem só da API (Lançamentos DES/MER/RET, Usuários, Senhas, Vendas PDV, Comandas, Extrato TNP, Transferências
  ao ler contas) mostram erro de conexão; a Agenda mostra a última cópia (`cicluz-agenda-cache-v1`) e não grava.
- **Sair sem rede** não apaga nada ("Não foi possível sair… Seus dados continuam neste aparelho").

### 4.6 Saída por tempo parado

`dist/agenda/rotina.js`: depois de N minutos sem mexer (padrão 15, configurável por pessoa em Configurações da Agenda, 1–480;
"posto do caixa nunca sai sozinho"), avisa 1 minuto antes ("Você vai sair do sistema em 1 minuto por falta de uso.") e clica o botão
"Sair do sistema" (ou vai para `entrar.html?sair=1`). Enquanto a pessoa mexe, faz `GET /api/sessao` no máximo 1 vez por minuto
para o servidor saber que está em uso.

### 4.7 Outras páginas fora do porteiro

- `dist/rodada.html?t=<token>`: página que o fornecedor abre para responder a cotação; não carrega `cicluz-sessao.js`.
- `/app/…`: app Nuxt (`servidor/web`) servido pelo servidor; o site antigo só tem um caminho morto para ele (`route('launch')`).

---

## 5. Pontos de atenção encontrados (para o assistente saber)

1. **Cadeia de redefinições**: `openSection` é redefinido em `groups.js` (linha 1734, limpa a tela) e embrulhado em `rotas.js`;
   `showTiGroup` em `groups.js` (1609); `showConfig` em `location-tree.js` (area) e `organogram.js` (organograma).
2. **Telas órfãs** sem cartão (seção 1.7), incluindo Prestadores, Contratos, Documentações, Horas Extras, Referências de Pagamento,
   Folhas Conplus, Gerência de Caixas e Tesouraria.
3. **Slug `vz-` com acento quebrado** (1.3). Funciona porque é usado igual dos dois lados, mas a URL fica estranha.
4. **Menu sempre em gaveta** (`min-width:0px`) e aberto ao carregar.
5. **Entrevistas**: `interviews.js` existe em `dist/` mas não é carregado; a tela é a reservada de `avaliacoes.js`.
6. **Visão Geral** e as **sub-áreas API** de Transferências, Despesas, Mercadorias e Retiradas estão vazias.
7. Rótulo de cor DES com dois tons de texto (`#a11c1c` no menu × `#9c1c1c` no resto).
8. `PROJECT_BRAIN/02_MAPA_DE_TELAS.md` **não foi usado como fonte**; tudo acima vem do código.


---

# Raio-x B — Cadastros mestres financeiros e de estrutura

> Levantado do **código** em 27/11/2026 (branch `feat/hierarquia-area-cargo-pessoa-20261124`). Onde o código e a
> documentação antiga (`PROJECT_BRAIN/03`, `04`) divergem, vale o código. "Não confirmado" = não achei no código.
> Caminhos relativos a `C:\CICLUZ\Pralis-Sistema\`. Nenhum dado real de pessoa ou valor foi copiado: só nomes de campos.

---

## 0. Visão geral: quem mora onde

| Cadastro (nome na tela) | Menu | Código | Chave do localStorage | Vai ao servidor? |
|---|---|---|---|---|
| VND - Grupos de Vendas | Entradas › Cadastros Geral | `dist/groups.js` `showFinancialGroup('vendas')` | `cicluz-financial-hierarchy-v1` → `.vendas` | Sim (documento inteiro) |
| VND - Tipos de Venda | Entradas › Cadastros Geral | `groups.js` `showFinancialGroup('tipos-venda')` | idem → `['tipos-venda']` | Sim |
| VND - Tipos de Bandeiras Cartões | Entradas › Cadastros Geral | `groups.js` `showFinancialGroup('bandeiras')` | idem → `.bandeiras` | Sim |
| VND - Tipos de Operadoras Cartões (com máquinas, custos e taxas) | Entradas › Cadastros Geral | `groups.js` + `dist/financeiro/operadoras-etapas.js` | idem → `.operadoras` | Sim |
| VND - Computadores | Entradas › Cadastros Geral | `groups.js` `showFinancialGroup('computadores')` | idem → `.computadores` | Sim (no documento; **não** projetado em tabela) |
| CNT - Grupos de Contas (contas, caixas, cofres, bancos) | Transferências › Cadastros Geral | `dist/index.html` linhas 341–372 (`showTiGroup`, `editAccount`) | `cicluz-ti-groups-v1` (`.contas`) + `cicluz-ti-account-details-v1` | Sim |
| DES - Grupos de Despesas | Saídas · Despesas › Cadastros Geral | `groups.js` `showFinancialGroup('despesas')` | `cicluz-financial-hierarchy-v1` → `.despesas` | Sim |
| MER - Grupos de Mercadorias | Saídas · Mercadorias › Cadastros Geral | `groups.js` `showFinancialGroup('mercadorias')` | idem → `.mercadorias` | Sim |
| RET - Grupos de Retiradas | Saídas · Retiradas › Cadastros Geral | `groups.js` `showFinancialGroup('retiradas')` | idem → `.retiradas` | Sim |
| DES - Área / Setor / Local | Saídas · Despesas › Cadastros Geral Colaboradores | `dist/location-tree.js` `showLocationTree` (+ `dist/org-units.js`) | `cicluz-location-tree-v1` | Sim |
| DES - Organograma | Saídas · Despesas › Cadastros Geral Colaboradores | `dist/organogram.js` `showOrganogram` | `cicluz-organogram-positions-v1` | Sim |
| Hierarquia Área › Cargo › Pessoa (sem tela própria; usada em Permissões) | — | `dist/hierarquia-dominio.js`, `dist/hierarquia.js` | `cicluz-hierarquia-v1` (marca), `cicluz-acessos-telas-v1` | **Não** (as duas fora da lista) |
| DES - Referências de Pagamento (tela sem cartão no menu atual — não confirmado se está acessível) | (`menuCrumb(2,'Cadastros Geral Colaboradores',…)`) | `dist/payment-refs.js` | `cicluz-referencias-pagamento-v1` | **Não** |
| Biblioteca de ícones (dentro de todo seletor de ícone) | "Mais ícones" › gestão | `dist/icon-library-manager.js`, `dist/bakery-icons.js` | `cicluz-icon-library-v1` | Sim |
| Minhas cores (dentro de todo `input type=color`) | — | `dist/shared-colors.js` | `cicluz-custom-colors-v1` (+ legado `cicluz-location-custom-colors-v1`) | Sim (as duas) |

Lista de chaves que sobem: `servidor/shared/src/documentos.ts` → `CHAVES_SINCRONIZADAS` (fonte única; o navegador recebe em
`GET /api/sessao`; envio em lote "tudo ou nada" por `dist/cicluz-sync.js`). Também sobem as **marcas de seed**:
`cicluz-financial-import-complete-v3-ret`, `cicluz-financial-legacy-import-v1`, `cicluz-bandeiras-import-v1`,
`cicluz-operadoras-import-v1`, `cicluz-ti-contas-seed-v1`, `cicluz-icon-pilot-migrated-v1`, `cicluz-job-icon-pilot-v1`.
**Não sobem**: `cicluz-org-seed-v1`, `cicluz-hierarquia-v1`, `cicluz-acessos-telas-v1`, `cicluz-referencias-pagamento-v1`,
preferências de tela (`cicluz-<chave>-sort`, `cicluz-<chave>-display`, `cicluz-account-sort`, `cicluz-fee-brand-order-<id>`).

No servidor o documento é guardado inteiro e **projetado** em tabelas por `servidor/api/src/projecoes/projetores.ts`:
`financeiro` (lê só `mercadorias/despesas/vendas/retiradas`, `tipos-venda`, `bandeiras`, `operadoras` + `fees`, `_transferHistory`
— função `lerFinanceiro` em `financeiro.leitura.ts`), `contas` (`lerContas`), `locais` (`lerLocais`), `organograma`
(`lerOrganograma`), identidade (`lerIdentidade`). Detalhes de cada um nas seções.

---

## 1. Estrutura comum dos grupos financeiros (`dist/groups.js`)

### 1.1 Configuração (`groupConfig`, linha 3)
| chave | título na tela | cor | código | tipo |
|---|---|---|---|---|
| `tipos-venda` | VND - Tipos de Venda | `#eab308` | — | plano (`flat`) |
| `bandeiras` | VND - Tipos de Bandeiras Cartões | `#eab308` | — | plano |
| `operadoras` | VND - Tipos de Operadoras Cartões | `#eab308` | — | plano |
| `computadores` | VND - Computadores | `#eab308` | VND | grupo › item |
| `contas` | CNT - Grupos de Contas | `#f97316` | CNT | (desviado para `index.html`) |
| `vendas` | VND - Grupos de Vendas | `#eab308` | VND | grupo › subgrupo |
| `retiradas` | RET - Grupos de Retiradas | `#2563eb` | RET | grupo › subgrupo |
| `mercadorias` | MER - Grupos de Mercadorias | `#22c55e` | MER | grupo › subgrupo |
| `despesas` | DES - Grupos de Despesas | `#ef4444` | DES | grupo › subgrupo |

Roteamento: `index.html:241` (`openSection`) chama `showTiGroup(key,…)`; `groups.js:1609` redefine `showTiGroup`: `contas` → a função
antiga do `index.html`; demais → `showFinancialGroup(key, icon, editId)` (`groups.js:1612`). `tiOrigem` (`index.html:216`) diz a qual
seção do menu cada um volta (0 Entradas, 1 Transferências, 2 Despesas, 3 Mercadorias, 4 Retiradas).

### 1.2 Formato salvo — `cicluz-financial-hierarchy-v1`
Um único objeto JSON:
```
{
  mercadorias: [Grupo], despesas: [Grupo], vendas: [Grupo], retiradas: [Grupo],
  computadores: [Grupo],            // grupo único 'computadores-grupo' com os PCs em children
  'tipos-venda': [Item], bandeiras: [Item], operadoras: [Item],
  _transferHistory: [RegistroDeTransferencia],   // exclusões com transferência
  _computadoresPadrao: true                       // marca dentro do documento
}
Grupo   = { id, name, active, icon, children:[Sub], identityMode, sigla, color, document,
            valueKind?, purpose?, directEntry? }
Sub     = { id, name, active, icon, identityMode, sigla, color, document, valueKind?, purpose?,
            computerId?, startTime?, endTime? }          // computerId/horários só em vendas
Item    = { id, name, active, icon, children:[] (seed), identityMode, sigla, color, document,
            saleTypeId? (bandeira), fees?, maquinas?, custosMaquina? (operadora) }
```
- IDs novos: `crypto.randomUUID()` (ou 32 hex). IDs de seed: `g0`, `g0s0`… (**repetem entre coleções**: `despesas.g0` = Impostos,
  `mercadorias.g0` = Cigarros, `vendas.g0` = Caixa PDV — só são únicos dentro da coleção), `ret-g0`…, `sale-type-0..12`,
  `brand-0..40`, `operator-0..9`, `computadores-grupo`, `computadores-pc-1..4`.
- Não há campo de versão dentro do documento; a versão está no nome da chave (`-v1`).
- Gravação: `persistGroups()` (`groups.js:1607`) — `setItem` do documento inteiro; em falha, `alert('Não foi possível salvar neste
  navegador.')` e o editor restaura o `snapshot` (`structuredClone`).

### 1.3 Seeds e migrações (ordem em que rodam ao carregar `groups.js`)
1. `groupSeed` (linhas 4–1543): mercadorias 17 grupos/77 subgrupos, despesas 28/88, vendas 3/10, retiradas 4/12, tipos de venda 13,
   bandeiras 41, operadoras 10. `DESP. BANCÁRIAS` recebe `directEntry=true` (linha 1544).
   `dist/group-seeds.json` é **cópia idêntica** dessas 7 listas (conferido) e **não é lido por nenhum código** do site (só citado em
   `PROJECT_BRAIN/cerebro-visual.html`).
2. Sem documento salvo → `financialGroups = structuredClone(groupSeed)` (linha 1547).
3. Flag **`cicluz-financial-import-complete-v3-ret`** (linha 1550): uma vez, junta o seed ao salvo **por id ou nome normalizado**
   (`normalized`: sem acento, sem espaço duplo, maiúsculas), sem apagar nem sobrescrever; acrescenta subgrupos que faltam.
4. Flag **`cicluz-financial-legacy-import-v1`** (linha 1565): uma vez, importa o editor plano antigo (`tiGroups.retiradas/vendas/
   mercadorias/despesas`, strings "CÓD Grupo - Sub") para a hierarquia, por nome.
5. Computadores (linhas 1582–1589): cria o grupo `computadores-grupo` ("Computadores"); se a lista antiga era plana, os itens viram
   filhos; marca **`_computadoresPadrao`** dentro do documento e cria uma vez `TNP-PC-CXPDV-1..4` (ids `computadores-pc-1..4`) se não
   houver nome igual. Computador apagado depois não volta (a marca vai junto ao servidor).
6. Linha 1590: se faltar `tipos-venda`/`bandeiras`/`operadoras`, copia o seed.
7. Flags **`cicluz-bandeiras-import-v1`** e **`cicluz-operadoras-import-v1`** (linhas 1591–1592): acrescentam bandeiras/operadoras do
   seed que faltem (por id ou nome).

### 1.4 Lista (tela) — comum a todos os grupos financeiros
- Cabeçalho: botões Expandir/Recolher todos os grupos (só hierárquicos), A/Z (`createAlphabetizeButton`), contagem no cabeçalho.
- Corpo: botão **"+ Novo grupo"** (hierárquicos) ou **"+ Adicionar tipo"** (planos); **"Histórico de transferências"** (só
  hierárquicos, abre `CicluzPreservation.history` filtrado por `module`); seleção **Exibição** ("Lista completa" / "Grupos e
  subgrupos", só hierárquicos); busca "Buscar grupo ou subgrupo" / "Buscar <singular>".
- Linha: alça ⠿ (arrastar; só reordena entre itens com a mesma situação, ativo com ativo), selo (ícone, logomarca ou 3 caracteres),
  nome (`CÓD Grupo - Sub`), situação "Ativo/Inativo", "+" para novo subgrupo (no grupo), seta de ações → Excluir / Editar
  (`createFinancialActions`, `dist/financial-components.js`).
- Ordem: ativos antes de inativos; depois alfabética (`localeCompare` pt-BR numérico) ou manual (preferência
  `cicluz-<chave>-sort` = `manual`/`name`, só do aparelho).
- Bandeira na lista mostra o atalho "Tipo: <tipo de venda>" que abre o tipo vinculado.

### 1.5 Editor (`edit(item, parent)`, `groups.js:1661`) — campos comuns
Título: "Cadastro do grupo" / "Cadastro do subgrupo" / "Cadastro do computador" / "Cadastro de <singular>". Quadro: "Dados do …".

| Campo na tela | Tipo | Obrig. | Regras |
|---|---|---|---|
| **Nome do grupo** / **Nome do subgrupo** / **Nome do computador** / **Nome do Tipo de Venda** / **Nome da Bandeira** / **Nome da Operadora** | texto | sim (`required`) | `maxLength 120`; formatado por `formatFinancialName` (`financial-components.js`: Título com siglas CNT/VND/PIX/… em maiúsculas; computador sempre MAIÚSCULAS); **não repetir nome entre irmãos** (mesma lista/mesmo grupo), comparação sem acento e sem caixa → "Este nome já existe." |
| **Referência documental** | seleção | não | `Selecione`, `DOC/F`, `DOC/NF`, `DOC/F/NF` → grava `document`. Em **Computadores o campo não aparece** (grava `''`). O servidor recusa outro valor. |
| **Situação do …** (chave Ativo/Inativo) | chave | — | grava `active` (padrão ativo) |
| **Identificador** | seleção | — | `Ícone` (`icon`) / `3 caracteres` (`text`) → `identityMode` |
| **3 caracteres** | texto | sim se modo texto | corta em 3 grafemas (`compactText`) → `sigla` |
| **Ícone do …** (galeria + "Mais ícones") | escolha | — | índice numérico do ícone (0 = padrão do menu), id de ícone padaria/biblioteca (`custom-…`), id de ícone de computador (`pc-notebook`, `pc-torre`, `pc-servidor`, `pc-tablet`, `pc-celular`, `pc-impressora`, `pc-leitor`) ou, em operadora, `operator:<marca>` → `icon` |
| (cor) | — | — | `color` é gravado, mas o `input type=color` "Cor do item" **não é colocado na tela** (`chosenColor` nunca é anexado): grava a cor que já existia ou a cor da origem. |
| Prévia ao vivo | — | — | — |
| Botões | — | — | **Salvar** (submit) · **Cancelar** (volta à lista) |

---

## 2. VND - Grupos de Vendas (`vendas`)
- **Menu**: Entradas · Vendas / Faturamento › Cadastros Geral › VND - Grupos de Vendas (`ti-vendas`).
- **Seed**: CAIXA PDV (subgrupos 1M, 1T, 2M, 2T, 3M, 3T, 4M, 4T), NFE (EMPRESAS), DELIVERY (IFOOD).
- **Campos**: os comuns (1.5). No **subgrupo** (só vendas, `groups.js:1677–1685`), numa linha:
  | Campo | Tipo | Obrig. | Regra |
  |---|---|---|---|
  | **Computador** | seleção | não | lista os PCs de VND - Computadores **ativos** (e o já escolhido, com "(Inativo)"); se o id não existe mais: "Computador removido — selecione outro" → grava `computerId` (**ID**) |
  | **Horário inicial** | hora (`CicluzComprasUI.campoHora`) | não | → `startTime` |
  | **Horário final** | hora | não | → `endTime`; se só um dos dois foi preenchido: "Informe os dois horários." Não valida final < inicial (pendência P-45). |
- **Quem usa**: `dist/vendas-pdv/dados.js` `gruposDeVendas()` — só subgrupos ativos com `computerId`+`startTime`+`endTime`; liga o
  computador ao PDV do Sistema Pralis **pelo NOME** do computador (não por id: os sistemas não dividem ids).
- **Servidor**: grupos/subgrupos projetados (`fin_*`); **`computerId`, `startTime`, `endTime` não são lidos** pela projeção
  (ficam só no JSON do documento).

## 3. VND - Tipos de Venda (`tipos-venda`)
- **Menu**: Entradas › Cadastros Geral › VND - Tipos de Venda (`ti-tipos-venda`).
- **Plano** (sem subgrupos). Seed: 13 tipos (`sale-type-0..12`) no padrão "LETRA - NOME (DESTINO)", ex.: "I - DINHEIRO (VND)",
  "D - DEBITO (VND/TRAN)", "E - COLABORADORES (VND/DES)", "O - SOCIOS/PROPRIETARIOS (VND/RET)", "S - SOBRA/PERDA -66,6% (MER)",
  "CREDIARIO", "P - PIX BANCO (VND/TRANS)". O nome é formatado mantendo a letra inicial e o parêntese em maiúsculas.
  O sufixo entre parênteses **é só texto**: não há campo que diga para onde o tipo leva (nenhuma regra usa isso no código).
- **Campos**: Nome do Tipo de Venda, Referência documental, Situação do Tipo de Venda, Identificador, 3 caracteres, Ícone do Tipo de
  Venda (comuns).
- **Ligações**: é referenciado por **Bandeira.`saleTypeId`** (ID). Botão "Abrir Tipo de Venda" no cadastro da bandeira abre este.
- **Excluir**: bloqueado — `alert('Este cadastro possui vínculos próprios. Use a opção Inativo para preservar o histórico.')`.
  Inativo some da lista de escolha da bandeira (fica se já estava escolhido, com "(Inativo)").

## 4. VND - Tipos de Bandeiras Cartões (`bandeiras`)
- **Menu**: Entradas › Cadastros Geral (`ti-bandeiras`). Plano. Seed: 41 (`brand-0..40`; Dinheiro, Elo/Visa/Master/… crédito e
  débito, vales alimentação/refeição/benefícios, Pix débito…).
- **Campos**: comuns + **Tipo de Venda** (seleção, **obrigatório** `required`, "Selecione o tipo de venda"; só ativos ou o atual) →
  `saleTypeId` (**ID** do tipo de venda) e botão **"Abrir Tipo de Venda"** (exige seleção).
- **Logomarca automática**: sem ícone escolhido, `getPaymentMark('bandeiras', nome)` (`dist/payment-marks.js`) procura o prefixo do
  nome (`paymentBrandPrefixes`: ELO, VISA, MASTERCARD, HIPERCARD, AMEX, CABAL, SODEXO, UP, ALELO, VR, TICKET. RES, GREEN CARD,
  BEN VISA VALE, BK BANK, PIX, MAESTRO, PLUXEE, REDECOMPRAS) e mostra a imagem de `dist/assets/payment-marks/`. Nome que começa com
  "DINHEIRO" usa o ícone padrão.
- **Ligações**: bandeira → tipo de venda (`saleTypeId`). Bandeira é a chave das **taxas da operadora**
  (`operadoras[].fees.brands[<brandId>]`). Toda bandeira (inclusive inativa, marcada "· Inativa") aparece no painel de taxas de toda
  operadora.
- **Servidor**: `lerFinanceiro` recusa a projeção se `saleTypeId` aponta para tipo que não existe ("tipo de venda vinculado não
  existe mais").
- **Excluir**: bloqueado (mesmo alerta dos planos). Inativar.

## 5. VND - Tipos de Operadoras Cartões (`operadoras`)
- **Menu**: Entradas › Cadastros Geral (`ti-operadoras`). Plano. Seed: 10 (`operator-0..9`: Stone, Getnet, Cielo, PagBank, SafraPay,
  Rede, Mercado Pago, SumUp, Ton, InfinitePay).
- **Tela em 4 etapas** (`dist/financeiro/operadoras-etapas.js`, `CicluzOperadoraEtapas.montar`, barra `CicluzStepper` layout wizard):
  **1 Dados da operadora · 2 Cadastro das máquinas · 3 Custo das máquinas · 4 Taxa das bandeiras.**
  Botões Voltar / Cancelar / Avançar / Salvar. Operadora **nova só salva na última etapa**; existente salva de qualquer etapa.
  Avançar valida a etapa (nome na 1, máquinas na 2, custos na 3); erro de outra etapa leva até ela (`form.irParaEtapa`).

### 5.1 Etapa 1 — Dados da operadora
Comuns (1.5): Nome da Operadora, Referência documental, Situação da Operadora, Identificador, 3 caracteres, Ícone da Operadora.
A galeria tem também as **logomarcas** de `paymentOperatorPrefixes` (grava `icon = 'operator:<marca>'`). Sem ícone, a logomarca é
deduzida do nome.

### 5.2 Etapa 2 — Cadastro das máquinas (`painelMaquinas`) → `operadoras[].maquinas`
`[{ id, apelido, modelo, serie, ativa }]`
| Campo | Tipo | Obrig. | Regras |
|---|---|---|---|
| **Apelido da máquina \*** | texto | sim | máx. 60; espaços colapsados; **não repetir** apelido na mesma operadora (sem acento/caixa) |
| **Modelo** | texto | não | máx. 60 |
| **Número de série** | texto | não | máx. 40; se informado, **não repetir** na mesma operadora |
| **Situação da máquina** | chave Ativa/Inativa | — | `ativa` |
Botões "+ Adicionar máquina"; "− Remover máquina" **só para linha ainda não salva** — máquina já salva não se exclui, inativa-se
(comentário: turnos e fechamentos podem citá-la; no código atual nenhum outro arquivo lê `maquinas` — não confirmado que algo cite).

### 5.3 Etapa 3 — Custo das máquinas (`painelCustos`) → `operadoras[].custosMaquina`
`[{ id, expenseId, tipo, descricao, cobrado, aplicaA, calculo, valor, periodicidade, faixa, faixaDe, faixaAte, faixaMedida, inicio, fim, obs }]`
Atalhos: "+ Aluguel", "+ Mensalidade", "+ Adesão", "+ Instalação", "+ Outro custo". Cada cartão tem um resumo em texto.
| Campo | Tipo | Obrig. | Valores / regras |
|---|---|---|---|
| **Tipo de custo \*** | seleção | sim | Aluguel da máquina, Mensalidade ou assinatura, Taxa de adesão ou ativação, Instalação ou envio, Manutenção ou suporte, Taxa por inatividade (máquina sem uso), Seguro ou proteção, Multa de cancelamento ou devolução, Bobinas e insumos, Outro custo |
| **Qual é o custo? \*** | texto | sim se "Outro custo" | máx. 80 → `descricao` |
| **Grupo de Despesa** (quadro vermelho) | seleção | **sim** | grupos e subgrupos de DES ativos ("DES - Grupo / Sub"); id ausente → "Grupo indisponível — selecione outro" → `expenseId` (**ID**) |
| **Quem paga** | seleção | — | `maquina` Por máquina / `operadora` Operadora toda |
| **Máquinas que pagam** | chips | — | só aparece se "Por máquina" e há >1 máquina: "Todas as máquinas" ou as marcadas → `aplicaA` = `'todas'` ou `[ids de máquina]` (**ID**) |
| **Como é cobrado** | seleção | — | `reais` Valor fixo (R$) / `percentual` % do faturamento |
| **Valor (R$) \*** | valor (texto com máscara `data-money`) | sim | ≥ 0 (zero = isento) → `valor` **número em reais (decimal), não centavos** |
| **Percentual do faturamento (%) \*** | texto | sim se % | 0–100, vírgula aceita → `valor` |
| **De quanto em quanto tempo** | seleção | — | `mes` Por mês, `ano` Por ano, `dia` Por dia, `unica` Uma única vez, `transacao` Por transação |
| **Vale em qual faixa de faturamento** | seleção | — | `sem` Sem faixa (vale sempre), `maquina` Faturamento da máquina, `operadora` Faturamento total da operadora |
| **Faturamento a partir de (R$)** / **Faturamento até (R$) — vazio = sem limite** | valor | um dos dois se há faixa | até ≥ de |
| **Faturamento medido** | seleção | — | `mes` no mês / `ano` no ano |
| **Início da vigência \*** | data | sim | ISO `AAAA-MM-DD` (o `date-fields.js` mostra DD/MM/AA) |
| **Fim da vigência (opcional)** | data | não | ≥ início |
| **Observações** | texto | não | máx. 200 |
Regra de **sobreposição**: dois custos do mesmo tipo (e mesma descrição se "Outro"), mesma periodicidade, mesmas máquinas (ou
operadora toda/"todas") e mesma faixa, com vigência **e** faixa de faturamento sobrepostas → erro "há dois custos iguais com
vigência … sobrepostas". Remover: "− Remover custo" com dois cliques ("Confirmar remoção").
**Nenhum cálculo ou relatório usa estes custos** (pendência `PROJECT_BRAIN/11` P-50).
O campo de texto **"Custos fixos da operadora (aluguel, mensalidade e condições)"** (textarea, `fees.overhead`) aparece nesta etapa.

### 5.4 Etapa 4 — Taxa das bandeiras ("Taxas por bandeira") → `operadoras[].fees`
`fees = { brands: { <brandId>: [Condicao] }, overhead: texto }`. Uma seção recolhível por **bandeira** (todas as bandeiras do
cadastro), com "Tipo de Venda: <nome>" ou "Não vinculado", busca "Buscar bandeira nas taxas", A/Z, expandir/recolher e arrastar
(ordem por operadora em `cicluz-fee-brand-order-<operadoraId|new>`, só do aparelho).
`Condicao = { start, end, mode, from, to, mdr, fixed, advanceMode, advance, period, days, dayKind, notes, expenseId, accountGroup }`
(todos gravados como **texto** vindo do campo).
| Campo na tela | chave | Tipo | Obrig. | Regras |
|---|---|---|---|---|
| **Início da vigência** | `start` | data | sim | "Informe o início da vigência." |
| **Fim da vigência (opcional)** | `end` | data | não | fim ≥ início |
| **Modalidade** | `mode` | seleção | sim | Débito, Crédito à vista, Crédito parcelado lojista, Crédito parcelado emissor, Voucher / Benefícios, Pix, Dinheiro, Outra |
| **Parcelas de** / **Parcelas até** | `from`/`to` | número inteiro ≥0 | par | os dois ou nenhum; de ≥ 1 e até ≥ de |
| **Taxa administrativa / MDR (%)** | `mdr` | número 0–100, passo 0,0001 | não | vazio = não informado; 0 = isento |
| **Tarifa por transação (R$)** | `fixed` | valor (`data-money`) | não | se veio com "R$" vira número por `CicluzFieldRules.moneyNumber` → texto em **reais** (servidor guarda até 4 casas, sem centavos) |
| **Antecipação** | `advanceMode` | seleção | — | Não configurada, Sem antecipação, Taxa separada, Incluída na taxa administrativa |
| **Taxa de antecipação (%)** | `advance` | número 0–100 | se "Taxa separada" | só pode ser preenchida com "Taxa separada" |
| **Periodicidade da antecipação** | `period` | seleção | se "Taxa separada" | Ao dia, Ao mês, Por operação |
| **Prazo de recebimento (dias)** | `days` | inteiro | não | — |
| **Contagem do prazo** | `dayKind` | seleção | não | Dias úteis, Dias corridos |
| **Observações / condições do contrato** | `notes` | texto | não | — |
| **Grupo de Despesa** (quadro vermelho, selo "−$") | `expenseId` | seleção | **sim** | grupos e subgrupos de DES ativos; "Selecione o Grupo de Despesa para classificar o abatimento." Id sumido → "Grupo indisponível — selecione outro" |
| **Grupo de Contas** / "Transferências Automáticas" (quadro laranja) | `accountGroup` | seleção | não | lista `tiGroups.contas` (ativas, ou a atual com "(Inativa)") — **grava o NOME da conta, não um id**; nome sumido → "<nome> (Indisponível)" |
**Vigência sem sobreposição** (`readOperatorFees`, `groups.js:1725–1727`): na mesma bandeira e mesma modalidade, duas condições com
faixa de parcelas que se cruza (vazio = 1) **e** vigências que se cruzam (fim vazio = 31/12/9999) → "Há condições com vigências e
parcelas sobrepostas nesta modalidade." Erros mostram `alert('<Bandeira>: <problema>')` e levam à etapa 4.
Botões "+ Adicionar vigência/condição" e "− Remover vigência/condição" (dois cliques, "Cancelar remoção").
Nada é preenchido automaticamente; nenhuma taxa é aplicada em cálculo no site (não confirmado uso em relatório).

### 5.5 Servidor (operadoras)
`lerFinanceiro` projeta operadora (`custosFixos` = `fees.overhead`) e cada condição em `LinhaTaxa` (`despesaId`, `contaNome` = nome
da conta). **Recusa** a projeção se: taxa ligada a bandeira inexistente; `expenseId` vazio ou de grupo **excluído** ("o grupo de
despesa vinculado foi excluído; escolha outro na tela"); modalidade vazia. **`maquinas` e `custosMaquina` não são projetados**
(sobem só dentro do JSON; o comentário de `operadoras-etapas.js` diz "só neste aparelho", o que está desatualizado: a chave é
sincronizada).

### 5.6 Excluir operadora
Bloqueado (alerta dos planos). Inativar.

## 6. VND - Computadores (`computadores`)
- **Menu**: Entradas › Cadastros Geral (`ti-computadores`). Grupo único "Computadores" (aparece como "VND Computadores"), os
  computadores são os itens (palavra "computador" no lugar de "subgrupo").
- **Campos**: Nome do computador (**sempre MAIÚSCULAS**, mesmo digitando), Situação, Identificador, 3 caracteres, Ícone (galeria com
  ícones de equipamento primeiro). **Sem** Referência documental. Pendência P-45 (local, série, IP, responsável não existem).
- **Ligações**: referenciado por **subgrupo de Vendas `.computerId`** (ID). Inativo (ou grupo inativo) some da escolha.
- **Servidor**: **não projetado** em tabela (só JSON).
- **Excluir**: transferência (`CicluzPreservation.choose`) para outro computador ativo; o subgrupo de vendas que apontava fica com
  "Computador removido — selecione outro" (não é remapeado).

## 7. DES - Grupos de Despesas (`despesas`)
- **Menu**: Saídas · Despesas / Custos › Cadastros Geral (`ti-despesas`).
- **Seed**: 28 grupos (`g0`–`g27`), ex.: IMPOSTOS, TAXA CARTÕES, ALUGUEL, ENERGIA, FOLHA PAG (`g8`), PREMIAÇÃO, BENEFÍCIOS, DIARIAS E
  H. EXTRAS, ENCARGOS SOCIAIS, VALE TRANS., 13º, FÉRIAS E RESCISÕES (`g15`), UNIFORMES, MANUT. EMPRESA, DESP. BANCÁRIAS (`g23`,
  `directEntry`), TRANSPORTE, TREINAMENTO, MARKETING.
- **Campos**: comuns + **Referência de Custo** (seleção, opcional; grupo e subgrupo escolhem separadamente, subgrupo **não herda**):
  `''` Selecione · `variavel/variavel` "R$ VALOR VARIÁVEL / DES - VARIÁVEL" · `fixo/variavel` "R$ FIXO / DES - VARIÁVEL" ·
  `variavel/fixo` "R$ VALOR VARIÁVEL / DES - FIXO" · `fixo/fixo` "R$ FIXO / DES - FIXO" → `valueKind`. No **grupo**, botão
  **"Subgrupos"** (`CicluzComprasUI.botaoTitulo` + `seletorDeItens`) para copiar a Referência aos subgrupos marcados ao salvar
  (desabilitado se não há subgrupos, sem Referência escolhida ou todos já iguais). Significado e uso: pendência P-40 — nenhum cálculo
  usa `valueKind`; **não é projetado no servidor**.
- `directEntry` (grupo que aceita lançamento direto mesmo tendo subgrupos): só no seed de DESP. BANCÁRIAS; **não há campo na tela**;
  projetado como `lancamentoDireto`.
- **Quem depende de Despesas (por ID)**: taxas da operadora (`fees…expenseId`), custos das máquinas (`custosMaquina[].expenseId`),
  `dist/producao/dados.js` `gruposDespesa()`/`nomeGrupoDespesa(grupoId, subgrupoId)` (Produção/Patrimônio), `dist/folha-custos.js`
  `colunas()` (colunas fixas por id `g8`–`g15`: se o grupo for excluído, a coluna some), Lançamentos de Saídas (via servidor,
  `cadastros.grupos`, `dist/lancamentos/lancamentos.js` `grupoId`). `payment-refs.js` cita "Folha de Pagamento → Diárias e Horas
  Extras" só em texto.

## 8. MER - Grupos de Mercadorias (`mercadorias`)
- **Menu**: Saídas · Mercadorias / CMV › Cadastros Geral (`ti-mercadorias`). Seed 17 grupos (Cigarros, Bomboniere, Sorvetes,
  Bebidas, Frios, Laticínios, Biscoitos, Mercearia, Congelados, Polpa de Fruta, Fab. Própria, Fab. Própria Base, Embalagens, Mat.
  Prima, Patrimônio Não Vendas, Inativos, Material Limpeza).
- **Campos**: comuns + Referência de Custo (com "MER") + **Finalidade da mercadoria** (seleção opcional: `VENDA`,
  `TRANSFORMAÇÃO` → `purpose`; sem inferência automática; projetado como `finalidade`).
- **Quem depende (por ID)**: Compras › produtos (`dist/compras/dados.js` `gruposMercadoria()`, `nomeGrupo(grupoId, subgrupoId)`;
  produto grava `grupoId`/`subgrupoId`, `compras/produtos-api.js`), Lançamentos de Mercadorias (servidor).

## 9. RET - Grupos de Retiradas (`retiradas`)
- **Menu**: Saídas · Retiradas / Investimentos › Cadastros Geral (`ti-retiradas`). Seed (ids `ret-g0..3`): INVESTIMENTO (6
  subgrupos de patrimônio), SÓCIOS, PRO LABORE (subgrupos com nome de sócio — não reproduzidos aqui), PARTICIPAÇÃO.
- **Campos**: comuns + Referência de Custo (com "RET").
- **Quem depende (por ID)**: Patrimônio — `compras/dados.js` `gruposPatrimonio()` usa **id fixo `ret-g0`** (Investimento, decisão de
  19/11/2026); Lançamentos de Retiradas (servidor, `grupoId`).

## 10. Excluir / inativar nos grupos hierárquicos (vendas, despesas, mercadorias, retiradas, computadores)
- Excluir abre **"Transferir antes de excluir"** (`dist/preserve-history.js` `CicluzPreservation.choose`): escolher destino
  (grupo: outro grupo ativo da mesma coleção; subgrupo: outro subgrupo ativo de grupo ativo, em qualquer grupo), "Continuar" →
  "Confirmar transferência". Sem destino possível, o botão fica desabilitado.
- Efeito: **grupo** — os subgrupos vão para o destino e o grupo sai; **subgrupo** — só sai (nada é copiado para o destino).
  Grava em `_transferHistory` `{module, parentId, date, sourceId, sourceName, targetId, targetName, sourceSnapshot}`
  (`CicluzPreservation.record`). Consultável em "Histórico de transferências".
- **Não remapeia nenhum vínculo** que aponte para o id removido (taxas, custos de máquina, produtos, lançamentos, `computerId`,
  colunas da folha). Consequências conferidas no código: o seletor mostra "Grupo indisponível — selecione outro"; a projeção do
  servidor **falha** se uma taxa aponta para despesa excluída.
- Inativar: chave Situação. Inativo vai para o fim da lista, some das escolhas novas, continua visível onde já estava escolhido.
- Planos (tipos de venda, bandeiras, operadoras): excluir **bloqueado**, só inativar.

---

## 11. CNT - Grupos de Contas (contas, caixas, cofres, bancos)
- **Menu**: Transferências · Contas / Locais › Cadastros Geral › CNT - Grupos de Contas (`ti-contas`).
- **Código**: `dist/index.html` 341–372 — `showTiGroup('contas',…)` (lista) e `editAccount(original,…)` (editor). É o editor **mais
  antigo** e o único cadastro financeiro **sem id**.
- **Formato**:
  - `cicluz-ti-groups-v1` = `{ contas: ["CNT Conta - …", …] }` (lista de **nomes**, na ordem da tela; o objeto pode ter chaves
    legadas `retiradas/vendas/mercadorias/despesas` do editor plano antigo).
  - `cicluz-ti-account-details-v1` = `{ "<nome da conta>": { document, status: 'ATIVA'|'INATIVA', icon, color } }`
    (**indexado pelo nome**).
  - Seed: `initialAccountGroups` (34 nomes: contas bancárias e de operadoras, "Fluxo" Crédito/Débito/Voucher/Pix/Crediário/Cartões/
    Caixa, Cofre Principal, Cofre Troco, Caixa 1M…4T, contas de diretoria/gerência/compras/manutenção), aplicado uma vez pela flag
    **`cicluz-ti-contas-seed-v1`** (os nomes do seed vêm primeiro, depois os que o usuário já tinha, sem repetir, sem caixa).
- **Lista**: botão "Adicionar grupo", busca "Buscar grupo", A/Z, linha com alça, selo, nome, "Referência · Situação", "Ativa/Inativa".
  Ordem: ativas primeiro; alfabética ou manual (`cicluz-account-sort`, só do aparelho).
- **Editor "Cadastro da conta"** (quadro "Dados da conta"):
  | Campo | Tipo | Obrig. | Regras |
  |---|---|---|---|
  | **Nome da conta** | texto | sim | `maxLength 100`; `formatFinancialName`; **não repetir** (comparação sem caixa, **com** acento) → "Esta conta já existe." |
  | **Referência documental** | seleção | não | `DOC/F`, `DOC/NF`, `DOC/F/NF` → `document` |
  | **Situação da conta** | chave Ativa/Inativa | — | → `status` `ATIVA`/`INATIVA` |
  | **Identificador** / **Até 3 caracteres** | seleção / texto | texto obrig. no modo texto | `CicluzIdentity.controls` (`bakery-icons.js`); 3 caracteres em MAIÚSCULAS; grava `icon = 'text:XYZ'` |
  | **Ícone da conta** (+ "Mais ícones") | escolha | — | `transfer` (padrão, sigla CNT), `terminal`, `dollar`, `bank`, `pig`, `wallet`, `card`, `safe`, ícones padaria, ou logo de banco `bank-bb`, `bank-bradesco`, `bank-btg`, `bank-itau`, `bank-nubank`, `bank-pagbank`, `bank-safra`, `bank-santander`, `bank-visa`, `bank-mastercard`, `bank-getnet`, `bank-cielo`, `bank-stone`, `bank-mercadopago`, `bank-inter`, `bank-sicoob` (`assets/banks/`) |
  | **Cor da conta** | cor | — | o campo está **escondido** e começa sempre em `#f97316`: na prática grava sempre laranja |
- **Renomear**: troca o nome na lista e move os detalhes para a nova chave (apaga a antiga). **Qualquer referência pelo nome antigo
  fica órfã** (ex.: `accountGroup` das taxas das operadoras vira "(Indisponível)").
- **Excluir**: **bloqueado** — `alert('Para preservar o histórico da conta, altere sua situação para INATIVA. A exclusão definitiva
  está bloqueada.')`. Inativar pela chave.
- **Ligações**:
  - Taxa da operadora → conta: `fees.brands[*][*].accountGroup` = **nome** da conta (não id).
  - **Conta → local: não existe** campo de local na conta (não confirmado em nenhum arquivo). O título do menu "Contas / Locais" é
    só agrupamento.
  - Caixa/Tesouraria (`dist/caixa/*`): usa contas **próprias e fictícias** (`caixa/dados.js`: `cofre`, `troco`, `cx-1m`…`cx-4t`), sem
    ligação com este cadastro.
  - CNT - Transferências (`dist/transferencias/transferencias.js`) e Lançamentos de Saídas leem as contas de **`/api/contas`**
    (servidor), que vêm da projeção `contas` (`lerContas`: nome, ordem, situação, documento, ícone; cor não projetada). A
    transferência ainda não grava (P-48).

---

## 12. DES - Área / Setor / Local (`dist/location-tree.js` + `dist/org-units.js`)
- **Menu**: Saídas · Despesas / Custos › Cadastros Geral Colaboradores › DES - Área / Setor / Local (`config-area`, desvia
  `showConfig('area')` para `showLocationTree`).
- **Níveis**: Área › Setor › Local › Sublocal (4 níveis; `levels`). Árvore com expandir/recolher, busca "Buscar área, setor, local ou
  sublocal", A/Z (ordena todos os níveis e grava), arrastar (alça ⠿ ou setas ↑↓), "+ Nova área", "+" em cada nó para o nível de
  baixo, "Histórico de transferências", contagem de itens abaixo.
- **Formato** `cicluz-location-tree-v1` = `{ tree: [No], history: [Transferencia] }` (o formato legado era a lista direto; os dois
  são lidos).
  `No = { id, name, color, identityMode ('text'|'icon'), sigla, icon, inactive, cargoIds: [idDeCargo], children: [No] }`.
- **Editor** (janela `dialog.location-dialog`, título "Cadastrar/Editar Área|Setor|Local|Sublocal", com a sigla na frente):
  | Campo | Tipo | Obrig. | Regras |
  |---|---|---|---|
  | **Nome** | texto | sim | `maxLength 120`; **não repetir no mesmo nível/mesmo pai** (sem caixa) → "Este nome já existe neste nível." |
  | **Identificação** › Identificador / Até 3 caracteres / ícone | seleção / texto / escolha | sigla obrig. no modo texto | sigla sugerida do nome, 3 grafemas MAIÚSCULAS ("Preencha até 3 caracteres.") |
  | **Cor** ("Escolher cor": paleta de 48 + "Cor personalizada" + "Minhas cores") | cor | — | cor nova vai para `cicluz-custom-colors-v1` |
  | **Situação da área / do setor / do local** | chave | — | `inactive`; "Inativo não aparece para novos vínculos; o histórico é mantido." |
  | **Cargos desta área/setor/local** | botão "Escolher cargos" (`CicluzComprasUI.seletorArvore`) | não | lista os cargos de `CicluzHierarquia.cargos()` → `cargoIds` (**IDs** de cargo: `ref:N` ou id próprio). "O colaborador é ligado ao cargo no cadastro dele." |
- **Seed por PDF** (`org-units.js` `seed()`): flag **`cicluz-org-seed-v1`** = `{at, source:'PRALIS-Areas-Setores-Subsetores.pdf',
  added}` (**não sincronizada**). Junta por nome, sem apagar: 7 áreas (Gestão, Comercial, Operação de Loja, Operação de Produção,
  Financeiro, Gestão de Pessoas, Infraestrutura e Tecnologia), 20 setores, 11 subníveis, com cor por área. Risco não confirmado: num
  aparelho sem a flag, o seed pode reacrescentar por nome uma área que foi apagada em outro aparelho.
- **APIs de leitura**: `window.CicluzOrg` (`flat`, `byId`, `areas`, `childrenOf`, `pathOf`, `namesOf(ids, nivel)`; nível 1 Área, 2 Setor,
  3 Local, 4 Sublocal; inativo marcado em cadeia) e `window.CicluzLocationTree` (`seletor`, `campo` "Áreas, setores e locais",
  `janelaUnica` escolha única, `caminhoDe(id)` "Área › Setor › Local", `idPorNome`, `nomeDe`, `cargosDaArea`, `definirCargosDaArea`,
  `areasComCargos`).
- **Quem depende (por ID do nó)**: pessoa `orgUnitIds` (`people.js`; contratos, exames, avaliações, patrimônio), Ficha de Cargos
  `unitIds` (`cicluz-job-profiles-v1`), produto do Compras `localId` ("Setor de estoque"; texto antigo `txt:nome` sem vínculo),
  Patrimônio `localId`, Ficha técnica da Produção (etapa `localId`), Acesso por Tela (`area:ID`, `cargo:ÁREA|CARGO`).
  **Por nome** (exceções herdadas): `payment-refs.js` (setor por nome), filtros antigos via `idPorNome`.
- **Excluir**: transferência obrigatória (`CicluzPreservation.choose`) para outro nó **do mesmo nível**; os filhos vão para o destino,
  o nó sai e o registro vai para `history` (`{level, date, sourceId, …, sourceSnapshot}`). **`cargoIds` do nó excluído não vão para o
  destino** (ficam só na cópia do histórico) e `orgUnitIds`/`localId` que apontavam para ele **não são remapeados**.
- **Servidor**: `lerLocais` projeta id, pai, nível (até 4), ordem, nome, ícone, modo, sigla, cor e o histórico. **Não lê
  `inactive` nem `cargoIds`** (ficam só no JSON).

## 13. Hierarquia Área › Cargo › Pessoa (`hierarquia-dominio.js` regras puras; `hierarquia.js` cola nos dados)
- **Vínculos (todos por ID)**: área/setor/local guarda `cargoIds` (única cópia do vínculo Área › Cargo); pessoa guarda `jobKey` (id do
  cargo, `ref:N` para cargo de referência ou id próprio) **e** `jobName` (nome, nunca apagado); pessoa pode ter `orgUnitIds`
  (várias áreas). Sem áreas marcadas, a pessoa aparece em toda área que tem o cargo dela.
- **Cargos**: vêm de `jobsCurrent()` (`index.html:287`): `cicluz-cargos-v1` (cargos próprios, id próprio) + catálogo de referência
  no código com alterações em `cicluz-cargos-referencia-v1` (`ref:i`, excluído = `deleted`). O detalhe de cargos/salários é de outro
  capítulo do raio-x.
- **Migração** `migrar()` uma vez, flag **`cicluz-hierarquia-v1`** = relatório `{version:1, em, pessoasVinculadas, pessoasSemCargo[],
  pessoasAmbiguas[], vinculosDeArea}`: põe `jobKey` nas pessoas pelo nome do cargo **só se houver UM cargo com o nome**
  (`casarCargo`, compara `nome` e `nomeReduzido`), e copia para as áreas os vínculos das Fichas de Cargos (`unitIds`). Nada é
  apagado; falhou → tenta no próximo carregamento.
- **Regras**: `erroDeCargo` ("Escolha o cargo do colaborador." / "O cargo escolhido não existe mais. Escolha outro."); permissões
  (`resolverConfig`): vale a mais específica — pessoa › cargo-na-área › área; dentro do nível, a área mais próxima; várias áreas =
  soma das permissões. `podeUsar` exige cargo e configuração que libere alguma tela.
- **Dados de acesso**: `cicluz-acessos-telas-v1` = `{version:1, configs:{'area:ID'|'cargo:ÁREA|CARGO'|'pessoa:ID': {telas, acoes,
  conhecidas}}, atualizadoEm}` — **não está na lista sincronizada**. `paraServidor()` monta o mínimo (id, nome, cargoId, areaIds,
  ativo; pai de cada área; configs) — sem CPF/salário; quem chama e para onde envia: não confirmado neste levantamento.

## 14. DES - Organograma (`dist/organogram.js`)
- **Menu**: Saídas · Despesas › Cadastros Geral Colaboradores › DES - Organograma (`config-organograma`).
- **Formato** `cicluz-organogram-positions-v1` = `{ nodes: [Posicao], versions: [{date, nodes}] }`;
  `Posicao = { id, jobKey, jobName, cbo, quantity, label, children: [Posicao] }`. Cada salvamento empilha a versão anterior em
  `versions` (cresce sem limite).
- **Editor "Nova posição / Editar posição"**: **Buscar cargo** (texto: nome, categoria ou CBO), **Cargo** (seleção obrigatória,
  "Selecione um cargo", mostra "· CBO n"), contexto "Responde a: <cargo pai>". `quantity` fica 1 (não há campo na tela); `label` não
  tem campo. Botões Salvar/Cancelar; "+" cria posição filha; "Cadastrar cargo" abre Cargos.
- **Ligação**: posição → cargo por `jobKey` (`local:i` ou `ref:i`, **a chave de posição em `jobsCurrent`, não o `id` do cargo**:
  `local:i` muda se a ordem dos cargos próprios mudar — risco) e `jobName`/`cbo` (o editor reencontra a seleção por nome+CBO).
  Não liga posição a área nem a pessoa ("Sem colaboradores vinculados" é texto fixo).
- **Excluir**: **não há** exclusão de posição na tela (só criar e editar).
- **Servidor**: `lerOrganograma` (quantidade ≥ 1, cargo obrigatório; versões).

## 15. DES - Referências de Pagamento (`dist/payment-refs.js`)
- Tabela de valores por **setor** (por nome, não id) e tipo: Período de teste (por dia), Diária (por dia), Dobra (por dobra), Hora
  extra (por hora), Vale-transporte (por vale). Campos: **Setor \*** (texto com sugestões de `knownSectors()` — setores das pessoas e
  áreas da Ficha de Cargos), **Tipo de pagamento \***, **Valor \*** (centavos inteiros > 0, `valueCents`), **Início da vigência \***,
  **Fonte da informação \***, **Observação**. Nova referência do mesmo setor/tipo começa na sua data (vigente = a mais recente com
  início ≤ hoje); **Cancelar referência** grava `cancelledAt` (fica no histórico). Situações: Vigente / Programada / Substituída.
- `cicluz-referencias-pagamento-v1` = `{version:1, refs:[{id, sector, kind, valueCents, from, source, notes, createdAt, cancelledAt?}]}`;
  formato diferente de 1 → não grava ("Nada será gravado para não sobrescrever os dados"). **Não sincronizada.** Nenhum cálculo usa.
- Cartão no menu: não encontrei `payment-refs` em `menuTree` (`index.html:177–213`); `window.showPaymentRefs` existe — acesso pela
  tela não confirmado.

## 16. Identidade visual compartilhada
- **Identificador ícone ou 3 caracteres**: grupos financeiros usam campos próprios em `groups.js` (`identityMode`, `sigla` em 3
  grafemas, sem forçar maiúsculas); contas, cargos e locais usam `window.CicluzIdentity` (`bakery-icons.js`: `compact`,
  `controls(parent, data, onchange, {suggest})`, rótulos "Identificador" e "Até 3 caracteres", MAIÚSCULAS).
- **Ícones de padaria/pessoas**: `window.CicluzBakeryIcons` (`bakery-icons.js`, 51 ícones `padaria-*`, `pessoas-*`…) entram em todas as
  galerias; o mesmo arquivo põe busca nas galerias com ≥10 ícones ("Buscar ícone: pão, forno, colher…", por `MutationObserver`).
- **Biblioteca de ícones** (`icon-library-manager.js`, `window.CicluzIconLibrary = {custom, svg, sanitize, isHidden}`):
  `cicluz-icon-library-v1` = `{custom:[{id:'custom-…', label (≤80), path}], hidden:[], deleted:[], used:{}}`. Importa SVG colado,
  arquivo ou busca online (Iconify, `api.iconify.design`); `sanitize` aceita só formas simples (sem imagem, link, script; ≤100 KB) e
  refaz a validação ao carregar. Ocultar/excluir/restaurar com confirmação; evento `cicluz-icon-added` registra o ícone em todos os
  seletores. Migra o piloto de Cargos (`cicluz-job-icon-pilot-v1`, flag `cicluz-icon-pilot-migrated-v1`) mantendo os ids.
  Itens guardam o **id** do ícone (`icon`), então excluir um ícone deixa o item com fallback (ícone padrão).
- **Cores**: `shared-colors.js` acrescenta "Minhas cores" a todo `input[type=color]` (exceto na janela de locais, que tem a sua),
  lendo/gravando `cicluz-custom-colors-v1` e absorvendo o legado `cicluz-location-custom-colors-v1` (por `MutationObserver`).
- **Logomarcas**: `payment-marks.js` (`paymentMarks`, `paymentBrandPrefixes`, `paymentOperatorPrefixes`, `getPaymentMark`) — por
  **prefixo do nome**, não por id.

---

## 17. Pontos de atenção encontrados (fatos do código, sem juízo de regra de negócio)
1. **Conta é chave por nome** (`cicluz-ti-groups-v1` + detalhes por nome); a taxa da operadora guarda o **nome** da conta. Renomear a
   conta quebra o vínculo. Contraria a regra "vínculo por ID" do `CLAUDE.md`.
2. Exclusão com transferência **não remapeia** ids em outros cadastros (taxas, custos de máquina, produtos, lançamentos, computador do
   subgrupo, `cargoIds` do local, `orgUnitIds`). Uma taxa ligada a despesa excluída **trava a projeção** do servidor.
3. IDs de seed (`g0`, `g0s0`…) **se repetem entre coleções** (despesas/mercadorias/vendas); únicos só com a coleção junto.
4. Dinheiro do cadastro de operadora em **reais decimais** (tarifa e custos de máquina), não em centavos (ao contrário de
   `payment-refs.js` e do Caixa).
5. Cor dos grupos financeiros e da conta: o campo existe no código mas **não aparece/está escondido**; grava a cor herdada/laranja.
6. `valueKind`, `computerId`/horários, `maquinas`, `custosMaquina`, `inactive`/`cargoIds` dos locais **não são projetados** no banco
   (só viajam no JSON).
7. Chaves fora da sincronização: `cicluz-org-seed-v1`, `cicluz-hierarquia-v1`, `cicluz-acessos-telas-v1`,
   `cicluz-referencias-pagamento-v1`.
8. Organograma liga cargo por `jobKey` de **posição** (`local:i`), não pelo `id` do cargo próprio; sem exclusão de posição.
9. `group-seeds.json` é cópia morta do seed de `groups.js`.
10. Comentário de `operadoras-etapas.js` ("só neste aparelho") desatualizado: a chave sobe.

---

## 18. Diagrama das interligações

Legenda: `A ──id──▶ B` = A guarda o id de B (A depende de B). `──nome──▶` = vínculo por nome. `[srv]` = projetado no servidor.

```
 ENTRADAS (VND)                                            cicluz-financial-hierarchy-v1  [srv]
 ┌──────────────────────┐
 │ Tipos de Venda       │◀──saleTypeId (id, obrigatório)── ┌──────────────────────┐
 │  sale-type-*         │                                  │ Bandeiras  brand-*   │
 └──────────────────────┘                                  └──────────┬───────────┘
                                                                      │ (chave do mapa fees.brands[brandId])
 ┌────────────────────────────────────────────────────────────────────▼─────────────────────────┐
 │ Operadoras  operator-*                                                                        │
 │  ├─ fees.brands[brandId][] = Condição (vigência, modalidade, parcelas, MDR, tarifa,          │
 │  │      antecipação, prazo) ──expenseId (id, obrigatório)──▶ DES grupo/subgrupo               │
 │  │                          ──accountGroup (NOME, opcional)──▶ CNT conta                      │
 │  ├─ fees.overhead (texto)                                                                     │
 │  ├─ maquinas[] {id, apelido, modelo, serie, ativa}        (não projetado)                    │
 │  └─ custosMaquina[] ──expenseId (id, obrigatório)──▶ DES grupo/subgrupo                      │
 │                     ──aplicaA (ids)──▶ maquinas[] da própria operadora   (não projetado)     │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────┐        ┌───────────────────────────┐
 │ VND Grupos de Vendas     │        │ VND Computadores          │
 │  grupo › subgrupo ───────┼─computerId (id)──▶ computadores-pc-*│ (não projetado)
 │  subgrupo: startTime/    │        └─────────────┬─────────────┘
 │  endTime (não projetado) │                      │ NOME do PC
 └──────────┬───────────────┘                      ▼
            └── lido por vendas-pdv/dados.js ──▶ PDV do Sistema Pralis (casado por NOME)

 SAÍDAS
 ┌───────────────────────────┐   ◀──grupoId (id)── Lançamentos de Despesas (servidor)
 │ DES Grupos de Despesas    │   ◀──expenseId──── taxas / custos de máquina (acima)
 │  g0..g27 › subgrupos      │   ◀──id fixo g8..g15── folha-custos.js (colunas)
 │  valueKind, directEntry   │   ◀──grupoId/subgrupoId── Produção / Patrimônio (producao/dados.js)
 └───────────────────────────┘
 ┌───────────────────────────┐   ◀──grupoId/subgrupoId── Produtos do Compras (compras/dados.js)
 │ MER Grupos de Mercadorias │   ◀──grupoId── Lançamentos de Mercadorias (servidor)
 │  purpose VENDA/TRANSF.    │
 └───────────────────────────┘
 ┌───────────────────────────┐   ◀──id fixo ret-g0── Patrimônio (grupos de patrimônio = Investimento)
 │ RET Grupos de Retiradas   │   ◀──grupoId── Lançamentos de Retiradas (servidor)
 └───────────────────────────┘

 TRANSFERÊNCIAS (CNT)                    cicluz-ti-groups-v1 (.contas: nomes) + cicluz-ti-account-details-v1 (por nome) [srv]
 ┌───────────────────────────┐   ◀──NOME── taxa da operadora (accountGroup)
 │ CNT Contas (sem id)       │   ──▶ /api/contas ──▶ CNT - Transferências, Lançamentos (servidor)
 └───────────────────────────┘   (sem vínculo com local; Caixa/Tesouraria usa contas fictícias próprias)

 ESTRUTURA / PESSOAS                                       cicluz-location-tree-v1 [srv, sem inactive/cargoIds]
 ┌─────────────────────────────────────────┐
 │ Área › Setor › Local › Sublocal (nós)   │──cargoIds (ids)──▶ Cargos (cicluz-cargos-v1 / ref:N)
 └───▲───────────▲──────────▲──────────▲───┘                        ▲            ▲
     │orgUnitIds │unitIds   │localId   │localId                      │jobKey (id) │jobKey (posição local:i/ref:i) + jobName
  Pessoa      Ficha de   Produto do  Patrimônio /                 Pessoa       Organograma (posições, versões)
  (people.js) Cargos     Compras     Ficha técnica                (people.js)  cicluz-organogram-positions-v1 [srv]
     │
     └──▶ Acesso por Tela: 'pessoa:ID' › 'cargo:ÁREA|CARGO' › 'area:ID'  (cicluz-acessos-telas-v1, não sincronizado)
          Referências de Pagamento ──setor por NOME──▶ (setor da pessoa / área da Ficha de Cargos)

 IDENTIDADE (usada por todos os cadastros acima)
   item.icon ──id──▶ CicluzIconLibrary (cicluz-icon-library-v1 [srv]) | CicluzBakeryIcons | ícones fixos | logos (payment-marks por NOME)
   cores ──▶ cicluz-custom-colors-v1 [srv]

 Dependência (quem precisa existir antes):
   Tipo de Venda → Bandeira → (Operadora.taxa por bandeira) ; DES grupo → Operadora.taxa / custo de máquina ;
   CNT conta (nome) → Operadora.taxa (opcional) ; Computador → subgrupo de Vendas ;
   Cargo → Área/Setor/Local.cargoIds → Pessoa (jobKey + orgUnitIds) → Acesso por Tela ; Cargo → Organograma.
```


---

# Raio-X C — Gestão de Pessoas (do candidato à folha)

> Sistema CICLUZ · Gestão de Padaria — site estático em `C:\CICLUZ\Pralis-Sistema\dist\` (JS puro, sem build).
> Lido no código em 27/11/2026, branch `feat/hierarquia-area-cargo-pessoa-20261124`. **O código vence a documentação antiga.**
> Nenhum dado real de pessoa foi copiado: seeds/demonstrações aparecem só como "existe seed".
> "Não confirmado" = não deu para afirmar pelo código.

---

## 0. Visão rápida

- **Registro único de pessoas**: `localStorage['cicluz-pessoas-v1']` (`dist/people.js` l. 6). Candidato e colaborador são o MESMO objeto; o que muda é `status` (`CANDIDATO` → `ATIVO` → `INATIVO`). Exames ocupacionais e empresas/clínicas moram no mesmo documento.
- **As etapas da admissão não são guardadas**: são *derivadas* dos registros (`CicluzPeople.stages()`, `people.js` l. 40–48).
- **Fluxo vigente ("fluxo 2", `p.flow===2`)**: Cadastro Simples → Exame Admissional (APTO) → **Período de Teste** (aprovado pelo DP) → Cadastro Completo → Ativação pelo DP → Colaborador ativo.
  - A **Entrevista saiu do fluxo em 04/11/2026** (comentário em `dist/avaliacoes.js` l. 205). `dist/interviews.js` existe mas **não é carregado** pelo `index.html` (código morto). No menu AGENDA há "Entrevistas" que é só um *placeholder* ("Tela reservada… Aguardando as orientações do Rodrigo").
- **Servidor**: quase nada de Gestão de Pessoas sobe. A sincronização é genérica (`dist/cicluz-sync.js` intercepta `localStorage.setItem` e envia só as chaves da lista fechada `CHAVES_SINCRONIZADAS` em `servidor/shared/src/documentos.ts` l. 12–60). Dado pessoal fica fora por decisão de LGPD pendente (**P-11**, doc 11). Ver tabela no §13.
- **Bibliotecas comuns que moram em arquivos "de uniforme"** (dependência estrutural de todo GP): `window.CicluzUniformUI` (`uniforms.js` l. 275 — `el`, `dialog`, `enumField`, `newId`, `money/cents`…), `window.CicluzDateBR` e `window.CicluzPhoneBR` (`uniform-purchases.js` l. 119–120).
- **Dois padrões de data coexistem**:
  - `date-fields.js` (regra oficial **DD/MM/AA**): só transforma `input[type=date]`; século: AA<50 ⇒ 20AA, senão 19AA. Usado no Cadastro Completo, Atualização salarial e lançamento de Uniformes.
  - `CicluzDateBR.field` (**DD/MM/AAAA**, `uniform-purchases.js` l. 15–17; grava ISO `AAAA-MM-DD`): Cadastro Simples, Período de Teste, Desligamento, Exames/ASO, Ocorrências, Horário/Escala, Escala Individual, Feriados, Horas Extras, Documentos, Referências de Pagamento, Contrato.
- **CPF**: `dist/field-validation.js` aplica máscara e dígito verificador automaticamente a todo campo com rótulo "CPF" (`cpfMask` l. 5, `cpfValid` l. 6: 11 dígitos, não todos iguais, 2 DVs). Guardado só com dígitos.
- **Telefone**: `CicluzPhoneBR` (`uniform-purchases.js` l. 22): DDD `[1-9][1-9]`; 11 dígitos com 3º dígito 9 (celular) ou 10 dígitos com 3º dígito 2–5 (fixo). Guardado só com dígitos.
- **IDs**: `newId()` = `crypto.randomUUID()` (fallback `Date.now().toString(36)+'-'+random`) — `uniforms.js` l. 14.

### Onde fica no menu (Saídas · Despesas)
Definido em `dist/index.html` l. 189–193 (rota em l. 241, função `openSection`/roteador `target===…`).

| Grupo do menu | Cartão (rótulo exato) | Subtítulo | target → função |
|---|---|---|---|
| **Cadastros Geral Colaboradores** | DES - Simples Colaborador | Primeira etapa: cadastro inicial do candidato | `simple` → `#cadastro-simples` |
| | DES - Completo Colaborador C/Dependente | Dados pessoais, endereço, documentos e dependentes | `form` → `#cadastro-completo` |
| | DES - Cargos C/Salários | Cadastro e organização de cargos | `jobs` → `showJobs()` |
| | DES - Atualização Salários Dissídio Coletivo | Valores e início de vigência | `salary-update` → `showSalaryUpdate()` |
| | DES - Ficha de Cargos | Exigências e entregas por área e cargo | `job-profiles` → `showJobProfiles()` |
| | DES - Horário / Escala | Dias de trabalho, horário de cada dia e setor | `jornada-shifts` → `showJornada('shifts')` |
| | DES - Tipos de Ocorrência | Categorias, modelos e regras de suspensão | `occurrence-catalog` |
| | DES - Tipos de Uniforme | Peças, tamanhos, grupos e vínculo com cargo | `uniform-types` |
| **Lançamentos Colaboradores** | DES - Exames Ocupacionais | Guia AcessaMed+ e exames ocupacionais | `exams` → `showExams()` |
| | DES - Uniformes Entrega (-) Recebimento (+) | Entregas, vendas, devoluções e estoque | `uniforms` |
| | DES - Ocorrências | Declarações, faltas, advertências, suspensões e justa causa | `occurrences` |
| | DES - Período de Teste | Acompanhamento e decisão do DP após o exame APTO | `trial` → `showTrial()` |
| | DES - Ponto Eletrônico Importação | Importar o relógio de ponto e conferir o idealizado com o realizado | `ponto` |
| | DES - Folha de Pagamento Importação Contabilidade | Importar o realizado da folha entregue pela contabilidade | `folha-importacao` |
| **Relatórios** | DES - Folha de Pagamento | Custo da folha por colaborador: projetado, realizado e diferença | `folha-custos` |
| | DES - Exames Ocupacionais | Exames pendentes, agendamentos próximos e realizados | `exams-report` |
| | DES - Cadastro Colaborador | Ficha individual e acompanhamento da admissão | `collaborators` → `showCollaborators()` |
| **Estoque** | DES - Uniformes | Saldo e estoque inicial de cada peça de uniforme | `uniforms-stock` |
| **Pastas Documentos** | DES - Documentos Colaboradores (e pasta de Contratos) | — | `vz-doc-des-documentos-colaboradores` / `vz-doc-des-contratos-colaboradores` (interceptados por `documents.js` l. 299) |
| **AGENDA** (menu lateral, `agenda-menu.js` l. 15–20) | Avaliações (Individual, em Equipe, Geral, Vínculos do setor, Avaliações salvas); Entrevistas (placeholder) | — | `showAvaliacoes(key)`, `showEntrevistas()` |

**Telas com rota mas SEM cartão de menu encontrado** (grep): `jornada-links` (DES - Lançamento de Horário / Escala), `jornada-calendar` (DES - Escala Individual) — acessíveis pela ficha do colaborador; `overtime` (DES - Horas Extras e Noturno); `prestadores` (DES - Prestadores de Serviços, "saiu do menu 18/11/2026"); `uniform-purchases` (DES - Uniformes Compras); `doc-receive` (DES - Receber Documentos); `folhaconplus-*` (Folha Dia 05, Dia 20, Rescisão, Férias); `contracts` (DES - Contrato de Trabalho); `payment-refs` (DES - Referências de Pagamento); `gp-config` (DES - Comunicação da Gestão de Pessoas — só pelo botão "Configurar" do aviso em `exam-aso.js` l. 63). Se há atalho salvo pelo usuário (`menu-order.js`): não confirmado.

---

## 1. O FLUXO DA PESSOA

```
(Entrevista — fora do fluxo desde 04/11/2026)
      │
[1] Cadastro Simples ──Salvar Cadastro──► simple.status='ok'  (status CANDIDATO, flow:2)
      │
[2] Exame Admissional ──resultado APTO──► isApto(p)=true (derivado de exams[])
      │                 └─ NÃO APTO ⇒ etapa "failed"; nada automático (DP decide)
[3] Período de Teste ──DP "Aprovar Continuidade"──► trial.decision='aprovado'
      │                 └─ "Não aprovar" ⇒ reprovado; fluxo para
[4] Cadastro Completo ──link gerado → formulário salvo──► complete.status='concluido'
      │
[5] Ativação pelo DP ──"Ativar Colaborador" (+ permissões de acesso)──► status='ATIVO'
      │
 Colaborador ativo: Horário/Escala, Ocorrências, Uniformes, Documentos, Contrato, Ponto, Folha, Avaliações, Exames periódicos
      │
[6] Desligamento: iniciar (exame DEMISSIONAL) → concluir ⇒ status='INATIVO' (ou cancelar ⇒ segue ATIVO)
      └─ Reativar ⇒ volta a ATIVO
```

| Passo | O que dispara | Onde fica | Arquivo |
|---|---|---|---|
| 1. Cadastro Simples | Botão **"Salvar Cadastro"** (todo salvamento marca a etapa como OK; na 1ª vez confirma "Salvar Cadastro?"). Cria `{status:'CANDIDATO', flow:2}`. | Cadastros Geral Colaboradores › DES - Simples Colaborador | `people.js` l. 70–171 |
| 2. Exame Admissional | Na lista do Simples: ação "Exame Admissional" → `showExams({personId, type:'ADMISSIONAL'})`. Exige Simples OK. APTO registrado por **"Registrar Resultado"** (com status Realizado) **ou** por "Receber/Conferir ASO". | Lançamentos Colaboradores › DES - Exames Ocupacionais | `exams.js`, `exam-aso.js` |
| 3. Período de Teste | Após APTO: "Dar Continuidade — Período de Teste" (no exame) ou "Período de Teste" na lista do Simples. Salvar datas; depois botões **"Aprovar Continuidade" / "Não aprovar continuidade"**. No 1º registro cria tarefa "Integração de <nome>" na Agenda (P-46). | Lançamentos Colaboradores › DES - Período de Teste | `trial.js` |
| 4. Cadastro Completo | Após teste aprovado: **"Gerar Link de Cadastro Completo"** (`CicluzExams.linkDialog`, `exams.js` l. 201) cria `complete.token`; link `#cadastro-completo/<token>` **funciona só neste navegador**. Ao salvar o formulário vinculado ⇒ `complete.status='concluido'`. | Cadastros Geral Colaboradores › DES - Completo Colaborador C/Dependente | `index.html` l. 232–236, `people.js` l. 180–228, `complete-registration.js` |
| 5. Ativação | **"Ativar Colaborador"** (lista ou ficha). Exige Completo concluído + `completeReady` + permissão de acesso (`CicluzHierarquia.acessoDe(id)`, `cicluz-acessos-telas-v1`); senão "Para começar a usar o sistema, o colaborador precisa de permissões." | Relatórios › DES - Cadastro Colaborador (Colaboradores Cadastrados) | `collaborators.js`, `people.js` l. 59 |
| Ativo | Passa a aparecer em `CicluzPeople.selectable()` (ATIVO/INATIVO) ⇒ Uniformes, Ocorrências, Horário/Escala, Documentos, Ponto, Folha, Avaliações, Lançamentos. Candidato **não** aparece nessas listas. | — | `people.js` l. 21 |
| Ocorrências | Lançamento manual (ou botão "Registrar Ocorrência" na ficha). | Lançamentos › DES - Ocorrências | `occurrences.js` |
| Uniformes | Lançamento manual (ou "Registrar Uniforme" na ficha). | Lançamentos › DES - Uniformes Entrega (-) Recebimento (+) | `uniforms.js` |
| Ponto | Importação de CSV do relógio/Conplus; casa por CPF (ou nome). | Lançamentos › DES - Ponto Eletrônico Importação | `ponto.js` |
| Folha | Importação de CSV da contabilidade por mês; casa por CPF (ou nome). Relatório projetado×realizado (projetado ainda em branco). | Lançamentos › DES - Folha de Pagamento Importação Contabilidade; Relatórios › DES - Folha de Pagamento | `folha-custos.js` |
| 6. Desligamento | Ficha/lista: **"Desligar / Marcar como inativo"** ⇒ "Iniciar desligamento?" ⇒ `dismissal.status='andamento'` (continua ATIVO) e abre Exame **DEMISSIONAL**. Depois **"Concluir Desligamento"** (data obrigatória; se sem exame/NÃO APTO/pendente exige "Estou ciente e o DP analisou esta situação.") ⇒ `INATIVO`. "Cancelar desligamento" ⇒ segue ATIVO. "Reativar colaborador" ⇒ ATIVO. Nada é apagado. | Relatórios › DES - Cadastro Colaborador | `collaborators.js` l. 47–57, `people.js` l. 60–68 |

**Status x etapas.** `status` só tem `CANDIDATO | ATIVO | INATIVO`. "APTO", "aguardando exame", "cadastro completo" são **etapas derivadas**:

| Etapa (`key`, rótulo) | Estados → texto | Regra |
|---|---|---|
| `simple` Cadastro Simples | pending "Cadastro pendente"; progress "Cadastro em andamento" (só registros antigos); done "Cadastro OK" | `simple.status` |
| `exam` Exame Admissional | blocked "Bloqueada: Cadastro Simples não está OK"; pending "Pendente: agendar exame"; progress "<status> · <data hora> · aguardando resultado"; done "APTO"; failed "NÃO APTO · acompanhamento do DP" | `isApto(p)` = existe exame `type==='ADMISSIONAL'`, `scheduleStatus!=='Cancelado'`, `result==='APTO'` (`people.js` l. 19) |
| `trial` Período de Teste | legacy "Não registrado (cadastro anterior)" (sem flow 2); blocked "…exame admissional sem resultado APTO"; pending "Pendente: registrar início e fim"; progress; attention (vence hoje / prazo encerrado); done; failed | `trial.js` + `trialInfo` |
| `complete` Cadastro Completo | blocked ("…sem resultado APTO" / "…Período de Teste sem aprovação"); pending "Pendente: gerar link"; progress "Link gerado · aguardando preenchimento"; done "Concluído em DD/MM" | `completeReady(p)` = `isApto(p) && (!flow2 || trial.decision==='aprovado')` (l. 35) |
| `active` Colaborador Cadastrado | pending "Aguardando ativação pelo DP"; blocked "Ainda não ativado"; done "Ativo desde …"/"Inativo" | `activate()` |

- Registros de demonstração (`demo:true`) mostram as etapas como "Cadastro anterior (demonstração)".
- `inAdmission(p)` (l. 37): não demo, `CANDIDATO`, e exclui registros antigos de Entrevista não aprovados.
- `nextStep(p)` (l. 49) dá a frase da próxima ação ("Agende o Exame Admissional.", "Gere o link do Cadastro Completo." …); `stepper(p)` desenha a linha do tempo "Etapas de admissão".
- Travas: admissional APTO que já liberou etapas (pessoa com `trial`, `complete.token` ou ATIVO) não pode mudar de APTO nem ser excluído (`exams.js` l. 195–200, 228).

---

## 2. REGISTRO DE PESSOAS — `cicluz-pessoas-v1` (`dist/people.js`)

- Raiz: `{ version:1, people:[], exams:[], companies:[], seeded:true }`.
- `load()`: se `version!==1` ou `people` não é array ⇒ `loadError` e **nada é gravado** (`transact` recusa). `transact` clona (`structuredClone`), aplica, grava; em erro restaura.
- **Seed**: quando `!data.seeded`, copia colaboradores demonstrativos (`uniforms-data.js` l. 40, `demo-colab-01..05`, fictícios) com `demo:true`; a flag é `seeded` dentro do próprio documento. Mantém IDs antigos para não quebrar uniformes/ocorrências.
- **Migração externa** `hierarquia.js` l. 32–55, flag **`cicluz-hierarquia-v1`** (`{version, em, pessoasVinculadas, pessoasSemCargo, pessoasAmbiguas, vinculosDeArea}`): grava `jobKey` casando `jobName` com o cadastro de cargos (só se houver UM cargo com aquele nome) e grava vínculos Área›Cargo na árvore. Não apaga nada.
- **Servidor: NÃO** (fora de `CHAVES_SINCRONIZADAS`; P-11). Exceção indireta: `hierarquia.js` `paraServidor()` (l. 83–89), enviado por `acessos/usuarios.js` l. 151 (`PUT /acessos-por-tela/sincronizar`), com o mínimo `{id, nome(≤120), cargoId:jobKey, areaIds, ativo}` — sem CPF, filiação ou salário.

### Objeto pessoa (`people[i]`)
| Propriedade | Conteúdo |
|---|---|
| `id` | UUID |
| `status` | `CANDIDATO` \| `ATIVO` \| `INATIVO` |
| `flow` | `2` = fluxo atual (com Período de Teste); ausente = registro anterior |
| `demo` | `true` nos demonstrativos |
| `createdAt` | ISO |
| `history[]` | `{at, text}` (função `log()` l. 16) |
| `name` | texto ≤120 |
| `cpf` | 11 dígitos sem máscara; travado após Simples OK |
| `whatsapp` | dígitos |
| `email` | texto |
| `birthDate` | ISO; **o Cadastro Completo sobrescreve** com a data dele |
| `jobName` | NOME do cargo (texto) |
| `jobKey` | ID do cargo (`'ref:N'` ou UUID local), obtido por `CicluzHierarquia.cargoIdPorNome(nome)` |
| `shift` | `Manhã` / `Tarde` / `Integral` (texto, sem ligação com Horário/Escala) |
| `orgUnitIds[]` | IDs da árvore Área/Setor/Local (`cicluz-location-tree-v1`) |
| `sector` | TEXTO com nomes dos nós nível 2 de `orgUnitIds`, unidos por ", " (só é gravado se houver setor — tirar todos os setores deixa o texto antigo, `people.js` l. 143) |
| `simple` | `{status:'ok'|'andamento', savedAt, okAt}` |
| `trial` | `{start, end, days, status, notes, createdAt, updatedAt, decision:'aprovado'|'reprovado', decidedAt}` |
| `complete` | `{token, linkAt, status:'pendente'|'concluido', savedAt, dependents:n, fields:[{type,value,checked}], summary:[[rótulo,valor]], deps:[[[rótulo,valor]]]}` |
| `activatedAt` | ISO |
| `dismissal` | `{status:'andamento'|'concluido'|'cancelado', startedAt, date, notes, examId, examResult, concludedAt, cancelledAt}` |
| `pastDismissals[]` | desligamentos anteriores |
| `interview` | só registros antigos da Entrevista |
| `rg`, `admissionDate` | **lidos e nunca gravados** (lidos por `collaborators.js`, `exams.js` l. 129, `contracts.js`). Consequência: "Admissão" aparece "—" na lista e o Contrato acusa falta de data de admissão. |

API `window.CicluzPeople` (l. 232): `load, transact, get, failed, byId, selectable, stages, nextStep, stepper, isApto, admissionExams, maskCpf, log, isFlow2, examReady, trialReady, completeReady, inAdmission, trialInfo, trialDays, trialAlerts, dayDiff, linkFor, generateLink, copyLink, openComplete, activate, setInactive, inDismissal, dismissalExams, startDismissal, concludeDismissal, cancelDismissal, editSimple, openView`.
- `selectable()` → `{id, name, jobName, jobKey, orgUnitIds, active}` só de ATIVO/INATIVO.
- `maskCpf` exibe `•••.XXX.XXX-••`.

---

## 3. TELAS E CADASTROS — CAMPO A CAMPO

### 3.1 DES - Simples Colaborador (Cadastro Simples) — `people.js` l. 70–171
Abre pelo menu (acima) ou `CicluzSimpleForm.edit(id)` / "Abrir/Editar Cadastro Simples" (ficha). O HTML estático antigo (`index.html` l. 145, que tinha "Data de admissão") é apagado pelo JS (l. 77).

**Lista** (`CicluzGPEntrada.criar`): seção "Candidatos", botão "Novo Colaborador"; colunas Colaborador | CPF (mascarado) | Função | Turno | Etapa atual. Itens = `inAdmission`, mais recentes primeiro. Ações na gaveta: abrir, "Exame Admissional", "Período de Teste", "Ver acompanhamento". Sem lixeira (nada se exclui). Preferência de colunas: `localStorage['cicluz-colab-simples-colunas']`.

**Formulário** "Cadastro simples" — nota: "Primeira etapa da admissão. Salvar Cadastro salva os dados, conclui a etapa (cadastro OK) e libera o Exame Admissional."

| Rótulo exato | Tipo | Obrig. | Validação / regra |
|---|---|---|---|
| Foto do documento | captura (`CicluzDocCapture`, tipos RG/CPF/CNH, frente e verso) | não | OCR local (Tesseract) + `CicluzIdentityReader.extract` preenche Nome, CPF, nascimento. **Imagem não é guardada.** |
| Nome completo * | texto ≤120 | sim | "Informe o nome completo." |
| CPF * | texto, numérico, ≤14 | sim | máscara + DV (`field-validation.js`); "CPF inválido."/"Informe o CPF.". **Duplicidade** contra todo o registro (qualquer status) a cada digitação e no salvar: "CPF já cadastrado: abra o registro existente em vez de criar outro." + botão "Abrir cadastro existente"/"Ver em Colaboradores Cadastrados". **Somente leitura** após Simples OK. |
| WhatsApp * | tel ≤15, "(32) 99999-9999" | sim | `CicluzPhoneBR`; grava dígitos |
| E-mail | texto ≤120 | não | regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` ("E-mail em formato inválido.") |
| Data de nascimento * | DD/MM/**AAAA** (`CicluzDateBR`) | sim | "Data de nascimento inválida (DD/MM/AAAA)."; não pode ser futura |
| Função * | busca + select | sim | opções = nomes únicos de `jobsCurrent()` (cargos); grava `jobName` + `jobKey`; troca vira histórico |
| Turno * | select | sim | Manhã, Tarde, Integral |
| Áreas, setores e locais (opcional) | árvore (`CicluzLocationTree.campo`) | não | se a Ficha do cargo tem `unitIds`, mostra só esses; trocar a função remove escolhas não permitidas; desde 19/11/2026 pode marcar nível de baixo sem o de cima |

Botões: "Cancelar" (confirma descarte), **"Salvar Cadastro"**. Mensagem final: "…está disponível no Exame Admissional."

### 3.2 DES - Completo Colaborador C/Dependente (Cadastro Completo)
Formulário em `index.html` l. 232–236 (assistente em 4 etapas, `CicluzStepper`): **"CPF e dados pessoais" › "Comprovante e endereço" › "Outros documentos" › "Dependentes"**; botões `#prev-step`/`#next-step` (na última vira "Salvar"); `complete-registration.js` l. 8 acrescenta "Avançar etapa" no cabeçalho.

**Lista**: seção "Colaboradores", colunas Colaborador | CPF | Função | Cadastro completo (Concluído/Pendente); itens = quem tem `complete` ou `inAdmission && completeReady`. Preferência `cicluz-colab-completo-colunas`.

**Vínculo com a pessoa** (`people.js` l. 180–191): 1º campo **"Colaborador do Cadastro Simples (opcional)"** (busca "Buscar colaborador por nome ou CPF"); só pessoas com APTO e teste aprovado. Escolher preenche Nome completo, CPF, Data de nascimento, Telefone (← WhatsApp) e E-mail. Pelo link `#cadastro-completo/<token>` a pessoa já vem vinculada (faixa "Cadastro de <nome> · link demonstrativo: funciona somente neste navegador…", botões "Concluir Cadastro" e "Ver acompanhamento"). Sem vínculo, o formulário funciona solto. **Defeito**: a busca por CPF usa `replace(/D/g,'')` (l. 183) em vez de `/\D/g`.

**Etapa 1 — quadro "Dados pessoais"** (bloco de captura "Documento de identificação", CPF/RG/CNH, frente e verso; o leitor de identidade preenche Nome/CPF/nascimento sem sobrescrever o que já existe):

| Rótulo | Tipo | Obrig. | Opções / validação |
|---|---|---|---|
| Nome completo | texto | sim | — |
| CPF | texto | sim | máscara + DV ("Informe um CPF válido com 11 dígitos.") |
| Data de nascimento | data **DD/MM/AA** (`date-fields.js`) | sim | "Informe uma data válida no formato DD/MM/AA." (risco: "48" vira 2048) |
| Sexo | select | sim | Masculino, Feminino |
| Estado civil | select | sim | Solteiro(a), Casado(a), Divorciado(a), Separado(a) judicialmente, Viúvo(a), União estável |
| Raça/cor | select | sim | Branca, Preta, Parda, Amarela, Indígena, Não declarado |
| Nacionalidade | select | sim | Brasileira, Brasileira naturalizada, Estrangeira |
| Qual é sua nacionalidade? | texto | não | sem regra condicional |
| Naturalidade | texto | sim | — |
| UF onde nasceu | select | não | 27 UFs |
| Escolaridade | select | não | Analfabeto; Até o 5º ano incompleto; 5º ano completo; 6º ao 9º ano incompleto; Ensino fundamental completo; Ensino médio incompleto; Ensino médio completo; Educação superior incompleta; Educação superior completa; Especialização; Mestrado completo; Doutorado completo; Ph. D. |
| Primeiro emprego com carteira assinada? | select | não | Sim, Não |
| Está recebendo seguro-desemprego? | select | não | Sim, Não |
| Nome da mãe | texto | sim | — |
| Nome do pai | texto | não | — |
| Nome social | texto | não | — |

**Etapa 2 — "Endereço e contato"** (bloco "Comprovante de residência"): **CEP***, **Logradouro***, **Número***, Complemento, **Bairro***, **Município***, **UF*** (27 UFs), **Telefone*** (tel), E-mail (validação nativa). Máscara/consulta de CEP e máscara de telefone: **não confirmadas** (`consultas-publicas.js` tem CEP mas não é ligado a esta tela).

**Etapa 3 — "Outros documentos"**: só blocos de captura: RG, Título de eleitor, Certidão de nascimento ou casamento, Foto 3x4, CTPS digital, PIS/PASEP/NIT, Certificado reservista, Comprovante de escolaridade, Certificados profissionais, ASO admissional ("opcionais"; "A leitura e o envio ainda não estão conectados."). **Não há campo de número de PIS nem validação de PIS.** Quando o formulário está vinculado a uma pessoa, os arquivos vão para "Documentos pessoais e cadastrais" (IndexedDB, ver §3.14); sem vínculo, nada é guardado.

**Etapa 4 — "Dependentes"**: "Você tem dependentes? *" (Sim/Não, sem regra ligada aos cartões); contador "Filhos informados: N" (parentesco Filho(a)); "+ Adicionar dependente" cria cartão com: captura "Certidão de nascimento ou documento de identificação" e "CPF do dependente"; **Nome completo***; **Data de nascimento*** (DD/MM/AA); **Parentesco*** (Filho(a), Enteado(a), Cônjuge, Companheiro(a), Tutelado(a), Pai, Mãe, Outro); Sexo; Estado civil; Escolaridade; Nacionalidade (texto); CPF (DV se preenchido); "Informado para:" Imposto de renda, Salário-família, Plano de saúde, Auxílio-creche; "Remover". Exigências por parentesco/idade "pendentes de confirmação".

**Gravação — DOIS caminhos para o mesmo ato** (evento `cicluz-registration-save`):
1. `complete-registration.js` l. 11–16: valida `checkValidity()` ("Confira os campos obrigatórios antes de salvar."); grava **`cicluz-cadastro-completo-v1`** = `{version:1, savedAt, dependents, fields:[{type,value,checked}]}` — posicional, um formulário só, **não ligado a pessoa**; restaurado no DOM a cada carga (até 100 dependentes). Mensagem: "Cadastro salvo neste navegador. Fotos e arquivos anexados não são guardados ao fechar a página."
2. `people.js` l. 193–199: se há pessoa vinculada grava `people[i].complete` (`status:'concluido'`, `fields`, `summary`, `deps`) e `birthDate`; histórico "Cadastro Completo concluído (N dependente(s)); aguardando ativação pelo DP."
- Resultado: CPF/filiação/endereço/dependentes **duplicados** em duas chaves; restauração por posição (frágil a mudança de ordem dos campos). **Servidor: não** (as duas chaves).

### 3.3 DES - Cadastro Colaborador / "Colaboradores Cadastrados" — `collaborators.js`
Abas **"Colaboradores"** e **"Acompanhamento da admissão"**.

- **Colaboradores**: "Buscar por nome"; lista = não candidatos + candidatos prontos para ativar; ordem ATIVO, CANDIDATO, INATIVO, nome; resumo "N ativo(s) · N inativo(s) · N aguardando ativação". Colunas: Nome completo | CPF (mascarado) | Cargo (`jobName`) | Setor (`sector`) | Admissão (`admissionDate`, sempre "—") | Status (Ativo/Inativo/Em admissão, "demonstrativo", "Desligamento em andamento") | Etapa concluída | Ações (Visualizar; Ativar Colaborador; Exame Demissional; Concluir Desligamento; Desligar / Marcar como inativo; Reativar colaborador).
- **Ativar** — texto: "…concluiu o Exame Admissional (APTO), o Período de Teste (aprovado) e o Cadastro Completo. Ao ativar… fica disponível em Ocorrências e Uniformes."
- **Concluir desligamento — <nome>**: mostra início e situação do exame demissional; **"Data do desligamento *"** (DD/MM/AAAA, padrão hoje), "Observações"; checkbox "Estou ciente e o DP analisou esta situação." quando sem exame / NÃO APTO / pendente ("O sistema não toma decisões trabalhistas"). `window.CicluzDismissal.conclude(id)`.
- **Acompanhamento**: campo "Candidato" (busca); painel com alerta do Período de Teste, stepper, próxima etapa e botões da etapa ("Abrir Cadastro Simples", "Abrir Período de Teste", "Registrar decisão do Período de Teste", "Agendar Exame Admissional", "Registrar Resultado no Exame Admissional", "Gerar Link de Cadastro Completo", "Abrir Cadastro Completo", "Copiar Link", "Ativar Colaborador", "Visualizar ficha"). Tabela "Candidatos em admissão" com uma coluna por etapa.
- **Ficha individual** (`openFile` l. 85–127, tudo lido por ID): botões Registrar Ocorrência, Registrar Uniforme, Agendar Exame, Editar Cadastro Simples, desligamento. Seções: Etapas de admissão (+ Entrevista legada + Período de Teste); Desligamento; **Dados Pessoais** (Nome, CPF **inteiro**, nascimento, RG, Função/cargo, Setor, Turno, Data de admissão, WhatsApp, Status; subseção Cadastro Completo = `complete.summary`); Dependentes; Documentos (anexos de Ocorrências da sessão); **Horário e escala** (`CicluzJornada.section`) e **Documentações** (`CicluzDocuments.section`) — só ATIVO/INATIVO; Exames ocupacionais (Data, Tipo, Prestador, Endereço, Situação, Resultado, ASO, "Ver ASO" — sem dado clínico); Ocorrências e medidas disciplinares; Avaliações; Assinaturas; Contratos; Uniformes (valor da venda só VENDIDO); Histórico Geral.

### 3.4 DES - Período de Teste — `trial.js`
Nota: "…entre o Exame Admissional (APTO) e o Cadastro Completo com Dependente. Não gera contrato de experiência, folha, vínculo ou descontos. O prazo encerrado não aprova o candidato: a decisão é sempre do DP." (O comentário do topo do arquivo descreve ordem antiga — desatualizado.)
Elegível: CANDIDATO + `flow===2` + Simples OK + APTO + sem decisão.

| Rótulo | Tipo | Obrig. | Regra |
|---|---|---|---|
| Colaborador * | busca + select | sim | só elegíveis; "Somente candidatos com exame admissional APTO podem iniciar o Período de Teste." |
| Função e turno | leitura | — | `jobName · Turno <shift>` |
| Data de início do teste * | DD/MM/AAAA | sim | — |
| Data final do teste * | DD/MM/AAAA | sim | não pode ser anterior à inicial |
| Quantidade de dias | leitura | — | dias corridos inclusivos (`trialDays`) |
| (referência de pagamento) | informativo | — | `CicluzPaymentRefs.current(p.sector,'trial')` → "R$ X por dia, vigente desde …" — **ligado pelo TEXTO do setor**; "O cálculo e o status Pendente/Pago aguardam a confirmação da regra." |
| Status do período de teste * | select | sim | Aguardando início, Em andamento, Prazo encerrado, Aprovado para continuidade (desabilitada), Não aprovado (desabilitada), Cancelado; sem decisão, recalcula pelas datas |
| Observações | texto longo | não | — |
| Decisão do DP | botões | — | "Aprovar Continuidade" / "Não aprovar continuidade" (só depois de salvo; avisa se o período não terminou) |

Grava `people[i].trial` em `cicluz-pessoas-v1`. Alertas (`trialAlerts`): "Vence hoje" / "Prazo encerrado em … · aguardando decisão do DP"; o cartão do menu ganha pílula "N alerta(s) de prazo". Histórico "Lançamento de Período de Teste" (Candidato, Cargo, Início, Fim, Dias, Status, Prazo, Ações).

### 3.5 Entrevista — `interviews.js` (NÃO carregado) e placeholder em `avaliacoes.js`
Se fosse carregado: Nome completo do candidato*, CPF* (DV + duplicidade), Data da entrevista* (DD/MM/AAAA), Horário (HH:MM), Status da entrevista* (Agendada, Realizada, Aprovado para continuidade, Não aprovado, Cancelada), Observações; criava pessoa `CANDIDATO` e permitia excluir. Registros antigos dele continuam em `cicluz-pessoas-v1` (campo `interview`). O menu AGENDA › "Entrevistas" mostra só "Tela reservada… Aguardando as orientações do Rodrigo".

### 3.6 DES - Cargos C/Salários — **inline em `dist/index.html`** (l. 251–378; não há arquivo próprio)
Funções em cadeia (a última vence): `renderJobs` (255 → **289**), `editJob` (8 camadas, 255 → **376**), `#job-form.onsubmit` (255 → **305**), `jobsCurrent` (287 → **313**, embrulha com salário vigente).

**Lista**: busca "Buscar cargo ou CBO"; filtro de categoria; colunas Cargo, Categoria, CBO ("a conferir" se vazio), Setor (da Ficha de Cargos), Salário (`'R$ '+valor`), Ano. Botão "Novo Cargo"; editar; excluir em 2 etapas. Preferência `cicluz-cargos-colunas`.

**Formulário** — quadro "Dados do cargo": **Nome do cargo*** (≤120, `formatSystemName`); Nome reduzido (≤15, auto a partir do nome); Ícone do cargo (biblioteca); Cor do ícone (**ignorada no salvar: grava sempre `#7c3aed`**); Identidade ícone×sigla; Categoria (≤80); Descrição resumida. Quadro "CBO": **Código CBO** (placeholder "0000-00", **sem máscara e sem validação**); Título CBO; link "Buscar CBO no site do governo"; Nomes relacionados ao CBO. Quadro "Salário de referência": Salário de referência (R$) e Ano de referência — **somente leitura**, vêm da Atualização salarial.
- Sem checagem de duplicidade de nome/CBO. Novo cargo entra no TOPO (`unshift`). Ao salvar, o salário vigente do dia é copiado para `valor`/`ano` do cargo.

**Persistência**:
- `cicluz-cargos-v1` (array): `{id, icon, color, nome, nomeReduzido, categoria, cbo, titulo, valor("1.234,56"), ano, sinonimos, descricao, origem:'local', identityMode?, sigla?}`. Migração sem flag (24/11/2026): cargo local sem `id` ganha UUID.
- `referenceJobs`: **seed embutido no código** (32 cargos com CBO e salários — há seed com valores); não vai ao localStorage; edições/exclusões em `cicluz-cargos-referencia-v1` = `{ "<índice>": {data, deleted} }`.
- `jobsCurrent()` devolve `{j, key ('local:N'|'ref:N'), id ('ref:N' ou UUID)}` — é a fonte de cargos de todo o sistema.
- **Servidor: SIM** (`cicluz-cargos-v1`, `cicluz-cargos-referencia-v1`). Textos da tela ainda dizem "fica neste navegador" (desatualizado).

### 3.7 DES - Atualização Salários Dissídio Coletivo (salário por vigência) — inline `index.html` l. 309–313
- **Início da vigência*** (DD/MM/AA); uma linha por cargo com campo de valor (máscara de moeda "R$ 1.234,56", `aria-label` "Novo salário de <nome>").
- Erros: "Informe o início da vigência." / "Informe pelo menos um valor." / "Confira o valor de <nome>." (≤0 ou inválido).
- Grava em **`cicluz-salarios-vigencias-v1`**: `[{start:'AAAA-MM-DD', note:'', values:[{key:'ref:N'|'local:N', nome, valor:<número em reais, float>}]}]`. **Servidor: SIM.**
- **Salário vigente** (`salaryAsOf`, l. 312): entrada de maior `start` ≤ **hoje** em que exista valor com mesma `key` **E** mesmo `nome`; empate de data ⇒ a gravada por último. **Só calcula para hoje** (não existe "salário na data X"). Sem entrada ⇒ fica o `valor` do cargo.
- Não há: checagem de vigência sobreposta, edição/exclusão de vigência, observação, centavos inteiros.
- **Riscos**: `key` local é posicional (`local:N`, muda ao criar/excluir cargo); renomear o cargo quebra o vínculo. O `id` estável de 24/11 não é usado aqui.
- Não há salário na pessoa: o salário do colaborador é sempre o do **cargo**.

### 3.8 DES - Ficha de Cargos — `job-profiles.js`
Três sub-telas: **Quadro por área**, **Ficha do cargo**, **Matriz de Exigências / Ranking**.
- **Quadro por área**: select Área (raízes da árvore `location:<id>` + áreas próprias `profile:<uuid>`); "+ Nova área" ("Nome da área", ≤100, sem duplicidade), "+ Vincular cargo" (Cargo*, CBO do cadastro (leitura), "Principal função do cargo" ≤240, "Autonomia — decisões e autorizações"), "+ Adicionar exigência" (Grupo; "Exigência ou entrega"*). Grupos: Formação, Experiência, Certificações, Hard Skills, Soft Skills, Entregas individuais, Entregas em grupo, Entregas coletivas. Checkbox exigência×cargo grava na hora.
- **Ficha do cargo** (diálogo): Código interno do cargo; Departamento / classificação; Líder direto; Líder indireto; Nível de autonomia; Valores comportamentais; Regime de trabalho; Jornada / horário de referência; **Tipo de contratação** (Não definido, `CLT - MÊS`, `CLT - HORA`); Documentos exigidos — Contrato de trabalho e Regimento interno (Não definido/Exigido/Não exigido); listas "uma por linha" (Atividades primárias/secundárias/pontuais/eventuais, Respeito — regimento interno, Qualidade — objetivos/atendimento/produto/ambiente/outros, Premiações, Critérios de premiação, Benefícios, KPIs, Riscos ocupacionais / legais, Plano de carreira, Condições de trabalho); **Salário de referência (somente quando autorizado)** (texto com máscara de moeda, **sem ligação** com a vigência salarial); **Áreas, setores e locais do cargo** (`unitIds`); **Horários / Escalas compatíveis** (`jornadaIds`). Botões: Imprimir ficha, Duplicar como novo modelo, Desativar/Reativar ficha. Histórico `{at, before}` a cada edição.
- **Matriz/Ranking**: contagem de exigências por cargo; "Não avalia colaboradores".
- Seed único (flag `seeded.cashier`): ficha de referência do cargo de operador de caixa (sem dados pessoais nem salário).
- Chave **`cicluz-job-profiles-v1`** = `{areas[], roles[{id, areaId, areaName, sourceId, jobName, cbo, mission, autonomy, required[]}], requirements[{id, areaId, group, text}], cards:{<sourceId>:{…}}, seeded}`. **Servidor: SIM.**
- **Vínculo com o cargo**: `sourceId` = `'ref:N'` ou `'custom:'+JSON([nome, cbo])` — **por nome+CBO** para cargos locais. `CicluzJobCards.forJobName(nome)` (casa nome completo ou reduzido) é usado por Simples, Horário/Escala, Horas Extras, Contrato, Exames, Avaliações.

### 3.9 DES - Horário / Escala e lançamentos — `schedules.js` (chave `cicluz-jornadas-v1`)
**Cadastro "DES - Horário / Escala"** (decisão "um cadastro só", 19/11/2026; antigos `shifts`/`scales` só leitura):

| Rótulo | Tipo | Obrig. | Regra |
|---|---|---|---|
| Nome do horário / escala * | texto ≤60 | sim | sem duplicidade ("Já existe um horário / escala com este nome.") |
| Tipo de escala * | select | sim | Dias fixos da semana, Revezamento, Outra — **só rótulo**, nenhum cálculo usa |
| Dias de folga | leitura | — | complemento dos dias marcados |
| Dias de trabalho * | checkboxes Dom..Sáb | sim | "Marque ao menos um dia de trabalho." |
| Hora de entrada * / Hora de saída * | hora HH:MM | sim | não podem ser iguais |
| Início do intervalo / Fim do intervalo | hora | não (par) | "Informe início e fim do intervalo, ou deixe os dois em branco."; "O intervalo precisa ficar entre a entrada e a saída." |
| Horário de cada dia | por dia: Entrada, Saída, Início/Fim do intervalo | — | nasce igual ao padrão; "Diferente do padrão"; "Usar o padrão" |
| Jornada da semana (sem os intervalos) | leitura | — | soma dos líquidos |
| (alerta) | — | — | dia >6h sem intervalo: só aviso, não bloqueia |
| Áreas, setores e locais em que este horário / escala é usado | árvore | não | `unitIds` |
| Observações | texto | não | — |
| Situação do horário / escala | Ativo/Inativo | — | inativo não entra em novos vínculos; "excluir" = desativar |

Conta (copiada): `span(a,b)=(y-x+1440)%1440`; líquido = (saída−entrada) − (fim−início do intervalo); atravessa meia-noite. Editar com colaboradores vinculados pede "Alterar para todos?" (vale dali em diante; histórico guarda o anterior; vínculos guardam `snapshot`).

**DES - Lançamento de Horário / Escala** (sem cartão de menu; pela ficha "Vincular horário / escala"): **Data de início*** (DD/MM/AAAA), **Horário / Escala*** (ativos), Intervalo individual início/fim (opcional, tem de caber em cada dia), **Colaboradores*** (ativos, filtrados pelo setor do modelo: `p.orgUnitIds`, ou, se vazio, `unitIds` da ficha do cargo casada por **nome**; modelo sem `unitIds` serve a todos). Vínculos só são acrescentados (nunca editados); diálogo "Intervalo individual" grava novo vínculo a partir de data. Vigente no dia = último vínculo com `from ≤ dia`.

**DES - Escala Individual** (sem cartão; pela ficha "Escala individual"): Colaborador*; modos Semanal / Mensal / Anual. Semanal: por dia Situação (Trabalha/Folga), Horário (Horário principal, alternativo 2, alternativo 3, de domingo, de feriado), Observação (≤120); "Copiar semana anterior", "Salvar semana", "Histórico de alterações". "Horários do colaborador" (A partir de*, alternativos/domingo/feriado). **Feriados**: Data* (DD/MM/AAAA), Nome do feriado* (≤60), um por data; "A plataforma não traz lista de feriados." Nota: "O DP define quem trabalha e quem folga em cada dia: a plataforma não distribui folgas."

Formato `cicluz-jornadas-v1`: `{version:1, shifts[] (legado), scales[] (legado), jornadas:[{id, name, type, notes, active, padrao:{start,end,breakStart,breakEnd}, dias:{"<0..6>":{…}}, unitIds[], createdAt, updatedAt, history[]}], links:[{id, personId, kind:'jornada'|'shift'|'scale', modelId, from, breakStart, breakEnd, snapshot, createdAt}], exceptions[] (legado), sets:[{id, personId, from, alt2, alt3, sunday, holiday, createdAt, by}], holidays:[{id, date, name, createdAt, cancelledAt?}], days:{<personId>:{<AAAA-MM-DD>:{work, slot, note, at, by}}}, dayLog[]}`.
**Servidor: NÃO** (só no aparelho). Exceção parcial: `agenda/rotina.js` l. 372–412 envia o *resultado* do dia (trabalha/folga, início/fim) de colaboradores ligados a contas, janela −31/+62 dias (flag `cicluz-agenda-escala-enviada-v1`).

### 3.10 DES - Exames Ocupacionais — `exams.js`, `exam-aso.js`, `exam-report.js`
Exames ficam em **`cicluz-pessoas-v1.exams[]`** (sem chave própria). Título da página muda para "Exame Admissional". Nota: "…Nenhuma mensagem é enviada automaticamente."

**Formulário "Novo encaminhamento"**:

| Seção | Rótulo | Tipo | Obrig. | Regra / opções |
|---|---|---|---|---|
| Exame | Tipo de exame clínico * | select | sim | ADMISSIONAL, PERIÓDICO, RETORNO AO TRABALHO, MUDANÇA DE FUNÇÃO (exibido "MUDANÇA DE RISCOS OCUPACIONAIS"), DEMISSIONAL; antigo "PORTADOR DE DEFICIÊNCIA" = "(registro anterior)" |
| | Possui exames complementares? | select | não | SIM, NÃO, NÃO SABE |
| | Quais exames complementares? | checkboxes + "Nova opção…" | não | lista em `cicluz-exames-complementares-v1` (padrão: Audiometria, Acuidade visual, Espirometria, Eletrocardiograma, Eletroencefalograma, Hemograma, Glicemia, Outros); "segue o PCMSO… o sistema não escolhe pelo cargo" |
| Empresa | Empresa | select | não | **lista fixa no código** (`exams.js` l. 45, 2 empresas com CNPJ); pré-seleção pela empresa da sessão |
| | CNPJ | leitura | não | máscara + DV |
| | Nome da pessoa que autorizou os exames | texto ≤120 | não | sugestões de `companies[].authorizers` |
| | Telefone da pessoa que autorizou os exames | tel | não | `CicluzPhoneBR` |
| Colaborador | Nome do colaborador * | busca + select | sim | **todas** as pessoas (incl. candidato/inativo); link "Abrir Cadastro Simples" |
| | WhatsApp do colaborador | tel | não | — |
| | Data de nascimento | DD/MM/AAAA | não | — |
| | CPF | texto | não | máscara + DV |
| | RG | texto ≤20 | não | — |
| | Cargo atual / Setor atual | texto | não | preenchidos de `jobName`/`sector` |
| | Data de admissão | DD/MM/AAAA | não | — |
| Troca (só MUDANÇA DE FUNÇÃO) | Novo cargo | select | não | cargos de `jobsCurrent()`; **guarda o nome** |
| | Novo setor | texto ≤80 | não | sugestões da Ficha de Cargos por nome |
| | CBO | texto | não | do cargo escolhido |
| Prestador | Prestador * | select | sim | prestadores ativos "Medicina do Trabalho" (`cicluz-prestadores-v1`) |
| | Endereço de atendimento * | select | sim | valor `"providerId|addressId"` (ou legado CENTRO/BENFICA); "Ver localização" (Google Maps) |
| Data | Agendado para — Dia | DD/MM/AAAA | se Agendado | — |
| | Hora | HH:MM | se Agendado | 00:00–23:59 |
| | Status do agendamento | select | — | Pendente, Agendado, Realizado, Cancelado; novo Pendente com dia+hora vira Agendado |
| Responsável | Nome do responsável pelo encaminhamento | texto | não | — |
| | Data de encaminhamento | DD/MM/AAAA | não | padrão hoje |
| | Assinatura do responsável | desenho | não | **só memória**, "sem validade jurídica" |
| Envio | pré-visualização da guia e mensagem | leitura | — | mensagem **sem CPF/RG**; Enviar por E-mail/WhatsApp/SMS só abre o app |

Regras ADMISSIONAL: pessoa CANDIDATO não demo, Simples OK, sem outro admissional APTO.
**Registrar Resultado**: Status do agendamento + Resultado (Aguardando resultado, APTO, NÃO APTO); APTO/NÃO APTO só com Realizado. **Receber ASO**: "Como o ASO chegou *" (Recebimento físico / WhatsApp da empresa), "Foto ou arquivo do ASO *", "Data de emissão do ASO *", "Data de recebimento *" (≥ emissão), "Médico emissor"/"CRM do médico" (obrigatórios se físico), "Resultado de aptidão que consta no ASO *" (APTO/NÃO APTO), "Próximo exame periódico previsto (conforme o PCMSO)", checkbox "Conferi o ASO…" (marcado conclui). **Conferir ASO**: checkbox obrigatória. → **Dois caminhos para o mesmo resultado** (Registrar Resultado sem ASO × ASO); não confirmado se intencional.
**Situação** derivada (`exam-aso.js` `statusOf`): Cancelado · Concluído — inapto · Concluído — apto · ASO recebido — aguardando conferência · Realizado — aguardando ASO · Pendente de agendamento · Reagendamento necessário · Aguardando realização · Encaminhamento preparado · Agendado.
**Periodicidade**: não há cálculo por cargo/risco/idade; o "próximo periódico" é **digitado** no ASO. Alertas: Exames pendentes; Agendamentos próximos (até `nextDays`, padrão 3); Exames não realizados; ASOs aguardando recebimento; ASOs aguardando conferência; Exames periódicos a programar (`periodicLeadDays`, padrão 30, de `cicluz-gp-config-v1`).
**Relatório** (`exam-report.js`): Exames pendentes, Agendamentos próximos, Exames realizados (Data, Colaborador, Tipo, Prestador, Status).

Objeto exame: `{id, personId, personName, company:{name, cnpj, authorizer, authorizerPhone}, snapshot:{birthDate, cpf, rg, sector, jobName, admissionDate}, change:{sector, jobName, cbo}, whatsapp, type, complementary, complementaryList[], unit, date, time, scheduleStatus, referrer:{name,date}, result, createdAt, updatedAt, preparedAt?, aso?:{origin, file:{id,name,type,size}, issuedAt, receivedAt, doctor, crm, aptidao, nextPeriodicAt, recordedAt, recordedBy, checkedAt, checkedBy}}`. **Atenção LGPD**: CPF, RG e nascimento copiados no exame. Arquivo do ASO no IndexedDB `cicluz-documentos/arquivos`. `companies[]` = `{name, cnpj, authorizers[]}` (por nome). **Servidor: não.**

**DES - Prestadores de Serviços** (`prestadores.js`, sem cartão): Nome do prestador* (≤80; sem duplicidade nome+tipo), Tipo de serviço* (Medicina do Trabalho, Segurança do Trabalho, Contabilidade, Outro), Situação, Telefone, Celular (`CicluzPhoneBR`), Site, Horário de atendimento, Observações e condições (≤300), **Endereços de atendimento*** (Unidade, Endereço completo, Cidade — UF, Situação; ≥1). Nada é apagado (desativa). Chave **`cicluz-prestadores-v1`** `{version, seeded, providers:[{id, name, service, phone, mobile, site, hours, notes, active, history, addresses:[{id, label, street, city, legacyKey, active}]}]}`; seed de 1 clínica. **Servidor: SIM.**

### 3.11 Uniformes — `uniforms*.js`, `uniform-types.js`, `uniform-purchases.js` (chave `cicluz-uniformes-v1`)
- **Catálogo base**: 56 peças `uni-01..uni-56` ("never renumber"), nome `"<GRUPO> - <PEÇA> <TAMANHO>"`; tamanhos PP, P, M, G, GG, UC, calçados 35–42. Tipos de movimentação: **VENDIDO** (−1, com preço), **ENTREGUE** (−1), **DEVOLVIDO** (+1), **DESCARTADO** (−1).
- **Saldo** = inicial + compras + devolvidos − vendidos − entregues − descartados (cancelados não contam); nunca negativo; devolução limitada ao retirado.
- **DES - Uniformes Entrega (-) Recebimento (+)** — "Novo lançamento de uniforme": **Data*** (DD/MM/AA), **Colaborador*** (`selectable()`: ATIVO/INATIVO), Cargo (leitura; cargo achado **pelo nome**), Situação do colaborador (leitura), Referência do cargo (previsto × com o colaborador; "Selecionar itens previstos"), **Uniformes* — buscar e selecionar** (só a referência do cargo, salvo "Mostrar todos os uniformes"), Itens (quantidade inteira ≥1, máx. = saldo; se VENDIDO "Valor unitário" em centavos + subtotal/total), **Tipo*** (4 tipos), Movimentação de origem (só DEVOLVIDO). Editar ⇒ status CORRIGIDO + revisão; Cancelar mantém (CANCELADO); Excluir remove. Comprovante gerado na hora (Imprimir / WhatsApp).
- **DES - Uniformes** (estoque): por peça Estoque inicial, Comprados, Vendidos, Entregues, Devolvidos, Descartados, Saldo atual, Valor unitário; "Configurar": Estoque inicial (inteiro ≥0), Valor unitário de venda (centavos >0).
- **DES - Tipos de Uniforme**: "Nome do uniforme (peça e tamanho) *" (≤80, MAIÚSCULAS, único), ícone, **Grupo*** (≤60), Situação, **Categoria*** (Camisa, Calça, Boné ou Touca, Avental, Calçado, Outro); id novo `uni-NN`; grava `cicluz-uniformes-tipos-v1` (`{version, tipos:[{id, name, category, family, active, icon}]}`). Quadro **"Vínculo Tipo de Uniforme / Cargo"**: célula 0–3 por peça×cargo → `references[jobKey].items`.
- **DES - Uniformes Compras** (sem cartão): Data da compra* (DD/MM/AAAA), Fornecedor (por ID, de Compras), Contato WhatsApp, Uniformes*, Quantidade e **Valor unitário obrigatório** (centavos). Entra no estoque. **Não gera despesa.**
- Formato: `{version:1, movements:[{id, date, collaboratorId, collaboratorName, collaboratorActive, jobName, type, returnOf, items:[{uniformId, quantity, unitPrice?}], status:'ATIVO'|'CORRIGIDO'|'CANCELADO', createdAt, updatedAt, revisions[]}], purchases:[{id, date, supplierId, supplierName, whatsapp, items, status, …}], stock:{<uniformId>:{initial, price}}, references:{<jobKey>:{jobName, items:[{uniformId, quantity}]}}}`.
- `jobKey` da referência = `'ref:N'` ou `'custom:'+JSON([nome,cbo])` (nome+CBO). **VENDIDO não gera desconto em folha** (nenhuma ligação). Aba legada "Referência por cargo" ainda montada em `uniforms.js` sem menu (caminho duplicado). **Servidor**: `cicluz-uniformes-tipos-v1` **sim**; `cicluz-uniformes-v1` (movimentos/estoque/compras) **não**.

### 3.12 Ocorrências — `occurrences.js`, `occurrence-catalog.js`, `occurrence-matrix.js`, `occurrence-reader.js`, `occurrence-tools.js`
**DES - Ocorrências** — nota: "Anexos e dados médicos (clínica, CID, médico e CRM) ficam só na memória e são perdidos ao atualizar a página. Nenhuma penalidade, desconto ou desligamento é aplicado automaticamente."
Tipos fixos: **DECLARAÇÃO** (dados médicos), **FALTA INJUSTIFICADA** (dias), **FALTA JUSTIFICADA** (dias + médico), **ADVERTÊNCIA**, **SUSPENSÃO** (dias, ≤30 "art. 474 da CLT, a confirmar com o jurídico"), **JUSTA CAUSA** (motivo obrigatório). Não existe tipo "ATESTADO".

| Rótulo | Tipo | Obrig. | Regra |
|---|---|---|---|
| Colaborador * | busca + select | sim | `selectable()` |
| Data da ocorrência * | DD/MM/AAAA | sim | — |
| Tipo de ocorrência * | select | sim | 6 tipos |
| Categoria / Subcategoria | select | sim se disciplinar ou se o tipo tem linhas no catálogo | subcategoria = id da linha do catálogo |
| Documento associado | leitura | — | "Pendência: sem documento vinculado" |
| Apoio à decisão / Histórico | painéis | — | gravidade, orientação, reincidências (90 / 360 dias / período) |
| Quantidade de dias | número + −/+ | se o tipo tem dias | inteiro ≥1; chips de dias permitidos (SUSPENSÃO) |
| Motivo declarado pelo colaborador | texto | só JUSTA CAUSA | — |
| Observação | texto ≤600 | não | — |
| Observação por áudio (opcional) | gravação | não | IndexedDB |
| Foto ou documento da ocorrência | arquivos (JPG/PNG/PDF ≤10 MB) | não | câmera; "Analisar Documento"; **só memória** |
| Clínica / Posto / Hospital, CID Nº, Nome Médico, CRM | texto | não | só tipos médicos; **só memória** |
| Status da ocorrência * | select | sim | não disciplinar: Pendente, Em análise, Justificada, Não justificada, Concluída, Cancelada; disciplinar: Rascunho, Registrado, Aguardando análise do DP, Aguardando análise jurídica, Aprovado para formalização, Documento emitido, Aguardando ciência ou assinatura, Concluído, Cancelado |
| Foi comunicado? * | select | sim | SIM, NÃO |

Bloqueios: duplicidade disciplinar (mesmo colaborador + data + subcategoria) — "não se aplica duas penalidades ao mesmo fato"; status tardios exigem ter passado por "Aguardando análise do DP"/"…jurídica" quando exigido.
**Leitor de atestado** (`occurrence-reader.js`, Tesseract/pdf.js locais): extrai CID, CRM, médico, clínica, data, dias; diálogo "Conferir dados lidos do documento" (data vem desmarcada).
Chave **`cicluz-ocorrencias-v1`** = `{version:1, records:[{id, date, days, collaboratorId, collaboratorName, collaboratorActive, type, matrixCatId, matrixSubId, matrixLabel, subcategoryName, documentName, classification{…}, note, audio, decisions[], categoryId, categoryName, ruleAlerts[], status, reason, communicated, attachmentCount, hasMedical, createdAt, updatedAt, revisions[]}]}`.
**DES - Tipos de Ocorrência**: Tipo de ocorrência*, Nome da categoria* (ou nova), Subcategoria* (ou nova), Tipo de documento* (categorias de Documentos ou "Sem documento associado"), Situação; "Configurações adicionais": Nível de gravidade (Leve, Moderado, Grave), Período de consulta do histórico (dias), Quantidade de reincidências para alerta, Exige revisão pelo DP, Exige revisão jurídica, Orientação recomendada (≤300); só SUSPENSÃO: Advertência anterior a conferir + Período de referência. "Dias de suspensão permitidos". **Regras Disciplinares**: Categoria*, Quantidade de advertências* (1–10) → avaliar suspensão, Quantidade de suspensões* (1–10) → avaliar justa causa. Chave **`cicluz-ocorrencias-catalogo-v1`** (`categories`, `rules`, `suspensionDays`, `disc`, flags `linked`/`seeded`). Matriz: **`cicluz-ocorrencias-matriz-v1`** (4 categorias seed: Cumprimento de Horários e Disciplina; Apresentação e Higiene Pessoal; Cumprimento de Atividades e Rotinas; Respeito, Comunicação e Relacionamento). Três mecanismos de alerta sobrepostos — todos **só alertam**.
**Efeitos**: nenhum em ponto, folha, desconto ou desligamento. **Servidor**: `cicluz-ocorrencias-matriz-v1` **sim**; `cicluz-ocorrencias-v1` e `cicluz-ocorrencias-catalogo-v1` **não**.

### 3.13 Avaliações — `avaliacoes.js` (menu AGENDA)
Individual / Serviço (Setor*, Colaborador*, "Sortear colaborador"), Equipe › Produto (Setor*, Produto*), Equipe › Ambiente (Setor ou ambiente*), Geral (Empresa*, Setor, Indicador avaliado*, Período início*/fim* DD/MM/AAAA, Valor de referência*, Valor realizado* em centavos → diferença %), Vínculos do setor, Avaliações salvas. Cada item: Conforme / Não conforme / N/A; não conforme abre "O que houve?" e "Observação objetiva" (≤200). Aproveitamento = conformes ÷ (conformes + não conformes). Nenhuma premiação calculada. Colaboradores do setor: `orgUnitIds` **ou** cargo ligado ao setor na Ficha (por nome). Chave **`cicluz-avaliacoes-v1`**; servidor: não.

### 3.14 Documentos do colaborador — `documents.js`, `documents-ext.js`, `doc-capture.js`, `identity-reader.js`
**DES - Documentos Colaboradores** (Pastas Documentos). 13 categorias (o texto diz "11" — inconsistência): Termo de Responsabilidade pelo Uso do Armário…; Termo de Recebimento e Responsabilidade de Uniforme (vários); Termo de Não Aliciamento; Termo de Compromisso; Termo de Ciência sobre Comunicação Interna por WhatsApp; Registro de Alterações de Horário de Trabalho (vários); Formulário de Autodeclaração de Condição de Saúde (sensível); Código de Conduta; Regimento Interno — Termo de Ciência; Termo de Autorização de Uso de Imagem; Avaliação do Período de Experiência (vários); Acordo Individual de Redução do Intervalo Intrajornada; Contrato de Trabalho (vários). Modelos em `dist/modelos/`.
- **Não há obrigatoriedade por fase/cargo**: toda categoria conta para todo ATIVO, salvo "Não aplicável" com justificativa (≥5 caracteres).
- Estados: Pendente → Aguardando conferência → Concluído; **anexar nunca conclui**, só "Marcar como Conferido" (checkbox "Abri o arquivo e o documento está legível, completo e assinado.").
- Diálogo de anexo: "Data do recebimento *" (DD/MM/AAAA, não futura), "Origem do recebimento" (Entrega física, WhatsApp, E-mail, Outro), "Observações". Arquivos: JPEG/PNG/WebP/PDF, ≤10 MB, conferidos pelo conteúdo.
- **Assinatura** (`documents-ext.js`): "Forma de assinatura" (Física / Eletrônica — integração futura); física: Visualizar modelo, Imprimir, Registrar impressão, "Registrar assinatura coletada" (data*); eletrônica: preparar (Signatário*, Contato*, Modalidade* simples/avançada/qualificada) e registrar assinatura feita em serviço externo (Identificador externo*, Data*, Arquivo final assinado*, Evidências). Sem integração real.
- **DES - Receber Documentos** (sem cartão): Colaborador*, Documento pendente*, Origem*, Data do recebimento*, Arquivo recebido*, Observações (≤200), checkbox "Já conferi…".
- **Documentos pessoais e cadastrais**: arquivos do Cadastro Completo (só quando vinculado a uma pessoa), por `docType` + titular (colaborador/dependente); "Recebido · a conferir"/"Conferido".
- Metadados em **`cicluz-documentos-v1`** `{version:1, people:{<personId>:{cats:{<catId>:{na, records:[{id, label, files[], versions[], receivedAt, checkedAt, checkedBy, notes, origin, generated?, signMode?, printedAt?, esign?…}]}}, personal:[…], history:[]}}}`; arquivos (Blob original) no **IndexedDB `cicluz-documentos`, store `arquivos`**. **Servidor: não** (nem os arquivos).
- **Leitor de identidade**: extrai só CPF (com DV), nascimento (linha com "nasc") e nome (linha que começa com "nome", excluindo filiação/nome social). Não extrai RG, filiação, validade.
- `scanner-*.js` **não é usado em Gestão de Pessoas** (só Patrimônio).

### 3.15 DES - Contrato de Trabalho — `contracts.js` (rota `contracts`; cartão de menu não confirmado)
Reúne do cadastro, Ficha do cargo, estrutura, Horário/Escala na data de início e empresa do exame da própria pessoa; com **modelo oficial** ("Nome do modelo *", "Arquivo do modelo (PDF) *") grava versão congelada que vai para Documentos › Contrato de Trabalho. Campos: "Colaborador *" (ATIVO ou candidato com Completo concluído), "Data de início do contrato *". **Experiência em duas etapas** (dias digitados pelo DP): 1ª etapa até = admissão + dias − 1; 2ª etapa até = fim da 1ª + dias — **depende de `admissionDate`, que nunca é gravado** (mostra "Lançar experiência"). Chave **`cicluz-contratos-v1`** `{version:1, models[], versions:[{id, personId, number, modelId, modelName, start, at, by}], experience:{<personId>:{stage1Days, stage2Days, history[]}}}`. Servidor: **não** (fora de `CHAVES_SINCRONIZADAS`).

### 3.16 DES - Referências de Pagamento — `payment-refs.js` (rota `payment-refs`; sem cartão encontrado)
"Setor *" (texto com sugestões), "Tipo de pagamento *" (Período de teste/por dia, Diária/por dia, Dobra/por dobra, Hora extra/por hora, Vale-transporte/por vale), "Valor *" (centavos), "Início da vigência *" (DD/MM/AAAA), "Fonte da informação *", "Observação". Vigente = último com `from ≤ dia` por **nome do setor** + tipo. Nada é calculado nem lançado. Chave **`cicluz-referencias-pagamento-v1`** `{version:1, refs:[{id, sector, kind, valueCents, from, source, notes, createdAt, cancelledAt?}]}`. Servidor: **não**.

### 3.17 DES - Horas Extras e Noturno — `overtime.js` (sem cartão)
**Parâmetros**: Início da vigência*, Divisor mensal — CLT - MÊS (horas), Divisor — CLT - HORA (horas), Hora extra: percentual de acréscimo, Adicional noturno: percentual, Período noturno início/fim (**não usado em conta**), Limite diário de jornada para alerta, Fonte da informação (aprovação)*. Nada vem preenchido.
**Lançamento**: Colaborador*, Data*, Tipo de contratação (padrão = da ficha do cargo, por nome), Horas normais / extras / noturnas (hh:mm), Divisor deste lançamento, Observação (≤140), Memória do cálculo. Bloqueia 2 lançamentos da mesma pessoa no mesmo dia.
Conta (copiada): `base(m) = round(salárioCentavos × m / (divisor × 60))`; `addExtra = round(baseExtra × %HE/100)`; `addNight = round(baseNight × %noturno/100)`; `total = baseNormal + (baseExtra+addExtra) + (baseNight+addNight)`; faltando dado ⇒ "Total pendente". **Salário = vigente de HOJE do cargo casado pelo NOME**, não pela data do lançamento. Um único percentual (sem 50%/100%, sem domingo/feriado).
Chave **`cicluz-horas-v1`**; servidor: não. **`CicluzHours` não tem consumidor**: não alimenta folha, ponto nem despesa.

### 3.18 DES - Ponto Eletrônico Importação — `ponto.js`, `ponto-conferencia.js`
- **Origem**: planilha **CSV** (separador `;` ou `,`, 1ª linha = títulos). **Não há leitor AFD/AFDT** (Portaria 671). Uma linha = colaborador × dia com até 4 marcações.
- Passos: "1. Arquivo" → "2. Qual coluna do arquivo é o quê" (**CPF do colaborador** — "É por ele que a linha é ligada ao cadastro. Sem CPF, vale o nome escrito igual."; Nome do colaborador; **Data***; Entrada; Saída almoço; Entrada (volta do almoço); Saída) → "3. Conferência" (linhas, encontrados, dias, período, sem colaborador, datas/horas não entendidas, dias substituídos).
- Casamento: **CPF** (dígitos) com `p.cpf`, senão **nome** igual (sem acento/minúsculo); grava pelo **id**. Datas aceitas: DD/MM/AAAA, DD/MM/AA (→20AA), AAAA-MM-DD. Horas H:MM/HH:MM(:SS). Reimportar substitui dia a dia.
- **Idealizado** = `CicluzJornada.effective(pid, dia)` (modelo vinculado; **ignora a Escala Individual**). Sem vínculo ⇒ "Sem Horário / Escala vinculado"; dia fora dos dias de trabalho ⇒ Folga.
- Conta (copiada): `liquido = vão(entrada, saída) − vão(saída almoço, volta)` (mod 1440); diferença = realizado − previsto; tolerância única (0–120 min, `cicluz-ponto-tolerancia`). Estados: Conforme, Divergente, Marcação incompleta, Sem marcação, Folga, Marcação em dia de folga. **Sem atraso, hora extra, noturno, DSR ou dinheiro.**
- **Ponto manual** ("Ponto manual — <nome>"): 4 horas (Entrada, Saída almoço, Retorno almoço, Saída final), "Ocorrência ou justificativa" (≤120, **texto livre, sem ligação com Ocorrências**), "Observações" (≤300); nunca altera o importado. Comparação Conplus × manual: Sem marcação, Só Conplus, Só manual (não oficial), Conferido, Divergente.
- Visões Diária/Mensal; relatório "Baixar CSV" `ponto-conferencia-AAAA-MM.csv`.
- Chave **`cicluz-ponto-v1`** `{version:1, marcacoes:{<personId>:{<dia>:[4 horas]}}, manuais:{…:{m, ocorrencia, obs, por, quando}}, historico[], importacoes[]}`. **Servidor: não** (fora por LGPD; teste `servidor/tests/integracao/auth.test.ts` l. 43 garante).

### 3.19 Folha de Pagamento — `folha-custos.js`, `folhas-conplus*.js`, `folhas-csv.js`
**DES - Folha de Pagamento Importação Contabilidade**: "Mês *", "Ano *", arquivo CSV ("uma linha por colaborador e uma coluna para cada reflexo"); mapeamento: CPF do colaborador, Nome do colaborador e uma coluna por **grupo de despesa** `g8..g15` de DES - Grupos de Despesas (`cicluz-financial-hierarchy-v1.despesas`: FOLHA PAG, PREMIAÇÃO, BENEFÍCIOS, DIARIAS E H. EXTRAS, ENCARGOS SOCIAIS, VALE TRANS., 13º, FÉRIAS E RESCISÕES). Casamento CPF, senão nome; valores convertidos para **centavos inteiros** (`centavosDe`); mesmo mês substitui.
**DES - Folha de Pagamento** (relatório): Colaborador × grupo × **Projetado | Realizado | Diferença**. **Projetado = sempre vazio** ("Em branco até as regras da folha serem definidas"). Botões "Vincular a uma despesa" e "Agendar pagamento" **desabilitados** — "Nada é criado, vinculado ou pago a partir desta tela, e a diferença não vira despesa."
Chave **`cicluz-folha-custos-v1`** `{version:1, meses:{'AAAA-MM':{importadoEm, arquivo, valores:{<personId>:{<g8..g15>:centavos}}}}}`; preferência `cicluz-folha-colunas-ocultas`. **Servidor: não.**
**Documentos Conplus** (sem cartão; `folhaconplus-folha05|folha20|rescisao|ferias`): DES - Folha de Pagamento Dia 05, Dia 20 (adiantamento), Rescisão, Férias — só consulta/demonstrativo ("Demonstrativo — não oficial"). Fonte: CSV importado na sessão (`folhas-csv.js`) ou demonstração fictícia (`folhas-conplus-demo.js`). Campos da folha: Func, Nome, Adm, Dem, Dep.IR, Dedução IR, Dep.SF, Cargo, C.H.M., Salário, CBO, Sind, FReg, Situação, Filial, CNPJ/CPF, Organograma; Eventos (Código, Evento, Natureza 1 Provento/2 Vantagem/3 Desconto/4 Informativo, Referência, Valor); Totais; Bases IRRF/INSS/INSS Empresa; FGTS/GRRF/PIS. CSV: até 20 MB, UTF-8 ou Windows-1252, separador `; , TAB |`; vínculo **só por CPF** com 1 pessoa — **guarda o nome, não o id**, e apaga o CPF. **Persistência: só memória** (some ao recarregar); valores em reais (float).

### 3.20 Comunicação da Gestão de Pessoas — `gp-common.js`
Campos: Empresa (leitura, da sessão), WhatsApp oficial da Gestão de Pessoas (opcional, validado), Exames periódicos: avisar com antecedência de (dias) (inteiro ≥1, padrão 30), Agendamentos próximos: considerar até (dias) (padrão 3). Chave **`cicluz-gp-config-v1`** indexada pelo **nome** da empresa. **Servidor: SIM** (`documentos.ts` l. 47, 71).

---

## 4. LIGAÇÕES (por ID ou não)

| De → Para | Como liga | ID? |
|---|---|---|
| Pessoa → Cargo | `jobKey` (`'ref:N'` ou UUID) **e** `jobName` (texto); `jobKey` é obtido casando o NOME | ID + nome |
| Pessoa → Área/Setor/Local | `orgUnitIds[]` (ids de `cicluz-location-tree-v1`); `sector` = cópia em texto | ID (+ texto) |
| Área → Cargo | `node.cargoIds` na árvore (`location-tree.js` l. 82, `hierarquia.js` l. 28) | ID |
| Cargo → Salário vigente | `salaryHistory.values[].key` (posicional `local:N`/`ref:N`) **E** `nome` igual | **posição + nome** |
| Pessoa → Salário | não existe; só via cargo | — |
| Ficha de Cargos → Cargo | `sourceId` = `ref:N` ou `custom:[nome,cbo]` | nome+CBO (locais) |
| Ficha → Área / Horário-Escala | `card.unitIds`, `card.jornadaIds` | ID |
| Pessoa → Horário/Escala | `cicluz-jornadas-v1.links[].personId` + `modelId` + `from`; `days[personId]`, `sets[].personId` | ID |
| Horário/Escala → Setor | `jornada.unitIds`; filtro usa ficha do cargo por nome se a pessoa não tem setor | ID (+ nome) |
| Turno (`shift`) → Escala | nenhuma ligação | — |
| Pessoa → Exames | `exams[].personId` (+ `personName`, `snapshot` copiados); desligamento guarda `examId` | ID |
| Exame → Prestador | `unit = "providerId|addressId"` | ID |
| Exame → Empresa / novo cargo | `company.name`, `change.jobName` | **nome** |
| Exame → ASO | `aso.file.id` (IndexedDB) | ID |
| Pessoa → Uniformes | `movements[].collaboratorId` | ID |
| Cargo → referência de uniforme | `references[jobKey]` (`ref:N`/`custom:[nome,cbo]`); pessoa→cargo pelo nome | parcial |
| Compra de uniforme → Fornecedor | `supplierId` | ID |
| Pessoa → Ocorrências | `records[].collaboratorId`; categoria `matrixCatId/matrixSubId`; linha `categoryId`; documento `docCatId` | ID |
| Pessoa → Documentos | `cicluz-documentos-v1.people[personId]`; arquivos por `file.id` | ID |
| Pessoa → Contrato | `versions[].personId`, `experience[personId]` | ID |
| Pessoa → Avaliações | `personId`, `sectorId`, `productId` | ID (cargo do setor por nome) |
| Pessoa → Ponto | `marcacoes[personId]`; importação casa por **CPF ou nome** | ID após casar |
| Ponto → Escala | `CicluzJornada.effective(personId, dia)` | ID |
| Pessoa → Folha (custos) | `valores[personId]`; importação por **CPF ou nome** | ID após casar |
| Folha → Grupos de despesa | colunas `g8..g15` | ID |
| Folha Conplus CSV → Pessoa | CPF → guarda **nome** | **não** |
| Horas extras → Salário / tipo | `jobsCurrent()` + ficha por **nome** do cargo | **nome** |
| Período de Teste → Referência de pagamento | `p.sector` (texto) | **nome** |
| Pessoa → Agenda | `integracaoDoColaborador({colaboradorId…})` | ID |
| Pessoa → Permissões | `acessoDe(id)` (`cicluz-acessos-telas-v1`) | ID |
| **Qualquer coisa → Despesas/Lançamentos** | **nenhuma**: folha não lança, uniforme vendido não desconta, compra de uniforme não gera despesa, horas extras sem consumidor, ocorrência sem efeito. Só `lancamentos/lancamentos.js` l. 37 lista colaboradores ativos `[id, name]` de `selectable()`. | — |

---

## 5. CHAVES DE ARMAZENAMENTO E SERVIDOR

| Chave | Conteúdo | Sobe ao servidor? |
|---|---|---|
| `cicluz-pessoas-v1` | pessoas, exames, empresas | **não** (P-11) — só o mínimo via acessos |
| `cicluz-cadastro-completo-v1` | último Cadastro Completo (posicional) | **não** |
| `cicluz-hierarquia-v1` | flag da migração `jobKey` | não confirmado |
| `cicluz-cargos-v1` / `cicluz-cargos-referencia-v1` | cargos | **sim** |
| `cicluz-salarios-vigencias-v1` | salários por vigência | **sim** |
| `cicluz-job-profiles-v1` | Ficha de Cargos | **sim** |
| `cicluz-jornadas-v1` | Horário/Escala, vínculos, escala individual, feriados | **não** (só resultado do dia via Agenda) |
| `cicluz-prestadores-v1` | clínicas/prestadores | **sim** |
| `cicluz-exames-complementares-v1` | lista de complementares | **sim** (`documentos.ts` l. 48) |
| `cicluz-gp-config-v1` | WhatsApp da GP, prazos de alerta | **sim** |
| `cicluz-uniformes-tipos-v1` | tipos de uniforme | **sim** (l. 50) |
| `cicluz-uniformes-v1` | movimentos, compras, estoque, referência por cargo | **não** (fora da lista) |
| `cicluz-ocorrencias-matriz-v1` | categorias/subcategorias | **sim** (l. 49) |
| `cicluz-ocorrencias-v1` / `cicluz-ocorrencias-catalogo-v1` | ocorrências / tipos | **não** (fora da lista) |
| `cicluz-avaliacoes-v1` | avaliações | **não** |
| `cicluz-documentos-v1` + IndexedDB `cicluz-documentos` | documentos e arquivos | **não** |
| `cicluz-contratos-v1` | contratos e experiência | **não** (fora da lista) |
| `cicluz-referencias-pagamento-v1` | valores por setor | **não** (fora da lista) |
| `cicluz-horas-v1` | horas extras | **não** |
| `cicluz-ponto-v1`, `cicluz-ponto-tolerancia` | ponto | **não** |
| `cicluz-folha-custos-v1`, `cicluz-folha-colunas-ocultas` | folha realizada | **não** |
| Folha Conplus CSV | — | só memória |
| `cicluz-colab-simples-colunas`, `cicluz-colab-completo-colunas`, `cicluz-cargos-colunas`, `cicluz-info-oculta`, `cicluz-screen-*` | preferências de tela | não |

---

## 6. ACHADOS E RISCOS (sem correção — para decisão)

1. **Entrevista**: `interviews.js` não carregado; menu "Entrevistas" é placeholder. O fluxo real começa no Cadastro Simples.
2. **Período de Teste** está entre o APTO e o Cadastro Completo (não está no pedido original de fluxo, mas é o que o código faz).
3. **`admissionDate` e `rg` nunca são gravados** na pessoa, mas são lidos (lista "Admissão" sempre "—"; Contrato não calcula experiência). Não existe campo "Data de admissão" em lugar nenhum do fluxo de admissão.
4. **Cadastro Completo grava em dois lugares** (`cicluz-cadastro-completo-v1` global + `people[i].complete`), ambos por posição de campo.
5. **Dois caminhos para o resultado do exame** (Registrar Resultado sem ASO × Receber/Conferir ASO).
6. **Duas convenções de data** (DD/MM/AA × DD/MM/AAAA); nascimento com AA<50 vira 20xx no Completo.
7. **Vínculos por nome que restam**: cargo↔salário (posição+nome), cargo na Ficha/uniformes (nome+CBO), horas extras (nome do cargo), referência de pagamento (nome do setor), empresa do exame (nome, lista fixa no código), folha Conplus (guarda nome), importações de ponto/folha com fallback por nome (risco com homônimos).
8. **Salário só "de hoje"**: não há salário numa data passada; horas extras usam salário de hoje com parâmetros da data do lançamento. Salário em reais float (não centavos).
9. **Nada de GP gera despesa ou desconto**: folha (projetado vazio, botões desabilitados), uniformes vendidos, compras de uniforme, horas extras, ocorrências.
10. **Ponto ignora a Escala Individual** (usa só o modelo); a Agenda usa a Escala Individual — duas leituras do "previsto". Sem AFD, sem cálculo de atraso/extra.
11. **Telas sem cartão de menu**: Lançamento de Horário/Escala, Escala Individual, Horas Extras, Prestadores, Uniformes Compras, Receber Documentos, Folhas Conplus, Contrato de Trabalho, Referências de Pagamento, Comunicação da GP.
12. `sector` (texto) não é limpo ao remover todos os setores; busca por CPF quebrada no seletor do Completo (`/D/g`).
13. Documentos: tela diz "11 categorias", a lista tem 13; sem obrigatoriedade por fase/cargo.
14. CPF/RG/nascimento copiados no exame (snapshot) e CPF inteiro visível na ficha; dados médicos de ocorrências corretamente só em memória.
15. Cargos: cor escolhida descartada; CBO sem validação; sem duplicidade de nome.
16. Periodicidade de exame não calculada (digitada no ASO) — regra a confirmar com o Rodrigo (doc 11), não inventar.
17. Uniformes: aba legada "Referência por cargo" ainda montada (caminho duplicado do quadro de Tipos); calçado numérico não reconhecido como tamanho no agrupamento.

---

### Arquivos-fonte principais
`dist/index.html` (menu l. 189–193, roteador l. 241, Cadastro Completo l. 232–236, Cargos/Salários l. 251–378, ordem de scripts l. 383–385) · `dist/people.js` · `dist/collaborators.js` · `dist/complete-registration.js` · `dist/trial.js` · `dist/interviews.js` (morto) · `dist/avaliacoes.js` · `dist/gp-common.js` · `dist/gp-entrada.js` · `dist/job-profiles.js` · `dist/schedules.js` · `dist/prestadores.js` · `dist/overtime.js` · `dist/payment-refs.js` · `dist/contracts.js` · `dist/exams.js` · `dist/exam-aso.js` · `dist/exam-report.js` · `dist/uniforms-data.js` · `dist/uniforms-stock.js` · `dist/uniforms.js` · `dist/uniform-types.js` · `dist/uniform-purchases.js` · `dist/occurrences.js` · `dist/occurrence-catalog.js` · `dist/occurrence-matrix.js` · `dist/occurrence-reader.js` · `dist/occurrence-tools.js` · `dist/documents.js` · `dist/documents-ext.js` · `dist/doc-capture.js` · `dist/identity-reader.js` · `dist/ponto.js` · `dist/ponto-conferencia.js` · `dist/folha-custos.js` · `dist/folhas-conplus.js` · `dist/folhas-conplus-demo.js` · `dist/folhas-csv.js` · `dist/hierarquia.js` · `dist/field-validation.js` · `dist/date-fields.js` · `servidor/shared/src/documentos.ts`.


---

# Raio-X D — Compras, Mercadorias e Cadastros de Venda

> Fonte: código lido em 27/11/2026 (branch `feat/hierarquia-area-cargo-pessoa-20261124`). O código vence a documentação antiga.
> Caminhos relativos a `C:\CICLUZ\Pralis-Sistema\`. Onde não houve confirmação no código: **"não confirmado"**.
> Nenhum dado real de pessoa/empresa foi copiado. Os dados de exemplo do código (`dados.js → semente()`) são fictícios.

---

## 0. Mapa dos arquivos

| Arquivo | Papel |
|---|---|
| `dist/compras/dados.js` | Armazenamento único do módulo (`cicluz-compras-v1`), semente fictícia, migrações em memória, transação, integrações (grupos MER/RET, árvore de locais, responsáveis). Expõe `window.CicluzComprasDados`. |
| `dist/compras/dominio.js` | Regras puras (sem DOM): recorrência, ranking (bolinhas), fornecedor, contrato, cliente, salário mínimo, avaliação automática da cotação, estoque, recebimento, formatação. Testado em `tests/compras-dominio.cjs`. `window.CicluzComprasDominio`. |
| `dist/compras/servico.js` | Operações (equivalentes aos services do S1): agenda → solicitação → cotação (rodada/convites) → compra → recebimento; conferências; catálogo/preço-base. `window.CicluzComprasServico`. |
| `dist/compras/ui.js` | Componentes comuns (tela, diálogo, campo, seletor, chips, tabela, linhaLista, quadroSituacao, campoHora, campoArvore, campoLocal, seletorArvore, seletorDeItens, botaoEnviar, prazoResposta…). Cor padrão MER `#22c55e`, texto `#12672e`. |
| `dist/compras/modulo.js` | Rotas/cartões do menu (`compras:<nome>`) e `CicluzCompras.abrir(nome)`. |
| `dist/compras/cadastros.js` | MER - Fornecedores / DES - Fornecedores (cadastro único em etapas). `window.CicluzComprasCadastros`. |
| `dist/compras/fornecedor.js` | Página pública do fornecedor (`rodada.html?t=<token>`), resposta da cotação. |
| `dist/compras/clientes.js` | VND - Clientes. `window.CicluzComprasClientes`. |
| `dist/compras/contratos.js` | Etapa Contrato em blocos (fornecedor e cliente), modelos (tipos) de contrato, documento (imprimir/visualizar), Pastas de contratos (DES/MER/VND). `window.CicluzContratos`. |
| `dist/compras/recorrencia.js` | Campo "Tipo de recorrência" + painel "Recorrência personalizada" do contrato (`window.CicluzComprasRecorrencia`). Só descreve. |
| `dist/compras/telas-produto-lista.js` | Lista MER - Produtos. `window.CicluzComprasProdutos`. |
| `dist/compras/telas-produto-form.js` | Formulário do produto em etapas. `window.CicluzProdutoForm`. |
| `dist/compras/telas-produto-extras.js` | Leitor de código de barras, foto, histórico de nomes, **Unidades de Medida**. |
| `dist/compras/telas-produto-importacao.js` + `produto-importacao.js` | Importar do app de produtos (Backup XLSX) e Revincular grupo/local (só administrador). |
| `dist/compras/produto-regras.js` | Regras puras do produto: descrição, "como se compra", preço de venda, promoções, múltiplos de embalagem, balança, duplicidade, pendências. `window.CicluzProdutoRegras`. |
| `dist/compras/produto-fiscal.js` | Fiscal puxado pelo grupo (tabelas **fictícias** `TABELAS_EXEMPLO`). `window.CicluzProdutoFiscal`. |
| `dist/compras/produtos-api.js` | Única porta para a API de produtos do servidor; resumo local `cicluz-produtos-resumo-v1`. `window.CicluzProdutos`. |
| `dist/compras/telas-pedido.js` | MER - Agenda de Pedidos e MER - Pedido de Compra (+ campo de repetição compartilhado). |
| `dist/compras/telas-cotacao.js` | MER - Cotação por Fornecedor, Pedido urgente, convites. |
| `dist/compras/telas-recebimento.js` | MER - Pedidos a Receber (recebimento) e tela de estoque ("MER - Grupo Mercadorias") + Extrato. |
| `dist/compras/telas-conferencia.js` | MER - Contagem de Estoque (conferência cega). |
| `dist/compras/telas-cadastro.js` | MER - Catálogo e Preço-Base (catálogo fornecedor–produto, histórico, preço-base). |
| `dist/compras/horario-funcionamento.js` | VND - Horário de Funcionamento (`cicluz-horarios-funcionamento-v2`). |
| `dist/compras/convite-link.js` | "Enviar link de cadastro" (simulação; usado por VND - Clientes, RET - Patrimônios, colaborador). |
| `dist/compras/campo-data.js` | Campo de data com calendário (`U.campoData`), ISO por dentro, DD/MM/AA na tela. |
| `dist/contracts.js` | **Não é deste módulo**: é o *DES - Contrato de Trabalho* (colaborador), chave `cicluz-contratos-v1`. Citado aqui só para não confundir com contratos de fornecedor/cliente. |
| `dist/modelos/*` | **Não é deste módulo**: modelos PDF/DOCX de documentos de colaborador (armário, uniforme, aliciamento, compromisso, WhatsApp, horário, saúde, conduta, experiência, intervalo), usados por `dist/documents.js` e `dist/occurrence-catalog.js`. |
| Servidor | `servidor/shared/src/documentos.ts` (lista de chaves sincronizadas), `servidor/shared/src/produtos.ts` (contrato da API de produtos), `servidor/api/src/produtos/*`, `servidor/shared/src/acessos.ts` (permissões `compras_*`). |

---

## 1. Onde os dados moram

### 1.1 `cicluz-compras-v1` (localStorage, sincronizado com o banco)
- Um único documento JSON, `versao: 1`. Gravado por `S.transacao(mudanca)` (`dados.js`): relê o que outra aba gravou, aplica, só grava se o texto mudou (cada gravação vira versão nova no banco), dispara `cicluz-compras-mudou`; se falhar, restaura (tudo ou nada). Escuta `storage` de outras abas.
- Está em `CHAVES_SINCRONIZADAS` e `CHAVES_ADOTADAS_DO_APARELHO` (`servidor/shared/src/documentos.ts`): vai para o banco por empresa, com versão e histórico; teto de 4 MB por documento. Tem CNPJ/CPF e WhatsApp de fornecedor por decisão do Zé (04/11/2026, P-11a).
- Leitura exige que as coleções obrigatórias sejam listas, senão `erroLeitura = true` e nada é gravado (protege o dado do iPad).
- **Coleções obrigatórias** (`COLECOES`): `fornecedores, produtos, catalogo, precosBase, historico, agendas, ocorrencias, solicitacoes, rodadas, convites, pedidos, movimentos, conferenciaAgendas, conferencias`.
- **Coleções acrescentadas depois** (`COLECOES_NOVAS`, viram `[]` se faltarem): `unidades, historicoNomes, clientes, modelosContrato`.
- **Outras chaves dentro do mesmo documento** (opcionais, criadas por outras telas): `funcoesPrestador` (migração), `migracoes` (marcas), `empresas`/`empresa` (Dados da Empresa, `dist/acessos/empresa.js`), `salariosMinimos` (Configurações → Diversos → Salário Mínimo Vigente, `dist/acessos/salario-minimo.js`), `codigoInternoApp`, `categoriasFornecedor` (lista antiga, sem uso).
- Semente: se não há nada salvo e não houve erro de leitura, grava a semente fictícia (8 fornecedores, 19 produtos `p-*`, catálogo, preços-base, histórico). Os ids de exemplo estão em `produto-importacao.js → EXEMPLOS`.
- **Unidades iniciais** (se a lista estiver vazia): UN Unidade, KG Quilo, CX Caixa, FD Fardo, PC Peça, SC Saco, MI Milheiro, LT Litro, DZ Dúzia, G Grama, ML Mililitro (id `un-<sigla minúscula>`).

**Migrações (uma vez por documento, marca em `d.migracoes`, rodam em memória e vão para o armazenamento na próxima gravação)** — `dominio.js`:
| Marca | O que faz |
|---|---|
| `ramoFornecedor` | texto livre antigo `categoria` / `categoriaId` → `f.ramo`; apaga `categoria` e `categoriaId`. |
| `categoriaProdutoFornecedor` | fornecedor sem categoria mas ligado a produto (catálogo, histórico, cotação, pedido) → `categorias = ['produto']`. |
| `vendedorFornecedor` | `f.nascimento` → `f.vendedorNascimento`. |
| `prestadoresFornecedor` | cria `d.funcoesPrestador` com 18 funções iniciais (id `fp-<nome-sem-acento>`); fornecedor Serviço ganha `prestadores[0]` (id `pr-<idFornecedor>`) espelhando o contato. |
| `contratoFinanceiro` | `contrato.tem = true` se já havia início/fim/valor/observações. |
| `nomesPadrao` | nomes, endereços (logradouro, complemento, bairro, cidade) e e-mails de fornecedores, clientes e empresas no padrão (`formatSystemName`; e-mail em minúsculas); guarda cada valor antigo em `d.migracoes.nomesPadrao.antes` = `[onde, campo, valorAntigo]` (pode desfazer). Produtos ficam de fora (maiúsculas próprias). |

### 1.2 Produtos no servidor (tabela) — modo servidor
- `produtos-api.js`: o catálogo de produtos mora na **tabela do servidor**; o aparelho guarda o **resumo dos ativos** em `cicluz-produtos-resumo-v1` (`{ ativado, em, produtos[] }`, **não sincronizado**), para ver sem internet.
- "Modo servidor" = último resumo disse `ativado: true`. Nele, `cicluz-compras-v1.produtos` guarda **só o estado da loja por id**: `{ id, saldo, vendas3m, compras3m, lucro3m }` (só produtos com algum desses ≠ 0). `dados.js` monta `S.dados.produtos` juntando o resumo + esse estado. Produto que saiu do resumo mas tem saldo/movimento fica achável, como inativo.
- Transferência (uma vez por empresa): primeiro aparelho de **administrador** conectado leva os produtos do aparelho (sem os de exemplo) para `/produtos/transferencia` em lotes de 500; só se TODOS chegarem é que conclui (`concluir: true`) e o catálogo do servidor passa a valer. Depois disso o arquivo antigo `cicluz-produtos-arquivo-v1` é removido do aparelho. (Comentário: a transferência da TNP aconteceu em 23/11/2026.)
- API (`servidor/shared/src/produtos.ts`): `GET /produtos/resumo`, `GET /produtos?busca&status(ativo|inativo|todos)&tipo&grupoId&vinculo(sem_vinculo|sem_grupo|sem_local)&ordem(recentes|nome|codigo)&pagina&tamanho(≤100)`, `GET /produtos/item/:id`, `POST /produtos`, `PUT /produtos/item/:id` (com `versao`; 409 se outra pessoa salvou antes), `POST /produtos/importacao`, `POST /produtos/revincular`, `POST /produtos/transferencia`.
- Colunas da API: `nome (≤200, obrig.)`, `descricao (≤300, obrig.)`, `marca (≤120)`, `codigoBarras (≤60)`, `tipo revenda|transformacao`, `status ativo|inativo`, `liberadoCompra`, `grupoId`, `subgrupoId`, `localId (≤80)`, `custo (2 casas)`, `margem (6 casas)`, `precoVenda (2 casas)`, `calculoAutomatico`, `dados` (todo o resto do produto, ≤200.000 caracteres, foto inclusa), `codigoInterno`, `appId`, `versao`, `semGrupo`, `semLocal`. Dinheiro com mais de 2 casas é **recusado** (`paraApi → dinheiro()` lança erro; nunca arredonda calado).
- Código interno: gerado **pelo servidor** na criação (maior código < 700000 + 1; o comentário diz que o primeiro novo é 13130). Sem código de barras, o código interno vira o código de barras. Faixa ≥ 700000 esgotada → 409 `CODIGO_ESGOTADO`.
- Na reimportação, campos do S2 em `dados` sobrevivem: `conversoes, pesavel, teclaBalanca, validadeBalanca, areaEstoque, areaVenda, vinculoManual` (`DADOS_DO_S2`).

### 1.3 Outras chaves
| Chave | Conteúdo | Sincroniza? |
|---|---|---|
| `cicluz-horarios-funcionamento-v2` | VND - Horário de Funcionamento `{ version: 2, itens[] }` | **Não** (não está na lista do servidor; "dados só neste aparelho"). |
| `cicluz-horarios-funcionamento-v1` | versão antiga; convertida uma vez para v2 e **mantida** como cópia de segurança | Não |
| `cicluz-produtos-resumo-v1` | resumo dos produtos ativos do servidor | Não |
| `cicluz-financial-hierarchy-v1` | grupos MER (`mercadorias`), RET (`retiradas`) etc. — lidos daqui (`financialGroups`) | Sim (outro módulo) |
| `cicluz-location-tree-v1` | árvore Área › Setor › Local › Sublocal `[{ id, name, children }]` (ou `{ tree }`) | Sim (outro módulo) |
| `cicluz-uniformes-v1` | só lida para saber se o fornecedor é usado (`supplierId`) | — |
| Preferências por aparelho | `cicluz-fornecedores-colunas`, `cicluz-clientes-colunas`, `cicluz-horario-funcionamento-colunas-v2`, `cicluz-fornecedores-prazo-convite`, `cicluz-info-oculta` | Não |

---

## 2. Permissões ("quem pode fazer o quê")

- Catálogo de permissões (`servidor/shared/src/acessos.ts`), área **compras**: `compras_visualizar` (Ver compras e estoque), `compras_solicitar` (Solicitar compra), `compras_cotar` (Fazer cotação), `compras_aprovar` (Aprovar pedido de compra), `compras_receber` (Receber e conferir mercadoria).
- **API de produtos** (única regra de permissão aplicada no servidor neste módulo): ver = `compras_visualizar`; criar/editar = qualquer um de `compras_solicitar | compras_cotar | compras_aprovar | compras_receber`; **importar do app e revincular = só administrador** (`ADMIN_ONLY`). Na tela, Importar/Revincular só aparecem para `perfil.papel === 'administrador'`, em modo servidor e conectado (`telas-produto-importacao.js → podeImportar`).
- Gravar produto exige estar **conectado e em modo servidor**; sem conexão: "o cadastro de produtos só grava conectado". Inativar em lote idem.
- Transferência de produtos do aparelho: só administrador.
- **Demais telas do módulo (agenda, pedido, cotação, recebimento, conferência, fornecedores, clientes, horário, catálogo)**: as operações em `servico.js` e nas telas **não conferem** `compras_*` (busca no código: nenhuma ocorrência em `dist/compras`). O acesso é controlado por tela pelo "Acesso por Tela" (lista lida do menu, `dist/acessos/telas-dados.js`) — ações especiais da área "Compras e estoque": `compras_cotar`, `compras_aprovar`, `compras_receber`. Se essas ações bloqueiam botões dentro das telas: **não confirmado** (não há checagem no código do módulo).
- Regras de "quem" dentro do fluxo: a **conferência** não pode ser aprovada por quem contou (`validarAprovador`). Responsáveis/aprovadores vêm das contas ativas da empresa (`CicluzAgendaDados.pessoas()`, "Pessoas com Acesso").
- Textos fixos gravados no histórico, independentes de quem está logado (dívida): pedido "Comprado" por `'José · Compras'` (ou `'Compra automática'`), cancelamento por `'José · Compras'`, recebimento/extrato com conferente `'Ana · Estoque'`, histórico de nomes `alteradoPor: 'José · Compras'`, pedido urgente com `responsavelId: 'u-jose'`. Os ids `u-jose`, `u-rodrigo`, `u-ana` aparecem como "Pessoa de teste (removida)" (P-46, 24/11/2026).

---

## 3. FLUXO DE COMPRA (ponta a ponta)

```
Produto (MER - Produtos, servidor)  ──grupoId/subgrupoId──► Grupo MER (financeiro)
   │ liberadoCompra + status ativo         └─localId──► nó da árvore de locais
   ▼
Vínculo fornecedor×produto (catalogo, status aprovado)  ◄── Fornecedor (ativo + WhatsApp com DDD)
   ▼
MER - Agenda de Pedidos (agendas: grupo, produtos, repetição, responsável, prazo, margem)
   ▼  na data/hora (processarAgendas, ao abrir MER - Pedido de Compra)
ocorrencia "aguardando_conferencia" + solicitacao "rascunho" (sem quantidade) + tarefa na Agenda do responsável
   ▼  responsável põe quantidades → "Enviar aos fornecedores"
rodada (Cotação nº N, "aberta", preço-base CONGELADO por item, expira em prazoHoras)
 + 1 convite por fornecedor (token; link rodada.html?t=…)
   ▼  fornecedor responde na página pública (rascunho = "Cotado"; envio = resposta)
avaliação automática por item → "comprado" | "com_aumento" | "retornado"(motivo)
   ▼  comprado (automático, aceite do comprador ou contraproposta aceita)
pedido "confirmado" (= Comprado) por fornecedor e rodada; outros fornecedores do item → "já comprado de outro"
   ▼  (fornecedor pode ajustar a quantidade dentro da margem enquanto nada foi recebido)
MER - Pedidos a Receber → "Conferir recebimento" (recebido/devolvido/motivo)
   ▼
produto.saldo += recebido; movimento "recebimento_compra" no extrato; pedido recebido_parcial | recebido
   ▼
Estoque (tela "MER - Grupo Mercadorias") + Extrato auditável; também mexem no saldo:
conferência aprovada (ajuste_conferencia) e Produção (consumo/entrada/abastecimento/sobra)
   ▲
Encerrar a rodada (manual ou prazo): preço-base SÓ DESCE (ou nasce com a menor oferta)
```

### 3.1 Passo a passo com regras
1. **Produto liberado**: só produto `status: 'ativo'` e `liberadoCompra: true` entra na agenda, no pedido, no pedido urgente e no preço-base. Produto novo nasce liberado; inativar desliga a liberação.
2. **Vínculo**: fornecedores "convidáveis" de um produto = vínculos `catalogo` com `status: 'aprovado'` + fornecedor `situacao: 'ativo'` + WhatsApp com ≥ 10 dígitos (`D.motivoNaoConvidavel`: "Fornecedor inativo" / "WhatsApp válido (com DDD)"). Produto sem fornecedor no catálogo: no pedido aparece um seletor para escolher um; ao enviar, esse vínculo **nasce aprovado** no catálogo.
3. **Agendamento** (`SV.salvarAgenda`): não tem quantidade. Primeira data não pode estar no passado. Editar **divide a série**: a antiga termina no dia anterior a "Mudanças valem a partir de" e nasce uma nova com `serieAnteriorId`. "Excluir todas as futuras" → `status: 'encerrada'` (pedidos já gerados continuam). Cada data pode ser movida (`excecoes[previsto] = { data, hora }`) ou excluída (`{ cancelada: true }`) se ainda não virou pedido. "Gerar o pedido agora (simulação)" força a data.
4. **Agendador** (`SV.processarAgendas`, roda ao abrir MER - Pedido de Compra; no S1 roda a cada 60 s no servidor): para cada data vencida ainda não processada cria `solicitacao` (`origem: 'agendamento'`, `status: 'rascunho'`, `itens: []`) e `ocorrencia` (`situacao: 'aguardando_conferencia'`); avisa `CicluzAgendaRotina.tarefaDoPedidoDeCompra` (tarefa na Agenda do responsável, P-46). Nunca envia cotação nem mexe em estoque.
5. **Pedido de compra** (`SV.enviarSolicitacao`): quantidade vazia = produto fora do pedido; ao menos um com quantidade > 0; produto precisa estar na agenda; **teto do estoque máximo**: saldo + quantidade pedida (somada por produto) não pode passar de `estoqueMax` (produto sem máximo não tem teto) — mensagem "Quantidade pedida passa do estoque máximo configurado…". Abre a rodada com `prazoHoras`, `margemPct`, janela de recebimento da agenda, `teto: null`. Cada fornecedor recebe só os produtos dele. Conclui a tarefa da Agenda (`pedidoDeCompraFeito`).
6. **Pedido urgente** (`SV.pedidoUrgente`, atalho em MER - Cotação por Fornecedor): um fornecedor só, fora da agenda; itens sem repetir produto; mesmo teto de estoque máximo; prazo fixo de 24 h; margem escolhida (10/20/30/40%, padrão 10%); `origem: 'rapida'`. Botão "Preencher com o que está no mínimo" sugere `estoqueMax − saldo` para quem está ≤ mínimo (`D.sugestaoReposicao`).
7. **Resposta do fornecedor** (`fornecedor.js` + `SV.responderConvite`): por item "Disponibilidade" (Tenho / Não tenho / Não trabalho mais), "Valor unitário (R$) *", "Quantidade que entrego" (mostra a faixa aceita pela margem); condições opcionais Frete (R$), Data de entrega, Pagamento, Observação. "Salvar sem enviar" grava `rascunho`; "Enviar resposta" exige valor > 0 em todo item disponível e dispara a avaliação. Não reenvia depois de enviada. Link de convite revogado ou rodada fechada → "Esta cotação já foi encerrada."
8. **Compra automática** (`D.avaliarItem`), em ordem:
   - já comprado de outro → `retornado / ja_comprado`;
   - indisponível → `retornado / indisponivel`;
   - custo ≤ 0 → `retornado / custo_nao_calculado`;
   - sem preço-base congelado → `com_aumento / sem_referencia`;
   - custo > preço-base → `com_aumento / acima_da_base`;
   - |disponível − pedida| / pedida > margem → `retornado / fora_da_margem`;
   - teto da rodada (custo × qtd + gasto já comprometido) > teto → `retornado / barrado_pelo_teto` (teto hoje sempre `null`, regra inativa);
   - senão → **comprado** (`modo: 'automatica'`).
   Convite fica `aguardando_comprador` se sobrar item "com aumento" ou retornado por motivo que não seja indisponível/já comprado; senão `encerrado`.
9. **Decisão do comprador** (tela "Cotação do produto"): blocos "Para você decidir" (com aumento, fora da margem, barrado pelo teto), "Aguardando o fornecedor", "Sem oferta", "Comprado". **Aceitar** → "Confirmar compra" com "Só desta vez" ou "Reajustar a referência para R$ X" (só quando sem referência ou oferta acima dela) — comprar é irreversível. **Contrapropor** → valor ≥ R$ 0,01, no máximo 2 casas; o fornecedor vê no link e, ao aceitar, o valor passa pela MESMA regra automática.
10. **Pedido "Comprado"** (`comprar`): um pedido por fornecedor por rodada (`status: 'confirmado'`, número sequencial); item com `solicitada`, `pedida`, `recebida 0`, `devolvida 0`, `pendente`, `custo`, `modo` (`automatica` | `excecao`). Evento "WhatsApp 'pode entregar' enviado" (simulado).
11. **Separação pelo fornecedor** (`SV.registrarSeparacao`): enquanto o pedido está Comprado e nada foi recebido, o fornecedor ajusta a quantidade de cada item dentro de `pedida ± margem` (arredondado em 3 casas, tolerância 0,0005), sem nova aprovação; vira evento no histórico. Também pode marcar "produtos que também vendo" → vínculo **aprovado** `origem: 'fornecedor'` (vínculo já existente, mesmo rejeitado, não é tocado).
12. **Encerrar cotação** (manual "Encerrar cotação agora" ou por prazo em `fecharVencidas`, ao abrir a tela): rodada `fechada`; **preço-base só desce** (`D.novaReferencia`: produto sem referência ganha a menor oferta; com referência, só troca se a menor oferta for menor) com `origem: 'rodada'`; convites `encerrado`; solicitação `comprada` (tudo comprado) ou `parcialmente_comprada` (mesmo sem nada comprado). Depois de fechada: "Pedido urgente com os pendentes" e "Encerrar solicitação" (só parcialmente comprada) ficam disponíveis — com a cotação aberta não, para não comprar duas vezes.
13. **Recebimento** (`D.aplicarRecebimento` + `SV.receberPedido`): só pedido `confirmado` ou `recebido_parcial`; por item Recebido + Devolvido ≤ Falta; nada negativo; devolução exige "Motivo da devolução" e **fecha o item** (pendente 0); ao menos uma quantidade. Saldo do produto += recebido (3 casas); movimento `recebimento_compra`; devoluções em `item.devolucoes[]`; status `recebido` quando nada pende, senão `recebido_parcial`. Atalhos "Recebi tudo" e "Zerar". "Cancelar pedido": só se não recebido/cancelado; o que já entrou fica no estoque.
14. **Estoque e extrato**: ver §4.10.

---

## 4. TELAS E CADASTROS (campos exatos)

Legenda: **obrig.** = obrigatório; validações citam a mensagem do código.

### 4.1 Menu (`modulo.js`)
| Grupo do menu (Saídas · Mercadorias) | Cartão | Rota |
|---|---|---|
| Lançamentos | MER - Agenda de Pedidos ("Pedidos de compra que se repetem") | `compras:agendamento` |
| Lançamentos | MER - Pedido de Compra ("Fazer o pedido e enviar aos fornecedores") | `compras:solicitacao` |
| Lançamentos | MER - Cotação por Fornecedor ("Produtos em cotação e decisões") | `compras:cotacao` |
| Lançamentos | MER - Pedidos a Receber ("O que foi comprado e o recebimento") | `compras:pedidos` |
| Estoques | MER - Grupo Mercadorias (é a tela de **saldo por produto**, não o cadastro de grupos) | `compras:estoque` |
| Estoques | MER - Contagem de Estoque ("Contagem cega, recontagem e aprovação") | `compras:conferencias` |
| Cadastros Geral | MER - Fornecedores | `compras:fornecedores` |
| Cadastros Geral | MER - Produtos | `compras:produtos` |
| Cadastros Geral | Unidades de Medida | `compras:unidades` |
| Cadastros Geral | MER - Catálogo e Preço-Base | `compras:cadastro` |
| Saídas · Despesas › Cadastros Geral | DES - Fornecedores (mesmo cadastro, cor vermelha) | `fornecedores-des` |
| Entradas · Vendas › Cadastros Geral | VND - Clientes | `clientes-vnd` |
| Entradas · Vendas › Cadastros Geral | VND - Horário de Funcionamento | `horario-funcionamento` |
| Pastas Documentos (DES / MER / VND) | DES - Contratos Fornecedores, MER - Contratos Fornecedores, VND - Contratos Clientes | cartões `vz-doc-*` (`contratos.js`) |

O cadastro **MER - Grupos de Mercadorias** não é deste módulo (é do cadastro financeiro, `cicluz-financial-hierarchy-v1 → mercadorias`); aqui é só lido.

### 4.2 MER - Produtos (lista) — `telas-produto-lista.js`
- Lista dos **ativos** (resumo local); botão "Inativos" busca os inativos na API (paginado, 12 por página). Busca pela lupa do rodapé ("nome, código interno, código de barras ou marca"). Ordem "recentes". Celular (≤ 600 px) vira cartões.
- Colunas: Produto (fixa), Tipo, Estoque, Mín · Máx, Preço (preço com promoção valendo agora), Compra (pendências), Situação.
- **Pendências de compra** (`R.pendenciasDeCompra`, só produto liberado): "como se compra" (falta embalagem, medida de compra ou Qt. ≥ 1), "mínimo e máximo" (falta um dos dois), "fornecedor aprovado" (sem vínculo aprovado no catálogo).
- **Alerta de vínculo** (`S.vinculo`): sem grupo de mercadorias e/ou sem local da árvore.
- Bolinhas de ranking (topo 20% positivos dos últimos 3 meses, empate na fronteira entra): verde = mais vende (`vendas3m`), amarela = mais compramos (`compras3m`), azul = mais lucro (`lucro3m`).
- Inativar em lote: digitar exatamente `INATIVAR <n> PRODUTOS`; produto nunca é apagado (vira `inativo` + `liberadoCompra: false`). Só conectado.
- Administrador: "Importar" (Backup XLSX do app de produtos; abas Produtos/Promocoes; colunas obrigatórias `id, loja, status, codigo_interno, base_product_id, nome, grupo`; loja `TNP`; lotes de 500; grupo e local casados por nome normalizado **exato**, prefixo "MER" ignorado, "GRUPO - SUBGRUPO"; o que não casa fica sem vínculo com o texto original guardado em `origemApp`) e "Revincular".

### 4.3 Cadastro de produto — `telas-produto-form.js` (6 passos na barra: 5 etapas + Revisão)
Etapas (nomes do Rodrigo, 17/11/2026): **1 Cadastro geral · 2 Cadastro produção/transformação · 3 Cadastro específico · 4 Cadastro promoção · 5 Cadastro fiscal · 6 Revisão dos dados**. No cadastro novo o Salvar só aparece na última; na edição, em todas. Revisão = leitura com "Editar" por etapa. Botão do diálogo: "Salvar produto".

**Etapa 1 — Cadastro geral**
Quadro "Produto" (Identificação e apresentação no catálogo):
| Campo (tela) | Tipo | Obrig. | Regras / gravado em |
|---|---|---|---|
| Situação do produto | interruptor | — | `status` ativo/inativo; desligar desliga "Liberado para compra". |
| Habilitar ajuda | caixa | — | `habilitarAjuda` (mostra dicas). |
| Liberado para compra | caixa | — | `liberadoCompra` (padrão Sim no novo). Aviso se liberado sem embalagem/medida de compra. |
| Foto | painel Anexar (Tirar foto / Escolher da galeria) | — | JPEG/PNG/WebP, ≤ 8 MB; reduzida a 320 px JPEG 0,8 → `fotoUrl` (data URL). |
| Código de barras | texto numérico ≤ 20 + "Ler pela câmera" | — | `codigoBarras` (só dígitos). Aviso se outro produto tem o mesmo (≥ 6 dígitos). Vazio no novo → recebe o código interno gerado. |
| Código interno | leitura (só na edição) | — | gerado pelo servidor. |
| Marca | texto ≤ 60 | — | `marca` (maiúsculas). |
| Nome do produto | texto ≤ 200 | **sim** | `nomeCatalogo` (maiúsculas), sem gramatura. |
| Gramatura | decimal | (0 ou mais) | `quantidadeIndividual`. |
| Medida base | seleção UN/KG/G/LT/ML (só as ativas nas Unidades) | **sim** | `unidadeIndividual`. |
| Vai para balança? | Não/Sim | sim (padrão Não) | `pesavel`. |
| Tecla da balança | leitura "000" | — | `teclaBalanca = 0` fixo ("confirmado para a TNP"). |
| Validade na balança (dias) | número | sim se balança | `validadeBalanca`, inteiro 0–999. |
| Descrição (automática) | leitura | — | `descricao = NOME + gramatura + MEDIDA` (`R.montarDescricao`). |
| Histórico de nomes (botão, edição) | — | — | lista de `historicoNomes` (máx. 200). |

Quadro "Como se compra" (Embalagem e unidade de compra):
| Campo | Tipo | Regras |
|---|---|---|
| Embalagem | seleção de siglas de Unidades | `embalagem` |
| C/ ou DE | C/ \| DE | `cDe` ("C/" = com, caixa com 12; "DE" = saco de 25 kg) |
| Qt. embalagem | número inteiro ≥ 1 | `qtdEmbalagem`; "A Qt. embalagem precisa ser um número inteiro a partir de 1." |
| Medida de compra | sigla | `medidaCompra` |
| Quantidade da embalagem | Exato \| Aproximado | `compraAproximada` (escreve "APROXIMADAMENTE") |
| Como se compra (automático) | leitura | `R.montarComoSeCompra` → "DESCRIÇÃO - CAIXA COM DESCRIÇÃO 12UN" |

Quadro "Conversões de unidade": linhas Unidade / Quantidade / Unidades individuais → `conversoes[]`; sem unidade repetida; quantidade e unidades individuais > 0.

**Etapa 2 — Cadastro produção/transformação**
| Campo | Tipo | Regras |
|---|---|---|
| Tipo | Revenda \| Transformação | `tipo`. Transformação esconde a etapa Promoção. |
| Grupo de mercadorias | árvore MER (grupo ou subgrupo) | **sim** no novo (e se já tinha grupo): "Selecione o grupo de mercadorias para aplicar os impostos." → `grupoId`, `subgrupoId`. Trocar o grupo copia a margem padrão do grupo. |
| Transformação: Precisão | EXATOS \| APROXIMADOS | `transformacao.precisao` |
| Quantidade | número | `transformacao.quantidade` |
| Unidade | UN/G/ML | `transformacao.unidade` |
| Produto receituário | texto ≤ 120 | maiúsculas |
| Ref. receituário | texto ≤ 60 | |
| Validação de quantidade (automática) | leitura | "DENTRO DA EMB (descrição) TEM [precisão] [qtd] [unidade]" |

**Etapa 3 — Cadastro específico** (quadro "Desta loja": Estoque, pontos de venda e preço)
| Campo | Tipo | Regras / gravado |
|---|---|---|
| Setor de estoque | janela da árvore de locais | `localId` (**id do nó**) + `setorEstoque` (nome); texto antigo sem nó fica como `txt:` com aviso. |
| Área | janela da árvore | `areaEstoque` (**gravado pelo NOME**). |
| Estoque mín. | número ≥ 0 | `estoqueMin` |
| Estoque máx. | número ≥ 0 | `estoqueMax`; "O máximo não pode ser menor que o mínimo." |
| Local de venda primário / secundário | texto ≤ 120 com lista | `localVenda1`, `localVenda2` (texto, maiúsculas) |
| Setor de venda primário / secundário | texto ≤ 120 | `setorVenda1`, `setorVenda2` |
| Área da loja (Relatório Gerentes) | lista fixa (Caixa, Vitrine, Copa, Chapa, Mesas, Vasca de pães, Vitrine de pães, Pães empacotados, Mesa de pães, Frios, Bebidas, Laticínios, Mercearia, Estoque de bebidas, Biscoitos, DML / limpeza) | `areaVenda` |
| Custo | moeda | `custo` = **custo da embalagem de compra** |
| Margem (%) | decimal 0–1000 | `margem` (fração). Vazio = usa margem padrão do grupo; 0 = vende pelo custo. |
| Calcular venda automático | caixa (padrão Sim) | `auto` |
| V. Venda pontual | moeda (só com automático desligado) | |
| V. Venda (calculado) | leitura | `precoVenda` |
| Estoque atual | leitura | "Só o recebimento conferido altera o saldo." |

**Regras de preço e estoque (dinheiro — fórmula existente, não alterar sem o Rodrigo)**:
- `precoVenda = (custo ÷ Qt. embalagem) × (1 + margem)`; margem do produto tem prioridade sobre a do grupo; com automático desligado vale o preço pontual (`R.calcularPrecoVenda`). Margem padrão do grupo vem de `TABELAS_EXEMPLO` (**fictícias**).
- **Múltiplos de embalagem** (`R.validarEstoquePorEmbalagem`): mínimo não pode ser menor que a Qt. embalagem e deve ser múltiplo dela; máximo deve ser múltiplo; máximo > mínimo.
- Custo unitário de estoque (conferência) = custo ÷ Qt. embalagem.

**Etapa 4 — Cadastro promoção** (só Revenda): "+ Adicionar promoção", cada "Promoção N":
| Campo | Regras |
|---|---|
| Tipo | Valor fixo \| Desconto % |
| Valor promo | > 0 se valor fixo |
| Desconto % | 0 < x ≤ 100 (`descontoFracao`) |
| Agendar promoção | Sim/Não; Não = vale todos os dias, o dia todo |
| Data de início | "Vazio = já está valendo." |
| Início / Término (hora) | término não pode ser antes do início (virar o dia = duas promoções) |
| Repetição | Nunca, Diariamente, Dias de semana, Fins de semana, Semanalmente, Quinzenalmente, Mensalmente, A cada 3 meses, A cada 6 meses, Anualmente, Personalizada (Frequência + "A cada" 1–99) |
| Dias da semana / Dias do mês / Meses | conforme repetição |
| Terminar repetição | data `validaAte`; "Vazio = nunca termina." |
Regras: sem repetição exige data de início; anual exige data; mensal sem dias exige data; intervalo > 1 exige data; fim ≥ início; promoções não podem se sobrepor (`R.validarPromocoesDoProduto`; teste de sobreposição nos próximos 2 anos). Preço agora = menor preço entre as promoções ativas. **Promoção agendada com data de início vira compromisso na Agenda** (lista "Promoções", criada se não existir), ligação por `pr.agendaItemIds`; promoção removida/encerrada ou produto inativo apaga os compromissos.

**Etapa 5 — Cadastro fiscal** (puxado pelo grupo; "ninguém digita imposto")
- NCM (automático quando encontrado; 8 dígitos), Código CEST (7), Categoria (maiúsculas), CST PIS/COFINS (automático), CST reforma, cClassTrib, IBS %, CBS %; interruptor "Ver os 27 campos fiscais".
- Editáveis à mão (`FISCAIS_MANUAIS`): ncm, cest, categoriaFiscal, aliquotaCheia, aliquotaFcp, aliquotaPis, aliquotaCofins, reducaoIcms, icms. O resto é derivado. Estados: Não classificado, Completo, Parcial, Grupo sem regra, Sem correspondência, Ambíguo, Conflito, Sem fonte da loja, Fonte indisponível. Chave de regra: "GRUPO - SUBGRUPO", senão "GRUPO". As tabelas são de exemplo (no S1 vêm da planilha fiscal da loja).

**Ao salvar**: duplicidade no novo (mesmo código de barras ou mesmo nome bloqueia; nomes ≥ 55% parecidos avisam; "Cadastrar mesmo assim"). Textos descritivos em maiúsculas. Mudou grupo/local à mão → `vinculoManual` (Revincular não desfaz). Grava na API (cria ou edita com `versao`). Troca de nome registra `historicoNomes` no documento do Compras.

### 4.4 Unidades de Medida — `telas-produto-extras.js`
- Campos: Situação da unidade (interruptor), **Sigla \*** (até 6, A–Z 0–9 "/", maiúsculas), **Nome \*** (≤ 40). Sigla única. Gravado em `cicluz-compras-v1.unidades` `{ id, sigla, nome, ativa }`.
- Unidade **em uso** (embalagem, medida de compra, medida base ou conversão de algum produto): sigla travada e não pode ser excluída (só desativar). Sem uso: exclusão definitiva com confirmação.
- Ligação com o produto é **pela SIGLA (texto)**, não pelo id.

### 4.5 MER - Fornecedores / DES - Fornecedores — `cadastros.js`
Um só cadastro (`cicluz-compras-v1.fornecedores`), duas portas: MER (verde) e DES (vermelho). Cor do formulário segue a categoria escolhida (Produto verde, Serviço vermelho).

**Lista**: ordem Produto → Serviço → sem categoria; ativos antes; por nome. Colunas: Fornecedor (nome de uso), Categoria, Nome do contato, WhatsApp, Razão social, CNPJ / CPF, Ramo, Avisos ("Completar cadastro", "WhatsApp sem DDD"/"Sem WhatsApp"), Situação. Botões: "Novo Fornecedor", "Enviar" (link de cadastro — **desligado**, P-29: "O link de cadastro ainda não está ativo"), "Contratos" (tipos/modelos de contrato).
**Excluir**: se usado em Compras (catálogo, histórico, cotação, pedido), peça do patrimônio (`fornecedorId`) ou compra de uniforme (`supplierId`), não exclui — oferece **inativar**; sem uso, exclui com confirmação.

**Etapas** (`D.etapasFornecedor`): PJ = 1 Dados da empresa · 2 Dados do vendedor (Produto) ou Dados do prestador de serviço (Serviço) · 3 Dados do responsável financeiro · 4 Dados do responsável legal · 5 Vínculos · 6 Contrato · 7 Revisão dos dados. PF = sem a etapa da empresa (1ª já é "Dados do vendedor/prestador"). "Terá contrato?" = Não → a etapa Contrato some. Novo: Avançar confere a etapa; existente abre na Revisão.

Etapa 1 — Dados da empresa:
| Campo | Tipo | Obrig. | Regra / chave |
|---|---|---|---|
| Categoria do fornecedor | cartões Produto ("Vende mercadorias") / Serviço ("Presta serviços"), escolha única | **sim** | `categorias: ['produto'|'servico']` |
| Tipo de fornecedor | PF - Pessoa Física / PJ - Pessoa Jurídica | sim | `tipoPessoa` |
| Situação do fornecedor | interruptor | — | `situacao` ativo/inativo ("inativo não aparece no seletor de cotação") |
| CNPJ * (PJ) | máscara | **sim** | `documento`; dígito verificador (`cnpjValid`). Consulta pública do CNPJ preenche razão, fantasia e endereço. |
| CPF * (PF) | máscara | **sim** | `documento`; `cpfValid` |
| Razão social (PJ) | texto ≤ 160 | — | `razaoSocial` |
| Nome fantasia (PJ) / Nome completo (PF) | texto ≤ 120 | **sim** (fantasia ou razão) | `nome` (nome de uso em cotação/pedido); sem fantasia, a razão vira o nome. Nome repetido (sem acento) bloqueia. |
| Regime tributário (PJ) | MEI, Simples Nacional, Lucro Presumido, Lucro Real, Imune / Isenta, Não informado | — | `regimeTributario` (não entra em cálculo) |
| Endereço: Preencher endereço (PJ) | Sim/Não | PJ opcional; **PF obrigatório completo** (menos complemento) | `endereco { cep, logradouro, numero, complemento, bairro, cidade, uf }`; CEP 8 dígitos; UF 2 letras; consulta de CEP. |
Cadastro antigo com documento que não é CPF nem CNPJ: aviso, guarda em `documentoAnterior`.

Etapa 2 — Dados do vendedor / Prestador 1 (o WhatsApp deste contato recebe a cotação):
| Campo | Obrig. | Chave |
|---|---|---|
| Nome do vendedor/prestador | — | `contatoNome` |
| WhatsApp do vendedor/prestador * | **sim** (≥ 8 dígitos para ser válido; ≥ 10 com DDD para poder receber cotação) | `whatsapp` |
| Aniversário (dia e mês) | — | `vendedorAniversario` "MM-DD" |
| E-mail do vendedor/prestador | formato | `email` |
| Funções (pode marcar várias) — só Serviço | — | `prestadores[0].funcoes` (ids de `funcoesPrestador`); "Acrescentar opção" (nome ≤ 60, sem repetir) e "Gerenciar funções" (em uso → só inativar). |
| Adicionar prestador (Prestador 2, 3…) — só Serviço | Nome do prestador * obrigatório; WhatsApp/E-mail/Aniversário no formato | `prestadores[]` `{ id, nome, whatsapp, email, aniversario, funcoes[] }` |
Na PF, WhatsApp/E-mail/Data de aniversário sobem para a 1ª etapa (mesmos campos).

Etapa 3 — Dados do responsável financeiro: "O mesmo da etapa anterior" (Sim/Não, copia e trava), Nome do financeiro, WhatsApp do financeiro, E-mail do financeiro → `financeiro { mesmo, nome, whatsapp, email }`.

Etapa 4 — Dados do responsável legal: "Terá contrato?" (Sim/Não) → `contrato.tem`; "O mesmo da etapa anterior"; Nome/WhatsApp/E-mail do representante; Cargo na empresa (Proprietário, Sócio-proprietário, Diretor geral, Diretor comercial, Gerente geral, Gerente comercial, Supervisor geral, Supervisor comercial, Representante comercial, Administrador, Financeiro, Procurador, Outro) → `representante`. Com contrato: bloco completo "Responsável legal no contrato" (mesma peça de Dados da Empresa, `CicluzEmpresa.blocoResponsavel`) → `representante.cargoEmpresa, cpf, rg, rgOrgao, nacionalidade, estadoCivil, profissao, endereco, nascimento, representacao`, validado com as regras de Dados da Empresa.

Etapa 5 — Vínculos: Produto → "Produtos que este fornecedor fornece" (escolha múltipla; ao salvar cria vínculo **aprovado** `origem: 'compras'` em `catalogo`; vínculos já aprovados ou sugestões pendentes aparecem travados, não saem por aqui). Serviço → "Grupos de despesa deste prestador (um ou mais)" → `gruposDespesaIds` (`"grupo"` ou `"grupo|subgrupo"`, de DES - Grupos de Despesas).

Etapa 6 — Contrato (ver §4.13) + bloco "Ficha do fornecedor": Imprimir ficha, Enviar ficha (abre WhatsApp/e-mail com a mensagem; só envia se a pessoa confirmar lá), Visualizar documento (`f.documentos[]` data URL, só leitura/baixar cópia).

Validação ao salvar: `D.validarFornecedorEtapas` (uma mensagem por etapa; leva à etapa com problema). Exigência vale ao salvar — fornecedor antigo incompleto continua sendo usado.

### 4.6 MER - Catálogo e Preço-Base — `telas-cadastro.js`
Abas:
1. **Catálogo fornecedor–produto**: filtros Situação (Pendente/Aprovado/Rejeitado), Fornecedor, Origem (Compras/Fornecedor), busca. Colunas Fornecedor, Produto, Origem, Status, Preço ofertado. "Vincular produto": **Fornecedor \*** (ativos), **Produto \*** (ativos), Preço ofertado (opcional) — "Este vínculo já existe." se houver não rejeitado. Vínculo criado por Compras nasce **aprovado**; só a sugestão do fornecedor (`origem: 'fornecedor'`, `pendente`) pede Aprovar/Rejeitar. Não há como desfazer vínculo aprovado (comentário do código).
   Registro: `catalogo[] { id 'v-…', fornecedorId, produtoId, origem: compras|fornecedor, status: pendente|aprovado|rejeitado, precoOfertado, criadoEm, observacao? }`.
2. **Histórico de compras**: período 1/3/6/12 meses; une `historico[]` (carga de exemplo) + itens de pedidos não cancelados; por produto×fornecedor: Última compra, Último custo, Menor, Maior, Compras, Quantidade.
3. **Preço-base**: produtos ativos liberados; filtro "Sem preço-base". Colunas Produto, Código interno, Preço-base, Origem (Carga inicial / Cotação / Manual), Válido desde. Editar: "Preço-base (R$ por <unidade>)" > 0, máximo 2 casas, diferente do atual. Cada mudança fecha a vigente (`ate = hoje`) e cria nova (`precosBase[] { id 'pb-…', produtoId, valor (4 casas), origem: importacao|rodada|manual, desde, ate: null }`). Vigente = `ate` nulo. Cotações abertas mantêm o valor congelado.

### 4.7 MER - Agenda de Pedidos — `telas-pedido.js`
Formulário "Novo agendamento"/"Editar agendamento":
| Quadro | Campo | Obrig. | Regra |
|---|---|---|---|
| Pedido | Grupo * (árvore MER, grupo ou subgrupo) | **sim** | `grupoId`, `subgrupoId` |
| Quando | Primeiro pedido em * (data; padrão amanhã) | **sim** | não pode ser passado no novo |
| Quando | Hora * (padrão 08:00) | **sim** | |
| Quando | Repetir (Nunca, Todo dia, Toda semana, A cada 2 semanas, Todo mês, Todo ano, Personalizado… → Frequência Diária/Semanal/Mensal/Anual, A cada 1–99, marcas de dias/meses) | — | `regra` |
| Quando | Terminar repetição (Nunca / Na data / Depois de N vezes), Termina em, Quantidade de vezes (1–999) | — | `termino`; término não antes do início |
| Quando (edição) | Mudanças valem a partir de | — | divide a série |
| Responsável | Responsável por executar * (Pessoas com Acesso) | **sim** | `responsavelId` |
| Para o fornecedor | Tempo de resposta da cotação (horas) (atalhos 4h/12h/1 dia/2 dias; padrão 24) | — | 1–720 |
| Para o fornecedor | Recebemos das / Até (hora) | os dois ou nenhum | fim > início |
| Para o fornecedor | Variação aceita na quantidade (10/20/30/40%; padrão 10) | — | `margemPct` |
| Produtos do agendamento | tabela com marcação; filtros Buscar, Área / setor da loja, Local de estoque, Local de venda, "Só os marcados", "Marcar os listados" | ≥ 1, ≤ 500 | `produtoIds`; só ativos e liberados; mostra 300 por vez |
Registro: `agendas[] { id 'ag-…', status ativa|encerrada, excecoes{}, criadaEm, serieAnteriorId?, grupoId, subgrupoId, produtoIds[], inicio, hora, regra, termino, responsavelId, prazoHoras, recebimentoInicio, recebimentoFim, margemPct }`.

### 4.8 MER - Pedido de Compra — `telas-pedido.js`
- Seções "Para enviar" (ocorrências aguardando) e "Agendados".
- "Fazer o pedido": cabeçalho com Pedido de / Resposta em / Variação aceita / Recebemos das; tabela Produto (estoque e máx.), Quantidade (vazio = fora), Vai para (fornecedores convidáveis ou seletor "Escolha o fornecedor", com os indisponíveis desabilitados e o motivo). Botão "Enviar aos fornecedores" → mostra os convites.
- Registros: `ocorrencias[] { id 'oc-…', agendaId, previsto, data, hora, situacao aguardando_conferencia|enviada|cancelada, solicitacaoId, criadaEm }`; `solicitacoes[] { id 'sol-…', origem agendamento|rapida, agendaId?, grupoId, status rascunho|em_cotacao|comprada|parcialmente_comprada|encerrada|cancelada, itens[{ produtoId, quantidade }], observacao?, criadaEm, responsavelId }`.

### 4.9 MER - Cotação por Fornecedor — `telas-cotacao.js`
- Matriz "Produtos em cotação" (só rodadas abertas): colunas Produto, Enviado, Cotado, Retornado, Com aumento, Comprado; filtro "Todos" / "Para decidir (n)" (tem com aumento e nada comprado). Clique → "Cotação do produto" (subtítulo com a referência congelada ou "sem preço-base").
- Rodapé "Cotações": últimas 12 rodadas → "Cotação nº N" com pendentes e motivo prioritário, "Encerrar cotação agora", "Pedido urgente com os pendentes", "Encerrar solicitação", "Ver convites".
- Convites: por fornecedor "Respondeu" / "Cotando" / "WhatsApp enviado (simulado)", "Copiar link", "Abrir como fornecedor". O envio real por WhatsApp **não existe** (simulado).
- Pedido urgente: **Fornecedor \*** (ativos), itens Produto + Quantidade ("Adicionar item", "Remover", "Preencher com o que está no mínimo"), Observação, Variação aceita.
- Registros: `rodadas[] { id 'rod-…', numero, solicitacaoId, status aberta|fechada|cancelada, criadaEm, expiraEm, prazoHoras, margemPct, teto, recebimentoInicio, recebimentoFim, itens[{ produtoId, quantidade, referencia }], motivoFechamento manual|prazo, fechadaEm }`; `convites[] { id 'cv-…', rodadaId, fornecedorId, token 'tk-…', status aberto|aguardando_comprador|encerrado|revogado, whatsapp: 'enviado', itens[produtoIds], resposta{ itens{[produtoId]: { indisponivel, motivo sem_estoque|nao_trabalha, valor, quantidade }}, frete, entrega, pagamento, observacao, enviadaEm }, rascunho, estados{[produtoId]: { situacao, motivo, modo }}, contrapropostas{[produtoId]: { valor, status pendente|aceita, em }}, criadoEm }`.
- Motivos exibidos (`D.MOTIVOS`): Sem resposta, Fornecedor não tem, Custo não calculado, Sem preço-base, Acima da base, Barrado pelo teto, Fora da margem, Já comprado de outro.

### 4.10 MER - Pedidos a Receber e Estoque — `telas-recebimento.js`
- Abas A caminho (confirmado + recebido_parcial) / Recebidos / Cancelados; filtro Fornecedor. Detalhe com trilha Comprado → Recebido parcialmente → Recebido, tabela Produto/Custo/Pedido/Recebido/(Devolvido)/Falta e Histórico de eventos.
- "Conferir recebimento": por item Falta, Recebido, Devolvido, Motivo da devolução; "Observação da conferência". Botão "Confirmar recebimento".
- `pedidos[] { id 'ped-…', numero, tipo 'rodada', origem, rodadaId, fornecedorId, status confirmado|recebido_parcial|recebido|cancelado, itens[{ id 'pi-…', produtoId, solicitada, pedida, recebida, devolvida, pendente, custo, modo, devolucoes[{ quantidade, motivo, em }] }], eventos[{ em, status, quem, obs }], criadoEm }`. Situações: Comprado, Recebido parcialmente, Recebido, Cancelado.
- **Tela "MER - Grupo Mercadorias" (Estoques)**: indicadores Produtos na lista / No mínimo / Dá para completar até o máximo / Sem mínimo e máximo; filtros Produto ou grupo, Grupo, Área, Local de estoque, Local de venda (por **nome**). Colunas Produto (+grupo), Onde fica (área › setor), Saldo, Mín./máx., Situação (No mínimo = saldo ≤ mín.; No máximo = saldo ≥ máx.; Sem faixa; Regular), botão Extrato.
- **Extrato auditável de estoque**: filtros Produto, De, Até. Colunas Quando, Produto / origem, Conferente (+ "aprovou"), Quantidade (±), Saldo anterior, Saldo posterior. `movimentos[] { id 'mov-…', em, produtoId, tipo, entrada (±), saldoAnterior, saldoPosterior, conferente, pedidoId? | conferenciaId? + aprovadorId + motivo | ordemNumero / ordemProducaoId | producaoPedidoId / producaoPedidoNumero }`. Tipos: `recebimento_compra`, `ajuste_conferencia`, e da Produção (`dist/producao/servico.js`, que grava no MESMO documento via `CicluzComprasDados.transacao`): `consumo_producao`, `entrada_producao`, `saida_abastecimento`, `sobra_retorno` (conferente "Produção", 4 casas).

### 4.11 MER - Contagem de Estoque — `telas-conferencia.js` + `servico.js`
- "Agendar conferência": O que contar → Grupo (árvore; vazio = todos), Área, Setor / local de estoque (árvore, **gravam o nome**), Local de venda (texto), chips Mais vendidos / Mais comprados / Mais lucro; Quem conta → **Quem conta \***; Quando → **Primeira conferência em \*** (não no passado), **Hora \*** (padrão 07:00), Repetir/Terminar (mesmo campo da agenda); Orientação para quem conta. Recorte sem produto ativo → "Nenhum produto ativo neste recorte."
- Agendador (`processarConferencias`, ao abrir a tela) cria a conferência e **congela `saldoSistema`** de cada produto do recorte.
- Ciclo: `agendada → recontagem → concluida → aprovada | recusada`.
  - Contagem **cega** (não mostra o saldo); "Guardar e continuar depois" ou "Concluir contagem" (todos contados; quantidades ≥ 0, 3 casas). O que diverge volta para **recontagem cega**.
  - Recontagem: o que continuar diferente exige **motivo** (≤ 200).
  - Cada número digitado vai para `item.historico[{ valor, etapa, em, por }]`.
  - Revisão: Sistema, Contado (+1ª contagem), Diferença, Valor (diferença × custo unitário, centavos inteiros; falta negativa, sobra positiva), Motivo; chips Faltas/Sobras/Resultado.
  - **Quem aprova \*** ≠ quem contou. "Aprovar e ajustar o estoque": saldo atual += diferença (contado − congelado), movimento `ajuste_conferencia`. "Recusar": **Motivo da recusa \*** (≤ 300), estoque não muda.
- Registros: `conferenciaAgendas[] { id 'ca-…', status, excecoes, filtro{ grupoId, subgrupoId, area, setor, localVenda, ranking[] }, responsavelId, inicio, hora, regra, termino, orientacao }`; `conferencias[] { id 'cf-…', agendaId, previsto, data, hora, status, responsavelId, itens[{ produtoId, saldoSistema, contado, recontado, recontar, motivo, historico }], contagemConcluidaEm, concluidaEm, aprovadorId, decididaEm, resultado{ faltas, sobras, liquido }, motivoRecusa }`.
- Comentário: controle de conferência é decisão do Zé (04/11/2026), só no S2 (S1 pendente).

### 4.12 VND - Clientes — `clientes.js` (Entradas › Vendas › Cadastros Geral)
- Dados em `cicluz-compras-v1.clientes`. Quatro modalidades no mesmo registro: PF/PJ × Simples/Completo (trocar não apaga nada; troca registrada em `historico[{ em, de, para }]`). Cliente **não é excluído**: a seta desativa/ativa. Um toque mostra os dados; dois toques editam. Botão "Enviar" = link de cadastro **simulado** (P-30): modelos oferecidos PF (pf-simples) e PJ (pj-completo); cadastro recebido pelo link entra `situacao: 'inativo'`, `statusCadastro: 'recebido'`, `origem: 'link-teste'`.
- Colunas: Cliente, Tipo de cliente, WhatsApp, E-mail, Situação (Ativo/Inativo/Recebido).
- Regras de tela: PJ cadastrado por dentro é **sempre em etapas** (mesmo o antigo "Simples"); PF nova é página única.

| Modalidade | Etapas (`D.etapasCliente`) | Campos e obrigatórios |
|---|---|---|
| PF Simples | página única | Tipo de cliente, Situação do cliente, **Nome completo \***, **WhatsApp \***, **E-mail \***, **Data de aniversário \*** (dia e mês "MM-DD"); Endereço opcional ("Preencher endereço"). Duplicado = mesmo nome + mesmo WhatsApp. |
| PF Completo | Dados pessoais · Endereço · Informações complementares · Revisão | + **CPF \*** (válido, único entre PF). "Informações complementares" = **Sorteio — Em definição** (não existe regra). |
| PF com contrato ("Terá contrato?" = Sim, logo após a Situação) | Dados do cliente · Contrato · Revisão | dados completos (bloco de Dados da Empresa sem cargo: CPF, RG, órgão, nacionalidade, estado civil, profissão, endereço, nascimento, representação) + contrato em blocos. |
| PJ Simples | página única | **CNPJ \*** (válido, único), **Razão Social \***, Nome Fantasia, WhatsApp, E-mail, endereço opcional. |
| PJ Completo | Dados da empresa · Dados do responsável financeiro · Dados do responsável legal · Contrato · Revisão (sem contrato: sem a etapa Contrato) | Etapa 1: CNPJ \*, Razão Social \*, Nome Fantasia \*, Regime tributário \*, CEP/Rua/Número/Bairro/Cidade/UF \* (complemento opcional). Etapa 2 "Dados do responsável financeiro": **Nome do responsável \***, **WhatsApp \***, **E-mail (financeiro e/ou fiscal) \***, **Aniversário \***, Cargo na empresa = "Financeiro" (fixo); quadro "Informações de cobrança": **É cliente mensal?** (Sim → Fechamento "Do dia 1º ao último dia do mês", Forma de pagamento Boleto, Vencimento "Todo dia 10", só leitura). Etapa 3: Terá contrato?, O mesmo da etapa anterior, Nome/WhatsApp/E-mail do responsável legal, Aniversário do responsável legal, Cargo na empresa (com contrato: bloco completo). |

Chaves do registro: `{ id 'cl-…', tipoPessoa fisica|juridica, cadastro simples|completo, situacao, nome, cpf, whatsapp, email, aniversario "MM-DD", nascimento (antigo), endereco{}, cnpj, razaoSocial, nomeFantasia, regimeTributario, contatoNome, contatoAniversario, financeiro{ mesmo, … } (antigo), representante{ nome, whatsapp, email, aniversario, cargo, cargoEmpresa, cpf, rg, … }, contrato{ temDocumento, tem, clienteMensal, … }, rg, rgOrgao, nacionalidade, estadoCivil, profissao, representacao, statusCadastro, origem, historico[], criadoEm, atualizadoEm }`. No cliente, "tem contrato" é `contrato.temDocumento` (a chave `tem` já existia com outro sentido e fica `true`); a empresa contratada é `contrato.contratadaEmpresaId`.
- Cliente mensal: só informativo (`D.CLIENTE_MENSAL = { formaPagamento: 'boleto', vencimentoDia: 10 }`); **não gera cobrança, boleto nem lançamento**. Recorrência "Compra Mensal" existe na lista do cliente com término (`terminoMensal`).

### 4.13 Contrato em blocos (fornecedor e cliente) — `contratos.js` + `dominio.js`
- Papel: no fornecedor, a **sua empresa é a contratante** (`contrato.contratanteEmpresaId`) e o fornecedor o contratado; no cliente, o cliente é contratante e a sua empresa a **contratada** (`contratadaEmpresaId`). Empresas vêm de Configurações → Empresa → Dados da Empresa (`cicluz-compras-v1.empresas`, a primeira é a Matriz).
- Blocos: **1 · Contratante**, **2 · Contratado** (resumos só leitura), **3 · Objeto do contrato** (Produtos do contrato → árvore MER com grupo/subgrupo/produto; Despesas do contrato → grupos/subgrupos DES; Patrimônios do contrato → grupo de Investimento `ret-g0` › subgrupo › bem), **4 · Valor, vencimento e reajuste**, **5 · O que está incluso**, **6 · O que não está incluso**, **7 · Condições de rescisão** (texto ≤ 2000, "Usar texto sugerido" com prazo em branco), **8 · Tipo de contrato e cláusulas** (opcional), **9 · Assinaturas e documento** (Imprimir / Assinatura Física, Enviar / Assinatura Digital — **não existe serviço**, Visualizar contrato).
- Bloco 4 campos: Forma de pagamento (fornecedor: Boleto, Dinheiro; cliente: Dinheiro, Boleto, PIX, Transferência; valor antigo aparece "(cadastro anterior)"), Data de vencimento (do boleto) — some em dinheiro; **Dia de pagamento "Toda sexta-feira"** (fornecedor em dinheiro, informativo, `diaPagamento: 'sexta'`), Tipo de recorrência (Por visita, Por solicitação, Por hora, Por dia, Por mês, Por ano, [cliente: Compra Mensal], Personalizado → painel: Repetir a cada 1–999 hora/dia/semana/mês/ano, dias da semana, mensal por dia 1–31 ou posição Primeira…Última + dia da semana, término nunca/data/ocorrências 1–9999), Valor (R$) (centavos inteiros; frase "R$ X por visita."), Referência do salário mínimo (Percentual do salário mínimo (%) > 0 e ≤ 10000; Salário mínimo vigente só leitura; percentual ↔ valor calculado pelo salário vigente de `salariosMinimos`; contrato gravado não é recalculado sozinho), Início da vigência, Término da vigência (≥ início), Reajuste (Sem reajuste, Salário mínimo, IPCA, IGP-M, INPC, Percentual fixo — **só o índice; o sistema não calcula**), Percentual do reajuste (%) \* (0 < x ≤ 100 se percentual fixo), Observações do contrato (≤ 2000).
- Atividades: listas incluídas/não incluídas `{ id 'at-…', texto ≤ 200, ref? }` (ref = grupo/subgrupo DES), máx. 60 por lista, sem repetir, nenhuma nas duas.
- **Modelos (tipos) de contrato** (`cicluz-compras-v1.modelosContrato`): Nome do tipo de contrato \* (≤ 80, único), Descrição (≤ 1000), Cláusulas (título ≤ 120, texto ≤ 4000, máx. 60 — "O sistema não cria cláusulas"), Atividades, Valor (R$), Tipo de recorrência (sem Personalizado), Vigência (meses) 1–600, Renovação (Sem renovação / Renovação automática / Renovação manual, a combinar), Campos adicionais (≤ 20; rótulo ≤ 60; tipo Texto/Data/Número/Valor em reais; Obrigatório). `versao` sobe só quando o conteúdo muda; Inativar/Reativar. **O contrato guarda CÓPIA** do modelo (`modeloId, modeloNome, modeloVersao, clausulas, camposAdicionaisDef`); aplicar modelo não sobrescreve o que já foi preenchido; vigência do modelo calcula o término a partir do início.
- Documento só é gerado completo (`D.faltasDoContrato`): "Tem contrato?" marcado, nome/razão e documento da outra parte, empresa contratante/contratada, ≥ 1 atividade incluída, início da vigência, campos adicionais obrigatórios. Título: "Contrato de prestação de serviços" (fornecedor Serviço) ou "Contrato de fornecimento".
- **Pastas de contratos** (só leitura, sem cópia): DES - Contratos Fornecedores (fornecedores com contrato de Serviço ou sem categoria), MER - Contratos Fornecedores (Produto ou sem categoria), VND - Contratos Clientes (`temDocumento`). Linha "Completo"/"Incompleto".

### 4.14 VND - Horário de Funcionamento — `horario-funcionamento.js`
- Chave `cicluz-horarios-funcionamento-v2` `{ version: 2, convertidoDaV1Em?, itens[] }`; v1 (um nome com dias e horas) convertida uma vez (cada horário vira uma faixa; sigla tirada do nome); v1 mantida. **Só neste aparelho** (não sincroniza). Horário **não é excluído**: só ativa/desativa.
- Item: `{ id 'hf-…', nome, identidade{ modo: sigla|icone, sigla (≤ 3 caracteres visíveis, maiúsculas), icone (id) }, faixas[{ id 'fx-…', dias[], abre 'HH:MM', fecha 'HH:MM' }], ativo, criadoEm }`.
- Campos: **Nome do horário \*** (≥ 2, ≤ 60, único sem acento/caixa), **Identificador** (painel "3 caracteres" — nasce do nome e acompanha até ser digitado — ou "Ícone": relógio, ícones da padaria, ícones importados; guarda só o id), Situação do horário; cada **Faixa N**: **Dias \*** (Seg, Ter, Qua, Qui, Sex, Sáb, Dom, Feriado; chave = dia JS `0`=domingo … `6`, ou `"feriado"`), **Abre às \***, **Fecha às \*** (HH:MM, diferentes; fechar antes de abrir = dia seguinte); "Adicionar faixa", "Remover faixa".
- Regra: duas faixas do mesmo horário **não podem se cruzar** no mesmo dia (domingo à noite entra na segunda; feriado é linha à parte). Mesmo dia em duas faixas é permitido (ex.: fechar no almoço).
- Exibição: dias seguidos (3+) viram "Seg a Sex"; feriado por último.
- **Pendente P-49**: qual horário vence quando dois horários ativos valem no mesmo dia. Nenhuma outra tela usa o horário hoje (busca: só `modulo.js` e o próprio arquivo).

### 4.15 Outros
- **Ficha do fornecedor** (impressão/envio): só o que está no cadastro; "não é contrato nem documento assinado".
- **Enviar link de cadastro** de Fornecedores: desligado (P-29). Prazo de resposta (1/3/5/7 dias úteis ou data e hora), Mensagem editável.
- **Consultas públicas de CEP/CNPJ** (`window.CicluzConsultas`, fora desta pasta): preenchem só campos livres; CEP/CNPJ novo substitui o que veio da consulta anterior.

---

## 5. LIGAÇÕES POR ID (mapa)

| De → Para | Campo | Por ID? | Observação |
|---|---|---|---|
| Produto → Grupo de mercadorias (MER) | `grupoId`, `subgrupoId` | **Sim** | ids de `cicluz-financial-hierarchy-v1.mercadorias[].id` e `.children[].id`. Sem grupo → alerta "Sem vínculo". |
| Produto → Local de estoque (árvore) | `localId` | **Sim** | id do nó de `cicluz-location-tree-v1`; `setorEstoque` guarda também o nome. |
| Produto → Área de estoque | `areaEstoque` | **Não (nome)** | gravado pelo nome do nó. |
| Produto → Local/Setor de venda | `localVenda1/2`, `setorVenda1/2` | **Não (texto livre)** | |
| Produto → Unidade | `embalagem`, `medidaCompra`, `unidadeIndividual`, `conversoes[].unidade` | **Não (sigla)** | sigla de `unidades[]`. |
| Produto → Fiscal | `fiscal` (objeto) | — | derivado do nome do grupo/subgrupo (tabela fictícia). |
| Produto ↔ Fornecedor | `catalogo[] { fornecedorId, produtoId, status }` | **Sim** | só `aprovado` vale para cotação. |
| Produto → Preço-base | `precosBase[].produtoId` | **Sim** | vigente = `ate` nulo. |
| Produto → Agenda (promoções) | `promocoes[].agendaItemIds` | **Sim** | compromissos da lista "Promoções" da Agenda. |
| Produto → Histórico de nomes | `historicoNomes[].produtoId` | **Sim** | |
| Fornecedor → Funções do prestador | `prestadores[].funcoes[]` | **Sim** | ids de `funcoesPrestador` (`fp-…`). |
| Fornecedor → Grupos de despesa (DES) | `gruposDespesaIds[]` | **Sim** | `"grupo"` ou `"grupo|subgrupo"` (lidos via `CicluzProducaoDados.gruposDespesa()`). |
| Fornecedor → Contrato | `contrato` (embutido no registro) | embutido | `contrato.contratanteEmpresaId` → `empresas[].id`; `modeloId` → `modelosContrato[].id` (+ cópia). |
| Contrato → Objeto | `objeto.produtoIds`, `produtoGrupoIds` (`g` ou `g|s`), `despesaIds`, `patrimonioIds`, `patrimonioGrupoIds` | **Sim** | patrimônio = bens de `cicluz-patrimonio-v1` via `CicluzProducaoDados`; grupo de patrimônio só `ret-g0` (Investimento, RET). |
| Cliente → Contrato | `contrato` embutido; `contratadaEmpresaId` → `empresas[].id` | Sim | |
| Cliente → grupo de venda (VND) | — | **Não existe** | nenhum campo de grupo VND, tipo de venda ou horário no cliente (busca no código: nada). |
| Agenda de pedidos → grupo / produtos / responsável | `grupoId`, `subgrupoId`, `produtoIds[]`, `responsavelId` | **Sim** | responsável = conta da empresa (Agenda). |
| Ocorrência → Agenda / Solicitação | `agendaId`, `solicitacaoId`, `previsto` | **Sim** | |
| Solicitação → Rodada | `rodadas[].solicitacaoId` | **Sim** | |
| Rodada → Convites | `convites[].rodadaId`, `fornecedorId`, `itens[produtoId]`, `token` | **Sim** | |
| Rodada → Pedidos | `pedidos[].rodadaId`, `fornecedorId`, `itens[].produtoId` | **Sim** | um pedido por fornecedor por rodada. |
| Pedido → Movimento | `movimentos[].pedidoId`, `produtoId` | **Sim** | |
| Conferência → Agenda de conferência / Movimento | `conferencias[].agendaId`, `movimentos[].conferenciaId`, `aprovadorId` | **Sim** | |
| Agenda de conferência → recorte | `filtro.grupoId/subgrupoId` (id), `area/setor/localVenda` (**nome**) | misto | comparação de nome sem acento/caixa (`SV.mesmoLocal`). |
| Produção → Estoque | `movimentos[] { tipo consumo_producao|entrada_producao|saida_abastecimento|sobra_retorno, produtoId, ordemProducaoId/ordemNumero, producaoPedidoId/producaoPedidoNumero }` e `produtos[].saldo` | **Sim** | `dist/producao/servico.js` grava no documento do Compras. Produção liga produto pelo `produtoId` do Compras (`cicluz-producao-v1`). |
| Fornecedor ← Patrimônio / Uniformes | `fornecedorId` (bens), `supplierId` (`cicluz-uniformes-v1`) | **Sim** | só usado para impedir exclusão. |
| Horário de funcionamento → ícone | `identidade.icone` | **Sim** | id do ícone (relógio / padaria / biblioteca). Horário não se liga a cliente, loja nem PDV (não confirmado nenhum consumidor). |

---

## 6. Dívidas, simulações e pontos de atenção (para o assistente lembrar)
1. WhatsApp para fornecedor, "pode entregar", convite de cotação, link de cadastro de cliente e assinatura digital são **simulados** (mesmo navegador). Link de cadastro de fornecedor está **desligado** (P-29); de cliente é teste (P-30).
2. Agendadores (pedidos, conferências, fechamento de cotação por prazo) só rodam **quando a tela abre** (no S1, a cada 60 s no servidor).
3. `teto` da rodada existe na regra mas é sempre `null` (inativo).
4. Nomes fixos de pessoas de teste gravados em eventos/movimentos (`'José · Compras'`, `'Ana · Estoque'`, `'u-jose'`) — não refletem o usuário logado.
5. Ligações por **nome/sigla** (área de estoque, local/setor de venda, unidades, filtros de conferência e da tela de estoque) contrariam a regra "vínculo por ID".
6. Tabelas fiscais e margem padrão por grupo são **fictícias** (`TABELAS_EXEMPLO`).
7. Horário de Funcionamento fica só no aparelho e a regra de precedência (P-49) está pendente.
8. Permissões `compras_*` só são aplicadas no servidor para produtos; nas outras telas do módulo não há checagem por ação no código.
9. Tela de estoque se chama "MER - Grupo Mercadorias" no menu, mas mostra saldo por produto (o cadastro de grupos é do financeiro).
10. Fornecedor e cliente: dados pessoais (CPF do PF, responsável legal completo) vão no documento sincronizado `cicluz-compras-v1` (exceção P-11a cobre fornecedor; para cliente PF/representante completo, cobertura pela mesma exceção: **não confirmado** no doc 11).


---

# E — Operação do dinheiro (raio-x do código, 27/11/2026)

> Fonte: o código em `C:\CICLUZ\Pralis-Sistema` (branch `feat/hierarquia-area-cargo-pessoa-20261124`). Onde a
> documentação antiga (PROJECT_BRAIN 13, 14, 16, 03) diverge do código, **vale o código** e a diferença está
> anotada. "Não confirmado" = não encontrei no código.
> Nenhum dado real de pessoa, conta ou valor foi copiado: os exemplos são genéricos.

---

## 0. Resumo em uma tela

| Tela (nome no menu) | Arquivo(s) | Grava de verdade? | Onde guarda |
|---|---|---|---|
| DES - Despesas / MER - Mercadorias / RET - Retiradas (Saídas › Lançamentos) | `dist/lancamentos/lancamentos.js`, `dist/lancamentos/regras.js` | **SIM** (exceto credor, fotos e IA) | **API do servidor** `/api/lancamentos/...` → Postgres (`lancamentos`, `lancamentos_itens`, `lancamentos_recorrencias`) |
| CNT - Transferências → "Nova Transferência" (Transferências › Lançamentos) | `dist/transferencias/transferencias.js` | **NÃO** — só confere e avisa "NÃO gravado" (P-48) | nada (lê só `/api/contas`) |
| VND - Vendas (Abertura · Turno · Fechamento) (Entradas › Lançamentos) | `dist/caixa/*.js` | **NÃO** — demonstração, dados fictícios em memória | `window.CicluzCaixa.estado` (some ao recarregar; nada em localStorage nem API) |
| VND - Fechamentos de Caixa (Entradas › Relatórios) | `dist/caixa/fechamentos*.js` | **NÃO** — demonstração | idem |
| VND - Gerência de Caixas | `dist/caixa/gerencia*.js` | **NÃO** — demonstração | idem; **sem cartão no menu hoje** (ver §3.9) |
| CNT - Tesouraria (Transferências, Nova transferência, Contas e saldos) | `dist/caixa/tesouraria*.js` | **NÃO** — demonstração | idem; **sem cartão no menu hoje** (ver §3.10) |
| VND - Vendas dos PDVs (Entradas › API) | `dist/vendas-pdv/*.js` | Só leitura ao vivo | API `/api/vendas-pdv*` → repassa ao Sistema Pralis (S1) `/api/s2/vendas*`; o S2 **não guarda venda** |
| VND - Vendas / Sistema comandas (Entradas › API) | `dist/comandas-creare/*.js` | Só leitura ao vivo | API `/api/comandas-creare*` → S1 `/api/s2/comandas*`; não guarda |
| Open Finance · Caixa TNP (Resultados › API) | `dist/extrato-tnp/*.js` | Só leitura (+ exportar CSV no aparelho) | API `/api/extrato-tnp*` → coletor Pluggy `/api/v1/extrato`; não guarda |
| Consulta CNPJ/CEP (apoio de cadastro) | `dist/consultas-publicas.js` | Só leitura | BrasilAPI direto do navegador (não passa pelo servidor do CICLUZ) |

**Conclusão honesta:** do fluxo do dinheiro físico (malote → caixa → sangria → fechamento → cofre →
Tesouraria → transferência), **nada é gravado hoje**. O único dinheiro que vira registro real são os
**Lançamentos de Saída (DES/MER/RET)** no servidor. Vendas, comandas e extrato são **espelhos de leitura** de
sistemas externos.

---

## 1. O FLUXO do dinheiro (como o código desenha)

```
[CNT - Tesouraria › Nova transferência]  Cofre → conta de posto (Caixa 1M…4T) = MALOTE
   cria: transferência tipo "malote" (pendente) + lacre de ABERTURA (disponível)
         + lacre de FECHAMENTO (reservado) + bolsas de SANGRIA (disponíveis, 0–50)
   o dinheiro SAI do Cofre na criação; só ENTRA na conta do posto na abertura
        │
        ▼
[VND - Vendas › 1 Abertura de Caixa]  operador digita o nº do lacre de abertura
   consulta: lacre existe? ainda disponível? é deste PDV+turno?
   "Sim, confere" → saldo inicial = declarado   |  "Não confere" → conta dinheiro+moedas, motivo se diferente
   escolhe Responsável, Supervisor, Maquininha → "Conferir e abrir caixa" → confirmação
   efeito: malote vira "recebida" pelo CONTADO; lacre de abertura vira "usado"; turno nasce;
           divergência → notificação "quebra_caixa" para a Tesouraria
        │
        ▼
[VND - Vendas › 2 Turno do Caixa]  (vendas do PDV são FICTÍCIAS, geradas de dados.js)
   • Recebimentos pendentes (dinheiro SEM lacre enviado pela Gerência): operador confirma ou "Não recebi"
   • Controle do PDV: registrar PDV desligado (motivos) / "Computador voltou"
   • Resumo: saldo LACRADO para o operador (contagem cega, R-232); Gerente vê o saldo
   • Nova sangria: valor = dinheiro físico + moedas, escolhe uma BOLSA (lacre de sangria) livre
       → transferência "sangria" pendente caixa → Cofre (sai do caixa na hora)
   • Fechar caixa → "Encerrar vendas e ir para conferência" (sem volta; trava se houver recebimento pendente)
        │
        ▼
[VND - Vendas › 3 Fechamento de Caixa]  Gerente responsável + 4 etapas
   Etapa 1 Vendas: CONTAGEM CEGA (cédulas + moedas) · folha do CREARE (leitura SIMULADA) ·
                   início das vendas (R-224) · "Gerar relatório de vendas" (congela o esperado)
   Etapa 2 Maquininha: comprovante (leitura SIMULADA) crédito/débito/Pix/voucher acumulados → salvar
   Etapa 3 Relatório final: Folha × PDV × Maquininha (SÓ INFORMA; não vira quebra)
   Etapa 4 Fechamento: esperado × contado × diferença · folha de fechamento do malote · lacre de fechamento
                   (só o reservado) · observação (obrigatória se falta OU sobra) → "Revisar" → "Confirmar fechamento"
   efeito: vendas em dinheiro + diferença viram lançamentos da conta do posto (conta zera);
           CONTADO sai como transferência "retorno_final" pendente posto → Cofre, com o lacre de fechamento;
           falta → notificação quebra_caixa; sobra → notificação transferencia_divergencia
        │
        ▼
[CNT - Tesouraria › Transferências › Conferir]  (contagem cega: o declarado não aparece)
   sangria / retorno_final: informa dinheiro, moedas e lacre; TUDO tem de bater com o declarado
     → bateu: "recebida", entra no Cofre, lacre "conferida"(sangria)/"usado"
     → não bateu: "Registrar recusa…" com motivo; sem "Encerrar" continua pendente;
        com "Encerrar" vira "divergente": o CONTADO entra no Cofre e a falta vira QUEBRA
   transferência comum: Tesouraria confirma direto (R-189)
        │
        ▼
[VND - Fechamentos de Caixa]  Tesoureiro decide: "Fechou certo" (exige o retorno já recebido)
                              ou "Teve quebra" (motivo); "Alterar status" depois (histórico imutável)
        │
        ▼
[CNT - Tesouraria › Contas e saldos]  saldo DERIVADO de cada conta; "Ajustar saldo" (só Tesoureiro)
[CNT - Tesouraria › Nova transferência] transferência COMUM entre contas (nunca sem fundo na origem)
[CNT - Transferências › Nova Transferência]  outra tela, real-ish, que NÃO grava (ver §3.2)
        │
        ▼
[Saídas › Lançamentos DES/MER/RET]  saída de dinheiro GRAVADA no servidor (conta pelo NOME)
        │
        ▼
[Open Finance · Caixa TNP]  extrato bancário real (só leitura) — NÃO há conciliação com nada do CICLUZ
```

**Fios soltos no fluxo (o código não liga):**
- O Caixa (casca) usa contas próprias fixas (`cofre`, `troco`, `cx-1m`…`cx-4t`) em `dist/caixa/dados.js`; **não**
  lê o cadastro real de contas (`/api/contas`). A CNT - Transferências lê o cadastro real, mas não grava.
- Saída de Lançamento (DES/MER/RET) **não** abate saldo de conta nenhuma (o CICLUZ não tem saldo de conta real).
  No Relatório final do fechamento, "Despesas / Mercadorias / Retiradas" aparece fixo em R$ 0,00
  (`fechamento-maquininha.js`, etapa 3).
- Vendas do Caixa são fictícias; as vendas reais (VND - Vendas dos PDVs) não alimentam o Caixa.
- Extrato bancário não concilia com transferências nem com lançamentos.

---

## 2. Perfis, permissões e regras gerais de dinheiro

### 2.1 Duas camadas de "quem pode"
1. **Permissões reais do servidor** (`servidor/shared/src/acessos.ts`), vindas dos **cargos de acesso** + exceções
   por pessoa (administrador tem tudo). Só algumas são "aplicadas" (a API recusa sem elas):
   - Lançamentos (aplicadas): `lancamentos_visualizar`, `_criar`, `_editar` (não pago), `_discriminar`, `_pagar`,
     `_editar_pago`, `_recorrencia`, `_cancelar_serie`, `_pagamento_retroativo`.
   - Relatórios (aplicadas): `vendas_pdv_visualizar`, `extrato_bancario_visualizar`.
   - Caixa (NÃO aplicadas — a casca não consulta): `caixa_operar`, `caixa_sangria`, `caixa_monitorar`,
     `caixa_conferir_fechamento`.
   - Transferências (NÃO aplicadas): `transferencias_visualizar`, `transferencias_lancar`,
     `transferencias_confirmar`, `lacres_gerenciar`.
   - Comandas: sem permissão própria; **só papel `administrador`** (`comandas-creare.service.ts`).
   - Conta antiga sem cargo configurado ("legado"): tudo menos `lancamentos_pagar/_editar_pago/_recorrencia/
     _cancelar_serie/_pagamento_retroativo`, `vendas_pdv_visualizar`, `extrato_bancario_visualizar` e gestão de usuários.
   - Cargos sugeridos (nascem só quando o administrador pede): **Caixa** (operar, sangria, ver/criar/editar
     lançamento); **Tesouraria** (todas de transferências, conferir fechamento, ver e discriminar lançamento,
     relatórios); **Gerência** (monitorar caixa, ver/lançar transferência, ver/criar/editar/discriminar/recorrência
     de lançamento, compras…); **Financeiro** (todas de lançamentos, ver transferências, conferir fechamento,
     relatórios); **Compras**, **DP** (ver/criar lançamento); **Diretor de Operações**; **Diretor Geral** (tudo menos
     usuários/permissões).
   - Posto de caixa: conta de login por **PDV 1–4 × Manhã/Tarde** (`postoSchema`, `rotuloPosto` → "PDV1 · Manhã").
2. **"Ver como" da casca do Caixa** (`dist/caixa/modulo.js`, `PERFIS`/`PODE`) — simulação, troca na própria tela:
   | Ação | Operador | Gerente | Tesoureiro | Financeiro |
   |---|---|---|---|---|
   | `operar` (abrir/turno/fechar, ajustar início) | sim | sim | — | — |
   | `verSaldo` | — | sim | — | — |
   | `historico` (entrar na Gerência de Caixas) | — | sim | — | — |
   | `conferir` (decidir fechamento) | — | — | sim | — |
   | `fechamentos` (ver a tela) | — | sim | sim | sim |
   | `tesouraria` (ver/criar/conferir transferências) | — | sim | sim | sim |
   | `ajustarSaldo` | — | — | sim | — |
   | `envioSemLacre` | — | sim | — | — |
   | `mensagens` | — | sim | — | — |
   Turno e Fechamento só oferecem "Ver como" Operador/Gerente. Gerência e Tesouraria/Fechamentos oferecem os quatro.

### 2.2 Centavos e formatos
- **Lançamentos:** digitado como texto pt-BR ("1.234,56"). `numeroParaApi(texto, casas)` (`dist/lancamentos/regras.js`,
  gerado de `servidor/shared/src/lancamentos/regras-site.ts`) aceita milhar com ponto, decimal com vírgula; recusa mais
  casas do que o permitido. Casas: **Valor 2**, **juros/desconto em R$ 2**, **juros/desconto em % 4**, **quantidade 3**,
  **valor unitário 4**. Conta feita em **centavos inteiros** (`paraCentavos`); banco `numeric(14,2)` (valores) e
  `numeric(14,4)` (informados). Teto 99.999.999.999. Juros %: `round(base × pontos/1e6)` (pontos = % × 10⁴).
  Desconto % de item: `round(base × %/100)`. Rateio do desconto geral: proporcional, **sobra no último item** (D4).
- **Caixa (casca):** `C.centavos("1.234,56")` → inteiro; aceita até 2 casas; vazio/inválido → `null`. Tudo em centavos.
- **CNT - Transferências:** calculadora em **centavos** (digitar 1,0,0,0,0 = R$ 100,00); teto 99.999.999.999 centavos;
  até 11 dígitos no valor, 6 no fator de × ou ÷; ÷ arredonda (`Math.round`); divisão por zero recusada.
- **Vendas dos PDVs:** valores vêm do S1 como texto/número em **reais**; formatação `Intl` BRL.
- **Comandas e Extrato:** valores em **centavos inteiros** vindos do S1/coletor.
- **Datas:** dia de negócio em `America/Sao_Paulo`. Lançamentos usam `U.campoData` (DD/MM/AA na tela, AAAA-MM-DD na API).

---

## 3. Tela por tela

### 3.1 Saídas › Lançamentos — DES - Despesas, MER - Mercadorias, RET - Retiradas
**Arquivos:** `dist/lancamentos/lancamentos.js`, `dist/lancamentos/regras.js` (GERADO — não editar; fonte
`servidor/shared/src/lancamentos/regras-site.ts`). Servidor: `servidor/api/src/lancamentos/{controller,service,regras,repository}.ts`,
contrato `servidor/shared/src/lancamentos/contrato.ts`, recorrência `.../recorrencia.ts`, banco `servidor/db/src/schema/lancamentos.ts`.

**Como abre:** cartões `vz-lan-des-despesas`, `vz-lan-mer-mercadorias`, `vz-lan-ret-retiradas` (mapa `appLancamentos`
em `dist/index.html`) → `CicluzLancamentos.abrir(cat)` → **abre direto o formulário "Nova X"** (não há lista no site).
`CicluzLancamentos.editar(cat, id)` existe mas **nenhuma tela chama** (não há lista de lançamentos no site; a API de
listagem `GET /api/lancamentos/:categoria` existe).

**Grava de verdade:** SIM, pela API (não usa localStorage). Antes de abrir, carrega `GET /api/financeiro/grupos?colecao=<cat>`
(só ativos; subgrupo aparece "Pai › Filho") e `GET /api/contas` (só `situacao === 'ATIVA'`).

**Cabeçalho:** "Nova Despesa/Mercadoria/Retirada" ou "Editar …"; subtítulo = caminho (+ "· ocorrência N da série").
Cor da origem: DES vermelho, MER verde, RET azul (`menuColor` índices 2, 3, 4).

**Aviso fixo no topo:** "Credor, fotos e leitura por IA ainda não são gravados (em construção)…" (Retirada: só credor).

**Campos (na ordem da tela):**

| Quadro | Campo (rótulo exato) | Tipo | Obrig. | Categorias | Validação / regra | Vai para a API como |
|---|---|---|---|---|---|---|
| Valor | **Valor (R$) \*** | texto decimal | sim | todas | ≤ 2 casas; "Informe o valor." / "Valor em formato inválido. Use 1.234,56 (no máximo 2 casas)." | `valorOriginal` |
| Valor | **Tipo do juros** | seleção: Sem juros / R$ / % | não | todas | troca o rótulo do campo seguinte | `jurosTipo` (`valor`/`percentual`/null) |
| Valor | **Juros (R$)** ou **Juros (%)** | texto decimal | não | todas | desligado sem tipo; R$ ≤ 2 casas, % ≤ 4 casas | `jurosValorInformado` |
| Valor | **Valor Total** | só leitura | — | todas | prévia = Valor + juros − desconto geral (mesma conta do servidor); dica "Valor + juros" | não vai (o servidor recalcula `valorAcrescimo`, `valorDesconto`) |
| Datas | **Data do lançamento \*** | data | sim | todas | padrão = hoje (SP); "Data do lançamento inválida. Use DD/MM/AA." | `dataReferencia` |
| Datas | **Data do documento fiscal** | data | não | DES, MER | se digitada, tem de ser válida | `dataDocumentoFiscal` |
| Datas | **Nº do documento fiscal** | texto (máx. 60) | não | DES, MER | — | `numeroDocumentoFiscal` |
| Credor | **Tipo de credor** | chips | — | todas | DES: Fornecedor / Colaborador; MER: Fornecedor; RET: Fornecedor / Sócio ou Gestor | **NÃO GRAVA** (P-47) |
| Credor | **Credor** | seleção | — | todas | Fornecedor = cadastro de Compras ativo (`CicluzComprasDados.dados.fornecedores`, por id); Colaborador = `CicluzPeople.selectable()` ativos (por id); Sócio ou Gestor = "cadastro ainda não existe" | **NÃO GRAVA**; o Salvar avisa "Credor e fotos ainda não são gravados" |
| Classificação | **Grupo** | seleção ("Sem grupo") | não | **só RET** | grupo/subgrupo de RET; registro antigo com grupo inativo continua aparecendo | `grupoId` (o servidor confere que existe e guarda `grupoNome`) |
| Classificação | **Conta** | seleção ("Sem conta") | não | todas | contas ATIVAS; antiga fora da lista continua aparecendo | `contaNome` (**pelo NOME**; servidor recusa "Conta X não existe no cadastro de contas") |
| Classificação | **Observação \*** | texto longo (máx. 500) | sim | todas | "Informe a observação." | `observacao` |
| Pagamento | **Pagamento realizado** | chave Sim/Não | — | DES, MER | Sim preenche Data do pagamento com hoje; **desligada sem `lancamentos_pagar`** ("Você não tem permissão para registrar pagamento.") | — |
| Pagamento | **Data do pagamento** | data | não | DES, MER | só aparece com Sim; se digitada, válida | `dataPagamento` (vazio = não pago) |
| Pagamento | **Vencimento \*** | data | sim (DES/MER) | DES, MER | padrão hoje; "Informe o vencimento." | `dataVencimento` (na RET = data do lançamento) |
| Fotos | **Foto (Recibo / Boleto / Nota)**, **Foto (Nota / interno)** | arquivo (imagem/PDF/XML) | não | DES, MER | — | **NÃO GRAVA** nem envia |
| Discriminação | **Discriminar com a Octad Lumi (IA)**: botões "Tirar foto" e "Escolher arquivo" | — | — | DES, MER | **desligados** ("em construção") | — |
| Discriminação | **Discriminar itens** | chave Sim/Não | — | DES, MER | Sim cria a 1ª linha | — |
| Discriminação › Linha N | **Descrição \*** (máx. 200), **Quantidade** (≤3 casas; vazio = 1), **Valor unitário (R$)** (obrig., ≤4 casas), **Tipo do desconto unitário** (Sem/R$/%), **Valor do desconto unitário**, **Tipo do desconto no total**, **Valor do desconto no total**, **Grupo** (grupo da categoria), **Total da linha** (só leitura), botão remover | — | — | DES, MER | máx. 300 itens (API) | `itens[]` |
| Discriminação | **Vale presente / desconto no total**: **Tipo do desconto**, **Valor do desconto** | — | não | DES, MER | só existe com itens | `descontoGeralTipo`, `descontoGeralValor` |
| Recorrência | **Repetir este lançamento** (Sim/Não), **Repetir** (Todo dia / Toda semana / A cada 15 dias / Todo mês / A cada 3 meses / Todo ano), **Quantas vezes (com esta)** (1–366), dias **Sg Te Qa Qi Sx Sa** (só em semana) | — | não | todas | **só ao criar e com `lancamentos_recorrencia`**; nota "Dia, semana, quinzena e mês param em 12 meses…" | `recorrencia {frequencia, repeticoes, diasSemana}` |
| Recorrência (edição) | texto "ocorrência N de uma série" + **Cancelar a série** | botão | — | todas | só com `lancamentos_cancelar_serie` e se ESTA ocorrência não está paga; confirma "Apaga as ocorrências futuras ainda não pagas" | `PATCH /api/lancamentos/series/:id/cancelar` |

**Botões:** "Salvar" e (só ao criar) "Salvar e criar nova" (salva e reabre em branco).

**Regras de dinheiro (tela + servidor):**
- **D5 — soma dos itens = Valor, tolerância zero.** Aviso ao vivo "A soma dos itens excede/não alcança o valor em R$ X. Só dá
  para salvar quando bater." Servidor devolve 422 `DISCRIMINACAO_DIVERGENTE` com `linhaProvavel` → a linha fica marcada
  "Linha N · provável erro". A soma comparada é a dos níveis 1 e 2 (sem o desconto geral).
- **Total do item:** bruto = qtd × unitário; − desconto unitário × qtd (nível 1); − desconto no total do item (nível 2); nunca negativo.
- **Desconto geral (D4):** limitado ao total dos itens; rateado proporcional, sobra no último; só existe com discriminação.
- **Juros (D10):** incide só sobre o Valor; o **servidor** converte em R$ (`valorAcrescimo`) e ignora o que o cliente calcula.
- **Total do lançamento** (servidor) = valorOriginal − valorDesconto + valorAcrescimo.
- **Retirada (D12):** sem discriminação e sem desconto (CHECK no banco `lancamentos_retirada_sem_desconto_check`).
- **Data de pagamento:** registrar/alterar exige `lancamentos_pagar`. DES/MER: não pode ser anterior a hoje, salvo
  `lancamentos_pagamento_retroativo` (R-203). RET: **nunca** anterior a hoje (R-129). Edição que não muda a data passa.
- **Pago = `dataPagamento` preenchida** (não há coluna de status). Lançamento pago: só edita quem tem
  `lancamentos_editar_pago`; sem ela a tela abre **somente leitura** ("Lançamento pago: você não tem permissão para alterar.").
- **Edição concorrente:** a tela manda `atualizadoEmBase`; se outro salvou antes → 409 `LANCAMENTO_ALTERADO`.
- **Recorrência (D3):** a série inteira nasce na mesma transação; as datas repetem o **vencimento** e cada ocorrência
  mantém o intervalo lançamento→vencimento; a 1ª mantém o pagamento, as outras nascem **não pagas**; dia/semana/
  quinzena/mês param em 12 meses; trimestre/ano obedecem às repetições; resposta diz `serie` e `serieLimitada`
  ("Série criada com N lançamentos (limitada a 12 meses).").
- **Cancelar série:** apaga só ocorrências **futuras e não pagas** (a partir de hoje). Lançamento avulso não se apaga
  (não há DELETE).

**Peculiaridades do código (atenção):**
- Em **DES e MER não há campo Grupo no cabeçalho**: um lançamento novo sem discriminação sai **sem grupo**; o grupo só
  entra pelos itens. Na edição, o `grupoId` antigo é preservado.
- Em **RET não há campo de pagamento**: a tela nunca registra pagamento de Retirada (preserva o que já havia).
- O endpoint `PATCH /api/lancamentos/item/:id/discriminar` existe mas a tela não usa (discrimina no próprio PUT).

**API:** `GET/POST /api/lancamentos/:categoria` (`despesas|mercadorias|retiradas`; lista com `dataInicio`, `dataFim`,
`situacao` todos/pendentes/pagos, `page`, `pageSize` ≤100, devolve `valorTotal`), `GET/PUT /api/lancamentos/item/:id`,
`PATCH …/discriminar`, `PATCH /api/lancamentos/series/:id/cancelar`.
**Banco:** `lancamentos` (empresa, categoria, datas, observacao, valor_original, juros_tipo, juros_valor_informado,
valor_acrescimo, desconto_geral_tipo/valor, valor_desconto, conta_nome, grupo_id, grupo_nome, documento fiscal,
recorrencia_id/ordem, criado_por, atualizado_por, carimbos), `lancamentos_itens` (posição, descrição, quantidade,
valor_unitario, descontos, valor_total, valor_total_com_desconto **autoritativo**, valor_unitario_com_desconto derivado,
grupo_id/nome), `lancamentos_recorrencias` (frequência, repetições 1–366, dias_semana).

---

### 3.2 Transferências › Lançamentos — CNT - Transferências ("Nova Transferência")
**Arquivo:** `dist/transferencias/transferencias.js`. Cartão `vz-lan-cnt-transfere-ncias` → `CicluzTransferencias.abrir()`.

**Grava de verdade:** **NÃO.** Carrega `GET /api/contas` (só ATIVAS, **pelo nome**). O Salvar só confere e responde
"Conferido, mas NÃO gravado: a gravação das transferências ainda está em construção." Nota fixa: "Tela em construção…".
Nada vai para localStorage nem API. (P-48 aberto: onde guardar, quem pode, saldo, confirmação.)

> O comentário do topo do arquivo ainda fala em "Transferência com lacre (+)… 2ª, 3ª, final" — **desatualizado**: o código
> atual tem Lacre da transferência + bloco "Transferência de retorno" (Retorno 1–4) + Tempo de aceite + Anexos.

**Campos (ordem da tela):**

| Seção | Campo (rótulo exato) | Tipo | Obrig. | Regra |
|---|---|---|---|---|
| Cabeçalho laranja | **Valor da transferência \*** | calculadora (teclas 0–9, ÷ × − +, ⌫, =) + chips **Notas / Moedas** | sim | centavos; cada termo pode ter × ou ÷ por inteiro; tocar Notas/Moedas fecha o termo com esse tipo; + − = fecham como Notas; **só vale fechado com "="** ("Clique em = para fechar o valor."); total > 0; resumo "R$ x notas R$ y moedas = R$ z"; teclado: N/M, x, Enter = "=", Esc fecha |
| Transferência | **Data da transferência \*** | data | sim | padrão hoje; "Data da transferência inválida. Use DD/MM/AA." |
| Transferência | **Origem (−) / CNT \*** | lista de contas (rádio) | sim | contas ativas |
| Transferência | **Destino (+) / CNT \*** | lista de contas (rádio) | sim | contas ativas menos a origem |
| Transferência | **Destino (+) / CNT \*** (múltiplo) | lista com marcar vários | sim se Múltiplo | aparece com Múltiplo destino = Sim; "Marcadas: n de N." |
| Transferência | **Lacre** | chave C/lacre / S/lacre | — | C/lacre pede **Nº do lacre \*** (texto, máx. 100) |
| Transferência de retorno | **Retorno 1…4** | cada um C/lacre ou S/lacre + remover | — | "+" acrescenta (máx. 4); a chave "Retornos novos" define o padrão; C/lacre pede **Nº do lacre \*** |
| Opções | **Múltiplo destino (+) / CNT** | Sim/Não | — | troca o Destino único pela lista múltipla |
| Opções | **Tempo de aceite** | Sim/Não → **Contar em** Dias / Horas / Dias e horas; **Dias** (1–365, − +, roleta); **Horas (hh:mm)** | — | resumo "Aceite em …"; validação de faixa e hh:mm (P-51 aberto: só coleta) |
| Observação | **Observação** | texto (máx. 500) | não | — |
| Observação | **Anexos** | painel: Gravar áudio, Gravar vídeo, Anexar áudio/vídeo/imagem/documento | não | só na tela (object URL); "Pare a gravação do áudio antes de salvar." |

**Validações no Salvar:** data; origem e destino ("Escolha a origem e o destino."); valor fechado e > 0; tempo de aceite;
gravação parada; nº de lacre preenchido (transferência e cada retorno com lacre); **lacres diferentes entre si**
(comparação sem maiúsculas). Botões: "Salvar" e "Salvar e criar nova" (ambos só conferem).
**Não confere saldo** da origem (não existe saldo real). **Sem permissão** checada na tela.

---

### 3.3 Entradas › Lançamentos — VND - Vendas (porta das 3 etapas do caixa)
**Arquivo:** `dist/caixa/vendas.js`; cartão `vz-lan-vnd-vendas` → `CicluzCaixa.abrir('vendas')`.
Mostra 1 Abertura de caixa · 2 Turno do caixa · 3 Fechamento de caixa, marcando a etapa atual por `C.estado.status`
(`fechado`→1, `aberto`→2, `em_fechamento`→3). **Demonstração** ("dados fictícios, nada é gravado").
O cartão "VND - Vendas" em **Entradas › Relatórios** (`vz-rel-vnd-vendas`) abre só uma tela vazia ("Área prevista…").

**Estado único da casca** (`dist/caixa/modulo.js`, `window.CicluzCaixa.estado`, só memória, zera ao recarregar ou em
"Recomeçar a demonstração"): `perfil, status, abertura, turno, fechamento, contas, transferencias, lacres, lancamentos,
fechamentos, caixasFicticios, mensagens, notificacoes, quebras`. Sementes em `dist/caixa/dados.js` (contas Cofre Principal,
Cofre Troco, Caixa 1M…4T; malote de abertura de exemplo já pronto para o PDV 1 · Manhã; três retornos finais de "ontem";
vendas/canceladas/vendas-sem-caixa fictícias; caixas abertos fictícios de outros PDVs). **Saldo nunca é gravado**:

> `saldoConta(id) = inicial + Σ transferências recebidas/divergentes que ENTRAM (pelo valorRecebido) − Σ transferências
> pendentes/recebidas/divergentes que SAEM (pelo valor declarado) + Σ lançamentos da conta + (vendas em DINHEIRO do turno
> vivo, se a conta é a do caixa aberto)`.

Tipos de transferência: `malote`, `sem_lacre`, `sangria`, `retorno_final`, `comum`. Situações: `pendente`, `recebida`,
`cancelada`, `divergente`. Lacres: tipo `abertura|fechamento|sangria`, situação `disponivel|reservado|usado|
usada_aguardando_conferencia|conferida`, sempre com `transferenciaId`.

---

### 3.4 VND - Abertura de Caixa
**Arquivo:** `dist/caixa/abertura.js`. **Demonstração** (posto fixo no código: PDV 1 · Manhã, usuário de posto fictício).

| Bloco | Campo | Tipo | Obrig. | Regra |
|---|---|---|---|---|
| 1 Onde você vai operar | **Ponto de venda**, **Turno do caixa** | só leitura | — | "Travado pelo login do posto." |
| 2 Conferir malote de abertura | **Lacre do malote de abertura** | texto | sim | consulta após 0,5 s: "Lacre inexistente. Confira o número no malote." / "Lacre já rompido - não pode ser reutilizado." / "A conta deste caixa não é destino desta transferência." |
| 2 (lacre achado) | mostra **Malote declarado, Dinheiro, Moedas, Lacres para sangria, Lacre reservado para fechar este caixa** | só leitura | — | — |
| 2 | **O valor e a composição conferem com o que foi recebido?** "Sim, confere" / "Não confere" | chips | sim | — |
| 2 (Não confere) | **Dinheiro físico contado (R$)**, **Moedas contadas (R$)** | dinheiro | sim | mostra "▼ Falta de"/"▲ Sobra de" R$ x |
| 2 (diferença) | **Motivo da divergência** | texto | sim se diferente | — |
| 3 Responsáveis e terminal | **Responsável pelo caixa** | seleção (lista fixa fictícia) | sim | — |
| 3 | **Supervisor responsável** | seleção (lista fixa fictícia) | sim | — |
| 3 | **Maquininha de cartão** | seleção (2 maquininhas fictícias fixas no código) | sim | "Obrigatória para o relatório final deste turno." — **não** vem do cadastro de Operadoras |
| 3 | **Usuário logado** | só leitura | — | — |

Botão **"Conferir e abrir caixa"** → lista "Antes de abrir:" → diálogo **"Confirmar abertura do caixa"** ("Confirmar e
abrir"). Efeito (`C.abrirCaixa`): saldo inicial = declarado (confere) ou **contado** (divergência); malote → `recebida`
com `valorRecebido` = contado; lacre de abertura → `usado`; divergência ≠ 0 → notificação `quebra_caixa` para Tesouraria;
nasce o turno; a casca injeta um envio sem lacre fictício da Gerência para o operador confirmar; mensagens vigentes da
Gerência para a empresa/PDV são entregues.

---

### 3.5 VND - Turno do Caixa
**Arquivos:** `dist/caixa/turno.js`, `dist/caixa/turno-dialogos.js`. **Demonstração.** "Ver como": Operador / Gerente.

Blocos (na ordem): **Mensagem da Gerência** (Fechar / Entendi; aparecer já marca "visualizada") · **Recebimentos
pendentes** (valor, origem, quem enviou, Físico/Moedas, obs; "Confirmar recebimento" / "Não recebi"; **quem enviou não
confirma** — R-028, no "Ver como" Gerente aparece "Quem enviou não confirma") · **Controle do PDV** ("Registrar PDV
desligado" / "Computador voltou") · **Caixa aberto** (PDV, Turno, Aberto em, Responsável, Supervisor, Maquininha, Lacre do
malote de abertura, Lacres para sangria livres, Lacre reservado para fechar) · **Resumo da operação** (Saldo do caixa
**lacrado** para Operador / valor para Gerente; Entradas = vendas do turno, abre "Vendas do caixa"; Movimentações:
Transferências recebidas, Sangrias, Vendas canceladas; Vendas por forma de pagamento) · **Encerrar turno**.

**Diálogos:**
- **PDV desligado:** motivos (marcar ≥1): Falta de energia na loja; Oscilação ou pane elétrica; Internet caiu; Esbarrão
  em fio / cabo desconectado; Computador travou, tive que reiniciar; Limpeza ou manutenção na loja; Atualização do sistema
  (Windows); Outro (+ **Descreva o outro motivo**, obrigatório). Grava `parada {desde, motivos, outro}`; retorno grava `ate`.
  Com PDV desligado, o fechamento recusa ("Registre o retorno do computador do PDV antes de fechar o caixa.").
- **Nova sangria:** **Valor total (R$)**, **Dinheiro físico (R$)**, **Moedas (R$)** (aviso ao vivo bateu/falta/passa),
  **Lacre disponível (obrigatório)** (só bolsas livres do malote desta abertura; sem nenhuma: "Nenhum lacre disponível.
  Solicite à Tesouraria."), **Responsável pela sangria** (só leitura = quem abriu), **Observação (opcional)**.
  Regras: valor > 0; físico + moedas = total; lacre escolhido; **valor ≤ saldo livre** — para o Operador só "Valor acima
  do disponível no caixa." (contagem cega R-232); Gerente vê "Disponível para retorno: R$ x". Efeito: transferência
  `sangria` pendente posto → Cofre (sai do caixa na hora) e bolsa → `usada_aguardando_conferencia`.
- **Sangrias deste caixa:** lista com valor, lacre, dinheiro/moedas, hora, situação; "Lacres disponíveis".
- **Vendas do caixa:** filtros **Produto** e **Forma de pagamento**, "Limpar filtros"; mostra encontradas, total, formas;
  cada venda com itens (Produto, Qtd., Unitário, Total).
- **Vendas canceladas:** auditoria (não entram em totais): id da venda, Autorizado por, Motivo, Justificativa, Forma, Produtos.
- **Não recebi:** cancela a transferência sem lacre (volta à origem; "a Tesouraria é avisada" — texto; não há
  notificação gravada no estado para isso).
- **Confirmar encerramento das vendas** ("Encerrar vendas e ir para conferência"): recusa se há recebimento pendente; vira
  `em_fechamento` e cria o fechamento com **corte** = hora atual. Sem volta.

---

### 3.6 VND - Fechamento de Caixa (4 etapas)
**Arquivos:** `dist/caixa/fechamento.js` (tela, gerente, trilha), `fechamento-comum.js`, `fechamento-vendas.js` (etapa 1),
`fechamento-inicio.js` + `inicio-vendas.js` (R-224), `fechamento-maquininha.js` (etapas 2 e 3), `fechamento-revisao.js`
(etapa 4). **Demonstração** — leituras de folha e comprovante (IA no principal) **simuladas por botão**; anexos são só nome.

**Gerente responsável** (diálogo ao entrar): "Gerente que abriu o caixa: X. É o mesmo no fechamento?" — **Sim, confirmar** /
**Não, é outro** → **Nome do gerente responsável** (texto livre, ≥ 2 letras; "o principal não valida se o gerente existe").
Responsável pelo caixa = quem abriu (R-226).

**Etapa 1 — Vendas**
- **1 · Contagem do dinheiro (cega):** **Cédulas (R$)**, **Moedas (R$)**, "Total contado". Nada vem do sistema; esperado
  só na etapa 4. Depois de registrada: cadeado "Contagem registrada às hh:mm" (Gerente vê também o esperado) e
  **Corrigir contagem** → **Por que a contagem mudou? (obrigatório)** (≥ 5 letras); correções guardadas `{de, para, justificativa}`.
- **2 · Folha do CREARE:** "Anexar folha (simulado)" / "Trocar folha"; "Ler folha (simulado)". Campos da folha (travados
  até **Corrigir manualmente**, que exige **Explique por que o valor mudou (mínimo 5 letras)**): Troco Inicial*,
  Saldo Inicial, CLIENTES (VND/TRANS), Crédito*, Débito*, Dinheiro*, Pix*, Voucher*, Total*, Despesas*, Sangria*,
  Saldo Final Dinheiro (* = comparados no relatório; os outros "só exibido"). Trocar a folha invalida o relatório.
  **Início das vendas** (R-224): Abertura oficial, Início das vendas, Vendas deste caixa, Vendas do PDV sem caixa;
  botão **Ajustar início** → **Novo início das vendas** (hora) + **Motivo do ajuste** (3–500 letras). Regras: não depois da
  abertura; recuo máx. **60 min**; mesmo dia; nunca no mesmo minuto nem antes do fechamento do caixa anterior do mesmo PDV;
  só com caixa aberto/em fechamento; vendas sem caixa do novo período passam ao caixa (e voltam se recuar menos); cada
  ajuste registrado (quem, quando, motivo, de→para, trazidas, devolvidas); em fechamento **descarta o relatório e a
  contagem registrada**. Aviso da folha: tolerância **2 min** entre "Período de" da folha e o início; botão "Ajustar início
  para hh:mm" quando cabe na janela.
- **3 · Gerar relatório de vendas:** pendências (folha anexada e lida; cédulas e moedas; justificativas). Gera:
  `contagem.registrada = {total, especie, moedas, esperado, diferenca, correcoes, em}` — **esperado congelado** = saldo do
  caixa nesse instante. "Conferir maquininha" só libera com contagem registrada.

**Etapa 2 — Maquininha:** maquininha = a escolhida na abertura (não troca). "Anexar comprovante (simulado)", "Ler
comprovante (simulado)". Campos **Crédito / Débito / Pix / Voucher (acumulado, R$)**; lidos ficam **travados — sem correção
manual na maquininha** (decisão do Marco, 29/10). "Salvar conferência da maquininha": exige comprovante e os 4 valores.
Nota: "A leitura é o acumulado do dia (na tarde, desconta a manhã; não simulado na casca)."

**Etapa 3 — Relatório final (Folha × PDV × Maquininha):** por campo comparado: Folha, PDV (calculado das vendas), Maquininha
(só formas de cartão), Situação ("✓ Confere" ou "▲▼ Diferença R$ x" / "Sem valor na folha" / "Maquininha sem leitura").
**Só informa**: "divergência de folha ou de maquininha não bloqueia o fechamento nem vira quebra. Só a diferença da
contagem física gera quebra." Outros dados: Saldo Inicial, CLIENTES, Saldo Final Dinheiro; alerta se a soma das formas da
folha ≠ Total impresso; Movimentações do turno (Entradas no PDV, Transferências recebidas, Sangrias, "Despesas / Mercadorias /
Retiradas" = R$ 0,00 fixo, Vendas canceladas, Sangrias com lacre). A folha e a maquininha comparam com o que o PDV
**imprimiria** (inclui vendas sem caixa — `lidoNoPdv`).

**Etapa 4 — Fechamento:** Esperado (sistema) × Contado × Diferença (diferença = contado − esperado, **sem tolerância**);
"Anexar folha de fechamento do malote (simulado)" (obrigatória); **Lacre de fechamento** (seleção com **só o lacre reservado**
pela Tesouraria; "o servidor recusa qualquer outro"); **Observação da divergência (obrigatória)** ou **Observação do
fechamento** (máx. 500 no texto da dica); Caixa responsável; Gerente responsável. Botão "Encerrar e enviar à Tesouraria"
(ou "Encerrar com divergência" se falta) → diálogo **"Revisar fechamento do caixa"** ("Depois de confirmado não dá para
editar") → **Confirmar fechamento**.

**`C.fecharCaixa` — recusas na ordem:** não está em fechamento; PDV desligado; lacre ≠ reservado; sem folha de fechamento;
relatório não gerado; contagem não registrada; maquininha não salva; recebimento sem lacre pendente; **esperado
recalculado** < 0 ("O saldo físico calculado está negativo…"); diferença ≠ 0 sem observação.
**Atenção:** o fechamento usa o esperado **recalculado na hora** (`r.saldo`), não o congelado na etapa 1 (a tela da etapa 4
mostra o congelado). Em regra coincidem, salvo mudança entre gerar o relatório e fechar.
**Efeitos:** lançamentos na conta do posto: `vendas` (vendas em dinheiro) e `fechamento` (= diferença) → a conta zera;
se contado > 0, transferência `retorno_final` pendente posto → Cofre pelo **contado** (dinheiro/moedas), com o lacre de
fechamento (lacre → `usado`); grava o **retrato** em `estado.fechamentos` (quem, horários, entradas, transf. entrada/saída,
esperado, contado, diferença, lacres usado e reservado, observação, contagem e correções, folha e correção, maquininha,
vendas por forma, paradas, canceladas, início das vendas e ajustes); notificações: falta → `quebra_caixa`; sobra →
`transferencia_divergencia` (sem quebra).

---

### 3.7 VND - Fechamentos de Caixa (Entradas › Relatórios)
**Arquivos:** `dist/caixa/fechamentos.js`, `fechamentos-lista.js`, `fechamentos-dossie.js`, `fechamentos-decisao.js`.
Cartão de `CicluzCaixa.cards('relatorios')`. **Demonstração.** Operador: sem acesso.

- **Tesoureiro/Financeiro:** abas **Para conferir (n)** (situações aguardando_tesouraria, fechado_sem_pendencias, com_quebra)
  e **Já conferidos (n)**; filtros **Data inicial, Data final, PDV, Operador, Turno, Situação**, "Limpar filtros"; colunas
  Data, PDV · turno, Operador, Esperado, Contado, Diferença (▼ Falta / ▲ Sobra / ✓ Bateu), Situação. Caixa ainda vivo não
  entra na fila.
- **Gerente:** "Histórico de caixas" de todos (abertos, em fechamento, fechados), **sem esperado/contado/diferença** (contagem
  cega para a Gerência); colunas Data, PDV, Operador, Turno, Abertura → Fechamento, Entradas, Transf. entrada, Transf. saída,
  Saldo, Status; totais do filtro.
- **Situação derivada** (`C.situacaoDe`): última conferência decide (Conferido pela Tesouraria / Divergência confirmada pela
  Tesouraria); sem conferência: diferença < 0 → Com quebra; = 0 → Fechado sem pendências; > 0 → Aguardando Tesouraria.
- **Dossiê** (Tesoureiro e Financeiro): Quem (executado por, gerente, horários, lacre usado × reservado — alerta se diferente,
  observação); Contagem e diferença (cédulas, moedas, contado, esperado, correções); Folha digital × PDV × Maquininha
  (Crédito, Débito, Dinheiro, Pix, Voucher); Início das vendas e ajustes; Paradas do computador; Transferências do
  fechamento (por `caixaId`); Provas e avisos; Histórico da conferência.
- **Decisão (só Tesoureiro):** **Fechou certo** — só se lacre bate, situação aguardando/sem pendências (com falta só cabe
  "Teve quebra") **e o retorno final já recebido** na Tesouraria; **Teve quebra** — **Motivo da quebra** (obrig., até 1000;
  "não altera os valores financeiros"); depois **Alterar status da conferência** (Conferido/Divergência + **Motivo da
  alteração** obrig.; para "Conferido" exige retorno recebido; mesma decisão repetida não grava). Nada é apagado.
- Detalhe da Gerência: responsável, lacres, conferência de abertura do malote (convergente/divergente + motivo), provas,
  ajustes de início, paradas.

---

### 3.8 (atalho) Pré-visualização "FCH"
`dist/people-header-pilot.js`: o atalho rápido de chave `fch` abre `CicluzCaixa.abrir('fechamento')`.

---

### 3.9 VND - Gerência de Caixas
**Arquivos:** `dist/caixa/gerencia.js`, `gerencia-recebimento.js`, `gerencia-mensagens.js`. **Demonstração.**
**Sem entrada no menu hoje:** o commit `cb11dcb` ("Entradas > Lançamentos fica só com VND - Vendas, Tesouraria sai…")
tirou `cards('caixa')` do `menuCardsOf` em `dist/index.html`; a tela só abre por `CicluzCaixa.abrir('gerencia')` (nenhum
botão do site chama). PROJECT_BRAIN/14 ainda diz que está em Entradas › Lançamentos — desatualizado.
Acesso: só "Ver como" Gerente (`pode('historico')`).
- **Caixas abertos agora** (chips "PDV - operador (desde hh:mm)", Atualizar; em fechamento não aparecem) → painel do caixa
  (saldo, entradas, recebimentos pendentes, sangrias, canceladas, PDV ligado/desligado). Outros PDVs são fictícios.
- **Enviar recebimento ao caixa** (transferência SEM lacre, R-231; só Gerente): **Origem** (só cofres), **Destino (caixa
  aberto)** (contas de posto), **Dinheiro físico (R$)**, **Moedas (R$)**, **Observação (opcional)**. Regras: ambos válidos
  (use 0,00); total > 0; **teto R$ 1.000.000,00**; sem fundo na origem recusa; **só com caixa aberto na conta de destino**
  ("Sem caixa aberto o dinheiro vai pelo malote com lacre."). Nasce `pendente`; o operador confirma no Turno. Tabela dos
  enviados (Destino, Origem, Valor, Enviado por, Situação).
- **Mensagens para os caixas** ("Nova mensagem"): **Título** (1–120), **Mensagem** (1–2000), **Validade (opcional)**
  (data-hora, **nunca no passado**), **Quem recebe**: Todos os caixas abertos agora / Toda a empresa / PDVs específicos /
  Operadores específicos. Sem edição nem exclusão, só **Encerrar**. Entregas: entregue → visualizada → fechada sem
  confirmar | confirmada. Quem abrir caixa dentro da validade (empresa ou PDV alvo) também recebe.

### 3.10 CNT - Tesouraria
**Arquivos:** `dist/caixa/tesouraria.js` (tela e abas), `tesouraria-lista.js`, `tesouraria-conferir.js`,
`tesouraria-transferencia.js`, `tesouraria-contas.js`. **Demonstração.** **Sem entrada no menu hoje** (mesmo commit
`cb11dcb` tirou `cards('tesouraria')` de Transferências › Lançamentos). **Consequência:** pela navegação normal ninguém
confere o retorno final, e então **"Fechou certo" nunca libera** para caixa com retorno (só "Teve quebra").
Acesso: "Ver como" Tesoureiro, Financeiro ou Gerente; Operador vê "Sem permissão". Abas:

**a) Transferências** — "Acompanhe o dinheiro em trânsito entre cofre, caixas e banco." Filtros **Status** (Pendente,
Recebido, Cancelada, Divergente), **Data inicial**, **Data final**, **PDV**; "Mais filtros": **Lançado por**, **Conta de
origem**, **Conta de destino**, **Lacre** (procura abertura, fechamento e bolsas); chips removíveis + "Limpar tudo"; 10 por
página, mais recente primeiro. Colunas: Lançamento (data hora, por quem), Movimento / rota (tipo, origem → destino), Valor
total (malote: dinheiro/moedas; "Contado"), Lacres (botão "Lacres (n)" → popup por tipo e situação), Situação (malote:
Disponível/Usado/Cancelado/Divergente; demais: Pendente/Recebido/Cancelada/Divergente — sempre ícone + palavra), Ações
("Conferir" só em pendente de sangria, retorno_final, comum). Clique na linha → Detalhe (caixa de origem/quem usou o malote,
lacres, contado × declarado, recusas, observação).
- **Conferir recebimento** (sangria/retorno final; contagem cega): **Dinheiro físico contado (R$)**, **Moedas contadas
  (R$)**, **Lacre conferido** (obrig.), "Total contado". Estrito: valor, dinheiro, moedas **e** lacre têm de bater; senão
  "Conferência divergente: registre a recusa com o motivo." Malote não se confere aqui ("só é recebido pela abertura");
  sem lacre não ("é confirmado pelo operador").
- **Registrar recusa da conferência:** dinheiro, moedas, **Lacre informado**, **Motivo da recusa** (obrig., até 500),
  ☐ **Encerrar a divergência** ("o que foi contado entra no destino e a falta vira quebra"), ☐ **Confirmo a sobra** (exigido
  para encerrar com contado > declarado). Sem encerrar: continua pendente e registra a tentativa + notificação
  `transferencia_divergencia`. Encerrando: `divergente`, contado entra, lacre conferida/usado; falta → `quebras` +
  `quebra_caixa`.
- **Confirmar transferência** (comum): a Tesouraria confirma direto (exceção à segregação criador/confirmador, R-189).

**b) Nova transferência** — **Origem / Saída** (todas as contas; dica "Disponível em X: R$ saldo"), **Destino / Entrada**
(≠ origem), **Dinheiro físico (R$)**, **Moedas (R$)**, **Observação (opcional)**, "Total da transferência". Se origem é
**cofre** e destino é **conta de posto** → é **MALOTE** e pede **Lacre do malote de abertura**, **Lacre do malote de
fechamento** (ambos obrig.) e **Lacres de retorno / sangria (opcional)** (separados por vírgula, ponto e vírgula ou linha;
máx. **50**). Regras: origem ≠ destino; dinheiro e moedas válidos (0,00 se nada); total > 0; lacres distintos entre si e
**únicos na empresa** ("O lacre X já foi utilizado em outro movimento."); **sem fundo na origem não há transferência**.
Diálogo "Confirmar transferência". O dinheiro **sai da origem ao salvar**; malote entra no destino só na abertura; comum fica
pendente até confirmação. (A observação do malote não é guardada — o código passa `observacao: ''` no malote.)

**c) Contas e saldos** — colunas Nome, Tipo (Cofre / Caixa (posto) / Banco), Fundo (= `inicial`), Saldo atual (derivado),
Ações. **Ajustar saldo** (só Tesoureiro, doc 72): **Saldo atual desejado (R$)** + **Justificativa obrigatória** (≥ 5
letras); recusa se igual ao atual; grava lançamento `ajuste` **imutável** (saldo anterior, posterior, diferença, motivo,
autor, hora); tabela "Ajustes registrados (imutáveis)". Corrigir = novo ajuste.

---

### 3.11 VND - Vendas dos PDVs (Entradas › API)
**Arquivos:** `dist/vendas-pdv/dados.js`, `filtros.js`, `popup.js`, `tela.js`. Servidor:
`servidor/api/src/vendas-pdv/{controller,service,cliente}.ts`, contrato `servidor/shared/src/vendas-pdv.ts`.
**Leitura ao vivo** do Sistema Pralis (S1), que recebe o robô do CREARE; S2 não guarda. Lê sozinha **a cada 60 s** com a tela
à vista; botão **Sincronizar**.
**Acesso:** `vendas_pdv_visualizar` **e** empresa = `S1_VENDAS_EMPRESA_ID`. Sem configuração (URL, token ≥ 32, empresa): "A
leitura das vendas ainda não foi ligada". Limite 90 pedidos/min por usuário. Token só no servidor; resposta passa por lista branca.

**Topo:** abas **Todos · PDV 1…4** (PDVs ativos do S1 cujo nome termina em `CXPDV-n`; sem esse padrão, todos os ativos).
**Filtros:** atalhos **Hoje, Ontem, 7 dias, Este mês**; **Início** (Data inicial + Hora) e **Fim** (Data final + Hora)
("O início está depois do fim."); "Mais filtros": **Tipo de pagamento** (formas do S1), **Grupo de vendas** (subgrupos de
VND - Grupos de Vendas com computador e horário), **Turno** (turnos ativos do S1, "nome (hh:mm–hh:mm)"), **Situação**
(Aprovadas / Aguardando aprovação / Canceladas), **Produto** (texto, 0,5 s); "Limpar filtros" (mantém o PDV).
Servidor: período máx. **1 ano**; hora em Brasília (`-03:00`), fim inclui o minuto; janela diária pode cruzar a meia-noite.
**Resumo:** Total vendido (+ nº vendas), Ticket médio (= total / quantidade), Canceladas (quantidade e valor "dentro do
total"). Com tipo de pagamento escolhido, o total é só a parte paga nele (como no S1).
**Por PDV** (barras, tocar filtra) e **Por tipo de pagamento** (barras, tocar filtra/solta).
**Vendas** (50 por página, ordem trocável): Hora (com data se vários dias), PDV, Operador, Pagamento (formas unidas "+"),
Valor (líquido), Situação + **Detalhes** → popup: Total, situação, PDV · operador, Itens (qtd × descrição, total), Pagamento
(forma, total pago), Valores (Subtotal, Desconto, Acréscimo, Total), Cancelamento (motivo · justificativa).
Campos que o navegador recebe da venda: `id, dataReferencia, dataVenda, descricao, valorOriginal, valorAcrescimo,
valorDesconto, valorLiquido, status (aprovado|aguardando_aprovacao|cancelado), cancelamentoJustificativa,
cancelamentoMotivo, pdvId, pdvNome, colaboradorNome, pagamentos[{id, formaPagamentoId, formaPagamentoNome,
tipoPagamentoAutomacao, totalPago}], itensVenda[{produtoAutomacaoCodigo, descricaoProduto, quantidade, valorUnitario,
valorTotal}]`. Totais: `totalGeral, quantidade, porFormaPagamento[{formaPagamentoId, formaPagamento,
categoriaFechamentoCaixa, total, quantidade}]`.

---

### 3.12 VND - Vendas / Sistema comandas (Entradas › API)
**Arquivos:** `dist/comandas-creare/dados.js`, `tela.js`, `detalhe.js`. Servidor `servidor/api/src/comandas-creare/*`.
**Leitura ao vivo** do S1 (`/api/s2/comandas*`), mesmo token/URL das vendas; S2 não guarda. **Só administrador** (e empresa
da loja). Lê a cada 60 s (não redesenha com o detalhe aberto). Aviso se o retrato do robô tem **mais de 5 min**.
**Abas:** Abertas · Fechadas · Status 4 (com contador). **Indicadores ("Agora"):** Abertas agora (puxadas, contas),
Abandonadas, Valor em aberto, Esquecidas, Tempo médio aberta (pagas no dia, tempo médio no caixa); em Fechadas, nota de
comandas pagas com valor diferente da venda.
**Situações (R-248 do S1):** Aberta; Puxada no caixa; **Abandonada** (puxada há > 1 h sem pagamento); **Conta** (aberta há
dias, ainda recebendo); **Esquecida** (status 4 ou sem lançamento há > 24 h); Paga (fechada); Cancelada.
**Filtros:** **Dia** (só Fechadas), **Situação**, **Funcionário** (código/nome do S1), **Nº da comanda** (só dígitos, máx. 7).
**Lista** (50/página): Comanda (nº, mesa, cliente), Situação, Abriu, Fechou / Tempo aberta (régua: puxada contra 1 h, aberta
contra 24 h, fechada contra 2 h), Itens (+ cancelados), Valor (e "venda R$ x" se diferente), Lançou, Último item; Detalhes.
**Detalhe:** valor e situação; linha do tempo (abriu, item, item cancelado, puxada, fechada, cancelada); itens (cancelados
riscados com motivo); **Venda no caixa** (Comanda × Venda nº `vendaCreareId` × Diferença: + "item somado no caixa", −
"desconto ou item tirado"); Cliente, Desconto na comanda, Observação.

---

### 3.13 Open Finance · Caixa TNP (Resultados › API)
**Arquivos:** `dist/extrato-tnp/dados.js`, `filtros.js`, `paineis.js`, `detalhe.js`, `tela.js`. Servidor
`servidor/api/src/extrato-tnp/*`, contrato `servidor/shared/src/extrato-tnp.ts`.
**Leitura** do coletor Pluggy da TNP (`GET /api/v1/extrato`), token no servidor; S2 não guarda. **Acesso:**
`extrato_bancario_visualizar` e empresa = `TNP_EXTRATO_EMPRESA_ID`; 30 pedidos/min. Banco lido 1×/dia pela Pluggy ("o
movimento de hoje costuma aparecer amanhã"); avisa consentimento a ≤ 30 dias de vencer, erro de conexão e falha da última busca.
**Abas:** Contas (corrente + poupança somadas, se houver mais de uma) · Corrente · Poupança · Cartão <bandeira>.
**Período:** Hoje, Ontem, 7 dias, Este mês, Mês passado, 31 dias; Data inicial/final; **máx. 31 dias** (refaz a busca).
**Filtros (no navegador, sem nova busca):** busca (descrição, contraparte, CNPJ, categoria…), Tudo/Entradas/Saídas; "Mais
filtros": **Operação**, **Categoria**, **Situação** (Lançados/Pendentes), **Valor a partir de (R$)**, **Valor até (R$)**.
**Regras de dinheiro:** centavos inteiros, entrada positiva, saída negativa. **Pendente** não entra nos totais da conta (só na
contagem); no **cartão**, pendente = compra da fatura aberta → entra.
**Resumo (conta):** Saldo atual (é o de agora; o banco não informa saldo passado), Entradas, Saídas, Resultado, Cheque especial
(disponível, barra de uso). **Resumo (cartão):** Fatura em aberto, Limite disponível (barra), Vencimento e Mínimo, Compras.
**Análise:** Saídas por categoria, Saídas por operação, Entradas por operação (top 8 + "Outras"; tocar filtra).
**Faturas** (cartão): Vencimento (Próxima), Fechamento, Total, Mínimo, Juros e encargos, Pago. **Aplicações** (contas): nome,
saldo, rendimento 12 meses, lido em.
**Extrato por dia** (200 por vez, "Mostrar mais"), **Detalhes** (quem pagou/recebeu com documento — **CPF chega mascarado**,
servidor remascara; operação, forma, categoria; estabelecimento; cartão: final, parcela, data da compra…).
**Exportar CSV** (no aparelho): `extrato-caixa-tnp-<desde>-a-<ate>.csv`, ponto e vírgula, vírgula decimal, BOM; colunas Data,
Hora, Conta, Descrição, Operação, Categoria, Quem pagou/recebeu, Documento, Estabelecimento, Parcela, Valor, Situação; texto
iniciado por = + − @ ganha apóstrofo (anti-fórmula).

---

### 3.14 Consultas públicas (CNPJ/CEP)
**Arquivo:** `dist/consultas-publicas.js` (`window.CicluzConsultas`). Chamada **direta do navegador** à BrasilAPI
(`/cnpj/v1/<14 dígitos>`, `/cep/v2/<8 dígitos>`), tempo limite 8 s, `credentials: 'omit'`, sem referrer. Vai só o número.
Devolve `{dados}` ou `{erro: 'invalido'|'nao-encontrado'|'indisponivel', motivo}`; nunca trava o formulário. Normaliza
razão social, nome fantasia, endereço (CEP mascarado, UF validada, nomes no padrão do sistema). **Não é tela de dinheiro**;
serve ao cadastro de fornecedor (credor dos lançamentos). Testes: `tests/consultas-publicas.cjs`.

---

## 4. LIGAÇÕES (por ID ou por nome) — o que o código realmente faz

| Ligação | Como liga | Por ID? | Onde |
|---|---|---|---|
| Lançamento ↔ categoria (DES/MER/RET) | coluna `categoria` (`despesas|mercadorias|retiradas`), CHECK no banco | sim (enum) | `lancamentos.categoria` |
| Lançamento ↔ grupo | `grupoId` = `itemId` do grupo/subgrupo do Financeiro (localStorage `cicluz-financial-hierarchy-v1`, projetado em `fin_grupos`); servidor confere que existe **na mesma categoria** e guarda `grupoNome` junto; **sem FK** | **sim (id do item)** + nome copiado | `lancamentos.grupo_id/grupo_nome`, idem em `lancamentos_itens` |
| Lançamento ↔ conta (CNT) | `contaNome` = **NOME** da conta (as contas não têm id: lista de nomes em `cicluz-ti-groups-v1` + detalhes por nome em `cicluz-ti-account-details-v1`, projetadas na tabela `contas`) | **NÃO — por nome** (contraria a regra 4 do manual; renomear conta quebra o vínculo lógico) | `lancamentos.conta_nome` |
| Lançamento ↔ credor (fornecedor / colaborador / sócio) | só na tela (fornecedor id de Compras, colaborador id de pessoas); **não grava** | — | P-47 |
| Lançamento ↔ série | `recorrenciaId` + `recorrenciaOrdem` (FK para `lancamentos_recorrencias`) | sim | banco |
| Lançamento ↔ quem fez | `criadoPor`, `atualizadoPor` → `usuario_autenticacao.id` | sim | banco |
| Transferência (CNT - Transferências) ↔ contas origem/destino | nomes das contas ativas de `/api/contas`; não grava | por nome, e nada é salvo | `transferencias.js` |
| Transferência ↔ local | **não existe** ligação com Locais (`cicluz-location-tree-v1`) em nenhuma tela de dinheiro | — | não confirmado / inexistente |
| Transferência (casca) ↔ contas | `origem`/`destino` = id fixo da casca (`cofre`, `troco`, `cx-1m`…`cx-4t`) | sim, mas ids **fictícios**, sem ligação ao cadastro real | `dist/caixa/dados.js` |
| Malote ↔ lacres | lacre `{numero, tipo, transferenciaId}`; malote guarda `lacre`, `lacreFechamento`, `bolsas[]` | sim (transferenciaId) + nº do lacre | `modulo.js` |
| Caixa (abertura) ↔ malote | `abertura.maloteId` = id da transferência; `malote.caixaId` = caixa | sim | `modulo.js` |
| Caixa ↔ conta do posto ↔ PDV/turno | conta de tipo `caixa` com `pdv` ("PDV n") + `turno` (Manhã/Tarde); `contaDoPosto(pdv, turno)` | por par PDV+turno (texto) | `modulo.js` |
| Caixa ↔ sangrias / retorno final / sem lacre | transferência com `caixaId` | sim | `modulo.js` |
| Fechamento ↔ retorno final | `fechamento.retornoId` | sim | `modulo.js` |
| Caixa ↔ maquininha | texto da maquininha escolhida de uma lista fixa de 2 itens no código | **não** liga a Operadoras | `abertura.js` |
| Maquininha/operadora ↔ bandeira ↔ taxa | no cadastro (fora do Caixa): `operadoras[].fees.brands[<bandeiraId>]` = regras de vigência com `expenseId` (grupo DES por **id**) e `accountGroup` (conta por **nome**) | bandeira e grupo DES por id; conta por nome | `cicluz-financial-hierarchy-v1` → `fin_taxas` (`financeiro.leitura.ts`); **nenhuma tela de dinheiro usa as taxas** |
| Bandeira ↔ tipo de venda | `bandeiras[].saleTypeId` = id do tipo de venda (obrigatório; projeção recusa se sumir) | sim | `groups.js`, `financeiro.leitura.ts` |
| Venda (S1) ↔ PDV / forma de pagamento / turno | ids **do S1** (`pdvId`, `formaPagamentoId`, `turnoId`); `categoriaFechamentoCaixa` na forma | ids do S1, não do CICLUZ | `vendas-pdv.ts` |
| Venda (S1) ↔ Tipo de Venda / Bandeira do CICLUZ | **não existe** ligação | — | inexistente |
| Grupo de Vendas (subgrupo) ↔ computador ↔ PDV do S1 | subgrupo VND com `computerId` (id) + `startTime`/`endTime`; computador → PDV do S1 pelo **NOME** do equipamento (ex.: "...-CXPDV-n"), em maiúsculas | id dentro do CICLUZ; **nome** entre sistemas | `vendas-pdv/dados.js` `gruposDeVendas()` |
| Comanda ↔ venda | `vendaCreareId` (nº da venda no CREARE), `valorVendaCentavos`, `diferencaVendaCentavos` vindos do S1 | sim (id CREARE) | `comandas-creare.cliente.ts` |
| Comanda ↔ funcionário | `funcionario` = código do CREARE (filtro), nome para exibir | código CREARE | idem |
| Extrato ↔ conta bancária | `contaId` da Pluggy (aba e filtro `conta`) | id externo | `extrato-tnp.ts` |
| Extrato ↔ lançamentos/transferências do CICLUZ | **não existe** conciliação | — | inexistente |
| Permissão ↔ usuário | cargos de acesso + exceções → lista de chaves na sessão (`CicluzSessao.perfil.permissoes`) | sim | `acessos.ts`, `cicluz-sessao.js` |

---

## 5. Onde cada coisa é guardada (resumo)

| O quê | Onde |
|---|---|
| Lançamentos DES/MER/RET | Postgres via API (`lancamentos`, `lancamentos_itens`, `lancamentos_recorrencias`) — **fonte da verdade** |
| Grupos financeiros, tipos de venda, bandeiras, operadoras/taxas, computadores | localStorage `cicluz-financial-hierarchy-v1` (sincronizado e projetado no servidor em `fin_*`; lido por `/api/financeiro/*`) |
| Contas (CNT) | localStorage `cicluz-ti-groups-v1` (nomes) + `cicluz-ti-account-details-v1` (situação, documento, ícone por nome) → tabela `contas` → `/api/contas` |
| Caixa, Tesouraria, Gerência, Fechamentos | **só memória** (`CicluzCaixa.estado`), sementes em `dist/caixa/dados.js` |
| Nova Transferência (CNT) | **nada** |
| Vendas PDV, comandas | S1 (Sistema Pralis), lidos ao vivo |
| Extrato | coletor Pluggy, lido ao vivo; CSV baixado no aparelho |
| Horário de funcionamento (apoio a vendas) | `cicluz-horarios-funcionamento-v2` (só aparelho; P-49) |

---

## 6. O que NÃO existe / divergências (para não inventar)
- Gravação de transferências, malotes, lacres, caixa, sangria, fechamento, conferência: **não existe** (P-48; Caixa é casca).
- Gerência de Caixas e CNT - Tesouraria **sem cartão no menu** desde `cb11dcb` (PROJECT_BRAIN/14 está desatualizado).
- Saldo real de conta e "saldo insuficiente" nos Lançamentos: **não existe** (só na casca, com saldo fictício).
- Credor, fotos e IA dos lançamentos: só tela (P-47). Sócios e Gestores: cadastro não existe.
- Lista/relatório de lançamentos no site: não existe (API sim).
- Conta ligada por **nome** em lançamentos e taxas: viola "vínculo por ID".
- Tempo de aceite e transferência de retorno: só coletados (P-51: duração × horário, o que acontece ao vencer — em aberto).
- O que é "status 4" no CREARE: o próprio código diz que o CREARE não informa.
- Quem confere o fechamento (Tesoureiro × Financeiro): a casca escolheu Tesoureiro; marcado como pergunta em aberto no código.
- Destinos contábeis de tipos de venda especiais (Roubo/Furto, Sobra/Perda, Colaboradores, Sócios, Alimentação −66,6%):
  não confirmados (PROJECT_BRAIN/03).


---

# Raio-X F — Produção, Agenda, Configurações/Acessos e Backend

> Fonte: leitura do código em `C:\CICLUZ\Pralis-Sistema` (branch `feat/hierarquia-area-cargo-pessoa-20261124`, 27/11/2026).
> Onde o código e a documentação antiga divergem, vale o código. "Não confirmado" = não verifiquei no código.
> Nenhum dado real de pessoa, senha, segredo ou chave foi copiado: só nomes de campos e exemplos genéricos.

---

## 0. Visão rápida

| Módulo | Onde no menu | Arquivos | Onde grava |
|---|---|---|---|
| Produção (rotina) | Saídas · Mercadorias → **Lançamentos Produção** | `dist/producao/telas-pedidos.js`, `telas-mapa.js` | localStorage `cicluz-producao-v1` (sobe ao banco como documento JSON) |
| Produção (cadastros) | Saídas · Mercadorias → **Cadastros Geral Produção** | `telas-produtos.js`, `telas-fichas.js`, `telas-custos.js`, `telas-ingredientes.js` | `cicluz-producao-v1` e `cicluz-taco-v1` |
| Produção (relatório) | Saídas · Mercadorias → **Relatórios** → MER - Produção | `telas-relatorios.js` | só leitura |
| Patrimônio | Saídas · Retiradas → **Cadastros Geral** → RET - Patrimônios | `telas-patrimonio.js`, `telas-patrimonio-form.js`, `patrimonio-dominio.js` | `cicluz-patrimonio-v1` + IndexedDB (imagens/documentos/áudio, só no aparelho) |
| Agenda | Menu lateral, seção **AGENDA** → "Agenda · Atividades" → Agenda / Configurações da Agenda | `dist/agenda-menu.js`, `dist/agenda/*` | **API** (`/api/agenda…`), tabelas `agenda_*`; cópia offline `cicluz-agenda-cache-v1` |
| Configurações | Seção **CONFIGURAÇÕES** → Empresa · Permissões · Usuários · Senhas · Diversos · Design System | `dist/acessos/*`, `dist/hierarquia*.js` | misto: API (usuários, senhas, cargos de acesso) e localStorage (empresa, salário mínimo, Acesso por Tela) |
| Backend | — | `servidor/` (api, db, shared, web, tests) | PostgreSQL |

Padrão de UI comum: todas as telas de Produção/Patrimônio/Agenda/Configurações usam as peças do Compras (`window.CicluzComprasUI`: `criarTela`, `dialogo`, `campo`, `entrada`, `seletor`, `chips`, `linhaLista`…). Cores: Produção verde (cor do Compras/Mercadorias), Patrimônio azul RET `#2563eb`, Agenda e Configurações roxo `#7c3aed` / texto `#5520ad`.

---

## 1. PRODUÇÃO

### 1.1 Arquitetura dos arquivos (`dist/producao/`)

| Arquivo | Papel |
|---|---|
| `modulo.js` | Registra as telas e os cartões do menu (`window.CicluzProducao`): CARDS (Lançamentos Produção), RELATORIOS, CADASTROS; caminhos `Saídas · Mercadorias / Lançamentos Produção / …`, `…/ Cadastros Geral Produção / …`, `…/ Relatórios / …`. |
| `dados.js` | Armazéns locais (`criarArmazem`): `cicluz-producao-v1`, `cicluz-taco-v1`, `cicluz-patrimonio-v1`. Gravação transacional (relê o que outra aba gravou, desfaz se falhar), evento `cicluz-producao-mudou` / `cicluz-taco-mudou` / `cicluz-patrimonio-mudou`. Integrações só-leitura: locais, produtos, fornecedores, grupos de despesa, cargos. |
| `dominio.js` | Regras puras testadas em Node (`tests/producao-dominio.cjs`): listas, fornada/meia, validações, plano da ficha, lotes, conversão de unidade, estoque, **fórmulas de custo C1–C5**, mapa, relatório. |
| `patrimonio-dominio.js` | Regras puras do patrimônio em 6 etapas (`tests/patrimonio-dominio.cjs`). |
| `servico.js` | Operações (valida → grava em transação → `{ok}` / `{erro}`): patrimônio, produto da produção, fichas, agendamentos, pedidos, ordens, mapa, estoque, reposição, abastecimento, fechamento, custos. |
| `taco.js` + `taco-dados.js` | Regras da Tabela TACO (busca, CSV, validação do ingrediente) e a TACO oficial (4ª ed., NEPA/UNICAMP) embutida em `window.CicluzTacoOficial`. |
| `telas-*.js` | Uma tela cada. |

**Documento `cicluz-producao-v1`** (versão 1): coleções `produtos` (configuração de produção por produto), `fichas`, `agendas`, `ocorrencias`, `pedidos`, `ordens`, `ingredientes` (opcional, desde 18/11/2026) e o objeto `parametros`. Começa vazio (sem dados de exemplo). Vínculo com o produto do Compras pelo `produtoId`.

**É demonstração?** Não. Começa vazio; nada fictício. Os botões "Gerar o pedido agora (simulação)" na Agenda de Produção fazem o papel do agendador (geram pedido real no documento).

### 1.2 MER - Produtos da Produção (`telas-produtos.js`)
- **Menu**: Saídas · Mercadorias → Cadastros Geral Produção → MER - Produtos da Produção. "+" do cabeçalho = "Ligar produto à produção".
- **Lista**: produtos ligados (ordenados por descrição), busca "Buscar produto", situação: `Desligado` / `N fichas` / `Sem ficha`; botões `Fichas` (abre fichas filtradas) e `Editar`.
- **Formulário** (diálogo largo, botão "Salvar produto"):

| Quadro | Campo (rótulo exato) | Tipo | Obrig. | Regras |
|---|---|---|---|---|
| Produto | **Produto \*** | Árvore grupo › subgrupo › produto do Compras (`U.campoArvore`, só produtos `ativo` e ainda não ligados); em edição, seletor travado | Sim | Produto precisa existir (`S.produto`). Dica: cadastrar em MER - Produtos (grupo FAB. PRÓPRIA). |
| Produto | Principal processo | Seletor (9 processos: Receber/conferir/garantir; Pré-pesar…; Higienizar…; Picar…; Misturar…; Assar…; Finalizar…; Armazenar…; Embalar…) | Não | — |
| Como se pede: utensílio de fornada | "É pedido por utensílio (assadeira, lata, tira)" | Interruptor (padrão ligado) | — | Desligado → `formato = null` (quantidade livre). |
| idem | **Utensílio \*** | Seletor de bens do Patrimônio (ativos; categoria UTS/utensilio primeiro; mostra medidas) | Sim se formato | `Escolha o utensílio (cadastre em RET - Patrimônios).` |
| idem | **Quantos na largura \*** (`colunas`) | Número inteiro ≥1 | Sim | Precisa ser par se aceita meia. |
| idem | **Quantos na altura \*** (`linhas`) | Número inteiro ≥1 | Sim | — |
| idem | Exatidão | Seletor Exato/Aproximado | Não | — |
| idem | "Dá para fazer meia (½) neste utensílio" (`aceitaMeia`) | Interruptor | — | Meia = (colunas/2)×linhas. |
| Estoque | "Trabalha com estoque (pronto ou cru)…" (`comEstoque`) | Interruptor (padrão ligado) | — | — |
| idem | Estoque mínimo / Estoque máximo / Produção máxima por pedido | Número | Não | >0, **múltiplos do passo** (meia ou fornada), mín ≤ máx. |
| idem | Local do estoque (`localEstoqueId`) | Árvore Área › Setor › Local (`U.campoLocal`) | Não | Grava id do nó. |
| Abastecimento | Conferência | Seletor: Sem conferência / Conferência em 1 etapa (saída da produção) / em 2 etapas (saída e chegada na loja) | — | Padrão `nenhuma`. |
- Rodapé em edição: "Desligar da produção" / "Religar à produção" (`desligarProducao`): recusado se há pedido em andamento (`rascunho/enviado/pronto/conferencia_loja`) com o produto.
- **Fórmulas do formato** (`dominio.js`): fornada = colunas × linhas; meia = (colunas/2) × linhas se `aceitaMeia` e colunas par; **passo** = meia ou fornada; quantidades válidas = múltiplos do passo.
- **Registro salvo** (`producao.produtos[]`): `{ produtoId, processoPrincipal, formato:{utensilioId,colunas,linhas,exatidao,aceitaMeia}|null, comEstoque, estoqueMin, estoqueMax, producaoMax, localEstoqueId, conferencia, ativo, criadoEm, atualizadoEm }`. Chave lógica = `produtoId` (um por produto).

### 1.3 MER - Ficha Técnica de Produtos (`telas-fichas.js`)
- **Menu**: Cadastros Geral Produção → MER - Ficha Técnica de Produtos. "+" = "Nova ficha técnica".
- **Lista**: filtro "Todos os produtos"; uma seção por produto produzido, botão "Nova ficha"; cada ficha mostra etapas, quantidade-base, tempo total, tempo de equipe e **custo** (total, por unidade, sugerido e "parcial: falta …"); ações "Tornar padrão", "Duplicar", "Editar". Sem produto ligado → aviso e atalho para MER - Produtos da Produção.
- **Editor** (título "Cadastro ficha técnica" / "Editar ficha técnica", botão "Salvar ficha"):

**Quadro Cabeçalho**
| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| **Produto \*** | Seletor (produtos produzidos); travado na edição | Sim | `Escolha o produto da ficha.` |
| **Nome da ficha \*** | Texto (ex.: Do zero, Com kit) | Sim | — |
| **Ingredientes para quantas unidades? \*** (`quantidadeBase`) | Número | Sim, >0 | Sugere a fornada do formato. |
| Produção de / Produção até (`producaoDe`, `producaoAte`) | Número | Não | Só guardados (não usados em cálculo — não confirmado uso). |
| Rendimento bruto (kg, cru) / Rendimento líquido (kg, frio) | Número | Não | Mostra **Perda** = líquido − bruto (kg) e líquido ÷ bruto − 1 (%). |
| "Ficha padrão deste produto (usada nos pedidos)" | Interruptor | — | Primeira ficha do produto vira padrão; marcar uma desmarca as outras. |

**Quadro Etapas** (uma ou mais; "+ Etapa", Subir, Descer, Remover etapa — mínimo 1)
| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| **Processo \*** | Seletor (9 processos) | Sim | `Etapa N: escolha o processo.` |
| Parte do produto | Seletor Massa/Recheio/Cobertura/Ingrediente ou "Não se aplica" | Não | — |
| Vale a partir de (qtd.) / Vale até (qtd.) (`faixaDe/faixaAte`) | Número | Não | de ≤ até; etapa fora da faixa não entra no plano. |
| Onde é feita (`localId`) | Seletor de locais (caminho Área › Setor › Local) | Não | Id do nó. |
| Instrução para quem executa | Texto livre | Não | "Guardada para o guia por áudio, que vem depois". |
| **Ingredientes** (linhas): Ingrediente / Quantidade / Unidade | Seletor de **produtos ativos do Compras** / número / unidade do Compras | Produto e quantidade >0 | Unidade sugerida = `unidadeIndividual` do produto ou KG. Aviso "Sem conversão para a unidade do estoque (não vai baixar)". |
| **Equipamentos/tempo** (linhas): Equipamento / utensílio · Tempo (min) · Acompanhamento · Cargo · Nível profissional · Vale de (qtd.) · Até (qtd.) | Seletor de bens ativos do Patrimônio ("Sem equipamento (só mão de obra)") · número · 0%–100% (passo 10%; padrão 100%) · seletor de cargos de DES - Cargos C/Salários · Ajudante/Profissional iniciante/intermediário/avançado/Especialista · número · número | Tempo ≥0; acompanhamento 0–1; faixa não invertida | Linha vazia (sem bem e sem tempo) é descartada; tempo vazio vira 0. |

- **Plano da ficha** (`planoDaFicha`): ingredientes escalados por `qtd ÷ quantidadeBase`; peso em kg (só KG/G); **lotes** = ⌈carga ÷ capacidade do bem⌉ (capacidade KG/G compara com peso; UN com quantidade); tempo do recurso = tempoMin × lotes; **tempo de equipe** = tempo × acompanhamento.
- **Registro salvo** (`producao.fichas[]`): `{ id:'ft-…', produtoId, nome, padrao, ativa, quantidadeBase, producaoDe, producaoAte, rendimentoBruto, rendimentoLiquido, etapas:[{ id:'et-…', processo, parte, faixaDe, faixaAte, localId, instrucao, ingredientes:[{produtoId, quantidade, unidade}], recursos:[{patrimonioId, tempoMin, acompanhamento, cargoKey, cargoNome, nivel, faixaDe, faixaAte}] }], criadoEm, atualizadoEm }`.
- Excluir ficha: recusado se há ordem `aguardando`/`em_producao` com ela; se era padrão, outra ativa vira padrão. Ordens já criadas guardam **cópia** do plano.

### 1.4 MER - Parâmetros de Custo (`telas-custos.js`) e fórmulas aprovadas
- **Menu**: Cadastros Geral Produção → MER - Parâmetros de Custo. Botão "Editar" → diálogo "Parâmetros de custo" ("Salvar parâmetros").

| Campo | Unidade | Regra |
|---|---|---|
| Horas de trabalho por mês (`horasMes`) | h | ≥0; se preenchido, >0 |
| Encargos sobre a folha (`encargosPct`) | % | ≥0 |
| Preço do kWh (`precoKwh`) | R$ (máscara de dinheiro, 4 casas na exibição) | ≥0 |
| Preço do kg de gás (`precoGasKg`) | R$ | ≥0 |
Gravado em `producao.parametros = {horasMes, encargosPct, precoKwh, precoGasKg, atualizadoEm}`. Vazio = custo parcial com a lista do que falta.

**Fórmulas C1–C5 (aprovadas pelo Zé em 05/11/2026 — `dominio.js` `custoMinuto`, `custoDoPlano`, `valorSugerido`; `servico.js` `custoDaFicha`)**
- **Custo do minuto do cargo** = salário × (1 + encargos/100) ÷ (horasMes × 60).
- **C1 Ingredientes** = Σ (quantidade convertida para a unidade do estoque do produto × custo unitário do Compras `CicluzComprasServico.custoUnitario`). Sem conversão ou sem custo → falta "custo ou conversão de ingrediente".
- **C2 Mão de obra** = Σ tempo de equipe × custo do minuto do cargo. Sem cargo/salário/horas → falta "salário do cargo ou horas por mês".
- **C3 Energia** = Σ (tempo do equipamento com lotes ÷ 60) × `consumoHora` do bem × preço (kWh se elétrica; kg de gás se gás). Solar e "não consome" = 0.
- **C4 Total** = C1 + C2 + C3; **por unidade** = total ÷ quantidade (padrão: quantidade-base). Arredondamento `centavos()` a 2 casas.
- **C5 Valor sugerido** = custo unitário × (1 + margem) + R$ 0,01; margem = a do produto (`prod.margem`) ou, vazia, a margem padrão do grupo (tabela fiscal de exemplo `CicluzProdutoFiscal.TABELAS_EXEMPLO`).
- **Atenção (divergência)**: o texto da tela diz "salário **vigente** do cargo", mas o código (`dados.js → cargos()`) lê `jobsCurrent()[...].j.valor`, o **valor da ficha do cargo** em DES - Cargos C/Salários, **não** a tabela de salários por vigência (`cicluz-salarios-vigencias-v1`).
- Conversão de unidade (`converter`): mesma unidade; G↔KG, ML↔LT/L; ou pelo conteúdo do produto (`quantidadeIndividual`+`unidadeIndividual` ou `transformacao`). Sem caminho → `null`.

### 1.5 MER - Ingredientes Ficha Técnica / Tabela TACO (`telas-ingredientes.js`, `taco.js`)
- **Menu**: Cadastros Geral Produção → MER - Ingredientes Ficha Técnica / Tabela TACO (pedido do Rodrigo, 18/11/2026). Título com botões "Novo Ingrediente" e "Tabela TACO"; busca no rodapé ("Buscar ingrediente").
- **Formulário do ingrediente**:
  - Quadro "Dados do ingrediente": **Situação do ingrediente** (Ativo/Inativo, inativo sai das escolhas); **Nome do ingrediente \*** (texto, máx. 80; único sem acento/maiúsculas: "Já existe um ingrediente com este nome.").
  - Quadro "Tabela TACO": **Buscar na Tabela TACO (nome ou código)**; toque no alimento liga (`tacoCodigo`); mostra Código TACO, Alimento, Grupo e resumo nutricional por 100 g; "Tirar o vínculo". Código precisa existir na tabela em uso.
  - Gravado em `producao.ingredientes[] = { id:'ing-…', nome, tacoCodigo|null, ativo, criadoEm/atualizadoEm }`. Excluir = apaga (confirmação "Não dá para desfazer").
- **Tabela TACO** (diálogo): consulta (40 primeiros ou busca), ficha do alimento (valores por 100 g); **Importar tabela (CSV)** — colunas obrigatórias `codigo`, `descricao` + colunas de valores reconhecidas (kcal, proteina, lipideos, carboidrato, fibra, sodio…); código inteiro e único; "Tr" = traço; erros → nada é importado. "Baixar modelo do CSV", "Voltar à tabela oficial". Importada fica em `cicluz-taco-v1 = {versao, linhas, colunas, nome, importadaEm}`; vazio = vale a oficial embutida.
- **Pendência registrada no código**: os ingredientes TACO **ainda não estão ligados à ficha técnica** — os ingredientes das fichas continuam sendo **produtos do Compras**.

### 1.6 MER - Agenda de Produção (`telas-pedidos.js` → `abrirAgendamento`)
- **Menu**: Lançamentos Produção → MER - Agenda de Produção (saiu do menu Agenda em 23/11/2026). "+" = "Novo agendamento".
- Lista dos agendamentos ativos: "Janela HH:MM–HH:MM · N produto(s)", regra de repetição, hora, entrega, responsável; chips "Próximos pedidos" (6) → diálogo com "Excluir só esta data" e "Gerar o pedido agora (simulação)"; "Excluir todas as futuras" (encerra a série).
- **Formulário** ("Novo agendamento"/"Editar agendamento"):

| Quadro | Campo | Tipo | Obrig. | Regra |
|---|---|---|---|---|
| Quando a loja pede | **Primeiro pedido em \*** (`inicio`) | Data (padrão amanhã; mín. hoje para novo) | Sim | Não pode ser passado (novo). |
| idem | **Hora do pedido \*** (`hora`) | Hora (padrão 18:00) | Sim | — |
| idem | Repetição + término | Componente do Compras `CicluzComprasPedido.campoRepeticao` (padrão diária; "Semestral: Personalizado… mensal, a cada 6") | — | Término por data não antes do início. |
| idem | Mudanças valem a partir de (só edição) | Data | — | Se depois do início: a série antiga termina na véspera e nasce série nova com `serieAnteriorId`. |
| Para quando | **Janela de demanda: de \*** / **Até \*** | Hora (padrão 06:00–08:00) | Sim | fim > início. |
| idem | Entrega | Seletor: No dia seguinte (pedido na véspera) / No mesmo dia | — | Padrão "seguinte". |
| Quem pede | **Responsável pelo pedido \*** | Seletor de **Pessoas com Acesso** (contas do servidor, via `CicluzAgendaDados.pessoas()`) | Sim | Na hora, vira tarefa na Agenda dessa pessoa. |
| Produtos | Marcar produtos (tabela com checkbox) + "Quantidade pré-programada (opcional)" | Checkbox + número | ≥1 produto | Quantidade em múltiplos do passo. Produto sem produção ligada é recusado. |
- Registro `producao.agendas[]`: `{ id:'agp-…', status:'ativa'|'encerrada', produtoIds, quantidades:{produtoId:qtd}, inicio, hora, regra, termino, janelaDe, janelaAte, entrega, responsavelId, excecoes:{previsto:{cancelada}}, serieAnteriorId?, criadaEm }`. `producao.ocorrencias[]`: `{ id:'ocp-…', agendaId, previsto, data, hora, pedidoId }`.
- **Agendador** (`processarAgendas`, roda ao abrir MER - Pedidos de Produção): para cada data/hora vencida não processada cria **pedido "rascunho"** (Para fazer), origem `agendamento`, entrega no mesmo dia ou seguinte, e chama `CicluzAgendaRotina.tarefaDoPedidoDeProducao` → tarefa na Agenda do responsável (`vinculoRef = 'producao:pp:<pedidoId>'`). **Não há agendador no servidor**: só roda quando alguém abre a tela.

### 1.7 MER - Pedidos de Produção (`telas-pedidos.js` → `abrirPedidos`)
- **Menu**: Lançamentos Produção → MER - Pedidos de Produção. "+" = "Pedido extra". Ao abrir roda `processarAgendas()` e `lancarEstoque()`.
- Seções: **Repor estoque** (sugestões), **Para fazer** (`rascunho`, botão "Fazer o pedido"), **Na produção** (`enviado`/`pronto`/`conferencia_loja`), **Recentes** (abastecido/cancelado, 15). Situações: Para fazer · Na produção · Pronto para abastecer · Conferir na loja · Abastecido · Cancelado.
- **Fazer o pedido** (diálogo "Pedido nº N"): tabela Produto/Quantidade (vazia = não vai); "Enviar à produção"; "Cancelar este pedido".
- **Pedido extra**: **Dia \*** (data ≥ hoje), **Janela de: \*** / **Até \*** (hora; padrão agora+1h/+3h), **Quem está pedindo \*** (Pessoas com Acesso), Observação (texto livre), tabela de produtos. Já nasce `enviado`, origem `extra`.
- **Aprovar reposição** ("Repor <produto>"): **Dia \***, **Pronto entre: \*** / **E \***, **Aprovado por \***, quantidade. Cria ordem origem `reposicao` (`aprovadoPor`).
- **Regras ao enviar** (`planejarItens`/`criarOrdens`): quantidade em múltiplos do passo; produto com estoque → sai primeiro do **estoque livre** (saldo do Compras − reservado por pedidos `enviado/pronto`); só o que falta vira ordem, arredondado para cima ao passo; produto sem ficha padrão ativa é recusado; tudo do estoque → pedido já `pronto`. **Uma ordem de produção por produto**, com cópia do plano da ficha padrão.
- **Cancelar**: só `rascunho`/`enviado` e só se nenhuma ordem começou; ordens viram `cancelada`; a tarefa "Lançar a produção" sai da Agenda.
- Registro `producao.pedidos[]`: `{ id:'pp-…', numero (sequencial), origem:'agendamento'|'extra', agendaId?, status, dataEntrega, janelaDe, janelaAte, responsavelId, observacao?, itens:[{produtoId, quantidade, doEstoque, produzir, entrouEstoque, real, recebido, sobra, descarte}], conferenteId, conferenteLojaId, conferirSo, enviadoEm, abastecidoEm, fechadoEm, eventos:[{tipo, em, por, obs}], criadoEm }`.
- Reposição sugerida (`sugestaoReposicao`): se livre (+ ordens de reposição abertas) < mínimo → completar até o máximo (ou o mínimo), arredondado ao passo e limitado à produção máxima. **Só vira ordem depois de aprovada.**

### 1.8 MER - Mapa de Produção (`telas-mapa.js`)
- **Menu**: Lançamentos Produção → MER - Mapa de Produção.
- Filtros: **Dia** (data de entrega), visões em chips **Por horário / Por turno / Por processo / Por setor / Por cargo / Por produto**, "Mostrar concluídas". Turno: Manhã 05:00–14:00, Tarde 14:00–22:00, resto "Fora do turno" (decisão do Zé 06/11/2026).
- Cartão por etapa de ordem: produto · quantidade, Nª etapa · processo · parte, situação (A fazer / Começou HH:MM / Concluída HH:MM / Aguarda a etapa anterior), ordem nº (reposição), janela, tempo e tempo de equipe, equipamentos com nº de processos, cargo · nível, setor, instrução, ingredientes, **pendência de baixa de estoque**. Botões Iniciar / Concluir / Desfazer.
- Regras (`marcarEtapa`): só age na etapa cuja anterior terminou; desfazer recusado se o estoque já foi lançado ou o pedido saiu de `enviado`. Todas as etapas de todas as ordens do pedido prontas → pedido `pronto` (+ conclui a tarefa "Lançar a produção").
- Ordem (`producao.ordens[]`): `{ id:'op-…', numero, pedidoId|null, origem:'pedido'|'reposicao', aprovadoPor, produtoId, fichaId, quantidade, dataEntrega, janelaDe, janelaAte, status:'ativa'|'cancelada', etapas:[{etapaId, numero, processo, parte, localId, instrucao, ingredientes, kg, lotes, tempo, tempoEquipe, recursos:[{patrimonioId, cargoKey, cargoNome, nivel, acompanhamento, lotes, tempo}], inicio, fim, responsavelId}], estoqueLancado, pendenciasEstoque, criadaEm }`. Situação calculada: aguardando / em_producao / pronta / cancelada.

### 1.9 MER - Abastecimento (`telas-mapa.js` → `abrirAbastecimento`)
- **Menu**: Lançamentos Produção → MER - Abastecimento.
- Seções: Prontos para abastecer ("Abastecer"), Conferir na loja ("Conferir chegada"), Fechar: sobra e descarte ("Fechar"), Fechados ("Ver folha", 10).
- **Abastecer**: **Conferido por (saída) \*** (se o pedido tem conferência; a conferência do pedido é a maior entre os produtos), chips **Conferir: Todos os produtos / Só a curva A** (curva A = 20% que mais vendem em 3 meses, a "bolinha verde" do Compras), coluna **Real (foi para a loja)** (≥0, pode ser 0). Produto com estoque → movimento `saida_abastecimento` no Compras. Conferência em 2 etapas → status `conferencia_loja`.
- **Conferir chegada**: **Conferido na loja por \*** — tem de ser **outra pessoa** (≠ conferente da saída); coluna **Chegou**.
- **Fechar**: colunas **Sobra** e **Descarte**; sobra + descarte ≤ real; sobra de produto com estoque volta ao saldo (`sobra_retorno`); descarte só registrado.

### 1.10 MER - Produção (relatório) (`telas-relatorios.js`)
- **Menu**: Saídas · Mercadorias → Relatórios → MER - Produção. Filtros **De**/**Até** (padrão últimos 30 dias, pela data de entrega) e chips Mais produzidos / Mais vendidos / Mais descarte.
- Colunas: Produto, Pedido, Produzido (ordens prontas), Abastecido (real/recebido), Sobra, Descarte, **Desperdício = descarte ÷ abastecido**, Vendas 3 meses (campo `vendas3m` do cadastro do Compras — número cadastrado/importado, **não** venda real do caixa). Pedidos cancelados e rascunhos não entram. Margem: ainda não.

### 1.11 RET - Patrimônios (`telas-patrimonio.js`, `telas-patrimonio-form.js`)
- **Menu**: Saídas · Retiradas → Cadastros Geral → RET - Patrimônios (cor azul RET). "+" = "Novo patrimônio".
- **Lista**: tabela com colunas recolhíveis, filtro por categoria (chips), ficha completa, **etiqueta patrimonial com QR Code**, **Baixa patrimonial** (no lugar de excluir). Indicadores de manutenção "vencida"/"próxima" (aviso 30 dias, provisório P-25).
- **Cadastro em 6 etapas** (stepper; "Avançar" confere a etapa):
  1. **Cadastro e identificação** — Identificação: **Categoria \*** (CIS - Estrutura Física, UTS - Utensílios e Ferramentas, MAC - Máquinas e Equipamentos, MOB - Mobiliários / Balcões, VE - Veículos; categorias antigas aparecem como "(cadastro anterior)"), Grupo de patrimônio (grupo › subgrupo de **RET - Grupos de Retiradas**, só Investimento; guarda `grupoRetId`/`subgrupoRetId`), **Nome simplificado \*** (máx. 120, salvo em MAIÚSCULAS), Nome técnico (200), Marca, Modelo, Número de série, Número de patrimônio (único, botão "Gerar o próximo" → `PAT-000001…`), Valor do Patrimônio (R$), Descrição detalhada, observação em áudio (só no aparelho). Classificação: Tipo de bem (móvel/imóvel/outro), Natureza (tangível/intangível), Situação patrimonial (Ativo, Inativo, Em manutenção, Em estoque, Emprestado, Baixado), Estado de conservação (Novo…Inutilizável), Data de cadastro. Quantidade: Unidade de medida (UN/KG/LT/MT), Quantidade de unidades, Individual/Conjunto. Especificação técnica? (Sim/Não). **Produção** (só categorias MAC/MOB e antigas equivalentes): "Este equipamento ou mobiliário é utilizado na produção?", Quantidade da capacidade + Unidade de medida da capacidade (→ `capacidade {valor, unidade}`, usada nos **lotes** da ficha), "Este equipamento utiliza algum utensílio?" + lista de utensílios UTS (`utensiliosIds`), "+ Cadastrar Utensílio".
  2. **Imagens e documentação** — Galeria (máx. 20, JPEG/PNG/WebP, 10 MB; tipo: frontal, traseira, etiqueta, série, placa…, uma principal) e Documentos (máx. 30, PDF/imagem, 10 MB; tipo: nota fiscal, garantia, manual, laudo…; Data do documento). **Arquivos no IndexedDB de Documentações (só neste aparelho)**; o registro guarda `{id, name, type, size}`.
  3. **Localização e responsabilidade** — Empresa proprietária, CNPJ da empresa (validado), Unidade ou filial, Estabelecimento, **Local do patrimônio (Área › Setor › Local)** (`localId`), Departamento, Ambiente, Sala, Andar, Localização detalhada; Responsável pelo patrimônio (colaboradores por id em `responsaveis[{colaboradorId, nome, cargo}]`, Cargo ou função, Departamento, Data de atribuição, Tipo de responsabilidade); Movimentações (Tipo \*, Data \* não futura e em ordem cronológica, Origem, Destino, Responsável, Motivo, Observação).
  4. **Composição e componentes** — Peças e componentes (Peça \*, Código (único), Tipo, Marca, Modelo, Número de série, Quantidade \* (inteiro ≥1), Unidade, Valor unitário, Valor total = qtd × unitário em centavos, Situação Ativa/Substituída/Baixada, Substituída por, Observações, **Fornecedor** (do Compras, por id), **Grupo de despesas** (DES - Grupos de Despesas, grupo/subgrupo por id), Última troca, A cada (meses), Substituir em = última + N meses); Patrimônio composto (vínculo a outros bens, sem ciclo, valor dos vinculados só informativo); Ficha Técnica do Equipamento: Tipo de Energia (Gás/Elétrica/Solar/Não consome), Consumo de gás por hora (kg/h ou m³/h), Potência Elétrica (W), **Consumo elétrico por hora (kWh)** (`consumoHora`, usado no C3), Altura/Largura/Profundidade (m/cm), Peso (kg/g), materiais, voltagem (lista a validar com responsável técnico); Medidas para a produção: Largura (cm), Comprimento (cm).
  5. **Aquisição, financeiro e depreciação** — Tipo de aquisição, Datas de aquisição/recebimento/entrada em operação (em ordem), Fornecedor, Nº e série da NF, Valor de aquisição, Frete, Instalação, Custos adicionais, Descontos, **Valor total de aquisição = aquisição + frete + instalação + adicionais − descontos** (informativo), Moeda; Depreciação (método Linear/Outro/Não depreciável, vida útil em meses, início, valor residual, conta contábil, centro de custo, observações) — **não gera lançamento contábil**; Garantia e Seguro (datas, empresa, apólice, valor segurado; prazo restante calculado).
  6. **Manutenção, controle e revisão** — Tipo de manutenção, Periodicidade (meses), Última / Próxima manutenção (próxima = última + N meses, mês sem o dia cai no último dia — decisão do Rodrigo 15/11/2026), Responsável, Fornecedor ou prestador, Custo estimado; Histórico de manutenção (Data \*, Tipo \*, Descrição do serviço \*, Responsável, Peças substituídas, Custo, Documento, Próxima, Situação); Inspeções e conformidade; **Baixa patrimonial** (motivo: venda, doação, descarte, perda, furto, sinistro, obsolescência, sucateamento, outras; data não futura); Revisão final.
- Regras de gravação (`servico.js`): número de patrimônio único; histórico de alterações (`historico[{em, campos}]`, últimos 100); excluir só se não usado em formato de produto ou ficha ("Inative-o em vez de excluir"); `ativo` acompanha a situação patrimonial (inativo/baixado saem das escolhas da Produção).
- **Só informação cadastral**: nada gera lançamento, depreciação oficial ou pagamento.

---

## 2. AGENDA

### 2.1 Menu e telas
- `dist/agenda-menu.js` cria a seção **AGENDA** do menu lateral (com GESTÃO e CONFIGURAÇÕES, estado recolhido em `cicluz-sidebar-sections-v1`): item **"Agenda · Atividades"** com dois botões — **Agenda** (`CicluzAgenda.abrir('')`) e **Configurações da Agenda** (`CicluzAgendaRotina.abrirConfiguracoes()`). Na mesma seção ficam "Entrevistas" e "Avaliações" (fora do escopo deste raio-x).
- Tela principal (`agenda/telas.js`, modelo do app Lembretes): à esquerda listas automáticas (**Para hoje, Programados, Todos, Sinalizados, Atrasados, Atribuídos a mim, Concluídos**) e "Minhas listas"; abas **Listas · Calendário · Kanban · Mapa mental · Desempenho**.
- Ícone roxo **de agendar** na barra de baixo de toda tela (`agendarDaTela`): cria compromisso ligado à tela aberta (`vinculoTela` = endereço `#/…` do `rotas.js`, `vinculoTitulo` = título da tela).

### 2.2 Onde os dados moram
- **Servidor é a fonte** desde a transferência: `agenda/dados.js` é "a ÚNICA porta da tela para a API". Lê `GET /api/agenda` ao abrir, ao voltar para a aba e a cada 30 s (`If-None-Match` → 304), com cabeçalho `X-Cicluz-Automatico: 1` (não conta como "mexeu").
- Sem internet: mostra `cicluz-agenda-cache-v1` (só do mesmo usuário; apagado no "Sair" e quando fora do expediente) e **não grava**.
- Documento antigo `cicluz-agenda-v1`: não é mais lido; a cópia do aparelho vai **uma vez** para `POST /api/agenda/transferencia/aparelho` e marca `cicluz-agenda-transferida-v1`. Nada é apagado. (Continua na lista `CHAVES_SINCRONIZADAS` do servidor.)
- Preferências do aparelho (não sincronizam): `cicluz-agenda-alertas-mostrados` (alertas já exibidos, 7 dias), `cicluz-agenda-calendario-ocultas` (listas ocultas no calendário), `cicluz-agenda-mapa` (estrutura/agrupamento do mapa mental), `cicluz-agenda-escala-enviada-v1` (marca do último envio de escalas).
- Situações da tela: carregando, cache, servidor, sem-internet, nao-transferida, fora-expediente, erro. Só grava em `servidor`.
- **Não é demonstração.** As pessoas de teste antigas ("José · Compras", "Rodrigo · Gerência", "Ana · Estoque", ids `u-jose/u-rodrigo/u-ana`) foram removidas (24/11/2026); referências antigas aparecem como "Pessoa de teste (removida)".

### 2.3 Compromisso (formulário — `telas.js` ~l.540-636)
Diálogo "Salvar · Criar compromisso"/"Salvar compromisso"; texto livre (sem maiúsculas automáticas).

| Quadro | Campo | Tipo | Regras (`agenda/regras.js`, gerado de `servidor/shared/src/agenda/regras.ts`) |
|---|---|---|---|
| — | **Título** | Texto (máx. 200, obrigatório) | "Informe o título do compromisso." |
| Quando | Data | Data | Válida (DD/MM/AA na tela). |
| idem | Início (hora) | Hora | Exige data; "Sem hora = dia todo". |
| idem | Término | Hora | Exige início; > início. |
| idem | Alerta | Seletor: Nenhum, Na hora, 5/15/30 min, 1 h, 2 h, 1 dia, 2 dias, 1 semana antes… | Exige data. |
| idem | Repetir / A cada / Unidade / Fim da repetição (Nunca, Em uma data, Depois de algumas vezes) / Termina em / Quantas vezes | Nunca, De hora em hora, Todo dia, Dias úteis, Fins de semana, Toda semana, A cada 2 semanas, Todo mês, A cada 3 meses, A cada 6 meses, Todo ano, Personalizada (intervalo 1–99, dia/semana/mês/ano, dias da semana) | Exige data (hora se "de hora em hora"); fim por data ≥ data; vezes 1–999. Mês sem o dia cai no último dia. |
| Organização | Lista | Seletor das listas em que é membro/gestor | Obrigatória ("Escolha a lista do compromisso."). |
| idem | Coluna do Kanban | Seletor | — |
| idem | Etiquetas | Texto separado por vírgula (máx. 30 cada, sem repetir, `#` removido) | — |
| idem | Prioridade | Chips Muito baixa / Baixa / Normal / Alta / Muito alta | — |
| idem | Sinalizar | Interruptor Sim/Não | — |
| Pessoas e permissões | Pessoa + chips **Responsável · Ver · Editar · Concluir · Excluir**; "Adicionar pessoa" + "Adicionar como responsável" | Contas ativas da empresa (`GET /api/agenda/pessoas`) | Só o **gestor** (quem criou) muda. Quem faz algo também vê. Quem não está não vê o compromisso. Responsável padrão: ver+editar+concluir, não excluir. |
| Local | Mapa (Atual, Ao entrar, Ao sair, Personalizada) + Endereço | `localizacao {lat, lng, aviso 'entrar'/'sair', raio 50–50000 m}` | Aviso exige ponto no mapa. |
| Detalhes | Endereço na internet (URL) / Notas | Texto (URL máx. 500, precisa http(s)://) | — |
| Subtarefas | Lista de subtarefas | Texto (máx. 200) | Sem nome é recusado. |
| Tela ligada | Mostra a tela ligada, "Abrir a tela", "Desligar a tela" | `vinculoTela`, `vinculoTitulo` (≤120), `vinculoRef` (só tarefas criadas por tela) | Tarefa criada pela tela conclui sozinha. |
| Avaliação | Tipo de avaliação: Sem avaliação, Estrelas (1–5), 5 níveis, NPS (0–10), Feito (sim/não) | Seletor | Só o gestor define; trava após a 1ª nota. Depois de concluído, o **gestor** avalia cada responsável e cada responsável se **autoavalia**; nota registrada não muda. |
| (existente) | Chat + Arquivos | ver 2.6 | — |
- Rodapé: "Criado em … por …", "Excluir compromisso" (se `acesso.excluir`).
- **Permissão por compromisso** (`acesso()`): o gestor (criador; `gestor_id` no banco) tem tudo; demais conforme a linha em `agenda_participantes`. O servidor manda `acesso` pronto; a tela não calcula.
- **Concluir com repetição**: o servidor deixa uma cópia concluída (`origemId`, `ocorrencia`) e passa o original para a próxima data.
- Outras ações (todas via API): criação rápida (interpreta "amanhã às 10", "sexta", "dia 20", `#etiqueta`, `!`), sinalizar, mover de dia/hora (mantém duração), mover coluna (para "Concluído" conclui), reordenar (`antesDe`), adiar alerta (soneca, por pessoa), "Limpar" concluídos, subtarefas (marcar/renomear/excluir/mover entre compromissos), ligações do mapa mental (`relacoes`, rótulo ≤40).

### 2.4 Listas = grupos (`telas.js` ~l.860-960)
- Campos: **Nome** (≤40, obrigatório), **Cor** (9 cores fixas, só `#rrggbb`), **Ícone** (lista, pessoas, operação, carrinho, loja, estrela, coração, casa, maleta, pão, caminhão, dinheiro), **Membros do grupo** → **Quem entra no grupo**: "Escolhidos à mão" ou **"Quem tem acesso a <Área>"** (áreas do catálogo `GET /api/acessos/catalogo` — áreas de permissão: Lançamentos, Caixa, Transferências, Compras, Produção, Pessoas, Relatórios, Configurações) + "Escolher membros". Dono entra sempre.
- Ordenação: Manual / Data / Criação / Prioridade / Título (dono ou admin grava para todos; outros só na própria tela).
- Excluir lista só **vazia** ("compromisso nunca some junto com a lista"). Lista do sistema **"Tarefas das telas"** (id `lista-tarefas-das-telas`): dona = primeiro administrador ativo, membros = todas as contas ativas.

### 2.5 Kanban, Calendário, Mapa mental, Desempenho
- **Kanban** (`kanban.js`): colunas da empresa (`agenda_colunas`, nome ≤30) + "Concluído" fixa.
- **Calendário** (`calendario.js`): mês/semana/dia; ocultar listas é preferência do aparelho.
- **Mapa mental** (`mapa-mental.js`, `mapa-layout.js`): agrupar por Lista/Data/Responsável/Prioridade/Coluna/Etiqueta; ligações entre compromissos.
- **Desempenho** (`rotina.js`): período (Este mês, Mês passado, Últimos 7 dias ou datas); por pessoa: % no prazo, No prazo, Fora do prazo, Não feitas, Em aberto, Resposta média (h), Fora do expediente (min + dias de folga). "No prazo = concluído até o término (sem término, até o fim do dia)". Cada um vê o seu; admin vê todos. Hora fora do expediente é **só relatório, não vai para a folha**.
- **Alertas** (`alertas.js`): cartão na tela na hora do alerta (não aparece com mais de 12 h de atraso).

### 2.6 Chat, grupos de conversa e arquivos (`conversa.js`)
- Chat do compromisso: `GET/POST /api/agenda/compromissos/:id/mensagens`, leitura `POST …/leitura`, não lidas `GET /api/agenda/chat/nao-lidas`. Quem participa vê.
- Chat do grupo (lista): `GET/POST /api/agenda/grupos/:id/mensagens`, `…/leitura`, `GET /api/agenda/grupos-chat/nao-lidas`.
- Arquivos: até **10 MB** cada (imagem, PDF, Word, Excel, PowerPoint, TXT, CSV), enviados em base64 (`POST …/arquivos`); guardados **no banco** (`agenda_arquivos.conteudo bytea`, com `sha256`); papel "material" (gestor/editor) ou **"evidência"** (responsável). Download `GET /api/agenda/arquivos/:id`; excluir se `podeExcluir`.

### 2.7 Configurações da Agenda (`rotina.js`)
- **Menu**: Agenda · Atividades → Configurações da Agenda. Precisa estar conectado.
- "A sua Agenda": Expediente, Fora do expediente, Sair sozinho (cada pessoa vê a própria regra).
- Só **administrador** vê "Pessoas" e edita ("Agenda de <nome>", "Salvar configuração"):

| Campo | Tipo | Regra |
|---|---|---|
| Colaborador do cadastro | Seletor de colaboradores **do aparelho** (`CicluzPeople.selectable()`; o cadastro não vai ao servidor) | Liga conta ↔ colaborador **por id** (`PUT /api/agenda/expedientes/contas/:usuarioId` → `perfis_usuarios.colaborador_id`). Com colaborador, o expediente vem dos **Horários/Escalas**. |
| Dias do expediente | Chips Seg…Dom | Obrigatório se há horário. |
| Início do expediente / Fim do expediente | Hora | Os dois ou nenhum; fim > início. |
| Fora do expediente | Pode usar fora do expediente / Só no expediente (bloqueia fora dele) | Não pode bloquear a própria. Bloquear exige expediente ou colaborador. Bloqueado: Agenda e chat não abrem (`403 AGENDA_FORA_EXPEDIENTE`). |
| Sair sozinho por tempo parado | Sim, depois do tempo parado / Nunca sai sozinho | `sai_por_tempo_parado` (migration 0011). Posto do caixa nunca sai. |
| Sair do sistema depois de quantos minutos parado | Número 1–480 | Vazio = padrão **15 min**. |
- **Escalas → servidor** (`enviarEscalas`): o aparelho que tem a escala (iPad) calcula com `CicluzJornada.dayInfo/shiftFor` de −31 a +62 dias, para colaboradores ligados a contas, e manda só `{dia, trabalha, inicio, fim}` (`PUT /api/agenda/expedientes` → `expedientes_colaboradores`). Quem pode: admin ou `pessoas_editar`. Sem nome, sem anotação (P-11).
- **Tempo parado** (sistema todo): a tela sai sozinha (aviso 1 min antes); o servidor também encerra a sessão parada além do tempo + 2 min (`auth/atividade.ts`, tabela `sessoes_atividade`).

### 2.8 Tarefas criadas por telas (`rotina.js` + `servidor/api/src/agenda/rotina.service.ts`)
| Gatilho | `vinculoRef` | Quem recebe | Fecha quando |
|---|---|---|---|
| Pedido de compra agendado chega na hora (Compras) | `compras:oc:<ocorrenciaId>` | Responsável do agendamento | Pedido enviado (`concluirPorVinculo`) |
| Pedido de produção agendado chega na hora | `producao:pp:<pedidoId>` | Responsável do agendamento | Pedido enviado à produção |
| Pedido de produção enviado | `producao:lancar:<pedidoId>` → tela MER - Mapa de Produção | **Todas as contas ativas com `producao_lancar`** (`paraQuemTem`); quem dispara precisa ter a permissão | Pedido fica pronto; sai se cancelado |
| Período de Teste registrado | `pessoas:integracao:<colaboradorId>` → DES - Período de Teste, subtarefas "Conferir documentos", "Entregar uniforme", "Treinamento/integração" | Contas com `pessoas_editar` | Manual |
- Uma tarefa por referência (dois aparelhos não duplicam). Gestor = dono da lista "Tarefas das telas". Responsável recebe ver+concluir. Ids que começam com `u-` (pessoas de teste) não geram tarefa. Nasce mesmo fora do expediente de quem disparou.

### 2.9 Transferência da Agenda antiga (`transferencia.js`)
- Só **administrador**: prévia (`GET /api/agenda/transferencia`) com contagens (Listas, Compromissos, Concluídos, Avaliações, Ligações do mapa, Subtarefas), escolha do **Gestor dos compromissos sem criador**, pendências, órfãos do chat, perdidos em conflito; "Levar a Agenda para o servidor" (`POST /api/agenda/transferencia` com `documentoVersao` e `gestorSemCriador`). Só libera se "a soma fecha". O servidor lê o documento, confere a contagem e **não apaga** o documento (`agenda_transferencias` guarda o registro).

---

## 3. CONFIGURAÇÕES (`dist/acessos/*`)

Menu (`index.html`): `['Configurações', ['Empresa','Permissões','Usuários','Senhas','Diversos','Design System']]`. Cartões em `acessos/modulo.js`. Caminho das telas: `Configurações / <setor> / <título>`. Diálogos que gravam na API usam `dialogoApi` (fecha só quando o servidor confirma; erro em português via `mensagemErro`). Contexto de cada tela: `GET /api/sessao` + `GET /api/acessos/catalogo` (relidos a cada abertura).

### 3.1 Empresa → Dados da Empresa (`empresa.js`)
- **Guarda**: `cicluz-compras-v1` → `dados.empresas[]` (lista; a ficha única antiga `dados.empresa` é lida como Matriz e migra na 1ª gravação). Sobe ao servidor como parte do documento do Compras.
- Várias empresas; a **Matriz** primeiro. Três etapas: Dados da empresa · Dados dos responsáveis legais · Revisão (com dados gravados abre na Revisão, só leitura; "Editar" libera).
- **Dados da empresa**: **Tipo de vínculo com a matriz \*** (Matriz, Filial, Empresa do mesmo grupo, Franquia, Loja parceira, Associado), **CNPJ \*** (válido, 14 dígitos, único entre as empresas; busca pública de CNPJ só preenche o vazio), **Razão Social \***, **Nome Fantasia \***, **Regime tributário \*** (MEI, Simples Nacional, Lucro Presumido, Lucro Real, Imune / Isenta, Não informado). Endereço: **CEP \*** (8 dígitos; busca CEP), **Rua / logradouro \***, **Número \***, Complemento, **Bairro \***, **Cidade \***, **UF \***.
- **Responsáveis legais** (opcionais, vários): Cargo na empresa (Proprietário, Sócio-proprietário, Diretor não sócio, Procurador), Nome completo, CPF (válido se preenchido), RG, Órgão emissor, Nacionalidade, Estado civil (lista), Profissão, WhatsApp (DDD+número), E-mail, endereço completo, Data de nascimento; **Representação legal** (menor de 16 → representado; 16–18 → assistido; interditado → curador; espólio → inventariante): Motivo \*, representantes (Vínculo, Nome completo \*, CPF, RG, …, Documento que comprova, Número do processo, Validade). Filial pode usar "responsáveis da Matriz".
- Excluir: a Matriz só depois das outras; empresa em uso (contrato) não exclui.
- **Estrutura de Dados da Empresa**: cartão "Em definição" — tela vazia, **não grava nada**.

### 3.2 Diversos → Salário Mínimo Vigente (`salario-minimo.js`)
- **Guarda**: `cicluz-compras-v1.salariosMinimos[]` = `{ id:'sm-…', ano, valorCentavos (inteiro), inicio, fim, criadoEm/atualizadoEm }`.
- Campos ("Dados do salário mínimo"): **Ano de referência \*** (4 dígitos), **Valor (R$) \*** (máscara de dinheiro, guardado em centavos), **Início da vigência \***, Fim da vigência (previsto). Validação em `compras/dominio.js` (`validarSalarioMinimo`).
- **Vigente** = o de início mais recente que não seja depois de hoje. Passado o fim previsto sem valor novo → alerta (o anterior continua valendo). Lista com estado Vigente/Futuro/Anterior. É a base dos contratos com "Referência do salário mínimo"; mudar aqui **não altera contrato já gravado**. O valor é digitado (o sistema não busca em lugar nenhum).

### 3.3 Usuários → Pessoas com Acesso (`usuarios.js`) — **API**
- Acesso: `usuarios_visualizar` ou `usuarios_gerenciar` (editar só com `usuarios_gerenciar`). Dados: `GET /api/usuarios`, `GET /api/cargos-acesso`.
- Lista: busca "Buscar nome, e-mail ou cargo"; chips **Todas · Pessoas · Postos do Caixa · Sem Acesso**; etiquetas Sem acesso / PDVn · Turno / Administrador / cargos / **"Acesso de antes"** (conta legada) / "Sem cargo · não acessa nada". Botão "Novo usuário".
- **Postos do Caixa**: grade **PDV1–PDV4 × Manhã/Tarde** (8 postos); uma conta por posto; operador não escolhe PDV nem turno.
- **Formulário** ("Cadastro usuário" / "Editar <nome>"):

| Campo | Tipo | Regra |
|---|---|---|
| Tipo de conta | Chips Pessoa / Posto do caixa | — |
| PDV / Turno (posto) | Seletor PDV1..4 / chips Manhã-Tarde | Posto ocupado é recusado; nome automático "PDVn · Turno". |
| **Colaborador** | Seletor de colaboradores (`CicluzHierarquia.pessoas()`, ativos) | **Obrigatório para pessoa não-admin** ("Escolha o colaborador dono desta conta."); exceção: conta antiga sem colaborador. Grava `colaboradorId`. Antes de gravar com colaborador chama `PUT /api/acessos-por-tela/sincronizar`. |
| Nome | Texto (≥2, máx. 120) | — |
| E-mail (só nova) | E-mail | Formato válido. |
| Senha inicial (só nova) | Senha com "Mostrar" | ≥ **8** (fora de produção) / **10** (produção), vindo do catálogo. |
| Papel (só admin, não para si) | Usuário / Administrador | Só admin cria/altera admin. |
| Cargos de acesso | Chips (vários) | Sem cargo = entra mas não acessa nada; admin ignora cargo. |
| Acesso ao sistema (edição, não para si) | Entra no sistema / Sem acesso | Sem acesso: sai dos aparelhos na hora; nada é apagado. |
- Gravação: `POST /api/usuarios` ou `PATCH /api/usuarios/:id` (só o que mudou). Auditoria em `usuarios_auditoria`.
- **Não há tela para criar/editar cargos de acesso** no site (rotas `POST/PATCH /api/cargos-acesso`, `POST /api/cargos-acesso/sugeridos` e exceções `GET/PUT /api/usuarios/:id/acessos` existem só na API).

### 3.4 Usuários → Dados no Servidor (`dados.js`) — só administrador
- Lê `GET /api/projecoes`; mostra por assunto (Financeiro, Contas, Cargos, Salários por vigência, Ficha de cargos, Áreas/setores/locais, Organograma, Ícones e cores próprios): "Sem dados ainda" / "Em dia" / "Precisa de correção" + mensagem.

### 3.5 Senhas (`senhas.js`) — **API**
- **Minha Senha**: Senha atual, Nova senha (≥ mínimo), Repita a nova senha → `POST /api/auth/change-password` com `revokeOtherSessions: true` (os outros aparelhos saem). Limite de 10 tentativas/15 min por sessão.
- **Senha de Outra Pessoa** (só administrador): Pessoa (seletor), Nova senha → `POST /api/usuarios/:id/senha`; a pessoa sai de todos os aparelhos.

### 3.6 Permissões → Acesso por Tela (`telas.js`, `telas-dados.js`, `dist/hierarquia.js`, `dist/hierarquia-dominio.js`)
- **Status real**: o cabeçalho de `telas.js` ainda diz "ESBOÇO… SEM backend: nada é gravado" — **desatualizado**. Hoje: grava no aparelho em `cicluz-acessos-telas-v1` (via `CicluzHierarquia.salvarConfig`) e **vai ao servidor** só por `PUT /api/acessos-por-tela/sincronizar`, que hoje é chamado **apenas ao salvar uma conta com colaborador em Pessoas com Acesso** (`usuarios.js → enviarAcessos`). Exige `permissoes_gerenciar`. A chave **não** está em `CHAVES_SINCRONIZADAS`.
- **Matriz**: linhas = todas as telas do menu, lidas na hora de `window.CicluzMenu` (grupo › seção › tela; chave = alvo do cartão). Tela nova no menu aparece **desligada** com etiqueta "Novo".
- **Colunas** (abertas com "+"; hierarquia **Área › Cargo › Colaborador**, a área vem primeiro): **Área** (nós de DES - Área / Setor / Local, `cicluz-location-tree-v1`, ativos), **Cargo** (só cargos ligados às áreas escolhidas; id `ÁREA|CARGO`), **Colaborador** (só pessoas desses cargos/áreas). Primeira escolha: tudo ligado para as telas que existem agora.
- **Oito interruptores por tela**: ← Lançar (`lan`), ← Discriminar (`dis`), ← Editar antes de pagar (`edA`), ← Visualizar antes de pagar (`veA`), ↔ Pagar (`pag`), → Editar depois de pagar (`edD`), → Visualizar depois de pagar (`veD`), **! Ações especiais** (`esp`, começa desligado) que abre as ações de `telas-dados.js`: Lançamentos (editar pago, recorrência, cancelar série, pagamento retroativo), Caixa (sangria, monitorar, conferir fechamento), Transferências e lacres (confirmar lacre, gerenciar lacres), Compras (cotar, aprovar, receber), Pessoas e DP (cargos e salários), Administração (ver pessoas, gerenciar usuários, gerenciar permissões — sensíveis).
- **Formato salvo**: `cicluz-acessos-telas-v1 = { version:1, configs:{ 'area:ID' | 'cargo:ÁREA|CARGO' | 'pessoa:ID': { telas:{ chaveDaTela:[perms] }, acoes:[...], conhecidas:[...] } }, atualizadoEm }`.
- **Regra de prevalência** (`resolverConfig`, 24/11/2026): **a mais específica vence** — pessoa → cargo (configurado numa área) → área; dentro de um nível vale a área mais próxima subindo a cadeia (local → setor → área); pessoa em várias áreas → **soma** (permissões maiores). `podeUsar`: precisa de cargo (`jobKey`) e de configuração que libere ao menos uma tela/ação.
- **Efeito no login (servidor)**: conta **ligada a colaborador** e não-administrador → `exigirAutenticacao` chama `conferirPermissaoDaConta`; sem permissão → **403 `NO_PERMISSIONS`** ("Você ainda não tem permissões liberadas…"). Conta sem colaborador (admin, posto, conta antiga) segue o modelo de cargos de acesso. **As 8 permissões por tela ainda não são aplicadas tela a tela** (o servidor só usa para "pode ou não entrar"; não confirmado nenhum bloqueio por tela).

### 3.7 Design System (`design-system.js`) e Conferência Final (`ds-conferencia.js`)
- 16 cartões (só leitura, nada é gravado): Formulário linha por linha (padrão da Transferência), Letras, Tamanho das Letras, Cores, Espaçamento, Ícones, Cabeçalho e Barra de Baixo, Botões, Campos de Preenchimento, Máscaras, Quadros e Molduras, Listas, Menu e Cartões, Janelas e Painéis, Mensagens e Avisos, **Conferência Final**. Amostras vivas feitas com as peças reais (`CicluzComprasUI`, `CicluzTransferencias.pecas`). A regra escrita continua em `DESIGN_SYSTEM.md`.
- **Conferência Final**: rotina que abre as telas de um ROTEIRO, toca no botão de cadastro e fecha (Cancelar), medindo regras: cabeçalho com título e caminho; sem rolagem horizontal; janela com Cancelar/Salvar (40 px); linhas de formulário 52 px; sem rádio solto; rótulo 15 px peso 500; bloco de documento sem fio lateral; ícone de identificação quadrado e botão redondo; botão redondo/chip/chave parados no mesmo cinza; explicação da lista dentro do quadro; sem vão vazio; texto espremido… Não salva nada.

---

## 4. LIGAÇÕES POR ID

### 4.1 Ficha técnica ↔ produto ↔ ingrediente ↔ estoque ↔ patrimônio ↔ cargo
```
Produto do Compras (cicluz-compras-v1 / tabela produtos no modo servidor)  id
  └─ producao.produtos[].produtoId  (1 configuração por produto)
       ├─ formato.utensilioId ───────────────► patrimonio.bens[].id (utensílio UTS)
       └─ localEstoqueId ────────────────────► nó de cicluz-location-tree-v1
  └─ producao.fichas[].produtoId (N fichas; uma 'padrao')
       └─ etapas[].localId ──────────────────► nó Área›Setor›Local
       └─ etapas[].ingredientes[].produtoId ─► produto do Compras (custo, unidade, saldo)
       └─ etapas[].recursos[].patrimonioId ──► patrimonio.bens[].id (capacidade → lotes; energia/consumoHora → C3)
       └─ etapas[].recursos[].cargoKey + cargoNome ─► cargo de DES - Cargos C/Salários (jobsCurrent: 'ref:N' ou 'local:N'); resolve pela chave conferindo o nome, senão pelo nome; salário = campo "valor" da ficha do cargo (C2)
producao.ingredientes[].tacoCodigo ─► código da Tabela TACO (oficial embutida ou cicluz-taco-v1)  [NÃO ligado às fichas]
patrimonio.bens[]: localId (Área›Setor›Local), grupoRetId/subgrupoRetId (RET - Grupos de Retiradas), utensiliosIds[], vinculados[], responsaveis[].colaboradorId (colaborador do cadastro), pecas[].fornecedorId (fornecedor do Compras), pecas[].grupoDespesaId/subgrupoDespesaId (DES - Grupos de Despesas)
```
- **Fragilidade observada**: na Produção a chave de cargo criado localmente é `local:<índice>` (`dados.js` usa `x.key`), que depende da ordem da lista; a hierarquia (`hierarquia.js`) usa o `id` próprio do cargo (`entry.j.id`). Mitigado por guardar também o nome. Não confirmado se há migração.
- **Estoque**: o saldo continua no documento do Compras (`cicluz-compras-v1`, estado por produto `saldo`), mesmo com o catálogo de produtos no servidor (`produtos-api.js` mantém `saldo` fora do servidor). Movimentos da Produção em `compras.movimentos[]`: `consumo_producao` (baixa dos ingredientes ao ficar pronta, marcada com `ordemProducaoId`), `entrada_producao` (produto com estoque), `saida_abastecimento` e `sobra_retorno` (marcados com `producaoPedidoId`). Ingrediente sem conversão → `ordens[].pendenciasEstoque`.

### 4.2 Pedido da loja ↔ ordem de produção ↔ abastecimento
```
agendas[].id ──► ocorrencias[].agendaId (previsto) ──► pedidos[].id (origem 'agendamento', status 'rascunho')
pedido extra (origem 'extra') / reposição (sem pedido, origem 'reposicao', aprovadoPor)
pedidos[].id ──► ordens[].pedidoId (1 por produto, fichaId = ficha padrão, cópia do plano)
ordens prontas (todas) ──► pedido 'pronto' ──► abastecer (real, conferenteId) ──► 'conferencia_loja' (recebido, conferenteLojaId ≠ conferenteId) ──► 'abastecido' ──► fecharFolha (sobra, descarte, fechadoEm)
responsavelId / conferenteId / conferenteLojaId / aprovadoPor ──► id da CONTA (usuário do servidor, via GET /api/agenda/pessoas)
Agenda: vinculoRef 'producao:pp:<pedidoId>' e 'producao:lancar:<pedidoId>'
```

### 4.3 Compromisso ↔ pessoa/usuário ↔ tela vinculada
- `agenda_compromissos.gestor_id` = conta que criou (gestor). `agenda_participantes(usuario_id, responsavel, ver, editar, concluir, excluir)` = contas (`perfis_usuarios.usuario_id`, mesma empresa).
- `agenda_compromissos.grupo_id` → `agenda_grupos.id`; membros em `agenda_grupo_membros` (origem manual ou por **área de permissão** `agenda_grupos.area`).
- Tela vinculada: `vinculo_tela` (endereço `#/…` do roteador `rotas.js`), `vinculo_titulo`, `vinculo_ref` (único por tarefa de tela).
- Conta ↔ colaborador: `perfis_usuarios.colaborador_id` (id do colaborador no aparelho) → expediente em `expedientes_colaboradores` e permissão em `colaboradores_acesso` / `acessos_por_tela`.

### 4.4 Usuário ↔ cargo de acesso ↔ permissão por tela ↔ área › cargo › colaborador
Dois modelos convivem:
1. **Cargos de acesso (servidor, aplicado nas rotas)**: `user`/`perfis_usuarios` → `usuarios_cargos_acesso` → `cargos_acesso` → `cargos_acesso_permissoes(permissao)`; exceções por pessoa em `usuarios_permissoes(permitido)`. Resolução (`shared/src/acessos.ts → resolverPermissoes`): administrador = tudo; conta **legada** (`acessos_configurados_em` nulo) = tudo menos o que era só do admin; senão soma dos cargos ativos e a exceção vence. "Cargo de acesso" **não é** o cargo do DP.
2. **Acesso por Tela (Área › Cargo › Colaborador)**: área = nó de `cicluz-location-tree-v1` (guarda `cargoIds`); cargo = id do cargo de DES - Cargos C/Salários (`ref:N` ou id próprio); colaborador = pessoa do cadastro com `jobKey` (id do cargo) e `orgUnitIds` (áreas; sem nenhuma, vale toda área que tem o cargo). Migração única `cicluz-hierarquia-v1` pôs `jobKey` pelo nome do cargo (só quando há um cargo com o nome) e copiou vínculos das Fichas de Cargos. No servidor: `colaboradores_acesso(id, nome, cargo_id, area_ids, ativo)` + `acessos_por_tela(chave, config)` + linha especial `estrutura:areas` (pais da árvore). Login de conta com colaborador depende disso.

---

## 5. BACKEND (`servidor/`)

### 5.1 Tecnologias e estrutura
- Monorepo npm workspaces (`servidor/package.json`): **shared** (Zod, contratos e regras), **db** (Drizzle ORM 0.45 + drizzle-kit, PostgreSQL, migrations SQL), **api** (Fastify 5, better-auth 1.6, `@fastify/cors`, `helmet`, `rate-limit`, `static`; roda com `tsx`), **web** (Nuxt 4 + Vue 3 + Vuetify 3, gerado estático e servido em `/app/`; páginas `index.vue` e `lancamentos/vendas.vue`), **tests** (Vitest; integração com banco de teste/Testcontainers — `tests/integracao/*`, unidade `tests/unidade/*`).
- Node 24 (Dockerfile `node:24-alpine`), porta 4200, healthcheck `/health`. Deploy: **Coolify** (`docker-compose.coolify.yml`: serviço `migrate` roda `npm run migrar` + `projecoes:reprocessar`, depois `api`); Postgres é recurso do Coolify; site estático no **Vercel**, que repassa `/api/*` e `/app/*` para a API (cookie fica do domínio do site). Local: `docker-compose.db.yml` (Postgres em `localhost:5545`), `SERVIR_SITE=1` faz a API servir `dist/`.
- Variáveis (`api/src/env.ts`, nomes apenas): `NODE_ENV`, `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32; em produção não pode ser o de desenvolvimento), `AUTH_BASE_URL`, `WEB_ORIGINS` (https em produção), `PORT`, `HOST`, `SERVIR_SITE`, `PROXIES_CONFIAVEIS` (Vercel→Traefik = 2), `S1_VENDAS_URL/TOKEN/EMPRESA_ID` (vendas dos PDVs lidas do Sistema Pralis), `TNP_EXTRATO_URL/TOKEN/EMPRESA_ID` (extrato Open Finance).
- Regras reutilizadas no site são **geradas** do shared: `dist/agenda/regras.js` (de `shared/src/agenda/regras.ts`, script `scripts/gerar-regras-agenda.mjs`) e regras de lançamentos (`scripts/gerar-regras-lancamentos.mjs`).

### 5.2 Módulos da API (`servidor/api/src/`)
`auth` (login, sessão, guardas, permissões, atividade), `usuarios`, `acessos` (catálogo, cargos de acesso, exceções), `acessos-por-tela`, `documentos` (sincronização do localStorage), `projecoes` (tabelas derivadas por assunto), `consultas` (leitura das projeções), `lancamentos` (Despesas/Mercadorias/Retiradas — fonte da verdade no banco), `produtos` (catálogo), `agenda` (compromissos, grupos, colunas, chat, arquivos, rotina, regras, transferência), `vendas-pdv`, `comandas-creare`, `extrato-tnp` (integrações de leitura), `saude`, `scripts` (`criar-usuario.ts`, `reprocessar-projecoes.ts`).

### 5.3 Rotas
| Grupo | Rotas |
|---|---|
| Saúde | `GET /health` |
| Auth | `GET/POST /api/auth/*` (better-auth: `sign-in/email`, `sign-out`, `change-password`…), `GET /api/sessao` (perfil + `chavesSincronizadas` + `chavesAdotadas`) |
| Documentos | `GET /api/documentos`, `GET /api/documentos/versoes`, `PUT /api/documentos` (lote), `POST /api/documentos/importacao`, `POST /api/documentos/copias` |
| Usuários | `GET /api/usuarios`, `POST /api/usuarios`, `PATCH /api/usuarios/:id`, `POST /api/usuarios/:id/senha` |
| Acessos | `GET /api/acessos/catalogo`, `GET/POST /api/cargos-acesso`, `POST /api/cargos-acesso/sugeridos`, `PATCH /api/cargos-acesso/:id`, `GET/PUT /api/usuarios/:id/acessos` |
| Acesso por Tela | `GET /api/acessos-por-tela`, `PUT /api/acessos-por-tela/sincronizar` |
| Consultas/projeções | `GET /api/projecoes`, `POST /api/projecoes/reprocessar`, `GET /api/financeiro/{grupos,tipos-venda,bandeiras,operadoras,taxas}`, `GET /api/contas`, `GET /api/cargos`, `GET /api/salarios/vigentes`, `GET /api/locais`, `GET /api/organograma`, `GET /api/ficha-de-cargos` |
| Lançamentos | `GET/POST /api/lancamentos/:categoria`, `GET/PUT /api/lancamentos/item/:id`, `PATCH /api/lancamentos/item/:id/discriminar`, `PATCH /api/lancamentos/series/:id/cancelar` |
| Produtos | `GET /api/produtos`, `GET /api/produtos/resumo`, `GET /api/produtos/item/:id`, `POST /api/produtos`, `PUT /api/produtos/item/:id`, `POST /api/produtos/{importacao,transferencia,revincular}` |
| Agenda — leitura/compromissos | `GET /api/agenda` (ETag/304), `GET/PUT/PATCH/DELETE /api/agenda/compromissos/:id`, `POST /api/agenda/compromissos`, `POST …/:id/conclusao`, `PUT …/:id/subtarefas/:subId`, `POST /api/agenda/limpar-concluidos`, `POST …/:id/avaliacoes`, `PUT/DELETE …/:id/adiamento` |
| Agenda — grupos/colunas/relações | `GET /api/agenda/pessoas`, `POST /api/agenda/grupos`, `PUT/DELETE /api/agenda/grupos/:id`, `GET/PUT /api/agenda/grupos/:id/membros`, `POST /api/agenda/colunas`, `PUT/DELETE /api/agenda/colunas/:id`, `POST /api/agenda/relacoes`, `PATCH/DELETE /api/agenda/relacoes/:id` |
| Agenda — chat/arquivos | `GET/POST /api/agenda/compromissos/:id/mensagens`, `POST …/leitura`, `GET /api/agenda/chat/nao-lidas`, `GET/POST /api/agenda/compromissos/:id/arquivos`, `GET/DELETE /api/agenda/arquivos/:id`, `GET/POST /api/agenda/grupos/:id/mensagens`, `POST /api/agenda/grupos/:id/leitura`, `GET /api/agenda/grupos-chat/nao-lidas` |
| Agenda — rotina | `GET /api/agenda/configuracoes`, `GET /api/agenda/configuracoes/minha`, `PUT /api/agenda/configuracoes/:usuarioId`, `GET /api/agenda/desempenho?de&ate`, `POST /api/agenda/tarefas-de-tela`, `POST …/tarefas-de-tela/concluir`, `POST …/tarefas-de-tela/cancelar`, `GET /api/agenda/expedientes/contas`, `PUT /api/agenda/expedientes/contas/:usuarioId`, `PUT /api/agenda/expedientes` |
| Agenda — transferência | `GET /api/agenda/transferencia`, `POST /api/agenda/transferencia`, `POST /api/agenda/transferencia/aparelho` |
| Integrações | `GET /api/vendas-pdv{,/situacao,/opcoes,/totais}`, `GET /api/comandas-creare{,/situacao,/opcoes,/indicadores,/:idComanda}`, `GET /api/extrato-tnp{,/situacao}` |
| App novo | `/app/*` (Nuxt estático, SPA) |

### 5.4 Tabelas e colunas principais (schema em `servidor/db/src/schema/*.ts`)
- **Autenticação (better-auth)**: `user(id, name, email único, emailVerified…)`, `session(id, token, expiresAt, ipAddress, userAgent, userId)`, `account(userId, providerId, password hash…)`, `verification`; `sessoes_atividade(sessao_id, ultima_interacao_em)`.
- **Cadastro**: `empresas(id uuid, nome único, ativo, dados_importados_em)`; `perfis_usuarios(usuario_id PK→user, empresa_id, nome, papel 'administrador'|'usuario', ativo, posto_pdv 1–4, posto_turno 'manha'|'tarde' (único por empresa), acessos_configurados_em, colaborador_id (único por empresa))`; `usuarios_auditoria(ator_id, alvo_id, acao criou/alterou/definiu_senha/alterou_acessos, detalhe)`; `colaboradores_acesso(id texto = id do aparelho, empresa_id, nome, cargo_id, area_ids[], ativo)`; `expedientes_colaboradores(empresa_id, colaborador_id, dia, trabalha, inicio, fim)`.
- **Acessos**: `cargos_acesso(id, empresa_id, nome único sem caixa, descricao, ativo)`, `cargos_acesso_permissoes(cargo_id, permissao)`, `usuarios_cargos_acesso(usuario_id, cargo_id)`, `usuarios_permissoes(usuario_id, permissao, permitido)`, `cargos_acesso_auditoria`; `acessos_por_tela(empresa_id, chave, config jsonb, atualizado_por)`.
- **Documentos**: `documentos(empresa_id, chave, valor texto = string exata do localStorage, versao ≥1, atualizado_por)`; `documentos_historico(… tipo gravada/conflito/substituida_pelo_servidor/removida)` — só INSERT.
- **Projeções (derivadas dos documentos)**: `projecoes`; `fin_grupos`, `fin_tipos_venda`, `fin_bandeiras`, `fin_operadoras`, `fin_taxas`, `fin_transferencias`; `contas(nome, ordem, situacao ATIVA/INATIVA, documento DOC/F…)`; `cargos(chave 'ref:N'/'local:N', origem, nome, nome_reduzido, categoria, cbo, valor_ficha texto…)`; `salarios_vigencias(ordem, inicio)` + `salarios_valores(cargo_chave, cargo_nome, valor_reais numeric(14,4))`; `perfis_areas`, `perfis_requisitos`, `perfis_cargos`, `perfis_cargos_requisitos`; `locais`, `locais_transferencias`; `organograma_posicoes`, `organograma_versoes`; `icones_personalizados`, `cores_personalizadas`.
- **Lançamentos (fonte da verdade no banco)**: `lancamentos_recorrencias`, `lancamentos(categoria despesas/mercadorias/retiradas, datas, valor_original numeric(14,2), juros/desconto, conta_nome, grupo_id/nome, recorrência…)`, `lancamentos_itens`.
- **Produtos**: `produtos(empresa_id, id, codigo_interno único, codigo_barras, nome, descricao, marca, tipo revenda/transformacao, status, liberado_compra, grupo_id, subgrupo_id, local_id, custo, margem, preco_venda, calculo_automatico, dados jsonb, app_id, versao…)`, `produtos_codigo(ultimo)`.
- **Agenda**: `agenda_estado(versao)`, `agenda_grupos(id, nome, cor, icone, ordenacao, ordem, dono_id, area, excluido_em, versao)`, `agenda_grupo_membros(grupo_id, usuario_id, origem)`, `agenda_colunas`, `agenda_compromissos(id, grupo_id, gestor_id, titulo, notas, url, local, local_lat/lng/aviso/raio, data, hora, hora_fim, repeticao_tipo/intervalo/unidade/dias_semana/fim_tipo/fim_data/fim_vezes/feitas/ancora, alerta_minutos, prioridade, sinalizado, etiquetas[], subtarefas jsonb, avaliacao_tipo, coluna_id, ordem, concluida, concluida_em/por, origem_id, ocorrencia, legado jsonb, vinculo_tela/titulo/ref, excluido_em, versao)`, `agenda_participantes`, `agenda_avaliacoes(avaliado_id, por_id, papel, tipo, valor, comentario)`, `agenda_adiamentos`, `agenda_relacoes(de_id, para_id, rotulo)`, `agenda_mensagens`, `agenda_chat_leituras`, `agenda_arquivos(papel, nome, tipo, tamanho ≤10 MB, sha256, conteudo bytea)`, `agenda_grupo_mensagens`, `agenda_grupo_leituras`, `agenda_config_pessoas(usuario_id, expediente_dias[], expediente_inicio/fim, fora_expediente, hora_fora, inatividade_minutos 1–480, sai_por_tempo_parado)`, `agenda_horas_fora`, `agenda_transferencias`.
- **Migrations** (`servidor/db/migrations/`): 0000_inicial · 0001_tabelas_por_assunto · 0002_lancamentos · 0003_agenda_chat_arquivos · 0004_cargos_acesso_e_postos · 0005_acesso_de_antes_explicito · 0006_produtos · 0007_agenda_tabelas · 0008_agenda_rotina · 0009_agenda_regras · 0010_colaboradores_e_acessos_por_tela (com rollback em `db/rollback/`) · 0011_agenda_nunca_sair.

### 5.5 Como o login funciona
1. `entrar.html`/`entrar.js` → `POST /api/auth/sign-in/email` (better-auth, e-mail + senha). Sem auto-cadastro (`disableSignUp`); conta nasce por `POST /api/usuarios` ou pelo script `npm run usuario:criar` (primeiro administrador/empresa). Sem redefinição por e-mail.
2. Cookie de sessão `httpOnly`, `sameSite=lax`, `secure` em produção; sessão de **12 h**, renovada a cada 1 h de uso. Sessão só abre se o perfil existe e usuário e empresa estão ativos.
3. Limites: 20 req/min por IP nas rotas `/api/auth/*`; **10 tentativas por e-mail a cada 15 min** (e por sessão na troca de senha); 300 req/min na API. IP real só pelos proxies declarados.
4. `GET /api/sessao` devolve o perfil (usuarioId, nome, papel, empresa, permissoes efetivas…) e a lista de chaves sincronizadas. Se a empresa ainda não fez a **importação inicial** (`dados_importados_em` nulo), o administrador escolhe enviar os dados do aparelho (`POST /api/documentos/importacao`); ninguém grava antes disso (`409 IMPORT_PENDING`).
5. Depois, `GET /api/documentos` hidrata o localStorage; o que o aparelho tinha de diferente vai para `POST /api/documentos/copias` (histórico). A aba fica marcada em `sessionStorage` (`cicluz-sync-aba`); sem ela, `cicluz-sessao.js` manda para o login.
6. Toda rota `/api/*` (exceto `/health` e `/api/auth/*`) exige sessão antes do handler (**default-deny**). Escrita só com `Origin` permitido (ou `Sec-Fetch-Site: same-origin`); só JSON.
7. Em cada pedido: confere **tempo parado** (padrão 15 min + 2 min de folga; posto nunca sai; "nunca sai" por pessoa) e, para conta ligada a colaborador e não-admin, a permissão do **Acesso por Tela** (403 `NO_PERMISSIONS`).
8. Permissões nas rotas: `exigirPermissao(perfil, chave)`; ninguém concede permissão que não tem (`exigirQuePossaConceder`). Catálogo em `shared/src/acessos.ts`: áreas lancamentos, caixa, transferencias, compras, producao, pessoas, relatorios, configuracoes; chaves com `aplicada: true` (já recusadas pela API): todas de lançamentos, `vendas_pdv_visualizar`, `extrato_bancario_visualizar`, `usuarios_visualizar`, `usuarios_gerenciar`, `permissoes_gerenciar`. As de caixa, transferências, compras, **produção** (`producao_visualizar`, `producao_lancar`), pessoas e relatórios ficam gravadas mas **as telas ainda não consultam** (exceção: `producao_lancar` e `pessoas_editar` são usadas para escolher quem recebe tarefas da Agenda; `pessoas_editar` para mandar escalas).
9. Cargos sugeridos (criados só a pedido): Caixa, Tesouraria, Gerência, Compras, DP, Financeiro, Diretor de Operações, Diretor Geral.

### 5.6 Como os dados do site sobem (sincronização de documentos)
- `cicluz-sessao.js` intercepta `localStorage.setItem/removeItem`: chave da lista `CHAVES_SINCRONIZADAS` entra na fila (`cicluz-sync-pendentes`, só nome e versão base) e sobe num **lote tudo-ou-nada** `PUT /api/documentos` com `versaoBase` da aba. Versão velha → **409** (`DOCUMENT_VERSION_CONFLICT`): o que chegou vai para o histórico e a aba pede para atualizar. 401: fica no aparelho até entrar de novo. Teto 4 MB por documento, 16 MB por lote.
- Cada gravação aceita reconstrói as **projeções** dos assuntos afetados (financeiro, contas, cargos, salários, ficha de cargos, locais, organograma, identidade).
- **Chaves sincronizadas** (documento JSON inteiro por empresa): `cicluz-financial-hierarchy-v1`, `cicluz-ti-groups-v1`, `cicluz-ti-account-details-v1`, `cicluz-cargos-v1`, `cicluz-cargos-referencia-v1`, `cicluz-salarios-vigencias-v1`, `cicluz-job-profiles-v1`, `cicluz-organogram-positions-v1`, `cicluz-location-tree-v1`, `cicluz-location-custom-colors-v1`, `cicluz-icon-library-v1`, `cicluz-custom-colors-v1`, `cicluz-compras-v1`, `cicluz-agenda-v1` (legado), `cicluz-producao-v1`, `cicluz-patrimonio-v1`, `cicluz-taco-v1`, `cicluz-prestadores-v1`, `cicluz-gp-config-v1`, `cicluz-exames-complementares-v1`, `cicluz-ocorrencias-matriz-v1`, `cicluz-uniformes-tipos-v1` + marcas de importação de seeds. "Adotadas do aparelho" (sobem na 1ª entrada se o servidor não tem): compras, agenda, producao, patrimonio, taco, prestadores, gp-config, exames, ocorrencias-matriz, uniformes-tipos.
- **Ficam fora de propósito**: preferências de tela; `cicluz-cadastro-completo-v1` (CPF, dados pessoais — depende da decisão LGPD P-11); `cicluz-ponto-v1`, `cicluz-folha-custos-v1`.

### 5.7 O que já usa o servidor × o que é só local (escopo deste raio-x)
| Assunto | Situação |
|---|---|
| Login, sessão, senhas, contas, postos, cargos de acesso | **Servidor** (tabelas próprias). |
| Agenda inteira (compromissos, listas, colunas, chat, arquivos, configurações, desempenho, tarefas de tela) | **Servidor** (tabelas próprias); cache offline só leitura. |
| Acesso por Tela | **Aparelho** (`cicluz-acessos-telas-v1`) + **servidor** só quando uma conta com colaborador é salva (`acessos_por_tela`, `colaboradores_acesso`); vale no login. |
| Expediente (escalas) | Calculado no aparelho, resultado no **servidor** (`expedientes_colaboradores`). |
| Produção (produtos da produção, fichas, parâmetros, ingredientes, agendamentos, pedidos, ordens) | **localStorage** `cicluz-producao-v1`, que **sobe como documento JSON** (sem tabelas próprias nem projeção; sem regra de servidor). |
| Tabela TACO importada | `cicluz-taco-v1` (documento). Oficial embutida no site. |
| Patrimônio (dados) | `cicluz-patrimonio-v1` (documento). **Imagens, documentos e áudio: IndexedDB, só no aparelho.** |
| Estoque/saldo e movimentos | Documento `cicluz-compras-v1`. |
| Produtos do Compras | Tabela `produtos` no servidor quando "modo servidor" ativo (resumo `cicluz-produtos-resumo-v1` no aparelho). |
| Empresa(s) e Salário mínimo | Dentro de `cicluz-compras-v1` (documento). |
| Design System / Conferência / Estrutura de Dados da Empresa | Só tela; nada gravado. |
| Agendador de pedidos de produção | **Só no aparelho**, quando alguém abre MER - Pedidos de Produção (não há tarefa agendada no servidor). |
| Colaboradores completos (CPF etc.) | Só aparelho (P-11); ao servidor vai só id, nome, cargo, áreas, situação. |

---

## 6. Pontos de atenção encontrados (para o assistente saber)
1. **Custo de mão de obra** usa o campo "valor" da ficha do cargo, não o salário por vigência — o texto da tela fala em "salário vigente".
2. **Ingredientes TACO não estão ligados às fichas** (pendência declarada no código).
3. **Acesso por Tela**: comentário "SEM backend" desatualizado; as 8 permissões por tela **não bloqueiam telas** ainda — só decidem se a conta com colaborador entra. Sincronização só acontece pelo salvar em Pessoas com Acesso.
4. **Permissões de Produção** (`producao_visualizar`, `producao_lancar`) não são conferidas nas telas de Produção (aplicada = false); `producao_lancar` só seleciona quem recebe "Lançar a produção" — e quem envia o pedido precisa tê-la, senão a tarefa não nasce (erro silencioso na tela).
5. Chave de cargo `local:<índice>` na ficha técnica pode desalinhar se a lista de cargos locais mudar de ordem (o nome guardado ajuda a reencontrar).
6. Agendador de produção e lançamento de estoque rodam no navegador; dois aparelhos podem processar — protegido por `ocorrencias` e pela marca `ordemProducaoId` nos movimentos.
7. Não há tela no site para criar/editar **cargos de acesso** nem **exceções por pessoa** (só API).
8. Arquivos do patrimônio ficam só no aparelho que os cadastrou.
