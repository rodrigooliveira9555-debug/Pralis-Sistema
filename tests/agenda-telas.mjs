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

// Mapa e busca de endereço simulados: o teste não acessa a internet.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const ENDERECO = { name: '', address: { road: 'Rua de Teste', house_number: '100', suburb: 'Centro', city: 'Juiz de Fora', state: 'Minas Gerais' } };
const PRACA = { latitude: -21.7616, longitude: -43.3496 };
async function abrirPagina(largura, altura = 844, sessao = SESSAO_LOCAL) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, geolocation: PRACA, permissions: ['geolocation'] });
  await contexto.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await contexto.route('https://nominatim.openstreetmap.org/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.startsWith('/reverse')) return r.fulfill({ status: 200, json: { ...ENDERECO, lat: u.searchParams.get('lat'), lon: u.searchParams.get('lon') } });
    return r.fulfill({ status: 200, json: [{ lat: '-21.7700', lon: '-43.3500', name: 'Padaria de Teste', address: { road: 'Avenida de Teste', house_number: '50', city: 'Juiz de Fora', state: 'Minas Gerais' } }] });
  });
  await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(sessao));
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
  // Entrada pelo menu lateral: Agenda · Atividades → Lançamentos (lista Diretor de Operações)
  await p.locator('summary', { hasText: 'Agenda' }).first().click();
  await p.getByRole('button', { name: 'Lançamentos', exact: true }).first().click();
  ok(await p.locator('#agenda-view.show').count() === 1, 'O submenu abre a Agenda');
  ok((await p.locator('.agenda-detalhe-titulo').textContent()).startsWith('Diretor de Operações'), 'Abre já na lista do submenu');
  ok(await dados(p) === null, 'Abrir a Agenda não grava nada');
  ok((await p.locator('.agenda-automatica small').allTextContents()).join('|') === 'Para hoje|Programados|Todos|Sinalizados|Atrasados|Atribuídos a mim|Concluídos', 'Listas automáticas do Lembretes + Atrasados');
  ok(await p.locator('.agenda-lateral').isVisible() && await p.locator('.agenda-conteudo').isVisible(), 'Computador: listas e conteúdo lado a lado');
  ok(!(await p.locator('.agenda-voltar-listas').isVisible()), 'Computador: sem "‹ Listas"');

  // Escrever do jeito que se fala (na lista Gestão de Pessoas; o menu abre em Diretor de Operações desde 05/11)
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();
  await p.locator('.agenda-nova-entrada').fill('ligar para o contador amanhã às 10 #financeiro !');
  ok((await p.locator('.agenda-nova-dica').textContent()).includes('Amanhã às 10:00'), 'A linha nova mostra o que vai entender');
  await p.locator('.agenda-nova-entrada').press('Enter');
  let i = await item(p, 'ligar para o contador');
  const amanha = await somar(p, hoje, 1);
  ok(i && i.data === amanha && i.hora === '10:00' && i.etiquetas[0] === 'financeiro' && i.prioridade === 'alta' && i.listaId === 'lista-gestao-pessoas', '"amanhã às 10 #financeiro !" vira data, hora, etiqueta e prioridade, sem trocar as letras');
  ok(i.alerta === 0, 'Com data, avisa na hora');
  ok(await p.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('agenda-nova-entrada'), null, { timeout: 2000 }).then(() => true, () => false), 'O foco volta para a linha nova');
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
  await dialogo(p).getByLabel('Endereço', { exact: true }).fill('Loja Centro');
  ok(await dialogo(p).getByLabel('Endereço', { exact: true }).inputValue() === 'Loja Centro', 'Endereço pode ser escrito sem marcar no mapa');
  await confirmar(p);
  ok((await dialogo(p).locator('.profiles-error').textContent()).includes('http'), 'URL sem http é recusada');
  await dialogo(p).getByLabel('Endereço na internet (URL)').fill('https://cicluz.com.br');
  ok(await dialogo(p).locator('input[data-date-native][aria-label="Data"]').inputValue() === hoje, 'Em "Para hoje", o + já vem com a data de hoje');
  await dialogo(p).locator('.compras-chip', { hasText: /^Alta$/ }).click();
  await dialogo(p).getByLabel('Adicionar pessoa').selectOption('u-rodrigo');
  await dialogo(p).getByRole('button', { name: 'Adicionar como responsável' }).click();
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

  // Local no mapa: tocar marca e preenche o endereço; Ao entrar com raio; procurar; Atual; aviso ao cruzar o raio
  await p.getByRole('button', { name: 'Listas', exact: true }).click();
  await p.locator('.view.show .people-add-control').click();
  await dialogo(p).getByLabel('Título').fill('Buscar encomenda');
  await p.waitForFunction(() => document.querySelector('dialog.agenda-dialog[open] .agenda-mapa .leaflet-tile-pane'));
  ok((await dialogo(p).locator('.agenda-mapa-botao small').allTextContents()).join('|') === 'Atual|Ao entrar|Ao sair|Personalizada', 'Botões do protótipo: Atual, Ao entrar, Ao sair, Personalizada');
  const mapaCaixa = dialogo(p).locator('.agenda-mapa');
  await mapaCaixa.scrollIntoViewIfNeeded();
  const bm = await mapaCaixa.boundingBox();
  await p.mouse.click(bm.x + bm.width / 2, bm.y + bm.height / 2);
  await p.waitForFunction(() => document.querySelector('dialog.agenda-dialog[open] input[aria-label="Endereço"]').value.includes('Rua de Teste'));
  ok(await dialogo(p).getByLabel('Endereço', { exact: true }).inputValue() === 'Rua de Teste, 100 - Centro - Juiz de Fora - Minas Gerais', 'Tocar no mapa preenche o endereço');
  ok(await dialogo(p).locator('.agenda-mapa-pino').count() === 1, 'Pino no ponto tocado');
  await dialogo(p).locator('.agenda-mapa-botao[data-modo="entrar"]').click();
  ok(await dialogo(p).locator('path.leaflet-interactive').count() === 1 && await dialogo(p).getByLabel('Raio do aviso').isVisible(), 'Ao entrar desenha o raio e mostra o tamanho');
  await dialogo(p).getByLabel('Raio do aviso').selectOption('500');
  await confirmar(p);
  i = await item(p, 'Buscar encomenda');
  ok(Number.isFinite(i.localizacao.lat) && i.localizacao.aviso === 'entrar' && i.localizacao.raio === 500 && i.local.startsWith('Rua de Teste'), 'Ponto, aviso, raio e endereço salvos');
  ok((await p.locator('.agenda-item', { hasText: 'Buscar encomenda' }).locator('.agenda-detalhes').textContent()).includes('ao entrar'), 'A linha mostra o aviso por lugar');
  // Procurar e Atual
  await p.locator('.agenda-linha-texto', { hasText: 'Buscar encomenda' }).click();
  await p.waitForFunction(() => document.querySelector('dialog.agenda-dialog[open] .agenda-mapa .leaflet-tile-pane'));
  await dialogo(p).locator('.agenda-mapa-botao[data-modo="personalizada"]').click();
  await dialogo(p).getByLabel('Procurar endereço ou lugar').fill('padaria teste');
  await dialogo(p).getByRole('button', { name: 'Procurar' }).click();
  await dialogo(p).locator('.agenda-mapa-resultado', { hasText: 'Padaria de Teste' }).click();
  ok((await dialogo(p).getByLabel('Endereço', { exact: true }).inputValue()).startsWith('Padaria de Teste - Avenida de Teste, 50'), 'Escolher um resultado preenche o endereço');
  await dialogo(p).locator('.agenda-mapa-botao[data-modo="atual"]').click();
  await p.waitForFunction(() => document.querySelector('dialog.agenda-dialog[open] input[aria-label="Endereço"]').value.includes('Rua de Teste'));
  await confirmar(p);
  i = await item(p, 'Buscar encomenda');
  ok(Math.abs(i.localizacao.lat - PRACA.latitude) < 1e-6 && Math.abs(i.localizacao.lng - PRACA.longitude) < 1e-6, '"Atual" marca a posição do aparelho');
  // Aviso ao cruzar o raio (posição simulada; a primeira leitura não dispara)
  await p.evaluate(() => { document.querySelectorAll('.agenda-alerta').forEach((a) => a.remove()); document.body.classList.remove('sem-alertas'); });
  ok(await p.evaluate(() => CicluzAgendaAlertas.posicao({ lat: -21.80, lng: -43.3496 })) === 0, 'Primeira leitura fora: não avisa');
  ok(await p.evaluate((x) => CicluzAgendaAlertas.posicao(x), { lat: PRACA.latitude, lng: PRACA.longitude }) === 1, 'Entrou no raio: avisa');
  ok(await p.locator('.agenda-alerta', { hasText: 'Você chegou' }).count() === 1, 'Alerta "Você chegou"');
  for (const b of await p.locator('.agenda-alerta').getByRole('button', { name: 'Fechar' }).all()) await b.click();
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

