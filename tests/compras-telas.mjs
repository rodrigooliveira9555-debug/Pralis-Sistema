// Verificação de navegador do módulo Compras (Playwright + Chromium, isolado, sem dados reais).
// Rodar: npm run test:telas
// 1) Fluxo completo pela interface: agenda → pedido → envio → resposta na página do fornecedor
//    → decisão na cotação → recebimento → estoque.
// 2) Matriz de layout: todas as telas de Compras em 320, 390 e 1024 px, temas claro e escuro:
//    sem erro de página, sem rolagem lateral, cabeçalho e um único rodapé visíveis.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

async function abrirPagina(largura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 844 } });
  // Porteiro da main (cicluz-sessao.js): sessão de aba de teste, sem chaves sincronizadas.
  await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await pagina.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await pagina.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.CicluzCompras && window.CicluzComprasCotacao);
  await pagina.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); });
  return pagina;
}
const clicarTexto = (pagina, seletor, texto) => pagina.locator(seletor, { hasText: texto }).first().click();
const dialogo = (pagina) => pagina.locator('dialog.compras-dialog[open]').last();

/* ---------- 1) Fluxo pela interface ---------- */
{
  const p = await abrirPagina(1024);
  // Menu de Mercadorias (vídeo do Rodrigo, 06/11/2026): sem o item "Compras (revisar)"; rotina em Lançamentos,
  // cadastros em Cadastros Geral, estoque em Estoques e o agendamento em Agenda.
  const subMercadorias = await p.evaluate(() => sections[3][1].join('|'));
  ok(subMercadorias === 'Lançamentos|Lançamentos Produção|Relatórios|Cadastros Geral|Cadastros Geral Produção|Estoques|Pastas Documentos', 'Mercadorias sem "Compras (revisar)": ' + subMercadorias);
  const cardsDe = async (sub) => { await p.evaluate((x) => menuBack(3, x)(), sub); return p.locator('#sector-content .section-card b').allTextContents(); };
  const lanc = await cardsDe('Lançamentos');
  ok(lanc.join('|') === 'MER - Mercadorias|MER - Pedido de Compra|MER - Cotação por Fornecedor|MER - Pedidos a Receber|MER - Contagem de Estoque', 'Lançamentos: pede → cota → recebe → conta, sem os espaços reservados MER - Pedidos e MER - Estoque: ' + lanc.join('|'));
  const cad = await cardsDe('Cadastros Geral');
  ok(cad.join('|') === 'MER - Grupos de Mercadorias|MER - Fornecedores|MER - Produtos|Unidades de Medida|MER - Catálogo e Preço-Base', 'Cadastros Geral com o Catálogo e Preço-Base: ' + cad.join('|'));
  ok((await cardsDe('Estoques')).join('|') === 'MER - Grupo Mercadorias', 'Estoques só com o estoque');
  ok(await p.locator('#sector-content .card-inherited-icon.revisar').count() === 0, 'Nenhuma exclamação de revisar nas linhas de Mercadorias');
  for (const [sub, titulo, id] of [['Lançamentos', 'MER - Pedido de Compra', 'solicitacao'], ['Lançamentos', 'MER - Cotação por Fornecedor', 'cotacao'], ['Lançamentos', 'MER - Pedidos a Receber', 'pedidos'], ['Lançamentos', 'MER - Contagem de Estoque', 'conferencias'], ['Cadastros Geral', 'MER - Catálogo e Preço-Base', 'cadastro']]) {
    await p.evaluate((x) => menuBack(3, x)(), sub);
    await p.locator('#sector-content .section-card', { hasText: titulo }).click();
    ok(await p.locator('#compras-' + id + '.show').count() === 1 && (await p.locator('#compras-' + id + ' .head h2').first().textContent()).trim() === titulo, sub + ' → ' + titulo + ' abre a tela com o mesmo nome');
    ok((await p.locator('#compras-' + id + ' .head p').first().textContent()).includes('Saídas · Mercadorias / ' + sub + ' / ' + titulo), 'Caminho de ' + titulo + ' mostra ' + sub);
  }
  const agendaBotao = await p.evaluate(() => [...document.querySelectorAll('.nav button')].map((b) => b.textContent.trim()).filter((t) => t.includes('Agenda de Pedidos')));
  ok(agendaBotao.join() === 'MER - Agenda de Pedidos', 'Agenda → MER - Agenda de Pedidos, sem "(revisar)": ' + agendaBotao.join());

  // "+" fixo do menu rápido aciona a criação da tela (header-add-circle)
  for (const [tela, titulo] of [['produtos', 'Novo produto'], ['fornecedores', 'Novo fornecedor'], ['cotacao', 'Pedido urgente'], ['conferencias', 'Agendar conferência']]) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    await p.locator('.view.show .people-add-control').click();
    ok(await p.locator('dialog.compras-dialog[open]', { hasText: titulo }).count() === 1, '"+" abre ' + titulo);
    await p.locator('dialog.compras-dialog[open] .people-close-control').click();
  }
  // Fornecedores tem a bolinha "+" no cabeçalho da lista (pedido do Rodrigo, 15/11/2026); as outras telas seguem sem repetir o "+".
  for (const [tela, rotulo] of [['agendamento', 'Novo agendamento'], ['cotacao', 'Pedido urgente'], ['conferencias', 'Agendar conferência'], ['unidades', 'Nova unidade']]) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    ok(await p.locator('#compras-' + tela + ' .content button', { hasText: rotulo }).count() === 0, 'Sem botão repetido do "+" em ' + tela);
  }
  // Cadastro novo de fornecedor (15/11/2026): categoria da lista, tipo de pessoa, CPF ou CNPJ com dígito
  // verificador e WhatsApp obrigatórios; nascimento só para pessoa física. Dados fictícios.
  ok(await p.evaluate(() => CicluzComprasDados.fornecedor('f-ambev').ramo === 'Bebidas' && !CicluzComprasDados.dados.fornecedores.some((f) => 'categoria' in f)), 'O texto livre antigo virou o ramo');
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.every((f) => ((f.categorias || []).join() === 'produto') === (CicluzComprasDominio.vinculosComProdutos(CicluzComprasDados.dados, f.id) > 0))), 'Fornecedor antigo ligado a produto virou Produto; sem vínculo, fica sem categoria');
  await p.evaluate(() => CicluzCompras.abrir('fornecedores'));
  await p.locator('#compras-fornecedores .compras-secao-cab button[aria-label="Cadastrar fornecedor"]').click();
  const df = p.locator('dialog.compras-dialog[open]').last();
  const erroF = async () => (await df.locator('.profiles-error').allTextContents()).join(' ');
  const etapaF = (d) => d.locator('.stepper-summary').textContent();
  const avancar = (d) => d.locator('.compras-etapas-nav button', { hasText: 'Avançar' }).click();
  // Cadastro em 4 etapas, com a barra de etapas do sistema
  ok((await etapaF(df)).includes('Etapa 1 de 4') && await df.locator('.stepper-item').count() === 4, 'Cadastro de fornecedor abre na etapa 1 de 4');
  // As consultas de CNPJ e CEP não saem para a rede no teste: respondem como serviço indisponível.
  await p.route('https://brasilapi.com.br/**', (r) => r.abort());
  ok((await etapaF(df)).includes('Dados da empresa') && await df.getByLabel('Tipo de pessoa *', { exact: true }).inputValue() === 'juridica' && await df.getByLabel('CNPJ *', { exact: true }).isVisible() && await df.getByLabel('CPF *', { exact: true }).isHidden() && await df.getByLabel('CEP', { exact: true }).isVisible(), 'Etapa 1 é Dados da empresa: abre em pessoa jurídica, com CNPJ e o endereço por CEP');
  ok(await df.locator('.compras-etapas-nav button', { hasText: 'Salvar' }).count() === 0, 'No cadastro novo o Salvar só aparece na última etapa');
  await avancar(df);
  ok((await erroF()).includes('categoria') && (await etapaF(df)).includes('Etapa 1'), 'Avançar confere a etapa: categoria é obrigatória');
  await df.getByLabel('Produto', { exact: true }).check();
  await df.getByLabel('Serviço', { exact: true }).check();
  ok((await df.locator('.stepper-item').nth(1).textContent()).includes('Vendedor / Prestador de serviço'), 'O título da 2ª etapa segue a categoria');
  await df.getByLabel('Tipo de pessoa *', { exact: true }).selectOption('juridica');
  ok(await df.getByLabel('CNPJ *', { exact: true }).isVisible() && await df.getByLabel('CPF *', { exact: true }).isHidden() && await df.getByLabel('Razão social', { exact: true }).isVisible() && await df.getByLabel('Regime tributário', { exact: true }).isVisible(), 'Pessoa jurídica: razão social, nome fantasia, CNPJ e regime tributário');
  await df.getByLabel('Razão social', { exact: true }).fill('Fornecedor CNPJ Teste Comércio Ltda');
  await df.getByLabel('Nome fantasia', { exact: true }).fill('Fornecedor CNPJ Teste');
  await df.getByLabel('Regime tributário', { exact: true }).selectOption('simples');
  await df.getByLabel('Ramo', { exact: true }).fill('Bebidas');
  await df.getByLabel('CNPJ *', { exact: true }).pressSequentially('11222333000180');
  ok((await df.getByLabel('CNPJ *', { exact: true }).inputValue()) === '11.222.333/0001-80', 'CNPJ com máscara (14 dígitos, sem cortar em 11)');
  await avancar(df);
  ok((await erroF()).includes('CNPJ válido'), 'CNPJ com dígito verificador errado é recusado');
  await df.getByLabel('CNPJ *', { exact: true }).fill('11222333000181');
  await avancar(df);
  ok((await etapaF(df)).includes('Etapa 2 de 4'), 'Etapa 2: vendedor ou prestador');
  await avancar(df);
  ok((await erroF()).includes('WhatsApp'), 'WhatsApp do vendedor é obrigatório');
  await df.getByLabel('Nome do contato', { exact: true }).fill('Responsável Teste');
  await df.getByLabel('WhatsApp *', { exact: true }).pressSequentially('31999990000');
  await avancar(df);
  ok(await df.getByLabel('O mesmo da etapa anterior (financeiro)', { exact: true }).isVisible(), 'Etapa 3: financeiro, com "O mesmo da etapa anterior" em primeiro');
  await df.getByLabel('Nome do financeiro', { exact: true }).fill('Financeiro Teste');
  await df.getByLabel('E-mail do financeiro', { exact: true }).fill('financeiro@exemplo.test');
  await avancar(df);
  await df.getByLabel('O mesmo da etapa anterior (representante)', { exact: true }).check();
  ok(await df.getByLabel('Nome do representante', { exact: true }).isHidden(), '"O mesmo da etapa anterior" esconde os campos');
  await df.locator('.compras-etapas-nav button', { hasText: 'Salvar' }).click();
  await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'));
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.some((f) => f.documento === '11.222.333/0001-81' && f.tipoPessoa === 'juridica' && f.categorias.join() === 'produto,servico' && f.ramo.toUpperCase() === 'BEBIDAS' && f.nome.toUpperCase() === 'FORNECEDOR CNPJ TESTE' && f.razaoSocial.toUpperCase().includes('LTDA') && f.regimeTributario === 'simples' && f.contatoNome && f.financeiro.email === 'financeiro@exemplo.test' && f.representante.mesmo && f.representante.email === 'financeiro@exemplo.test')), 'Fornecedor pessoa jurídica salvo com as 4 etapas (o representante copia o financeiro)');
  // Pessoa física: nome e CPF; nascimento do vendedor é opcional
  await p.locator('.view.show .people-add-control').click();
  const dp = p.locator('dialog.compras-dialog[open]').last();
  await dp.getByLabel('Serviço', { exact: true }).check();
  await dp.getByLabel('Tipo de pessoa *', { exact: true }).selectOption('fisica');
  ok(await dp.getByLabel('Razão social', { exact: true }).isHidden() && await dp.getByLabel('Regime tributário', { exact: true }).isHidden(), 'Pessoa física não tem razão social nem regime tributário');
  await dp.getByLabel('Nome *', { exact: true }).fill('Prestador CPF Teste');
  await dp.getByLabel('CPF *', { exact: true }).pressSequentially('52998224725');
  await avancar(dp);
  await dp.getByLabel('WhatsApp *', { exact: true }).pressSequentially('31988880000');
  await dp.getByLabel('Data de nascimento', { exact: true }).fill('15/03/90');
  await avancar(dp); await avancar(dp);
  await dp.locator('.compras-etapas-nav button', { hasText: 'Salvar' }).click();
  await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'));
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.some((f) => f.documento === '529.982.247-25' && f.tipoPessoa === 'fisica' && f.vendedorNascimento === '1990-03-15' && f.categorias.join() === 'servico')), 'Fornecedor pessoa física salvo com CPF, nascimento do prestador e categoria Serviço');
  // DES - Fornecedores abre o mesmo cadastro, na cor de Despesas
  await p.evaluate(() => CicluzCompras.abrir('fornecedores-des'));
  ok(await p.locator('#despesas-fornecedores.show').count() === 1 && (await p.locator('#despesas-fornecedores .head h2').textContent()) === 'DES - Fornecedores' && await p.locator('#despesas-fornecedores .compras-linha', { hasText: 'Prestador CPF Teste' }).count() === 1, 'DES - Fornecedores mostra os mesmos fornecedores');
  ok(await p.locator('#despesas-fornecedores .compras-content button.btn').count() === 1 && (await p.locator('#despesas-fornecedores .compras-secao-cab h3 button.btn').textContent()).trim() === 'Fornecedores' && await p.locator('#despesas-fornecedores .compras-secao-cab .compras-redondo').count() === 1 && await p.locator('#despesas-fornecedores .compras-content input[type=search]').count() === 0, 'No topo só o botão Cadastrar fornecedor; a busca é a do rodapé');
  ok((await p.locator('#despesas-fornecedores .compras-linha.com-acoes', { hasText: 'Prestador CPF Teste' }).locator('.c-categoria').textContent()) === 'Serviço', 'A linha mostra a categoria marcada');
  // Setinha do título oculta e mostra a coluna (preferência do aparelho)
  const setaRamo = p.locator('#despesas-fornecedores .compras-linha-cabecalho .c-ramo .compras-coluna-seta');
  await setaRamo.click();
  ok(await setaRamo.getAttribute('aria-expanded') === 'false' && await p.locator('#despesas-fornecedores .compras-linha.com-acoes .c-ramo').first().isHidden(), 'A setinha do título oculta a coluna');
  await setaRamo.click();
  ok(await setaRamo.getAttribute('aria-expanded') === 'true' && await p.locator('#despesas-fornecedores .compras-linha.com-acoes .c-ramo').first().isVisible(), '...e mostra de novo');
  await p.evaluate(() => CicluzCompras.abrir('estoque'));
  ok(await p.locator('#compras-estoque button', { hasText: 'Extrato completo' }).isVisible(), 'Extrato completo visível no Estoque');
  for (const tela of ['cadastro', 'pedidos']) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    const altura = (await p.locator('#compras-' + tela + ' .compras-abas').boundingBox()).height;
    ok(altura < 60, 'Abas com a altura dos chips em ' + tela + ' (' + Math.round(altura) + 'px)');
  }
  // Agendamento pela interface: fica no menu Agenda → "MER - Agenda de Pedidos" (Rodrigo, 05/11 e 06/11)
  await p.evaluate(() => [...document.querySelectorAll('.nav button')].find((b) => b.textContent.includes('MER - Agenda de Pedidos')).click());
  ok(await p.locator('#compras-agendamento.show').count() === 1, 'Agenda → MER - Agenda de Pedidos abre o agendamento do Compras');
  await p.locator('.view.show .people-add-control').click(); // "+" do rodapé fixo
  const d1 = dialogo(p);
  await d1.locator('select[aria-label="Grupo *"]').selectOption({ label: 'BEBIDAS' });
  await d1.getByRole('checkbox', { name: 'Marcar REFRIGERANTE COLA 2 LT' }).check();
  await d1.getByRole('checkbox', { name: 'Marcar REFRIGERANTE GUARANÁ 2 LT' }).check();
  await d1.locator('select[aria-label="Responsável por executar *"]').selectOption('u-jose');
  ok(await d1.locator('.compras-dialog-acoes').isHidden() || (await d1.locator('.compras-dialog-acoes').boundingBox()).width <= 1, 'Diálogo de salvar sem a linha Cancelar/Salvar duplicada');
  await d1.locator('.people-save-control').click();
  ok(await p.locator('#compras-agendamento .compras-agenda').count() === 1, 'Agendamento salvo e listado');

  // Gera o pedido da próxima data (simulação do agendador)
  await p.locator('#compras-agendamento .compras-datas .compras-chip').first().click();
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Gerar o pedido agora');
  await p.evaluate(() => CicluzCompras.abrir('solicitacao'));
  ok(await p.locator('#compras-solicitacao button', { hasText: 'Fazer o pedido' }).count() === 1, 'Pedido aparece em Para enviar');

  // Fazer o pedido
  await clicarTexto(p, '#compras-solicitacao button', 'Fazer o pedido');
  const d2 = dialogo(p);
  await d2.getByLabel('Quantidade de REFRIGERANTE COLA 2 LT').fill('24');
  await d2.getByLabel('Quantidade de REFRIGERANTE GUARANÁ 2 LT').fill('12');
  await d2.locator('.people-save-control').click();
  const convites = p.locator('dialog.compras-dialog[open]', { hasText: 'Enviado aos fornecedores' });
  await convites.waitFor();
  ok(await convites.locator('.compras-linha').count() === 2, 'Convites enviados a 2 fornecedores');
  const tokens = await p.evaluate(() => CicluzComprasDados.dados.convites.map((c) => ({ f: c.fornecedorId, t: c.token })));
  await convites.locator('.people-close-control').click();

  // Fornecedor responde na página pública (outra aba, mesmo navegador)
  const forn = await p.context().newPage();
  forn.on('pageerror', (e) => erros.push('fornecedor: ' + e.message));
  await forn.goto(url + 'rodada.html?t=' + tokens.find((x) => x.f === 'f-ambev').t);
  const valores = forn.locator('.rodada-item');
  await valores.nth(0).getByLabel('Valor unitário (R$) *').fill('8,00');
  await valores.nth(1).getByLabel('Valor unitário (R$) *').fill('7,50');
  await forn.getByRole('button', { name: 'Enviar resposta' }).click();
  ok(await forn.getByText('Comprado: pode entregar').count() === 1, 'Coca dentro da referência foi comprada automaticamente');
  ok(await forn.getByText('Aguardando o comprador').count() === 1, 'Guaraná acima da base ficou para o comprador');

  // Separação: ajustar a quantidade comprada ao estoque, dentro da faixa (24 ± 10% → 21,6 a 26,4)
  const separacao = forn.locator('.rodada-separacao');
  ok(await separacao.getByText('Compramos estes produtos de você').count() === 1, 'Seu pedido aparece depois de comprado');
  const campo = separacao.getByLabel('Quantidade que vou entregar');
  await campo.fill('30');
  ok(await separacao.getByRole('button', { name: 'Salvar ajuste' }).isDisabled(), 'Quantidade fora da faixa bloqueia o ajuste');
  await campo.fill('25');
  await separacao.getByRole('button', { name: 'Salvar ajuste' }).click();
  ok(await forn.getByText('Ajuste salvo. O comprador vê a quantidade nova no pedido.').count() === 1, 'Ajuste salvo');
  ok(await p.evaluate(() => CicluzComprasDados.dados.pedidos[0].eventos.some((e) => e.obs.includes('Fornecedor ajustou ao estoque dele'))), 'Ajuste registrado no histórico do pedido');

  // Produtos que também vendo: vínculo nasce aprovado
  await forn.getByRole('button', { name: 'Ver lista' }).click();
  const vendo = forn.locator('.rodada-vendo');
  ok(await vendo.getByText('Já é seu').count() === 4, 'Produtos liberados que já são do fornecedor aparecem marcados (Água não está liberada)');
  await vendo.getByLabel('Buscar produto').fill('farinha');
  await vendo.locator('label', { hasText: 'Farinha de Trigo' }).locator('input').check();
  await vendo.getByRole('button', { name: 'Salvar 1 produto(s)' }).click();
  ok(await forn.getByText('1 produto(s) a mais.').count() === 1, 'Produto a mais salvo');
  ok(await p.evaluate(() => CicluzComprasDados.dados.catalogo.some((v) => v.fornecedorId === 'f-ambev' && v.produtoId === 'p-farinha' && v.status === 'aprovado' && v.origem === 'fornecedor')), 'Vínculo do fornecedor nasce aprovado');
  await forn.close();

  // Comprador decide na cotação
  await p.evaluate(() => CicluzCompras.abrir('cotacao'));
  await p.locator('#compras-cotacao tbody tr', { hasText: 'Guaraná' }).click();
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Aceitar');
  await p.locator('dialog.compras-dialog[open]').last().locator('.people-save-control').click();
  const pedidos = await p.evaluate(() => CicluzComprasDados.dados.pedidos.map((x) => x.itens.length));
  ok(pedidos.length === 1 && pedidos[0] === 2, 'Pedido "Comprado" com 2 itens');

  // Recebimento → estoque
  const saldoAntes = await p.evaluate(() => CicluzComprasDados.produto('p-coca2l').saldo);
  await p.evaluate(() => CicluzCompras.abrir('pedidos'));
  await p.locator('#compras-pedidos .compras-linha').first().click();
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Conferir recebimento');
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Recebi tudo');
  await p.locator('dialog.compras-dialog[open]').last().locator('.people-save-control').click();
  const saldoDepois = await p.evaluate(() => CicluzComprasDados.produto('p-coca2l').saldo);
  ok(saldoDepois === saldoAntes + 25, 'Recebimento somou ao estoque a quantidade ajustada pelo fornecedor (25)');
  ok(await p.evaluate(() => CicluzComprasDados.dados.movimentos.length) === 2, 'Extrato com uma entrada por item');
  await p.close();
}

