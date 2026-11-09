// Importação do app de produtos no navegador (Playwright + Chromium, isolado). A planilha é FICTÍCIA,
// montada em memória aqui; nenhum arquivo de dado vai para o repositório.
// Rodar: npm run test:telas  (ou node tests/compras-importacao-navegador.mjs)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../dist/vendor/sheetjs/xlsx.full.min.js');
const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

/* ---------- Backup fictício no formato do app (abas Resumo, Produtos, Promocoes) ---------- */
const WJ = '⁠';
const linha = (o) => ({ id: '', loja: 'BASE', codigo: '', codigo_interno: '', codigo_barras: '', base_product_id: '', nome: '', marca: '', grupo: '', tipo: 'revenda', status: 'ativo', quantidade: '0', medida_base: 'UN', qt_cad: '1', custo: '', venda_pontual: '', calculo_automatico: 'FALSE', setor_estoque: '', local_venda_1: '', estado_fiscal: '', ...o });
const par = (n, base, loja = {}) => [linha({ id: 'b' + n, codigo_interno: String(n), ...base }), linha({ id: 't' + n, loja: 'TNP', base_product_id: 'b' + n, codigo_interno: String(n), ...base, ...loja })];
function planilha(linhas) {
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([{ campo: 'total_produtos', valor: linhas.length }]), 'Resumo');
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(linhas), 'Produtos');
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([{ produto_id: 't13001', loja: 'TNP', indice: 1, tipo: 'valor', valor: 8.5, desconto_pct: '', hora_inicio: '', hora_fim: '', dias: 'SSSSSSS', desconto_ate: '' }]), 'Promocoes');
  return Buffer.from(XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' }));
}
const LINHAS = [
  ...par(13001, { nome: 'REFRI FICTICIO 2L', grupo: 'MER ' + WJ + 'BEBIDAS - ' + WJ + 'REFRIGERANTES', codigo_barras: '7890000000017' }, { custo: '48.6', venda_pontual: '9.9', setor_estoque: 'LJ - VITRINES' }),
  ...par(13002, { nome: 'PAO FICTICIO', grupo: 'MER FAB. PROPRIA - PANIFICACAO', tipo: 'transformacao' }, { local_venda_1: 'SALÃO NOVO' }),
  ...par(13003, { nome: 'SEM GRUPO FICTICIO', grupo: '' }, { setor_estoque: 'PROD. - PANIFICAÇÃO' }),
  ...par(13500, { nome: 'INATIVO FICTICIO', grupo: 'MER INATIVOS', status: 'inativo' }, { status: 'inativo' }),
];
const ARQUIVO = { name: 'backup-ficticio.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: planilha(LINHAS) };
const ARVORE = [{ id: 'a-lj', name: 'LJ', children: [{ id: 's-vit', name: 'VITRINES', children: [] }] }, { id: 'a-pr', name: 'PROD.', children: [{ id: 's-pan', name: 'PANIFICAÇÃO', children: [] }] }];

async function abrirPagina(largura = 1024) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: 900 } });
  await ctx.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  await ctx.addInitScript((a) => { if (!localStorage.getItem('cicluz-location-tree-v1')) localStorage.setItem('cicluz-location-tree-v1', JSON.stringify({ tree: a, history: [] })); }, ARVORE);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => window.CicluzComprasProdutos && window.CicluzProdutoImportacaoTela);
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
  return p;
}
const dlg = (p) => p.locator('dialog.compras-dialog[open]').last();
const fechado = (p) => p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'), null, { timeout: 5000 });
const produtos = (p) => p.evaluate(() => CicluzComprasDados.dados.produtos.map((x) => ({ id: x.id, codigo: x.codigoInterno, grupoId: x.grupoId, subgrupoId: x.subgrupoId, localId: x.localId, setor: x.setorEstoque, manual: x.vinculoManual, liberado: x.liberadoCompra, preco: x.precoVenda, promos: (x.promocoes || []).length })));
const valorDaPrevia = (p, rotulo) => dlg(p).locator('.compras-importacao-linha', { hasText: rotulo }).locator('b, .compras-situacao').first().textContent();