/* ---------- Mapa mental ---------- */
{
  const p = await abrirPagina(1400, 940);
  const hoje = await hojeDe(p);
  await p.evaluate((h) => {
    const A = CicluzAgendaDados;
    A.salvarItem('', { titulo: 'Entrevista de candidato', listaId: 'lista-gestao-pessoas', data: h, hora: '14:00' });
    A.salvarItem('', { titulo: 'Conferir câmara fria', listaId: 'lista-diretor-operacoes', data: h, prioridade: 'muito-alta', sinalizado: true });
    A.salvarItem('', { titulo: 'Pagar fornecedores', listaId: 'lista-diretor-operacoes' });
    A.salvarItem('', { titulo: 'Pensar na campanha', listaId: 'lista-gestao-pessoas', notas: 'vitrine', subtarefas: [{ titulo: 'Rascunho' }] });
    document.dispatchEvent(new Event('cicluz-close-menu'));
    CicluzAgenda.abrir('');
  }, hoje);
  await p.getByRole('button', { name: 'Mapa mental', exact: true }).click();
  const no = (t) => p.locator('.agenda-mm-no', { hasText: t }).first();
  ok(await p.locator('.agenda-mm-no.tipo-grupo').count() === 2 && await p.locator('.agenda-mm-no.tipo-item').count() === 4 && await p.locator('.agenda-mm-no.tipo-sub').count() === 1, 'Raiz → listas → compromissos → subtarefas');
  ok(await p.locator('.agenda-mm-tela').getAttribute('role') === 'tree' && await no('Pagar fornecedores').getAttribute('role') === 'treeitem', 'Mapa acessível como árvore');
  const lados = await p.evaluate(() => [...document.querySelectorAll('.agenda-mm-no.tipo-grupo')].map((g) => g.getBoundingClientRect().x > document.querySelector('.agenda-mm-no.tipo-raiz').getBoundingClientRect().x));
  ok(lados.includes(true) && lados.includes(false), 'Estrutura Mapa: um grupo de cada lado');
  // Tab = subtópico, Enter = tópico (entende data), F2 = renomear, Espaço = concluir
  await no('Entrevista de candidato').click();
  await p.keyboard.press('Tab');
  await p.locator('.agenda-mm-edicao').fill('separar currículo');
  await p.keyboard.press('Enter');
  ok((await item(p, 'Entrevista de candidato')).subtarefas[0].titulo === 'separar currículo', 'Tab cria subtarefa');
  ok(await no('separar currículo').getAttribute('aria-selected') === 'true', 'O tópico novo fica escolhido');
  await no('Entrevista de candidato').click();
  await p.keyboard.press('Enter');
  await p.locator('.agenda-mm-edicao').fill('Ligar para referências amanhã às 9');
  await p.keyboard.press('Enter');
  let i = await item(p, 'Ligar para referências');
  ok(i && i.listaId === 'lista-gestao-pessoas' && i.data === await somar(p, hoje, 1) && i.hora === '09:00', 'Enter cria compromisso no mesmo grupo, entendendo "amanhã às 9"');
  await no('Ligar para referências').click();
  await p.keyboard.press('F2');
  await p.locator('.agenda-mm-edicao').fill('Ligar para as referências');
  await p.keyboard.press('Enter');
  ok(await item(p, 'Ligar para as referências'), 'F2 renomeia');
  await no('Ligar para as referências').click();
  await p.keyboard.press(' ');
  ok((await item(p, 'Ligar para as referências')).concluida, 'Espaço conclui');
  ok(await no('Ligar para as referências').count() === 0, 'Concluído some (sem "Concluídos")');
  await p.locator('.agenda-mm-chips').getByRole('button', { name: 'Concluídos' }).click();
  ok(await no('Ligar para as referências').count() === 1, '"Concluídos" mostra os concluídos');
  // Setas andam pela árvore
  await no('Pagar fornecedores').click();
  await p.keyboard.press('ArrowUp');
  ok(await no('Conferir câmara fria').getAttribute('aria-selected') === 'true', 'Seta para cima: irmão anterior');
  // Arrastar para outro grupo muda a lista
  const a = await no('Pensar na campanha').boundingBox();
  const b = await p.locator('.agenda-mm-no.tipo-grupo', { hasText: 'Diretor de Operações' }).boundingBox();
  await p.mouse.move(a.x + 20, a.y + 10); await p.mouse.down(); await p.mouse.move(a.x + 60, a.y + 40, { steps: 5 }); await p.mouse.move(b.x + 20, b.y + 10, { steps: 10 }); await p.mouse.up();
  ok((await item(p, 'Pensar na campanha')).listaId === 'lista-diretor-operacoes', 'Arrastar para outro grupo muda a lista');
  // Arrastar subtarefa para outro compromisso (antes, ajusta o mapa à tela)
  await p.getByRole('button', { name: 'Ajustar à tela' }).click();
  const sa = await no('Rascunho').boundingBox();
  const sb = await no('Pagar fornecedores').boundingBox();
  await p.mouse.move(sa.x + 15, sa.y + 8); await p.mouse.down(); await p.mouse.move(sa.x + 50, sa.y + 40, { steps: 5 }); await p.mouse.move(sb.x + 30, sb.y + 12, { steps: 10 }); await p.mouse.up();
  ok((await item(p, 'Pagar fornecedores')).subtarefas.some((x) => x.titulo === 'Rascunho') && !(await item(p, 'Pensar na campanha')).subtarefas.length, 'Arrastar subtarefa leva para outro compromisso');
  // Relação com nome
  await no('Conferir câmara fria').click();
  await p.locator('.agenda-mm-acoes').getByRole('button', { name: 'Relação' }).click();
  await no('Pagar fornecedores').click();
  ok((await dados(p)).relacoes.length === 1 && await p.locator('path.agenda-mm-relacao').count() === 1, 'Relação desenhada entre os compromissos');
  await p.locator('.agenda-mm-acoes').getByRole('button', { name: 'Dar nome' }).click();
  await dialogo(p).getByLabel('Nome', { exact: true }).fill('antes de');
  await confirmar(p);
  ok((await dados(p)).relacoes[0].rotulo === 'antes de' && (await p.locator('.agenda-mm-svg').textContent()).includes('antes de'), 'Relação com nome');
  // Focar ramo, recolher, busca
  await p.locator('.agenda-mm-no.tipo-grupo', { hasText: 'Diretor de Operações' }).click();
  await p.locator('.agenda-mm-acoes').getByRole('button', { name: 'Focar' }).click();
  ok(await p.locator('.agenda-mm-no.tipo-raiz').count() === 0 && await no('Entrevista').count() === 0, 'Focar mostra só o ramo');
  await p.locator('.agenda-mm-acoes').getByRole('button', { name: 'Mapa inteiro' }).click();
  await p.locator('.agenda-mm-no.tipo-grupo', { hasText: 'Gestão de Pessoas' }).click();
  await p.keyboard.press('Control+/');
  ok(await no('Entrevista de candidato').count() === 0, 'Ctrl+/ recolhe o ramo');
  await p.locator('.agenda-mm-barra').getByLabel('Procurar').fill('entrevista');
  ok(await no('Entrevista de candidato').count() === 1 && (await p.locator('.agenda-mm-status').textContent()).includes('1 encontrado'), 'Busca mostra e destaca, mesmo recolhido');
  await p.locator('.agenda-mm-barra').getByLabel('Procurar').fill('');
  await p.locator('.agenda-mm-chips').getByRole('button', { name: 'Expandir tudo' }).click();
  // Estruturas e agrupamentos
  for (const e of ['logico', 'organograma', 'arvore', 'linha']) {
    await p.locator('.agenda-mm-barra').getByLabel('Estrutura').selectOption(e);
    ok(await p.locator('.agenda-mm-no.tipo-item').count() >= 4, 'Estrutura ' + e + ' desenha os compromissos');
  }
  await p.locator('.agenda-mm-barra').getByLabel('Agrupar por').selectOption('data');
  ok((await p.locator('.agenda-mm-no.tipo-grupo').allTextContents()).join('|').includes('Hoje'), 'Agrupar por data');
  // Arrastar para "Amanhã" muda a data
  const c = await no('Pagar fornecedores').boundingBox();
  const d2 = await p.locator('.agenda-mm-no.tipo-grupo', { hasText: 'Amanhã' }).boundingBox();
  await p.mouse.move(c.x + 20, c.y + 10); await p.mouse.down(); await p.mouse.move(c.x + 60, c.y + 40, { steps: 5 }); await p.mouse.move(d2.x + 15, d2.y + 10, { steps: 10 }); await p.mouse.up();
  ok((await item(p, 'Pagar fornecedores')).data === await somar(p, hoje, 1), 'Arrastar para "Amanhã" muda a data');
  await p.locator('.agenda-mm-barra').getByLabel('Agrupar por').selectOption('prioridade');
  ok((await p.locator('.agenda-mm-no.tipo-grupo').allTextContents()).some((t) => t.includes('Prioridade muito alta')), 'Agrupar por prioridade');
  await p.locator('.agenda-mm-barra').getByLabel('Agrupar por').selectOption('lista');
  await p.locator('.agenda-mm-barra').getByLabel('Estrutura').selectOption('mapa');
  // Exportar
  for (const [botaoTxt, ext] of [['PNG', '.png'], ['SVG', '.svg'], ['Tópicos (.md)', '.md']]) {
    const espera = p.waitForEvent('download');
    await p.locator('.agenda-mm-chips').getByRole('button', { name: botaoTxt, exact: true }).click();
    const baixado = await espera;
    ok(baixado.suggestedFilename().endsWith(ext), 'Exporta ' + ext);
    if (ext === '.md') { const caminho = await baixado.path(); const texto = (await import('node:fs')).readFileSync(caminho, 'utf8'); ok(texto.includes('## Gestão de Pessoas') && texto.includes('- [ ] Entrevista de candidato'), 'Tópicos em texto'); }
  }
  // Duplo toque abre o compromisso
  await no('Entrevista de candidato').dblclick();
  ok(await dialogo(p).filter({ hasText: 'Editar compromisso' }).count() === 1, 'Dois toques abrem o compromisso');
  await p.keyboard.press('Escape');
  await p.close();
}

