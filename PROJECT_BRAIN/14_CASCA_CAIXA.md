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

- Abertura do caixa: 3 blocos (onde operar · conferir malote pelo lacre — na casca só o `001` —
  com "Sim, confere"/"Não confere", contagem e motivo da divergência · responsáveis e maquininha),
  lista de pendências depois da primeira tentativa, "Confirmar abertura do caixa" e estado
  "Caixa aberto". Conferida no navegador.

## Falta (na ordem)

1. Turno: resumo (saldo lacrado para o operador), recebimentos pendentes, PDV ligado/desligado com
   motivo da parada, sangria com lacre, vendas do turno, canceladas, "Encerrar vendas".
2. Fechamento: gerente responsável + 4 etapas (Vendas com contagem cega e folha CREARE,
   Maquininha, Relatório final, Fechamento com esperado × contado, lacre e observação) + revisar.
3. Gerência/Tesouraria (setores Gerência e Financeiro de Entradas): monitor de caixas abertos,
   mensagens, histórico com filtros, detalhe, "Fechou certo" / "Teve quebra".
4. Conferência 1440/1024/768/390 nos temas Luz e Sombra.

## Desenvolvimento

`npm run dev` em `servidor` serve o site em http://localhost:4200. Em `npm run dev:web` (:3100), o
`nuxt.config.ts` repassa `/entrar.html` e `/api` para a :4200 (antes o login entrava em loop até 431).