/* ---------- 1) Importar pela tela ---------- */
const p = await abrirPagina(1024);
ok(await p.locator('#compras-produtos button', { hasText: 'Importar do app de produtos' }).isVisible(), 'Botão de importar visível para quem administra');
const antes = await produtos(p);
ok(antes.some((x) => x.id === 'p-coca2l'), 'Antes: produtos de exemplo do S2');
await p.locator('#compras-produtos button', { hasText: 'Importar do app de produtos' }).click();
ok(await dlg(p).locator('h2').textContent() === 'Importar do app de produtos', 'Abre o diálogo de importação');
// Confirmar sem arquivo não grava
await dlg(p).locator('.people-save-control').click();
ok((await dlg(p).locator('.profiles-error').textContent()).includes('Escolha o arquivo'), 'Sem arquivo: pede o arquivo e não grava');
// Arquivo errado
await dlg(p).getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles({ name: 'outro.xlsx', mimeType: ARQUIVO.mimeType, buffer: (() => { const l = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(l, XLSX.utils.json_to_sheet([{ a: 1 }]), 'Planilha1'); return Buffer.from(XLSX.write(l, { type: 'buffer', bookType: 'xlsx' })); })() });
await dlg(p).locator('.compras-alerta.tom-negativo').waitFor();
ok((await dlg(p).locator('.compras-alerta.tom-negativo').textContent()).includes('falta a aba "Produtos"'), 'Arquivo que não é o backup: explica');
// Arquivo certo → prévia
await dlg(p).getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles(ARQUIVO);
await dlg(p).locator('.compras-importacao-linha', { hasText: 'Entram (novos)' }).waitFor({ timeout: 15000 });
ok(await valorDaPrevia(p, 'Produtos da TNP no backup') === '4', 'Prévia: 4 produtos da TNP');
ok(await valorDaPrevia(p, 'Ativos → MER - Produtos') === '3' && await valorDaPrevia(p, 'Inativos → arquivo compactado') === '1', 'Prévia: 3 ativos no Compras e 1 inativo no arquivo');
ok(await valorDaPrevia(p, 'Entram (novos)') === '4', 'Prévia: 4 novos');
ok(await valorDaPrevia(p, 'Sem grupo de mercadorias do S2') === '1', 'Prévia: 1 sem grupo');
ok(await valorDaPrevia(p, 'Sem local na árvore de locais') === '1', 'Prévia: 1 sem local (SALÃO NOVO não existe na árvore)');
ok(await valorDaPrevia(p, 'Produtos de exemplo que saem') === '19', 'Prévia: os 19 exemplos saem');
ok((await valorDaPrevia(p, 'Próximo código de produto novo no S2')).includes('13500'), 'Prévia: próximo código acima do maior do app, inclusive inativo');
ok(JSON.stringify(await produtos(p)) === JSON.stringify(antes) && await p.evaluate(() => !localStorage.getItem('cicluz-produtos-arquivo-v1')), 'A prévia não grava nada');
await dlg(p).locator('.people-save-control').click();
await fechado(p);
let depois = await produtos(p);
ok(!depois.some((x) => x.id.startsWith('p-')) && depois.length === 3, 'Depois: só os 3 ativos importados no Compras, sem os exemplos');
ok(await p.evaluate(() => !CicluzComprasDados.dados.catalogo.some((v) => /^p-/.test(v.produtoId))), 'Catálogo de teste dos exemplos saiu');
const refri = depois.find((x) => x.codigo === '13001');
ok(refri.grupoId === 'g3' && refri.subgrupoId === 'g3s0' && refri.localId === 's-vit' && refri.liberado && refri.preco === 9.9 && refri.promos === 1, 'Refri: grupo, local, liberado, preço e promoção do app');
ok(depois.find((x) => x.codigo === '13003').localId === 's-pan', 'Local casado pelo caminho "PROD. - PANIFICAÇÃO"');
const arq = await p.evaluate(async () => (await CicluzComprasDados.arquivo()).map((x) => [x.id, x.status, x.liberadoCompra]));
ok(JSON.stringify(arq) === JSON.stringify([['pi-13500', 'inativo', false]]), 'Inativo foi para o arquivo compactado, não liberado: ' + JSON.stringify(arq));
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-produtos-arquivo-v1')).formato === 'gzip-base64'), 'Arquivo gravado compactado na chave própria');
ok((await p.locator('#compras-produtos .compras-linha-info').textContent()).includes('1 inativo(s) do app ficam arquivados'), 'A lista avisa quantos inativos estão arquivados');
// Desmarcar "Só ativos" mostra o inativo do arquivo; editar e salvar o traz para o Compras
await p.locator('#compras-produtos label', { hasText: 'Só ativos' }).click();
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'INATIVO FICTICIO' }).waitFor();
ok(await p.locator('#compras-produtos .compras-tabela tbody tr').count() === 4, 'Sem "Só ativos": 3 ativos + 1 do arquivo');
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'INATIVO FICTICIO' }).click();
await dlg(p).getByLabel('Grupo de mercadorias', { exact: true }).selectOption('g15');
await dlg(p).locator('.people-save-control').click();
await fechado(p);
await p.waitForFunction(async () => (await CicluzComprasDados.arquivo()).length === 0);
depois = await produtos(p);
ok(depois.some((x) => x.id === 'pi-13500') && depois.length === 4, 'Editado: passou para o Compras e saiu do arquivo');
ok(await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'INATIVO FICTICIO' }).count() === 1, 'Aparece uma vez só na lista');
await p.locator('#compras-produtos label', { hasText: 'Só ativos' }).click();

