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
  `malote.js`, `fechamento.js`, `conferencia.js` (hoje `fechamentos*.js`, etapa 5), `gerencia.js`. Estilos: `caixa.css`. Reaproveita
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
- **Conferência da Tesouraria** (hoje em `fechamentos*.js`, ver etapa 5): só a Tesouraria; fila "Para conferir / Já
  conferidos", dossiê, **"Fechou certo"** (recebe o retorno como declarado) e **"Teve quebra"**
  (motivo obrigatório), revisão com motivo. **Append-only**; não muda valores nem o status do caixa.
- **Gerência** (`gerencia.js`): monitor de caixas abertos, mensagens (validade no futuro, alvos,
  encerrar; o operador vê no Turno e confirma "Entendi") e (hoje em Fechamentos de Caixa, etapa 5) histórico com filtros e detalhe.
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

### Etapa 5 — Financeiro: uma tela só, "VND - Fechamentos de Caixa" (06/11/2026)

- **Onde:** **Entradas · Vendas / Faturamento → Relatórios → VND - Fechamentos de Caixa** (uma linha em `dist/index.html`: `index===0&&section==='Relatórios'?CicluzCaixa.cards('relatorios')`).
  Substitui o card "Conferência de Fechamentos" (`conferencia.js` apagado) **e** o histórico que morava na Gerência (a Gerência ficou só com monitor, recebimento e mensagens). Um caminho só para ver/decidir.
- **Arquivos:** `fechamentos-lista.js` (abas, filtros, tabela), `fechamentos-dossie.js` (dossiê e detalhe da Gerência), `fechamentos-decisao.js` (Fechou certo / Teve quebra / Alterar status), `fechamentos.js` (a tela).
- **Quem vê o quê (decisão aprovada):** **Tesoureiro** vê o dossiê e **decide**; **Financeiro** só consulta (mesma tela, sem botões; aviso "Consulta"); **Gerente** vê o histórico de todos os caixas (inclui abertos e em fechamento)
  e o detalhe **sem contagem, diferença, folha comparada nem decisão** (a contagem é cega para a Gerência); **Operador** não entra.
- **Lista:** abas "Para conferir (n)" / "Já conferidos (n)" (Tesouraria/Financeiro); filtros Data inicial/final, PDV, Operador, Turno e Situação; Esperado, Contado e Diferença com sinal + palavra + cor.
- **Dossiê (retrato gravado no fechamento, não o turno vivo):** quem fechou e lacres (usado × reservado, alerta se diferem); contagem (cédulas, moedas, correções) e diferença; **folha digital × PDV × maquininha** (só informa);
  **paradas do computador** (de quando até quando e o motivo — `fecharCaixa` agora guarda `paradas`, `contagem`, `folha`, `maquininha`, `pdvForma`, `canceladas`); transferências do fechamento com lacre e situação; provas e notificações; histórico da conferência.
- **Decisão:** "Fechou certo" continua exigindo o retorno já recebido em CNT - Tesouraria e só existe para caixa sem falta; "Teve quebra" e "Alterar status" pedem motivo; a mesma decisão repetida não grava de novo; nada é apagado.
- Sementes dos 3 caixas de ontem ganharam o mesmo retrato (cx-91 tem uma parada de 09:10 a 09:42 e a folha R$ 5,00 a menos que o PDV).

### Etapa 6 — Conferência final (06/11/2026)

- **Fio ponta a ponta** (teste no navegador, 128 verificações): malote da Tesouraria → abertura (credita o caixa pelo contado) → turno (recebimento sem lacre, sangria pendente) →
  sangria conferida pela Tesouraria (credita o Cofre) → fechamento (zera a conta do caixa, quebra incluída, cria o retorno final pendente) → retorno conferido (inclusive divergência encerrada com quebra) →
  "Fechou certo" só depois do retorno recebido → histórico na Gerência/Fechamentos sem a contagem. Console sem erros.
- **Larguras e temas:** 12 telas × 1440/1024/768/390 × Luz/Sombra = 96 combinações, sem rolagem horizontal.
- **Nota sobre o teste:** o `rotas.js` da main reabre o endereço atual quando o evento `load` dispara; o teste de larguras passou a esperar o `load` antes de clicar (antes, rodadas isoladas falhavam ao acaso porque o menu voltava por cima da tela aberta). Não é código do Caixa.
- Fora do Caixa nada foi alterado além das linhas do menu em `dist/index.html`. Pendentes de decisão do Rodrigo/Marco: ver "Falta" e `Caixa-Brain/13 - Dúvidas abertas.md`.

