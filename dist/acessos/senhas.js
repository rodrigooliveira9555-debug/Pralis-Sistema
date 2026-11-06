/*
 * Configurações → Senhas. "Minha Senha" pede a senha atual (rota do better-auth) e tira os outros
 * aparelhos da conta. "Senha de Outra Pessoa" é só do administrador e tira a pessoa de todos os
 * aparelhos. Substitui as duas partes de senha da antiga usuarios.html.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  const telas = {};

  const campoSenha = A.campoSenha;
  // Senha mínima do servidor (vem do catálogo); até ele responder, vale a de fora de produção.
  let minimo = 8;
  A.api('/acessos/catalogo').then((c) => { minimo = A.senhaMinima({ catalogo: c }); }, () => {});

  function formulario(tela, montar, enviar) {
    const form = U.el('form', 'acessos-senha');
    form.noValidate = true;
    const erro = U.el('p', 'profiles-error');
    erro.setAttribute('role', 'alert');
    const ok = U.el('p', 'acessos-ok');
    ok.setAttribute('role', 'status');
    const ctx = montar(form);
    const b = U.el('button', 'btn', ctx.rotulo);
    b.type = 'submit';
    const acoes = U.el('div', 'acessos-acoes');
    acoes.append(b);
    form.append(erro, ok, acoes);
    form.onsubmit = async (e) => {
      e.preventDefault();
      erro.textContent = '';
      ok.textContent = '';
      const r = enviar(ctx);
      if (typeof r === 'string') { erro.textContent = r; return; }
      b.disabled = true;
      try { ok.textContent = await r; } catch (falha) { erro.textContent = ctx.traduzir ? ctx.traduzir(falha) : A.mensagemErro(falha); }
      b.disabled = false;
    };
    tela.body.replaceChildren(form);
  }

  function abrirMinha() {
    const tela = telas.minha || (telas.minha = A.criarTela({ id: 'acessos-senha-view', titulo: 'Minha Senha', tela: 'senhas' }));
    tela.ativar();
    formulario(tela, (form) => {
      const atual = campoSenha('Senha atual', 'current-password');
      const nova = campoSenha('Nova senha', 'new-password', 'Pelo menos ' + minimo + ' caracteres. Ao trocar, os outros aparelhos saem da conta.');
      const repetir = campoSenha('Repita a nova senha', 'new-password');
      form.append(atual.no, nova.no, repetir.no);
      return {
        rotulo: 'Trocar senha', atual: atual.input, nova: nova.input, repetir: repetir.input,
        traduzir: (falha) => (falha.status === 400 || falha.status === 401 ? 'Senha atual incorreta ou senha nova fraca demais.' : A.mensagemErro(falha)),
      };
    }, (ctx) => {
      if (!ctx.atual.value) { ctx.atual.focus(); return 'Informe a senha atual.'; }
      if (ctx.nova.value.length < minimo) { ctx.nova.focus(); return 'A nova senha precisa ter pelo menos ' + minimo + ' caracteres.'; }
      if (ctx.nova.value !== ctx.repetir.value) { ctx.repetir.focus(); return 'As duas senhas novas não são iguais.'; }
      return A.api('/auth/change-password', {
        metodo: 'POST',
        corpo: { currentPassword: ctx.atual.value, newPassword: ctx.nova.value, revokeOtherSessions: true },
      }).then(() => {
        ctx.atual.value = ''; ctx.nova.value = ''; ctx.repetir.value = '';
        return 'Senha trocada. Os outros aparelhos precisam entrar de novo.';
      });
    });
  }

  async function abrirOutra() {
    const tela = telas.outra || (telas.outra = A.criarTela({ id: 'acessos-senha-outra-view', titulo: 'Senha de Outra Pessoa', tela: 'senha-outra' }));
    tela.ativar();
    tela.body.replaceChildren(U.nota('Carregando…'));
    let usuarios;
    try {
      const { perfil } = await A.contexto();
      if (perfil.papel !== 'administrador') {
        return A.aviso(tela.body, 'Só o administrador', 'Definir a senha de outra pessoa é ato do administrador. Peça a ele, ou troque a sua em Minha Senha.');
      }
      usuarios = (await A.api('/usuarios')).usuarios.filter((u) => u.id !== perfil.usuarioId);
    } catch (erro) {
      return A.aviso(tela.body, 'Não deu para carregar', A.mensagemErro(erro), U.botao('Tentar de novo', abrirOutra));
    }
    formulario(tela, (form) => {
      const pessoa = U.seletor(usuarios.map((u) => [u.id, u.nome + ' · ' + u.email + (u.ativo ? '' : ' (sem acesso)')]), '', 'Escolha a pessoa');
      const nova = campoSenha('Nova senha', 'new-password', 'A pessoa sai de todos os aparelhos e entra com esta senha. Depois ela troca em Minha Senha.');
      form.append(U.nota('Use quando alguém esqueceu a senha. A sua própria senha se troca em Minha Senha, que pede a senha atual.'), U.campo('Pessoa', pessoa), nova.no);
      return { rotulo: 'Definir senha', pessoa, nova: nova.input };
    }, (ctx) => {
      const u = usuarios.find((x) => x.id === ctx.pessoa.value);
      if (!u) return 'Escolha a pessoa.';
      if (ctx.nova.value.length < minimo) { ctx.nova.focus(); return 'A senha precisa ter pelo menos ' + minimo + ' caracteres.'; }
      return A.api('/usuarios/' + encodeURIComponent(u.id) + '/senha', { metodo: 'POST', corpo: { senha: ctx.nova.value } }).then(() => {
        ctx.nova.value = '';
        return 'Senha de ' + u.nome + ' definida. A pessoa sai de todos os aparelhos.';
      });
    });
  }

  A.registrar('senhas', abrirMinha);
  A.registrar('senha-outra', abrirOutra);
})();
