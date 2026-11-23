// Produtos no servidor, de ponta a ponta (docs/PRODUTOS_NO_SERVIDOR_PLANO.md, fases 2 e 3): navegador + API de verdade
// + Postgres limpo. Dados 100% fictícios. Rodar: node tests/produtos-servidor-navegador.mjs (precisa do Docker).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { iniciarApi } from './servidor-api.mjs';
import { escolherNaArvore } from './ajuda-arvore.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../dist/vendor/sheetjs/xlsx.full.min.js');
const api = await iniciarApi();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

/* ---------- O que estava no aparelho antes (formato de hoje) ---------- */
const GRUPOS = {
  mercadorias: [
    { id: 'g3', name: 'BEBIDAS', active: true, icon: 0, children: [{ id: 'g3s0', name: 'REFRIGERANTES', active: true, icon: 0 }] },
    { id: 'g7', name: 'MERCEARIA', active: true, icon: 0, children: [{ id: 'g7s0', name: 'ALIMENTOS BÁSICOS', active: true, icon: 0 }] },
  ],
  despesas: [], vendas: [], retiradas: [], 'tipos-venda': [], bandeiras: [], operadoras: [],
};
const ARVORE = { tree: [{ id: 'a-lj', name: 'LJ', children: [{ id: 's-vit', name: 'VITRINES', children: [] }] }], history: [] };
const produto = (id, codigo, extra = {}) => ({
  id, codigoInterno: codigo, codigoBarras: '789' + codigo, nomeCatalogo: 'PRODUTO ' + codigo, descricao: 'PRODUTO ' + codigo, marca: 'MARCA', tipo: 'revenda',
  status: 'ativo', liberadoCompra: true, grupoId: 'g3', subgrupoId: 'g3s0', localId: 's-vit', unidade: 'UN', unidadeIndividual: 'UN', quantidadeIndividual: 0,
  embalagem: 'CX', cDe: 'C/', qtdEmbalagem: 6, medidaCompra: 'UN', custo: 30, margem: 0.3, precoVenda: 7.5, auto: false, saldo: 0, vendas3m: 0, compras3m: 0, lucro3m: 0,
  fiscal: { ncm: '22021000' }, promocoes: [], conversoes: [], ...extra,
});
const COMPRAS = {
  versao: 1, fornecedores: [{ id: 'f-1', nome: 'Fornecedor Fictício', documento: '', whatsapp: '', categoria: '', situacao: 'ativo' }],
  produtos: [
    produto('pi-13001', '13001', { appId: 'app-13001', saldo: 12, vendas3m: 40 }),
    produto('p-feito-no-s2', '13150', { nomeCatalogo: 'BOLO CASEIRO', descricao: 'BOLO CASEIRO', grupoId: 'g7', subgrupoId: 'g7s0', saldo: 3 }),
    produto('pi-13002', '13002', { status: 'inativo', liberadoCompra: false }),
    produto('p-coca2l', '12001', { nomeCatalogo: 'EXEMPLO', descricao: 'EXEMPLO' }),
  ],
  catalogo: [{ id: 'v1', fornecedorId: 'f-1', produtoId: 'p-feito-no-s2', origem: 'compras', status: 'aprovado' }],
  precosBase: [], historico: [], agendas: [], ocorrencias: [], solicitacoes: [], rodadas: [], convites: [], pedidos: [], movimentos: [],
  conferenciaAgendas: [], conferencias: [], unidades: [], historicoNomes: [], codigoInternoApp: 13213,
};

const contexto = await navegador.newContext({ viewport: { width: 1024, height: 900 } });
await api.entrar(contexto, { 'cicluz-financial-hierarchy-v1': GRUPOS, 'cicluz-location-tree-v1': ARVORE, 'cicluz-compras-v1': COMPRAS });
const p = await contexto.newPage();
p.on('pageerror', (e) => erros.push(e.message));
await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
await p.goto(api.url + '/index.html', { waitUntil: 'load' });
await p.waitForFunction(() => window.CicluzComprasDados && window.CicluzProdutos);

