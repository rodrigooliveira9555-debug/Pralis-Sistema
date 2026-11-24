/*
 * Agenda — rotina (P-45, áudios do Rodrigo de 23/11/2026). Servidor: servidor/api/src/agenda/rotina.*.
 * - Configurações da Agenda (menu Agenda › Configurações da Agenda): o administrador define, por pessoa, o
 *   expediente, se a Agenda abre fora dele, se a hora fora do expediente é registrada (comum ou extra: só
 *   registro, não vai para a folha) e em quantos minutos parado o sistema sai. Cada pessoa vê a própria regra.
 * - Desempenho (aba da Agenda): no prazo, fora do prazo, não feitas, em aberto, resposta média e hora fora do
 *   expediente. Cada pessoa vê o seu; o administrador vê todos.
 * - Ícone roxo de agendar (barra de baixo, em toda tela): cria um compromisso ligado à tela aberta; a tarefa
 *   leva de volta a ela.
 * - Pedido agendado (Compras e Produção) que chega na hora vira tarefa na Agenda do responsável, que leva à tela
 *   do pedido; enviar o pedido conclui a tarefa.
 * - Sair do sistema depois do tempo parado configurado.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAgendaDados;
  const D = window.CicluzAgendaDominio;
  const { el, botao, svg } = U;
  const COR = '#7c3aed';
  const COR_TEXTO = '#5520ad';
  const DIAS = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
  const FORA = [['permitir', 'Pode usar fora do expediente'], ['bloquear', 'Só no expediente (bloqueia fora dele)']];
  const HORA_FORA = [['nao-registrar', 'Não registrar'], ['comum', 'Registrar como hora comum'], ['extra', 'Registrar como hora extra']];
  /** Telas dos pedidos (o mesmo endereço que o rotas.js grava ao abrir pelo menu). */
  const TELA_PEDIDO_COMPRA = { endereco: '#/saidas-mercadorias/lancamentos/compras-solicitacao', titulo: 'MER - Pedido de Compra' };
  const TELA_PEDIDO_PRODUCAO = { endereco: '#/saidas-mercadorias/lancamentos-producao/producao-pedidos', titulo: 'MER - Pedidos de Produção' };

  const perfil = () => (window.CicluzSessao && window.CicluzSessao.perfil) || null;
  const ehAdmin = () => Boolean(perfil() && perfil().papel === 'administrador');
  const minutosTexto = (m) => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min');
  const descricaoDias = (dias) => {
    const nomes = DIAS.filter(([d]) => dias.includes(d)).map(([, n]) => n.toLowerCase());
    return nomes.length === 7 ? 'todos os dias' : nomes.join(', ');
  };
  const resumoExpediente = (c) => (c.expedienteInicio ? descricaoDias(c.expedienteDias) + ', das ' + c.expedienteInicio + ' às ' + c.expedienteFim : 'Sem expediente definido');

  /* ================= Configurações da Agenda ================= */
  let tela = null;
  function garantirTela() {
    if (tela) return tela;
    tela = U.criarTela({
      id: 'agenda-config-view', titulo: 'Configurações da Agenda', caminho: 'Agenda · Atividades / Configurações da Agenda', icone: 'agenda',
      voltar: () => { if (typeof returnToNavigation === 'function') returnToNavigation(); }, cor: COR, corTexto: COR_TEXTO, classe: 'agenda-view agenda-config-view',
    });
    return tela;
  }
  function abrirConfiguracoes() {
    garantirTela().ativar();
    renderConfiguracoes();
  }

  async function renderConfiguracoes() {
    const body = tela.body;
    body.replaceChildren(U.nota('Carregando…'));
    if (!A.conectado()) { body.replaceChildren(U.vazio('As configurações da Agenda ficam no servidor.', 'Entre com seu usuário para ver.')); return; }
    const minha = await A.minhaConfig();
    body.replaceChildren();
    if (minha.erro) { body.append(U.situacao(minha.erro, 'negativo')); return; }
    const m = minha.dados;
    const sua = U.secao('A sua Agenda');
    const lista = el('dl', 'agenda-config-resumo');
    const item = (t, v) => lista.append(el('dt', null, t), el('dd', null, v));
    item('Expediente', m.descricaoExpediente);
    item('Fora do expediente', m.foraExpediente === 'bloquear' ? 'A Agenda fecha fora do expediente' : 'A Agenda abre a qualquer hora');
    item('Hora fora do expediente', HORA_FORA.find(([v]) => v === m.horaFora)[1]);
    item('Sair sozinho', m.inatividadeMinutos ? 'Depois de ' + minutosTexto(m.inatividadeMinutos) + ' sem mexer' : 'Não sai sozinho');
    sua.append(lista);
    if (m.bloqueadaAgora) sua.append(U.situacao('Agora você está fora do expediente: a Agenda abre de novo no horário.', 'atencao'));
    sua.append(U.nota(ehAdmin() ? 'Você é administrador: mude a sua regra na lista abaixo.' : 'Quem muda estas regras é o administrador.'));
    body.append(sua);
    if (!ehAdmin()) return;

    const r = await A.configs();
    const secao = U.secao('Pessoas');
    secao.append(U.nota('Escolha, para cada pessoa, o expediente e o que acontece fora dele. A hora fora do expediente é só registrada: não vai para a folha de pagamento.'));
    if (r.erro) { secao.append(U.situacao(r.erro, 'negativo')); body.append(secao); return; }
    const linhas = el('div', 'compras-lista agenda-config-pessoas');
    r.dados.pessoas.filter((p) => p.ativo).forEach((p) => {
      const l = botao('', () => editarConfig(p), 'compras-linha agenda-config-linha');
      l.setAttribute('aria-label', 'Configurar a Agenda de ' + p.nome);
      const texto = el('span', 'compras-linha-texto');
      const det = [resumoExpediente(p)];
      if (p.foraExpediente === 'bloquear') det.push('bloqueia fora do expediente');
      if (p.horaFora !== 'nao-registrar') det.push('registra hora ' + p.horaFora);
      if (p.inatividadeMinutos) det.push('sai em ' + minutosTexto(p.inatividadeMinutos) + ' parado');
      texto.append(el('b', null, p.nome), el('small', null, det.join(' · ')));
      const seta = el('span', 'agenda-icone-botao');
      seta.innerHTML = svg('<path d="m9 6 6 6-6 6"/>');
      l.append(texto, seta);
      linhas.append(l);
    });
    secao.append(linhas);
    body.append(secao);
  }

  function editarConfig(p) {
    let dias = new Set(p.expedienteDias);
    U.dialogo({
      titulo: 'Agenda de ' + p.nome,
      subtitulo: 'Expediente, fora do expediente e saída por tempo parado.',
      cor: COR,
      corTexto: COR_TEXTO,
      classe: 'agenda-dialog',
      rotuloSalvar: 'Salvar configuração',
      montar: (form) => {
        const grupoDias = el('div', 'compras-chips agenda-dias');
        grupoDias.setAttribute('role', 'group');
        grupoDias.setAttribute('aria-label', 'Dias do expediente');
        const desenharDias = () => grupoDias.replaceChildren(...DIAS.map(([d, nome]) => {
          const b = botao(nome, () => { if (dias.has(d)) dias.delete(d); else dias.add(d); desenharDias(); }, 'compras-chip' + (dias.has(d) ? ' ativo' : ''));
          b.setAttribute('aria-pressed', String(dias.has(d)));
          return b;
        }));
        desenharDias();
        const inicio = U.entrada('time', p.expedienteInicio || '');
        const fim = U.entrada('time', p.expedienteFim || '');
        const fora = U.seletor(FORA, p.foraExpediente);
        const horaFora = U.seletor(HORA_FORA, p.horaFora);
        const parado = U.entrada('number', p.inatividadeMinutos || '', { min: 1, max: 480, step: 1, inputMode: 'numeric', placeholder: 'Não sai sozinho' });
        const eu = perfil() && perfil().usuarioId === p.usuarioId;
        if (eu) { fora.value = 'permitir'; fora.disabled = true; }
        const diasCampo = el('div', 'compras-campo');
        diasCampo.append(el('span', 'compras-rotulo', 'Dias do expediente'), grupoDias);
        const grade = el('div', 'agenda-form-grade');
        grade.append(U.campo('Início do expediente', inicio), U.campo('Fim do expediente', fim));
        form.append(
          diasCampo, grade,
          U.campo('Fora do expediente', fora, eu ? 'Você não pode bloquear a sua própria Agenda.' : 'Bloqueado: fora do horário a Agenda e o chat não abrem.'),
          U.campo('Hora trabalhada fora do expediente', horaFora, 'Só registro, para o relatório de desempenho. Não vai para a folha de pagamento.'),
          U.campo('Sair do sistema depois de quantos minutos parado', parado, 'Vazio = não sai sozinho. De 1 a 480 minutos.'),
        );
        return { inicio, fim, fora, horaFora, parado };
      },
      salvar: async (c) => {
        const corpo = {
          expedienteDias: [...dias].sort(), expedienteInicio: c.inicio.value, expedienteFim: c.fim.value,
          foraExpediente: c.fora.value, horaFora: c.horaFora.value, inatividadeMinutos: c.parado.value ? Number(c.parado.value) : null,
        };
        // As mesmas regras do servidor, com a mensagem antes de mandar.
        if (Boolean(corpo.expedienteInicio) !== Boolean(corpo.expedienteFim)) return 'Informe o início e o fim do expediente, ou nenhum dos dois.';
        if (corpo.expedienteInicio && corpo.expedienteFim <= corpo.expedienteInicio) return 'O fim do expediente deve ser depois do início.';
        if (corpo.expedienteInicio && !corpo.expedienteDias.length) return 'Marque os dias do expediente.';
        if (!corpo.expedienteInicio && (corpo.foraExpediente === 'bloquear' || corpo.horaFora !== 'nao-registrar')) return 'Para bloquear ou registrar a hora fora do expediente, informe o expediente.';
        if (corpo.inatividadeMinutos !== null && !(corpo.inatividadeMinutos >= 1 && corpo.inatividadeMinutos <= 480 && Number.isInteger(corpo.inatividadeMinutos))) return 'Minutos parado: um número inteiro de 1 a 480.';
        const r = await A.salvarConfig(p.usuarioId, corpo);
        if (r.erro) return r.erro;
        U.avisar('Configuração salva.');
        renderConfiguracoes();
        return undefined;
      },
    });
  }

  /* ================= Desempenho (aba da Agenda) ================= */
  const periodo = { de: '', ate: '' };
  function mesAtual() {
    const hoje = D.isoData(new Date());
    const de = hoje.slice(0, 8) + '01';
    const ate = D.somarDias(D.somarMeses(de, 1), -1);
    return { de, ate };
  }
  function renderDesempenho(body) {
    if (!periodo.de) Object.assign(periodo, mesAtual());
    const box = el('section', 'compras-secao agenda-desempenho');
    const cab = el('div', 'compras-secao-cab');
    cab.append(el('h3', null, ehAdmin() ? 'Desempenho da equipe' : 'O seu desempenho'));
    box.append(cab);
    const de = U.entrada('date', periodo.de);
    const ate = U.entrada('date', periodo.ate);
    const filtros = el('div', 'agenda-form-grade');
    filtros.append(U.campo('De', de), U.campo('Até', ate));
    const atalhos = U.chips([['mes', 'Este mês'], ['anterior', 'Mês passado'], ['7', 'Últimos 7 dias']], '', (v) => {
      const hoje = D.isoData(new Date());
      if (v === 'mes') Object.assign(periodo, mesAtual());
      else if (v === 'anterior') { const ini = D.somarMeses(mesAtual().de, -1); Object.assign(periodo, { de: ini, ate: D.somarDias(mesAtual().de, -1) }); }
      else Object.assign(periodo, { de: D.somarDias(hoje, -6), ate: hoje });
      de.value = periodo.de; ate.value = periodo.ate;
      carregar();
    });
    const resultado = el('div', 'agenda-desempenho-cartoes');
    resultado.setAttribute('aria-live', 'polite');
    box.append(filtros, atalhos, resultado, U.nota('Conta os compromissos com data no período em que a pessoa é responsável. No prazo = concluído até o término do compromisso (sem término, até o fim do dia). Hora fora do expediente: só registro, não vai para a folha.'));
    const mudou = () => { if (de.value && ate.value) { periodo.de = de.value; periodo.ate = ate.value; carregar(); } };
    de.addEventListener('change', mudou);
    ate.addEventListener('change', mudou);
    body.append(box);

    async function carregar() {
      if (!A.conectado()) { resultado.replaceChildren(U.vazio('O desempenho vem do servidor.', 'Entre com seu usuário para ver.')); return; }
      if (periodo.ate < periodo.de) { resultado.replaceChildren(U.situacao('O fim do período deve ser depois do início.', 'atencao')); return; }
      resultado.replaceChildren(U.nota('Carregando…'));
      const r = await A.desempenho(periodo.de, periodo.ate);
      if (r.erro) { resultado.replaceChildren(U.situacao(r.erro, 'negativo')); return; }
      const pessoas = r.dados.pessoas;
      if (!pessoas.length) { resultado.replaceChildren(U.vazio('Nada no período.', 'Ninguém tinha compromisso como responsável nessas datas.')); return; }
      resultado.replaceChildren(...pessoas.map(cartao));
    }
    carregar();
  }

  function cartao(p) {
    const c = el('article', 'agenda-desempenho-cartao');
    const feitas = p.noPrazo + p.foraDoPrazo;
    const pct = feitas ? Math.round((p.noPrazo / feitas) * 100) : null;
    const topo = el('div', 'agenda-desempenho-topo');
    topo.append(el('b', null, p.nome), el('span', 'agenda-desempenho-pct', pct === null ? 'Nada concluído' : pct + '% no prazo'));
    const barra = el('div', 'agenda-desempenho-barra');
    barra.setAttribute('role', 'img');
    barra.setAttribute('aria-label', p.noPrazo + ' no prazo, ' + p.foraDoPrazo + ' fora do prazo, ' + p.naoFeitas + ' não feitas, ' + p.emAberto + ' em aberto');
    [['no-prazo', p.noPrazo], ['fora-prazo', p.foraDoPrazo], ['nao-feitas', p.naoFeitas], ['em-aberto', p.emAberto]].forEach(([k, n]) => {
      if (!n) return;
      const s = el('span', 'agenda-desempenho-parte ' + k);
      s.style.flexGrow = String(n);
      barra.append(s);
    });
    const numeros = el('dl', 'agenda-desempenho-numeros');
    const num = (t, v, k) => { const d = el('div', k ? 'n-' + k : null); d.append(el('dt', null, t), el('dd', null, String(v))); numeros.append(d); };
    num('Recebidas', p.recebidas);
    num('No prazo', p.noPrazo, 'no-prazo');
    num('Fora do prazo', p.foraDoPrazo, 'fora-prazo');
    num('Não feitas', p.naoFeitas, 'nao-feitas');
    num('Em aberto', p.emAberto, 'em-aberto');
    num('Resposta média', p.tempoMedioRespostaHoras === null ? '—' : String(p.tempoMedioRespostaHoras).replace('.', ',') + ' h');
    num('Fora do expediente', minutosTexto(p.minutosForaExpediente) + (p.diasForaSemExpediente ? ' + ' + p.diasForaSemExpediente + ' dia(s) de folga' : ''));
    c.append(topo, barra, numeros);
    return c;
  }

  /* ================= Ícone roxo de agendar (em toda tela) ================= */
  /** Endereço e nome da tela aberta agora (o rotas.js guarda o caminho dos cliques). */
  function telaAtual() {
    const R = window.CicluzRotas;
    const rota = R ? R.atual() : [];
    if (!rota.length || rota[0] === 'agenda') return null;
    const nome = (document.getElementById('title') || {}).textContent || (document.getElementById('crumb') || {}).textContent || '';
    return { endereco: R.montarEndereco(rota), titulo: nome.trim().slice(0, 120) || 'Tela do sistema' };
  }
  function agendarDaTela() {
    const t = telaAtual();
    if (!t) return U.avisar('Abra uma tela do sistema para agendar uma tarefa ligada a ela.');
    if (A.situacao === 'fora-expediente') return U.avisar(A.motivoBloqueio);
    if (A.situacao !== 'servidor') return U.avisar(A.situacao === 'nao-transferida' ? 'A Agenda ainda está indo para o servidor.' : 'A Agenda precisa do servidor: entre com seu usuário e tente de novo.');
    window.CicluzAgenda.novo({ vinculoTela: t.endereco, vinculoTitulo: t.titulo, titulo: t.titulo });
  }
  function abrirTela(endereco) {
    if (!endereco || !window.CicluzRotas) return;
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    window.CicluzRotas.abrir(endereco);
  }

  /* ================= Pedido agendado vira tarefa (Compras e Produção) ================= */
  const ehConta = (id) => Boolean(id) && !/^u-/.test(id);
  /** O pedido de compra agendado chegou na hora: tarefa na Agenda do responsável, que leva à tela do pedido. */
  function tarefaDoPedidoDeCompra({ ocorrenciaId, grupo, data, hora, responsavelId }) {
    if (!A.conectado() || !ehConta(responsavelId)) return;
    A.tarefaDeTela({
      vinculoRef: 'compras:oc:' + ocorrenciaId, vinculoTela: TELA_PEDIDO_COMPRA.endereco, vinculoTitulo: TELA_PEDIDO_COMPRA.titulo,
      titulo: 'Fazer o pedido de compra' + (grupo ? ': ' + grupo : ''), data, hora,
      notas: 'Agendado em MER - Agenda de Pedidos. Abra a tela, confira as quantidades e envie o pedido: a tarefa é concluída sozinha.',
      responsaveis: [responsavelId],
    });
  }
  const pedidoDeCompraFeito = (ocorrenciaId) => { if (A.conectado()) A.concluirPorVinculo('compras:oc:' + ocorrenciaId); };
  function tarefaDoPedidoDeProducao({ pedidoId, numero, data, hora, responsavelId }) {
    if (!A.conectado() || !ehConta(responsavelId)) return;
    A.tarefaDeTela({
      vinculoRef: 'producao:pp:' + pedidoId, vinculoTela: TELA_PEDIDO_PRODUCAO.endereco, vinculoTitulo: TELA_PEDIDO_PRODUCAO.titulo,
      titulo: 'Fazer o pedido de produção' + (numero ? ' nº ' + numero : ''), data, hora,
      notas: 'Agendado em Agenda de Produção. Abra a tela, confira as quantidades e envie à produção: a tarefa é concluída sozinha.',
      responsaveis: [responsavelId],
    });
  }
  const pedidoDeProducaoFeito = (pedidoId) => { if (A.conectado()) A.concluirPorVinculo('producao:pp:' + pedidoId); };

  /* ================= Sair do sistema depois do tempo parado ================= */
  let limiteMs = 0;
  let timer = null;
  let aviso = null;
  let ultimo = 0;
  function sair() {
    const b = document.querySelector('[aria-label="Sair do sistema"]');
    if (b) b.click(); else location.href = 'entrar.html?sair=1';
  }
  function mexeu() {
    const agora = Date.now();
    if (agora - ultimo < 2000) return; // não refaz o relógio a cada movimento
    ultimo = agora;
    clearTimeout(timer);
    clearTimeout(aviso);
    if (limiteMs > 60000) aviso = setTimeout(() => U.avisar('Você vai sair do sistema em 1 minuto por falta de uso.'), limiteMs - 60000);
    timer = setTimeout(sair, limiteMs);
  }
  async function iniciarInatividade() {
    if (!A.conectado()) return;
    const r = await A.minhaConfig();
    if (r.erro || !r.dados.inatividadeMinutos) return;
    limiteMs = r.dados.inatividadeMinutos * 60000;
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, mexeu, { passive: true, capture: true }));
    mexeu();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarInatividade); else setTimeout(iniciarInatividade, 0);

  window.CicluzAgendaRotina = {
    abrirConfiguracoes, renderDesempenho, agendarDaTela, abrirTela, telaAtual,
    tarefaDoPedidoDeCompra, pedidoDeCompraFeito, tarefaDoPedidoDeProducao, pedidoDeProducaoFeito,
    TELA_PEDIDO_COMPRA, TELA_PEDIDO_PRODUCAO,
  };
})();
