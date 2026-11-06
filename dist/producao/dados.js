/*
 * Produção e Patrimônio: armazenamento local (uma chave por assunto), no mesmo padrão do Compras:
 * documento versionado, gravação transacional, relê o que outra aba gravou e avisa as telas.
 * Com login, as duas chaves vão para o banco pela sincronização do S2 (servidor/shared/src/documentos.ts).
 *
 *  - cicluz-producao-v1:   configuração de produção por produto, fichas técnicas, agendamentos,
 *                          pedidos de produção e ordens (vínculo com o produto do Compras pelo id).
 *  - cicluz-patrimonio-v1: bens (RET - Patrimônios). Antes desta versão a tela não salvava nada.
 *
 * Começam vazias: sem dados de exemplo, para nada fictício ir para o banco.
 */
(function () {
  'use strict';

  function criarArmazem(KEY, COLECOES, evento) {
    const vazio = () => Object.assign({ versao: 1 }, Object.fromEntries(COLECOES.map((c) => [c, []])));
    const completar = (d) => { for (const c of COLECOES) if (!Array.isArray(d[c])) d[c] = []; return d; };
    const valido = (d) => d && typeof d === 'object' && !Array.isArray(d);
    let dados = vazio();
    let erroLeitura = false;
    try {
      const salvo = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (salvo) { if (!valido(salvo)) throw new Error('formato'); dados = completar(salvo); }
    } catch (e) { erroLeitura = true; }

    function transacao(mudanca) {
      try {
        const atual = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (valido(atual)) dados = completar(atual);
      } catch (e) { /* mantém a cópia em memória */ }
      const antes = structuredClone(dados);
      const textoAntes = JSON.stringify(dados);
      try {
        if (erroLeitura) throw new Error('leitura');
        const r = mudanca(dados);
        const texto = JSON.stringify(dados);
        if (texto !== textoAntes) {
          localStorage.setItem(KEY, texto);
          document.dispatchEvent(new CustomEvent(evento));
        }
        return r === undefined ? true : r;
      } catch (e) {
        dados = antes;
        console.warn(KEY + ': alteração não salva', e);
        return false;
      }
    }
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try { const novo = JSON.parse(e.newValue); if (valido(novo)) { dados = completar(novo); document.dispatchEvent(new CustomEvent(evento, { detail: { externo: true } })); } } catch (err) { /* ignora */ }
    });
    return { KEY, get dados() { return dados; }, get erroLeitura() { return erroLeitura; }, transacao };
  }

  const producao = criarArmazem('cicluz-producao-v1', ['produtos', 'fichas', 'agendas', 'ocorrencias', 'pedidos', 'ordens'], 'cicluz-producao-mudou');
  const patrimonio = criarArmazem('cicluz-patrimonio-v1', ['bens'], 'cicluz-patrimonio-mudou');

  /* ---------- Integrações (só leitura) ---------- */
  const C = () => window.CicluzComprasDados;

  /** Nós da árvore Área / Setor / Local com o caminho completo; o vínculo é pelo id do nó. */
  function locais() {
    const r = [];
    try {
      const salvo = JSON.parse(localStorage.getItem('cicluz-location-tree-v1') || '[]');
      const raiz = Array.isArray(salvo) ? salvo : salvo.tree || [];
      const andar = (nos, pai) => nos.forEach((n) => {
        if (!n || !n.id) return;
        const caminho = pai ? pai + ' › ' + n.name : n.name;
        r.push({ id: n.id, nome: n.name, caminho });
        andar(n.children || [], caminho);
      });
      andar(raiz, '');
    } catch (e) { /* sem árvore salva */ }
    return r;
  }
  const local = (id) => locais().find((l) => l.id === id);
  const nomeLocal = (id) => { if (!id) return ''; const l = local(id); return l ? l.caminho : 'Local não encontrado'; };

  const produtos = () => C().dados.produtos;
  const produto = (id) => C().produto(id);
  const nomeProduto = (id) => { const p = produto(id); return p ? p.descricao : 'Produto não encontrado'; };
  const unidades = () => C().unidades();

  const bem = (id) => patrimonio.dados.bens.find((b) => b.id === id);
  const nomeBem = (id) => { const b = bem(id); return b ? b.nome : 'Bem não encontrado'; };
  const config = (produtoId) => producao.dados.produtos.find((c) => c.produtoId === produtoId);
  const ficha = (id) => producao.dados.fichas.find((f) => f.id === id);
  const fichasDo = (produtoId) => producao.dados.fichas.filter((f) => f.produtoId === produtoId);
  const fichaPadrao = (produtoId) => fichasDo(produtoId).find((f) => f.padrao && f.ativa !== false) || fichasDo(produtoId).find((f) => f.ativa !== false);
  /** Produtos com produção própria ligada (configurados em Saídas · Mercadorias → Cadastros Geral Produção). */
  const produzidos = () => producao.dados.produtos.filter((c) => c.ativo !== false).map((c) => ({ c, p: produto(c.produtoId) })).filter((x) => x.p && x.p.status === 'ativo');

  /**
   * Cargos do cadastro de Cargos do S2 (jobsCurrent, em index.html). O S2 não tem id fixo de cargo: a chave é
   * 'ref:N' (referência) ou 'local:N' (criado aqui), e o cadastro de salários guarda chave + nome. A ficha guarda
   * os dois e resolve pela chave conferindo o nome; se o nome não bater, procura pelo nome.
   */
  function cargos() {
    try { return (typeof jobsCurrent === 'function' ? jobsCurrent() : []).map((x) => ({ key: x.key, nome: x.j.nome, salario: window.CicluzComprasDominio.lerNumero(x.j.valor) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); } catch (e) { return []; }
  }
  function cargo(key, nome) {
    const lista = cargos();
    return lista.find((c) => c.key === key && (!nome || c.nome === nome)) || (nome ? lista.find((c) => c.nome === nome) : null) || null;
  }
  const nomeCargo = (key, nome) => { if (!key && !nome) return ''; const c = cargo(key, nome); return c ? c.nome : (nome || 'Cargo não encontrado') + ' (fora do cadastro)'; };

  /** Parâmetros dos custos (preenchidos em Saídas · Mercadorias → Cadastros Geral Produção → MER - Parâmetros de Custo). */
  const parametros = () => producao.dados.parametros || {};

  const novoId = (prefixo) => C().novoId(prefixo);
  const agoraIso = () => new Date().toISOString();
  const hojeIso = () => C().hojeIso();

  window.CicluzProducaoDados = {
    producao, patrimonio, criarArmazem,
    locais, local, nomeLocal, produtos, produto, nomeProduto, unidades,
    bem, nomeBem, cargos, cargo, nomeCargo, parametros, config, ficha, fichasDo, fichaPadrao, produzidos,
    novoId, agoraIso, hojeIso,
    get RESPONSAVEIS() { return C().RESPONSAVEIS; },
    responsavel: (id) => C().responsavel(id),
  };
})();