/* ---------- 1) Transferência automática pelo aparelho do administrador ---------- */
await p.waitForFunction(() => CicluzProdutos.modoServidor() && CicluzComprasDados.dados.produtos.length === 2, null, { timeout: 60000 });
ok(true, 'Transferência concluída: o catálogo do servidor passou a valer');
const daTela = await p.evaluate(() => CicluzComprasDados.dados.produtos.map((x) => [x.id, x.codigoInterno, x.saldo, x.vendas3m, x.nomeCatalogo]).sort());
ok(JSON.stringify(daTela) === JSON.stringify([['p-feito-no-s2', '13150', 3, 0, 'BOLO CASEIRO'], ['pi-13001', '13001', 12, 40, 'PRODUTO 13001']]), 'Ativos com o mesmo id e código, e o saldo do aparelho preservado: ' + JSON.stringify(daTela));
const noServidor = await p.evaluate(async () => (await CicluzSync.api('/produtos?status=todos&tamanho=100')).itens.map((x) => x.id).sort());
ok(JSON.stringify(noServidor) === JSON.stringify(['p-feito-no-s2', 'pi-13001', 'pi-13002']), 'No servidor: os 2 ativos e o inativo; o de exemplo não foi: ' + noServidor);
const guardado = await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-compras-v1')).produtos.sort((x, y) => x.id.localeCompare(y.id)));
ok(JSON.stringify(guardado) === JSON.stringify([{ id: 'p-feito-no-s2', saldo: 3, vendas3m: 0, compras3m: 0, lucro3m: 0 }, { id: 'pi-13001', saldo: 12, vendas3m: 40, compras3m: 0, lucro3m: 0 }]),
  'Documento do Compras ficou só com o estado da loja: ' + JSON.stringify(guardado));
ok(await p.evaluate(() => CicluzComprasDados.dados.catalogo.length === 1 && CicluzComprasDados.dados.fornecedores.length === 1), 'Catálogo de fornecedores e o resto do Compras intactos');

// Página do fornecedor (sem login, mesmo navegador): os produtos vêm do resumo guardado, com nome.
const forn = await contexto.newPage();
forn.on('pageerror', (e) => erros.push('fornecedor: ' + e.message));
await forn.goto(api.url + '/rodada.html?t=inexistente', { waitUntil: 'load' });
await forn.waitForFunction(() => window.CicluzComprasDados);
ok(await forn.evaluate(() => (CicluzComprasDados.produto('pi-13001') || {}).descricao) === 'PRODUTO 13001', 'Página do fornecedor acha o produto com nome pelo resumo');
await forn.close();

/* ---------- 2) Lista e busca ---------- */
// Lista sem filtros (Rodrigo, 17/11/2026): ativos do resumo guardado; o botão "Inativos" do cabeçalho busca os inativos no
// servidor; a busca é a lupa do rodapé.
await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
const linhas = () => p.locator('#compras-produtos .grade-produto:not(.compras-linha-cabecalho)').allTextContents();
const quantasLinhas = (n) => p.waitForFunction((x) => document.querySelectorAll('#compras-produtos .grade-produto:not(.compras-linha-cabecalho)').length === x, n, { timeout: 15000 });
ok((await linhas()).length === 2, 'Lista (ativos) com os 2 ativos do resumo');
await p.locator('#compras-produtos .compras-secao-cab button', { hasText: 'Inativos' }).click();
await quantasLinhas(1);
ok((await linhas())[0].includes('PRODUTO 13002'), 'Inativos: a página vem do servidor, só com o inativo');
const campoBusca = p.locator('.people-bottom-header .shared-header-search');
if (await campoBusca.isHidden()) await p.locator('.view.show .people-search-toggle').click();
await campoBusca.pressSequentially('bolo', { delay: 80 });
await quantasLinhas(0);
ok(await campoBusca.isVisible() && await campoBusca.inputValue() === 'bolo', 'Busca nos inativos roda no servidor (nenhum inativo com "bolo") e o campo não fecha');
await campoBusca.fill('');
await p.locator('#compras-produtos .compras-secao-cab button', { hasText: /^Ativos$/ }).click();
await campoBusca.pressSequentially('bolo', { delay: 80 });
await quantasLinhas(1);
ok((await linhas())[0].includes('BOLO CASEIRO'), 'Busca nos ativos (resumo do aparelho) por nome');
await campoBusca.fill('');
await quantasLinhas(2);

