# 14 — Casca do Caixa no site (Entradas → Caixas)

> Pedido do Marco (04/11/2026): desenhar o Caixa do Sistema Pralis principal (abertura, turno,
> fechamento, Tesouraria) no CICLUZ. **Só casca**: sem backend, dados fictícios, nada gravado.
> Decisão de 05/11/2026: o Caixa segue o **menu principal do site** (sem menu lateral), no mesmo
> padrão do módulo Compras (`dist/compras/`). Quem continua: **Washington**; Marco revisa e decide o merge.

## Onde está

- Menu do site: **Entradas · Vendas / Faturamento → Caixas** abre os cards do Caixa
  (`dist/index.html`: setor `Caixas` → `kind 'caixa'` → `CicluzCaixa.cards()`; card `caixa:<tela>`
  → `CicluzCaixa.abrir`).
- Módulo: `dist/caixa/modulo.js` (cards, `criarTela` e `dialogo` na cor de Vendas, `registrar`,
  `voltar`). Telas: `dist/caixa/abertura.js`. Estilos: `dist/caixa/caixa.css`. Reaproveita
  `CicluzComprasUI` (campos, chips, seção, diálogo, aviso) e os estilos de `compras.css`.
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
