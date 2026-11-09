// Importação do app de produtos → MER - Produtos (regras puras). Dados 100% fictícios.
const assert = require('node:assert/strict');
const I = require('../dist/compras/produto-importacao.js');

let grupos = 0;
const t = (nome, fn) => { fn(); grupos++; };

const GRUPOS = [
  { id: 'g3', nome: 'BEBIDAS', subgrupos: [{ id: 'g3s0', nome: 'REFRIGERANTES' }, { id: 'g3s3', nome: 'ISOTÔNICOS' }] },
  { id: 'g10', nome: 'FAB. PRÓPRIA', subgrupos: [{ id: 'g10s0', nome: 'PANIFICAÇÃO' }] },
  { id: 'g15', nome: 'INATIVOS', subgrupos: [] },
];
const ARVORE = { tree: [
  { id: 'a-lj', name: 'LJ', children: [{ id: 's-vit', name: 'VITRINES', children: [] }, { id: 's-est', name: 'ESTOQUE LOJA', children: [] }] },
  { id: 'a-pr', name: 'PROD.', children: [{ id: 's-pan', name: 'PANIFICAÇÃO', children: [] }, { id: 's-est2', name: 'ESTOQUE LOJA', children: [] }] },
] };
const WJ = '⁠';
const linha = (o) => ({ id: '', loja: 'BASE', codigo: '', codigo_interno: '', codigo_barras: '', base_product_id: '', nome: '', marca: '', grupo: '', tipo: 'revenda', status: 'ativo', quantidade: '0', medida_base: 'UN', embalagem: '', c_de: '', qt_cad: '1', medida_compra: '', compra_aproximada: 'FALSE', foto_url: '', habilitar_ajuda: 'FALSE', estoque_min: '0', estoque_max: '0', setor_estoque: '', custo: '', margem_pontual: '', venda_pontual: '', calculo_automatico: 'FALSE', setor_venda_1: '', setor_venda_2: '', local_venda_1: '', local_venda_2: '', ncm: '', estado_fiscal: '', motivo_fiscal: '', ...o });
const par = (n, base, loja = {}) => [
  linha({ id: 'b' + n, codigo: 'PR-' + n, codigo_interno: String(n), ...base }),
  linha({ id: 't' + n, loja: 'TNP', base_product_id: 'b' + n, codigo_interno: String(n), ...base, ...loja }),
];
const LINHAS = [
  ...par(13001, { nome: 'REFRI TESTE 2L', grupo: 'MER ' + WJ + 'BEBIDAS - ' + WJ + 'REFRIGERANTES', codigo_barras: '7890000000017', ncm: '22021000', estado_fiscal: 'completo' }, { custo: '48.6', venda_pontual: '9.9', margem_pontual: '0.35', setor_estoque: 'LJ - VITRINES', estoque_min: '6', estoque_max: '24' }),
  ...par(13002, { nome: 'ISOTONICO TESTE', grupo: 'MER BEBIDAS - ISOTONICOS', estado_fiscal: 'zerado-na-carga', motivo_fiscal: 'Carga inicial (texto fixo)' }, { local_venda_1: 'ESTOQUE LOJA' }),
  ...par(13003, { nome: 'PAO TESTE', grupo: 'MER FAB. PROPRIA - PANIFICACAO', tipo: 'transformacao', transformacao_qtd: '50', transformacao_unidade: 'UN' }, { setor_estoque: 'PROD. - PANIFICAÇÃO' }),
  ...par(13004, { nome: 'SEM GRUPO TESTE', grupo: '' }),
  ...par(13005, { nome: 'GRUPO QUE NAO EXISTE', grupo: 'MER BEBIDAS - VINHOS' }),
  ...par(13300, { nome: 'INATIVO DE CODIGO ALTO', grupo: 'MER INATIVOS', status: 'inativo' }, { status: 'inativo' }),
  ...par(700123, { nome: 'BALANCA TESTE', grupo: 'MER INATIVOS' }),
  linha({ id: 'li1', loja: 'LI', codigo_interno: '13006', nome: 'OUTRA LOJA' }),
];
const PROMOS = [{ produto_id: 't13001', loja: 'TNP', codigo_interno: '13001', indice: '1', tipo: 'desconto', valor: '', desconto_pct: '0.2', hora_inicio: '12:00', hora_fim: '15:00', dias: 'SSSSSNN', desconto_ate: '' }];
const OPC = { grupos: GRUPOS, arvore: ARVORE };

