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
   * Migração (marca d.migracoes.nomesPadrao; ordem do Rodrigo, 17/11/2026): os nomes e endereços JÁ GRAVADOS em
   * fornecedores, clientes e empresas entram no padrão de nomes do sistema (inicial maiúscula em cada palavra, "de/da/do/e"
   * em minúsculas) e os e-mails ficam em minúsculas. Roda uma vez por documento. Nada se perde: cada valor trocado fica
   * guardado em d.migracoes.nomesPadrao.antes como [onde, campo, valor antigo], para poder ser desfeito.
   * formatar: a regra central de nomes (formatSystemName), passada por quem chama; sem ela, não faz nada e não marca.
   * Produtos ficam de fora (seguem a regra própria, em maiúsculas).
   */
  function migrarNomesPadrao(d, formatar, agora) {
    if (typeof formatar !== 'function' || (d.migracoes && d.migracoes.nomesPadrao)) return d;
    const antes = [];
    const troca = (obj, campo, onde, novoDe) => {
      if (!obj || typeof obj[campo] !== 'string' || !obj[campo].trim()) return;
      const novo = novoDe(obj[campo].trim());
      if (novo !== obj[campo]) { antes.push([onde, campo, obj[campo]]); obj[campo] = novo; }
    };
    const nome = (obj, campo, onde) => troca(obj, campo, onde, formatar);
    const mail = (obj, campo, onde) => troca(obj, campo, onde, (v) => v.toLocaleLowerCase('pt-BR'));
    const endereco = (e, onde) => ['logradouro', 'complemento', 'bairro', 'cidade'].forEach((c) => nome(e, c, onde + '.endereco'));
    const contato = (c, onde) => { nome(c, 'nome', onde); mail(c, 'email', onde); };
    for (const f of d.fornecedores || []) {
      const o = 'fornecedor:' + f.id;
      ['nome', 'razaoSocial', 'contatoNome'].forEach((c) => nome(f, c, o));
      mail(f, 'email', o); endereco(f.endereco, o);
      contato(f.financeiro, o + '.financeiro'); contato(f.representante, o + '.representante');
      (f.prestadores || []).forEach((p) => contato(p, o + '.prestador:' + p.id));
    }
    for (const c of d.clientes || []) {
      const o = 'cliente:' + c.id;
      ['nome', 'razaoSocial', 'nomeFantasia', 'contatoNome'].forEach((k) => nome(c, k, o));
      mail(c, 'email', o); endereco(c.endereco, o);
      contato(c.financeiro, o + '.financeiro'); contato(c.representante, o + '.representante');
    }
    for (const e of (Array.isArray(d.empresas) ? d.empresas : d.empresa ? [d.empresa] : [])) {
      const o = 'empresa:' + (e.id || 'matriz');
      ['razaoSocial', 'nomeFantasia'].forEach((k) => nome(e, k, o));
      endereco(e.endereco, o);
      (e.responsaveis || []).forEach((r) => { const or = o + '.responsavel:' + r.id; ['nome', 'nacionalidade', 'profissao'].forEach((k) => nome(r, k, or)); mail(r, 'email', or); endereco(r.endereco, or); });
    }
    d.migracoes = { ...(d.migracoes || {}), nomesPadrao: { em: agora || new Date().toISOString(), antes } };
    return d;
  }
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
    const n = digitos(doc).length;
    // 11 dígitos é CPF de pessoa física (voltou em 16/11/2026); só o que não é CPF nem CNPJ é "antigo".
    return doc && n !== 14 && n !== 11 ? doc : '';
  }
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  /** Regime tributário do fornecedor pessoa jurídica: só guarda a opção escolhida, não entra em cálculo nenhum. */
  const REGIMES_TRIBUTARIOS = [['mei', 'MEI'], ['simples', 'Simples Nacional'], ['presumido', 'Lucro Presumido'], ['real', 'Lucro Real'], ['imune-isenta', 'Imune / Isenta'], ['nao-informado', 'Não informado']];
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
    return /^\d{4}-\d{2}-\d{2}$/.test(f.vendedorNascimento || '') ? f.vendedorNascimento.slice(5) : '';
  }
  /**
   * Aniversário só com dia e mês, sem ano (decisão de 16/11/2026): guardado como "MM-DD" (ex.: "08-15"). Dado antigo
   * continua legível: "AAAA-MM-DD" vira dia e mês; "AAAA-MM" (mês e ano, formato do dia anterior) mostra só o mês e fica
   * como está enquanto a pessoa não escolher o dia. Nunca inventa ano. 29/02 vale.
   */
  function aniversarioPartes(v) {
    const t = String(v || '');
    let m = /^(\d{2})-(\d{2})$/.exec(t);
    if (m) return { mes: m[1], dia: m[2], legado: false };
    m = /^\d{4}-(\d{2})-(\d{2})$/.exec(t);
    if (m) return { mes: m[1], dia: m[2], legado: true };
    m = /^\d{4}-(\d{2})$/.exec(t);
    if (m) return { mes: m[1], dia: '', legado: true };
    return { mes: '', dia: '', legado: false };
  }
  /** Texto de erro do aniversário, ou ''. Aceita '', "MM-DD" e o formato antigo "AAAA-MM" já gravado. */
  function aniversarioRuim(v) {
    if (!v) return '';
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return +v.slice(0, 4) >= 1900 ? '' : 'Aniversário inválido: escolha o dia e o mês.';
    const m = /^(\d{2})-(\d{2})$/.exec(v);
    if (!m) return 'Aniversário incompleto: escolha o dia e o mês.';
    const mes = +m[1]; const dia = +m[2];
    if (mes < 1 || mes > 12) return 'Aniversário inválido: escolha um mês.';
    if (dia < 1 || dia > diasNoMes(2000, mes - 1)) return 'Aniversário inválido: esse mês não tem dia ' + dia + '.';
    return '';
  }
  /**
   * Data de aniversário do cliente pessoa física ("MM-DD"; decisão do Rodrigo, 17/11/2026: só dia e mês, não mais a
   * data de nascimento). Quem tem só a data de nascimento antiga mostra o dia e o mês dela; nada é migrado em massa.
   */
  function aniversarioCliente(c) {
    if (!c) return '';
    if (typeof c.aniversario === 'string' && c.aniversario) return c.aniversario;
    const n = String(c.nascimento || '');
    return n.length === 10 && n[4] === '-' && n[7] === '-' && !aniversarioRuim(n.slice(5)) ? n.slice(5) : '';
  }
  const MESES_ABREVIADOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  /** Aniversário como "25/jan" (dia e mês abreviado; pedido do Rodrigo, 17/11/2026), ou '' quando falta o dia ou o mês. */
  function aniversarioTexto(v) {
    const p = aniversarioPartes(v);
    return p.dia && p.mes && MESES_ABREVIADOS[Number(p.mes) - 1] ? p.dia + '/' + MESES_ABREVIADOS[Number(p.mes) - 1] : '';
  }
  /** Quem é o contato da 2ª etapa, pela categoria: prestador (Serviço) ou vendedor (Produto, e enquanto nada foi escolhido). */
  function quemVendeFornecedor(categorias) {
    const c = Array.isArray(categorias) ? categorias : [];
    return c.length === 1 && c[0] === 'servico' ? 'prestador' : 'vendedor';
  }
  /** Etapas do cadastro (decisão do Rodrigo, 15/11/2026), nomes padronizados "Dados do …". A 2ª depende da categoria. */
  function etapasFornecedor(categorias) {
    const c = Array.isArray(categorias) ? categorias : [];
    // Nomes de 18/11/2026: a 2ª depende da categoria; a 3ª e a 4ª dizem quem é a pessoa (não confundir com as condições de pagamento).
    return ['Dados da empresa', quemVendeFornecedor(c) === 'prestador' ? 'Dados do Prestador de Serviço' : 'Dados do Vendedor', 'Dados do Responsável Financeiro', 'Dados do Responsável Legal', 'Vínculos', 'Contrato'];
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
  /* ---------- Contrato do fornecedor, dentro dos dados do financeiro (decisão do Rodrigo, 16/11/2026) ---------- */
  const FORMAS_PAGAMENTO_CONTRATO = [['dinheiro', 'Dinheiro'], ['boleto', 'Boleto'], ['pix', 'PIX'], ['transferencia', 'Transferência']];
  /** O que o cadastro oferece hoje (a lista acima segue valendo para o que já foi gravado: PIX e transferência não se perdem). */
  const FORMAS_PAGAMENTO_FORNECEDOR = [['boleto', 'Boleto'], ['dinheiro', 'Dinheiro']];
  const RECORRENCIAS_CONTRATO = [['visita', 'Por visita'], ['solicitacao', 'Por solicitação'], ['hora', 'Por hora'], ['dia', 'Por dia'], ['mes', 'Por mês'], ['ano', 'Por ano'], ['personalizado', 'Personalizado']];
  /**
   * Tipo de recorrência do CLIENTE (18/11/2026): as mesmas do fornecedor mais "Compra Mensal" (antes de Personalizado), com o término mensal
   * em c.terminoMensal ({ tipo: nunca | data | ocorrencias }). Só descreve; não gera cobrança, boleto nem lançamento.
   */
  const RECORRENCIAS_CLIENTE = [...RECORRENCIAS_CONTRATO.slice(0, -1), ['compra-mensal', 'Compra Mensal'], RECORRENCIAS_CONTRATO[RECORRENCIAS_CONTRATO.length - 1]];
  /** Cliente mensal (18/11/2026): boleto, vencimento todo dia 10 e período do dia 1 ao último dia do mês. Regra fixa, só informativa. */
  const CLIENTE_MENSAL = { formaPagamento: 'boleto', vencimentoDia: 10 };
  /** Período de referência de um mês (mes de 1 a 12): do dia 1 ao último dia, com fevereiro certo em ano bissexto. */
  function periodoMensal(ano, mes) {
    const ultimo = new Date(ano, mes, 0).getDate(); const p = (n) => String(n).padStart(2, '0');
    return { inicio: ano + '-' + p(mes) + '-01', fim: ano + '-' + p(mes) + '-' + p(ultimo) };
  }
  /** Término da recorrência (personalizada ou Compra Mensal): '' quando em ordem. */
  function validarTermino(t) {
    if (!t || !['nunca', 'data', 'ocorrencias'].includes(t.tipo)) return 'Escolha quando a recorrência termina.';
    if (t.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(t.data || '')) return 'Informe a data de término.';
    if (t.tipo === 'ocorrencias' && !(Number.isInteger(t.ocorrencias) && t.ocorrencias >= 1 && t.ocorrencias <= 9999)) return 'Informe a quantidade de ocorrências (número inteiro a partir de 1).';
    return '';
  }
  /** Frase do término, ex.: "até 31/12/2027" (vazio quando incompleto). */
  function resumoTermino(t) {
    if (!t || validarTermino(t)) return '';
    return t.tipo === 'nunca' ? 'sem data de término' : t.tipo === 'data' ? 'até ' + t.data.slice(8, 10) + '/' + t.data.slice(5, 7) + '/' + t.data.slice(0, 4) : 'por ' + t.ocorrencias + (t.ocorrencias === 1 ? ' ocorrência' : ' ocorrências');
  }
  const UNIDADES_REPETICAO = [['hora', 'Hora'], ['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']];
  const POSICOES_MES = [['1', 'Primeira'], ['2', 'Segunda'], ['3', 'Terceira'], ['4', 'Quarta'], ['ultima', 'Última']];
  const DIAS_SEMANA_LONGOS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  /**
   * Recorrência personalizada (modelo do Calendário e dos Lembretes): { intervalo, unidade, diasSemana[], mensal, termina }.
   * unidade: hora | dia | semana | mes | ano. diasSemana: 0 (domingo) a 6, só na unidade semana.
   * mensal (só na unidade mes): { modo: 'dia', dia: 1-31 } ou { modo: 'posicao', posicao: '1'-'4'|'ultima', diaSemana: 0-6 }.
   * termina: { tipo: 'nunca' } | { tipo: 'data', data: 'AAAA-MM-DD' } | { tipo: 'ocorrencias', ocorrencias: N }.
   * Só descreve a repetição: nada aqui gera pagamento, lançamento ou data futura.
   */
  function validarRecorrenciaPersonalizada(p) {
    if (!p || typeof p !== 'object') return 'Configure a recorrência personalizada.';
    if (!Number.isInteger(p.intervalo) || p.intervalo < 1 || p.intervalo > 999) return 'Repetir a cada: informe um número inteiro a partir de 1.';
    if (!UNIDADES_REPETICAO.some(([id]) => id === p.unidade)) return 'Escolha a unidade da repetição (hora, dia, semana, mês ou ano).';
    if (p.unidade === 'semana') {
      const d = p.diasSemana;
      if (!Array.isArray(d) || !d.length) return 'Escolha ao menos um dia da semana.';
      if (d.some((x) => !Number.isInteger(x) || x < 0 || x > 6)) return 'Dia da semana inválido.';
    }
    if (p.unidade === 'mes') {
      const m = p.mensal;
      if (!m || (m.modo !== 'dia' && m.modo !== 'posicao')) return 'Escolha como repetir no mês: dia do mês ou dia da semana.';
      if (m.modo === 'dia' && !(Number.isInteger(m.dia) && m.dia >= 1 && m.dia <= 31)) return 'Escolha o dia do mês (1 a 31).';
      if (m.modo === 'posicao') {
        if (!POSICOES_MES.some(([id]) => id === String(m.posicao))) return 'Escolha a posição do dia no mês (primeira, segunda… última).';
        if (!(Number.isInteger(m.diaSemana) && m.diaSemana >= 0 && m.diaSemana <= 6)) return 'Escolha o dia da semana.';
      }
    }
    return validarTermino(p.termina);
  }
  /** Frase da recorrência personalizada, ex.: "Repete a cada 2 semanas, às segundas e sextas-feiras, sem data de término." */
  function resumoRecorrenciaPersonalizada(p) {
    if (!p || validarRecorrenciaPersonalizada(p)) return '';
    const n = p.intervalo; const u = p.unidade;
    const cada = (sing, plural, un) => (n === 1 ? sing : 'a cada ' + n + ' ' + un[plural]);
    let txt;
    if (u === 'hora') txt = cada('toda hora', 1, ['hora', 'horas']);
    else if (u === 'dia') txt = n === 1 ? 'todos os dias' : 'a cada ' + n + ' dias';
    else if (u === 'ano') txt = n === 1 ? 'todo ano' : 'a cada ' + n + ' anos';
    else if (u === 'semana') {
      txt = n === 1 ? 'toda semana' : 'a cada ' + n + ' semanas';
      const dias = [...new Set(p.diasSemana)].sort((a, b) => a - b);
      const util = dias.every((x) => x >= 1 && x <= 5);
      const nomes = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
      const lista = dias.map((x, i) => nomes[x] + (util ? (i === dias.length - 1 ? '-feiras' : '') : (x >= 1 && x <= 5 ? '-feiras' : '')));
      const junto = lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1] : lista[0];
      txt += ', ' + (util ? 'às ' : 'aos ') + junto;
    } else {
      const m = p.mensal;
      if (m.modo === 'dia') txt = n === 1 ? 'todo dia ' + m.dia + ' de cada mês' : 'a cada ' + n + ' meses, no dia ' + m.dia;
      else {
        const fem = m.diaSemana >= 1 && m.diaSemana <= 5;
        const ordF = { 1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta', ultima: 'última' }; const ordM = { 1: 'primeiro', 2: 'segundo', 3: 'terceiro', 4: 'quarto', ultima: 'último' };
        const dia = DIAS_SEMANA_LONGOS[m.diaSemana].toLowerCase();
        const pos = (fem ? ordF : ordM)[String(m.posicao)];
        txt = n === 1 ? (fem ? 'toda ' : 'todo ') + pos + ' ' + dia + ' do mês' : 'a cada ' + n + ' meses, ' + (fem ? 'na ' : 'no ') + pos + ' ' + dia;
      }
    }
    const t = p.termina;
    const fim = t.tipo === 'nunca' ? 'sem data de término' : t.tipo === 'data' ? 'até ' + t.data.slice(8, 10) + '/' + t.data.slice(5, 7) + '/' + t.data.slice(0, 4) : 'por ' + t.ocorrencias + (t.ocorrencias === 1 ? ' ocorrência' : ' ocorrências');
    return 'Repete ' + txt + ', ' + fim + '.';
  }
  const POR_RECORRENCIA = { visita: 'por visita', solicitacao: 'por solicitação', hora: 'por hora', dia: 'por dia', mes: 'por mês', ano: 'por ano', personalizado: 'conforme recorrência personalizada', 'compra-mensal': 'por compra mensal' };
  /** Frase informativa sob o campo Valor, ex.: "R$ 150,00 por visita." Só texto: não calcula total nem cria pagamento. */
  function resumoValorRecorrencia(centavos, recorrencia) {
    if (!Number.isInteger(centavos) || centavos < 0) return '';
    const como = POR_RECORRENCIA[recorrencia];
    return moeda(centavos / 100) + (como ? ' ' + como : '') + '.';
  }
  /** Só o índice escolhido fica guardado: o sistema NÃO calcula reajuste nem valor futuro. */
  const REAJUSTES_CONTRATO = [['sem', 'Sem reajuste'], ['salario-minimo', 'Salário mínimo'], ['ipca', 'IPCA'], ['igpm', 'IGP-M'], ['inpc', 'INPC'], ['percentual', 'Percentual fixo']];
  /**
   * Migração (marca d.migracoes.contratoFinanceiro): início, fim, valor e observações do contrato, que por um dia
   * ficaram na etapa "Contrato", passam a pertencer ao quadro "Tem contrato?" dos dados do financeiro. Os campos
   * continuam em f.contrato; quem já tinha algum deles preenchido passa a ter contrato.tem = true, para os dados
   * continuarem à vista. Nada é apagado. Uma vez por documento.
   */
  function migrarContratoFinanceiro(d) {
    if (d.migracoes && d.migracoes.contratoFinanceiro) return d;
    for (const f of d.fornecedores || []) {
      const c = f.contrato;
      if (!c || typeof c !== 'object' || typeof c.tem === 'boolean') continue;
      c.tem = Boolean(c.inicio || c.fim || c.valorCentavos != null || String(c.observacoes || '').trim());
    }
    d.migracoes = { ...(d.migracoes || {}), contratoFinanceiro: 1 };
    return d;
  }
  const telefoneRuim = (v) => { const n = digitos(v); return Boolean(n) && (n.length < 8 || String(v).length > 30); };
  /**
   * Contrato (quadro "Tem contrato?" dos dados do financeiro; vale para fornecedor e cliente): só é conferido quando tem.
   * Tudo opcional, menos o percentual quando o reajuste é "Percentual fixo". O valor e o índice são só informados: sem fórmula.
   */
  function validarContratoFinanceiro(c) {
    if (c == null) return '';
    if (typeof c !== 'object') return 'Contrato inválido.';
    if (!c.tem) return '';
    const naLista = (lista, v) => !v || lista.some(([id]) => id === v);
    if (!naLista(FORMAS_PAGAMENTO_CONTRATO, c.formaPagamento)) return 'Forma de pagamento do contrato inválida.';
    if (!naLista(RECORRENCIAS_CLIENTE, c.recorrencia)) return 'Recorrência do contrato inválida.';
    if (c.recorrencia === 'compra-mensal') { const m = validarTermino(c.terminoMensal); if (m) return m; }
    if (c.clienteMensal && c.formaPagamento !== CLIENTE_MENSAL.formaPagamento) return 'Cliente mensal paga por boleto.';
    if (c.recorrencia === 'personalizado') { const m = validarRecorrenciaPersonalizada(c.recorrenciaPersonalizada); if (m) return m; }
    if (c.diaPagamento != null && c.diaPagamento !== '' && c.diaPagamento !== 'sexta') return 'Dia de pagamento inválido.';
    const sm = c.salarioMinimo;
    if (sm != null) {
      if (typeof sm !== 'object') return 'Referência do salário mínimo inválida.';
      if (sm.ativo && !(typeof sm.percentual === 'number' && sm.percentual > 0 && sm.percentual <= 10000)) return 'Informe o percentual do salário mínimo (maior que 0).';
    }
    if (c.vencimentoDia != null && (!Number.isInteger(c.vencimentoDia) || c.vencimentoDia < 1 || c.vencimentoDia > 31)) return 'O dia do vencimento deve ser de 1 a 31.';
    const dataRuim = (v) => Boolean(v) && !/^\d{4}-\d{2}-\d{2}$/.test(v);
    if (dataRuim(c.vencimentoData)) return 'Confira a data de vencimento: use DD/MM/AA.';
    if (c.valorCentavos != null && (!Number.isInteger(c.valorCentavos) || c.valorCentavos < 0)) return 'Valor do contrato inválido.';
    if (dataRuim(c.inicio) || dataRuim(c.fim)) return 'Confira as datas do contrato: use DD/MM/AA.';
    if (c.inicio && c.fim && c.fim < c.inicio) return 'O término do contrato não pode ser antes do início.';
    if (!naLista(REAJUSTES_CONTRATO, c.reajuste)) return 'Reajuste do contrato inválido.';
    if (c.reajuste === 'percentual' && !(typeof c.reajustePercentual === 'number' && c.reajustePercentual > 0 && c.reajustePercentual <= 100)) return 'Informe o percentual do reajuste (maior que 0 e até 100).';
    if (String(c.observacoes || '').length > 2000) return 'As observações do contrato devem ter no máximo 2000 caracteres.';
    return '';
  }
  /**
   * O que impede salvar, etapa por etapa: devolve um texto por etapa ('' quando a etapa está em ordem). Obrigatórios: categoria
   * (Produto ou Serviço, uma só), nome (nome fantasia ou razão social), CNPJ
   * com dígito verificador e WhatsApp do vendedor ou prestador. O aniversário do vendedor (mês e ano) é opcional (o CPF dele não é
   * mais pedido; valor antigo, se houver, fica guardado sem uso).
   * regras = { cnpjValid } do field-validation.js. A exigência vale ao salvar: fornecedor antigo sem esses
   * dados continua abrindo e sendo usado.
   */
  function validarFornecedorEtapas(f, regras, { fornecedores = [], funcoes = null } = {}) {
    const basico = () => {
      const pf = f.tipoPessoa === 'fisica';
      const cats = Array.isArray(f.categorias) ? f.categorias : [];
      if (!cats.length) return 'Escolha a categoria do fornecedor: Produto ou Serviço.';
      if (cats.length > 1) return 'Escolha só uma categoria: Produto ou Serviço.';
      if (cats.some((c) => !CATEGORIAS_FORNECEDOR.some(([id]) => id === c))) return 'Categoria do fornecedor inválida.';
      if (!String(f.nome || '').trim()) return pf ? 'Informe o nome completo.' : 'Informe o nome fantasia ou a razão social.';
      if (fornecedores.some((x) => x.id !== f.id && semAcento(x.nome) === semAcento(f.nome))) return 'Já existe um fornecedor com este nome.';
      if (pf ? !regras.cpfValid(f.documento) : !regras.cnpjValid(f.documento)) return pf ? 'Informe um CPF válido (11 dígitos).' : 'Informe um CNPJ válido (14 dígitos).';
      if (!pf && f.regimeTributario && !REGIMES_TRIBUTARIOS.some(([id]) => id === f.regimeTributario)) return 'Regime tributário inválido.';
      // Endereço é opcional; o que vier preenchido precisa estar no formato.
      const e = f.endereco || {};
      if (e.cep && digitos(e.cep).length !== 8) return 'O CEP deve ter 8 dígitos.';
      if (e.uf && !/^[A-Z]{2}$/.test(e.uf)) return 'UF inválida.';
      // Pessoa física: endereço completo (só o complemento é opcional).
      if (pf) {
        const falta = [['cep', 'CEP'], ['logradouro', 'rua'], ['numero', 'número'], ['bairro', 'bairro'], ['cidade', 'cidade'], ['uf', 'UF']].filter(([k]) => !String(e[k] || '').trim()).map(([, n]) => n);
        if (falta.length) return 'Pessoa física: informe o endereço completo (falta ' + falta.join(', ') + ').';
      }
      return '';
    };
    const vendedor = () => {
      if (!digitos(f.whatsapp)) return 'Informe o WhatsApp do vendedor ou prestador.';
      if (telefoneRuim(f.whatsapp)) return 'WhatsApp inválido.';
      if (f.email && !emailValido(f.email)) return 'E-mail do vendedor ou prestador inválido.';
      // Aniversário do vendedor: dia e mês (MM-DD), opcional; não existe ano.
      if (aniversarioRuim(f.vendedorAniversario)) return aniversarioRuim(f.vendedorAniversario);
      // Prestadores (categoria Serviço): o 1º espelha o contato acima; do 2º em diante, nome obrigatório e o resto no formato.
      const prestadores = Array.isArray(f.prestadores) ? f.prestadores : [];
      for (let i = 0; i < prestadores.length; i++) {
        const p = prestadores[i] || {}; const quem = 'prestador ' + (i + 1);
        if (i > 0 && !String(p.nome || '').trim()) return 'Informe o nome do ' + quem + ' (ou remova o quadro dele).';
        if (i > 0 && telefoneRuim(p.whatsapp)) return 'WhatsApp do ' + quem + ' inválido.';
        if (i > 0 && p.email && !emailValido(p.email)) return 'E-mail do ' + quem + ' inválido.';
        if (i > 0 && aniversarioRuim(p.aniversario)) return 'Aniversário do ' + quem + ' inválido: escolha o dia e o mês.';
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
    // Contrato (quadro "Tem contrato?" dos dados do financeiro): só é conferido quando tem. Tudo opcional, menos o
    // percentual quando o reajuste é "Percentual fixo". O valor e o índice são só informados: sem fórmula.
    const contrato = () => validarContratoFinanceiro(f.contrato);
    // O contrato (condições) é conferido na etapa do responsável financeiro (3ª); a 6ª confere as atividades, o modelo e os campos adicionais.
    return [basico(), vendedor(), contato(f.financeiro, 'financeiro') || contrato(), representante(), vinculos(), validarContratoDocumento(f.contrato)];
  }
  /* ---------- Contratos: atividades, modelos e documento (18/11/2026) ----------
   * Atividades e responsabilidades INCLUÍDAS e NÃO INCLUÍDAS no contrato são listas de itens { id, texto, ref? } (ref = id do grupo ou
   * subgrupo de despesa de onde o item foi escolhido, no formato "grupo" ou "grupo|subgrupo"). Um item não repete na lista nem
   * está nas duas. Modelo de contrato: coleção d.modelosContrato; o contrato do fornecedor guarda uma CÓPIA do que veio do modelo
   * (cláusulas, atividades, campos adicionais e a versão), então mudar o modelo depois nunca altera contratos antigos.
   * Nada aqui escreve cláusula jurídica: só entra o texto que alguém cadastrou. */
  const chaveTexto = (t) => semAcento(String(t == null ? '' : t)).replace(/\s+/g, ' ');
  const TIPOS_CAMPO_ADICIONAL = [['texto', 'Texto'], ['data', 'Data'], ['numero', 'Número'], ['moeda', 'Valor em reais']];
  const RENOVACOES_CONTRATO = [['', 'Não informada'], ['nenhuma', 'Sem renovação'], ['automatica', 'Renovação automática'], ['manual', 'Renovação manual, a combinar']];
  const LIMITES_CONTRATO = { atividades: 60, clausulas: 60, campos: 20, texto: 200, clausulaTitulo: 120, clausulaTexto: 4000, nomeModelo: 80 };
  /** Confere uma lista de atividades. contexto serve só para a mensagem. '' quando em ordem. */
  function validarListaAtividades(lista, contexto) {
    if (lista == null) return '';
    if (!Array.isArray(lista)) return 'Atividades ' + contexto + ': formato inválido.';
    if (lista.length > LIMITES_CONTRATO.atividades) return 'No máximo ' + LIMITES_CONTRATO.atividades + ' atividades ' + contexto + '.';
    const vistos = new Set();
    for (const i of lista) {
      const t = String((i && i.texto) == null ? '' : i.texto).trim();
      if (!t) return 'Há uma atividade ' + contexto + ' sem texto.';
      if (t.length > LIMITES_CONTRATO.texto) return 'Uma atividade ' + contexto + ' passa de ' + LIMITES_CONTRATO.texto + ' caracteres.';
      const k = chaveTexto(t);
      if (vistos.has(k)) return 'A atividade "' + t + '" está repetida ' + contexto + '.';
      vistos.add(k);
    }
    return '';
  }
  /** Incluídas e não incluídas juntas: cada uma em ordem e nenhuma atividade nas duas. */
  function validarAtividadesContrato(incluidas, excluidas) {
    const a = validarListaAtividades(incluidas, 'incluídas no contrato'); if (a) return a;
    const b = validarListaAtividades(excluidas, 'não incluídas no contrato'); if (b) return b;
    const inc = new Map((incluidas || []).map((i) => [chaveTexto(i.texto), i])); const refs = new Set((incluidas || []).map((i) => i.ref).filter(Boolean));
    for (const e of excluidas || []) {
      if (inc.has(chaveTexto(e.texto)) || (e.ref && refs.has(e.ref))) return 'A atividade "' + String(e.texto).trim() + '" não pode estar nas incluídas e nas não incluídas ao mesmo tempo.';
    }
    return '';
  }
  /**
   * Tenta pôr um texto numa lista de atividades. Devolve { item } ou { erro }. outra = a lista oposta; ignorarId = o item
   * que está sendo editado (não conta como repetido). ref é opcional (escolha pela lista de grupos de despesa).
   */
  function novaAtividade(lista, outra, texto, { ref = '', ignorarId = '', id = '' } = {}) {
    const t = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
    if (!t) return { erro: 'Escreva a atividade.' };
    if (t.length > LIMITES_CONTRATO.texto) return { erro: 'A atividade passa de ' + LIMITES_CONTRATO.texto + ' caracteres.' };
    const k = chaveTexto(t);
    if ((lista || []).some((i) => i.id !== ignorarId && (chaveTexto(i.texto) === k || (ref && i.ref === ref)))) return { erro: 'Esta atividade já está na lista.' };
    if ((outra || []).some((i) => chaveTexto(i.texto) === k || (ref && i.ref === ref))) return { erro: 'Esta atividade já está na outra lista (incluídas e não incluídas não se misturam).' };
    if (!ignorarId && (lista || []).length >= LIMITES_CONTRATO.atividades) return { erro: 'No máximo ' + LIMITES_CONTRATO.atividades + ' atividades por lista.' };
    return { item: { id: id || ignorarId || 'at-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36), texto: t, ...(ref ? { ref } : {}) } };
  }
  /** Modelo de contrato (d.modelosContrato). modelos = os já cadastrados (para o nome não repetir). '' quando em ordem. */
  function validarModeloContrato(m, { modelos = [] } = {}) {
    if (!m || typeof m !== 'object') return 'Modelo inválido.';
    const nome = String(m.nome || '').trim();
    if (!nome) return 'Informe o nome do tipo de contrato.';
    if (nome.length > LIMITES_CONTRATO.nomeModelo) return 'O nome do tipo de contrato passa de ' + LIMITES_CONTRATO.nomeModelo + ' caracteres.';
    if (modelos.some((x) => x.id !== m.id && chaveTexto(x.nome) === chaveTexto(nome))) return 'Já existe um tipo de contrato com este nome.';
    if (String(m.descricao || '').length > 1000) return 'A descrição passa de 1000 caracteres.';
    const cl = Array.isArray(m.clausulas) ? m.clausulas : [];
    if (cl.length > LIMITES_CONTRATO.clausulas) return 'No máximo ' + LIMITES_CONTRATO.clausulas + ' cláusulas.';
    for (const c of cl) {
      if (!String((c && c.texto) || '').trim()) return 'Há uma cláusula sem texto (escreva o texto ou remova a cláusula).';
      if (String(c.titulo || '').length > LIMITES_CONTRATO.clausulaTitulo) return 'O título de uma cláusula passa de ' + LIMITES_CONTRATO.clausulaTitulo + ' caracteres.';
      if (String(c.texto).length > LIMITES_CONTRATO.clausulaTexto) return 'O texto de uma cláusula passa de ' + LIMITES_CONTRATO.clausulaTexto + ' caracteres.';
    }
    const at = validarAtividadesContrato(m.incluidas, m.excluidas); if (at) return at;
    if (m.valorCentavos != null && (!Number.isInteger(m.valorCentavos) || m.valorCentavos < 0)) return 'Valor do modelo inválido.';
    if (m.recorrencia && !RECORRENCIAS_CONTRATO.some(([id]) => id === m.recorrencia)) return 'Recorrência do modelo inválida.';
    if (m.vigenciaMeses != null && !(Number.isInteger(m.vigenciaMeses) && m.vigenciaMeses >= 1 && m.vigenciaMeses <= 600)) return 'A vigência do modelo deve ser um número inteiro de meses, de 1 a 600.';
    if (m.renovacao && !RENOVACOES_CONTRATO.some(([id]) => id === m.renovacao)) return 'Regra de renovação inválida.';
    const campos = Array.isArray(m.camposAdicionais) ? m.camposAdicionais : [];
    if (campos.length > LIMITES_CONTRATO.campos) return 'No máximo ' + LIMITES_CONTRATO.campos + ' campos adicionais.';
    const rot = new Set();
    for (const c of campos) {
      const r = String((c && c.rotulo) || '').trim();
      if (!r) return 'Há um campo adicional sem nome.';
      if (r.length > 60) return 'O nome de um campo adicional passa de 60 caracteres.';
      if (!TIPOS_CAMPO_ADICIONAL.some(([id]) => id === c.tipo)) return 'Tipo inválido no campo adicional "' + r + '".';
      if (rot.has(chaveTexto(r))) return 'O campo adicional "' + r + '" está repetido.';
      rot.add(chaveTexto(r));
    }
    return '';
  }
  /** Soma meses a uma data ISO (dia 31 vira o último dia do mês quando preciso). */
  function somarMesesIso(iso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return '';
    const ano = +m[1]; const mes = +m[2] - 1 + n; const alvo = new Date(ano, mes, 1); const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    return isoData(new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(+m[3], ultimo)));
  }
  /**
   * Aplica um modelo ao contrato do fornecedor SEM sobrescrever o que já foi preenchido. ct = o contrato como está no formulário.
   * Devolve { patch, notas }: patch traz só o que muda; notas diz, em português, o que foi preenchido e o que foi mantido.
   * Cláusulas e campos adicionais passam a ser os do modelo (cópia com a versão); atividades do modelo entram junto das que já
   * existem, sem repetir e sem contradizer a outra lista.
   */
  function aplicarModeloAoContrato(ct, m) {
    const c = ct || {}; const notas = []; const patch = { modeloId: m.id, modeloNome: m.nome, modeloVersao: m.versao || 1 };
    patch.clausulas = (m.clausulas || []).map((x) => ({ titulo: String(x.titulo || '').trim(), texto: String(x.texto || '').trim() }));
    patch.camposAdicionaisDef = (m.camposAdicionais || []).map((x) => ({ id: x.id, rotulo: String(x.rotulo).trim(), tipo: x.tipo, obrigatorio: Boolean(x.obrigatorio) }));
    let inc = [...(c.atividadesIncluidas || [])]; let exc = [...(c.atividadesExcluidas || [])]; let novas = 0; let ignoradas = 0;
    for (const i of m.incluidas || []) { const r = novaAtividade(inc, exc, i.texto, { ref: i.ref || '' }); if (r.item) { inc.push(r.item); novas++; } else ignoradas++; }
    for (const i of m.excluidas || []) { const r = novaAtividade(exc, inc, i.texto, { ref: i.ref || '' }); if (r.item) { exc.push(r.item); novas++; } else ignoradas++; }
    patch.atividadesIncluidas = inc; patch.atividadesExcluidas = exc;
    notas.push(patch.clausulas.length + (patch.clausulas.length === 1 ? ' cláusula carregada' : ' cláusulas carregadas') + ' do modelo "' + m.nome + '" (versão ' + patch.modeloVersao + ').');
    if (novas) notas.push(novas + (novas === 1 ? ' atividade acrescentada.' : ' atividades acrescentadas.'));
    if (ignoradas) notas.push(ignoradas + (ignoradas === 1 ? ' atividade do modelo não entrou' : ' atividades do modelo não entraram') + ' (já existiam ou estavam na outra lista).');
    const cheio = (v) => v != null && v !== '';
    if (m.valorCentavos != null) { if (cheio(c.valorCentavos)) notas.push('Valor mantido: já estava preenchido.'); else { patch.valorCentavos = m.valorCentavos; notas.push('Valor preenchido pelo modelo.'); } }
    if (m.recorrencia) { if (cheio(c.recorrencia)) notas.push('Recorrência mantida: já estava preenchida.'); else { patch.recorrencia = m.recorrencia; notas.push('Recorrência preenchida pelo modelo.'); } }
    if (m.vigenciaMeses) {
      if (cheio(c.fim)) notas.push('Término da vigência mantido: já estava preenchido.');
      else if (cheio(c.inicio)) { patch.fim = somarMesesIso(c.inicio, m.vigenciaMeses); notas.push('Término da vigência calculado pelo modelo (' + m.vigenciaMeses + ' meses a partir do início).'); }
      else notas.push('Vigência do modelo: ' + m.vigenciaMeses + ' meses. Informe o início da vigência para calcular o término.');
    }
    if (m.renovacao) { if (cheio(c.renovacao)) notas.push('Renovação mantida: já estava preenchida.'); else { patch.renovacao = m.renovacao; notas.push('Renovação preenchida pelo modelo.'); } }
    return { patch, notas };
  }
  /** Valores dos campos adicionais do contrato do fornecedor (modelo + valores digitados): '' quando em ordem. */
  function validarContratoDocumento(c) {
    if (!c || typeof c !== 'object') return '';
    const at = validarAtividadesContrato(c.atividadesIncluidas, c.atividadesExcluidas); if (at) return at;
    const defs = Array.isArray(c.camposAdicionaisDef) ? c.camposAdicionaisDef : []; const vals = c.camposAdicionais && typeof c.camposAdicionais === 'object' ? c.camposAdicionais : {};
    for (const d of defs) {
      const v = vals[d.id]; if (v == null || v === '') continue;
      if (d.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return 'Confira a data do campo "' + d.rotulo + '": use DD/MM/AA.';
      if (d.tipo === 'numero' && !Number.isFinite(Number(String(v).replace(',', '.')))) return 'O campo "' + d.rotulo + '" deve ser um número.';
      if (d.tipo === 'moeda' && !(Number.isInteger(v) && v >= 0)) return 'O campo "' + d.rotulo + '" deve ser um valor em reais.';
      if (d.tipo === 'texto' && String(v).length > 500) return 'O campo "' + d.rotulo + '" passa de 500 caracteres.';
    }
    return '';
  }
  /** O que falta para o contrato poder ser impresso ou enviado como documento definitivo. [] = completo. */
  function faltasDoContrato(f) {
    const c = (f && f.contrato) || {}; const faltas = [];
    if (!c.tem) return ['Marque "Tem contrato?" nos dados do responsável financeiro.'];
    if (!String((f && (f.razaoSocial || f.nome)) || '').trim()) faltas.push('nome ou razão social do fornecedor');
    if (!digitos(f && f.documento)) faltas.push('CNPJ ou CPF do fornecedor');
    if (!c.modeloId) faltas.push('tipo de contrato (modelo)');
    if (!(c.clausulas || []).length) faltas.push('ao menos uma cláusula (vem do tipo de contrato)');
    if (!(c.atividadesIncluidas || []).length) faltas.push('ao menos uma atividade incluída no contrato');
    if (!c.inicio) faltas.push('início da vigência');
    const vals = c.camposAdicionais || {};
    for (const d of c.camposAdicionaisDef || []) if (d.obrigatorio && (vals[d.id] == null || vals[d.id] === '')) faltas.push('campo "' + d.rotulo + '"');
    return faltas;
  }
  /** Primeiro impedimento do cadastro inteiro, ou ''. */
  const validarFornecedor = (f, regras, ctx) => validarFornecedorEtapas(f, regras, ctx).find(Boolean) || '';

  /* ---------- Clientes (VND - Clientes; 17/11/2026) ----------
   * Quatro modalidades: Pessoa Física ou Jurídica × Cadastro Simples (uma página) ou Completo (etapas). O mesmo registro
   * muda de Simples para Completo sem duplicar: os campos de cada tipo ficam guardados no registro, e salvar só mexe nos
   * do tipo e da modalidade em uso. Só informação cadastral: nada aqui gera cobrança, pagamento ou sorteio. */
  const TIPOS_PESSOA_CLIENTE = [['fisica', 'PF - Pessoa Física'], ['juridica', 'PJ - Pessoa Jurídica']];
  const TIPOS_CADASTRO_CLIENTE = [['simples', 'Simples'], ['completo', 'Completo']];
  /** Nome para listas e buscas: a pessoa, ou o nome fantasia (ou a razão social) da empresa. */
  function nomeCliente(c) {
    if (!c) return '';
    return String(c.tipoPessoa === 'juridica' ? (c.nomeFantasia || c.razaoSocial) : c.nome || '').trim();
  }
  /** Etapas do cadastro completo (o simples é uma página só, sem etapas). */
  function etapasCliente(tipoPessoa, cadastro) {
    if (cadastro !== 'completo') return [];
    return tipoPessoa === 'juridica'
      // 17/11/2026 (Rodrigo): o contato e o financeiro são uma etapa só; depois, o responsável geral.
      ? ['Dados da empresa', 'Dados do responsável financeiro da empresa', 'Dados do responsável geral da empresa', 'Revisão dos dados da empresa']
      : ['Dados pessoais', 'Endereço', 'Informações complementares', 'Revisão dos dados'];
  }
  const dataIsoValida = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return false; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]; };
  /**
   * O que impede salvar, uma mensagem por etapa ('' quando em ordem). Simples: um item só. Completo: um por etapa.
   * Obrigatórios — PF simples: nome, WhatsApp, e-mail e data de nascimento (sem CPF nem endereço); PF completo: os mesmos
   * mais CPF válido; PJ: CNPJ válido, razão social e WhatsApp. O resto é opcional, mas o que vier preenchido precisa estar no
   * formato. regras = { cpfValid, cnpjValid } do field-validation.js.
   */
  function validarClienteEtapas(c, regras, { clientes = [] } = {}) {
    const outros = clientes.filter((x) => x.id !== c.id);
    const pj = c.tipoPessoa === 'juridica'; const completo = c.cadastro === 'completo';
    const enderecoRuim = () => {
      const e = c.endereco || {};
      if (e.cep && digitos(e.cep).length !== 8) return 'O CEP deve ter 8 dígitos.';
      if (e.uf && !/^[A-Z]{2}$/.test(e.uf)) return 'UF inválida.';
      return '';
    };
    const contatoRuim = (x, quem) => {
      const v = x || {};
      if (telefoneRuim(v.whatsapp)) return 'WhatsApp do ' + quem + ' inválido.';
      if (v.email && !emailValido(v.email)) return 'E-mail do ' + quem + ' inválido.';
      return '';
    };
    const whatsEmail = (emailObrigatorio) => {
      if (!digitos(c.whatsapp)) return 'Informe o WhatsApp.';
      if (telefoneRuim(c.whatsapp)) return 'WhatsApp inválido.';
      if (emailObrigatorio && !String(c.email || '').trim()) return 'Informe o e-mail.';
      if (c.email && !emailValido(c.email)) return 'E-mail inválido.';
      return '';
    };
    const pessoa = () => {
      if (!String(c.nome || '').trim()) return 'Informe o nome completo.';
      if (completo) {
        if (!regras.cpfValid(c.cpf)) return 'Informe um CPF válido (11 dígitos).';
        if (outros.some((x) => x.tipoPessoa !== 'juridica' && x.cpf && digitos(x.cpf) === digitos(c.cpf))) return 'Já existe um cliente com este CPF.';
      }
      const r = whatsEmail(true);
      if (r) return r;
      // Data de aniversário (dia e mês, "MM-DD"), obrigatória como era a de nascimento; cliente antigo vale pelo dia e mês do nascimento.
      const aniv = aniversarioCliente(c);
      if (!aniv) return 'Informe a data de aniversário.';
      if (aniversarioRuim(aniv) || aniv.length !== 5) return 'Data de aniversário inválida: escolha o dia e o mês.';
      if (!completo && outros.some((x) => x.tipoPessoa !== 'juridica' && semAcento(x.nome) === semAcento(c.nome) && digitos(x.whatsapp) === digitos(c.whatsapp))) return 'Já existe um cliente com este nome e WhatsApp.';
      return '';
    };
    const empresa = () => {
      if (!regras.cnpjValid(c.cnpj)) return 'Informe um CNPJ válido (14 dígitos).';
      if (outros.some((x) => x.tipoPessoa === 'juridica' && x.cnpj && digitos(x.cnpj) === digitos(c.cnpj))) return 'Já existe um cliente com este CNPJ.';
      if (!String(c.razaoSocial || '').trim()) return 'Informe a razão social.';
      if (c.regimeTributario && !REGIMES_TRIBUTARIOS.some(([id]) => id === c.regimeTributario)) return 'Regime tributário inválido.';
      return enderecoRuim();
    };
    // Pessoa jurídica em etapas (17/11/2026, Rodrigo): na 1ª etapa todos os campos são obrigatórios, menos o complemento.
    const empresaCompleta = () => {
      const e = c.endereco || {};
      const cheio = (x) => String(x || '').trim();
      if (!cheio(c.nomeFantasia)) return 'Informe o nome fantasia.';
      if (!c.regimeTributario) return 'Selecione o regime tributário.';
      if (!cheio(e.cep)) return 'Informe o CEP.';
      if (!cheio(e.logradouro)) return 'Informe a rua ou o logradouro.';
      if (!cheio(e.numero)) return 'Informe o número do endereço.';
      if (!cheio(e.bairro)) return 'Informe o bairro.';
      if (!cheio(e.cidade)) return 'Informe a cidade.';
      if (!e.uf) return 'Selecione a UF.';
      return '';
    };
    // Financeiro separado do contato só existe em cadastro anterior a 17/11/2026 (mesmo: false); o novo é o próprio contato.
    const financeiroAntigo = () => (c.financeiro && c.financeiro.mesmo === false ? contatoRuim(c.financeiro, 'financeiro') : '');
    if (!completo) return [pj ? empresa() || whatsEmail(false) : pessoa() || enderecoRuim()];
    if (!pj) return [pessoa(), enderecoRuim(), '', ''];
    return [
      empresa() || empresaCompleta(),
      // 17/11/2026 (Rodrigo): no quadro "Dados do responsável" tudo é obrigatório — nome, WhatsApp, e-mail e aniversário.
      (!String(c.contatoNome || '').trim() ? 'Informe o nome do responsável.' : '') || whatsEmail(true)
        || (!c.contatoAniversario ? 'Informe o aniversário do responsável.' : aniversarioRuim(c.contatoAniversario) || String(c.contatoAniversario).length !== 5 ? 'Aniversário do responsável inválido: escolha o dia e o mês.' : '')
        || financeiroAntigo() || validarContratoFinanceiro(c.contrato),
      (() => { const cargo = c.representante && c.representante.cargo; return cargo && !CARGOS_REPRESENTANTE.some(([id]) => id === cargo) ? 'Cargo do representante inválido.' : contatoRuim(c.representante, 'representante'); })(),
      '',
    ];
  }
  const validarCliente = (c, regras, ctx) => validarClienteEtapas(c, regras, ctx).find(Boolean) || '';

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
    CATEGORIAS_FORNECEDOR, categoriaFornecedor, nomeCategoriasFornecedor, migrarRamoFornecedor, migrarNomesPadrao, migrarCategoriaProduto, vinculosComProdutos, contarVinculos, documentoAntigoFornecedor, validarFornecedor,
    chaveTexto, TIPOS_CAMPO_ADICIONAL, RENOVACOES_CONTRATO, LIMITES_CONTRATO, validarListaAtividades, validarAtividadesContrato, novaAtividade, validarModeloContrato,
    somarMesesIso, aplicarModeloAoContrato, validarContratoDocumento, faltasDoContrato,
    validarFornecedorEtapas, REGIMES_TRIBUTARIOS, CARGOS_REPRESENTANTE, etapasFornecedor, quemVendeFornecedor, aniversarioVendedor, migrarVendedorFornecedor,
    FUNCOES_PRESTADOR_INICIAIS, idFuncaoPrestador, funcaoPrestadorIgual, validarFuncaoPrestador, migrarPrestadoresFornecedor,
    FORMAS_PAGAMENTO_CONTRATO, FORMAS_PAGAMENTO_FORNECEDOR, RECORRENCIAS_CONTRATO, RECORRENCIAS_CLIENTE, CLIENTE_MENSAL, periodoMensal, validarTermino, resumoTermino, UNIDADES_REPETICAO, POSICOES_MES, DIAS_SEMANA_LONGOS, REAJUSTES_CONTRATO, migrarContratoFinanceiro,
    validarContratoFinanceiro, TIPOS_PESSOA_CLIENTE, TIPOS_CADASTRO_CLIENTE, nomeCliente, etapasCliente, validarClienteEtapas, validarCliente,
    validarRecorrenciaPersonalizada, resumoRecorrenciaPersonalizada, resumoValorRecorrencia, aniversarioPartes, aniversarioRuim, aniversarioTexto, aniversarioCliente, MESES_ABREVIADOS,
    avaliarItem, limitesDaMargem, quantidadeDentroDaMargem, MOTIVOS, novaReferencia, COLUNAS_MATRIZ, contarMatriz,
    situacaoEstoque, SITUACOES_ESTOQUE, sugestaoReposicao, pendenciasDeTeto,
    aplicarRecebimento, SITUACOES_PEDIDO,
    moeda, numero, dataCurta, dataLonga, lerNumero,
  };
});
