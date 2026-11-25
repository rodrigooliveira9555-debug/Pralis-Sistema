# 16 — Mapa do "Novo" do sistema principal: Despesa, Mercadoria e Retirada (24/11/2026)

> Pedido do Washington: mapear o que o "+ NOVO → Saídas" do principal tem (Despesa, Mercadoria,
> Retirada) para completar **Saídas → Lançamentos** do CICLUZ. Este arquivo é só o **mapa** e o
> **quadro de diferenças**; nada foi construído ainda. Não há dado real de pessoa, fornecedor ou
> conta aqui (as listas de produção foram vistas e **não** copiadas).

## 1. De onde veio (e o que NÃO foi visto)
- **Código (fonte principal):** `C:\CICLUZ\Pralis-Principal`, último commit `4773a7c2` de 19/11/2026
  (0 commits atrás do GitHub em 24/11). Arquivos: `web-vue/components/operacoes/OperacaoLancamento*.vue`
  e `useOperacaoLancamento.ts`, `utils/opcoes-operacao.ts`, `utils/credor-categoria.ts`,
  `utils/operacoes.ts` (validação), `AppWorkspace.vue` (salvar) e `PROJECT_BRAIN/17_REGRAS_LANCAMENTOS_FINAIS.md`
  do principal (a spec vigente, D1–D12).
- **Conferência visual (produção):** `sistema.cicluzieai.com.br`, login Administrador, **só leitura**:
  abriu "+ NOVO → Saídas", olhou as três abas, rolou o formulário e **fechou sem salvar**. Ordem,
  rótulos e chips bateram com o código.
- **Não visto:** fluxo com **caixa aberto** (operador: conta travada), mensagens de erro do servidor,
  tema claro, Entradas (só consulta) e Transferência (fora deste pedido).

## 2. Como se chega ao formulário
- Botão roxo **"+ NOVO"** (menu lateral) abre um menu com **Transferências** e **Saídas** (Despesa,
  mercadoria ou retirada). **Não há "Entradas" ali:** entrada não se lança à mão (R-062; D7: Entradas é
  só consulta das vendas integradas).
- **Saídas** abre o modal **"Nova Despesa"** com **3 botões no topo — Despesa · Mercadoria · Retirada** —
  que trocam a categoria **sem fechar** (só ao criar; ao editar não troca). A cor do modal acompanha:
  **vermelho** (Despesa), **verde** (Mercadoria), **azul** (Retirada). Título: "Nova …" / "Editar …".
- Rodapé: **Salvar e criar nova** (texto) e **Salvar** (cheio).

## 3. Campos, de cima para baixo (o que cada aba mostra)
| Bloco | Campo (rótulo na tela) | Despesa | Mercadoria | Retirada | Regra / observação |
|---|---|:-:|:-:|:-:|---|
| Valor | **R$ 0,00** (grande) | ✔ | ✔ | ✔ | dinheiro, 2 casas |
| Valor | **Juros** (0,00) | ✔ | ✔ | ✔ | guarda até 4 casas; **R$ ou %** (`jurosTipo`); incide só no valor (D10); o servidor recalcula (R-041). O seletor R$/% **não apareceu** no modal de produção: conferir |
| Valor | **Valor Total** | ✔ | ✔ | ✔ | somente leitura = Valor + Juros |
| Datas | **Data Lanç** (botão "Hoje" + data) | ✔ | ✔ | ✔ | padrão hoje; na Retirada fica sozinha na linha |
| Datas | **Data Doc. Fiscal** | ✔ | ✔ | — | emissão |
| Datas | **N° Doc. Fiscal** (000000) | ✔ | ✔ | — | |
| Credor | **Tipo de credor** (chips) | Fornecedor · Colaborador | Fornecedor | Fornecedor · Sócio ou Gestor | padrão Fornecedor; registro antigo de Retirada com Colaborador reabre com o chip legado (R-128) |
| Credor | **Credor** (lista conforme o chip) | ✔ | ✔ obrigatório | ✔ obrigatório | Despesa: credor opcional |
| Classificação | **Grupo** | — | — | ✔ | em Despesa e Mercadoria o grupo é **do item**, na discriminação (decisão do José, 04/08/2026) |
| Classificação | **Conta** | ✔ | ✔ | ✔ | contas vinculadas ao usuário (D8); **operador de caixa não escolhe**: fica travada na conta do PDV do caixa aberto (R-121); sem contas vinculadas mostra aviso |
| Texto | **Observação** (Ex.: Insumos — farinha e fermento) | ✔ | ✔ | ✔ | **obrigatória** (R-127: o texto do movimento é a observação) |
| Pagamento | **Pagamento** (Não/Sim) | ✔ | ✔ | — | padrão Não |
| Pagamento | **Data pagamento** | ✔ | ✔ | — | só habilita com Sim (Sim já põe hoje); mínimo hoje (exceto administrador); quem não é administrador nem lança sem caixa só pode **hoje** ("Caixa registra pagamento somente na data de hoje.") |
| Pagamento | **Data Vencimento** | ✔ | ✔ | — | |
| Anexos | **Foto (Recibo/Boleto/Nota)** e **Foto (Nota / interno)** | ✔ | ✔ | — | aceita imagem, PDF e XML |
| Discriminação | **Discriminar itens** (sanfona) | ✔ | ✔ | — | Retirada **não discrimina** (D12/R-050); ver §4 |
| Recorrência | **Recorrência** (sanfona) | ✔ | ✔ | ✔ | só quem tem a permissão de recorrência (D3: Admin, Gerência, Financeiro); ver §4 |

