// Importação do app de produtos → MER - Produtos (regras puras). Dados 100% fictícios.
const assert = require('node:assert/strict');
const I = require('../dist/compras/produto-importacao.js');
const R = require('../dist/compras/produto-regras.js');

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

const semente = () => ({
  produtos: [{ id: 'p-coca2l', codigoInterno: '12001' }, { id: 'p-inativo', codigoInterno: '12019' }, { id: 'p-real', codigoInterno: '13100', descricao: 'CADASTRADO À MÃO NO S2', saldo: 5 }],
  catalogo: [{ id: 'v1', produtoId: 'p-coca2l', fornecedorId: 'f1' }, { id: 'v2', produtoId: 'p-real', fornecedorId: 'f1' }],
  convites: [{ id: 'c1', itens: ['p-coca2l'] }], rodadas: [{ id: 'r1', itens: [{ produtoId: 'p-real' }] }], fornecedores: [{ id: 'f1' }],
});

t('prévia e importação: exemplos saem com seus registros; o real do S2 fica', () => {
  const d = semente();
  const plano = I.planejar(d, montado, OPC);
  assert.equal(plano.novos, 7); assert.equal(plano.atualizados, 0); assert.equal(plano.exemplosQueSaem, 2);
  assert.equal(plano.ativos, 6); assert.equal(plano.inativos, 1); assert.equal(plano.noArquivo, 1);
  assert.deepEqual(d.produtos.map((p) => p.id), ['p-coca2l', 'p-inativo', 'p-real'], 'a prévia não mexe nos dados');
  assert.deepEqual(plano.registrosQueSaem, { catalogo: 1, convites: 1 });
  assert.equal(plano.semGrupo, 2, 'sem grupo no app + grupo que não existe no S2'); assert.equal(plano.semLocal, 4);
  const r = I.aplicar(d, montado, []);
  assert.deepEqual([r.novos, r.atualizados, r.arquivados], [7, 0, 1]);
  assert.deepEqual(r.arquivo.map((p) => [p.id, p.status, p.liberadoCompra]), [['pi-13300', 'inativo', false]], 'inativo do app vai para o arquivo, não liberado');
  assert.deepEqual(d.produtos.map((p) => p.id).sort(), ['p-real', 'pi-13001', 'pi-13002', 'pi-13003', 'pi-13004', 'pi-13005', 'pi-700123']);
  assert.deepEqual(d.catalogo.map((x) => x.id), ['v2']); assert.equal(d.convites.length, 0); assert.equal(d.rodadas.length, 1); assert.equal(d.fornecedores.length, 1);
  const novo = d.produtos.find((p) => p.id === 'pi-13001');
  assert.equal(novo.liberadoCompra, true, 'ativo importado nasce liberado (decisão do Zé)'); assert.equal(novo.saldo, 0);
  assert.equal(d.codigoInternoApp, 13300);
});

t('reimportar não duplica e não desfaz o que é do S2 nem o vínculo feito à mão', () => {
  const d = semente();
  const arq = I.aplicar(d, montado, []).arquivo;
  const p = d.produtos.find((x) => x.id === 'pi-13004');
  Object.assign(p, { saldo: 12, liberadoCompra: false, grupoId: 'g10', subgrupoId: 'g10s0', vinculoManual: { grupo: true } });
  const outro = I.montarProdutos(LINHAS.map((l) => (l.id === 't13001' ? { ...l, venda_pontual: '10.5' } : l)), [], OPC);
  const r2 = I.aplicar(d, outro, arq);
  assert.deepEqual([r2.novos, r2.atualizados, r2.arquivo.length], [0, 7, 1]);
  assert.equal(d.produtos.length, 7);
  assert.deepEqual([p.saldo, p.liberadoCompra, p.grupoId, p.subgrupoId], [12, false, 'g10', 'g10s0']);
  assert.equal(d.produtos.find((x) => x.id === 'pi-13001').precoVenda, 10.5, 'valor do app atualiza');
  // Casa pelo código interno quando o produto não tem o id do app (ex.: cadastrado antes no S2 com o mesmo código)
  const d2 = { produtos: [{ id: 'p-xyz', codigoInterno: '13002', saldo: 3 }] };
  const r3 = I.aplicar(d2, montado, []);
  assert.deepEqual([r3.novos, r3.atualizados], [6, 1]);
  assert.equal(d2.produtos.find((x) => x.id === 'p-xyz').appId, 'b13002');
});

