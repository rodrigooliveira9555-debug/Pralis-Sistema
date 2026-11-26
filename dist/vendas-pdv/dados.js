/*
 * Vendas dos PDVs (CREARE) — dados. O S2 não guarda venda: pergunta à própria API (/api/vendas-pdv), que
 * consulta o Sistema Pralis ao vivo com os mesmos filtros e a mesma conta do Relatório de Vendas de lá.
 * Ids de PDV, forma de pagamento e turno são os do Sistema Pralis. A tela fica em tela.js.
 */
(function () {
  'use strict';
  const S = window.CicluzSync;

  const hojeIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const somarDias = (iso, dias) => {
    const d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  const FILTRO_VAZIO = () => ({ dataInicio: hojeIso(), dataFim: hojeIso(), horaInicio: '', horaFim: '', janelaInicio: '', janelaFim: '', pdvId: '', grupoId: '', formaPagamentoId: '', turnoId: '', status: '', produto: '' });

  const estado = {
    filtro: FILTRO_VAZIO(),
    ordem: 'desc',
    pagina: 1,
    porPagina: 50,
    opcoes: { pdvs: [], formasPagamento: [], turnos: [] },
    vendas: { itens: [], total: 0 },
    totais: null,
    canceladas: null,
    porPdv: [],
    carregando: false,
    erro: '',
    atualizadoEm: null,
    configurada: null,
  };

  /** Parâmetros que vão à API (o grupo de vendas já virou PDV + janela diária ao ser escolhido). */
  function params(extra = {}) {
    const f = estado.filtro;
    const p = new URLSearchParams({ dataInicio: f.dataInicio, dataFim: f.dataFim });
    ['horaInicio', 'horaFim', 'janelaInicio', 'janelaFim', 'pdvId', 'formaPagamentoId', 'turnoId', 'status', 'produto'].forEach((k) => { if (f[k]) p.set(k, f[k]); });
    Object.entries(extra).forEach(([k, v]) => { if (v === null) p.delete(k); else p.set(k, String(v)); });
    return p;
  }

  const api = (caminho) => S.api(caminho);

  async function situacao() {
    estado.configurada = (await api('/vendas-pdv/situacao')).configurada;
    return estado.configurada;
  }
  async function carregarOpcoes() {
    estado.opcoes = await api('/vendas-pdv/opcoes');
  }

  /**
   * Uma consulta completa: a página da lista, os totais do filtro, as canceladas e o total de cada PDV ativo.
   * Tudo em paralelo; a contagem por PDV usa o mesmo filtro com o PDV trocado (exceto quando já há um PDV escolhido).
   */
  async function consultar() {
    estado.carregando = true;
    estado.erro = '';
    try {
      const f = estado.filtro;
      const pdvsAtivos = estado.opcoes.pdvs.filter((p) => p.ativo);
      const [vendas, totais, canceladas, ...porPdv] = await Promise.all([
        api('/vendas-pdv?' + params({ ordem: estado.ordem, page: estado.pagina, pageSize: estado.porPagina })),
        api('/vendas-pdv/totais?' + params()),
        f.status ? Promise.resolve(null) : api('/vendas-pdv/totais?' + params({ status: 'cancelado' })),
        ...(f.pdvId ? [] : pdvsAtivos.map((p) => api('/vendas-pdv/totais?' + params({ pdvId: p.id })).then((t) => ({ pdv: p, totais: t })))),
      ]);
      estado.vendas = vendas;
      estado.totais = totais;
      estado.canceladas = canceladas;
      estado.porPdv = porPdv;
      estado.atualizadoEm = new Date();
    } catch (erro) {
      estado.erro = mensagemErro(erro);
    } finally {
      estado.carregando = false;
    }
  }

  function mensagemErro(erro) {
    if (!erro) return 'Algo deu errado.';
    if (erro.status === 0) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    if (erro.status === 401) return 'Sua sessão terminou. Entre de novo.';
    if (erro.status === 403) return 'Você não tem acesso às vendas dos PDVs. Peça ao administrador.';
    if (erro.detalhes && erro.detalhes.length) return erro.detalhes.map((d) => d.mensagem || d.message).filter(Boolean).join(' ') || erro.message;
    return erro.message || 'Algo deu errado.';
  }

  /* ---------- Grupos de Vendas (S2): subgrupo com computador e horário ---------- */

  function hierarquia() {
    try { if (typeof financialGroups !== 'undefined' && financialGroups) return financialGroups; } catch (e) { /* fora do escopo */ }
    try { return JSON.parse(localStorage.getItem('cicluz-financial-hierarchy-v1') || 'null') || {}; } catch (e) { return {}; }
  }

  /**
   * Subgrupos de "VND - Grupos de Vendas" que têm computador e horário. O computador do S2 se liga ao PDV do
   * Sistema Pralis pelo NOME do equipamento (é o nome do computador no CREARE, ex.: TNP-PC-CXPDV-1): os dois
   * sistemas não dividem ids. Sem PDV de mesmo nome, o grupo aparece mas avisa.
   */
  function gruposDeVendas() {
    const h = hierarquia();
    const computadores = new Map();
    (h.computadores || []).forEach((g) => (g.children || []).forEach((c) => computadores.set(c.id, c)));
    const pdvPorNome = new Map(estado.opcoes.pdvs.map((p) => [String(p.nome).trim().toUpperCase(), p]));
    const lista = [];
    (h.vendas || []).filter((g) => g.active !== false).forEach((g) => (g.children || []).forEach((s) => {
      if (s.active === false || !s.computerId || !s.startTime || !s.endTime) return;
      const pc = computadores.get(s.computerId);
      const nomePc = pc ? String(pc.name).trim().toUpperCase() : '';
      const pdv = nomePc ? pdvPorNome.get(nomePc) || null : null;
      lista.push({ id: s.id, nome: g.name + ' › ' + s.name, computador: nomePc || 'Computador removido', inicio: s.startTime, fim: s.endTime, pdv });
    }));
    return lista;
  }

  /* ---------- Formatação ---------- */

  const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const moeda = (v) => moedaFmt.format(Number(v) || 0);
  const numero = (v) => new Intl.NumberFormat('pt-BR').format(Number(v) || 0);
  const hora = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso)) : '—');
  const dataCurta = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—');
  const nomePagamento = (p) => (p.formaPagamentoNome || '').trim() || (p.tipoPagamentoAutomacao || '').trim() || 'Sem forma';
  const ROTULO_STATUS = { aprovado: ['Aprovada', 'positivo'], aguardando_aprovacao: ['Aguardando', 'atencao'], cancelado: ['Cancelada', 'negativo'] };

  function reiniciarFiltro() { const pdvId = estado.filtro.pdvId; estado.filtro = { ...FILTRO_VAZIO(), pdvId }; estado.pagina = 1; }

  /** Abas do topo: os PDVs de caixa da loja (nome terminando em CXPDV-N), em ordem do número e com o NOME REAL da máquina (TNP-PC-CXPDV-1); sem esse padrão, todos os ativos. */
  function abasPdv() {
    const ativos = estado.opcoes.pdvs.filter((p) => p.ativo);
    const caixa = ativos.map((p) => ({ p, n: /CXPDV-?(\d+)$/i.exec(String(p.nome).trim()) })).filter((x) => x.n);
    if (!caixa.length) return ativos.map((p) => ({ id: p.id, rotulo: p.nome, nome: p.nome }));
    return caixa.sort((a, b) => Number(a.n[1]) - Number(b.n[1])).map(({ p, n }) => ({ id: p.id, rotulo: String(p.nome).trim(), nome: p.nome }));
  }

  window.CicluzVendasPdvDados = {
    estado, situacao, carregarOpcoes, consultar, gruposDeVendas, reiniciarFiltro, abasPdv, mensagemErro,
    hojeIso, somarDias, moeda, numero, hora, dataCurta, nomePagamento, ROTULO_STATUS,
  };
})();
