/*
 * Configurações → Usuários → Dados no Servidor (só administrador): cada assunto gravado pelo site
 * vira tabelas no banco; aqui aparece se está em dia ou o que corrigir. Veio da antiga usuarios.html.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  let tela = null;

  const ASSUNTOS = {
    financeiro: 'Financeiro (grupos, tipos de venda, bandeiras, operadoras e taxas)',
    contas: 'Contas',
    cargos: 'Cargos',
    salarios: 'Salários por vigência',
    'ficha-de-cargos': 'Ficha de cargos',
    locais: 'Áreas, setores e locais',
    organograma: 'Organograma',
    identidade: 'Ícones e cores próprios',
  };

  async function abrir() {
    if (!tela) tela = A.criarTela({ id: 'acessos-dados-view', titulo: 'Dados no Servidor', tela: 'dados' });
    tela.ativar();
    tela.body.replaceChildren(U.nota('Carregando…'));
    try {
      const { perfil } = await A.contexto();
      if (perfil.papel !== 'administrador') return A.aviso(tela.body, 'Só o administrador', 'A situação dos dados no servidor é acompanhada pelo administrador.');
      const dados = await A.api('/projecoes');
      const porAssunto = {};
      dados.assuntos.forEach((a) => { porAssunto[a.assunto] = a; });
      const s = U.secao('Assuntos', Object.keys(ASSUNTOS).length);
      s.append(U.nota('Cada assunto vira tabelas no banco a cada gravação. "Precisa de correção" diz o que ajustar na tela; o dado da tela continua salvo.'));
      const lista = U.el('div', 'acessos-lista');
      Object.keys(ASSUNTOS).forEach((assunto) => {
        const a = porAssunto[assunto];
        const r = U.el('div', 'acessos-pessoa');
        const meio = U.el('span', 'acessos-pessoa-texto');
        meio.append(U.el('b', null, ASSUNTOS[assunto]));
        if (a && a.mensagem) meio.append(U.el('small', null, a.mensagem));
        const tags = U.el('span', 'acessos-tags');
        tags.append(!a ? U.situacao('Sem dados ainda', 'neutro') : a.situacao === 'ok' ? U.situacao('Em dia', 'positivo') : U.situacao('Precisa de correção', 'negativo'));
        r.append(meio, tags);
        lista.append(r);
      });
      s.append(lista);
      tela.body.replaceChildren(s);
    } catch (erro) {
      A.aviso(tela.body, 'Não deu para carregar', A.mensagemErro(erro), U.botao('Tentar de novo', abrir));
    }
  }

  A.registrar('dados', abrir);
})();
