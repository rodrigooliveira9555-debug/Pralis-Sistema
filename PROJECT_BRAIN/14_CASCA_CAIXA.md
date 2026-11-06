# 14 — Casca do Caixa no site (Entradas → Caixas)

> Pedido do Marco (04/11/2026): desenhar o Caixa do Sistema Pralis principal (abertura, turno,
> fechamento, Tesouraria) no CICLUZ. **Só casca**: sem backend, dados fictícios, nada gravado.
> Decisão de 05/11/2026: o Caixa segue o **menu principal do site** (sem menu lateral), no mesmo
> padrão do módulo Compras (`dist/compras/`). Quem continua: **Washington**; Marco revisa e decide o merge.

## Onde está

- Menu do site (06/11/2026, depois que a main reorganizou os setores): **Entradas · Vendas /
  Faturamento → Lançamentos** traz os cartões do Caixa, com nomes `VND - …`
  (`dist/index.html`: `index===0&&section==='Lançamentos'?CicluzCaixa.cards()`; cartão `caixa:<tela>`
  → `CicluzCaixa.abrir`). **Os setores Caixas / Gerência / Financeiro (Entradas) e Tesouraria /
  Financeiro / Diretor Geral (Transferências) deixaram de existir na main**: cada seção tem hoje
  Lançamentos, Relatórios, Cadastros Geral e Pastas Documentos. Onde ficam Tesouraria e Financeiro
  é **pergunta em aberto** (ver "Dúvidas").
- Módulo: `dist/caixa/modulo.js` guarda o **estado único** (`CicluzCaixa.estado`) e as ações que o
  alteram; `dados.js` só traz as sementes fictícias. Telas: `abertura.js`, `turno.js` (+ `turno-dialogos.js`),
  `malote.js`, `fechamento.js`, `conferencia.js`, `gerencia.js`. Estilos: `caixa.css`. Reaproveita
  `CicluzComprasUI` (campos, chips, seção, diálogo, aviso) e os estilos de `compras.css`.
- **Estado único:** `contas` (Cofre Principal, Cofre Troco, Caixa 1M…4T) · `transferencias` (malote,
  sem lacre, sangria, retorno final; situação pendente/recebida/cancelada/divergente) · `lacres`
  (abertura, fechamento reservado, bolsa de sangria) · `lancamentos` · caixa vivo (`abertura`,
  `turno`, `status`, `fechamento`) · `fechamentos` · `mensagens` · `notificacoes` · `perfil`
  (operador, gerente, tesoureiro, financeiro). **Saldo de conta** = inicial + transferências recebidas −
  transferências pendentes/recebidas/divergentes que saem + lançamentos (nunca gravado). A sangria e o
  retorno final saem do caixa na criação e só entram no Cofre quando a Tesouraria confirma.
- Cada arquivo novo entra no `dist/index.html` com `?v=` = 12 primeiros caracteres do SHA-256 do
  arquivo no git.
- A primeira versão (Nuxt, em `/app/caixa` com menu lateral) foi **removida** — não há segundo caminho.

## Referência

Fluxo e regras: Caixa do sistema principal (https://github.com/ErasoumZe/SISTEMA_INTELIGENTE_PRALIS,
só leitura): `web-vue/pages/caixa.vue`, `web-vue/pages/historico_caixas.vue` e
`web-vue/components/caixa/`. Visual: telas internas do site (`DESIGN_SYSTEM.md`,
`docs/DOSSIE_INTERFACE.md`).

