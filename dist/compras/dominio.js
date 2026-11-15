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

  /* ---------- Cadastro de fornecedor (decisões do Rodrigo, 15/11/2026) ---------- */
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  /**
   * Categoria do fornecedor (decisão do Rodrigo, 15/11/2026): o que ele fornece, Produto OU Serviço (escolha única;
   * a opção de marcar os dois existiu por algumas horas e saiu). O dado continua em f.categorias (lista), agora com
   * um item só. Registro antigo com os dois não é decidido pelo sistema: fica como "sem categoria escolhida" (nome
   * vazio aqui), aparece em "Completar cadastro" e a pessoa escolhe ao editar; o que está gravado não é apagado.
   */
  const CATEGORIAS_FORNECEDOR = [['produto', 'Produto'], ['servico', 'Serviço']];
  const categoriasDe = (f) => CATEGORIAS_FORNECEDOR.filter(([id]) => Array.isArray(f && f.categorias) && f.categorias.includes(id));
  const categoriaFornecedor = (f) => { const c = categoriasDe(f); return c.length === 1 ? c[0][0] : ''; };
  const nomeCategoriasFornecedor = (f) => { const c = categoriasDe(f); return c.length === 1 ? c[0][1] : ''; };
  /**
   * Migração (marca d.migracoes.ramoFornecedor): o texto livre que o cadastro antigo chamava de "categoria"
   * (Bebidas, Laticínios, Mercearia…) é o ramo do fornecedor e passa para o campo f.ramo. Também desfaz a lista de
   * categorias que existiu só neste dia: quem tinha categoriaId recebe como ramo o nome que estava na lista. Nada é
   * classificado como Produto ou Serviço aqui: f.categorias fica vazio até alguém escolher. A lista antiga
   * d.categoriasFornecedor, se existir, fica no dado sem uso.
   */
  function migrarRamoFornecedor(d) {
    if (d.migracoes && d.migracoes.ramoFornecedor) return d;
    const lista = Array.isArray(d.categoriasFornecedor) ? d.categoriasFornecedor : [];
    for (const f of d.fornecedores || []) {
      const daLista = f.categoriaId ? lista.find((c) => c.id === f.categoriaId) : null;
      const texto = String(f.ramo || f.categoria || (daLista && daLista.nome) || '').trim();
      f.ramo = texto;
      delete f.categoria;
      delete f.categoriaId;
    }
    d.migracoes = { ...(d.migracoes || {}), ramoFornecedor: 1 };
    return d;
  }
  /** Quantas vezes o id aparece na chave dada, em qualquer nível do dado. */
  function contarVinculos(dado, chave, id) {
    if (!dado || typeof dado !== 'object') return 0;
    let n = 0;
    for (const [k, v] of Object.entries(dado)) n += k === chave && v === id ? 1 : contarVinculos(v, chave, id);
    return n;
  }
  /** Vínculos do fornecedor com produtos no documento do Compras: catálogo, histórico de compras, cotação e pedido. */
  const vinculosComProdutos = (d, fornecedorId) => contarVinculos({ ...d, fornecedores: null }, 'fornecedorId', fornecedorId);
  /**
   * Migração (marca d.migracoes.categoriaProdutoFornecedor; decisão do Rodrigo, 15/11/2026): o fornecedor que já
   * existia, está ligado a produtos (catálogo, histórico, cotação ou pedido) e ainda não tem categoria passa a ser
   * Produto. Quem já tem categoria marcada não é tocado; quem não tem vínculo com produto continua sem categoria.
   * Roda uma vez por documento: fornecedor cadastrado depois escolhe a categoria no formulário.
   */
  function migrarCategoriaProduto(d) {
    if (d.migracoes && d.migracoes.categoriaProdutoFornecedor) return d;
    for (const f of d.fornecedores || []) {
      if (Array.isArray(f.categorias) && f.categorias.length) continue;
      if (vinculosComProdutos(d, f.id)) f.categorias = ['produto'];
    }
    d.migracoes = { ...(d.migracoes || {}), categoriaProdutoFornecedor: 1 };
    return d;
  }
  /**
   * Fornecedor é sempre por CNPJ (decisão do Rodrigo, 15/11/2026; o caminho de pessoa física saiu). Cadastro antigo
   * com outro documento (um CPF, de quando existia pessoa física) continua abrindo: esta função devolve esse
   * documento antigo, ou '' quando o cadastro já tem CNPJ ou não tem documento.
   */
  function documentoAntigoFornecedor(f) {
    const doc = String((f && f.documento) || '').trim();
    return doc && digitos(doc).length !== 14 ? doc : '';
  }
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  /** Regime tributário do fornecedor pessoa jurídica: só guarda a opção escolhida, não entra em cálculo nenhum. */
  const REGIMES_TRIBUTARIOS = [['mei', 'MEI'], ['simples', 'Simples Nacional'], ['presumido', 'Lucro Presumido'], ['real', 'Lucro Real'], ['nao-informado', 'Não informado']];
  /** O que o representante é na empresa (lista fixa, escolha única; campo opcional). */
  const CARGOS_REPRESENTANTE = [['proprietario', 'Proprietário'], ['socio-proprietario', 'Sócio-proprietário'], ['diretor-geral', 'Diretor geral'], ['diretor-comercial', 'Diretor comercial'],
    ['gerente-geral', 'Gerente geral'], ['gerente-comercial', 'Gerente comercial'], ['supervisor-geral', 'Supervisor geral'], ['supervisor-comercial', 'Supervisor comercial'],
    ['representante-comercial', 'Representante comercial'], ['administrador', 'Administrador'], ['financeiro', 'Financeiro'], ['procurador', 'Procurador'], ['outro', 'Outro']];
  /**
   * Aniversário do vendedor ou prestador, só mês e ano (AAAA-MM; decisão do Rodrigo, 15/11/2026). Quem tem a data
   * completa antiga (vendedorNascimento) e ainda não tem o campo novo mostra o mês e o ano dela; a data antiga
   * continua gravada, sem uso. Campo novo vazio ('') é vazio de verdade (a pessoa apagou).
   */
  function aniversarioVendedor(f) {
    if (!f) return '';
    if (typeof f.vendedorAniversario === 'string') return f.vendedorAniversario;
    return /^\d{4}-\d{2}-\d{2}$/.test(f.vendedorNascimento || '') ? f.vendedorNascimento.slice(0, 7) : '';
  }
  /** Quem é o contato da 2ª etapa, pela categoria: prestador (Serviço) ou vendedor (Produto, e enquanto nada foi escolhido). */
  function quemVendeFornecedor(categorias) {
    const c = Array.isArray(categorias) ? categorias : [];
    return c.length === 1 && c[0] === 'servico' ? 'prestador' : 'vendedor';
  }
  /** Etapas do cadastro (decisão do Rodrigo, 15/11/2026), nomes padronizados "Dados do …". A 2ª depende da categoria. */
  function etapasFornecedor(categorias) {
    const c = Array.isArray(categorias) ? categorias : [];
    return ['Dados da empresa', 'Dados do ' + quemVendeFornecedor(c), 'Dados do financeiro', 'Dados do representante', 'Vínculos'];
  }
  /**
   * Migração (marca d.migracoes.vendedorFornecedor): no cadastro em etapas o contato do fornecedor é o vendedor ou
   * prestador de serviço (2ª etapa). Nome, WhatsApp e e-mail continuam nos mesmos campos (contatoNome, whatsapp, email:
   * a cotação segue lendo f.whatsapp); só a data de nascimento, que era do fornecedor pessoa física, passa para
   * vendedorNascimento. Nada é apagado sem ir para o campo novo.
   */
  function migrarVendedorFornecedor(d) {
    if (d.migracoes && d.migracoes.vendedorFornecedor) return d;
    for (const f of d.fornecedores || []) {
      if (f.nascimento && !f.vendedorNascimento) f.vendedorNascimento = f.nascimento;
      delete f.nascimento;
    }
    d.migracoes = { ...(d.migracoes || {}), vendedorFornecedor: 1 };
    return d;
  }
  /* ---------- Prestadores de serviço e as funções deles (decisão do Rodrigo, 15/11/2026) ---------- */
  /** Lista inicial de funções do prestador; depois dela, a lista cresce pelo "Acrescentar opção" do cadastro. */
  const FUNCOES_PRESTADOR_INICIAIS = ['Advogado', 'Advogado trabalhista', 'Advogado tributarista', 'Departamento pessoal', 'Contador', 'Mecânico',
    'Mecânico de máquinas', 'Mecânico de refrigeração', 'Mecânico eletricista', 'Eletricista', 'Pintor', 'Marceneiro', 'Carpinteiro', 'Serralheiro',
    'Encanador', 'Pedreiro', 'Técnico de informática', 'Dedetizador'];
  /** Id da função inicial a partir do nome: igual em todo aparelho, para dois aparelhos não criarem a mesma função duas vezes. */
  const idFuncaoPrestador = (nome) => 'fp-' + semAcento(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  /** Função com o mesmo nome (sem diferenciar maiúsculas nem acentos), ou undefined. */
  const funcaoPrestadorIgual = (lista, nome) => (lista || []).find((x) => semAcento(x.nome) === semAcento(nome));
  /** O que impede acrescentar a função: nome vazio, longo demais ou repetido. */
  function validarFuncaoPrestador(nome, lista) {
    const n = String(nome || '').trim();
    if (!n) return 'Informe o nome da função.';
    if (n.length > 60) return 'O nome da função deve ter no máximo 60 caracteres.';
    if (funcaoPrestadorIgual(lista, n)) return 'Já existe uma função com este nome.';
    return '';
  }
  /**
   * Migração (marca d.migracoes.prestadoresFornecedor): (1) cria o cadastro d.funcoesPrestador ({ id, nome, ativa })
   * com a lista inicial, se ainda estiver vazio; (2) no fornecedor de categoria Serviço, o contato único vira o
   * Prestador 1 em f.prestadores ([{ id, nome, whatsapp, email, aniversario, funcoes: [ids] }]). Os campos de
   * contato do fornecedor (contatoNome, whatsapp, email, vendedorAniversario) continuam como estão e seguem
   * espelhando o primeiro prestador: é deles que a lista e a cotação leem. Nada é apagado. Uma vez por documento.
   */
  function migrarPrestadoresFornecedor(d) {
    if (d.migracoes && d.migracoes.prestadoresFornecedor) return d;
    if (!Array.isArray(d.funcoesPrestador)) d.funcoesPrestador = [];
    if (!d.funcoesPrestador.length) d.funcoesPrestador = FUNCOES_PRESTADOR_INICIAIS.map((nome) => ({ id: idFuncaoPrestador(nome), nome, ativa: true }));
    for (const f of d.fornecedores || []) {
      if (categoriaFornecedor(f) !== 'servico' || (Array.isArray(f.prestadores) && f.prestadores.length)) continue;
      f.prestadores = [{ id: 'pr-' + f.id, nome: String(f.contatoNome || ''), whatsapp: String(f.whatsapp || ''), email: String(f.email || ''), aniversario: aniversarioVendedor(f), funcoes: [] }];
    }
    d.migracoes = { ...(d.migracoes || {}), prestadoresFornecedor: 1 };
    return d;
  }
  const telefoneRuim = (v) => { const n = digitos(v); return Boolean(n) && (n.length < 8 || String(v).length > 30); };
  /**
   * O que impede salvar, etapa por etapa: devolve um texto por etapa ('' quando a etapa está em ordem). Obrigatórios: categoria
   * (Produto ou Serviço, uma só), nome (nome fantasia ou razão social), CNPJ
   * com dígito verificador e WhatsApp do vendedor ou prestador. O aniversário do vendedor (mês e ano) é opcional (o CPF dele não é
   * mais pedido; valor antigo, se houver, fica guardado sem uso).
   * regras = { cnpjValid } do field-validation.js. A exigência vale ao salvar: fornecedor antigo sem esses
   * dados continua abrindo e sendo usado.
   */
  function validarFornecedorEtapas(f, regras, { fornecedores = [], funcoes = null } = {}) {
    const aniversarioRuim = (v) => {
      if (!v) return '';
      const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(v);
      if (!m || +m[1] < 1900) return 'Aniversário inválido: use mês e ano (MM/AAAA).';
      return v > new Date().toISOString().slice(0, 7) ? 'O aniversário não pode ser um mês futuro.' : '';
    };
    const basico = () => {
      const cats = Array.isArray(f.categorias) ? f.categorias : [];
      if (!cats.length) return 'Escolha a categoria do fornecedor: Produto ou Serviço.';
      if (cats.length > 1) return 'Escolha só uma categoria: Produto ou Serviço.';
      if (cats.some((c) => !CATEGORIAS_FORNECEDOR.some(([id]) => id === c))) return 'Categoria do fornecedor inválida.';
      if (!String(f.nome || '').trim()) return 'Informe o nome fantasia ou a razão social.';
      if (fornecedores.some((x) => x.id !== f.id && semAcento(x.nome) === semAcento(f.nome))) return 'Já existe um fornecedor com este nome.';
      if (!regras.cnpjValid(f.documento)) return 'Informe um CNPJ válido (14 dígitos).';
      if (f.regimeTributario && !REGIMES_TRIBUTARIOS.some(([id]) => id === f.regimeTributario)) return 'Regime tributário inválido.';
      // Endereço é opcional; o que vier preenchido precisa estar no formato.
      const e = f.endereco || {};
      if (e.cep && digitos(e.cep).length !== 8) return 'O CEP deve ter 8 dígitos.';
      if (e.uf && !/^[A-Z]{2}$/.test(e.uf)) return 'UF inválida.';
      return '';
    };
    const vendedor = () => {
      if (!digitos(f.whatsapp)) return 'Informe o WhatsApp do vendedor ou prestador.';
      if (telefoneRuim(f.whatsapp)) return 'WhatsApp inválido.';
      if (f.email && !emailValido(f.email)) return 'E-mail do vendedor ou prestador inválido.';
      // Aniversário do vendedor: só mês e ano (AAAA-MM), opcional; ano de 1900 até o mês atual.
      if (aniversarioRuim(f.vendedorAniversario)) return aniversarioRuim(f.vendedorAniversario);
      // Prestadores (categoria Serviço): o 1º espelha o contato acima; do 2º em diante, nome obrigatório e o resto no formato.
      const prestadores = Array.isArray(f.prestadores) ? f.prestadores : [];
      for (let i = 0; i < prestadores.length; i++) {
        const p = prestadores[i] || {}; const quem = 'prestador ' + (i + 1);
        if (i > 0 && !String(p.nome || '').trim()) return 'Informe o nome do ' + quem + ' (ou remova o quadro dele).';
        if (i > 0 && telefoneRuim(p.whatsapp)) return 'WhatsApp do ' + quem + ' inválido.';
        if (i > 0 && p.email && !emailValido(p.email)) return 'E-mail do ' + quem + ' inválido.';
        if (i > 0 && aniversarioRuim(p.aniversario)) return 'Aniversário do ' + quem + ' inválido: use mês e ano (MM/AAAA), sem mês futuro.';
        if (funcoes && (p.funcoes || []).some((id) => !funcoes.some((x) => x.id === id))) return 'Função do ' + quem + ' inválida.';
      }
      return '';
    };
    const contato = (c, quem) => {
      const x = c || {};
      if (telefoneRuim(x.whatsapp)) return 'WhatsApp do ' + quem + ' inválido.';
      if (x.email && !emailValido(x.email)) return 'E-mail do ' + quem + ' inválido.';
      return '';
    };
    const representante = () => {
      const cargo = f.representante && f.representante.cargo;
      if (cargo && !CARGOS_REPRESENTANTE.some(([id]) => id === cargo)) return 'Cargo do representante inválido.';
      return contato(f.representante, 'representante');
    };
    // Vínculos: grupos de despesa (Serviço) vão por id; a lista só guarda o vínculo, sem lançamento nem regra de dinheiro.
    const vinculos = () => (f.gruposDespesaIds != null && (!Array.isArray(f.gruposDespesaIds) || f.gruposDespesaIds.some((id) => !id || typeof id !== 'string')) ? 'Grupo de despesa inválido.' : '');
    return [basico(), vendedor(), contato(f.financeiro, 'financeiro'), representante(), vinculos()];
  }
  /** Primeiro impedimento do cadastro inteiro, ou ''. */
  const validarFornecedor = (f, regras, ctx) => validarFornecedorEtapas(f, regras, ctx).find(Boolean) || '';

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
    CATEGORIAS_FORNECEDOR, categoriaFornecedor, nomeCategoriasFornecedor, migrarRamoFornecedor, migrarCategoriaProduto, vinculosComProdutos, contarVinculos, documentoAntigoFornecedor, validarFornecedor,
    validarFornecedorEtapas, REGIMES_TRIBUTARIOS, CARGOS_REPRESENTANTE, etapasFornecedor, quemVendeFornecedor, aniversarioVendedor, migrarVendedorFornecedor,
    FUNCOES_PRESTADOR_INICIAIS, idFuncaoPrestador, funcaoPrestadorIgual, validarFuncaoPrestador, migrarPrestadoresFornecedor,
    avaliarItem, limitesDaMargem, quantidadeDentroDaMargem, MOTIVOS, novaReferencia, COLUNAS_MATRIZ, contarMatriz,
    situacaoEstoque, SITUACOES_ESTOQUE, sugestaoReposicao, pendenciasDeTeto,
    aplicarRecebimento, SITUACOES_PEDIDO,
    moeda, numero, dataCurta, dataLonga, lerNumero,
  };
});
