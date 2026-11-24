// Verificação de navegador da Produção e do Patrimônio (Playwright + Chromium, isolado, dados fictícios).
// Rodar: node tests/producao-telas.mjs (faz parte de npm run test:telas)
// 1) Fluxo pela interface: menu → Patrimônio (bens com capacidade) → produto da produção (assadeira,
//    meia, múltiplos) → ficha técnica (etapas, ingredientes, tempos) → agendamento → pedido →
//    ordens (capacidade dobra o tempo) → mapa (etapas em sequência) → abastecimento → fechamento.
// 2) Conferência em 2 etapas e proteções (bem em uso, pessoa diferente na loja).
// 3) Matriz de layout: as 7 telas e o editor de ficha em 320, 390 e 1024 px, claro e escuro.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';
import { escolherNaArvore } from './ajuda-arvore.mjs';

const { servidor, url } = await iniciar();
// Microfone de mentira do Chromium, para testar a observação em áudio do bem sem aparelho nem permissão.
const navegador = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

async function abrirPagina(largura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 844 } });
  await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await pagina.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await pagina.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.CicluzProducao && window.CicluzProducaoServico && window.CicluzComprasPedido);
  // Contas fictícias da empresa (sem servidor não há Pessoas com Acesso; as pessoas de teste saíram, P-45).
  await pagina.evaluate(() => { CicluzAgendaDados.pessoas = () => [{ id: 'conta-jose', nome: 'José (teste)' }, { id: 'conta-rodrigo', nome: 'Rodrigo (teste)' }, { id: 'conta-ana', nome: 'Ana (teste)' }]; });
  await pagina.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); });
  return pagina;
}
const dialogo = (p) => p.locator('dialog.compras-dialog[open]').last();
const salvar = (p) => dialogo(p).locator('.people-save-control').click();
const fechado = (p) => p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'), null, { timeout: 8000 }).catch(async (e) => {
  console.log('ABERTO', await p.evaluate(() => { const d = document.querySelector('dialog.compras-dialog[open]'); return d && (d.querySelector('h2').textContent + ' | ' + d.querySelector('.profiles-error').textContent); }));
  throw e;
});
// O cadastro do patrimônio tem duas áreas de erro (a da etapa e a do diálogo): junta o que estiver escrito.
const erroDialogo = async (p) => (await dialogo(p).locator('.profiles-error').allTextContents()).join(' ').trim();
const prod = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-producao-v1') || 'null'));
const mais = (p) => p.locator('.view.show .people-add-control').click();
const saldoDe = (p, id) => p.evaluate((i) => CicluzComprasDados.produto(i).saldo, id);

/** Produto "PÃO DE SAL" de fabricação própria no cadastro do Compras (fictício). */
const criarPao = (p) => p.evaluate(() => CicluzComprasDados.transacao((d) => {
  d.produtos.push(CicluzComprasDados.normalizarProduto({ id: 'p-pao-teste', descricao: 'PÃO DE SAL', nomeCatalogo: 'PÃO DE SAL', tipo: 'revenda', grupoId: 'g10', subgrupoId: 'g10s0', unidade: 'UN', status: 'ativo', liberadoCompra: false, saldo: 0 }));
}));

