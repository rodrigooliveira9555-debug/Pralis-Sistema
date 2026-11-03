/* Tela de entrada: login, importação inicial (administrador) e preparo dos dados do aparelho antes
   de abrir o sistema. A ordem da preparação é fixa e não pula etapa (pré-mortem R2):
   1) envia as alterações pendentes deste aparelho;
   2) guarda no servidor, como cópia, o que o aparelho tinha de diferente (primeira vez apenas);
   3) só então troca os dados do aparelho pelos do servidor.
   Qualquer falha para tudo antes de mexer nos dados do aparelho. */
(function () {
  'use strict';

  var S = window.CicluzSync;
  var params = new URLSearchParams(location.search);
  var voltar = S.caminhoSeguro(params.get('voltar'));

  var form = document.getElementById('form-entrar');
  var email = document.getElementById('email');
  var senha = document.getElementById('senha');
  var olho = document.getElementById('mostrar-senha');
  var titulo = document.getElementById('entrada-titulo');
  var caminho = document.getElementById('entrada-caminho');
  var painel = document.getElementById('painel-estado');
  var estadoTexto = document.getElementById('estado-texto');
  var estadoDetalhe = document.getElementById('estado-detalhe');
  var mensagem = document.getElementById('mensagem');
  var principal = document.getElementById('acao-principal');
  var secundaria = document.getElementById('acao-secundaria');

  var acaoPrincipal = null;
  var acaoSecundaria = null;

  function avisar(texto) {
    mensagem.textContent = texto || '';
  }

  function mostrarFormulario() {
    titulo.textContent = 'Entrar';
    caminho.textContent = 'CICLUZ · Gestão de Padaria';
    form.hidden = false;
    painel.hidden = true;
    principal.hidden = false;
    principal.disabled = false;
    principal.textContent = 'Entrar';
    principal.setAttribute('form', 'form-entrar');
    secundaria.hidden = true;
    acaoPrincipal = null;
    email.focus();
  }

  // Estado no lugar do formulário. `botoes` = { principal: [rótulo, ação], secundaria: [...] }.
  function mostrarEstado(tituloTexto, texto, detalhe, botoes, carregando) {
    titulo.textContent = tituloTexto;
    form.hidden = true;
    painel.hidden = false;
    estadoTexto.textContent = texto;
    estadoDetalhe.textContent = detalhe || '';
    if (carregando) estadoTexto.setAttribute('data-carregando', '');
    else estadoTexto.removeAttribute('data-carregando');
    botoes = botoes || {};
    principal.removeAttribute('form');
    principal.hidden = !botoes.principal;
    principal.disabled = false;
    if (botoes.principal) {
      principal.textContent = botoes.principal[0];
      acaoPrincipal = botoes.principal[1];
    }
    secundaria.hidden = !botoes.secundaria;
    if (botoes.secundaria) {
      secundaria.textContent = botoes.secundaria[0];
      acaoSecundaria = botoes.secundaria[1];
    }
  }

  function carregando(texto) {
    mostrarEstado('Preparando', texto, '', null, true);
  }

  principal.addEventListener('click', function (evento) {
    if (!acaoPrincipal) return;
    evento.preventDefault();
    acaoPrincipal();
  });

  secundaria.addEventListener('click', function () {
    if (acaoSecundaria) acaoSecundaria();
  });

  olho.addEventListener('click', function () {
    var mostrar = senha.type === 'password';
    senha.type = mostrar ? 'text' : 'password';
    olho.setAttribute('aria-pressed', String(mostrar));
    olho.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });

  form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    avisar('');
    var faltando = !email.value.trim() ? email : !senha.value ? senha : null;
    email.setAttribute('aria-invalid', String(!email.value.trim()));
    senha.setAttribute('aria-invalid', String(!senha.value));
    if (faltando) {
      avisar('Preencha e-mail e senha.');
      faltando.focus();
      return;
    }
    principal.disabled = true;
    principal.textContent = 'Entrando…';
    try {
      await S.api('/auth/sign-in/email', {
        metodo: 'POST',
        corpo: { email: email.value.trim(), password: senha.value, rememberMe: true }
      });
      senha.value = '';
      await prosseguir();
    } catch (erro) {
      principal.disabled = false;
      principal.textContent = 'Entrar';
      if (erro.status === 401) avisar('E-mail ou senha incorretos.');
      else if (erro.status === 429) avisar('Muitas tentativas. Aguarde um minuto e tente de novo.');
      else avisar(erro.message);
      senha.focus();
    }
  });

  async function sair() {
    try { await S.api('/auth/sign-out', { metodo: 'POST', corpo: {} }); } catch (e) { /* já sem sessão */ }
    avisar('');
    mostrarFormulario();
  }

  function tamanhoLegivel(bytes) {
    return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }

  async function prosseguir() {
    carregando('Conferindo o acesso…');
    var sessao;
    try {
      sessao = await S.api('/sessao');
    } catch (erro) {
      if (erro.status === 401) return mostrarFormulario();
      if (erro.status === 403) {
        return mostrarEstado('Acesso desativado', erro.message, '', { principal: ['Voltar', sair] });
      }
      return mostrarEstado('Sem conexão', erro.message, 'Seus dados continuam neste aparelho.', { principal: ['Tentar de novo', prosseguir] });
    }

    var perfil = sessao.perfil;
    var chaves = sessao.chavesSincronizadas;
    caminho.textContent = perfil.nome + ' · ' + perfil.empresa.nome;

    // Alterações não enviadas de OUTRA conta: não manda com o cookie desta (pré-mortem R8).
    var pend = S.pendentes();
    if (pend && pend.usuarioId !== perfil.usuarioId) {
      return mostrarEstado('Alterações de outra conta',
        'Este aparelho tem alterações de outra conta que ainda não foram enviadas.',
        'Entre com aquela conta para enviá-las antes de usar outra.',
        { principal: ['Entrar com outra conta', sair] });
    }

    if (!perfil.empresa.dadosImportados) return importacaoPendente(perfil, chaves);
    return sincronizar(perfil, chaves);
  }

  function dadosDoAparelho(chaves) {
    return chaves.flatMap(function (chave) {
      var valor = localStorage.getItem(chave);
      return valor === null ? [] : [{ chave: chave, valor: valor }];
    });
  }

  function importacaoPendente(perfil, chaves) {
    if (perfil.papel !== 'administrador') {
      return mostrarEstado('Aguardando importação',
        'Os dados de ' + perfil.empresa.nome + ' ainda não foram enviados ao servidor.',
        'O administrador precisa entrar uma vez, no aparelho que tem os dados certos, e fazer a importação.',
        { principal: ['Sair', sair] });
    }
    var dono = S.ler(localStorage, S.META.dono);
    if (dono && dono.empresaId !== perfil.empresa.id) {
      return mostrarEstado('Dados de outra empresa',
        'Os dados guardados neste aparelho são de outra empresa e não podem ser importados para ' + perfil.empresa.nome + '.',
        'Faça a importação no aparelho que tem os dados desta empresa.',
        { principal: ['Sair', sair] });
    }
    var itens = dadosDoAparelho(chaves);
    var bytes = itens.reduce(function (soma, item) { return soma + new Blob([item.valor]).size; }, 0);
    var texto = itens.length
      ? 'Este aparelho tem ' + itens.length + ' conjuntos de dados (' + tamanhoLegivel(bytes) + '): cadastros financeiros, contas, cargos, locais e organograma.'
      : 'Este aparelho não tem dados salvos. O sistema começará com os dados padrão.';
    mostrarEstado('Importação inicial', texto,
      'Faça isto só no aparelho com os dados certos (o iPad em uso). Depois da importação, todos os aparelhos passam a usar o que estiver no servidor. Isto acontece uma vez só.',
      {
        principal: [itens.length ? 'Enviar dados' : 'Começar do zero', function () { importar(perfil, chaves, itens); }],
        secundaria: ['Sair', sair]
      });
  }

  async function importar(perfil, chaves, itens) {
    carregando('Enviando os dados deste aparelho…');
    try {
      await S.api('/documentos/importacao', { metodo: 'POST', corpo: { itens: itens } });
    } catch (erro) {
      if (erro.codigo === 'IMPORT_ALREADY_DONE') return prosseguir();
      return mostrarEstado('Importação não concluída', erro.message, 'Nada foi alterado neste aparelho.',
        { principal: ['Tentar de novo', function () { importar(perfil, chaves, itens); }], secundaria: ['Sair', sair] });
    }
    perfil.empresa.dadosImportados = true;
    return sincronizar(perfil, chaves);
  }

  async function sincronizar(perfil, chaves) {
    var falha = function (erro, tentar) {
      if (erro.status === 401) return mostrarFormulario();
      mostrarEstado('Não foi possível abrir', erro.message,
        'Nada foi alterado nos dados deste aparelho.', { principal: ['Tentar de novo', tentar], secundaria: ['Sair', sair] });
    };
    var repetir = function () { sincronizar(perfil, chaves); };

    // 1) Pendentes desta conta. 409 = outro aparelho gravou antes; o servidor já guardou o que foi
    //    mandado no histórico, então a fila pode ser limpa.
    var pend = S.pendentes();
    if (pend) {
      carregando('Enviando alterações guardadas neste aparelho…');
      var bases = {};
      Object.keys(pend.itens).forEach(function (chave) { if (chaves.indexOf(chave) >= 0) bases[chave] = pend.itens[chave].versaoBase; });
      try {
        if (Object.keys(bases).length) await S.enviarLote(bases);
      } catch (erro) {
        if (erro.codigo !== 'DOCUMENT_VERSION_CONFLICT') return falha(erro, repetir);
      }
      S.salvarPendentes(null);
    }

    carregando('Buscando os dados de ' + perfil.empresa.nome + '…');
    var documentos;
    try {
      documentos = (await S.api('/documentos')).documentos;
    } catch (erro) {
      return falha(erro, repetir);
    }
    var doServidor = {};
    documentos.forEach(function (doc) { doServidor[doc.chave] = doc; });

    // 2) Primeira vez neste aparelho: o que ele tinha de diferente vai para o histórico antes.
    var dono = S.ler(localStorage, S.META.dono);
    if (!dono) {
      var copias = chaves.flatMap(function (chave) {
        var local = localStorage.getItem(chave);
        var servidor = doServidor[chave];
        return local !== null && (!servidor || servidor.valor !== local) ? [{ chave: chave, valor: local }] : [];
      });
      if (copias.length) {
        try {
          await S.api('/documentos/copias', { metodo: 'POST', corpo: { itens: copias } });
        } catch (erro) {
          return falha(erro, repetir);
        }
      }
    }

    // 3) Troca os dados do aparelho pelos do servidor, sem passar pelo interceptador. Se o
    //    aparelho ficar sem espaço no meio, volta tudo como estava.
    var antes = {};
    chaves.forEach(function (chave) { antes[chave] = localStorage.getItem(chave); });
    try {
      chaves.forEach(function (chave) {
        if (doServidor[chave]) S.setOriginal.call(localStorage, chave, doServidor[chave].valor);
        else S.removeOriginal.call(localStorage, chave);
      });
    } catch (erro) {
      chaves.forEach(function (chave) {
        try {
          if (antes[chave] === null) S.removeOriginal.call(localStorage, chave);
          else S.setOriginal.call(localStorage, chave, antes[chave]);
        } catch (e) { /* melhor esforço */ }
      });
      return mostrarEstado('Aparelho sem espaço',
        'O navegador deste aparelho não tem espaço para os dados da empresa.',
        'Nada foi alterado. Libere espaço no navegador e tente de novo.', { principal: ['Tentar de novo', repetir] });
    }

    var versoes = {};
    documentos.forEach(function (doc) { versoes[doc.chave] = doc.versao; });
    S.gravar(localStorage, S.META.dono, { usuarioId: perfil.usuarioId, empresaId: perfil.empresa.id, nome: perfil.nome });
    S.gravar(sessionStorage, S.META.aba, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      perfil: perfil,
      chaves: chaves,
      versoes: versoes
    });
    location.replace(voltar);
  }

  prosseguir();
})();