/* ---------- Chat e arquivos (API simulada em memória; a real é testada no servidor) ---------- */
{
  const p = await abrirPagina(1280, 900, { ...SESSAO_LOCAL, perfil: { ...SESSAO_LOCAL.perfil, usuarioId: 'u-jose', nome: 'José · Compras' } });
  const mensagens = [];
  const arquivos = [];
  let naoLidas = {};
  await p.route('**/api/agenda/**', async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const caminho = u.pathname.replace(/^\/api/, '');
    const m = /^\/agenda\/compromissos\/([^/]+)\/(mensagens|arquivos|leitura)$/.exec(caminho);
    if (caminho === '/agenda/chat/nao-lidas') return r.fulfill({ json: { ok: true, data: { naoLidas } } });
    if (m && m[2] === 'mensagens' && req.method() === 'GET') {
      const depois = u.searchParams.get('depois');
      return r.fulfill({ json: { ok: true, data: { mensagens: mensagens.filter((x) => !depois || x.criadoEm > depois) } } });
    }
    if (m && m[2] === 'mensagens') { const x = { id: 'm' + mensagens.length, autorId: 'u-jose', autorNome: 'José', texto: JSON.parse(req.postData()).texto.trim(), criadoEm: new Date(Date.now() + mensagens.length).toISOString() }; mensagens.push(x); return r.fulfill({ status: 201, json: { ok: true, data: x } }); }
    if (m && m[2] === 'leitura') { naoLidas = {}; return r.fulfill({ json: { ok: true, data: {} } }); }
    if (m && m[2] === 'arquivos' && req.method() === 'GET') return r.fulfill({ json: { ok: true, data: { arquivos } } });
    if (m && m[2] === 'arquivos') {
      const corpo = JSON.parse(req.postData());
      const a = { id: '00000000-0000-4000-8000-00000000000' + arquivos.length, nome: corpo.nome, tipo: corpo.nome.endsWith('.png') ? 'image/png' : 'application/pdf', tamanho: Buffer.from(corpo.conteudoBase64, 'base64').length, papel: 'material', enviadoPor: 'u-jose', enviadoPorNome: 'José', criadoEm: new Date().toISOString(), podeExcluir: true };
      arquivos.push(a);
      return r.fulfill({ status: 201, json: { ok: true, data: a } });
    }
    const arq = /^\/agenda\/arquivos\/(.+)$/.exec(caminho);
    if (arq && req.method() === 'DELETE') { arquivos.splice(arquivos.findIndex((x) => x.id === arq[1]), 1); return r.fulfill({ json: { ok: true, data: {} } }); }
    if (arq) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    return r.fulfill({ status: 404, json: { title: 'não simulado' } });
  });
  const id = await p.evaluate(() => {
    const r = CicluzAgendaDados.salvarItem('', { titulo: 'Fechar o caixa', listaId: 'lista-gestao-pessoas' });
    document.dispatchEvent(new Event('cicluz-close-menu'));
    CicluzAgenda.abrir('');
    return r.id;
  });
  // Não lidas aparecem na linha do compromisso
  naoLidas = { [id]: 2 };
  await p.evaluate(() => CicluzAgendaConversa.atualizarNaoLidas(true));
  await p.waitForFunction(() => document.querySelector('.agenda-chat-novas'));
  ok((await p.locator('.agenda-item', { hasText: 'Fechar o caixa' }).locator('.agenda-chat-novas').textContent()).includes('2 mensagens novas'), 'A linha mostra as mensagens novas');
  // Chat: enviar com Enter; mensagem de outra pessoa chega sozinha (a cada 5 s)
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa' }).click();
  await dialogo(p).getByRole('button', { name: 'Abrir chat (2 novas)' }).click();
  const chat = p.locator('dialog.agenda-chat-dialog[open]');
  await chat.locator('.compras-vazio').waitFor();
  await chat.getByLabel('Mensagem', { exact: true }).fill('pode fechar às 18h?');
  await chat.getByLabel('Mensagem', { exact: true }).press('Enter');
  await chat.locator('.agenda-chat-msg.minha', { hasText: 'pode fechar às 18h?' }).waitFor();
  ok(mensagens.length === 1 && mensagens[0].texto === 'pode fechar às 18h?', 'Enter envia a mensagem');
  mensagens.push({ id: 'm-ana', autorId: 'u-ana', autorNome: 'Ana · Estoque', texto: 'Combinado!', criadoEm: new Date(Date.now() + 1000).toISOString() });
  await chat.locator('.agenda-chat-msg:not(.minha)', { hasText: 'Combinado!' }).waitFor({ timeout: 8000 });
  ok((await chat.locator('.agenda-chat-msg:not(.minha) .agenda-chat-autor').textContent()) === 'Ana · Estoque', 'Mensagem de outra pessoa chega sozinha, com o nome');
  ok(Object.keys(naoLidas).length === 0, 'Abrir o chat marca como lido');
  await chat.locator('.people-close-control, .people-cancel-control').first().click().catch(() => p.keyboard.press('Escape'));
  if (await chat.count()) await p.keyboard.press('Escape');
  // Arquivos: enviar, ver, excluir
  await dialogo(p).locator('.agenda-conversa input[type=file]').setInputFiles([{ name: 'foto.png', mimeType: 'image/png', buffer: PNG }, { name: 'nota.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }]);
  await dialogo(p).locator('.agenda-arquivo', { hasText: 'nota.pdf' }).waitFor();
  ok(arquivos.length === 2 && await dialogo(p).locator('.agenda-arquivo-miniatura').count() === 1, 'Envia vários arquivos; imagem com miniatura');
  ok((await dialogo(p).locator('.agenda-arquivo', { hasText: 'foto.png' }).getByRole('link', { name: 'foto.png' }).getAttribute('href')).startsWith('/api/agenda/arquivos/'), 'Nome abre o arquivo');
  await dialogo(p).locator('.agenda-arquivo', { hasText: 'foto.png' }).getByRole('button', { name: 'Excluir' }).click();
  await confirmar(p);
  await p.waitForFunction(() => !document.querySelector('dialog.agenda-dialog[open] .agenda-arquivo-miniatura'));
  ok(arquivos.length === 1, 'Excluir arquivo');
  const grande = Buffer.alloc(10 * 1024 * 1024 + 1);
  await dialogo(p).locator('.agenda-conversa input[type=file]').setInputFiles([{ name: 'enorme.png', mimeType: 'image/png', buffer: grande }]);
  ok((await dialogo(p).locator('.agenda-conversa [role=status]').textContent()).includes('passa de 10 MB') && arquivos.length === 1, 'Arquivo acima de 10 MB nem é enviado');
  await p.keyboard.press('Escape');
  await p.close();
}
{
  // Sem login (revisão local): explica que precisa do servidor
  const p = await abrirPagina(1024);
  await p.evaluate(() => { const r = CicluzAgendaDados.salvarItem('', { titulo: 'Sem servidor', listaId: 'lista-gestao-pessoas' }); document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); CicluzAgenda.editar(r.id); });
  ok((await dialogo(p).locator('.agenda-conversa').textContent()).includes('entre com seu usuário'), 'Sem login: chat e arquivos explicam que precisam do servidor');
  await p.close();
}

{
  // API publicada antes do chat (rota inexistente: 404 genérico): aviso claro e para de perguntar
  const p = await abrirPagina(1024, 844, { ...SESSAO_LOCAL, perfil: { ...SESSAO_LOCAL.perfil, usuarioId: 'u-jose', nome: 'José · Compras' } });
  let pedidos = 0;
  await p.route('**/api/agenda/**', (r) => { pedidos++; return r.fulfill({ status: 404, json: { type: 'about:blank', title: 'Não encontrado', status: 404, code: 'NOT_FOUND' } }); });
  await p.evaluate(() => { const r = CicluzAgendaDados.salvarItem('', { titulo: 'API antiga', listaId: 'lista-gestao-pessoas' }); document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); CicluzAgenda.editar(r.id); });
  await p.waitForFunction(() => (document.querySelector('dialog.agenda-dialog[open] .agenda-conversa [role=status]') || {}).textContent);
  ok((await dialogo(p).locator('.agenda-conversa [role=status]').textContent()).includes('a API precisa ser atualizada'), 'API antiga: arquivos explicam que o servidor precisa ser atualizado');
  ok(!(await dialogo(p).getByRole('button', { name: 'Adicionar arquivos' }).isVisible()), 'API antiga: não oferece enviar arquivo');
  await dialogo(p).getByRole('button', { name: 'Abrir chat' }).click();
  const chat = p.locator('dialog.agenda-chat-dialog[open]');
  await chat.locator('.agenda-chat-estado', { hasText: 'a API precisa ser atualizada' }).waitFor();
  const antes = pedidos;
  await p.waitForTimeout(6000);
  ok(pedidos === antes && await chat.getByLabel('Mensagem', { exact: true }).isDisabled(), 'API antiga: o chat avisa e para de perguntar a cada 5 s');
  await p.close();
}

