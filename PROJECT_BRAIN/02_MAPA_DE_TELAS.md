# 02 — Mapa de telas

O menu é montado em JS (`index.html:154-176`); o `<nav>` estático é substituído. O usuário pode
arrastar itens (ordem em `cicluz-menu-ordem`). `agenda-menu.js` divide a lateral em GESTÃO /
AGENDA / OUTROS.

**Endereço de cada tela (06/11/2026, pedido do Marco):** toda tela aberta pelo menu tem endereço
próprio, `#/<menu>/<item>/<cartão>/…`; Voltar/Avançar do navegador, F5 e link copiado reabrem a
mesma tela. Ex.: `#/entradas-vendas/lancamentos/caixa-abertura`,
`#/configuracoes/usuarios/acessos-usuarios`, `#/avaliacoes/avaliacao-individual`, `#/visao-geral`.
`dist/rotas.js` grava o caminho dos cliques (menu lateral → item → cartões) e, para reabrir, repete
os mesmos cliques; as telas não sabem que existe rota. O menu vira slug do nome (`Saídas · Despesas
/ Custos` → `saidas-despesas`), o item idem, e o cartão é o `data-target` em slug (`caixa:abertura`
→ `caixa-abertura`). Renomear item ou cartão muda o endereço; endereço que não leva a nada fica só
com o que abriu. Fora das rotas: abas, filtros e passos dentro de uma tela, e o link do cadastro
completo (`#cadastro-completo/<token>`, do `people.js`). Substitui o atalho `#acessos:<tela>`.

**Status:** ✅ funciona (salva no localStorage) · 🟨 maquete (dados fixos / não salva) · ⬜ vazia
(só "Área prevista… próximas etapas").

**Placar: 14 ✅ · 13 🟨 · 24 ⬜.**

## Visão geral — 🟨
Texto fixo "reunirá os principais números".

## Entradas · Vendas/Faturamento (VND, amarelo)
- ⬜ Caixas · ⬜ Gerência · ⬜ Financeiro

## Transferências · Contas/Locais (CNT, laranja)
- ⬜ Tesouraria · ⬜ Financeiro · ⬜ Diretor Geral

## Saídas · Despesas/Custos (DES, vermelho)
- 🟨 **Gestão de Pessoas** — 8 cartões: Painel (4 indicadores + pendências), Colaboradores (3 nomes
  fixos), Processos (Admissão/Desenvolvimento/Desligamento), Lançamentos e registros, RH, DP,
  Pré-fechamento DES, Relatórios. Modal "Novo lançamento" só faz `alert('Rascunho salvo nesta
  maquete')` (`index.html:152`).
- 🟨 Financeiro · Lançamentos financeiros (`#launch`)
- 🟨 Financeiro · Grupo de despesas (`#groups`)
- ⬜ Gerência, DP, Fiscal, Financeiro, Diretor Geral (5)

## Saídas · Mercadorias/CMV (MER, verde)
Organização do Rodrigo (vídeo de 06/11/2026); detalhes no `DESIGN_SYSTEM.md`, regra "Compras encaixado no menu de Mercadorias".
- ✅ **Lançamentos** (`dist/compras/`): MER - Pedido de Compra, MER - Cotação por Fornecedor, MER - Pedidos a Receber,
  MER - Contagem de Estoque. ⬜ MER - Mercadorias (espaço reservado).
- 🟨 **Produção** (`dist/producao/`, 05/11/2026, aguardando aprovação do Zé) — pedido de produção da TNP, no lugar
  pela lógica do vídeo do Rodrigo. **Agenda → MER - Agenda de Produção** (janela de demanda, repetição do Compras,
  quantidade pré-programada). **Lançamentos Produção**: MER - Pedidos de Produção (para fazer, pedido extra, Repor
  estoque com sugestão aprovada), MER - Mapa de Produção (por horário, processo, setor ou produto; iniciar/concluir etapa
  em sequência; capacidade repete o processo), MER - Abastecimento (real, conferência em 1 ou 2 etapas, todos ou só a
  curva A, sobra que volta ao estoque e descarte). **Relatórios**: MER - Produção. **Cadastros Geral Produção**:
  MER - Produtos da Produção (utensílio, fornada, meia, múltiplos, mínimo/máximo), MER - Ficha Técnica de Produtos (várias por produto; etapas com ingredientes, equipamento, tempo, acompanhamento, cargo
  e nível; custo C1–C5 e valor sugerido) e MER - Parâmetros de Custo. Usa o estoque do Compras (entrada da produção, consumo
  de ingredientes, abastecimento, sobra). Especificação: `docs/PRODUCAO_ESPECIFICACAO.md`.
- ⬜ **Relatórios**: MER - Mercadorias e MER - Pedidos (espaços reservados).
- ✅ **Cadastros Geral**: MER - Grupos de Mercadorias, MER - Fornecedores, MER - Produtos, Unidades de Medida,
  MER - Catálogo e Preço-Base.
- ✅ **Estoques**: MER - Grupo Mercadorias. **Agenda → MER - Agenda de Pedidos** (agendamento do Compras).

## Saídas · Retiradas/Investimentos (RET, azul)
- ⬜ Financeiro, Diretor Geral (2)

