# Pedido de produção no S2 — especificação (rascunho para aprovação)

**Status:** 05/11/2026, branch `feat/pedidos-producao`. Fatias 1 a 8 implementadas para o Zé ver localmente e aprovar
(sem commit). As perguntas da seção 8 foram respondidas pelo Zé no mesmo dia: ver a seção 9.
Depois de o Zé e o Rodrigo responderem a seção 8, as decisões passam para o `PROJECT_BRAIN`
(02 telas, 04 dados, 11 pendências) e este arquivo vira o roteiro das entregas.

**Fontes:**

- Reunião de 05/11/2026 (Rodrigo, Marco e Zé). Material em
  `Desktop/Pralis-Especificacao-Prototipo/reuniao-rodrigo-2026-11-05-pedido-producao/`.
- `[mm:ss]` indica o minuto da fala na transcrição.
- A **planilha "NOVO SISTEMA PRALÍS"** é a fonte de verdade. Quando a fala e a planilha divergem, o
  ponto está listado como pergunta.

**Marcadores:**

- **[D]** o Rodrigo ou o Zé decidiu;
- **[E]** é só exemplo da planilha ou da fala;
- **[?]** está em aberto (pergunta numerada na seção 8).

**Escopo [D, Zé 05/11]:**

- Entram só a **loja TNP** e a **produção da própria TNP**.
- LI, Hora, "loja parceira" e central de produção ficam para depois.
- O guia por áudio também fica para depois [D 49:24], mas o cadastro já guarda local, ação,
  ingrediente, quantidade e tempo de cada etapa.

---

## 1. Glossário

| Termo | Significado no sistema |
|---|---|
| **Ponto A** | A loja (exposição e venda). Aqui: a TNP. |
| **Ponto B** | A produção, onde o produto é feito. Aqui: a produção da TNP. |
| **Pedido de produção** | A loja pede produtos para uma **janela de demanda** (ex.: 06:00–08:00, 40 assadeiras de pão de sal). É o mesmo formulário do pedido do Compras; só muda o destino [D 33:35]. |
| **Agendamento de pedido** | Regra que gera o pedido sozinha (dias, horário, recorrência), igual ao agendamento do Compras. |
| **Pedido extra** | Pedido feito durante o dia, pelo celular, "daquele estoque que já foi pré-pedido" [19:03]. |
| **Janela de demanda** | "Horário de demanda para atender o cliente": de … até … (nota do mapa; folha "1ª massa 06:00–09:00"). |
| **Com estoque / sem estoque** | Com estoque: a loja tira do estoque, e o estoque pede para a produção quando baixa do mínimo. Sem estoque: o pedido vai direto para a produção. O Rodrigo corrigiu: "é com estoque tudo, na verdade" [18:07]; o pão de sal é **estoque cru**. |
| **Ordem de produção** | O que a produção executa: produto, quantidade, ficha usada, etapas e horário-limite. Nasce de um pedido ou do estoque abaixo do mínimo [20:55]. |
| **Mapa de produção** | Tela com as ordens do dia, vista **por setor, por horário ou por processo** [D 34:04]. |
| **Ficha técnica** | Como fazer um produto: cabeçalho mais etapas. **Um produto pode ter várias fichas** (com kit, sem kit, com partes em estoque) [D 11:59]. |
| **Etapa** | Um bloco da ficha: o processo (lista de 9), os ingredientes, o equipamento ou utensílio, o tempo, o acompanhamento e o nível profissional. |
| **Processo (etapa de produção)** | Lista de 9: receber/conferir · pré-pesar/separar · higienizar/preparar · picar/cortar · misturar/modelar · assar/fritar · finalizar/decorar · armazenar/resfriar · embalar/etiquetar. |
| **Parte do produto (etapa do produto)** | Massa, recheio, cobertura ou ingrediente (ver a opinião na seção 7). |
| **Pré-pesagem / kit** | Ingredientes já pesados e guardados. O kit é um **produto intermediário com estoque**: quando baixa, gera ordem de produção de novos kits [13:30]. |
| **Utensílio de forno (fornada)** | Onde o produto é assado ou frito: assadeira, lata ou tira. Tem uma grade (ex.: 6 × 6 = 36) e pode ou não aceitar meia. |
| **Passo do pedido** | A menor quantidade pedível: meia fornada, se for possível; senão, a fornada inteira. Pedido, mínimo, máximo e faixas só aceitam **múltiplos do passo** (planilha, colunas AC–AE). |
| **Acompanhamento** | Parte do tempo em que alguém precisa ficar junto (10% a 100%). Tempo efetivo de equipe = tempo × acompanhamento [09:18]. |
| **Capacidade** | Quanto cabe no equipamento (masseira 40 kg). Passou disso, vira mais de um processo, e o tempo dobra [D 20:26]. |
| **Abastecimento** | A volta: a produção entrega na loja, com ou sem conferência. |
| **Conferência em 1 ou 2 etapas** | 1 = confere a produção total, na saída. 2 = confere também o que chega na loja (nota do mapa). |
| **Real / sobra / descarte** | Colunas da folha "PRODUÇÃO PANIFICAÇÃO" usada hoje: o módulo substitui essa folha. |