### R-224 — Ajustar início das vendas (09/11/2026)

- **Regra (Marco, 28/10/2026, registro do principal):** quem abriu o caixa no sistema depois de já vender no PDV recua o **início das vendas** na etapa Vendas do fechamento. As vendas do PDV desse intervalo **sem caixa** passam a ser deste caixa (Entradas, saldo, relatório); a **abertura oficial nunca muda**. Limites: **60 min** antes da abertura oficial, mesmo dia, nunca no mesmo minuto nem antes do fechamento do caixa anterior do mesmo PDV (a janela começa um minuto depois do fechamento; correção da revisão do Marco, 10/11/2026), só com o caixa aberto ou em fechamento, **motivo de 3 a 500 letras**. Cada ajuste guarda quem, quando, motivo e as duas horas. Com o caixa em fechamento, o relatório de vendas já gerado é **descartado**. Folha × início: tolerância de **2 min**.
- **Arquivos:** `inicio-vendas.js` (regra, sem tela), `fechamento-inicio.js` (bloco "Início das vendas", aviso da folha e diálogo "Ajustar início"); `modulo.js` (`turno.semCaixa`, `abertura.inicioVendas` e `edicoes`, retrato no fechamento), `fechamento-comum.js` (`lidoNoPdv`: o que a folha e a maquininha imprimem inclui as vendas sem caixa), `fechamentos-dossie.js` (bloco "Início das vendas" e nota na Gerência), `turno.js` ("desde HH:MM (início ajustado)").
- **Na tela:** etapa 1 (Vendas), seção da folha: Abertura oficial, Início das vendas, vendas deste caixa e do PDV sem caixa, botão **Ajustar início**. Se a folha lida começa mais de 2 min antes do início e cabe nos 60 min, aparece o aviso com **"Ajustar início para HH:MM"** (hora da folha e motivo já preenchidos). Reajustar para mais tarde **devolve** as vendas que ficaram fora do período.
- **Adaptações da casca (diferem do principal):** o novo início é uma **hora** do mesmo dia (o principal pede data e hora com fuso, então a recusa de "dia diferente" não existe aqui); a venda "que já pertence a outro caixa" não existe (cada PDV tem um caixa por vez); as 3 vendas sem caixa (07:10, 07:25 e 07:40, R$ 55,60) são **fictícias** e nascem com todo caixa aberto; a folha lida traz o "Período de" simulado (primeira venda do PDV).
- **Verificado:** o teste `e2e-inicio.js` percorre 33 pontos: recusas (depois da abertura, mais de 60 min, caixa anterior, motivo, mesmo início), efeito em Entradas e saldo (+R$ 55,60 e +R$ 41,60 em dinheiro), registro do ajuste, descarte do relatório, devolução ao reajustar, fechamento, dossiê e Gerência.
- **DECISÃO DO MARCO (10/11/2026) — fica como está:** ao ajustar o início das vendas com o caixa em fechamento, o relatório é descartado **e a contagem registrada também**, porque o esperado e a diferença dela foram calculados antes do ajuste. O que o operador digitou (cédulas e moedas) **não** se perde: basta gerar o relatório de novo. No código, `contagem.registrada` é zerada junto com o relatório. A **alternativa B** (descartar só o relatório, manter a contagem e recalcular o esperado e a diferença) **fica para quando existir backend**. Por que é assim: na casca a contagem registrada nasce **junto** com o relatório em `gerarRelatorio` e guarda o **esperado congelado** e a **diferença**; as telas do fechamento (etapa 4 e revisão) leem esses dois valores. **Custo conhecido e aceito:** perde-se o histórico `registrada.correcoes` (as correções da contagem e suas justificativas) e a regra "corrigir a contagem exige motivo" deixa de enxergar a mudança.
- **Aprovação:** Washington autorizou implementar em 09/11/2026. **O Marco conferiu em 09/11/2026 que a R-224 não mudou no principal desde 04/11/2026** (registrado em 10/11/2026).

## Mapa do Caixa hoje, tela por tela (10/11/2026, `main` c03146b)

