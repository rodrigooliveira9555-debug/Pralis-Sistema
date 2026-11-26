# 04 — Dados e código

## Persistência

**Desde 03/11/2026 (branch `feat/backend-login-20261103`):** as chaves de negócio abaixo são guardadas no banco, por empresa, com versão e histórico (lista fechada em `servidor/shared/src/documentos.ts`). O `localStorage` continua sendo onde as telas leem e gravam; `dist/cicluz-sessao.js` envia cada gravação ao servidor. Preferências de tela e o cadastro completo ficam só no aparelho (P-11).

### Chaves `localStorage` (prefixo `cicluz-`)

**Dados de negócio**
- `financial-hierarchy-v1` — todos os grupos financeiros (VND/DES/MER/RET, tipos, bandeiras,
  operadoras+taxas)
- `ti-groups-v1`, `ti-account-details-v1` — contas (CNT)
- `cargos-v1`, `cargos-referencia-v1` (overrides dos 32 de referência), `salarios-vigencias-v1`,
  `job-profiles-v1`
- `location-tree-v1` (`{tree, history}`), `organogram-positions-v1`, `cadastro-completo-v1`
- `icon-library-v1`, `custom-colors-v1`
- `compras-v1` — módulo Compras inteiro num documento (fornecedores, produtos com foto, agendas,
  cotações, pedidos, estoque, conferências). No banco desde 04/11/2026 (Zé). Regras: o Compras só grava
  quando algo muda (cada gravação vira versão); foto reduzida a 320 px (teto de 4 MB por documento); sem
  documento no banco, o primeiro aparelho manda os dados de exemplo (decisão do Zé). Chave **adotada do
  aparelho**: na entrada, se o banco não tem e o aparelho da mesma empresa tem, ele envia o dele em vez de
  apagar (`CHAVES_ADOTADAS_DO_APARELHO`, só para chave que a tela nunca apaga).
