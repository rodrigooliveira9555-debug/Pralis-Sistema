// Regras de Compras (espelho do S1). Rodar: node tests/compras-dominio.cjs
const assert = require('node:assert/strict');
const d = require('../dist/compras/dominio.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };
const datas = (lista) => lista.map((o) => o.data);

// Recorrência
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'nunca' } })), ['2026-11-05']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' } }, { limite: 3 })), ['2026-11-05', '2026-11-06', '2026-11-07']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'semanal' } }, { limite: 3 })), ['2026-11-05', '2026-11-12', '2026-11-19']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'quinzenal' } }, { limite: 3 })), ['2026-11-05', '2026-11-19', '2026-12-03']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-01-31', regra: { tipo: 'mensal' } }, { limite: 3 })), ['2026-01-31', '2026-03-31', '2026-05-31']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'anual' } }, { limite: 2 })), ['2026-11-05', '2027-11-05']));
// Personalizada: seg e qui, toda semana, a partir de qui 05/11/2026
ok(() => assert.deepEqual(
  datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'personalizada', personalizada: { frequencia: 'semanal', intervalo: 1, diasSemana: [1, 4] } } }, { limite: 4 })),
  ['2026-11-05', '2026-11-09', '2026-11-12', '2026-11-16']));
// Término por vezes e por data
ok(() => assert.equal(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' }, termino: { tipo: 'vezes', vezes: 2 } }).length, 2));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' }, termino: { tipo: 'data', data: '2026-11-06' } })), ['2026-11-05', '2026-11-06']));
// Exceções: cancelar e mover só uma data
ok(() => assert.deepEqual(
  datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' }, excecoes: { '2026-11-06': { cancelada: true }, '2026-11-07': { data: '2026-11-09', hora: '10:00' } } }, { limite: 3 })),
  ['2026-11-05', '2026-11-08', '2026-11-09']));
ok(() => assert.equal(d.resumoRegra({ tipo: 'quinzenal' }, '2026-11-05'), 'A cada 2 semanas'));

// Ranking topo 20% com empate na fronteira
ok(() => assert.deepEqual([...d.topoDoRanking([{ id: 'a', valor: 10 }, { id: 'b', valor: 5 }, { id: 'c', valor: 5 }, { id: 'd', valor: 1 }, { id: 'e', valor: 0 }])].sort(), ['a']));
ok(() => assert.deepEqual([...d.topoDoRanking([{ id: 'a', valor: 5 }, { id: 'b', valor: 5 }, { id: 'c', valor: 1 }])].sort(), ['a', 'b']));
ok(() => assert.equal(d.topoDoRanking([{ id: 'a', valor: 0 }]).size, 0));

// Fornecedor convidável
ok(() => assert.equal(d.motivoNaoConvidavel({ situacao: 'inativo', whatsapp: '31999998888' }), 'Fornecedor inativo'));
ok(() => assert.equal(d.motivoNaoConvidavel({ situacao: 'ativo', whatsapp: '99998888' }), 'WhatsApp válido (com DDD)'));
ok(() => assert.equal(d.podeConvidar({ situacao: 'ativo', whatsapp: '(31) 99999-8888' }), true));

// Avaliação automática da resposta
const base = { custo: 10, referencia: 10, pedida: 10, disponivel: 10, margemPct: 10, teto: null, gastoComprometido: 0 };
ok(() => assert.equal(d.avaliarItem(base).situacao, 'comprado'));
ok(() => assert.equal(d.avaliarItem({ ...base, custo: 10.01 }).motivo, 'acima_da_base'));
ok(() => assert.equal(d.avaliarItem({ ...base, referencia: null }).situacao, 'com_aumento'));
ok(() => assert.equal(d.avaliarItem({ ...base, disponivel: 11 }).situacao, 'comprado'));
ok(() => assert.equal(d.avaliarItem({ ...base, disponivel: 12 }).motivo, 'fora_da_margem'));
ok(() => assert.equal(d.avaliarItem({ ...base, teto: 99.99 }).motivo, 'barrado_pelo_teto'));
ok(() => assert.equal(d.avaliarItem({ ...base, teto: 100 }).situacao, 'comprado'));
ok(() => assert.equal(d.avaliarItem({ ...base, indisponivel: true }).motivo, 'indisponivel'));
ok(() => assert.equal(d.avaliarItem({ ...base, jaComprado: true }).motivo, 'ja_comprado'));

// Referência só desce
ok(() => assert.equal(d.novaReferencia(10, [12, 9.5]), 9.5));
ok(() => assert.equal(d.novaReferencia(10, [12, 11]), 10));
ok(() => assert.equal(d.novaReferencia(null, [12, 11]), 11));
ok(() => assert.equal(d.novaReferencia(10, []), 10));

// Matriz
ok(() => {
  const m = d.contarMatriz([{ produtoId: 'p', estado: 'aguardando' }, { produtoId: 'p', estado: 'com_aumento' }, { produtoId: 'p', estado: 'comprado' }]);
  assert.deepEqual(m.get('p'), { enviado: 3, cotado: 0, retornado: 0, com_aumento: 1, comprado: 1 });
});

// Estoque
ok(() => assert.equal(d.situacaoEstoque(5, 5, 20), 'no_minimo'));
ok(() => assert.equal(d.situacaoEstoque(20, 5, 20), 'no_maximo'));
ok(() => assert.equal(d.situacaoEstoque(10, null, null), 'sem_faixa'));
ok(() => assert.equal(d.situacaoEstoque(10, 5, 20), 'regular'));
ok(() => assert.equal(d.sugestaoReposicao({ saldo: 3, estoqueMin: 5, estoqueMax: 20 }), 17));
ok(() => assert.equal(d.sugestaoReposicao({ saldo: 8, estoqueMin: 5, estoqueMax: 20 }), 0));

// Recebimento
const itens = [{ id: 'i1', pedida: 10, recebida: 0, devolvida: 0, pendente: 10 }, { id: 'i2', pedida: 4, recebida: 0, devolvida: 0, pendente: 4 }];
ok(() => assert.match(d.aplicarRecebimento('cancelado', itens, {}).erro, /Só é possível/));
ok(() => assert.match(d.aplicarRecebimento('confirmado', itens, { i1: { recebido: 11 } }).erro, /passa do que falta/));
ok(() => assert.match(d.aplicarRecebimento('confirmado', itens, { i1: { devolvido: 1 } }).erro, /motivo/));
ok(() => assert.match(d.aplicarRecebimento('confirmado', itens, {}).erro, /ao menos uma/));
ok(() => {
  const r = d.aplicarRecebimento('confirmado', itens, { i1: { recebido: 6 } });
  assert.equal(r.status, 'recebido_parcial');
  assert.equal(r.itens[0].pendente, 4);
});
ok(() => {
  const r = d.aplicarRecebimento('confirmado', itens, { i1: { recebido: 9, devolvido: 1, motivo: 'Avariado' }, i2: { recebido: 4 } });
  assert.equal(r.status, 'recebido');
  assert.equal(r.itens[0].pendente, 0);
});

// Separação: faixa da margem
ok(() => assert.deepEqual(d.limitesDaMargem(5, 10), { minimo: 4.5, maximo: 5.5 }));
ok(() => assert.deepEqual(d.limitesDaMargem(3, 30), { minimo: 2.1, maximo: 3.9 }));
ok(() => assert.equal(d.quantidadeDentroDaMargem(5, 5.2, 10), true));
ok(() => assert.equal(d.quantidadeDentroDaMargem(5, 5.6, 10), false));
ok(() => assert.equal(d.quantidadeDentroDaMargem(5, 0, 10), false));

// Leitura de números digitados
ok(() => assert.equal(d.lerNumero('R$ 1.234,56'), 1234.56));
ok(() => assert.equal(d.lerNumero('12,5'), 12.5));
ok(() => assert.equal(d.lerNumero('12.5'), 12.5));
ok(() => assert.equal(d.lerNumero(''), null));

