/*
 * Caixa — Turno: diálogos (casca). Sangria, vendas do turno, vendas canceladas, "Não recebi" e "Encerrar vendas".
 * Base no principal: CaixaSangriasDialog, CaixaRetornoSangriaForm, CaixaVendasDoTurnoDialog, CaixaVendasCanceladasDialog,
 * CaixaRecebimentosSemLacre, CaixaInicioFechamentoDialog. Tudo lê e grava no estado único (CicluzCaixa).
 *
 * Adaptação da casca: no principal o formulário de sangria nasce em Transferências, fora do Caixa; aqui "Nova sangria" abre
 * esse formulário dentro do módulo. A sangria vira TRANSFERÊNCIA PENDENTE (sai do caixa na hora; só entra no Cofre quando a
 * Tesouraria conferir). Contagem cega (R-232): acima do disponível o operador só vê "acima do disponível no caixa", sem número.
 *
 * Formulário linha por linha (padrão da Nova Transferência, 27/11/2026): a Nova sangria tem o valor total no quadro grande do topo
 * (com a soma de dinheiro e moedas embaixo, em sinal + palavra) e grupos de linhas; os filtros das vendas e os pares de leitura
 * também são linhas. As peças vêm de CicluzCaixa (formulario, grupo, linhaLeitura, linhaCampo, linhaDinheiro, linhaEscolha, quadroValor).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada, seletor } = U;
  const { moeda, centavos } = C;
  let atualizar = () => {}; // a tela do Turno se redesenha depois de cada ação
  /** Pares nome/valor de leitura: um grupo de linhas (sem título quando a janela já diz do que se trata). */
  const leituras = (titulo, pares) => C.formulario(C.grupo(titulo, pares.map(([t, v]) => C.linhaLeitura(t, v))));
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

  function naoRecebi(r) {
    C.dialogo({
      titulo: 'Não recebeu ' + moeda(r.valor) + '?',
      rotuloSalvar: 'Não recebi',
      montar: (form) => { form.append(el('p', null, 'A transferência é cancelada, o valor volta para ' + C.conta(r.origem).nome + ' e a Tesouraria é avisada.')); },
      salvar: () => { C.resolverRecebimento(r.id, false); U.avisar('Recebimento recusado. A Tesouraria foi avisada.'); atualizar(); },
    });
  }

  function encerrar() {
    const a = C.estado.abertura;
    C.dialogo({
      titulo: 'Confirmar encerramento das vendas',
      rotuloSalvar: 'Encerrar vendas e ir para conferência',
      montar: (form) => {
        form.append(el('p', 'caixa-alerta', 'Ao confirmar, o PDV ' + a.pdv + ' para de receber vendas neste caixa na hora do encerramento.'));
        form.append(el('p', null, 'Você seguirá para a conferência final na Tesouraria. Depois desta confirmação, não será possível voltar ao caixa aberto nem incluir novas vendas neste turno.'));
        form.append(U.nota('Confirme somente quando a última venda já tiver passado no PDV.'));
      },
      salvar: () => {
        if (C.resumo().pendentes.length) return 'Resolva os recebimentos pendentes antes de encerrar as vendas.';
        C.iniciarFechamento();
        U.avisar('Vendas encerradas às ' + C.hora() + '.');
        atualizar();
      },
    });
  }

  /* ---------- Sangria ---------- */

  function sangrias() {
    const sangrias = C.sangriasDoCaixa();
    C.dialogo({
      titulo: 'Sangrias deste caixa',
      subtitulo: 'Dinheiro enviado ao cofre, com o lacre de cada sangria.',
      montar: (form) => {
        if (!sangrias.length) { form.append(U.vazio('Nenhuma sangria realizada neste caixa.')); } else {
          const total = sangrias.reduce((s, x) => s + x.valor, 0);
          form.append(U.nota(plural(sangrias.length, 'sangria', 'sangrias') + ' · Total ' + moeda(total)));
          const lista = el('div', 'compras-lista');
          sangrias.forEach((x) => lista.append(U.linhaLista({
            titulo: moeda(x.valor) + ' · lacre ' + x.lacre,
            detalhe: 'Dinheiro ' + moeda(x.especie) + ' · moedas ' + moeda(x.moedas) + ' · ' + x.criadoEm + ' · ' + (x.situacao === 'pendente' ? 'aguardando a conferência da Tesouraria' : x.situacao === 'recebida' ? 'conferida pela Tesouraria' : x.situacao),
          })));
          form.append(lista);
        }
        form.append(U.nota('Lacres disponíveis: ' + (C.bolsasLivres().length ? C.bolsasLivres().join(' · ') : 'nenhum.')));
      },
    });
  }

  function novaSangria() {
    const e = C.estado;
    const bolsas = C.bolsasLivres();
    const AJUDA = 'Envie dinheiro físico do caixa aberto para o cofre.';
    C.dialogo({
      titulo: 'Nova sangria',
      subtitulo: AJUDA,
      rotuloSalvar: 'Salvar sangria',
      padrao: true,
      montar: (form, dlg) => {
        // O quadro do valor é o primeiro item e fica fixo no topo: a linha repetida do cabeçalho sai e o texto vira nota no formulário.
        const sub = dlg.querySelector('.compras-dialog-sub');
        if (sub) sub.remove();

        // Valor total: o quadro grande, na cor da origem. Embaixo dele, a soma de dinheiro físico + moedas contra o valor total.
        const total = entrada('text', '', { inputMode: 'decimal', placeholder: 'R$ 0,00', autocomplete: 'off' });
        const valor = C.quadroValor('Valor total *', total, () => conferir());
        total.setAttribute('aria-label', 'Valor total');
        const lFisico = C.linhaDinheiro('Dinheiro físico (R$)', '', () => conferir());
        const lMoedas = C.linhaDinheiro('Moedas (R$)', '', () => conferir());
        const fisico = lFisico.input;
        const moedas = lMoedas.input;
        // A conta é a da regra: dinheiro + moedas precisam fechar o valor total. Sinal + palavra, nunca só cor.
        const conferir = () => {
          const v = centavos(total.value);
          const d = centavos(fisico.value) || 0;
          const m = centavos(moedas.value) || 0;
          if (v === null || (!fisico.value.trim() && !moedas.value.trim())) { valor.resumo.textContent = ''; return; }
          const dif = d + m - v;
          valor.resumo.textContent = dif === 0 ? '✓ Dinheiro e moedas somam o valor total.'
            : dif < 0 ? '▼ Faltam ' + moeda(-dif) + ' para somar o valor total.' : '▲ Passam ' + moeda(dif) + ' do valor total.';
        };
        const gComposicao = C.grupo('Composição', [lFisico.no, lMoedas.no], U.nota(AJUDA), U.nota('Dinheiro físico e moedas precisam somar o valor total.'));

        let lacre = null;
        let gLacre;
        if (bolsas.length) {
          const l = C.linhaEscolha('Lacre disponível', bolsas, '', null, true);
          lacre = l.controle;
          gLacre = C.grupo('Lacre', [l.no], U.nota('Confira fisicamente o número antes de fechar a bolsa.'));
        } else {
          gLacre = C.pecas().secao('Lacre', U.nota('Nenhum lacre disponível. Solicite à Tesouraria.'));
        }
        const gResponsavel = C.grupo('Responsável', [C.linhaLeitura('Responsável pela sangria', e.abertura.responsavel)], U.nota('Preenchido com quem abriu o caixa.'));
        const obs = entrada('text', '', { autocomplete: 'off' });
        const gObs = C.grupo('Observação', [C.linhaCampo('Observação (opcional)', obs)]);
        // Só a Gerência vê o teto; o operador recebe a recusa sem o número.
        const notas = C.estado.perfil === 'gerente' ? [U.nota('Disponível para retorno: ' + moeda(C.resumo().saldoLivre) + '.')] : [];
        form.append(C.formulario(valor.no, gComposicao, gLacre, gResponsavel, gObs, ...notas));
        return { total, fisico, moedas, lacre, obs };
      },
      salvar: (c) => {
        const valor = centavos(c.total.value);
        const especie = centavos(c.fisico.value) || 0;
        const moedas = centavos(c.moedas.value) || 0;
        if (!valor) return 'Informe o valor total da sangria, maior que zero.';
        if (especie + moedas !== valor) return 'Dinheiro físico e moedas precisam somar o valor total.';
        if (!c.lacre || !c.lacre.value) return 'Escolha o lacre da sangria.';
        if (valor > C.resumo().saldoLivre) return 'Valor acima do disponível no caixa.';
        C.registrarSangria({ valor, especie, moedas, lacre: c.lacre.value, obs: c.obs.value.trim(), responsavel: e.abertura.responsavel });
        U.avisar('Sangria de ' + moeda(valor) + ' registrada com o lacre ' + c.lacre.value + '.');
        atualizar();
      },
    });
  }

  /* ---------- Vendas do turno e canceladas ---------- */

  function itensDaVenda(itens) {
    return U.tabela(
      [['Produto', (i) => i[0]], ['Qtd.', (i) => String(i[1]), 'caixa-num'], ['Unitário', (i) => moeda(i[2]), 'caixa-num'], ['Total', (i) => moeda(i[1] * i[2]), 'caixa-num']],
      itens
    );
  }

  function cartaoVenda(v, extra) {
    const d = el('details', 'caixa-venda');
    const resumo = el('summary');
    const texto = el('span', 'caixa-venda-texto');
    texto.append(el('b', null, v.descricao), el('small', null, v.hora + ' · ' + (extra || v.formas.map((f) => f[0]).join(' + '))));
    resumo.append(texto, el('span', 'caixa-dinheiro', moeda(v.valor)));
    d.append(resumo);
    return d;
  }

  function vendas() {
    const a = C.estado.abertura;
    const todas = C.estado.turno.vendas;
    C.dialogo({
      titulo: 'Vendas do caixa',
      subtitulo: 'Consulta do turno atual · ' + a.pdv + ' · de ' + a.abertoEm + ' até agora',
      largo: true,
      montar: (form) => {
        const produto = entrada('text', '', { placeholder: 'Ex.: pão', autocomplete: 'off' });
        const formasUsadas = [...new Set(todas.flatMap((v) => v.formas.map((f) => f[0])))];
        const forma = seletor(formasUsadas, '', 'Todas as formas');
        const sumario = el('div');
        const lista = el('div', 'caixa-vendas');
        const aplicar = () => {
          const termo = U.dobrar(produto.value.trim());
          const achadas = todas.filter((v) => (!termo || v.itens.some((i) => U.dobrar(i[0]).includes(termo))) && (!forma.value || v.formas.some((f) => f[0] === forma.value)));
          const total = achadas.reduce((s, v) => s + v.valor, 0);
          const usadas = [...new Set(achadas.flatMap((v) => v.formas.map((f) => f[0])))];
          sumario.replaceChildren(C.grupo('Resumo', [
            C.linhaLeitura('Vendas encontradas', String(achadas.length)),
            C.linhaLeitura('Total recebido', achadas.length ? moeda(total) : '—'),
            C.linhaLeitura('Formas usadas', usadas.length ? usadas.join(' · ') : '—'),
          ]));
          lista.replaceChildren(...(achadas.length ? achadas.map((v) => {
            const c = cartaoVenda(v);
            c.append(itensDaVenda(v.itens));
            return c;
          }) : [U.vazio('Nenhuma venda aprovada deste caixa corresponde aos filtros.')]));
        };
        produto.oninput = aplicar;
        produto.onkeydown = (ev) => { if (ev.key === 'Enter') ev.preventDefault(); };
        forma.onchange = aplicar;
        const filtros = C.grupo('Filtros', [C.linhaCampo('Produto', produto), C.linhaCampo('Forma de pagamento', forma)]);
        const limpar = botao('Limpar filtros', () => { produto.value = ''; forma.value = ''; aplicar(); }, 'btn secondary');
        const acoes = el('div', 'caixa-acoes caixa-acoes-esq');
        acoes.append(limpar);
        form.append(C.formulario(filtros, acoes, sumario), lista);
        aplicar();
      },
    });
  }

  function canceladas() {
    const lista = C.estado.turno.canceladas;
    C.dialogo({
      titulo: 'Vendas canceladas',
      subtitulo: 'Auditoria: estas vendas não entram nos totais nem no saldo do caixa.',
      largo: true,
      montar: (form) => {
        if (!lista.length) { form.append(U.vazio('Nenhuma venda cancelada foi vinculada a este caixa.')); return; }
        lista.forEach((c) => {
          const d = cartaoVenda(c, c.id);
          d.append(
            el('p', 'caixa-alerta', 'Cancelamento no CREARE'),
            leituras(null, [['Autorizado por', c.autorizadoPor || 'Não informado'], ['Motivo', c.motivo || 'Não informado'], ['Justificativa', c.justificativa || 'Não informada']]),
            el('h4', 'caixa-subtitulo', 'Forma de pagamento'),
            U.situacao(c.forma + ': ' + moeda(c.valor), 'neutro'),
            el('h4', 'caixa-subtitulo', 'Produtos da venda'),
            itensDaVenda(c.itens),
            U.situacao('Cancelado', 'negativo')
          );
          form.append(d);
        });
      },
    });
  }

  window.CicluzCaixaTurnoDialogos = { aoMudar: (f) => { atualizar = f; }, naoRecebi, encerrar, sangrias, novaSangria, vendas, canceladas };
})();
