/*
 * Parâmetros de custo (Saídas · Mercadorias → Cadastros Geral Produção). As fórmulas C1–C5 foram aprovadas pelo Zé em 05/11/2026;
 * os números que elas usam (horas por mês, encargos, preço do kWh e do gás) são preenchidos aqui, sem
 * valor inventado: vazio = o custo da ficha sai parcial e diz o que falta.
 */
(function () {
  'use strict';
  const S = window.CicluzProducaoDados;
  const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI;
  const CD = window.CicluzComprasDominio;
  const M = window.CicluzProducao;
  const { el, botao, campo, entrada } = U;

  const CAMPOS = [
    ['horasMes', 'Horas de trabalho por mês', 'h', 'Divide o salário do cargo para achar o custo do minuto.'],
    ['encargosPct', 'Encargos sobre a folha', '%', 'Acrescentado ao salário (ex.: 0 se o salário do cargo já inclui).'],
    ['precoKwh', 'Preço do kWh', 'R$', 'Energia elétrica dos equipamentos.'],
    ['precoGasKg', 'Preço do kg de gás', 'R$', 'Equipamentos a gás.'],
  ];
  const mostrar = (k, un, v) => (v == null ? 'Não preenchido' : un === 'R$' ? CD.moeda(v, 4) : CD.numero(v) + (un === '%' ? '%' : ' h'));

  let tela = null;
  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-custos', titulo: 'MER - Parâmetros de Custo', caminho: M.CAMINHO_CAD + 'MER - Parâmetros de Custo', icone: 'cifrao', voltar: M.voltarCadastros });
      document.addEventListener('cicluz-producao-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    tela.ativar();
    render();
  }

  function render() {
    const p = S.parametros();
    const sec = U.secao('Parâmetros', CAMPOS.filter(([k]) => p[k] != null).length, botao('Editar', editar, 'btn'));
    const lista = el('div', 'compras-lista');
    CAMPOS.forEach(([k, rotulo, un, dica]) => lista.append(U.linhaLista({ icone: 'cifrao', titulo: rotulo, detalhe: dica, direita: el('b', null, mostrar(k, un, p[k])) })));
    sec.append(lista);
    const formulas = U.secao('Como o custo da ficha é calculado');
    const ul = el('ul', 'producao-formulas');
    [
      'Ingredientes = quantidade de cada ingrediente na unidade do estoque × custo da unidade no Compras.',
      'Mão de obra = tempo de equipe × salário vigente do cargo × (1 + encargos) ÷ (horas por mês × 60).',
      'Energia = tempo do equipamento (com os processos repetidos) × consumo por hora × preço do kWh ou do gás.',
      'Custo da ficha = ingredientes + mão de obra + energia; por unidade = custo ÷ quantidade-base.',
      'Valor sugerido = custo por unidade × (1 + margem) + R$ 0,01; margem do produto ou, se vazia, a do grupo.',
    ].forEach((t) => ul.append(el('li', null, t)));
    formulas.append(ul);
    tela.body.replaceChildren(U.nota('Fórmulas aprovadas em 05/11/2026. Sem um parâmetro, a ficha mostra o custo parcial e o que falta.'), sec, formulas);
  }

  function editar() {
    const p = S.parametros();
    U.dialogo({
      titulo: 'Parâmetros de custo',
      montar: (form) => {
        const ctx = {};
        CAMPOS.forEach(([k, rotulo, un, dica]) => {
          // Preço: campo de texto com a máscara de dinheiro do S2 (field-validation); lido com lerNumero.
          const i = un === 'R$'
            ? entrada('text', p[k] != null ? CD.moeda(p[k], 4) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' })
            : entrada('number', p[k] ?? '', { step: 'any', inputMode: 'decimal' }); // sem min: a mensagem é a do S2, não a do navegador
          i.dataset.unidade = un;
          ctx[k] = i;
          form.append(campo(rotulo + ' (' + un + ')', i, dica));
        });
        return ctx;
      },
      rotuloSalvar: 'Salvar parâmetros',
      salvar: (c) => {
        const ler = (i) => (String(i.value).trim() === '' ? null : i.dataset.unidade === 'R$' ? CD.lerNumero(i.value) : Number(i.value));
        const r = SV.salvarParametros(Object.fromEntries(CAMPOS.map(([k]) => [k, ler(c[k])])));
        if (r.erro) return r.erro;
        U.avisar('Parâmetros salvos.');
      },
    });
  }

  M.registrar('custos', abrir);
})();