**Retirada é bem mais enxuta:** não tem Data Doc. Fiscal, N° Doc. Fiscal, Pagamento, Data pagamento,
Vencimento, fotos nem discriminação; tem Grupo no cabeçalho.

## 4. Os dois blocos que abrem (sanfona)
**Discriminar itens** (Despesa e Mercadoria; tabela única de 8 colunas):
- **Quant** · **Item** · **Grupo** · **V.Unit** (4 casas) · **V.Unit c/Desc** (tipo R$/% + valor) · **V.Total** · **V.Total c/Desc** (tipo R$/% + valor) · **%**; rodapé **V. Total geral**; botão **Adicionar item**; remover linha (a última não sai).
- **Item vem do cadastro, sempre** (sem "livre"): em **Mercadoria** é **Produtos**; em **Despesa** é **Patrimônio** e **Colaboradores** (R-135). Escolher o item preenche descrição e grupo. Registro antigo sem vínculo mostra a descrição antiga em cinza por baixo.
- **Grupo do item:** do cadastro da categoria (Despesas ou Mercadorias) e também do **Patrimônio** (valor `pat:<id>`); os dois nulos são aceitos.
- **Vale Presente / Desconto** geral (R$ ou %), com o resultado em reais. Descontos em 3 níveis, cumulativos; rateio clássico com sobra no último item (D4).
- **Soma dos itens ≠ valor do lançamento: não salva** e aponta a linha e o campo prováveis (D5).
- Dentro da sanfona há o bloco **Leitura por IA da nota** (a segunda foto vira sugestão revisável; nunca salva sozinha; R-192).

**Recorrência:** **Número de repetições** (1 a 366; conta o 1º), **Frequência** (dia · semana · mês · quinzena · **3 em 3** = trimestre · ano), **Dias** (Dom, Sg, Ter, Qa, Qi, Sx, Sa — só na frequência semana) e uma nota ("os seguintes nascem **não pagos**, vencendo na data; frequências curtas não passam de 12 meses"). Ao editar um item de série: **Cancelar lançamentos futuros da série** (só futuros e não pagos).

## 5. Validações antes de enviar (cliente) e listas que o modal carrega
- "**Informe a observacao do lancamento.**" (todas) · "**Selecione o fornecedor da mercadoria.**" (Mercadoria) · "**Selecione o credor da retirada.**" (Retirada) · editar lançamento de outra conta sendo operador: "**Este lançamento saiu de outra conta e a correção passa a ser da Tesouraria.**". Grupo e itens são **opcionais** em Despesa e Mercadoria.
- Listas por categoria: **Despesa** = contas, fornecedores, colaboradores, patrimônio (itens e grupos), grupos · **Mercadoria** = contas, fornecedores, produtos, unidades de medida, grupos · **Retirada** = contas, fornecedores, colaboradores (só legado), sócios e gestores, grupos.
- Em produção as contas dos PDVs se chamam **"Conta TNP-PC-CXPDV-1" a "-4"** (os mesmos nomes dos computadores que cadastramos em VND - Computadores), ao lado das contas "CNT CONTA - …" e do cofre.

## 6. Quadro de diferenças com o Lançamentos que o CICLUZ já tem
CICLUZ hoje (`servidor/web/components/lancamentos/`, `/app/lancamentos/<categoria>`): Data do lançamento, Vencimento, Pago em (vazio = não pago), Valor, Observação, Grupo, Conta (guarda o **nome**), Tipo de juros + Juros, Nº e Data do documento fiscal, Discriminar itens (descrição livre, Qtd, V. unit, descontos unit/total, grupo), desconto geral, Repetir (recorrência) e o resumo Juros/Desconto/Valor total. Permissões: pagar, editar pago, recorrência.