- **Agenda — no servidor, em tabelas** (branch `feat/agenda-servidor`, 23/11/2026; ainda NÃO publicada; plano
  `docs/AGENDA_NO_SERVIDOR_PLANO.md`). Migration `0007_agenda_tabelas`: `agenda_grupos` (as "Minhas listas", com dona e
  membros em `agenda_grupo_membros`), `agenda_colunas`, `agenda_compromissos` (um registro por compromisso, `versao` por
  compromisso, excluir = esconder), `agenda_participantes` (pessoa = conta da mesma empresa, com ver/editar/concluir/excluir),
  `agenda_avaliacoes` (não muda nem some: trigger), `agenda_adiamentos` (soneca por pessoa), `agenda_relacoes` (mapa
  mental), `agenda_transferencias` (registro de cada transferência) e `agenda_estado` (contador para "mudou algo?").
  A permissão é conferida no servidor; a tela recebe só o que a pessoa vê, com `acesso` pronto. Gestor = quem criou
  (`gestor_id`, que a tela chama de `criadoPor`).
  Regra escrita uma vez: `servidor/shared/src/agenda/regras.ts` → cópia gerada `dist/agenda/regras.js`
  (`node servidor/scripts/gerar-regras-agenda.mjs`; um teste falha se divergir); `dist/agenda/dominio.js` a reexporta.
  Única porta da tela: `dist/agenda/dados.js` (cliente da API; gravar devolve Promise; atualiza ao abrir, ao voltar para a aba
  e a cada 30 s com If-None-Match).
  No aparelho: `cicluz-agenda-cache-v1` (última resposta, com a conta dentro, só para ver sem internet; **não sincronizada** e
  apagada no "Sair"), `cicluz-agenda-transferida-v1` (marca de que a cópia antiga deste aparelho já foi enviada ao servidor
  para conferência), e as preferências `cicluz-agenda-calendario-ocultas`, `cicluz-agenda-alertas-mostrados` e
  `cicluz-agenda-mapa`.
  **Documento antigo `cicluz-agenda-v1`:** continua na sincronização até a entrega C (não é apagado); a tela não lê nem grava
  mais. Só a transferência o lê (o administrador vê a prévia e confirma: `dist/agenda/transferencia.js`). Formato dele
  (histórico): listas, colunas, itens com pessoas/avaliação/repetição/localização, relações.
  Chat e arquivos: tabelas `agenda_mensagens`, `agenda_chat_leituras` e `agenda_arquivos` (0003), com a permissão lida das
  tabelas da Agenda a cada pedido (o documento não decide mais nada; G1 fechado).
  **Rotina (0008, P-46, 24/11/2026):** colunas `vinculo_tela`, `vinculo_titulo` e `vinculo_ref` em `agenda_compromissos` (tela
  ligada; `vinculo_ref` único = tarefa criada por uma tela, só `compras:oc:<ocorrência>` e `producao:pp:<pedido>`), lista fixa
  `lista-tarefas-das-telas` ("Tarefas das telas", criada na primeira tarefa), `agenda_grupo_mensagens` e `agenda_grupo_leituras`
  (chat do grupo), `agenda_config_pessoas` (expediente, bloqueio fora dele, minutos parado até sair; a coluna `hora_fora` não é mais usada desde a 0009) e
  `agenda_horas_fora` (uma linha por compromisso concluído fora do expediente; só registro). Fuso da loja: America/Sao_Paulo.
  **Áudio de 25/11 (0012, P-53, 26/11/2026):** `agenda_compromissos.acao_tela`/`acao_quantidade` (ação da tela que conta, ex.:
  `produtos:excluir`, e quantas vezes por repetição); `agenda_acoes_progresso` (quantas feitas por compromisso e data da
  repetição; ao chegar, conclui); `agenda_telas_icone` (só as exceções de tela do ícone de agendar); `agenda_mensagens.arquivo_id`
  (foto ou áudio do chat, guardado em `agenda_arquivos`; áudio WebM/Ogg/M4A/MP3 aceito pelo conteúdo). Catálogo das ações por tela:
  `ACOES_POR_TELA` em `dist/agenda/rotina.js` (chave: último pedaço do endereço da tela); a camada de produtos
  (`compras/produtos-api.js`) e os serviços de Compras e Produção (`contarSe`) avisam a Agenda. Ação geral de toda tela
  (`tela:salvar`, 26/11/2026): `cicluz-sync.js` dispara `cicluz-dado-salvo` (escrita no servidor ou dado de negócio editado
  no aparelho, via `cicluz-sessao.js`); a API só conta essa ação para a tarefa ligada à tela enviada. `rotas.js` avisa a
  troca de tela com o evento `cicluz-rota-mudou`.
  **Respostas da P-46 (0009, 24/11/2026):** `agenda_grupos.area` (lista ligada a uma área do Acesso por Tela; membros com
  origem `area`, refeitos pela API quando as permissões mudam); `perfis_usuarios.colaborador_id` (conta ligada ao colaborador
  do cadastro, por id; um por conta); `expedientes_colaboradores` (dia a dia: trabalha/folga e horário, só dos colaboradores
  ligados; o aparelho calcula com os Horários/Escalas e manda — nada de nome nem anotação do dia); `sessoes_atividade` (última
  vez que a pessoa mexeu, por sessão: tempo parado no servidor, padrão 15 min, posto do caixa fora); `agenda_horas_fora.tipo`
  passa a nulo (hora sempre calculada, só relatório; o campo "hora fora" saiu de `agenda_config_pessoas` na tela e na API).
  Tarefas por permissão: `producao:lancar:<pedido>` (quem tem `producao_lancar`) e `pessoas:integracao:<colaborador>` (quem
  tem `pessoas_editar`). Chave nova só no aparelho: `cicluz-agenda-escala-enviada-v1` (marca curta do último envio da escala;
  não sincroniza, pode ser apagada sem perda).
  Compras e Produção: o responsável é uma conta real (`CicluzComprasDados.RESPONSAVEIS` lê as contas da Agenda); `u-jose`,
  `u-rodrigo` e `u-ana` aparecem como "Pessoa de teste (removida)".
  Código: `dist/agenda/` (regras gerado, dominio, dados, transferencia, calendario, kanban, mapa, mapa-mental, conversa,
  telas, alertas, rotina, agenda.css); servidor `servidor/api/src/agenda/` (rotina.* para a rotina).
