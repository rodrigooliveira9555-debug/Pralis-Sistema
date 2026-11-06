# 15 — Usuários, cargos de acesso e permissões (Configurações)

> Pedido do Marco (06/11/2026): telas de Permissões, Usuários (criar contas pelo próprio sistema,
> gravando no banco), cargos e postos do caixa, como no Sistema Pralis principal, **com uma tela de
> permissões menos complexa que a do principal**. Branch `feat/usuarios-cargos-permissoes-20261106`.

## Onde está

- Menu **Configurações** (OUTROS, roxo #7c3aed): Usuários → *Pessoas com Acesso*, *Dados no
  Servidor*; Permissões → *Cargos de Acesso*, *Acessos por Pessoa*; Senhas → *Minha Senha*,
  *Senha de Outra Pessoa*. Código em `dist/acessos/`; atalho por endereço `#acessos:<tela>`
  (o nome no rodapé do menu lateral abre `#acessos:senhas`).
- Servidor: `servidor/api/src/acessos/` (cargos de acesso e exceções) e `servidor/api/src/usuarios/`.
  Catálogo de permissões e cálculo do acesso efetivo em `servidor/shared/src/acessos.ts`.
- Banco (migration `0004_cargos_acesso_e_postos`): `cargos_acesso`, `cargos_acesso_permissoes`,
  `usuarios_cargos_acesso`, `usuarios_permissoes`, `cargos_acesso_auditoria`; em
  `perfis_usuarios`, `posto_pdv` + `posto_turno` (únicos por empresa).
- **Removido:** `dist/usuarios.html/.js/.css` (Minha senha, pessoas com acesso e situação dos dados
  foram para as telas acima). O link "Usuários" do `/app/` aponta para `/#acessos:usuarios`.

## Decisões (Marco, 06/11/2026, a confirmar com o Rodrigo onde for regra de negócio)

1. **Cargo de acesso ≠ cargo do DP.** O S2 já tem "Cargos" (CBO, salário, ficha). O que libera tela
   e ação chama-se *cargo de acesso* (Caixa, Tesouraria, Gerência…). Uma Balconista pode ter o
   cargo de acesso Caixa.
2. **Modelo simples (menos que o principal):** cargo de acesso libera; exceção por pessoa libera ou
   bloqueia; o resto é negado. Sem camada de setor, sem montagem de menu, sem matriz. Uma pessoa
   pode ter vários cargos (vale a soma dos ativos).
3. **Um caminho por ato:** os cargos da pessoa são escolhidos só em *Pessoas com Acesso*; os ajustes
   (exceções) só em *Acessos por Pessoa*; senha de outra pessoa só em *Senhas*.
4. **Administrador** tem todas as permissões. Só ele cria/edita outro administrador e define a senha
   de outra pessoa (regra que já existia).
5. **Ninguém sobe o próprio nível** (quem não é administrador): toda mudança confere o **resultado
   final** da pessoa — o que ela ganha precisa estar no que o autor tem; não mexe nos próprios
   cargos nem nos próprios ajustes; não altera conta de quem tem acesso que ele não tem; só edita,
   ativa ou desativa cargo que está todo dentro do que ele tem.
6. **Contas de hoje não perdem acesso:** as contas que já existiam (marca
   `perfis_usuarios.acessos_configurados_em` nula, migration `0005`) continuam com o acesso de
   antes (tudo, menos pagar/editar pago/recorrência/cancelar série/pagamento retroativo e
   Configurações) — é o que o papel `usuario` fazia (P-12). A marca é preenchida na primeira vez que
   a conta recebe cargo ou ajuste e **nunca volta**: tirar os cargos ou desativar o cargo deixa a
   pessoa sem acesso, não com o acesso amplo. Conta criada pela tela já nasce marcada (sem cargo =
   entra mas não acessa nada). Corrigido depois da revisão de segurança de 06/11.
7. **Postos do caixa:** conta de posto = PDV × turno (PDV1–PDV4 × Manhã/Tarde, como o doc 73 do
   principal), uma conta por posto na empresa. Criar a conta pelo posto já marca o cargo Caixa.
8. **Cargos sugeridos** (opcionais, editáveis): Caixa, Tesouraria, Gerência, Compras, DP, Financeiro,
   Diretor de Operações, Diretor Geral — inspirados em `db/src/referencia-permissoes.ts` do
   principal. **Precisa do Rodrigo:** conferir o que cada um libera.

## O que a permissão bloqueia hoje (honesto)

- **Bloqueia de verdade (API):** Lançamentos financeiros (9 ações) e Configurações (ver usuários,
  gerenciar usuários, montar cargos e acessos). O app `/app/lancamentos` também trava os campos
  pelas mesmas permissões (antes era pelo papel).
- **Fica guardada, a tela ainda não confere:** Caixa, Transferências, Compras, Produção, Pessoas,
  Relatórios. Esses módulos ainda gravam no aparelho (ou são casca); a tela mostra o aviso na área.
  Ligar cada um é entrega própria, junto do backend daquele módulo.
- O menu ainda mostra tudo para todos (esconder item sem permissão é a próxima entrega).

## Falta

- Rodrigo confirmar os cargos sugeridos e o que cada um libera (P-12).
- Esconder no menu o que a pessoa não pode e ligar as permissões das áreas "a tela ainda não confere".
- Produção: aplicar as migrations `0004` e `0005` (só depois do merge, com autorização própria).
  As duas só acrescentam (tabelas e colunas novas que aceitam nulo); nenhum dado existente muda.
- **Pergunta para o Marco:** quem só tem "Criar, editar e desativar usuários" pode criar conta
  comum com senha inicial que ele mesmo define (a conta nasce com no máximo o acesso dele)?
- `servidor/web/dist/` é um build antigo versionado que ainda cita `/usuarios.html`; não é servido
  (a imagem refaz o build), mas pode ser apagado do git numa limpeza.