| # | Tema | Principal | CICLUZ hoje | Situação |
|---|---|---|---|---|
| 1 | Troca de categoria | 3 botões no topo de **um modal** | uma tela por categoria | **decidido: sem modal e sem os 3 botões; uma tela para cada categoria** (Washington, 24/11/2026) |
| 2 | Credor tipado | chips Fornecedor / Colaborador / Sócio ou Gestor + lista | **não tem** | falta (fornecedor e colaborador já existem em Compras e no DP; **Sócio/Gestor não existe**, D1) |
| 3 | Pagamento | botão Sim/Não + Data pagamento (regras de data) | "Pago em" (vazio = não pago) | equivale; faltam o Sim/Não e as regras de data mínima/só hoje |
| 4 | Retirada | sem pagamento, vencimento, doc fiscal e fotos | mostra vencimento obrigatório, pago em e doc fiscal | **divergente**: seguir o principal? |
| 5 | Grupo | no cabeçalho só da Retirada; nos itens em D e M | Grupo no cabeçalho de todas | divergente |
| 6 | Fotos | 2 anexos (recibo/boleto/nota e nota/interno; imagem, PDF, XML) | **não tem** | falta (decidir onde guardar) |
| 7 | Discriminação | item do cadastro (Produtos / Patrimônio / Colaboradores), grupo do item, V.Total c/Desc, %, Vale Presente | descrição livre, descontos, grupo | falta o **vínculo do item** e a coluna/linha de desconto geral no formato do principal |
| 8 | Conta | só contas vinculadas ao usuário; travada pelo caixa aberto; saldo (R-165) | lista de nomes, sem vínculo | falta (D8 conta com fundo + usuários; R-121; depende do Caixa) |
| 9 | Salvar e criar nova | tem | só Salvar | falta |
| 10 | Valor Total | campo somente leitura | resumo no fim | equivale |
| 11 | Recorrência | D3, teto 12 meses, cancelar série | tem (mesmas regras) | ok |
| 12 | D5 (soma dos itens) | bloqueia e aponta a linha | bloqueia e aponta a linha | ok |
| 13 | Entradas | não se lançam | não se lançam | ok |

## 7. O que depende de decisão (vai para o doc 11, P-47)
(a) **Retirada enxuta** como no principal (sem pagamento, vencimento, doc fiscal, fotos) ou manter o CICLUZ atual; (b) **Sócios e Gestores** (cadastro próprio, D1): criar agora ou depois; (c) **credor Colaborador na Despesa** liga ao DP pelo **id**; (d) **conta**: vínculo usuário × conta (D8), conta travada do caixa (R-121) e a ligação com **VND - Computadores** (o computador do PDV ↔ conta "TNP-PC-CXPDV-n"; ver P-45); (e) **fotos e NF-e / IA**: onde guardar o arquivo e se a leitura por IA entra; (f) **Patrimônio na discriminação de Despesa** (R-135): usar o cadastro de RET - Patrimônios; (g) **campos novos no banco** (credor, anexos, item vinculado): **migration a autorizar**.

## 8. Proposta de entrega em passos (a combinar)
1. **Forma do formulário**, sem banco novo: **uma tela de formulário para cada categoria, sem modal** (DES - Despesas, MER - Mercadorias e RET - Retiradas), na cor da origem, com a ordem e os rótulos do principal, Pagamento Sim/Não, Valor Total, Retirada enxuta e "Salvar e criar nova".
2. **Credor tipado** (Fornecedor e Colaborador, por id): precisa de colunas novas (migration).
3. **Discriminação com item de cadastro** (Produtos / Patrimônio / Colaboradores), grupo do item e desconto geral/Vale Presente.
4. **Anexos** (2 fotos) depois de decidir o armazenamento.
5. **Conta, caixa e saldo** (D8, R-121, R-165) junto com o Caixa e os computadores.
6. **Leitura por IA da nota**: fora por ora.

## 9. Decisão do Washington (24/11/2026): sem modal, uma tela por categoria
O que se quer reproduzir é **o formulário que abre em "+ NOVO → Saídas"** (os campos do §3 e §4), **não** as listas do menu Lançamentos do principal (essas não fazem parte do pedido; o CICLUZ já tem as suas listas).
**Decisão:** o principal mostra o formulário num **modal único** com 3 botões de troca. No CICLUZ **cada categoria tem o seu formulário, separado e sem modal**: o formulário de **Despesa** em **DES - Despesas**, o de **Mercadoria** em **MER - Mercadorias** e o de **Retirada** em **RET - Retiradas** (Saídas › Lançamentos), cada um **numa tela própria**, no padrão dos cadastros do CICLUZ (cabeçalho, conteúdo, rodapé) e na cor da origem, **sem os 3 botões de troca**. O código pode ser um componente só, configurado por categoria, para não haver três caminhos para o mesmo ato.
**Em aberto:** ao tocar no cartão (DES - Despesas etc.), a tela abre **direto no formulário de lançar** ou na **lista** dos lançamentos já feitos, com um botão de criar que leva ao formulário? (hoje o CICLUZ abre a lista e usa uma janela para o formulário).
