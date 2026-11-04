// Regras de Compras alinhadas ao S1, exercitadas na página real (Playwright + Chromium, isolado, sem dados reais).
// Rodar: node tests/compras-regras-navegador.mjs
// 1) Teto do estoque máximo: saldo + pedido não passa do máximo (S1: ESTOQUE_MAXIMO_ULTRAPASSADO).
// 2) Contraproposta aceita passa pela mesma regra da compra automática (referência, teto e margem).
// 3) Pendentes: "Pedido urgente com os pendentes" e "Encerrar solicitação" só com a cotação fechada;
//    fechada, a solicitação vira "comprada" ou "parcialmente comprada" (inclusive sem nada comprado).
// 4) Conferência com controle (só S2): cega, recontagem do que não bateu, motivo, histórico,
//    aprovação por outra pessoa e ajuste do estoque com movimento no extrato.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

const contexto = await navegador.newContext({ viewport: { width: 1024, height: 844 } });
await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
const p = await contexto.newPage();
p.on('pageerror', (e) => erros.push(e.message));
await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.CicluzCompras && window.CicluzComprasServico);
await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); });

const dialogo = () => p.locator('dialog.compras-dialog[open]').last();
const botoes = async () => dialogo().locator('button').allTextContents();
async function abrirAcoes(rodadaId) {
  await p.evaluate(() => CicluzCompras.abrir('cotacao'));
  await p.locator('#compras-cotacao .compras-secao-rodape select').selectOption(rodadaId);
  await dialogo().waitFor();
}
async function fecharDialogos() {
  while (await p.locator('dialog.compras-dialog[open]').count()) await p.keyboard.press('Escape');
}

/* ---------- 1) Teto do estoque máximo (Coca: saldo 18, máximo 96) ---------- */
{
  const r = await p.evaluate(() => {
    const SV = CicluzComprasServico;
    return {
      acima: SV.pedidoUrgente({ fornecedorId: 'f-ambev', itens: [{ produtoId: 'p-coca2l', quantidade: 79 }] }),
      noLimite: SV.pedidoUrgente({ fornecedorId: 'f-ambev', itens: [{ produtoId: 'p-coca2l', quantidade: 78 }] }),
      semMaximo: SV.pedidoUrgente({ fornecedorId: 'f-ambev', itens: [{ produtoId: 'p-agua', quantidade: 9999 }] }),
    };
  });
  ok(/passa do estoque máximo configurado/.test(r.acima.erro || ''), 'Pedido urgente acima do máximo é recusado');
  ok(/REFRIGERANTE COLA 2 LT: pedido de 79 com saldo 18 passa do máximo 96/.test(r.acima.erro || ''), 'A mensagem diz o produto, o pedido, o saldo e o máximo');
  ok(r.noLimite.ok === true, 'Saldo + pedido igual ao máximo passa');
  ok(r.semMaximo.ok === true || !/estoque máximo/.test(r.semMaximo.erro || ''), 'Produto sem máximo não tem teto');
}