Tudo é **casca**: dados fictícios, em centavos, só na memória (recarregar zera), **sem backend, banco nem `/api`**. Legenda: **pronta (casca)** = o fluxo inteiro da tela existe e está testado; **parcial** = falta parte do que o principal faz; **não começou**. Os números R-xxx são as regras do sistema principal (leitura de 04/11/2026); a **R-224** foi conferida pelo Marco em 09/11/2026 e não mudou desde então.

| Tela (menu) | Estado | Regras do principal que segue | Onde difere do principal |
| --- | --- | --- | --- |
| **Abertura** (Entradas › Lançamentos) | pronta (casca) | R-040 abrir = confirmar o recebimento do malote (lacre rompido, entra pelo **contado**); R-205 o declarado nunca é reescrito; R-028 quem enviou não confirma; R-229 posto do operador (PDV × turno) | posto **fixo** PDV 1 · Manhã (sem login por posto); horário vem do relógio do navegador (R-184 usa o servidor); sem conferência física gravada; um caixa vivo por vez |
| **Turno** (Entradas › Lançamentos) | parcial | R-232 saldo e esperado **cegos** para o operador; R-231 recebimento sem lacre (operador confirma ou "Não recebi"); R-187 sangria = transferência de retorno; R-208 "Vendas do caixa"; R-224 mostra "desde HH:MM (início ajustado)" | faltam "Últimos lançamentos", campanhas (R-199), filtros de horário e paginação em "Vendas do caixa"; nova sangria fica no Turno (no principal, em Transferências); valor total da sangria é obrigatório |
| **Fechamento · 1 Vendas** | parcial | R-232 contagem cega (cédulas e moedas); folha CREARE com valores travados e correção manual com motivo; **R-224 ajustar início das vendas** (60 min, mesmo dia, nunca no mesmo minuto nem antes do caixa anterior, motivo, descarte do relatório, tolerância de 2 min da folha); R-226 responsável é quem abriu | leitura da folha e do período **simulada** por botão (no principal, IA); o início é uma **hora** (não data e hora); a venda "de outro caixa" não existe; as 3 vendas sem caixa são fictícias; ao descartar o relatório a casca também zera a contagem registrada (**decisão do Marco, 10/11/2026: fica assim**; ver a seção do R-224) |
| **Fechamento · 2 Maquininha** | parcial | comprovante com 4 formas (crédito, débito, Pix, voucher); sem correção manual (decisão do Marco, 29/10) | leitura simulada; sem manhã/tarde (acumulado − manhã, R-227/228/229); sem bandeira/operadora |
| **Fechamento · 3 Relatório final** | pronta (casca) | Folha × PDV × Maquininha só **informa**: divergência não bloqueia nem vira quebra | usa a leitura simulada |
| **Fechamento · 4 Fechamento** | pronta (casca) | esperado × contado só aqui; lacre = o reservado; observação obrigatória se divergir; falta = quebra + aviso, **sobra só avisa**; o contado vira retorno final pendente ao Cofre | "Encerrar com divergência" simplificado; sem ajuste de fechamento posterior |
| **Gerência** (Entradas › Lançamentos) | pronta (casca) | R-200 mensagens dentro do monitor; R-231 envio de recebimento sem lacre (só com caixa aberto na conta); R-028 quem enviou não confirma; monitor só com caixas abertos | só o caixa desta sessão é real; outros dois abertos são fictícios; a Gerência manda mensagens (no principal só o administrador tem a permissão) |
| **Tesouraria · Transferências** (Transferências › Lançamentos) | pronta (casca) | painel com filtros, lacres e detalhe; conferência estrita do retorno (contagem cega, recusa com motivo, divergência encerrada vira quebra); R-143/R-165 sem fundo não há transferência | a conferência estrita do retorno **não tem tela no principal** (adaptação aprovada); sem "agendada", sem prazo de confirmação (423) nem `liberar-trava`; R-190 vínculo ao caixa aberto só em parte |
| **Tesouraria · Nova transferência** | pronta (casca) | Cofre → conta de posto = malote; lacre **digitado e único** (R-021), sem cadastro de malote (R-022); origem ≠ destino; valor > 0 | **não** há múltiplo destino (R-030) nem planejamento de retorno (R-185, legado) |
| **Tesouraria · Lacres** (popup) | pronta (casca) | abertura, fechamento e bolsas de sangria, com o estado de cada lacre | — |
| **Tesouraria · Contas e saldos** | pronta (casca) | saldo derivado das transferências e lançamentos; ajuste de saldo **imutável**, só o Tesoureiro, com justificativa | sem "Zerar saldos"; fundo da conta não existe (P-16) |
| **Fechamentos de Caixa** (Entradas › Relatórios) | pronta (casca) | dossiê (contagem, folha × PDV × maquininha, paradas, transferências, início das vendas, histórico); "Fechou certo" só com o retorno recebido; "Teve quebra" e revisão só de acréscimo | só o Tesoureiro decide, o Financeiro consulta e o Gerente vê sem a contagem (**sem resposta do Rodrigo**); anexos são só um nome de arquivo |
| **Pendências e sino de notificações** | não começou | — | as notificações geradas aparecem só no dossiê |
| **Perfil Diretor Geral** | não começou | — | vale a regra da Tesouraria |