Regras de desenho mantidas: contagem cega (o operador não vê o esperado antes da etapa 4 do
fechamento); diferença sempre com sinal + palavra + cor (falta vermelho, sobra âmbar, bateu verde);
dinheiro em centavos com algarismos tabulares; botão principal no tom forte de Vendas (#a16207),
porque branco sobre #eab308 não passa no contraste.

## Feito

- Abertura do caixa: 3 blocos (onde operar · conferir malote pelo lacre — o `001` e os criados em "Malote da Tesouraria" —
  com "Sim, confere"/"Não confere", contagem e motivo da divergência · responsáveis e maquininha),
  lista de pendências depois da primeira tentativa, "Confirmar abertura do caixa" e estado
  "Caixa aberto". Conferida no navegador.
- **Estado único** no `modulo.js` (`CicluzCaixa.estado`): perfil ("Ver como"), status do caixa
  (`fechado` · `aberto` · `em_fechamento`), abertura e turno fictício, em centavos. A Abertura grava
  nele ao confirmar (`abrirCaixa`); "Recomeçar a demonstração" limpa tudo (`reiniciar`). Nenhuma
  tela guarda estado próprio do turno.
- **Turno** (`dist/caixa/turno.js`, card "Turno do caixa"):
  - Recebimentos pendentes (base `CaixaRecebimentosSemLacre`): quem confirma é o **operador**;
    "da Gerência" quer dizer que a Gerência enviou o dinheiro. "Confirmar recebimento" e "Não recebi"
    (com confirmação). Só entra no saldo depois de confirmado.
  - Controle do PDV (base `CaixaIndisponibilidadeDialog`): 8 motivos do principal, "Outro" exige
    descrição, "Computador voltou" registra o retorno.
  - Caixa aberto: PDV, turno, responsável, supervisor, maquininha, lacres e lacre reservado.
  - Resumo (base `CaixaResumoOperacao`): **saldo lacrado para o operador** (visível na Gerência),
    Entradas (abre "Vendas do caixa" com filtros de produto e forma), Movimentações (transferências
    recebidas, sangrias com histórico e lacres, vendas canceladas com auditoria) e vendas por forma.
  - "Fechar caixa" abre "Confirmar encerramento das vendas" (base `CaixaInicioFechamentoDialog`):
    trava com recebimento pendente; confirmando, o status vira `em_fechamento` (sem volta).
- "Ver como" (Operador/Gerência): um seletor só, no estado central, nas telas em que a visão muda
  (Turno agora; Fechamento depois). Na Abertura não aparece.
- Conferido: 1440 · 1024 · 768 · 390, Luz e Sombra, sem rolagem horizontal; fluxos de erro da
  Abertura e do Turno.

## Adaptações da casca (diferem do principal de propósito)

- **Nova sangria no Turno.** No principal o formulário (`CaixaRetornoSangriaForm`) nasce em
  Transferências (`TransferenciasHost`), fora do Caixa; o Caixa só mostra o histórico (`CaixaSangriasDialog`).
  Na casca, o botão "Nova sangria" abre o formulário dentro de `dist/caixa`. A área de Transferências
  do site não foi tocada.
- **Regras da sangria na casca** (Rodrigo, 05/11/2026): dinheiro + moedas = valor total; lacre
  obrigatório; valor > 0; teto = saldo livre do caixa. O operador não vê o saldo (R-232): acima do
  teto a tela diz só "Valor acima do disponível no caixa", sem número. No principal o valor total
  vazio significa "tudo"; na casca ele é obrigatório.
- Texto da tela segue "malote" (como o principal: "Resumo do malote de abertura"); "transferência" é
  o nome do dado, não o texto para o operador.

### Fluxo completo da casca (05/11/2026, segunda leva)

Documentado a fundo no cofre do Obsidian `C:\CICLUZ\Caixa-Brain` (leitura do principal, todos os
campos e regras). Cards de Entradas → Caixas, na ordem do fluxo:

- **Malote da Tesouraria** (`malote.js`): cria o malote (origem Cofre, destino conta do PDV, dinheiro
  + moedas, lacre de abertura, lacre de fechamento reservado, bolsas de sangria). Lacres **distintos
  entre si e únicos** ("Lacre já utilizado em outro movimento"). Gerência também envia **sem lacre**
  (só com caixa aberto no PDV de destino; quem enviou não confirma). Lista de malotes e lacres.
- **Abertura**: o lacre agora vem dos malotes criados (o `001` do PDV 1 já existe); inexistente, já
  rompido ou de outro PDV são recusados; abrir **rompe** o lacre.
- **Fechamento** (`fechamento.js`): gerente responsável (nome livre, o responsável pelo caixa é quem
  abriu) → 1 Vendas (contagem **cega** por cédulas e moedas; folha CREARE com leitura **simulada**,
  valores travados e "Corrigir manualmente" com justificativa; gerar o relatório congela o esperado)
  → 2 Maquininha (comprovante simulado, 4 formas, sem correção manual) → 3 Relatório final
  (Folha × PDV × Maquininha, **só informa**) → 4 Fechamento (esperado × contado só aqui, lacre =
  o reservado, folha de fechamento, observação obrigatória com falta **ou sobra**, "Encerrar com
  divergência" / "Encerrar e enviar à Tesouraria", revisão). Falta = quebra + aviso; sobra = só aviso;
  o contado volta ao Cofre (retorno pendente).
- **Conferência da Tesouraria** (`conferencia.js`): só a Tesouraria; fila "Para conferir / Já
  conferidos", dossiê, **"Fechou certo"** (recebe o retorno como declarado) e **"Teve quebra"**
  (motivo obrigatório), revisão com motivo. **Append-only**; não muda valores nem o status do caixa.
- **Gerência** (`gerencia.js`): monitor de caixas abertos, mensagens (validade no futuro, alvos,
  encerrar; o operador vê no Turno e confirma "Entendi") e histórico com filtros e detalhe.
- "Ver como" agora tem **Operador · Gerência · Tesouraria**; `CicluzCaixa.pode(...)` bloqueia o que
  cada perfil não pode.
- **Testes:** 77 verificações ponta a ponta (Docker, porta 8090) e 72 combinações de largura × tema,
  todas verdes; `date-fields`, `field-validation` e `compras-dominio` verdes.

### Etapa 1 — Turno (06/11/2026): estado único ligado às contas e aos lacres

- Estado movido para listas ligadas entre si; a Abertura continua igual (testada de novo).
- **Abertura:** o malote vira transferência `recebida` pelo **contado**, o lacre é rompido; o malote
  de outro posto (ex.: Caixa 1T) é recusado ("não é destino").
- **Turno:** a **sangria** é uma transferência `pendente` Caixa → Cofre (a bolsa vira "usada,
  aguardando conferência"); o **recebimento sem lacre** é uma transferência `sem_lacre` que o operador
  confirma ("entra no saldo") ou recusa ("Não recebi"; volta à origem).
- `turno.js` (303 linhas) + `turno-dialogos.js` (217): nenhum arquivo acima de ~400 linhas, exceto
  (o `fechamento.js` de 589 linhas foi quebrado na etapa 2).

### Etapa 2 — Fechamento (06/11/2026)

- `fechamento.js` (162 linhas: tela, gerente responsável, navegação, caixa fechado) + `fechamento-comum.js` (49:
  constantes, ajudantes e o "valor do PDV" que a folha e a maquininha comparam; `ctx` guarda só o que é da
  tela) + `fechamento-vendas.js` (189: contagem cega, folha CREARE simulada, gerar relatório) +
  `fechamento-maquininha.js` (141: maquininha e relatório final Folha × PDV × Maquininha) +
  `fechamento-revisao.js` (112: etapa 4 e "Revisar fechamento do caixa"). Nenhum arquivo acima de ~400 linhas.
- Comportamento igual ao já aprovado; novo teste de erro: **folha corrigida à mão** (exige justificativa ≥ 5
  letras) aparece em "Folha R$ X a mais que o PDV" no relatório final, **só informa** e não bloqueia o
  fechamento (só a contagem física gera quebra e exige observação).
- Fio: o lacre de fechamento reservado viaja com o **retorno final** (transferência pendente Caixa → Cofre);
  a conta do caixa zera (vendas e quebra/sobra viram lançamentos); o Cofre só recebe quando a Tesouraria
  confirmar (etapa 4).

### Etapa 3 — Gerência (06/11/2026)

- `gerencia.js` (152 linhas): **monitor de caixas abertos** (só `aberto`, não os em fechamento) com **painel do caixa** ao
  clicar (saldo, entradas, recebimentos pendentes, sangrias, vendas canceladas, PDV ligado/desligado) + histórico de caixas
  com filtros e detalhe. `gerencia-recebimento.js` (76): **enviar recebimento ao caixa** (transferência sem lacre, R-231).
  `gerencia-mensagens.js` (93): mensagens para os caixas.
- **Enviar recebimento:** origem escolhível (Cofre Principal ou Cofre Troco), destino = caixa **aberto**; sem caixa aberto o
  dinheiro vai pelo malote; sem fundo na origem é recusado; vira transferência **pendente** (o dinheiro já sai da origem) e
  aparece no Turno do operador. **Quem enviou não confirma** nem recusa (R-028): o Gerente vendo o Turno só lê "Quem enviou não
  confirma". O envio sem lacre **saiu do card Malote**: um caminho só.
- **Mensagens:** título, texto, validade (nunca no passado), alvos (todos os abertos, toda a empresa, PDVs, operadores); o
  operador responde "Entendi"/"Fechar" no Turno; sem edição nem exclusão, só "Encerrar".
- O **histórico** continua na Gerência até a etapa 5 (Financeiro) decidir o lugar dele.
- Decisões tomadas sem resposta explícita (revisar se o Rodrigo discordar): origem do recebimento escolhível, histórico fica na
  Gerência por ora.

### Etapa 4 — Tesouraria (06/11/2026)

- **Onde:** **Transferências · Contas / Locais → Lançamentos → CNT - Tesouraria** (uma linha em `dist/index.html`: `index===1&&section==='Lançamentos'?CicluzCaixa.cards('tesouraria')`). O Caixa continua em Entradas → Lançamentos (`cards('caixa')`). O card "Malote da Tesouraria" foi **absorvido** por "Nova transferência".
- **Acesso:** Tesoureiro, Financeiro e Gerente (operador vê o bloqueio). **Ajustar saldo** só o Tesoureiro (doc 72).
- **Arquivos:** `tesouraria.js` (abas), `tesouraria-lista.js` (painel, filtros, detalhe, popup de lacres), `tesouraria-conferir.js`,
  `tesouraria-transferencia.js`, `tesouraria-contas.js`; interface comum em `caixa-ui.js`; `modulo.js` ficou só com estado e ações (351 linhas).
- **Painel de transferências** (base TesourariaCockpit): colunas Lançamento · Movimento/rota · Valor total · Lacres · Situação; filtros Status, Data inicial/final, PDV e
  (Mais filtros) Lançado por, Conta de origem, Conta de destino, Lacre; chips aplicados + "Limpar tudo"; mais recente primeiro, 10 por página; detalhe com
  "Quem usou o malote", "Lacres" e "Conferência e observação". Sem "Agendada" (a casca não agenda).
- **Lacres** (LacresBotao/SituacaoMalote): popup por transferência (Abertura/Fechamento/Sangria; Disponível · Reservado · Usado · Usada, aguardando conferência · Conferida).
- **Nova transferência** (OperacaoTransferenciaForm + confirmação): Cofre → conta de posto = **malote** (lacre de abertura, lacre de fechamento reservado, bolsas); qualquer outro par é **comum**.
  Origem ≠ destino, valor > 0, sem fundo na origem recusa, lacres distintos e únicos; o dinheiro sai da origem na criação.
- **Conferir recebimento — ADAPTAÇÃO (decisão aprovada em 06/11/2026):** o principal NÃO tem esta tela (lá o "Fechou certo" recebe o retorno como declarado). Na casca a
  Tesouraria **conta** o retorno do caixa (sangria e retorno final) com o contrato que a API já tem: `/confirmar` estrito (dinheiro + moedas + lacre precisam bater; senão
  "Conferência divergente: registre a recusa com o motivo") e `/recusar-conferencia` (motivo obrigatório; sem "encerrar" continua pendente e a tentativa fica registrada; com
  "encerrar" vira **divergente**, o contado entra no destino e a falta vira quebra; contado acima do declarado exige confirmar a sobra). Contagem **cega**: o valor declarado não aparece.
  Consequência: **"Fechou certo" passou a exigir o retorno já recebido** (um caminho só para receber).
- **Contas e saldos** (ContasPage + doc 72): Nome, Tipo, Fundo, Saldo atual (derivado); "Ajustar saldo" (saldo desejado + justificativa ≥ 5 letras; ajuste imutável, listado). Sem "Zerar saldos".
- **Cancelar retorno planejado:** **não implementado** (legado: nada cria esse registro; decisão aprovada). Fica nas pendências.
- Decisão minha (sem resposta explícita): o **Gerente** também acessa a Tesouraria (no principal ele cria, edita e confere transferências); a conferência é cega.

## Falta

1. **Maquininha manhã/tarde** (acumulado − manhã) e posto escolhível (hoje fixo PDV 1 · Manhã).
2. **Ajuste do início das vendas** (R-224), planejamentos de retorno (legado), "Últimos lançamentos",
   campanhas, filtros de horário em "Vendas do caixa", paginação do histórico.
3. **Conferência estrita no cofre** (`confirmar`/`recusar-conferencia` por lacre), conferência física
   da abertura gravada, prazo de confirmação (423) e `liberar-trava`.
4. Perfil **Diretor Geral**, página de **Pendências** e notificações em sino.
5. **Dúvidas para o Rodrigo/Marco** em `Caixa-Brain/13 - Dúvidas abertas.md` (malote da Tarde com a
   Manhã aberta; quem edita malote; bandeira/operadora na maquininha; Gerência vê o relatório de
   fechamento?; quem envia mensagens; sobra só avisa?).
6. Confirmar no **iPad/Safari** (só foi testado em Edge).

## Desenvolvimento

`npm run dev` em `servidor` serve o site em http://localhost:4200. Em `npm run dev:web` (:3100), o
`nuxt.config.ts` repassa `/entrar.html` e `/api` para a :4200 (antes o login entrava em loop até 431).
