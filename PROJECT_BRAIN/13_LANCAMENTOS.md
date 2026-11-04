# 13 — Lançamentos (app novo, regras do Sistema Pralis)

> Decisão de 03/11/2026 (Marco): o CICLUZ ganha um app de verdade (Nuxt + Vuetify + TypeScript,
> igual ao web-vue do principal) para as telas NOVAS, em `/app/` no mesmo domínio do site. A
> primeira tela é Lançamentos, com as regras do principal (PROJECT_BRAIN/17 do principal). As telas
> antigas (HTML) continuam até serem refeitas uma a uma no app, cada uma removendo a versão HTML.

## Onde está
- Tela: `servidor/web/pages/lancamentos/` (Despesas, Mercadorias, Retiradas; Entradas = consulta).
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