Perfis no site: o seletor "Ver como" (Operador, Gerente, Tesoureiro, Financeiro) substitui o login por perfil.

## Falta
Separado por quem destrava. Detalhes das perguntas no fim de cada item.

### Depende do Rodrigo (regra de negócio)
1. **Clientes** (Entradas › Cadastros Geral): quais campos tem o cadastro (P-21). O cartão existe e a tela está vazia; não se inventa cadastro.
2. **Atalho VND** do menu rápido diz "Lançar vendas", mas venda não se lança à mão (R-062): renomear e abrir a consulta de Vendas? (P-23)
3. **A sobra só avisa?** (sem quebra, como no principal) · o **Gerente** acessa a Tesouraria? · só o **Tesoureiro** decide "Fechou certo"/"Teve quebra" e o Financeiro só consulta? · a Gerência vê o relatório de fechamento? Hoje a casca adota "sim" para os três primeiros e "sem a contagem" para o quarto.
4. **Malote da Tarde com o caixa da Manhã ainda aberto** (R-190): o malote fica preso ao caixa da Manhã? · quem **edita** um malote errado? · a maquininha deve ter **bandeira/operadora**? · **quem envia mensagens** pela Gerência?
5. **Pedidos gerais fora do Caixa** (Vendas em Geral, Documentos, padronização de ícones): Vendas unificada, "Imagens Vendas Lançadas" e o ícone do cabeçalho foram feitos (#43); o resto do pedido não tem decisão.

### Depende do Marco
1. **Backend e banco do Caixa** (P-13: onde a API roda; migration; login por posto; permissões reais). Sem isso nada é gravado.
2. **Atualizar a leitura do principal:** a conta usada no GitHub não enxerga o repositório dele (erro 404); a leitura que temos é de 04/11/2026.
3. **Deploy e publicação:** nada foi feito no Coolify.

### O que eu faço sem depender de ninguém
1. **Maquininha manhã/tarde** (acumulado − manhã, mesma maquininha) e **posto escolhível** (hoje fixo PDV 1 · Manhã).
2. **Últimos lançamentos**, campanhas (somente leitura, R-199), filtros de horário e paginação em "Vendas do caixa".
3. **Conferência física da abertura** gravada, **prazo de confirmação** (423) e `liberar-trava`.
4. **Perfil Diretor Geral**, página de **Pendências** e **notificações em sino**.
5. **Mais de um caixa aberto** de verdade (hoje só o da sessão é real).
6. **Não será feito** (legado): planejamento de retorno e seu cancelamento (R-185).

### Decidido pelo Marco (não está mais pendente)
- **Descarte da contagem ao ajustar o início das vendas (item 3b da revisão da #44), 10/11/2026:** fica como está (o relatório e a contagem registrada são descartados; o operador gera o relatório de novo). A alternativa B fica para quando existir backend.
- **R-224:** não mudou no principal desde 04/11/2026 (o Marco conferiu em 09/11/2026).

### Não testado
- **Safari/iPad** (o site roda no iPad do Rodrigo): só foi testado no Edge.
- Leitor de tela (foco e teclado só conferidos por comportamento).
- O sistema principal **não foi executado**: tudo vem de leitura de código, de 04/11/2026.

## Desenvolvimento

`npm run dev` em `servidor` serve o site em http://localhost:4200. Em `npm run dev:web` (:3100), o
`nuxt.config.ts` repassa `/entrar.html` e `/api` para a :4200 (antes o login entrava em loop até 431).
