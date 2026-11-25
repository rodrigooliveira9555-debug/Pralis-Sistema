/*
 * Sistema comandas (CREARE) — dados. O S2 não guarda comanda: pergunta à própria API (/api/comandas-creare), que lê
 * do Sistema Pralis; lá chegam pelo robô da loja, a cada minuto. Regras de situação (R-248 do Sistema Pralis):
 * abandonada = puxada no caixa há mais de 1 h; esquecida = status 4 ou sem lançamento há mais de 24 h; conta = aberta
 * há dias mas ainda recebendo itens. A tela fica em tela.js.
 */
(function () {
  'use strict';
  const S = window.CicluzSync;

  const hojeIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const FILTRO_VAZIO = () => ({ dia: hojeIso(), situacao: '', funcionario: '', numero: '' });

  const estado = {
    aba: 'abertas',
    filtro: FILTRO_VAZIO(),
    pagina: 1,
    porPagina: 50,
    lista: { itens: [], total: 0 },
    indicadores: null,
    contagem: { abertas: null, fechadas: null, status4: null },
    opcoes: { funcionarios: [] },
    carregando: false,
    erro: '',
    atualizadoEm: null,
    configurada: null,
  };

  /* ---------- Situação ---------- */

  // [rótulo, tom da etiqueta, explicação curta]. O texto sempre diz a situação: a cor nunca é a única pista.
  const SITUACAO = {
    aberta: ['Aberta', 'info', 'Recebendo itens'],
    puxada: ['Puxada no caixa', 'marca', 'Esperando o pagamento'],
    abandonada: ['Abandonada', 'negativo', 'Puxada no caixa há mais de 1 hora, sem pagamento'],
    conta: ['Conta', 'neutro', 'Aberta há dias e ainda recebendo itens'],
    esquecida: ['Esquecida', 'atencao', 'Sem lançamento há mais de 24 horas'],
    fechada: ['Paga', 'positivo', 'Fechada no caixa'],
    cancelada: ['Cancelada', 'neutro', 'Cancelada no CREARE'],
  };
  const SITUACOES_DA_ABA = {
    abertas: ['aberta', 'puxada', 'abandonada', 'conta', 'esquecida'],
    fechadas: ['fechada', 'cancelada'],
    status4: [],
  };

  /* ---------- Formatos ---------- */

  const moeda = (centavos) => (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const numero = (n) => Number(n || 0).toLocaleString('pt-BR');
  const fmt = (opcoes) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opcoes });
  const fmtHora = fmt({ hour: '2-digit', minute: '2-digit' });
  const fmtDia = fmt({ day: '2-digit', month: '2-digit' });
  const hora = (iso) => (iso ? fmtHora.format(new Date(iso)) : '—');
  const diaDe = (iso) => (iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso)) : '');
  /** "14:32" hoje; "23/11 14:32" em outro dia. */
  const quando = (iso) => (!iso ? '—' : diaDe(iso) === hojeIso() ? hora(iso) : fmtDia.format(new Date(iso)) + ' ' + hora(iso));
  const dataCurta = (dia) => (dia ? dia.slice(8, 10) + '/' + dia.slice(5, 7) : '');

  /** Duração legível: "40 s", "12 min", "2 h 05 min", "3 dias 4 h". */
  function duracao(segundos) {
    if (segundos === null || segundos === undefined) return '—';
    const s = Math.max(0, Math.round(segundos));
    const u = (n, unidade) => n + ' ' + unidade; // número e unidade nunca se separam na quebra de linha
    if (s < 60) return u(s, 's');
    const min = Math.floor(s / 60);
    if (min < 60) return u(min, 'min');
    const h = Math.floor(min / 60);
    if (h < 24) return u(h, 'h') + ' ' + u(String(min % 60).padStart(2, '0'), 'min');
    const dias = Math.floor(h / 24);
    return u(dias, dias === 1 ? 'dia' : 'dias') + (h % 24 ? ' ' + u(h % 24, 'h') : '');
  }

  /**
   * Régua de tempo: quanto do limite da situação já passou (0 a 1) e o tom.
   * Puxada: limite 1 h (abandonada). Aberta: 24 h sem lançamento (esquecida). Fechada: 2 h de referência.
   */
  function regua(c) {
    const agora = Date.now();
    const desde = (iso) => (iso ? Math.max(0, (agora - Date.parse(iso)) / 1000) : null);
    if (c.situacao === 'fechada' || c.situacao === 'cancelada') {
      const s = c.segundosAberta || 0;
      return { parte: Math.min(1, s / 7200), tom: s > 7200 ? 'atencao' : 'ok', texto: duracao(c.segundosAberta) };
    }
    if (c.situacao === 'puxada' || c.situacao === 'abandonada') {
      const s = desde(c.puxadaEm || c.ultimoLancamentoEm);
      const parte = s === null ? 0 : Math.min(1, s / 3600);
      return { parte, tom: parte >= 1 ? 'alerta' : parte >= 0.5 ? 'atencao' : 'ok', texto: 'no caixa há ' + duracao(s) + (c.puxadaAproximada ? ' (aprox.)' : '') };
    }
    if (c.situacao === 'conta') return { parte: 1, tom: 'neutro', texto: duracao(c.segundosAberta) };
    const s = desde(c.ultimoLancamentoEm || c.abertaEm);
    const parte = s === null ? 0 : Math.min(1, s / 86400);
    return { parte, tom: c.situacao === 'esquecida' ? 'alerta' : parte >= 0.5 ? 'atencao' : 'ok', texto: duracao(c.segundosAberta) };
  }

  /* ---------- API ---------- */

  const api = (caminho) => S.api(caminho);

  function params() {
    const f = estado.filtro;
    const p = new URLSearchParams({ aba: estado.aba, pagina: String(estado.pagina), porPagina: String(estado.porPagina) });
    if (estado.aba === 'fechadas' && f.dia) p.set('dia', f.dia);
    if (f.situacao) p.set('situacao', f.situacao);
    if (f.funcionario) p.set('funcionario', f.funcionario);
    if (f.numero) p.set('numero', f.numero);
    return p;
  }

  async function situacao() {
    estado.configurada = (await api('/comandas-creare/situacao')).configurada;
    return estado.configurada;
  }
  async function carregarOpcoes() {
    estado.opcoes = await api('/comandas-creare/opcoes');
  }

  /** A lista da aba e os indicadores (do dia escolhido), em paralelo. Erro vira texto; o resto da tela continua. */
  async function consultar() {
    estado.carregando = true;
    estado.erro = '';
    try {
      const dia = estado.aba === 'fechadas' ? estado.filtro.dia : hojeIso();
      const [lista, indicadores] = await Promise.all([
        api('/comandas-creare?' + params().toString()),
        api('/comandas-creare/indicadores?dia=' + encodeURIComponent(dia)),
      ]);
      estado.lista = { itens: lista.itens || [], total: lista.total || 0 };
      estado.indicadores = indicadores;
      estado.contagem.abertas = indicadores.abertasAgora;
      estado.contagem.fechadas = indicadores.fechadasNoDia;
      estado.contagem.status4 = indicadores.status4;
      estado.atualizadoEm = new Date();
    } catch (erro) {
      estado.erro = mensagemErro(erro);
    } finally {
      estado.carregando = false;
    }
  }

  const detalhe = (idComanda) => api('/comandas-creare/' + encodeURIComponent(idComanda));

  function mensagemErro(erro) {
    if (!erro) return 'Algo deu errado.';
    if (erro.status === 0) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    if (erro.status === 401) return 'Sua sessão terminou. Entre de novo.';
    if (erro.status === 403) return 'O painel de comandas é só do administrador.';
    if (erro.status === 429) return 'Muitas consultas seguidas. Aguarde um minuto.';
    return erro.message || 'Não foi possível ler as comandas agora.';
  }

  function reiniciarFiltro() {
    estado.filtro = FILTRO_VAZIO();
    estado.pagina = 1;
  }

  window.CicluzComandasDados = {
    estado, SITUACAO, SITUACOES_DA_ABA, hojeIso, moeda, numero, hora, quando, dataCurta, duracao, regua,
    situacao, carregarOpcoes, consultar, detalhe, reiniciarFiltro, mensagemErro,
  };
})();
