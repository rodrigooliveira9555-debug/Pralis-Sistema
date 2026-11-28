/*
 * Configurações → Diversos → Salário Mínimo Vigente (18/11/2026, pedido e aprovação do Rodrigo).
 * Guarda o valor do salário mínimo e a data de início de cada valor (cicluz-compras-v1.salariosMinimos, coleção nova e opcional:
 * sem migração). Cada valor tem o ano de referência, o início e o fim previsto da vigência (ano e fim: campos novos de 19/11/2026,
 * opcionais nos dados antigos). Passado o fim sem um valor mais novo, a tela e o contrato mostram o alerta para cadastrar o novo; o
 * valor anterior continua valendo até lá. O valor é digitado aqui: o sistema não busca o número em lugar nenhum. Vigente = o de início mais recente que
 * não seja depois de hoje. É a base do contrato com "Referência do salário mínimo" (percentual ↔ valor). As regras ficam em
 * compras/dominio.js (testadas). Mudar o valor aqui não altera contrato já gravado.
 * A janela segue o padrão linha por linha da Nova Transferência (27/11/2026): o Valor (R$) é o quadro grande na cor da origem, fixo no topo;
 * ano e vigência são linhas de um grupo.
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos; const U = window.CicluzComprasUI; const D = window.CicluzComprasDominio; const S = window.CicluzComprasDados;
  if (!A || !U || !D || !S) return;
  const { el, entrada } = U;
  const lista = () => (Array.isArray(S.dados.salariosMinimos) ? S.dados.salariosMinimos : []);
  const hoje = () => D.isoData(new Date());
  const vigente = () => D.salarioMinimoVigente(lista(), hoje());
  const dataBR = (iso) => window.CicluzDateFields.display(iso);
  const dinheiro = (centavos) => D.moeda(centavos / 100);
  const cores = { cor: A.COR, corTexto: A.COR_TEXTO };

  /** aoSalvar(): chamado depois de gravar (o contrato usa para recalcular o valor na hora). */
  function editar(item, aoSalvar) {
    const { linha, linhaDe, quadro, secao, abreAoTocarNaLinha } = window.CicluzTransferencias.pecas;
    U.dialogo({
      titulo: item ? 'Editar salário mínimo' : 'Novo valor do salário mínimo', ...cores, classe: 'compras-form-padrao transferencia-tela', rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove(); // o caminho já está no cabeçalho
        const R = window.CicluzFieldRules;
        const valor = entrada('text', item ? R.moneyMask(String(item.valorCentavos)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24, autocomplete: 'off' });
        valor.classList.add('transferencia-calc-tela');
        valor.addEventListener('input', () => { valor.value = R.moneyMask(valor.value); });
        // O rótulo com "salário" faria o field-validation.js tratar o campo de outro jeito: o nome para leitor de tela é o do valor.
        valor.setAttribute('aria-label', 'Valor do mínimo (R$)');
        const blocoValor = el('div', 'transferencia-valor-cab'); blocoValor.append(el('span', 'transferencia-valor-rotulo', 'Valor do salário mínimo (R$) *'), valor);
        const data = (rotulo, v) => U.campoData({ rotulo, valor: v || '' });
        const inicio = data('Início da vigência *', item && item.inicio); const fim = data('Fim da vigência (previsto)', item && item.fim);
        const ano = entrada('text', item && item.ano ? String(item.ano) : '', { inputMode: 'numeric', placeholder: 'Ex.: ' + new Date().getFullYear(), maxLength: 4 });
        ano.addEventListener('input', () => { ano.value = ano.value.replace(/\D/g, '').slice(0, 4); });
        const linhaData = (rotulo, d) => abreAoTocarNaLinha(linha(rotulo, d.caixa, d.painel), d.input, d.painel);
        const corpo = el('div', 'transferencia-corpo');
        corpo.append(blocoValor, secao('Vigência', quadro(linhaDe('Ano de referência *', ano), linhaData('Início da vigência *', inicio), linhaData('Fim da vigência (previsto)', fim))),
          U.nota('Início: a partir desta data, este é o valor usado nos contratos. Fim: data aproximada; quando ela passar sem um valor novo cadastrado, o sistema avisa e o valor continua valendo até o novo entrar.'));
        form.append(corpo);
        return { valor, inicio, fim, ano };
      },
      salvar: (c) => {
        if ((c.inicio.input.value && !c.inicio.valor()) || (c.fim.input.value && !c.fim.valor())) return 'Confira as datas: use DD/MM/AA.';
        if (!c.inicio.valor()) return 'Informe o início da vigência.';
        if (!/^\d{4}$/.test(c.ano.value)) return 'Informe o ano de referência com quatro números.';
        const n = D.digitos(c.valor.value).replace(/^0+(?=\d)/, '');
        const novo = { id: item ? item.id : S.novoId('sm'), valorCentavos: n ? parseInt(n, 10) : 0, inicio: c.inicio.valor(), fim: c.fim.valor() || '', ano: parseInt(c.ano.value, 10) };
        const falta = D.validarSalarioMinimo(novo, lista()); if (falta) return falta;
        const ok = S.transacao((d) => {
          if (!Array.isArray(d.salariosMinimos)) d.salariosMinimos = [];
          const i = d.salariosMinimos.findIndex((x) => x.id === novo.id);
          if (i >= 0) d.salariosMinimos[i] = { ...d.salariosMinimos[i], ...novo, atualizadoEm: S.agoraIso() }; else d.salariosMinimos.push({ ...novo, criadoEm: S.agoraIso() });
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar('Salário mínimo salvo.'); render(); if (aoSalvar) aoSalvar(); return undefined;
      },
    });
  }
  function excluir(item) {
    U.confirmar('Excluir valor', 'O valor de ' + dinheiro(item.valorCentavos) + ', com início em ' + dataBR(item.inicio) + ', será apagado. Contratos já gravados não mudam.', 'Excluir', () => {
      const ok = S.transacao((d) => { d.salariosMinimos = (d.salariosMinimos || []).filter((x) => x.id !== item.id); });
      if (!ok) return 'Não foi possível excluir. Tente de novo.';
      U.avisar('Valor excluído.'); render(); return undefined;
    }, cores);
  }

  let tela = null;
  function render() {
    if (!tela) return; // cadastrado de dentro do contrato, sem a tela ter sido aberta
    const itens = [...lista()].sort((a, b) => (a.inicio < b.inicio ? 1 : -1)); const v = vigente();
    const ponta = U.pontaDaLista(itens.length, itens.length + (itens.length === 1 ? ' valor cadastrado' : ' valores cadastrados'));
    const sec = U.secao('Salário mínimo', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Valor', 'Cadastrar um valor do salário mínimo', () => editar(null)));
    const linhas = el('div', 'compras-lista');
    if (!itens.length) linhas.append(U.vazio('Nenhum valor cadastrado.', 'Cadastre o valor em vigor e a data em que ele começou a valer.'));
    itens.forEach((x) => {
      const rotulo = dinheiro(x.valorCentavos);
      const estado = v && v.id === x.id ? 'Vigente' : x.inicio > hoje() ? 'Futuro' : 'Anterior';
      linhas.append(U.linhaLista({
        icone: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', titulo: (x.ano ? x.ano + ' · ' : '') + rotulo, detalhe: 'Vigência: de ' + dataBR(x.inicio) + (x.fim ? ' a ' + dataBR(x.fim) + ' (previsto)' : ' · sem fim informado'), direita: el('span', 'account-list-state', estado),
        acoes: { rotulo, lista: linhas, aoEditar: () => editar(x), aoExcluir: () => excluir(x) },
      }));
    });
    sec.append(linhas);
    const alerta = D.alertaSalarioMinimo(lista(), hoje()); const aviso = alerta ? el('p', 'people-alert', alerta) : null; if (aviso) aviso.setAttribute('role', 'alert');
    tela.body.replaceChildren(...(aviso ? [aviso] : []), U.nota(v ? 'Vigente hoje: ' + dinheiro(v.valorCentavos) + ' (desde ' + dataBR(v.inicio) + '). É a base dos contratos com referência do salário mínimo.'
      : 'Nenhum salário mínimo em vigor. Sem ele, o contrato com referência do salário mínimo não calcula o valor.'), sec);
  }
  function abrir() {
    if (!tela) tela = A.criarTela({ id: 'acessos-salario-minimo', titulo: 'Salário Mínimo Vigente', tela: 'salario-minimo' });
    tela.ativar();
    render();
  }
  A.registrar('salario-minimo', abrir);
  window.CicluzSalarioMinimo = { abrir, vigente, alerta: () => D.alertaSalarioMinimo(lista(), hoje()), novo: (aoSalvar) => editar(null, aoSalvar) };
})();
