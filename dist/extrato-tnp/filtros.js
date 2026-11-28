/*
 * CNT - API Open Finance TNP / Banco Caixa Econômica — Período e Filtros.
 *   Período: atalhos (Hoje, Ontem, 7 dias, Este mês, Mês passado, 31 dias) e as duas datas no calendário. Mudar o
 *   período busca de novo no coletor (máximo de 31 dias).
 *   Filtros: a busca e Entradas/Saídas à vista; operação, categoria, situação e faixa de valor em "Mais filtros" (o
 *   botão mostra quantos estão em uso). Filtrar não vai ao servidor: só redesenha o resultado.
 * A conta não está aqui: ela é escolhida nas abas do topo (um caminho só).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzExtratoTnpDados;
  const { el, botao, campo, entrada, seletor } = U;
  const { estado } = D;
  let maisAberto = false;

  /** U.chips refaz os botões ao escolher: o foco volta para o atalho escolhido (teclado não se perde). */
  const focarEscolhido = (caixa) => requestAnimationFrame(() => { const b = caixa.querySelector('[aria-pressed="true"]'); if (b) b.focus(); });

  /** O período. aoMudar() busca de novo; aoInvalido() avisa a tela para esmaecer o resultado antigo. */
  function periodo({ aoMudar, aoInvalido }) {
    const s = U.secao('Período');
    const ini = U.campoData({ valor: estado.desde, rotulo: 'Data inicial' });
    const fim = U.campoData({ valor: estado.ate, rotulo: 'Data final' });
    const hoje = D.hojeIso();
    const primeiroDoMes = hoje.slice(0, 8) + '01';
    const fimMesPassado = D.somarDias(primeiroDoMes, -1);
    const faixas = {
      hoje: [hoje, hoje],
      ontem: [D.somarDias(hoje, -1), D.somarDias(hoje, -1)],
      7: [D.somarDias(hoje, -6), hoje],
      mes: [primeiroDoMes, hoje],
      passado: [fimMesPassado.slice(0, 8) + '01', fimMesPassado],
      31: [D.somarDias(hoje, -30), hoje],
    };
    const chipDe = () => Object.keys(faixas).find((k) => faixas[k][0] === estado.desde && faixas[k][1] === estado.ate) || '';
    const atalhos = U.chips([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', '7 dias'], ['mes', 'Este mês'], ['passado', 'Mês passado'], ['31', '31 dias']], chipDe(), (v) => {
      [estado.desde, estado.ate] = faixas[v];
      ini.definir(estado.desde); fim.definir(estado.ate);
      aviso.hidden = true;
      focarEscolhido(atalhos);
      aoMudar();
    });
    const aviso = el('p', 'profiles-error extrato-tnp-aviso-periodo');
    aviso.setAttribute('role', 'alert');
    aviso.hidden = true;
    const aoMudarData = () => {
      const [di, df] = [ini.valor(), fim.valor()];
      if (!di || !df) return;
      const dias = (Date.parse(df + 'T00:00:00Z') - Date.parse(di + 'T00:00:00Z')) / 86_400_000;
      const erro = di > df ? 'A data inicial está depois da final.' : dias > 30 ? 'O período pode ter no máximo 31 dias.' : '';
      aviso.textContent = erro ? erro + ' Os números abaixo ainda são do período anterior.' : '';
      aviso.hidden = !erro;
      if (erro) { if (aoInvalido) aoInvalido(); return; }
      estado.desde = di; estado.ate = df; atalhos.atualizar(chipDe());
      aoMudar();
    };
    ini.input.addEventListener('change', aoMudarData);
    fim.input.addEventListener('change', aoMudarData);
    const linha = el('div', 'extrato-tnp-periodo');
    linha.append(atalhos, campo('Data inicial', ini.caixa), campo('Data final', fim.caixa));
    const c = el('div', 'compras-corpo');
    c.append(linha, aviso);
    s.append(c, ini.painel, fim.painel);
    return s;
  }

  /** Os filtros, com as opções que existem no período carregado. aoFiltrar() só redesenha. */
  function filtros({ aoFiltrar, aoLimpar }) {
    const f = estado.filtro;
    const d = estado.dados;
    const s = U.secao('Filtros');
    const aplicar = () => { rotular(); aoFiltrar(); };

    const buscaCampo = U.buscaFixa('extrato-tnp', 'Descrição, quem pagou ou recebeu, CNPJ, categoria…', f.busca, (v) => { f.busca = v; aplicar(); });
    const tipo = U.chips([['', 'Tudo'], ['entrada', 'Entradas'], ['saida', 'Saídas']], f.tipo, (v) => { f.tipo = v; focarEscolhido(tipo); aplicar(); });
    tipo.setAttribute('aria-label', 'Entradas ou saídas');

    const operacao = seletor(D.opcoes(d, 'operacao', D.nomeOperacao), f.operacao, 'Todas');
    const categoria = seletor(D.opcoes(d, 'categoria', D.nomeCategoria), f.categoria, 'Todas');
    const situacao = seletor([['POSTED', 'Lançados'], ['PENDING', 'Pendentes']], f.situacao, 'Todas');
    const valorMin = entrada('text', f.valorMin, { inputMode: 'decimal', placeholder: '0,00', autocomplete: 'off' });
    const valorMax = entrada('text', f.valorMax, { inputMode: 'decimal', placeholder: 'sem limite', autocomplete: 'off' });
    operacao.onchange = () => { f.operacao = operacao.value; aplicar(); };
    categoria.onchange = () => { f.categoria = categoria.value; aplicar(); };
    situacao.onchange = () => { f.situacao = situacao.value; aplicar(); };
    const avisoValor = el('p', 'profiles-error extrato-tnp-aviso-periodo');
    avisoValor.setAttribute('role', 'alert');
    avisoValor.hidden = true;
    let espera = null;
    const aoMudarValor = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const ruim = [valorMin.value, valorMax.value].some((v) => v.trim() && D.lerValor(v) === null);
        avisoValor.textContent = ruim ? 'Valor inválido: use só números, como 150 ou 1.234,56.' : '';
        avisoValor.hidden = !ruim;
        if (ruim) return;
        f.valorMin = valorMin.value; f.valorMax = valorMax.value;
        aplicar();
      }, 400);
    };
    valorMin.oninput = aoMudarValor;
    valorMax.oninput = aoMudarValor;

    const extras = el('div', 'vendas-pdv-mais');
    extras.id = 'extrato-tnp-mais-filtros';
    extras.hidden = !maisAberto;
    const campos = el('div', 'vendas-pdv-campos');
    campos.append(campo('Operação', operacao), campo('Categoria', categoria), campo('Situação', situacao), campo('Valor a partir de (R$)', valorMin), campo('Valor até (R$)', valorMax));
    extras.append(campos, avisoValor);

    const mais = botao('', () => { maisAberto = !maisAberto; extras.hidden = !maisAberto; rotular(); }, 'btn secondary vendas-pdv-mais-botao');
    mais.setAttribute('aria-controls', extras.id);
    function rotular() {
      const n = D.filtrosEmUso();
      mais.textContent = (maisAberto ? 'Menos filtros' : 'Mais filtros') + (n ? ' (' + n + ')' : '');
      mais.setAttribute('aria-expanded', String(maisAberto));
    }
    rotular();
    const limpar = botao('Limpar filtros', () => { D.reiniciarFiltro(); aoLimpar(); }, 'btn ghost');

    const linha = el('div', 'extrato-tnp-filtro-linha');
    linha.append(buscaCampo, tipo);
    const acoes = el('div', 'vendas-pdv-acoes');
    acoes.append(mais, limpar);
    const c = el('div', 'compras-corpo');
    c.append(linha, acoes, extras);
    s.append(c);
    return s;
  }

  window.CicluzExtratoTnpFiltros = { periodo, filtros };
})();