/* ---------- 1b) Busca: digitar letra por letra sem o campo fechar (como no app de produtos) ---------- */
const campoBusca = p.locator('#compras-produtos .compras-busca');
if (await campoBusca.isHidden()) await p.locator('#compras-produtos .local-search-toggle').click();
const linhasVisiveis = () => p.locator('#compras-produtos .compras-tabela tbody tr').allTextContents();
const buscar = async (texto) => {
  await campoBusca.fill('');
  await campoBusca.pressSequentially(texto, { delay: 120 });
  await p.waitForTimeout(400);
};
await buscar('13002');
ok(await campoBusca.isVisible() && await campoBusca.evaluate((e) => document.activeElement === e) && (await campoBusca.inputValue()) === '13002', 'Busca segue aberta, com o cursor e o texto inteiro depois de digitar letra por letra');
let achados = await linhasVisiveis();
ok(achados.length === 1 && achados[0].includes('PAO FICTICIO'), 'Acha pelo código interno');
await buscar('7890000000017');
achados = await linhasVisiveis();
ok(achados.length === 1 && achados[0].includes('REFRI FICTICIO'), 'Acha pelo código de barras');
await buscar('refri');
achados = await linhasVisiveis();
ok(achados.length === 1 && achados[0].includes('REFRI FICTICIO'), 'Acha pelo nome, sem diferenciar maiúscula');
await buscar('');
ok((await linhasVisiveis()).length === 3, 'Busca vazia volta a lista inteira');

/* ---------- 2) Alerta e filtro na lista ---------- */
const chip = (rot) => p.locator('#compras-produtos .compras-chip', { hasText: rot });
ok(await chip('Sem vínculo (2)').count() === 1 && await chip('Sem grupo (1)').count() === 1 && await chip('Sem local (1)').count() === 1, 'Chips de vínculo com a contagem');
await chip('Sem vínculo (2)').click();
let linhas = await p.locator('#compras-produtos .compras-tabela tbody tr').count();
ok(linhas === 2, 'Filtro "Sem vínculo" mostra só os 2');
ok(await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'SEM GRUPO FICTICIO' }).locator('.compras-situacao', { hasText: 'Sem grupo' }).count() === 1, 'Linha mostra o alerta "Sem grupo"');
await chip('Sem grupo (1)').click();
ok(await p.locator('#compras-produtos .compras-tabela tbody tr').count() === 1, 'Filtro "Sem grupo" mostra 1');

/* ---------- 3) Formulário: escolher grupo e local tira o alerta ---------- */
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'SEM GRUPO FICTICIO' }).click();
ok((await dlg(p).locator('.compras-alerta-vinculo').textContent()).includes('grupo de mercadorias'), 'Formulário mostra o alerta de vínculo');
await dlg(p).getByLabel('Grupo de mercadorias', { exact: true }).selectOption('g10');
await dlg(p).getByLabel('Subgrupo', { exact: true }).selectOption('g10s0');
await dlg(p).locator('.people-save-control').click();
await fechado(p);
depois = await produtos(p);
const semGrupo = depois.find((x) => x.codigo === '13003');
ok(semGrupo.grupoId === 'g10' && semGrupo.manual && semGrupo.manual.grupo === true, 'Grupo escolhido à mão fica marcado como manual');
await p.locator('#compras-produtos button', { hasText: 'Limpar' }).click();
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'PAO FICTICIO' }).click();
ok(await dlg(p).locator('.compras-alerta-vinculo').count() === 1, 'Pão sem local: alerta no formulário');
const opcoes = await dlg(p).getByLabel('Setor de estoque', { exact: true }).locator('option').allTextContents();
ok(opcoes.includes('LJ › VITRINES') && opcoes.includes('PROD. › PANIFICAÇÃO'), 'Setor de estoque lista a árvore de locais com o caminho');
await dlg(p).getByLabel('Setor de estoque', { exact: true }).selectOption({ label: 'LJ › VITRINES' });
await dlg(p).locator('.people-save-control').click();
await fechado(p);
const pao = (await produtos(p)).find((x) => x.codigo === '13002');
ok(pao.localId === 's-vit' && pao.setor === 'VITRINES' && pao.manual.local === true, 'Local escolhido: id do nó, nome e marca de manual');
ok(await chip('Sem vínculo (0)').count() === 1, 'Sem vínculo zerou');
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'PAO FICTICIO' }).click();
ok(await dlg(p).locator('.compras-alerta-vinculo').count() === 0, 'Alerta some do formulário');
await dlg(p).locator('.people-close-control').click();
await fechado(p);

