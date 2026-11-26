/*
 * Agenda — rotina (P-46, áudios do Rodrigo de 23/11/2026). Servidor: servidor/api/src/agenda/rotina.*.
 * - Configurações da Agenda (menu Agenda › Configurações da Agenda): o administrador liga cada conta ao colaborador
 *   do cadastro (o expediente passa a vir dos Horários/Escalas dele) e define, por pessoa, o expediente de reserva,
 *   se a Agenda abre fora dele e em quantos minutos parado o sistema sai (padrão 15). Cada pessoa vê a própria regra.
 * - Desempenho (aba da Agenda): no prazo, fora do prazo, não feitas, em aberto, resposta média e hora fora do
 *   expediente (sempre calculada, só relatório: P-46 item 6). Cada pessoa vê o seu; o administrador vê todos.
 * - Ícone roxo de agendar (barra de baixo, em toda tela): cria um compromisso ligado à tela aberta; a tarefa
 *   leva de volta a ela.
 * - Pedido agendado (Compras e Produção) que chega na hora vira tarefa na Agenda do responsável, que leva à tela
 *   do pedido; enviar o pedido conclui a tarefa.
 * - Regras por permissão (P-46 itens 1 e 2): pedido de produção enviado → "Lançar a produção" para quem tem
 *   "Lançar pedido e ordem de produção" (fecha quando o pedido fica pronto; sai se o pedido for cancelado);
 *   Período de Teste registrado → "Integração de <nome>" para quem cadastra colaboradores.
 * - Horários/Escalas → servidor: o aparelho calcula o dia a dia (trabalha/folga e horário) dos colaboradores ligados
 *   a contas e manda só isso (P-46 item 5; nada de nome nem anotação do dia).
 * - Sair do sistema depois do tempo parado (padrão 15 min; posto do caixa não sai). Mexer avisa o servidor.
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
  const PADRAO_PARADO = 15;
  const SAI_PARADO = [['sim', 'Sim, depois do tempo parado'], ['nao', 'Nunca sai sozinho']];
  /** Telas dos pedidos (o mesmo endereço que o rotas.js grava ao abrir pelo menu). */
  const TELA_PEDIDO_COMPRA = { endereco: '#/saidas-mercadorias/lancamentos/compras-solicitacao', titulo: 'MER - Pedido de Compra' };
  const TELA_PEDIDO_PRODUCAO = { endereco: '#/saidas-mercadorias/lancamentos-producao/producao-pedidos', titulo: 'MER - Pedidos de Produção' };
  const TELA_MAPA_PRODUCAO = { endereco: '#/saidas-mercadorias/lancamentos-producao/producao-mapa', titulo: 'MER - Mapa de Produção' };
  const TELA_PERIODO_TESTE = { endereco: '#/saidas-despesas/lancamentos-colaboradores/trial', titulo: 'DES - Período de Teste' };
  const SUBTAREFAS_INTEGRACAO = ['Conferir documentos', 'Entregar uniforme', 'Treinamento/integração'];

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

  /* Configurações no padrão "linha por linha" da Nova Transferência (P-53): grupos com título pequeno e quadro de linhas. */
  const pecas = () => window.CicluzTransferencias.pecas;
  const SETA = '<path d="m9 6 6 6-6 6"/>';
  function linhaQueLeva(rotulo, resumo, aoToque, classe = '') {
    const b = el('button', 'transferencia-linha transferencia-linha-acao agenda-linha-leva' + (classe ? ' ' + classe : ''));
    b.type = 'button';
    const valor = el('span', 'transferencia-linha-valor', resumo);
    const seta = el('span', 'transferencia-seta');
    seta.setAttribute('aria-hidden', 'true');
    seta.innerHTML = svg(SETA);
    b.append(el('span', 'transferencia-linha-rotulo', rotulo), valor, seta);
    b.onclick = aoToque;
    return b;
  }
  const leitura = (rotulo, valor) => pecas().linha(rotulo, el('span', 'transferencia-linha-valor', valor));

  async function renderConfiguracoes() {
    const body = tela.body;
    body.replaceChildren(U.nota('Carregando…'));
    if (!A.conectado()) { body.replaceChildren(U.vazio('As configurações da Agenda ficam no servidor.', 'Entre com seu usuário para ver.')); return; }
    const minha = await A.minhaConfig();
    body.replaceChildren();
    if (minha.erro) { body.append(U.situacao(minha.erro, 'negativo')); return; }
    const P = pecas();
    const corpo = el('div', 'transferencia-tela transferencia-corpo agenda-form agenda-config');
    body.append(corpo);
    const m = minha.dados;
    const sua = P.secao('A sua Agenda', P.quadro(
      leitura('Expediente', m.descricaoExpediente),
      leitura('Fora do expediente', m.foraExpediente === 'bloquear' ? 'Fecha fora do expediente' : 'Abre a qualquer hora'),
      leitura('Sair sozinho', m.inatividadeEfetivaMinutos ? 'Depois de ' + minutosTexto(m.inatividadeEfetivaMinutos) + ' sem mexer' : 'Nunca sai sozinho'),
    ));
    if (m.bloqueadaAgora) sua.append(U.situacao('Agora você está fora do expediente: a Agenda abre de novo no horário.', 'atencao'));
    sua.append(U.nota(ehAdmin() ? 'Você é administrador: mude a sua regra na lista abaixo.' : 'Quem muda estas regras é o administrador.'));
    corpo.append(sua);
    if (!ehAdmin()) return;

    const [r, c] = await Promise.all([A.configs(), A.contasEColaboradores()]);
    if (r.erro || c.erro) { corpo.append(U.situacao(r.erro || c.erro, 'negativo')); return; }
    const colaboradorDe = new Map(c.dados.contas.map((x) => [x.usuarioId, x.colaboradorId]));
    const linhas = r.dados.pessoas.filter((p) => p.ativo).map((p) => {
      const pessoa = { ...p, colaboradorId: colaboradorDe.get(p.usuarioId) || '' };
      const nomeColab = pessoa.colaboradorId && colaboradoresDoAparelho().find((x) => x.id === pessoa.colaboradorId);
      const det = [pessoa.colaboradorId ? 'Escala de ' + (nomeColab ? nomeColab.name : 'colaborador ligado') : resumoExpediente(p)];
      if (p.foraExpediente === 'bloquear') det.push('bloqueia fora do expediente');
      det.push(p.saiPorTempoParado === false ? 'nunca sai sozinho' : 'sai em ' + minutosTexto(p.inatividadeMinutos || PADRAO_PARADO) + ' parado');
      const l = linhaQueLeva(p.nome, det.join(' · '), () => editarConfig(pessoa), 'agenda-config-linha');
      l.setAttribute('aria-label', 'Configurar a Agenda de ' + p.nome);
      return l;
    });
    corpo.append(P.secao('Pessoas', P.quadro(...linhas), U.nota('Ligue cada pessoa ao colaborador do cadastro: o expediente passa a vir dos Horários/Escalas dele. Sem colaborador ligado, vale o expediente escrito aqui. A hora fora do expediente aparece no Desempenho e não vai para a folha de pagamento.')));

    // Telas em que o ícone roxo de agendar aparece (P-53): o administrador decide.
    await carregarTelasIcone();
    const todas = telasDoMenu();
    const ligadas = todas.filter((t) => iconeLigado(t.endereco)).length;
    corpo.append(P.secao('Ícone de agendar', P.quadro(linhaQueLeva('Telas com o ícone', ligadas + ' de ' + todas.length, () => escolherTelas())),
      U.nota('O ícone roxo da barra de baixo cria uma tarefa ligada à tela aberta (com repetição e, onde a tela conta, a ação que conclui sozinha). Começa ligado em todas, menos nos formulários de lançamento.')));
  }

  /** Lista de todas as telas do menu, por origem, com Sim/Não do ícone de agendar. Grava cada mudança na hora. */
  function escolherTelas() {
    const P = pecas();
    U.dialogo({
      titulo: 'Telas com o ícone de agendar', cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog agenda-sub-janela',
      aoFechar: () => renderConfiguracoes(),
      montar: (form, dlg) => {
        const repetido = dlg.querySelector('.compras-dialog-sub');
        if (repetido) repetido.remove();
        const corpo = el('div', 'transferencia-tela transferencia-corpo agenda-form');
        form.append(corpo);
        const porOrigem = new Map();
        telasDoMenu().forEach((t) => { const k = t.origem + ' · ' + t.secao; porOrigem.set(k, [...(porOrigem.get(k) || []), t]); });
        porOrigem.forEach((telas, origem) => {
          corpo.append(P.secao(origem, P.quadro(...telas.map((t) => {
            const chave = P.chave(t.titulo, iconeLigado(t.endereco), ['Sim', 'Não'], async (sim) => {
              const r = await A.definirTelaIcone(t.endereco, sim);
              if (r.erro) { U.avisar(r.erro); return; }
              excecoesIcone[t.endereco] = sim;
              aplicarIcone();
            });
            const l = P.linha(t.titulo, chave);
            l.title = t.secao;
            return l;
          }))));
        });
        corpo.append(U.nota('Cada mudança vale na hora, para todas as pessoas.'));
        return {};
      },
    });
  }

  /** Colaboradores do cadastro deste aparelho (o cadastro não vai para o servidor: P-11). */
  function colaboradoresDoAparelho() {
    try { return (window.CicluzPeople && window.CicluzPeople.selectable()) || []; } catch { return []; }
  }

  function editarConfig(p) {
    let dias = new Set(p.expedienteDias);
    const P = pecas();
    U.dialogo({
      titulo: 'Agenda de ' + p.nome,
      cor: COR,
      corTexto: COR_TEXTO,
      classe: 'agenda-dialog',
      rotuloSalvar: 'Salvar configuração',
      montar: (form, dlg) => {
        const repetido = dlg.querySelector('.compras-dialog-sub');
        if (repetido) repetido.remove();
        const corpo = el('div', 'transferencia-tela transferencia-corpo agenda-form');
        form.append(corpo);
        const grupoDias = el('div', 'compras-chips agenda-dias');
        grupoDias.setAttribute('role', 'group');
        grupoDias.setAttribute('aria-label', 'Dias do expediente');
        const desenharDias = () => grupoDias.replaceChildren(...DIAS.map(([d, nome]) => {
          const b = botao(nome, () => { if (dias.has(d)) dias.delete(d); else dias.add(d); desenharDias(); }, 'compras-chip' + (dias.has(d) ? ' ativo' : ''));
          b.setAttribute('aria-pressed', String(dias.has(d)));
          return b;
        }));
        desenharDias();
        const inicio = U.campoHora({ rotulo: 'Início do expediente', valor: p.expedienteInicio || '' });
        const fim = U.campoHora({ rotulo: 'Fim do expediente', valor: p.expedienteFim || '' });
        const fora = U.seletor(FORA, p.foraExpediente);
        const parado = U.roletaNumero({ rotulo: 'Sair do sistema depois de quantos minutos parado', titulo: 'Minutos parado', min: 1, max: 480, valor: p.inatividadeMinutos ? String(p.inatividadeMinutos) : '' });
        parado.input.placeholder = 'Padrão: ' + PADRAO_PARADO + ' min';
        // Quem o administrador escolhe que nunca sai sozinho (Zé, 25/11/2026): o tempo fica guardado, sem efeito.
        const sai = U.seletor(SAI_PARADO, p.saiPorTempoParado === false ? 'nao' : 'sim');
        const linhaParado = P.linhaDe('Minutos parado', parado.input);
        parado.input.setAttribute('aria-label', 'Sair do sistema depois de quantos minutos parado');
        linhaParado.append(parado.painel);
        P.abreAoTocarNaLinha(linhaParado, parado.input, parado.painel);
        const linhaSai = P.linhaDe('Sair sozinho por tempo parado', sai);
        // A linha dos minutos só existe com "Sim" (a linha tem display:flex: entra e sai do quadro, sem hidden).
        const mostrarParado = () => { if (sai.value === 'nao') linhaParado.remove(); else if (!linhaParado.isConnected && linhaSai.parentElement) linhaSai.after(linhaParado); };
        sai.addEventListener('change', mostrarParado);
        const eu = perfil() && perfil().usuarioId === p.usuarioId;
        if (eu) { fora.value = 'permitir'; fora.disabled = true; }
        // Colaborador ligado (pelo id): só dá para escolher num aparelho que tem o cadastro de colaboradores.
        const cadastro = colaboradoresDoAparelho().filter((x) => x.active || x.id === p.colaboradorId);
        const opcoes = cadastro.map((x) => [x.id, x.name + (x.jobName ? ' · ' + x.jobName : '') + (x.active ? '' : ' (inativo)')]);
        if (p.colaboradorId && !cadastro.some((x) => x.id === p.colaboradorId)) opcoes.unshift([p.colaboradorId, 'Colaborador ligado (o cadastro não está neste aparelho)']);
        const colab = U.seletor(opcoes, p.colaboradorId, 'Nenhum: usa o expediente abaixo');
        corpo.append(
          P.secao('Colaborador', P.quadro(P.linhaDe('Colaborador do cadastro', colab)), U.nota(cadastro.length
            ? 'Com colaborador, o expediente de cada dia vem dos Horários/Escalas dele. O de baixo vale só nos dias sem escala.'
            : 'O cadastro de colaboradores não está neste aparelho: ligue pelo aparelho que tem o cadastro (o iPad).')),
          P.secao('Expediente', P.quadro(
            P.linha('Dias', grupoDias),
            P.abreAoTocarNaLinha(P.linha('Início', inicio.caixa, inicio.painel), inicio.input, inicio.painel),
            P.abreAoTocarNaLinha(P.linha('Fim', fim.caixa, fim.painel), fim.input, fim.painel),
          )),
          P.secao('Regras', P.quadro(P.linhaDe('Fora do expediente', fora), linhaSai, linhaParado),
            U.nota((eu ? 'Você não pode bloquear a sua própria Agenda. ' : 'Bloqueado: fora do horário a Agenda e o chat não abrem. ') + 'Minutos vazios = o padrão de ' + PADRAO_PARADO + '. Posto do caixa nunca sai sozinho.')),
        );
        mostrarParado();
        return { inicio: inicio.input, fim: fim.input, fora, parado: parado.input, colab, sai };
      },
      salvar: async (c) => {
        const corpo = {
          expedienteDias: [...dias].sort(), expedienteInicio: c.inicio.value, expedienteFim: c.fim.value,
          foraExpediente: c.fora.value, inatividadeMinutos: c.parado.value ? Number(c.parado.value) : null, saiPorTempoParado: c.sai.value !== 'nao',
        };
        // As mesmas regras do servidor, com a mensagem antes de mandar.
        if (Boolean(corpo.expedienteInicio) !== Boolean(corpo.expedienteFim)) return 'Informe o início e o fim do expediente, ou nenhum dos dois.';
        if (corpo.expedienteInicio && corpo.expedienteFim <= corpo.expedienteInicio) return 'O fim do expediente deve ser depois do início.';
        if (corpo.expedienteInicio && !corpo.expedienteDias.length) return 'Marque os dias do expediente.';
        if (!corpo.expedienteInicio && corpo.foraExpediente === 'bloquear' && !c.colab.value) return 'Para bloquear fora do expediente, informe o expediente ou ligue o colaborador.';
        if (corpo.inatividadeMinutos !== null && !(corpo.inatividadeMinutos >= 1 && corpo.inatividadeMinutos <= 480 && Number.isInteger(corpo.inatividadeMinutos))) return 'Minutos parado: um número inteiro de 1 a 480.';
        if (c.colab.value !== (p.colaboradorId || '')) {
          const l = await A.ligarColaborador(p.usuarioId, c.colab.value);
          if (l.erro) return l.erro;
          // Ligou agora: manda já o expediente dos Horários/Escalas (não espera o próximo envio do dia).
          enviarEscalas(true);
        }
        const r = await A.salvarConfig(p.usuarioId, corpo);
        if (r.erro) return r.erro;
        U.avisar('Configuração salva.');
        renderConfiguracoes();
        return undefined;
      },
    });
  }

  /* ================= Desempenho (aba da Agenda) ================= */
  // Quadro "Período" (atalhos + datas) e um cartão por pessoa: iniciais, % no prazo em destaque, barra com legenda,
  // os quatro indicadores no desenho dos da Agenda (Para hoje, Programados…) e a linha de apoio.
  const periodo = { de: '', ate: '', atalho: 'mes' };
  const ICONES_DESEMPENHO = {
    'no-prazo': '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6"/>',
    'fora-prazo': '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"/>',
    'nao-feitas': '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 9l6 6M15 9l-6 6"/>',
    'em-aberto': '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  };
  const iniciais = (nome) => String(nome || '?').split(/\s+/).filter((p) => /^[A-Za-zÀ-ÿ]/.test(p)).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
  function mesAtual() {
    const hoje = D.isoData(new Date());
    const de = hoje.slice(0, 8) + '01';
    return { de, ate: D.somarDias(D.somarMeses(de, 1), -1) };
  }
  function aplicarAtalho(v) {
    const hoje = D.isoData(new Date());
    if (v === 'mes') Object.assign(periodo, mesAtual());
    else if (v === 'anterior') Object.assign(periodo, { de: D.somarMeses(mesAtual().de, -1), ate: D.somarDias(mesAtual().de, -1) });
    else if (v === '7') Object.assign(periodo, { de: D.somarDias(hoje, -6), ate: hoje });
    periodo.atalho = v;
  }
  function renderDesempenho(body) {
    if (!periodo.de) aplicarAtalho('mes');
    const tela = el('div', 'agenda-desempenho');

    // Período
    const quadro = U.secao(ehAdmin() ? 'Desempenho da equipe' : 'O seu desempenho');
    const filtros = el('div', 'agenda-desempenho-periodo');
    const de = U.entrada('date', periodo.de);
    const ate = U.entrada('date', periodo.ate);
    const atalhos = U.chips([['mes', 'Este mês'], ['anterior', 'Mês passado'], ['7', 'Últimos 7 dias']], periodo.atalho, (v) => {
      aplicarAtalho(v);
      de.value = periodo.de;
      ate.value = periodo.ate;
      carregar();
    });
    atalhos.setAttribute('aria-label', 'Período');
    const datas = el('div', 'agenda-desempenho-datas');
    datas.append(U.campo('De', de), U.campo('Até', ate));
    filtros.append(atalhos, datas);
    quadro.append(filtros);
    const mudou = () => {
      if (!de.value || !ate.value) return;
      Object.assign(periodo, { de: de.value, ate: ate.value, atalho: '' });
      atalhos.atualizar('');
      carregar();
    };
    de.addEventListener('change', mudou);
    ate.addEventListener('change', mudou);

    const resultado = el('div', 'agenda-desempenho-lista');
    resultado.setAttribute('aria-live', 'polite');
    tela.append(quadro, resultado, U.nota('Conta os compromissos com data no período em que a pessoa é responsável. No prazo = concluído até o término do compromisso (sem término, até o fim do dia). Hora fora do expediente: só registro, não vai para a folha.'));
    body.append(tela);

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
    const feitas = p.noPrazo + p.foraDoPrazo;
    const pct = feitas ? Math.round((p.noPrazo / feitas) * 100) : null;
    const sec = el('section', 'compras-secao agenda-desempenho-cartao');

    const cab = el('div', 'compras-secao-cab agenda-desempenho-cab');
    const quem = el('div', 'agenda-desempenho-quem');
    const av = el('span', 'agenda-avatar', iniciais(p.nome));
    av.setAttribute('aria-hidden', 'true');
    const nome = el('div', 'agenda-desempenho-nome');
    nome.append(el('h3', null, p.nome), el('small', null, p.recebidas + (p.recebidas === 1 ? ' compromisso recebido' : ' compromissos recebidos')));
    quem.append(av, nome);
    const destaque = el('div', 'agenda-desempenho-pct');
    destaque.append(el('b', null, pct === null ? '—' : pct + '%'), el('small', null, pct === null ? 'nada concluído' : 'no prazo'));
    cab.append(quem, destaque);

    const partes = [['no-prazo', 'No prazo', p.noPrazo], ['fora-prazo', 'Fora do prazo', p.foraDoPrazo], ['nao-feitas', 'Não feitas', p.naoFeitas], ['em-aberto', 'Em aberto', p.emAberto]];
    const barra = el('div', 'agenda-desempenho-barra');
    barra.setAttribute('role', 'img');
    barra.setAttribute('aria-label', partes.map(([, t, n]) => n + ' ' + t.toLowerCase()).join(', '));
    partes.forEach(([k, , n]) => { if (!n) return; const s = el('span', 'agenda-desempenho-parte ' + k); s.style.flexGrow = String(n); barra.append(s); });

    const indicadores = el('div', 'compras-indicadores agenda-desempenho-indicadores');
    partes.forEach(([k, t, n]) => {
      const c = el('div', 'compras-indicador agenda-automatica agenda-desempenho-indicador d-' + k);
      const i = el('span', 'agenda-automatica-icone');
      i.innerHTML = svg(ICONES_DESEMPENHO[k]);
      c.append(i, el('b', null, String(n)), el('small', null, t));
      indicadores.append(c);
    });

    const apoio = el('dl', 'agenda-desempenho-apoio');
    const item = (t, v) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); apoio.append(d); };
    item('Resposta média', p.tempoMedioRespostaHoras === null ? '—' : String(p.tempoMedioRespostaHoras).replace('.', ',') + ' h');
    item('Fora do expediente', minutosTexto(p.minutosForaExpediente) + (p.diasForaSemExpediente ? ' + ' + p.diasForaSemExpediente + (p.diasForaSemExpediente === 1 ? ' dia de folga' : ' dias de folga') : ''));

    const corpo = el('div', 'agenda-desempenho-corpo');
    corpo.append(barra, indicadores, apoio);
    sec.append(cab, corpo);
    return sec;
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

  /* ================= Regras por permissão (P-46 itens 1 e 2) ================= */
  // O servidor escolhe quem recebe (todas as contas ativas com a permissão) e recusa quem dispara sem ela.
  /** Pedido de produção enviado: "Lançar a produção" para quem tem "Lançar pedido e ordem de produção". */
  function producaoParaLancar({ pedidoId, numero, data, hora }) {
    if (!A.conectado()) return;
    A.tarefaDeTela({
      vinculoRef: 'producao:lancar:' + pedidoId, vinculoTela: TELA_MAPA_PRODUCAO.endereco, vinculoTitulo: TELA_MAPA_PRODUCAO.titulo,
      titulo: 'Lançar a produção do pedido' + (numero ? ' nº ' + numero : ''), data: data || '', hora: hora || '',
      notas: 'Abra o Mapa de Produção e lance o que foi produzido em cima do pedido: a tarefa é concluída sozinha quando o pedido fica pronto.',
      paraQuemTem: 'producao_lancar',
    });
  }
  const producaoLancada = (pedidoId) => { if (A.conectado()) A.concluirPorVinculo('producao:lancar:' + pedidoId); };
  const producaoCancelada = (pedidoId) => { if (A.conectado()) A.cancelarPorVinculo('producao:lancar:' + pedidoId); };
  /** Período de Teste registrado: "Integração de <nome>" para quem cadastra colaboradores. Ligação pelo id. */
  function integracaoDoColaborador({ colaboradorId, nome, inicio }) {
    if (!A.conectado() || !colaboradorId) return;
    A.tarefaDeTela({
      vinculoRef: 'pessoas:integracao:' + colaboradorId, vinculoTela: TELA_PERIODO_TESTE.endereco, vinculoTitulo: TELA_PERIODO_TESTE.titulo,
      titulo: 'Integração de ' + String(nome || 'colaborador novo').slice(0, 180), data: inicio || '',
      notas: 'Colaborador novo começando o Período de Teste. Marque cada passo quando for feito.',
      paraQuemTem: 'pessoas_editar', subtarefas: SUBTAREFAS_INTEGRACAO,
    });
  }

  /* ================= Horários/Escalas → servidor (P-46 item 5) ================= */
  // O cálculo do dia é o da tela de Horários/Escalas (fonte única: CicluzJornada.dayInfo/shiftFor). Vai só o
  // resultado — trabalha ou folga e o horário — dos colaboradores ligados a contas. Dia sem escala não vai
  // (vale o expediente das Configurações da Agenda). Só manda quando mudou (marca no aparelho).
  const MARCA_ESCALA = 'cicluz-agenda-escala-enviada-v1';
  const podeMandarEscala = () => ehAdmin() || Boolean(perfil() && (perfil().permissoes || []).includes('pessoas_editar'));
  let enviandoEscala = null;
  function diasDaEscala(colaboradorId, de, ate) {
    const J = window.CicluzJornada;
    const dias = [];
    for (let dia = de; dia <= ate; dia = D.somarDias(dia, 1)) {
      const info = J.dayInfo(colaboradorId, dia);
      if (info.work === null || info.work === undefined) continue;
      if (!info.work) { dias.push({ dia, trabalha: false }); continue; }
      const t = J.shiftFor(colaboradorId, dia, info.slot);
      const inicio = t && t.shift && t.shift.start, fim = t && t.shift && t.shift.end;
      if (inicio && fim && inicio !== fim) dias.push({ dia, trabalha: true, inicio, fim });
    }
    return dias;
  }
  async function mandarEscalas(forcar) {
    if (!A.conectado() || !podeMandarEscala() || !window.CicluzJornada) return;
    const r = await A.contasEColaboradores();
    if (r.erro) return;
    const ligados = [...new Set(r.dados.contas.map((c) => c.colaboradorId).filter(Boolean))];
    if (!ligados.length) return;
    const hoje = D.isoData(new Date());
    const de = D.somarDias(hoje, -31), ate = D.somarDias(hoje, 62);
    try { window.CicluzJornada.load(); } catch { /* lê o que já está carregado */ }
    // Aparelho sem a escala (celular, computador: ela só mora no iPad) não manda nada — não pode apagar a do servidor.
    const escala = window.CicluzJornada.get && window.CicluzJornada.get();
    if (!escala || !(escala.links || []).length) return;
    const colaboradores = ligados.map((colaboradorId) => ({ colaboradorId, dias: diasDaEscala(colaboradorId, de, ate) })).filter((c) => c.dias.length);
    if (!colaboradores.length) return;
    const corpo = { de, ate, colaboradores };
    // Marca curta do que foi mandado (não guarda os horários de novo no aparelho).
    const marca = [...JSON.stringify(corpo)].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7).toString(36);
    let anterior = '';
    try { anterior = localStorage.getItem(MARCA_ESCALA) || ''; } catch { /* sem armazenamento: manda */ }
    if (!forcar && anterior === marca) return;
    const e = await A.enviarExpedientes(corpo);
    if (!e.erro) { try { localStorage.setItem(MARCA_ESCALA, marca); } catch { /* manda de novo da próxima vez */ } }
  }
  function enviarEscalas(forcar) {
    if (enviandoEscala) return enviandoEscala;
    enviandoEscala = mandarEscalas(forcar).catch(() => undefined).finally(() => { enviandoEscala = null; });
    return enviandoEscala;
  }


  /* ================= Ações programadas por tela (P-53, áudio do Rodrigo de 25/11/2026) ================= */
  // Cada tela que sabe contar declara as suas ações. A tarefa ligada à tela pode esperar uma delas (e a quantidade):
  // ao chegar na quantidade, conclui sozinha. As outras telas entram aqui uma a uma, conforme forem pedidas.
  const TELA_PRODUTOS = '#/saidas-mercadorias/cadastros-geral/compras-produtos';
  const ACOES_POR_TELA = {
    [TELA_PRODUTOS]: [
      { id: 'produtos:excluir', rotulo: 'Excluir (inativar) produto' },
      { id: 'produtos:cadastrar', rotulo: 'Cadastrar produto' },
      { id: 'produtos:alterar', rotulo: 'Alterar produto' },
    ],
  };
  const acoesDaTela = (endereco) => ACOES_POR_TELA[endereco] || [];
  /** A tela avisa: a ação foi feita n vezes. O servidor soma e conclui a tarefa que chegou na quantidade. */
  async function acaoFeita(acao, n = 1) {
    if (!A.conectado() || A.situacao !== 'servidor') return;
    const r = await A.acaoFeita(acao, n);
    if (r.erro || !r.dados.tarefas.length) return;
    // O progresso já aparece no aviso, sem esperar a próxima leitura da Agenda.
    r.dados.tarefas.forEach((t) => { const i = A.item(t.id); if (i) i.acaoFeitas = t.feitas; });
    pintarAviso();
    const concluidas = r.dados.tarefas.filter((t) => t.concluiu);
    if (concluidas.length) U.avisar(concluidas.length === 1 ? 'Tarefa da Agenda concluída: ' + ((A.item(concluidas[0].id) || {}).titulo || 'feita') + '.' : concluidas.length + ' tarefas da Agenda concluídas.');
    await A.atualizar(true);
    pintarAviso();
  }

  /* Telas em que o ícone de agendar aparece: o administrador decide (Configurações da Agenda). Padrão: todas,
     menos os formulários de lançamento. Só as exceções ficam no servidor. */
  const DESLIGADAS_PADRAO = new Set([
    '#/entradas-vendas/lancamentos/vz-lan-vnd-vendas', '#/transferencias-contas/lancamentos/vz-lan-cnt-transfere-ncias',
    '#/saidas-despesas/lancamentos/vz-lan-des-despesas', '#/saidas-mercadorias/lancamentos/vz-lan-mer-mercadorias',
    '#/saidas-retiradas/lancamentos/vz-lan-ret-retiradas',
  ]);
  let excecoesIcone = {};
  const iconeLigado = (endereco) => (endereco in excecoesIcone ? excecoesIcone[endereco] : !DESLIGADAS_PADRAO.has(endereco));
  async function carregarTelasIcone() {
    if (!A.conectado()) return;
    const r = await A.telasIcone();
    if (!r.erro) excecoesIcone = r.dados.telas || {};
    aplicarIcone();
  }
  function aplicarIcone() {
    const t = telaAtual();
    document.body.classList.toggle('agendar-desligado', Boolean(t && !iconeLigado(t.endereco)));
  }
  /** Todas as telas do menu (origem, seção e cartão), com o endereço que o rotas.js grava. */
  function telasDoMenu() {
    const R = window.CicluzRotas;
    if (!R || typeof sections === 'undefined' || typeof menuCardsOf !== 'function') return [];
    const saida = [];
    sections.forEach(([nome, subs], i) => subs.forEach((s) => {
      let cartoes = [];
      try { cartoes = menuCardsOf(i, s, 'tree'); } catch { cartoes = []; }
      cartoes.forEach((c) => { if (Array.isArray(c) && c[2]) saida.push({ endereco: R.montarEndereco([R.slugMenu(nome), R.slug(s), R.slug(c[2])]), titulo: c[0], origem: nome.split(' · ')[0], secao: s }); });
    }));
    return saida;
  }

  /* Aviso na tela (P-53): tarefas de hoje ligadas à tela aberta, com "Feito" (e o progresso, quando há ação que conta). */
  const avisoFechado = new Set();
  let aviso = null;
  function tarefasDaTela(endereco) {
    if (A.situacao !== 'servidor') return [];
    const hoje = D.isoData(new Date());
    return A.visiveis().filter((i) => !i.concluida && i.vinculoTela === endereco && (!i.data || i.data <= hoje) && A.acesso(i).concluir && !avisoFechado.has(i.id + '|' + (i.data || '')));
  }
  function pintarAviso() {
    const t = telaAtual();
    const itens = t ? tarefasDaTela(t.endereco) : [];
    if (!itens.length) { if (aviso) aviso.hidden = true; return; }
    if (!aviso) {
      aviso = el('aside', 'agenda-aviso-tela');
      aviso.setAttribute('role', 'status');
      aviso.setAttribute('aria-label', 'Tarefas da Agenda nesta tela');
      document.body.append(aviso);
    }
    aviso.hidden = false;
    const cab = el('div', 'agenda-aviso-cab');
    const fechar = botao('', () => { itens.forEach((i) => avisoFechado.add(i.id + '|' + (i.data || ''))); aviso.hidden = true; }, 'agenda-aviso-fechar');
    fechar.innerHTML = svg('<path d="M6 6l12 12M18 6 6 18"/>');
    fechar.setAttribute('aria-label', 'Fechar o aviso');
    cab.append(el('b', null, 'Hoje nesta tela'), fechar);
    const quadro = el('div', 'agenda-aviso-quadro');
    itens.slice(0, 3).forEach((i) => {
      const linha = el('div', 'agenda-aviso-linha');
      const texto = el('span', 'agenda-aviso-texto');
      texto.append(el('b', null, i.titulo));
      if (i.acaoTela && i.acaoQuantidade) texto.append(el('small', null, i.acaoFeitas + ' de ' + i.acaoQuantidade + ' · conclui sozinha ao chegar'));
      else if (i.data && i.data < D.isoData(new Date())) texto.append(el('small', null, 'Atrasada desde ' + D.dataCurta(i.data)));
      const feito = botao('Feito', async () => {
        feito.disabled = true;
        const r = await A.concluir(i.id, true, i.data);
        if (r.erro) { feito.disabled = false; U.avisar(r.erro); return; }
        U.avisar('Tarefa concluída na Agenda.');
        pintarAviso();
      }, 'btn agenda-aviso-feito');
      linha.append(texto, feito);
      quadro.append(linha);
    });
    if (itens.length > 3) quadro.append(el('p', 'agenda-aviso-mais', '+ ' + (itens.length - 3) + ' na Agenda'));
    aviso.replaceChildren(cab, quadro);
  }
  function aoTrocarDeTela() { aplicarIcone(); pintarAviso(); }
  window.addEventListener('hashchange', () => setTimeout(aoTrocarDeTela, 0));
  window.addEventListener('popstate', () => setTimeout(aoTrocarDeTela, 0));
  document.addEventListener('cicluz-rota-mudou', aoTrocarDeTela);
  document.addEventListener('cicluz-agenda-mudou', () => pintarAviso());

  /* ================= Sair do sistema depois do tempo parado ================= */
  // Padrão de 15 minutos no sistema todo (P-46 item 4); posto do caixa não sai. A tela sai sozinha e, enquanto a
  // pessoa mexe, avisa o servidor a cada minuto (as atualizações automáticas não contam como uso lá).
  let limiteMs = 0;
  let timer = null;
  let avisoSaida = null;
  let ultimo = 0;
  let ultimoSinal = Date.now();
  function sair() {
    const b = document.querySelector('[aria-label="Sair do sistema"]');
    if (b) b.click(); else location.href = 'entrar.html?sair=1';
  }
  function mexeu() {
    const agora = Date.now();
    if (agora - ultimo < 2000) return; // não refaz o relógio a cada movimento
    ultimo = agora;
    if (agora - ultimoSinal > 60000 && window.CicluzSync && window.CicluzSync.api) {
      ultimoSinal = agora;
      window.CicluzSync.api('/sessao').catch(() => undefined);
    }
    if (!limiteMs) return;
    clearTimeout(timer);
    clearTimeout(avisoSaida);
    if (limiteMs > 60000) avisoSaida = setTimeout(() => U.avisar('Você vai sair do sistema em 1 minuto por falta de uso.'), limiteMs - 60000);
    timer = setTimeout(sair, limiteMs);
  }
  async function iniciarInatividade() {
    if (!A.conectado()) return;
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, mexeu, { passive: true, capture: true }));
    const r = await A.minhaConfig();
    if (!r.erro && r.dados.inatividadeEfetivaMinutos) limiteMs = r.dados.inatividadeEfetivaMinutos * 60000;
    mexeu();
    // Horários/Escalas: confere ao abrir e a cada 10 minutos (só manda o que mudou).
    enviarEscalas(false);
    // Ações programadas (P-53): telas do ícone de agendar e o aviso da tela aberta.
    carregarTelasIcone();
    pintarAviso();
    setInterval(() => { if (document.visibilityState === 'visible') enviarEscalas(false); }, 10 * 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarInatividade); else setTimeout(iniciarInatividade, 0);

  window.CicluzAgendaRotina = {
    abrirConfiguracoes, renderDesempenho, agendarDaTela, abrirTela, telaAtual,
    tarefaDoPedidoDeCompra, pedidoDeCompraFeito, tarefaDoPedidoDeProducao, pedidoDeProducaoFeito,
    producaoParaLancar, producaoLancada, producaoCancelada, integracaoDoColaborador, enviarEscalas,
    acoesDaTela, acaoFeita, telasDoMenu, iconeLigado, carregarTelasIcone, DESLIGADAS_PADRAO, TELA_PRODUTOS,
    TELA_PEDIDO_COMPRA, TELA_PEDIDO_PRODUCAO, TELA_MAPA_PRODUCAO, TELA_PERIODO_TESTE,
  };
})();
