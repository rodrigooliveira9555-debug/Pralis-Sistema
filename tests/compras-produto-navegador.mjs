// Cadastro de produtos no navegador com a API de verdade (Playwright + Chromium + Postgres limpo, dados fictícios).
// O catálogo fica no servidor (docs/PRODUTOS_NO_SERVIDOR_PLANO.md). O ponto de partida é uma cópia dos dados de
// exemplo do protótipo com outros ids: eles chegam ao servidor pela transferência automática do aparelho.
// Rodar: npm run test:telas-api  (ou node tests/compras-produto-navegador.mjs; precisa do Docker)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';
import { iniciarApi } from './servidor-api.mjs';
import { escolherNaArvore, escolherLocal } from './ajuda-arvore.mjs';

const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };
// PNG 2x2 para a foto
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DwnwEIGP4zMDAAAA0EAf0ZHZ0yAAAAAElFTkSuQmCC', 'base64');

/** Dados de exemplo do protótipo (semente do Compras), com os ids dos produtos trocados (os de exemplo não vão ao servidor). */
async function sementeComOutrosIds() {
  const { servidor, url } = await iniciar();
  const ctx = await navegador.newContext();
  await ctx.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => window.CicluzComprasDados);
  const texto = await p.evaluate(() => localStorage.getItem('cicluz-compras-v1'));
  await ctx.close(); servidor.close();
  return texto.replace(/"(p-[a-z0-9-]+)"/g, (m, id) => '"x' + id + '"');
}