/* ---------- Pessoas, permissões e avaliação (usuários da lista provisória) ---------- */
{
  const sessao = (id, nome) => ({ ...SESSAO_LOCAL, perfil: { ...SESSAO_LOCAL.perfil, usuarioId: id, nome } });
  // Um aparelho por pessoa, com o mesmo dado (o documento sincronizado).
  let documento = null;
  async function como(id, nome) {
    const p = await abrirPagina(1280, 900, sessao(id, nome));
    if (documento) { await p.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, documento]); await p.reload(); await p.waitForFunction(() => window.CicluzAgenda); }
    await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); });
    return p;
  }
  const guardar = async (p) => { documento = await p.evaluate((k) => localStorage.getItem(k), KEY); await p.close(); };

  // José (gestor) cria: Rodrigo responsável só com ver+concluir; Ana responsável padrão; avaliação em estrelas
  let p = await como('u-jose', 'José · Compras');
  await p.locator('.view.show .people-add-control').click();
  await dialogo(p).getByLabel('Título').fill('Fechar o caixa');
  ok((await dialogo(p).locator('.agenda-pessoas .profiles-note').first().textContent()).includes('Gestor: José · Compras'), 'Gestor é quem cria');
  await dialogo(p).getByLabel('Adicionar pessoa').selectOption('u-rodrigo');
  await dialogo(p).getByRole('button', { name: 'Adicionar como responsável' }).click();
  await dialogo(p).getByLabel('Adicionar pessoa').selectOption('u-ana');
  await dialogo(p).getByRole('button', { name: 'Adicionar como responsável' }).click();
  await dialogo(p).getByRole('group', { name: 'Permissões de Rodrigo · Gerência' }).getByRole('button', { name: 'Editar' }).click();
  await dialogo(p).getByLabel('Tipo de avaliação').selectOption('estrelas');
  await confirmar(p);
  let t = await item(p, 'Fechar o caixa');
  ok(t.criadoPor === 'u-jose' && t.pessoas.length === 2 && t.pessoas.every((x) => x.responsavel), 'Dois responsáveis');
  ok(!t.pessoas[0].editar && t.pessoas[0].concluir && t.pessoas[1].editar, 'Permissões por pessoa');
  ok((await p.locator('.agenda-item', { hasText: 'Fechar o caixa' }).locator('.agenda-detalhes').textContent()).includes('Rodrigo · Gerência, Ana · Estoque'), 'A linha mostra os responsáveis');
  await guardar(p);

  // Quem não participa não vê
  p = await como('u-outro', 'Pessoa de fora');
  ok(!(await p.evaluate(() => CicluzAgendaDados.visiveis().some((i) => i.titulo === 'Fechar o caixa'))) && await p.locator('.agenda-item', { hasText: 'Fechar o caixa' }).count() === 0, 'Quem não participa não vê');
  ok(await p.evaluate(() => CicluzAgendaDados.alternarConcluida(CicluzAgendaDados.dados.itens.find((i) => i.titulo === 'Fechar o caixa').id)) === '', 'Nem consegue concluir por fora da tela');
  await p.close();

  // Rodrigo: vê, não edita (só leitura), conclui; aparece em Atribuídos a mim
  p = await como('u-rodrigo', 'Rodrigo · Gerência');
  ok((await p.locator('.a-atribuidos b').textContent()) === '1', 'Atribuídos a mim conta o compromisso do responsável');
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa' }).click();
  ok(await dialogo(p).filter({ hasText: 'editar é com o gestor' }).count() === 1 && await dialogo(p).getByLabel('Título').isDisabled(), 'Sem "Editar": abre só para leitura');
  ok(await dialogo(p).getByRole('button', { name: 'Excluir compromisso' }).count() === 0, 'Sem "Excluir": não aparece o botão');
  await p.keyboard.press('Escape');
  ok(await p.evaluate(() => CicluzAgendaDados.salvarItem(CicluzAgendaDados.dados.itens.find((i) => i.titulo === 'Fechar o caixa').id, { titulo: 'mudado', listaId: 'lista-gestao-pessoas' }).erro) === 'Você não tem permissão para editar este compromisso.', 'Editar é barrado também por fora da tela');
  await p.getByRole('button', { name: 'Concluir Fechar o caixa' }).click();
  t = await item(p, 'Fechar o caixa');
  ok(t.concluida, 'Com "Concluir", o responsável conclui');
  // Autoavaliação do Rodrigo (depois de concluído; não vê a do gestor)
  await p.locator('.agenda-automatica', { hasText: 'Concluídos' }).click();
  ok((await p.locator('.agenda-item', { hasText: 'Fechar o caixa' }).locator('.agenda-detalhes').textContent()).includes('Avaliação pendente'), 'Concluído com avaliação pendente');
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa' }).click();
  const painelR = dialogo(p).locator('.agenda-avaliacao-painel');
  ok(await painelR.locator('.agenda-avaliacao-cartao').count() === 1 && (await painelR.textContent()).includes('Sua autoavaliação') && !(await painelR.textContent()).includes('Avaliação do gestor'), 'O responsável vê só a própria autoavaliação');
  await painelR.getByRole('button', { name: '★★★★★', exact: true }).click();
  await painelR.getByLabel('Comentário da avaliação').fill('fiz tudo no horário');
  await painelR.getByRole('button', { name: 'Registrar avaliação' }).click();
  ok((await dialogo(p).textContent()).includes('não muda'), 'Confirma avisando que não muda');
  await confirmar(p);
  ok((await painelR.textContent()).includes('★★★★★ (5/5)') && (await painelR.textContent()).includes('fiz tudo no horário'), 'Autoavaliação registrada');
  ok(await painelR.getByRole('button', { name: 'Registrar avaliação' }).count() === 0, 'Depois de registrada, não há como mudar');
  ok(await p.evaluate(() => CicluzAgendaDados.avaliar(CicluzAgendaDados.dados.itens.find((i) => i.titulo === 'Fechar o caixa').id, 'u-rodrigo', 1).erro) === 'Avaliação já registrada; ela não muda.', 'Nem por fora da tela');
  ok(await p.evaluate(() => CicluzAgendaDados.avaliar(CicluzAgendaDados.dados.itens.find((i) => i.titulo === 'Fechar o caixa').id, 'u-ana', 3).erro) === 'Só o gestor e o próprio responsável avaliam.', 'Um responsável não avalia o outro');
  await p.keyboard.press('Escape');
  await guardar(p);

  // José: avalia a execução do Rodrigo e vê a comparação
  p = await como('u-jose', 'José · Compras');
  await p.locator('.agenda-automatica', { hasText: 'Concluídos' }).click();
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa' }).click();
  const cartaoR = dialogo(p).locator('.agenda-avaliacao-cartao', { hasText: 'Execução de Rodrigo' });
  ok((await cartaoR.textContent()).includes('Autoavaliação★★★★★ (5/5)'), 'O gestor vê a autoavaliação');
  await cartaoR.getByRole('button', { name: '★★★', exact: true }).click();
  await cartaoR.getByRole('button', { name: 'Registrar avaliação' }).click();
  await confirmar(p);
  ok((await cartaoR.textContent()).includes('Avaliação do gestor★★★☆☆ (3/5)') && (await cartaoR.textContent()).includes('★★★★★ (5/5)'), 'Comparação: gestor 3 × autoavaliação 5');
  ok(await dialogo(p).getByLabel('Tipo de avaliação').isDisabled(), 'Com nota registrada, o tipo de avaliação não muda');
  await p.keyboard.press('Escape');
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
  itens: [1, 2, 3, 4, 5].map((n) => ({ id: 'i' + n, listaId: n % 2 ? 'lista-gestao-pessoas' : 'lista-diretor-operacoes', titulo: 'Compromisso de teste com um título bem comprido número ' + n, notas: 'Nota de teste', url: n === 1 ? 'https://cicluz.com.br' : '', local: 'Loja Centro', data: hoje, hora: n > 2 ? '0' + (n + 6) + ':00' : '', horaFim: n === 3 ? '10:30' : '', repeticao: n === 4 ? { tipo: 'semana', intervalo: 1, unidade: 'semana', diasSemana: [], fim: { tipo: 'nunca', data: '', vezes: 0 }, feitas: 0, ancora: hoje } : null, alerta: null, adiadoPara: '', prioridade: n === 1 ? 'muito-alta' : 'normal', sinalizado: n === 2, etiquetas: ['Etiqueta longa de teste'], pessoas: [{ id: 'u-rodrigo', responsavel: true, ver: true, editar: true, concluir: true, excluir: false }, { id: 'u-ana', responsavel: true, ver: true, editar: false, concluir: true, excluir: false }], avaliacao: { tipo: n === 1 ? 'estrelas' : '', notas: [] }, criadoPor: '', colunaId: n === 5 ? 'col-em-progresso' : '', subtarefas: [{ id: 's' + n, titulo: 'Subtarefa', concluida: n === 1, concluidaEm: '' }], ordem: n, concluida: false, concluidaEm: '', criadoEm: '2026-11-01T10:00:00Z', criadoPor: '', atualizadoEm: '' })) });