/* ---------- 3) Editar pela API; conflito de versão ---------- */
const dlg = () => p.locator('dialog.compras-dialog[open]').last();
const fechado = () => p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'), null, { timeout: 15000 })
  .catch(async () => { throw new Error('Diálogo não fechou: ' + (await p.locator('dialog.compras-dialog[open]').last().locator('.compras-alertas, .profiles-error').allTextContents()).join(' | ')); });
const linhaProduto = (nome) => p.locator('#compras-produtos .grade-produto:not(.compras-linha-cabecalho)', { hasText: nome });
// Etapa 3 ("Cadastro específico"): estoque mínimo e máximo desta loja.
const irEtapa = (n) => dlg().locator('.stepper-node').nth(n - 1).click();
await linhaProduto('BOLO CASEIRO').click();
await irEtapa(3);
await dlg().getByLabel('Estoque mín.', { exact: true }).fill('12');
await dlg().locator('.people-save-control').click();
await fechado();
const editado = await p.evaluate(async () => CicluzSync.api('/produtos/item/p-feito-no-s2'));
ok(editado.dados.estoqueMin === 12 && editado.versao === 2, 'Edição gravada no servidor (versão 2)');
ok(await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.id === 'p-feito-no-s2').saldo === 3), 'Editar o cadastro não mexe no saldo do aparelho');
// Outra pessoa salva antes: a tela recusa com aviso, sem sobrescrever.
await linhaProduto('BOLO CASEIRO').click();
await irEtapa(3);
await p.evaluate(async () => { const x = await CicluzSync.api('/produtos/item/p-feito-no-s2'); await CicluzSync.api('/produtos/item/p-feito-no-s2', { metodo: 'PUT', corpo: { nome: x.nome, descricao: x.descricao, tipo: x.tipo, status: x.status, liberadoCompra: x.liberadoCompra, calculoAutomatico: x.calculoAutomatico, grupoId: x.grupoId, subgrupoId: x.subgrupoId, localId: x.localId, custo: x.custo, precoVenda: x.precoVenda, dados: x.dados, versao: x.versao } }); });
await dlg().getByLabel('Estoque mín.', { exact: true }).fill('18');
await dlg().locator('.people-save-control').click();
await dlg().locator('.compras-alerta.tom-negativo').waitFor({ timeout: 15000 });
ok((await dlg().locator('.compras-alerta.tom-negativo').textContent()).includes('Outra pessoa alterou'), 'Versão velha: aviso de que outra pessoa salvou antes');
await dlg().locator('.people-close-control').click();
await fechado();

/* ---------- 4) Criar: o servidor gera o código ---------- */
await p.locator('.view.show .people-add-control').click();
await dlg().getByLabel('Nome do produto', { exact: true }).fill('Pão de Queijo Teste');
await irEtapa(2); // o grupo de mercadorias fica na 2ª etapa do cadastro
await escolherNaArvore(p, dlg().getByRole('button', { name: 'Grupo de mercadorias', exact: true }), { grupo: 'MERCEARIA' });
await dlg().locator('.people-save-control').click();
await fechado().catch(async () => { throw new Error('Não salvou: ' + (await dlg().locator('.compras-alertas, .profiles-error').allTextContents()).join(' | ')); });
const criado = await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.nomeCatalogo === 'PÃO DE QUEIJO TESTE'));
ok(criado && criado.codigoInterno === '13214' && criado.codigoBarras === '13214', 'Criado com o código do servidor (acima do maior do app) e barras = código: ' + (criado && criado.codigoInterno));

/* ---------- 5) Sem internet: os ativos continuam do resumo guardado ---------- */
await p.route('**/api/**', (r) => r.abort());
await p.reload({ waitUntil: 'load' });
await p.waitForFunction(() => window.CicluzComprasDados && window.CicluzProdutos);
const semRede = await p.evaluate(() => ({ modo: CicluzProdutos.modoServidor(), n: CicluzComprasDados.dados.produtos.length, saldo: (CicluzComprasDados.dados.produtos.find((x) => x.id === 'pi-13001') || {}).saldo }));
ok(semRede.n === 3 && semRede.saldo === 12, 'Sem internet: os 3 ativos e o saldo continuam na tela: ' + JSON.stringify(semRede));
await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
ok((await linhas()).length === 3, 'Sem internet: a lista de produtos abre');
await p.unroute('**/api/**');
await p.reload({ waitUntil: 'load' });
await p.waitForFunction(() => window.CicluzComprasDados && CicluzProdutos.modoServidor());