/* ---------- 2) Contraproposta e 3) pendentes com a cotação aberta x fechada ---------- */
{
  const r = await p.evaluate(() => {
    const SV = CicluzComprasServico, S = CicluzComprasDados;
    const u = SV.pedidoUrgente({ fornecedorId: 'f-ambev', itens: [
      { produtoId: 'p-coca2l', quantidade: 10 }, { produtoId: 'p-guarana2l', quantidade: 10 }, { produtoId: 'p-cerveja', quantidade: 10 },
    ] });
    const cv = () => S.dados.convites.find((c) => c.rodadaId === u.rodadaId);
    // Coca 8,00 ≤ base 8,10 → comprada sozinha; Guaraná 9,00 e Cerveja 9,00 acima da base → comprador decide.
    SV.responderConvite(cv().token, { itens: { 'p-coca2l': { valor: '8,00' }, 'p-guarana2l': { valor: '9,00' }, 'p-cerveja': { valor: '9,00' } } }, true);
    // Contraproposta abaixo da base (Guaraná base 7,00): o aceite compra sozinho.
    SV.contrapropor(cv().id, 'p-guarana2l', '6,50');
    const dentro = SV.aceitarContraproposta(cv().token, 'p-guarana2l');
    // Contraproposta ainda acima da base (Cerveja base 3,15): o aceite NÃO compra; volta para o comprador.
    SV.contrapropor(cv().id, 'p-cerveja', '5,00');
    const fora = SV.aceitarContraproposta(cv().token, 'p-cerveja');
    const sol = S.dados.solicitacoes.find((s) => s.id === S.dados.rodadas.find((x) => x.id === u.rodadaId).solicitacaoId);
    const itemGuarana = S.dados.pedidos.filter((x) => x.rodadaId === u.rodadaId).flatMap((x) => x.itens).find((i) => i.produtoId === 'p-guarana2l');
    return {
      rodadaId: u.rodadaId, solicitacaoId: sol.id, dentro, fora,
      estadoCerveja: cv().estados['p-cerveja'], cpCerveja: cv().contrapropostas['p-cerveja'].status,
      guarana: itemGuarana && { custo: itemGuarana.custo, modo: itemGuarana.modo },
      statusAberta: sol.status,
      encerrarAberta: SV.encerrarSolicitacao(sol.id),
    };
  });
  ok(r.dentro.ok && r.dentro.comprado === true, 'Contraproposta dentro da base: o aceite compra');
  ok(r.guarana && r.guarana.custo === 6.5 && r.guarana.modo === 'automatica', 'Compra pelo valor da contraproposta, pela regra automática');
  ok(r.fora.ok && r.fora.comprado === false, 'Contraproposta acima da base: o aceite não compra sozinho');
  ok(r.estadoCerveja.situacao === 'com_aumento' && r.estadoCerveja.motivo === 'acima_da_base', 'Cerveja volta para o comprador como acima da base');
  ok(r.cpCerveja === 'aceita', 'A contraproposta fica registrada como aceita');
  ok(r.statusAberta === 'parcialmente_comprada', 'Com 2 de 3 comprados, a solicitação está parcialmente comprada');
  ok(/parcialmente comprada, com a cotação já fechada/.test(r.encerrarAberta.erro || ''), 'Não encerra a solicitação com a cotação aberta');

  // Tela com a cotação aberta: só "Encerrar cotação agora" e a nota explicando por quê.
  await abrirAcoes(r.rodadaId);
  let b = await botoes();
  ok(b.includes('Encerrar cotação agora'), 'Aberta: mostra "Encerrar cotação agora"');
  ok(!b.includes('Pedido urgente com os pendentes') && !b.includes('Encerrar solicitação'), 'Aberta: esconde o urgente com os pendentes e o encerrar solicitação');
  ok(await dialogo().getByText('ficam disponíveis depois que ela fechar').count() === 1, 'Aberta: nota explica quando as ações aparecem');

  // Encerra a cotação pela tela.
  await dialogo().getByRole('button', { name: 'Encerrar cotação agora' }).click();
  await dialogo().locator('.people-save-control').click(); // ✓ do rodapé confirma
  await fecharDialogos();
  ok(await p.evaluate((id) => CicluzComprasDados.dados.solicitacoes.find((s) => s.id === id).status, r.solicitacaoId) === 'parcialmente_comprada', 'Fechada com pendente: parcialmente comprada');

  // Tela com a cotação fechada: as duas ações aparecem.
  await abrirAcoes(r.rodadaId);
  b = await botoes();
  ok(b.includes('Pedido urgente com os pendentes') && b.includes('Encerrar solicitação'), 'Fechada: mostra o urgente com os pendentes e o encerrar solicitação');
  ok(!b.includes('Encerrar cotação agora'), 'Fechada: não mostra "Encerrar cotação agora"');

  // Encerrar a solicitação pela tela.
  await dialogo().getByRole('button', { name: 'Encerrar solicitação' }).click();
  await dialogo().locator('.people-save-control').click(); // ✓ do rodapé confirma
  await fecharDialogos();
  ok(await p.evaluate((id) => CicluzComprasDados.dados.solicitacoes.find((s) => s.id === id).status, r.solicitacaoId) === 'encerrada', 'Solicitação encerrada pela tela');
  ok(/parcialmente comprada/.test(await p.evaluate((id) => CicluzComprasServico.encerrarSolicitacao(id).erro || '', r.solicitacaoId)), 'Encerrada não encerra de novo');

  await abrirAcoes(r.rodadaId);
  b = await botoes();
  ok(!b.includes('Pedido urgente com os pendentes') && !b.includes('Encerrar solicitação'), 'Encerrada: as ações somem');
  await fecharDialogos();
}

