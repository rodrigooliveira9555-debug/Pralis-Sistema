// Verificação de navegador da Agenda (Playwright + Chromium, isolado, sem dados reais).
// Rodar: node tests/agenda-telas.mjs (faz parte de npm run test:telas)
// 1) Fluxo pela interface: menu → lista, criar escrevendo ("amanhã às 10"), criar completo pelo "+",
//    repetição ao concluir, mostrar/limpar concluídos, ordem manual, listas, alerta com soneca,
//    calendário (dia/semana/mês/ano, criar no horário, arrastar) e Kanban (colunas, concluir).
// 2) Matriz de layout: listas, lista aberta, dia, semana, mês, ano, Kanban e o diálogo em 320, 390,
//    1024 e 1900 px, claro e escuro: sem erro de página, sem rolagem lateral, cabeçalho e um rodapé.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };
const KEY = 'cicluz-agenda-v1';

async function abrirPagina(largura, altura = 844) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura } });
  await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await pagina.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await pagina.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.CicluzAgenda && window.CicluzAgendaCalendario && window.CicluzAgendaKanban && window.CicluzAgendaAlertas);
  // Alertas surgem sozinhos (a cada 30 s) e cobrem o canto da tela: ficam escondidos fora do trecho que os testa.
  await pagina.addStyleTag({ content: 'body.sem-alertas .agenda-alertas { display: none; }' });
  await pagina.evaluate(() => document.body.classList.add('sem-alertas'));
  return pagina;
}
const dialogo = (p) => p.locator('dialog.agenda-dialog[open]').last();
const dados = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const confirmar = (p) => dialogo(p).locator('.people-save-control').click();
const item = async (p, titulo) => (await dados(p)).itens.find((i) => i.titulo === titulo);
const escrever = async (p, texto) => { await p.locator('.agenda-nova-entrada').fill(texto); await p.locator('.agenda-nova-entrada').press('Enter'); };
const hojeDe = (p) => p.evaluate(() => CicluzAgendaDominio.isoData(new Date()));
const somar = (p, iso, n) => p.evaluate(([i, d]) => CicluzAgendaDominio.somarDias(i, d), [iso, n]);
const definirData = (p, rotulo, iso) => p.evaluate(([r, v]) => { const i = document.querySelector('dialog.agenda-dialog[open] input[data-date-native][aria-label="' + r + '"]'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, [rotulo, iso]);

/* ---------- 1) Fluxo pela interface ---------- */
{
  const p = await abrirPagina(1280, 900);
  const hoje = await hojeDe(p);
  // Entrada pelo menu lateral: Agenda · Atividades → Gestão de Pessoas
  await p.locator('summary', { hasText: 'Agenda' }).first().click();
  await p.getByRole('button', { name: 'Gestão de Pessoas', exact: true }).click();
  ok(await p.locator('#agenda-view.show').count() === 1, 'O submenu abre a Agenda');
  ok((await p.locator('.agenda-detalhe-titulo').textContent()).startsWith('Gestão de Pessoas'), 'Abre já na lista do submenu');
  ok(await dados(p) === null, 'Abrir a Agenda não grava nada');
  ok((await p.locator('.agenda-automatica small').allTextContents()).join('|') === 'Para hoje|Programados|Todos|Sinalizados|Atrasados|Atribuídos a mim|Concluídos', 'Listas automáticas do Lembretes + Atrasados');
  ok(await p.locator('.agenda-lateral').isVisible() && await p.locator('.agenda-conteudo').isVisible(), 'Computador: listas e conteúdo lado a lado');
  ok(!(await p.locator('.agenda-voltar-listas').isVisible()), 'Computador: sem "‹ Listas"');

  // Escrever do jeito que se fala
  await p.locator('.agenda-nova-entrada').fill('ligar para o contador amanhã às 10 #financeiro !');
  ok((await p.locator('.agenda-nova-dica').textContent()).includes('Amanhã às 10:00'), 'A linha nova mostra o que vai entender');
  await p.locator('.agenda-nova-entrada').press('Enter');
  let i = await item(p, 'ligar para o contador');
  const amanha = await somar(p, hoje, 1);
  ok(i && i.data === amanha && i.hora === '10:00' && i.etiquetas[0] === 'financeiro' && i.prioridade === 'alta' && i.listaId === 'lista-gestao-pessoas', '"amanhã às 10 #financeiro !" vira data, hora, etiqueta e prioridade, sem trocar as letras');
  ok(i.alerta === 0, 'Com data, avisa na hora');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('agenda-nova-entrada')), 'O foco volta para a linha nova');
  await escrever(p, 'Comprar 2 sacos de farinha');
  ok((await item(p, 'Comprar 2 sacos de farinha')).data === '', 'Número solto não vira data nem hora');

  // "Para hoje": cria com hoje; mostra os atrasados em grupo próprio
  await p.locator('.agenda-automatica', { hasText: 'Para hoje' }).click();
  await escrever(p, 'Conferir escala');
  ok((await item(p, 'Conferir escala')).data === hoje, 'Em "Para hoje", o novo vem com a data de hoje');

  // "+" do rodapé: compromisso completo com repetição, término, alerta, URL e local
  await p.locator('.view.show .people-add-control').click();
  ok(await dialogo(p).filter({ hasText: 'Novo compromisso' }).count() === 1, '"+" abre Novo compromisso');
  await dialogo(p).getByLabel('Título').fill('reunião semanal da equipe');
  await dialogo(p).getByLabel('Início').fill('09:30');
  await dialogo(p).getByLabel('Término').fill('09:00');
  await confirmar(p);
  ok((await dialogo(p).locator('.profiles-error').textContent()).includes('depois do início'), 'Término antes do início é recusado');
  await dialogo(p).getByLabel('Término').fill('10:30');
  await dialogo(p).getByLabel('Repetir').selectOption('personalizada');
  ok(await dialogo(p).getByLabel('A cada').isVisible(), 'Personalizada mostra "a cada" e os dias');
  await dialogo(p).getByLabel('A cada').fill('2');
  await dialogo(p).getByRole('button', { name: 'segunda-feira' }).click();
  await dialogo(p).getByRole('button', { name: 'quinta-feira' }).click();
  await dialogo(p).getByLabel('Fim da repetição').selectOption('vezes');
  await dialogo(p).getByLabel('Quantas vezes').fill('3');
  ok((await dialogo(p).locator('.agenda-repeticao .profiles-note').textContent()).includes('A cada 2 semanas: seg, qui, 3 vez(es)'), 'Resumo da repetição');
  await dialogo(p).getByLabel('Alerta').selectOption('15');
  await dialogo(p).getByLabel('Endereço na internet (URL)').fill('cicluz');
  await dialogo(p).getByLabel('Local').fill('Loja Centro');
  ok(await dialogo(p).getByRole('link', { name: 'Ver no mapa' }).isVisible(), 'Local com "Ver no mapa"');
  await confirmar(p);
  ok((await dialogo(p).locator('.profiles-error').textContent()).includes('http'), 'URL sem http é recusada');
  await dialogo(p).getByLabel('Endereço na internet (URL)').fill('https://cicluz.com.br');
  ok(await dialogo(p).locator('input[data-date-native][aria-label="Data"]').inputValue() === hoje, 'Em "Para hoje", o + já vem com a data de hoje');
  await dialogo(p).locator('.compras-chip', { hasText: /^Alta$/ }).click();
  await dialogo(p).getByLabel('Responsável').selectOption({ index: 1 });
  await dialogo(p).getByLabel('Notas').fill('levar a planilha de horários');
  await dialogo(p).getByRole('button', { name: 'Adicionar subtarefa' }).click();
  await dialogo(p).getByLabel('Subtarefa 1', { exact: true }).fill('imprimir escala');
  await dialogo(p).getByLabel('Subtarefa 1', { exact: true }).press('Enter');
  await dialogo(p).getByLabel('Subtarefa 2', { exact: true }).fill('avisar a equipe');
  await confirmar(p);
  ok(await p.locator('dialog.agenda-dialog[open]').count() === 0, 'O ✓ salva e fecha');
  i = await item(p, 'reunião semanal da equipe');
  ok(i.repeticao.tipo === 'personalizada' && i.repeticao.intervalo === 2 && i.repeticao.diasSemana.join() === '1,4' && i.repeticao.fim.vezes === 3, 'Repetição salva');
  ok(i.horaFim === '10:30' && i.alerta === 15 && i.url === 'https://cicluz.com.br' && i.local === 'Loja Centro' && i.notas === 'levar a planilha de horários', 'Término, alerta, URL, local e notas salvos como digitados');
  ok(i.subtarefas.map((s) => s.titulo).join('|') === 'imprimir escala|avisar a equipe', 'Subtarefas na ordem');

  // Concluir o que repete: fica uma cópia concluída e ele vai para a próxima data
  await p.getByRole('button', { name: 'Concluir reunião semanal da equipe' }).click();
  let d = await dados(p);
  const original = d.itens.find((x) => x.id === i.id);
  const copia = d.itens.find((x) => x.origemId === i.id);
  ok(copia && copia.concluida && !original.concluida && original.data > hoje && original.repeticao.feitas === 1, 'Concluir uma repetição: cópia concluída e o próximo fica na próxima data');
  ok((await p.locator('#compras-aviso').textContent()).includes('O próximo fica para'), 'Aviso diz quando é o próximo');

  // Lista do usuário: concluídos (Mostrar / Limpar) e ordem manual
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();
  await p.getByRole('button', { name: 'Concluir Comprar 2 sacos de farinha' }).click();
  ok((await p.locator('.agenda-concluidos-barra').textContent()).includes('2 concluídos'), 'Barra de concluídos com a contagem');
  ok(await p.locator('.agenda-item.concluida').count() === 0, 'Concluídos escondidos por padrão');
  await p.locator('.agenda-concluidos-barra').getByRole('button', { name: 'Mostrar' }).click();
  ok(await p.locator('.agenda-item.concluida').count() === 2, '"Mostrar" exibe os concluídos');
  await p.locator('.agenda-concluidos-barra').getByRole('button', { name: 'Limpar' }).click();
  await confirmar(p);
  ok(!(await dados(p)).itens.some((x) => x.concluida && x.listaId === 'lista-gestao-pessoas'), '"Limpar" apaga os concluídos da lista');
  const ordemAntes = await p.locator('.agenda-item .agenda-linha-texto b').allTextContents();
  await p.evaluate(() => {
    const linhas = [...document.querySelectorAll('.agenda-item[draggable="true"]')];
    const dt = new DataTransfer();
    linhas.at(-1).dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    linhas[0].dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    linhas[0].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  const ordemDepois = await p.locator('.agenda-item .agenda-linha-texto b').allTextContents();
  ok(ordemDepois[0] === ordemAntes.at(-1), 'Ordem manual: arrastar muda a ordem');
  await p.locator('.agenda-ferramentas').getByLabel('Ordenar por').selectOption('titulo');
  ok((await dados(p)).listas.find((l) => l.id === 'lista-gestao-pessoas').ordenacao === 'titulo', 'Ordenar por fica salvo na lista');

  // Listas: criar com cor e ícone; excluir só vazia
  await p.locator('.agenda-lista-nova').click();
  await dialogo(p).getByLabel('Nome').fill('Loja Centro');
  await dialogo(p).getByRole('radio', { name: 'Ícone pao' }).click();
  await confirmar(p);
  d = await dados(p);
  const loja = d.listas.find((l) => l.nome === 'Loja Centro');
  ok(loja && loja.icone === 'pao', 'Nova lista com ícone');
  ok((await p.locator('.agenda-detalhe-titulo').textContent()).startsWith('Loja Centro'), 'A lista nova abre');
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();
  await p.getByRole('button', { name: 'Editar lista' }).click();
  await dialogo(p).getByRole('button', { name: 'Excluir lista' }).click();
  ok((await p.locator('#compras-aviso').textContent()).includes('Mova ou exclua'), 'Lista com compromisso não é excluída');
  await p.keyboard.press('Escape');

  // Alerta: aparece na tela, com soneca
  await p.evaluate(() => { document.querySelectorAll('.agenda-alerta').forEach((a) => a.remove()); document.body.classList.remove('sem-alertas'); });
  const idAlerta = await p.evaluate(() => {
    const A = CicluzAgendaDados, D = CicluzAgendaDominio;
    const agora = new Date(Date.now() - 60000);
    const r = A.salvarItem('', { titulo: 'Ligar para a contabilidade', listaId: 'lista-diretor-operacoes', data: D.isoData(agora), hora: D.horaAgora(agora), alerta: 0 });
    CicluzAgendaAlertas.conferir(new Date());
    return r.id;
  });
  ok(await p.locator('.agenda-alerta', { hasText: 'Ligar para a contabilidade' }).count() === 1, 'Alerta vencido aparece na tela');
  await p.locator('.agenda-alerta', { hasText: 'Ligar para a contabilidade' }).getByRole('button', { name: 'Adiar 15 min' }).click();
  i = (await dados(p)).itens.find((x) => x.id === idAlerta);
  ok(i.adiadoPara && new Date(i.adiadoPara) > new Date(Date.now() + 14 * 60000), 'Adiar 15 min guarda a soneca');
  ok(await p.evaluate(() => CicluzAgendaAlertas.conferir(new Date())) === 0, 'Adiado não avisa de novo antes da hora');
  ok(await p.evaluate(() => CicluzAgendaAlertas.conferir(new Date(Date.now() + 16 * 60000))) === 1, 'Depois da soneca, avisa de novo');
  await p.locator('.agenda-alerta', { hasText: 'Ligar para a contabilidade' }).getByRole('button', { name: 'Concluir' }).click();
  ok((await dados(p)).itens.find((x) => x.id === idAlerta).concluida, 'Concluir pelo alerta');

  for (const b of await p.locator('.agenda-alerta').getByRole('button', { name: 'Fechar' }).all()) await b.click();
  ok(await p.locator('.agenda-alerta').count() === 0, '"Fechar" tira o alerta da tela');
  await p.evaluate(() => document.body.classList.add('sem-alertas'));

  // Calendário: dia em grade, criar no horário, arrastar para outra hora
  await p.getByRole('button', { name: 'Calendário', exact: true }).click();
  await p.locator('.compras-chip', { hasText: /^Dia$/ }).click();
  await p.locator('.agenda-cal-nav').getByRole('button', { name: 'Hoje' }).click();
  ok(await p.locator('.agenda-grade.dia .agenda-grade-coluna').count() === 1, 'Dia em grade de horas');
  ok(await p.locator('.agenda-agora').count() === 1, 'Linha vermelha da hora atual');
  const coluna = p.locator('.agenda-grade.dia .agenda-grade-coluna');
  await coluna.evaluate((c) => { c.closest('.agenda-grade-rolagem').scrollTop = 0; });
  const caixa = await coluna.boundingBox();
  await p.mouse.click(caixa.x + 30, caixa.y + 48 * 3 + 5);
  ok(await dialogo(p).filter({ hasText: 'Novo compromisso' }).count() === 1, 'Tocar num horário vazio cria ali');
  ok(await dialogo(p).getByLabel('Início').inputValue() === '03:00' && await dialogo(p).getByLabel('Término').inputValue() === '04:00', 'Já vem com a hora tocada e 1 h de duração');
  await dialogo(p).getByLabel('Título').fill('Inventário da madrugada');
  await confirmar(p);
  const idInv = (await item(p, 'Inventário da madrugada')).id;
  await p.evaluate(() => {
    const bloco = [...document.querySelectorAll('.agenda-bloco')].find((b) => b.textContent.includes('Inventário'));
    const col = document.querySelector('.agenda-grade.dia .agenda-grade-coluna');
    const r = col.getBoundingClientRect();
    const dt = new DataTransfer();
    bloco.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    col.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    col.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 48 * 5.5 }));
  });
  i = (await dados(p)).itens.find((x) => x.id === idInv);
  ok(i.hora === '05:30' && i.horaFim === '06:30', 'Arrastar o bloco muda a hora e mantém a duração');

  // Semana, mês (repetições), ano
  await p.locator('.compras-chip', { hasText: 'Semana' }).click();
  ok(await p.locator('.agenda-grade.semana .agenda-grade-coluna').count() === 7, 'Semana em grade de 7 dias');
  await p.locator('.compras-chip', { hasText: 'Mês' }).click();
  ok(await p.locator('.agenda-mes-grade .agenda-mes-dia').count() === 42, 'Mês com 6 semanas');
  ok(await p.locator('.agenda-pilula.repeticao').count() > 0, 'Repetições futuras aparecem no mês');
  await p.locator('.agenda-cal-listas').getByRole('button', { name: 'Gestão de Pessoas' }).click();
  ok(!(await p.locator('.agenda-pilula', { hasText: 'reunião semanal' }).count()), 'Esconder uma lista tira os compromissos dela do calendário');
  await p.locator('.agenda-cal-listas').getByRole('button', { name: 'Gestão de Pessoas' }).click();
  await p.locator('.compras-chip', { hasText: 'Ano' }).click();
  ok(await p.locator('.agenda-ano-mes').count() === 12, 'Ano com 12 meses');
  await p.locator('.agenda-ano-dia.hoje').click();
  ok((await p.locator('.agenda-cal-titulo').textContent()).includes(',') && await p.locator('.agenda-grade.dia').count() === 1, 'Tocar num dia do ano abre o dia');

  // Kanban: colunas, mover para Concluído, criar coluna
  await p.getByRole('button', { name: 'Kanban', exact: true }).click();
  ok((await p.locator('.agenda-kanban-cab h3').allTextContents()).map((t) => t.replace(/\d+$/, '').trim()).join('|') === 'A fazer|Em progresso|Concluído', 'Colunas do protótipo');
  const idK = (await item(p, 'Conferir escala')).id;
  await p.evaluate((id) => {
    const card = [...document.querySelectorAll('.agenda-cartao')].find((c) => c.textContent.includes('Conferir escala'));
    const col = document.querySelector('.agenda-kanban-coluna[data-coluna="concluido"]');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    col.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    col.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, idK);
  ok((await dados(p)).itens.find((x) => x.id === idK).concluida, 'Levar para Concluído conclui');
  await p.evaluate((id) => {
    const card = [...document.querySelectorAll('.agenda-cartao')].find((c) => c.textContent.includes('Conferir escala'));
    const col = document.querySelector('.agenda-kanban-coluna[data-coluna="col-em-progresso"]');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    col.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    col.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, idK);
  i = (await dados(p)).itens.find((x) => x.id === idK);
  ok(!i.concluida && i.colunaId === 'col-em-progresso', 'Tirar de Concluído reabre na coluna escolhida');
  await p.getByRole('button', { name: 'Editar colunas' }).click();
  await dialogo(p).getByRole('button', { name: 'Nova coluna' }).click();
  await dialogo(p).getByLabel('Nome').fill('Revisão');
  await confirmar(p);
  ok((await dados(p)).colunas.some((c) => c.nome === 'Revisão'), 'Nova coluna');
  await p.keyboard.press('Escape');
  ok(await p.locator('.agenda-kanban-coluna').count() === 4, 'Quadro com a coluna nova antes de Concluído');

  // Excluir pelo diálogo
  await p.locator('.agenda-cartao', { hasText: 'Inventário da madrugada' }).click();
  await dialogo(p).getByRole('button', { name: 'Excluir compromisso' }).click();
  await confirmar(p);
  ok(!(await item(p, 'Inventário da madrugada')), 'Excluir compromisso');

  // Dado ilegível: não grava por cima
  await p.evaluate((k) => localStorage.setItem(k, '{quebrado'), KEY);
  await p.reload();
  await p.waitForFunction(() => window.CicluzAgenda);
  const r = await p.evaluate(() => CicluzAgendaDados.criarRapido('teste', 'lista-gestao-pessoas'));
  ok(r.erro && await p.evaluate((k) => localStorage.getItem(k), KEY) === '{quebrado', 'Dado ilegível não é sobrescrito');
  await p.close();
}

/* ---------- Celular: lista abre por cima, com "‹ Listas" ---------- */
{
  const p = await abrirPagina(390);
  await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.estado.detalhe = false; CicluzAgenda.abrir(''); });
  ok(await p.locator('.agenda-lateral').isVisible() && !(await p.locator('.agenda-conteudo').isVisible()), 'Celular: começa nas listas');
  await p.locator('.agenda-automatica', { hasText: 'Programados' }).click();
  ok(!(await p.locator('.agenda-lateral').isVisible()) && await p.locator('.agenda-conteudo').isVisible(), 'Celular: tocar abre a lista');
  await p.locator('.agenda-voltar-listas').click();
  ok(await p.locator('.agenda-lateral').isVisible(), '"‹ Listas" volta');
  await p.close();
}