- `producao-v1` (05/11/2026) — Produção num documento: `produtos` (configuração por `produtoId` do Compras: `formato`
  {utensilioId, colunas, linhas, exatidao, aceitaMeia}, `comEstoque`, `estoqueMin/Max`, `producaoMax`, `localEstoqueId`,
  `processoPrincipal`, `conferencia` nenhuma|1|2), `fichas` (produtoId, nome, padrao, quantidadeBase, rendimento, `etapas`
  com processo, parte, faixa, localId, instrucao, ingredientes {produtoId, quantidade, unidade} e recursos {patrimonioId,
  tempoMin, acompanhamento 0–1, nivel, faixa}), `agendas`, `ocorrencias`, `pedidos` (itens com quantidade, real, recebido,
  sobra, descarte, `doEstoque`, `produzir`, `entrouEstoque`), `ordens` (origem pedido|reposicao, cópia das etapas da ficha no
  envio com cargo/nível, início/fim de cada etapa, `estoqueLancado`, `pendenciasEstoque`) e `parametros` (horasMes,
  encargosPct, precoKwh, precoGasKg). O produto do Compras não muda de formato; a Produção grava em `cicluz-compras-v1 ›
  movimentos` os tipos `consumo_producao`, `entrada_producao`, `saida_abastecimento` e `sobra_retorno` (com o id da
  ordem/pedido de produção, para não repetir). Código: `dist/producao/` (dominio, dados, servico, modulo, telas-*, producao.css).
- **Importação do app de produtos (09/11/2026)** — mesma chave `cicluz-compras-v1`, sem migração (campos novos são
  opcionais): o produto importado ganha `appId` (id da BASE no app), `appLojaId` (cópia TNP), `appCodigo`, `localId` (id do
  nó da árvore `cicluz-location-tree-v1`), `origemApp {grupo, locais}` (texto original para revincular) e `vinculoManual
  {grupo, local}` (escolhido à mão: o Revincular não desfaz). O documento ganha `codigoInternoApp` (maior código do app
  abaixo de 700000, inclusive de inativo: o próximo código do S2 fica acima dele) e `importacaoProdutos` (data e números).
  Produto importado novo tem id `pi-<código interno>`. Reimportar casa por `appId`, senão pelo código interno. Os 19
  produtos de exemplo (`p-…`) e os registros que citam algum deles saem na primeira importação. Código:
  `dist/compras/produto-importacao.js` (regras), `telas-produto-importacao.js` (tela), SheetJS 0.20.3 em `dist/vendor/sheetjs`.
- **Produtos no servidor (09/11/2026, docs/PRODUTOS_NO_SERVIDOR_PLANO.md) — SUBSTITUI o catálogo dentro do
  `cicluz-compras-v1` e o arquivo `cicluz-produtos-arquivo-v1`.** O catálogo mora na tabela `produtos` (migration 0006; colunas
  do que busca/filtra/ordena/é dinheiro + `dados` jsonb com o resto do cadastro no formato da tela; mesmo id de antes) e o
  maior código usado em `produtos_codigo`. A tela lê pela API (`dist/compras/produtos-api.js`) e guarda o resumo dos ATIVOS
  em `cicluz-produtos-resumo-v1` (localStorage, NÃO sincronizado; sem internet a loja usa daqui). O `cicluz-compras-v1`
  guarda por produto só o estado da loja: `{ id, saldo, vendas3m, compras3m, lucro3m }` (só os que têm algum número).
  Migração sem perder nada: o 1º aparelho de administrador conectado transfere os produtos do aparelho (Compras + arquivo
  antigo, sem os 19 de exemplo; produto antigo sem código ganha o próximo do servidor); o servidor só insere o que não
  existe; o catálogo passa a valer na conclusão, que só acontece se TODOS chegaram; aí o documento fica só com o estado e o
  arquivo antigo é apagado. O primeiro código de produto novo é 13130 (último antes do S2: 13129), regra só no servidor.
  **Transferência feita no ar em 23/11/2026**; depois dela a chave `cicluz-produtos-arquivo-v1` saiu da sincronização e do código.
