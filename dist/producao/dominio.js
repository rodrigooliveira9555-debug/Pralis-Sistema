/*
 * Produção: regras puras, sem tela e sem armazenamento (testadas em Node: tests/producao-dominio.cjs).
 * Fonte: reunião com o Rodrigo (05/11/2026) e a planilha "NOVO SISTEMA PRALÍS" (docs/PRODUCAO_ESPECIFICACAO.md).
 * Nada aqui calcula dinheiro: custos esperam a aprovação das fórmulas (especificação, seção 6).
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.CicluzProducaoDominio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Listas da planilha (grafia corrigida) ---------- */
  const PROCESSOS = [
    ['receber', 'Receber / conferir / garantir'],
    ['pre-pesar', 'Pré-pesar / separar / adiantar'],
    ['higienizar', 'Higienizar / preparar / organizar'],
    ['picar', 'Picar / cortar / descascar / temperar'],
    ['misturar', 'Misturar / montar / juntar / modelar'],
    ['assar', 'Assar / fritar / cozinhar / refogar'],
    ['finalizar', 'Finalizar / decorar / acabar'],
    ['armazenar', 'Armazenar / resfriar / aquecer'],
    ['embalar', 'Embalar / empacotar / etiquetar'],
  ];
  const PARTES = [['massa', 'Massa'], ['recheio', 'Recheio'], ['cobertura', 'Cobertura'], ['ingrediente', 'Ingrediente']];
  // Lista NIVELPROFISSIONAL da planilha. Decisão do Zé (05/11): a etapa guarda o cargo (cadastro de Cargos) e o nível.
  const NIVEIS = [['ajudante', 'Ajudante'], ['iniciante', 'Profissional iniciante'], ['intermediario', 'Profissional intermediário'], ['avancado', 'Profissional avançado'], ['especialista', 'Especialista']];
  // As 4 categorias decididas pelo Rodrigo [06:50].
  const CATEGORIAS = [['utensilio', 'Utensílio'], ['maquina', 'Máquina'], ['equipamento', 'Equipamento'], ['mobiliario', 'Mobiliário']];
  const ENERGIAS = [['nenhuma', 'Não consome'], ['eletrica', 'Energia elétrica'], ['gas', 'Gás']];
  const UNIDADE_CONSUMO = { eletrica: 'kWh por hora', gas: 'kg de gás por hora' };
  const EXATIDOES = [['exato', 'Exato'], ['aproximado', 'Aproximado']];
  const ACOMPANHAMENTOS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const CONFERENCIAS = [['nenhuma', 'Sem conferência'], ['1', 'Conferência em 1 etapa (saída da produção)'], ['2', 'Conferência em 2 etapas (saída e chegada na loja)']];
  const VISOES = [['horario', 'Por horário'], ['turno', 'Por turno'], ['processo', 'Por processo'], ['setor', 'Por setor'], ['cargo', 'Por cargo'], ['produto', 'Por produto']];
  // Turno pela hora em que a janela começa (provisório: antes das 12:00 é manhã).
  const turnoDe = (janelaDe) => (!janelaDe ? '' : janelaDe < '12:00' ? 'Manhã' : 'Tarde');
  const SITUACOES_PEDIDO = {
    rascunho: ['Para fazer', 'atencao'], enviado: ['Na produção', 'info'], pronto: ['Pronto para abastecer', 'marca'],
    conferencia_loja: ['Conferir na loja', 'atencao'], abastecido: ['Abastecido', 'positivo'], cancelado: ['Cancelado', 'negativo'],
  };
  const nomeDe = (lista, id) => (lista.find((x) => x[0] === id) || [null, ''])[1];

  const EPS = 1e-9;
  const arred = (n, casas = 3) => { const f = 10 ** casas; return Math.round((Number(n) + Number.EPSILON) * f) / f; };

  /* ---------- Formato de pedido (utensílio de fornada) ---------- */

  /** Quantos cabem num utensílio inteiro (largura × altura). */
  const fornada = (f) => (f && f.colunas > 0 && f.linhas > 0 ? f.colunas * f.linhas : 0);
  /** Meia fornada: divide a largura, que precisa ser par [15:43]. Sem meia, devolve 0. */
  const meia = (f) => (f && f.aceitaMeia && f.colunas % 2 === 0 ? (f.colunas / 2) * f.linhas : 0);
  /** Menor quantidade pedível: meia, se o utensílio aceita; senão, a fornada inteira. */
  const passo = (f) => meia(f) || fornada(f);

  function validarFormato(f) {
    if (!f) return 'Informe o formato.';
    if (!f.utensilioId) return 'Escolha o utensílio (cadastre em RET - Patrimônios).';
    if (!(Number.isInteger(f.colunas) && f.colunas > 0)) return 'A quantidade na largura deve ser um número inteiro maior que zero.';
    if (!(Number.isInteger(f.linhas) && f.linhas > 0)) return 'A quantidade na altura deve ser um número inteiro maior que zero.';
    if (f.aceitaMeia && f.colunas % 2 !== 0) return 'Para aceitar meia, a quantidade na largura precisa ser par (a meia divide a largura).';
    return '';
  }

  const ehMultiplo = (qtd, p) => p > 0 && qtd > 0 && Math.abs(qtd / p - Math.round(qtd / p)) < 1e-6;
  /** Quantos utensílios a quantidade ocupa (ex.: 54 un em fornada de 36 = 1,5). */
  const utensilios = (qtd, f) => (fornada(f) ? arred(qtd / fornada(f), 2) : 0);
  /** Múltiplos do passo até o teto (lista da planilha, colunas AC–AE). */
  function multiplos(p, ate) {
    if (!(p > 0)) return [];
    const r = [];
    for (let q = p; q <= ate + EPS && r.length < 400; q += p) r.push(arred(q));
    return r;
  }
  function resumoFormato(f, nomeUtensilio, unidade = 'un') {
    if (!fornada(f)) return '';
    const m = meia(f);
    return nomeUtensilio + ' · ' + f.colunas + ' × ' + f.linhas + ' = ' + fornada(f) + ' ' + unidade + (m ? ' · meia ' + m + ' ' + unidade : ' · sem meia');
  }
  /** Mensagem de erro se a quantidade não respeita o passo do produto. */
  function validarQuantidade(qtd, f, unidade = 'un') {
    if (!(qtd > 0)) return 'Informe uma quantidade maior que zero.';
    const p = passo(f);
    if (!p) return '';
    if (!ehMultiplo(qtd, p)) return 'Use múltiplos de ' + p + ' ' + unidade + (meia(f) ? ' (meia fornada)' : ' (fornada inteira)') + '.';
    return '';
  }

  /** Mínimo e máximo de estoque do produto produzido: múltiplos do passo, mínimo ≤ máximo. */
  function validarConfigProduto(c, f) {
    const p = passo(f);
    for (const [k, rotulo] of [['estoqueMin', 'O estoque mínimo'], ['estoqueMax', 'O estoque máximo'], ['producaoMax', 'A produção máxima']]) {
      const v = c[k];
      if (v == null || v === '') continue;
      if (!(v > 0)) return rotulo + ' deve ser maior que zero.';
      if (p && !ehMultiplo(v, p)) return rotulo + ' deve ser múltiplo de ' + p + '.';
    }
    if (c.estoqueMin != null && c.estoqueMax != null && c.estoqueMin > c.estoqueMax) return 'O estoque mínimo não pode ser maior que o máximo.';
    return '';
  }

  /* ---------- Ficha técnica ---------- */

  const tempoEfetivo = (tempoMin, acompanhamento) => arred((Number(tempoMin) || 0) * (Number(acompanhamento) || 0), 2);
  const naFaixa = (x, qtd) => (x.faixaDe == null || qtd >= x.faixaDe - EPS) && (x.faixaAte == null || qtd <= x.faixaAte + EPS);

  /** Gramas de um ingrediente na unidade dada (só KG e G pesam; o resto não entra na capacidade). */
  const emKg = (quantidade, unidade) => (unidade === 'KG' ? quantidade : unidade === 'G' ? quantidade / 1000 : 0);

  /** Ingredientes da etapa escalados para a quantidade pedida (proporcional à quantidade-base da ficha). */
  function ingredientesPara(etapa, ficha, qtd) {
    const fator = ficha.quantidadeBase > 0 ? qtd / ficha.quantidadeBase : 1;
    return (etapa.ingredientes || []).map((i) => ({ ...i, quantidade: arred(i.quantidade * fator) }));
  }

  /**
   * Lotes: se a carga passa da capacidade do equipamento, o processo se repete [20:26].
   * capacidade {valor, unidade}: KG/G compara com o peso dos ingredientes da etapa; UN com a quantidade.
   */
  function lotes(capacidade, { kg, quantidade }) {
    if (!capacidade || !(capacidade.valor > 0)) return 1;
    const cap = capacidade.unidade === 'G' ? capacidade.valor / 1000 : capacidade.valor;
    const carga = capacidade.unidade === 'KG' || capacidade.unidade === 'G' ? kg : capacidade.unidade === 'UN' ? quantidade : 0;
    if (!(carga > 0)) return 1;
    return Math.max(1, Math.ceil(carga / cap - 1e-9));
  }

  /**
   * Plano de uma ficha para uma quantidade: por etapa, os ingredientes escalados, os recursos que valem
   * naquela faixa, os lotes e os tempos. patrimonio(id) devolve o bem (para a capacidade).
   */
  function planoDaFicha(ficha, qtd, patrimonio = () => null) {
    const etapas = (ficha.etapas || []).filter((e) => naFaixa(e, qtd)).map((e, i) => {
      const ingredientes = ingredientesPara(e, ficha, qtd);
      const kg = arred(ingredientes.reduce((s, x) => s + emKg(x.quantidade, x.unidade), 0));
      const recursos = (e.recursos || []).filter((r) => naFaixa(r, qtd)).map((r) => {
        const bem = r.patrimonioId ? patrimonio(r.patrimonioId) : null;
        const n = lotes(bem && bem.capacidade, { kg, quantidade: qtd });
        const tempo = arred((Number(r.tempoMin) || 0) * n, 2);
        return { ...r, bem, lotes: n, tempo, tempoEquipe: tempoEfetivo(tempo, r.acompanhamento) };
      });
      const tempo = arred(recursos.reduce((s, r) => s + r.tempo, 0), 2);
      const tempoEquipe = arred(recursos.reduce((s, r) => s + r.tempoEquipe, 0), 2);
      return { ...e, numero: i + 1, ingredientes, kg, recursos, tempo, tempoEquipe, lotes: recursos.reduce((m, r) => Math.max(m, r.lotes), 1) };
    });
    return {
      etapas,
      tempo: arred(etapas.reduce((s, e) => s + e.tempo, 0), 2),
      tempoEquipe: arred(etapas.reduce((s, e) => s + e.tempoEquipe, 0), 2),
    };
  }

  /** Perda da receita (planilha 1.6): líquido − bruto e líquido ÷ bruto − 1. */
  function perda(bruto, liquido) {
    if (!(bruto > 0) || !(liquido >= 0)) return null;
    return { kg: arred(liquido - bruto), pct: arred(liquido / bruto - 1, 4) };
  }

  function validarFicha(f) {
    if (!f.produtoId) return 'Escolha o produto da ficha.';
    if (!String(f.nome || '').trim()) return 'Dê um nome à ficha (ex.: "Do zero", "Com kit").';
    if (!(f.quantidadeBase > 0)) return 'Informe para quantas unidades são os ingredientes (quantidade-base).';
    if (!f.etapas || !f.etapas.length) return 'A ficha precisa de ao menos uma etapa.';
    for (const [i, e] of f.etapas.entries()) {
      const n = 'Etapa ' + (i + 1) + ': ';
      if (!e.processo) return n + 'escolha o processo.';
      if (e.faixaDe != null && e.faixaAte != null && e.faixaDe > e.faixaAte) return n + 'a faixa "de" não pode ser maior que "até".';
      for (const x of e.ingredientes || []) {
        if (!x.produtoId) return n + 'escolha o ingrediente de cada linha.';
        if (!(x.quantidade > 0)) return n + 'a quantidade de cada ingrediente deve ser maior que zero.';
      }
      for (const r of e.recursos || []) {
        if (!(r.tempoMin >= 0)) return n + 'o tempo não pode ser negativo.';
        if (!(r.acompanhamento >= 0 && r.acompanhamento <= 1)) return n + 'o acompanhamento vai de 0% a 100%.';
        if (r.faixaDe != null && r.faixaAte != null && r.faixaDe > r.faixaAte) return n + 'a faixa do equipamento está invertida.';
      }
    }
    return '';
  }

  /* ---------- Estoque (decisões do Zé, 05/11: usa o saldo do Compras e baixa os ingredientes) ---------- */

  const FATOR = { G: ['KG', 0.001], KG: ['KG', 1], ML: ['LT', 0.001], LT: ['LT', 1], L: ['LT', 1] };
  const base = (qtd, un) => { const f = FATOR[un]; return f ? [qtd * f[1], f[0]] : [qtd, un]; };
  /**
   * Converte a quantidade da ficha (ex.: 60 KG) para a unidade do estoque do produto (ex.: SC de 25 KG = 2,4).
   * Usa a mesma unidade, kg↔g e l↔ml, ou o conteúdo de uma unidade do produto (quantidade individual ou a
   * transformação do receituário). Sem caminho de conversão, devolve null (a baixa fica pendente).
   */
  function converter(qtd, unidade, produto) {
    if (!produto || !(qtd >= 0)) return null;
    if (unidade === produto.unidade) return arred(qtd, 4);
    const [q, b] = base(qtd, unidade);
    if (FATOR[produto.unidade] && FATOR[produto.unidade][0] === b) return arred(q / FATOR[produto.unidade][1], 4);
    const conteudos = [];
    if (produto.quantidadeIndividual > 0 && produto.unidadeIndividual) conteudos.push(base(produto.quantidadeIndividual, produto.unidadeIndividual));
    if (produto.transformacao && produto.transformacao.quantidade > 0) conteudos.push(base(produto.transformacao.quantidade, produto.transformacao.unidade));
    const c = conteudos.find(([v, u]) => u === b && v > 0);
    return c ? arred(q / c[0], 4) : null;
  }

  /** Produto com estoque: o pedido sai do que está livre; o que faltar vira produção, arredondada ao passo. */
  function aProduzir(qtd, livre, formato) {
    const doEstoque = arred(Math.max(0, Math.min(qtd, livre || 0)));
    const falta = arred(qtd - doEstoque);
    const p = passo(formato);
    const produzir = falta > 0 ? (p ? arred(Math.ceil(falta / p - 1e-9) * p) : falta) : 0;
    return { doEstoque, produzir };
  }

  /** Reposição sugerida quando o estoque livre fica abaixo do mínimo: completa até o máximo (ou o mínimo). */
  function sugestaoReposicao(livre, c) {
    if (!c || c.estoqueMin == null || livre >= c.estoqueMin) return 0;
    const alvo = c.estoqueMax != null ? c.estoqueMax : c.estoqueMin;
    let q = alvo - livre;
    const p = passo(c.formato);
    if (p) q = Math.ceil(q / p - 1e-9) * p;
    if (c.producaoMax != null && q > c.producaoMax) q = c.producaoMax;
    return q > 0 ? arred(q) : 0;
  }

  /* ---------- Custos (fórmulas C1–C5 aprovadas pelo Zé em 05/11/2026) ---------- */

  const centavos = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  /** Custo de um minuto do cargo: salário vigente × (1 + encargos) ÷ (horas por mês × 60). */
  function custoMinuto(salario, { horasMes, encargosPct } = {}) {
    if (!(salario > 0) || !(horasMes > 0)) return null;
    return (salario * (1 + (Number(encargosPct) || 0) / 100)) / (horasMes * 60);
  }
  /**
   * Custo de um plano (planoDaFicha) para a quantidade dele:
   *  C1 ingredientes = Σ quantidade na unidade do estoque × custo da unidade;
   *  C2 mão de obra  = Σ tempo de equipe × custo do minuto do cargo;
   *  C3 energia      = Σ tempo do equipamento (com os processos repetidos) ÷ 60 × consumo por hora × preço;
   *  C4 total        = C1 + C2 + C3.
   * f.custoIngrediente(x) → R$ ou null; f.custoMinuto(recurso) → R$/min ou null; f.precoEnergia(tipo) → R$ ou null.
   * O que não dá para calcular entra em `faltas` (o total fica parcial).
   */
  function custoDoPlano(plano, f) {
    let ingredientes = 0; let maoDeObra = 0; let energia = 0;
    const faltas = new Set();
    plano.etapas.forEach((e) => {
      e.ingredientes.forEach((x) => { const v = f.custoIngrediente(x); if (v == null) faltas.add('custo ou conversão de ingrediente'); else ingredientes += v; });
      e.recursos.forEach((r) => {
        if (r.tempoEquipe > 0) { const m = f.custoMinuto(r); if (m == null) faltas.add('salário do cargo ou horas por mês'); else maoDeObra += r.tempoEquipe * m; }
        const bem = r.bem;
        if (bem && bem.energia && bem.energia !== 'nenhuma' && r.tempo > 0) {
          const preco = f.precoEnergia(bem.energia);
          if (preco == null) faltas.add(bem.energia === 'gas' ? 'preço do gás' : 'preço do kWh');
          else energia += (r.tempo / 60) * (Number(bem.consumoHora) || 0) * preco;
        }
      });
    });
    return { ingredientes: centavos(ingredientes), maoDeObra: centavos(maoDeObra), energia: centavos(energia), total: centavos(ingredientes + maoDeObra + energia), faltas: [...faltas] };
  }
  /** C5: valor sugerido = custo × (1 + margem) + R$ 0,01 (planilha); margem pontual ou, se vazia, a do grupo. */
  function valorSugerido(custoUnitario, margemPontual, margemGrupo) {
    const m = margemPontual != null && margemPontual !== '' ? Number(margemPontual) : margemGrupo != null ? Number(margemGrupo) : null;
    if (!(custoUnitario > 0) || m == null || Number.isNaN(m)) return null;
    return centavos(custoUnitario * (1 + m) + 0.01);
  }

  /* ---------- Mapa de produção ---------- */

  /**
   * Agrupa as tarefas do mapa. Cada tarefa: { ordemId, produto, processo, setor, janela, ... }.
   * horario = janela de demanda; processo = processo da etapa (modelo "por etapa"); setor = local
   * da etapa; produto = a ordem inteira, de cima a baixo (modelo "por produto") [35:05].
   */
  function agrupar(tarefas, visao) {
    // [título, ordem]; ordem null = grupo "sem …", que vai para o fim.
    const chave = {
      horario: (t) => [t.janela || 'Sem horário', t.janela || null],
      processo: (t) => [nomeDe(PROCESSOS, t.processo) || 'Sem processo', t.processo ? String(PROCESSOS.findIndex((p) => p[0] === t.processo)).padStart(2, '0') : null],
      setor: (t) => [t.setor || 'Sem local', t.setor || null],
      turno: (t) => { const x = turnoDe(t.janelaDe); return [x || 'Sem horário', x === 'Manhã' ? '1' : x === 'Tarde' ? '2' : null]; },
      cargo: (t) => [t.cargo || 'Sem cargo definido', t.cargo || null],
      produto: (t) => [t.produto + ' · ' + t.quantidadeTexto, (t.janela || '') + t.ordemId],
    }[visao] || ((t) => [t.janela || '', t.janela || '']);
    const grupos = new Map();
    for (const t of tarefas) {
      const [titulo, ordem] = chave(t);
      if (!grupos.has(titulo)) grupos.set(titulo, { titulo, ordem, tarefas: [] });
      grupos.get(titulo).tarefas.push(t);
    }
    return [...grupos.values()].sort((a, b) => (a.ordem == null) - (b.ordem == null) || String(a.ordem).localeCompare(String(b.ordem), 'pt-BR'));
  }

  /** Situação da ordem a partir das etapas. */
  function situacaoOrdem(o) {
    if (o.status === 'cancelada') return 'cancelada';
    const e = o.etapas || [];
    if (e.length && e.every((x) => x.fim)) return 'pronta';
    if (e.some((x) => x.inicio)) return 'em_producao';
    return 'aguardando';
  }
  const SITUACOES_ORDEM = { aguardando: ['Aguardando', 'neutro'], em_producao: ['Em produção', 'info'], pronta: ['Pronta', 'positivo'], cancelada: ['Cancelada', 'negativo'] };

  /**
   * Relatório por produto no período (pela data de entrega): pedido, produzido (ordens prontas), abastecido
   * (real), sobra e descarte. Pedidos cancelados não entram.
   */
  function relatorio(pedidos, ordens, de, ate) {
    const dentro = (dia) => (!de || dia >= de) && (!ate || dia <= ate);
    const r = new Map();
    const linha = (id) => { if (!r.has(id)) r.set(id, { produtoId: id, pedido: 0, produzido: 0, real: 0, sobra: 0, descarte: 0 }); return r.get(id); };
    pedidos.filter((p) => p.status !== 'cancelado' && p.status !== 'rascunho' && dentro(p.dataEntrega)).forEach((p) => p.itens.forEach((i) => {
      const l = linha(i.produtoId);
      l.pedido += i.quantidade || 0;
      l.real += i.recebido ?? i.real ?? 0;
      l.sobra += i.sobra || 0;
      l.descarte += i.descarte || 0;
    }));
    ordens.filter((o) => o.status !== 'cancelada' && situacaoOrdem(o) === 'pronta' && dentro(o.dataEntrega)).forEach((o) => { linha(o.produtoId).produzido += o.quantidade; });
    return [...r.values()].map((l) => ({ ...l, pedido: arred(l.pedido), produzido: arred(l.produzido), real: arred(l.real), sobra: arred(l.sobra), descarte: arred(l.descarte), desperdicio: l.real > 0 ? arred(l.descarte / l.real, 4) : 0 }));
  }

  /** Fechamento da folha: real, sobra e descarte não podem passar do que existe. */
  function validarFechamento(itens) {
    for (const i of itens) {
      for (const k of ['real', 'sobra', 'descarte']) if (i[k] != null && !(i[k] >= 0)) return 'Os valores não podem ser negativos.';
      if ((i.sobra || 0) + (i.descarte || 0) > (i.real || 0) + EPS) return 'Sobra + descarte não podem passar do que foi produzido (' + i.nome + ').';
    }
    return '';
  }

  const minutos = (m) => {
    const t = Math.round(Number(m) || 0);
    if (t < 60) return t + ' min';
    return Math.floor(t / 60) + ' h' + (t % 60 ? ' ' + String(t % 60).padStart(2, '0') + ' min' : '');
  };
  const pct = (f) => Math.round((Number(f) || 0) * 100) + '%';

  return {
    PROCESSOS, PARTES, NIVEIS, CATEGORIAS, ENERGIAS, UNIDADE_CONSUMO, EXATIDOES, ACOMPANHAMENTOS, CONFERENCIAS, VISOES,
    SITUACOES_PEDIDO, SITUACOES_ORDEM, nomeDe, arred,
    fornada, meia, passo, validarFormato, ehMultiplo, utensilios, multiplos, resumoFormato, validarQuantidade, validarConfigProduto,
    tempoEfetivo, naFaixa, emKg, ingredientesPara, lotes, planoDaFicha, perda, validarFicha,
    converter, aProduzir, sugestaoReposicao, turnoDe,
    centavos, custoMinuto, custoDoPlano, valorSugerido,
    agrupar, situacaoOrdem, relatorio, validarFechamento, minutos, pct,
  };
});