---

## 2. Fluxo ponta a ponta (só TNP)

```
 [Agendamento]──gera no dia anterior──┐
 [Pedido extra pelo celular]──────────┤
                                      ▼
                         PEDIDO DE PRODUÇÃO (loja, janela de demanda)
                                      │
                ┌─────────── produto COM estoque? ───────────┐
               sim                                           não
                │                                             │
     tira do estoque (pronto ou cru)                          │
     estoque < mínimo ⇒ ORDEM automática [?6]                 │
                │                                             │
                └──────────────► ORDEM DE PRODUÇÃO ◄──────────┘
                                      │  escolhe a ficha [?13]
                                      ▼
                  com pré-pesagem/kit? sim ⇒ consome kit (o kit tem estoque
                                      │       e as próprias ordens)
                                      ▼
                       ETAPAS no MAPA DE PRODUÇÃO
                (por produto "vertical" ou por etapa "horizontal")
                capacidade estourada ⇒ processo repetido
                                      │
                                      ▼
                        PRONTO ⇒ ABASTECIMENTO
                 sem conferência │ com conferência (1 ou 2 etapas)
                                      ▼
            loja recebe ⇒ registra real / sobra / descarte [?7]
```

**Variações:**

- **Com ou sem estoque:** é definido no **produto** [planilha 1.2/1.3; ?8].
- **Com ou sem pré-pesagem:** é a **ficha** que diz. "Ficha 1: buscar o kit" e "Ficha 2: montar o kit" [12:37].
- **Com ou sem conferência; 1 ou 2 etapas; só a curva ou todos os produtos [01:50]:** é configuração do
  abastecimento [?14].

---

## 3. Onde entra no menu [?11]

**Pelo que já existe:**

- O **Compras** fica em *Saídas · Mercadorias / CMV → Compras*, com os cadastros em *Cadastros → Compras*.
- A produção também é CMV, porque transforma mercadoria em produto.

**Proposta:**

- **Mercadorias / CMV → Produção**: setor novo ao lado do Compras, com os cards Agendamento de pedidos,
  Pedidos de produção, Mapa de produção, Abastecimento e Estoques da produção.
  - É um setor dentro da seção 3, não um item novo no array `sections`.
  - Alternativa: usar o setor **Diretor de Operações** da mesma seção, que hoje abre vazio.
- **Cadastros → Produção**: Fichas técnicas e Formatos de pedido (utensílios de fornada).
- **RET - Patrimônios fica onde está** (*Cadastros → Diretor de Operações*) e vira cadastro de verdade.
  Não é criado outro cadastro.
- Cor do setor: falta definir uma cor de origem para Produção no `DESIGN_SYSTEM`, porque Compras é
  verde `#22c55e`. O Rodrigo vai reordenar os menus sem excluir nem renomear nada [D 51:22].

---

## 4. Entidades e campos (ligação com o que já existe)

Regra geral: **vínculo por ID**. Produto, grupo, unidade, local, cargo e patrimônio são reaproveitados;
só nasce o que não existe.

### 4.1 Produto: reaproveita o do Compras (`cicluz-compras-v1 › produtos`)

- **Já existe:**
  - `grupoId/subgrupoId` (MER), `unidade`, `estoqueMin/Max`, `saldo`, `areaEstoque/setorEstoque`;
  - `tipo: revenda | transformacao`, `conversoes[]`, `transformacao.produtoReceituario`.
