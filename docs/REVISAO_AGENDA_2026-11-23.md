# Revisão completa da Agenda — 23/11/2026

Revisão pedida pelo Zé, feita sobre a `main` em `f63bdf2`. Nada foi alterado no código.

## Como foi feita
- Testes automáticos: `tests/agenda-dominio.cjs` (125 verificações), `tests/agenda-mapa-layout.cjs` (30) e
  `tests/agenda-telas.mjs` (535 verificações no navegador, incluindo 80 combinações de tela × largura × tema).
  **Todos passaram.**
- Telas abertas no navegador, com dados inventados: listas, calendário (mês e semana), Kanban, mapa mental e a
  janela de editar compromisso, em 1024, 390 e 320 px, claro e escuro. Nenhuma rolagem lateral.
- Quatro revisores do time só leram o código: design, estrutura, segurança e regras/dados (pré-mortem).
- Publicação: a API no ar responde às rotas da Agenda (chat e arquivos) com 401 sem login, ou seja, a migration
  0003 está no ar. O endereço do site no Vercel não está no repositório, então o site não foi conferido.

Legenda: **[C]** = confirmado por mim, rodando ou lendo o trecho; **[R]** = apontado por um revisor, lido no código e não reproduzido.

## 1. Graves (resolver antes de usar a Agenda de verdade com várias pessoas)

| # | O que acontece | Onde |
|---|---|---|
| G1 [C] | **O sigilo não existe para quem é de dentro da empresa.** O servidor decide quem acessa o chat e os arquivos lendo o documento `cicluz-agenda-v1`, e qualquer usuário logado pode regravar esse documento inteiro (`PUT /api/documentos` não confere nada por compromisso). Basta pôr o próprio id em `criadoPor` para virar gestor de qualquer compromisso e ler o chat e os arquivos. A dívida DT-15 subestima isso: diz que chat e arquivos "já são conferidos no servidor". | `servidor/api/src/agenda/agenda.service.ts:19-41`, `servidor/shared/src/agenda.ts:43-49`, `servidor/api/src/documentos/documentos.service.ts:71` |
| G2 [C] | **Código malicioso pela cor da lista.** A cor da lista entra no mapa mental sem tratamento (`innerHTML`). Quem gravar uma "cor" com código faz esse código rodar no navegador de todos que abrirem o mapa mental, com a sessão de cada um. | `dist/agenda/mapa-mental.js:258` |
| G3 [C] | **O texto que a pessoa está digitando some.** A tela se redesenha sozinha a cada minuto e a cada mensagem nova do chat. Quem está escrevendo em "Novo compromisso", na busca ou renomeando no mapa mental perde o texto e o foco. (Reproduzido no navegador.) | `dist/agenda/telas.js:74-78`, `:123` |
| G4 [R] | **Alteração some com dois aparelhos.** A Agenda inteira é um documento só. Se o iPad e o computador mexem ao mesmo tempo, um deles recebe "outro aparelho salvou antes"; o que ele fizer depois vai para o histórico do servidor e some da tela ao atualizar. Com gestor avaliando no computador e responsável concluindo no iPad, isso vira rotina. | `dist/cicluz-sessao.js:37-48`, `:106-115` |
| G5 [R] | **Avaliações e permissões são editáveis por qualquer um.** A regra "nota registrada não muda" e as permissões (ver, editar, concluir, excluir) só existem na tela. O documento vai inteiro para todos os aparelhos, com as avaliações de desempenho e os comentários (dado pessoal, LGPD). | `dist/agenda/dominio.js:413`, `dist/agenda/dados.js:110` |

## 2. Médios (erro de funcionamento que o usuário vai notar)

