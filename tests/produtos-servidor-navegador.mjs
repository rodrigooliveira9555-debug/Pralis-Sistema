// Produtos no servidor, de ponta a ponta (docs/PRODUTOS_NO_SERVIDOR_PLANO.md, fases 2 e 3): navegador + API de verdade
// + Postgres limpo. Dados 100% fictícios. Rodar: node tests/produtos-servidor-navegador.mjs (precisa do Docker).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { iniciarApi } from './servidor-api.mjs';

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
await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
const linhas = () => p.locator('#compras-produtos .compras-tabela tbody tr').allTextContents();
ok((await linhas()).length === 2, 'Lista (Só ativos) com os 2 ativos do resumo');
await p.locator('#compras-produtos label', { hasText: 'Só ativos' }).click();
await p.waitForFunction(() => /3 produto/.test(document.querySelector('#compras-produtos .compras-linha-info').textContent), null, { timeout: 15000 });
ok((await linhas()).length === 3 && (await linhas()).some((t) => t.includes('PRODUTO 13002')), 'Sem "Só ativos": a página vem do servidor, com o inativo');
const campoBusca = p.locator('#compras-produtos .compras-busca');
if (await campoBusca.isHidden()) await p.locator('#compras-produtos .local-search-toggle').click();
await campoBusca.pressSequentially('bolo', { delay: 80 });
await p.waitForFunction(() => /1 produto/.test(document.querySelector('#compras-produtos .compras-linha-info').textContent), null, { timeout: 15000 });
ok((await linhas()).length === 1 && (await linhas())[0].includes('BOLO CASEIRO'), 'Busca no servidor por nome');
await campoBusca.fill('');
await p.locator('#compras-produtos label', { hasText: 'Só ativos' }).click();

/* ---------- 3) Editar pela API; conflito de versão ---------- */
const dlg = () => p.locator('dialog.compras-dialog[open]').last();
const fechado = () => p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'), null, { timeout: 15000 })
  .catch(async () => { throw new Error('Diálogo não fechou: ' + (await p.locator('dialog.compras-dialog[open]').last().locator('.compras-alertas, .profiles-error').allTextContents()).join(' | ')); });
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'BOLO CASEIRO' }).click();
await dlg().getByLabel('Estoque mín.', { exact: true }).fill('12');
await dlg().locator('.people-save-control').click();
await fechado();
const editado = await p.evaluate(async () => CicluzSync.api('/produtos/item/p-feito-no-s2'));
ok(editado.dados.estoqueMin === 12 && editado.versao === 2, 'Edição gravada no servidor (versão 2)');
ok(await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.id === 'p-feito-no-s2').saldo === 3), 'Editar o cadastro não mexe no saldo do aparelho');
// Outra pessoa salva antes: a tela recusa com aviso, sem sobrescrever.
await p.locator('#compras-produtos .compras-tabela tbody tr', { hasText: 'BOLO CASEIRO' }).click();
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
await dlg().getByLabel('Grupo de mercadorias', { exact: true }).selectOption({ label: 'MERCEARIA' });
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
await p.locator('#compras-produtos button', { hasText: 'Importar do app de produtos' }).click();
await dlg().getByLabel('Arquivo do backup (.xlsx)', { exact: true }).setInputFiles({ name: 'backup.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' })) });
await dlg().locator('.compras-importacao-linha', { hasText: 'Ativos' }).first().waitFor({ timeout: 20000 });
await dlg().locator('.people-save-control').click();
await fechado();
const aposImportar = await p.evaluate(async () => (await CicluzSync.api('/produtos?status=todos&tamanho=100&ordem=codigo')).itens.map((x) => [x.codigoInterno, x.status, x.precoVenda, x.semGrupo]));
ok(aposImportar.length === 6, 'Importação: 2 novos no servidor e o 13001 atualizado, sem duplicar: ' + JSON.stringify(aposImportar));
ok(JSON.stringify(aposImportar.find((x) => x[0] === '13001')) === JSON.stringify(['13001', 'ativo', '8.25', false]), 'Preço do app atualizado no 13001');
ok(await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.id === 'pi-13001').saldo === 12), 'Importar não mexe no saldo do aparelho');

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
console.log(verificacoes + ' verificações dos produtos no servidor (navegador + API) passaram');
