/*
 * Configurações → Permissões → Cargos de Acesso. Cada cargo é uma lista de "pode" por área, com
 * caixas de marcar. Mais simples que o principal: sem matriz, sem montagem de menu, sem camada de
 * setor. Quem não é administrador só marca o que ele mesmo pode (a API confere de novo).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  let tela = null;
  const estado = { ctx: null, cargos: [] };

  async function abrir() {
    if (!tela) {
      tela = A.criarTela({ id: 'acessos-cargos-view', titulo: 'Cargos de Acesso', tela: 'cargos' });
      tela.botaoNovo = U.atalho(tela, 'Novo cargo de acesso', 'M12 5v14M5 12h14', () => editar(null), { criar: true });
    }
    tela.ativar();
    if (!tela.body.childElementCount) tela.body.replaceChildren(U.nota('Carregando…'));
    try {
      estado.ctx = await A.contexto();
      const pode = estado.ctx.perfil.tem('permissoes_gerenciar');
      tela.botaoNovo.hidden = !pode;
      if (!pode && !estado.ctx.perfil.tem('usuarios_visualizar')) {
        return A.aviso(tela.body, 'Sem acesso a esta tela', 'Peça a quem cuida das permissões o acesso "Montar cargos de acesso".');
      }
      estado.cargos = (await A.api('/cargos-acesso')).cargos;
      desenhar(pode);
    } catch (erro) {
      A.aviso(tela.body, 'Não deu para carregar', A.mensagemErro(erro), U.botao('Tentar de novo', abrir));
    }
  }

  const totalPermissoes = () => estado.ctx.catalogo.permissoes.length;

  function desenhar(pode) {
    const blocos = [];
    blocos.push(U.nota('O cargo de acesso diz o que a pessoa pode fazer no sistema. Não é o cargo do DP: uma Balconista pode ter o cargo de acesso Caixa. A pessoa recebe o cargo em Usuários › Pessoas com Acesso.'));
    if (!estado.cargos.length) {
      const v = U.vazio('Nenhum cargo de acesso ainda', 'Comece com os cargos sugeridos e ajuste o que precisar, ou crie um do zero pelo +.');
      const nomes = estado.ctx.catalogo.cargosSugeridos.map((c) => c.nome).join(', ');
      v.append(U.el('small', 'acessos-sugeridos', nomes + '.'));
      if (pode) v.append(U.botao('Criar os cargos sugeridos', criarSugeridos, 'btn'));
      blocos.push(v);
      return tela.body.replaceChildren(...blocos);
    }
    const ativos = estado.cargos.filter((c) => c.ativo);
    const inativos = estado.cargos.filter((c) => !c.ativo);
    const s = U.secao('Cargos', ativos.length);
    const lista = U.el('div', 'acessos-lista');
    ativos.forEach((c) => lista.append(linhaCargo(c, pode)));
    s.append(lista);
    blocos.push(s);
    if (inativos.length) {
      const si = U.secao('Desativados', inativos.length);
      const li = U.el('div', 'acessos-lista');
      inativos.forEach((c) => li.append(linhaCargo(c, pode)));
      si.append(li);
      blocos.push(si);
    }
    const faltam = estado.ctx.catalogo.cargosSugeridos.filter((sug) => !estado.cargos.some((c) => U.dobrar(c.nome) === U.dobrar(sug.nome)));
    if (pode && faltam.length) {
      blocos.push(U.botao('Criar os sugeridos que faltam (' + faltam.map((c) => c.nome).join(', ') + ')', criarSugeridos));
    }
    tela.body.replaceChildren(...blocos);
  }

  function linhaCargo(c, pode) {
    const r = U.el(pode ? 'button' : 'div', 'acessos-pessoa acessos-cargo' + (c.ativo ? '' : ' inativa'));
    if (pode) { r.type = 'button'; r.onclick = () => editar(c); r.setAttribute('aria-label', 'Editar o cargo ' + c.nome); }
    const meio = U.el('span', 'acessos-pessoa-texto');
    meio.append(U.el('b', null, c.nome), U.el('small', null, c.descricao || 'Sem descrição'));
    const tags = U.el('span', 'acessos-tags');
    if (!c.ativo) tags.append(U.situacao('Desativado', 'negativo'));
    tags.append(U.situacao(c.permissoes.length + ' de ' + totalPermissoes() + ' permissões', 'neutro'));
    tags.append(U.situacao(c.pessoas === 1 ? '1 pessoa' : c.pessoas + ' pessoas', c.pessoas ? 'info' : 'neutro'));
    r.append(meio, tags);
    return r;
  }

  async function criarSugeridos() {
    try {
      const r = await A.api('/cargos-acesso/sugeridos', { metodo: 'POST' });
      U.avisar(r.criados ? r.criados + ' cargos criados. Confira e ajuste cada um.' : 'Os cargos sugeridos já existem.');
    } catch (erro) {
      U.avisar(A.mensagemErro(erro));
    }
    abrir();
  }

  /**
   * Lista de permissões por área, com caixa de marcar. `marcadas` é um Set; `podeMarcar(chave)` diz
   * se esta pessoa consegue liberar (quem não é administrador só libera o que tem).
   */
  function listaPermissoes(catalogo, marcadas, podeMarcar) {
    const box = U.el('div', 'acessos-areas');
    catalogo.areas.forEach((area) => {
      const itens = catalogo.permissoes.filter((p) => p.area === area.id);
      if (!itens.length) return;
      const bloco = U.el('fieldset', 'acessos-area');
      const leg = U.el('legend');
      const conta = U.el('span', 'acessos-area-conta');
      const todos = U.botao('', () => {
        const ligar = itens.some((p) => podeMarcar(p.chave) && !marcadas.has(p.chave));
        itens.forEach((p) => { if (podeMarcar(p.chave)) { if (ligar) marcadas.add(p.chave); else marcadas.delete(p.chave); } });
        sincronizar();
      }, 'acessos-link');
      leg.append(U.el('span', null, area.nome), conta);
      // Área cujas telas ainda gravam só no aparelho: a marcação fica guardada, mas ainda não bloqueia.
      const naoConfere = itens.every((p) => !p.aplicada);
      if (naoConfere) leg.append(U.el('small', 'acessos-check-nota', 'fica guardado; a tela ainda não confere'));
      leg.append(todos);
      bloco.append(leg);
      const caixas = itens.map((p) => {
        const l = U.el('label', 'acessos-check');
        const c = U.entrada('checkbox');
        c.checked = marcadas.has(p.chave);
        c.disabled = !podeMarcar(p.chave);
        c.onchange = () => { if (c.checked) marcadas.add(p.chave); else marcadas.delete(p.chave); sincronizar(); };
        const t = U.el('span', 'acessos-check-texto', p.rotulo);
        l.append(c, t);
        if (!p.aplicada && !naoConfere) l.append(U.el('small', 'acessos-check-nota', 'tela ainda não confere'));
        if (c.disabled) l.title = 'Você não tem esta permissão, então não pode liberá-la.';
        bloco.append(l);
        return [p, c];
      });
      function sincronizar() {
        const n = itens.filter((p) => marcadas.has(p.chave)).length;
        conta.textContent = n + ' de ' + itens.length;
        caixas.forEach(([p, c]) => { c.checked = marcadas.has(p.chave); });
        todos.textContent = itens.some((p) => podeMarcar(p.chave) && !marcadas.has(p.chave)) ? 'Marcar todas' : 'Desmarcar todas';
        todos.hidden = !itens.some((p) => podeMarcar(p.chave));
      }
      sincronizar();
      box.append(bloco);
    });
    return box;
  }

  function editar(c) {
    const { perfil, catalogo } = estado.ctx;
    const marcadas = new Set(c ? c.permissoes : []);
    // A API recusa liberar o que a pessoa não tem; tirar sempre pode.
    const podeMarcar = (chave) => perfil.tem(chave) || marcadas.has(chave);
    let ativo = c ? c.ativo : true;
    A.dialogoApi({
      titulo: c ? 'Cargo ' + c.nome : 'Novo cargo de acesso',
      subtitulo: c ? (c.pessoas === 1 ? '1 pessoa tem este cargo. A mudança vale na próxima ação dela.' : c.pessoas + ' pessoas têm este cargo. A mudança vale na próxima ação delas.') : 'Marque o que quem tiver este cargo pode fazer.',
      rotuloSalvar: c ? 'Salvar cargo' : 'Criar cargo',
      largo: true,
      montar: (form) => {
        const ctx = {};
        const topo = U.el('div', 'acessos-form-linha');
        ctx.nome = U.entrada('text', c ? c.nome : '', { maxLength: 60, autocomplete: 'off' });
        ctx.descricao = U.entrada('text', c ? c.descricao : '', { maxLength: 200, autocomplete: 'off', placeholder: 'Para que serve este cargo' });
        topo.append(U.campo('Nome', ctx.nome), U.campo('Descrição', ctx.descricao));
        form.append(topo);
        if (c) {
          form.append(U.campo('Situação', U.chips([['sim', 'Ativo'], ['nao', 'Desativado']], ativo ? 'sim' : 'nao', (x) => { ativo = x === 'sim'; }),
            'Desativado, o cargo deixa de valer para todo mundo que o tem. Nada é apagado.'));
        }
        form.append(listaPermissoes(catalogo, marcadas, podeMarcar));
        return ctx;
      },
      enviar: (ctx) => {
        const nome = ctx.nome.value.trim();
        if (nome.length < 2) return 'Informe o nome do cargo.';
        const corpo = { nome, descricao: ctx.descricao.value.trim(), permissoes: [...marcadas] };
        if (!c) return A.api('/cargos-acesso', { metodo: 'POST', corpo });
        if (ativo !== c.ativo) corpo.ativo = ativo;
        return A.api('/cargos-acesso/' + encodeURIComponent(c.id), { metodo: 'PATCH', corpo });
      },
      aoSalvar: (salvo) => { U.avisar('Cargo ' + salvo.nome + ' salvo.'); abrir(); },
    });
  }

  window.CicluzAcessosCargos = { listaPermissoes };
  A.registrar('cargos', abrir);
})();
