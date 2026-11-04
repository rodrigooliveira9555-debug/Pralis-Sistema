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
- **Enter avança para o próximo campo e nunca salva.**
- Cancelar/Voltar transparentes; Salvar/Avançar preenchidos no acento.
- Nome passa por `formatSystemName` (exceções: PDV, 1M–4T).
- CPF, moeda (centavos) e data validados em `field-validation.js` — nunca validar por tela.
- Todo cadastro com identificador oferece "Ícone ou 3 caracteres", com prévia.

## Datas
- Exibição **DD/MM/AA**, **sem ícone de calendário**. Valor guardado em ISO.
- Data nova: 00–49 → 2000–2049; 50–99 → 1950–1999. Data existente mantém o século.
- Calendário do rodapé só filtra registros com data explícita; bloqueia intervalo invertido.

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