/* ---------- 3b) Fechada sem nada comprado também fica "parcialmente comprada" (S1) ---------- */
{
  const r = await p.evaluate(() => {
    const SV = CicluzComprasServico, S = CicluzComprasDados;
    const u = SV.pedidoUrgente({ fornecedorId: 'f-moinho', itens: [{ produtoId: 'p-farinha', quantidade: 10 }] });
    SV.encerrarRodada(u.rodadaId);
    const sol = S.dados.solicitacoes.find((s) => s.id === S.dados.rodadas.find((x) => x.id === u.rodadaId).solicitacaoId);
    return { rodadaId: u.rodadaId, status: sol.status };
  });
  ok(r.status === 'parcialmente_comprada', 'Fechada sem compra: parcialmente comprada');
  await abrirAcoes(r.rodadaId);
  await dialogo().getByRole('button', { name: 'Pedido urgente com os pendentes' }).click();
  const urgente = dialogo();
  ok(await urgente.getByText('Fora da agenda, para um fornecedor só.').count() === 1, 'O urgente com os pendentes abre o pedido urgente');
  ok(await urgente.locator('select').nth(1).inputValue() === 'p-farinha', 'O pendente vem preenchido no pedido urgente');
  await fecharDialogos();
}

/* ---------- 4) Conferência com controle (decisão do Zé, 04/11/2026, só S2) ---------- */
{
  const gerar = () => p.evaluate(() => {
    const SV = CicluzComprasServico, S = CicluzComprasDados;
    const r = SV.salvarAgendaConferencia({ filtro: { grupoId: 'g3', subgrupoId: 'g3s0', area: '', setor: '', localVenda: '', ranking: [] }, responsavelId: 'u-ana', inicio: CicluzComprasDominio.isoData(new Date(Date.now() + 864e5)), hora: '07:00', regra: { tipo: 'nunca' }, termino: { tipo: 'nunca' }, orientacao: '' });
    if (r.erro) return r;
    const a = S.dados.conferenciaAgendas[S.dados.conferenciaAgendas.length - 1];
    SV.processarConferencias({ agendaId: a.id, previsto: SV.proximasConferencias(a)[0].previsto });
    const c = S.dados.conferencias[S.dados.conferencias.length - 1];
    return { id: c.id, itens: c.itens.map((i) => ({ produtoId: i.produtoId, saldo: i.saldoSistema })) };
  });
  const g = await gerar();
  ok(!g.erro && g.itens.length >= 2, 'A conferência nasce com os produtos do recorte');
  const coca = g.itens.find((i) => i.produtoId === 'p-coca2l');
  ok(coca && coca.saldo === 18, 'Saldo congelado da Coca: 18');

  // A) Cega: a contagem não mostra a coluna Sistema; o ✓ conclui (e não o "guardar").
  await p.evaluate(() => CicluzCompras.abrir('conferencias'));
  await p.locator('#compras-conferencias .compras-linha').first().click();
  await dialogo().waitFor();
  const cab = await dialogo().locator('th').allTextContents();
  ok(!cab.some((t) => /sistema/i.test(t)), 'Contagem cega: sem a coluna Sistema');
  ok(await dialogo().getByText('18 UN').count() === 0, 'Contagem cega: o saldo não aparece');
  ok((await botoes()).every((t) => !/^Salvar \(parcial\)/.test(t)), 'Não há botão "Salvar (parcial)" disputando o ✓');
  await dialogo().getByLabel('Contado de REFRIGERANTE COLA 2 LT', { exact: true }).fill('15');
  await dialogo().getByRole('button', { name: 'Guardar e continuar depois' }).click();
  ok(await p.evaluate((id) => CicluzComprasDados.dados.conferencias.find((c) => c.id === id).status, g.id) === 'agendada', 'Guardar não conclui');

  // D) Histórico: cada número digitado fica guardado (15 e depois 16).
  const r1 = await p.evaluate(({ id, itens }) => {
    const SV = CicluzComprasServico;
    const v = {}; itens.forEach((i) => { v[i.produtoId] = i.saldo; });
    v['p-coca2l'] = 16;
    const negativo = SV.salvarContagem(id, { 'p-coca2l': -1 }, false);
    const r = SV.salvarContagem(id, v, true);
    const c = CicluzComprasDados.dados.conferencias.find((x) => x.id === id);
    const it = c.itens.find((i) => i.produtoId === 'p-coca2l');
    return { negativo, r, status: c.status, historico: it.historico.map((h) => h.valor), recontar: c.itens.filter((i) => i.recontar).map((i) => i.produtoId) };
  }, g);
  ok(/inválida/.test(r1.negativo.erro || ''), 'Quantidade negativa é recusada');
  ok(JSON.stringify(r1.historico) === '[15,16]', 'Histórico guarda os dois números digitados');
  // C) Só o que não bateu vai para recontagem.
  ok(r1.r.resultado === 'recontagem' && r1.status === 'recontagem', 'Diferença manda para recontagem');
  ok(JSON.stringify(r1.recontar) === '["p-coca2l"]', 'Só a Coca (que não bateu) é recontada');

  // Recontagem cega: não mostra o sistema nem a 1ª contagem; B) motivo obrigatório se continuar diferente.
  await p.evaluate(() => CicluzCompras.abrir('conferencias'));
  await p.locator('#compras-conferencias .compras-linha').first().click();
  await dialogo().waitFor();
  ok(await dialogo().locator('h2').textContent() === 'Recontagem de ' + await p.evaluate((id) => CicluzComprasDominio.dataLonga(CicluzComprasDados.dados.conferencias.find((c) => c.id === id).data), g.id), 'Abre a recontagem');
  ok(await dialogo().locator('tbody tr').count() === 1, 'A recontagem lista só o que não bateu');
  ok(await dialogo().locator('input[inputmode=decimal]').first().inputValue() === '', 'A recontagem não traz a 1ª contagem');
  await dialogo().getByLabel('Recontagem de REFRIGERANTE COLA 2 LT', { exact: true }).fill('16');
  await dialogo().locator('.people-save-control').click();
  ok(/Explique o motivo de: REFRIGERANTE COLA 2 LT/.test(await dialogo().locator('.profiles-error').textContent()), 'Sem motivo, a recontagem diferente não conclui');
  await dialogo().getByLabel('Motivo da diferença de REFRIGERANTE COLA 2 LT', { exact: true }).fill('Duas garrafas quebradas');
  await dialogo().locator('.people-save-control').click();
  await p.waitForFunction((id) => CicluzComprasDados.dados.conferencias.find((c) => c.id === id).status === 'concluida', g.id);
  ok(true, 'Com o motivo, a conferência conclui e espera aprovação');

  // E) Resumo em R$ e aprovação por outra pessoa.
  const r2 = await p.evaluate((id) => {
    const SV = CicluzComprasServico, S = CicluzComprasDados;
    const c = S.dados.conferencias.find((x) => x.id === id);
    const res = SV.resumoConferencia(c);
    const propria = SV.aprovarConferencia(id, 'u-ana');
    const semQuem = SV.aprovarConferencia(id, '');
    const antes = S.produto('p-coca2l').saldo;
    return { res: { faltas: res.faltas, liquido: res.liquido, n: res.divergentes.length }, propria, semQuem, antes };
  }, g.id);
  ok(r2.res.n === 1 && r2.res.faltas === -16.4 && r2.res.liquido === -16.4, 'Falta de 2 Cocas = −R$ 16,40 (2 × 49,20 ÷ 6)');
  ok(/Quem contou não pode aprovar/.test(r2.propria.erro || ''), 'Quem contou não aprova a própria conferência');
  ok(/Escolha quem aprova/.test(r2.semQuem.erro || ''), 'Aprovar exige escolher quem aprova');
  ok(r2.antes === 18, 'Antes da aprovação o estoque não muda');

  await p.evaluate(() => CicluzCompras.abrir('conferencias'));
  await p.locator('#compras-conferencias .compras-chip', { hasText: 'Para aprovar' }).click();
  await p.locator('#compras-conferencias .compras-linha').first().click();
  await dialogo().waitFor();
  ok((await dialogo().locator('th').allTextContents()).some((t) => /sistema/i.test(t)), 'Concluída: agora mostra o sistema');
  ok(await dialogo().getByText('Duas garrafas quebradas').count() >= 1, 'Concluída: mostra o motivo');
  ok(await dialogo().locator('select option[value=u-ana]').count() === 0, 'Quem contou não aparece em "Quem aprova"');
  await dialogo().locator('select').selectOption('u-rodrigo');
  await dialogo().locator('.people-save-control').click();
  await p.waitForFunction((id) => CicluzComprasDados.dados.conferencias.find((c) => c.id === id).status === 'aprovada', g.id);
  const r3 = await p.evaluate((id) => {
    const S = CicluzComprasDados;
    const mov = S.dados.movimentos.filter((m) => m.conferenciaId === id);
    return { saldo: S.produto('p-coca2l').saldo, mov: mov.map((m) => [m.produtoId, m.entrada, m.saldoAnterior, m.saldoPosterior, m.aprovadorId, m.motivo]), de2: CicluzComprasServico.aprovarConferencia(id, 'u-rodrigo') };
  }, g.id);
  ok(r3.saldo === 16, 'Aprovada: estoque da Coca ajustado de 18 para 16');
  ok(JSON.stringify(r3.mov) === JSON.stringify([['p-coca2l', -2, 18, 16, 'u-rodrigo', 'Duas garrafas quebradas']]), 'Um movimento de ajuste só para o que divergiu, com aprovador e motivo');
  ok(/concluída e ainda não aprovada/.test(r3.de2.erro || ''), 'Não aprova duas vezes');

  // Recusa: estoque não muda e o motivo é obrigatório.
  const g2 = await gerar();
  const r4 = await p.evaluate(({ id, itens }) => {
    const SV = CicluzComprasServico, S = CicluzComprasDados;
    const v = {}; itens.forEach((i) => { v[i.produtoId] = i.saldo + 1; });
    SV.salvarContagem(id, v, true);
    SV.salvarContagem(id, v, true, Object.fromEntries(itens.map((i) => [i.produtoId, 'Sobra'])));
    const antes = itens.map((i) => S.produto(i.produtoId).saldo);
    const semMotivo = SV.recusarConferencia(id, 'u-jose', ' ');
    const r = SV.recusarConferencia(id, 'u-jose', 'Contagem feita fora do horário');
    return { semMotivo, r, status: S.dados.conferencias.find((c) => c.id === id).status, igual: JSON.stringify(antes) === JSON.stringify(itens.map((i) => S.produto(i.produtoId).saldo)), movs: S.dados.movimentos.filter((m) => m.conferenciaId === id).length };
  }, g2);
  ok(/Explique por que/.test(r4.semMotivo.erro || ''), 'Recusar exige motivo');
  ok(r4.r.ok && r4.status === 'recusada' && r4.igual && r4.movs === 0, 'Recusada: o estoque não muda e não há movimento');
  await fecharDialogos();
}

/* ---------- 5) Só grava quando muda (cada gravação vira versão nova no banco) ---------- */
{
  const r = await p.evaluate(() => {
    const original = Storage.prototype.setItem;
    let gravacoes = 0;
    Storage.prototype.setItem = function (k, v) { if (k === 'cicluz-compras-v1') gravacoes++; return original.call(this, k, v); };
    try {
      const SV = CicluzComprasServico;
      SV.processarAgendas(); SV.processarConferencias(); SV.fecharVencidas();
      ['agendamento', 'cotacao', 'conferencias', 'pedidos', 'estoque'].forEach((t) => CicluzCompras.abrir(t));
      const semMudanca = gravacoes;
      CicluzComprasDados.transacao((d) => { d.fornecedores[0].categoria = 'Teste de gravação'; });
      return { semMudanca, comMudanca: gravacoes - semMudanca };
    } finally { Storage.prototype.setItem = original; }
  });
  ok(r.semMudanca === 0, 'Abrir as telas e rodar os agendadores sem criar nada não grava (' + r.semMudanca + ')');
  ok(r.comMudanca === 1, 'Uma mudança de verdade grava uma vez');
}

await navegador.close();
servidor.close();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações das regras de Compras no navegador passaram');
