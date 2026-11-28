/*
 * Caixa — Tesouraria: contas e saldos (casca). Base no principal: ContasPage e o doc 72 (ajuste de saldo das contas).
 * Colunas: Nome · Tipo · Fundo · Saldo atual. O saldo é DERIVADO (nunca gravado): fundo + transferências recebidas − transferências
 * pendentes/recebidas/divergentes que saem + lançamentos (vendas em dinheiro, quebra/sobra e ajustes). O "Fundo" é só o ponto de partida.
 * "Ajustar saldo" (só Tesoureiro, doc 72): saldo atual desejado + justificativa de no mínimo 5 letras; o ajuste é IMUTÁVEL (guarda saldo
 * anterior, desejado, diferença, motivo e autor) e nunca se edita nem se apaga: corrigir é fazer outro ajuste.
 * Adaptação da casca: sem "Zerar saldos" e sem tela de histórico dos ajustes (o principal também não tem). Dados FICTÍCIOS, em centavos.
 * A janela de ajuste é um formulário linha por linha (padrão da Nova Transferência): o "Saldo atual desejado" é o quadro grande no topo.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda, centavos, formulario, grupo, linhaCampo, linhaLeitura, quadroValor } = C;
  const T = (window.CicluzCaixaTesouraria = window.CicluzCaixaTesouraria || {});

  const TIPO = { cofre: 'Cofre', caixa: 'Caixa (posto)', banco: 'Banco' };
  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  function bloco(atualizar) {
    const contas = C.estado.contas;
    const s = U.secao('Contas e saldos', contas.length);
    const pode = C.pode('ajustarSaldo');
    s.append(corpoSecao(U.nota(pode
      ? 'Ajuste de saldo auditado: os ajustes preservam os movimentos anteriores; entradas e saídas seguem abatendo normalmente.'
      : 'Só o Tesoureiro ajusta o saldo de uma conta (doc 72). Você pode consultar os saldos.')));
    s.append(U.tabela(
      [
        ['Nome', (c) => c.nome], ['Tipo', (c) => TIPO[c.tipo]], ['Fundo', (c) => moeda(c.inicial), 'caixa-num'],
        ['Saldo atual', (c) => { const v = C.saldoConta(c.id); return el('span', 'caixa-dinheiro', moeda(v)); }, 'caixa-num'],
        ['Ações', (c) => (pode ? botao('Ajustar saldo', () => ajustar(c, atualizar), 'btn secondary') : el('small', null, '—'))],
      ],
      contas,
      { vazioTexto: 'Nenhuma conta cadastrada.' }
    ));
    const ajustes = C.estado.lancamentos.filter((l) => l.tipo === 'ajuste');
    if (ajustes.length) {
      s.append(el('h4', 'caixa-subtitulo', 'Ajustes registrados (imutáveis)'));
      s.append(U.tabela(
        [
          ['Conta', (l) => C.conta(l.contaId).nome], ['Saldo anterior', (l) => moeda(l.saldoAnterior), 'caixa-num'], ['Saldo ajustado', (l) => moeda(l.saldoPosterior), 'caixa-num'],
          ['Diferença', (l) => el('span', 'caixa-diferenca-linha ' + (l.valor < 0 ? 'falta' : 'sobra'), (l.valor < 0 ? '▼ ' : '▲ ') + moeda(Math.abs(l.valor)))], ['Motivo', (l) => l.motivo], ['Autor', (l) => l.por + ' · ' + l.em],
        ],
        ajustes.slice().reverse()
      ));
    }
    return s;
  }

  function ajustar(c, atualizar) {
    C.dialogo({
      titulo: 'Ajustar saldo atual',
      rotuloSalvar: 'Registrar ajuste',
      padrao: true,
      montar: (form, dlg) => {
        // O quadro do valor é o primeiro item: a linha repetida do caminho sai (a conta e o saldo atual aparecem no grupo Conta).
        const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove();
        const atual = C.saldoConta(c.id);
        const desejado = entrada('text', '', { inputMode: 'decimal', autocomplete: 'off' });
        const motivo = entrada('text', '', { maxLength: 500, autocomplete: 'off' });
        const valor = quadroValor('Saldo atual desejado (R$)', desejado, () => pintar());
        // O resumo diz sempre com sinal e palavra (nunca só cor) quanto o saldo muda.
        const pintar = () => {
          const alvo = desejado.value.trim() === '' ? null : centavos(desejado.value);
          if (alvo === null) { valor.resumo.textContent = 'Saldo atual: ' + moeda(atual); return; }
          const dif = alvo - atual;
          valor.resumo.textContent = dif === 0 ? '✓ Sem diferença em relação ao saldo atual de ' + moeda(atual) + '.' : (dif > 0 ? '▲ Aumenta ' : '▼ Reduz ') + moeda(Math.abs(dif)) + ' em relação ao saldo atual de ' + moeda(atual) + '.';
        };
        pintar();
        form.append(formulario(
          valor.no,
          grupo('Conta', [linhaLeitura('Conta', c.nome), linhaLeitura('Saldo atual', moeda(atual))]),
          grupo('Justificativa', [linhaCampo('Justificativa', motivo, true)], U.nota('Mínimo 5 letras. Fica registrada com autor e horário e não pode ser editada.'))));
        return { desejado, motivo };
      },
      salvar: (ctx) => {
        const alvo = ctx.desejado.value.trim() === '' ? null : centavos(ctx.desejado.value);
        const erro = C.ajustarSaldo(c.id, alvo, ctx.motivo.value);
        if (erro) return erro;
        U.avisar('Saldo atual ajustado e registrado no histórico.');
        atualizar();
      },
    });
  }

  T.contas = bloco;
})();