## Resultados · Relatórios (roxo)
- ⬜ 4 setores

## Agenda · Atividades (roxo)
- ✅ **Agenda** (`dist/agenda/`, 05/11/2026) — funcionamento do Lembretes e do Calendário do iPhone + Kanban.
  Os dois submenus abrem a lista de mesmo nome. Listas automáticas (Para hoje, Programados, Todos, Sinalizados,
  Atrasados, Atribuídos a mim, Concluídos), listas com cor e ícone, escrever "amanhã às 10", repetição, término,
  alerta com soneca, URL, local, subtarefas, ordem manual, mostrar/limpar concluídos. Calendário Dia/Semana
  (grade de horas)/Mês/Ano. Kanban com colunas editáveis. Local no mapa (Atual, Ao entrar, Ao sair, Personalizada).
  Responsáveis e permissões do gestor, avaliação da execução. Mapa mental (estruturas Mapa, Lógico, Organograma,
  Árvore, Linha do tempo; agrupar por lista, data, responsável, prioridade, coluna, etiqueta; relações; exporta).
- ✅ Chat e arquivos do compromisso (servidor: tabelas `agenda_mensagens`, `agenda_chat_leituras`,
  `agenda_arquivos`, migration 0003 aprovada pelo Zé em 05/11/2026). ⬜ Perfil comportamental: em espera (P-19).

> **05/11/2026 (reorganização por origem, vale esta):** as linhas dos cinco tópicos de OUTROS foram para os cabeçalhos Lançamentos, Relatórios, Cadastros Geral, Estoque e Pastas Documentos de cada menu de origem; OUTROS só tem Configurações. Detalhe em `DESIGN_SYSTEM.md`.
>
> **Anterior, superada:** os grupos "Configuração · Cadastros Gerais" e "Formulários · Cadastros/Avaliações" viraram cinco tópicos em OUTROS: Configurações (Permissões, Usuários, Senhas, todos vazios; sem Diretor de Operações), Cadastros (Gerente → VND - Clientes, vazio; Diretor de Operações → DES - Fornecedores (vazio), patrimônio, grupos DES/MER/RET/VND/CNT; Compras → MER - Fornecedores e MER - Produtos; Gestão de Pessoas → `people-settings`), Lançamentos (Financeiro → oito cards VND/DES/CNT/MER/RET/RES/CAR/PDV, vazios; Gestão de Pessoas → `forms`: só Uniformes, Compras de Uniformes e Ocorrências; os cadastros de candidato/colaborador ficam em Cadastros › Gestão de Pessoas), Estoques (Compras → três cards MER - Grupo Mercadorias, DES - Grupo Despesas, RET - Grupo Patrimonio, vazios) e Avaliações (Diretor de Operações, Gerentes, Colaboradores, Clientes, vazios). As seções abaixo mantêm o conteúdo; só mudou onde ficam no menu. Detalhe em DESIGN_SYSTEM.md.

## Configuração · Cadastros Gerais (roxo)

### Gestão de Pessoas (`people-settings`)
- ✅ **Organograma** (`organogram.js`) — posições ligadas a cargo, "Responde a".
- ✅ **Área → Setor → Local → Sublocal** (`location-tree.js`) — nome, sigla, cor, ícone; excluir
  exige transferir antes (`preserve-history.js`).
- ✅ **Cargos** — 32 de referência (`index.html:198`): nome, nome reduzido (≤15, automático), ícone,
  cor, categoria, CBO, título CBO, salário de referência, ano, sinônimos, descrição.
- ✅ **Atualização salarial** — valor por cargo + início de vigência; `salaryAsOf` (linha 239).
  "Atualizar lista" preserva valores digitados e não grava vigência.
- ✅ **Ficha de Cargos** (`job-profiles.js`) — matriz área × cargo, 8 grupos (Formação, Experiência,
  Certificações, Competências técnicas/comportamentais, Entregas individuais/grupo/coletivas).

### Diretor de Operação (`settings`) — ver doc 03
- ✅ Contas (CNT) · ✅ Grupos de Vendas (VND) · ✅ Tipos de Venda (13) · ✅ Bandeiras (41)
- ✅ Operadoras (10) com taxas · ✅ Despesas (DES) · ✅ Mercadorias (MER) · ✅ Retiradas (RET)

## Formulários · Cadastros/Avaliações (roxo)
- ✅ **Cadastro completo c/ dependente** (`complete-registration.js`) — 4 etapas: (1) CPF e dados
  pessoais, (2) endereço e contato, (3) outros documentos, (4) dependentes. Anexos **não** são salvos.
- 🟨 Cadastro simples — nome, CPF, função, turno, admissão. Não salva.
- ✅ RET - Patrimônios (`dist/producao/telas-patrimonio.js`, 05/11/2026; abre em Saídas · Retiradas → Cadastros Geral) — salva em `cicluz-patrimonio-v1`: bem, categoria
  (Utensílio, Máquina, Equipamento, Mobiliário), marca, modelo, série, nº (único), valor, local pela árvore, capacidade,
  medidas, energia e consumo por hora. A prévia antiga (`#asset-view`, não salvava) foi removida.

## Legado
- `#config-view` ("Configurar") — tela antiga sem atalho (UI_SWEEP 01/11). Candidata a remoção.
