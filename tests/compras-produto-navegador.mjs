// Cadastro de produtos no navegador (Playwright + Chromium, isolado, sem dados reais).
// Rodar: npm run test:telas  (ou node tests/compras-produto-navegador.mjs)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };
// PNG 2x2 para a foto
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DwnwEIGP4zMDAAAA0EAf0ZHZ0yAAAAAElFTkSuQmCC', 'base64');

async function abrirPagina(largura = 1024, prepararDados) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: 900 } });
  await ctx.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  if (prepararDados) await ctx.addInitScript(prepararDados);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => window.CicluzComprasProdutos && window.CicluzProdutoForm);
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
  return p;
}
const dlg = (p) => p.locator('dialog.compras-dialog[open]').last();
// Salvar e fechar pelo rodapé fixo do S2 (✓ e ✕), como o usuário faz.
const salvarDialogo = (p) => dlg(p).locator('.people-save-control').click();
/** Espera o diálogo fechar; se continuar aberto, falha mostrando o erro do formulário. */
async function esperarFechar(p) {
  try { await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'), null, { timeout: 4000 }); }
  catch (e) {
    const msg = await p.evaluate(() => [...document.querySelectorAll('dialog.compras-dialog[open] :is(.compras-alertas, .profiles-error)')].map((x) => x.innerText.trim()).filter(Boolean).join(' | '));
    throw new Error('Diálogo não fechou: ' + msg);
  }
}
const sec = (p, legenda) => dlg(p).locator('fieldset', { has: p.locator('legend', { hasText: legenda }) });

/* ---------- 1) Criar produto com os campos novos, salvar, reabrir e conferir ---------- */
{
  const p = await abrirPagina();
  await p.locator('.view.show .people-add-control').click();
  const d = dlg(p);
  const s1 = sec(p, 'Produto');
  await s1.getByLabel('Habilitar ajuda', { exact: true }).check();
  ok(await d.locator('.compras-dica').first().isVisible(), 'Dicas aparecem com "Habilitar ajuda" ligado');
  ok(await s1.getByLabel('Liberado para compra').isChecked(), 'Produto novo nasce liberado para compra (exceção do Zé)');
  await d.locator('.compras-foto input[type=file]:not([capture])').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
  await d.locator('.compras-foto-area img').waitFor();
  await s1.getByLabel('Código de barras', { exact: true }).fill('7899999000011');
  await s1.getByLabel('Marca', { exact: true }).fill('Marca Teste');
  await s1.getByLabel('Nome do produto', { exact: true }).fill('Biscoito Integral');
  await s1.getByLabel('Gramatura', { exact: true }).fill('200');
  await s1.getByLabel('Medida base', { exact: true }).selectOption('G');
  await s1.getByLabel('Vai para balança?', { exact: true }).selectOption('sim');
  await s1.getByLabel('Validade na balança (dias)', { exact: true }).fill('15');
  ok((await s1.getByLabel('Descrição (automática)', { exact: true }).inputValue()) === 'BISCOITO INTEGRAL 200 G', 'Descrição gerada: nome + gramatura + medida');
  const s1b = sec(p, 'Como se compra');
  await s1b.getByLabel('Embalagem', { exact: true }).selectOption('CX');
  await s1b.getByLabel('C/ ou DE', { exact: true }).selectOption('C/');
  await s1b.getByLabel('Qt. embalagem', { exact: true }).fill('12');
  await s1b.getByLabel('Medida de compra', { exact: true }).selectOption('UN');
  await s1b.getByLabel('Quantidade da embalagem', { exact: true }).selectOption('sim');
  ok((await s1b.getByLabel('Como se compra (automático)', { exact: true }).inputValue()) === 'BISCOITO INTEGRAL 200 G - CAIXA COM BISCOITO INTEGRAL 200 G APROXIMADAMENTE 12UN', 'Como se compra no formato do S1');
  const s2 = sec(p, 'Revenda ou transformação');
  await s2.getByLabel('Grupo de mercadorias', { exact: true }).selectOption({ label: 'MERCEARIA' });
  ok((await s2.getByLabel('Margem (%)', { exact: true }).inputValue()) === '25', 'Trocar o grupo copia a margem padrão do grupo');
  await s2.getByLabel('Setor de estoque', { exact: true }).selectOption({ index: 1 });
  await s2.getByLabel('Área', { exact: true }).selectOption({ index: 1 });
  await s2.getByLabel('Estoque mín.', { exact: true }).fill('12');
  await s2.getByLabel('Estoque máx.', { exact: true }).fill('48');
  await s2.getByLabel('Local de venda primário', { exact: true }).fill('balcão');
  await s2.getByLabel('Local de venda secundário', { exact: true }).fill('caixa');
  await s2.getByLabel('Setor de venda primário', { exact: true }).fill('mercearia');
  await s2.getByLabel('Setor de venda secundário', { exact: true }).fill('caixa');
  await s2.getByLabel('Área da loja (Relatório Gerentes)', { exact: true }).selectOption('biscoitos');
  await s2.getByLabel('Custo', { exact: true }).fill('24,00');
  await s2.getByLabel('Margem (%)', { exact: true }).fill('50');
  await s2.getByLabel('Margem (%)', { exact: true }).dispatchEvent('input');
  ok((await s2.getByLabel('V. Venda (calculado)', { exact: true }).inputValue()).includes('3,00'), 'Preço "auto" = custo ÷ embalagem × (1 + margem)');
  ok(await d.getByText('Curva ABC').count() === 0 && await d.getByText('Produto vendido por peso').count() === 0 && await d.getByText('Tolerância na separação').count() === 0, 'Curva ABC, vendido por peso e tolerância não ficam no cadastro (decisão do Zé)');
  const s3 = sec(p, 'Fiscal');
  await s3.getByLabel('Código CEST', { exact: true }).fill('1234567');
  await s3.getByLabel('Categoria', { exact: true }).fill('biscoitos');
  ok(await s3.locator('.compras-situacao').first().isVisible(), 'Fiscal mostra o estado da classificação');
  const s4 = sec(p, 'Promoção');
  await s4.getByRole('button', { name: '+ Adicionar promoção' }).click();
  await s4.getByLabel('Tipo', { exact: true }).selectOption('desconto');
  await s4.getByLabel('Desconto %', { exact: true }).fill('10');
  await s4.getByLabel('Início', { exact: true }).fill('08:00');
  await s4.getByLabel('Término', { exact: true }).fill('10:00');
  // date-fields.js do S2 mostra um campo DD/MM/AA no lugar do original (que guarda ISO).
  await s4.getByLabel('Válida até', { exact: true }).filter({ visible: true }).fill('31/12/26');
  await s4.getByRole('button', { name: 'Promoção 1: Dom' }).click();
  const s5 = sec(p, 'Conversões de unidade');
  await s5.getByRole('button', { name: '+ Adicionar conversão' }).click();
  await s5.getByLabel('Unidade', { exact: true }).selectOption('CX');
  await s5.getByLabel('Quantidade', { exact: true }).fill('1');
  await s5.getByLabel('Unidades individuais', { exact: true }).fill('12');
  await salvarDialogo(p);
  // "SUCO UVA INTEGRAL" tem 63% de semelhança (≥ 55): o aviso de nome parecido pede confirmação.
  ok(await d.locator('.compras-duplicidade', { hasText: 'SUCO UVA INTEGRAL' }).isVisible(), 'Nome parecido (semelhança ≥ 55) pede confirmação');
  await d.getByRole('button', { name: 'Cadastrar mesmo assim' }).click();
  await esperarFechar(p);
  const g = await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.nomeCatalogo === 'BISCOITO INTEGRAL'));
  ok(g && g.codigo === undefined && await p.evaluate(() => !document.body.innerText.includes('Código externo')), 'Sem código externo (decisão do Zé)');
  ok(g.codigoInterno === '13130', 'Código interno sequencial do PDV (piso 13129 + 1)');
  const esperado = {
    descricao: 'BISCOITO INTEGRAL 200 G', codigoBarras: '7899999000011', marca: 'MARCA TESTE', quantidadeIndividual: 200, unidadeIndividual: 'G',
    pesavel: true, teclaBalanca: 0, validadeBalanca: 15, embalagem: 'CX', cDe: 'C/', qtdEmbalagem: 12, medidaCompra: 'UN', compraAproximada: true,
    tipo: 'revenda', estoqueMin: 12, estoqueMax: 48, localVenda1: 'BALCÃO', localVenda2: 'CAIXA', setorVenda1: 'MERCEARIA', setorVenda2: 'CAIXA',
    areaVenda: 'biscoitos', custo: 24, margem: 0.5, auto: true, precoVenda: 3,
    habilitarAjuda: true, liberadoCompra: true, status: 'ativo',
  };
  for (const [k, v] of Object.entries(esperado)) ok(g[k] === v, 'Persistiu ' + k + ' (' + JSON.stringify(g[k]) + ')');
  ok(g.fotoUrl && g.fotoUrl.startsWith('data:image/jpeg'), 'Foto gravada (reduzida, no navegador)');
  ok(g.fiscal && g.fiscal.cest === '1234567' && g.fiscal.categoriaFiscal === 'BISCOITOS' && g.fiscal.cstPisCofins === '01', 'Fiscal: manuais gravados e CST puxado pelo grupo');
  ok(g.promocoes.length === 1 && g.promocoes[0].descontoFracao === 0.1 && g.promocoes[0].dias[6] === false && g.promocoes[0].validaAte === '2026-12-31', 'Promoção gravada (desconto, dias, horário e validade)');
  ok(g.conversoes.length === 1 && g.conversoes[0].unidade === 'CX' && g.conversoes[0].unidadesIndividuais === 12, 'Conversão gravada');
  ok(g.setorEstoque && g.areaEstoque, 'Setor e área de estoque da árvore de locais');

  // Reabrir e conferir que os campos voltam preenchidos
  await p.evaluate((id) => CicluzProdutoForm.editarProduto(CicluzComprasDados.produto(id), () => {}), g.id);
  const d2 = dlg(p);
  const valores = await d2.evaluate((dd) => {
    const v = (rot) => { const e = [...dd.querySelectorAll('[aria-label]')].find((x) => x.getAttribute('aria-label') === rot); return e ? (e.type === 'checkbox' ? e.checked : e.value) : undefined; };
    return { nome: v('Nome do produto'), gram: v('Gramatura'), medida: v('Medida base'), ean: v('Código de barras'), bal: v('Vai para balança?'), val: v('Validade na balança (dias)'), emb: v('Embalagem'), qtd: v('Qt. embalagem'), min: v('Estoque mín.'), max: v('Estoque máx.'), l2: v('Local de venda secundário'), s2: v('Setor de venda secundário'), area: v('Área da loja (Relatório Gerentes)'), margem: v('Margem (%)'), cest: v('Código CEST'), desc: v('Descrição (automática)') };
  });
  ok(valores.nome === 'BISCOITO INTEGRAL' && valores.gram === '200' && valores.medida === 'G' && valores.ean === '7899999000011', 'Reaberto: identificação');
  ok(valores.bal === 'sim' && valores.val === '15' && valores.emb === 'CX' && valores.qtd === '12', 'Reaberto: balança e como se compra');
  ok(valores.min === '12' && valores.max === '48' && valores.l2 === 'CAIXA' && valores.s2 === 'CAIXA' && valores.area === 'biscoitos', 'Reaberto: estoque e venda');
  ok(valores.margem === '50' && valores.cest === '1234567', 'Reaberto: comercial e fiscal');
  ok(await d2.locator('.compras-foto-area img').count() === 1 && await d2.locator('.compras-promo').count() === 1 && await d2.locator('.compras-conversoes .compras-item-urgente').count() === 1, 'Reaberto: foto, promoção e conversão');

  // Histórico de nomes ao trocar o nome
  await sec(p, 'Produto').getByLabel('Nome do produto', { exact: true }).fill('Biscoito Integral Aveia');
  await salvarDialogo(p);
  await esperarFechar(p);
  const hist = await p.evaluate(() => CicluzComprasDados.dados.historicoNomes);
  ok(hist.length === 1 && hist[0].nomeAnterior === 'BISCOITO INTEGRAL' && hist[0].nomeNovo === 'BISCOITO INTEGRAL AVEIA', 'Histórico de nomes registrado');

  /* ---------- 2) Duplicidade e EAN repetido ---------- */
  await p.locator('.view.show .people-add-control').click();
  const d3 = dlg(p);
  await sec(p, 'Produto').getByLabel('Código de barras', { exact: true }).fill('7899999000011');
  await d3.getByText('com este código de barras neste catálogo').waitFor();
  ok(true, 'Aviso de EAN repetido enquanto digita');
  await sec(p, 'Produto').getByLabel('Código de barras', { exact: true }).fill('');
  await sec(p, 'Produto').getByLabel('Nome do produto', { exact: true }).fill('Biscoito Integral Aveia');
  await sec(p, 'Produto').getByLabel('Medida base', { exact: true }).selectOption('G');
  await sec(p, 'Revenda ou transformação').getByLabel('Grupo de mercadorias', { exact: true }).selectOption({ label: 'MERCEARIA' });
  await salvarDialogo(p);
  ok(await d3.locator('.compras-duplicidade').isVisible(), 'Nome igual pede confirmação');
  await d3.getByRole('button', { name: 'Cadastrar mesmo assim' }).click();
  await esperarFechar(p);
  ok(await p.evaluate(() => CicluzComprasDados.dados.produtos.filter((x) => x.nomeCatalogo === 'BISCOITO INTEGRAL AVEIA').length) === 2, '"Cadastrar mesmo assim" grava');
  ok(await p.evaluate(() => { const x = CicluzComprasDados.dados.produtos.filter((y) => y.nomeCatalogo === 'BISCOITO INTEGRAL AVEIA')[1]; return x.codigoBarras === x.codigoInterno && x.codigoInterno === '13131'; }), 'EAN vazio recebe o código interno');

  /* ---------- 3) Validações do S1 ---------- */
  await p.locator('.view.show .people-add-control').click();
  await sec(p, 'Produto').getByLabel('Nome do produto', { exact: true }).fill('Produto Validação');
  await sec(p, 'Como se compra').getByLabel('Qt. embalagem', { exact: true }).fill('10');
  await sec(p, 'Revenda ou transformação').getByLabel('Grupo de mercadorias', { exact: true }).selectOption({ label: 'MERCEARIA' });
  await sec(p, 'Revenda ou transformação').getByLabel('Estoque mín.', { exact: true }).fill('15');
  await salvarDialogo(p);
  ok(await dlg(p).getByText('Estoque mínimo deve ser múltiplo da Qt. embalagem (10)').first().isVisible(), 'Mínimo precisa ser múltiplo da embalagem');
  await dlg(p).locator('.people-close-control').click();

  /* ---------- 4) Filtros, ordenações, paginação e lote ---------- */
  const primeira = () => p.locator('#compras-produtos tbody tr').first().innerText();
  await p.locator('#compras-produtos select[aria-label="Ordenar"]').selectOption('az');
  ok((await primeira()).includes('AÇÚCAR'), 'Ordenação A–Z');
  await p.locator('#compras-produtos select[aria-label="Ordenar"]').selectOption('codigo_desc');
  ok((await primeira()).includes('13131'), 'Ordenação por código decrescente');
  await p.locator('#compras-produtos select[aria-label="Ordenar"]').selectOption('recentes');
  ok((await primeira()).includes('BISCOITO'), 'Ordenação mais recentes');
  ok(await p.getByText(/Página 1 de 2/).isVisible(), 'Paginação de 12 por página');
  const total = async () => Number((await p.locator('#compras-produtos .compras-linha-info .profiles-note').innerText()).match(/^(\d+)/)[1]);
  const antes = await total();
  await p.locator('#compras-produtos label', { hasText: 'Só os que já vendi' }).locator('input').check();
  ok((await total()) === 13 && antes === 20, '"Só os que já vendi" filtra (20 ativos → 13 com venda)');
  await p.locator('#compras-produtos label', { hasText: 'Só os que já vendi' }).locator('input').uncheck();
  await p.locator('#compras-produtos .compras-grupo-chips', { hasText: 'Tipo' }).getByRole('button', { name: 'Transformação' }).click();
  ok((await p.locator('#compras-produtos tbody tr').count()) === 3, 'Filtro Transformação');
  await p.getByRole('button', { name: 'Limpar' }).click();
  await p.getByRole('checkbox', { name: 'Selecionar BISCOITO INTEGRAL AVEIA' }).first().check();
  await p.getByRole('checkbox', { name: 'Selecionar BISCOITO INTEGRAL AVEIA' }).last().check();
  await p.getByRole('button', { name: 'Inativar selecionados' }).click();
  const conf = dlg(p);
  await conf.getByLabel('Digite INATIVAR 2 PRODUTOS para confirmar', { exact: true }).fill('inativar');
  await conf.locator('.people-save-control').click();
  ok(await conf.getByText('Digite exatamente INATIVAR 2 PRODUTOS.').first().isVisible(), 'Frase errada não inativa');
  await conf.getByLabel('Digite INATIVAR 2 PRODUTOS para confirmar', { exact: true }).fill('inativar 2 produtos');
  await conf.locator('.people-save-control').click();
  await esperarFechar(p);
  const inat = await p.evaluate(() => CicluzComprasDados.dados.produtos.filter((x) => x.nomeCatalogo === 'BISCOITO INTEGRAL AVEIA').map((x) => [x.status, x.liberadoCompra]));
  ok(inat.every(([s, l]) => s === 'inativo' && l === false), 'Inativar em lote (e desliga a liberação, como no S2)');

  /* ---------- 5) Cards e foto ampliada ---------- */
  await p.locator('#compras-produtos .compras-chips').getByRole('button', { name: 'Cards' }).click();
  await p.locator('#compras-produtos label', { hasText: 'Só ativos' }).locator('input').uncheck();
  await p.getByRole('button', { name: /Ampliar foto de BISCOITO/ }).first().click();
  ok(await dlg(p).locator('img.compras-foto-ampliada').isVisible(), 'Foto ampliada abre a partir do card');
  await p.close();
}