t('alerta de vínculo e revincular depois que a árvore e os grupos mudam', () => {
  const d = semente();
  I.aplicar(d, I.montarProdutos(LINHAS, [], { grupos: GRUPOS, arvore: [] }), []);
  const nos0 = I.nosDaArvore([]);
  const pao = d.produtos.find((p) => p.id === 'pi-13003');
  assert.deepEqual(I.alertasDeVinculo(pao, GRUPOS, nos0), { semGrupo: false, semLocal: true });
  assert.deepEqual(I.alertasDeVinculo({ grupoId: 'g99' }, GRUPOS, nos0), { semGrupo: true, semLocal: true }, 'grupo apagado no S2 volta a alertar');
  const manual = d.produtos.find((p) => p.id === 'pi-13001');
  manual.localId = 's-est'; manual.vinculoManual = { local: true };
  const gruposNovos = GRUPOS.concat([{ id: 'g3x', nome: 'BEBIDAS', subgrupos: [] }]).map((g) => (g.id === 'g3' ? { ...g, subgrupos: g.subgrupos.concat([{ id: 'g3s9', nome: 'VINHOS' }]) } : g));
  const n = I.revincular(d.produtos, { grupos: gruposNovos, arvore: ARVORE });
  assert.ok(n >= 2);
  assert.equal(pao.localId, 's-pan', 'local casou depois da árvore pronta');
  assert.equal(d.produtos.find((p) => p.id === 'pi-13005').subgrupoId, 'g3s9', 'grupo criado depois casa');
  assert.equal(manual.localId, 's-est', 'vínculo à mão não muda');
});

t('próximo código do S2 fica acima do maior do app (inclusive inativo)', () => {
  const d = semente(); I.aplicar(d, montado, []);
  const proximo = R.proximoCodigoInterno(d.produtos.map((p) => p.codigoInterno).concat([d.codigoInternoApp]));
  assert.equal(proximo, '13301');
  assert.equal(R.codigoBarrasNaCriacao('', proximo), '13301');
});

t('tamanho medido em bytes UTF-8', () => {
  assert.equal(I.bytes({ a: 'ç' }), 10);
  assert.ok(I.LIMITE_BYTES < 4 * 1024 * 1024);
});

t('inativo no arquivo volta para o Compras quando o app o reativa; ativo que vira inativo fica no Compras', () => {
  const d = semente();
  let arq = I.aplicar(d, montado, []).arquivo;
  const reativado = LINHAS.map((l) => (l.codigo_interno === '13300' ? { ...l, status: 'ativo' } : l.codigo_interno === '13002' ? { ...l, status: 'inativo' } : l));
  const r = I.aplicar(d, I.montarProdutos(reativado, [], OPC), arq);
  arq = r.arquivo;
  assert.equal(r.voltaramDoArquivo, 1); assert.equal(arq.length, 0, 'saiu do arquivo');
  const volta = d.produtos.find((p) => p.codigoInterno === '13300');
  assert.deepEqual([volta.id, volta.status, volta.liberadoCompra], ['pi-13300', 'ativo', true]);
  const virou = d.produtos.find((p) => p.codigoInterno === '13002');
  assert.deepEqual([virou.status, virou.liberadoCompra], ['inativo', false], 'já estava no Compras: fica lá, inativo e não liberado');
});

const promessas = [];
promessas.push((async () => {
  const lista = I.montarProdutos(LINHAS, PROMOS, OPC).produtos;
  const texto = await I.compactar(lista);
  const o = JSON.parse(texto);
  assert.equal(o.formato, 'gzip-base64'); assert.equal(o.total, lista.length); assert.equal(I.totalDoArquivo(texto), lista.length);
  assert.deepEqual(await I.descompactar(texto), lista, 'compactar e descompactar devolve a mesma lista');
  assert.deepEqual(await I.descompactar(''), []); assert.deepEqual(await I.descompactar(null), []);
  const muitos = Array.from({ length: 4000 }, (_, i) => ({ ...lista[0], id: 'pi-' + i, codigoInterno: String(20000 + i), status: 'inativo' }));
  const grande = await I.compactar(muitos);
  assert.ok(grande.length < I.bytes(muitos) / 5, 'compacta bem: ' + grande.length + ' de ' + I.bytes(muitos));
  grupos++;
})());

Promise.all(promessas).then(() => console.log('compras-importacao: ' + grupos + ' grupos de verificação ok'));