const estados = [
  ['listas', (e) => { e.visao = 'listas'; e.detalhe = false; e.automatica = 'todos'; e.listaId = ''; }],
  ['lista aberta', (e) => { e.visao = 'listas'; e.detalhe = true; e.automatica = ''; e.listaId = 'lista-diretor-operacoes'; e.abertos.add('i2'); }],
  ['para hoje', (e) => { e.visao = 'listas'; e.detalhe = true; e.automatica = 'hoje'; e.listaId = ''; e.abertos.add('i1'); }],
  ['dia', (e) => { e.visao = 'calendario'; e.calendario.modo = 'dia'; }],
  ['semana', (e) => { e.visao = 'calendario'; e.calendario.modo = 'semana'; }],
  ['mês', (e) => { e.visao = 'calendario'; e.calendario.modo = 'mes'; }],
  ['ano', (e) => { e.visao = 'calendario'; e.calendario.modo = 'ano'; }],
  ['kanban', (e) => { e.visao = 'kanban'; e.listaId = ''; e.automatica = 'todos'; }],
  ['mapa mental', (e) => { e.visao = 'mapa'; e.listaId = ''; e.automatica = 'todos'; }],
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
        const vazando = [...corpo.querySelectorAll('*')].filter((x) => !x.closest('.agenda-kanban') && !x.closest('.agenda-mm-svg') && visivel(x) && x.getBoundingClientRect().right > limite).length;
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