/* ---------- 2) Matriz de layout ---------- */
const exemplo = (hoje) => JSON.stringify({ versao: 1, listas: [{ id: 'lista-gestao-pessoas', nome: 'Gestão de Pessoas', cor: '#7c3aed', icone: 'pessoas', ordenacao: 'manual' }, { id: 'lista-diretor-operacoes', nome: 'Diretor de Operações com nome comprido', cor: '#2563eb', icone: 'operacao', ordenacao: 'manual' }],
  colunas: [{ id: 'col-a-fazer', nome: 'A fazer' }, { id: 'col-em-progresso', nome: 'Em progresso' }],
  itens: [1, 2, 3, 4, 5].map((n) => ({ id: 'i' + n, listaId: n % 2 ? 'lista-gestao-pessoas' : 'lista-diretor-operacoes', titulo: 'Compromisso de teste com um título bem comprido número ' + n, notas: 'Nota de teste', url: n === 1 ? 'https://cicluz.com.br' : '', local: 'Loja Centro', data: hoje, hora: n > 2 ? '0' + (n + 6) + ':00' : '', horaFim: n === 3 ? '10:30' : '', repeticao: n === 4 ? { tipo: 'semana', intervalo: 1, unidade: 'semana', diasSemana: [], fim: { tipo: 'nunca', data: '', vezes: 0 }, feitas: 0, ancora: hoje } : null, alerta: null, adiadoPara: '', prioridade: n === 1 ? 'muito-alta' : 'normal', sinalizado: n === 2, etiquetas: ['Etiqueta longa de teste'], responsavelId: 'u-rodrigo', colunaId: n === 5 ? 'col-em-progresso' : '', subtarefas: [{ id: 's' + n, titulo: 'Subtarefa', concluida: n === 1, concluidaEm: '' }], ordem: n, concluida: false, concluidaEm: '', criadoEm: '2026-11-01T10:00:00Z', criadoPor: '', atualizadoEm: '' })) });