- **Grupos MER que já cobrem as partes:**
  - g10 **FAB. PRÓPRIA**: produto final, como panificação e confeitaria;
  - g11 **FAB. PRÓPRIA BASE**: recheios, massas, coberturas, ingredientes Pralis (os intermediários e
    os kits);
  - g13 **MAT. PRIMA**: farinha, fermento e os outros ingredientes.
- **Configuração de produção por produto** (implementada na chave `cicluz-producao-v1 › produtos`, ligada pelo
  `produtoId`; o produto do Compras não muda de formato, então não há migração):
  - entradas: `compraExterna` (sim/não) e `producaoInterna` (sim/não), as duas da planilha;
  - `comEstoque` (sim/não);
  - `lojaPedeParaEstoque` e `lojaPedeParaProducao` (sim/não);
  - `pedidoAutomaticoEstoque` e `pedidoAutomaticoPreProducao`;
  - `processoPrincipal` (lista de 9);
  - `formatoId` (utensílio de fornada, 4.3);
  - `producaoMin`, que é o passo; `producaoMax` em múltiplos do passo;
  - `localEstoqueProducao`, que é um nó da árvore de locais;
  - **saída:** venda externa (local de exposição) e/ou venda interna (vira ingrediente de outra ficha).
    O produto já tem `localVenda1/2`.
- **Mínimo e máximo de estoque de produto produzido:** só aceitam múltiplos do passo.
  - Na planilha, o exemplo tem mínimo 108 > máximo 36 [?15].
  - O sistema vai recusar mínimo maior que máximo.
- **Código interno, código de barras, DUM e marca:** o produto do Compras já tem código interno e
  código de barras. Falta só o DUM [?21].

### 4.2 Patrimônio: evolui a tela "RET - Patrimônios"

- **Hoje:**
  - é demonstração e **não salva** (`index.html:146`, `form-demo`);
  - categoria: Equipamento, Utensílio, Mobiliário ou Outro;
  - área, setor e local são texto livre.
- **Passa a salvar** numa chave nova: `cicluz-patrimonio-v1`. Como hoje nada é salvo, não há o que migrar.
- **Campos:**
  - os atuais: nome, marca, modelo, número de série, número de patrimônio, valor (R$);
  - **categoria**: **Utensílio, Máquina, Equipamento ou Mobiliário** [D 06:50]. O que fazer com
    "Outro" é a pergunta 16;
  - **local**: nó da árvore de locais, no lugar dos três textos livres. É de onde sai o "vá para a sala
    tal" do guia futuro;
  - **capacidade**: valor + unidade (ex.: 40 KG). É ela que faz o tempo dobrar;
  - **medidas** (largura × comprimento), para assadeiras e formas;
  - **energia**: nenhuma, elétrica ou gás, com consumo por hora (kWh/h ou kg/h). Só fica guardado; o
    custo é a seção 6;
  - ativo/inativo.
- O card "RET - Grupo Patrimônio" (Estoques → Compras) continua vazio. As 4 categorias bastam por agora.

### 4.3 Formato de pedido (utensílio de fornada): novo, ligado ao Patrimônio

`{ id, produtoId, utensilioId (patrimônio), colunas, linhas, unidade, exatidao: EXATO|APROXIMADO|NAO_TEM,
aceitaMeia }`

- **Calculados:**
  - fornada = colunas × linhas;
  - meia = divide o **primeiro fator** quando ele é par. É a regra da planilha: `SE(ÍMPAR…)`. Meia
    assadeira "só aceita número par" [15:43];
  - passo = meia, se aceita; senão, a fornada inteira.
- **Frase de resumo, como na planilha:** "Assar · Assadeira 58×68 (6 tiras) · 36 un · meia 18 un".
- **Medida da meia assadeira:** 35 × 40 [?2].

### 4.4 Ficha técnica: nova (`cicluz-producao-v1 › fichas`)

