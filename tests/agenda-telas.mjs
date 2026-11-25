// Verificação de navegador da Agenda com a API DE VERDADE (Playwright + Chromium + Postgres limpo; dados fictícios).
// Rodar: node tests/agenda-telas.mjs (faz parte de npm run test:telas-api; precisa do Docker).
// 0) Transferência: quem não é administrador espera; o administrador vê a prévia, liga a lista provisória a contas e leva.
// 1) Fluxo pela interface: menu → lista, criar escrevendo ("amanhã às 10"), criar completo pelo "+", repetição ao concluir,
//    mostrar/limpar concluídos, ordem manual, listas, alerta com soneca, local no mapa, calendário e Kanban.
// 2) Mapa mental. 3) Chat e arquivos (rotas do chat simuladas; o resto é a API real). 4) Pessoas, permissões e avaliação
//    com contas reais. 5) Falhas da revisão: G3 (não apaga o que se digita), G2, S4, M4, sem internet, sair apaga a cópia.
// 6) Matriz de layout: 320, 390, 1024 e 1900 px, claro e escuro: sem erro, sem rolagem lateral, cabeçalho e um rodapé.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciarApi } from './servidor-api.mjs';

const api = await iniciarApi();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

// Mapa e busca de endereço simulados: o teste não acessa a internet.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const ENDERECO = { name: '', address: { road: 'Rua de Teste', house_number: '100', suburb: 'Centro', city: 'Juiz de Fora', state: 'Minas Gerais' } };
const PRACA = { latitude: -21.7616, longitude: -43.3496 };

/* ---------- Contas fictícias ---------- */
const ADMIN = { email: api.email, senha: api.senha, nome: 'Administrador de Teste' };
const conta = (n, nome) => ({ email: 'agenda-' + n + '-' + Date.now() + '@teste.local', senha: 'senha-de-teste-' + n, nome });
const GESTORA = conta('gestora', 'Gestora de Teste');
const RESP_UM = conta('um', 'Responsável Um');
const RESP_DOIS = conta('dois', 'Responsável Dois');
const FORA = conta('fora', 'Pessoa de Fora');

// Agenda antiga (documento do aparelho): um feito antes do login e um com pessoa da lista provisória.
const AGENDA_ANTIGA = {
  versao: 1,
  listas: [
    { id: 'lista-gestao-pessoas', nome: 'Gestão de Pessoas', cor: '#7c3aed', icone: 'pessoas', ordenacao: 'manual' },
    { id: 'lista-diretor-operacoes', nome: 'Diretor de Operações', cor: '#2563eb', icone: 'operacao', ordenacao: 'manual' },
  ],
  colunas: [{ id: 'col-a-fazer', nome: 'A fazer' }, { id: 'col-em-progresso', nome: 'Em progresso' }],
  itens: [
    { id: 'ag-antigo-1', listaId: 'lista-diretor-operacoes', titulo: 'Feito antes do login', criadoPor: '', pessoas: [{ id: 'conta-jose', responsavel: true, ver: true, concluir: true }] },
    { id: 'ag-antigo-2', listaId: 'lista-diretor-operacoes', titulo: 'Da lista provisória', criadoPor: '', pessoas: [{ id: 'conta-ana', responsavel: true, ver: true }] },
  ],
  relacoes: [],
};

async function entrarComo(contexto, c) {
  if (c === ADMIN) return api.entrar(contexto, { 'cicluz-agenda-v1': AGENDA_ANTIGA });
  const r = await contexto.request.post(api.url + '/api/auth/sign-in/email', { data: { email: c.email, password: c.senha }, headers: { origin: api.url } });
  if (!r.ok()) throw new Error('Login de ' + c.nome + ' falhou: ' + r.status());
  return undefined;
}

// Um "aparelho" (contexto do navegador) por pessoa, com um login só: o servidor limita entradas seguidas na mesma conta.
const aparelhos = new Map();
async function aparelhoDe(c) {
  if (aparelhos.has(c)) return aparelhos.get(c);
  const contexto = await navegador.newContext({ geolocation: PRACA, permissions: ['geolocation'] });
  await contexto.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await contexto.route('https://nominatim.openstreetmap.org/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.startsWith('/reverse')) return r.fulfill({ status: 200, json: { ...ENDERECO, lat: u.searchParams.get('lat'), lon: u.searchParams.get('lon') } });
    return r.fulfill({ status: 200, json: [{ lat: '-21.7700', lon: '-43.3500', name: 'Padaria de Teste', address: { road: 'Avenida de Teste', house_number: '50', city: 'Juiz de Fora', state: 'Minas Gerais' } }] });
  });
  await entrarComo(contexto, c);
  aparelhos.set(c, contexto);
  return contexto;
}
/** Depois do "Sair", a próxima página dessa pessoa entra de novo num aparelho novo. */
const esquecerAparelho = async (c) => { const x = aparelhos.get(c); aparelhos.delete(c); if (x) await x.close(); };

async function abrirPagina(largura, altura = 844, c = ADMIN) {
  const contexto = await aparelhoDe(c);
  const pagina = await contexto.newPage();
  await pagina.setViewportSize({ width: largura, height: altura });
  pagina.on('pageerror', (e) => erros.push(largura + 'px ' + c.nome + ': ' + e.message));
  await pagina.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await pagina.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await pagina.goto(api.url + '/index.html', { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.CicluzAgenda && window.CicluzAgendaCalendario && window.CicluzAgendaKanban && window.CicluzAgendaAlertas && window.CicluzAgendaDados
    && !['carregando', 'cache'].includes(CicluzAgendaDados.situacao) && CicluzAgendaDados.emAndamento === 0, null, { timeout: 60000 });
  // Alertas surgem sozinhos (a cada 30 s) e cobrem o canto da tela: ficam escondidos fora do trecho que os testa.
  await pagina.addStyleTag({ content: 'body.sem-alertas .agenda-alertas { display: none; }' });
  await pagina.evaluate(() => document.body.classList.add('sem-alertas'));
  return pagina;
}
const dialogo = (p) => p.locator('dialog.agenda-dialog[open]').last();
/** Espera o servidor responder tudo o que a tela pediu. */
const quieto = (p) => p.waitForFunction(() => CicluzAgendaDados.emAndamento === 0, null, { timeout: 15000 });
const dados = async (p) => { await quieto(p); return p.evaluate(() => JSON.parse(JSON.stringify(CicluzAgendaDados.dados))); };
const confirmar = async (p) => { await dialogo(p).locator('.people-save-control').click(); await quieto(p); };
const item = async (p, titulo) => (await dados(p)).itens.find((i) => i.titulo === titulo);
const escrever = async (p, texto) => { await p.locator('.agenda-nova-entrada').fill(texto); await p.locator('.agenda-nova-entrada').press('Enter'); await quieto(p); };
const hojeDe = (p) => p.evaluate(() => CicluzAgendaDominio.isoData(new Date()));
const somar = (p, iso, n) => p.evaluate(([i, d]) => CicluzAgendaDominio.somarDias(i, d), [iso, n]);
/** Começo limpo para o trecho seguinte: tira compromissos, listas e colunas criados antes (o banco é o mesmo). */
async function limparAgenda(p) {
  await p.evaluate(async () => {
    const A = CicluzAgendaDados;
    for (const i of A.dados.itens.slice()) if (A.acesso(i).excluir) await A.excluirItem(i.id);
    for (const l of A.dados.listas.slice()) if (!['lista-gestao-pessoas', 'lista-diretor-operacoes'].includes(l.id) && A.dados.itens.every((i) => i.listaId !== l.id)) await A.excluirLista(l.id);
    for (const c of A.dados.colunas.slice()) if (!['col-a-fazer', 'col-em-progresso'].includes(c.id)) await A.excluirColuna(c.id);
  });
  await quieto(p);
}

/* ---------- 0) Contas e transferência ---------- */
{
  // O administrador cria as contas (antes de levar a Agenda: todas viram membros das listas, como hoje).
  const ctx = await navegador.newContext();
  await entrarComo(ctx, ADMIN);
  for (const c of [GESTORA, RESP_UM, RESP_DOIS, FORA]) {
    const r = await ctx.request.post(api.url + '/api/usuarios', { data: { nome: c.nome, email: c.email, senha: c.senha, papel: 'usuario' }, headers: { origin: api.url } });
    if (!r.ok()) throw new Error('Criar ' + c.nome + ': ' + r.status() + ' ' + (await r.text()));
    c.id = (await r.json()).data.id;
  }
  await ctx.close();

  // Quem não é administrador espera.
  const q = await abrirPagina(1024, 844, GESTORA);
  await q.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); });
  ok((await q.locator('#agenda-view .compras-vazio').textContent()).includes('A Agenda está sendo levada para o servidor'), 'Antes da transferência, quem não é administrador vê o aviso de espera');
  ok(await q.locator('.agenda-nova-entrada').count() === 0, 'E não consegue criar nada');
  await q.close();

  // O administrador: prévia e confirmação. As pessoas de teste da lista provisória ficam de fora (P-46, 24/11/2026).
  const p = await abrirPagina(1280, 900);
  await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); });
  await p.locator('.agenda-transferencia-numero').first().waitFor();
  const numeros = await p.locator('.agenda-transferencia-numero').allTextContents();
  ok(numeros.includes('2Listas') && numeros.includes('2Compromissos'), 'Prévia com as contagens: ' + numeros.join(' | '));
  ok((await p.locator('#agenda-view').textContent()).includes('As pessoas de teste (José · Compras, Rodrigo · Gerência, Ana · Estoque) aparecem 2 vez(es)'), 'Prévia avisa que as pessoas de teste ficam de fora');
  ok(await p.locator('#agenda-view select').count() === 1, 'Só se escolhe o gestor dos sem criador (não há ligação de pessoas de teste)');
  await p.getByRole('button', { name: 'Levar a Agenda para o servidor' }).click();
  ok((await dialogo(p).textContent()).includes('2 compromisso(s) e 2 lista(s)'), 'Confirmação diz o que vai');
  await confirmar(p);
  await p.waitForFunction(() => CicluzAgendaDados.situacao === 'servidor' && !document.querySelector('dialog[open]'));
  ok(await p.locator('.agenda-automatica').count() === 7, 'Depois de levar, a Agenda abre normalmente');
  const d = await dados(p);
  const antigo = d.itens.find((i) => i.id === 'ag-antigo-1');
  ok(antigo && antigo.criadoPor !== '' && antigo.pessoas.length === 0, 'José · Compras (de teste) ficou de fora; o sem criador ganhou gestor');
  ok(d.itens.find((i) => i.id === 'ag-antigo-2').pessoas.length === 0, 'Ana · Estoque (de teste) ficou de fora, sem acesso');
  await p.waitForFunction(() => localStorage.getItem('cicluz-agenda-transferida-v1'), null, { timeout: 10000 });
  ok(await p.evaluate(() => Boolean(localStorage.getItem('cicluz-agenda-v1'))), 'A cópia antiga do aparelho foi enviada para conferência e NÃO foi apagada');
  await p.close();
}