const estados = [
  ['listas', (e) => { e.visao = 'listas'; e.detalhe = false; e.automatica = 'todos'; e.listaId = ''; }],
  ['lista aberta', (e) => { e.visao = 'listas'; e.detalhe = true; e.automatica = ''; e.listaId = 'lista-diretor-operacoes'; e.abertos.add('i2'); }],
  ['para hoje', (e) => { e.visao = 'listas'; e.detalhe = true; e.automatica = 'hoje'; e.listaId = ''; e.abertos.add('i1'); }],
  ['dia', (e) => { e.visao = 'calendario'; e.calendario.modo = 'dia'; }],
  ['semana', (e) => { e.visao = 'calendario'; e.calendario.modo = 'semana'; }],
  ['mês', (e) => { e.visao = 'calendario'; e.calendario.modo = 'mes'; }],
  ['ano', (e) => { e.visao = 'calendario'; e.calendario.modo = 'ano'; }],
  ['kanban', (e) => { e.visao = 'kanban'; e.listaId = ''; e.automatica = 'todos'; }],
];
let combinacoes = 0;
for (const largura of [320, 390, 1024, 1900]) {
  const p = await abrirPagina(largura, largura > 1500 ? 940 : 844);
  await p.evaluate((v) => { localStorage.setItem('cicluz-agenda-v1', v); }, exemplo(await hojeDe(p)));
  await p.reload();
  await p.waitForFunction(() => window.CicluzAgenda && window.CicluzAgendaKanban);
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.dispatchEvent(new Event('cicluz-close-menu')); });
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    for (const [nome, preparar] of [...estados, ['diálogo', null]]) {
      if (preparar) await p.evaluate(`(${preparar.toString()})(CicluzAgenda.estado); CicluzAgenda.abrir()`);
      else await p.evaluate(() => { CicluzAgenda.estado.visao = 'listas'; CicluzAgenda.abrir(); CicluzAgenda.editar('i4'); });
      await p.waitForTimeout(150);
      const m = await p.evaluate(() => {
        const d = document.querySelector('dialog.agenda-dialog[open]');
        const v = d || document.querySelector('.view.show');
        const visivel = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
        // Nada pode passar da largura do conteúdo (exceto o Kanban, que rola por dentro).
        const corpo = document.querySelector('#agenda-view .compras-content');
        const limite = corpo.getBoundingClientRect().right + 1;
        const vazando = [...corpo.querySelectorAll('*')].filter((x) => !x.closest('.agenda-kanban') && visivel(x) && x.getBoundingClientRect().right > limite).length;
        return {
          id: document.querySelector('.view.show') && document.querySelector('.view.show').id,
          lateral: Math.max(document.documentElement.scrollWidth - innerWidth, d ? d.scrollWidth - d.clientWidth : 0),
          vazando: d ? 0 : vazando,
          cabecalho: visivel(v && v.querySelector(d ? 'h2' : '.head')),
          rodapes: v ? [...v.querySelectorAll('.people-bottom-header')].filter(visivel).length : 0,
        };
      });
      const rotulo = nome + ' ' + largura + 'px ' + (escuro ? 'escuro' : 'claro');
      ok(m.id === 'agenda-view', 'Agenda aberta: ' + rotulo);
      ok(m.lateral <= 0, 'Sem rolagem lateral: ' + rotulo + ' (' + m.lateral + 'px)');
      ok(m.vazando === 0, 'Nada passa da largura: ' + rotulo + ' (' + m.vazando + ')');
      ok(m.cabecalho, 'Cabeçalho visível: ' + rotulo);
      ok(m.rodapes === 1, 'Um rodapé: ' + rotulo + ' (' + m.rodapes + ')');
      if (!preparar) await p.keyboard.press('Escape');
      combinacoes++;
    }
  }
  await p.close();
}

await navegador.close();
servidor.close();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações da Agenda no navegador passaram (fluxo + ' + combinacoes + ' combinações de tela × largura × tema)');
