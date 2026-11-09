/*
 * Caixa — Fechamento, etapa 1: "Início das vendas" e "Ajustar início" (R-224). Base no principal: CaixaInicioVendasAjuste.vue
 * (Caixa-Brain/04 §8 e /05). A regra está em inicio-vendas.js; aqui só a tela: o resumo do período, o aviso de horário da folha
 * (tolerância de 2 min; quando cabe na janela de 60 min, o botão já leva a hora da folha e o motivo preenchido) e o diálogo.
 * Quem ajusta: quem opera o caixa (Operador ou Gerente). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada } = U;
  const Comum = window.CicluzCaixaFechamentoComum;
  const { ctx: K, dl } = Comum;

  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const podeAjustar = () => C.ajustavelInicio() && C.pode('operar');

  function dialogoAjuste({ hora = '', motivo = '' } = {}) {
    const a = C.estado.abertura;
    const j = C.janelaInicio();
    C.dialogo({
      titulo: 'Ajustar início das vendas',
      subtitulo: 'As vendas do PDV desse intervalo que estão sem caixa passam a ser deste caixa. A abertura oficial (' + a.abertoEm + ') não muda.',
      rotuloSalvar: 'Ajustar início',
      montar: (form) => {
        form.append(U.nota('Pode recuar de ' + j.de + ' até ' + j.ate + ': no máximo ' + C.RECUO_MAXIMO_MIN + ' minutos antes da abertura oficial, no mesmo dia e nunca antes do fechamento do caixa anterior deste PDV.'));
        const h = entrada('time', hora || a.inicioVendas, { step: 60, required: true });
        const m = el('textarea');
        m.rows = 3;
        m.maxLength = 500;
        m.value = motivo;
        form.append(campo('Novo início das vendas', h), campo('Motivo do ajuste', m, 'Obrigatório, de 3 a 500 letras. Fica registrado com a hora de antes e a de depois.'));
        return { h, m };
      },
      salvar: ({ h, m }) => {
        const r = C.ajustarInicioVendas(h.value, m.value);
        if (r.erro) return r.erro;
        const partes = [];
        if (r.trazidas) partes.push(plural(r.trazidas, 'venda passou', 'vendas passaram') + ' a ser deste caixa');
        if (r.devolvidas) partes.push(plural(r.devolvidas, 'venda saiu', 'vendas saíram') + ' do caixa (voltou a ficar sem caixa)');
        U.avisar('Início ajustado para ' + h.value + (partes.length ? ': ' + partes.join('; ') : ': nenhuma venda mudou de caixa') + '.' + (r.relatorioDescartado ? ' Gere o relatório de vendas de novo.' : ''));
        K.atualizar();
      },
    });
  }

  /** Resumo do período e o botão "Ajustar início" (dentro da seção da folha, etapa 1). */
  function bloco() {
    const a = C.estado.abertura;
    const t = C.estado.turno;
    const itens = [dl([
      ['Abertura oficial', a.abertoEm],
      ['Início das vendas', a.inicioVendas + (a.edicoes.length ? ' (ajustado)' : '')],
      ['Vendas deste caixa', String(t.vendas.length)],
      ['Vendas do PDV sem caixa', t.semCaixa.length ? String(t.semCaixa.length) : 'Nenhuma'],
    ])];
    if (t.semCaixa.length) itens.push(U.nota(plural(t.semCaixa.length, 'venda do PDV foi feita', 'vendas do PDV foram feitas') + ' antes do início deste caixa e ' + (t.semCaixa.length === 1 ? 'está sem caixa' : 'estão sem caixa') + '. Se são deste turno, ajuste o início das vendas.'));
    if (podeAjustar()) {
      const ac = el('div', 'caixa-acoes caixa-acoes-esq');
      ac.append(botao('Ajustar início', () => dialogoAjuste(), 'btn secondary'));
      itens.push(ac);
    }
    return itens;
  }

  /** Aviso de horário da folha (o "Período de" dela contra o início das vendas). */
  function avisoFolha(fo) {
    const c = C.compararFolha(fo.periodoDe);
    if (!c) return [];
    if (c.confere) return [U.situacao('Horário da folha confere com o início das vendas (' + c.periodo + ', tolerância de ' + C.TOLERANCIA_FOLHA_MIN + ' min)', 'positivo')];
    if (c.depois) return [el('p', 'caixa-alerta', 'A folha do CREARE começa às ' + c.periodo + ', depois do início das vendas (' + c.inicio + '). Confira se é a folha deste turno.')];
    if (!c.cabe) return [el('p', 'caixa-alerta', 'A folha do CREARE começa às ' + c.periodo + ', mais de ' + C.RECUO_MAXIMO_MIN + ' minutos antes da abertura. O início não pode recuar tanto: confira se é a folha deste turno.')];
    const aviso = el('div', 'caixa-corpo');
    aviso.append(el('p', 'caixa-alerta', 'A folha do CREARE começa às ' + c.periodo + ', antes do início das vendas (' + c.inicio + '). Se essas vendas são deste turno, ajuste o início.'));
    if (podeAjustar()) {
      const ac = el('div', 'caixa-acoes caixa-acoes-esq');
      ac.append(botao('Ajustar início para ' + c.periodo, () => dialogoAjuste({ hora: c.periodo, motivo: 'Vendas do PDV antes da abertura no sistema (a folha do CREARE começa às ' + c.periodo + ').' }), 'btn'));
      aviso.append(ac);
    }
    return [aviso];
  }

  Comum.inicio = { bloco, avisoFolha, dialogoAjuste };
})();
