/*
 * Configurações → Permissões → Acessos por Pessoa. Mostra o que a pessoa pode, de onde vem (cargo,
 * acesso de antes, ajuste) e deixa liberar ou bloquear uma permissão só para ela. Os cargos dela
 * são escolhidos em Usuários; aqui só o ajuste fino.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  let tela = null;
  const estado = { ctx: null, usuarios: [], cargos: [], escolhido: '', excecoes: {}, filtro: 'tudo' };
  // Compara ajustes sem depender da ordem em que foram marcados.
  const assinatura = (excecoes) => JSON.stringify(Object.entries(excecoes).sort());

  async function abrir(usuarioId) {
    if (!tela) tela = A.criarTela({ id: 'acessos-pessoa-view', titulo: 'Acessos por Pessoa', tela: 'pessoa' });
    tela.ativar();
    tela.body.replaceChildren(U.nota('Carregando…'));
    try {
      estado.ctx = await A.contexto();
      if (!estado.ctx.perfil.tem('permissoes_gerenciar')) {
        return A.aviso(tela.body, 'Sem acesso a esta tela', 'Peça a quem cuida das permissões o acesso "Montar cargos de acesso e acessos por pessoa".');
      }
      const [usuarios, cargos] = await Promise.all([A.api('/usuarios'), A.api('/cargos-acesso')]);
      estado.usuarios = usuarios.usuarios.filter((u) => u.ativo);
      estado.cargos = cargos.cargos;
      if (typeof usuarioId === 'string') estado.escolhido = usuarioId;
      if (!estado.usuarios.some((u) => u.id === estado.escolhido)) estado.escolhido = '';
      desenhar();
    } catch (erro) {
      A.aviso(tela.body, 'Não deu para carregar', A.mensagemErro(erro), U.botao('Tentar de novo', abrir));
    }
  }

  function desenhar() {
    const opcoes = estado.usuarios.map((u) => [u.id, u.nome + (u.id === estado.ctx.perfil.usuarioId ? ' (você)' : '')]);
    const sel = U.seletor(opcoes, estado.escolhido, 'Escolha a pessoa');
    sel.onchange = () => { estado.escolhido = sel.value; carregarPessoa(); };
    const topo = U.el('div', 'acessos-barra');
    topo.append(U.campo('Pessoa', sel));
    tela.area = U.el('div', 'acessos-pessoa-area');
    tela.body.replaceChildren(topo, tela.area);
    carregarPessoa();
  }

  async function carregarPessoa() {
    const area = tela.area;
    const u = estado.usuarios.find((x) => x.id === estado.escolhido);
    if (!u) return area.replaceChildren(U.vazio('Escolha uma pessoa', 'Você vê o que ela pode fazer e de onde vem cada acesso.'));
    if (u.papel === 'administrador') return area.replaceChildren(U.vazio(u.nome + ' é administrador', 'Administrador tem todos os acessos. Para restringir, troque o papel em Usuários.'));
    area.replaceChildren(U.nota('Carregando…'));
    try {
      const acessos = await A.api('/usuarios/' + encodeURIComponent(u.id) + '/acessos');
      estado.excecoes = { ...acessos.excecoes };
      estado.original = assinatura(acessos.excecoes);
      desenharPessoa(u);
    } catch (erro) {
      area.replaceChildren(U.vazio('Não deu para carregar', A.mensagemErro(erro)));
    }
  }

  // Mesmo cálculo do servidor (shared/src/acessos.ts), para mostrar o resultado antes de salvar.
  function resolver(u) {
    const cat = estado.ctx.catalogo;
    const cargos = estado.cargos.filter((c) => c.ativo && u.cargos.some((x) => x.id === c.id));
    const efetivas = new Map();
    const excecoes = Object.entries(estado.excecoes);
    if (!cargos.length && !excecoes.length) {
      cat.permissoesSemCargo.forEach((k) => efetivas.set(k, 'Acesso de antes (sem cargo)'));
      return efetivas;
    }
    cargos.forEach((c) => c.permissoes.forEach((k) => {
      efetivas.set(k, efetivas.has(k) ? efetivas.get(k) + ', ' + c.nome : 'Pelo cargo ' + c.nome);
    }));
    excecoes.forEach(([k, pode]) => { if (pode) efetivas.set(k, 'Liberado só para esta pessoa'); else efetivas.delete(k); });
    return efetivas;
  }

  function desenharPessoa(u) {
    const area = tela.area;
    const eu = u.id === estado.ctx.perfil.usuarioId;
    const cab = U.el('div', 'acessos-resumo');
    const av = U.el('span', 'acessos-avatar' + (u.posto ? ' posto' : ''), u.posto ? 'P' + u.posto.pdv : A.iniciais(u.nome));
    av.setAttribute('aria-hidden', 'true');
    const txt = U.el('div', 'acessos-pessoa-texto');
    txt.append(U.el('b', null, u.nome), U.el('small', null, u.cargos.length ? 'Cargos: ' + u.cargos.map((c) => c.nome).join(', ') : 'Sem cargo de acesso'));
    const contagem = U.el('span', 'acessos-tags');
    cab.append(av, txt, contagem);
    const blocos = [cab];
    const semCargo = !u.cargos.length && !Object.keys(estado.excecoes).length;
    if (semCargo) blocos.push(U.nota('Sem cargo, vale o acesso de antes. Para ajustar, primeiro dê um cargo em Usuários › Pessoas com Acesso: um ajuste sem cargo tiraria o acesso de antes.'));
    if (eu) blocos.push(U.nota('Estes são os seus acessos. Ninguém muda os próprios acessos: peça a outra pessoa que cuida das permissões.'));
    const editavel = !eu && !semCargo;
    blocos.push(U.chips([['tudo', 'Tudo'], ['pode', 'Só o que pode'], ['ajustes', 'Só ajustes']], estado.filtro, (x) => { estado.filtro = x; desenharLista(); }));
    const lista = U.el('div', 'acessos-areas');
    blocos.push(lista);
    const acoes = U.el('div', 'acessos-acoes');
    const salvar = U.botao('Salvar ajustes', () => gravar(u), 'btn');
    const limpar = U.botao('Voltar tudo para o cargo', () => { estado.excecoes = {}; desenharLista(); }, 'btn secondary');
    if (editavel) { acoes.append(limpar, salvar); blocos.push(acoes); }
    area.replaceChildren(...blocos);

    function desenharLista() {
      const efetivas = resolver(u);
      const cat = estado.ctx.catalogo;
      contagem.replaceChildren(U.situacao(efetivas.size + ' de ' + cat.permissoes.length + ' permissões', 'info'));
      const ajustes = Object.keys(estado.excecoes).length;
      if (ajustes) contagem.append(U.situacao(ajustes === 1 ? '1 ajuste' : ajustes + ' ajustes', 'atencao'));
      salvar.disabled = assinatura(estado.excecoes) === estado.original;
      limpar.disabled = !ajustes;
      lista.replaceChildren();
      cat.areas.forEach((area) => {
        const itens = cat.permissoes.filter((p) => p.area === area.id).filter((p) =>
          estado.filtro === 'tudo' || (estado.filtro === 'pode' ? efetivas.has(p.chave) : p.chave in estado.excecoes));
        if (!itens.length) return;
        const bloco = U.el('fieldset', 'acessos-area');
        bloco.append(U.el('legend', null, area.nome));
        itens.forEach((p) => bloco.append(linha(p, efetivas)));
        lista.append(bloco);
      });
      if (!lista.children.length) lista.append(U.vazio(estado.filtro === 'ajustes' ? 'Nenhum ajuste' : 'Nada para mostrar'));
    }

    function linha(p, efetivas) {
      const pode = efetivas.has(p.chave);
      const l = U.el('div', 'acessos-linha-perm' + (pode ? ' pode' : ''));
      const t = U.el('div', 'acessos-check-texto');
      t.append(U.el('b', null, p.rotulo), U.el('small', null, pode ? efetivas.get(p.chave) : p.chave in estado.excecoes ? 'Bloqueado só para esta pessoa' : 'O cargo não libera'));
      const marca = U.situacao(pode ? 'Pode' : 'Não pode', pode ? 'positivo' : 'neutro');
      l.append(t, marca);
      if (editavel) {
        const atual = p.chave in estado.excecoes ? (estado.excecoes[p.chave] ? 'liberar' : 'bloquear') : 'cargo';
        const opcoes = [['cargo', 'Como o cargo'], ['bloquear', 'Bloquear']];
        if (estado.ctx.perfil.tem(p.chave) || atual === 'liberar') opcoes.splice(1, 0, ['liberar', 'Liberar']);
        const ch = U.chips(opcoes, atual, (x) => {
          if (x === 'cargo') delete estado.excecoes[p.chave]; else estado.excecoes[p.chave] = x === 'liberar';
          desenharLista();
        });
        ch.setAttribute('aria-label', p.rotulo);
        ch.classList.add('acessos-tri');
        l.append(ch);
      }
      return l;
    }
    desenharLista();
  }

  async function gravar(u) {
    try {
      await A.api('/usuarios/' + encodeURIComponent(u.id) + '/acessos', { metodo: 'PUT', corpo: { excecoes: estado.excecoes } });
      U.avisar('Acessos de ' + u.nome + ' salvos. Valem na próxima ação dela.');
      estado.original = assinatura(estado.excecoes);
      carregarPessoa();
    } catch (erro) {
      U.avisar(A.mensagemErro(erro));
    }
  }

  A.registrar('pessoa', abrir);
})();