| # | O que acontece | Onde |
|---|---|---|
| M1 [C] | Confirmação de excluir mostra o botão **"Salvar"** em roxo, em vez de "Excluir" em vermelho (fere a regra de 23/11 "excluir é vermelho"). A causa está na janela compartilhada `U.dialogo`, que vale para todo o sistema. | `dist/compras/ui.js:597-599` (usado em `agenda/telas.js:758`, `:223`, `mapa-mental.js:486`, `conversa.js:176`) |
| M2 [R] | Duplo toque no círculo de concluir: um compromisso que repete vira 2 cópias concluídas e pula uma ocorrência; um que não repete conclui também o de baixo. | `dist/agenda/dados.js:215-244`, `telas.js:284-288` |
| M3 [R] | "Adiar" o alerta grava no compromisso de todos e não confere permissão: quem só pode ver adia 1 h e o gestor deixa de ser avisado. | `dist/agenda/dados.js:283`, `alertas.js:90` |
| M4 [R] | O cartão de alerta fica velho: se a pessoa já concluiu pela lista e depois toca "Concluir" no cartão, o compromisso **reabre**. | `dist/agenda/alertas.js:98` |
| M5 [R] | Repetição presa à data antiga: trocar a data pelo formulário (ou arrastar no mapa mental) não move a "âncora". Um mensal criado no dia 31 e trocado para o dia 10 continua indo para o dia 30/31. Pelo calendário funciona certo, então são **dois caminhos com regras diferentes** para mudar a data. | `dist/agenda/telas.js:706`, `dados.js:367` × `dados.js:274` |
| M6 [R] | Repetição concluída com atraso conta a partir da data marcada, não de hoje: "toda segunda" de 02/11 concluída em 23/11 gera mais 2 ocorrências atrasadas (cópias falsas no histórico e avaliações pendentes). | `dist/agenda/dominio.js:246, 257` |
| M7 [C/R] | O texto livre entende números que não são data nem hora: "Comprar 1/2 saco" vira 01/02; "Ligar a 5 fornecedores" vira 05:00; "segunda via" vira a próxima segunda; "31/02" vira hoje; "ontem" é ignorado. A dica "Vai criar…" mostra a leitura antes do Enter. | `dist/agenda/dominio.js:451-466` |
| M8 [R] | Na linha do compromisso, a 320 px, o título pode ficar espremido quando a linha tem prioridade, link e bandeira juntos (a parte da direita não encolhe). Com dados simples não aconteceu. | `dist/agenda/agenda.css:92` |
| M9 [R] | Cor com sentido trocado: a coluna "Concluído" do Kanban é vermelha, e "Programados" (`#dc2626`) quase igual a "Atrasados" (`#b91c1c`). | `dist/agenda/agenda.css:43-46`, `:304`, `:320` |

## 3. Pequenos e dívida
- Lixeiras cinzas (tirar pessoa, tirar subtarefa), "Excluir" do mapa mental e "Limpar" concluídos fora do padrão vermelho.
- Alvos de toque menores que 44 px no iPad ("+N mais", dia do mês e do ano, links Limpar/Mostrar).
- Fontes de 10 px e cerca de 30 cores escritas direto no tema escuro, fora dos tokens de `ui-foundation.css`.
- Excluir lista, excluir coluna do Kanban, ligação e subtarefa do mapa mental apagam sem confirmar (lista e coluna só se estiverem vazias).
- Contagem de itens de lista ou coluna inclui os que a pessoa não vê: aparece "0" e mesmo assim a exclusão é recusada.
- Mapa mental agrupado por lista mostra todas as listas, mesmo com "Mostrar: Lista X"; a raiz repete o nome da lista.
- "Criado em" e "concluído em" usam o dia em UTC: concluído às 22h aparece no dia seguinte.
- A janela de editar repete o caminho "Agenda · Atividades / …" no cabeçalho e logo abaixo.
- `dominio.js` tem a 3ª cópia de validação de data (já existe em `date-fields.js` e `field-validation.js`).
- `telas.js` (840 linhas) e a função de desenho do mapa mental (~640 linhas) estão grandes demais.
- Pessoas vêm da lista provisória do Compras (P-18): quando chegar o cadastro de usuários com outros ids, vai precisar de migração.

## 4. O que está certo
- Sem `!important`, sem `<style>` inline, sem `MutationObserver`; nenhum resto do menu antigo (commit 7679093).
- Repetição em fim de mês e ano bissexto corretas (31/01 → 28/02 → 31/03; 29/02 → 28/02 → 29/02 em 2032).
- Datas DD/MM/AA pelo `date-fields.js`; botões só de ícone com nome para leitor de tela.
- Upload de arquivo bem protegido (tipo pelo conteúdo, 10 MB, HTML/SVG recusados, nome limpo no download).
- Chat, nomes de arquivo e endereços aparecem como texto (sem risco de código).
- Responsáveis ligados por id; avaliação não muda depois de registrada (na tela).

## 5. Decisões que dependem do Zé e do Rodrigo
1. Conflito entre aparelhos: juntar as mudanças compromisso por compromisso, ou continuar "vence quem gravou primeiro"? (mexe no servidor e no formato salvo)
2. Repetição atrasada: a próxima conta a partir de hoje?
3. Adiar o alerta vale só para a pessoa (neste aparelho) ou para todos?
4. Excluir o compromisso ou "Limpar concluídos" pode apagar avaliações já registradas?
5. Destino do chat e dos arquivos quando o compromisso é excluído (pendência antiga).
6. G1 e G5 só se resolvem de vez com o compromisso em tabela própria no servidor (doc 12). Até lá, dá para
   fechar o pior no servidor: recusar mudança em `criadoPor`, `pessoas` e avaliações feita por quem não é gestor.