```
ficha { id, produtoId, nome ("Com kit", "Do zero"), padrao: bool, ativa,
        producaoDe, producaoAte (múltiplos do passo),
        rendimento { bruto, liquido } → perda = líquido − bruto, perda % (planilha 1.6),
        etapas: [etapa] }
etapa { id, ordem, processo (lista de 9), parte (massa|recheio|cobertura|ingrediente) [?1],
        faixaDe, faixaAte,
        ingredientes: [{ produtoId, quantidade, unidadeId }],      // produtos do Compras
        recursos:     [{ patrimonioId, tempoMin, acompanhamento (0,1–1,0),
                         nivel [?4], faixaDe, faixaAte }],
        modoTempo: inteiro | porPartes [?3],
        localId (árvore de locais), instrucao (texto curto, para o guia futuro) }
```

- **Ingrediente que é produto intermediário** (kit, massa de pão de ló, recheio de brigadeiro): é um
  produto com a ficha dele e o estoque dele. É assim que funcionam "a torta com partes em estoque"
  [37:05] e "ficha 1 × ficha 2".
- **Proporcionalidade:** o Rodrigo aceita que a ficha seja proporcional, mas prefere padrões fechados
  em frações redondas [D 41:38, 43:17].
  - Por isso a quantidade pedida fica presa ao passo.
  - Os ingredientes escalam pela razão quantidade ÷ rendimento da faixa, arredondados para a balança [?3].
- **Tempo total da ficha** = soma dos tempos das etapas. **Tempo de equipe** = soma de tempo ×
  acompanhamento. É tempo, não dinheiro.
- **Ações:** "Salvar e finalizar" e "Salvar e cadastrar outro" (como na planilha). Também
  **"Duplicar ficha"**, para criar a variante com kit ou sem kit.

### 4.5 Agendamento e pedido de produção: reaproveitam o Compras

- **Formulário de agendamento:** é o do Compras (`telas-pedido.js`: `formularioAgenda` e
  `campoRepeticao`; `dominio.ocorrencias`). Muda o seguinte:
  - entram a **janela de demanda** (de/até) e o **horário do pedido** (até 3 por dia, segundo a nota
    do mapa);
  - recorrência: semanal, quinzenal ou semestral [D Zé]. O Compras já tem "personalizado a cada N
    meses", que cobre o semestral [?18];
  - saem os campos que só servem para compra: fornecedor, prazo da cotação e margem.
- **Pedido:**
  - estrutura: `{ id, origem: agendamento|extra, agendaId?, data, janelaDe, janelaAte, status, itens:
    [{ produtoId, quantidade (múltiplo do passo) }], observacao, responsavelId }`;
  - situações: rascunho → enviado → em produção → pronto → abastecido (ou cancelado);
  - o pedido gerado pelo agendamento nasce **no dia anterior** [19:24];
  - o pedido extra é feito durante o dia, pelo celular [?5].
- **Destino:** o pedido **não vai para a cotação**. Ele vai para o estoque (com estoque) ou vira
  ordem de produção (sem estoque).

### 4.6 Ordem de produção: nova (`cicluz-producao-v1 › ordens`)

`{ id, numero, origem: pedido|estoqueMinimo|kit, pedidoId?, produtoId, fichaId, quantidade, prazo
(início da janela), modelo: porProduto|porEtapa, status, etapas: [{ etapaId, lotes, tempoPrevisto,
responsavelId?, inicio?, fim? }] }`

- **Capacidade [D 20:26]:**
  - lotes = teto(quantidade de massa ÷ capacidade do equipamento);
  - tempo da etapa = tempo × lotes. Exemplo: 40,7 kg numa masseira de 40 kg dá 2 lotes, e o tempo dobra;
  - a quantidade de massa vem do rendimento da ficha.
- **Modelos [D 35:05]:**
  - **por produto**: uma pessoa faz todas as etapas de uma ordem;
  - **por etapa**: o mapa agrupa a mesma etapa de várias ordens, como "pesar tudo".

### 4.7 Abastecimento, conferência e estoque

- **Abastecimento:** `{ ordemId|pedidoId, itens: [{ produtoId, pedido, real, sobra, descarte }],
  conferencia: nenhuma|1etapa|2etapas, conferente(s) }`. Substitui a folha "PRODUÇÃO PANIFICAÇÃO".
- **Conferência:** reaproveita o padrão da conferência do Compras (contagem cega e aprovação por outra
  pessoa) [?14].