t('normalização tira U+2060, acento, caixa e espaços', () => {
  assert.equal(I.limpar(' mer ' + WJ + 'Fab.  Própria '), 'MER FAB. PROPRIA');
  assert.deepEqual(I.separarGrupo('MER ' + WJ + 'BEBIDAS - ' + WJ + 'SUCOS'), { grupo: 'BEBIDAS', sub: 'SUCOS' });
  assert.deepEqual(I.separarGrupo('MER. INATIVOS'), { grupo: 'INATIVOS', sub: '' });
  assert.equal(I.separarGrupo(''), null);
});

t('grupo casa só exato depois de normalizar', () => {
  assert.deepEqual(I.casarGrupo('MER BEBIDAS - ISOTONICOS', GRUPOS), { grupoId: 'g3', subgrupoId: 'g3s3' });
  assert.deepEqual(I.casarGrupo('MER INATIVOS', GRUPOS), { grupoId: 'g15', subgrupoId: null });
  assert.equal(I.casarGrupo('MER BEBIDAS - VINHOS', GRUPOS), null, 'subgrupo inexistente não casa "parecido"');
  assert.equal(I.casarGrupo('MER BEBIDA - REFRIGERANTES', GRUPOS), null, 'sem casamento aproximado');
});

t('local casa por nome ou caminho; nome repetido é ambíguo', () => {
  const nos = I.nosDaArvore(ARVORE);
  assert.equal(nos.length, 6);
  assert.equal(I.casarLocal(['LJ - VITRINES'], nos), 's-vit', 'caminho Área - Setor');
  assert.equal(I.casarLocal(['vitrines'], nos), 's-vit', 'nome do nó');
  assert.equal(I.casarLocal(['ESTOQUE LOJA'], nos), null, 'existe em duas áreas: ambíguo');
  assert.equal(I.casarLocal(['-', '', 'PROD. - PANIFICACAO'], nos), 's-pan', 'ignora "-" e vazio e segue para o próximo texto');
  assert.equal(I.casarLocal(['SALAO'], []), null, 'árvore vazia: sem local');
});

const montado = I.montarProdutos(LINHAS, PROMOS, OPC);
t('monta os produtos da TNP (ativos e inativos separados), com a BASE por baixo e a TNP por cima', () => {
  assert.deepEqual(montado.produtos.map((p) => p.codigoInterno).sort(), ['13001', '13002', '13003', '13004', '13005', '700123']);
  assert.equal(montado.contagem.tnpInativos, 1);
  assert.deepEqual(montado.inativos.map((p) => [p.codigoInterno, p.status]), [['13300', 'inativo']]);
  const r = montado.produtos.find((p) => p.codigoInterno === '13001');
  assert.equal(r.appId, 'b13001'); assert.equal(r.appLojaId, 't13001'); assert.equal(r.codigoBarras, '7890000000017');
  assert.equal(r.custo, 48.6); assert.equal(r.precoVenda, 9.9); assert.equal(r.margem, 0.35, 'dinheiro entra como está gravado');
  assert.deepEqual([r.grupoId, r.subgrupoId, r.localId], ['g3', 'g3s0', 's-vit']);
  assert.equal(r.fiscal.ncm, '22021000');
  assert.deepEqual(r.promocoes, [{ tipo: 'desconto', valor: null, descontoFracao: 0.2, horaInicio: '12:00', horaFim: '15:00', dias: [true, true, true, true, true, false, false], validaAte: null }]);
  assert.equal(r.origemApp.grupo.includes(WJ), false, 'texto original guardado sem o caractere invisível');
  const iso = montado.produtos.find((p) => p.codigoInterno === '13002');
  assert.equal(iso.fiscal.motivo, undefined, 'motivo fixo da carga zerada não se repete'); assert.equal(iso.fiscal.estado, 'zerado-na-carga');
  assert.equal(iso.localId, undefined, 'ESTOQUE LOJA é ambíguo: sem local');
  const pao = montado.produtos.find((p) => p.codigoInterno === '13003');
  assert.deepEqual(pao.transformacao, { quantidade: 50, unidade: 'UN' }); assert.equal(pao.localId, 's-pan');
  assert.equal(montado.maiorCodigoApp, 13300, 'o maior código conta o inativo e ignora >= 700000');
});