/* ---------- 1) Fluxo pela interface ---------- */
{
  const p = await abrirPagina(1024);
  await criarPao(p);
  // Lugar de cada tela pela lógica do vídeo do Rodrigo (06/11), igual ao Compras
  const cardsDe = async (sub) => { await p.evaluate((x) => menuBack(3, x)(), sub); return (await p.locator('#sector-content .section-card b').allTextContents()).join('|'); };
  let c = await cardsDe('Lançamentos Produção');
  ok(c === 'MER - Agenda de Produção|MER - Pedidos de Produção|MER - Mapa de Produção|MER - Abastecimento', 'Lançamentos Produção: agenda → pedidos → mapa → abastecimento: ' + c);
  c = await cardsDe('Relatórios');
  ok(c === 'MER - Mercadorias|MER - Pedidos|MER - Produção', 'Relatórios de Mercadorias com MER - Produção: ' + c);
  c = await cardsDe('Cadastros Geral Produção');
  ok(c === 'MER - Produtos da Produção|MER - Ficha Técnica de Produtos|MER - Parâmetros de Custo|MER - Ingredientes Ficha Técnica / Tabela TACO', 'Cadastros Geral Produção: ' + c);
  for (const [sub, titulo, id] of [['Lançamentos Produção', 'MER - Agenda de Produção', 'agendamento'], ['Lançamentos Produção', 'MER - Pedidos de Produção', 'pedidos'], ['Lançamentos Produção', 'MER - Mapa de Produção', 'mapa'], ['Lançamentos Produção', 'MER - Abastecimento', 'abastecimento'], ['Relatórios', 'MER - Produção', 'relatorios'], ['Cadastros Geral Produção', 'MER - Produtos da Produção', 'produtos'], ['Cadastros Geral Produção', 'MER - Ficha Técnica de Produtos', 'fichas'], ['Cadastros Geral Produção', 'MER - Parâmetros de Custo', 'custos']]) {
    await p.evaluate((x) => menuBack(3, x)(), sub);
    await p.locator('#sector-content .section-card', { hasText: titulo }).click();
    const tela = p.locator('#producao-' + id);
    ok(await p.locator('#producao-' + id + '.show').count() === 1 && (await tela.locator('.head h2').first().textContent()).trim() === titulo && (await tela.locator('.head p').first().textContent()).includes('Saídas · Mercadorias / ' + sub + ' / ' + titulo), sub + ' → ' + titulo + ': abre a tela com o mesmo nome e a trilha certa');
  }
  // Os agendamentos saíram do menu Agenda (Zé, 23/11/2026); o menu tem só Agenda e Configurações da Agenda (P-45, 24/11/2026).
  const agenda = await p.evaluate(() => [...document.querySelectorAll('details[data-menu-name="Agenda/Atividades"] .children button')].map((b) => b.textContent.trim()).join('|'));
  ok(agenda === 'Agenda|Configurações da Agenda', 'Menu Agenda sem os agendamentos de compras e de produção: ' + agenda);
  ok(await p.locator('#asset-view').count() === 0, 'A prévia antiga de Patrimônios (que não salvava) saiu');

  // Sem produto ligado, o "+" do agendamento explica o caminho e leva ao cadastro
  await p.evaluate(() => CicluzProducao.abrir('agendamento'));
  await mais(p);
  ok((await dialogo(p).locator('h2').textContent()) === 'Nenhum produto ligado à produção', 'Agendamento sem produto explica o que falta');
  await salvar(p); await fechado(p);
  ok(await p.locator('#producao-produtos.show').count() === 1, '...e leva a MER - Produtos da Produção');

  // Patrimônio: pelo card de Retiradas → Cadastros Geral
  await p.evaluate(() => menuBack(4, 'Cadastros Geral')());
  await p.locator('#sector-content .section-card', { hasText: 'RET - Patrimônios' }).click();
  ok(await p.locator('#producao-patrimonio.show').count() === 1, 'O card RET - Patrimônios abre o cadastro novo');
  // Entrada: abre na lista de bens, sem diálogo; a bolinha "+" do cabeçalho da lista abre o cadastro
  ok(await p.locator('dialog[open]').count() === 0 && await p.locator('#producao-patrimonio .compras-filtros').count() === 1, 'RET - Patrimônios abre na lista de bens, sem abrir o cadastro sozinho');
  await p.locator('#producao-patrimonio .compras-secao-cab button[aria-label="Cadastrar patrimônio"]').click();
  let d = dialogo(p);
  ok((await d.locator('h2').textContent()) === 'Novo patrimônio', 'A bolinha + do cabeçalho da lista abre o cadastro de um bem novo');
  ok((await d.locator('.stepper-label').allTextContents()).length === 6, 'O cadastro do bem tem seis etapas numeradas');
  // Navega pelas etapas pelos botões Avançar/Voltar do próprio formulário
  const avancar = async () => { await d.locator('.compras-etapas-nav button.form-next-action').click(); };
  await d.getByLabel('Nome simplificado *', { exact: true }).fill('Masseira 40 kg');
  await d.getByLabel('Categoria *', { exact: true }).selectOption('MAC');
  await d.locator('.account-status:has-text("utilizado na produção") .account-status-switch').click();
  await d.getByLabel('Quantidade da capacidade', { exact: true }).fill('40');
  await d.getByLabel('Unidade de medida da capacidade', { exact: true }).selectOption('KG');
  await d.locator('.account-status:has-text("Informar especificação técnica?") .account-status-switch').click();
  // Energia e consumo ficam na especificação técnica da 1ª etapa (reunião de 17/11/2026).
  await d.getByLabel('Tipo de Energia', { exact: true }).selectOption('gas');
  await d.getByLabel('Consumo de gás por hora', { exact: true }).fill('3,5');
  await avancar();
  ok((await erroDialogo(p)).includes('unidade do consumo de gás'), 'Gás exige a unidade do consumo (sem presumir)');
  await d.getByLabel('Unidade do consumo de gás', { exact: true }).selectOption('kg/h');
  await salvar(p); await fechado(p);
  await mais(p);
  d = dialogo(p);
  await d.getByLabel('Nome simplificado *', { exact: true }).fill('Assadeira 58x68 (6 tiras)');
  await d.getByLabel('Categoria *', { exact: true }).selectOption('UTS');
  await avancar(); await avancar(); await avancar();
  await d.getByLabel('Largura (cm)', { exact: true }).fill('58');
  await d.getByLabel('Comprimento (cm)', { exact: true }).fill('68');
  await salvar(p); await fechado(p);
  const bens = await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-patrimonio-v1')).bens);
  ok(bens.length === 2 && bens[0].nome === 'MASSEIRA 40 KG' && bens[0].capacidade.valor === 40 && bens[0].consumoHora === 3.5, 'Bem salvo com capacidade e consumo (nome em maiúsculas)');
  ok(bens[0].ativo === true && bens[0].situacaoPatrimonial === 'ativo', 'Bem novo fica ativo (a Produção só escolhe bens ativos)');
  ok(await p.locator('#producao-patrimonio .compras-linha.grade-patrimonio:not(.compras-linha-cabecalho)').count() === 2, 'Lista mostra os 2 bens');
  const masseiraId = bens[0].id;
  const assadeiraId = bens[1].id;

  // Manutenção do bem: peças com data de substituição, manutenção periódica e áudio
  const abrirEdicao = async (nome) => {
    await p.locator('#producao-patrimonio .compras-linha', { hasText: nome }).locator('.c-nome').click();
    await p.locator('dialog.patrimonio-ficha[open] .patrimonio-ficha-acoes button', { hasText: 'Editar' }).click();
    return dialogo(p);
  };
  d = await abrirEdicao('MASSEIRA');
  ok(await d.locator('.compras-etapa').first().locator('.compras-campo').first().locator('.compras-rotulo').textContent() === 'Categoria *', 'Categoria é o primeiro campo do bem');
  ok((await d.locator('.compras-etapa:visible .compras-fieldset legend').allTextContents()).join('|') === 'Identificação|Classificação|Quantidade|Especificação técnica|Identificação técnica|Energia e consumo|Dimensões e características físicas|Outras informações técnicas|Ficha Técnica do Equipamento|Produção', 'Blocos da primeira etapa do bem (especificação técnica na etapa 1, reunião de 17/11/2026)');
  await d.locator('.stepper-item:nth-child(4) .stepper-node').click();
  const abrirPeca = async () => { await d.locator('button', { hasText: 'Adicionar peça' }).click(); return p.locator('dialog[open]:has(h2:has-text("Nova peça"))'); };
  let pc = await abrirPeca();
  await pc.getByLabel('Peça *', { exact: true }).fill('');
  await pc.locator('input.date-mask-input[aria-label="Substituir em"]').fill('10/01/27');
  await p.locator('button.people-save-control[aria-label="Salvar peça"]').click();
  ok((await pc.locator('.profiles-error').allTextContents()).join(' ').includes('nome da peça'), 'Peça sem nome é recusada');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  pc = await abrirPeca();
  await pc.getByLabel('Peça *', { exact: true }).fill('Correia');
  // Última troca + intervalo em meses calculam a próxima (e travam o campo); sem eles, a data é digitada
  await pc.locator('input.date-mask-input[aria-label="Última troca"]').fill('20/06/26');
  await pc.getByLabel('A cada (meses)', { exact: true }).fill('6');
  ok(await pc.locator('input.date-mask-input[aria-label="Substituir em"]').inputValue() === '20/12/26' && await pc.locator('input.date-mask-input[aria-label="Substituir em"]').evaluate((i) => i.readOnly), 'Próxima substituição = última troca + 6 meses, calculada');
  await p.locator('button.people-save-control[aria-label="Salvar peça"]').click();
  await p.waitForTimeout(300);
  ok(await d.locator('.patrimonio-tabela-box tbody tr').count() === 1, 'A peça entra na tabela de componentes');
  await d.locator('.stepper-item:nth-child(6) .stepper-node').click();
  await d.locator('.account-status:has-text("Exige manutenção periódica?") .account-status-switch').click();
  await d.locator('input.date-mask-input[aria-label="Próxima manutenção prevista"]').fill('31/02/27');
  await salvar(p);
  ok((await d.locator('input.date-mask-input[aria-label="Próxima manutenção prevista"]').evaluate((i) => i.validationMessage)).includes('DD/MM/AA') && await p.locator('dialog.compras-dialog[open]').count() === 1, 'Data de revisão impossível é recusada (aviso de data da plataforma; o cadastro não fecha)');
  await d.locator('input.date-mask-input[aria-label="Próxima manutenção prevista"]').fill('15/01/20');
  await d.locator('.stepper-item:nth-child(1) .stepper-node').click();
  await d.locator('button', { hasText: 'Gravar áudio' }).click();
  await d.locator('button', { hasText: 'Parar gravação' }).waitFor();
  await salvar(p);
  ok((await erroDialogo(p)).includes('Pare a gravação'), 'Não salva com a gravação em andamento');
  await p.waitForTimeout(700);
  await d.locator('button', { hasText: 'Parar gravação' }).click();
  await d.locator('audio:not([hidden])').waitFor();
  await salvar(p); await fechado(p);
  let masseira = await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-patrimonio-v1')).bens[0]);
  ok(masseira.pecas.length === 1 && masseira.pecas[0].nome === 'CORREIA' && masseira.pecas[0].ultimaTroca === '2026-06-20' && masseira.pecas[0].intervaloMeses === 6 && masseira.pecas[0].proximaTroca === '2026-12-20' && masseira.pecas[0].id && masseira.pecas[0].quantidade === 1, 'Peça salva com id, nome, quantidade e data da substituição');
  ok(masseira.revisao.proxima === '2020-01-15' && masseira.capacidade.valor === 40 && masseira.consumoHora === 3.5, 'Revisão salva sem perder o que o bem já tinha');
  ok(masseira.audio && masseira.audio.id && masseira.audio.seconds >= 1 && await p.evaluate(async (id) => !!(await CicluzDocuments.files.get(id)), masseira.audio.id), 'Áudio guardado no aparelho e referenciado pelo bem');
  ok((await p.locator('#producao-patrimonio .compras-linha', { hasText: 'MASSEIRA' }).locator('.compras-situacao').textContent()) === 'Manutenção vencida', 'Lista avisa a revisão vencida');
  // Recarrega: tudo continua lá, e o áudio pode ser ouvido ou descartado
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => window.CicluzProducao && window.CicluzProducaoServico && window.CicluzAudioNota);
  // Recarregou: as contas fictícias da empresa entram de novo (sem servidor).
  await p.evaluate(() => { CicluzAgendaDados.pessoas = () => [{ id: 'conta-jose', nome: 'José (teste)' }, { id: 'conta-rodrigo', nome: 'Rodrigo (teste)' }, { id: 'conta-ana', nome: 'Ana (teste)' }]; });
  await p.evaluate(() => CicluzProducao.abrir('patrimonio'));
  await p.locator('#producao-patrimonio .compras-linha', { hasText: 'MASSEIRA' }).locator('.c-nome').click();
  const ficha = (await p.locator('dialog.patrimonio-ficha[open]').innerText()).replace(/\u00a0/g, ' ');
  ok(ficha.includes('CORREIA') && ficha.includes('Manutenção periódica') && ficha.includes('15/01/20'), 'Depois de recarregar, a ficha mostra a peça e a manutenção');
  await p.locator('dialog.patrimonio-ficha[open] .patrimonio-ficha-acoes button', { hasText: 'Editar' }).click();
  d = dialogo(p);
  await d.locator('.stepper-item:nth-child(4) .stepper-node').click();
  ok((await d.locator('.patrimonio-tabela-box tbody tr').first().innerText()).includes('CORREIA'), 'Edição traz a peça');
  await d.locator('.stepper-item:nth-child(6) .stepper-node').click();
  ok(await d.locator('input.date-mask-input[aria-label="Próxima manutenção prevista"]').inputValue() === '15/01/20', 'Edição traz a data da manutenção');
  await d.locator('.stepper-item:nth-child(1) .stepper-node').click();
  await d.locator('button', { hasText: 'Ouvir áudio' }).click();
  await d.locator('audio:not([hidden])').waitFor();
  await d.locator('.stepper-item:nth-child(6) .stepper-node').click();
  await d.locator('.account-status:has-text("Exige manutenção periódica?") .account-status-switch').click();
  await d.locator('.stepper-item:nth-child(1) .stepper-node').click();
  await d.locator('button', { hasText: 'Descartar áudio' }).click();
  await salvar(p); await fechado(p);
  masseira = await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-patrimonio-v1')).bens[0]);
  ok(masseira.audio === null && masseira.revisao === null && masseira.pecas.length === 1, 'Descartar o áudio e desligar a manutenção periódica tiram os dois do bem; a peça fica');

  // Produto da produção
  await p.evaluate(() => CicluzProducao.abrir('produtos'));
  await mais(p);
  d = dialogo(p);
  // Produto escolhido na árvore grupo › subgrupo › produto (23/11/2026, Zé); grupo e subgrupo não são marcáveis aqui.
  await d.getByRole('button', { name: 'Produto *', exact: true }).click();
  const jp = p.locator('dialog.compras-dialog[open]').last();
  ok(await jp.getByRole('checkbox', { name: 'Selecionar FAB. PRÓPRIA', exact: true }).isHidden(), 'Na árvore do produto da produção, o grupo não é marcável (só o produto)');
  await jp.locator('.people-close-control').click();
  await escolherNaArvore(p, d.getByRole('button', { name: 'Produto *', exact: true }), { grupo: 'FAB. PRÓPRIA', subgrupo: 'PANIFICAÇÃO', item: 'PÃO DE SAL' });
  ok((await d.getByRole('button', { name: 'Produto *', exact: true }).textContent()).trim() === 'PÃO DE SAL', 'O campo mostra o produto escolhido na árvore');
  ok((await d.getByLabel('Utensílio *', { exact: true }).locator('option').nth(1).textContent()).startsWith('ASSADEIRA'), 'Utensílios aparecem primeiro na lista');
  await d.getByLabel('Utensílio *', { exact: true }).selectOption(assadeiraId);
  await d.getByLabel('Quantos na largura *', { exact: true }).fill('5');
  await d.getByLabel('Quantos na altura *', { exact: true }).fill('6');
  ok((await d.locator('.compras-texto-auto').textContent()).includes('par'), 'Largura ímpar com meia: avisa que precisa ser par');
  await d.getByLabel('Quantos na largura *', { exact: true }).fill('6');
  ok((await d.locator('.compras-texto-auto').textContent()).includes('36 un · meia 18 un'), 'Resumo da fornada: 36 e meia 18');
  await d.getByLabel('Estoque mínimo', { exact: true }).fill('20');
  await salvar(p);
  ok((await erroDialogo(p)).includes('múltiplo de 18'), 'Mínimo fora do passo é recusado');
  await d.getByLabel('Estoque mínimo', { exact: true }).fill('36');
  await d.getByLabel('Estoque máximo', { exact: true }).fill('216');
  await salvar(p); await fechado(p);
  let dados = await prod(p);
  ok(dados.produtos[0].formato.colunas === 6 && dados.produtos[0].formato.aceitaMeia && dados.produtos[0].estoqueMin === 36, 'Configuração de produção salva');
  ok((await p.locator('#producao-produtos .compras-situacao').first().textContent()) === 'Sem ficha', 'Produto sem ficha é sinalizado');

  // Ficha técnica pela interface
  await p.locator('#producao-produtos button', { hasText: 'Fichas' }).click();
  ok(await p.locator('#producao-fichas.show').count() === 1, '"Fichas" abre as fichas do produto');
  await mais(p);
  d = dialogo(p);
  ok((await d.getByLabel('Ingredientes para quantas unidades? *', { exact: true }).inputValue()) === '36', 'Quantidade-base começa na fornada');
  await d.getByLabel('Nome da ficha *', { exact: true }).fill('Do zero');
  const etapa = (n) => d.locator('.producao-etapa').nth(n);
  await etapa(0).getByLabel('Processo *', { exact: true }).selectOption('pre-pesar');
  await etapa(0).getByRole('button', { name: 'Ingrediente', exact: true }).click();
  await etapa(0).getByLabel('Ingrediente 1', { exact: true }).selectOption('p-farinha');
  await etapa(0).getByLabel('Quantidade do ingrediente 1', { exact: true }).fill('30');
  await etapa(0).getByLabel('Unidade do ingrediente 1', { exact: true }).selectOption('KG');
  await etapa(0).getByRole('button', { name: 'Equipamento / tempo', exact: true }).click();
  await etapa(0).getByLabel('Tempo em minutos 1', { exact: true }).fill('15');
  await etapa(0).getByLabel('Nível profissional 1', { exact: true }).selectOption('ajudante');
  const cargoSel = etapa(0).getByLabel('Cargo 1', { exact: true });
  const padeiro = await cargoSel.evaluate((s) => [...s.options].find((o) => /^padeiro$/i.test(o.textContent.trim()))?.value);
  ok(Boolean(padeiro), 'Lista de cargos vem do cadastro de Cargos (tem Padeiro)');
  await cargoSel.selectOption(padeiro);
  await d.getByRole('button', { name: 'Etapa', exact: true }).click();
  await etapa(1).getByLabel('Processo *', { exact: true }).selectOption('misturar');
  await etapa(1).getByRole('button', { name: 'Ingrediente', exact: true }).click();
  await etapa(1).getByLabel('Ingrediente 1', { exact: true }).selectOption('p-farinha');
  await etapa(1).getByLabel('Quantidade do ingrediente 1', { exact: true }).fill('30');
  await etapa(1).getByLabel('Unidade do ingrediente 1', { exact: true }).selectOption('KG');
  await etapa(1).getByRole('button', { name: 'Equipamento / tempo', exact: true }).click();
  await etapa(1).getByLabel('Equipamento ou utensílio 1', { exact: true }).selectOption(masseiraId);
  await etapa(1).getByLabel('Tempo em minutos 1', { exact: true }).fill('20');
  await etapa(1).getByLabel('Acompanhamento 1', { exact: true }).selectOption('0');
  ok((await etapa(1).locator('.producao-etapa-resumo').textContent()).includes('Tempo 20 min · equipe 0 min'), 'Masseira sem acompanhamento: tempo de equipe zero');
  await d.getByRole('button', { name: 'Etapa', exact: true }).click();
  await etapa(2).getByLabel('Processo *', { exact: true }).selectOption('assar');
  await etapa(2).getByRole('button', { name: 'Equipamento / tempo', exact: true }).click();
  await etapa(2).getByLabel('Tempo em minutos 1', { exact: true }).fill('25');
  await etapa(2).getByLabel('Acompanhamento 1', { exact: true }).selectOption('0.2');
  ok((await d.locator('.compras-texto-auto').last().textContent()).includes('tempo total 1 h · tempo de equipe 20 min'), 'Resumo da ficha: 60 min no total, 20 min de equipe');
  await salvar(p); await fechado(p);
  dados = await prod(p);
  ok(dados.fichas.length === 1 && dados.fichas[0].padrao && dados.fichas[0].etapas.length === 3, 'Ficha salva como padrão, com 3 etapas');
  ok(/^padeiro$/i.test(dados.fichas[0].etapas[0].recursos[0].cargoNome) && /^(ref|local):/.test(dados.fichas[0].etapas[0].recursos[0].cargoKey), 'Etapa guarda o cargo (chave + nome) e o nível');
  ok(await p.locator('#producao-fichas .compras-situacao', { hasText: 'Padrão' }).count() === 1, 'Lista marca a ficha padrão');
  // Custos: sem parâmetros o custo sai parcial; com eles, só falta o que não tem cargo
  ok((await p.locator('#producao-fichas .compras-linha small').first().textContent()).includes('parcial: falta'), 'Sem parâmetros, a ficha mostra custo parcial e o que falta');
  await p.evaluate(() => CicluzProducao.abrir('custos'));
  await p.locator('#producao-custos button', { hasText: 'Editar' }).click();
  await dialogo(p).getByLabel('Horas de trabalho por mês (h)', { exact: true }).fill('220');
  await dialogo(p).getByLabel('Encargos sobre a folha (%)', { exact: true }).fill('-1');
  await salvar(p);
  ok((await erroDialogo(p)).includes('negativo'), 'Parâmetro negativo é recusado');
  await dialogo(p).getByLabel('Encargos sobre a folha (%)', { exact: true }).fill('0');
  await dialogo(p).getByLabel('Preço do kWh (R$)', { exact: true }).fill('1,00'); // máscara do S2: dígitos em centavos
  // A masseira do teste é a gás (3,5 kg/h): desde 16/11/2026 o bem elétrico só guarda a potência (W), que não gera custo.
  await dialogo(p).getByLabel('Preço do kg de gás (R$)', { exact: true }).fill('1,00');
  await salvar(p); await fechado(p);
  const custo = await p.evaluate(() => { const f = CicluzProducaoDados.producao.dados.fichas[0]; return CicluzProducaoServico.custoDaFicha(f); });
  ok(custo.ingredientes === 235.2, 'C1: 2 × 30 kg = 2,4 sacos × R$ 98 = R$ 235,20 (' + custo.ingredientes + ')');
  ok(custo.energia === 1.17, 'C3: masseira a gás 20 min × 3,5 kg/h × R$ 1/kg = R$ 1,17 (' + custo.energia + ')');
  ok(custo.maoDeObra > 0 && custo.faltas.join() === 'salário do cargo ou horas por mês', 'C2 calculado para a etapa com cargo; a etapa sem cargo fica como falta');
  ok(custo.total === Math.round((custo.ingredientes + custo.maoDeObra + custo.energia) * 100) / 100 && custo.unitario === Math.round(custo.total / 36 * 100) / 100, 'C4: total e custo por unidade');
  await p.evaluate(() => CicluzProducao.abrir('fichas'));
  await p.locator('#producao-fichas button.btn', { hasText: 'Duplicar' }).click();
  ok((await prod(p)).fichas.length === 2 && !(await prod(p)).fichas[1].padrao, 'Duplicar cria uma variante que não é padrão');

  // Agendamento → pedido
  await p.evaluate(() => CicluzProducao.abrir('agendamento'));
  await mais(p);
  d = dialogo(p);
  await d.getByRole('checkbox', { name: 'Marcar PÃO DE SAL' }).check();
  await d.getByLabel('Quantidade de PÃO DE SAL', { exact: true }).fill('40');
  ok((await d.locator('.producao-erro').textContent()).includes('múltiplos de 18'), 'Quantidade fora do passo avisa na hora');
  await d.getByLabel('Quantidade de PÃO DE SAL', { exact: true }).fill('72');
  { const t = await d.locator('.compras-produto-celula small').allTextContents(); ok(t.some((x) => x.includes('2 × assadeira')), '72 un = 2 assadeiras: ' + t.join(' | ')); }
  await d.getByLabel('Responsável pelo pedido *', { exact: true }).selectOption('conta-jose');
  await salvar(p); await fechado(p);
  ok((await prod(p)).agendas.length === 1, 'Agendamento salvo');
  await p.locator('#producao-agendamento .compras-datas .compras-chip').first().click();
  await dialogo(p).getByRole('button', { name: 'Gerar o pedido agora (simulação)' }).click();
  dados = await prod(p);
  ok(dados.pedidos.length === 1 && dados.pedidos[0].status === 'rascunho' && dados.pedidos[0].itens[0].quantidade === 72, 'Pedido nasce "para fazer" com a quantidade pré-programada');
  ok(dados.pedidos[0].dataEntrega > dados.ocorrencias[0].data, 'Entrega no dia seguinte ao pedido (pedido na véspera)');
  const diaEntrega = dados.pedidos[0].dataEntrega;

  await p.evaluate(() => CicluzProducao.abrir('pedidos'));
  await p.locator('#producao-pedidos button', { hasText: 'Fazer o pedido' }).click();
  await salvar(p); await fechado(p);
  dados = await prod(p);
  ok(dados.pedidos[0].status === 'enviado' && dados.ordens.length === 1, 'Enviar à produção cria a ordem');
  const ordem = dados.ordens[0];
  ok(ordem.etapas.length === 3 && ordem.etapas[1].lotes === 2 && ordem.etapas[1].tempo === 40, 'Capacidade: 60 kg na masseira de 40 kg = 2 processos, tempo dobra (40 min)');
  ok(ordem.etapas[0].ingredientes[0].quantidade === 60, 'Ingredientes escalados para 72 un (30 kg → 60 kg)');

  // Pedido extra pelo "+"
  await mais(p);
  d = dialogo(p);
  await d.getByLabel('Quantidade de PÃO DE SAL', { exact: true }).fill('18');
  await d.getByLabel('Quem está pedindo *', { exact: true }).selectOption('conta-ana');
  await salvar(p); await fechado(p);
  dados = await prod(p);
  ok(dados.pedidos.length === 2 && dados.pedidos[1].origem === 'extra' && dados.pedidos[1].status === 'enviado' && dados.ordens.length === 2, 'Pedido extra vai direto para a produção');

  const farinhaAntes = await saldoDe(p, 'p-farinha');
  // Mapa de produção
  await p.evaluate((dia) => CicluzProducao.abrir('mapa', dia), diaEntrega);
  ok(await p.locator('#producao-mapa .producao-tarefa').count() === 3, 'Mapa mostra as 3 etapas da ordem do dia');
  ok((await p.locator('#producao-mapa .producao-tarefa').first().textContent()).toLowerCase().includes('padeiro · ajudante'), 'Mapa mostra cargo e nível da etapa');
  ok(await p.locator('#producao-mapa .producao-tarefa').nth(1).getByRole('button', { name: 'Concluir' }).count() === 0, 'Etapa só começa depois da anterior');
  for (let i = 0; i < 3; i++) {
    await p.locator('#producao-mapa .producao-tarefa button', { hasText: 'Concluir' }).first().click();
    await p.waitForTimeout(60);
  }
  ok((await prod(p)).pedidos[0].status === 'pronto', 'Todas as etapas concluídas: pedido pronto');
  ok(await saldoDe(p, 'p-pao-teste') === 72, 'Produto com estoque: a produção pronta entra no saldo do Compras (72)');
  ok(Math.abs((farinhaAntes - await saldoDe(p, 'p-farinha')) - 4.8) < 1e-6, 'Baixa dos ingredientes: 120 kg de farinha = 4,8 sacos de 25 kg');
  ok(await p.evaluate(() => CicluzComprasDados.dados.movimentos.filter((m) => m.tipo === 'consumo_producao').length) === 2, 'Extrato do Compras com o consumo da produção');
  ok((await prod(p)).ordens[0].estoqueLancado && (await prod(p)).pedidos[0].itens[0].entrouEstoque === 72, 'Ordem marcada como lançada no estoque');
  await p.locator('#producao-mapa .compras-interruptor input').check();
  await p.locator('#producao-mapa .compras-chip', { hasText: 'Por processo' }).click();
  const titulos = await p.locator('#producao-mapa .compras-secao-cab h3').allTextContents();
  ok(titulos.length === 3 && titulos[0].startsWith('Pré-pesar'), 'Visão por processo agrupa pela ordem das etapas');
  await p.locator('#producao-mapa .compras-chip', { hasText: 'Por turno' }).click();
  ok((await p.locator('#producao-mapa .compras-secao-cab h3').allTextContents()).join('|').startsWith('Manhã'), 'Visão por turno: janela 06:00 é manhã');
  await p.locator('#producao-mapa .compras-chip', { hasText: 'Por cargo' }).click();
  ok((await p.locator('#producao-mapa .compras-secao-cab h3').allTextContents()).some((x) => /padeiro · ajudante/i.test(x)), 'Visão por cargo agrupa pelo cargo e nível');

  // Abastecimento e fechamento
  await p.evaluate(() => CicluzProducao.abrir('abastecimento'));
  await p.locator('#producao-abastecimento button', { hasText: 'Abastecer' }).click();
  await salvar(p); await fechado(p);
  ok((await prod(p)).pedidos[0].status === 'abastecido' && (await prod(p)).pedidos[0].itens[0].real === 72, 'Abastecido sem conferência, real = pedido');
  ok(await saldoDe(p, 'p-pao-teste') === 0, 'Abastecimento tira do saldo o que foi para a loja');
  await p.evaluate(() => CicluzProducaoServico.lancarEstoque());
  ok(await p.evaluate(() => CicluzComprasDados.dados.movimentos.filter((m) => m.produtoId === 'p-pao-teste').length) === 2, 'Movimentos não se repetem ao reconciliar');
  await p.locator('#producao-abastecimento button', { hasText: 'Fechar' }).click();
  await dialogo(p).getByLabel('Sobra de PÃO DE SAL', { exact: true }).fill('70');
  await dialogo(p).getByLabel('Descarte de PÃO DE SAL', { exact: true }).fill('5');
  await salvar(p);
  ok((await erroDialogo(p)).includes('não podem passar'), 'Sobra + descarte não passam do produzido');
  await dialogo(p).getByLabel('Sobra de PÃO DE SAL', { exact: true }).fill('4');
  await salvar(p); await fechado(p);
  dados = await prod(p);
  ok(dados.pedidos[0].fechadoEm && dados.pedidos[0].itens[0].sobra === 4 && dados.pedidos[0].itens[0].descarte === 5, 'Fechamento grava sobra e descarte');
  ok(await saldoDe(p, 'p-pao-teste') === 4, 'A sobra de produto com estoque volta para o saldo (descarte não)');

  // Reposição: abaixo do mínimo vira sugestão; só vira ordem depois de aprovada
  await p.evaluate(() => CicluzProducao.abrir('pedidos'));
  ok(await p.locator('#producao-pedidos .compras-secao-cab h3', { hasText: 'Repor estoque' }).count() === 1, 'Estoque abaixo do mínimo aparece em "Repor estoque"');
  const ordensAntes = (await prod(p)).ordens.length;
  await p.locator('#producao-pedidos button', { hasText: 'Aprovar e produzir' }).click();
  await dialogo(p).getByLabel('Aprovado por *', { exact: true }).selectOption('conta-rodrigo');
  await salvar(p); await fechado(p);
  dados = await prod(p);
  ok(dados.ordens.length === ordensAntes + 1 && dados.ordens.at(-1).origem === 'reposicao' && dados.ordens.at(-1).quantidade === 216 && dados.ordens.at(-1).aprovadoPor === 'conta-rodrigo', 'Aprovada: ordem de reposição até o máximo (216)');
  ok(await p.locator('#producao-pedidos .compras-secao-cab h3', { hasText: 'Repor estoque' }).count() === 0, 'Com a reposição em andamento, a sugestão some');
  // Pedido atendido pelo estoque: não gera ordem e já fica pronto
  const doEstoque = await p.evaluate(() => {
    CicluzComprasDados.transacao((d) => { d.produtos.find((x) => x.id === 'p-pao-teste').saldo = 100; });
    const antes = CicluzProducaoDados.producao.dados.ordens.length;
    const r = CicluzProducaoServico.pedidoExtra({ dataEntrega: CicluzProducaoDados.hojeIso(), janelaDe: '15:00', janelaAte: '16:00', itens: [{ produtoId: 'p-pao-teste', quantidade: 36 }], responsavelId: 'conta-ana' });
    const ped = CicluzProducaoDados.producao.dados.pedidos.find((x) => x.id === r.id);
    const livre = CicluzProducaoServico.estoqueLivre('p-pao-teste');
    const r2 = CicluzProducaoServico.pedidoExtra({ dataEntrega: CicluzProducaoDados.hojeIso(), janelaDe: '16:00', janelaAte: '17:00', itens: [{ produtoId: 'p-pao-teste', quantidade: 72 }], responsavelId: 'conta-ana' });
    const ped2 = CicluzProducaoDados.producao.dados.pedidos.find((x) => x.id === r2.id);
    return { status: ped.status, novas: CicluzProducaoDados.producao.dados.ordens.length - antes, livre, item2: ped2.itens[0] };
  });
  ok(doEstoque.status === 'pronto', 'Pedido coberto pelo estoque já fica pronto para abastecer');
  ok(doEstoque.livre === 64, 'Estoque livre desconta o reservado (100 − 36)');
  ok(doEstoque.item2.doEstoque === 64 && doEstoque.item2.produzir === 18 && doEstoque.novas === 1, 'Faltaram 8: sai 64 do estoque e produz 18 (meia fornada)');

  // Relatórios
  await p.evaluate(() => CicluzProducao.abrir('relatorios'));
  // O pedido agendado é entregue depois de amanhã: amplia o período.
  await p.evaluate(() => { const i = document.querySelector('#producao-relatorios input[data-date-native][aria-label="Até"]'); i.value = '2099-12-31'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  const rel =await p.locator('#producao-relatorios tbody tr').first().locator('td').allTextContents();
  ok(rel[0] === 'PÃO DE SAL' && rel[2] !== '0', 'Relatório lista o produto com o produzido no período: ' + rel.join(' | '));

  // Bem em uso não é excluído
  const exclusao = await p.evaluate((id) => CicluzProducaoServico.excluirBem(id), masseiraId);
  ok(exclusao.erro && exclusao.erro.includes('ficha'), 'Bem usado em ficha não pode ser excluído');

  /* ---------- 2) Conferência em 2 etapas ---------- */
  const r2 = await p.evaluate(() => {
    const SV = CicluzProducaoServico;
    const c = CicluzProducaoDados.config('p-pao-teste');
    SV.salvarConfig({ ...c, conferencia: '2', comEstoque: false });
    const hoje = CicluzProducaoDados.hojeIso();
    const { id } = SV.pedidoExtra({ dataEntrega: hoje, janelaDe: '10:00', janelaAte: '12:00', itens: [{ produtoId: 'p-pao-teste', quantidade: 36 }], responsavelId: 'conta-jose' });
    const o = CicluzProducaoDados.producao.dados.ordens.find((x) => x.pedidoId === id);
    o.etapas.forEach((e) => SV.marcarEtapa(o.id, e.numero, 'concluir'));
    const semConferente = SV.abastecer(id, { 'p-pao-teste': 36 }, '');
    const ab = SV.abastecer(id, { 'p-pao-teste': 36 }, 'conta-jose');
    const mesma = SV.conferirNaLoja(id, { 'p-pao-teste': 36 }, 'conta-jose');
    const outra = SV.conferirNaLoja(id, { 'p-pao-teste': 34 }, 'conta-ana');
    const ped = CicluzProducaoDados.producao.dados.pedidos.find((x) => x.id === id);
    // Só a curva A: produto fora da curva (sem vendas) não espera a conferência na loja
    const { id: id2 } = SV.pedidoExtra({ dataEntrega: hoje, janelaDe: '12:00', janelaAte: '13:00', itens: [{ produtoId: 'p-pao-teste', quantidade: 18 }], responsavelId: 'conta-jose' });
    const o2 = CicluzProducaoDados.producao.dados.ordens.find((x) => x.pedidoId === id2);
    o2.etapas.forEach((e) => SV.marcarEtapa(o2.id, e.numero, 'concluir'));
    const curva = SV.abastecer(id2, { 'p-pao-teste': 18 }, 'conta-jose', 'curva');
    const ped2 = CicluzProducaoDados.producao.dados.pedidos.find((x) => x.id === id2);
    return { semConferente: semConferente.erro, ab: ab.status, mesma: mesma.erro, outra: outra.ok, status: ped.status, recebido: ped.itens[0].recebido, curva: curva.status, recebidoCurva: ped2.itens[0].recebido };
  });
  ok(r2.semConferente && r2.semConferente.includes('conferiu'), 'Com conferência, exige quem conferiu');
  ok(r2.ab === 'conferencia_loja', '2 etapas: depois da saída, espera a conferência na loja');
  ok(r2.mesma && r2.mesma.includes('outra pessoa'), 'Conferência na loja por outra pessoa');
  ok(r2.outra && r2.status === 'abastecido' && r2.recebido === 34, 'Chegada conferida grava o que chegou');
  ok(r2.curva === 'abastecido' && r2.recebidoCurva === 18, 'Só a curva A: produto fora da curva passa sem conferência na loja');
  await p.close();
}

/* ---------- 3) Matriz de layout ---------- */
// Bem elétrico: o consumo em kWh por hora (23/11/2026, Zé: "falta o campo") é gravado e entra no custo de energia da ficha.
{
  const p = await abrirPagina(1024);
  await p.evaluate(() => CicluzProducao.abrir('patrimonio'));
  await p.locator('#producao-patrimonio .compras-secao-cab button[aria-label="Cadastrar patrimônio"]').click();
  const d = dialogo(p);
  await d.getByLabel('Nome simplificado *', { exact: true }).fill('Forno elétrico teste');
  await d.getByLabel('Categoria *', { exact: true }).selectOption('MAC');
  await d.locator('.account-status:has-text("Informar especificação técnica?") .account-status-switch').click();
  await d.getByLabel('Tipo de Energia', { exact: true }).selectOption('eletrica');
  ok(await d.getByLabel('Consumo elétrico por hora (kWh)', { exact: true }).isVisible(), 'Energia elétrica mostra o campo de consumo em kWh por hora');
  await d.getByLabel('Potência Elétrica (W)', { exact: true }).fill('2000');
  await d.getByLabel('Consumo elétrico por hora (kWh)', { exact: true }).fill('2,5');
  await salvar(p); await fechado(p);
  const bem = await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-patrimonio-v1')).bens.find((b) => b.nome === 'FORNO ELÉTRICO TESTE'));
  ok(bem && bem.energia === 'eletrica' && bem.consumoHora === 2.5 && bem.potenciaW === 2000, 'Bem elétrico grava o consumo (2,5 kWh/h) e a potência (2000 W) separados');
  // Custo: 30 min × 2,5 kWh/h × R$ 0,80 = R$ 1,00 (a fórmula é a mesma de antes; só faltava o campo).
  const energia = await p.evaluate((id) => CicluzProducaoDominio.custoDoPlano({ etapas: [{ ingredientes: [], recursos: [{ tempoEquipe: 0, tempo: 30, bem: CicluzProducaoDados.patrimonio.dados.bens.find((b) => b.id === id) }] }] }, { custoIngrediente: () => 0, custoMinuto: () => 0, precoEnergia: (t) => (t === 'eletrica' ? 0.8 : null) }).energia, bem.id);
  ok(energia === 1, 'Custo de energia elétrica entra na conta: 30 min × 2,5 kWh/h × R$ 0,80 = R$ 1,00 (' + energia + ')');
  await p.close();
}

async function semear(p) {
  await criarPao(p);
  await p.evaluate(() => {
    const SV = CicluzProducaoServico;
    const b = SV.salvarBem({ nome: 'Assadeira 58x68', categoria: 'utensilio', medidas: { largura: 58, comprimento: 68 } });
    const m = SV.salvarBem({ nome: 'Masseira 40 kg', categoria: 'maquina', capacidade: { valor: 40, unidade: 'KG' }, energia: 'eletrica', consumoHora: 3 });
    SV.salvarConfig({ produtoId: 'p-pao-teste', formato: { utensilioId: b.id, colunas: 6, linhas: 6, exatidao: 'exato', aceitaMeia: true }, comEstoque: true, conferencia: 'nenhuma' });
    SV.salvarFicha({ produtoId: 'p-pao-teste', nome: 'Do zero', quantidadeBase: 36, etapas: [
      { processo: 'pre-pesar', ingredientes: [{ produtoId: 'p-farinha', quantidade: 5, unidade: 'KG' }], recursos: [{ patrimonioId: '', tempoMin: 15, acompanhamento: 1, nivel: 'ajudante' }] },
      { processo: 'misturar', ingredientes: [], recursos: [{ patrimonioId: m.id, tempoMin: 20, acompanhamento: 0 }] },
    ] });
    SV.salvarAgenda({ produtoIds: ['p-pao-teste'], quantidades: {}, inicio: CicluzComprasDominio.isoData(CicluzComprasDominio.somarDias(new Date(), 1)), hora: '18:00', regra: { tipo: 'diaria' }, termino: { tipo: 'nunca' }, janelaDe: '06:00', janelaAte: '08:00', entrega: 'seguinte', responsavelId: 'conta-jose' });
    SV.pedidoExtra({ dataEntrega: CicluzProducaoDados.hojeIso(), janelaDe: '06:00', janelaAte: '08:00', itens: [{ produtoId: 'p-pao-teste', quantidade: 54 }], responsavelId: 'conta-jose', observacao: 'Teste' });
  });
}
const telas = ['patrimonio', 'produtos', 'fichas', 'custos', 'agendamento', 'pedidos', 'mapa', 'abastecimento', 'relatorios'];
let combinacoes = 0;
const medir = (p) => p.evaluate(() => {
  const v = document.querySelector('.view.show');
  const visivel = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
  const dlg = document.querySelector('dialog[open]');
  return {
    id: v && v.id,
    lateral: document.documentElement.scrollWidth - innerWidth,
    dialogoLateral: dlg ? dlg.scrollWidth - dlg.clientWidth : 0,
    cabecalho: visivel(v && v.querySelector('.head')),
    rodapes: v ? [...v.querySelectorAll('.people-bottom-header')].filter(visivel).length : 0,
  };
});
for (const largura of [320, 390, 1024]) {
  const p = await abrirPagina(largura);
  await semear(p);
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    for (const t of telas) {
      await p.evaluate((nome) => CicluzProducao.abrir(nome), t);
      await p.waitForTimeout(80);
      const m = await medir(p);
      const rotulo = t + ' ' + largura + 'px ' + (escuro ? 'escuro' : 'claro');
      ok(m.id === 'producao-' + t, 'Tela aberta: ' + rotulo);
      ok(m.lateral <= 0, 'Sem rolagem lateral: ' + rotulo + ' (' + m.lateral + 'px)');
      ok(m.cabecalho, 'Cabeçalho visível: ' + rotulo);
      ok(m.rodapes === 1, 'Um rodapé: ' + rotulo + ' (' + m.rodapes + ')');
      combinacoes++;
    }
    // Editor da ficha (o diálogo mais largo)
    await p.evaluate(() => CicluzProducao.abrir('fichas'));
    await p.locator('#producao-fichas button.btn', { hasText: 'Editar' }).first().click();
    await p.waitForTimeout(150);
    const m = await medir(p);
    ok(m.lateral <= 0 && m.dialogoLateral <= 1, 'Editor de ficha sem rolagem lateral: ' + largura + 'px ' + (escuro ? 'escuro' : 'claro') + ' (' + m.dialogoLateral + 'px)');
    await p.locator('dialog.compras-dialog[open] .people-close-control').click();
    await fechado(p);
    // Cadastro do bem com peças: a linha abre a ficha do bem; Editar abre o cadastro; a peça é cadastrada na sua janela (etapa 4).
    await p.evaluate(() => CicluzProducao.abrir('patrimonio'));
    await p.locator('#producao-patrimonio .compras-linha.com-acoes').first().locator('.c-nome').click();
    await p.locator('dialog.patrimonio-ficha[open] .patrimonio-ficha-acoes button', { hasText: 'Editar' }).click();
    await dialogo(p).locator('.stepper-item:nth-child(4) .stepper-node').click();
    await dialogo(p).locator('button', { hasText: 'Adicionar peça' }).click();
    await p.locator('dialog[open]:has(h2:has-text("Nova peça"))').getByLabel('Peça *', { exact: true }).fill('Resistência do forno de lastro');
    await p.waitForTimeout(150);
    const mb = await p.evaluate(() => ({ lateral: document.documentElement.scrollWidth - innerWidth, dialogos: [...document.querySelectorAll('dialog[open]')].map((x) => x.scrollWidth - x.clientWidth) }));
    ok(mb.lateral <= 0 && mb.dialogos.every((x) => x <= 1), 'Cadastro do bem e janela da peça sem rolagem lateral: ' + largura + 'px ' + (escuro ? 'escuro' : 'claro') + ' (' + mb.dialogos.join('/') + 'px)');
    await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].reverse().forEach((x) => x.close()));
    await fechado(p);
  }
  await p.close();
}

await navegador.close();
servidor.close();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações da Produção no navegador passaram (fluxo + ' + combinacoes + ' combinações de tela × largura × tema)');
