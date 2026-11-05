/*
 * Agenda — armazenamento e operações. Uma chave só no localStorage (cicluz-agenda-v1), que com login
 * vai para o banco pela sincronização do S2 (servidor/shared/src/documentos.ts).
 *
 * Abrir a Agenda não grava nada: as duas listas iniciais existem só na memória até a primeira
 * alteração (com ids fixos, para dois aparelhos novos não criarem listas repetidas).
 */
(function () {
  'use strict';
  const KEY = 'cicluz-agenda-v1';
  const D = window.CicluzAgendaDominio;

  /* As duas listas iniciais são os submenus de Agenda · Atividades no menu lateral. */
  const LISTAS_INICIAIS = [
    { id: 'lista-gestao-pessoas', nome: 'Gestão de Pessoas', cor: '#7c3aed' },
    { id: 'lista-diretor-operacoes', nome: 'Diretor de Operações', cor: '#2563eb' },
  ];
  const CORES_LISTA = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#dc2626', '#db2777', '#0891b2', '#ca8a04'];

  const novoId = (prefixo) => prefixo + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const agoraIso = () => new Date().toISOString();
  const inicial = () => ({ versao: 1, listas: structuredClone(LISTAS_INICIAIS), itens: [] });
  const valido = (x) => x && Array.isArray(x.listas) && Array.isArray(x.itens);

  let dados = inicial();
  let erroLeitura = false;
  function ler() {
    try {
      const bruto = localStorage.getItem(KEY);
      if (!bruto) return inicial();
      const salvo = JSON.parse(bruto);
      if (!valido(salvo)) throw new Error('formato');
      return salvo;
    } catch (e) {
      // Dado ilegível: não sobrescreve (nada é gravado enquanto erroLeitura for verdadeiro).
      erroLeitura = true;
      console.warn('Agenda: dado salvo ilegível; nada será gravado por cima', e);
      return inicial();
    }
  }
  dados = ler();

  /** Executa a mudança e grava só se algo mudou; se falhar, desfaz e devolve false. */
  function transacao(mudanca) {
    if (!erroLeitura) { const atual = ler(); if (!erroLeitura) dados = atual; }
    const antes = JSON.stringify(dados);
    try {
      if (erroLeitura) throw new Error('leitura');
      const r = mudanca(dados);
      const depois = JSON.stringify(dados);
      if (depois !== antes) {
        localStorage.setItem(KEY, depois);
        document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou'));
      }
      return r === undefined ? true : r;
    } catch (e) {
      dados = JSON.parse(antes);
      console.warn('Agenda: alteração não salva', e);
      return false;
    }
  }

  // Outra aba (ou a sincronização) gravou: atualiza a memória e avisa a tela.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    try {
      const novo = e.newValue ? JSON.parse(e.newValue) : inicial();
      if (valido(novo)) { dados = novo; document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou', { detail: { externo: true } })); }
    } catch (err) { /* ignora valor inválido */ }
  });

  /* ---------- Pessoas ---------- */
  // O S2 ainda não tem cadastro de usuários: vale quem está logado e a lista provisória de
  // responsáveis do S2 (a mesma do Compras, fonte única até existir o cadastro).
  function pessoas() {
    const lista = [];
    const perfil = window.CicluzSessao && window.CicluzSessao.perfil;
    if (perfil && perfil.usuarioId && perfil.usuarioId !== 'local') lista.push({ id: perfil.usuarioId, nome: perfil.nome || 'Eu' });
    const provisorios = (window.CicluzComprasDados && window.CicluzComprasDados.RESPONSAVEIS) || [];
    provisorios.forEach((p) => { if (!lista.some((x) => x.id === p.id)) lista.push({ id: p.id, nome: p.nome }); });
    return lista;
  }
  const nomePessoa = (id) => (id ? (pessoas().find((p) => p.id === id) || { nome: 'Pessoa não encontrada' }).nome : '');
  const usuarioAtual = () => (window.CicluzSessao && window.CicluzSessao.perfil && window.CicluzSessao.perfil.usuarioId) || '';

  /* ---------- Consultas ---------- */
  const lista = (id) => dados.listas.find((l) => l.id === id);
  const item = (id) => dados.itens.find((i) => i.id === id);

  /* ---------- Operações (devolvem { ok, id } ou { erro }) ---------- */
  const erro = (texto) => ({ erro: texto });

  function limpar(campos) {
    return {
      listaId: campos.listaId,
      titulo: String(campos.titulo || '').trim(),
      notas: String(campos.notas || '').trim(),
      data: campos.data || '',
      // Hora sem data não é apagada em silêncio: a validação avisa.
      hora: campos.hora || '',
      prioridade: campos.prioridade || 'normal',
      sinalizado: Boolean(campos.sinalizado),
      etiquetas: D.normalizarEtiquetas(campos.etiquetas),
      responsavelId: campos.responsavelId || '',
      subtarefas: (campos.subtarefas || []).map((s) => ({
        id: s.id || novoId('sub'), titulo: String(s.titulo || '').trim(),
        concluida: Boolean(s.concluida), concluidaEm: s.concluida ? (s.concluidaEm || agoraIso()) : '',
      })),
    };
  }

  function salvarItem(id, campos) {
    const limpo = limpar(campos);
    const msg = D.validar(limpo);
    if (msg) return erro(msg);
    if (!lista(limpo.listaId)) return erro('Escolha a lista do compromisso.');
    let novo = id;
    const feito = transacao((d) => {
      const agora = agoraIso();
      if (id) {
        const atual = d.itens.find((i) => i.id === id);
        if (!atual) throw new Error('não encontrado');
        Object.assign(atual, limpo, { atualizadoEm: agora });
      } else {
        novo = novoId('ag');
        d.itens.push({ id: novo, ...limpo, concluida: false, concluidaEm: '', criadoEm: agora, criadoPor: usuarioAtual(), atualizadoEm: agora });
      }
    });
    return feito ? { ok: true, id: novo } : erro('Não foi possível salvar. Tente de novo.');
  }

  /** Criação rápida (só o título), como a linha "Novo" do Lembretes. */
  const criarRapido = (titulo, listaId, extra = {}) => salvarItem('', { titulo, listaId, ...extra });

  function alternarConcluida(id) {
    return transacao((d) => {
      const i = d.itens.find((x) => x.id === id);
      if (!i) return false;
      i.concluida = !i.concluida;
      i.concluidaEm = i.concluida ? agoraIso() : '';
      i.atualizadoEm = agoraIso();
      return true;
    });
  }
  function alternarSubtarefa(id, subId) {
    return transacao((d) => {
      const s = (d.itens.find((x) => x.id === id) || { subtarefas: [] }).subtarefas.find((x) => x.id === subId);
      if (!s) return false;
      s.concluida = !s.concluida;
      s.concluidaEm = s.concluida ? agoraIso() : '';
      return true;
    });
  }
  function alternarSinalizado(id) {
    return transacao((d) => { const i = d.itens.find((x) => x.id === id); if (!i) return false; i.sinalizado = !i.sinalizado; i.atualizadoEm = agoraIso(); return true; });
  }
  const excluirItem = (id) => transacao((d) => { const n = d.itens.length; d.itens = d.itens.filter((i) => i.id !== id); return d.itens.length < n; });
  /** Leva o compromisso para outro dia (arrastar no calendário). Mantém a hora. */
  const moverPara = (id, data) => D.dataValida(data) && transacao((d) => { const i = d.itens.find((x) => x.id === id); if (!i) return false; i.data = data; i.atualizadoEm = agoraIso(); return true; });

  function salvarLista(id, nome, cor) {
    const n = String(nome || '').trim();
    if (!n) return erro('Informe o nome da lista.');
    if (n.length > 40) return erro('O nome da lista passa de 40 letras.');
    const repetida = dados.listas.find((l) => l.id !== id && l.nome.toLocaleLowerCase('pt-BR') === n.toLocaleLowerCase('pt-BR'));
    if (repetida) return erro('Já existe uma lista com esse nome.');
    let novo = id;
    const feito = transacao((d) => {
      if (id) { const l = d.listas.find((x) => x.id === id); if (!l) throw new Error('não encontrada'); l.nome = n; l.cor = cor || l.cor; }
      else { novo = novoId('lista'); d.listas.push({ id: novo, nome: n, cor: cor || CORES_LISTA[d.listas.length % CORES_LISTA.length] }); }
    });
    return feito ? { ok: true, id: novo } : erro('Não foi possível salvar a lista.');
  }
  /** Exclui a lista só quando vazia: compromisso nunca some junto com a lista. */
  function excluirLista(id) {
    if (dados.itens.some((i) => i.listaId === id)) return erro('Mova ou exclua os compromissos desta lista antes de excluí-la.');
    if (dados.listas.length <= 1) return erro('A agenda precisa de pelo menos uma lista.');
    return transacao((d) => { d.listas = d.listas.filter((l) => l.id !== id); }) ? { ok: true } : erro('Não foi possível excluir a lista.');
  }

  window.CicluzAgendaDados = {
    KEY, LISTAS_INICIAIS, CORES_LISTA,
    get dados() { return dados; },
    get erroLeitura() { return erroLeitura; },
    transacao, novoId, pessoas, nomePessoa, lista, item,
    salvarItem, criarRapido, alternarConcluida, alternarSubtarefa, alternarSinalizado, excluirItem, moverPara,
    salvarLista, excluirLista,
  };
})();
