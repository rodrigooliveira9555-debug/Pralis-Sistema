/*
 * Transferências › Lançamentos › CNT - Transferências (25/11/2026, pedido do Washington): o formulário "Nova Transferência", refeito pelo esboço
 * dele (1ª fase, só estes campos): Valor, Data, Origem / Saída, Destino / Entrada, Múltiplo destino e Transferência com lacre (+).
 * Peças de compras/ui.js: janela na cor da origem (cabeçalho arredondado só aqui: classe transferencia-tela), campo de data com calendário,
 * interruptor Sim/Não, campo de escolha com janela (campoArvore + seletorDeItens) e remover redondo.
 *
 * Regras desta tela (pedido do Washington):
 *  - Múltiplo destino = Sim: o campo Destino vira a escolha de VÁRIAS contas (todas as ativas, menos a de origem), e mostra as escolhidas.
 *  - Transferência com lacre: o "+" acrescenta uma linha de lacre embaixo do destino. O 1º clique cria a "Transferência final"; cada clique
 *    seguinte cria a "2ª", "3ª", "4ª transferência" ACIMA da final (a final sempre fica por último). Máximo de 4 (as quatro do esboço).
 *
 * TELA EM CONSTRUÇÃO: o CICLUZ ainda não tem servidor de transferências (PROJECT_BRAIN/11, P-48), então o Salvar só CONFERE o preenchimento
 * e avisa que não gravou. As contas vêm de /api/contas (ativas). Ficaram fora desta fase (saíram da tela, não estão escondidas): dinheiro físico e
 * moedas separados, observação, transferência sem lacre, agendamento, tempo de confirmação.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const R = window.CicluzLancamentosRegras; const Sync = window.CicluzSync;
  if (!U || !R || !Sync) return;
  const { el, botao, campo, entrada, seletor } = U;

  const CAMINHO = 'Transferências · Contas / Locais / Lançamentos / CNT - Transferências';
  const COR_TEXTO = '#9a3412';
  const MAX_LACRES = 4;
  const SEPARADOR = '\n';
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[1]) || '#f97316';
  const centavos = (txt) => { const v = R.dinheiroParaApi(txt); return v === null ? null : R.paraCentavos(v); };

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

  function formulario(contas) {
    const estado = { multiplo: false, lacres: [] };
    U.dialogo({
      titulo: 'Nova Transferência', subtitulo: CAMINHO, largo: true, classe: 'compras-form-padrao transferencia-tela', cor: cor(), corTexto: COR_TEXTO, rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        /* Valor e data */
        const valor = entrada('text', '', { inputMode: 'decimal', placeholder: '0,00' });
        const dataTransf = campoDeData('Data da transferência *', R.diaNegocio(new Date()));

        /* Origem e destino (um só, ou vários com Múltiplo destino) */
        const origem = seletor(contas.map((n) => [n, n]), '', '—');
        const destino = seletor([], '', '—');
        const destinos = U.campoArvore({
          rotulo: 'Destino / Entrada *', textoVazio: 'Selecione as contas', nos: () => [],
          texto: (v) => v.split(SEPARADOR).join(', '),
          janela: (atual, escolher) => U.seletorDeItens({
            titulo: 'Destinos da transferência', rotuloBusca: 'Buscar conta', cor: cor(), corTexto: COR_TEXTO,
            itens: candidatas().map((n) => ({ id: n, rotulo: n })), marcados: new Set(atual ? atual.split(SEPARADOR) : []),
            aoConfirmar: (escolha) => escolher([...escolha].join(SEPARADOR)),
          }),
        });
        const campoDestino = campo('Destino / Entrada *', destino);
        const campoDestinos = el('div', 'compras-campo'); campoDestinos.append(el('span', 'compras-rotulo', 'Destino / Entrada *'), destinos);
        const marcadas = () => (destinos.value ? destinos.value.split(SEPARADOR) : []);
        function candidatas() { return contas.filter((n) => n !== origem.value); }
        function desenharDestinos() {
          const lista = candidatas(); const atual = destino.value;
          destino.replaceChildren(new Option('—', ''), ...lista.map((n) => new Option(n, n))); destino.value = lista.includes(atual) ? atual : '';
          destinos.value = marcadas().filter((n) => lista.includes(n)).join(SEPARADOR);
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
          campoDestino.style.display = estado.multiplo ? 'none' : ''; campoDestinos.style.display = estado.multiplo ? '' : 'none';
        }

        const corpo = el('div', 'transferencia-corpo');
        const opcoes = el('div', 'transferencia-opcoes'); opcoes.append(multiplo, quadroLacre);
        corpo.append(campo('Valor da transferência *', valor), dataTransf.no, campo('Origem / Saída *', origem), campoDestino, campoDestinos, opcoes, lacresBox);
        if (!contas.length) corpo.append(el('p', 'profiles-error', 'Nenhuma conta ativa cadastrada. Cadastre as contas em Transferências › Cadastros Geral.'));
        corpo.append(U.nota('Tela em construção: a transferência ainda não é gravada. O Salvar confere o preenchimento.'));
        form.append(corpo);
        desenharDestinos(); desenharLacres(); mostrar();

        // "Salvar e criar nova": ao lado do Salvar, como no esboço (por ora só confere, como o Salvar).
        setTimeout(() => {
          const acoes = dlg.querySelector('.compras-dialog-acoes'); const salvarBtn = acoes && acoes.querySelector('button[type=submit]');
          if (salvarBtn) salvarBtn.before(botao('Salvar e criar nova', () => form.requestSubmit(), 'btn secondary'));
        }, 0);
        return { dataTransf, origem, destino, marcadas, valor, estado };
      },
      salvar: async (c) => {
        const e = c.estado;
        if (!c.dataTransf.valor()) return c.dataTransf.input.value ? 'Data da transferência inválida. Use DD/MM/AA.' : 'Informe a data da transferência.';
        if (!c.origem.value || (e.multiplo ? !c.marcadas().length : !c.destino.value)) return 'Escolha a origem e o destino.';
        const v = centavos(c.valor.value);
        if (c.valor.value.trim() && v === null) return 'Valor em formato inválido. Use 1.234,56 (no máximo 2 casas).';
        if (!v || v <= 0) return 'Informe o valor da transferência.';
        const lacres = e.lacres.map((x) => x.trim());
        if (lacres.some((x) => !x)) return 'Informe o lacre de cada transferência.';
        if (new Set(lacres.map((x) => x.toLowerCase())).size !== lacres.length) return 'Os lacres precisam ser diferentes entre si.';
        return 'Conferido, mas NÃO gravado: a gravação das transferências ainda está em construção.';
      },
    });
  }

  window.CicluzTransferencias = { abrir };
})();
