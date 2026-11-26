/*
 * Transferências › Lançamentos › CNT - Transferências (25/11/2026, pedido do Washington): o formulário "Nova Transferência", refeito pelo esboço
 * dele (1ª fase, só estes campos): Valor (calculadora), Data, Origem / Saída, Destino / Entrada, Múltiplo destino e Transferência com lacre (+).
 * Peças de compras/ui.js: janela na cor da origem (cabeçalho arredondado só aqui: classe transferencia-tela), campo de data com calendário,
 * interruptor Sim/Não, chips de escolha única e remover redondo.
 *
 * Regras desta tela (pedido do Washington):
 *  - Valor: uma calculadora de teclas (0 a 9, + − × ÷ e "=") no lugar do campo de digitar. Os números entram como centavos (digitar 1, 0, 0, 0, 0 = 100,00).
 *    Cada valor (que pode ser × ou ÷ por um número inteiro) é de Notas ou de Moedas: tocar numa das duas escolhas já soma o valor ao acumulado; "+", "−" e "=" fecham o valor
 *    como Notas (sem escolha, é nota); o "=" está sempre ligado e fecha a conta. No fim fica só o TOTAL, sem distinguir nota de moeda (por dentro a tela guarda a soma de cada tipo, para quando a gravação existir).
 *  - Múltiplo destino = Sim: a caixa de Destino some e entra, na própria tela (sem abrir janela), a lista de TODAS as contas ativas (menos a de
 *    origem) com o ícone, para marcar várias.
 *  - Transferência com lacre: o "+" acrescenta uma linha de lacre embaixo do destino. O 1º clique cria a "Transferência final"; cada clique
 *    seguinte cria a "2ª", "3ª", "4ª transferência" ACIMA da final (a final sempre fica por último). Máximo de 4 (as quatro do esboço).
 *
 * TELA EM CONSTRUÇÃO: o CICLUZ ainda não tem servidor de transferências (PROJECT_BRAIN/11, P-48), então o Salvar só CONFERE o preenchimento
 * e avisa que não gravou. As contas vêm de /api/contas (ativas). Ficaram fora desta fase (saíram da tela, não estão escondidas):
 * transferência sem lacre, agendamento, tempo de confirmação.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const R = window.CicluzLancamentosRegras; const Sync = window.CicluzSync;
  if (!U || !R || !Sync) return;
  const { el, botao, campo, entrada, seletor } = U;

  const CAMINHO = 'Transferências · Contas / Locais / Lançamentos / CNT - Transferências';
  const COR_TEXTO = '#9a3412';
  const MAX_LACRES = 4;
  const MAX_DIGITOS = 11;
  const MAX_FATOR = 6; // o número depois de × ou ÷ é uma quantidade inteira
  const LIMITE = 99999999999; // centavos (R$ 999 milhões): trava o × que estouraria
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[1]) || '#f97316';
  const reais = (c) => (c < 0 ? '−' : '') + 'R$ ' + (Math.abs(c) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MARCA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  // Data no padrão do site, com o rótulo e o painel dentro do campo.
  function campoDeData(rotulo, valor = '') {
    const d = U.campoData({ rotulo, valor });
    d.no = el('div', 'compras-campo compras-data'); d.no.append(el('span', 'compras-rotulo', rotulo), d.caixa, d.painel);
    return d;
  }

  async function abrir() {
    let contas;
    try { const r = await Sync.api('/contas'); contas = r.contas.filter((c) => c.situacao === 'ATIVA').map((c) => c.nome); } catch (e) { return U.avisar((e && e.message) || 'Não foi possível carregar as contas.'); }
    formulario(contas);
  }

  /**
   * A calculadora do valor. Um TERMO é um valor em dinheiro (digitado em centavos) seguido, se quiser, de × ou ÷ por números inteiros
   * (ex.: R$ 20,00 × 5). Os termos se juntam com + e −. Cada termo fechado vira uma PARCELA { c: centavos com sinal, t: 'notas' | 'moedas' }.
   * Fecham o termo: tocar em Notas ou Moedas (vale o escolhido), "+" ou "−" e "=" (valem Notas: sem escolha, é nota). O "=" fecha a conta toda.
   * Devolve { no, tela, finalizar() }: finalizar() dá { erro } ou { total, notas, moedas } em centavos.
   */
  function calculadora(rotulo) {
    // base: dígitos do valor quando já se apertou × ou ÷ (senão o valor está em atual); fatores: [{ op, n }] já digitados; op: × ou ÷ esperando o número em atual.
    const est = { parcelas: [], base: null, fatores: [], op: '', atual: '', sinal: 1, fechado: false };
    const inteiro = (s) => (s ? parseInt(s, 10) : 0);
    const soma = () => est.parcelas.reduce((n, p) => n + p.c, 0);
    const por = (t) => est.parcelas.filter((p) => p.t === t).reduce((n, p) => n + p.c, 0);
    const SIMBOLO = { '*': '×', '/': '÷' };
    const tela = entrada('text', '', { readOnly: true, placeholder: 'R$ 0,00', inputMode: 'none', autocomplete: 'off' });
    tela.classList.add('transferencia-calc-tela'); tela.setAttribute('aria-label', rotulo); tela.setAttribute('aria-expanded', 'false');
    const resumo = el('p', 'transferencia-calc-resumo'); resumo.setAttribute('role', 'status');
    const aviso = el('small', 'transferencia-calc-aviso'); aviso.setAttribute('role', 'alert');
    const avisar = (t) => { aviso.textContent = t; };
    const tipos = U.chips([['notas', 'Notas'], ['moedas', 'Moedas']], '', (v) => escolherTipo(v));

    // O termo que está sendo digitado: { vazio } sem nada, { incompleto } com × ou ÷ sem o número, { erro }, ou { c } (centavos, sem sinal).
    function termo() {
      const dig = est.base !== null ? est.base : est.atual;
      if (!dig) return { vazio: true };
      const fatores = est.op ? (est.atual ? est.fatores.concat([{ op: est.op, n: est.atual }]) : null) : est.fatores;
      if (!fatores) return { incompleto: true };
      let c = inteiro(dig);
      for (const f of fatores) {
        const n = inteiro(f.n);
        if (f.op === '/') { if (!n) return { erro: 'Não é possível dividir por zero.' }; c = Math.round(c / n); } else c *= n;
        if (c > LIMITE) return { erro: 'Valor grande demais.' };
      }
      return { c };
    }
    const limparTermo = () => { est.base = null; est.fatores = []; est.op = ''; est.atual = ''; };
    // Fecha o termo como parcela do tipo dado. Devolve false (com aviso) se não der; true se fechou ou se não havia termo.
    function comprometer(tipo) {
      const t = termo();
      if (t.vazio) return true;
      if (t.incompleto) { avisar('Digite o número depois do ' + SIMBOLO[est.op] + '.'); return false; }
      if (t.erro) { avisar(t.erro); return false; }
      if (!t.c) { avisar('O valor não pode ser zero.'); return false; }
      est.parcelas.push({ c: est.sinal * t.c, t: tipo }); limparTermo(); est.sinal = 1; aviso.textContent = '';
      return true;
    }
    // O que a caixa mostra: o termo em andamento (ex.: "R$ 20,00 × 5"); sem termo, o total já somado.
    function textoDoTermo() {
      const dig = est.base !== null ? est.base : est.atual;
      if (!dig) return '';
      let txt = reais(inteiro(dig));
      est.fatores.forEach((f) => { txt += ' ' + SIMBOLO[f.op] + ' ' + f.n; });
      if (est.op) txt += ' ' + SIMBOLO[est.op] + ' ' + est.atual;
      return txt;
    }
    const mostrar = () => {
      const txt = textoDoTermo();
      const sinal = est.sinal < 0 ? '− ' : '';
      tela.value = txt ? sinal + txt : est.sinal < 0 ? '−' : est.parcelas.length ? reais(soma()) : '';
      const partes = [['notas', 'notas'], ['moedas', 'moedas']].filter(([t]) => por(t) !== 0).map(([t, nome]) => reais(por(t)) + ' ' + nome);
      resumo.textContent = est.parcelas.length ? (partes.length ? partes.join('   ') + '   = ' : '= ') + reais(soma()) : '';
      tipos.atualizar('');
    };
    const digito = (d) => {
      aviso.textContent = '';
      if (est.fechado) est.fechado = false; // digitar depois do "=" reabre a conta e continua
      if (est.atual.length >= (est.op ? MAX_FATOR : MAX_DIGITOS)) return;
      est.atual = (est.atual + d).replace(/^0+/, '');
      mostrar();
    };
    const apagar = () => {
      aviso.textContent = '';
      if (est.fechado) est.fechado = false; // o 1º ⌫ depois do "=" só reabre a conta
      else if (est.atual) est.atual = est.atual.slice(0, -1);
      else if (est.op) { // tira o × ou ÷ e devolve o número anterior para edição
        if (est.fatores.length) { const f = est.fatores.pop(); est.op = f.op; est.atual = f.n; } else { est.atual = est.base; est.base = null; est.op = ''; }
      } else if (est.sinal < 0) est.sinal = 1;
      else if (est.parcelas.length) { const p = est.parcelas.pop(); est.atual = String(Math.abs(p.c)); est.sinal = p.c < 0 ? -1 : 1; }
      mostrar();
    };
    // Tocar em Notas ou Moedas fecha o termo como parcela desse tipo e deixa a caixa pronta para o próximo.
    // Notas e Moedas: com um termo completo, somam o valor como notas ou moedas; em qualquer caso abrem a calculadora (tocar neles já entra nela).
    function escolherTipo(v) {
      if (!est.fechado && termo().c) comprometer(v);
      mostrar();
      mostrarPainel(true);
    }
    // + e −: fecham o termo (como notas, se nada foi escolhido) e dizem se o próximo termo soma ou subtrai.
    const mais = (sinal) => {
      aviso.textContent = '';
      if (est.fechado) est.fechado = false;
      else if (!termo().vazio) { if (!comprometer('notas')) return; }
      else if (!est.parcelas.length) { avisar('Digite um valor antes.'); return; }
      est.sinal = sinal; mostrar();
    };
    // × e ÷: o termo continua, agora com um número inteiro (a quantidade) depois do sinal.
    const vezes = (op) => {
      aviso.textContent = '';
      if (est.fechado) est.fechado = false;
      if (!est.op && est.atual) { est.base = est.atual; est.atual = ''; est.op = op; }
      else if (est.op && est.atual) { est.fatores.push({ op: est.op, n: est.atual }); est.atual = ''; est.op = op; }
      else if (est.op) est.op = op; // trocou de × para ÷ antes de digitar o número
      else { avisar('Digite um valor antes.'); return; }
      mostrar();
    };
    // "=" fecha a conta toda (o termo que está aberto entra como notas). Fica sempre ligado.
    const igual = () => {
      if (est.fechado) return;
      if (!comprometer('notas')) return;
      if (!est.parcelas.length) { avisar('Digite um valor antes.'); return; }
      est.sinal = 1; est.fechado = true; aviso.textContent = ''; mostrar(); mostrarPainel(false);
    };
    const tecla = (texto, acao, classe, rotuloAria) => {
      const b = el('button', 'transferencia-tecla' + (classe ? ' ' + classe : ''), texto); b.type = 'button'; b.onclick = acao;
      if (rotuloAria) { b.title = rotuloAria; b.setAttribute('aria-label', rotuloAria); }
      return b;
    };
    const teclado = el('div', 'transferencia-teclado');
    const d = (n) => tecla(String(n), () => digito(String(n)));
    const op = (texto, acao, nome) => tecla(texto, acao, 'operador', nome);
    teclado.append(d(7), d(8), d(9), op('÷', () => vezes('/'), 'Dividir'), d(4), d(5), d(6), op('×', () => vezes('*'), 'Multiplicar'), d(1), d(2), d(3), op('−', () => mais(-1), 'Subtrair'),
      (() => { const t = tecla('', apagar, 'apagar', 'Apagar'); t.innerHTML = U.svg('<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1ZM12.5 9.5l5 5M17.5 9.5l-5 5"/>'); return t; })(), d(0), tecla('=', igual, 'igual', 'Fechar o total'), op('+', () => mais(1), 'Somar'));
    // A calculadora só aparece quando se toca na caixa do valor; fecha ao fechar a conta com "=", no Esc, tocando de novo na caixa ou tocando fora.
    const painel = el('div', 'transferencia-calc-painel'); painel.hidden = true; painel.id = 'transferencia-calc-painel';
    painel.append(el('span', 'transferencia-calc-legenda', 'Toque em Notas ou Moedas para fechar o valor. Sem escolha, conta como Notas.'), teclado, aviso);
    tela.setAttribute('aria-controls', painel.id);
    // Tocar fora do quadro do valor também fecha a calculadora (o que já foi digitado fica como está).
    const fora = (e) => { if (!no.isConnected) document.removeEventListener('pointerdown', fora); else if (!no.contains(e.target)) mostrarPainel(false); };
    const mostrarPainel = (sim) => { painel.hidden = !sim; tela.setAttribute('aria-expanded', String(sim)); document.removeEventListener('pointerdown', fora); if (sim) document.addEventListener('pointerdown', fora); };
    tela.addEventListener('click', () => mostrarPainel(painel.hidden));
    // Teclado do computador: números, Backspace, + − * / (x também multiplica), N e M (Notas e Moedas) e "=" (ou Enter, que não envia o formulário).
    // Digitar com a calculadora fechada abre.
    const ATALHOS = { '+': () => mais(1), '-': () => mais(-1), '*': () => vezes('*'), x: () => vezes('*'), X: () => vezes('*'), '/': () => vezes('/'), n: () => escolherTipo('notas'), N: () => escolherTipo('notas'), m: () => escolherTipo('moedas'), M: () => escolherTipo('moedas') };
    tela.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape' && !painel.hidden) { mostrarPainel(false); e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === ' ' || (e.key === 'Enter' && painel.hidden)) { mostrarPainel(painel.hidden); e.preventDefault(); return; }
      if (/^[0-9]$/.test(e.key)) { mostrarPainel(true); digito(e.key); }
      else if (e.key === 'Backspace') apagar();
      else if (e.key === '=' || e.key === 'Enter') igual();
      else if (ATALHOS[e.key]) ATALHOS[e.key]();
      else return;
      e.preventDefault();
    });
    // Cabeçalho do valor: todo laranja, grande. O valor (ligado à calculadora), Notas e Moedas ficam à vista; o teclado abre ao tocar no valor.
    const no = el('div', 'transferencia-valor-cab');
    no.append(el('span', 'transferencia-valor-rotulo', rotulo), tela, resumo, tipos, painel);
    mostrar();
    return {
      no,
      tela,
      // Só vale o valor FECHADO com "=" (o que está sendo digitado, sem fechar, não conta).
      finalizar() {
        if (!est.fechado) return est.atual || est.base !== null || est.parcelas.length ? { erro: 'Clique em = para fechar o valor.' } : { total: 0 };
        return { total: soma(), notas: por('notas'), moedas: por('moedas') };
      },
    };
  }

  /* Padrão de listas agrupadas (estilo Apple): um título por assunto e, embaixo, um quadro com uma linha por campo (nome à esquerda, valor à direita). */
  const linha = (rotulo, ...controles) => { const l = el('div', 'transferencia-linha'); l.append(el('span', 'transferencia-linha-rotulo', rotulo), ...controles); return l; };
  // Linha com um campo: o nome fica dentro da linha (à esquerda) e tocar nele leva ao campo. É uma div (o rótulo padrão do sistema força espaçamento e fonte).
  const linhaDe = (rotulo, controle) => {
    const l = el('div', 'transferencia-linha'); const nome = el('span', 'transferencia-linha-rotulo', rotulo);
    controle.classList.add('transferencia-linha-controle'); controle.setAttribute('aria-label', rotulo.replace(' *', ''));
    l.onclick = (e) => { if (e.target === l || e.target === nome) controle.focus(); };
    l.append(nome, controle); return l;
  };
  const quadro = (...linhas) => { const q = el('div', 'transferencia-quadro'); q.append(...linhas); return q; };
  const secao = (titulo, ...filhos) => { const s = el('section', 'transferencia-secao'); s.append(...(titulo ? [el('h4', 'transferencia-secao-titulo', titulo)] : []), ...filhos); return s; };

  /* Ícones no traço fino do sistema. */
  const ICONE = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3"/>',
    audio: '<path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z"/>',
    video: '<path d="M3 7h12v10H3zM15 11l6-3v8l-6-3"/>',
    imagem: '<path d="M4 5h16v14H4zM4 16l4-4 4 4 3-3 5 5M9 9h.01"/>',
    clipe: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
    baixo: '<path d="m6 9 6 6 6-6"/>',
    lixeira: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    camera: '<path d="M3 7h12v10H3zM15 11l6-3v8l-6-3"/><circle cx="9" cy="12" r="1.6"/>',
    documento: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>',
  };
  const selo = (nome) => { const s = el('span', 'transferencia-linha-icone'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = U.svg(ICONE[nome]); return s; };
  const tamanho = (b) => (b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB');
  const hora24 = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  /** Botão redondo de excluir: cinza em repouso, vermelho ao tocar ou passar (o + em círculo faz o mesmo, na cor do cabeçalho). */
  function botaoExcluir(rotulo, acao, icone = 'lixeira') {
    const b = el('button', 'transferencia-circulo transferencia-circulo-excluir'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(ICONE[icone]); b.onclick = acao;
    return b;
  }
  /** Chave de ligar e desligar com texto ao lado (Sim/Não, Com lacre/Sem lacre). Devolve só a linha da chave, no tamanho da linha do quadro. */
  function chave(titulo, ligada, textos, aoMudar) {
    return U.quadroSituacao(titulo, ligada, { textos, aoMudar }).querySelector('.account-status-row');
  }
  /** Linha que abre algo para baixo: o nome, um resumo e a seta; aria-expanded diz se está aberto. */
  function linhaQueAbre(rotulo, aoToque) {
    const b = el('button', 'transferencia-linha transferencia-linha-acao'); b.type = 'button'; b.setAttribute('aria-expanded', 'false');
    const resumo = el('span', 'transferencia-linha-valor'); const seta = el('span', 'transferencia-seta'); seta.setAttribute('aria-hidden', 'true'); seta.innerHTML = U.svg(ICONE.baixo);
    b.append(el('span', 'transferencia-linha-rotulo', rotulo), resumo, seta); b.onclick = aoToque;
    return { no: b, resumo, abrir: (sim) => { b.setAttribute('aria-expanded', String(sim)); b.classList.toggle('aberto', sim); } };
  }

  /**
   * Tempo de aceite (Sim/Não). Com Sim, abre "Contar em": Dias, Horas ou Dias e horas.
   *  - Dias: um número inteiro (1, 2, 3…) com − e + ao lado; o texto acompanha ("1 dia", "2 dias").
   *  - Horas: o campo de hora hh:mm (com o relógio).
   *  - Dias e horas: os dois juntos ("1 dia e 04:30").
   * Uma linha de resumo diz como ficou. Só diz QUANTO tempo; a regra de quando o aceite vale está em PROJECT_BRAIN/11 (P-51).
   */
  function opcaoAceite(titulo) {
    const MAX_DIAS = 365;
    const estadoAc = { sim: false, modo: 'dias', dias: '1' };
    const hora = U.campoHora({ rotulo: 'Horas (hh:mm)', valor: '' });
    const linhaHora = linha('Horas (hh:mm)', hora.caixa, hora.painel);
    // Dias: − e + ou, tocando no campo, a roleta (o mesmo painel da hora) que rola e mostra a quantidade de dias.
    const roleta = U.roletaNumero({ rotulo: 'Dias', titulo: 'Dias', min: 1, max: MAX_DIAS, valor: '1' });
    const diasInput = roleta.input;
    const linhaDias = linhaDe('Dias', diasInput); linhaDias.append(roleta.painel);
    const passo = (rotulo, icone, delta) => { const b = el('button', 'transferencia-circulo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(icone); b.onclick = () => { roleta.definir((roleta.valor() || 0) + delta); }; return b; };
    linhaDias.append(passo('Menos um dia', '<path d="M5 12h14"/>', -1), passo('Mais um dia', ICONE.mais, 1));
    diasInput.addEventListener('input', () => { estadoAc.dias = diasInput.value; resumir(); });
    hora.input.addEventListener('input', () => resumir()); hora.input.addEventListener('change', () => resumir());
    const resumo = el('p', 'transferencia-aceite-resumo'); resumo.setAttribute('role', 'status');
    const linhaResumo = el('div', 'transferencia-linha transferencia-linha-resumo'); linhaResumo.append(resumo);
    const modos = U.chips([['dias', 'Dias'], ['horas', 'Horas'], ['ambos', 'Dias e horas']], 'dias', (v) => { estadoAc.modo = v; desenhar(); });
    const linhaModo = linha('Contar em', modos);
    const caixa = el('div', 'transferencia-opcao');
    const nDias = () => parseInt(estadoAc.dias, 10) || 0;
    const textoDias = () => nDias() + (nDias() === 1 ? ' dia' : ' dias');
    function resumir() {
      const h = hora24(hora.input.value) ? hora.input.value : '';
      const m = estadoAc.modo;
      const partes = [];
      if (m !== 'horas') partes.push(nDias() ? textoDias() : 'informe os dias');
      if (m !== 'dias') partes.push(h || 'informe as horas');
      resumo.textContent = 'Aceite em ' + partes.join(' e ') + '.';
    }
    function desenhar() {
      const m = estadoAc.modo;
      caixa.replaceChildren(caixa.firstChild, ...(estadoAc.sim ? [linhaModo, ...(m !== 'horas' ? [linhaDias] : []), ...(m !== 'dias' ? [linhaHora] : []), linhaResumo] : []));
      modos.atualizar(m); resumir();
    }
    caixa.append(linha(titulo, chave(titulo, false, ['Sim', 'Não'], (v) => { estadoAc.sim = v; desenhar(); if (v) (estadoAc.modo === 'horas' ? hora.input : diasInput).focus(); })));
    return {
      no: caixa,
      valor: () => ({ sim: estadoAc.sim, modo: estadoAc.modo, dias: nDias(), hora: hora.input.value }),
      // Devolve o texto do erro (e leva o foco ao campo) ou '' quando está certo.
      conferir() {
        if (!estadoAc.sim) return '';
        const m = estadoAc.modo;
        if (m !== 'horas' && (nDias() < 1 || nDias() > MAX_DIAS)) { diasInput.focus(); return 'Informe os dias do tempo de aceite (de 1 a ' + MAX_DIAS + ').'; }
        if (m !== 'dias' && !hora24(hora.input.value)) { hora.input.focus(); return 'Informe as horas do tempo de aceite (hh:mm).'; }
        return '';
      },
    };
  }

  /**
   * Anexos: uma linha ("Anexos", o resumo e o + em círculo cinza) que, ao tocar, abre um painel flutuante no MESMO padrão do calendário e da hora
   * (mesma largura, mesma caixa, fecha tocando fora ou com Esc). O painel tem as opções (Gravar áudio, Gravar vídeo, Anexar áudio, Anexar vídeo,
   * Anexar imagem e Anexar documento), cada uma com o nome à esquerda e o ícone redondo à direita; ao tocar ou passar, o círculo fica laranja.
   * Gravar áudio troca o painel pelo gravador do sistema (audio-nota.js), dentro do próprio anexo; "Anexar gravação" põe o áudio na lista.
   * Gravar vídeo abre a câmera no celular (no computador, o seletor de arquivos). Cada anexo vira uma linha com ícone ou miniatura, nome, tamanho e remover.
   * Tudo fica só na tela por enquanto (a transferência ainda não é gravada).
   */
  function blocoAnexos() {
    const anexos = [];
    const lista = el('div', 'transferencia-anexos');
    const resumo = el('span', 'transferencia-linha-valor');
    // A seta diz que a linha abre outra área (um submenu); lá dentro estão os botões que ativam cada função.
    const seta = el('span', 'transferencia-seta'); seta.setAttribute('aria-hidden', 'true'); seta.innerHTML = U.svg('<path d="m9 6 6 6-6 6"/>');
    const abre = el('button', 'transferencia-linha transferencia-linha-acao'); abre.type = 'button';
    abre.append(el('span', 'transferencia-linha-rotulo', 'Anexos'), resumo, seta);
    const audio = window.CicluzAudioNota ? window.CicluzAudioNota.criar({ rotulo: '', classe: 'transferencia-audio', aoSalvar: 'a transferência' }) : null;
    const painel = el('div', 'compras-escolha-painel compras-aniv-painel compras-data-painel transferencia-anexos-painel');
    const vistaMenu = el('div', 'transferencia-anexos-vista'); const vistaAudio = el('div', 'transferencia-anexos-vista');
    painel.append(vistaMenu, vistaAudio);
    const abrirPainel = U.flutuante(abre, painel);
    const resumir = () => { resumo.textContent = anexos.length ? anexos.length + (anexos.length === 1 ? ' anexo' : ' anexos') : 'Nenhum'; };
    function vista(qual) { vistaMenu.hidden = qual !== 'menu'; vistaAudio.hidden = qual !== 'audio'; if (!painel.hidden) abrirPainel(true); }

    function adicionar(item, icone, nomeArquivo, detalhe) {
      const l = el('div', 'transferencia-linha transferencia-anexo');
      const miniatura = icone === 'imagem' && item.url ? el('img', 'transferencia-anexo-img') : selo(icone);
      if (icone === 'imagem' && item.url) { miniatura.src = item.url; miniatura.alt = ''; }
      const nome = el('span', 'transferencia-anexo-nome', nomeArquivo); nome.append(el('small', null, detalhe));
      const remover = botaoExcluir('Remover ' + nomeArquivo, () => { if (item.url) URL.revokeObjectURL(item.url); if (item.gravacao && audio) audio.limpar(); anexos.splice(anexos.indexOf(item), 1); l.remove(); resumir(); }, 'fechar');
      item.linha = l; l.append(miniatura, nome, remover); anexos.push(item); lista.append(l); resumir();
    }
    function escolher(aceita, icone, camera) {
      const entradaArq = el('input'); entradaArq.type = 'file'; entradaArq.accept = aceita; entradaArq.multiple = !camera;
      if (camera) entradaArq.setAttribute('capture', 'environment');
      entradaArq.onchange = () => { [...entradaArq.files].forEach((f) => adicionar({ arquivo: f, url: URL.createObjectURL(f) }, icone, f.name, tamanho(f.size))); };
      entradaArq.click();
    }

    // Vista do menu: o título e as opções, na ordem pedida.
    const OPCOES = [
      ['mic', 'Gravar áudio', () => { vista('audio'); }, true],
      ['camera', 'Gravar vídeo', () => escolher('video/*', 'video', true)],
      ['audio', 'Anexar áudio', () => escolher('audio/*', 'audio')],
      ['video', 'Anexar vídeo', () => escolher('video/*', 'video')],
      ['imagem', 'Anexar imagem', () => escolher('image/*', 'imagem')],
      ['documento', 'Anexar documento', () => escolher('.pdf,.doc,.docx,.xls,.xlsx,.ods,.odt,.csv,.txt,application/pdf', 'documento')],
    ];
    vistaMenu.append(el('p', 'transferencia-folha-titulo', 'Anexar'), quadro(...OPCOES.map(([icone, titulo, acao, ficaAberto]) => {
      const b = el('button', 'transferencia-linha transferencia-folha-op'); b.type = 'button';
      const c = el('span', 'transferencia-circulo transferencia-circulo-grande'); c.setAttribute('aria-hidden', 'true'); c.innerHTML = U.svg(ICONE[icone]);
      b.append(el('span', 'transferencia-linha-rotulo', titulo), c);
      b.onclick = () => { if (!ficaAberto) abrirPainel(false); acao(); };
      return b;
    })));

    // Vista do gravador: voltar, o gravador do sistema e o botão que põe a gravação na lista.
    const voltar = el('button', 'transferencia-folha-titulo transferencia-anexos-voltar'); voltar.type = 'button'; voltar.textContent = '‹ Anexar'; voltar.onclick = () => vista('menu');
    const anexarGravacao = botao('Anexar gravação', () => {
      if (!audio) return;
      if (audio.gravando()) return U.avisar('Pare a gravação antes de anexar.');
      if (!audio.temNovo()) return U.avisar('Grave um áudio antes de anexar.');
      const antiga = anexos.find((x) => x.gravacao); if (antiga) { antiga.linha.remove(); anexos.splice(anexos.indexOf(antiga), 1); }
      adicionar({ gravacao: true }, 'mic', 'Gravação de áudio', 'gravada agora');
      abrirPainel(false); vista('menu');
    }, 'btn');
    vistaAudio.append(voltar, el('p', 'transferencia-folha-titulo', 'Gravar áudio'), ...(audio ? [audio.no, anexarGravacao] : [el('p', 'profiles-note', 'Gravação indisponível neste navegador.')]));
    vista('menu');
    abre.onclick = () => { if (painel.hidden) vista('menu'); abrirPainel(painel.hidden); };
    resumir();
    const no = el('div', 'transferencia-opcao'); no.append(abre, painel, lista);
    return { no, audio, anexos };
  }

  function formulario(contas) {
    const estado = { multiplo: false, lacre: { com: false, numero: '' }, retornos: [], padraoLacre: false };
    U.dialogo({
      titulo: 'Nova Transferência', subtitulo: CAMINHO, largo: true, classe: 'compras-form-padrao transferencia-tela', cor: cor(), corTexto: COR_TEXTO, rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        // O caminho já está no cabeçalho: tira a linha repetida, para o quadro do valor ser o primeiro item e ficar fixo no topo.
        const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove();

        /* Valor (calculadora) e data */
        const calc = calculadora('Valor da transferência *');
        const dataTransf = campoDeData('Data da transferência *', R.diaNegocio(new Date()));

        /* Origem e destino (um só, ou várias contas com Múltiplo destino) */
        // Escolha de UMA conta: a mesma linha que se abre para baixo do Múltiplo destino (resumo e seta; embaixo, as contas com marca redonda, ícone CNT, nome e situação).
        // Tocar numa conta escolhe e recolhe; tocar fora (ou Esc) também recolhe.
        const escolhaDeConta = (rotulo, lista) => {
          let atual = '';
          const abre = linhaQueAbre(rotulo, () => abrirLista(painel.hidden));
          const painel = el('div', 'transferencia-multi-painel'); painel.hidden = true;
          const arvore = el('div', 'compras-hier transferencia-contas'); arvore.setAttribute('role', 'radiogroup'); arvore.setAttribute('aria-label', rotulo.replace(/ *$/, '') + ': contas');
          painel.append(arvore);
          const caixa = el('div', 'transferencia-opcao'); caixa.append(abre.no, painel);
          const pintar = () => { abre.resumo.textContent = atual || '—'; };
          function abrirLista(sim) { if (sim) desenhar(); painel.hidden = !sim; abre.abrir(sim); }
          function desenhar() {
            const itens = lista();
            arvore.replaceChildren(...itens.map((nome) => {
              const b = el('button', 'compras-hier-linha transferencia-conta'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(nome === atual));
              const icone = el('span', 'compras-hier-icone'); icone.setAttribute('aria-hidden', 'true'); icone.append(el('span', 'sigla-text', 'CNT'));
              const marca = el('span', 'transferencia-conta-marca'); marca.innerHTML = MARCA;
              const seta = el('span', 'compras-hier-seta'); seta.setAttribute('aria-hidden', 'true'); seta.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
              const texto = el('span', 'compras-hier-texto'); texto.append(el('b', null, nome), el('small', null, 'Conta ativa'));
              b.append(seta, marca, icone, texto);
              b.onclick = () => { caixa.value = nome; abrirLista(false); abre.no.focus(); };
              return b;
            }));
            if (!itens.length) arvore.append(el('p', 'profiles-note compras-hier-vazio', 'Nenhuma conta disponível.'));
          }
          dlg.addEventListener('click', (e) => { if (!painel.hidden && !caixa.contains(e.target)) abrirLista(false); });
          caixa.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painel.hidden) { abrirLista(false); e.stopPropagation(); e.preventDefault(); abre.no.focus(); } });
          Object.defineProperty(caixa, 'value', { get: () => atual, set: (v) => { const novo = v || ''; if (novo === atual) return; atual = novo; pintar(); caixa.dispatchEvent(new Event('change', { bubbles: true })); } });
          pintar();
          return caixa;
        };
        const origem = escolhaDeConta('Origem (−) / CNT *', () => contas);
        const destino = escolhaDeConta('Destino (+) / CNT *', () => candidatas());
        const campoDestino = destino; const campoOrigem = origem;
        const marcadas = new Set();
        const contagem = el('small', 'profiles-note'); contagem.setAttribute('role', 'status');
        const listaContas = el('div', 'compras-hier transferencia-contas'); listaContas.setAttribute('role', 'group'); listaContas.setAttribute('aria-label', 'Destino (+) / CNT: contas');
        // Múltiplo destino: uma linha que se expande para baixo com as contas; tocar fora (ou Esc) fecha.
        const multiAbre = linhaQueAbre('Destino (+) / CNT *', () => abrirMulti(painelMulti.hidden));
        const painelMulti = el('div', 'transferencia-multi-painel'); painelMulti.hidden = true; painelMulti.append(listaContas, contagem);
        const campoContas = el('div', 'transferencia-opcao'); campoContas.append(multiAbre.no, painelMulti);
        function abrirMulti(sim) { painelMulti.hidden = !sim; multiAbre.abrir(sim); }
        dlg.addEventListener('click', (e) => { if (!painelMulti.hidden && !campoContas.contains(e.target)) abrirMulti(false); });
        campoContas.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painelMulti.hidden) { abrirMulti(false); e.stopPropagation(); e.preventDefault(); multiAbre.no.focus(); } });
        const candidatas = () => contas.filter((n) => n !== origem.value);
        function contarContas() {
          const total = candidatas().length;
          contagem.textContent = marcadas.size === 0 ? 'Toque nas contas que vão receber (' + total + ' disponíveis).' : 'Marcadas: ' + marcadas.size + ' de ' + total + '.';
          multiAbre.resumo.textContent = marcadas.size === 0 ? 'Escolher' : marcadas.size + (marcadas.size === 1 ? ' conta' : ' contas');
        }
        function desenharDestinos() {
          const lista = candidatas(); const atual = destino.value;
          destino.value = lista.includes(atual) ? atual : '';
          [...marcadas].forEach((n) => { if (!lista.includes(n)) marcadas.delete(n); });
          listaContas.replaceChildren(...lista.map((nome) => {
            const b = el('button', 'compras-hier-linha transferencia-conta'); b.type = 'button'; b.setAttribute('role', 'checkbox');
            const icone = el('span', 'compras-hier-icone'); icone.setAttribute('aria-hidden', 'true'); icone.append(el('span', 'sigla-text', 'CNT'));
            const marca = el('span', 'transferencia-conta-marca'); marca.innerHTML = MARCA;
            // Mesmo desenho da lista em árvore (seta, caixa, ícone, nome e detalhe), com a marca redonda no lugar da caixa de marcar; a seta fica apagada (conta não tem níveis abaixo).
            const seta = el('span', 'compras-hier-seta'); seta.setAttribute('aria-hidden', 'true'); seta.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
            const texto = el('span', 'compras-hier-texto'); texto.append(el('b', null, nome), el('small', null, 'Conta ativa'));
            b.append(seta, marca, icone, texto);
            const pintar = () => b.setAttribute('aria-checked', String(marcadas.has(nome)));
            b.onclick = () => { if (marcadas.has(nome)) marcadas.delete(nome); else marcadas.add(nome); pintar(); contarContas(); };
            pintar();
            return b;
          }));
          contarContas();
        }
        origem.addEventListener('change', desenharDestinos);

        /* Lacre da transferência normal: Com lacre ou Sem lacre; com lacre, pede o número. */
        const lacreNumero = entrada('text', '', { placeholder: 'Ex.: 001', maxLength: 100 });
        lacreNumero.addEventListener('input', () => { estado.lacre.numero = lacreNumero.value; });
        const linhaNumero = linhaDe('Nº do lacre *', lacreNumero);
        const lacreNormal = el('div', 'transferencia-opcao');
        lacreNormal.append(linha('Lacre', chave('Lacre', false, ['C/lacre', 'S/lacre'], (v) => { estado.lacre.com = v; if (v) { lacreNormal.append(linhaNumero); lacreNumero.focus(); } else linhaNumero.remove(); })));

        /* Transferência de retorno: um bloco à parte; o "+" acrescenta (até 4) e cada uma é Com lacre ou Sem lacre. */
        const retornosBox = el('div', 'transferencia-retornos');
        // A própria linha de adicionar já diz se os retornos novos são Com lacre ou Sem lacre (cada um ainda pode ser mudado depois).
        const maisRetorno = el('button', 'transferencia-circulo'); maisRetorno.type = 'button'; maisRetorno.innerHTML = U.svg(ICONE.mais);
        const linhaAdd = linha('Adicionar transferência de retorno', chave('Retornos novos', false, ['C/lacre', 'S/lacre'], (v) => { estado.padraoLacre = v; }), maisRetorno);
        linhaAdd.classList.add('transferencia-linha-add');
        function desenharRetornos(focar) {
          const n = estado.retornos.length;
          maisRetorno.disabled = n >= MAX_LACRES;
          maisRetorno.title = maisRetorno.disabled ? 'No máximo ' + MAX_LACRES + ' transferências de retorno' : 'Acrescentar transferência de retorno';
          maisRetorno.setAttribute('aria-label', maisRetorno.title);
          retornosBox.replaceChildren(...estado.retornos.map((r, i) => {
            const rotulo = 'Retorno ' + (i + 1);
            const item = el('div', 'transferencia-opcao');
            const cab = linha(rotulo, chave(rotulo, r.com, ['C/lacre', 'S/lacre'], (v) => { r.com = v; desenharRetornos(v ? i : undefined); }), botaoExcluir('Remover ' + rotulo.toLowerCase(), () => { estado.retornos.splice(i, 1); desenharRetornos(); }));
            cab.classList.add('transferencia-retorno-cab'); item.append(cab);
            if (r.com) {
              const campoLacre = entrada('text', r.numero, { placeholder: 'Ex.: 001', maxLength: 100 });
              campoLacre.addEventListener('input', () => { r.numero = campoLacre.value; });
              const l = linhaDe('Nº do lacre *', campoLacre); l.entrada = campoLacre; item.append(l); item.entrada = campoLacre;
            }
            return item;
          }));
          if (focar !== undefined && retornosBox.children[focar] && retornosBox.children[focar].entrada) retornosBox.children[focar].entrada.focus();
        }
        maisRetorno.addEventListener('click', () => { if (estado.retornos.length >= MAX_LACRES) return; estado.retornos.push({ com: estado.padraoLacre, numero: '' }); desenharRetornos(estado.padraoLacre ? estado.retornos.length - 1 : undefined); });

        /* Opções: Múltiplo destino e Tempo de aceite */
        const linhaMultiplo = linha('Múltiplo destino (+) / CNT', chave('Múltiplo destino', false, ['Sim', 'Não'], (v) => { estado.multiplo = v; mostrar(); }));
        const aceite = opcaoAceite('Tempo de aceite');
        function mostrar() {
          campoDestino.style.display = estado.multiplo ? 'none' : ''; campoContas.style.display = estado.multiplo ? '' : 'none';
          if (!estado.multiplo) abrirMulti(false);
        }

        const anexos = blocoAnexos();
        const obs = entrada('text', '', { placeholder: 'Ex.: Suprimento CX1 — reforço de troco', maxLength: 500 });
        const linhaData = linha('Data da transferência *', dataTransf.caixa, dataTransf.painel);
        const corpo = el('div', 'transferencia-corpo');
        // Valor em cima (quadro laranja fixo); depois, um assunto por vez: a transferência, a transferência de retorno, as opções e a observação.
        corpo.append(calc.no,
          secao('Transferência', quadro(linhaData, campoOrigem, campoDestino, campoContas, lacreNormal)),
          secao('Transferência de retorno', quadro(retornosBox, linhaAdd)),
          secao('Opções', quadro(linhaMultiplo, aceite.no)),
          secao('Observação', quadro(linhaDe('Observação', obs), anexos.no)));
        if (!contas.length) corpo.append(el('p', 'profiles-error', 'Nenhuma conta ativa cadastrada. Cadastre as contas em Transferências › Cadastros Geral.'));
        corpo.append(U.nota('Tela em construção: a transferência ainda não é gravada. O Salvar confere o preenchimento.'));
        form.append(corpo);
        desenharDestinos(); desenharRetornos(); mostrar();

        // "Salvar e criar nova": ao lado do Salvar, como no esboço (por ora só confere, como o Salvar).
        setTimeout(() => {
          const acoes = dlg.querySelector('.compras-dialog-acoes'); const salvarBtn = acoes && acoes.querySelector('button[type=submit]');
          if (salvarBtn) salvarBtn.before(botao('Salvar e criar nova', () => form.requestSubmit(), 'btn secondary'));
        }, 0);
        return { dataTransf, origem, destino, marcadas, calc, estado, obs, lacreNumero, aceite, anexos };
      },
      salvar: async (c) => {
        const e = c.estado;
        if (!c.dataTransf.valor()) return c.dataTransf.input.value ? 'Data da transferência inválida. Use DD/MM/AA.' : 'Informe a data da transferência.';
        if (!c.origem.value || (e.multiplo ? !c.marcadas.size : !c.destino.value)) return 'Escolha a origem e o destino.';
        const v = c.calc.finalizar();
        if (v.erro) return v.erro;
        if (!(v.total > 0)) return 'Informe o valor da transferência.';
        const erroAceite = c.aceite.conferir();
        if (erroAceite) return erroAceite;
        if (c.anexos.audio && c.anexos.audio.gravando()) return 'Pare a gravação do áudio antes de salvar.';
        if (e.lacre.com && !e.lacre.numero.trim()) { c.lacreNumero.focus(); return 'Informe o número do lacre da transferência.'; }
        if (e.retornos.some((r) => r.com && !r.numero.trim())) return 'Informe o número do lacre de cada transferência de retorno com lacre.';
        const lacres = [...(e.lacre.com ? [e.lacre.numero] : []), ...e.retornos.filter((r) => r.com).map((r) => r.numero)].map((x) => x.trim().toLowerCase());
        if (new Set(lacres).size !== lacres.length) return 'Os lacres precisam ser diferentes entre si.';
        return 'Conferido, mas NÃO gravado: a gravação das transferências ainda está em construção.';
      },
    });
  }

  window.CicluzTransferencias = { abrir };
})();
