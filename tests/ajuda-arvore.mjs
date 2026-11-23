// Escolha em árvore nos testes de tela (campo de grupo/subgrupo desde 23/11/2026): toca no campo, abre o grupo,
// marca o grupo, o subgrupo ou o item e confirma. Os nomes são os do cadastro (ex.: 'MERCEARIA', 'PANIFICAÇÃO').
// item: nome de uma folha (ex.: o produto) dentro do subgrupo ou do grupo.
export async function escolherNaArvore(p, campo, { grupo, subgrupo, item } = {}) {
  const abertas = await p.locator('dialog.compras-dialog[open]').count();
  await campo.click();
  const janela = p.locator('dialog.compras-dialog[open]').last();
  await janela.locator('.compras-hier').waitFor();
  const expandir = async (nome) => {
    const seta = janela.getByRole('button', { name: 'Expandir ' + nome, exact: true });
    if (await seta.count()) await seta.click();
  };
  let alvo = grupo;
  if (subgrupo || item) await expandir(grupo);
  if (subgrupo) { alvo = grupo + ' › ' + subgrupo; if (item) await expandir(alvo); }
  if (item) alvo = item;
  await janela.getByRole('checkbox', { name: 'Selecionar ' + alvo, exact: true }).check();
  await janela.locator('.people-save-control').click();
  await p.waitForFunction((n) => document.querySelectorAll('dialog.compras-dialog[open]').length === n, abertas, { timeout: 8000 });
}

// Escolha na janela de áreas, setores e locais (CicluzLocationTree.janelaUnica, 23/11/2026): caminho = ['Operação de Loja', 'Caixa'].
// Abre cada nível pelo caminho e marca o último.
export async function escolherLocal(p, campo, caminho) {
  const abertas = await p.locator('dialog.compras-dialog[open]').count();
  await campo.click();
  const janela = p.locator('dialog.compras-dialog[open]').last();
  await janela.locator('.unidades-arvore').waitFor();
  for (const nome of caminho.slice(0, -1)) {
    const seta = janela.getByRole('button', { name: 'Expandir ou recolher ' + nome, exact: true });
    if ((await seta.getAttribute('aria-expanded')) !== 'true') await seta.click();
  }
  await janela.getByRole('checkbox', { name: 'Marcar ' + caminho.at(-1), exact: true }).check();
  await janela.locator('.people-save-control').click();
  await p.waitForFunction((n) => document.querySelectorAll('dialog.compras-dialog[open]').length === n, abertas, { timeout: 8000 });
}
