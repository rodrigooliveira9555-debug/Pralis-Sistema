/* Tela "Usuários": troca da própria senha (todos) e, para o administrador, as pessoas com acesso e
   a situação dos dados no servidor. Tudo pela API; nada aqui toca no localStorage. */
(function () {
  'use strict';

  var S = window.CicluzSync;
  var mensagem = document.getElementById('mensagem');
  var anuncio = document.getElementById('anuncio');
  var caminho = document.getElementById('conta-caminho');
  var perfil = null;

  var PAPEIS = { administrador: 'Administrador', usuario: 'Usuário' };
  var ASSUNTOS = {
    financeiro: 'Financeiro (grupos, tipos de venda, bandeiras, operadoras e taxas)',
    contas: 'Contas',
    cargos: 'Cargos',
    salarios: 'Salários por vigência',
    'ficha-de-cargos': 'Ficha de cargos',
    locais: 'Áreas, setores e locais',
    organograma: 'Organograma',
    identidade: 'Ícones e cores próprios'
  };

  function avisar(texto) { mensagem.textContent = texto || ''; }
  function anunciar(texto) { anuncio.textContent = texto; avisar(''); }

  function falhou(erro) {
    if (erro.status === 401) {
      location.replace('entrar.html?voltar=' + encodeURIComponent('/usuarios.html'));
      return;
    }
    avisar(erro.message);
  }

  function elemento(tag, classe, texto) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function botao(rotulo, acao, secundario) {
    var b = elemento('button', 'entrada-botao' + (secundario ? ' entrada-botao-secundario' : ''), rotulo);
    b.type = 'button';
    b.addEventListener('click', acao);
    return b;
  }

  // Minha senha: rota do better-auth; encerra as outras sessões da pessoa.
  document.getElementById('form-minha-senha').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    var atual = document.getElementById('senha-atual');
    var nova = document.getElementById('senha-nova');
    if (!atual.value || nova.value.length < 8) {
      avisar('Informe a senha atual e uma nova com pelo menos 8 caracteres.');
      (atual.value ? nova : atual).focus();
      return;
    }
    try {
      await S.api('/auth/change-password', {
        metodo: 'POST',
        corpo: { currentPassword: atual.value, newPassword: nova.value, revokeOtherSessions: true }
      });
      atual.value = '';
      nova.value = '';
      anunciar('Senha trocada. Os outros aparelhos precisam entrar de novo.');
    } catch (erro) {
      if (erro.status === 400 || erro.status === 401) avisar('Senha atual incorreta ou senha nova fraca demais.');
      else falhou(erro);
    }
  });

  async function carregarUsuarios() {
    var lista = document.getElementById('lista-usuarios');
    var dados;
    try { dados = await S.api('/usuarios'); } catch (erro) { return falhou(erro); }
    lista.replaceChildren.apply(lista, dados.usuarios.map(linhaUsuario));
  }

  function linhaUsuario(u) {
    var item = elemento('li', 'conta-item');
    if (!u.ativo) item.setAttribute('data-inativo', '');
    var texto = elemento('div', 'conta-item-texto');
    texto.append(
      elemento('p', 'conta-item-nome', u.nome + (u.id === perfil.usuarioId ? ' (você)' : '')),
      elemento('p', 'conta-item-detalhe', u.email + ' · ' + PAPEIS[u.papel] + (u.ativo ? '' : ' · sem acesso'))
    );
    var acoes = elemento('div', 'conta-item-acoes');
    if (u.id !== perfil.usuarioId) {
      var papel = document.createElement('select');
      papel.setAttribute('aria-label', 'Papel de ' + u.nome);
      Object.keys(PAPEIS).forEach(function (valor) { papel.add(new Option(PAPEIS[valor], valor, false, valor === u.papel)); });
      papel.addEventListener('change', function () { alterar(u, { papel: papel.value }, 'Papel de ' + u.nome + ' alterado.'); });
      var campoPapel = elemento('div', 'entrada-campo');
      campoPapel.append(papel);
      acoes.append(
        campoPapel,
        botao(u.ativo ? 'Tirar acesso' : 'Devolver acesso', function () {
          alterar(u, { ativo: !u.ativo }, u.ativo ? u.nome + ' perdeu o acesso.' : u.nome + ' voltou a ter acesso.');
        }, true),
        botao('Definir senha', function () { definirSenha(u, item); }, true)
      );
    }
    item.append(texto, acoes);
    return item;
  }

  async function alterar(u, dados, texto) {
    try {
      await S.api('/usuarios/' + encodeURIComponent(u.id), { metodo: 'PATCH', corpo: dados });
      anunciar(texto);
    } catch (erro) { falhou(erro); }
    carregarUsuarios();
  }

  // Campo de senha dentro da própria linha (mascarado), em vez de um prompt que mostra o texto.
  function definirSenha(u, item) {
    if (item.querySelector('.conta-nova-senha')) return;
    var form = elemento('form', 'conta-nova-senha conta-item-acoes');
    var campo = elemento('div', 'entrada-campo');
    var id = 'senha-' + u.id;
    var rotulo = elemento('label', '', 'Nova senha de ' + u.nome);
    rotulo.htmlFor = id;
    var entrada = document.createElement('input');
    entrada.type = 'password';
    entrada.id = id;
    entrada.autocomplete = 'new-password';
    campo.append(rotulo, entrada);
    var salvar = elemento('button', 'entrada-botao', 'Salvar senha');
    salvar.type = 'submit';
    form.append(campo, salvar, botao('Cancelar', function () { form.remove(); }, true));
    form.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      try {
        await S.api('/usuarios/' + encodeURIComponent(u.id) + '/senha', { metodo: 'POST', corpo: { senha: entrada.value } });
        form.remove();
        anunciar('Senha de ' + u.nome + ' definida. A pessoa sai de todos os aparelhos.');
      } catch (erro) {
        if (erro.detalhes && erro.detalhes.length) avisar(erro.detalhes.map(function (d) { return d.mensagem; }).join(' '));
        else falhou(erro);
      }
    });
    item.append(form);
    entrada.focus();
  }

  document.getElementById('form-novo').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    var campos = ['novo-nome', 'novo-email', 'novo-papel', 'novo-senha'].map(function (id) { return document.getElementById(id); });
    try {
      await S.api('/usuarios', {
        metodo: 'POST',
        corpo: { nome: campos[0].value.trim(), email: campos[1].value.trim(), papel: campos[2].value, senha: campos[3].value }
      });
      anunciar(campos[0].value.trim() + ' foi adicionado.');
      campos[0].value = '';
      campos[1].value = '';
      campos[3].value = '';
      carregarUsuarios();
    } catch (erro) {
      if (erro.detalhes && erro.detalhes.length) avisar(erro.detalhes.map(function (d) { return d.mensagem; }).join(' '));
      else falhou(erro);
    }
  });

  async function carregarSituacao() {
    var lista = document.getElementById('lista-dados');
    var dados;
    try { dados = await S.api('/projecoes'); } catch (erro) { return falhou(erro); }
    var porAssunto = {};
    dados.assuntos.forEach(function (a) { porAssunto[a.assunto] = a; });
    lista.replaceChildren.apply(lista, Object.keys(ASSUNTOS).map(function (assunto) {
      var a = porAssunto[assunto];
      var item = elemento('li', 'conta-item');
      var texto = elemento('div', 'conta-item-texto');
      texto.append(elemento('p', 'conta-item-nome', ASSUNTOS[assunto]));
      if (a && a.mensagem) texto.append(elemento('p', 'conta-item-detalhe', a.mensagem));
      var selo = elemento('span', 'conta-selo', !a ? 'Sem dados ainda' : a.situacao === 'ok' ? 'Em dia' : 'Precisa de correção');
      selo.dataset.tipo = a ? a.situacao : '';
      item.append(texto, selo);
      return item;
    }));
  }

  (async function iniciar() {
    try { perfil = (await S.api('/sessao')).perfil; } catch (erro) { return falhou(erro); }
    caminho.textContent = perfil.nome + ' · ' + perfil.empresa.nome;
    if (perfil.papel === 'administrador') {
      document.getElementById('secao-usuarios').hidden = false;
      document.getElementById('secao-dados').hidden = false;
      carregarUsuarios();
      carregarSituacao();
    }
  })();
})();
