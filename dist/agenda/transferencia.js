/*
 * Agenda — levar a Agenda antiga (documento cicluz-agenda-v1) para o servidor (plano, seções 4 e 5).
 * O administrador vê a prévia (contagens, o que vai para a pendência), escolhe o gestor dos compromissos feitos antes
 * do login e confirma. As pessoas de teste da lista provisória (José · Compras, Rodrigo · Gerência, Ana · Estoque) não
 * são contas e ficam de fora (Zé, 24/11/2026: apagar as de teste; P-45). Quem não é administrador vê o aviso de espera.
 * O servidor lê o próprio documento, confere a contagem e não apaga o documento.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAgendaDados;
  const { el, botao } = U;

  const ehAdministrador = () => Boolean(window.CicluzSessao && window.CicluzSessao.perfil && window.CicluzSessao.perfil.papel === 'administrador');

  function render(body, { aoConcluir }) {
    if (A.situacao === 'carregando') { body.append(U.vazio('Carregando a Agenda…', '')); return; }
    if (!ehAdministrador()) {
      body.append(U.vazio('A Agenda está sendo levada para o servidor.', 'Volte em alguns minutos. Nada do que já existe se perde.'));
      return;
    }
    const caixa = el('div', 'agenda-transferencia');
    caixa.append(U.vazio('Carregando a prévia…', ''));
    body.append(caixa);
    A.previaTransferencia().then((r) => {
      caixa.replaceChildren();
      if (r.erro) { caixa.append(U.situacao(r.erro, 'negativo'), botao('Tentar de novo', () => { caixa.remove(); render(body, { aoConcluir }); }, 'btn secondary')); return; }
      montar(caixa, r.dados, aoConcluir);
    });
  }

  function montar(caixa, p, aoConcluir) {
    const c = p.contagens || {};
    const intro = U.secao('Levar a Agenda para o servidor');
    intro.append(U.nota('A partir daqui, cada compromisso fica guardado no servidor e cada pessoa só recebe o que participa. A Agenda antiga não é apagada.'));
    const numeros = [
      ['Listas', c.listas], ['Compromissos', c.itens], ['Concluídos', c.concluidos], ['Avaliações', c.notas], ['Ligações do mapa', c.relacoes], ['Subtarefas', c.subtarefas],
    ];
    const grade = el('div', 'agenda-transferencia-numeros');
    numeros.forEach(([rotulo, n]) => { const b = el('div', 'agenda-transferencia-numero'); b.append(el('b', null, String(n || 0)), el('small', null, rotulo)); grade.append(b); });
    intro.append(grade);
    caixa.append(intro);

    // Gestor dos compromissos sem criador (feitos antes do login): hoje ficam abertos a todos.
    const contas = (p.pessoas || []).map((x) => [x.id, x.nome]);
    const eu = window.CicluzSessao.perfil.usuarioId;
    const gestor = U.seletor(contas, contas.some(([id]) => id === eu) ? eu : (contas[0] || [''])[0]);
    const decisoes = U.secao('Quem fica com o quê');
    decisoes.append(U.campo('Gestor dos compromissos sem criador', gestor,
      (p.itensSemCriador || 0) + ' compromisso(s) foram feitos antes do login e hoje ficam abertos a todos. Escolha quem passa a ser o gestor deles.'));

    // Pessoas de teste (lista provisória, não são contas): ficam de fora, sem acesso a nada.
    const usosTeste = (p.idsSemConta || []).reduce((n, x) => n + (x.usos || 0), 0);
    decisoes.append(U.nota(usosTeste
      ? 'As pessoas de teste (José · Compras, Rodrigo · Gerência, Ana · Estoque) aparecem ' + usosTeste + ' vez(es) nos compromissos e ficam de fora: não viram pessoas da Agenda nem dão acesso a nada.'
      : 'Todas as pessoas dos compromissos já são contas da empresa.'));
    caixa.append(decisoes);

    // O que vai para a pendência (ajustado e guardado à parte) e o que só é informado.
    const pend = p.pendencias || [];
    const avisos = U.secao('Para conferir depois', pend.length);
    if (pend.length) {
      const lista = el('ul', 'agenda-transferencia-pendencias');
      pend.slice(0, 200).forEach((x) => lista.append(el('li', null, (x.titulo ? x.titulo + ': ' : '') + x.detalhe)));
      avisos.append(lista);
      if (pend.length > 200) avisos.append(U.nota('Mostrando 200 de ' + pend.length + '.'));
    } else avisos.append(U.nota('Nada a ajustar.'));
    if (p.orfaos && (p.orfaos.mensagens || p.orfaos.arquivos)) avisos.append(U.nota(p.orfaos.mensagens + ' mensagem(ns) e ' + p.orfaos.arquivos + ' arquivo(s) do chat são de compromissos que não existem mais. Ficam guardados.'));
    if ((p.perdidosEmConflito || []).length) {
      avisos.append(U.nota('Compromissos que apareceram em gravações recusadas por conflito e não estão na Agenda (ficam guardados no histórico):'));
      const l = el('ul', 'agenda-transferencia-pendencias');
      p.perdidosEmConflito.slice(0, 50).forEach((x) => l.append(el('li', null, x.titulo || x.id)));
      avisos.append(l);
    }
    caixa.append(avisos);

    const acoes = el('div', 'agenda-form-rodape');
    const levar = botao('Levar a Agenda para o servidor', () => {
      U.confirmar('Levar a Agenda para o servidor', 'Confirmar? ' + (c.itens || 0) + ' compromisso(s) e ' + (c.listas || 0) + ' lista(s) vão para o servidor. Se a conferência não fechar, nada muda.', 'Levar', async () => {
        const r = await A.transferir({ documentoVersao: p.documento ? p.documento.versao : null, gestorSemCriador: gestor.value });
        if (r.erro) return r.erro;
        U.avisar('A Agenda está no servidor.');
        aoConcluir();
        return undefined;
      }, { cor: window.CicluzAgenda.COR, corTexto: window.CicluzAgenda.COR_TEXTO, classe: 'agenda-dialog' });
    }, 'btn');
    if (!p.somaFecha) { levar.disabled = true; acoes.append(U.situacao('A conferência da prévia não fechou. Avise o suporte antes de levar.', 'negativo')); }
    if (!gestor.value) levar.disabled = true;
    acoes.append(levar);
    caixa.append(acoes);
  }

  window.CicluzAgendaTransferencia = { render };
})();