/* ---------- 6) Importar do app direto para o servidor ---------- */
const linhaApp = (o) => ({ id: '', loja: 'BASE', codigo: '', codigo_interno: '', codigo_barras: '', base_product_id: '', nome: '', marca: '', grupo: '', tipo: 'revenda', status: 'ativo', quantidade: '0', medida_base: 'UN', qt_cad: '1', custo: '', venda_pontual: '', calculo_automatico: 'FALSE', setor_estoque: '', ...o });
const par = (n, base, loja = {}) => [linhaApp({ id: 'b' + n, codigo_interno: String(n), ...base }), linhaApp({ id: 't' + n, loja: 'TNP', base_product_id: 'b' + n, codigo_interno: String(n), ...base, ...loja })];
const livro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([...par(13001, { nome: 'PRODUTO 13001 NOVO NOME', grupo: 'MER BEBIDAS - REFRIGERANTES' }, { venda_pontual: '8.25', setor_estoque: 'LJ - VITRINES' }), ...par(13400, { nome: 'NOVO DO APP', grupo: '' }), ...par(13401, { nome: 'INATIVO DO APP', status: 'inativo' }, { status: 'inativo' })]), 'Produtos');
XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([{ produto_id: '', loja: '' }]), 'Promocoes');
await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
await p.locator('#compras-produtos button[aria-label="Importar do app de produtos"]').click();
await dlg().getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles({ name: 'backup.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' })) });
await dlg().locator('.compras-importacao-linha', { hasText: 'Ativos' }).first().waitFor({ timeout: 20000 });
await dlg().locator('.people-save-control').click();
await fechado();
const aposImportar = await p.evaluate(async () => (await CicluzSync.api('/produtos?status=todos&tamanho=100&ordem=codigo')).itens.map((x) => [x.codigoInterno, x.status, x.precoVenda, x.semGrupo]));
ok(aposImportar.length === 6, 'Importação: 2 novos no servidor e o 13001 atualizado, sem duplicar: ' + JSON.stringify(aposImportar));
ok(JSON.stringify(aposImportar.find((x) => x[0] === '13001')) === JSON.stringify(['13001', 'ativo', '8.25', false]), 'Preço do app atualizado no 13001');
ok(await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.id === 'pi-13001').saldo === 12), 'Importar não mexe no saldo do aparelho');

