/*
 * Compras — regras de negócio puras (sem DOM, sem armazenamento).
 * Espelham o módulo Compras do S1 (SISTEMA_CAIXA, branch main) para o protótipo.
 * Carregado no navegador como window.CicluzComprasDominio e testado em Node (tests/compras-dominio.cjs).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzComprasDominio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Datas (sempre em horário local, formato ISO curto) ---------- */

  const pad = (n) => String(n).padStart(2, '0');
  const isoData = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const lerData = (iso) => {
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d);
  };
  const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const diasEntre = (a, b) => Math.round((lerData(isoData(b)) - lerData(isoData(a))) / 86400000);
  const inicioSemana = (d) => somarDias(d, -d.getDay());
  const diasNoMes = (ano, mes) => new Date(ano, mes + 1, 0).getDate();

  /* ---------- Recorrência (agendamento de pedidos e de conferências) ----------
   * regra.tipo: 'nunca' | 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'anual' | 'personalizada'
   * personalizada: { frequencia: 'diaria'|'semanal'|'mensal'|'anual', intervalo, diasSemana[], diasMes[], meses[] }
   * termino: { tipo: 'nunca' | 'data' | 'vezes', data, vezes }
   */
  const REPETICOES = [
    ['nunca', 'Nunca'],
    ['diaria', 'Todo dia'],
    ['semanal', 'Toda semana'],
    ['quinzenal', 'A cada 2 semanas'],
    ['mensal', 'Todo mês'],
    ['anual', 'Todo ano'],
    ['personalizada', 'Personalizado…'],
  ];
  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  function normalizarRegra(regra, inicio) {
    const r = regra || { tipo: 'nunca' };
    const base = { intervalo: 1, diasSemana: [inicio.getDay()], diasMes: [inicio.getDate()], meses: [inicio.getMonth()] };
    switch (r.tipo) {
      case 'diaria': return { ...base, frequencia: 'diaria' };
      case 'semanal': return { ...base, frequencia: 'semanal' };
      case 'quinzenal': return { ...base, frequencia: 'semanal', intervalo: 2 };
      case 'mensal': return { ...base, frequencia: 'mensal' };
      case 'anual': return { ...base, frequencia: 'anual' };
      case 'personalizada': {
        const p = r.personalizada || {};
        return {
          frequencia: p.frequencia || 'semanal',
          intervalo: Math.max(1, Number(p.intervalo) || 1),
          diasSemana: p.diasSemana && p.diasSemana.length ? p.diasSemana.map(Number) : base.diasSemana,
          diasMes: p.diasMes && p.diasMes.length ? p.diasMes.map(Number) : base.diasMes,
          meses: p.meses && p.meses.length ? p.meses.map(Number) : base.meses,
        };
      }
      default: return null; // nunca
    }
  }

  function casaComRegra(dia, inicio, r) {
    if (dia < inicio) return false;
    switch (r.frequencia) {
      case 'diaria':
        return diasEntre(inicio, dia) % r.intervalo === 0;
      case 'semanal': {
        const semanas = Math.round(diasEntre(inicioSemana(inicio), inicioSemana(dia)) / 7);
        return semanas % r.intervalo === 0 && r.diasSemana.includes(dia.getDay());
      }
      case 'mensal': {
        const meses = (dia.getFullYear() - inicio.getFullYear()) * 12 + dia.getMonth() - inicio.getMonth();
        return meses % r.intervalo === 0 && r.diasMes.includes(dia.getDate());
      }
      case 'anual': {
        const anos = dia.getFullYear() - inicio.getFullYear();
        return anos % r.intervalo === 0 && r.meses.includes(dia.getMonth()) && dia.getDate() === inicio.getDate();
      }
      default:
        return false;
    }
  }

  /**
   * Datas geradas pela série, em ordem. Considera término (data/vezes) e exceções
   * (datas canceladas ou movidas). Retorna [{ previsto, data, hora, movida }].
   */
  function ocorrencias(agenda, opcoes = {}) {
    const inicio = lerData(agenda.inicio);
    const hora = agenda.hora || '08:00';
    const limite = opcoes.limite || 12;
    const desde = opcoes.desde ? lerData(opcoes.desde) : inicio;
    const ate = opcoes.ate ? lerData(opcoes.ate) : somarDias(desde, 366 * 3);
    const termino = agenda.termino || { tipo: 'nunca' };
    const fimPorData = termino.tipo === 'data' && termino.data ? lerData(termino.data) : null;
    const maxVezes = termino.tipo === 'vezes' ? Math.max(1, Number(termino.vezes) || 1) : Infinity;
    const excecoes = agenda.excecoes || {};
    const regra = normalizarRegra(agenda.regra, inicio);

    const brutas = [];
    if (!regra) brutas.push(isoData(inicio));
    else {
      let geradas = 0;
      for (let dia = inicio; dia <= ate && geradas < maxVezes; dia = somarDias(dia, 1)) {
        if (fimPorData && dia > fimPorData) break;
        if (casaComRegra(dia, inicio, regra)) { brutas.push(isoData(dia)); geradas++; }
      }
    }

    const saida = [];
    for (const previsto of brutas) {
      const ex = excecoes[previsto];
      if (ex && ex.cancelada) continue;
      const data = ex && ex.data ? ex.data : previsto;
      const h = ex && ex.hora ? ex.hora : hora;
      if (lerData(data) < desde || lerData(data) > ate) continue;
      saida.push({ previsto, data, hora: h, movida: Boolean(ex && ex.data) });
    }
    saida.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    return saida.slice(0, limite);
  }

  function resumoRegra(regra, inicioIso) {
    const r = regra || { tipo: 'nunca' };
    if (r.tipo !== 'personalizada') return (REPETICOES.find((x) => x[0] === r.tipo) || REPETICOES[0])[1];
    const n = normalizarRegra(r, lerData(inicioIso));
    const cada = n.intervalo > 1 ? 'A cada ' + n.intervalo + ' ' : 'Todo(a) ';
    if (n.frequencia === 'diaria') return n.intervalo > 1 ? cada + 'dias' : 'Todo dia';
    if (n.frequencia === 'semanal') return cada + (n.intervalo > 1 ? 'semanas' : 'semana') + ': ' + n.diasSemana.slice().sort().map((d) => DIAS_SEMANA[d]).join(', ');
    if (n.frequencia === 'mensal') return cada + (n.intervalo > 1 ? 'meses' : 'mês') + ': dia ' + n.diasMes.slice().sort((a, b) => a - b).join(', ');
    return cada + (n.intervalo > 1 ? 'anos' : 'ano') + ': ' + n.meses.slice().sort((a, b) => a - b).map((m) => MESES[m]).join(', ');
  }

  /* ---------- Bolinhas: topo 20% dos últimos 3 meses ---------- */

  /** Recebe [{ id, valor }] e devolve um Set de ids no topo (ceil 20% dos positivos; empate na fronteira entra). */
  function topoDoRanking(itens) {
    const positivos = itens.filter((i) => Number(i.valor) > 0).sort((a, b) => b.valor - a.valor);
    if (!positivos.length) return new Set();
    const k = Math.ceil(positivos.length * 0.2);
    const corte = positivos[k - 1].valor;
    return new Set(positivos.filter((i) => i.valor >= corte).map((i) => i.id));
  }

  /* ---------- Fornecedor ---------- */

  const digitos = (s) => String(s || '').replace(/\D/g, '');
  /** Só pode receber cotação quem está ativo e tem WhatsApp com DDD (≥ 10 dígitos). */
  function motivoNaoConvidavel(f) {
    if (!f) return 'Fornecedor não encontrado';
    if (f.situacao !== 'ativo') return 'Fornecedor inativo';
    if (digitos(f.whatsapp).length < 10) return 'WhatsApp válido (com DDD)';
    return '';
  }
  const podeConvidar = (f) => motivoNaoConvidavel(f) === '';

  /* ---------- Cotação: avaliação automática da resposta do fornecedor ----------
   * Um item é comprado sozinho quando: custo ≤ referência congelada, cabe no teto e a
   * quantidade disponível está dentro da margem aceita. Caso contrário vai para o comprador.
   */
  function avaliarItem({ indisponivel, custo, referencia, pedida, disponivel, margemPct, teto, gastoComprometido, jaComprado }) {
    if (jaComprado) return { situacao: 'retornado', motivo: 'ja_comprado' };
    if (indisponivel) return { situacao: 'retornado', motivo: 'indisponivel' };
    if (!(custo > 0)) return { situacao: 'retornado', motivo: 'custo_nao_calculado' };
    if (referencia == null) return { situacao: 'com_aumento', motivo: 'sem_referencia' };
    if (custo > referencia) return { situacao: 'com_aumento', motivo: 'acima_da_base' };
    const variacao = pedida > 0 ? Math.abs(disponivel - pedida) / pedida : 0;
    if (variacao > (margemPct || 0) / 100 + 1e-9) return { situacao: 'retornado', motivo: 'fora_da_margem' };
    if (teto != null) {
      const total = Math.round(custo * disponivel * 100) + Math.round((gastoComprometido || 0) * 100);
      if (total > Math.round(teto * 100)) return { situacao: 'retornado', motivo: 'barrado_pelo_teto' };
    }
    return { situacao: 'comprado', motivo: '' };
  }

  /** Faixa aceita na separação: pedida ± margem, arredondada em 3 casas (como no S1). */
  function limitesDaMargem(pedida, margemPct) {
    if (margemPct == null) return { minimo: 0, maximo: pedida };
    const r = (v) => Math.round(v * 1000) / 1000;
    return { minimo: r(pedida * (1 - margemPct / 100)), maximo: r(pedida * (1 + margemPct / 100)) };
  }
  function quantidadeDentroDaMargem(pedida, informada, margemPct) {
    if (!(informada > 0)) return false;
    const { minimo, maximo } = limitesDaMargem(pedida, margemPct);
    return informada >= minimo - 0.0005 && informada <= maximo + 0.0005;
  }

  const MOTIVOS = {
    sem_resposta: 'Sem resposta',
    indisponivel: 'Fornecedor não tem',
    custo_nao_calculado: 'Custo não calculado',
    sem_referencia: 'Sem preço-base',
    acima_da_base: 'Acima da base',
    barrado_pelo_teto: 'Barrado pelo teto',
    fora_da_margem: 'Fora da margem',
    ja_comprado: 'Já comprado de outro',
  };

  /** Ao fechar a cotação a referência só desce; produto sem referência ganha a menor oferta. */
  function novaReferencia(atual, ofertas) {
    const validas = ofertas.filter((v) => v > 0);
    if (!validas.length) return atual;
    const menor = Math.min(...validas);
    return atual == null || menor < atual ? menor : atual;
  }

  /* ---------- Matriz "Produtos em cotação" ---------- */

  const COLUNAS_MATRIZ = [
    ['enviado', 'Enviado'],
    ['cotado', 'Cotado'],
    ['retornado', 'Retornado'],
    ['com_aumento', 'Com aumento'],
    ['comprado', 'Comprado'],
  ];

  /** linhas: [{ produtoId, estado }] onde estado ∈ aguardando|cotado|retornado|com_aumento|comprado. */
  function contarMatriz(linhas) {
    const porProduto = new Map();
    for (const l of linhas) {
      const c = porProduto.get(l.produtoId) || { enviado: 0, cotado: 0, retornado: 0, com_aumento: 0, comprado: 0 };
      c.enviado++;
      if (l.estado !== 'aguardando') c[l.estado]++;
      porProduto.set(l.produtoId, c);
    }
    return porProduto;
  }

  /* ---------- Estoque ---------- */

  function situacaoEstoque(saldo, min, max) {
    const temMin = min != null && min !== '';
    const temMax = max != null && max !== '';
    if (!temMin && !temMax) return 'sem_faixa';
    if (temMin && Number(saldo) <= Number(min)) return 'no_minimo';
    if (temMax && Number(saldo) >= Number(max)) return 'no_maximo';
    return 'regular';
  }
  const SITUACOES_ESTOQUE = {
    no_minimo: ['No mínimo', 'atencao'],
    no_maximo: ['No máximo', 'info'],
    sem_faixa: ['Sem faixa', 'neutro'],
    regular: ['Regular', 'positivo'],
  };

  /** "Preencher com o que está no mínimo": máximo − saldo para quem está ≤ mínimo. */
  function sugestaoReposicao(produto) {
    if (situacaoEstoque(produto.saldo, produto.estoqueMin, produto.estoqueMax) !== 'no_minimo') return 0;
    const max = Number(produto.estoqueMax);
    return max > 0 ? Math.max(0, max - Number(produto.saldo || 0)) : 0;
  }

  /**
   * Teto do estoque máximo (mesma regra do S1, `pendenciasDeTeto`): para cada produto com máximo definido, o
   * pedido não pode fazer o saldo passar dele (saldo + quantidade ≤ máximo). Produto sem máximo não tem teto.
   * Soma por produto, para a conta fechar pelo conjunto. itens: [{ produtoId, descricao, quantidade, saldo, estoqueMax }]
   */
  function pendenciasDeTeto(itens) {
    const soma = new Map();
    itens.forEach((i) => soma.set(i.produtoId, (soma.get(i.produtoId) || 0) + Number(i.quantidade || 0)));
    const vistos = new Set();
    const pendencias = [];
    for (const i of itens) {
      if (vistos.has(i.produtoId)) continue;
      vistos.add(i.produtoId);
      if (i.estoqueMax == null || i.estoqueMax === '') continue;
      const atual = Number(i.saldo || 0);
      const pedido = soma.get(i.produtoId) || 0;
      if (atual + pedido > Number(i.estoqueMax) + 1e-9) {
        pendencias.push((i.descricao || i.produtoId) + ': pedido de ' + numero(pedido) + ' com saldo ' + numero(atual) + ' passa do máximo ' + numero(i.estoqueMax));
      }
    }
    return pendencias;
  }

  /* ---------- Recebimento de pedido ----------
   * itens: [{ id, pedida, recebida, devolvida, pendente }]
   * entrada: { [itemId]: { recebido, devolvido, motivo } }
   * Recebido + devolvido ≤ pendente; devolução exige motivo e fecha o item.
   */
  function aplicarRecebimento(status, itens, entrada) {
    if (status !== 'confirmado' && status !== 'recebido_parcial') return { erro: 'Só é possível receber pedido comprado ou recebido parcialmente.' };
    const novos = [];
    let algum = false;
    for (const item of itens) {
      const e = entrada[item.id] || {};
      const rec = Number(e.recebido) || 0;
      const dev = Number(e.devolvido) || 0;
      if (rec < 0 || dev < 0) return { erro: 'Quantidades não podem ser negativas.' };
      if (rec + dev > item.pendente + 1e-9) return { erro: 'Recebido + devolvido passa do que falta em um item.' };
      if (dev > 0 && !String(e.motivo || '').trim()) return { erro: 'Informe o motivo da devolução.' };
      if (rec > 0 || dev > 0) algum = true;
      const pendente = dev > 0 ? 0 : +(item.pendente - rec).toFixed(3);
      novos.push({ ...item, recebida: +(item.recebida + rec).toFixed(3), devolvida: +(item.devolvida + dev).toFixed(3), pendente, entrou: rec, devolveu: dev, motivo: e.motivo || '' });
    }
    if (!algum) return { erro: 'Informe ao menos uma quantidade recebida ou devolvida.' };
    const status2 = novos.every((i) => i.pendente <= 0) ? 'recebido' : 'recebido_parcial';
    return { itens: novos, status: status2 };
  }

  const SITUACOES_PEDIDO = {
    confirmado: ['Comprado', 'info'],
    recebido_parcial: ['Recebido parcialmente', 'atencao'],
    recebido: ['Recebido', 'positivo'],
    cancelado: ['Cancelado', 'negativo'],
  };

  /* ---------- Formatação ---------- */

  /** Lê número digitado em formato brasileiro ("R$ 1.234,56", "12,5") ou ponto decimal ("12.5"). Vazio → null. */
  function lerNumero(v) {
    if (v == null) return null;
    let s = String(v).replace(/[^\d,.-]/g, '').trim();
    if (!s) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const moeda = (v, casas = 2) =>
    v == null || v === '' || Number.isNaN(Number(v))
      ? '—'
      : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });
  const numero = (v, casas = 3) =>
    v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas });
  const dataCurta = (iso) => (iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) : '');
  const dataLonga = (iso) => (iso ? dataCurta(iso) + '/' + String(iso).slice(2, 4) : '');

  return {
    isoData, lerData, somarDias, diasNoMes,
    REPETICOES, DIAS_SEMANA, MESES, ocorrencias, resumoRegra,
    topoDoRanking,
    digitos, motivoNaoConvidavel, podeConvidar,
    avaliarItem, limitesDaMargem, quantidadeDentroDaMargem, MOTIVOS, novaReferencia, COLUNAS_MATRIZ, contarMatriz,
    situacaoEstoque, SITUACOES_ESTOQUE, sugestaoReposicao, pendenciasDeTeto,
    aplicarRecebimento, SITUACOES_PEDIDO,
    moeda, numero, dataCurta, dataLonga, lerNumero,
  };
});
