# 05 — Regras de design vigentes (03/11/2026)

> Resumo das regras **em vigor**. A fonte completa e histórica é o `DESIGN_SYSTEM.md` do repositório
> (regras de 03/11 no topo). Em conflito, vale a regra mais recente do `DESIGN_SYSTEM.md`.

## Cor por origem
- VND (vendas, tipos, bandeiras, operadoras) = amarelo `#eab308`
- CNT (contas, transferências) = laranja `#f97316`
- DES (despesas) = vermelho `#ef4444` · Quadro de taxas por bandeira = vermelho
- MER (mercadorias) = verde `#22c55e`
- RET (retiradas) = azul `#2563eb`
- Resultados, Configuração, Formulários, Gestão de Pessoas = roxo `#7c3aed`
- Filtros de métrica: VND amarelo, COM verde, LUC azul, RES roxo
- **A cor do menu atual vence a do ancestral.** Ações herdam `--menu-accent` / `--panel-color`.
  **Roxo não é cor universal.**
- **Excluir é sempre vermelho.** Editar segue a cor da aba.
- Cinza da navegação só pelo token `--navigation-ink` (#a2a0aa claro / #9896a1 escuro).
- Logomarca de banco/cartão mantém cor original; logomarca desconhecida **nunca** vira uma parecida.

## Tipografia (tokens em `dist/ui-foundation.css` — fonte única)
- Montserrat, só ela.
- Título principal 16/20 peso 600 · título interno 14 · subtítulo 11/14 (9 px eliminado).
- Rótulo 12/18 peso 400 · valor 14/20 · botão 12 peso 600 · nota 11/16.
- **Não ajustar medidas tela a tela.**

## Campos e formulários
- Campo 42 px, raio 8, borda 1 px. Fonte 16 px até 1024 px (iPhone não dá zoom).
- **Enter avança para o próximo campo e nunca salva.** Exceção única: o campo de mensagem do chat da Agenda (compromisso e grupo), onde Enter envia, como no WhatsApp (DESIGN_SYSTEM, 24/11/2026).
- Cancelar/Voltar transparentes; Salvar/Avançar preenchidos no acento.
- Nome passa por `formatSystemName` (exceções: PDV, 1M–4T).
- CPF, moeda (centavos) e data validados em `field-validation.js` — nunca validar por tela.
- Todo cadastro com identificador oferece "Ícone ou 3 caracteres", com prévia.

## Datas
- Exibição **DD/MM/AA**, **sem ícone de calendário**. Valor guardado em ISO.
- Data nova: 00–49 → 2000–2049; 50–99 → 1950–1999. Data existente mantém o século.
- Calendário do rodapé só filtra registros com data explícita; bloqueia intervalo invertido.
- **Campo de data com calendário (25/11/2026, Washington) — vale só em Saídas › Lançamentos (Despesa, Mercadoria e Retirada)**, e **supera ali** o "sem ícone de calendário": peça `U.campoData` (`dist/compras/ui.js`), no desenho dos campos de aniversário e de hora: máscara `DD/MM/AA` + **botão redondo do calendário** + painel com o **calendário do mês**: título ("novembro de 2026"), setas de mês anterior e seguinte, dias da semana D S T Q Q S S, grade de dias em células de cantos arredondados (dia escolhido na **cor da origem**: vermelho, verde ou azul; hoje com contorno; dias de outro mês esmaecidos), e **Limpar** e **Hoje** embaixo. Tocar no título troca a grade por Mês e Ano (12 anos por vez). Dia escolhido fecha; valor ISO; 31/02 é inválido. **Os demais campos de data do site seguem como estão** (digitação DD/MM/AA pelo `date-fields.js`), à espera da decisão do Washington.

## Hora (24/11/2026, Washington)
- Hora é a peça única `U.campoHora` (`dist/compras/ui.js`), no desenho do campo de aniversário: máscara `HH:MM` + botão redondo do relógio + roleta
  de duas colunas (horas 00–23, minutos 00–59). Valor guardado `HH:MM`; fora de 00:00–23:59 o campo fica inválido.
- **Uma única faixa** na cor do menu, contínua nas duas colunas, fica parada no meio; os números rolam por baixo e nenhuma célula troca de cor ao rolar
  (sem piscar). Rolar só o minuto com o campo vazio escolhe a hora 00 (e o inverso). Detalhe e histórico no `DESIGN_SYSTEM.md` (seção "Campo de hora")
  e no Manual de Design (Campos de Preenchimento).
- **Ainda não vale nos outros campos de hora** (seguem com o seletor nativo do navegador): Horário / Escala e vínculo (`schedules.js`), Hora Extra
  (`overtime.js`), Ponto (`ponto.js`), Agenda, Compras (conferência, pedido, produto, prazo da cotação), Produção (pedidos) e Caixa (início das vendas).
  A troca não muda o dado; está à espera da decisão do Washington.

## Layout
- Três retângulos independentes — cabeçalho, conteúdo, rodapé — raio 12, separados por 6 px,
  largura integral. **Só o centro rola.**
- Cabeçalho superior na cor intensa do módulo; texto na cor da superfície do tema.
- Rodapé 58 px: marca à esquerda, ações em círculos de 32 px à direita; recuo 14 px desktop / 8 px
  até 600 px.
- Seta sem círculo oculta o cabeçalho; ele reabre sempre que se entra na tela.
- Menu de personalização sempre abre compacto (60 px).
- Até 600 px: tela inteira. **Nunca rolagem horizontal.**
- O menu principal fica fora do padrão interno (ajustes nele só com autorização explícita).

## Ícones
- SVG da biblioteca `CicluzBakeryIcons` (48). Acrescentar sem mudar IDs/índices.
- Ícones de menu e conteúdo **maciços** na própria cor, símbolo na cor da superfície.
- Identificador do cabeçalho em círculo de 30 px, sem placa.
- A tela seguinte repete o ícone da opção que a abriu.

## Diálogos
- Herdam o acento da aba (`unified-dialogs.js`).
- Continuar/Cancelar em duas colunas de 44 px.
- Remover pede confirmação **no próprio quadro** — nunca `confirm()` nativo.

## Tema escuro
- O botão Luz/Sombra governa todas as telas e diálogos. Superfície `rgb(34,33,40)`, campos
  `rgb(48,47,55)`. Seletores sincronizam `color-scheme`.