- **Estoque:** reaproveita `movimentos` e `saldo` do Compras com tipos novos:
  - `entrada_producao`;
  - `saida_abastecimento`;
  - `descarte`;
  - `consumo_producao`: baixa dos ingredientes pela ficha [?12].
  Assim, só existe um saldo por produto.

### 4.8 Onde os dados moram

| Dado | Onde |
|---|---|
| produto, unidades, movimentos | `cicluz-compras-v1`, que já existe e já é sincronizado (só leitura pela Produção) |
| configuração de produção por produto (com o formato), fichas, agendas e pedidos de produção, ordens, abastecimento | **`cicluz-producao-v1`** (nova) |
| patrimônio | **`cicluz-patrimonio-v1`** (nova) |
| grupos MER, locais, cargos, salários | as chaves atuais, só leitura |

- **Chaves novas:** entram em `CHAVES_SINCRONIZADAS` e `CHAVES_ADOTADAS_DO_APARELHO`
  (`servidor/shared/src/documentos.ts`), como foi feito com a agenda.
  - **Não precisam de migration de banco**, mas a API precisa ser publicada.
- **Ligação com o Compras:** toda gravação no `cicluz-compras-v1` passa por `CicluzComprasDados.transacao`.

---

## 5. Telas e ordem de entrega (fatias verticais: tela + dados + teste)

Cada fatia é um commit (ou mais) e é testada em 320/390/1024, claro e escuro.

| # | Fatia | Depende de | Envolve dinheiro? |
|---|---|---|---|
| 0 | Respostas às perguntas da seção 8, registradas no brain | — | — |
| 1 | **Patrimônio de verdade**: lista, formulário, categorias, capacidade, medidas, energia, local pela árvore | 0 | não (o valor R$ só é guardado) |
| 2 | **Produto: bloco Produção** + **formato de pedido** (grade, meia, passo; mínimo e máximo em múltiplos) | 1 | não |
| 3 | **Ficha técnica**: várias por produto, etapas com ingredientes, recursos, tempo, acompanhamento e nível, duplicar, tempo total e de equipe | 1, 2 | não (sem custo) |
| 4 | **Agendamento e pedido de produção**: mesmo formulário do Compras, janela de demanda, pedido extra pelo celular | 2 | não |
| 5 | **Ordem e mapa de produção**: por setor, horário e processo; capacidade; por produto ou por etapa; tablet | 3, 4 | não |
| 6 | **Abastecimento e conferência**: real, sobra e descarte; movimentos de estoque; ordem automática no mínimo; kits | 5 | não |
| 7 | **Custos**: ingredientes, mão de obra, energia, valor sugerido | fórmulas aprovadas | **sim: PARAR** |
| 8 | **Relatórios**: mais produzidos, sobra e descarte (mais vendidos e margem dependem de vendas [?17]) | 6 (7) | parcial |

**Testes:** regras puras num `producao/dominio.js` (UMD, como `compras/dominio.js`), testadas em Node:

- passo e meia;
- múltiplos;
- lotes por capacidade;
- tempo de equipe;
- escala da ficha por faixa;
- agrupar o mapa.

Também haverá testes de tela em Playwright para cada fatia.

---

## 6. Custos: fórmulas para aprovar (nada é implementado antes)

| # | Fórmula | Origem |
|---|---|---|
| C1 | Custo dos ingredientes da etapa = Σ quantidade × custo unitário do produto | planilha (coluna `#REF!`, quebrada) |
| C2 | Custo da mão de obra = Σ tempo de equipe × custo por minuto do nível ou cargo (salário vigente ÷ ? horas/mês; entram encargos?) | fala [46:29]; o divisor não foi dito |
| C3 | Custo da energia = Σ tempo do equipamento × consumo por hora × preço do kWh ou do gás (onde se cadastra esse preço?) | fala [46:45] |
| C4 | Custo da ficha = C1 + C2 + C3 (soma das etapas, "markup custo") | planilha + [04:27] |
| C5 | Valor sugerido = custo × (1 + margem) + R$ 0,01; margem = pontual ou, se vazia, a do grupo | planilha 1.5 |

Dinheiro em centavos inteiros, com duas casas na tela.

---

## 7. Opinião pedida ao Zé: dividir todo produto em massa, recheio, cobertura e ingrediente [05:13]

**Sugestão:** manter as 4 como **classificação**, não como estrutura obrigatória.

