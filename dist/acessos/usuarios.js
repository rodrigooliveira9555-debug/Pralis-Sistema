/*
 * Configurações → Usuários → Pessoas com Acesso. Um lugar só para criar e editar contas: pessoa ou
 * posto do caixa (PDV × turno), papel, cargos de acesso e se a conta entra ou não. Senha de outra
 * pessoa fica em Configurações → Senhas (um caminho só para cada ato).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  let tela = null;
  const estado = { filtro: 'todas', busca: '', usuarios: [], cargos: [], ctx: null };

  const rotuloPosto = (p, turnos) => 'PDV' + p.pdv + ' · ' + ((turnos.find((t) => t.id === p.turno) || {}).nome || p.turno);
  const turnos = () => estado.ctx.catalogo.postos.turnos;
  const pdvs = () => estado.ctx.catalogo.postos.pdvs;

  async function abrir() {
    if (!tela) {
      tela = A.criarTela({ id: 'acessos-usuarios-view', titulo: 'Pessoas com Acesso', tela: 'usuarios' });
      tela.botaoNovo = U.atalho(tela, 'Novo usuário', 'M12 5v14M5 12h14', () => editar(null), { criar: true });
    }
    tela.ativar();
    tela.body.replaceChildren(U.nota('Carregando…'));
    try {
      estado.ctx = await A.contexto();
      if (!estado.ctx.perfil.tem('usuarios_visualizar') && !estado.ctx.perfil.tem('usuarios_gerenciar')) {
        tela.botaoNovo.hidden = true;
        return A.aviso(tela.body, 'Sem acesso a esta tela', 'Peça a quem cuida das permissões o acesso "Ver as pessoas com acesso".');
      }
      const [usuarios, cargos] = await Promise.all([A.api('/usuarios'), A.api('/cargos-acesso')]);
      estado.usuarios = usuarios.usuarios;
      estado.cargos = cargos.cargos;
      tela.botaoNovo.hidden = !estado.ctx.perfil.tem('usuarios_gerenciar');
      desenhar();
    } catch (erro) {
      A.aviso(tela.body, 'Não deu para carregar', A.mensagemErro(erro), U.botao('Tentar de novo', abrir));
    }
  }

  function filtrados() {
    const termo = U.dobrar(estado.busca);
    return estado.usuarios.filter((u) => {
      if (estado.filtro === 'pessoas' && u.posto) return false;
      if (estado.filtro === 'sem-acesso' && u.ativo) return false;
      if (estado.filtro !== 'sem-acesso' && estado.filtro !== 'todas' && !u.ativo) return false;
      if (!termo) return true;
      return U.dobrar(u.nome + ' ' + u.email + ' ' + u.cargos.map((c) => c.nome).join(' ')).includes(termo);
    });
  }

  function desenhar() {
    const podeEditar = estado.ctx.perfil.tem('usuarios_gerenciar');
    const barra = U.el('div', 'acessos-barra');
    const busca = U.busca('Buscar nome, e-mail ou cargo', (v) => { estado.busca = v; desenharLista(); });
    busca.value = estado.busca;
    const semAcesso = estado.usuarios.filter((u) => !u.ativo).length;
    const chips = U.chips([
      ['todas', 'Todas'], ['pessoas', 'Pessoas'], ['postos', 'Postos do Caixa'], ['sem-acesso', 'Sem Acesso' + (semAcesso ? ' · ' + semAcesso : '')],
    ], estado.filtro, (v) => { estado.filtro = v; desenharLista(); });
    barra.append(busca, chips);
    const lista = U.el('div', 'acessos-lista-box');
    tela.body.replaceChildren(barra, lista);
    tela.lista = lista;
    tela.podeEditar = podeEditar;
    desenharLista();
  }

  function desenharLista() {
    const caixa = tela.lista;
    if (estado.filtro === 'postos') return caixa.replaceChildren(gradePostos());
    const linhas = filtrados();
    const s = U.secao(estado.filtro === 'sem-acesso' ? 'Contas sem acesso' : 'Pessoas com acesso', linhas.length);
    if (!linhas.length) s.append(U.vazio(estado.busca ? 'Ninguém encontrado' : 'Nenhuma conta aqui', estado.busca ? 'Tente outro nome ou e-mail.' : ''));
    const ul = U.el('div', 'acessos-lista');
    linhas.forEach((u) => ul.append(linhaPessoa(u)));
    s.append(ul);
    caixa.replaceChildren(s);
  }

  function linhaPessoa(u) {
    const eu = u.id === estado.ctx.perfil.usuarioId;
    const r = U.el(tela.podeEditar ? 'button' : 'div', 'acessos-pessoa' + (u.ativo ? '' : ' inativa'));
    if (tela.podeEditar) {
      r.type = 'button';
      r.onclick = () => editar(u);
      r.setAttribute('aria-label', 'Editar ' + u.nome);
    }
    const av = U.el('span', 'acessos-avatar' + (u.posto ? ' posto' : ''), u.posto ? 'P' + u.posto.pdv : A.iniciais(u.nome));
    av.setAttribute('aria-hidden', 'true');
    const meio = U.el('span', 'acessos-pessoa-texto');
    meio.append(U.el('b', null, u.nome + (eu ? ' (você)' : '')), U.el('small', null, u.email));
    const tags = U.el('span', 'acessos-tags');
    if (!u.ativo) tags.append(U.situacao('Sem acesso', 'negativo'));
    if (u.posto) tags.append(U.situacao(rotuloPosto(u.posto, turnos()), 'info'));
    if (u.papel === 'administrador') tags.append(U.situacao('Administrador', 'marca'));
    else if (u.cargos.length) u.cargos.forEach((c) => tags.append(U.situacao(c.nome, 'neutro')));
    else tags.append(U.situacao('Sem cargo', 'atencao'));
    r.append(av, meio, tags);
    return r;
  }

  /** Os 8 postos (PDV × turno) lado a lado: livre mostra "Criar conta"; ocupado abre a conta. */
  function gradePostos() {
    const s = U.secao('Postos do caixa', estado.usuarios.filter((u) => u.posto).length + '/' + pdvs().length * turnos().length);
    s.append(U.nota('Cada posto tem uma conta só. Quem opera o PDV naquele turno entra com ela; o operador não escolhe PDV nem turno.'));
    const grade = U.el('div', 'acessos-postos');
    pdvs().forEach((pdv) => turnos().forEach((t) => {
      const conta = estado.usuarios.find((u) => u.posto && u.posto.pdv === pdv && u.posto.turno === t.id);
      const c = U.el('div', 'acessos-posto' + (conta ? (conta.ativo ? ' ocupado' : ' ocupado inativa') : ''));
      c.append(U.el('b', null, 'PDV' + pdv + ' · ' + t.nome));
      c.append(U.el('small', null, conta ? conta.nome + (conta.ativo ? '' : ' · sem acesso') : 'Livre'));
      if (tela.podeEditar) {
        c.append(U.botao(conta ? 'Editar' : 'Criar conta', () => editar(conta || null, { pdv, turno: t.id }), conta ? 'btn secondary' : 'btn'));
      }
      grade.append(c);
    }));
    s.append(grade);
    return s;
  }

  /** Cargos de acesso como botões liga/desliga (vários podem ficar ligados). */
  function escolhaCargos(selecionados) {
    const box = U.el('div', 'acessos-escolha');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Cargos de acesso');
    const ativos = estado.cargos.filter((c) => c.ativo || selecionados.has(c.id));
    if (!ativos.length) box.append(U.nota('Nenhum cargo de acesso ainda. Monte em Configurações › Permissões › Cargos de Acesso.'));
    ativos.forEach((c) => {
      const b = U.botao(c.nome, () => {
        if (selecionados.has(c.id)) selecionados.delete(c.id); else selecionados.add(c.id);
        b.classList.toggle('ativo', selecionados.has(c.id));
        b.setAttribute('aria-pressed', String(selecionados.has(c.id)));
      }, 'compras-chip' + (selecionados.has(c.id) ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(selecionados.has(c.id)));
      if (c.descricao) b.title = c.descricao;
      box.append(b);
    });
    return box;
  }

  function editar(u, postoInicial) {
    const perfil = estado.ctx.perfil;
    const admin = perfil.papel === 'administrador';
    if (u && u.papel === 'administrador' && !admin) return U.avisar('Só o administrador altera um administrador.');
    const eu = u && u.id === perfil.usuarioId;
    const v = {
      tipo: (u ? u.posto : postoInicial) ? 'posto' : 'pessoa',
      posto: u && u.posto ? { ...u.posto } : postoInicial ? { ...postoInicial } : { pdv: pdvs()[0], turno: turnos()[0].id },
      papel: u ? u.papel : 'usuario',
      ativo: u ? u.ativo : true,
      cargos: new Set(u ? u.cargos.map((c) => c.id) : []),
    };
    if (!u && postoInicial) {
      const caixa = estado.cargos.find((c) => c.ativo && U.dobrar(c.nome) === 'caixa');
      if (caixa) v.cargos.add(caixa.id);
    }
    A.dialogoApi({
      titulo: u ? 'Editar ' + u.nome : 'Novo usuário',
      subtitulo: u ? u.email : 'A conta entra no sistema com o e-mail e a senha inicial.',
      rotuloSalvar: u ? 'Salvar alterações' : 'Criar conta',
      montar: (form) => {
        const ctx = {};
        const grade = U.el('div', 'acessos-form');
        grade.append(U.campo('Tipo de conta', U.chips([['pessoa', 'Pessoa'], ['posto', 'Posto do caixa']], v.tipo, (x) => { v.tipo = x; mostrar(); })));
        const blocoPosto = U.el('div', 'acessos-form-linha');
        const pdv = U.seletor(pdvs().map((n) => [String(n), 'PDV' + n]), String(v.posto.pdv));
        pdv.onchange = () => { v.posto.pdv = Number(pdv.value); conferirPosto(); };
        const turno = U.chips(turnos().map((t) => [t.id, t.nome]), v.posto.turno, (x) => { v.posto.turno = x; conferirPosto(); });
        const avisoPosto = U.el('small', 'acessos-alerta');
        avisoPosto.setAttribute('role', 'status');
        blocoPosto.append(U.campo('PDV', pdv), U.campo('Turno', turno));
        grade.append(blocoPosto, avisoPosto);
        ctx.nome = U.entrada('text', u ? u.nome : '', { autocomplete: 'off', maxLength: 120 });
        grade.append(U.campo('Nome', ctx.nome, 'Conta de posto: use o nome do posto, ex.: PDV1 · Manhã.'));
        if (!u) {
          ctx.email = U.entrada('email', '', { autocomplete: 'off', autocapitalize: 'none', spellcheck: false });
          ctx.senha = U.entrada('password', '', { autocomplete: 'new-password' });
          grade.append(U.campo('E-mail', ctx.email), U.campo('Senha inicial', ctx.senha, 'Pelo menos 8 caracteres (10 em produção). A pessoa troca em Minha Senha.'));
        }
        if (admin && !eu) {
          grade.append(U.campo('Papel', U.chips([['usuario', 'Usuário'], ['administrador', 'Administrador']], v.papel, (x) => { v.papel = x; mostrar(); })));
        }
        const blocoCargos = U.campo('Cargos de acesso', escolhaCargos(v.cargos), 'Sem cargo, a conta continua com o acesso de antes: tudo, menos pagar e configurações.');
        const notaAdmin = U.nota('Administrador tem todos os acessos; cargo não muda nada para ele.');
        grade.append(blocoCargos, notaAdmin);
        if (u && !eu) {
          grade.append(U.campo('Acesso ao sistema', U.chips([['sim', 'Entra no sistema'], ['nao', 'Sem acesso']], v.ativo ? 'sim' : 'nao', (x) => { v.ativo = x === 'sim'; }),
            'Sem acesso, a conta sai dos aparelhos na hora. Nada é apagado.'));
        }
        form.append(grade);
        function conferirPosto() {
          const dono = estado.usuarios.find((x) => x.posto && x.posto.pdv === v.posto.pdv && x.posto.turno === v.posto.turno && (!u || x.id !== u.id));
          avisoPosto.textContent = v.tipo === 'posto' && dono ? 'Este posto já é da conta ' + dono.nome + '.' : '';
          if (v.tipo === 'posto' && !u && (!ctx.nome.value || ctx.nome.dataset.auto)) {
            ctx.nome.value = rotuloPosto(v.posto, turnos());
            ctx.nome.dataset.auto = '1';
          }
        }
        function mostrar() {
          blocoPosto.hidden = v.tipo !== 'posto';
          avisoPosto.hidden = v.tipo !== 'posto';
          blocoCargos.hidden = v.papel === 'administrador';
          notaAdmin.hidden = v.papel !== 'administrador';
          conferirPosto();
        }
        ctx.nome.oninput = () => { delete ctx.nome.dataset.auto; };
        mostrar();
        return ctx;
      },
      enviar: (ctx) => {
        const nome = ctx.nome.value.trim();
        if (nome.length < 2) return 'Informe o nome.';
        const posto = v.tipo === 'posto' ? { pdv: v.posto.pdv, turno: v.posto.turno } : null;
        const cargos = v.papel === 'administrador' ? [] : [...v.cargos];
        if (!u) {
          if (!/^\S+@\S+\.\S+$/.test(ctx.email.value.trim())) return 'Informe um e-mail válido.';
          if (ctx.senha.value.length < 8) return 'A senha inicial precisa ter pelo menos 8 caracteres.';
          return A.api('/usuarios', { metodo: 'POST', corpo: { nome, email: ctx.email.value.trim(), papel: v.papel, senha: ctx.senha.value, cargos, posto } });
        }
        const mudou = {};
        if (nome !== u.nome) mudou.nome = nome;
        if (v.papel !== u.papel) mudou.papel = v.papel;
        if (v.ativo !== u.ativo) mudou.ativo = v.ativo;
        if (JSON.stringify(posto) !== JSON.stringify(u.posto)) mudou.posto = posto;
        if (v.papel !== 'administrador' && [...v.cargos].sort().join() !== u.cargos.map((c) => c.id).sort().join()) mudou.cargos = cargos;
        if (!Object.keys(mudou).length) return Promise.resolve(null);
        return A.api('/usuarios/' + encodeURIComponent(u.id), { metodo: 'PATCH', corpo: mudou });
      },
      aoSalvar: (salvo) => {
        if (salvo) U.avisar(u ? 'Conta de ' + salvo.nome + ' atualizada.' : salvo.nome + ' já pode entrar no sistema.');
        abrir();
      },
    });
  }

  A.registrar('usuarios', abrir);
})();