- **Fornecedor único (15/11/2026)**, dentro de `cicluz-compras-v1` (mesma chave e versão). Campos do fornecedor: `nome`,
  `documento`, `whatsapp` e `situacao` (já existiam), mais `razaoSocial` (texto, opcional; o `nome` é o nome fantasia, e
  continua sendo o nome exibido em todo o sistema, sem migração), `categorias` (lista com 'produto' e/ou 'servico'), `ramo`
  (texto, opcional), `contrato` (16/11/2026; é o quadro "Tem contrato?" dos dados do financeiro: `{ tem, formaPagamento ('dinheiro' | 'boleto' | 'pix' |
  'transferencia' | ''), recorrencia ('hora' | 'visita' | 'dia' | 'mes' | 'ano' | ''), vencimentoDia (1 a 31, só por mês, ou null), vencimentoData
  (AAAA-MM-DD ou ''), valorCentavos (inteiro ou null), inicio, fim, reajuste ('sem' | 'salario-minimo' | 'ipca' | 'igpm' | 'inpc' | 'percentual' | ''),
  reajustePercentual (número ou null), observacoes }`; tudo só informado, sem fórmula; migração `migracoes.contratoFinanceiro`: quem tinha
  início, fim, valor ou observações da versão de 15/11 recebe `tem: true`; sem anexo ainda), `gruposDespesaIds` (só categoria Serviço, 15/11/2026: ids de `cicluz-financial-hierarchy-v1`.despesas a que o prestador
  está ligado: o id do grupo ou, para subgrupo, "idDoGrupo|idDoSubgrupo" (16/11/2026; o mesmo formato do patrimônio); só vínculo, sem lançamento; o vínculo com **produtos** não é campo do fornecedor: é o `catalogo` que já existia, e a etapa
  Vínculos só acrescenta registros lá), `prestadores` (só categoria Serviço, 15/11/2026: `[{ id, nome, whatsapp, email, aniversario 'AAAA-MM', funcoes: [ids] }]`; o 1º espelha
  `contatoNome`/`whatsapp`/`email`/`vendedorAniversario`, que continuam sendo o que a lista e a cotação leem; migração
  `migracoes.prestadoresFornecedor`: o contato único vira o Prestador 1, nada é apagado), `categorias` (lista com **um** item, 'produto' ou 'servico': escolha única desde 15/11/2026; registro com os dois, de quando
  podia, fica gravado como está e conta como "sem categoria escolhida" até a pessoa escolher; sem migração), `tipoPessoa` (desde 15/11/2026 o cadastro grava sempre 'juridica': fornecedor é só por CNPJ; registro antigo pode ter 'fisica'
  e um CPF em `documento`, que fica como está até a pessoa informar o CNPJ, quando o CPF passa para `documentoAnterior`; sem migração), `contatoNome`, `email`, `financeiro: { nome, whatsapp, email }`
  e `nascimento` (ISO, só pessoa física). **Migração** (marca `migracoes.ramoFornecedor = 1` dentro do próprio documento,
  para acompanhar os dados na sincronização): o texto livre antigo `categoria` passa para `ramo` e o campo `categoria`
  sai; ninguém é classificado como Produto ou Serviço (`categorias` fica ausente até alguém marcar). Roda em memória ao
  ler e só é gravada na próxima alteração (abrir a tela não cria versão no banco). **Desfeito no mesmo dia:** a lista
  `categoriasFornecedor` com `categoriaId` (marca `migracoes.categoriasFornecedor`) existiu por algumas horas neste
  branch; a migração nova devolve o nome da lista para `ramo` e apaga `categoriaId`. A coleção `categoriasFornecedor` e
  a marca antiga podem ter ficado em dado de teste: nenhum código as lê. Fornecedor antigo sem os obrigatórios novos
  continua válido. **Endereço (15/11/2026):** campo novo e opcional `endereco: { cep, logradouro, numero, complemento, bairro, cidade, uf }`;
  fornecedor sem ele continua válido, sem migração. **Cadastro em etapas (15/11/2026):** entram `regimeTributario` ('mei' | 'simples' | 'presumido' | 'real' |
  'nao-informado' | ''), `vendedorAniversario` ('AAAA-MM' ou ''; só mês e ano, decisão do Rodrigo no mesmo dia: quem tinha a data
  completa em `vendedorNascimento` continua com ela gravada, sem uso, e a tela mostra o mês e o ano dela até o campo novo existir;
  sem migração) e `representante: { mesmo, nome, whatsapp, email, cargo }` (cargo: valor fixo de
  `CARGOS_REPRESENTANTE`, ou ''; a lista foi revista no mesmo dia e os valores `socio` e `diretor`, que existiram por cerca de uma hora,
  saíram: quem tiver um deles gravado vê o seletor vazio e escolhe de novo; com `mesmo: true` o nome, o WhatsApp e o e-mail
  gravados são a cópia da etapa anterior, como antes); o `vendedorCpf` existiu por algumas horas e não é mais pedido nem lido (valor já gravado fica no dado); `financeiro`
  ganha `mesmo` (true = copiado da etapa anterior ao salvar). O vendedor ou prestador é o contato de sempre: `contatoNome`,
  `whatsapp` e `email` ficam nos mesmos campos (a cotação continua lendo `whatsapp`). **Migração** `migracoes.vendedorFornecedor`:
  a data `nascimento` (que era do fornecedor pessoa física) passa para `vendedorNascimento`; nada mais se mexe.
  **Segunda migração do mesmo dia** (marca `migracoes.categoriaProdutoFornecedor = 1`, decisão do Rodrigo):
  fornecedor sem categoria que tem vínculo com produto no documento do Compras (qualquer `fornecedorId` igual ao id dele em
  catálogo, histórico, cotações ou pedidos) recebe `categorias: ['produto']`; quem já tinha categoria ou não tem vínculo não
  é tocado; roda uma vez, em memória, e é gravada na próxima alteração. **Dado pessoal:** CPF e data de nascimento de fornecedor pessoa física e e-mails de contato passam a
  ir para o servidor junto com o documento do Compras (ver P-28).
