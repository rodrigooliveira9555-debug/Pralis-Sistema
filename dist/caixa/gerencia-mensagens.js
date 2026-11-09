/*
 * Caixa — Gerência: mensagens para os caixas (casca). Base no principal: MensagensAdminPainel e MensagemAdminEnvioDialog.
 * Regras (Caixa-Brain/06): título 1–120, mensagem 1–2000, validade opcional e NUNCA no passado; alvos: todos os caixas
 * abertos agora · toda a empresa · PDVs específicos · operadores específicos; uma entrega por destinatário e PDV;
 * situação: entregue → visualizada → fechada sem confirmar | confirmada ("Entendi" vence "Fechar"); sem edição nem
 * exclusão, só "Encerrar"; quem abrir o caixa dentro da validade (empresa ou PDV alvo) também recebe, e a mensagem
 * nunca bloqueia a abertura. O operador vê e responde no Turno. Dados FICTÍCIOS, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada } = U;

  const ALVOS = [['abertos', 'Todos os caixas abertos agora'], ['empresa', 'Toda a empresa'], ['pdvs', 'PDVs específicos'], ['operadores', 'Operadores específicos']];
  const ROTULO_ENTREGA = { entregue: 'Entregue', visualizada: 'Visualizada', fechada_sem_confirmar: 'Fechada sem confirmar', confirmada: 'Confirmada' };
  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  function bloco(atualizar) {
    const ms = C.estado.mensagens;
    const s = U.secao('Mensagens para os caixas', ms.length, C.pode('mensagens') ? [botao('Nova mensagem', () => dialogo(atualizar), 'btn')] : []);
    if (!ms.length) { s.append(corpoSecao(U.nota('Nenhuma mensagem enviada. A Gerência avisa quem está no caixa; quem abrir dentro da validade também recebe.'))); return s; }
    const lista = el('div', 'compras-lista');
    ms.forEach((m) => {
      const cont = {};
      m.entregas.forEach((x) => { cont[x.situacao] = (cont[x.situacao] || 0) + 1; });
      const resumo = m.entregas.length ? Object.entries(cont).map(([k, n]) => n + ' ' + ROTULO_ENTREGA[k].toLowerCase()).join(' · ') : 'nenhum destinatário agora';
      const direita = m.encerrada ? [U.situacao('Encerrada', 'neutro')] : [botao('Encerrar', () => { m.encerrada = true; U.avisar('Mensagem encerrada. Ela para de alcançar quem abrir caixa.'); atualizar(); }, 'btn secondary')];
      lista.append(U.linhaLista({ titulo: m.titulo, detalhe: m.alvo + ' · ' + resumo + (m.validade ? ' · válida até ' + m.validade.replace('T', ' ') : ''), direita }));
    });
    s.append(lista);
    return s;
  }

  function marcar(rotulo, conjunto, valor) {
    const v = valor || rotulo;
    const l = el('label', 'compras-interruptor');
    const i = entrada('checkbox', null);
    i.onchange = () => { if (i.checked) conjunto.add(v); else conjunto.delete(v); };
    l.append(i, el('span', null, rotulo));
    return l;
  }

  function dialogo(atualizar) {
    const abertos = () => C.caixasAbertos();
    C.dialogo({
      titulo: 'Nova mensagem',
      subtitulo: 'Aviso para os caixas. Não há edição nem exclusão: só encerrar.',
      rotuloSalvar: 'Enviar mensagem',
      largo: true,
      montar: (form) => {
        const titulo = entrada('text', '', { maxLength: 120, placeholder: 'Ex.: Troca de maquininha às 15h' });
        const texto = el('textarea');
        texto.rows = 3;
        texto.maxLength = 2000;
        const validade = entrada('datetime-local', '');
        const ctx = { alvo: 'abertos', pdvs: new Set(), ops: new Set(), titulo, texto, validade };
        const opcoes = el('div', 'caixa-alvos');
        const renderAlvo = () => {
          opcoes.replaceChildren();
          if (ctx.alvo === 'pdvs') ['PDV 1', 'PDV 2', 'PDV 3', 'PDV 4'].forEach((p) => opcoes.append(marcar(p, ctx.pdvs)));
          if (ctx.alvo === 'operadores') abertos().forEach((a) => opcoes.append(marcar(a.operador + ' (' + a.pdv + ')', ctx.ops, a.operador)));
        };
        const alvo = U.chips(ALVOS, ctx.alvo, (v) => { ctx.alvo = v; renderAlvo(); });
        form.append(campo('Título', titulo), campo('Mensagem', texto), campo('Validade (opcional)', validade, 'Depois deste horário a mensagem para de alcançar quem abrir caixa.'), el('span', 'compras-rotulo', 'Quem recebe'), alvo, opcoes);
        return ctx;
      },
      salvar: (ctx) => {
        const titulo = ctx.titulo.value.trim();
        const texto = ctx.texto.value.trim();
        if (!titulo) return 'Informe o título da mensagem.';
        if (!texto) return 'Escreva a mensagem.';
        if (ctx.validade.value && new Date(ctx.validade.value).getTime() <= Date.now()) return 'A validade da mensagem precisa estar no futuro.';
        if (ctx.alvo === 'pdvs' && !ctx.pdvs.size) return 'Escolha ao menos um PDV.';
        if (ctx.alvo === 'operadores' && !ctx.ops.size) return 'Escolha ao menos um operador.';
        const ab = abertos();
        let alvos = ab;
        let rotuloAlvo = 'Todos os caixas abertos agora';
        if (ctx.alvo === 'empresa') rotuloAlvo = 'Toda a empresa';
        if (ctx.alvo === 'pdvs') { alvos = ab.filter((a) => ctx.pdvs.has(a.pdv)); rotuloAlvo = 'PDVs: ' + [...ctx.pdvs].join(', '); }
        if (ctx.alvo === 'operadores') { alvos = ab.filter((a) => ctx.ops.has(a.operador)); rotuloAlvo = 'Operadores: ' + [...ctx.ops].join(', '); }
        C.estado.mensagens.unshift({
          id: 'msg-' + (C.estado.mensagens.length + 1), titulo, corpo: texto, validade: ctx.validade.value, alvo: rotuloAlvo, encerrada: false,
          alvoTipo: ctx.alvo, pdvs: [...ctx.pdvs], entregas: alvos.map((a) => ({ operador: a.operador, pdv: a.pdv, situacao: 'entregue' })),
        });
        U.avisar(alvos.length ? 'Mensagem enviada para ' + alvos.length + (alvos.length === 1 ? ' destinatário.' : ' destinatários.') : 'Mensagem criada, mas nenhum destinatário foi alcançado agora. Quem abrir caixa dentro da validade vai receber.');
        atualizar();
      },
    });
  }

  window.CicluzCaixaGerencia = Object.assign(window.CicluzCaixaGerencia || {}, { mensagens: bloco });
})();
