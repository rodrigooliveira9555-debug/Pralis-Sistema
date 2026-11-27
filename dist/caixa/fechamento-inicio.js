/*
 * Caixa — Fechamento, etapa 1: "Início das vendas" e "Ajustar início" (R-224). Base no principal: CaixaInicioVendasAjuste.vue
 * (Caixa-Brain/04 §8 e /05). A regra está em inicio-vendas.js; aqui só a tela: o resumo do período, o aviso de horário da folha
 * (tolerância de 2 min; quando cabe na janela de 60 min, o botão já leva a hora da folha e o motivo preenchido) e o diálogo.
 * Quem ajusta: quem opera o caixa (Operador ou Gerente). Dados FICTÍCIOS, em centavos, só em memória.
 * Formulário linha por linha (padrão da Nova Transferência, 27/11/2026): o resumo do período é um grupo de linhas de leitura e a janela
 * "Ajustar início" tem a hora (campo de hora do sistema, que abre ao tocar na linha) e o motivo em linhas; as explicações ficam depois do quadro.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const Comum = window.CicluzCaixaFechamentoComum;
  const { ctx: K } = Comum;

  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const podeAjustar = () => C.ajustavelInicio() && C.pode('operar');

  function dialogoAjuste({ hora = '', motivo = '' } = {}) {
    const a = C.estado.abertura;
    const j = C.janelaInicio();
    C.dialogo({
      titulo: 'Ajustar início das vendas',
      subtitulo: 'As vendas do PDV desse intervalo que estão sem caixa passam a ser deste caixa. A abertura oficial (' + a.abertoEm + ') não muda.',
      rotuloSalvar: 'Ajustar início',
      padrao: true,
      montar: (form) => {
        const { linha, abreAoTocarNaLinha } = C.pecas();
        // Hora: o campo de hora do sistema (HH:MM, com o relógio); tocar em qualquer ponto da linha abre o painel.
        const campoHora = U.campoHora({ rotulo: 'Novo início das vendas', valor: hora || a.inicioVendas });
        campoHora.input.required = true;
        const linhaHora = abreAoTocarNaLinha(linha('Novo início das vendas *', campoHora.caixa, campoHora.painel), campoHora.input, campoHora.painel);
        const m = entrada('text', motivo, { maxLength: 500, autocomplete: 'off' });
        form.append(C.formulario(C.grupo('Novo início', [linhaHora, C.linhaCampo('Motivo do ajuste', m, true)],
          U.nota('Pode recuar de ' + j.de + ' até ' + j.ate + ': no máximo ' + C.RECUO_MAXIMO_MIN + ' minutos antes da abertura oficial, no mesmo dia e nunca no mesmo minuto nem antes do fechamento do caixa anterior deste PDV.'),
          U.nota('O motivo é obrigatório, de 3 a 500 letras. Fica registrado com a hora de antes e a de depois.'))));
        return { h: campoHora.input, m };
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
    const leituras = [
      ['Abertura oficial', a.abertoEm],
      ['Início das vendas', a.inicioVendas + (a.edicoes.length ? ' (ajustado)' : '')],
      ['Vendas deste caixa', String(t.vendas.length)],
      ['Vendas do PDV sem caixa', t.semCaixa.length ? String(t.semCaixa.length) : 'Nenhuma'],
    ];
    const notas = t.semCaixa.length ? [U.nota(plural(t.semCaixa.length, 'venda do PDV foi feita', 'vendas do PDV foram feitas') + ' antes do início deste caixa e ' + (t.semCaixa.length === 1 ? 'está sem caixa' : 'estão sem caixa') + '. Se são deste turno, ajuste o início das vendas.')] : [];
    const itens = [C.grupo('Início das vendas', leituras.map(([t2, v]) => C.linhaLeitura(t2, v)), ...notas)];
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
