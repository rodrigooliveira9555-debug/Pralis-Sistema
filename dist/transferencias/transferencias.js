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

  /** Rótulo da linha de lacre pela posição: a última é a final; as outras são a 2ª, 3ª, 4ª, na ordem. */
  const rotuloDoLacre = (i, total) => (i === total - 1 ? 'Transferência final' : (i + 2) + 'ª transferência');

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
      // Notas e Moedas fecham o termo: só valem com um termo completo.
      const completo = Boolean(termo().c);
      tipos.querySelectorAll('button').forEach((b) => { b.disabled = !completo; });
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
    function escolherTipo(v) {
      if (!est.fechado && termo().c) comprometer(v);
      mostrar();
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
      tecla('⌫', apagar, 'apagar', 'Apagar'), d(0), tecla('=', igual, 'igual', 'Fechar o total'), op('+', () => mais(1), 'Somar'));
    // A calculadora só aparece quando se toca na caixa do valor; fecha ao fechar a conta com "=", no Esc ou tocando de novo na caixa.
    const painel = el('div', 'transferencia-calc-painel'); painel.hidden = true; painel.id = 'transferencia-calc-painel';
    painel.append(el('span', 'transferencia-calc-legenda', 'Toque em Notas ou Moedas para fechar o valor. Sem escolha, conta como Notas.'), teclado, aviso);
    tela.setAttribute('aria-controls', painel.id);
    const mostrarPainel = (sim) => { painel.hidden = !sim; tela.setAttribute('aria-expanded', String(sim)); };
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

  /* Padrão de listas agrupadas: um título por assunto e, embaixo, um quadro com uma linha por campo (nome à esquerda, valor à direita). */
  const linha = (rotulo, ...controles) => { const l = el('div', 'transferencia-linha'); l.append(el('span', 'transferencia-linha-rotulo', rotulo), ...controles); return l; };
  // Linha com um campo: o nome fica dentro da linha (à esquerda) e tocar nele leva ao campo. É uma div (o rótulo padrão do sistema força espaçamento e fonte).
  const linhaDe = (rotulo, controle) => {
    const l = el('div', 'transferencia-linha'); const nome = el('span', 'transferencia-linha-rotulo', rotulo);
    controle.classList.add('transferencia-linha-controle'); controle.setAttribute('aria-label', rotulo.replace(' *', ''));
    l.onclick = (e) => { if (e.target === l || e.target === nome) controle.focus(); };
    l.append(nome, controle); return l;
  };
  const quadro = (...linhas) => { const q = el('div', 'transferencia-quadro'); q.append(...linhas); return q; };
  const secao = (titulo, ...filhos) => { const s = el('section', 'transferencia-secao'); s.append(el('h4', 'transferencia-secao-titulo', titulo), ...filhos); return s; };

  /* Relógio, microfone, som, vídeo e imagem, no traço fino dos ícones do sistema. */
  const ICONE = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3"/>',
    audio: '<path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z"/>',
    video: '<path d="M3 7h12v10H3zM15 11l6-3v8l-6-3"/>',
    imagem: '<path d="M4 5h16v14H4zM4 16l4-4 4 4 3-3 5 5M9 9h.01"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  const selo = (nome) => { const s = el('span', 'transferencia-linha-icone'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = U.svg(ICONE[nome]); return s; };
  const tamanho = (b) => (b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB');

  /** Opção Sim/Não; com Sim, a linha da hora (campo de hora com o relógio) abre logo embaixo. valor() dá { sim, hora }. */
  function opcaoComHora(titulo, rotuloHora) {
    const hora = U.campoHora({ rotulo: rotuloHora, valor: '' });
    const linhaHora = linha(rotuloHora, hora.caixa, hora.painel);
    const caixa = el('div', 'transferencia-opcao');
    let sim = false;
    const chave = U.quadroSituacao(titulo, false, { textos: ['Sim', 'Não'], aoMudar: (v) => { sim = v; if (v) { caixa.append(linhaHora); hora.input.focus(); } else linhaHora.remove(); } });
    caixa.append(linha(titulo, chave.querySelector('.account-status-row')));
    return { no: caixa, valor: () => ({ sim, hora: hora.input.value }), campo: hora.input };
  }

  /**
   * Observação (padrão das listas agrupadas): o texto e, em outro quadro, os anexos. Gravar áudio usa a peça única de gravação do sistema
   * (audio-nota.js); Anexar áudio, vídeo ou imagem abre o seletor de arquivos. Cada anexo vira uma linha com o nome, o tamanho e o remover.
   * Tudo fica só na tela por enquanto (a transferência ainda não é gravada).
   */
  function blocoObservacao() {
    const obs = entrada('text', '', { placeholder: 'Ex.: Suprimento CX1 — reforço de troco', maxLength: 500 });
    const anexos = [];
    const lista = el('div', 'transferencia-anexos');
    const audio = window.CicluzAudioNota ? window.CicluzAudioNota.criar({ rotulo: '', classe: 'transferencia-audio', aoSalvar: 'a transferência' }) : null;
    const quadroAnexos = quadro();
    const acao = (icone, titulo, aoToque) => { const b = el('button', 'transferencia-linha transferencia-linha-acao'); b.type = 'button'; b.append(selo(icone), el('span', 'transferencia-linha-rotulo', titulo), el('span', 'transferencia-linha-ponta', '+')); b.onclick = aoToque; return b; };
    function escolher(tipo, icone) {
      const entradaArq = el('input'); entradaArq.type = 'file'; entradaArq.accept = tipo + '/*'; entradaArq.multiple = true;
      entradaArq.onchange = () => { [...entradaArq.files].forEach((f) => adicionar(f, icone)); };
      entradaArq.click();
    }
    function adicionar(arquivo, icone) {
      const item = { arquivo, url: URL.createObjectURL(arquivo) };
      const l = el('div', 'transferencia-linha transferencia-anexo');
      const miniatura = icone === 'imagem' ? el('img', 'transferencia-anexo-img') : selo(icone);
      if (icone === 'imagem') { miniatura.src = item.url; miniatura.alt = ''; }
      const nome = el('span', 'transferencia-anexo-nome', arquivo.name); const peso = el('small', null, tamanho(arquivo.size)); nome.append(peso);
      const remover = el('button', 'transferencia-anexo-remover'); remover.type = 'button'; remover.setAttribute('aria-label', 'Remover ' + arquivo.name); remover.innerHTML = U.svg(ICONE.fechar);
      remover.onclick = () => { URL.revokeObjectURL(item.url); anexos.splice(anexos.indexOf(item), 1); l.remove(); };
      l.append(miniatura, nome, remover); anexos.push(item); lista.append(l);
    }
    quadroAnexos.append(...(audio ? [(() => { const l = el('div', 'transferencia-linha transferencia-linha-audio'); const topo = el('div', 'transferencia-linha-topo'); topo.append(selo('mic'), el('span', 'transferencia-linha-rotulo', 'Gravar áudio')); l.append(topo, audio.no); return l; })()] : []),
      acao('audio', 'Anexar áudio', () => escolher('audio', 'audio')), acao('video', 'Anexar vídeo', () => escolher('video', 'video')), acao('imagem', 'Anexar imagem', () => escolher('image', 'imagem')), lista);
    return { no: secao('Observação', quadro(linhaDe('Observação', obs)), el('h4', 'transferencia-secao-titulo', 'Anexos'), quadroAnexos), obs, audio, anexos };
  }

  function formulario(contas) {
    const estado = { multiplo: false, lacres: [] };
    U.dialogo({
      titulo: 'Nova Transferência', subtitulo: CAMINHO, largo: true, classe: 'compras-form-padrao transferencia-tela', cor: cor(), corTexto: COR_TEXTO, rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        /* Valor (calculadora) e data */
        const calc = calculadora('Valor da transferência *');
        const dataTransf = campoDeData('Data da transferência *', R.diaNegocio(new Date()));

        /* Origem e destino (um só, ou várias contas com Múltiplo destino) */
        const origem = seletor(contas.map((n) => [n, n]), '', '—');
        const destino = seletor([], '', '—');
        const campoDestino = linhaDe('Destino (+) / CNT *', destino);
        const marcadas = new Set();
        const contagem = el('small', 'profiles-note'); contagem.setAttribute('role', 'status');
        const listaContas = el('div', 'compras-hier transferencia-contas'); listaContas.setAttribute('role', 'group'); listaContas.setAttribute('aria-label', 'Destino (+) / CNT: contas');
        const campoContas = secao('Destino (+) / CNT *', quadro(listaContas), contagem);
        const candidatas = () => contas.filter((n) => n !== origem.value);
        function contarContas() {
          const total = candidatas().length;
          contagem.textContent = marcadas.size === 0 ? 'Toque nas contas que vão receber (' + total + ' disponíveis).' : 'Marcadas: ' + marcadas.size + ' de ' + total + '.';
        }
        function desenharDestinos() {
          const lista = candidatas(); const atual = destino.value;
          destino.replaceChildren(new Option('—', ''), ...lista.map((n) => new Option(n, n))); destino.value = lista.includes(atual) ? atual : '';
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

        /* Opções: Múltiplo destino e Transferência com lacre (+) */
        const multiplo = U.quadroSituacao('Múltiplo destino', false, { textos: ['Sim', 'Não'], aoMudar: (v) => { estado.multiplo = v; mostrar(); } });
        const linhaMultiplo = linha('Múltiplo destino', multiplo.querySelector('.account-status-row'));
        const mais = el('button', 'shortcut-circle compras-redondo'); mais.type = 'button';
        mais.innerHTML = U.svg('<path d="M12 5v14M5 12h14"/>');
        const situacaoLacre = el('span', 'account-status-text');
        const linhaLacre = el('div', 'account-status-row'); linhaLacre.append(mais, situacaoLacre);
        const linhaDoLacre = linha('Transferência com lacre', linhaLacre);
        const retorno = opcaoComHora('Tempo de retorno', 'Retorna em (hh:mm)');
        const aceite = opcaoComHora('Tempo de aceite', 'Aceite em (hh:mm)');
        const lacresBox = el('div', 'transferencia-lacres');
        const secaoLacres = secao('Lacres', quadro(lacresBox));

        function desenharLacres(focar) {
          const n = estado.lacres.length;
          mais.disabled = n >= MAX_LACRES;
          mais.title = mais.disabled ? 'No máximo ' + MAX_LACRES + ' transferências com lacre' : 'Acrescentar transferência com lacre';
          mais.setAttribute('aria-label', mais.title);
          situacaoLacre.textContent = n === 0 ? 'Sem lacre' : n === 1 ? '1 lacre' : n + ' lacres';
          lacresBox.replaceChildren(...estado.lacres.map((v, i) => {
            const rotulo = rotuloDoLacre(i, n);
            const campoLacre = entrada('text', v, { placeholder: 'Ex.: 001', maxLength: 100 });
            campoLacre.addEventListener('input', () => { estado.lacres[i] = campoLacre.value; });
            const l = linhaDe(rotulo + ' *', campoLacre); l.classList.add('transferencia-lacre-linha');
            l.append(U.botaoRemover('Remover ' + rotulo.toLowerCase(), () => { estado.lacres.splice(i, 1); desenharLacres(); }));
            l.entrada = campoLacre;
            return l;
          }));
          secaoLacres.style.display = n ? '' : 'none';
          if (focar !== undefined && lacresBox.children[focar]) lacresBox.children[focar].entrada.focus();
        }
        // O 1º clique cria a final; os seguintes entram acima dela (a final desce e fica sempre por último).
        mais.addEventListener('click', () => {
          if (estado.lacres.length >= MAX_LACRES) return;
          const posicao = estado.lacres.length ? estado.lacres.length - 1 : 0;
          estado.lacres.splice(posicao, 0, '');
          desenharLacres(posicao);
        });

        function mostrar() {
          campoDestino.style.display = estado.multiplo ? 'none' : ''; campoContas.style.display = estado.multiplo ? '' : 'none';
        }

        const corpo = el('div', 'transferencia-corpo');
        const observacao = blocoObservacao();
        const linhaData = linha('Data da transferência *', dataTransf.caixa, dataTransf.painel);
        // Valor em cima (cabeçalho laranja); depois um assunto por vez: a transferência, as opções, os lacres e a observação.
        corpo.append(calc.no,
          secao('Transferência', quadro(linhaData, linhaDe('Origem (−) / CNT *', origem), campoDestino)), campoContas,
          secao('Opções', quadro(linhaMultiplo, linhaDoLacre, retorno.no, aceite.no)), secaoLacres,
          observacao.no);
        if (!contas.length) corpo.append(el('p', 'profiles-error', 'Nenhuma conta ativa cadastrada. Cadastre as contas em Transferências › Cadastros Geral.'));
        corpo.append(U.nota('Tela em construção: a transferência ainda não é gravada. O Salvar confere o preenchimento.'));
        form.append(corpo);
        desenharDestinos(); desenharLacres(); mostrar();

        // "Salvar e criar nova": ao lado do Salvar, como no esboço (por ora só confere, como o Salvar).
        setTimeout(() => {
          const acoes = dlg.querySelector('.compras-dialog-acoes'); const salvarBtn = acoes && acoes.querySelector('button[type=submit]');
          if (salvarBtn) salvarBtn.before(botao('Salvar e criar nova', () => form.requestSubmit(), 'btn secondary'));
        }, 0);
        return { dataTransf, origem, destino, marcadas, calc, estado, obs: observacao.obs, retorno, aceite, observacao };
      },
      salvar: async (c) => {
        const e = c.estado;
        if (!c.dataTransf.valor()) return c.dataTransf.input.value ? 'Data da transferência inválida. Use DD/MM/AA.' : 'Informe a data da transferência.';
        if (!c.origem.value || (e.multiplo ? !c.marcadas.size : !c.destino.value)) return 'Escolha a origem e o destino.';
        const v = c.calc.finalizar();
        if (v.erro) return v.erro;
        if (!(v.total > 0)) return 'Informe o valor da transferência.';
        const horaOk = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
        const ret = c.retorno.valor(); const ace = c.aceite.valor();
        if (ret.sim && !horaOk(ret.hora)) { c.retorno.campo.focus(); return 'Informe o tempo de retorno (hh:mm).'; }
        if (ace.sim && !horaOk(ace.hora)) { c.aceite.campo.focus(); return 'Informe o tempo de aceite (hh:mm).'; }
        if (c.observacao.audio && c.observacao.audio.gravando()) return 'Pare a gravação do áudio antes de salvar.';
        const lacres = e.lacres.map((x) => x.trim());
        if (lacres.some((x) => !x)) return 'Informe o lacre de cada transferência.';
        if (new Set(lacres.map((x) => x.toLowerCase())).size !== lacres.length) return 'Os lacres precisam ser diferentes entre si.';
        return 'Conferido, mas NÃO gravado: a gravação das transferências ainda está em construção.';
      },
    });
  }

  window.CicluzTransferencias = { abrir };
})();