// Teto do estoque máximo (S1: pendenciasDeTeto): saldo + pedido não passa do máximo; sem máximo, sem teto.
ok(() => assert.deepEqual(d.pendenciasDeTeto([{ produtoId: 'a', descricao: 'Farinha', quantidade: 5, saldo: 5, estoqueMax: 10 }]), []));
ok(() => assert.equal(d.pendenciasDeTeto([{ produtoId: 'a', descricao: 'Farinha', quantidade: 6, saldo: 5, estoqueMax: 10 }]).length, 1));
ok(() => assert.match(d.pendenciasDeTeto([{ produtoId: 'a', descricao: 'Farinha', quantidade: 6, saldo: 5, estoqueMax: 10 }])[0], /^Farinha: pedido de 6 com saldo 5 passa do máximo 10$/));
ok(() => assert.deepEqual(d.pendenciasDeTeto([{ produtoId: 'a', quantidade: 999, saldo: 5, estoqueMax: null }]), []));
ok(() => assert.deepEqual(d.pendenciasDeTeto([{ produtoId: 'a', quantidade: 999, saldo: 5, estoqueMax: '' }]), []));
// Soma pelo conjunto: o mesmo produto duas vezes conta junto.
ok(() => assert.equal(d.pendenciasDeTeto([
  { produtoId: 'a', descricao: 'Farinha', quantidade: 3, saldo: 5, estoqueMax: 10 },
  { produtoId: 'a', descricao: 'Farinha', quantidade: 3, saldo: 5, estoqueMax: 10 },
]).length, 1));