- **Por que não obrigar:** nem todo produto tem as 4.
  - O pão de sal só tem massa.
  - A torta tem massa, recheio, cobertura e acabamento (morangos).
  - Obrigar as 4 cria etapas vazias e confunde quem cadastra.
- **O que funciona melhor:** cada parte que tem vida própria vira um **produto intermediário com
  ficha própria** (massa de pão de ló, recheio de brigadeiro, ganache, kit de massa doce). Ela fica no
  grupo **FAB. PRÓPRIA BASE**, que já tem os subgrupos Massas, Recheios, Coberturas e Ingredientes Pralis.
  - É exatamente o carro do exemplo dele: o motor é montado em outra linha e chega pronto.
  - É também o que permite as "várias formas de fazer" que ele pediu: fazer a parte na hora ou tirar
    do estoque.
- **Onde fica a classificação:** cada etapa marca a que parte pertence. Assim, a ficha consegue
  mostrar o tempo e o custo por parte (quanto custa o recheio dessa torta).

---

## 8. Perguntas para o Rodrigo e o Zé

1. **Massa / recheio / cobertura / ingrediente:** concorda com a seção 7, em que as 4 são classificação
   e as partes reais viram produtos intermediários?
2. **Meia assadeira 35 × 40:** está certo? A metade de 70 × 60 seria 35 × 60 ou 70 × 30. E a assadeira
   da planilha é 58 × 68: existem as duas?
3. **Tempo:** quando vale "processo inteiro" e quando vale "por partes"? E como o tempo cresce com a
   quantidade: uma linha de tempo por faixa de/até, como na planilha, ou proporcional?
4. **Nível × cargo:** a etapa aponta para o **nível** (ajudante, iniciante, intermediário, avançado,
   especialista) ou direto para o **cargo** (padeiro, confeiteiro…)? Hoje os cargos não têm nível.
5. **Pedido do dia anterior × extras do dia:** o extra pelo celular é **ajuste do mesmo pedido** ou um
   **pedido novo**? E o extra só pode tirar do que "já foi pré-pedido", ou pode pedir além?
6. **Ordem automática** (estoque abaixo do mínimo, kits): sai sozinha ou vira **sugestão** para alguém
   aprovar? Quem aprova?
7. **Sobra e descarte:** quem registra, e quando? Cada ficha tem um % de aproveitamento [21:34]? A
   sobra reaproveitada vira entrada de estoque de quê?
8. **Com ou sem estoque:** é sempre definido pelo **produto**, como na planilha? (Se for, a loja e o
   pedido não mudam isso.)
9. **Mapa de produção:** além de setor, horário e processo, precisa da visão por pessoa ou por turno
   (manhã e tarde)?
10. **Custos:** as 5 fórmulas da seção 6, incluindo horas por mês, encargos, preço do kWh e do gás e o
    "+ R$ 0,01".
11. **Menu:** setor novo "Produção" em Mercadorias/CMV (recomendado) ou o setor Diretor de Operações,
    que hoje está vazio? E a cor do setor?
12. **Baixa de ingredientes:** ao produzir, o sistema baixa os ingredientes do estoque pela ficha?
13. **Várias fichas para o mesmo produto:** qual a ordem usa? A marcada como padrão, ou a produção
    escolhe na hora?
14. **Conferência:** o que é "conferir só a curva" (a curva ABC dos mais vendidos?) e quem confere em
    cada etapa?
15. **Mínimo 108 > máximo 36** no exemplo: é só valor de teste?
16. **Categoria "Outro"** da tela de Patrimônio atual: sai, fica junto com Máquina, ou vira Máquina?
17. **Relatórios de mais vendidos e margem:** o S2 ainda não tem as vendas. Ficam para quando a venda
    entrar, ou usamos outra fonte?
18. **Recorrência semestral** do abastecimento: é para produto sazonal (ex.: panetone)? Para o dia a
    dia vale diário/semanal, como na lista PEDIDOS da planilha?
19. **Quem faz o pedido** na loja (atendente, gerente) e quem vê o mapa (padeiro no tablet)? Vale
    permissão por pessoa?
20. **Tablet da produção** [25:50]: o mapa precisa funcionar bem na horizontal (1024) e com o dedo.
    Está bom assim?
