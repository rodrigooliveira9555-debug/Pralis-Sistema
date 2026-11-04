# 14 — Casca do Caixa no app novo (EM ANDAMENTO, pausada em 04/11/2026)

> Pedido do Marco (04/11/2026): desenhar o Caixa do Sistema Pralis principal (abertura, turno,
> fechamento, Tesouraria) no layout do CICLUZ. **Só casca**: sem backend, dados fictícios, nada
> gravado. **Só localhost**: branch local `feat/casca-caixa-20261104`, sem push, sem PR, sem merge.

## Onde está

- App novo (Nuxt): `servidor/web`, rota `/app/caixa` (dev: `npm run dev:web` → http://localhost:3100/app/caixa).
- Dados fictícios: `servidor/web/utils/caixa-casca.ts`. Estado em memória: `servidor/web/composables/useCaixaCasca.ts`.
- Estilos do Caixa: `servidor/web/assets/caixa.css`. Componentes: `servidor/web/components/caixa/`. Páginas: `servidor/web/pages/caixa/`.
- Menu lateral: seção "Caixa" (Meu caixa · Caixas), cor de origem Vendas (#a16207), porque no site o
  Caixa fica em Entradas · Vendas / Faturamento.

## Direção de arte (Design Gate do brief: verde)

Conceito "Caixa lacrado": o que o operador declara fica selado na hora e o dinheiro só "fala" no
fechamento. Assinatura: trilha do turno (faixa da marca inteira + marcos Abertura · Turno ·
Fechamento · Tesouraria). Cabeçalho nunca muda de cor por estado; o estado vai num selo branco.
Diferença sempre com sinal + palavra + ícone (falta vermelho, sobra âmbar, bateu verde). Contagem
cega: o esperado não aparece para o operador antes da etapa 4 do fechamento.

## Feito

- Base: dados, estado, estilos, `CaixaTela` (moldura + selo + trilha + aviso de casca com "Ver como"
  Operador/Gerência/Tesouraria e "Reiniciar"), `CaixaJanela`, `CampoDinheiro`, `Dinheiro`.
- Abertura completa (3 blocos + "Confirmar abertura do caixa"), conferida no navegador.
- Turno: `RecebimentosPendentes` e `FaixaPdv` escritos (não testados).
- Botões sem caixa alta no app inteiro (`cicluz.css`: `.v-application .v-btn`).

## Falta (na ordem)

1. `pages/caixa/turno.vue` + resumo (saldo lacrado para operador, visível para Gerência), sangria
   com lacre, vendas do turno, canceladas, encerrar vendas.
2. `pages/caixa/fechamento.vue`: gerente responsável + 4 etapas (Vendas com contagem cega e folha
   CREARE, Maquininha, Relatório final, Fechamento) + "Revisar fechamento do caixa".
3. `pages/caixa/encerrado.vue` e `pages/caixa/acompanhamento.vue` (monitor de abertos, mensagens,
   histórico com filtros, detalhe, "Fechou certo" / "Teve quebra").
4. Revisores (design, a11y, frontend), conferência 1440/1024/768/390 Luz/Sombra, `check`.

## Para usar no localhost

Conta de teste só do banco local (porta 5545); a senha está fora do repositório, em
`D:\DevCaches\tmp\cicluz-conta-teste-local.txt`. Não vale em produção.
