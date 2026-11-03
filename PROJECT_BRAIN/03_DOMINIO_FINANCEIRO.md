# 03 — Domínio financeiro (cadastro mestre)

O protótipo descreve **para onde o dinheiro pode ir**; ainda não registra dinheiro andando.

## Origens (siglas do sistema)

| Sigla | Origem                         | Cor      |
| ----- | ------------------------------ | -------- |
| VND   | Vendas / Faturamento           | amarelo  |
| CNT   | Contas / Transferências        | laranja  |
| DES   | Despesas / Custos              | vermelho |
| MER   | Mercadorias / CMV              | verde    |
| RET   | Retiradas / Investimentos      | azul     |

Cada item de grupo tem: `{id, name, active, icon, children[], identityMode, sigla, color, doc}` —
`doc` é **DOC/F, DOC/NF ou DOC/F/NF**. Ativos aparecem antes dos inativos.

## VND — Vendas
- Grupo **CAIXA PDV** com subgrupos **1M 1T 2M 2T 3M 3T 4M 4T** (PDV 1–4 × Manhã/Tarde).
- **NFE (EMPRESAS)** e **DELIVERY (IFOOD)**.
- **13 Tipos de Venda**, cada um com destino contábil:
  I-Dinheiro, D-Débito, C-Crédito, V-Voucher, P-Pix, P-Pix Banco (separado do Pix), R-Clientes,
  Crediário, E-Colaboradores (VND/DES), L-Alimentação −66,6%, F-Roubo/Furto, O-Sócios (VND/RET),
  S-Sobra/Perda (MER).
- **41 Bandeiras**, cada uma **obrigatoriamente** ligada a um Tipo de Venda pelo ID
  (`groups.js:1646`).

## Operadoras e taxas
- 10 operadoras: Stone, Getnet, Cielo, PagBank, SafraPay, Rede, Mercado Pago, SumUp, Ton, InfinitePay.
- Painel de taxas por bandeira (`groups.js:1658-1690`). Cada **regra de vigência**:
  início/fim · modalidade (débito, crédito à vista, parcelado lojista/emissor, voucher, pix…) ·
  faixa de parcelas · **MDR %** · **tarifa R$** · modo e taxa de **antecipação** · periodicidade ·
  prazo em dias (úteis/corridos) · observações.
- Cada regra liga um **Grupo de Despesa** (onde a taxa cai) e um **Grupo de Contas**
  ("Transferências Automáticas"). **Não gera lançamento.**
- Campo "Custos fixos da operadora" (aluguel/mensalidade).
- Regras: nada é preenchido automaticamente; vigências conflitantes são bloqueadas.

## CNT — Contas (seed em `index.html:266`)
- **Bancos:** Caixa Econômica, Santander, Safra, Itaú, Bradesco, Nubank, PagBank, Stone, Getnet,
  SafraPay.
- **Fluxos:** Crédito, Débito, Voucher, Pix, Crediário, Cartões, Caixa.
- **Cofre Principal, Cofre Troco** e **Caixa 1M a 4T**.
- **Por responsável:** Diretor, Diretor Operação, Diretor Financeiro, Gerência, Compras, Manutenção…
- Editor: nome, referência documental, situação (ATIVA…), ícone de banco ou financeiro, sigla, cor.

## DES — Despesas
28 grupos (98 itens recebidos), entre eles **TAXA CARTÕES** e **DESP. BANCÁRIAS**.

## MER — Mercadorias
17 grupos (79 itens). **Único com Finalidade: VENDA ou TRANSFORMAÇÃO**, sem inferência automática.

## RET — Retiradas
Investimento, Sócios, Pró-labore, Participação (4 grupos, 12 subgrupos).

## Setores financeiros por fluxo (DOSSIE §15)
- Entradas: Caixas / Gerência / Financeiro.
- Transferências: Tesouraria / Financeiro / Diretor Geral.
- Saídas: conforme o mapa do doc 02.

## Regras de domínio que ainda precisam de confirmação
Os destinos contábeis de Roubo/Furto, Sobra/Perda, Colaboradores e Sócios, e o −66,6% da
Alimentação, **não estão explicados** nos documentos. Antes de virar regra de sistema, confirmar com
Rodrigo e cruzar com o `19_REGISTRO_DE_REGRAS` do sistema principal (doc 11).