- `patrimonio-v1` (05/11/2026) — bens (RET - Patrimônios). As duas chaves são sincronizadas e adotadas do aparelho
  (`servidor/shared/src/documentos.ts`); começam vazias, sem dado de exemplo.
  Em 15/11/2026 o bem ganhou três campos **opcionais** (mesma chave e mesma versão; bem antigo sem eles continua válido,
  sem migração): `pecas: [{ id, nome, marca, modelo, fornecedorId, grupoDespesaId, subgrupoDespesaId, valor, foto, ultimaTroca,
  intervaloMeses, proximaTroca }]` (fornecedor = id em `cicluz-compras-v1.fornecedores`; grupo e subgrupo = ids de `despesas` em
  `cicluz-financial-hierarchy-v1`; valor em reais com 2 casas; foto = data URL JPEG reduzida a 320 px, dentro do documento, que
  o servidor limita a 4 MB) e `revisao: { ultima, intervaloMeses, proxima }` (na tela o quadro chama "Manutenção periódica")
  ou `null` (datas ISO ou '', intervalo inteiro em meses ou `null`; com última e intervalo, próxima = última + N meses),
  e `audio: { id, type, size, seconds }` ou `null`. O `audio.id` aponta para o arquivo no IndexedDB `cicluz-documentos`
  (o mesmo de Documentações e Ocorrências), que **não** é sincronizado: o áudio só existe no aparelho em que foi gravado.
  Gravação por `dist/audio-nota.js` (`CicluzAudioNota`), peça única usada também por `occurrence-matrix.js`.

**Funções do prestador (15/11/2026):** coleção nova `funcoesPrestador: [{ id, nome, ativa }]` dentro do próprio `cicluz-compras-v1`
(sincroniza com o servidor junto do documento, sem tabela nem migration de banco); nasce com 18 funções de id fixo (`fp-<nome>`,
igual em todo aparelho) pela mesma migração `prestadoresFornecedor`, e cresce pelo "Acrescentar opção" do cadastro de fornecedor.