/* ---------- 1) Fluxo pela interface ---------- */
{
  const p = await abrirPagina(1280, 900);
  const hoje = await hojeDe(p);
  // Entrada pelo menu lateral: Agenda · Atividades → Agenda (P-46: o menu tem só "Agenda" e "Configurações da Agenda")
  await p.locator('summary', { hasText: 'Agenda' }).first().click();
  await p.getByRole('button', { name: 'Agenda', exact: true }).first().click();
  ok(await p.locator('#agenda-view.show').count() === 1, 'O submenu abre a Agenda');
  ok((await p.locator('details[data-menu-name="Agenda/Atividades"] .children button').allTextContents()).map((t) => t.trim()).join('|') === 'Agenda|Configurações da Agenda', 'Menu da Agenda: só "Agenda" e "Configurações da Agenda"');
  ok((await p.locator('.agenda-detalhe-titulo').textContent()).startsWith('Todos'), 'Abre em Todos');
  await p.locator('.agenda-lista-linha', { hasText: 'Diretor de Operações' }).click();
  ok((await p.locator('.agenda-automatica small').allTextContents()).join('|') === 'Para hoje|Programados|Todos|Sinalizados|Atrasados|Atribuídos a mim|Concluídos', 'Listas automáticas do Lembretes + Atrasados');
  ok(await p.locator('.agenda-lateral').isVisible() && await p.locator('.agenda-conteudo').isVisible(), 'Computador: listas e conteúdo lado a lado');
  ok(!(await p.locator('.agenda-voltar-listas').isVisible()), 'Computador: sem "‹ Listas"');

  // Escrever do jeito que se fala (na lista Gestão de Pessoas)
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();
  await p.locator('.agenda-nova-entrada').fill('ligar para o contador amanhã às 10 #financeiro !');
  ok((await p.locator('.agenda-nova-dica').textContent()).includes('Amanhã às 10:00'), 'A linha nova mostra o que vai entender');
  await p.locator('.agenda-nova-entrada').press('Enter');
  let i = await item(p, 'ligar para o contador');
  const amanha = await somar(p, hoje, 1);
  ok(i && i.data === amanha && i.hora === '10:00' && i.etiquetas[0] === 'financeiro' && i.prioridade === 'alta' && i.listaId === 'lista-gestao-pessoas', '"amanhã às 10 #financeiro !" vira data, hora, etiqueta e prioridade, sem trocar as letras');
  ok(i.alerta === 0, 'Com data, avisa na hora');
  ok(i.criadoPor === (await p.evaluate(() => CicluzSessao.perfil.usuarioId)), 'O gestor é quem criou (o servidor decide)');
  ok(await p.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('agenda-nova-entrada'), null, { timeout: 4000 }).then(() => true, () => false), 'O foco volta para a linha nova');
  await escrever(p, 'Comprar 2 sacos de farinha');
  ok((await item(p, 'Comprar 2 sacos de farinha')).data === '', 'Número solto não vira data nem hora');

  // "Para hoje": cria com hoje
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
  await dialogo(p).getByLabel('Adicionar pessoa').selectOption({ label: RESP_UM.nome });
  await dialogo(p).getByRole('button', { name: 'Adicionar como responsável' }).click();
  await dialogo(p).getByLabel('Notas').fill('levar a planilha de horários');
  await dialogo(p).getByRole('button', { name: 'Adicionar subtarefa' }).click();
  await dialogo(p).getByLabel('Subtarefa 1', { exact: true }).fill('imprimir escala');
  await dialogo(p).getByLabel('Subtarefa 1', { exact: true }).press('Enter');
  await dialogo(p).getByLabel('Subtarefa 2', { exact: true }).fill('avisar a equipe');
  await confirmar(p);
  ok(await p.locator('dialog.agenda-dialog[open]').count() === 0, 'O ✓ salva e fecha');
  i = await item(p, 'reunião semanal da equipe');
  ok(i.repeticao.tipo === 'personalizada' && i.repeticao.intervalo === 2 && i.repeticao.diasSemana.join() === '1,4' && i.repeticao.fim.vezes === 3 && i.repeticao.ancora === hoje, 'Repetição salva, com a âncora no dia');
  ok(i.horaFim === '10:30' && i.alerta === 15 && i.url === 'https://cicluz.com.br' && i.local === 'Loja Centro' && i.notas === 'levar a planilha de horários', 'Término, alerta, URL, local e notas salvos como digitados');
  ok(i.subtarefas.map((s) => s.titulo).join('|') === 'imprimir escala|avisar a equipe', 'Subtarefas na ordem');
  ok(i.pessoas.length === 1 && i.pessoas[0].id === RESP_UM.id && i.pessoas[0].responsavel, 'Responsável é uma conta da empresa');

  // Concluir o que repete: fica uma cópia concluída e ele vai para a próxima data
  await p.getByRole('button', { name: 'Concluir reunião semanal da equipe' }).click();
  let d = await dados(p);
  const original = d.itens.find((x) => x.id === i.id);
  const copia = d.itens.find((x) => x.origemId === i.id);
  ok(copia && copia.concluida && copia.ocorrencia === hoje && !original.concluida && original.data > hoje && original.repeticao.feitas === 1, 'Concluir uma repetição: cópia concluída e o próximo fica na próxima data');
  ok((await p.locator('#compras-aviso').textContent()).includes('O próximo fica para'), 'Aviso diz quando é o próximo');

  // Lista do usuário: concluídos (Mostrar / Limpar) e ordem manual
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();
  await p.getByRole('button', { name: 'Concluir Comprar 2 sacos de farinha' }).click();
  await quieto(p);
  ok((await p.locator('.agenda-concluidos-barra').textContent()).includes('2 concluídos'), 'Barra de concluídos com a contagem');
  ok(await p.locator('.agenda-item.concluida').count() === 0, 'Concluídos escondidos por padrão');
  await p.locator('.agenda-concluidos-barra').getByRole('button', { name: 'Mostrar' }).click();
  ok(await p.locator('.agenda-item.concluida').count() === 2, '"Mostrar" exibe os concluídos');
  await p.locator('.agenda-concluidos-barra').getByRole('button', { name: 'Limpar' }).click();
  await confirmar(p);
  ok(!(await dados(p)).itens.some((x) => x.concluida && x.listaId === 'lista-gestao-pessoas'), '"Limpar" tira os concluídos da lista');
  const ordemAntes = await p.locator('.agenda-item .agenda-linha-texto b').allTextContents();
  await p.evaluate(() => {
    const linhas = [...document.querySelectorAll('.agenda-item[draggable="true"]')];
    const dt = new DataTransfer();
    linhas.at(-1).dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    linhas[0].dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    linhas[0].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await quieto(p);
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
  ok(loja && loja.icone === 'pao' && loja.podeGerir, 'Nova lista com ícone, de quem criou');
  ok((await p.locator('.agenda-detalhe-titulo').textContent()).startsWith('Loja Centro'), 'A lista nova abre');
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();
  await p.getByRole('button', { name: 'Editar lista' }).click();
  await dialogo(p).getByRole('button', { name: 'Excluir lista' }).click();
  ok((await dialogo(p).textContent()).includes('Não dá para desfazer'), 'Excluir lista pede confirmação');
  await confirmar(p);
  ok((await p.locator('#compras-aviso').textContent()).includes('Mova ou exclua'), 'Lista com compromisso não é excluída (o servidor confere)');
  await p.keyboard.press('Escape');

  // Alerta: aparece na tela, com soneca (só para quem adiou)
  await p.evaluate(() => { document.querySelectorAll('.agenda-alerta').forEach((a) => a.remove()); document.body.classList.remove('sem-alertas'); });
  const idAlerta = await p.evaluate(async () => {
    const A = CicluzAgendaDados, D = CicluzAgendaDominio;
    const agora = new Date(Date.now() - 60000);
    const r = await A.salvarItem('', { titulo: 'Ligar para a contabilidade', listaId: 'lista-diretor-operacoes', data: D.isoData(agora), hora: D.horaAgora(agora), alerta: 0 });
    CicluzAgendaAlertas.conferir(new Date());
    return r.id;
  });
  ok(await p.locator('.agenda-alerta', { hasText: 'Ligar para a contabilidade' }).count() === 1, 'Alerta vencido aparece na tela');
  await p.locator('.agenda-alerta', { hasText: 'Ligar para a contabilidade' }).getByRole('button', { name: 'Adiar 15 min' }).click();
  i = (await dados(p)).itens.find((x) => x.id === idAlerta);
  ok(i.adiadoPara && new Date(i.adiadoPara) > new Date(Date.now() + 14 * 60000), 'Adiar 15 min guarda a soneca');
  ok(await p.evaluate(() => CicluzAgendaAlertas.conferir(new Date())) === 0, 'Adiado não avisa de novo antes da hora');
  ok(await p.evaluate(() => CicluzAgendaAlertas.conferir(new Date(Date.now() + 16 * 60000))) === 1, 'Depois da soneca, avisa de novo');
  await p.locator('.agenda-alerta', { hasText: 'Ligar para a contabilidade' }).getByRole('button', { name: 'Concluir' }).first().click();
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
  const arrastarCartao = (destino) => p.evaluate((dest) => {
    const card = [...document.querySelectorAll('.agenda-cartao')].find((c) => c.textContent.includes('Conferir escala'));
    const col = document.querySelector('.agenda-kanban-coluna[data-coluna="' + dest + '"]');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    col.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    col.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, destino);
  await arrastarCartao('concluido');
  ok((await dados(p)).itens.find((x) => x.id === idK).concluida, 'Levar para Concluído conclui');
  await arrastarCartao('col-em-progresso');
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
  await p.close();
}

/* ---------- 2) Mapa mental ---------- */
{
  const p = await abrirPagina(1400, 940);
  await limparAgenda(p);
  const hoje = await hojeDe(p);
  await p.evaluate(async (h) => {
    const A = CicluzAgendaDados;
    await A.salvarItem('', { titulo: 'Entrevista de candidato', listaId: 'lista-gestao-pessoas', data: h, hora: '14:00' });
    await A.salvarItem('', { titulo: 'Conferir câmara fria', listaId: 'lista-diretor-operacoes', data: h, prioridade: 'muito-alta', sinalizado: true });
    await A.salvarItem('', { titulo: 'Pagar fornecedores', listaId: 'lista-diretor-operacoes' });
    await A.salvarItem('', { titulo: 'Pensar na campanha', listaId: 'lista-gestao-pessoas', notas: 'vitrine', subtarefas: [{ titulo: 'Rascunho' }] });
    document.dispatchEvent(new Event('cicluz-close-menu'));
    CicluzAgenda.abrir('');
  }, hoje);
  await p.getByRole('button', { name: 'Mapa mental', exact: true }).click();
  const no = (t) => p.locator('.agenda-mm-no', { hasText: t }).first();
  ok(await p.locator('.agenda-mm-no.tipo-grupo').count() === 2 && await p.locator('.agenda-mm-no.tipo-item').count() === 4 && await p.locator('.agenda-mm-no.tipo-sub').count() === 1, 'Raiz → listas → compromissos → subtarefas');
  ok(await p.locator('.agenda-mm-tela').getAttribute('role') === 'tree' && await no('Pagar fornecedores').getAttribute('role') === 'treeitem', 'Mapa acessível como árvore');
  ok(await p.evaluate(() => /^#[0-9a-fA-F]{6}$/.test(document.querySelector('#agenda-mm-seta path').getAttribute('fill'))), 'A ponta da seta usa só cor #rrggbb, sem innerHTML (G2)');
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
  await no('Pagar fornecedores').click();
  await p.keyboard.press('ArrowUp');
  ok(await no('Conferir câmara fria').getAttribute('aria-selected') === 'true', 'Seta para cima: irmão anterior');
  const a = await no('Pensar na campanha').boundingBox();
  const b = await p.locator('.agenda-mm-no.tipo-grupo', { hasText: 'Diretor de Operações' }).boundingBox();
  await p.mouse.move(a.x + 20, a.y + 10); await p.mouse.down(); await p.mouse.move(a.x + 60, a.y + 40, { steps: 5 }); await p.mouse.move(b.x + 20, b.y + 10, { steps: 10 }); await p.mouse.up();
  ok((await item(p, 'Pensar na campanha')).listaId === 'lista-diretor-operacoes', 'Arrastar para outro grupo muda a lista');
  await p.getByRole('button', { name: 'Ajustar à tela' }).click();
  const sa = await no('Rascunho').boundingBox();
  const sb = await no('Pagar fornecedores').boundingBox();
  await p.mouse.move(sa.x + 15, sa.y + 8); await p.mouse.down(); await p.mouse.move(sa.x + 50, sa.y + 40, { steps: 5 }); await p.mouse.move(sb.x + 30, sb.y + 12, { steps: 10 }); await p.mouse.up();
  ok((await item(p, 'Pagar fornecedores')).subtarefas.some((x) => x.titulo === 'Rascunho') && !(await item(p, 'Pensar na campanha')).subtarefas.length, 'Arrastar subtarefa leva para outro compromisso');
  await no('Conferir câmara fria').click();
  await p.locator('.agenda-mm-acoes').getByRole('button', { name: 'Relação' }).click();
  await no('Pagar fornecedores').click();
  await quieto(p);
  ok((await dados(p)).relacoes.length === 1 && await p.locator('path.agenda-mm-relacao').count() === 1, 'Relação desenhada entre os compromissos');
  await p.locator('.agenda-mm-acoes').getByRole('button', { name: 'Dar nome' }).click();
  await dialogo(p).getByLabel('Nome', { exact: true }).fill('antes de');
  await confirmar(p);
  ok((await dados(p)).relacoes[0].rotulo === 'antes de' && (await p.locator('.agenda-mm-svg').textContent()).includes('antes de'), 'Relação com nome');
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
  for (const e of ['logico', 'organograma', 'arvore', 'linha']) {
    await p.locator('.agenda-mm-barra').getByLabel('Estrutura').selectOption(e);
    ok(await p.locator('.agenda-mm-no.tipo-item').count() >= 4, 'Estrutura ' + e + ' desenha os compromissos');
  }
  await p.locator('.agenda-mm-barra').getByLabel('Agrupar por').selectOption('data');
  ok((await p.locator('.agenda-mm-no.tipo-grupo').allTextContents()).join('|').includes('Hoje'), 'Agrupar por data');
  const c = await no('Pagar fornecedores').boundingBox();
  const d2 = await p.locator('.agenda-mm-no.tipo-grupo', { hasText: 'Amanhã' }).boundingBox();
  await p.mouse.move(c.x + 20, c.y + 10); await p.mouse.down(); await p.mouse.move(c.x + 60, c.y + 40, { steps: 5 }); await p.mouse.move(d2.x + 15, d2.y + 10, { steps: 10 }); await p.mouse.up();
  ok((await item(p, 'Pagar fornecedores')).data === await somar(p, hoje, 1), 'Arrastar para "Amanhã" muda a data (o mesmo caminho do formulário)');
  await p.locator('.agenda-mm-barra').getByLabel('Agrupar por').selectOption('prioridade');
  ok((await p.locator('.agenda-mm-no.tipo-grupo').allTextContents()).some((t) => t.includes('Prioridade muito alta')), 'Agrupar por prioridade');
  await p.locator('.agenda-mm-barra').getByLabel('Agrupar por').selectOption('lista');
  await p.locator('.agenda-mm-barra').getByLabel('Estrutura').selectOption('mapa');
  for (const [botaoTxt, ext] of [['PNG', '.png'], ['SVG', '.svg'], ['Tópicos (.md)', '.md']]) {
    const espera = p.waitForEvent('download');
    await p.locator('.agenda-mm-chips').getByRole('button', { name: botaoTxt, exact: true }).click();
    const baixado = await espera;
    ok(baixado.suggestedFilename().endsWith(ext), 'Exporta ' + ext);
    if (ext === '.md') { const caminho = await baixado.path(); const texto = (await import('node:fs')).readFileSync(caminho, 'utf8'); ok(texto.includes('## Gestão de Pessoas') && texto.includes('- [ ] Entrevista de candidato'), 'Tópicos em texto'); }
  }
  await no('Entrevista de candidato').dblclick();
  ok(await dialogo(p).filter({ hasText: 'Editar compromisso' }).count() === 1, 'Dois toques abrem o compromisso');
  await p.keyboard.press('Escape');
  await p.close();
}

/* ---------- 3) Chat e arquivos (as rotas do chat simuladas; o compromisso e a permissão são da API real) ---------- */
const ROTA_CHAT = /^\/api\/agenda\/(compromissos\/[^/]+\/(mensagens|arquivos|leitura)|chat\/nao-lidas|arquivos\/.+)$/;
{
  const p = await abrirPagina(1280, 900);
  const mensagens = [];
  const arquivos = [];
  let naoLidas = {};
  // Só as rotas do chat e dos arquivos são simuladas; o resto (o compromisso, a permissão) nem passa por aqui.
  await p.route((u) => ROTA_CHAT.test(u.pathname), async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const caminho = u.pathname.replace(/^\/api/, '');
    const m = /^\/agenda\/compromissos\/([^/]+)\/(mensagens|arquivos|leitura)$/.exec(caminho);
    if (caminho === '/agenda/chat/nao-lidas') return r.fulfill({ json: { ok: true, data: { naoLidas } } });
    if (m && m[2] === 'mensagens' && req.method() === 'GET') {
      const depois = u.searchParams.get('depois');
      return r.fulfill({ json: { ok: true, data: { mensagens: mensagens.filter((x) => !depois || x.criadoEm > depois) } } });
    }
    if (m && m[2] === 'mensagens') { const x = { id: 'm' + mensagens.length, autorId: 'eu', autorNome: 'Eu', texto: JSON.parse(req.postData()).texto.trim(), criadoEm: new Date(Date.now() + mensagens.length).toISOString() }; mensagens.push(x); return r.fulfill({ status: 201, json: { ok: true, data: x } }); }
    if (m && m[2] === 'leitura') { naoLidas = {}; return r.fulfill({ json: { ok: true, data: {} } }); }
    if (m && m[2] === 'arquivos' && req.method() === 'GET') return r.fulfill({ json: { ok: true, data: { arquivos } } });
    if (m && m[2] === 'arquivos') {
      const corpo = JSON.parse(req.postData());
      const a = { id: '00000000-0000-4000-8000-00000000000' + arquivos.length, nome: corpo.nome, tipo: corpo.nome.endsWith('.png') ? 'image/png' : 'application/pdf', tamanho: Buffer.from(corpo.conteudoBase64, 'base64').length, papel: 'material', enviadoPor: 'eu', enviadoPorNome: 'Eu', criadoEm: new Date().toISOString(), podeExcluir: true };
      arquivos.push(a);
      return r.fulfill({ status: 201, json: { ok: true, data: a } });
    }
    const arq = /^\/agenda\/arquivos\/(.+)$/.exec(caminho);
    if (arq && req.method() === 'DELETE') { arquivos.splice(arquivos.findIndex((x) => x.id === arq[1]), 1); return r.fulfill({ json: { ok: true, data: {} } }); }
    return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });
  const criado = await p.evaluate(async () => {
    const r = await CicluzAgendaDados.salvarItem('', { titulo: 'Fechar o caixa', listaId: 'lista-gestao-pessoas' });
    document.dispatchEvent(new Event('cicluz-close-menu'));
    CicluzAgenda.abrir('');
    return { ...r, situacao: CicluzAgendaDados.situacao, listas: CicluzAgendaDados.dados.listas.map((l) => l.id) };
  });
  if (!criado.id) throw new Error('Criar no trecho do chat falhou: ' + JSON.stringify(criado));
  const id = criado.id;
  naoLidas = { [id]: 2 };
  await p.evaluate(() => CicluzAgendaConversa.atualizarNaoLidas(true));
  await p.waitForFunction(() => document.querySelector('.agenda-chat-novas'));
  ok((await p.locator('.agenda-item', { hasText: 'Fechar o caixa' }).locator('.agenda-chat-novas').textContent()).includes('2 mensagens novas'), 'A linha mostra as mensagens novas');
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa' }).click();
  await dialogo(p).getByRole('button', { name: 'Abrir chat (2 novas)' }).click();
  const chat = p.locator('dialog.agenda-chat-dialog[open]');
  await chat.locator('.compras-vazio').waitFor();
  await chat.getByLabel('Mensagem (Enter envia)', { exact: true }).fill('pode fechar às 18h?');
  await chat.getByLabel('Mensagem (Enter envia)', { exact: true }).press('Enter');
  await chat.locator('.agenda-chat-msg', { hasText: 'pode fechar às 18h?' }).waitFor();
  ok(mensagens.length === 1 && mensagens[0].texto === 'pode fechar às 18h?', 'Enter envia a mensagem');
  mensagens.push({ id: 'm-outra', autorId: 'outra-pessoa', autorNome: 'Responsável Dois', texto: 'Combinado!', criadoEm: new Date(Date.now() + 1000).toISOString() });
  await chat.locator('.agenda-chat-msg:not(.minha)', { hasText: 'Combinado!' }).waitFor({ timeout: 8000 });
  ok((await chat.locator('.agenda-chat-msg:not(.minha) .agenda-chat-autor').last().textContent()) === 'Responsável Dois', 'Mensagem de outra pessoa chega sozinha, com o nome');
  ok(Object.keys(naoLidas).length === 0, 'Abrir o chat marca como lido');
  await chat.locator('.people-close-control, .people-cancel-control').first().click().catch(() => p.keyboard.press('Escape'));
  if (await chat.count()) await p.keyboard.press('Escape');
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
  // API publicada antes do chat (rota do chat inexistente: 404 genérico): aviso claro e para de perguntar
  const p = await abrirPagina(1024);
  let pedidos = 0;
  await p.route((u) => ROTA_CHAT.test(u.pathname), (r) => {
    pedidos++;
    return r.fulfill({ status: 404, json: { type: 'about:blank', title: 'Não encontrado', status: 404, code: 'NOT_FOUND' } });
  });
  await p.evaluate(async () => { const r = await CicluzAgendaDados.salvarItem('', { titulo: 'API antiga', listaId: 'lista-gestao-pessoas' }); document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); CicluzAgenda.editar(r.id); });
  await p.waitForFunction(() => (document.querySelector('dialog.agenda-dialog[open] .agenda-conversa [role=status]') || {}).textContent);
  ok((await dialogo(p).locator('.agenda-conversa [role=status]').textContent()).includes('a API precisa ser atualizada'), 'API antiga: arquivos explicam que o servidor precisa ser atualizado');
  ok(!(await dialogo(p).getByRole('button', { name: 'Adicionar arquivos' }).isVisible()), 'API antiga: não oferece enviar arquivo');
  await dialogo(p).getByRole('button', { name: 'Abrir chat' }).click();
  const chat = p.locator('dialog.agenda-chat-dialog[open]');
  await chat.locator('.agenda-chat-estado', { hasText: 'a API precisa ser atualizada' }).waitFor();
  const antes = pedidos;
  await p.waitForTimeout(6000);
  ok(pedidos === antes && await chat.getByLabel('Mensagem (Enter envia)', { exact: true }).isDisabled(), 'API antiga: o chat avisa e para de perguntar a cada 5 s');
  await p.close();
}

/* ---------- 4) Pessoas, permissões e avaliação (contas reais; o servidor confere) ---------- */
{
  const abrir = async (c) => { const p = await abrirPagina(1280, 900, c); await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); }); return p; };

  // A gestora cria: Responsável Um só com ver+concluir; Responsável Dois responsável padrão; avaliação em estrelas
  let p = await abrir(GESTORA);
  await p.locator('.view.show .people-add-control').click();
  await dialogo(p).getByLabel('Título').fill('Fechar o caixa da loja');
  ok((await dialogo(p).locator('.agenda-pessoas .profiles-note').first().textContent()).includes('Gestor: ' + GESTORA.nome), 'Gestor é quem cria');
  await dialogo(p).getByLabel('Adicionar pessoa').selectOption({ label: RESP_UM.nome });
  await dialogo(p).getByRole('button', { name: 'Adicionar como responsável' }).click();
  await dialogo(p).getByLabel('Adicionar pessoa').selectOption({ label: RESP_DOIS.nome });
  await dialogo(p).getByRole('button', { name: 'Adicionar como responsável' }).click();
  await dialogo(p).getByRole('group', { name: 'Permissões de ' + RESP_UM.nome }).getByRole('button', { name: 'Editar' }).click();
  await dialogo(p).getByLabel('Tipo de avaliação').selectOption('estrelas');
  await confirmar(p);
  let t = await item(p, 'Fechar o caixa da loja');
  ok(t.criadoPor === GESTORA.id && t.pessoas.length === 2 && t.pessoas.every((x) => x.responsavel), 'Dois responsáveis');
  ok(!t.pessoas[0].editar && t.pessoas[0].concluir && t.pessoas[1].editar, 'Permissões por pessoa');
  ok((await p.locator('.agenda-item', { hasText: 'Fechar o caixa da loja' }).locator('.agenda-detalhes').textContent()).includes(RESP_UM.nome + ', ' + RESP_DOIS.nome), 'A linha mostra os responsáveis');
  const idCaixa = t.id;
  await p.close();

  // Quem não participa não recebe (nem pela API)
  p = await abrir(FORA);
  ok(!(await p.evaluate(() => CicluzAgendaDados.dados.itens.some((i) => i.titulo === 'Fechar o caixa da loja'))) && await p.locator('.agenda-item', { hasText: 'Fechar o caixa da loja' }).count() === 0, 'Quem não participa não recebe o compromisso');
  ok(await p.evaluate(async (id) => { try { await CicluzSync.api('/agenda/compromissos/' + id + '/conclusao', { metodo: 'POST', corpo: { concluida: true } }); return 'passou'; } catch (e) { return e.status; } }, idCaixa) === 404, 'Nem consegue concluir pela API (404: nem sabe que existe)');
  await p.close();

  // Responsável Um: vê, não edita (só leitura), conclui; aparece em Atribuídos a mim
  p = await abrir(RESP_UM);
  ok(Number(await p.locator('.a-atribuidos b').textContent()) >= 1, 'Atribuídos a mim conta o compromisso do responsável');
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa da loja' }).click();
  ok(await dialogo(p).filter({ hasText: 'editar é com o gestor' }).count() === 1 && await dialogo(p).getByLabel('Título').isDisabled(), 'Sem "Editar": abre só para leitura');
  ok(await dialogo(p).getByRole('button', { name: 'Excluir compromisso' }).count() === 0, 'Sem "Excluir": não aparece o botão');
  await p.keyboard.press('Escape');
  ok(await p.evaluate(async (id) => { try { await CicluzSync.api('/agenda/compromissos/' + id, { metodo: 'PATCH', corpo: { versao: 1, titulo: 'mudado' } }); return 'passou'; } catch (e) { return e.codigo; } }, idCaixa) === 'AGENDA_SEM_ACESSO', 'Editar é barrado também pela API');
  await p.getByRole('button', { name: 'Concluir Fechar o caixa da loja' }).click();
  t = await item(p, 'Fechar o caixa da loja');
  ok(t.concluida, 'Com "Concluir", o responsável conclui');
  await p.locator('.agenda-automatica', { hasText: 'Concluídos' }).click();
  ok((await p.locator('.agenda-item', { hasText: 'Fechar o caixa da loja' }).locator('.agenda-detalhes').textContent()).includes('Avaliação pendente'), 'Concluído com avaliação pendente');
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa da loja' }).click();
  const painelR = dialogo(p).locator('.agenda-avaliacao-painel');
  ok(await painelR.locator('.agenda-avaliacao-cartao').count() === 1 && (await painelR.textContent()).includes('Sua autoavaliação') && !(await painelR.textContent()).includes('Avaliação do gestor'), 'O responsável vê só a própria autoavaliação');
  await painelR.getByRole('button', { name: '★★★★★', exact: true }).click();
  await painelR.getByLabel('Comentário da avaliação').fill('fiz tudo no horário');
  await painelR.getByRole('button', { name: 'Registrar avaliação' }).click();
  ok((await dialogo(p).textContent()).includes('não muda'), 'Confirma avisando que não muda');
  await confirmar(p);
  await p.waitForFunction(() => (document.querySelector('dialog.agenda-dialog[open] .agenda-avaliacao-painel') || {}).textContent?.includes('★★★★★ (5/5)'));
  ok((await painelR.textContent()).includes('fiz tudo no horário'), 'Autoavaliação registrada no servidor');
  ok(await painelR.getByRole('button', { name: 'Registrar avaliação' }).count() === 0, 'Depois de registrada, não há como mudar');
  ok(await p.evaluate((id) => CicluzAgendaDados.avaliar(id, CicluzSessao.perfil.usuarioId, 1).then((r) => r.erro), idCaixa) === 'Avaliação já registrada; ela não muda.', 'Nem pela API');
  ok(await p.evaluate(([id, outro]) => CicluzAgendaDados.avaliar(id, outro, 3).then((r) => r.erro), [idCaixa, RESP_DOIS.id]) === 'Só o gestor e o próprio responsável avaliam.', 'Um responsável não avalia o outro (o servidor recusa)');
  await p.keyboard.press('Escape');
  await p.close();

  // Gestora: avalia a execução do Responsável Um e vê a comparação
  p = await abrir(GESTORA);
  await p.locator('.agenda-automatica', { hasText: 'Concluídos' }).click();
  await p.locator('.agenda-linha-texto', { hasText: 'Fechar o caixa da loja' }).click();
  const cartaoR = dialogo(p).locator('.agenda-avaliacao-cartao', { hasText: 'Execução de ' + RESP_UM.nome });
  ok((await cartaoR.textContent()).includes('Autoavaliação★★★★★ (5/5)'), 'O gestor vê a autoavaliação');
  await cartaoR.getByRole('button', { name: '★★★', exact: true }).click();
  await cartaoR.getByRole('button', { name: 'Registrar avaliação' }).click();
  await confirmar(p);
  await p.waitForFunction((n) => [...document.querySelectorAll('dialog.agenda-dialog[open] .agenda-avaliacao-cartao')].some((x) => x.textContent.includes('Execução de ' + n) && x.textContent.includes('★★★☆☆ (3/5)')), RESP_UM.nome);
  ok((await cartaoR.textContent()).includes('Avaliação do gestor★★★☆☆ (3/5)') && (await cartaoR.textContent()).includes('★★★★★ (5/5)'), 'Comparação: gestor 3 × autoavaliação 5');
  ok(await dialogo(p).getByLabel('Tipo de avaliação').isDisabled(), 'Com nota registrada, o tipo de avaliação não muda');
  await p.keyboard.press('Escape');
  await p.close();
}

