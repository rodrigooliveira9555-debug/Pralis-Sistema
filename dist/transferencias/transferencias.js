/*
 * Transferências › Lançamentos › CNT - Transferências (25/11/2026, pedido do Washington): o formulário "Nova Transferência", refeito pelo esboço
 * dele (1ª fase, só estes campos): Valor (calculadora), Data, Origem / Saída, Destino / Entrada, Múltiplo destino e Transferência com lacre (+).
 * Peças de compras/ui.js: janela na cor da origem (cabeçalho arredondado só aqui: classe transferencia-tela), campo de data com calendário,
 * interruptor Sim/Não, chips de escolha única e remover redondo.
 *
 * Regras desta tela (pedido do Washington):
 *  - Valor: uma calculadora de teclas (0 a 9, "+" e "=") no lugar do campo de digitar. Os números entram como centavos (digitar 1, 0, 0, 0, 0 = 100,00).
 *    Cada valor digitado é de Notas ou de Moedas (duas escolhas logo abaixo do teclado); o "+" soma e abre o próximo; o "=" fecha. No fim fica só o
 *    TOTAL, sem distinguir nota de moeda (por dentro a tela guarda a soma de cada tipo, para quando a gravação existir).
 *  - Múltiplo destino = Sim: a caixa de Destino some e entra, na própria tela (sem abrir janela), a lista de TODAS as contas ativas (menos a de
 *    origem) com o ícone, para marcar várias.
 *  - Transferência com lacre: o "+" acrescenta uma linha de lacre embaixo do destino. O 1º clique cria a "Transferência final"; cada clique
 *    seguinte cria a "2ª", "3ª", "4ª transferência" ACIMA da final (a final sempre fica por último). Máximo de 4 (as quatro do esboço).
 *
 * TELA EM CONSTRUÇÃO: o CICLUZ ainda não tem servidor de transferências (PROJECT_BRAIN/11, P-48), então o Salvar só CONFERE o preenchimento
 * e avisa que não gravou. As contas vêm de /api/contas (ativas). Ficaram fora desta fase (saíram da tela, não estão escondidas): observação,
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
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[1]) || '#f97316';
  const reais = (c) => 'R$ ' + (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
   * A calculadora do valor. Estado: parcelas já somadas ({ c: centavos, t: 'notas' | 'moedas' }), o número que está sendo digitado (só dígitos, em
   * centavos), o tipo dele e se já foi fechado com "=". Devolve { no, finalizar() }: finalizar() dá { erro } ou { total, notas, moedas } em centavos.
   */
  function calculadora(rotulo) {
    const est = { parcelas: [], atual: '', tipo: '', fechado: false };
    const centavos = (s) => (s ? parseInt(s, 10) : 0);
    const soma = () => est.parcelas.reduce((n, p) => n + p.c, 0);
    const tela = entrada('text', '', { readOnly: true, placeholder: 'R$ 0,00', inputMode: 'none', autocomplete: 'off' });
    tela.classList.add('transferencia-calc-tela'); tela.setAttribute('aria-label', rotulo);
    const resumo = el('p', 'transferencia-calc-resumo'); resumo.setAttribute('role', 'status');
    const aviso = el('small', 'transferencia-calc-aviso'); aviso.setAttribute('role', 'alert');
    const tipos = U.chips([['notas', 'Notas'], ['moedas', 'Moedas']], '', (v) => { est.tipo = v; aviso.textContent = ''; });
    const mostrar = () => {
      tela.value = est.atual ? reais(centavos(est.atual)) : soma() > 0 ? reais(soma()) : '';
      resumo.textContent = est.fechado ? 'Total da transferência' : est.parcelas.length ? 'Soma até agora: ' + reais(soma()) + ' — digite o próximo valor' : '';
      tipos.atualizar(est.tipo);
    };
    const avisar = (t) => { aviso.textContent = t; };
    const recomecar = () => { est.parcelas = []; est.atual = ''; est.tipo = ''; est.fechado = false; };
    const digito = (d) => {
      aviso.textContent = '';
      if (est.fechado) recomecar();
      if (est.atual.length >= MAX_DIGITOS) return;
      est.atual = (est.atual + d).replace(/^0+/, '');
      mostrar();
    };
    const apagar = () => {
      aviso.textContent = '';
      if (est.fechado) recomecar();
      else if (est.atual) est.atual = est.atual.slice(0, -1);
      else if (est.parcelas.length) { const p = est.parcelas.pop(); est.atual = String(p.c); est.tipo = p.t; }
      mostrar();
    };
    // Guarda o número digitado como parcela; devolve false (com aviso) se faltar valor ou o tipo.
    const guardar = () => {
      if (!centavos(est.atual)) { avisar('Digite um valor antes.'); return false; }
      if (!est.tipo) { avisar('Escolha Notas ou Moedas para este valor.'); return false; }
      est.parcelas.push({ c: centavos(est.atual), t: est.tipo }); est.atual = ''; est.tipo = ''; aviso.textContent = '';
      return true;
    };
    const somar = () => {
      if (est.fechado) { est.fechado = false; mostrar(); return; }
      if (guardar()) mostrar();
    };
    const igual = () => {
      if (est.fechado) return;
      if (est.atual) { if (!guardar()) return; }
      else if (!est.parcelas.length) { avisar('Digite um valor antes.'); return; }
      est.fechado = true; aviso.textContent = ''; mostrar();
    };
    const tecla = (texto, acao, classe, rotuloAria) => {
      const b = el('button', 'transferencia-tecla' + (classe ? ' ' + classe : ''), texto); b.type = 'button'; b.onclick = acao;
      if (rotuloAria) { b.title = rotuloAria; b.setAttribute('aria-label', rotuloAria); }
      return b;
    };
    const teclado = el('div', 'transferencia-teclado');
    const d = (n) => tecla(String(n), () => digito(String(n)));
    teclado.append(d(7), d(8), d(9), tecla('+', somar, 'soma', 'Somar o próximo valor'), d(4), d(5), d(6), d(1), d(2), d(3), tecla('=', igual, 'igual', 'Fechar o total'),
      tecla('⌫', apagar, 'apagar', 'Apagar'), d(0));
    // Teclado do computador: números, Backspace, "+" e "=" (ou Enter, que não envia o formulário).
    tela.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) digito(e.key);
      else if (e.key === 'Backspace') apagar();
      else if (e.key === '+') somar();
      else if (e.key === '=' || e.key === 'Enter') igual();
      else return;
      e.preventDefault();
    });
    const no = el('div', 'compras-campo transferencia-valor');
    const calc = el('div', 'transferencia-calc');
    calc.append(tela, resumo, teclado, el('span', 'transferencia-calc-legenda', 'O valor digitado é de:'), tipos, aviso);
    no.append(el('span', 'compras-rotulo', rotulo), calc);
    mostrar();
    return {
      no,
      tela,
      // O que ainda está sendo digitado conta, desde que tenha o tipo escolhido.
      finalizar() {
        if (centavos(est.atual) && !est.tipo) return { erro: 'Escolha Notas ou Moedas para o valor digitado.' };
        const todas = est.parcelas.concat(centavos(est.atual) ? [{ c: centavos(est.atual), t: est.tipo }] : []);
        const por = (t) => todas.filter((p) => p.t === t).reduce((n, p) => n + p.c, 0);
        return { total: por('notas') + por('moedas'), notas: por('notas'), moedas: por('moedas') };
      },
    };
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
        const campoDestino = campo('Destino / Entrada *', destino);
        const marcadas = new Set();
        const contagem = el('small', 'profiles-note'); contagem.setAttribute('role', 'status');
        const listaContas = el('div', 'transferencia-contas'); listaContas.setAttribute('role', 'group'); listaContas.setAttribute('aria-label', 'Destino / Entrada: contas');
        const campoContas = el('div', 'compras-campo'); campoContas.append(el('span', 'compras-rotulo', 'Destino / Entrada *'), listaContas, contagem);
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
            const b = el('button', 'transferencia-conta'); b.type = 'button'; b.setAttribute('role', 'checkbox');
            const icone = el('span', 'compras-hier-icone'); icone.setAttribute('aria-hidden', 'true'); icone.append(el('span', 'sigla-text', 'CNT'));
            const marca = el('span', 'transferencia-conta-marca'); marca.innerHTML = MARCA;
            b.append(icone, el('span', 'transferencia-conta-nome', nome), marca);
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
        const mais = el('button', 'shortcut-circle compras-redondo'); mais.type = 'button';
        mais.innerHTML = U.svg('<path d="M12 5v14M5 12h14"/>');
        const situacaoLacre = el('span', 'account-status-text');
        const linhaLacre = el('div', 'account-status-row'); linhaLacre.append(mais, situacaoLacre);
        const quadroLacre = el('div', 'account-status compras-situacao-quadro'); quadroLacre.append(el('span', null, 'Transferência com lacre'), linhaLacre);
        const lacresBox = el('div', 'transferencia-lacres');

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
            const linha = el('div', 'transferencia-lacre-linha');
            linha.append(campo(rotulo + ' *', campoLacre), U.botaoRemover('Remover ' + rotulo.toLowerCase(), () => { estado.lacres.splice(i, 1); desenharLacres(); }));
            linha.entrada = campoLacre;
            return linha;
          }));
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
        const opcoes = el('div', 'transferencia-opcoes'); opcoes.append(multiplo, quadroLacre);
        corpo.append(calc.no, dataTransf.no, campo('Origem / Saída *', origem), campoDestino, campoContas, opcoes, lacresBox);
        if (!contas.length) corpo.append(el('p', 'profiles-error', 'Nenhuma conta ativa cadastrada. Cadastre as contas em Transferências › Cadastros Geral.'));
        corpo.append(U.nota('Tela em construção: a transferência ainda não é gravada. O Salvar confere o preenchimento.'));
        form.append(corpo);
        desenharDestinos(); desenharLacres(); mostrar();

        // "Salvar e criar nova": ao lado do Salvar, como no esboço (por ora só confere, como o Salvar).
        setTimeout(() => {
          const acoes = dlg.querySelector('.compras-dialog-acoes'); const salvarBtn = acoes && acoes.querySelector('button[type=submit]');
          if (salvarBtn) salvarBtn.before(botao('Salvar e criar nova', () => form.requestSubmit(), 'btn secondary'));
        }, 0);
        return { dataTransf, origem, destino, marcadas, calc, estado };
      },
      salvar: async (c) => {
        const e = c.estado;
        if (!c.dataTransf.valor()) return c.dataTransf.input.value ? 'Data da transferência inválida. Use DD/MM/AA.' : 'Informe a data da transferência.';
        if (!c.origem.value || (e.multiplo ? !c.marcadas.size : !c.destino.value)) return 'Escolha a origem e o destino.';
        const v = c.calc.finalizar();
        if (v.erro) return v.erro;
        if (!v.total) return 'Informe o valor da transferência.';
        const lacres = e.lacres.map((x) => x.trim());
        if (lacres.some((x) => !x)) return 'Informe o lacre de cada transferência.';
        if (new Set(lacres.map((x) => x.toLowerCase())).size !== lacres.length) return 'Os lacres precisam ser diferentes entre si.';
        return 'Conferido, mas NÃO gravado: a gravação das transferências ainda está em construção.';
      },
    });
  }

  window.CicluzTransferencias = { abrir };
})();
