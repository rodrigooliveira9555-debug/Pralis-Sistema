/* Núcleo da ligação do site com o servidor: usado pela tela de entrada (entrar.js) e pelo porteiro
   das telas (cicluz-sessao.js). Só guarda aqui o que os dois precisam: chamadas à API, as marcas de
   sincronização no aparelho e o envio de lote. A lista de chaves de negócio NÃO mora aqui: vem do
   servidor em GET /api/sessao (fonte única em servidor/shared/src/documentos.ts). */
(function () {
  'use strict';

  // Marcas da sincronização. Não são dado de negócio e nunca vão para o servidor.
  // - dono: de quem são os dados de negócio guardados neste aparelho;
  // - pendentes: chaves editadas ainda não enviadas (só o nome e a versão base; o valor é lido na
  //   hora de enviar, para não dobrar o uso do localStorage);
  // - aba: estado desta aba (perfil, chaves e versões base). Fica no sessionStorage: cada aba tem
  //   a sua versão base, e uma aba velha não grava por cima do que a nova trouxe.
  var META = { dono: 'cicluz-sync-dono', pendentes: 'cicluz-sync-pendentes', aba: 'cicluz-sync-aba' };

  // Capturadas antes de o porteiro interceptar o setItem: a hidratação e as marcas usam estas, sem
  // gerar envio de volta para o servidor.
  var setOriginal = Storage.prototype.setItem;
  var removeOriginal = Storage.prototype.removeItem;

  function ErroApi(status, codigo, mensagem, detalhes) {
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.message = mensagem;
    this.detalhes = detalhes;
  }
  ErroApi.prototype = Object.create(Error.prototype);

  async function api(caminho, opcoes) {
    opcoes = opcoes || {};
    var resposta;
    try {
      resposta = await fetch('/api' + caminho, {
        method: opcoes.metodo || 'GET',
        credentials: 'same-origin',
        headers: opcoes.corpo ? { 'content-type': 'application/json' } : {},
        body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
        keepalive: Boolean(opcoes.keepalive)
      });
    } catch (e) {
      throw new ErroApi(0, 'NETWORK', 'Sem conexão com o servidor.');
    }
    var texto = await resposta.text();
    var json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch (e) { json = null; }
    if (!resposta.ok) {
      throw new ErroApi(resposta.status, (json && (json.code || json.codigo)) || 'HTTP_' + resposta.status,
        (json && (json.title || json.message)) || 'O servidor não respondeu como esperado.', json && json.details);
    }
    return json && 'data' in json ? json.data : json;
  }

  function ler(armazenamento, chave) {
    try { return JSON.parse(armazenamento.getItem(chave) || 'null'); } catch (e) { return null; }
  }

  function gravar(armazenamento, chave, valor) {
    setOriginal.call(armazenamento, chave, JSON.stringify(valor));
  }

  function remover(armazenamento, chave) {
    removeOriginal.call(armazenamento, chave);
  }

  // Pendentes: { usuarioId, empresaId, itens: { chave: { versaoBase, aba } } }
  function pendentes() {
    var p = ler(localStorage, META.pendentes);
    return p && p.itens && typeof p.itens === 'object' ? p : null;
  }

  function salvarPendentes(p) {
    if (!p || !Object.keys(p.itens).length) remover(localStorage, META.pendentes);
    else gravar(localStorage, META.pendentes, p);
  }

  // Envia as chaves num lote só, tudo ou nada, com o valor que está no aparelho agora.
  // Devolve { chave: versão nova } (0 = removida no servidor).
  async function enviarLote(basePorChave) {
    var itens = Object.keys(basePorChave).map(function (chave) {
      return { chave: chave, valor: localStorage.getItem(chave), versaoBase: basePorChave[chave] };
    });
    var dados = await api('/documentos', { metodo: 'PUT', corpo: { itens: itens } });
    var versoes = {};
    dados.documentos.forEach(function (doc) { versoes[doc.chave] = doc.versao; });
    return versoes;
  }

  // Caminho de volta depois de entrar: só da mesma origem (sem redirecionamento para fora).
  function caminhoSeguro(valor) {
    if (typeof valor !== 'string' || !valor) return 'index.html';
    if (!/^\/(?!\/)/.test(valor) && !/^[\w-]+\.html/.test(valor)) return 'index.html';
    return valor;
  }

  function irParaEntrada() {
    remover(sessionStorage, META.aba);
    var voltar = location.pathname.replace(/^\/+/, '/') + location.search + location.hash;
    location.replace('entrar.html?voltar=' + encodeURIComponent(voltar));
  }

  window.CicluzSync = {
    META: META,
    ErroApi: ErroApi,
    api: api,
    ler: ler,
    gravar: gravar,
    remover: remover,
    setOriginal: setOriginal,
    removeOriginal: removeOriginal,
    pendentes: pendentes,
    salvarPendentes: salvarPendentes,
    enviarLote: enviarLote,
    caminhoSeguro: caminhoSeguro,
    irParaEntrada: irParaEntrada
  };
})();