t('conflitos de código', () => {
  const c = I.conflitosDeCodigo([{ codigoInterno: '1', codigoBarras: 'x' }, { codigoInterno: '1', codigoBarras: 'x' }, { codigoInterno: '700001' }]);
  assert.deepEqual(c, { internoRepetido: ['1'], barrasRepetido: ['x'], internoForaDaFaixa: 1, semCodigoInterno: 0 });
});

t('alerta de vínculo: sem grupo, subgrupo que sumiu e local fora da árvore', () => {
  const nos = I.nosDaArvore(ARVORE);
  assert.deepEqual(I.alertasDeVinculo({ grupoId: 'g3', subgrupoId: 'g3s0', localId: 's-vit' }, GRUPOS, nos), { semGrupo: false, semLocal: false });
  assert.deepEqual(I.alertasDeVinculo({ grupoId: 'g99' }, GRUPOS, nos), { semGrupo: true, semLocal: true }, 'grupo apagado no S2 volta a alertar');
  assert.deepEqual(I.alertasDeVinculo({ grupoId: 'g3', subgrupoId: 'g3s9', localId: 'nao-existe' }, GRUPOS, nos), { semGrupo: true, semLocal: true });
});

t('exemplos saem com os registros que os citam; o resto fica', () => {
  const d = {
    produtos: [{ id: 'p-coca2l' }, { id: 'p-inativo' }, { id: 'p-real' }],
    catalogo: [{ id: 'v1', produtoId: 'p-coca2l' }, { id: 'v2', produtoId: 'p-real' }],
    convites: [{ id: 'c1', itens: ['p-coca2l'] }], rodadas: [{ id: 'r1', itens: [{ produtoId: 'p-real' }] }], fornecedores: [{ id: 'f1' }],
  };
  assert.equal(I.tirarExemplos(d), 4);
  assert.deepEqual(d.produtos.map((p) => p.id), ['p-real']);
  assert.deepEqual([d.catalogo.length, d.convites.length, d.rodadas.length, d.fornecedores.length], [1, 0, 1, 1]);
});

// Arquivo antigo de inativos (09/11 até a transferência): só se LÊ, para levar ao servidor.
const promessas = [];
promessas.push((async () => {
  const zlib = require('node:zlib');
  const lista = montado.inativos;
  const texto = JSON.stringify({ versao: 1, formato: 'gzip-base64', total: lista.length, dados: zlib.gzipSync(JSON.stringify(lista)).toString('base64') });
  assert.deepEqual(await I.descompactar(texto), lista, 'lê o arquivo antigo como foi gravado');
  assert.deepEqual(await I.descompactar(''), []); assert.deepEqual(await I.descompactar(null), []);
  assert.deepEqual(await I.descompactar(JSON.stringify({ formato: 'outro' })), []);
  grupos++;
})());

Promise.all(promessas).then(() => console.log('compras-importacao: ' + grupos + ' grupos de verificação ok'));