/* ---------- 6b) Arquivo errado na importação ---------- */
await p.locator('#compras-produtos button[aria-label="Importar do app de produtos"]').click();
const errado = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(errado, XLSX.utils.json_to_sheet([{ a: 1 }]), 'Planilha1');
await dlg().getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles({ name: 'outro.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(XLSX.write(errado, { type: 'buffer', bookType: 'xlsx' })) });
await dlg().locator('.compras-alerta.tom-negativo').waitFor({ timeout: 15000 });
ok((await dlg().locator('.compras-alerta.tom-negativo').textContent()).includes('falta a aba "Produtos"'), 'Arquivo que não é o backup: explica e não grava');
await dlg().locator('.people-close-control').click();
await fechado();

/* ---------- 6c) Alerta de vínculo na linha e escolha à mão (a lista não tem mais filtros: Rodrigo, 17/11/2026) ---------- */
await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
await linhaProduto('NOVO DO APP').waitFor({ timeout: 15000 });
ok(await linhaProduto('NOVO DO APP').locator('.compras-situacao', { hasText: 'Sem grupo' }).count() === 1, 'A linha do produto importado sem grupo mostra o alerta "Sem grupo"');
await linhaProduto('NOVO DO APP').click();
ok((await dlg().locator('.compras-alerta-vinculo').textContent()).includes('grupo de mercadorias'), 'Formulário mostra o alerta de vínculo');
await irEtapa(2);
await escolherNaArvore(p, dlg().getByRole('button', { name: 'Grupo de mercadorias', exact: true }), { grupo: 'MERCEARIA' });
await irEtapa(3);
await dlg().getByLabel('Setor de estoque', { exact: true }).selectOption({ label: 'LJ › VITRINES' });
await dlg().locator('.people-save-control').click();
await fechado();
const vinculado = await p.evaluate(async () => (await CicluzSync.api('/produtos?status=todos&busca=novo%20do%20app')).itens[0]);
ok(vinculado.grupoId === 'g7' && vinculado.localId === 's-vit' && !vinculado.semGrupo && !vinculado.semLocal && vinculado.dados.vinculoManual.grupo && vinculado.dados.vinculoManual.local, 'Grupo e local escolhidos à mão: alerta some e fica marcado como manual');

/* ---------- 6d) Revincular depois que a árvore muda (no aparelho → servidor) ---------- */
await p.evaluate(() => localStorage.setItem('cicluz-location-tree-v1', JSON.stringify({ tree: [{ id: 'a-lj2', name: 'LJ', children: [{ id: 's-vit2', name: 'VITRINES', children: [] }] }], history: [] })));
let religado = null;
for (let i = 0; i < 20 && !religado; i++) {
  await p.waitForTimeout(500);
  await p.evaluate(() => CicluzSync.api('/produtos/revincular', { metodo: 'POST' }));
  const x = await p.evaluate(async () => (await CicluzSync.api('/produtos/item/pi-13001')).localId);
  if (x === 's-vit2') religado = x;
}
ok(religado === 's-vit2', 'Revincular casa de novo pelo texto do app depois que a árvore chega ao servidor');
const manual = await p.evaluate(async () => (await CicluzSync.api('/produtos?status=todos&busca=novo%20do%20app')).itens[0].localId);
ok(manual === 's-vit', 'Vínculo escolhido à mão não muda no Revincular');

/* ---------- 6e) Busca letra por letra: o campo não fecha ---------- */
const campoBusca2 = p.locator('.people-bottom-header .shared-header-search');
if (await campoBusca2.isHidden()) await p.locator('.view.show .people-search-toggle').click();
await campoBusca2.fill('');
await campoBusca2.pressSequentially('13150', { delay: 120 });
await p.waitForTimeout(400);
ok(await campoBusca2.isVisible() && await campoBusca2.evaluate((e) => document.activeElement === e) && (await campoBusca2.inputValue()) === '13150', 'Busca segue aberta e com o cursor depois de digitar letra por letra');
ok((await linhas()).length === 1 && (await linhas())[0].includes('BOLO CASEIRO'), 'Acha pelo código interno');
await campoBusca2.fill('');

/* ---------- 6f) Lista nas larguras do celular, tablet e computador, claro e escuro ---------- */
let combinacoes = 0;
for (const largura of [320, 390, 1024]) {
  await p.setViewportSize({ width: largura, height: 900 });
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    const m = await p.evaluate(() => ({ lateral: document.documentElement.scrollWidth - innerWidth, vazando: [...document.querySelectorAll('#compras-produtos .compras-card')].filter((c) => [...c.querySelectorAll('*')].some((x) => x.getBoundingClientRect().right > c.getBoundingClientRect().right + 1)).length }));
    ok(m.lateral <= 0 && m.vazando === 0, largura + 'px ' + (escuro ? 'escuro' : 'claro') + ': sem rolagem lateral e nada vazando dos cards (' + JSON.stringify(m) + ')');
    combinacoes++;
  }
}
await p.evaluate(() => document.body.classList.remove('dark-theme'));
await p.setViewportSize({ width: 1024, height: 900 });

/* ---------- 7) Outras telas leem os produtos do servidor ---------- */
for (const tela of ['solicitacao', 'cotacao', 'pedidos', 'conferencias', 'cadastro', 'estoque']) {
  await p.evaluate((t) => CicluzCompras.abrir(t), tela);
  ok(await p.locator('#compras-' + tela + '.show').count() === 1, 'Compras: ' + tela + ' abre no modo servidor');
}
await p.evaluate(() => CicluzProducao.abrir('produtos'));
ok(await p.locator('#producao-produtos.show').count() === 1, 'Produção abre no modo servidor');

ok(erros.length === 0, 'Sem erros de JavaScript: ' + erros.join(' | '));
await navegador.close();
api.parar();
console.log(verificacoes + ' verificações dos produtos no servidor (navegador + API) passaram (' + combinacoes + ' combinações de largura × tema)');
