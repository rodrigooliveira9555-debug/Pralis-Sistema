# Colaboração no Pralis-Sistema

Toda alteração passa por uma branch e um pull request (PR) antes de chegar à `main` e à produção. As alterações pendentes do rodapé ficam em `feat/rodape-menu-rapido`, separadas das regras de colaboração.

## Fluxo de trabalho

1. Atualize a `main` local e crie uma branch para a tarefa. Use `feat/nome` para funcionalidades, `fix/nome` para correções e `chore/nome` para manutenção.
2. Trabalhe na branch da tarefa. Cada colaborador mantém sua própria branch; evite duas pessoas editando a mesma tarefa sem combinar.
3. Faça os testes pertinentes. Mudanças visuais seguem `DESIGN_SYSTEM.md` e `UI_CHANGE_PROCESS.md`, com evidências em `docs/VALIDACAO_INTERFACE.md`.
4. Envie a branch e abra um PR para `main`. Use PR em rascunho enquanto houver implementação ou testes pendentes.
5. Registre o problema resolvido, alterações, testes e link de prévia, quando disponível. Informe o que ainda não foi verificado.
6. Peça revisão a outro colaborador e aguarde aprovação. O autor resolve comentários e conflitos na própria branch.
7. Faça o merge somente após aprovação e verificações concluídas. Prefira squash merge para manter um registro por tarefa.
8. A integração de produção deve acompanhar somente `main`. Confirme o resultado do deploy antes de anunciar que está publicado.

Não faça push direto em `main`, force push nela nem deploy de produção de uma branch de trabalho. Uma branch enviada ou um PR aberto não significa que houve merge ou publicação.

## Comandos locais

```bash
git switch main
git pull --ff-only origin main
git switch -c fix/descricao-da-tarefa
```

Depois das alterações:

```bash
node tests/field-validation.cjs
node tests/date-fields.cjs
for arquivo in dist/*.js; do node --check "$arquivo" || exit 1; done
git add caminho/dos/arquivos-alterados
git commit -m "Descreva a mudança"
git push -u origin fix/descricao-da-tarefa
```

Abra o PR pela aba **Pull requests → New pull request** do repositório, selecionando `main` como base e a branch da tarefa como comparação. Com acesso à API do GitHub, também é possível usar `gh pr create --base main --draft`.

## Proteção e deploy

O workflow `Validacao` executa os testes existentes e verifica a sintaxe dos scripts em PRs para `main`. Ele também roda depois de um merge. Alterar somente os arquivos do repositório não ativa proteção de branch nem muda configurações da Vercel.

Para exigir esse fluxo no GitHub, um administrador deve configurar uma regra para `main` em **Settings → Rules → Rulesets**, ou em **Settings → Branches**, conforme o plano disponível:

- Exigir PR e pelo menos uma aprovação de outro colaborador.
- Exigir a verificação `validacao` e a resolução das conversas antes do merge.
- Exigir que a branch esteja atualizada com `main` antes do merge.
- Bloquear force push e exclusão de `main`; evitar exceções à revisão.

Na Vercel, confira que **Production Branch** é `main`. Use implantações de prévia para revisar as branches. Os controles de proteção e a configuração de produção devem ser verificados no serviço; este documento não afirma que já estejam ativados.
