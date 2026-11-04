/* Porteiro das telas do CICLUZ. Carregado no <head> do index.html, ANTES de qualquer script das
   telas (groups.js e os demais estão no fim do <body>).
   - Aba sem dados preparados: para a página e vai para a tela de entrada.
   - Aba preparada: cada gravação de dado de negócio no localStorage entra na fila e sobe ao
     servidor num lote só (tudo ou nada), com a versão base DESTA aba.
   - 409: outro aparelho gravou antes. O servidor guardou o que foi mandado; a aba para de enviar
     e pede para atualizar. 401: sessão vencida; as alterações ficam no aparelho até entrar de novo. */
(function () {
  'use strict';

  var S = window.CicluzSync;
  var aba = S.ler(sessionStorage, S.META.aba);

  if (!aba || !aba.perfil || !Array.isArray(aba.chaves)) {
    // Parar ANTES de navegar: depois do replace, o stop cancelaria a própria navegação.
    window.stop();
    S.irParaEntrada();
    return;
  }

  var chaves = new Set(aba.chaves);
  var versoes = aba.versoes || {};
  var edicoes = {};
  var envio = null;
  var temporizador = null;
  var esperaRede = [5000, 15000, 60000];
  var tentativa = 0;
  var suspensa = false;

  function salvarAba() {
    aba.versoes = versoes;
    S.gravar(sessionStorage, S.META.aba, aba);
  }

  // Anota a chave na fila (com a versão base desta aba) sem guardar o valor. Se a chave já está na
  // fila, mantém a base antiga: é a partir dela que esta aba começou a editar.
  function registrarEdicao(chave) {
    edicoes[chave] = (edicoes[chave] || 0) + 1;
    var pend = S.pendentes() || { usuarioId: aba.perfil.usuarioId, empresaId: aba.perfil.empresa.id, itens: {} };
    if (!pend.itens[chave]) pend.itens[chave] = { versaoBase: versoes[chave] || 0, aba: aba.id };
    try {
      S.salvarPendentes(pend);
    } catch (e) {
      mostrarAviso('erro', 'O aparelho está sem espaço: esta alteração ficou só na tela. Libere espaço no navegador.');
      return;
    }
    agendarEnvio(800);
  }

  var setItem = Storage.prototype.setItem;
  var removeItem = Storage.prototype.removeItem;
  // O original roda primeiro e o erro dele (cota cheia) sobe intacto para a tela, como antes.
  Storage.prototype.setItem = function (chave, valor) {
    setItem.call(this, chave, valor);
    if (this === localStorage && chaves.has(chave)) registrarEdicao(chave);
  };
  Storage.prototype.removeItem = function (chave) {
    removeItem.call(this, chave);
    if (this === localStorage && chaves.has(chave)) registrarEdicao(chave);
  };

  function agendarEnvio(espera) {
    if (suspensa) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(enviar, espera);
  }

  async function enviar() {
    if (envio || suspensa) return envio;
    var pend = S.pendentes();
    if (!pend) return;
    var bases = {};
    var feitas = {};
    Object.keys(pend.itens).forEach(function (chave) {
      if (pend.itens[chave].aba !== aba.id || !chaves.has(chave)) return;
      bases[chave] = pend.itens[chave].versaoBase;
      feitas[chave] = edicoes[chave] || 0;
    });
    if (!Object.keys(bases).length) return;

    envio = (async function () {
      try {
        var novas = await S.enviarLote(bases);
        tentativa = 0;
        var atual = S.pendentes() || { itens: {} };
        Object.keys(novas).forEach(function (chave) {
          versoes[chave] = novas[chave];
          // Editada de novo enquanto o lote viajava: continua na fila, agora a partir da versão nova.
          if ((edicoes[chave] || 0) !== feitas[chave] && atual.itens[chave]) atual.itens[chave].versaoBase = novas[chave];
          else delete atual.itens[chave];
        });
        S.salvarPendentes(atual);
        salvarAba();
        esconderAviso('rede');
        if (Object.keys(atual.itens).some(function (c) { return atual.itens[c].aba === aba.id; })) agendarEnvio(300);
      } catch (erro) {
        tratarFalha(erro, Object.keys(bases));
      } finally {
        envio = null;
      }
    })();
    return envio;
  }

  function tratarFalha(erro, enviadas) {
    if (erro.codigo === 'DOCUMENT_VERSION_CONFLICT') {
      // O servidor guardou o lote no histórico: tira da fila e para de enviar nesta aba.
      var pend = S.pendentes();
      if (pend) {
        enviadas.forEach(function (chave) { delete pend.itens[chave]; });
        S.salvarPendentes(pend);
      }
      suspensa = true;
      mostrarAviso('conflito', 'Outro aparelho salvou antes de você. Suas alterações foram guardadas no histórico do servidor. Atualize para continuar com a versão atual.', 'Atualizar', S.irParaEntrada);
      return;
    }
    if (erro.status === 401 || erro.status === 403) {
      suspensa = true;
      mostrarAviso('sessao', 'Sua sessão terminou. As alterações estão guardadas neste aparelho e serão enviadas quando você entrar de novo.', 'Entrar', S.irParaEntrada);
      return;
    }
    if (erro.status === 400 || erro.status === 413) {
      suspensa = true;
      mostrarAviso('erro', 'O servidor recusou esta alteração (' + erro.message + '). Ela continua neste aparelho; avise o administrador.');
      return;
    }
    if (erro.status === 429) {
      mostrarAviso('rede', 'Muitas gravações seguidas. Suas alterações estão salvas neste aparelho e serão enviadas em instantes.');
      agendarEnvio(60000);
      return;
    }
    // Sem rede ou servidor fora do ar: tenta de novo com espera crescente.
    mostrarAviso('rede', 'Sem conexão com o servidor. Suas alterações estão salvas neste aparelho e serão enviadas quando a conexão voltar.');
    agendarEnvio(esperaRede[Math.min(tentativa++, esperaRede.length - 1)]);
  }

  // Outro aparelho gravou algo novo? Confere só as versões (rota leve).
  async function conferirVersoes() {
    if (suspensa || document.hidden) return;
    try {
      var dados = await S.api('/documentos/versoes');
      var pend = S.pendentes() || { itens: {} };
      var novas = dados.versoes.some(function (v) { return v.versao > (versoes[v.chave] || 0) && !pend.itens[v.chave]; });
      if (novas) mostrarAviso('novos', 'Há dados novos salvos em outro aparelho.', 'Atualizar', S.irParaEntrada);
    } catch (erro) {
      if (erro.status === 401) tratarFalha(erro, []);
    }
  }

  // Avisos: duas regiões fixas, criadas no carregamento (o leitor de tela só anuncia mudança em
  // região que já existia): "status" para rede e dados novos, "alert" para conflito, sessão e erro.
  // Prioridade: conflito > sessão > erro > rede > novos. Todo aviso pode ser fechado.
  var prioridade = { conflito: 5, sessao: 4, erro: 3, rede: 2, novos: 1 };
  var urgente = { conflito: true, sessao: true, erro: true };
  var avisoAtual = null;
  var regioes = null;

  function criarRegioes() {
    if (regioes) return regioes;
    regioes = {};
    ['status', 'alert'].forEach(function (papel) {
      var caixa = document.createElement('div');
      caixa.className = 'cicluz-aviso';
      caixa.setAttribute('role', papel);
      caixa.hidden = true;
      document.body.append(caixa);
      regioes[papel] = caixa;
    });
    return regioes;
  }

  function mostrarAviso(tipo, texto, rotulo, acao) {
    if (avisoAtual && prioridade[avisoAtual] > prioridade[tipo]) return;
    var caixas = criarRegioes();
    var caixa = caixas[urgente[tipo] ? 'alert' : 'status'];
    var outra = caixas[urgente[tipo] ? 'status' : 'alert'];
    outra.hidden = true;
    outra.replaceChildren();
    avisoAtual = tipo;
    caixa.dataset.tipo = tipo;
    var p = document.createElement('p');
    p.textContent = texto;
    var acoes = document.createElement('div');
    acoes.className = 'cicluz-aviso-acoes';
    if (rotulo) {
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = rotulo;
      botao.addEventListener('click', acao);
      acoes.append(botao);
    }
    var fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'cicluz-aviso-fechar';
    fechar.setAttribute('aria-label', 'Fechar aviso');
    fechar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    fechar.addEventListener('click', function () { esconderAviso(tipo); });
    acoes.append(fechar);
    caixa.hidden = false;
    caixa.replaceChildren(p, acoes);
  }

  function esconderAviso(tipo) {
    if (!regioes || avisoAtual !== tipo) return;
    regioes.status.hidden = true;
    regioes.alert.hidden = true;
    avisoAtual = null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', criarRegioes);
  else criarRegioes();

  // Sair: envia o que esta aba ainda tem na fila e passa para a saída única do sistema
  // (entrar.html?sair=1, a mesma do app), que confere a fila do aparelho antes de encerrar.
  async function sair() {
    await enviar();
    location.replace('entrar.html?sair=1');
    return true;
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      conferirVersoes();
      agendarEnvio(0);
    }
  });
  window.addEventListener('online', function () { agendarEnvio(0); });
  setInterval(conferirVersoes, 60000);
  // Restos de uma visita anterior desta aba (ex.: recarregou antes de o lote sair).
  agendarEnvio(1500);

  window.CicluzSessao = { perfil: aba.perfil, sair: sair };
})();
