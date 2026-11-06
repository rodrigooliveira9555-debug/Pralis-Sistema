/*
 * Configurações (Permissões, Usuários, Senhas) — contas de acesso do S2, gravadas no servidor.
 * Modelo do Sistema Pralis, mais simples: o cargo de acesso libera; a exceção por pessoa libera ou
 * bloqueia; o resto é negado. As regras valem na API (servidor/api/src/acessos); a tela só mostra.
 * Cada tela se registra com CicluzAcessos.registrar(nome, abrir).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const S = window.CicluzSync;
  const COR = '#7c3aed';
  const COR_TEXTO = '#5520ad';
  const ICONE = '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1a6.5 6.5 0 0 1 9.4-5.8"/><rect x="13" y="13" width="8" height="7" rx="1.5"/><path d="M15 13v-2a2 2 0 0 1 4 0v2"/>';
  const telas = {};
  // criarTela do Compras procura o ícone pelo nome no catálogo dele.
  U.ICONES.acessos = ICONE;

  const CARDS = {
    'Usuários': [['usuarios', 'Pessoas com Acesso', 'Criar contas, postos do caixa e cargos'], ['dados', 'Dados no Servidor', 'Situação de cada assunto gravado']],
    'Permissões': [['cargos', 'Cargos de Acesso', 'O que cada cargo pode fazer'], ['pessoa', 'Acessos por Pessoa', 'Ajustar só para uma pessoa']],
    'Senhas': [['senhas', 'Minha Senha', 'Trocar a sua senha'], ['senha-outra', 'Senha de Outra Pessoa', 'Quando alguém esqueceu a senha']],
  };
  const SETOR_DA_TELA = {};
  Object.entries(CARDS).forEach(([setor, cards]) => cards.forEach(([id]) => { SETOR_DA_TELA[id] = setor; }));

  const voltarPara = (setor) => () => openSection(sections[6][0], setor, 'tree', COR);

  /** Tela no padrão do S2, na cor de Configurações. */
  function criarTela({ id, titulo, tela }) {
    const setor = SETOR_DA_TELA[tela];
    return U.criarTela({
      id, titulo, caminho: 'Configurações / ' + setor + ' / ' + titulo,
      icone: 'acessos', voltar: voltarPara(setor), cor: COR, corTexto: COR_TEXTO, classe: 'acessos-view',
    });
  }

  /** Mensagem de erro da API em português simples (com o detalhe do campo, quando houver). */
  function mensagemErro(erro) {
    if (!erro) return 'Algo deu errado.';
    if (erro.status === 0 || erro.status === 503) return 'Sem conexão com o servidor. As contas só existem no servidor: tente de novo quando a conexão voltar.';
    if (erro.status === 401) return 'Sua sessão terminou. Entre de novo.';
    if (erro.detalhes && erro.detalhes.length) return erro.detalhes.map((d) => d.mensagem || d.message).filter(Boolean).join(' ') || erro.message;
    return erro.message || 'Algo deu errado.';
  }

  const api = (caminho, opcoes) => S.api(caminho, opcoes);

  /**
   * Rótulo de um grupo de botões (chips). Não usa <label>: com botão dentro, tocar no rótulo ou na
   * dica acionaria o primeiro botão (ex.: trocar o papel sem querer).
   */
  let seqGrupo = 0;
  function grupo(rotulo, no, dica) {
    const g = U.el('div', 'compras-campo acessos-grupo');
    g.setAttribute('role', 'group');
    const r = U.el('span', 'compras-rotulo', rotulo);
    r.id = 'acessos-grupo-' + (++seqGrupo);
    g.setAttribute('aria-labelledby', r.id);
    g.append(r, no);
    if (dica) g.append(U.el('small', 'profiles-note', dica));
    return g;
  }

  /** Senha mínima que vale no servidor (8 fora de produção, 10 em produção), vinda do catálogo. */
  const senhaMinima = (ctx) => (ctx && ctx.catalogo && ctx.catalogo.senhaMinima) || 8;

  /** Campo de senha com "Mostrar" (conferir o que foi digitado antes de entregar a senha a alguém). */
  function campoSenha(rotulo, autocomplete, dica) {
    const input = U.entrada('password', '', { autocomplete, maxLength: 128 });
    const ver = U.botao('Mostrar', () => {
      const mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      ver.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      ver.setAttribute('aria-pressed', String(mostrar));
    }, 'acessos-ver-senha');
    ver.setAttribute('aria-pressed', 'false');
    ver.setAttribute('aria-label', 'Mostrar ' + rotulo.toLocaleLowerCase('pt-BR'));
    const linha = U.el('span', 'acessos-senha-linha');
    linha.append(input, ver);
    const no = U.el('div', 'compras-campo');
    const r = U.el('label', 'compras-rotulo', rotulo);
    r.htmlFor = input.id = 'acessos-senha-' + (++seqGrupo);
    no.append(r, linha);
    if (dica) no.append(U.el('small', 'profiles-note', dica));
    return { input, no };
  }

  /**
   * Diálogo do S2 que grava pela API: o ✓ fica esperando a resposta e o diálogo só fecha quando o
   * servidor confirma. enviar(ctx) devolve uma Promise; um texto devolvido antes (validação) mantém aberto.
   */
  function dialogoApi({ enviar, aoSalvar, ...opcoes }) {
    let d = null;
    let ocupado = false;
    // "Salvando…" em aviso neutro (role=status); o vermelho com role=alert fica só para erro.
    const status = U.el('p', 'acessos-salvando');
    status.setAttribute('role', 'status');
    d = U.dialogo({
      ...opcoes, cor: COR, corTexto: COR_TEXTO, classe: 'acessos-dialog' + (opcoes.classe ? ' ' + opcoes.classe : ''),
      salvar: (ctx) => {
        // Texto de um espaço: mantém o diálogo aberto sem escrever nada no lugar do erro.
        if (ocupado) return ' ';
        const r = enviar(ctx);
        if (typeof r === 'string') return r;
        ocupado = true;
        status.textContent = 'Salvando…';
        d.setAttribute('aria-busy', 'true');
        Promise.resolve(r).then((dados) => {
          ocupado = false;
          d.close();
          if (aoSalvar) aoSalvar(dados);
        }, (falha) => {
          ocupado = false;
          status.textContent = '';
          d.removeAttribute('aria-busy');
          const erro = d.querySelector('.profiles-error');
          if (erro) erro.textContent = mensagemErro(falha);
        });
        return ' ';
      },
    });
    const erro = d.querySelector('.profiles-error');
    if (erro) erro.before(status);
    return d;
  }

  function confirmar(titulo, texto, rotulo, acao) {
    U.confirmar(titulo, texto, rotulo, acao, { cor: COR, corTexto: COR_TEXTO, classe: 'acessos-dialog' });
  }

  // Sessão e catálogo: lidos de novo a cada tela aberta (um cargo pode ter mudado em outra aba).
  async function contexto() {
    const [sessao, catalogo] = await Promise.all([api('/sessao'), api('/acessos/catalogo')]);
    const perfil = sessao.perfil;
    perfil.tem = (chave) => perfil.papel === 'administrador' || (perfil.permissoes || []).includes(chave);
    return { perfil, catalogo };
  }

  /** Bloco de "sem acesso" ou "sem conexão" no corpo da tela. */
  function aviso(body, titulo, texto, acao) {
    const v = U.vazio(titulo, texto);
    if (acao) v.append(acao);
    body.replaceChildren(v);
  }

  /** Iniciais para o círculo da pessoa (mesmo cálculo do menu lateral). */
  const iniciais = (nome) => String(nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  function registrar(nome, abrir) { telas[nome] = abrir; }
  function abrir(nome, ...args) {
    const t = telas[nome];
    if (t) return t(...args);
    console.warn('Configurações: tela não encontrada', nome);
  }

  // Atalho por endereço (#acessos:senhas): nome no menu lateral e o menu do /app/ abrem a tela certa.
  function abrirPeloEndereco() {
    const m = /^#acessos:([a-z-]+)$/.exec(location.hash);
    if (!m || !telas[m[1]]) return;
    history.replaceState(null, '', location.pathname + location.search);
    // Vindo do nome no menu lateral ou de outra página: fecha o menu de página cheia antes.
    document.dispatchEvent(new Event('cicluz-close-menu'));
    abrir(m[1]);
  }
  window.addEventListener('hashchange', abrirPeloEndereco);
  window.addEventListener('load', () => setTimeout(abrirPeloEndereco, 0));

  window.CicluzAcessos = {
    COR, COR_TEXTO, ICONE,
    cards: (setor) => (CARDS[setor] || []).map(([id, t, d]) => [t, d, 'acessos:' + id]),
    criarTela, dialogoApi, confirmar, mensagemErro, contexto, aviso, iniciais, api, abrir, registrar,
    grupo, campoSenha, senhaMinima,
  };
})();
