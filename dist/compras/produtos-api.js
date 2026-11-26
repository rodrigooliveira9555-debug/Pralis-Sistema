/*
 * Produtos no servidor (docs/PRODUTOS_NO_SERVIDOR_PLANO.md, fases 2 e 3): a ÚNICA porta da tela para a API de produtos.
 * - Resumo dos ATIVOS guardado no aparelho (cicluz-produtos-resumo-v1, não sincronizado): a loja vê os produtos sem
 *   internet. Compras, Produção e estoque continuam lendo S.dados.produtos, que dados.js monta com este resumo.
 * - "Modo servidor" só depois que o catálogo está no servidor (resumo.ativado). Antes disso, tudo segue como era.
 * - Transferência: o primeiro aparelho de ADMINISTRADOR conectado leva os produtos que estão no aparelho para a tabela
 *   (mesmo id e código; o servidor nunca sobrescreve). Só quando TODOS chegaram o catálogo passa a valer.
 * Conversão tela ↔ API num lugar só (deApi / paraApi).
 */
(function () {
  'use strict';
  const CHAVE_RESUMO = 'cicluz-produtos-resumo-v1';
  const LOTE = 500;
  // Campos que são colunas na API ou estado do aparelho: o resto do produto vai em `dados`.
  const FORA_DE_DADOS = ['id', 'codigoInterno', 'codigoBarras', 'nomeCatalogo', 'descricao', 'marca', 'tipo', 'status', 'liberadoCompra',
    'grupoId', 'subgrupoId', 'localId', 'custo', 'margem', 'precoVenda', 'auto', 'versao', 'appId', 'appLojaId', 'semGrupo', 'semLocal',
    'saldo', 'vendas3m', 'compras3m', 'lucro3m', 'arquivado', 'origemApp'];

  const perfil = () => window.CicluzSessao && window.CicluzSessao.perfil;
  const conectado = () => { const p = perfil(); return Boolean(p && p.usuarioId && p.usuarioId !== 'local' && window.CicluzSync && window.CicluzSync.api); };
  const api = (caminho, opcoes) => window.CicluzSync.api(caminho, opcoes);
  const avisarMudanca = () => document.dispatchEvent(new CustomEvent('cicluz-produtos-mudou'));

  let cache = null;
  try { cache = JSON.parse(localStorage.getItem(CHAVE_RESUMO) || 'null'); } catch (e) { cache = null; }
  function gravarCache(c) { cache = c; try { localStorage.setItem(CHAVE_RESUMO, JSON.stringify(c)); } catch (e) { /* segue em memória */ } }

  /**
   * Modo servidor: o último resumo recebido disse que o catálogo está no servidor. Não depende de login: a página do
   * fornecedor (sem login) e o aparelho sem internet leem os produtos do resumo guardado. Gravar exige login (conectado).
   */
  const modoServidor = () => Boolean(cache && cache.ativado);
  /** Produtos ativos do resumo (formato da tela). Vazio fora do modo servidor. */
  const ativos = () => (modoServidor() && cache && Array.isArray(cache.produtos) ? cache.produtos : []);

  /* ---------- Conversão ---------- */
  const num = (v) => (v == null || v === '' ? null : Number(v));
  function deApi(r) {
    return {
      ...(r.dados || {}), id: r.id, codigoInterno: r.codigoInterno, codigoBarras: r.codigoBarras, nomeCatalogo: r.nome, descricao: r.descricao,
      marca: r.marca || '', tipo: r.tipo, status: r.status, liberadoCompra: r.liberadoCompra, grupoId: r.grupoId, subgrupoId: r.subgrupoId,
      localId: r.localId, custo: num(r.custo), margem: num(r.margem), precoVenda: num(r.precoVenda), auto: Boolean(r.calculoAutomatico),
      versao: r.versao, appId: r.appId || null, semGrupo: Boolean(r.semGrupo), semLocal: Boolean(r.semLocal),
    };
  }
  /** Dinheiro com no máximo 2 casas: só tira o ruído de ponto flutuante; valor com mais casas é recusado (nunca arredonda calado). */
  function dinheiro(v, rotulo) {
    if (v == null || v === '') return null;
    const n = Number(v); const c = Math.round(n * 100) / 100;
    if (!Number.isFinite(n) || Math.abs(c - n) > 1e-9) throw new Error(rotulo + ' com mais de 2 casas: ' + v);
    return c;
  }
  function paraApi(p) {
    const dados = {};
    for (const [k, v] of Object.entries(p)) if (!FORA_DE_DADOS.includes(k) && v !== undefined) dados[k] = v;
    if (p.origemApp) dados.origemApp = p.origemApp;
    const nome = String(p.nomeCatalogo || p.descricao || '').trim();
    return {
      nome, descricao: String(p.descricao || nome).trim(), marca: p.marca || null, codigoBarras: p.codigoBarras || null,
      tipo: p.tipo === 'transformacao' ? 'transformacao' : 'revenda', status: p.status === 'inativo' ? 'inativo' : 'ativo',
      liberadoCompra: Boolean(p.liberadoCompra), grupoId: p.grupoId || null, subgrupoId: p.subgrupoId || null, localId: p.localId || null,
      custo: dinheiro(p.custo, 'Custo'), margem: p.margem == null || p.margem === '' ? null : Math.round(Number(p.margem) * 1e6) / 1e6,
      precoVenda: dinheiro(p.precoVenda, 'Preço de venda'), calculoAutomatico: Boolean(p.auto), dados,
    };
  }

  /* ---------- Leitura ---------- */
  /** Busca o resumo no servidor e guarda no aparelho. Sem conexão, mantém o que já estava guardado. */
  async function atualizar() {
    if (!conectado()) return cache;
    const r = await api('/produtos/resumo');
    const eraServidor = modoServidor();
    gravarCache({ ativado: Boolean(r.ativado), em: new Date().toISOString(), produtos: (r.produtos || []).map(deApi) });
    avisarMudanca();
    if (!eraServidor && modoServidor()) document.dispatchEvent(new CustomEvent('cicluz-produtos-modo-servidor'));
    return cache;
  }
  const ORDEM = { recentes: 'recentes', antigos: 'recentes', az: 'nome', za: 'nome', codigo_asc: 'codigo', codigo_desc: 'codigo' };
  /** Página do catálogo inteiro (inclusive inativos) no servidor. */
  async function listar(filtro) {
    const q = new URLSearchParams();
    if (filtro.busca) q.set('busca', filtro.busca);
    q.set('status', filtro.status || 'todos');
    if (filtro.tipo) q.set('tipo', filtro.tipo);
    if (filtro.grupo) q.set('grupoId', filtro.grupo);
    if (filtro.vinculo) q.set('vinculo', filtro.vinculo);
    q.set('ordem', ORDEM[filtro.ordem] || 'recentes');
    q.set('pagina', String(filtro.pagina || 1));
    q.set('tamanho', String(filtro.tamanho || 12));
    const r = await api('/produtos?' + q.toString());
    return { ...r, itens: r.itens.map(deApi) };
  }
  const obter = async (id) => deApi(await api('/produtos/item/' + encodeURIComponent(id)));

  /* ---------- Gravação ---------- */
  /** Agenda (P-52): conta a ação feita na tela de Produtos para a tarefa programada que espera por ela. */
  const contarNaAgenda = (acao, n = 1) => { if (window.CicluzAgendaRotina) window.CicluzAgendaRotina.acaoFeita(acao, n); };
  async function criar(p) {
    const r = deApi(await api('/produtos', { metodo: 'POST', corpo: paraApi(p) }));
    await atualizar().catch(() => undefined);
    contarNaAgenda('produtos:cadastrar');
    return r;
  }
  async function editar(p) {
    const estavaAtivo = ativos().some((x) => x.id === p.id);
    const r = deApi(await api('/produtos/item/' + encodeURIComponent(p.id), { metodo: 'PUT', corpo: { ...paraApi(p), versao: p.versao } }));
    await atualizar().catch(() => undefined);
    // Excluir um produto no S2 é inativá-lo (o histórico fica): ativo que passou a inativo conta como "excluir".
    contarNaAgenda(estavaAtivo && r.status === 'inativo' ? 'produtos:excluir' : 'produtos:alterar');
    return r;
  }
  /** Importação do app: produtos montados por produto-importacao.js (ativos e inativos), em lotes de 500. */
  async function importar(montado, aoAndar) {
    const todos = montado.produtos.concat(montado.inativos || []);
    const total = { novos: 0, atualizados: 0 };
    for (let i = 0; i < todos.length; i += LOTE) {
      const produtos = todos.slice(i, i + LOTE).map((p) => {
        const origem = p.origemApp || {};
        return { ...paraApi(p), liberadoCompra: undefined, codigoInterno: String(p.codigoInterno), appId: p.appId, appLojaId: p.appLojaId || null,
          origemGrupo: origem.grupo || '', origemLocais: origem.locais ? String(origem.locais).split(' | ').filter(Boolean) : [] };
      });
      const r = await api('/produtos/importacao', { metodo: 'POST', corpo: { produtos, maiorCodigoApp: montado.maiorCodigoApp || 0 } });
      total.novos += r.novos; total.atualizados += r.atualizados;
      if (aoAndar) aoAndar(Math.min(i + LOTE, todos.length), todos.length);
    }
    await atualizar();
    return total;
  }
  async function revincular() {
    const r = await api('/produtos/revincular', { metodo: 'POST' });
    await atualizar();
    return r;
  }

  /* ---------- Transferência dos produtos do aparelho (uma vez por empresa) ---------- */
  /**
   * Leva os produtos do aparelho para o servidor. Devolve { faltando, invalidos }: só se os dois vierem vazios o
   * catálogo do servidor passa a valer (o resumo volta ativado). Nada é apagado do aparelho aqui.
   */
  async function transferir(produtos, maiorCodigo, aoAndar) {
    const faltando = []; const invalidos = []; const prontos = [];
    for (const p of produtos) {
      try { prontos.push({ ...paraApi(p), id: p.id, codigoInterno: String(p.codigoInterno || ''), appId: p.appId || null, appLojaId: p.appLojaId || null }); }
      catch (e) { invalidos.push({ id: p.id, codigoInterno: p.codigoInterno, motivo: e.message }); }
    }
    // Sem código interno (produto antigo): o servidor dá o próximo código, pela mesma regra da criação.
    const validos = prontos.map((p) => (p.codigoInterno ? p : { ...p, codigoInterno: null }));
    for (let i = 0; i < validos.length; i += LOTE) {
      const r = await api('/produtos/transferencia', { metodo: 'POST', corpo: { produtos: validos.slice(i, i + LOTE), maiorCodigo: maiorCodigo || 0 } });
      faltando.push(...r.faltando);
      if (aoAndar) aoAndar(Math.min(i + LOTE, validos.length), validos.length);
    }
    // Só conclui (o catálogo do servidor passa a valer) se TODOS chegaram. Senão, tudo continua como estava.
    if (!faltando.length && !invalidos.length) await api('/produtos/transferencia', { metodo: 'POST', corpo: { produtos: [], maiorCodigo: maiorCodigo || 0, concluir: true } });
    await atualizar();
    return { faltando, invalidos };
  }

  window.CicluzProdutos = { CHAVE_RESUMO, conectado, modoServidor, ativos, atualizar, listar, obter, criar, editar, importar, revincular, transferir, deApi, paraApi };
})();