/* ---------- 5) Falhas da revisão que a tela toca ---------- */
{
  const p = await abrirPagina(1280, 900);
  await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); });
  await p.locator('.agenda-lista-linha', { hasText: 'Gestão de Pessoas' }).click();

  // G3: a atualização que vem do servidor (a cada 30 s) e o relógio de 1 min não apagam o que se está digitando.
  await p.locator('.agenda-nova-entrada').fill('Texto pela metade');
  await p.evaluate(async () => { await CicluzAgendaDados.atualizar(true); document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou', { detail: { externo: true } })); document.dispatchEvent(new Event('cicluz-agenda-conversa')); });
  ok(await p.locator('.agenda-nova-entrada').inputValue() === 'Texto pela metade' && await p.evaluate(() => document.activeElement.classList.contains('agenda-nova-entrada')), 'Atualização de fora não apaga "Novo compromisso" nem tira o foco (G3)');
  // A busca pode estar recolhida na lupa: escreve direto no campo.
  await p.evaluate(() => { const i = document.querySelector('#agenda-view .compras-busca'); i.value = 'cam'; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); });
  await p.evaluate(() => document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou', { detail: { externo: true } })));
  ok(await p.evaluate(() => document.querySelector('#agenda-view .compras-busca').value) === 'cam', 'Nem a busca');
  await p.evaluate(() => { const i = document.querySelector('#agenda-view .compras-busca'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.locator('.agenda-nova-entrada').fill('');

  // S4: o link só vira link com http:// ou https:// (mesmo com dado estranho na memória).
  await p.evaluate(() => {
    const A = CicluzAgendaDados;
    const base = A.dados.itens.find((i) => i.listaId === 'lista-gestao-pessoas' && !i.concluida);
    A.dados.itens.push({ ...structuredClone(base), id: 'falso-js', titulo: 'Endereço estranho', url: 'javascript:alert(1)' });
    document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou', { detail: {} }));
  });
  ok(await p.locator('.agenda-item', { hasText: 'Endereço estranho' }).locator('a').count() === 0, 'URL sem http/https não vira link (S4)');
  await p.evaluate(() => { const A = CicluzAgendaDados; A.dados.itens.splice(A.dados.itens.findIndex((i) => i.id === 'falso-js'), 1); });

  // M4: cartão de alerta velho de uma repetição não conclui a ocorrência seguinte nem reabre.
  const idRep = await p.evaluate(async () => {
    const A = CicluzAgendaDados, D = CicluzAgendaDominio;
    const agora = new Date(Date.now() - 60000);
    const r = await A.salvarItem('', { titulo: 'Conferir o forno', listaId: 'lista-gestao-pessoas', data: D.isoData(agora), hora: D.horaAgora(agora), alerta: 0, repeticao: { tipo: 'dia' } });
    document.querySelectorAll('.agenda-alerta').forEach((a) => a.remove());
    document.body.classList.remove('sem-alertas');
    CicluzAgendaAlertas.conferir(new Date());
    return r.id;
  });
  await p.getByRole('button', { name: 'Concluir Conferir o forno' }).click();
  await quieto(p);
  await p.locator('.agenda-alerta', { hasText: 'Conferir o forno' }).getByRole('button', { name: 'Concluir' }).click();
  const dRep = await dados(p);
  ok(dRep.itens.filter((x) => x.origemId === idRep).length === 1 && dRep.itens.find((x) => x.id === idRep).repeticao.feitas === 1, 'Cartão velho de alerta não conclui de novo (M4): uma cópia só');
  for (const b of await p.locator('.agenda-alerta').getByRole('button', { name: 'Fechar' }).all()) await b.click();
  await p.evaluate(() => document.body.classList.add('sem-alertas'));

  // Duplo toque no círculo: o botão trava enquanto o servidor responde; não cria duas cópias.
  await p.getByRole('button', { name: 'Concluir Conferir o forno' }).dblclick();
  const dDuplo = await dados(p);
  ok(dDuplo.itens.filter((x) => x.origemId === idRep).length === 2, 'Duplo toque conclui uma vez só (2 cópias = as 2 ocorrências concluídas até aqui)');

  // Sem internet: mostra a última cópia, avisa e não grava.
  await p.route('**/api/agenda**', (r) => r.abort());
  await p.evaluate(() => CicluzAgendaDados.atualizar(true));
  await p.waitForFunction(() => CicluzAgendaDados.situacao === 'sem-internet');
  ok((await p.locator('#agenda-view .compras-situacao').first().textContent()).includes('Sem internet'), 'Sem internet: faixa avisando');
  ok(await p.locator('.agenda-nova-entrada').count() === 0 && await p.locator('.agenda-item').count() > 0, 'Mostra a última cópia, sem a linha de criar');
  ok(await p.evaluate(() => CicluzAgendaDados.criarRapido('não deve ir', 'lista-gestao-pessoas').then((r) => r.erro)) === 'Sem internet: a Agenda mostra a última cópia. Para criar ou alterar, conecte.', 'Sem internet não grava');
  await p.unroute('**/api/agenda**');
  await p.evaluate(() => CicluzAgendaDados.atualizar(true));
  await p.waitForFunction(() => CicluzAgendaDados.situacao === 'servidor');
  ok(await p.locator('.agenda-nova-entrada').count() === 1, 'Voltou a internet: volta a criar');

  // A cópia para ver sem internet é desta conta; sair apaga.
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cicluz-agenda-cache-v1')).usuarioId === CicluzSessao.perfil.usuarioId), 'Cópia sem internet guardada com a conta dentro');
  await p.goto(api.url + '/entrar.html?sair=1', { waitUntil: 'load' });
  await p.waitForFunction(() => document.body.textContent.includes('Você saiu'), null, { timeout: 15000 }).catch(() => undefined);
  ok(await p.evaluate(() => localStorage.getItem('cicluz-agenda-cache-v1')) === null, 'Sair apaga a cópia da Agenda do aparelho');
  await p.close();
  await esquecerAparelho(ADMIN);
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

/* ---------- 5b) Rotina da Agenda (P-46): configurações, desempenho, chat do grupo, tela ligada, pedido que vira tarefa ---------- */
{
  const p = await abrirPagina(1280, 900);
  await limparAgenda(p);
  // Configurações da Agenda pelo menu: o administrador configura o Responsável Um.
  await p.evaluate(() => { const ag = document.querySelector('details[data-menu-name="Agenda/Atividades"]'); ag.open = true; });
  await p.getByRole('button', { name: 'Configurações da Agenda', exact: true }).first().click();
  await p.locator('#agenda-config-view .agenda-config-linha', { hasText: RESP_UM.nome }).click();
  for (const dia of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) await dialogo(p).getByRole('button', { name: dia, exact: true }).click();
  await dialogo(p).getByLabel('Início do expediente').fill('00:00');
  await dialogo(p).getByLabel('Fim do expediente').fill('23:59');
  // A hora fora do expediente saiu daqui (0009: sempre calculada, só no Desempenho); vazio = padrão de 15 min.
  ok(await dialogo(p).getByLabel('Hora trabalhada fora do expediente').count() === 0, 'Configurações: sem a escolha de "hora comum/extra" (decisão pendente com o Rodrigo)');
  ok((await dialogo(p).getByLabel('Sair do sistema depois de quantos minutos parado').getAttribute('placeholder')).includes('15'), 'Configurações: tempo parado vazio = padrão de 15 min');
  ok(await dialogo(p).getByLabel('Colaborador do cadastro').count() === 1, 'Configurações: ligar a conta ao colaborador do cadastro');
  await dialogo(p).getByLabel('Sair do sistema depois de quantos minutos parado').fill('30');
  await dialogo(p).locator('.people-save-control').click();
  await p.locator('#agenda-config-view .agenda-config-linha', { hasText: 'sai em 30 min parado' }).waitFor();
  ok((await p.locator('#agenda-config-view .agenda-config-linha', { hasText: RESP_UM.nome }).textContent()).includes('todos os dias, das 00:00 às 23:59'), 'Configurações: o administrador salva expediente e saída por tempo parado');
  // "Nunca sai sozinho" (Zé, 25/11/2026): o campo dos minutos some e a linha diz que não sai.
  await p.locator('#agenda-config-view .agenda-config-linha', { hasText: RESP_UM.nome }).click();
  await dialogo(p).getByLabel('Sair sozinho por tempo parado').selectOption('nao');
  ok(await dialogo(p).getByLabel('Sair do sistema depois de quantos minutos parado').isHidden(), 'Nunca sai sozinho: o campo dos minutos some');
  await dialogo(p).locator('.people-save-control').click();
  await p.locator('#agenda-config-view .agenda-config-linha', { hasText: 'nunca sai sozinho' }).waitFor();
  ok(true, 'O administrador escolhe quem nunca sai sozinho');

  // Lista ligada a uma área (P-46 item 3): na janela da lista, "Quem entra no grupo"; os membros vêm da área.
  await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.estado.visao = 'listas'; CicluzAgenda.abrir('lista-diretor-operacoes'); });
  await p.getByRole('button', { name: 'Editar lista' }).click();
  await dialogo(p).getByLabel('Quem entra no grupo').selectOption('producao');
  ok(await dialogo(p).getByRole('button', { name: 'Escolher membros' }).isHidden(), 'Lista por área: some a escolha à mão');
  await dialogo(p).locator('.people-save-control').click();
  await p.waitForFunction(() => (CicluzAgendaDados.lista('lista-diretor-operacoes') || {}).area === 'producao', null, { timeout: 15000 });
  const porArea = await p.evaluate(async () => (await CicluzAgendaDados.membros('lista-diretor-operacoes')).ids);
  const eu = await p.evaluate(() => CicluzAgendaDados.usuarioAtual());
  // As contas de teste nascem sem cargo de acesso: só o administrador (que tem tudo) tem acesso à Produção.
  ok(porArea.includes(eu) && !porArea.includes(RESP_UM.id), 'Lista por área: membros montados pelo servidor (só quem tem acesso à Produção)');
  await p.evaluate(async () => { const l = CicluzAgendaDados.lista('lista-diretor-operacoes'); await CicluzAgendaDados.salvarLista(l.id, { nome: l.nome, area: '' }); });

  // Regras por permissão (P-46 itens 1 e 2): o administrador tem as permissões e recebe as duas tarefas.
  await p.evaluate(() => CicluzAgendaRotina.producaoParaLancar({ pedidoId: 'pp-teste-1', numero: 7, data: CicluzAgendaDominio.isoData(new Date()), hora: '06:00' }));
  await p.waitForFunction(() => CicluzAgendaDados.dados.itens.some((i) => i.vinculoRef === 'producao:lancar:pp-teste-1'), null, { timeout: 15000 }).catch(() => p.evaluate(() => CicluzAgendaDados.atualizar(true)));
  await p.waitForFunction(() => CicluzAgendaDados.dados.itens.some((i) => i.vinculoRef === 'producao:lancar:pp-teste-1'), null, { timeout: 15000 });
  const lancar = (await dados(p)).itens.find((i) => i.vinculoRef === 'producao:lancar:pp-teste-1');
  ok(lancar.titulo === 'Lançar a produção do pedido nº 7' && lancar.vinculoTitulo === 'MER - Mapa de Produção', 'Pedido de produção enviado vira "Lançar a produção" (leva ao Mapa de Produção)');
  await p.evaluate(() => CicluzAgendaRotina.producaoLancada('pp-teste-1'));
  await p.waitForFunction(() => CicluzAgendaDados.dados.itens.find((i) => i.vinculoRef === 'producao:lancar:pp-teste-1').concluida, null, { timeout: 15000 });
  ok(true, 'Produção lançada conclui a tarefa');
  await p.evaluate(() => CicluzAgendaRotina.integracaoDoColaborador({ colaboradorId: 'col-teste-1', nome: 'Pessoa Fictícia', inicio: CicluzAgendaDominio.isoData(new Date()) }));
  await p.waitForFunction(() => CicluzAgendaDados.dados.itens.some((i) => i.vinculoRef === 'pessoas:integracao:col-teste-1'), null, { timeout: 15000 }).catch(() => p.evaluate(() => CicluzAgendaDados.atualizar(true)));
  await p.waitForFunction(() => CicluzAgendaDados.dados.itens.some((i) => i.vinculoRef === 'pessoas:integracao:col-teste-1'), null, { timeout: 15000 });
  const integ = (await dados(p)).itens.find((i) => i.vinculoRef === 'pessoas:integracao:col-teste-1');
  ok(integ.titulo === 'Integração de Pessoa Fictícia' && integ.subtarefas.map((s) => s.titulo).join('|') === 'Conferir documentos|Entregar uniforme|Treinamento/integração', 'Período de Teste registrado vira "Integração de <nome>" com as três subtarefas');

  // Chat do grupo: a lista é o grupo.
  await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.estado.visao = 'listas'; CicluzAgenda.abrir('lista-gestao-pessoas'); });
  await p.getByRole('button', { name: 'Chat do grupo' }).click();
  await dialogo(p).getByLabel('Mensagem (Enter envia)').fill('Bom dia, grupo de teste');
  await dialogo(p).getByLabel('Mensagem (Enter envia)').press('Enter');
  await dialogo(p).locator('.agenda-chat-msg.minha', { hasText: 'Bom dia, grupo de teste' }).waitFor();
  ok(await dialogo(p).locator('.agenda-chat-dia', { hasText: 'Hoje' }).count() === 1, 'Chat do grupo no jeito do WhatsApp: separador do dia e a mensagem no balão');
  await p.keyboard.press('Escape');

  // Ícone roxo em outra tela: a tarefa fica ligada a ela e "Abrir a tela" leva de volta.
  const tela = '#/saidas-mercadorias/lancamentos/compras-solicitacao';
  await p.evaluate((t) => CicluzRotas.abrir(t), tela);
  await p.waitForFunction(() => document.querySelector('.view.show') && document.querySelector('.view.show').id !== 'agenda-view');
  // O da barra (iPad e computador); o do menu rápido (.people-quick-fixo) só aparece no celular.
  const agendar = p.locator('.view.show .people-footer-left > .people-agendar-control');
  ok(await p.locator('.view.show .people-quick-fixo').evaluate((b) => getComputedStyle(b).display) === 'none', 'Fora do celular, o agendar do menu rápido fica escondido');
  ok(await agendar.evaluate((b) => getComputedStyle(b).backgroundColor) === 'rgb(124, 58, 237)', 'Ícone de agendar é roxo mesmo numa tela verde');
  await agendar.click();
  ok((await dialogo(p).locator('.agenda-tela-ligada').textContent()).includes('MER - Pedido de Compra'), 'A janela já vem com a tela ligada');
  await dialogo(p).getByLabel('Título').fill('Conferir o pedido da semana');
  await confirmar(p);
  const ligado = await item(p, 'Conferir o pedido da semana');
  ok(ligado && ligado.vinculoTela === tela && ligado.vinculoTitulo === 'MER - Pedido de Compra', 'Compromisso guarda a tela ligada');
  await p.evaluate(() => { CicluzAgenda.estado.visao = 'listas'; CicluzAgenda.abrir(''); });
  await p.locator('.agenda-item', { hasText: 'Conferir o pedido da semana' }).locator('.agenda-abrir-tela').first().click();
  await p.waitForFunction((t) => location.hash === t, tela);
  ok(true, '"Abrir a tela" leva até a tela ligada');

  // Pedido agendado chegou na hora: tarefa na Agenda do responsável; enviar o pedido conclui.
  await p.evaluate(async (r) => { CicluzAgendaRotina.tarefaDoPedidoDeCompra({ ocorrenciaId: 'oc-teste-1', grupo: 'Farinhas', data: CicluzAgendaDominio.isoData(new Date()), hora: '08:00', responsavelId: r }); }, RESP_UM.id);
  const q = await abrirPagina(1024, 844, RESP_UM);
  await q.waitForFunction(() => CicluzAgendaDados.dados.itens.some((i) => i.vinculoRef === 'compras:oc:oc-teste-1'), null, { timeout: 15000 }).catch(() => q.evaluate(() => CicluzAgendaDados.atualizar(true)));
  await q.waitForFunction(() => CicluzAgendaDados.dados.itens.some((i) => i.vinculoRef === 'compras:oc:oc-teste-1'), null, { timeout: 15000 });
  const t1 = (await dados(q)).itens.find((i) => i.vinculoRef === 'compras:oc:oc-teste-1');
  ok(t1.titulo === 'Fazer o pedido de compra: Farinhas' && t1.listaId === 'lista-tarefas-das-telas', 'Pedido agendado vira tarefa do responsável na lista "Tarefas das telas"');
  await q.evaluate(() => CicluzAgendaRotina.pedidoDeCompraFeito('oc-teste-1'));
  await q.waitForFunction(() => CicluzAgendaDados.dados.itens.find((i) => i.vinculoRef === 'compras:oc:oc-teste-1').concluida, null, { timeout: 15000 });
  ok(true, 'Enviar o pedido conclui a tarefa');
  // Desempenho: o responsável vê o próprio cartão.
  await q.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.estado.visao = 'desempenho'; CicluzAgenda.abrir(''); });
  // A aba se redesenha quando a Agenda atualiza: espera o cartão da pessoa (não só "algum cartão").
  await q.locator('.agenda-desempenho-nome h3', { hasText: RESP_UM.nome }).waitFor();
  const cartoes = await q.locator('.agenda-desempenho-nome h3').allTextContents();
  ok(cartoes.length === 1 && cartoes[0] === RESP_UM.nome, 'Desempenho: cada pessoa vê o seu (veio: ' + JSON.stringify(cartoes) + ')');
  ok(await q.locator('.agenda-desempenho-cartao .agenda-desempenho-indicador').count() === 4, 'Desempenho: os quatro indicadores no cartão');
  await q.close();
  await p.evaluate(() => { CicluzAgenda.estado.visao = 'listas'; });
  await p.close();
}