**Preferência de interface:** `cicluz-fornecedores-colunas` (lista das colunas ocultas na lista de fornecedores, por aparelho; 15/11/2026), `cicluz-fornecedores-prazo-convite` (prazo padrão de resposta do "Enviar link para cadastro", em dias úteis: '1' | '3' | '5' | '7'; sem valor = 3; por aparelho, até existir a parte do servidor da P-29; 15/11/2026), `tema`, `menu-ordem`, `menu-item-order-v1`, `sidebar-sections-v1`,
`menu-visibility`, `people-display-v1`, `people-footer-*`, `{key}-sort`, `{key}-display`,
`fee-brand-order-{id}`, `account-sort`.

**Flags de migração de seed:** `financial-import-complete-v3-ret`, `financial-legacy-import-v1`,
`bandeiras-import-v1`, `operadoras-import-v1`, `ti-contas-seed-v1`, `icon-pilot-migrated-v1`.

**Seeds:** embutidos em `groups.js:4` (`groupSeed`, até ~linha 1544). `group-seeds.json` é cópia de
referência — **não** é carregado.

**Chamadas externas:** `brasilapi.com.br` (`consultas-publicas.js`, 15/11/2026: consulta de **CNPJ** em `/api/cnpj/v1/<cnpj>` e de **CEP** em
`/api/cep/v2/<cep>`, direto do navegador, no cadastro de fornecedor; vai só o número do CNPJ, que é dado público de empresa, ou
do CEP; nunca CPF, nome nem contato; sem cookies, sem referrer, 8 s de limite; se falhar, o cadastro segue à mão),
`api.iconify.design/search` (`icon-library-manager.js:23`), Google Fonts
(Montserrat) e, só quando o mapa da Agenda é aberto, `tile.openstreetmap.org` (mapa) e
`nominatim.openstreetmap.org` (busca de endereço: vai o texto procurado ou o ponto tocado, nada de pessoa;
no máximo 1 busca/s, só ao pedir). Leaflet 1.9.4 fica no site (`dist/vendor/leaflet`, SHA-256 oficial).
Uso justo do OpenStreetMap: se o uso crescer muito, trocar por serviço pago com chave.

**Entidades que ainda não existem:** colaborador/pessoa real (só maquete), loja como entidade,
agenda, lançamento, caixa operacional, usuário/login.

## Módulos JS (`dist/`)

| Arquivo                     | Responsabilidade                                                       |
| --------------------------- | ---------------------------------------------------------------------- |
| `index.html` (210 KB)       | shell, views, 71 blocos `<style>`, editores de Cargos e Contas          |
| `groups.js` (1697 linhas)   | DES/MER/RET/VND, tipos de venda, bandeiras, operadoras e taxas          |
| `location-tree.js`          | Área/Setor/Local/Sublocal                                              |
| `organogram.js`             | organograma (substitui `showConfig`)                                    |
| `job-profiles.js`           | Ficha de Cargos (`window.showJobProfiles`)                              |
| `complete-registration.js`  | salvar/avançar do cadastro completo                                     |
| `financial-components.js`   | `formatSystemName`/`formatFinancialName`, `CicluzIdentity.controls`     |
| `payment-marks.js` + JSON   | logos de bandeiras e operadoras (`assets/payment-marks`, `assets/banks`)|
| `bakery-icons.js`, `icon-library-manager.js`, `icon-search-terms.js` | biblioteca de ícones (48 + Iconify) |
| `preserve-history.js`       | exige transferência antes de excluir                                   |
| `field-validation.js`       | CPF, moeda (centavos), data                                            |
| `date-fields.js`            | DD/MM/AA na tela, ISO guardado                                         |
| `menu-order.js`, `agenda-menu.js` | ordenar menus; seções da lateral                                 |
| `navigation-layout.js`, `mobile-menu.js`, `menu-reveal.js`, `sticky-headers.js`, `mobile-edge-colors.js` | layout e celular |
| `header-normalize.js`, `header-save.js`, `layout-review.js`, `ui-standards.js`, `unified-dialogs.js` | padronização via MutationObserver |
| `people-header-pilot.js`    | barra de busca/período e botões configuráveis (vale para todas as telas)|
| `operations-pilot.*`        | **código morto** — não é carregado                                     |

