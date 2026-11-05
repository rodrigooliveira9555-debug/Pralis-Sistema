/*
 * Caixa — entrada do módulo no menu do S2 (casca: só tela, dados fictícios, nada gravado).
 * Entradas · Vendas / Faturamento → Caixas abre os cards abaixo. Fluxo e regras vêm do Caixa do
 * sistema principal (web-vue/components/caixa); o visual é o das telas internas do S2.
 * Cada tela se registra com CicluzCaixa.registrar(nome, abrir).
 *
 * Estado único da casca (CicluzCaixa.estado): perfil de quem olha, status do caixa, dados da
 * abertura e do turno. As telas leem e gravam aqui; nenhuma guarda estado próprio do turno.
 * Tudo em memória e em centavos: recarregar a página zera.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const COR = '#eab308';
  const COR_TEXTO = '#785600';
  const ICONE = '<path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>';
  const telas = {};
  const reinicios = [];

  const CARDS = [
    ['abertura', 'Abertura do caixa', 'Conferir o malote e abrir o turno'],
    ['turno', 'Turno do caixa', 'Resumo, sangria, PDV e vendas'],
  ];

  const voltar = () => openSection(sections[0][0], 'Caixas', 'caixa', COR);

  /* ---------- Formatação (dinheiro sempre em centavos) ---------- */

  const moeda = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  /** "1.234,56" → 123456; vazio ou inválido → null. */
  function centavos(texto) {
    const limpo = String(texto || '').replace(/[R$\s.]/g, '').replace(',', '.');
    if (!limpo || !/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
    return Math.round(Number(limpo) * 100);
  }
  const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  /** Soma minutos a um "HH:MM" (as vendas fictícias do turno ficam depois da abertura). */
  function somarMin(hhmm, minutos) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = (h * 60 + m + minutos) % 1440;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }

  /* ---------- Estado único da casca ---------- */

  const PERFIS = [['operador', 'Operador'], ['gerencia', 'Gerência']];

  const estado = { perfil: 'operador', status: 'fechado', abertura: null, turno: null };

  // [minuto depois da abertura, formas [[forma, centavos]] ou uma forma só, itens [[produto, qtd, unitário]]]
  const VENDAS = [
    [6, 'Dinheiro', [['Pão francês', 10, 80], ['Café coado', 1, 450]]],
    [14, 'Pix', [['Bolo de cenoura (fatia)', 2, 750], ['Suco de laranja', 1, 800]]],
    [22, 'Débito', [['Pão de queijo', 6, 350]]],
    [31, 'Crédito', [['Pão francês', 20, 80], ['Leite 1 L', 2, 620], ['Manteiga 200 g', 1, 1290]]],
    [40, 'Dinheiro', [['Coxinha', 2, 650]]],
    [47, 'Voucher', [['Marmitex', 1, 2490]]],
    [55, [['Dinheiro', 2000], ['Pix', 1090]], [['Torta de frango', 1, 1890], ['Refrigerante lata', 2, 600]]],
    [63, 'Pix', [['Pão de forma', 1, 1190], ['Café coado', 2, 450]]],
    [71, 'Crédito', [['Bolo inteiro', 1, 4800]]],
    [80, 'Dinheiro', [['Pão francês', 5, 80], ['Água 500 ml', 1, 400]]],
    [92, 'Débito', [['Sonho', 3, 550]]],
    [105, 'Dinheiro', [['Café coado', 3, 450], ['Pão na chapa', 2, 500]]],
  ];
  const CANCELADAS = [
    { min: 35, id: 'CRE-000231', forma: 'Dinheiro', autorizadoPor: 'Marcos Lima', motivo: 'Cliente desistiu', justificativa: 'Cliente saiu sem pagar a venda no balcão.', itens: [['Coxinha', 4, 650]] },
    { min: 88, id: 'CRE-000236', forma: 'Pix', autorizadoPor: 'Patrícia Souza', motivo: 'Produto lançado errado', justificativa: 'Lançado pão de forma em vez de pão integral.', itens: [['Pão de forma', 1, 1190]] },
  ];
  const totalItens = (itens) => itens.reduce((s, [, q, u]) => s + q * u, 0);

  /** Turno fictício que nasce junto com a abertura: um recebimento pendente, vendas e canceladas. */
  function novoTurno(abertura) {
    const at = (min) => somarMin(abertura.abertoEm, min);
    return {
      pdvLigado: true,
      parada: null, // { desde, motivos, outro } enquanto o PDV está desligado
      paradas: [],
      recebimentos: [
        { id: 'rec-1', valor: 15000, especie: 10000, moedas: 5000, origem: 'Cofre Principal', enviadoPor: 'Patrícia Souza (Gerência)', hora: abertura.abertoEm, observacao: 'Reforço de troco para o movimento.', situacao: 'pendente' },
      ],
      sangrias: [],
      lacresLivres: abertura.lacresSangria.slice(),
      vendas: VENDAS.map(([min, forma, itens], i) => {
        const valor = totalItens(itens);
        return {
          id: 'V-' + String(101 + i), hora: at(min), valor, itens,
          formas: Array.isArray(forma) ? forma : [[forma, valor]],
          descricao: itens.map(([p, q]) => q + '× ' + p).join(', '),
        };
      }),
      canceladas: CANCELADAS.map((c) => ({ ...c, hora: at(c.min), valor: totalItens(c.itens), descricao: c.itens.map(([p, q]) => q + '× ' + p).join(', ') })),
    };
  }

  /** Valores derivados do turno (a casca calcula aqui; no servidor virá pronto). */
  function resumo() {
    const t = estado.turno;
    const a = estado.abertura;
    if (!t || !a) return null;
    const porForma = new Map();
    let entradas = 0;
    t.vendas.forEach((v) => {
      entradas += v.valor;
      v.formas.forEach(([forma, valor]) => {
        const x = porForma.get(forma) || { valor: 0, qtd: 0 };
        x.valor += valor;
        x.qtd += 1;
        porForma.set(forma, x);
      });
    });
    const recebido = t.recebimentos.filter((r) => r.situacao === 'confirmado').reduce((s, r) => s + r.valor, 0);
    const sangrias = t.sangrias.reduce((s, x) => s + x.valor, 0);
    const saldo = a.valorInicial + (porForma.get('Dinheiro')?.valor || 0) + recebido - sangrias;
    return {
      entradas,
      porForma: [...porForma].map(([forma, x]) => [forma, x.valor, x.qtd]),
      recebido, sangrias, saldo,
      saldoLivre: Math.max(0, saldo),
      pendentes: t.recebimentos.filter((r) => r.situacao === 'pendente'),
    };
  }

  /** A Abertura confirma: o turno nasce e o caixa passa a "aberto". */
  function abrirCaixa(abertura) {
    estado.abertura = abertura;
    estado.turno = novoTurno(abertura);
    estado.status = 'aberto';
  }
  /** Recomeça a demonstração inteira; cada tela limpa o que guardou ao se registrar em aoReiniciar. */
  function reiniciar() {
    estado.perfil = 'operador';
    estado.status = 'fechado';
    estado.abertura = null;
    estado.turno = null;
    reinicios.forEach((f) => f());
  }
  const aoReiniciar = (f) => reinicios.push(f);

  /** "Ver como": uma escolha só, guardada no estado, para as telas em que a visão muda. */
  function seletorPerfil(aoMudar) {
    const box = U.el('div', 'caixa-perfil');
    box.append(U.el('span', 'compras-rotulo', 'Ver como'), U.chips(PERFIS, estado.perfil, (v) => { estado.perfil = v; aoMudar(); }));
    return box;
  }
  /** Faixa de aviso da casca; com aoMudar, traz o "Ver como". */
  function faixaDemo(texto, aoMudar) {
    const f = U.el('div', 'caixa-aviso caixa-faixa');
    f.append(U.el('p', 'profiles-note', texto));
    if (aoMudar) f.append(seletorPerfil(aoMudar));
    return f;
  }

  /* ---------- Telas e diálogos ---------- */

  /** Tela no padrão do S2 (view > panel > head + content), na cor de Vendas. */
  function criarTela({ id, titulo, caminho }) {
    const view = U.el('section', 'view caixa-view');
    view.id = id;
    const panel = U.el('div', 'panel');
    const head = U.el('div', 'head');
    const badge = U.el('span', 'sector-icon config-inherit-icon header-origin-icon');
    badge.setAttribute('aria-hidden', 'true');
    const heading = U.el('div');
    const h2 = U.el('h2', null, titulo);
    const p = U.el('p', null, caminho);
    heading.append(h2, p);
    head.append(badge, heading);
    const body = U.el('div', 'content profiles-content compras-content caixa-content');
    panel.append(head, body);
    view.append(panel);
    document.querySelector('main').append(view);
    setViewOriginColor(view, COR);
    panel.style.setProperty('--panel-text', COR_TEXTO);
    addShortcuts(id, voltar);
    return {
      view, body,
      ativar() {
        badge.innerHTML = U.svg(ICONE);
        badge.style.background = '';
        document.querySelectorAll('.view').forEach((x) => x.classList.remove('show'));
        view.classList.add('show');
        const crumb = document.getElementById('crumb');
        if (crumb) crumb.textContent = caminho;
        const t = document.getElementById('title');
        if (t) t.textContent = titulo;
        normalizeHeaderActions(view);
        body.scrollTop = 0;
      },
    };
  }

  /** Diálogo do S2 (U.dialogo) na cor do Caixa. */
  function dialogo(opcoes) {
    const d = U.dialogo(opcoes);
    d.style.setProperty('--menu-accent', COR);
    d.style.setProperty('--dialog-accent', COR);
    d.classList.add('caixa-dialog');
    return d;
  }

  function registrar(nome, abrir) { telas[nome] = abrir; }
  function abrir(nome) {
    const t = telas[nome];
    if (t) return t();
    console.warn('Caixa: tela não encontrada', nome);
  }

  window.CicluzCaixa = {
    COR, COR_TEXTO, PERFIS, estado,
    moeda, centavos, hora, somarMin, totalItens,
    resumo, abrirCaixa, reiniciar, aoReiniciar, seletorPerfil, faixaDemo,
    cards: () => CARDS.map(([id, t, d]) => [t, d, 'caixa:' + id]),
    icone: () => U.svg(ICONE),
    criarTela, dialogo, abrir, registrar, voltar,
  };
})();