/* ---------- 6) Matriz de layout ---------- */
{
  // Dados de exemplo pela API (títulos e nomes compridos para forçar o layout).
  const p = await abrirPagina(1280, 900);
  await limparAgenda(p);
  const hoje = await hojeDe(p);
  await p.evaluate(async ([h, pessoas]) => {
    const A = CicluzAgendaDados;
    await A.salvarLista('lista-diretor-operacoes', { nome: 'Diretor de Operações com nome comprido' });
    for (const n of [1, 2, 3, 4, 5]) {
      const r = await A.salvarItem('', {
        listaId: n % 2 ? 'lista-gestao-pessoas' : 'lista-diretor-operacoes', titulo: 'Compromisso de teste com um título bem comprido número ' + n,
        notas: 'Nota de teste', url: n === 1 ? 'https://cicluz.com.br' : '', local: 'Loja Centro', data: h, hora: n > 2 ? String(n + 6).padStart(2, '0') + ':00' : '', horaFim: n === 3 ? '10:30' : '',
        repeticao: n === 4 ? { tipo: 'semana' } : null, alerta: null, prioridade: n === 1 ? 'muito-alta' : 'normal', sinalizado: n === 2, etiquetas: ['Etiqueta longa de teste'],
        pessoas: pessoas.map((id, k) => ({ id, responsavel: true, ver: true, editar: k === 0, concluir: true })), avaliacao: { tipo: n === 1 ? 'estrelas' : '' },
        colunaId: n === 5 ? 'col-em-progresso' : '', subtarefas: [{ titulo: 'Subtarefa', concluida: n === 1 }],
      });
      if (r.erro) throw new Error('Exemplo ' + n + ' recusado: ' + r.erro);
    }
  }, [hoje, [RESP_UM.id, RESP_DOIS.id]]);
  await p.close();
}
const estados = [
  ['listas', (e) => { e.visao = 'listas'; e.detalhe = false; e.automatica = 'todos'; e.listaId = ''; }],
  ['lista aberta', (e) => { e.visao = 'listas'; e.detalhe = true; e.automatica = ''; e.listaId = 'lista-diretor-operacoes'; e.abertos.add(CicluzAgendaDados.dados.itens.find((i) => i.titulo.endsWith(' 2')).id); }],
  ['para hoje', (e) => { e.visao = 'listas'; e.detalhe = true; e.automatica = 'hoje'; e.listaId = ''; e.abertos.add(CicluzAgendaDados.dados.itens.find((i) => i.titulo.endsWith(' 1')).id); }],
  ['dia', (e) => { e.visao = 'calendario'; e.calendario.modo = 'dia'; }],
  ['semana', (e) => { e.visao = 'calendario'; e.calendario.modo = 'semana'; }],
  ['mês', (e) => { e.visao = 'calendario'; e.calendario.modo = 'mes'; }],
  ['ano', (e) => { e.visao = 'calendario'; e.calendario.modo = 'ano'; }],
  ['kanban', (e) => { e.visao = 'kanban'; e.listaId = ''; e.automatica = 'todos'; }],
  ['mapa mental', (e) => { e.visao = 'mapa'; e.listaId = ''; e.automatica = 'todos'; }],
  ['desempenho', (e) => { e.visao = 'desempenho'; e.listaId = ''; e.automatica = 'todos'; }],
];
let combinacoes = 0;
for (const largura of [320, 390, 1024, 1900]) {
  const p = await abrirPagina(largura, largura > 1500 ? 940 : 844);
  await p.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.dispatchEvent(new Event('cicluz-close-menu')); });
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    for (const [nome, preparar] of [...estados, ['diálogo', null]]) {
      if (preparar) await p.evaluate(`(${preparar.toString()})(CicluzAgenda.estado); CicluzAgenda.abrir()`);
      else await p.evaluate(() => { CicluzAgenda.estado.visao = 'listas'; CicluzAgenda.abrir(); CicluzAgenda.editar(CicluzAgendaDados.dados.itens.find((i) => i.titulo.endsWith(' 4')).id); });
      await p.waitForTimeout(150);
      // O rodapé é montado pelo shell logo depois de a tela aparecer: espera ele (até 5 s) antes de medir.
      await p.waitForFunction(() => { const d = document.querySelector('dialog.agenda-dialog[open]'); const v = d || document.querySelector('.view.show'); return v && v.querySelector('.people-bottom-header'); }, null, { timeout: 5000 }).catch(() => undefined);
      const m = await p.evaluate(() => {
        const d = document.querySelector('dialog.agenda-dialog[open]');
        const v = d || document.querySelector('.view.show');
        const visivel = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
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
// A tela de transferência também cabe no celular (o administrador pode levar a Agenda pelo iPad).
{
  const p = await abrirPagina(320);
  await p.evaluate(() => { document.dispatchEvent(new Event('cicluz-close-menu')); CicluzAgenda.abrir(''); });
  const largura = await p.evaluate(async () => {
    const caixa = document.createElement('div');
    document.querySelector('#agenda-view .compras-content').append(caixa);
    window.CicluzAgendaTransferencia.render(caixa, { aoConcluir: () => {} });
    await new Promise((r) => setTimeout(r, 1500));
    return document.documentElement.scrollWidth - innerWidth;
  });
  ok(largura <= 0, 'Tela de transferência sem rolagem lateral em 320 px (' + largura + 'px)');
  await p.close();
}

await navegador.close();
api.parar();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações da Agenda no navegador com a API real passaram (fluxo + ' + combinacoes + ' combinações de tela × largura × tema)');