/* ---------- 6) Dado antigo, sem os campos novos, continua abrindo ---------- */
{
  const antigo = () => {
    const dados = { versao: 1, fornecedores: [], produtos: [{ id: 'p-velho', codigo: 'PR-1001', ean: '789123', descricao: 'Produto Antigo', marca: 'X', tipo: 'revenda', grupoId: 'g3', subgrupoId: '', unidade: 'UN', embalagem: 'CX', cDe: 'C/', qtdEmbalagem: 6, medidaCompra: 'UN', liberadoCompra: true, status: 'ativo', saldo: 5, estoqueMin: 6, estoqueMax: 12, areaEstoque: '', setorEstoque: '', localVenda: 'Balcão', curvaAbc: 'A', custo: 10, margem: 0.3, vendas3m: 1, compras3m: 1, lucro3m: 1 }] };
    for (const c of ['catalogo', 'precosBase', 'historico', 'agendas', 'ocorrencias', 'solicitacoes', 'rodadas', 'convites', 'pedidos', 'movimentos', 'conferenciaAgendas', 'conferencias']) dados[c] = [];
    if (!sessionStorage.getItem('antigo-gravado')) { localStorage.setItem('cicluz-compras-v1', JSON.stringify(dados)); sessionStorage.setItem('antigo-gravado', '1'); }
  };
  const p = await abrirPagina(390, antigo);
  // Em 390 px a lista aparece em cards (como no S1).
  const cardAntigo = p.locator('#compras-produtos .compras-card', { hasText: 'Produto Antigo' });
  ok(await cardAntigo.count() === 1, 'Produto antigo aparece na lista (em cards no celular)');
  await cardAntigo.getByRole('button', { name: 'Editar' }).click();
  ok((await sec(p, 'Produto').getByLabel('Nome do produto', { exact: true }).inputValue()) === 'Produto Antigo', 'Formulário do produto antigo abre');
  ok((await sec(p, 'Produto').getByLabel('Código de barras', { exact: true }).inputValue()) === '789123', 'EAN antigo vira código de barras');
  ok(await p.evaluate(() => CicluzComprasDados.dados.unidades.length >= 9 && Array.isArray(CicluzComprasDados.dados.historicoNomes)), 'Coleções novas criadas sem perder o dado');
  await p.close();
}

await navegador.close();
servidor.close();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações do cadastro de produtos no navegador passaram');