21. **DUM** (código da caixa) e "nome reduzido (XXX caracteres)": qual o limite de caracteres? O DUM
    entra no produto do Compras?

---

## 9. Decisões do Zé (05/11/2026) e o que a tela faz

| Pergunta | Decisão | Na tela |
|---|---|---|
| 1 Partes do produto | Etiqueta opcional + produtos intermediários | "Parte do produto" opcional na etapa; massa, recheio e kit podem ser produtos com ficha e estoque próprios (grupo FAB. PRÓPRIA BASE). |
| 2 Meia assadeira | Medida só informativa | A meia divide a **largura** (precisa ser par); a medida fica no Patrimônio. |
| 3 Tempo | Por faixa, como a planilha | Cada linha de equipamento tem tempo e faixa de/até opcional; passou da capacidade, o processo se repete. |
| 4 Quem faz | Cargo + nível | A etapa guarda o cargo do cadastro de Cargos (chave + nome, porque o S2 não tem id fixo de cargo) e o nível da planilha. |
| 5 Pedido extra | Pedido separado | O "+" de Pedidos de produção cria um pedido já enviado. |
| 6 Ordem automática | Sugestão para aprovar | "Repor estoque" lista o que está abaixo do mínimo; "Aprovar e produzir" cria a ordem de reposição (até o máximo, no passo). |
| 7 Com estoque | Usar o estoque do Compras | O pedido sai do estoque livre; só o que falta vira ordem (arredondada à meia fornada); a ordem pronta entra no saldo; o abastecimento sai dele. |
| 8 Ingredientes | Baixa ao concluir | Ordem pronta baixa os ingredientes, convertidos para a unidade do estoque (ex.: 60 kg = 2,4 sacos de 25 kg); sem conversão, fica como pendência no mapa. |
| Sobra | Volta para o estoque | No fechamento, a sobra de produto com estoque volta ao saldo; o descarte só é registrado. |
| 9 Mapa | + por turno e por cargo | Visões: horário, turno, processo, setor, cargo, produto. Turno pela hora em que a janela começa (antes das 12:00 = manhã; provisório). |
| 10 Custos | C1–C5 aprovadas como estão | Ficha mostra ingredientes + mão de obra + energia, custo por unidade e valor sugerido. Horas por mês, encargos e preços da energia são preenchidos em Saídas · Mercadorias → Cadastros Geral Produção → Parâmetros de custo (sem valor inventado; vazio = custo parcial com o que falta). |
| 11 Menu | Lógica do vídeo do Rodrigo (06/11), como no Compras | Saídas · Mercadorias → **Lançamentos Produção**: MER - Pedidos de Produção, MER - Mapa de Produção, MER - Abastecimento; → **Relatórios**: MER - Produção; → **Cadastros Geral Produção**: MER - Produtos da Produção, MER - Ficha Técnica de Produtos, MER - Parâmetros de Custo; **Agenda → MER - Agenda de Produção** (o agendamento fica na Agenda). Verde; RET - Patrimônios em Saídas · Retiradas → Cadastros Geral, azul (RET). |
| 13 Várias fichas | Recomendação | A ordem usa a ficha padrão e guarda uma cópia das etapas. |
| 14 Conferência | Curva ABC | "Conferir: todos ou só a curva A". Enquanto o S2 não tem vendas, curva A = os 20% que mais vendem no campo "vendas 3 meses" do Compras (bolinha verde). |
| 15 Mínimo > máximo | Recomendação | O sistema recusa. |
| 16 Categoria "Outro" | Recomendação | Saiu; ficaram as 4 do Rodrigo. |
| 17 Relatórios | Usar as vendas do Compras | Relatórios: pedido, produzido, abastecido, sobra, descarte, desperdício e "vendas 3 meses" (cadastro do Compras, não venda real). Margem por produto ainda não (a fórmula de margem não foi definida). |
| 18 Recorrência | Recomendação | Campo de repetição do Compras (semestral = personalizado, mensal a cada 6). |
| 19 Quem pede/confere | Recomendação | Lista provisória de responsáveis do Compras (sem login por pessoa). |
| 20 Tablet | Recomendação | Mapa com botões de 44 px e cartões em grade. |
| 21 DUM e nome reduzido | Depois | Não mexeu no cadastro do Compras. |
