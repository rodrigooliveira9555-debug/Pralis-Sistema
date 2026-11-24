# 13 — Lançamentos (app novo, regras do Sistema Pralis)

> Decisão de 03/11/2026 (Marco): o CICLUZ ganha um app de verdade (Nuxt + Vuetify + TypeScript,
> igual ao web-vue do principal) para as telas NOVAS, em `/app/` no mesmo domínio do site. A
> primeira tela é Lançamentos, com as regras do principal (PROJECT_BRAIN/17 do principal). As telas
> antigas (HTML) continuam até serem refeitas uma a uma no app, cada uma removendo a versão HTML.

## Onde está
- Tela (**24/11/2026, Washington — supera a decisão de 03/11 só para estas três categorias**): **Despesas, Mercadorias e Retiradas são telas do SITE**, em `dist/lancamentos/lancamentos.js` (janela de edição no padrão do Design System, aberta direto pelo cartão, com as peças de `dist/compras/ui.js`), abertas pelos cartões DES - Despesas, MER - Mercadorias e RET - Retiradas de Saídas › Lançamentos. Falam com a mesma API; a conta de dinheiro da prévia é a do servidor (`dist/lancamentos/regras.js`, gerado de `servidor/shared/src/lancamentos/regras-site.ts` por `servidor/scripts/gerar-regras-lancamentos.mjs`; o teste confere que está igual). **No app novo (`servidor/web`) ficou só Entradas (consulta)**; o menu dele leva ao site nas três Saídas. Motivo: o app novo tinha outro visual e menu lateral; o pedido foi seguir o padrão do site (como o Cadastro de operadora).
- API: `servidor/api/src/lancamentos/` (`/api/lancamentos/:categoria`, `/api/lancamentos/item/:id`,
  `/discriminar`, `/api/lancamentos/series/:id/cancelar`).
- Banco: `lancamentos`, `lancamentos_itens`, `lancamentos_recorrencias` (migration 0002). Aqui o
  banco é a FONTE DA VERDADE (não é tabela derivada).
- Regras de dinheiro: `servidor/shared/src/lancamentos/` — COPIADAS do principal sem mudança
  (dinheiro, discriminação, recorrência, datas). A tela usa as mesmas funções para a prévia.

## Regras aplicadas (iguais ao principal)
- Campos: data do lançamento, vencimento, pago em (vazio = não pago), observação obrigatória, valor,
  juros (% ou R$, convertido pelo servidor; incide só no valor, D10), conta e grupo do cadastro,
  documento fiscal.
- Discriminação só em Despesas e Mercadorias (D12): a soma dos itens tem de bater exatamente com o
  valor (D5, bloqueia o salvar e mostra a linha provável); desconto geral rateado com sobra no último
  item (D4). Discriminar depois é permitido.
- Recorrência (D3): a série inteira nasce ao salvar; dia/semana/quinzena/mês param em 12 meses;
  trimestre e ano seguem o número de repetições; a 1ª ocorrência mantém o pagamento.
- Cancelar série: apaga só as ocorrências futuras e não pagas. Lançamento avulso não se apaga.
- Data de pagamento: Despesa/Mercadoria não pode ser anterior a hoje, exceto o administrador
  (R-203); Retirada nunca anterior a hoje (R-129) — diferença herdada do principal.
- Entradas: não se lançam à mão (R-062); a tela aguarda a fonte de vendas.

## Decisões tomadas aqui (confirmar com o Rodrigo)
- **Permissões (P-12):** administrador faz tudo; usuário vê, cria, edita lançamento não pago e
  discrimina. Pagar, editar pago, recorrência e cancelar série = só administrador.
- Conta e grupo guardam o nome junto (sem FK), porque os cadastros ainda moram nas telas do site.

## Pendente (o CICLUZ ainda não tem o cadastro)
- Credor: fornecedor (obrigatório na Mercadoria no principal), sócio/gestor (Retirada), colaborador.
- Saldo da conta e "saldo insuficiente" (R-165): exige o fundo da conta (D8), campo que a tela de
  contas do site não tem.
- Caixa/PDV, NF-e, foto da nota e leitura por IA.
- Fonte das Entradas: robô do CREARE ou a API em avaliação (endereço ainda não existe no DNS).

> **Mapa completo do formulário do principal e quadro de diferenças (24/11/2026):** `16_MAPA_LANCAMENTOS_PRINCIPAL.md`; decisões em aberto no P-47 (doc 11).