async function paginaNaApi(api, documentos, largura = 1024) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: 900 } });
  await api.entrar(ctx, documentos);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await p.goto(api.url + '/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.CicluzComprasProdutos && window.CicluzProdutoForm && CicluzProdutos.modoServidor() && CicluzComprasDados.dados.produtos.length > 0, null, { timeout: 60000 });
  // A Agenda mora no servidor (a promoção agendada vira compromisso): na primeira vez, o administrador a leva para lá.
  await p.waitForFunction(() => window.CicluzAgendaDados && !['carregando', 'cache'].includes(CicluzAgendaDados.situacao), null, { timeout: 30000 });
  await p.evaluate(async () => {
    if (CicluzAgendaDados.situacao !== 'nao-transferida') return;
    const previa = await CicluzSync.api('/agenda/transferencia');
    const r = await CicluzAgendaDados.transferir({ documentoVersao: previa.documento.versao, gestorSemCriador: CicluzSessao.perfil.usuarioId });
    if (r.erro) throw new Error(r.erro);
  });
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); CicluzCompras.abrir('produtos'); });
  return p;
}
const api = await iniciarApi();
const SEMENTE = await sementeComOutrosIds();
const abrirPagina = (largura) => paginaNaApi(api, { 'cicluz-compras-v1': SEMENTE }, largura);
const dlg = (p) => p.locator('dialog.compras-dialog[open]').last();
// Salvar e fechar pelo rodapé fixo do S2 (✓ e ✕), como o usuário faz.
const salvarDialogo = (p) => dlg(p).locator('.people-save-control').click();
/** Espera o diálogo fechar; se continuar aberto, falha mostrando o erro do formulário. */
async function esperarFechar(p) {
  try { await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'), null, { timeout: 15000 }); }
  catch (e) {
    const msg = await p.evaluate(() => [...document.querySelectorAll('dialog.compras-dialog[open] :is(.compras-alertas, .profiles-error)')].map((x) => x.innerText.trim()).filter(Boolean).join(' | '));
    throw new Error('Diálogo não fechou: ' + msg);
  }
}
const sec = (p, legenda) => dlg(p).locator('fieldset', { has: p.locator('legend', { hasText: legenda }) });
// O cadastro tem 6 etapas (a 6ª é a Revisão dos dados); a barra de etapas leva direto à etapa pedida.
const etapa = (p, n) => dlg(p).locator('.stepper-node').nth(n - 1).click();

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
  await etapa(p, 2);
  // Grupo e subgrupo num campo só, escolhidos na árvore (23/11/2026, Zé).
  await escolherNaArvore(p, s2.getByRole('button', { name: 'Grupo de mercadorias', exact: true }), { grupo: 'MERCEARIA' });
  ok((await s2.getByRole('button', { name: 'Grupo de mercadorias', exact: true }).textContent()).trim() === 'Mercearia', 'Campo de grupo mostra o que foi escolhido na árvore');
  const sLoja = sec(p, 'Desta loja');
  await etapa(p, 3);
  ok((await sLoja.getByLabel('Margem (%)', { exact: true }).inputValue()) === '25', 'Trocar o grupo copia a margem padrão do grupo');
  // Setor de estoque e Área escolhidos na janela de áreas, setores e locais (23/11/2026, Zé).
  await escolherLocal(p, sLoja.getByRole('button', { name: 'Setor de estoque', exact: true }), ['Operação de Loja', 'Caixa', 'Principal']);
  ok((await sLoja.getByRole('button', { name: 'Setor de estoque', exact: true }).textContent()).trim() === 'Operação de Loja › Caixa › Principal', 'Setor de estoque mostra o caminho escolhido na árvore de locais');
  await escolherLocal(p, sLoja.getByRole('button', { name: 'Área', exact: true }), ['Operação de Loja']);
  await sLoja.getByLabel('Estoque mín.', { exact: true }).fill('12');
  await sLoja.getByLabel('Estoque máx.', { exact: true }).fill('48');
  await sLoja.getByLabel('Local de venda primário', { exact: true }).fill('balcão');
  await sLoja.getByLabel('Local de venda secundário', { exact: true }).fill('caixa');
  await sLoja.getByLabel('Setor de venda primário', { exact: true }).fill('mercearia');
  await sLoja.getByLabel('Setor de venda secundário', { exact: true }).fill('caixa');
  await sLoja.getByLabel('Área da loja (Relatório Gerentes)', { exact: true }).selectOption('biscoitos');
  await sLoja.getByLabel('Custo', { exact: true }).fill('24,00');
  await sLoja.getByLabel('Margem (%)', { exact: true }).fill('50');
  await sLoja.getByLabel('Margem (%)', { exact: true }).dispatchEvent('input');
  ok((await sLoja.getByLabel('V. Venda (calculado)', { exact: true }).inputValue()).includes('3,00'), 'Preço "auto" = custo ÷ embalagem × (1 + margem)');
  ok(await d.getByText('Curva ABC').count() === 0 && await d.getByText('Produto vendido por peso').count() === 0 && await d.getByText('Tolerância na separação').count() === 0, 'Curva ABC, vendido por peso e tolerância não ficam no cadastro (decisão do Zé)');
  await etapa(p, 5);
  const s3 = sec(p, 'Fiscal');
  await s3.getByLabel('Código CEST', { exact: true }).fill('1234567');
  await s3.getByLabel('Categoria', { exact: true }).fill('biscoitos');
  ok(await s3.locator('.compras-situacao').first().isVisible(), 'Fiscal mostra o estado da classificação');
  await etapa(p, 4);
  const s4 = sec(p, 'Promoção');
  await s4.getByRole('button', { name: 'Adicionar promoção' }).click();
  await s4.locator('.compras-promo .account-status-switch').click(); // Agendar promoção: abre data, horário, repetição e dias
  await s4.getByLabel('Tipo', { exact: true }).selectOption('desconto');
  await s4.getByLabel('Desconto %', { exact: true }).fill('10');
  // Com data de início a promoção agendada gera compromisso na Agenda (sem ela, não há quando começar).
  await s4.locator('input[data-date-display][aria-label="Data de início"]').fill('01/12/26');
  await s4.getByLabel('Início', { exact: true }).fill('08:00');
  await s4.getByLabel('Término', { exact: true }).fill('10:00');
  // date-fields.js do S2 mostra um campo DD/MM/AA no lugar do original (que guarda ISO).
  await s4.getByLabel('Terminar repetição', { exact: true }).filter({ visible: true }).fill('31/12/26');
  // Toca no dia logo depois de digitar a data (sem sair do campo antes): o 1º toque tem de valer (defeito corrigido em 23/11/2026).
  await s4.getByRole('button', { name: 'Promoção 1: Dom' }).click();
  ok(await s4.getByRole('button', { name: 'Promoção 1: Dom' }).getAttribute('aria-pressed') === 'false', 'O 1º toque no dia logo depois de digitar a data já desmarca o dia');
  await etapa(p, 1);
  const s5 = sec(p, 'Conversões de unidade');
  await s5.getByRole('button', { name: 'Adicionar conversão' }).click();
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
  ok(g.codigoInterno === '13130', 'Código interno gerado pelo servidor (último antes do S2: 13129; próximo 13130)');
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
  // Promoção agendada vira compromisso na Agenda; a ligação (agendaItemIds) fica gravada no produto DO SERVIDOR (no modo
  // servidor o produto não mora no documento do Compras, então gravar só lá se perderia).
  const ligacao = await p.evaluate(async (id) => { const s = await CicluzSync.api('/produtos/item/' + id); const ids = ((s.dados.promocoes || [])[0] || {}).agendaItemIds || []; return { ids, existem: ids.filter((x) => CicluzAgendaDados.item(x)).length, titulo: ids[0] && CicluzAgendaDados.item(ids[0]).titulo }; }, g.id);
  ok(ligacao.ids.length >= 1 && ligacao.existem === ligacao.ids.length && /BISCOITO INTEGRAL/.test(ligacao.titulo), 'Promoção agendada: compromisso na Agenda e ligação gravada no servidor (' + JSON.stringify(ligacao) + ')');
  ok(g.conversoes.length === 1 && g.conversoes[0].unidade === 'CX' && g.conversoes[0].unidadesIndividuais === 12, 'Conversão gravada');
  ok(g.localId && g.setorEstoque === 'PRINCIPAL' && g.areaEstoque === 'Operação de Loja', 'Setor (pelo id do nó, com o nome) e área (pelo nome) gravados como antes: ' + [g.localId, g.setorEstoque, g.areaEstoque].join(' / '));

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
  ok(await d2.locator('.compras-foto-area img').count() === 1 && await d2.locator('.compras-promo').count() === 1 && await d2.locator('.compras-conversoes .compras-conversao-linha').count() === 1, 'Reaberto: foto, promoção e conversão');
  // Remover dentro do cadastro: botão redondo vermelho com lixeira (23/11/2026), não o retangular na cor da tela.
  const corRemover = await d2.getByRole('button', { name: 'Remover conversão 1', exact: true }).evaluate((b) => getComputedStyle(b).backgroundColor);
  const [rr, gg, bb] = corRemover.match(/[0-9]+/g).map(Number);
  ok(rr > 200 && gg < 110 && bb < 110, 'Remover conversão é o botão redondo vermelho (' + corRemover + ')');

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
  await etapa(p, 2);
  await escolherNaArvore(p, sec(p, 'Revenda ou transformação').getByRole('button', { name: 'Grupo de mercadorias', exact: true }), { grupo: 'MERCEARIA' });
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
  await etapa(p, 2);
  await escolherNaArvore(p, sec(p, 'Revenda ou transformação').getByRole('button', { name: 'Grupo de mercadorias', exact: true }), { grupo: 'MERCEARIA' });
  await etapa(p, 3);
  await sec(p, 'Desta loja').getByLabel('Estoque mín.', { exact: true }).fill('15');
  await salvarDialogo(p);
  ok(await dlg(p).getByText('Estoque mínimo deve ser múltiplo da Qt. embalagem (10)').first().isVisible(), 'Mínimo precisa ser múltiplo da embalagem');
  await dlg(p).locator('.people-close-control').click();

  /* ---------- 4) Paginação e lote (a tela não tem mais filtros nem ordenação: busca pela lupa do rodapé) ---------- */
  ok((await p.locator('#compras-produtos .grade-produto:not(.compras-linha-cabecalho)').first().innerText()).includes('BISCOITO'), 'Lista começa pelos mais recentes');
  ok(await p.getByText(/Página 1 de 2/).isVisible(), 'Paginação de 12 por página');
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
  await p.waitForFunction(() => !CicluzComprasDados.dados.produtos.some((x) => x.nomeCatalogo === 'BISCOITO INTEGRAL AVEIA'), null, { timeout: 15000 });
  const inat = await p.evaluate(async () => (await CicluzSync.api('/produtos?status=todos&busca=aveia')).itens.map((x) => [x.status, x.liberadoCompra]));
  ok(inat.length === 2 && inat.every(([s, l]) => s === 'inativo' && l === false), 'Inativar em lote no servidor (e desliga a liberação, como no S2)');

  /* ---------- 5) Cards e foto ampliada ---------- */
  // Cards só no celular (até 600 px); os inativados aparecem pelo botão "Inativos" do cabeçalho da lista (no modo servidor, vêm da API).
  await p.setViewportSize({ width: 390, height: 900 });
  await p.locator('#compras-produtos .compras-secao-cab button', { hasText: 'Inativos' }).click();
  await p.getByRole('button', { name: /Ampliar foto de BISCOITO/ }).first().waitFor({ timeout: 15000 });
  await p.getByRole('button', { name: /Ampliar foto de BISCOITO/ }).first().click();
  ok(await dlg(p).locator('img.compras-foto-ampliada').isVisible(), 'Foto ampliada abre a partir do card');
  await p.close();
}

