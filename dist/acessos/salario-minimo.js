/*
 * Configurações → Empresa → Salário Mínimo Vigente (18/11/2026, pedido e aprovação do Rodrigo).
 * Guarda o valor do salário mínimo e a data de início de cada valor (cicluz-compras-v1.salariosMinimos, coleção nova e opcional:
 * sem migração). O valor é digitado aqui: o sistema não busca o número em lugar nenhum. Vigente = o de início mais recente que
 * não seja depois de hoje. É a base do contrato com "Referência do salário mínimo" (percentual ↔ valor). As regras ficam em
 * compras/dominio.js (testadas). Mudar o valor aqui não altera contrato já gravado.
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos; const U = window.CicluzComprasUI; const D = window.CicluzComprasDominio; const S = window.CicluzComprasDados;
  if (!A || !U || !D || !S) return;
  const { el, campo, entrada } = U;
  const lista = () => (Array.isArray(S.dados.salariosMinimos) ? S.dados.salariosMinimos : []);
  const hoje = () => D.isoData(new Date());
  const vigente = () => D.salarioMinimoVigente(lista(), hoje());
  const dataBR = (iso) => window.CicluzDateFields.display(iso);
  const dinheiro = (centavos) => D.moeda(centavos / 100);
  const cores = { cor: A.COR, corTexto: A.COR_TEXTO };

  function editar(item) {
    U.dialogo({
      titulo: item ? 'Editar salário mínimo' : 'Novo valor do salário mínimo', ...cores, rotuloSalvar: 'Salvar',
      montar: (form) => {
        const R = window.CicluzFieldRules;
        const valor = entrada('text', item ? R.moneyMask(String(item.valorCentavos)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 });
        valor.addEventListener('input', () => { valor.value = R.moneyMask(valor.value); });
        // O rótulo com "salário" faria o field-validation.js tratar o campo de outro jeito: o nome para leitor de tela é o do valor.
        valor.setAttribute('aria-label', 'Valor do mínimo (R$)');
        const inicio = entrada('date', item ? item.inicio : '');
        const quadro = el('fieldset', 'compras-fieldset');
        quadro.append(el('legend', null, 'Dados do salário mínimo'), campo('Valor (R$) *', valor), campo('Início da vigência *', inicio, 'A partir desta data, este é o valor usado nos contratos.'));
        form.append(quadro);
        return { valor, inicio };
      },
      salvar: (c) => {
        if (!c.inicio.checkValidity()) return 'Confira a data: use DD/MM/AA.';
        const n = D.digitos(c.valor.value).replace(/^0+(?=\d)/, '');
        const novo = { id: item ? item.id : S.novoId('sm'), valorCentavos: n ? parseInt(n, 10) : 0, inicio: c.inicio.value };
        const falta = D.validarSalarioMinimo(novo, lista()); if (falta) return falta;
        const ok = S.transacao((d) => {
          if (!Array.isArray(d.salariosMinimos)) d.salariosMinimos = [];
          const i = d.salariosMinimos.findIndex((x) => x.id === novo.id);
          if (i >= 0) d.salariosMinimos[i] = { ...d.salariosMinimos[i], ...novo, atualizadoEm: S.agoraIso() }; else d.salariosMinimos.push({ ...novo, criadoEm: S.agoraIso() });
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar('Salário mínimo salvo.'); render(); return undefined;
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
        icone: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', titulo: rotulo, detalhe: 'Início da vigência: ' + dataBR(x.inicio), direita: el('span', 'account-list-state', estado),
        acoes: { rotulo, lista: linhas, aoEditar: () => editar(x), aoExcluir: () => excluir(x) },
      }));
    });
    sec.append(linhas);
    tela.body.replaceChildren(U.nota(v ? 'Vigente hoje: ' + dinheiro(v.valorCentavos) + ' (desde ' + dataBR(v.inicio) + '). É a base dos contratos com referência do salário mínimo.'
      : 'Nenhum salário mínimo em vigor. Sem ele, o contrato com referência do salário mínimo não calcula o valor.'), sec);
  }
  function abrir() {
    if (!tela) tela = A.criarTela({ id: 'acessos-salario-minimo', titulo: 'Salário Mínimo Vigente', tela: 'salario-minimo' });
    tela.ativar();
    render();
  }
  A.registrar('salario-minimo', abrir);
  window.CicluzSalarioMinimo = { abrir, vigente };
})();
