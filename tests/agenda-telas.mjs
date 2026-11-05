// Verificação de navegador da Agenda (Playwright + Chromium, isolado, sem dados reais).
// Rodar: node tests/agenda-telas.mjs (faz parte de npm run test:telas)
// 1) Fluxo pela interface: menu → lista, criar rápido, criar completo pelo "+", concluir, sinalizar,
//    subtarefas, validação, excluir, listas e calendário (mês, semana, dia, arrastar).
// 2) Matriz de layout: lista, mês, semana, dia e o diálogo em 320, 390 e 1024 px, claro e escuro:
//    sem erro de página, sem rolagem lateral, cabeçalho e um único rodapé visíveis.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };
const KEY = 'cicluz-agenda-v1';

async function abrirPagina(largura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 844 } });
  await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await pagina.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await pagina.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.CicluzAgenda && window.CicluzAgendaCalendario);
  return pagina;
}
const dialogo = (p) => p.locator('dialog.agenda-dialog[open]').last();
const dados = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const confirmar = (p) => dialogo(p).locator('.people-save-control').click();

/* ---------- 1) Fluxo pela interface ---------- */
{
  const p = await abrirPagina(1024);
  // Entrada pelo menu lateral: Agenda · Atividades → Gestão de Pessoas
  await p.locator('summary', { hasText: 'Agenda' }).first().click();
  await p.getByRole('button', { name: 'Gestão de Pessoas', exact: true }).click();
  ok(await p.locator('#agenda-view.show').count() === 1, 'O submenu abre a Agenda');
  ok((await p.locator('#agenda-view .head p').textContent()).includes('Gestão de Pessoas'), 'Caminho mostra a lista do submenu');
  ok(await dados(p) === null, 'Abrir a Agenda não grava nada');
  const autos = await p.locator('.agenda-automatica small').allTextContents();
  ok(autos.join('|') === 'Para hoje|Programados|Todos|Sinalizados|Atrasados|Concluídos', 'Seis listas automáticas, na ordem do protótipo');

  // Criação rápida: escrever e apertar Enter
  await p.locator('.agenda-nova-entrada').fill('ligar para o contador');
  await p.locator('.agenda-nova-entrada').press('Enter');
  let d = await dados(p);
  ok(d && d.itens.length === 1 && d.itens[0].titulo === 'ligar para o contador' && d.itens[0].listaId === 'lista-gestao-pessoas', 'Enter cria na lista do submenu, sem trocar as letras');
  ok(d.listas.map((l) => l.id).join() === 'lista-gestao-pessoas,lista-diretor-operacoes', 'Listas iniciais com ids fixos');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('agenda-nova-entrada')), 'O foco volta para a linha nova');

  // "Para hoje" + Enter já cria com a data de hoje
  await p.locator('.agenda-automatica', { hasText: 'Para hoje' }).click();
  await p.locator('.agenda-nova-entrada').fill('Conferir escala');
  await p.locator('.agenda-nova-entrada').press('Enter');
  d = await dados(p);
  const hoje = await p.evaluate(() => CicluzAgendaDominio.isoData(new Date()));
  ok(d.itens.find((i) => i.titulo === 'Conferir escala').data === hoje, 'Em "Para hoje", o novo já vem com a data de hoje');

  // "+" fixo do menu rápido abre o novo compromisso completo
  await p.locator('.agenda-automatica', { hasText: 'Todos' }).click();
  await p.locator('.view.show .people-add-control').click();
  ok(await dialogo(p).filter({ hasText: 'Novo compromisso' }).count() === 1, '"+" abre Novo compromisso');
  // Hora sem data: recusa com mensagem
  await dialogo(p).getByLabel('Título').fill('reunião com a equipe da loja');
  await dialogo(p).getByLabel('Hora').fill('09:30');
  await confirmar(p);
  ok((await dialogo(p).locator('.profiles-error').textContent()).includes('informe também a data'), 'Hora sem data é recusada');
  await p.evaluate(() => { const i = document.querySelector('dialog.agenda-dialog[open] input[data-date-native][aria-label="Data"]'); i.value = CicluzAgendaDominio.somarDias(CicluzAgendaDominio.isoData(new Date()), 2); i.dispatchEvent(new Event('change', { bubbles: true })); });
  await dialogo(p).locator('.compras-chip', { hasText: /^Alta$/ }).click();
  await dialogo(p).getByLabel('Etiquetas').fill('#Loja, estoque, loja');
  await dialogo(p).getByLabel('Responsável').selectOption({ index: 1 });
  await dialogo(p).getByLabel('Notas').fill('levar a planilha de horários');
  await dialogo(p).getByRole('button', { name: 'Adicionar subtarefa' }).click();
  await dialogo(p).getByLabel('Subtarefa 1', { exact: true }).fill('imprimir escala');
  await dialogo(p).getByLabel('Subtarefa 1', { exact: true }).press('Enter');
  await dialogo(p).getByLabel('Subtarefa 2', { exact: true }).fill('avisar a equipe');
  await dialogo(p).getByRole('button', { name: 'Adicionar subtarefa' }).click(); // linha em branco: não vira subtarefa
  await confirmar(p);
  ok(await p.locator('dialog.agenda-dialog[open]').count() === 0, 'O ✓ salva e fecha');
  d = await dados(p);
  const reuniao = d.itens.find((i) => i.titulo.startsWith('reunião'));
  ok(reuniao.titulo === 'reunião com a equipe da loja' && reuniao.notas === 'levar a planilha de horários', 'Título e notas guardados como digitados (sem maiúsculas automáticas)');
  ok(reuniao.hora === '09:30' && reuniao.prioridade === 'alta' && reuniao.responsavelId, 'Hora, prioridade e responsável (por id) salvos');
  ok(reuniao.etiquetas.join('|') === 'Loja|estoque', 'Etiquetas sem # e sem repetir');
  ok(reuniao.subtarefas.map((s) => s.titulo).join('|') === 'imprimir escala|avisar a equipe', 'Subtarefas na ordem, sem a linha em branco');

  // Linha: detalhes, abrir subtarefas, concluir uma subtarefa
  const linha = p.locator('.agenda-item', { hasText: 'reunião com a equipe' });
  ok((await linha.locator('.agenda-detalhes').textContent()).includes('0/2 subtarefas'), 'Linha mostra o progresso das subtarefas');
  await linha.getByRole('button', { name: 'Mostrar subtarefas' }).click();
  await p.locator('.agenda-item', { hasText: 'reunião com a equipe' }).getByRole('button', { name: 'Concluir imprimir escala' }).click();
  d = await dados(p);
  ok(d.itens.find((i) => i.id === reuniao.id).subtarefas[0].concluida, 'Concluir a subtarefa pela linha');
  ok((await p.locator('.agenda-item', { hasText: 'reunião com a equipe' }).locator('.agenda-detalhes').textContent()).includes('1/2'), 'Progresso atualizado');

  // Sinalizar e concluir pela linha
  await p.locator('.agenda-item', { hasText: 'ligar para o contador' }).getByRole('button', { name: 'Sinalizar' }).click();
  ok((await p.locator('.a-sinalizados b').textContent()) === '1', 'Bandeira conta em Sinalizados');
  await p.getByRole('button', { name: 'Concluir ligar para o contador' }).click();
  ok((await p.locator('.a-concluidos b').textContent()) === '1', 'Concluído conta em Concluídos');
  ok((await p.locator('.a-sinalizados b').textContent()) === '0', 'Concluído sai de Sinalizados');
  ok(await p.locator('.agenda-item', { hasText: 'ligar para o contador' }).count() === 0, 'Concluído sai de Todos');
  await p.locator('.agenda-automatica', { hasText: 'Concluídos' }).click();
  ok(await p.locator('.agenda-item.concluida', { hasText: 'ligar para o contador' }).count() === 1, 'Aparece em Concluídos, riscado');
  ok(await p.locator('.agenda-nova').count() === 0, 'Concluídos não tem linha de criar');
  await p.getByRole('button', { name: 'Reabrir ligar para o contador' }).click();
  ok((await p.locator('.a-concluidos b').textContent()) === '0', 'Reabrir volta para a lista');

  // Busca (sem acento, por etiqueta)
  await p.locator('.agenda-automatica', { hasText: 'Todos' }).click();
  await p.evaluate(() => { const b = document.querySelector('#agenda-view .compras-busca'); b.value = 'reuniao'; b.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await p.locator('#agenda-view .agenda-item').count() === 1, 'Busca sem acento acha "reunião"');
  await p.evaluate(() => { const b = document.querySelector('#agenda-view .compras-busca'); b.value = ''; b.dispatchEvent(new Event('input', { bubbles: true })); });

  // Outra lista e "Todas as listas"
  await p.getByRole('button', { name: 'Diretor de Operações', exact: true }).last().click();
  ok(await p.locator('#agenda-view .agenda-item').count() === 0, 'Diretor de Operações começa vazia');
  await p.getByRole('button', { name: 'Todas as listas' }).click();
  ok(await p.locator('#agenda-view .agenda-item').count() === 3, 'Todas as listas mostra tudo que está aberto');

  // Listas: criar, impedir excluir com compromisso
  await p.getByRole('button', { name: 'Editar listas' }).click();
  await dialogo(p).getByRole('button', { name: 'Nova lista' }).click();
  await dialogo(p).getByLabel('Nome').fill('Loja Centro');
  await confirmar(p);
  d = await dados(p);
  ok(d.listas.some((l) => l.nome === 'Loja Centro'), 'Nova lista criada');
  await dialogo(p).locator('.compras-linha', { hasText: 'Gestão de Pessoas' }).getByRole('button', { name: 'Excluir' }).click();
  ok((await p.locator('#compras-aviso').textContent()).includes('Mova ou exclua'), 'Lista com compromisso não é excluída');
  await dialogo(p).locator('.compras-linha', { hasText: 'Loja Centro' }).getByRole('button', { name: 'Excluir' }).click();
  ok(!(await dados(p)).listas.some((l) => l.nome === 'Loja Centro'), 'Lista vazia é excluída');
  await dialogo(p).locator('.people-cancel-control, .people-close-control').first().click().catch(() => p.keyboard.press('Escape'));
  if (await p.locator('dialog.agenda-dialog[open]').count()) await p.keyboard.press('Escape');

  // Calendário: mês com a pílula, dia escolhido embaixo, semana e dia
  await p.getByRole('button', { name: 'Calendário', exact: true }).click();
  ok(await p.locator('.agenda-mes-grade .agenda-mes-dia').count() === 42, 'Mês com 6 semanas');
  ok(await p.locator('.agenda-pilula', { hasText: 'reunião com a equipe' }).count() === 1, 'O compromisso aparece no dia do mês');
  const dia = reuniao.data;
  await p.locator('.agenda-mes-dia').filter({ has: p.locator('.agenda-pilula', { hasText: 'reunião' }) }).locator('.agenda-mes-numero').click();
  ok(await p.locator('.agenda-mes-dia.escolhido').count() === 1, 'Tocar no dia marca o dia escolhido');
  ok(await p.locator('#agenda-view .compras-secao .agenda-item', { hasText: 'reunião' }).count() === 1, 'O dia escolhido aparece embaixo da grade');
  // Arrastar para o dia seguinte (computador)
  const destino = await p.evaluate((x) => CicluzAgendaDominio.somarDias(x, 1), dia);
  await p.evaluate(({ id, data }) => {
    const pil = [...document.querySelectorAll('.agenda-pilula')].find((b) => b.textContent.includes('reunião'));
    const alvo = [...document.querySelectorAll('.agenda-mes-dia')].find((c) => c.querySelector('.agenda-mes-numero').getAttribute('aria-label').startsWith(CicluzAgendaDominio.tituloDia(data)));
    const dt = new DataTransfer();
    pil.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    alvo.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    alvo.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, { id: reuniao.id, data: destino });
  d = await dados(p);
  ok(d.itens.find((i) => i.id === reuniao.id).data === destino && d.itens.find((i) => i.id === reuniao.id).hora === '09:30', 'Arrastar muda o dia e mantém a hora');
  await p.locator('.compras-chip', { hasText: 'Semana' }).click();
  ok(await p.locator('.agenda-semana-dia').count() === 7, 'Semana com 7 dias');
  await p.locator('.agenda-semana-dia.hoje .agenda-semana-cab .agenda-icone-botao').click();
  ok(await dialogo(p).filter({ hasText: 'Novo compromisso' }).count() === 1, '"+" do dia abre Novo compromisso');
  ok(await dialogo(p).locator('input[data-date-native][aria-label="Data"]').inputValue() === hoje, 'Já vem com a data do dia');
  await p.keyboard.press('Escape');
  await p.locator('.compras-chip', { hasText: /^Dia$/ }).click();
  ok((await p.locator('.agenda-cal-titulo').textContent()).length > 5, 'Dia com título por extenso');

  // Excluir pelo diálogo
  await p.getByRole('button', { name: 'Lista', exact: true }).click();
  await p.locator('.agenda-linha-texto', { hasText: 'Conferir escala' }).click();
  await dialogo(p).getByRole('button', { name: 'Excluir compromisso' }).click();
  await confirmar(p);
  ok(!(await dados(p)).itens.some((i) => i.titulo === 'Conferir escala'), 'Excluir compromisso');
  ok(await p.locator('dialog.agenda-dialog[open]').count() === 0, 'Excluir fecha o diálogo do compromisso');

  // Dado ilegível: não grava por cima
  await p.evaluate((k) => localStorage.setItem(k, '{quebrado'), KEY);
  await p.reload();
  await p.waitForFunction(() => window.CicluzAgenda);
  const r = await p.evaluate(() => CicluzAgendaDados.criarRapido('teste', 'lista-gestao-pessoas'));
  ok(r.erro && await p.evaluate((k) => localStorage.getItem(k), KEY) === '{quebrado', 'Dado ilegível não é sobrescrito');
  await p.close();
}

/* ---------- 2) Matriz de layout ---------- */
const exemplo = (hoje) => JSON.stringify({ versao: 1, listas: [{ id: 'lista-gestao-pessoas', nome: 'Gestão de Pessoas', cor: '#7c3aed' }, { id: 'lista-diretor-operacoes', nome: 'Diretor de Operações', cor: '#2563eb' }],
  itens: [1, 2, 3, 4].map((n) => ({ id: 'i' + n, listaId: n % 2 ? 'lista-gestao-pessoas' : 'lista-diretor-operacoes', titulo: 'Compromisso de teste com um título bem comprido número ' + n, notas: 'Nota de teste', data: hoje, hora: n > 2 ? '1' + n + ':00' : '', prioridade: n === 1 ? 'muito-alta' : 'normal', sinalizado: n === 2, etiquetas: ['Etiqueta longa de teste'], responsavelId: 'u-rodrigo', subtarefas: [{ id: 's' + n, titulo: 'Subtarefa', concluida: false, concluidaEm: '' }], concluida: false, concluidaEm: '', criadoEm: '2026-11-01T10:00:00Z', criadoPor: '', atualizadoEm: '' })) });
const estados = [
  ['lista', (e) => { e.visao = 'lista'; e.automatica = 'todos'; e.abertos.add('i1'); }],
  ['mês', (e) => { e.visao = 'calendario'; e.calendario.modo = 'mes'; }],
  ['semana', (e) => { e.visao = 'calendario'; e.calendario.modo = 'semana'; }],
  ['dia', (e) => { e.visao = 'calendario'; e.calendario.modo = 'dia'; }],
];
let combinacoes = 0;
for (const largura of [320, 390, 1024]) {
  const p = await abrirPagina(largura);
  await p.evaluate((v) => { localStorage.setItem('cicluz-agenda-v1', v); }, exemplo(await p.evaluate(() => CicluzAgendaDominio.isoData(new Date()))));
  await p.reload();
  await p.waitForFunction(() => window.CicluzAgenda);
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.dispatchEvent(new Event('cicluz-close-menu')); });
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    for (const [nome, preparar] of [...estados, ['diálogo', null]]) {
      if (preparar) await p.evaluate(`(${preparar.toString()})(CicluzAgenda.estado); CicluzAgenda.abrir('')`);
      else { await p.evaluate(() => { CicluzAgenda.estado.visao = 'lista'; CicluzAgenda.abrir(''); CicluzAgenda.editar('i1'); }); }
      await p.waitForTimeout(150);
      const m = await p.evaluate(() => {
        const d = document.querySelector('dialog.agenda-dialog[open]');
        const v = d || document.querySelector('.view.show');
        const visivel = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
        const largo = d ? d.scrollWidth - d.clientWidth : 0;
        return {
          id: document.querySelector('.view.show') && document.querySelector('.view.show').id,
          lateral: Math.max(document.documentElement.scrollWidth - innerWidth, largo),
          cabecalho: visivel(v && v.querySelector(d ? 'h2' : '.head')),
          rodapes: v ? [...v.querySelectorAll('.people-bottom-header')].filter(visivel).length : 0,
        };
      });
      const rotulo = nome + ' ' + largura + 'px ' + (escuro ? 'escuro' : 'claro');
      ok(m.id === 'agenda-view', 'Agenda aberta: ' + rotulo);
      ok(m.lateral <= 0, 'Sem rolagem lateral: ' + rotulo + ' (' + m.lateral + 'px)');
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