/* ---------- 6) Dado antigo, sem os campos novos, continua abrindo ---------- */
{
  const antigo = () => {
    const dados = { versao: 1, fornecedores: [], produtos: [{ id: 'p-velho', codigo: 'PR-1001', ean: '789123', descricao: 'Produto Antigo', marca: 'X', tipo: 'revenda', grupoId: 'g3', subgrupoId: '', unidade: 'UN', embalagem: 'CX', cDe: 'C/', qtdEmbalagem: 6, medidaCompra: 'UN', liberadoCompra: true, status: 'ativo', saldo: 5, estoqueMin: 6, estoqueMax: 12, areaEstoque: '', setorEstoque: '', localVenda: 'Balcão', curvaAbc: 'A', custo: 10, margem: 0.3, vendas3m: 1, compras3m: 1, lucro3m: 1 }] };
    for (const c of ['catalogo', 'precosBase', 'historico', 'agendas', 'ocorrencias', 'solicitacoes', 'rodadas', 'convites', 'pedidos', 'movimentos', 'conferenciaAgendas', 'conferencias']) dados[c] = [];
    return JSON.stringify(dados);
  };
  const apiAntiga = await iniciarApi();
  const p = await paginaNaApi(apiAntiga, { 'cicluz-compras-v1': antigo() }, 390);
  // Em 390 px a lista aparece em cards (como no S1).
  const cardAntigo = p.locator('#compras-produtos .compras-card', { hasText: 'Produto Antigo' });
  ok(await cardAntigo.count() === 1, 'Produto antigo aparece na lista (em cards no celular)');
  await cardAntigo.getByRole('button', { name: 'Editar' }).click();
  ok((await sec(p, 'Produto').getByLabel('Nome do produto', { exact: true }).inputValue()) === 'Produto Antigo', 'Formulário do produto antigo abre');
  ok((await sec(p, 'Produto').getByLabel('Código de barras', { exact: true }).inputValue()) === '789123', 'EAN antigo vira código de barras');
  ok(await p.evaluate(() => CicluzComprasDados.dados.unidades.length >= 9 && Array.isArray(CicluzComprasDados.dados.historicoNomes)), 'Coleções novas criadas sem perder o dado');
  ok(await p.evaluate(() => CicluzComprasDados.dados.produtos.find((x) => x.id === 'p-velho').saldo === 5), 'Saldo do produto antigo preservado no aparelho depois da transferência');
  await p.close();
  apiAntiga.parar();
}

await navegador.close();
api.parar();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações do cadastro de produtos no navegador passaram');