## Testes (`tests/`)
- `date-fields.cjs` — 19 asserções (máscara DD/MM/AA, bissexto, pivô 49→2049 / 50→1950,
  preserva século gravado).
- `field-validation.cjs` — 21 asserções (moeda, `moneyNumber`, CPF, `dateValid`).
- `header-layout.html`, `registration-review.html`, `people-toolbar-preview.html` — bancadas
  **manuais** com iframe (320/375/390/1024, claro/escuro).

Rodar: `node tests/date-fields.cjs && node tests/field-validation.cjs`.

## Hierarquia Área › Cargo › Pessoa (24/11/2026, pedido do Rodrigo)
A área (Área / Setor / Local) tem cargos; o cargo tem pessoas. **Vínculo sempre por ID**, uma só cópia de cada vínculo:
- **Cargo**: id fixo. Os de referência já tinham o id estável `ref:N`; os cadastrados (`cicluz-cargos-v1`) ganharam o campo `id` (UUID) na primeira carga, sem mudar nome nem valor. O antigo `local:N` era a posição na lista e mudava a cada cargo novo, por isso não serve de vínculo. `jobsCurrent()` devolve `id` em cada cargo.
- **Área ↔ Cargo**: cada nó da árvore (`cicluz-location-tree-v1`) tem `cargoIds` (ids dos cargos que existem nele). Editado em Área / Setor / Local › editar › "Cargos desta área". API: `CicluzLocationTree.cargosDaArea / definirCargosDaArea / areasComCargos`.
- **Pessoa ↔ Cargo**: `jobKey` (id do cargo) no colaborador (`cicluz-pessoas-v1`), **junto** do `jobName` (o nome continua, nunca é apagado). O cadastro grava os dois; a função continua obrigatória.
- **Código**: `dist/hierarquia-dominio.js` (regras puras, testadas em `tests/hierarquia-dominio.cjs`) e `dist/hierarquia.js` (cola nos dados: `CicluzHierarquia.cargos / cargoIdPorNome / arvore / migrar / relatorio`).
- **Migração** (uma vez, marca `cicluz-hierarquia-v1`, sem apagar nada): põe o `jobKey` nas pessoas pelo nome do cargo (só quando há UM cargo com o nome) e copia para as áreas os vínculos que já existiam nas Fichas de Cargos (`unitIds` por nome). O que não casa fica no relatório (`CicluzHierarquia.relatorio()`). A migração passa pelo código de cada módulo (location-tree e people), para não ser desfeita por dado velho em memória.
- **Ainda por fazer**: vínculo pelo Organograma; seleção em três níveis na tela Acesso por Tela; aviso ao excluir cargo que tem pessoas ou áreas (hoje o id órfão é só ignorado na árvore).

## Acesso por Tela guardado e trava de ativação (24/11/2026, pedido do Rodrigo)
- **Chave nova** `cicluz-acessos-telas-v1` = `{ version:1, configs: { "area:ID" | "cargo:ÁREA|CARGO" | "pessoa:ID": { telas:{chave:[permissões]}, acoes:[], conhecidas:[] } } }`. Opcional e aditiva (sem ela ninguém tem permissão configurada); fica **neste aparelho** (ainda não vai para o servidor). API: `CicluzHierarquia.configs / salvarConfig / removerConfig`. Abrir uma coluna cria a configuração (tudo ligado, ou cópia da de cima para cargo e colaborador); remover a coluna (com confirmação) apaga a configuração.
- **Trava**: o colaborador só é ativado (`CicluzPeople.activate`) se tiver cargo e permissão que valha para ele (dele, do cargo ou da área; regras em `hierarquia-dominio.js`, `podeUsar`). Sem isso a ativação devolve o motivo. Quem já estava ativo não é desativado: a tela Acesso por Tela avisa quantos ativos estão sem permissão.
- **Limite**: a trava vale no cadastro (ativação). Barrar o login e as telas de verdade depende de ligar o usuário que entra ao colaborador e de o servidor usar esta configuração (P-37).
