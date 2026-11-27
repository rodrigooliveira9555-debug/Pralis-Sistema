/*
 * Caixa — Tesouraria: nova transferência (casca). Base no principal: OperacaoTransferenciaForm, ConfirmacaoTransferenciaDialog,
 * TransferenciasHost (Caixa-Brain/02). Absorve o antigo card "Malote da Tesouraria": é MALOTE quando a origem é o Cofre e o destino é a
 * conta de um posto (Caixa 1M…4T); qualquer outro par de contas é transferência COMUM.
 * Regras: origem ≠ destino; dinheiro físico + moedas = valor (> 0); não existe transferência sem fundo na origem; malote exige lacre de
 * abertura e lacre de fechamento reservado (distintos entre si e únicos na empresa: "Lacre já utilizado em outro movimento"), bolsas de
 * sangria opcionais (≤ 50). O dinheiro sai da origem na criação e só entra no destino quando é recebido (malote: na abertura do caixa).
 * Passa por um diálogo de confirmação antes de gravar. Dados FICTÍCIOS, em centavos, só em memória.
 * Apresentação em formulário linha por linha (padrão da Nova Transferência): grupos Contas, Valor, Lacres (só malote) e Observação, cada
 * um com título acima e quadro de linhas de 52 px; o valor é composto (dinheiro + moedas), então não há quadro grande, só a linha de total.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda, centavos, formulario, grupo, linhaEscolha, linhaCampo, linhaDinheiro, linhaLeitura } = C;
  const T = (window.CicluzCaixaTesouraria = window.CicluzCaixaTesouraria || {});

  const novo = () => ({ origem: 'cofre', destino: 'cx-1m', especie: '', moedas: '', obs: '', lacre: '', lacreFechamento: '', bolsas: '' });
  const form = novo();
  let erro = '';
  C.aoReiniciar(() => { Object.assign(form, novo()); erro = ''; });

  const bolsasDe = () => form.bolsas.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
  const ehMalote = () => C.conta(form.origem).tipo === 'cofre' && C.conta(form.destino).tipo === 'caixa';
  const soma = () => moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0));

  function bloco(atualizar) {
    if (form.destino === form.origem) form.destino = C.estado.contas.find((c) => c.id !== form.origem).id;
    const contas = C.estado.contas.map((c) => [c.id, c.nome]);
    const origem = linhaEscolha('Origem / Saída', contas, form.origem, (v) => { if (v) form.origem = v; atualizar(); });
    const destino = linhaEscolha('Destino / Entrada', contas.filter(([id]) => id !== form.origem), form.destino, (v) => { if (v) form.destino = v; atualizar(); });
    const malote = ehMalote();
    const gContas = grupo('Contas', [origem.no, destino.no],
      U.nota('Disponível em ' + C.conta(form.origem).nome + ': ' + moeda(C.saldoConta(form.origem)) + '.'),
      U.nota(malote ? 'Cofre → conta de posto é MALOTE: exige lacres. O destino abre o caixa com o lacre de abertura.' : 'Entre contas e locais comuns não há lacre: o destino confirma o recebimento (a Tesouraria também pode).'));

    // O total (dinheiro físico + moedas) é o quadro grande no topo, só de leitura: o que se digita são as duas linhas do grupo.
    const hero = C.quadroTotal('Total da transferência', soma());
    const digitou = (chave) => (v) => { form[chave] = v; hero.definir(soma()); };
    const gValor = grupo('Valor da transferência', [
      linhaDinheiro('Dinheiro físico (R$)', form.especie, digitou('especie'), true).no,
      linhaDinheiro('Moedas (R$)', form.moedas, digitou('moedas'), true).no,
    ], U.nota('Dinheiro físico mais moedas. Use 0,00 quando não houver.'));

    const grupos = [gContas, gValor];
    if (malote) {
      const lacre = entrada('text', form.lacre, { placeholder: 'Ex.: 002', autocomplete: 'off' }); lacre.oninput = () => { form.lacre = lacre.value; };
      const lacreF = entrada('text', form.lacreFechamento, { placeholder: 'Ex.: FCH-002', autocomplete: 'off' }); lacreF.oninput = () => { form.lacreFechamento = lacreF.value; };
      const bolsas = entrada('text', form.bolsas, { placeholder: 'SNG-021, SNG-022', autocomplete: 'off' }); bolsas.oninput = () => { form.bolsas = bolsas.value; };
      grupos.push(grupo('Lacres do malote', [
        linhaCampo('Lacre do malote de abertura', lacre, true),
        linhaCampo('Lacre do malote de fechamento', lacreF, true),
        linhaCampo('Lacres de retorno / sangria (opcional)', bolsas),
      ],
      U.nota('Lacre de abertura: selo físico, único na empresa. O operador digita este número para abrir o caixa.'),
      U.nota('Lacre de fechamento: vai aberto dentro do malote; o operador só fecha o caixa com este lacre.'),
      U.nota('Lacres de retorno: bolsas separadas por vírgula; o operador escolhe uma em cada sangria.')));
    }
    const obs = entrada('text', form.obs, { autocomplete: 'off' }); obs.oninput = () => { form.obs = obs.value; };
    grupos.push(grupo('Observação', [linhaCampo('Observação (opcional)', obs)]));

    const msg = el('div', 'caixa-pendencias'); msg.setAttribute('role', 'alert'); if (erro) msg.append(el('b', null, erro));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Recebimento: aguardando confirmação do destinatário. O dinheiro já sai da origem ao salvar.'), botao('Salvar', () => confirmar(atualizar), 'btn'));
    return formulario(hero.no, ...grupos, msg, acoes);
  }

  function validar() {
    const especie = centavos(form.especie), moedas = centavos(form.moedas);
    if (form.origem === form.destino) return 'Conta de destino deve ser diferente da origem.';
    if (especie === null || moedas === null) return 'Informe dinheiro físico e moedas (use 0,00 quando não houver).';
    if (especie + moedas <= 0) return 'O valor da transferência precisa ser maior que zero.';
    if (!ehMalote()) return C.saldoConta(form.origem) < especie + moedas ? 'Saldo insuficiente em ' + C.conta(form.origem).nome + ': não existe transferência sem fundo na origem.' : '';
    const lacre = form.lacre.trim(), fech = form.lacreFechamento.trim(), bolsas = bolsasDe();
    if (!lacre) return 'Informe o lacre do malote de abertura.';
    if (!fech) return 'Informe o lacre aberto reservado para o fechamento do caixa.';
    const todos = [lacre, fech, ...bolsas].map((l) => l.toLowerCase());
    if (new Set(todos).size !== todos.length) return 'Os lacres de abertura, fechamento e das bolsas precisam ser diferentes entre si.';
    if (bolsas.length > 50) return 'No máximo 50 bolsas por malote.';
    const repetido = [lacre, fech, ...bolsas].find((l) => C.lacreExiste(l));
    if (repetido) return 'O lacre ' + repetido + ' já foi utilizado em outro movimento.';
    if (C.saldoConta(form.origem) < especie + moedas) return 'Saldo insuficiente em ' + C.conta(form.origem).nome + ': não existe transferência sem fundo na origem.';
    return '';
  }

  function confirmar(atualizar) {
    erro = validar();
    if (erro) return atualizar();
    const especie = centavos(form.especie), moedas = centavos(form.moedas), bolsas = bolsasDe(), malote = ehMalote();
    C.dialogo({
      titulo: 'Confirmar transferência',
      subtitulo: 'Confira antes de registrar a saída.',
      rotuloSalvar: 'Confirmar transferência',
      padrao: true,
      montar: (f) => {
        const pares = [['Valor total enviado', moeda(especie + moedas)], ['Origem → destino', C.conta(form.origem).nome + ' · ' + C.conta(form.destino).nome], ['Dinheiro físico', moeda(especie)], ['Moedas', moeda(moedas)]];
        if (malote) pares.push(['Lacre do malote', form.lacre.trim()], ['Lacre reservado para fechamento', form.lacreFechamento.trim()], ['Lacres de retorno / sangria', bolsas.length ? bolsas.length + ' lacre(s): ' + bolsas.join(' · ') : 'Nenhum']);
        else pares.push(['Lacre', 'Sem lacre: quem recebe confirma o recebimento.']);
        f.append(formulario(grupo('Resumo da transferência', pares.map(([t, v]) => linhaLeitura(t, v)))));
      },
      salvar: () => {
        if (malote) C.criarMalote({ destino: form.destino, especie, moedas, lacre: form.lacre.trim(), lacreFechamento: form.lacreFechamento.trim(), bolsas, criadoPor: C.quemOpera() });
        else { const e = C.criarTransferencia({ origem: form.origem, destino: form.destino, especie, moedas, observacao: form.obs.trim() }); if (e) return e; }
        Object.assign(form, { especie: '', moedas: '', obs: '', lacre: '', lacreFechamento: '', bolsas: '' });
        erro = '';
        U.avisar(malote ? 'Malote criado. O operador de ' + C.conta(form.destino).nome + ' já pode abrir o caixa com o lacre.' : 'Transferência registrada: aguardando confirmação do destino.');
        T.irParaLista();
      },
    });
  }

  T.nova = bloco;
})();
