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
  // Entrada pelo menu: Mercadorias → Compras → cards
  await p.evaluate(() => openSection(sections[3][0], 'Compras', 'compras', '#22c55e'));
  const cards = await p.locator('#sector-content .section-card b').allTextContents();
  ok(cards.includes('Cotação por fornecedor') && !cards.includes('Unidades de medida') && !cards.includes('Estoques de produtos') && !cards.includes('Agendamento de pedidos') && cards.length === 5, 'Cards de Compras no setor Mercadorias → Compras (5; Unidades de medida fica em Cadastros Geral, o estoque em Estoques e a agenda de pedidos em Agenda)');

  // "+" fixo do menu rápido aciona a criação da tela (header-add-circle)
  for (const [tela, titulo] of [['produtos', 'Novo produto'], ['fornecedores', 'Novo fornecedor'], ['cotacao', 'Pedido urgente'], ['conferencias', 'Agendar conferência']]) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    await p.locator('.view.show .people-add-control').click();
    ok(await p.locator('dialog.compras-dialog[open]', { hasText: titulo }).count() === 1, '"+" abre ' + titulo);
    await p.locator('dialog.compras-dialog[open] .people-close-control').click();
  }
  for (const [tela, rotulo] of [['fornecedores', 'Novo fornecedor'], ['agendamento', 'Novo agendamento'], ['cotacao', 'Pedido urgente'], ['conferencias', 'Agendar conferência'], ['unidades', 'Nova unidade']]) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    ok(await p.locator('#compras-' + tela + ' .content button', { hasText: rotulo }).count() === 0, 'Sem botão repetido do "+" em ' + tela);
  }
  // Fornecedor com CNPJ digitado como uma pessoa (o validador de CPF do S2 não pode cortar em 11 dígitos)
  await p.evaluate(() => CicluzCompras.abrir('fornecedores'));
  await p.locator('.view.show .people-add-control').click();
  const df = p.locator('dialog.compras-dialog[open]').last();
  await df.getByLabel('Nome *', { exact: true }).fill('Fornecedor CNPJ Teste');
  await df.getByLabel('Documento', { exact: true }).pressSequentially('12345678000190');
  ok((await df.getByLabel('Documento', { exact: true }).inputValue()) === '12.345.678/0001-90', 'Documento aceita CNPJ com máscara');
  await df.locator('.people-save-control').click();
  await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'));
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.some((f) => f.documento === '12.345.678/0001-90')), 'Fornecedor com CNPJ salvo');
  await p.evaluate(() => CicluzCompras.abrir('estoque'));
  ok(await p.locator('#compras-estoque button', { hasText: 'Extrato completo' }).isVisible(), 'Extrato completo visível no Estoque');
  for (const tela of ['cadastro', 'pedidos']) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    const altura = (await p.locator('#compras-' + tela + ' .compras-abas').boundingBox()).height;
    ok(altura < 60, 'Abas com a altura dos chips em ' + tela + ' (' + Math.round(altura) + 'px)');
  }
  await p.evaluate(() => openSection(sections[3][0], 'Compras', 'compras', '#22c55e'));

  // Agendamento pela interface
  await clicarTexto(p, '#sector-content .section-card', 'Agendamento de pedidos');
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
