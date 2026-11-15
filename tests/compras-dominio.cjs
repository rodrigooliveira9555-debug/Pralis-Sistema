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
  assert.equal(d.nomeCategoriasFornecedor({ categorias: ['servico', 'produto'] }), 'Produto e Serviço');
  assert.equal(d.nomeCategoriasFornecedor({ categorias: ['servico'] }), 'Serviço');
  assert.equal(d.nomeCategoriasFornecedor({ categorias: [] }), '');
  assert.equal(d.nomeCategoriasFornecedor({}), '');
});
ok(() => {
  assert.equal(d.tipoPessoaDe({ documento: '529.982.247-25' }), 'fisica');
  assert.equal(d.tipoPessoaDe({ documento: '11.222.333/0001-81' }), 'juridica');
  assert.equal(d.tipoPessoaDe({ documento: '' }), '');
  assert.equal(d.tipoPessoaDe({ documento: '11.222.333/0001-81', tipoPessoa: 'fisica' }), 'fisica');
});
ok(() => {
  const ctx = { fornecedores: [{ id: 'f9', nome: 'Moinho Teste' }] };
  const pj = { id: 'f1', nome: 'Fornecedor Teste', tipoPessoa: 'juridica', documento: '11.222.333/0001-81', categorias: ['produto'], whatsapp: '(31) 99999-0000', email: '', financeiro: { nome: '', whatsapp: '', email: '' }, nascimento: '' };
  const v = (mudanca) => d.validarFornecedor({ ...pj, ...mudanca }, regras, ctx);
  assert.equal(v({}), '');
  assert.match(v({ categorias: [] }), /categoria/);
  assert.match(v({ categorias: undefined }), /categoria/);
  assert.match(v({ categorias: ['outra'] }), /inválida/);
  assert.equal(v({ categorias: ['produto', 'servico'] }), '');
  assert.match(v({ tipoPessoa: '' }), /tipo de pessoa/);
  assert.match(v({ nome: ' ' }), /nome/);
  assert.match(v({ nome: 'MOINHO TESTE' }), /Já existe/);
  assert.match(v({ documento: '' }), /CNPJ/);
  assert.match(v({ documento: '11.222.333/0001-80' }), /CNPJ/);
  assert.match(v({ documento: '529.982.247-25' }), /CNPJ/);
  assert.match(v({ whatsapp: '' }), /WhatsApp do vendedor/);
  assert.match(v({ email: 'sem-arroba' }), /E-mail do vendedor/);
  assert.match(v({ financeiro: { nome: 'Fin', whatsapp: '123', email: '' } }), /WhatsApp do financeiro/);
  assert.match(v({ financeiro: { nome: 'Fin', whatsapp: '', email: 'x@' } }), /E-mail do financeiro/);
  assert.equal(v({ tipoPessoa: 'fisica', documento: '529.982.247-25' }), '');
  // Cadastro em etapas: vendedor (CPF e nascimento opcionais, conferidos se vierem), financeiro e representante.
  assert.equal(v({ vendedorNascimento: '1990-01-01', regimeTributario: 'simples' }), '');
  assert.equal(v({ vendedorCpf: 'valor antigo qualquer' }), ''); // o CPF do vendedor não é mais pedido nem conferido
  assert.equal(v({ representante: { mesmo: true, cargo: 'socio-proprietario' } }), '');
  assert.match(v({ representante: { cargo: 'chefe' } }), /Cargo do representante/);
  assert.deepEqual(d.CARGOS_REPRESENTANTE.map(([, nome]) => nome), ['Proprietário', 'Sócio-proprietário', 'Diretor geral', 'Diretor comercial', 'Gerente geral', 'Gerente comercial',
    'Supervisor geral', 'Supervisor comercial', 'Representante comercial', 'Administrador', 'Financeiro', 'Procurador', 'Outro']);
  assert.deepEqual(d.etapasFornecedor([]), ['Dados da empresa', 'Dados do vendedor', 'Dados do financeiro', 'Dados do representante']);
  assert.match(v({ vendedorNascimento: '01/01/1990' }), /nascimento/);
  assert.match(v({ regimeTributario: 'outro' }), /Regime/);
  assert.match(v({ representante: { nome: 'Rep', whatsapp: '12', email: '' } }), /WhatsApp do representante/);
  assert.match(v({ nome: '' }), /nome fantasia ou a razão social/);
  // Cada problema aparece na etapa dele.
  const etapas = d.validarFornecedorEtapas({ ...pj, categorias: [], whatsapp: '', financeiro: { email: 'x@' }, representante: { whatsapp: '1' } }, regras, ctx);
  assert.deepEqual(etapas.map(Boolean), [true, true, true, true]);
  assert.deepEqual(d.validarFornecedorEtapas(pj, regras, ctx), ['', '', '', '']);
  assert.deepEqual(d.etapasFornecedor(['produto']).slice(1, 2), ['Dados do vendedor']);
  assert.deepEqual(d.etapasFornecedor(['servico']).slice(1, 2), ['Dados do prestador']);
  assert.deepEqual(d.etapasFornecedor(['produto', 'servico']).slice(1, 2), ['Dados do vendedor / prestador']);
  assert.equal(d.etapasFornecedor([]).length, 4);
  assert.equal(d.etapasFornecedor([])[0], 'Dados da empresa');
  // Endereço é opcional; o que vier precisa estar no formato.
  assert.equal(v({ endereco: { cep: '01001-000', logradouro: 'Rua Teste', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Cidade Teste', uf: 'SP' } }), '');
  assert.equal(v({ endereco: {} }), '');
  assert.match(v({ endereco: { cep: '0100' } }), /CEP/);
  assert.match(v({ endereco: { uf: 'sp' } }), /UF/);
  assert.match(v({ tipoPessoa: 'fisica', documento: '529.982.247-24' }), /CPF/);
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

console.log(checks + ' checks de regras de Compras passaram');
