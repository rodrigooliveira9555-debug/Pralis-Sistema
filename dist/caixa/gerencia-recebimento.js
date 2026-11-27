/*
 * Caixa — Gerência: enviar recebimento ao caixa (casca). É a transferência SEM LACRE do principal (R-231, só a Gerência,
 * `transferencias_sem_lacre`): dinheiro mandado no meio do turno, sem malote. Regras (Caixa-Brain/02 e 04):
 *  - só vale com caixa ABERTO na conta de destino; sem caixa aberto o dinheiro vai pelo malote com lacre;
 *  - não existe transferência sem fundo na origem; valor e composição (dinheiro + moedas) > 0, teto R$ 1.000.000,00;
 *  - quem enviou NÃO confirma: a transferência nasce PENDENTE e aparece no Turno do operador ("Confirmar recebimento" /
 *    "Não recebi"); só depois de confirmada entra no saldo do caixa; recusada, volta à origem.
 * Tudo grava no estado único (CicluzCaixa.criarSemLacre). Dados FICTÍCIOS, em centavos, só em memória.
 * Apresentação em formulário linha por linha (padrão da Nova Transferência): grupos Origem e destino, Valor enviado (dinheiro composto:
 * linhas de dinheiro e moedas mais a linha de total, sem quadro grande) e Observação; a tabela dos envios não mudou.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda, centavos, formulario, grupo, linhaEscolha, linhaCampo, linhaDinheiro, valorDa } = C;

  const form = { origem: 'cofre', destino: 'cx-1m', especie: '', moedas: '', obs: '' };
  let erro = '';
  C.aoReiniciar(() => { Object.assign(form, { origem: 'cofre', destino: 'cx-1m', especie: '', moedas: '', obs: '' }); erro = ''; });

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const ROTULO = { pendente: ['Pendente: aguarda o operador', 'atencao'], recebida: ['Confirmado pelo operador', 'positivo'], cancelada: ['Não recebi (voltou à origem)', 'negativo'] };
  const soma = () => moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0));

  function bloco(atualizar) {
    const s = U.secao('Enviar recebimento ao caixa');
    if (!C.pode('envioSemLacre')) { s.append(corpoSecao(U.nota('Só o Gerente envia dinheiro sem lacre para um caixa aberto.'))); return s; }
    const contas = C.estado.contas;
    const origem = linhaEscolha('Origem', contas.filter((c) => c.tipo === 'cofre').map((c) => [c.id, c.nome]), form.origem, (v) => { if (v) form.origem = v; });
    const destino = linhaEscolha('Destino (caixa aberto)', contas.filter((c) => c.tipo === 'caixa').map((c) => [c.id, c.nome + ' (' + c.pdv + ' · ' + c.turno + ')']), form.destino, (v) => { if (v) form.destino = v; });
    const total = valorDa(soma());
    const digitou = (chave) => (v) => { form[chave] = v; total.textContent = soma(); };
    const obs = entrada('text', form.obs, { autocomplete: 'off' });
    obs.oninput = () => { form.obs = obs.value; };
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (erro) msg.append(el('b', null, erro));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Quem enviou não confirma: o operador confirma em "Recebimentos pendentes" no Turno.'), botao('Enviar ao caixa', () => enviar(atualizar), 'btn'));
    s.append(corpoSecao(formulario(
      grupo('Origem e destino', [origem.no, destino.no]),
      grupo('Valor enviado', [
        linhaDinheiro('Dinheiro físico (R$)', form.especie, digitou('especie'), true).no,
        linhaDinheiro('Moedas (R$)', form.moedas, digitou('moedas'), true).no,
        C.pecas().linha('Total enviado', total),
      ], U.nota('Dinheiro físico mais moedas. Use 0,00 quando não houver.')),
      grupo('Observação', [linhaCampo('Observação (opcional)', obs)]),
      msg, acoes)));
    const enviados = C.estado.transferencias.filter((t) => t.tipo === 'sem_lacre');
    if (enviados.length) {
      s.append(U.tabela(
        [
          ['Destino', (t) => C.conta(t.destino).nome], ['Origem', (t) => C.conta(t.origem).nome], ['Valor', (t) => moeda(t.valor), 'caixa-num'],
          ['Enviado por', (t) => t.criadoPor + ' · ' + t.criadoEm], ['Situação', (t) => U.situacao(ROTULO[t.situacao][0], ROTULO[t.situacao][1])],
        ],
        enviados,
        { vazioTexto: 'Nada enviado.' }
      ));
    }
    return s;
  }

  function enviar(atualizar) {
    const especie = centavos(form.especie), moedas = centavos(form.moedas);
    erro = '';
    if (especie === null || moedas === null) erro = 'Informe o dinheiro físico e as moedas (use 0,00 quando não houver).';
    else if (especie + moedas <= 0) erro = 'O valor precisa ser maior que zero.';
    else if (especie + moedas > 100000000) erro = 'Valor acima do limite de R$ 1.000.000,00.';
    else if (C.saldoConta(form.origem) < especie + moedas) erro = 'Saldo insuficiente em ' + C.conta(form.origem).nome + ': não existe transferência sem fundo na origem.';
    else erro = C.criarSemLacre({ origem: form.origem, destino: form.destino, especie, moedas, observacao: form.obs.trim(), criadoPor: 'Patrícia Souza (Gerente)' }) || '';
    if (erro) return atualizar();
    const nome = C.conta(form.destino).nome;
    Object.assign(form, { especie: '', moedas: '', obs: '' });
    U.avisar('Enviado ao ' + nome + '. O operador precisa confirmar em "Recebimentos pendentes".');
    atualizar();
  }

  window.CicluzCaixaGerencia = Object.assign(window.CicluzCaixaGerencia || {}, { recebimento: bloco });
})();
