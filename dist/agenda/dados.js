/*
 * Agenda — a ÚNICA porta da tela para a API da Agenda (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 5).
 * O servidor guarda cada compromisso e confere a permissão; a tela recebe só o que a pessoa vê, com `acesso`
 * pronto (a tela não calcula permissão). Gravar é sempre pelo servidor e devolve Promise.
 * - Atualiza ao abrir, ao voltar para a aba e a cada 30 s, perguntando "mudou algo?" (If-None-Match → 304).
 * - Sem internet: mostra a última cópia (cicluz-agenda-cache-v1, só neste aparelho, com o usuário dentro; apagada
 *   no "Sair") e não grava.
 * - Antes da transferência (situacao 'nao-transferida'): nada para mostrar; o administrador leva a Agenda.
 * - Documento antigo (cicluz-agenda-v1): não é lido nem gravado aqui. A cópia que o aparelho ainda tiver vai UMA vez
 *   para o servidor (guardada para conferência) e fica marcada em cicluz-agenda-transferida-v1. Nada é apagado.
 * Conversão API ↔ tela num lugar só (deApi / paraFormulario).
 */
(function () {
  'use strict';
  const R = window.CicluzAgendaRegras;
  const CHAVE_CACHE = 'cicluz-agenda-cache-v1';
  const CHAVE_ANTIGA = 'cicluz-agenda-v1';
  const MARCA_TRANSFERIDA = 'cicluz-agenda-transferida-v1';
  const INTERVALO = 30000;
  const CONCLUIDO = 'concluido';
  const CORES_LISTA = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#dc2626', '#db2777', '#0891b2', '#ca8a04', '#52525b'];
  // Cor só #rrggbb entra no desenho (G2); qualquer outra vira a primeira cor.
  const corSegura = (c) => (/^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? c : CORES_LISTA[0]);
  const NADA = { ver: false, editar: false, concluir: false, excluir: false, gestor: false, responsavel: false };
  const SEM = {
    editar: 'Você não tem permissão para editar este compromisso.',
    concluir: 'Você não tem permissão para concluir este compromisso.',
    excluir: 'Você não tem permissão para excluir este compromisso.',
  };
  const SEM_INTERNET = 'Sem internet: a Agenda mostra a última cópia. Para criar ou alterar, conecte.';
  const NAO_TRANSFERIDA = 'A Agenda está sendo levada para o servidor. Volte em alguns minutos.';

  const novoId = (prefixo) => prefixo + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const perfil = () => (window.CicluzSessao && window.CicluzSessao.perfil) || null;
  const conectado = () => { const p = perfil(); return Boolean(p && p.usuarioId && p.usuarioId !== 'local' && window.CicluzSync && window.CicluzSync.api); };

  let dados = { listas: [], colunas: [], itens: [], relacoes: [] };
  /** carregando | cache | servidor | sem-internet | nao-transferida | fora-expediente | erro */
  let situacao = 'carregando';
  /** Fora do expediente com a Agenda bloqueada (Configurações da Agenda): a mensagem do servidor. */
  let motivoBloqueio = '';
  let usuarioId = '';
  let etag = '';
  let pessoasLista = [];
  let ultimaResposta = null;
  /** Pedidos ao servidor em andamento (leitura ou gravação). */
  let emAndamento = 0;
  /** Sobe a cada gravação que termina: leitura que começou antes dela é descartada (não volta a versão velha). */
  let gravacoes = 0;

  const avisar = (externo) => document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou', { detail: { externo: Boolean(externo) } }));

  /* ---------- Conversão ---------- */
  function deApi(c) {
    return {
      id: c.id, listaId: c.grupoId, titulo: c.titulo, notas: c.notas, url: c.url, local: c.local, localizacao: c.localizacao,
      data: c.data, hora: c.hora, horaFim: c.horaFim, repeticao: c.repeticao, alerta: c.alerta, adiadoPara: c.adiadoPara,
      prioridade: c.prioridade, sinalizado: c.sinalizado, etiquetas: c.etiquetas || [], subtarefas: c.subtarefas || [],
      pessoas: c.pessoas || [], avaliacao: c.avaliacao || { tipo: '', notas: [] }, colunaId: c.colunaId, ordem: c.ordem,
      concluida: c.concluida, concluidaEm: c.concluidaEm, origemId: c.origemId, ocorrencia: c.ocorrencia,
      // Tela ligada (ícone roxo de agendar / tarefa criada por uma tela): a tarefa abre essa tela.
      vinculoTela: c.vinculoTela || '', vinculoTitulo: c.vinculoTitulo || '', vinculoRef: c.vinculoRef || '',
      acaoTela: c.acaoTela || '', acaoQuantidade: c.acaoQuantidade || null, acaoFeitas: c.acaoFeitas || 0,
      // O gestor é quem criou: o nome da tela continua `criadoPor`.
      criadoEm: c.criadoEm, criadoPor: c.gestorId, atualizadoEm: c.atualizadoEm, versao: c.versao, acesso: c.acesso || NADA,
    };
  }
  const listaDeApi = (g) => ({ id: g.id, nome: g.nome, cor: corSegura(g.cor), icone: g.icone || 'lista', ordenacao: g.ordenacao || 'manual', ordem: g.ordem, donoId: g.donoId, membro: g.membro, podeGerir: g.podeGerir, versao: g.versao, area: g.area || '' });

  /** Campos do formulário da tela → corpo da API. A tela não escolhe gestor, âncora nem `feitas` (são do servidor). */
  function paraFormulario(c) {
    const rep = c.repeticao && c.repeticao.tipo && c.repeticao.tipo !== 'nunca' ? c.repeticao : null;
    const fim = (rep && rep.fim) || {};
    const loc = c.localizacao && (Number.isFinite(c.localizacao.lat) || c.localizacao.aviso) ? c.localizacao : null;
    return {
      grupoId: c.listaId,
      titulo: String(c.titulo || '').trim(), notas: String(c.notas || '').trim(), url: String(c.url || '').trim(), local: String(c.local || '').trim(),
      localizacao: loc ? {
        ...(Number.isFinite(loc.lat) ? { lat: +loc.lat.toFixed(6) } : {}), ...(Number.isFinite(loc.lng) ? { lng: +loc.lng.toFixed(6) } : {}),
        aviso: loc.aviso || '', raio: Number(loc.raio) || 200,
      } : null,
      data: c.data || '', hora: c.hora || '', horaFim: c.horaFim || '',
      repeticao: rep ? {
        tipo: rep.tipo, intervalo: Math.max(1, Number(rep.intervalo) || 1), unidade: rep.unidade || 'semana',
        diasSemana: [...new Set((rep.diasSemana || []).map(Number))].sort(),
        fim: { tipo: fim.tipo || 'nunca', data: fim.data || '', vezes: Number(fim.vezes) || 0 },
      } : null,
      alerta: c.alerta === '' || c.alerta === null || c.alerta === undefined ? null : Number(c.alerta),
      prioridade: c.prioridade || 'normal', sinalizado: Boolean(c.sinalizado), etiquetas: R.normalizarEtiquetas(c.etiquetas),
      subtarefas: (c.subtarefas || []).map((s) => ({ ...(s.id ? { id: s.id } : {}), titulo: String(s.titulo || '').trim(), concluida: Boolean(s.concluida) })),
      pessoas: R.normalizarPessoas(c.pessoas), avaliacaoTipo: (c.avaliacao && c.avaliacao.tipo) || '', colunaId: c.colunaId || '',
      vinculoTela: c.vinculoTela || '', vinculoTitulo: c.vinculoTela ? String(c.vinculoTitulo || '').trim().slice(0, 120) : '',
      // Ação programada (P-53): só com tela ligada.
      acaoTela: c.vinculoTela && c.acaoTela ? c.acaoTela : '', acaoQuantidade: c.vinculoTela && c.acaoTela ? Math.min(365, Math.max(1, Number(c.acaoQuantidade) || 1)) : null,
    };
  }

  /* ---------- Estado em memória ---------- */
  function aplicarResposta(r) {
    ultimaResposta = r;
    usuarioId = r.usuarioId || '';
    if (!r.estado || !r.estado.noServidor) {
      dados = { listas: [], colunas: [], itens: [], relacoes: [] };
      return;
    }
    dados = {
      listas: (r.grupos || []).map(listaDeApi),
      colunas: (r.colunas || []).map((c) => ({ id: c.id, nome: c.nome, ordem: c.ordem })),
      itens: (r.compromissos || []).map(deApi),
      relacoes: (r.relacoes || []).map((x) => ({ id: x.id, de: x.de, para: x.para, rotulo: x.rotulo })),
    };
  }
  function guardarItem(c) {
    const novo = deApi(c);
    const n = dados.itens.findIndex((i) => i.id === novo.id);
    if (n >= 0) dados.itens[n] = novo; else dados.itens.push(novo);
    return novo;
  }
  function guardarLista(g) {
    const nova = listaDeApi(g);
    const n = dados.listas.findIndex((l) => l.id === nova.id);
    if (n >= 0) dados.listas[n] = nova; else dados.listas.push(nova);
    return nova;
  }
  /** Gravou: a próxima pergunta "mudou algo?" já traz a versão nova inteira. */
  const gravou = () => { etag = ''; avisar(false); };

  /* ---------- Cópia sem internet ---------- */
  function lerCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null');
      const p = perfil();
      // Cópia de outra conta (iPad compartilhado) é ignorada.
      return c && p && c.usuarioId === p.usuarioId && c.resposta ? c : null;
    } catch (e) { return null; }
  }
  function gravarCache() {
    const p = perfil();
    if (!p || !ultimaResposta) return;
    try { localStorage.setItem(CHAVE_CACHE, JSON.stringify({ usuarioId: p.usuarioId, salvoEm: new Date().toISOString(), resposta: ultimaResposta, pessoas: pessoasLista })); }
    catch (e) { /* aparelho cheio: segue só na memória */ }
  }
  function usarCache(motivo) {
    const c = lerCache();
    if (c) { aplicarResposta(c.resposta); pessoasLista = c.pessoas || []; }
    situacao = motivo;
    avisar(true);
  }

  /* ---------- Leitura ---------- */
  let buscando = null;
  /** Pergunta ao servidor. Sem mudança (304) não custa nada. forcar: busca inteira (sem If-None-Match). */
  function atualizar(forcar) {
    if (buscando) return buscando;
    emAndamento++;
    buscando = buscar(forcar).finally(() => { buscando = null; emAndamento--; });
    return buscando;
  }
  async function buscar(forcar) {
    if (!conectado()) return usarCache('sem-internet');
    const marca = gravacoes;
    let resp;
    try {
      // Leitura automática (a cada 30 s e depois de gravar): não conta como "mexeu" (P-46 item 4).
      resp = await fetch('/api/agenda', { credentials: 'same-origin', headers: Object.assign({ 'X-Cicluz-Automatico': '1' }, etag && !forcar ? { 'If-None-Match': etag } : {}) });
    } catch (e) {
      return usarCache('sem-internet');
    }
    // Uma gravação terminou enquanto esta leitura andava: a resposta pode ser de antes dela. Busca de novo.
    if (marca !== gravacoes) { etag = ''; setTimeout(() => atualizar(true), 0); return; }
    if (resp.status === 304) {
      if (situacao !== 'servidor') { situacao = 'servidor'; avisar(true); }
      return;
    }
    if (!resp.ok) {
      const corpo = resp.status === 403 ? await resp.json().catch(() => null) : null;
      if (corpo && corpo.code === 'AGENDA_FORA_EXPEDIENTE') return bloquear(corpo.title || corpo.detail);
      if (situacao === 'carregando' || situacao === 'cache') usarCache('erro');
      return;
    }
    const json = await resp.json().catch(() => null);
    const r = json && json.data;
    if (!r || !r.estado) return usarCache('erro');
    etag = resp.headers.get('ETag') || '';
    aplicarResposta(r);
    situacao = r.estado.noServidor ? 'servidor' : 'nao-transferida';
    if (r.estado.noServidor) {
      // Pessoa que a tela ainda não conhece (conta criada depois de a página abrir): busca as contas de novo.
      const conhecidas = new Set(pessoasLista.map((x) => x.id));
      const faltaAlguem = (r.compromissos || []).some((c) => c.gestorId && !conhecidas.has(c.gestorId) || (c.pessoas || []).some((x) => !conhecidas.has(x.id)));
      if (!pessoasLista.length || faltaAlguem) { await carregarPessoas(); document.dispatchEvent(new Event('cicluz-pessoas-carregadas')); }
      gravarCache();
      enviarCopiaAntiga();
    }
    avisar(true);
  }
  /** Fora do expediente: nada fica à mostra (nem a cópia do aparelho) até o horário voltar. */
  function bloquear(motivo) {
    motivoBloqueio = motivo || 'Fora do seu expediente.';
    dados = { listas: [], colunas: [], itens: [], relacoes: [] };
    try { localStorage.removeItem(CHAVE_CACHE); } catch (e) { /* sem acesso ao armazenamento */ }
    situacao = 'fora-expediente';
    avisar(true);
  }
  async function carregarPessoas() {
    try { pessoasLista = (await window.CicluzSync.api('/agenda/pessoas')).pessoas || []; } catch (e) { /* fica a lista anterior */ }
  }

  /** A cópia antiga que ainda está neste aparelho vai uma vez para o servidor (guardada para conferência). */
  let enviandoCopia = false;
  function enviarCopiaAntiga() {
    if (enviandoCopia) return;
    let valor = null;
    try {
      if (localStorage.getItem(MARCA_TRANSFERIDA)) return;
      valor = localStorage.getItem(CHAVE_ANTIGA);
    } catch (e) { return; }
    const marcar = () => { try { localStorage.setItem(MARCA_TRANSFERIDA, new Date().toISOString()); } catch (e) { /* tenta de novo na próxima vez */ } };
    if (!valor) return marcar();
    enviandoCopia = true;
    window.CicluzSync.api('/agenda/transferencia/aparelho', { metodo: 'POST', corpo: { valor } })
      .then(marcar)
      .catch(() => { /* sem conexão: tenta na próxima abertura */ })
      .finally(() => { enviandoCopia = false; });
  }

  // Ao abrir, ao voltar para a aba e a cada 30 s.
  (function iniciar() {
    const c = lerCache();
    if (c) { aplicarResposta(c.resposta); pessoasLista = c.pessoas || []; situacao = 'cache'; }
    if (!window.CicluzSessao) return;
    // As contas da empresa servem também ao Compras e à Produção (responsável): carregam ao abrir.
    if (conectado()) carregarPessoas().then(() => document.dispatchEvent(new Event('cicluz-pessoas-carregadas')));
    atualizar();
    setInterval(() => { if (document.visibilityState === 'visible') atualizar(); }, INTERVALO);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') atualizar(); });
  })();

  /* ---------- Gravação: um caminho só ---------- */
  const erro = (texto) => ({ erro: texto });
  /** Chama a API. Devolve { dados } ou { erro }. Conflito de versão: a tela fica com a versão atual. */
  async function enviar(caminho, metodo, corpo) {
    if (situacao === 'sem-internet' || situacao === 'cache') return erro(SEM_INTERNET);
    if (situacao === 'nao-transferida') return erro(NAO_TRANSFERIDA);
    if (situacao === 'fora-expediente') return erro(motivoBloqueio);
    if (!conectado()) return erro(SEM_INTERNET);
    emAndamento++;
    try {
      return { dados: await window.CicluzSync.api(caminho, { metodo, ...(corpo === undefined ? {} : { corpo }) }) };
    } catch (e) {
      if (e && e.codigo === 'AGENDA_VERSAO' && e.detalhes) {
        if (e.detalhes.compromisso) guardarItem(e.detalhes.compromisso);
        if (e.detalhes.grupo) guardarLista(e.detalhes.grupo);
        avisar(false);
      }
      if (e && e.status === 0) { situacao = 'sem-internet'; avisar(true); }
      if (e && e.codigo === 'AGENDA_FORA_EXPEDIENTE') bloquear(e.message);
      if (e && e.codigo === 'AGENDA_COMPROMISSO_NAO_ENCONTRADO') atualizar(true);
      return erro((e && e.message) || 'Não foi possível salvar. Tente de novo.');
    } finally {
      gravacoes++;
      emAndamento--;
    }
  }
  const caminhoItem = (id) => '/agenda/compromissos/' + encodeURIComponent(id);

  /* ---------- Pessoas ---------- */
  // Contas ativas da empresa (do servidor; a lista provisória do Compras saiu, P-18).
  function pessoas() {
    const p = perfil();
    const lista = pessoasLista.slice();
    if (p && p.usuarioId && !lista.some((x) => x.id === p.usuarioId)) lista.unshift({ id: p.usuarioId, nome: p.nome || 'Eu' });
    return lista;
  }
  const nomePessoa = (id) => (id ? (pessoas().find((p) => p.id === id) || { nome: 'Pessoa não encontrada' }).nome : '');
  const usuarioAtual = () => usuarioId || ((perfil() && perfil().usuarioId !== 'local' && perfil().usuarioId) || '');
  /** O que a pessoa pode fazer: vem pronto do servidor. */
  const acesso = (i) => (i && i.acesso) || NADA;
  const visiveis = () => dados.itens.filter((i) => acesso(i).ver);

  /* ---------- Consultas ---------- */
  const lista = (id) => dados.listas.find((l) => l.id === id);
  const item = (id) => dados.itens.find((i) => i.id === id);
  const coluna = (id) => dados.colunas.find((c) => c.id === id);
  /** Coluna do Kanban em que o compromisso está ("concluido" quando feito). */
  const colunaDe = (i) => (i.concluida ? CONCLUIDO : coluna(i.colunaId) ? i.colunaId : (dados.colunas[0] || { id: '' }).id);
  const relacoesVisiveis = () => { const ids = new Set(visiveis().map((i) => i.id)); return dados.relacoes.filter((r) => ids.has(r.de) && ids.has(r.para)); };

  /* ---------- Compromissos ---------- */
  async function salvarItem(id, campos) {
    const corpo = paraFormulario(campos);
    const msg = R.validar({ ...campos, titulo: corpo.titulo, url: corpo.url, alerta: corpo.alerta, subtarefas: corpo.subtarefas, repeticao: corpo.repeticao });
    if (msg) return erro(msg);
    if (!lista(corpo.grupoId)) return erro('Escolha a lista do compromisso.');
    const atual = id ? item(id) : null;
    if (id && !atual) return erro('Compromisso não encontrado.');
    if (atual && !acesso(atual).editar) return erro(SEM.editar);
    const novo = atual ? atual.id : novoId('ag');
    const r = atual
      ? await enviar(caminhoItem(novo), 'PUT', { versao: atual.versao, ...corpo })
      : await enviar('/agenda/compromissos', 'POST', { id: novo, ...corpo });
    if (r.erro) return r;
    guardarItem(r.dados);
    gravou();
    return { ok: true, id: novo };
  }

  /**
   * Criação rápida, como a linha "Novo" do Lembretes. O texto é interpretado: "amanhã às 10", "sexta", "dia 20",
   * "#etiqueta" e "!" viram data, hora, etiqueta e prioridade.
   */
  function criarRapido(texto, listaId, extra = {}) {
    const f = window.CicluzAgendaDominio.interpretar(texto, new Date());
    return salvarItem('', {
      ...extra, titulo: f.titulo, listaId,
      data: f.data || extra.data || '', hora: f.hora || extra.hora || '',
      etiquetas: [...(extra.etiquetas || []), ...f.etiquetas], prioridade: f.prioridade || extra.prioridade || 'normal',
      // Com data, avisa na hora (dia todo: às 9h), como o Lembretes.
      alerta: f.data || extra.data ? 0 : null,
    });
  }

  /**
   * Concluir ou reabrir pelo ESTADO desejado (o segundo toque pede o mesmo estado e não muda nada; M2/M4).
   * Se repete, o servidor deixa uma cópia concluída e passa o compromisso para a próxima data.
   * ocorrencia: a data que se está concluindo (o cartão de alerta manda a dele; padrão: a data atual).
   * Devolve { resultado: 'repetiu' | 'concluiu' | 'reabriu' | 'sem-mudanca' } ou { erro }.
   */
  async function concluir(id, desejado, ocorrencia) {
    const i = item(id);
    if (!i) return erro('Compromisso não encontrado.');
    if (!acesso(i).concluir) return erro(SEM.concluir);
    const corpo = desejado ? { concluida: true, ...(R.temRepeticao(i) && (ocorrencia || i.data) ? { ocorrencia: ocorrencia || i.data } : {}) } : { concluida: false };
    const r = await enviar(caminhoItem(id) + '/conclusao', 'POST', corpo);
    if (r.erro) return r;
    guardarItem(r.dados.compromisso);
    if (r.dados.copia) guardarItem(r.dados.copia);
    gravou();
    return { resultado: r.dados.resultado };
  }

  /** Subtarefa pelo estado desejado. */
  async function marcarSubtarefa(id, subId, desejado) {
    const i = item(id);
    if (!i) return erro('Compromisso não encontrado.');
    if (!acesso(i).concluir) return erro(SEM.concluir);
    const r = await enviar(caminhoItem(id) + '/subtarefas/' + encodeURIComponent(subId), 'PUT', { concluida: Boolean(desejado) });
    if (r.erro) return r;
    guardarItem(r.dados);
    gravou();
    return { ok: true };
  }

  async function excluirItem(id) {
    const i = item(id);
    if (!i) return erro('Compromisso não encontrado.');
    if (!acesso(i).excluir) return erro(SEM.excluir);
    const r = await enviar(caminhoItem(id) + '?versao=' + i.versao, 'DELETE');
    if (r.erro) return r;
    dados.itens = dados.itens.filter((x) => x.id !== id);
    dados.relacoes = dados.relacoes.filter((x) => x.de !== id && x.para !== id);
    gravou();
    return { ok: true };
  }

  /**
   * Mudança parcial: o servidor passa pela MESMA função do formulário (uma validação, uma regra de âncora; M5).
   * mudar(copia) altera a cópia; vão só os campos que mudaram.
   */
  async function alterar(id, mudar, permissao = 'editar') {
    const i = item(id);
    if (!i) return erro('Compromisso não encontrado.');
    if (!acesso(i)[permissao]) return erro(SEM[permissao]);
    const c = structuredClone(i);
    const msg = mudar(c);
    if (typeof msg === 'string') return erro(msg);
    const tirouData = i.data && !c.data;
    // Tirar a data: o servidor tira junto hora, repetição e alerta (a cópia só imita para conferir antes).
    if (tirouData) Object.assign(c, { hora: '', horaFim: '', repeticao: null, alerta: null });
    const v = R.validar(c);
    if (v) return erro(v);
    if (c.listaId !== i.listaId && !lista(c.listaId)) return erro('Lista não encontrada.');
    const patch = { versao: i.versao };
    if (c.titulo !== i.titulo) patch.titulo = String(c.titulo || '').trim();
    if (c.listaId !== i.listaId) patch.grupoId = c.listaId;
    if (c.prioridade !== i.prioridade) patch.prioridade = c.prioridade;
    if (c.sinalizado !== i.sinalizado) patch.sinalizado = Boolean(c.sinalizado);
    if (c.data !== i.data) patch.data = c.data || '';
    if (!tirouData && c.hora !== i.hora) patch.hora = c.hora || '';
    if (!tirouData && c.horaFim !== i.horaFim) patch.horaFim = c.horaFim || '';
    if (c.colunaId !== i.colunaId) patch.colunaId = c.colunaId || '';
    if (JSON.stringify(c.subtarefas) !== JSON.stringify(i.subtarefas)) patch.subtarefas = c.subtarefas.map((s) => ({ id: s.id, titulo: String(s.titulo || '').trim(), concluida: Boolean(s.concluida) }));
    if (c.antesDe !== undefined) patch.antesDe = c.antesDe;
    if (Object.keys(patch).length === 1) return { ok: true };
    const r = await enviar(caminhoItem(id), 'PATCH', patch);
    if (r.erro) return r;
    guardarItem(r.dados);
    gravou();
    return { ok: true };
  }
  const renomear = (id, titulo) => alterar(id, (c) => { c.titulo = String(titulo || '').trim(); });
  const alternarSinalizado = (id) => alterar(id, (c) => { c.sinalizado = !c.sinalizado; });

  /** Kanban: muda de coluna. Para "Concluído", conclui; para fora dela, o servidor reabre (precisa de "Concluir"). */
  function moverColuna(id, colunaId) {
    const i = item(id);
    if (!i) return Promise.resolve(erro('Compromisso não encontrado.'));
    if (colunaId === CONCLUIDO) return i.concluida ? Promise.resolve({ ok: true }) : concluir(id, true);
    if (i.concluida && !acesso(i).concluir) return Promise.resolve(erro(SEM.concluir));
    if (i.concluida && i.colunaId === colunaId) {
      // Mesma coluna de antes: só reabre.
      return concluir(id, false);
    }
    return alterar(id, (c) => { c.colunaId = colunaId; });
  }

  /** Leva para outro dia (e hora, na grade de horas), mantendo a duração. O servidor cuida da âncora da repetição. */
  function moverPara(id, data, hora) {
    if (!R.dataValida(data) || (hora && !R.horaValida(hora))) return Promise.resolve(erro('Data ou hora inválida.'));
    const i = item(id);
    if (i && i.concluida) return Promise.resolve(erro('Compromisso concluído não muda de dia.'));
    const D = window.CicluzAgendaDominio;
    return alterar(id, (c) => {
      if (hora !== undefined && hora !== null) {
        const dur = c.hora && c.horaFim ? D.minutos(c.horaFim) - D.minutos(c.hora) : 0;
        c.hora = hora;
        c.horaFim = hora && dur ? D.paraHora(Math.min(1439, D.minutos(hora) + dur)) : '';
        if (c.horaFim && c.horaFim <= c.hora) c.horaFim = '';
      }
      c.data = data;
    });
  }

  /** Leva para outra lista, prioridade, data ou coluna (arrastar no mapa). */
  function definir(id, campos) {
    if (campos.colunaId !== undefined) return moverColuna(id, campos.colunaId);
    return alterar(id, (c) => {
      if (campos.listaId !== undefined) c.listaId = campos.listaId;
      if (campos.prioridade !== undefined) c.prioridade = campos.prioridade;
      if (campos.data !== undefined) c.data = campos.data;
    });
  }

  /** Ordem manual: põe o compromisso antes de outro (ou no fim). Muda só ele no servidor. */
  const reordenar = (id, antesDeId) => alterar(id, (c) => { c.antesDe = antesDeId || null; });

  /** Soneca do alerta: só para quem adiou. */
  async function adiar(id, minutosDepois) {
    if (!item(id)) return erro('Compromisso não encontrado.');
    const r = await enviar(caminhoItem(id) + '/adiamento', 'PUT', { ate: new Date(Date.now() + minutosDepois * 60000).toISOString() });
    if (r.erro) return r;
    guardarItem(r.dados);
    gravou();
    return { ok: true };
  }

  /** "Limpar" do Lembretes: esconde os concluídos (de uma lista ou de todas) que a pessoa pode excluir. */
  async function limparConcluidos(listaId) {
    const r = await enviar('/agenda/limpar-concluidos', 'POST', listaId ? { grupoId: listaId } : {});
    if (r.erro) return r;
    await atualizar(true);
    gravou();
    return { ok: true, excluidos: r.dados.excluidos };
  }

  /** Avaliação: confere no servidor; registrada não muda. */
  async function avaliar(id, avaliadoId, valor, comentario) {
    const i = item(id);
    if (!i) return erro('Compromisso não encontrado.');
    const v = Number(valor);
    if (!R.valorValido(i.avaliacao.tipo, v)) return erro('Escolha a nota.');
    const r = await enviar(caminhoItem(id) + '/avaliacoes', 'POST', { avaliadoId, valor: v, comentario: String(comentario || '').trim().slice(0, 500) });
    if (r.erro) return r;
    guardarItem(r.dados);
    gravou();
    return { ok: true };
  }

  /* ---------- Subtarefas (mapa mental) ---------- */
  async function adicionarSubtarefa(id, titulo, antesDe) {
    const t = String(titulo || '').trim();
    if (!t) return erro('Escreva a subtarefa.');
    const novo = novoId('sub');
    const r = await alterar(id, (c) => {
      const pos = antesDe ? c.subtarefas.findIndex((x) => x.id === antesDe) : -1;
      c.subtarefas.splice(pos < 0 ? c.subtarefas.length : pos + 1, 0, { id: novo, titulo: t.slice(0, 200), concluida: false, concluidaEm: '' });
    });
    return r.ok ? { ok: true, id: novo } : r;
  }
  const renomearSubtarefa = (id, subId, titulo) => alterar(id, (c) => { const x = c.subtarefas.find((y) => y.id === subId); if (!x) return 'Subtarefa não encontrada.'; x.titulo = String(titulo || '').trim(); return undefined; });
  const excluirSubtarefa = (id, subId) => alterar(id, (c) => { const n = c.subtarefas.length; c.subtarefas = c.subtarefas.filter((y) => y.id !== subId); return c.subtarefas.length === n ? 'Subtarefa não encontrada.' : undefined; });
  /** Leva uma subtarefa para outro compromisso: primeiro entra no destino, depois sai da origem (nada se perde). */
  async function moverSubtarefa(deId, subId, paraId) {
    if (deId === paraId) return { ok: true };
    const de = item(deId);
    const para = item(paraId);
    if (!de || !para) return erro('Compromisso não encontrado.');
    if (!acesso(de).editar || !acesso(para).editar) return erro(SEM.editar);
    const sub = de.subtarefas.find((x) => x.id === subId);
    if (!sub) return erro('Subtarefa não encontrada.');
    const r1 = await alterar(paraId, (c) => { c.subtarefas.push({ ...structuredClone(sub), id: novoId('sub') }); });
    if (r1.erro) return r1;
    const r2 = await excluirSubtarefa(deId, subId);
    return r2.erro ? erro('A subtarefa foi copiada para "' + para.titulo + '", mas não saiu de "' + de.titulo + '": ' + r2.erro) : { ok: true };
  }

  /* ---------- Ligações do mapa mental ---------- */
  async function criarRelacao(de, para, rotulo) {
    if (!de || !para || de === para) return erro('Escolha dois compromissos diferentes.');
    if (!item(de) || !item(para)) return erro('Compromisso não encontrado.');
    if (!acesso(item(de)).editar) return erro(SEM.editar);
    const r = await enviar('/agenda/relacoes', 'POST', { id: novoId('rel'), de, para, rotulo: String(rotulo || '').trim().slice(0, 40) });
    if (r.erro) return r;
    dados.relacoes.push(r.dados);
    gravou();
    return { ok: true, id: r.dados.id };
  }
  async function rotularRelacao(id, rotulo) {
    const atual = dados.relacoes.find((x) => x.id === id);
    if (!atual) return erro('Ligação não encontrada.');
    const r = await enviar('/agenda/relacoes/' + encodeURIComponent(id), 'PATCH', { rotulo: String(rotulo || '').trim().slice(0, 40) });
    if (r.erro) return r;
    Object.assign(atual, { rotulo: r.dados.rotulo });
    gravou();
    return { ok: true };
  }
  async function excluirRelacao(id) {
    if (!dados.relacoes.some((x) => x.id === id)) return erro('Ligação não encontrada.');
    const r = await enviar('/agenda/relacoes/' + encodeURIComponent(id), 'DELETE');
    if (r.erro) return r;
    dados.relacoes = dados.relacoes.filter((x) => x.id !== id);
    gravou();
    return { ok: true };
  }

  /* ---------- Listas ---------- */
  /** area: área do Acesso por Tela ('' = membros escolhidos à mão). undefined = não mexe (P-46 item 3). */
  async function salvarLista(id, { nome, cor, icone, area }) {
    const n = String(nome || '').trim();
    if (!n) return erro('Informe o nome da lista.');
    if (n.length > 40) return erro('O nome da lista passa de 40 letras.');
    const atual = id ? lista(id) : null;
    if (id && !atual) return erro('Lista não encontrada.');
    const r = atual
      ? await enviar('/agenda/grupos/' + encodeURIComponent(id), 'PUT', { versao: atual.versao, nome: n, ...(cor ? { cor: corSegura(cor) } : {}), ...(icone ? { icone } : {}), ...(area !== undefined ? { area } : {}) })
      : await enviar('/agenda/grupos', 'POST', { id: novoId('lista'), nome: n, cor: corSegura(cor || CORES_LISTA[dados.listas.length % CORES_LISTA.length]), icone: icone || 'lista', area: area || '' });
    if (r.erro) return r;
    const l = guardarLista(r.dados);
    gravou();
    return { ok: true, id: l.id };
  }
  /** Ordenação: a dona ou o administrador grava para todos; os outros mudam só na própria tela. */
  async function definirOrdenacao(listaId, ordenacao) {
    const l = lista(listaId);
    if (!l) return erro('Lista não encontrada.');
    if (!l.podeGerir) { l.ordenacao = ordenacao; avisar(false); return { ok: true, local: true }; }
    const r = await enviar('/agenda/grupos/' + encodeURIComponent(listaId), 'PUT', { versao: l.versao, ordenacao });
    if (r.erro) return r;
    guardarLista(r.dados);
    gravou();
    return { ok: true };
  }
  /** Exclui a lista só quando vazia: compromisso nunca some junto com a lista. */
  async function excluirLista(id) {
    const l = lista(id);
    if (!l) return erro('Lista não encontrada.');
    const r = await enviar('/agenda/grupos/' + encodeURIComponent(id) + '?versao=' + l.versao, 'DELETE');
    if (r.erro) return r;
    dados.listas = dados.listas.filter((x) => x.id !== id);
    gravou();
    return { ok: true };
  }

  /* ---------- Colunas do Kanban ---------- */
  async function salvarColuna(id, nome) {
    const n = String(nome || '').trim();
    if (!n) return erro('Informe o nome da coluna.');
    if (n.length > 30) return erro('O nome da coluna passa de 30 letras.');
    const r = id
      ? await enviar('/agenda/colunas/' + encodeURIComponent(id), 'PUT', { nome: n })
      : await enviar('/agenda/colunas', 'POST', { id: novoId('col'), nome: n });
    if (r.erro) return r;
    const c = coluna(r.dados.id);
    if (c) c.nome = r.dados.nome; else dados.colunas.push({ id: r.dados.id, nome: r.dados.nome, ordem: r.dados.ordem });
    gravou();
    return { ok: true, id: r.dados.id };
  }
  async function excluirColuna(id) {
    const r = await enviar('/agenda/colunas/' + encodeURIComponent(id), 'DELETE');
    if (r.erro) return r;
    dados.colunas = dados.colunas.filter((c) => c.id !== id);
    dados.itens.forEach((i) => { if (i.colunaId === id) i.colunaId = ''; });
    gravou();
    return { ok: true };
  }

  /* ---------- Transferência (administrador) ---------- */
  async function previaTransferencia() {
    try { return { dados: await window.CicluzSync.api('/agenda/transferencia') }; }
    catch (e) { return erro((e && e.message) || 'Não foi possível ler a prévia.'); }
  }
  async function transferir(corpo) {
    emAndamento++;
    try {
      const r = await window.CicluzSync.api('/agenda/transferencia', { metodo: 'POST', corpo });
      // Uma leitura que começou antes (ainda "não transferida") não vale: espera ela e busca de novo.
      gravacoes++;
      if (buscando) await buscando.catch(() => undefined);
      etag = '';
      await atualizar(true);
      return { dados: r };
    } catch (e) { return erro((e && e.message) || 'Não foi possível levar a Agenda.'); }
    finally { emAndamento--; }
  }

  /* ---------- Membros da lista (grupo), configurações, desempenho, tarefa de tela (P-46) ---------- */
  const api = async (caminho, opcoes) => {
    if (!conectado()) return erro(SEM_INTERNET);
    try { return { dados: await window.CicluzSync.api(caminho, opcoes) }; }
    catch (e) { if (e && e.codigo === 'AGENDA_FORA_EXPEDIENTE') bloquear(e.message); return erro((e && e.message) || 'Não foi possível falar com o servidor.'); }
  };
  const caminhoLista = (id) => '/agenda/grupos/' + encodeURIComponent(id);
  async function membros(listaId) {
    const r = await api(caminhoLista(listaId) + '/membros');
    return r.erro ? r : { ids: r.dados.usuarioIds || [] };
  }
  async function definirMembros(listaId, ids) {
    const r = await enviar(caminhoLista(listaId) + '/membros', 'PUT', { usuarioIds: ids });
    if (r.erro) return r;
    gravou();
    return { ids: r.dados.usuarioIds || [] };
  }
  const minhaConfig = () => api('/agenda/configuracoes/minha');
  const configs = () => api('/agenda/configuracoes');
  const salvarConfig = (usuarioId, corpo) => api('/agenda/configuracoes/' + encodeURIComponent(usuarioId), { metodo: 'PUT', corpo });
  const desempenho = (de, ate) => api('/agenda/desempenho?de=' + encodeURIComponent(de) + '&ate=' + encodeURIComponent(ate));
  /** Tarefa que uma tela pede (ex.: pedido de compra agendado chegou na hora). Uma por referência. */
  async function tarefaDeTela(corpo) {
    const r = await api('/agenda/tarefas-de-tela', { metodo: 'POST', corpo: { id: novoId('ag'), ...corpo } });
    if (r.erro) return r;
    // O compromisso só volta para quem participa dele (quem só disparou a tela recebe o id).
    if (r.dados.compromisso && situacao === 'servidor') { guardarItem(r.dados.compromisso); gravou(); }
    return { ok: true, id: r.dados.id };
  }
  /** A tela fez o que a tarefa pedia: conclui (se a pessoa pode). */
  async function concluirPorVinculo(vinculoRef) {
    const r = await api('/agenda/tarefas-de-tela/concluir', { metodo: 'POST', corpo: { vinculoRef } });
    if (r.erro) return r;
    if (r.dados.compromisso && situacao === 'servidor') { guardarItem(r.dados.compromisso); gravou(); }
    return { ok: true, resultado: r.dados.resultado };
  }
  /** A tela desfez o que gerou a tarefa (pedido cancelado): a tarefa aberta sai (só regras por permissão). */
  async function cancelarPorVinculo(vinculoRef) {
    const r = await api('/agenda/tarefas-de-tela/cancelar', { metodo: 'POST', corpo: { vinculoRef } });
    if (r.erro) return r;
    if (r.dados.resultado === 'cancelada') { etag = ''; if (situacao === 'servidor') atualizar(true); }
    return { ok: true, resultado: r.dados.resultado };
  }
  /** Áreas do Acesso por Tela (fonte única: o catálogo do servidor), para ligar uma lista a uma área. */
  let areasCache = null;
  async function areasAcesso() {
    if (areasCache) return { dados: areasCache };
    const r = await api('/acessos/catalogo');
    if (r.erro) return r;
    areasCache = (r.dados.areas || []).map((a) => ({ id: a.id, nome: a.nome }));
    return { dados: areasCache };
  }
  /* Conta ligada ao colaborador e expediente dos Horários/Escalas (0009, P-46 item 5). */
  const contasEColaboradores = () => api('/agenda/expedientes/contas');
  const ligarColaborador = (usuarioId, colaboradorId) => api('/agenda/expedientes/contas/' + encodeURIComponent(usuarioId), { metodo: 'PUT', corpo: { colaboradorId: colaboradorId || null } });
  const enviarExpedientes = (corpo) => api('/agenda/expedientes', { metodo: 'PUT', corpo });
  /* Ações programadas por tela (0012, P-53). */
  const acaoFeita = (acao, quantidade) => api('/agenda/acoes-de-tela', { metodo: 'POST', corpo: { acao, quantidade } });
  const telasIcone = () => api('/agenda/telas-icone');
  const definirTelaIcone = (tela, mostrar) => api('/agenda/telas-icone', { metodo: 'PUT', corpo: { tela, mostrar } });

  window.CicluzAgendaDados = {
    CHAVE_CACHE, CORES_LISTA, CONCLUIDO,
    get dados() { return dados; },
    /** carregando | cache | servidor | sem-internet | nao-transferida | fora-expediente | erro */
    get situacao() { return situacao; },
    get motivoBloqueio() { return motivoBloqueio; },
    get somenteLeitura() { return situacao !== 'servidor'; },
    /** Pedidos ao servidor em andamento (os testes esperam chegar a zero). */
    get emAndamento() { return emAndamento; },
    atualizar, novoId, pessoas, nomePessoa, usuarioAtual, acesso, visiveis, lista, item, coluna, colunaDe, avaliar,
    alterar, renomear, definir, adicionarSubtarefa, renomearSubtarefa, excluirSubtarefa, moverSubtarefa,
    criarRelacao, rotularRelacao, excluirRelacao, relacoesVisiveis,
    salvarItem, criarRapido, concluir, marcarSubtarefa, alternarSinalizado, excluirItem, moverPara, adiar,
    moverColuna, reordenar, limparConcluidos,
    salvarLista, definirOrdenacao, excluirLista, salvarColuna, excluirColuna,
    previaTransferencia, transferir,
    membros, definirMembros, minhaConfig, configs, salvarConfig, desempenho, tarefaDeTela, concluirPorVinculo, cancelarPorVinculo, conectado,
    contasEColaboradores, ligarColaborador, enviarExpedientes, areasAcesso, acaoFeita, telasIcone, definirTelaIcone,
  };
})();