/* ---------- 4) Revincular depois que a árvore muda ---------- */
await p.evaluate(() => {
  const d = CicluzComprasDados.dados.produtos.find((x) => x.codigoInterno === '13001');
  localStorage.setItem('cicluz-location-tree-v1', JSON.stringify({ tree: [{ id: 'a-lj2', name: 'LJ', children: [{ id: 's-vit2', name: 'VITRINES', children: [] }] }, { id: 'a-pr', name: 'PROD.', children: [] }], history: [] }));
  return d && d.localId;
});
await p.evaluate(() => CicluzCompras.abrir('produtos'));
ok(await chip('Sem local (3)').count() === 1, 'Árvore refeita: os nós antigos somem e o alerta volta nos 3');
await p.locator('#compras-produtos button', { hasText: 'Revincular grupo e local' }).click();
await dlg(p).locator('.people-save-control').click();
await fechado(p);
depois = await produtos(p);
ok(depois.find((x) => x.codigo === '13001').localId === 's-vit2', 'Revincular casa de novo pelo texto do app');
ok(depois.find((x) => x.codigo === '13002').localId === 's-vit', 'Vínculo feito à mão não muda');

/* ---------- 5) Reimportar não duplica ---------- */
await p.locator('#compras-produtos button', { hasText: 'Importar do app de produtos' }).click();
await dlg(p).getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles(ARQUIVO);
await dlg(p).locator('.compras-importacao-linha', { hasText: 'Atualizam' }).waitFor({ timeout: 15000 });
ok(await valorDaPrevia(p, 'Atualizam') === '4' && await valorDaPrevia(p, 'Entram (novos)') === '0', 'Reimportar: 4 atualizam, 0 novos');
await dlg(p).locator('.people-save-control').click();
await fechado(p);
depois = await produtos(p);
ok(depois.length === 4 && depois.find((x) => x.codigo === '13003').grupoId === 'g10', 'Sem duplicar e sem desfazer o grupo escolhido à mão');

/* ---------- 6) Produto novo no S2 recebe código acima do maior do app ---------- */
const proximo = await p.evaluate(() => CicluzProdutoRegras.proximoCodigoInterno(CicluzComprasDados.dados.produtos.map((x) => x.codigoInterno).concat([CicluzComprasDados.dados.codigoInternoApp])));
ok(proximo === '13501', 'Próximo código: 13501 (o inativo 13500 do app conta)');
await p.context().close();

/* ---------- 7) Lista com alertas em 320 / 390 / 1024, claro e escuro ---------- */
let combinacoes = 0;
for (const largura of [320, 390, 1024]) {
  const q = await abrirPagina(largura);
  await q.evaluate(() => CicluzProdutoImportacaoTela);
  await q.locator('#compras-produtos button', { hasText: 'Importar do app de produtos' }).click();
  await dlg(q).getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles(ARQUIVO);
  await dlg(q).locator('.compras-importacao-linha', { hasText: 'Entram (novos)' }).waitFor({ timeout: 15000 });
  for (const escuro of [false, true]) {
    await q.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    const lateral = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(lateral <= 0, largura + 'px ' + (escuro ? 'escuro' : 'claro') + ': prévia sem rolagem lateral (' + lateral + ')');
    combinacoes++;
  }
  await dlg(q).locator('.people-save-control').click();
  await fechado(q);
  for (const escuro of [false, true]) {
    await q.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    const r = await q.evaluate(() => ({ lateral: document.documentElement.scrollWidth - innerWidth, alertas: document.querySelectorAll('#compras-produtos .compras-situacao.tom-atencao').length }));
    ok(r.lateral <= 0 && r.alertas >= 1, largura + 'px ' + (escuro ? 'escuro' : 'claro') + ': lista com alerta e sem rolagem lateral (' + r.lateral + ')');
    combinacoes++;
  }
  await q.context().close();
}

ok(erros.length === 0, 'Sem erros de JavaScript: ' + erros.join(' | '));
await navegador.close();
servidor.close();
console.log(verificacoes + ' verificações da importação de produtos no navegador passaram (fluxo + ' + combinacoes + ' combinações de tela × largura × tema)');
