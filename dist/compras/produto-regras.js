/*
 * Cadastro de produtos — regras puras portadas do S1 (SISTEMA_CAIXA, shared/src/produtos):
 * regras.ts (descrição, como se compra, preço, promoções), regras-cadastro.ts (estoque por embalagem,
 * balança, EAN na criação, maiúsculas), semelhanca-de-nome.ts e codigo-interno.ts. Sem código externo PR-XXXX-XXXX
 * (decisão do Zé: o código de barras já identifica o produto).
 * Sem DOM e sem armazenamento: testadas em Node (tests/compras-produto.cjs).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzProdutoRegras = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const arredondar = (valor, casas = 2) => { const f = 10 ** casas; return Math.round((Number(valor) || 0) * f) / f; };
  const maiusculo = (t) => String(t ?? '').trim().toUpperCase();

  /* ---------- Descrição e nome ---------- */

  /** NOME + QUANTIDADE (até 3 casas) + MEDIDA. Gramatura 0 não aparece (regras.ts: montarDescricao). */
  function montarDescricao(nome, quantidade, medida) {
    const n = Number.parseFloat(String(quantidade ?? '').replace(',', '.')) || 0;
    const q = n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : '';
    return [maiusculo(nome), q, maiusculo(medida)].filter(Boolean).join(' ');
  }

  /** Validação de quantidade da transformação: "DENTRO DA EMB (descricao) TEM [precisao] [qtd] [unidade]". */
  function montarValidacaoQtd(descricao, precisao, qtd, unidade) {
    const desc = String(descricao ?? '');
    if (!desc) return '';
    return 'DENTRO DA EMB (' + desc + ') TEM ' + maiusculo(precisao) + ' ' + (qtd ?? '') + ' ' + maiusculo(unidade);
  }

  const ROTULO_DA_EMBALAGEM = { SACO: 'Saco', PCT: 'Pacote', CX: 'Caixa', UN: 'Unidade', FD: 'Fardo', POTE: 'Pote', BAND: 'Bandeja', EMB: 'Embalagem', MIL: 'Milheiro', KG: 'Kg', LT: 'Litro' };

  /** Texto "como se compra" no formato oficial do S1 (regras.ts: montarComoSeCompra). */
  function montarComoSeCompra({ embalagem, cDe, quantidadeCaixa, medidaCompra, descricao, aproximado }) {
    const sigla = maiusculo(embalagem);
    if (!sigla) return '';
    const rotulo = (ROTULO_DA_EMBALAGEM[sigla] ?? sigla).toUpperCase();
    const preposicao = cDe === 'C/' ? 'COM' : 'DE';
    const medida = maiusculo(medidaCompra);
    const desc = String(descricao ?? '').trim();
    const quantidadeTexto = [aproximado ? 'APROXIMADAMENTE' : '', (quantidadeCaixa ?? '') + medida].filter(Boolean).join(' ');
    return [desc, '-', rotulo, preposicao, desc, quantidadeTexto].filter(Boolean).join(' ');
  }

  /** Só textos descritivos viram maiúsculas; códigos ficam intactos (regras-cadastro.ts). */
  const CAMPOS_DESCRITIVOS = ['descricao', 'nomeCatalogo', 'marca', 'setorEstoque', 'setorVenda1', 'setorVenda2', 'localVenda1', 'localVenda2'];
  function normalizarTextosProduto(p) {
    const r = { ...p };
    for (const c of CAMPOS_DESCRITIVOS) if (typeof r[c] === 'string') r[c] = r[c].toLocaleUpperCase('pt-BR');
    if (r.transformacao && r.transformacao.produtoReceituario) r.transformacao = { ...r.transformacao, produtoReceituario: r.transformacao.produtoReceituario.toLocaleUpperCase('pt-BR') };
    if (r.fiscal && r.fiscal.categoriaFiscal) r.fiscal = { ...r.fiscal, categoriaFiscal: r.fiscal.categoriaFiscal.toLocaleUpperCase('pt-BR') };
    return r;
  }

  /* ---------- Códigos ---------- */

  const PRIMEIRO_CODIGO_FORA_DA_FAIXA = 700000;
  const ULTIMO_CODIGO_DE_PRODUTO = 13129;
  /** Próximo código interno (sequência do PDV): maior da faixa normal + 1, com 5 dígitos (codigo-interno.ts). */
  function proximoCodigoInterno(codigosExistentes) {
    const nums = codigosExistentes.map((c) => Number(c)).filter((n) => Number.isFinite(n) && n < PRIMEIRO_CODIGO_FORA_DA_FAIXA);
    const maior = Math.max(ULTIMO_CODIGO_DE_PRODUTO, ...nums.map(Math.trunc));
    const prox = maior + 1;
    if (prox >= PRIMEIRO_CODIGO_FORA_DA_FAIXA) throw new Error('Faixa de código interno de produto esgotada');
    return String(prox).padStart(5, '0');
  }
  /** Na criação, EAN vazio recebe o código interno; EAN informado fica como veio (regras-cadastro.ts). */
  function codigoBarrasNaCriacao(codigoBarras, codigoInterno) {
    if (codigoBarras != null && String(codigoBarras).trim() !== '') return codigoBarras;
    return codigoInterno ? codigoInterno : null;
  }

  /* ---------- Duplicidade ---------- */

  /** Semelhança 0..100 por bigramas (Dice). Porte literal de semelhanca-de-nome.ts. */
  function semelhanca(a, b) {
    const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    const x = norm(a); const y = norm(b);
    if (!x || !y) return 0;
    if (x === y) return 100;
    const bigramas = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const p = s.slice(i, i + 2); m.set(p, (m.get(p) || 0) + 1); } return m; };
    const ba = bigramas(x); const bb = bigramas(y);
    if (!ba.size || !bb.size) return 0;
    let comuns = 0;
    for (const [p, n] of ba) comuns += Math.min(n, bb.get(p) || 0);
    const total = [...ba.values()].reduce((s, n) => s + n, 0) + [...bb.values()].reduce((s, n) => s + n, 0);
    return Math.round((2 * comuns * 100) / total);
  }
  const SEMELHANCA_MINIMA = 55;
  const MAX_SUGESTOES = 5;

  /**
   * Checagem do S1 na criação (produtos.service.ts: recusarDuplicados): EAN igual ou nome do catálogo
   * igual (sem diferenciar maiúsculas) pedem confirmação ("cadastrar mesmo assim"). Os parecidos
   * (semelhança ≥ 55, até 5) só informam e nunca decidem sozinhos.
   */
  function checarDuplicidade(novo, produtos, ignorarId) {
    const outros = produtos.filter((p) => p.id !== ignorarId);
    const nome = String(novo.nomeCatalogo || novo.descricao || '').trim();
    const ean = String(novo.codigoBarras || '').trim();
    const porBarras = ean ? outros.find((p) => String(p.codigoBarras || '') === ean) : null;
    const chave = nome.toLocaleUpperCase('pt-BR');
    const porNome = nome ? outros.find((p) => String(p.nomeCatalogo || p.descricao || '').trim().toLocaleUpperCase('pt-BR') === chave) : null;
    const parecidos = nome ? outros
      .filter((p) => p !== porNome)
      .map((p) => ({ produto: p, semelhanca: semelhanca(nome, p.nomeCatalogo || p.descricao) }))
      .filter((x) => x.semelhanca >= SEMELHANCA_MINIMA)
      .sort((a, b) => b.semelhanca - a.semelhanca)
      .slice(0, MAX_SUGESTOES) : [];
    const mensagens = [];
    if (porBarras) mensagens.push('Já existe o produto "' + porBarras.descricao + '" nesta loja com este código de barras.');
    if (porNome) mensagens.push('Já existe o produto "' + porNome.descricao + '" nesta loja.');
    return { porBarras, porNome, parecidos, bloqueia: Boolean(porBarras || porNome), mensagens };
  }

  /* ---------- Preço ---------- */

  /** Preço de venda = custo unitário × (1 + margem); margem do produto tem prioridade sobre a do grupo (regras.ts). */
  function calcularPrecoVenda({ auto, custo = 0, quantidadeCaixa = 1, margem, margemGrupo = 0, precoManual = 0, temProduto = true }) {
    if (!auto) return arredondar(precoManual);
    if (!temProduto) return 0;
    const unit = (Number(custo) || 0) / (Number(quantidadeCaixa) || 1);
    const m = margem != null ? Number(margem) : Number(margemGrupo) || 0;
    return arredondar(unit * (1 + m));
  }

  /* ---------- Promoções ---------- */
  // Dias no formato do S1: [seg, ter, qua, qui, sex, sab, dom].
  const DIAS_PROMO = [['seg', 'Seg'], ['ter', 'Ter'], ['qua', 'Qua'], ['qui', 'Qui'], ['sex', 'Sex'], ['sab', 'Sáb'], ['dom', 'Dom']];
  const minutos = (hhmm) => { if (!hhmm) return null; const [h, m] = String(hhmm).split(':'); const t = (parseInt(h || '', 10) || 0) * 60 + (parseInt(m || '', 10) || 0); return Number.isFinite(t) ? t : null; };
  const diasDe = (p) => (p.dias && p.dias.length === 7 ? p.dias : [true, true, true, true, true, true, true]);
  const janelaDe = (p) => ({ inicio: minutos(p.horaInicio) ?? 0, fim: minutos(p.horaFim) ?? 24 * 60 - 1 });

  function promocaoDentroDaValidade(validaAte, agora) {
    if (!validaAte) return true;
    const hoje = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0') + '-' + String(agora.getDate()).padStart(2, '0');
    return validaAte >= hoje;
  }
  function promocaoAtiva(promo, agora) {
    if (!promocaoDentroDaValidade(promo.validaAte, agora)) return false;
    const dia = (agora.getDay() + 6) % 7;
    if (promo.dias && promo.dias[dia] !== true) return false;
    const agoraMin = agora.getHours() * 60 + agora.getMinutes();
    const ini = minutos(promo.horaInicio); const fim = minutos(promo.horaFim);
    if (ini == null && fim == null) return true;
    return agoraMin >= (ini ?? -Infinity) && agoraMin <= (fim ?? Infinity);
  }
  function precoDaPromocao(promo, precoVenda) {
    if (promo.tipo === 'desconto' && promo.descontoFracao != null) return arredondar(precoVenda * (1 - Number(promo.descontoFracao)));
    if (promo.tipo === 'valor' && promo.valor != null) return arredondar(Number(promo.valor));
    return null;
  }
  /** Preço com a promoção vigente; empate → vence o MENOR preço (regras.ts). */
  function calcularPrecoVendaComPromocao({ precoVenda, promocoes = [], agora = new Date() }) {
    const pv = Number(precoVenda) || 0;
    const precos = promocoes.filter((p) => promocaoAtiva(p, agora)).map((p) => precoDaPromocao(p, pv)).filter((x) => x != null);
    return precos.length ? Math.min(...precos) : arredondar(pv);
  }
  function promocoesSeSobrepoem(a, b) {
    const da = diasDe(a); const db = diasDe(b);
    if (!da.some((m, i) => m && db[i])) return false;
    const ja = janelaDe(a); const jb = janelaDe(b);
    return ja.inicio <= jb.fim && jb.inicio <= ja.fim;
  }
  function validarPromocoesDoProduto(promocoes) {
    const erros = [];
    promocoes.forEach((p, i) => {
      const pos = 'Promoção ' + (i + 1);
      if (p.tipo === 'valor' && (p.valor == null || p.valor <= 0)) erros.push(pos + ': informe o valor promocional.');
      if (p.tipo === 'desconto') {
        if (p.descontoFracao == null) erros.push(pos + ': informe o percentual de desconto.');
        else if (p.descontoFracao <= 0 || p.descontoFracao > 1) erros.push(pos + ': o desconto precisa ficar entre 0% e 100%.');
      }
      const ini = minutos(p.horaInicio); const fim = minutos(p.horaFim);
      if (ini != null && fim != null && fim < ini) erros.push(pos + ': o término é anterior ao início. Promoção que vira o dia precisa ser dividida em duas.');
      if (!diasDe(p).some(Boolean)) erros.push(pos + ': marque ao menos um dia da semana.');
    });
    for (let a = 0; a < promocoes.length; a++) for (let b = a + 1; b < promocoes.length; b++) {
      if (promocoesSeSobrepoem(promocoes[a], promocoes[b])) erros.push('Promoções ' + (a + 1) + ' e ' + (b + 1) + ' se sobrepõem no mesmo dia e horário.');
    }
    return erros;
  }

  /* ---------- Validações de cadastro (regras-cadastro.ts) ---------- */

  /** Mínimo múltiplo da embalagem e ≥ 1 embalagem; máximo múltiplo e estritamente maior que o mínimo. */
  function validarEstoquePorEmbalagem({ quantidadeCaixa, estoqueMin, estoqueMax }) {
    const erros = [];
    const q = quantidadeCaixa ?? null; const min = estoqueMin ?? null; const max = estoqueMax ?? null;
    const multiplo = (v, b) => Number.isInteger(+(v / b).toFixed(9));
    if (q != null && q > 0) {
      if (min != null && min > 0) {
        if (min < q) erros.push({ campo: 'estoqueMin', mensagem: 'Estoque mínimo não pode ser menor que a Qt. embalagem (' + q + '). Use ' + q + ' ou mais.' });
        else if (!multiplo(min, q)) erros.push({ campo: 'estoqueMin', mensagem: 'Estoque mínimo deve ser múltiplo da Qt. embalagem (' + q + '). Ex.: ' + q + ', ' + q * 2 + ', ' + q * 3 + '.' });
      }
      if (max != null && max > 0 && !multiplo(max, q)) erros.push({ campo: 'estoqueMax', mensagem: 'Estoque máximo deve ser múltiplo da Qt. embalagem (' + q + '). Ex.: ' + q * 2 + ', ' + q * 3 + ', ' + q * 4 + '.' });
    }
    if (min != null && max != null && min > 0 && max > 0 && max <= min) erros.push({ campo: 'estoqueMax', mensagem: 'Estoque máximo deve ser maior que o mínimo (' + min + ').' });
    return erros;
  }
  const TECLA_BALANCA_FIXA = 0;
  function validarBalanca({ pesavel, validadeBalanca }) {
    if (pesavel !== true) return [];
    const d = validadeBalanca;
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 999) return ['Informe a validade da balança em dias (0 a 999).'];
    return [];
  }

  /**
   * Pendência de compra: liberado para compra com como se compra incompleto, sem estoque mínimo ou
   * máximo, ou sem fornecedor aprovado (doc 59 do S1). Diferença decidida pelo Zé (04/11/2026): "como se
   * compra" é incompleto quando falta embalagem, medida de compra ou quantidade — embalagem com 1 unidade
   * (ex.: CX DE 1 UN) é válida. No S1 a Qt. vem 1 por padrão e por isso "1" lá conta como não preenchido.
   */
  function pendenciasDeCompra(p, temFornecedorAprovado) {
    if (!p.liberadoCompra) return [];
    const faltas = [];
    if (!p.embalagem || !p.medidaCompra || !(Number(p.qtdEmbalagem) >= 1)) faltas.push('como se compra');
    if (p.estoqueMin == null || p.estoqueMin === '' || p.estoqueMax == null || p.estoqueMax === '') faltas.push('mínimo e máximo');
    if (!temFornecedorAprovado) faltas.push('fornecedor aprovado');
    return faltas;
  }

  /* ---------- Listagem ---------- */
  const ORDENACOES = [['recentes', 'Mais recentes'], ['antigos', 'Mais antigos'], ['az', 'Nome (A–Z)'], ['za', 'Nome (Z–A)'], ['codigo_asc', 'Código (crescente)'], ['codigo_desc', 'Código (decrescente)'], ['estoque', 'Menor estoque']];
  function ordenarProdutos(lista, chave) {
    const nome = (p) => String(p.descricao || '');
    const cod = (p) => String(p.codigoInterno || '');
    const quando = (p) => String(p.criadoEm || '');
    const cmp = {
      recentes: (a, b) => quando(b).localeCompare(quando(a)) || nome(a).localeCompare(nome(b), 'pt-BR'),
      antigos: (a, b) => quando(a).localeCompare(quando(b)) || nome(a).localeCompare(nome(b), 'pt-BR'),
      az: (a, b) => nome(a).localeCompare(nome(b), 'pt-BR'),
      za: (a, b) => nome(b).localeCompare(nome(a), 'pt-BR'),
      codigo_asc: (a, b) => cod(a).localeCompare(cod(b), 'pt-BR', { numeric: true }),
      codigo_desc: (a, b) => cod(b).localeCompare(cod(a), 'pt-BR', { numeric: true }),
      estoque: (a, b) => (Number(a.saldo) || 0) - (Number(b.saldo) || 0),
    }[chave] || ((a, b) => 0);
    return lista.slice().sort(cmp);
  }
  /** Página (1..n) de `tamanho` itens; devolve itens, total de páginas e a página corrigida. */
  function paginar(lista, pagina, tamanho) {
    const paginas = Math.max(1, Math.ceil(lista.length / tamanho));
    const p = Math.min(Math.max(1, pagina), paginas);
    return { itens: lista.slice((p - 1) * tamanho, p * tamanho), paginas, pagina: p };
  }
  /** Frase que confirma a inativação em lote (cuidado do "excluir em lote" do oficial). */
  const fraseInativacao = (n) => 'INATIVAR ' + n + ' PRODUTOS';

  return {
    arredondar, montarDescricao, montarValidacaoQtd, montarComoSeCompra, normalizarTextosProduto,
    proximoCodigoInterno, codigoBarrasNaCriacao,
    semelhanca, checarDuplicidade, SEMELHANCA_MINIMA,
    calcularPrecoVenda, DIAS_PROMO, calcularPrecoVendaComPromocao, promocaoDentroDaValidade, promocoesSeSobrepoem, validarPromocoesDoProduto,
    validarEstoquePorEmbalagem, TECLA_BALANCA_FIXA, validarBalanca, pendenciasDeCompra,
    ORDENACOES, ordenarProdutos, paginar, fraseInativacao,
  };
});
