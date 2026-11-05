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

  // Adaptação da casca: no principal a criação do malote fica em Transferências e a Conferência/Histórico
  // em telas próprias; aqui tudo mora nos cards de Entradas → Caixas, na ordem em que o fluxo acontece.
  const CARDS = [
    ['malote', 'Malote da Tesouraria', 'Criar o malote com lacre e enviar dinheiro ao PDV'],
    ['abertura', 'Abertura do caixa', 'Conferir o malote e abrir o turno'],
    ['turno', 'Turno do caixa', 'Resumo, sangria, PDV e vendas'],
    ['fechamento', 'Fechamento do caixa', 'Contagem, folha, maquininha e lacre'],
    ['conferencia', 'Conferência da Tesouraria', 'Fechou certo ou teve quebra'],
    ['gerencia', 'Gerência', 'Monitor, mensagens e histórico de caixas'],
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

  const PERFIS = [['operador', 'Operador'], ['gerencia', 'Gerência'], ['tesouraria', 'Tesouraria']];
  // Quem pode o quê (padrão de referência do principal; ver Caixa-Brain/07). Operador e Gerência operam
  // o caixa; só a Gerência vê saldo, histórico e monitor; só a Tesouraria confere o fechamento.
  const PODE = {
    operar: ['operador', 'gerencia'],
    verSaldo: ['gerencia'],
    historico: ['gerencia'],
    conferir: ['tesouraria'],
    criarMalote: ['tesouraria', 'gerencia'],
    envioSemLacre: ['gerencia'],
    mensagens: ['gerencia'],
  };
  const pode = (acao) => PODE[acao].includes(estado.perfil);

  /** Malote que a Tesouraria já deixou pronto (o lacre 001 do PDV 1 existe desde o início da demonstração). */
  const seedMalotes = () => [{
    id: 'ml-001', lacre: '001', pdv: 'PDV 1', origem: 'Cofre Principal', especie: 30000, moedas: 5000, valor: 35000,
    lacresRetorno: ['SNG-014', 'SNG-015'], lacreFechamento: 'FCH-001', criadoPor: 'Carla (Tesouraria)', criadoEm: '07:30', situacao: 'disponivel',
  }];
  /** Caixas de "ontem" já fechados, para a Conferência e o Histórico terem o que mostrar. */
  const seedHistorico = () => [
    { id: 'cx-90', data: '04/11/2026', pdv: 'PDV 2', turno: 'Tarde', operador: 'Bruna Costa', supervisor: 'Patrícia Souza', abertura: '14:00', fechamento: '21:58', fechadoPor: 'Bruna Costa',
      entradas: 612350, transfEntrada: 35000, transfSaida: 0, esperado: 41200, contado: 41200, diferenca: 0, lacreFechamento: 'FCH-090', lacreReservado: 'FCH-090', observacao: '',
      retorno: { valor: 41200, situacao: 'pendente' }, conferencias: [], anexos: { folha: 1, creare: 1, comprovantes: 1 } },
    { id: 'cx-91', data: '04/11/2026', pdv: 'PDV 3', turno: 'Manhã', operador: 'Carlos Henrique', supervisor: 'Marcos Lima', abertura: '06:00', fechamento: '13:55', fechadoPor: 'Carlos Henrique',
      entradas: 488900, transfEntrada: 35000, transfSaida: 0, esperado: 38900, contado: 38400, diferenca: -500, lacreFechamento: 'FCH-091', lacreReservado: 'FCH-091', observacao: 'Faltou uma nota de R$ 5,00 no troco do início da manhã.',
      retorno: { valor: 38400, situacao: 'pendente' }, conferencias: [], anexos: { folha: 1, creare: 1, comprovantes: 1 } },
    { id: 'cx-92', data: '03/11/2026', pdv: 'PDV 1', turno: 'Tarde', operador: 'Ana Paula', supervisor: 'Marcos Lima', abertura: '14:02', fechamento: '22:01', fechadoPor: 'Ana Paula',
      entradas: 530120, transfEntrada: 35000, transfSaida: 20000, esperado: 35000, contado: 35300, diferenca: 300, lacreFechamento: 'FCH-088', lacreReservado: 'FCH-088', observacao: 'Sobra de R$ 3,00: cliente deixou o troco.',
      retorno: { valor: 35300, situacao: 'recebido' }, conferencias: [{ resultado: 'conferido', observacao: '', por: 'Carla (Tesouraria)', em: '04/11 08:10' }], anexos: { folha: 1, creare: 1, comprovantes: 1 } },
  ];
  const base = () => ({
    perfil: 'operador', status: 'fechado', abertura: null, turno: null,
    fechamento: null, malotes: seedMalotes(), historico: seedHistorico(), mensagens: [], notificacoes: [],
  });
  const estado = base();

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

  const novoFechamento = () => ({
    etapa: 1, gerente: '', gerenteOk: false, corte: hora(),
    contagem: { especie: '', moedas: '', registrada: null }, // registrada = { total, esperado, diferenca, correcoes[] }
    folha: { anexo: null, campos: null, travados: true, correcao: '' },
    relatorioGerado: false,
    maq: { comprovante: null, valores: null, travados: true, salvo: false },
    folhaFechamento: null, lacre: '', observacao: '', resultado: null,
  });
  /** "Encerrar vendas": grava o corte e abre o fechamento (sem volta). */
  function iniciarFechamento() {
    estado.status = 'em_fechamento';
    estado.fechamento = novoFechamento();
  }

  /** A Abertura confirma: o turno nasce e o caixa passa a "aberto". */
  function abrirCaixa(abertura) {
    estado.abertura = abertura;
    estado.turno = novoTurno(abertura);
    estado.status = 'aberto';
    // Mensagens vigentes da Gerência para a empresa ou para este PDV chegam a quem abre (nunca bloqueiam a abertura).
    estado.mensagens.forEach((m) => {
      const vigente = !m.encerrada && (!m.validade || new Date(m.validade).getTime() > Date.now());
      const alcanca = m.alvoTipo === 'empresa' || (m.alvoTipo === 'pdvs' && m.pdvs.includes(abertura.pdv));
      if (vigente && alcanca && !m.entregas.some((x) => x.pdv === abertura.pdv)) m.entregas.push({ operador: abertura.responsavel, pdv: abertura.pdv, situacao: 'entregue' });
    });
  }
  /** Recomeça a demonstração inteira; cada tela limpa o que guardou ao se registrar em aoReiniciar. */
  function reiniciar() {
    Object.assign(estado, base());
    reinicios.forEach((f) => f());
  }
  const aoReiniciar = (f) => reinicios.push(f);

  /** "Ver como": uma escolha só, guardada no estado, para as telas em que a visão muda. `perfis` limita as opções. */
  function seletorPerfil(aoMudar, perfis) {
    const opcoes = perfis ? PERFIS.filter(([v]) => perfis.includes(v)) : PERFIS;
    if (!opcoes.some(([v]) => v === estado.perfil)) estado.perfil = opcoes[0][0];
    const box = U.el('div', 'caixa-perfil');
    box.append(U.el('span', 'compras-rotulo', 'Ver como'), U.chips(opcoes, estado.perfil, (v) => { estado.perfil = v; aoMudar(); }));
    return box;
  }
  /** Faixa de aviso da casca; com aoMudar, traz o "Ver como". */
  function faixaDemo(texto, aoMudar, perfis) {
    const f = U.el('div', 'caixa-aviso caixa-faixa');
    f.append(U.el('p', 'profiles-note', texto));
    if (aoMudar) f.append(seletorPerfil(aoMudar, perfis));
    return f;
  }

  /** Malote pelo lacre (qualquer estado); null se não existir. */
  const malotePorLacre = (lacre) => estado.malotes.find((m) => m.lacre.toLowerCase() === String(lacre).trim().toLowerCase()) || null;
  /** Todo número de lacre já usado na empresa (abertura, bolsas, fechamento): o lacre é único. */
  const lacreExiste = (numero) => estado.malotes.some((m) => [m.lacre, m.lacreFechamento, ...m.lacresRetorno].some((l) => l.toLowerCase() === String(numero).trim().toLowerCase()));

  /** Situação do caixa fechado para a Tesouraria (derivada, como no principal; a conferência não muda o status). */
  function situacaoDe(h) {
    const ultima = h.conferencias[h.conferencias.length - 1];
    if (ultima) return ultima.resultado === 'conferido' ? 'conferido_tesouraria' : 'divergencia_confirmada_tesouraria';
    if (h.diferenca < 0) return 'com_quebra';
    return h.diferenca === 0 ? 'fechado_sem_pendencias' : 'aguardando_tesouraria';
  }
  const ROTULO_SITUACAO = {
    aguardando_tesouraria: 'Aguardando Tesouraria', fechado_sem_pendencias: 'Fechado sem pendências', com_quebra: 'Com quebra',
    conferido_tesouraria: 'Conferido pela Tesouraria', divergencia_confirmada_tesouraria: 'Divergência confirmada pela Tesouraria',
  };
  const TOM_SITUACAO = {
    aguardando_tesouraria: 'atencao', fechado_sem_pendencias: 'info', com_quebra: 'negativo',
    conferido_tesouraria: 'positivo', divergencia_confirmada_tesouraria: 'atencao',
  };

  /** Esperado, contado e diferença do fechamento (centavos; sem tolerância). */
  const diferencaDe = (contado, esperado) => contado - esperado;

  /**
   * Conclui o fechamento (regras do `fecharCaixa` do principal, na ordem do servidor).
   * Devolve uma mensagem de erro (string) ou null quando fechou.
   */
  function fecharCaixa({ lacre, observacao }) {
    const f = estado.fechamento;
    const a = estado.abertura;
    const t = estado.turno;
    if (estado.status !== 'em_fechamento' || !f) return 'Inicie o fechamento e conclua os relatórios antes de fechar o caixa.';
    if (t.pdvLigado === false) return 'Registre o retorno do computador do PDV antes de fechar o caixa.';
    if (lacre !== a.lacreFechamento) return 'O lacre informado não corresponde ao lacre de fechamento reservado no malote.';
    if (!f.folhaFechamento) return 'Anexe ao menos uma foto da folha de fechamento antes de fechar o caixa.';
    if (!f.relatorioGerado) return 'Gere o relatório completo de vendas antes de fechar o caixa.';
    if (!f.contagem.registrada) return 'Informe a contagem física (cédulas e moedas) em Vendas e gere o relatório antes de fechar o caixa.';
    if (!f.maq.salvo) return 'Salve a conferência da maquininha antes de fechar o caixa.';
    if (resumo().pendentes.length) return 'Há dinheiro sem lacre aguardando confirmação neste caixa. Confirme o recebimento ou marque “Não recebi” antes de fechar.';
    const esperado = resumo().saldo; // recalculado no fechamento, como no servidor
    if (esperado < 0) return 'O saldo físico calculado está negativo. Revise as saídas físicas antes de fechar o caixa.';
    const contado = f.contagem.registrada.total;
    const diferenca = diferencaDe(contado, esperado);
    if (diferenca !== 0 && !String(observacao || '').trim()) return 'Observação obrigatória quando a contagem física do fechamento divergir.';
    const r = resumo();
    const registro = {
      id: 'cx-' + (100 + estado.historico.length), data: new Date().toLocaleDateString('pt-BR'), pdv: a.pdv, turno: a.turno, operador: a.responsavel,
      supervisor: f.gerente || a.supervisor, abertura: a.abertoEm, fechamento: hora(), fechadoPor: a.responsavel,
      entradas: r.entradas, transfEntrada: a.valorInicial + r.recebido, transfSaida: r.sangrias, esperado, contado, diferenca,
      lacreFechamento: lacre, lacreReservado: a.lacreFechamento, observacao: String(observacao || '').trim(),
      retorno: contado > 0 ? { valor: contado, situacao: 'pendente' } : null, conferencias: [],
      anexos: { folha: 1, creare: 1, comprovantes: 1 }, desta_sessao: true,
    };
    estado.historico.unshift(registro);
    // Notificações como no principal: falta = quebra + aviso; sobra = só aviso; sem usuário de Tesouraria não há aviso.
    if (diferenca < 0) estado.notificacoes.push({ tipo: 'quebra_caixa', titulo: 'Quebra de caixa - ' + a.responsavel, valor: diferenca, para: 'Tesouraria' });
    if (diferenca > 0) estado.notificacoes.push({ tipo: 'transferencia_divergencia', titulo: 'Sobra na conferência de fechamento - ' + a.responsavel, valor: diferenca, para: 'Tesouraria' });
    f.resultado = registro;
    estado.status = 'fechado';
    return null;
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
    COR, COR_TEXTO, PERFIS, estado, pode,
    moeda, centavos, hora, somarMin, totalItens,
    resumo, abrirCaixa, iniciarFechamento, fecharCaixa, diferencaDe, reiniciar, aoReiniciar, seletorPerfil, faixaDemo,
    malotePorLacre, lacreExiste, situacaoDe, ROTULO_SITUACAO, TOM_SITUACAO,
    cards: () => CARDS.map(([id, t, d]) => [t, d, 'caixa:' + id]),
    icone: () => U.svg(ICONE),
    criarTela, dialogo, abrir, registrar, voltar,
  };
})();