// Fornecedor: o texto livre antigo de "categoria" vira o ramo (migração) e validação do cadastro novo. Dados fictícios.
const regras = require('../dist/field-validation.js');
ok(() => {
  // Três situações de dado antigo: texto livre (main), lista de categorias que existiu só em 15/11 e já com ramo.
  const doc = {
    categoriasFornecedor: [{ id: 'cf-frios', nome: 'Frios', ativa: true }, { id: 'cf-solta', nome: 'Manutenção', ativa: true }],
    migracoes: { categoriasFornecedor: 1 },
    fornecedores: [
      { id: 'f1', nome: 'A', categoria: 'Laticínios' },
      { id: 'f2', nome: 'B', categoriaId: 'cf-frios' },
      { id: 'f3', nome: 'C', categoria: 'Bebidas', categoriaId: 'cf-frios' },
      { id: 'f4', nome: 'D' },
      { id: 'f5', nome: 'E', ramo: 'Embalagens', categoria: 'Outro', categorias: ['produto'] },
    ],
  };
  d.migrarRamoFornecedor(doc);
  assert.deepEqual(doc.fornecedores.map((f) => f.ramo), ['Laticínios', 'Frios', 'Bebidas', '', 'Embalagens']);
  assert.ok(doc.fornecedores.every((f) => !('categoria' in f) && !('categoriaId' in f)));
  // Ninguém é classificado como Produto ou Serviço pela migração; quem já tinha continua.
  assert.deepEqual(doc.fornecedores.map((f) => f.categorias), [undefined, undefined, undefined, undefined, ['produto']]);
  assert.equal(doc.categoriasFornecedor.length, 2); // a lista antiga fica no dado, sem uso
  assert.deepEqual(doc.migracoes, { categoriasFornecedor: 1, ramoFornecedor: 1 });
  // Roda uma vez só: ramo apagado depois não volta.
  doc.fornecedores[0].ramo = '';
  d.migrarRamoFornecedor(doc);
  assert.equal(doc.fornecedores[0].ramo, '');
});
ok(() => {
  // Fornecedor antigo ligado a produto (catálogo, histórico, pedido, cotação) e sem categoria vira Produto; uma vez só.
  const doc = {
    fornecedores: [
      { id: 'f1', nome: 'No catálogo' }, { id: 'f2', nome: 'No histórico', categorias: [] }, { id: 'f3', nome: 'Com pedido' },
      { id: 'f4', nome: 'Em cotação' }, { id: 'f5', nome: 'Sem vínculo' }, { id: 'f6', nome: 'Já é serviço', categorias: ['servico'] },
    ],
    catalogo: [{ id: 'v1', fornecedorId: 'f1', produtoId: 'p1' }, { id: 'v2', fornecedorId: 'f6', produtoId: 'p1' }],
    historico: [{ id: 'h1', fornecedorId: 'f2', produtoId: 'p1' }],
    pedidos: [{ id: 'pd1', fornecedorId: 'f3', itens: [] }],
    rodadas: [{ id: 'r1', convites: [{ fornecedorId: 'f4' }] }],
  };
  assert.equal(d.vinculosComProdutos(doc, 'f1'), 1);
  assert.equal(d.vinculosComProdutos(doc, 'f5'), 0);
  d.migrarCategoriaProduto(doc);
  assert.deepEqual(doc.fornecedores.map((f) => (f.categorias || []).join()), ['produto', 'produto', 'produto', 'produto', '', 'servico']);
  assert.equal(doc.migracoes.categoriaProdutoFornecedor, 1);
  // Não roda de novo: quem ganhou vínculo depois, ou desmarcou a categoria, não é mexido.
  doc.fornecedores[0].categorias = [];
  doc.catalogo.push({ id: 'v3', fornecedorId: 'f5', produtoId: 'p2' });
  d.migrarCategoriaProduto(doc);
  assert.deepEqual(doc.fornecedores.map((f) => (f.categorias || []).join()), ['', 'produto', 'produto', 'produto', '', 'servico']);
});
ok(() => {
  // Escolha única: cadastro antigo com as duas fica "sem categoria escolhida" (não é decidido pelo sistema).
  assert.equal(d.nomeCategoriasFornecedor({ categorias: ['servico', 'produto'] }), '');
  assert.equal(d.categoriaFornecedor({ categorias: ['servico', 'produto'] }), '');
  assert.equal(d.categoriaFornecedor({ categorias: ['servico'] }), 'servico');
  assert.equal(d.categoriaFornecedor({}), '');
  assert.equal(d.nomeCategoriasFornecedor({ categorias: ['servico'] }), 'Serviço');
  assert.equal(d.nomeCategoriasFornecedor({ categorias: [] }), '');
  assert.equal(d.nomeCategoriasFornecedor({}), '');
});
ok(() => {
  // CPF (11 dígitos) voltou como pessoa física; só o que não é CPF nem CNPJ continua "documento antigo".
  assert.equal(d.documentoAntigoFornecedor({ documento: '529.982.247-25' }), '');
  assert.equal(d.documentoAntigoFornecedor({ documento: 'RG 12345' }), 'RG 12345');
  assert.equal(d.documentoAntigoFornecedor({ documento: '11.222.333/0001-81' }), '');
  assert.equal(d.documentoAntigoFornecedor({ documento: '' }), '');
  assert.equal(d.documentoAntigoFornecedor(null), '');
  assert.equal(d.TIPOS_PESSOA, undefined);
});
ok(() => {
  const ctx = { fornecedores: [{ id: 'f9', nome: 'Moinho Teste' }] };
  const pj = { id: 'f1', nome: 'Fornecedor Teste', tipoPessoa: 'juridica', documento: '11.222.333/0001-81', categorias: ['produto'], whatsapp: '(31) 99999-0000', email: '', financeiro: { nome: '', whatsapp: '', email: '' }, nascimento: '' };
  const v = (mudanca) => d.validarFornecedor({ ...pj, ...mudanca }, regras, ctx);
  assert.equal(v({}), '');
  assert.match(v({ categorias: [] }), /categoria/);
  assert.match(v({ categorias: undefined }), /categoria/);
  assert.match(v({ categorias: ['outra'] }), /inválida/);
  assert.match(v({ categorias: ['produto', 'servico'] }), /só uma categoria/);
  assert.equal(v({ categorias: ['servico'] }), '');
  assert.equal(v({ tipoPessoa: '' }), ''); // o tipo de pessoa não é mais pedido
  assert.match(v({ nome: ' ' }), /nome/);
  assert.match(v({ nome: 'MOINHO TESTE' }), /Já existe/);
  assert.match(v({ documento: '' }), /CNPJ/);
  assert.match(v({ documento: '11.222.333/0001-80' }), /CNPJ/);
  assert.match(v({ documento: '529.982.247-25' }), /CNPJ/);
  assert.match(v({ whatsapp: '' }), /WhatsApp do vendedor/);
  assert.match(v({ email: 'sem-arroba' }), /E-mail do vendedor/);
  assert.match(v({ financeiro: { nome: 'Fin', whatsapp: '123', email: '' } }), /WhatsApp do financeiro/);
  assert.match(v({ financeiro: { nome: 'Fin', whatsapp: '', email: 'x@' } }), /E-mail do financeiro/);
  // Pessoa física: CPF válido e endereço completo (só o complemento é opcional); sem CNPJ nem regime tributário.
  const pf = { tipoPessoa: 'fisica', documento: '529.982.247-25', nome: 'Pessoa Teste', endereco: { cep: '30130-000', logradouro: 'Rua Teste', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Cidade Teste', uf: 'MG' } };
  // Pessoa física (18/11/2026): WhatsApp, e-mail e aniversário ficam no primeiro quadro, então são conferidos na 1ª etapa e não na 2ª.
  { const base = { ...pj, ...pf, id: 'fpf', categorias: ['produto'] };
    const semZap = d.validarFornecedorEtapas({ ...base, whatsapp: '' }, regras, ctx);
    assert.equal(semZap[0], 'Informe o WhatsApp.'); assert.equal(semZap[1], '');
    assert.equal(d.validarFornecedorEtapas({ ...base, email: 'x@' }, regras, ctx)[0], 'E-mail inválido.');
    assert.deepEqual(d.validarFornecedorEtapas(base, regras, ctx).slice(0, 2), ['', '']);
    // Pessoa jurídica: o contato continua sendo conferido na 2ª etapa.
    const pjSemZap = d.validarFornecedorEtapas({ ...pj, whatsapp: '' }, regras, ctx);
    assert.equal(pjSemZap[0], ''); assert.equal(pjSemZap[1], 'Informe o WhatsApp do vendedor ou prestador.'); }
  assert.equal(v(pf), '');
  assert.match(v({ ...pf, documento: '111.111.111-11' }), /CPF válido/);
  assert.match(v({ ...pf, documento: '11.222.333/0001-81' }), /CPF válido/);
  assert.match(v({ ...pf, nome: ' ' }), /nome completo/);
  assert.match(v({ ...pf, endereco: { ...pf.endereco, numero: '', cidade: '' } }), /endereço completo \(falta número, cidade\)/);
  assert.match(v({ ...pf, endereco: undefined }), /endereço completo/);
  assert.equal(v({ ...pf, regimeTributario: 'inexistente' }), ''); // regime não vale para pessoa física
  assert.match(v({ regimeTributario: 'inexistente' }), /Regime/); // para pessoa jurídica continua valendo
  // Cadastro em etapas: vendedor (aniversário em mês e ano, opcional), financeiro e representante.
  assert.equal(v({ vendedorAniversario: '1990-01', regimeTributario: 'simples' }), '');
  assert.equal(v({ vendedorAniversario: '', vendedorNascimento: '1990-01-01' }), ''); // a data completa antiga não é conferida
  assert.match(v({ vendedorAniversario: '1990-13' }), /Aniversário/);
  assert.match(v({ vendedorAniversario: '03/19' }), /Aniversário/);
  assert.match(v({ vendedorAniversario: '1890-03' }), /Aniversário/);
  // Aniversário só com dia e mês ("MM-DD"), sem ano; 29/02 vale; o formato antigo AAAA-MM continua aceito como está.
  assert.equal(v({ vendedorAniversario: '08-15' }), '');
  assert.equal(v({ vendedorAniversario: '02-29' }), '');
  assert.match(v({ vendedorAniversario: '02-30' }), /não tem dia 30/);
  assert.match(v({ vendedorAniversario: '04-31' }), /não tem dia 31/);
  assert.match(v({ vendedorAniversario: '13-01' }), /mês/);
  assert.match(v({ vendedorAniversario: '08-' }), /incompleto/);
  assert.match(v({ vendedorAniversario: '-15' }), /incompleto/);
  assert.equal(d.aniversarioTexto('08-15'), '15/ago');
  assert.equal(d.aniversarioTexto('1990-03-15'), '15/mar');
  assert.equal(d.aniversarioTexto('1990-03'), ''); // só mês: não inventa o dia
  assert.deepEqual(d.aniversarioPartes('1990-03'), { mes: '03', dia: '', legado: true });
  assert.deepEqual(d.aniversarioPartes('02-29'), { mes: '02', dia: '29', legado: false });
  assert.deepEqual(d.aniversarioPartes(''), { mes: '', dia: '', legado: false });
  assert.equal(d.aniversarioVendedor({ vendedorNascimento: '1990-03-15' }), '03-15');
  assert.equal(d.aniversarioVendedor({ vendedorNascimento: '1990-03-15', vendedorAniversario: '' }), '');
  assert.equal(d.aniversarioVendedor({ vendedorNascimento: '1990-03-15', vendedorAniversario: '1991-04' }), '1991-04');
  assert.equal(d.aniversarioVendedor(null), '');
  assert.equal(v({ vendedorCpf: 'valor antigo qualquer' }), ''); // o CPF do vendedor não é mais pedido nem conferido
  assert.equal(v({ representante: { mesmo: true, cargo: 'socio-proprietario' } }), '');
  assert.match(v({ representante: { cargo: 'chefe' } }), /Cargo do representante/);
  assert.deepEqual(d.CARGOS_REPRESENTANTE.map(([, nome]) => nome), ['Proprietário', 'Sócio-proprietário', 'Diretor geral', 'Diretor comercial', 'Gerente geral', 'Gerente comercial',
    'Supervisor geral', 'Supervisor comercial', 'Representante comercial', 'Administrador', 'Financeiro', 'Procurador', 'Outro']);
  assert.deepEqual(d.etapasFornecedor([]), ['Dados da empresa', 'Dados do vendedor', 'Dados do responsável financeiro', 'Dados do responsável legal', 'Vínculos', 'Contrato', 'Revisão dos dados']);
  // Contrato (quadro "Tem contrato?" do financeiro): só é conferido quando tem; valor e índice só informados.
  const vc = (contrato) => d.validarFornecedorEtapas({ ...pj, contrato: { tem: true, ...contrato } }, regras, ctx);
  assert.deepEqual(vc({ formaPagamento: 'boleto', recorrencia: 'mes', vencimentoDia: 10, valorCentavos: 150000, inicio: '2026-01-01', fim: '2026-12-31', reajuste: 'ipca', observacoes: 'Mensal' }), ['', '', '', '', '', '']);
  assert.deepEqual(vc({}), ['', '', '', '', '', '']);
  assert.match(vc({ inicio: '2026-12-31', fim: '2026-01-01' })[5], /antes do início/);
  assert.match(vc({ inicio: '31/12/2026' })[5], /datas do contrato/);
  assert.match(vc({ valorCentavos: 10.5 })[5], /Valor do contrato/);
  assert.match(vc({ valorCentavos: NaN })[5], /Valor do contrato/);
  assert.match(vc({ formaPagamento: 'cheque' })[5], /Forma de pagamento/);
  assert.match(vc({ recorrencia: 'semana' })[5], /Recorrência/);
  assert.match(vc({ vencimentoDia: 32 })[5], /1 a 31/);
  assert.match(vc({ vencimentoData: '10/01/2026' })[5], /vencimento/);
  assert.match(vc({ reajuste: 'dolar' })[5], /Reajuste/);
  assert.match(vc({ reajuste: 'percentual' })[5], /percentual/);
  assert.match(vc({ reajuste: 'percentual', reajustePercentual: 150 })[5], /percentual/);
  assert.equal(vc({ reajuste: 'percentual', reajustePercentual: 4.5 })[5], '');
  assert.match(vc({ observacoes: 'x'.repeat(2001) })[5], /2000/);
  // Sem contrato, nada é conferido (o que estiver preenchido fica guardado como está).
  assert.equal(v({ contrato: { tem: false, valorCentavos: -1, inicio: 'x' } }), '');
  assert.deepEqual([d.FORMAS_PAGAMENTO_CONTRATO.length, d.RECORRENCIAS_CONTRATO.length, d.REAJUSTES_CONTRATO.length], [4, 7, 6]);
  assert.deepEqual(d.FORMAS_PAGAMENTO_FORNECEDOR, [['boleto', 'Boleto'], ['dinheiro', 'Dinheiro']]);
  assert.deepEqual(d.RECORRENCIAS_CONTRATO.map(([, n]) => n), ['Por visita', 'Por solicitação', 'Por hora', 'Por dia', 'Por mês', 'Por ano', 'Personalizado']);
  // Forma de pagamento, recorrência, valor e referência ao salário mínimo (16/11/2026): só informação, sem cálculo.
  assert.equal(vc({ formaPagamento: 'dinheiro', diaPagamento: 'sexta', recorrencia: 'visita', valorCentavos: 15000 })[5], '');
  assert.equal(vc({ formaPagamento: 'pix', recorrencia: 'mes' })[5], ''); // valor antigo continua válido
  assert.match(vc({ diaPagamento: 'segunda' })[5], /Dia de pagamento/);
  assert.equal(vc({ salarioMinimo: { ativo: true, percentual: 150.5 } })[5], ''); // acima de 100% vale
  assert.equal(vc({ salarioMinimo: { ativo: false, percentual: null } })[5], '');
  assert.match(vc({ salarioMinimo: { ativo: true, percentual: 0 } })[5], /percentual do salário mínimo/);
  assert.match(vc({ salarioMinimo: { ativo: true, percentual: NaN } })[5], /percentual do salário mínimo/);
  assert.match(vc({ salarioMinimo: { ativo: true, percentual: null } })[5], /percentual do salário mínimo/);
  assert.match(vc({ recorrencia: 'personalizado' })[5], /recorrência personalizada/i);
  assert.equal(vc({ recorrencia: 'personalizado', recorrenciaPersonalizada: { intervalo: 2, unidade: 'semana', diasSemana: [1, 5], termina: { tipo: 'nunca' } } })[5], '');
  // Recorrência personalizada (modelo Calendário/Lembretes).
  const rp = (x) => d.validarRecorrenciaPersonalizada({ intervalo: 1, unidade: 'dia', termina: { tipo: 'nunca' }, ...x });
  assert.equal(rp({}), '');
  assert.match(rp({ intervalo: 0 }), /número inteiro a partir de 1/);
  assert.match(rp({ intervalo: -2 }), /a partir de 1/);
  assert.match(rp({ intervalo: 1.5 }), /a partir de 1/);
  assert.match(rp({ unidade: 'minuto' }), /unidade/);
  assert.match(rp({ unidade: 'semana' }), /ao menos um dia da semana/);
  assert.match(rp({ unidade: 'semana', diasSemana: [] }), /ao menos um dia/);
  assert.match(rp({ unidade: 'semana', diasSemana: [7] }), /Dia da semana inválido/);
  assert.equal(rp({ unidade: 'semana', diasSemana: [0, 3] }), '');
  assert.match(rp({ unidade: 'mes' }), /como repetir no mês/);
  assert.match(rp({ unidade: 'mes', mensal: { modo: 'dia', dia: 32 } }), /1 a 31/);
  assert.match(rp({ unidade: 'mes', mensal: { modo: 'dia', dia: null } }), /1 a 31/);
  assert.equal(rp({ unidade: 'mes', mensal: { modo: 'dia', dia: 10 } }), '');
  assert.match(rp({ unidade: 'mes', mensal: { modo: 'posicao', posicao: '5', diaSemana: 1 } }), /posição/);
  assert.match(rp({ unidade: 'mes', mensal: { modo: 'posicao', posicao: '1', diaSemana: 9 } }), /dia da semana/);
  assert.equal(rp({ unidade: 'mes', mensal: { modo: 'posicao', posicao: 'ultima', diaSemana: 5 } }), '');
  assert.match(rp({ termina: { tipo: 'data' } }), /data de término/);
  assert.match(rp({ termina: { tipo: 'data', data: '10/01/2027' } }), /data de término/);
  assert.equal(rp({ termina: { tipo: 'data', data: '2027-01-10' } }), '');
  assert.match(rp({ termina: { tipo: 'ocorrencias', ocorrencias: 0 } }), /quantidade de ocorrências/);
  assert.match(rp({ termina: { tipo: 'ocorrencias' } }), /quantidade de ocorrências/);
  assert.equal(rp({ termina: { tipo: 'ocorrencias', ocorrencias: 3 } }), '');
  assert.match(rp({ termina: { tipo: 'jamais' } }), /termina/);
  assert.match(d.validarRecorrenciaPersonalizada(null), /Configure/);
  // Resumo automático.
  const rs = (x) => d.resumoRecorrenciaPersonalizada({ intervalo: 1, unidade: 'dia', termina: { tipo: 'nunca' }, ...x });
  assert.equal(rs({ intervalo: 2, unidade: 'semana', diasSemana: [1, 5] }), 'Repete a cada 2 semanas, às segundas e sextas-feiras, sem data de término.');
  assert.equal(rs({ unidade: 'semana', diasSemana: [1, 3, 5] }), 'Repete toda semana, às segundas, quartas e sextas-feiras, sem data de término.');
  assert.equal(rs({ unidade: 'semana', diasSemana: [0, 6] }), 'Repete toda semana, aos domingos e sábados, sem data de término.');
  assert.equal(rs({ unidade: 'mes', mensal: { modo: 'dia', dia: 10 } }), 'Repete todo dia 10 de cada mês, sem data de término.');
  assert.equal(rs({ intervalo: 3, unidade: 'mes', mensal: { modo: 'dia', dia: 10 } }), 'Repete a cada 3 meses, no dia 10, sem data de término.');
  assert.equal(rs({ unidade: 'mes', mensal: { modo: 'posicao', posicao: '1', diaSemana: 1 } }), 'Repete toda primeira segunda-feira do mês, sem data de término.');
  assert.equal(rs({ unidade: 'mes', mensal: { modo: 'posicao', posicao: 'ultima', diaSemana: 5 } }), 'Repete toda última sexta-feira do mês, sem data de término.');
  assert.equal(rs({ unidade: 'mes', mensal: { modo: 'posicao', posicao: '1', diaSemana: 0 } }), 'Repete todo primeiro domingo do mês, sem data de término.');
  assert.equal(rs({ intervalo: 2, unidade: 'hora' }), 'Repete a cada 2 horas, sem data de término.');
  assert.equal(rs({ unidade: 'hora' }), 'Repete toda hora, sem data de término.');
  assert.equal(rs({ intervalo: 3 }), 'Repete a cada 3 dias, sem data de término.');
  assert.equal(rs({}), 'Repete todos os dias, sem data de término.');
  assert.equal(rs({ unidade: 'ano' }), 'Repete todo ano, sem data de término.');
  assert.equal(rs({ intervalo: 2, unidade: 'ano', termina: { tipo: 'ocorrencias', ocorrencias: 4 } }), 'Repete a cada 2 anos, por 4 ocorrências.');
  assert.equal(rs({ termina: { tipo: 'ocorrencias', ocorrencias: 1 } }), 'Repete todos os dias, por 1 ocorrência.');
  assert.equal(rs({ termina: { tipo: 'data', data: '2027-03-05' } }), 'Repete todos os dias, até 05/03/2027.');
  assert.equal(rs({ unidade: 'semana' }), ''); // incompleto não vira frase
  // Frase informativa do valor: só texto.
  const nb = (t) => t.replace(/\u00a0/g, ' ');
  assert.equal(nb(d.resumoValorRecorrencia(15000, 'visita')), 'R$ 150,00 por visita.');
  assert.equal(nb(d.resumoValorRecorrencia(20000, 'solicitacao')), 'R$ 200,00 por solicitação.');
  assert.equal(nb(d.resumoValorRecorrencia(8000, 'hora')), 'R$ 80,00 por hora.');
  assert.equal(nb(d.resumoValorRecorrencia(150000, 'mes')), 'R$ 1.500,00 por mês.');
  assert.equal(nb(d.resumoValorRecorrencia(1200000, 'ano')), 'R$ 12.000,00 por ano.');
  assert.equal(nb(d.resumoValorRecorrencia(30000, 'personalizado')), 'R$ 300,00 conforme recorrência personalizada.');
  assert.equal(d.resumoValorRecorrencia(null, 'mes'), '');
  // Migração: quem já tinha início, fim, valor ou observações passa a ter contrato; vazio fica sem; uma vez só.
  const docC = { fornecedores: [{ id: 'a', contrato: { inicio: '2026-01-01', fim: '', valorCentavos: null, observacoes: '' } }, { id: 'b', contrato: { inicio: '', fim: '', valorCentavos: null, observacoes: '' } },
    { id: 'c', contrato: { inicio: '', fim: '', valorCentavos: 0, observacoes: '' } }, { id: 'd' }, { id: 'e', contrato: { tem: false, inicio: '2026-01-01' } }] };
  // Padrão de nomes nos cadastros já gravados (17/11/2026): arruma nomes, endereços e e-mails uma vez e guarda o valor antigo.
  {
    const fmt = (v) => v.toLowerCase().split(' ').map((w, k) => (k > 0 && ['de', 'da', 'do', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
    const docN = { fornecedores: [{ id: 'f1', nome: 'PADARIA TESTE', razaoSocial: 'padaria teste ltda', email: 'Contato@Exemplo.TEST', endereco: { logradouro: 'RUA DAS FLORES', numero: '10' }, financeiro: { nome: 'maria da silva', email: 'FIN@exemplo.test' }, prestadores: [{ id: 'p1', nome: 'jose de souza' }] }],
      clientes: [{ id: 'c1', nome: 'ana DE jesus', email: 'Ana@Exemplo.test' }, { id: 'c2', nome: 'Ja Certo' }],
      empresas: [{ id: 'e1', vinculo: 'matriz', nomeFantasia: 'loja teste', responsaveis: [{ id: 'r1', nome: 'joao e maria', profissao: 'EMPRESARIO' }] }] };
    d.migrarNomesPadrao(docN, fmt, '2026-11-17T00:00:00.000Z');
    assert.equal(docN.fornecedores[0].nome, 'Padaria Teste');
    assert.equal(docN.fornecedores[0].email, 'contato@exemplo.test');
    assert.equal(docN.fornecedores[0].endereco.logradouro, 'Rua das Flores'.replace('das', 'Das')); // o formatador do teste só conhece de/da/do/e
    assert.equal(docN.fornecedores[0].endereco.numero, '10');
    assert.equal(docN.fornecedores[0].financeiro.nome, 'Maria da Silva');
    assert.equal(docN.fornecedores[0].prestadores[0].nome, 'Jose de Souza');
    assert.equal(docN.clientes[0].nome, 'Ana de Jesus');
    assert.equal(docN.clientes[1].nome, 'Ja Certo');
    assert.equal(docN.empresas[0].responsaveis[0].nome, 'Joao e Maria');
    const marca = docN.migracoes.nomesPadrao;
    assert.equal(marca.em, '2026-11-17T00:00:00.000Z');
    assert.ok(marca.antes.some(([onde, campo, valor]) => onde === 'cliente:c1' && campo === 'nome' && valor === 'ana DE jesus')); // o valor antigo fica guardado
    assert.ok(!marca.antes.some(([onde]) => onde === 'cliente:c2')); // o que já estava certo não entra
    docN.clientes[0].nome = 'mudou depois'; d.migrarNomesPadrao(docN, fmt);
    assert.equal(docN.clientes[0].nome, 'mudou depois'); // roda uma vez só
    const semRegra = { clientes: [{ id: 'c9', nome: 'sem regra' }] }; d.migrarNomesPadrao(semRegra, undefined);
    assert.ok(!semRegra.migracoes && semRegra.clientes[0].nome === 'sem regra'); // sem a regra central, não mexe e não marca
  }
  d.migrarContratoFinanceiro(docC);
  assert.deepEqual(docC.fornecedores.map((x) => x.contrato && x.contrato.tem), [true, false, true, undefined, false]);
  assert.equal(docC.fornecedores[0].contrato.inicio, '2026-01-01');
  assert.equal(docC.migracoes.contratoFinanceiro, 1);
  docC.fornecedores[1].contrato.inicio = '2027-01-01'; d.migrarContratoFinanceiro(docC);
  assert.equal(docC.fornecedores[1].contrato.tem, false);
  // Prestadores (Serviço): do 2º em diante, nome obrigatório e formato conferido; função precisa existir no cadastro.
  const fn = [{ id: 'fp-pintor', nome: 'Pintor', ativa: true }];
  const vp = (prestadores) => d.validarFornecedor({ ...pj, categorias: ['servico'], prestadores }, regras, { fornecedores: [], funcoes: fn });
  assert.equal(vp([{ id: 'a', nome: '', funcoes: ['fp-pintor'] }, { id: 'b', nome: 'Segundo', whatsapp: '', email: '', aniversario: '1990-03', funcoes: [] }]), '');
  assert.match(vp([{ id: 'a', nome: 'Um' }, { id: 'b', nome: ' ' }]), /nome do prestador 2/);
  assert.match(vp([{ id: 'a', nome: 'Um' }, { id: 'b', nome: 'Dois', whatsapp: '12' }]), /WhatsApp do prestador 2/);
  assert.match(vp([{ id: 'a', nome: 'Um' }, { id: 'b', nome: 'Dois', email: 'x@' }]), /E-mail do prestador 2/);
  assert.match(vp([{ id: 'a', nome: 'Um' }, { id: 'b', nome: 'Dois', aniversario: '1990-13' }]), /Aniversário do prestador 2/);
  assert.match(vp([{ id: 'a', nome: 'Um', funcoes: ['nao-existe'] }]), /Função do prestador 1/);
  // Cadastro de funções: sem nome vazio nem repetido (ignora maiúsculas e acentos).
  assert.equal(d.validarFuncaoPrestador('Vidraceiro', fn), '');
  assert.match(d.validarFuncaoPrestador('  ', fn), /nome da função/);
  assert.match(d.validarFuncaoPrestador('PÍNTOR', fn), /Já existe/);
  assert.equal(d.idFuncaoPrestador('Mecânico de refrigeração'), 'fp-mecanico-de-refrigeracao');
  assert.equal(d.FUNCOES_PRESTADOR_INICIAIS.length, 18);
  // Migração: cria a lista inicial e transforma o contato único do fornecedor de Serviço no Prestador 1; uma vez só.
  const docP = { fornecedores: [
    { id: 'f1', nome: 'S', categorias: ['servico'], contatoNome: 'Fulano', whatsapp: '(31) 99999-0000', email: 'a@exemplo.test', vendedorAniversario: '1990-03' },
    { id: 'f2', nome: 'P', categorias: ['produto'], contatoNome: 'Beltrano', whatsapp: '(31) 98888-0000' },
    { id: 'f3', nome: 'D', categorias: ['produto', 'servico'], contatoNome: 'Sicrano' },
  ] };
  d.migrarPrestadoresFornecedor(docP);
  assert.equal(docP.funcoesPrestador.length, 18);
  assert.deepEqual(docP.fornecedores[0].prestadores, [{ id: 'pr-f1', nome: 'Fulano', whatsapp: '(31) 99999-0000', email: 'a@exemplo.test', aniversario: '1990-03', funcoes: [] }]);
  assert.equal(docP.fornecedores[0].contatoNome, 'Fulano');
  assert.ok(!('prestadores' in docP.fornecedores[1]) && !('prestadores' in docP.fornecedores[2]));
  assert.equal(docP.migracoes.prestadoresFornecedor, 1);
  docP.fornecedores[0].prestadores[0].nome = 'Alterado'; docP.funcoesPrestador.pop();
  d.migrarPrestadoresFornecedor(docP);
  assert.equal(docP.fornecedores[0].prestadores[0].nome, 'Alterado');
  assert.equal(docP.funcoesPrestador.length, 17);
  assert.match(v({ regimeTributario: 'outro' }), /Regime/);
  assert.match(v({ representante: { nome: 'Rep', whatsapp: '12', email: '' } }), /WhatsApp do representante/);
  assert.match(v({ nome: '' }), /nome fantasia ou a razão social/);
  // Cada problema aparece na etapa dele.
  const etapas = d.validarFornecedorEtapas({ ...pj, categorias: [], whatsapp: '', financeiro: { email: 'x@' }, representante: { whatsapp: '1' } }, regras, ctx);
  assert.deepEqual(etapas.map(Boolean), [true, true, true, true, false, false]);
  assert.deepEqual(d.validarFornecedorEtapas(pj, regras, ctx), ['', '', '', '', '', '']);
  assert.deepEqual(d.etapasFornecedor(['produto']).slice(1, 2), ['Dados do vendedor']);
  assert.deepEqual(d.etapasFornecedor(['servico']).slice(1, 2), ['Dados do prestador de serviço']);
  assert.deepEqual(d.etapasFornecedor(['produto', 'servico']).slice(1, 2), ['Dados do vendedor']);
  assert.equal(d.etapasFornecedor([]).length, 7);
  // Pessoa física: sem a etapa da empresa; a primeira é a da própria pessoa.
  assert.deepEqual(d.etapasFornecedor(['servico'], 'fisica'), ['Dados do prestador de serviço', 'Dados do responsável financeiro', 'Dados do responsável legal', 'Vínculos', 'Contrato', 'Revisão dos dados']);
  assert.equal(d.etapasFornecedor(['produto'], 'fisica')[0], 'Dados do vendedor');
  assert.equal(d.etapasFornecedor(['produto'], 'juridica').length, 7);
  assert.equal(d.etapasFornecedor([])[0], 'Dados da empresa');
  // Endereço é opcional; o que vier precisa estar no formato.
  assert.equal(v({ endereco: { cep: '01001-000', logradouro: 'Rua Teste', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Cidade Teste', uf: 'SP' } }), '');
  assert.equal(v({ endereco: {} }), '');
  assert.match(v({ endereco: { cep: '0100' } }), /CEP/);
  assert.match(v({ endereco: { uf: 'sp' } }), /UF/);
  assert.match(v({ documento: '' }), /CNPJ válido/);
});
ok(() => {
  // Migração do cadastro em etapas: o nascimento da pessoa física vira o do vendedor; o resto não se mexe; uma vez só.
  const doc = { fornecedores: [
    { id: 'f1', nome: 'A', nascimento: '1990-03-15', whatsapp: '(31) 99999-0000', contatoNome: 'Fulano', email: 'a@exemplo.test' },
    { id: 'f2', nome: 'B', nascimento: '1980-01-01', vendedorNascimento: '1985-05-05' }, { id: 'f3', nome: 'C' },
  ] };
  d.migrarVendedorFornecedor(doc);
  assert.deepEqual(doc.fornecedores.map((f) => f.vendedorNascimento), ['1990-03-15', '1985-05-05', undefined]);
  assert.ok(doc.fornecedores.every((f) => !('nascimento' in f)));
  assert.deepEqual([doc.fornecedores[0].whatsapp, doc.fornecedores[0].contatoNome, doc.fornecedores[0].email], ['(31) 99999-0000', 'Fulano', 'a@exemplo.test']);
  assert.equal(doc.migracoes.vendedorFornecedor, 1);
  doc.fornecedores[2].nascimento = '2000-01-01';
  d.migrarVendedorFornecedor(doc);
  assert.equal(doc.fornecedores[2].nascimento, '2000-01-01');
});

// Clientes (VND - Clientes): PF/PJ × Simples/Completo no mesmo registro.
ok(() => {
  assert.deepEqual(d.TIPOS_PESSOA_CLIENTE.map(([, n]) => n), ['PF - Pessoa Física', 'PJ - Pessoa Jurídica']);
  assert.deepEqual(d.TIPOS_CADASTRO_CLIENTE.map(([, n]) => n), ['Simples', 'Completo']);
  assert.deepEqual(d.etapasCliente('fisica', 'simples'), []);
  assert.deepEqual(d.etapasCliente('juridica', 'simples'), []);
  assert.deepEqual(d.etapasCliente('fisica', 'completo'), ['Dados pessoais', 'Endereço', 'Informações complementares', 'Revisão dos dados']);
  assert.deepEqual(d.etapasCliente('juridica', 'completo'), ['Dados da empresa', 'Dados do responsável financeiro', 'Dados do responsável legal', 'Contrato', 'Revisão dos dados']);
  // Sem contrato ("Terá contrato?" = Não), a etapa Contrato não existe: vai do responsável legal direto para a Revisão.
  assert.deepEqual(d.etapasCliente('juridica', 'completo', { semContrato: true }), ['Dados da empresa', 'Dados do responsável financeiro', 'Dados do responsável legal', 'Revisão dos dados']);
  // Cliente mensal e Compra Mensal (18/11/2026)
  assert.deepEqual(d.periodoMensal(2026, 11), { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.deepEqual(d.periodoMensal(2026, 2), { inicio: '2026-02-01', fim: '2026-02-28' });
  assert.deepEqual(d.periodoMensal(2028, 2), { inicio: '2028-02-01', fim: '2028-02-29' });
  assert.deepEqual(d.periodoMensal(2026, 12), { inicio: '2026-12-01', fim: '2026-12-31' });
  assert.deepEqual(d.CLIENTE_MENSAL, { formaPagamento: 'boleto', vencimentoDia: 10 });
  assert.ok(d.RECORRENCIAS_CLIENTE.some(([id]) => id === 'compra-mensal') && !d.RECORRENCIAS_CONTRATO.some(([id]) => id === 'compra-mensal'));
  assert.equal(d.validarContratoFinanceiro({ tem: true, recorrencia: 'compra-mensal', terminoMensal: { tipo: 'nunca' } }), '');
  assert.match(d.validarContratoFinanceiro({ tem: true, recorrencia: 'compra-mensal', terminoMensal: { tipo: 'data', data: '' } }), /data de término/);
  assert.match(d.validarContratoFinanceiro({ tem: true, recorrencia: 'compra-mensal' }), /termina/);
  assert.equal(d.validarContratoFinanceiro({ tem: true, clienteMensal: true, formaPagamento: 'boleto', vencimentoDia: 10 }), '');
  assert.match(d.validarContratoFinanceiro({ tem: true, clienteMensal: true, formaPagamento: 'dinheiro' }), /boleto/);
  // Objeto do contrato (18/11/2026): vínculos por id com produtos, grupos de despesa e patrimônios; opcional.
  assert.equal(d.validarContratoDocumento({ objeto: { produtoIds: ['p1', 'p2'], despesaIds: ['g1|s1'], patrimonioIds: [] } }), '');
  assert.equal(d.validarContratoDocumento({}), '');
  assert.match(d.validarContratoDocumento({ objeto: { produtoIds: ['p1', 'p1'] } }), /Objeto do contrato inválido/);
  assert.match(d.validarContratoDocumento({ objeto: { patrimonioIds: [''] } }), /Objeto do contrato inválido/);
  assert.match(d.validarContratoDocumento({ objeto: ['p1'] }), /Objeto do contrato inválido/);
  assert.deepEqual(d.CHAVES_OBJETO_CONTRATO, ['produtoIds', 'despesaIds', 'patrimonioIds']);
  // Contrato em blocos no cliente (18/11/2026): o mesmo do fornecedor, com o cliente como contratante e a empresa como contratada.
  assert.deepEqual(d.papelContrato('cliente'), { tem: 'temDocumento', empresa: 'contratadaEmpresaId' });
  assert.deepEqual(d.papelContrato('fornecedor'), { tem: 'tem', empresa: 'contratanteEmpresaId' });
  const cliCt = { razaoSocial: 'Empresa Teste Ltda', cnpj: '11.222.333/0001-81', contrato: { tem: true, temDocumento: true, contratadaEmpresaId: 'e1', atividadesIncluidas: [{ id: 'a1', texto: 'Entrega diária' }], inicio: '2026-11-18' } };
  assert.deepEqual(d.faltasDoContrato(cliCt, 'cliente'), []);
  assert.equal(d.faltasDoContrato({ ...cliCt, contrato: { tem: true } }, 'cliente').length, 1); // "tem" antigo do cliente não é "Tem contrato?"
  assert.deepEqual(d.faltasDoContrato({ ...cliCt, contrato: { ...cliCt.contrato, contratadaEmpresaId: '' } }, 'cliente'), ['empresa contratada']);
  assert.deepEqual(d.faltasDoContrato({ ...cliCt, cnpj: '', razaoSocial: '' }, 'cliente'), ['razão social do cliente', 'CNPJ do cliente']);
  assert.equal(d.resumoTermino({ tipo: 'ocorrencias', ocorrencias: 3 }), 'por 3 ocorrências');
  // Endereço nos cadastros simples (18/11/2026): CEP com 8 dígitos e UF válida quando informados; vazio continua valendo
  const rg = { cpfValid: () => true, cnpjValid: () => true };
  const pfS = { tipoPessoa: 'fisica', cadastro: 'simples', nome: 'A', whatsapp: '(31) 98888-0000', email: 'a@b.co', nascimento: '1990-01-01' };
  assert.equal(d.validarCliente({ ...pfS, endereco: { cep: '30130-010', uf: 'MG' } }, rg), '');
  assert.equal(d.validarCliente({ ...pfS }, rg), '');
  assert.match(d.validarCliente({ ...pfS, endereco: { cep: '123' } }, rg), /CEP deve ter 8/);
  assert.match(d.validarCliente({ ...pfS, endereco: { cep: '', uf: 'mg' } }, rg), /UF inválida/);
  const pjS = { tipoPessoa: 'juridica', cadastro: 'simples', cnpj: '11.222.333/0001-81', razaoSocial: 'X', whatsapp: '(31) 98888-0000' };
  assert.equal(d.validarCliente({ ...pjS, endereco: { cep: '30130010' } }, rg), '');
  assert.match(d.validarCliente({ ...pjS, endereco: { cep: '1234' } }, rg), /CEP deve ter 8/);
  // Contratos: atividades incluídas e não incluídas, modelos e documento (18/11/2026)
  assert.equal(d.novaAtividade([], [], '  Limpeza   das áreas ').item.texto, 'Limpeza das áreas');
  assert.match(d.novaAtividade([], [], '   ').erro, /Escreva/);
  assert.match(d.novaAtividade([{ id: 'a', texto: 'Limpeza' }], [], 'limpeza').erro, /já está na lista/);
  assert.match(d.novaAtividade([], [{ id: 'b', texto: 'Pintura' }], 'PINTURA').erro, /outra lista/);
  assert.equal(d.novaAtividade([{ id: 'a', texto: 'Limpeza' }], [], 'Limpeza geral', { ignorarId: 'a' }).item.id, 'a'); // editar o próprio item
  assert.match(d.novaAtividade([{ id: 'a', texto: 'X', ref: 'g1' }], [], 'Y', { ref: 'g1' }).erro, /já está/);
  assert.equal(d.validarAtividadesContrato([{ id: '1', texto: 'A' }], [{ id: '2', texto: 'B' }]), '');
  assert.match(d.validarAtividadesContrato([{ id: '1', texto: 'A' }], [{ id: '2', texto: 'a' }]), /nas incluídas e nas não incluídas/);
  assert.match(d.validarAtividadesContrato([{ id: '1', texto: 'A' }, { id: '2', texto: 'a' }], []), /repetida/);
  assert.match(d.validarAtividadesContrato([{ id: '1', texto: '' }], []), /sem texto/);
  const mod = { id: 'm1', nome: 'Prestação de serviços', versao: 3, clausulas: [{ titulo: 'Objeto', texto: 'Texto cadastrado.' }], incluidas: [{ id: 'i1', texto: 'Limpeza' }], excluidas: [{ id: 'e1', texto: 'Pintura' }], valorCentavos: 150000, recorrencia: 'mes', vigenciaMeses: 12, renovacao: 'automatica', camposAdicionais: [{ id: 'c1', rotulo: 'Local', tipo: 'texto', obrigatorio: true }] };
  assert.equal(d.validarModeloContrato(mod), '');
  assert.match(d.validarModeloContrato({ ...mod, nome: ' ' }), /nome do tipo/);
  assert.match(d.validarModeloContrato({ ...mod, id: 'm2' }, { modelos: [mod] }), /Já existe/);
  assert.equal(d.validarModeloContrato(mod, { modelos: [mod] }), ''); // o próprio modelo não conta como repetido
  assert.match(d.validarModeloContrato({ ...mod, clausulas: [{ titulo: 'x', texto: '' }] }), /cláusula sem texto/);
  assert.match(d.validarModeloContrato({ ...mod, camposAdicionais: [{ id: 'c1', rotulo: 'A', tipo: 'script' }] }), /Tipo inválido/);
  assert.match(d.validarModeloContrato({ ...mod, camposAdicionais: [{ id: 'c1', rotulo: 'A', tipo: 'texto' }, { id: 'c2', rotulo: 'a', tipo: 'data' }] }), /repetido/);
  assert.match(d.validarModeloContrato({ ...mod, vigenciaMeses: 0 }), /vigência/);
  assert.match(d.validarModeloContrato({ ...mod, incluidas: [{ id: 'i', texto: 'A' }], excluidas: [{ id: 'e', texto: 'A' }] }), /ao mesmo tempo/);
  // aplicar o modelo: só preenche o vazio, nunca sobrescreve
  const r1 = d.aplicarModeloAoContrato({ tem: true, inicio: '2026-01-31' }, mod);
  assert.equal(r1.patch.valorCentavos, 150000); assert.equal(r1.patch.recorrencia, 'mes'); assert.equal(r1.patch.fim, '2027-01-31'); assert.equal(r1.patch.renovacao, 'automatica');
  assert.equal(r1.patch.modeloVersao, 3); assert.equal(r1.patch.clausulas.length, 1); assert.equal(r1.patch.atividadesIncluidas.length, 1); assert.equal(r1.patch.atividadesExcluidas.length, 1);
  const r2 = d.aplicarModeloAoContrato({ tem: true, valorCentavos: 99900, recorrencia: 'dia', fim: '2026-12-31', renovacao: 'manual', inicio: '2026-01-01', atividadesIncluidas: [{ id: 'x', texto: 'Limpeza' }], atividadesExcluidas: [{ id: 'y', texto: 'Limpeza extra' }] }, mod);
  assert.ok(!('valorCentavos' in r2.patch) && !('recorrencia' in r2.patch) && !('fim' in r2.patch) && !('renovacao' in r2.patch)); // nada sobrescrito
  assert.equal(r2.patch.atividadesIncluidas.length, 1); assert.ok(r2.notas.some((n) => /mantido|mantida/.test(n)));
  const r3 = d.aplicarModeloAoContrato({ tem: true, atividadesExcluidas: [{ id: 'y', texto: 'Limpeza' }] }, mod); // "Limpeza" já está nas não incluídas
  assert.equal(r3.patch.atividadesIncluidas.length, 0); assert.ok(r3.notas.some((n) => /não entrou|não entraram/.test(n)));
  assert.equal(d.somarMesesIso('2026-01-31', 1), '2026-02-28'); assert.equal(d.somarMesesIso('', 1), '');
  // contrato do fornecedor: documento só quando completo
  const forn = { razaoSocial: 'Empresa Teste Ltda', documento: '11.222.333/0001-81', contrato: { tem: true, contratanteEmpresaId: 'e1', modeloId: 'm1', clausulas: [{ titulo: '', texto: 'T' }], atividadesIncluidas: [{ id: 'a', texto: 'Limpeza' }], inicio: '2026-11-01', camposAdicionaisDef: [{ id: 'c1', rotulo: 'Local', tipo: 'texto', obrigatorio: true }], camposAdicionais: {} } };
  assert.deepEqual(d.faltasDoContrato(forn), ['campo "Local"']);
  forn.contrato.camposAdicionais = { c1: 'Loja Centro' }; assert.deepEqual(d.faltasDoContrato(forn), []);
  assert.deepEqual(d.faltasDoContrato({ ...forn, contrato: { tem: false } }).length, 1);
  assert.ok(d.faltasDoContrato({ ...forn, contrato: { tem: true } }).length >= 3); // empresa contratante, atividade incluída e início da vigência
  assert.deepEqual(d.faltasDoContrato({ ...forn, contrato: { ...forn.contrato, modeloId: '', clausulas: [] } }), []); // contrato padrão em blocos: o tipo de contrato e as cláusulas são opcionais
  assert.deepEqual(d.faltasDoContrato({ ...forn, contrato: { ...forn.contrato, contratanteEmpresaId: '' } }), ['empresa contratante']);
  assert.equal(d.validarContratoDocumento(forn.contrato), '');
  assert.match(d.validarContratoDocumento({ ...forn.contrato, camposAdicionaisDef: [{ id: 'c2', rotulo: 'Quando', tipo: 'data' }], camposAdicionais: { c2: 'amanhã' } }), /data/);
  assert.match(d.validarContratoDocumento({ atividadesIncluidas: [{ id: '1', texto: 'A' }], atividadesExcluidas: [{ id: '2', texto: 'A' }] }), /ao mesmo tempo/);
  assert.equal(d.validarFornecedorEtapas({ ...forn, categorias: ['servico'], contrato: { ...forn.contrato, atividadesExcluidas: [{ id: '2', texto: 'Limpeza' }] } }, { cnpjValid: () => true, cpfValid: () => true })[5].length > 0, true);
  assert.equal(d.nomeCliente({ tipoPessoa: 'fisica', nome: ' Ana Teste ' }), 'Ana Teste');
  assert.equal(d.nomeCliente({ tipoPessoa: 'juridica', razaoSocial: 'Empresa Ltda', nomeFantasia: 'Fantasia' }), 'Fantasia');
  assert.equal(d.nomeCliente({ tipoPessoa: 'juridica', razaoSocial: 'Empresa Ltda' }), 'Empresa Ltda');
  assert.equal(d.nomeCliente(null), '');
  const ctx = { clientes: [{ id: 'x1', tipoPessoa: 'fisica', cadastro: 'completo', nome: 'Outro Cliente', cpf: '111.444.777-35', whatsapp: '(31) 90000-0000' }, { id: 'x2', tipoPessoa: 'juridica', cadastro: 'simples', cnpj: '45.723.174/0001-10', razaoSocial: 'Existente' }] };
  const e = (c) => d.validarClienteEtapas(c, regras, ctx);
  const pfs = { id: 'n1', tipoPessoa: 'fisica', cadastro: 'simples', nome: 'Ana Teste', whatsapp: '(31) 98888-0000', email: 'ana@exemplo.test', nascimento: '1990-08-15' };
  // PF simples: uma página; nome, WhatsApp, e-mail e nascimento obrigatórios; sem CPF nem endereço.
  assert.deepEqual(e(pfs), ['']);
  assert.match(e({ ...pfs, nome: ' ' })[0], /nome completo/);
  assert.match(e({ ...pfs, whatsapp: '' })[0], /WhatsApp/);
  assert.match(e({ ...pfs, whatsapp: '12' })[0], /WhatsApp inválido/);
  assert.match(e({ ...pfs, email: '' })[0], /Informe o e-mail/);
  assert.match(e({ ...pfs, email: 'sem-arroba' })[0], /E-mail inválido/);
  assert.match(e({ ...pfs, nascimento: '' })[0], /data de aniversário/);
  assert.match(e({ ...pfs, nascimento: '1990-02-31' })[0], /data de aniversário/); // nascimento antigo impossível não vale como aniversário
  // Data de aniversário (17/11/2026): dia e mês; o cliente antigo, só com nascimento, vale pelo dia e mês dele.
  assert.equal(e({ ...pfs, nascimento: undefined, aniversario: '08-15' })[0], '');
  assert.match(e({ ...pfs, nascimento: undefined, aniversario: '02-30' })[0], /aniversário inválida/);
  assert.match(e({ ...pfs, nascimento: undefined, aniversario: '08-' })[0], /aniversário inválida/);
  assert.equal(d.aniversarioCliente({ nascimento: '1990-08-15' }), '08-15');
  assert.equal(d.aniversarioCliente({ nascimento: '1990-08-15', aniversario: '09-01' }), '09-01');
  assert.equal(d.aniversarioCliente({}), '');
  assert.match(e({ ...pfs, nome: 'outro cliente', whatsapp: '(31) 90000-0000' })[0], /nome e WhatsApp/); // não duplica
  assert.deepEqual(e({ ...pfs, id: 'x1', nome: 'Outro Cliente', whatsapp: '(31) 90000-0000' }), ['']); // o próprio registro não conta como duplicado
  // PF completo: o mesmo mais CPF válido; endereço opcional, mas no formato.
  const pfc = { ...pfs, cadastro: 'completo', cpf: '529.982.247-25', endereco: { cep: '30130-000', uf: 'MG' } };
  assert.deepEqual(e(pfc), ['', '', '', '']);
  assert.match(e({ ...pfc, cpf: '' })[0], /CPF válido/);
  assert.match(e({ ...pfc, cpf: '111.111.111-11' })[0], /CPF válido/);
  assert.match(e({ ...pfc, cpf: '111.444.777-35' })[0], /Já existe um cliente com este CPF/);
  assert.deepEqual(e({ ...pfc, endereco: undefined }), ['', '', '', '']);
  assert.match(e({ ...pfc, endereco: { cep: '123' } })[1], /CEP/);
  assert.match(e({ ...pfc, endereco: { uf: 'minas' } })[1], /UF/);
  // PJ simples: CNPJ válido, razão social e WhatsApp; fantasia e e-mail opcionais.
  const pjs = { id: 'n2', tipoPessoa: 'juridica', cadastro: 'simples', cnpj: '11.222.333/0001-81', razaoSocial: 'Empresa Alfa Ltda', whatsapp: '(31) 3333-4444' };
  assert.deepEqual(e(pjs), ['']);
  assert.match(e({ ...pjs, cnpj: '11.222.333/0001-80' })[0], /CNPJ válido/);
  assert.match(e({ ...pjs, cnpj: '45.723.174/0001-10' })[0], /Já existe um cliente com este CNPJ/);
  assert.match(e({ ...pjs, razaoSocial: '' })[0], /razão social/);
  assert.match(e({ ...pjs, whatsapp: '' })[0], /WhatsApp/);
  assert.match(e({ ...pjs, email: 'x@' })[0], /E-mail inválido/);
  assert.deepEqual(e({ ...pjs, nome: '', cpf: '' }), ['']); // campos de PF não entram na PJ
  // PJ completo: cinco etapas (base de Fornecedores): empresa, contato, financeiro, representante, revisão.
  const pjc = { ...pjs, cadastro: 'completo', regimeTributario: 'simples', contatoAniversario: '02-29', financeiro: { nome: 'Fin', whatsapp: '(31) 99999-0000', email: 'fin@exemplo.test' }, representante: { nome: 'Rep', cargo: 'diretor-geral' },
    contrato: { tem: true, formaPagamento: 'boleto', recorrencia: 'mes', valorCentavos: 250000, salarioMinimo: { ativo: true, percentual: 150 } } };
  // 17/11/2026: PJ em etapas tem 4 etapas (contato + financeiro juntos) e a 1ª exige tudo, menos o complemento.
  const pjOk = { ...pjc, contatoNome: 'Responsavel Teste', email: 'financeiro@exemplo.test', nomeFantasia: 'Fantasia Teste', endereco: { cep: '30130-000', logradouro: 'Rua Teste', numero: '10', bairro: 'Centro', cidade: 'Cidade Teste', uf: 'MG' } };
  assert.deepEqual(e(pjOk), ['', '', '', '']);
  assert.match(e({ ...pjOk, nomeFantasia: '' })[0], /nome fantasia/);
  // quadro "Dados do responsável": nome, WhatsApp, e-mail e aniversário obrigatórios
  assert.match(e({ ...pjOk, contatoNome: '' })[1], /nome do responsável/);
  assert.match(e({ ...pjOk, email: '' })[1], /Informe o e-mail/);
  assert.match(e({ ...pjOk, whatsapp: '' })[1], /WhatsApp/);
  assert.match(e({ ...pjOk, contatoAniversario: '' })[1], /aniversário do responsável/);
  assert.match(e({ ...pjOk, regimeTributario: '' })[0], /regime tributário/);
  assert.match(e({ ...pjOk, endereco: { ...pjOk.endereco, numero: '' } })[0], /número do endereço/);
  assert.match(e({ ...pjOk, endereco: { ...pjOk.endereco, uf: '' } })[0], /UF/);
  assert.equal(e({ ...pjOk, endereco: { ...pjOk.endereco, complemento: '' } })[0], '');
  assert.match(e({ ...pjOk, regimeTributario: 'xx' })[0], /Regime/);
  assert.match(e({ ...pjOk, contatoAniversario: '02-30' })[1], /Aniversário do responsável/);
  assert.match(e({ ...pjOk, financeiro: { mesmo: false, whatsapp: '1' } })[1], /WhatsApp do financeiro/);
  assert.match(e({ ...pjOk, contrato: { tem: true, temDocumento: true, recorrencia: 'personalizado' } })[3], /recorrência personalizada/i);
  assert.match(e({ ...pjOk, contrato: { tem: true, temDocumento: true, salarioMinimo: { ativo: true, percentual: 0 } } })[3], /percentual do salário mínimo/);
  assert.deepEqual(e({ ...pjOk, contrato: { tem: false, valorCentavos: -1 } }), ['', '', '', '']); // sem contrato, nada é conferido
  assert.deepEqual(e({ ...pjOk, contrato: { tem: true, recorrencia: 'personalizado' } }), ['', '', '', '']); // no cliente, "Tem contrato?" é temDocumento: desligado, o contrato não é conferido
  assert.deepEqual(e({ ...pjOk, contrato: { tem: true, temDocumento: true } }), ['', '', '', '', '']); // com contrato, a etapa Contrato existe
  assert.match(e({ ...pjOk, representante: { cargo: 'chefe' } })[2], /Cargo do representante/);
  assert.match(e({ ...pjOk, representante: { whatsapp: '1' } })[2], /WhatsApp do representante/);
  assert.equal(d.validarCliente(pjs, regras, ctx), '');
  assert.match(d.validarCliente({ ...pjs, razaoSocial: '' }, regras, ctx), /razão social/);
  // A regra do contrato é a mesma do fornecedor (extraída para uma função só).
  assert.equal(d.validarContratoFinanceiro(null), '');
  assert.equal(d.validarContratoFinanceiro({ tem: false, valorCentavos: -9 }), '');
  assert.match(d.validarContratoFinanceiro({ tem: true, formaPagamento: 'cheque' }), /Forma de pagamento/);
});

console.log(checks + ' checks de regras de Compras passaram');