/* ---------- 2) Matriz de layout ---------- */
const telas = ['agendamento', 'solicitacao', 'cotacao', 'pedidos', 'conferencias', 'estoque', 'cadastro', 'unidades', 'fornecedores', 'produtos'];
let combinacoes = 0;
for (const largura of [320, 390, 1024]) {
  const p = await abrirPagina(largura);
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    for (const t of telas) {
      await p.evaluate((nome) => CicluzCompras.abrir(nome), t);
      await p.waitForTimeout(80);
      const m = await p.evaluate(() => {
        const v = document.querySelector('.view.show');
        const visivel = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
        return {
          id: v && v.id,
          lateral: document.documentElement.scrollWidth - innerWidth,
          cabecalho: visivel(v && v.querySelector('.head')),
          rodapes: v ? [...v.querySelectorAll('.people-bottom-header')].filter(visivel).length : 0,
        };
      });
      const rotulo = t + ' ' + largura + 'px ' + (escuro ? 'escuro' : 'claro');
      ok(m.id === 'compras-' + t, 'Tela aberta: ' + rotulo);
      ok(m.lateral <= 0, 'Sem rolagem lateral: ' + rotulo + ' (' + m.lateral + 'px)');
      ok(m.cabecalho, 'Cabeçalho visível: ' + rotulo);
      ok(m.rodapes === 1, 'Um rodapé: ' + rotulo + ' (' + m.rodapes + ')');
      combinacoes++;
    }
  }
  await p.close();
}

await navegador.close();
servidor.close();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações de Compras no navegador passaram (fluxo + ' + combinacoes + ' combinações de tela × largura × tema)');
