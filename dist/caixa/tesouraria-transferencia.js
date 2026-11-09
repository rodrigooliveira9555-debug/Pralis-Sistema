/*
 * Caixa — Tesouraria: nova transferência (casca). Base no principal: OperacaoTransferenciaForm, ConfirmacaoTransferenciaDialog,
 * TransferenciasHost (Caixa-Brain/02). Absorve o antigo card "Malote da Tesouraria": é MALOTE quando a origem é o Cofre e o destino é a
 * conta de um posto (Caixa 1M…4T); qualquer outro par de contas é transferência COMUM.
 * Regras: origem ≠ destino; dinheiro físico + moedas = valor (> 0); não existe transferência sem fundo na origem; malote exige lacre de
 * abertura e lacre de fechamento reservado (distintos entre si e únicos na empresa: "Lacre já utilizado em outro movimento"), bolsas de
 * sangria opcionais (≤ 50). O dinheiro sai da origem na criação e só entra no destino quando é recebido (malote: na abertura do caixa).
 * Passa por um diálogo de confirmação antes de gravar. Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;
  const T = (window.CicluzCaixaTesouraria = window.CicluzCaixaTesouraria || {});

  const novo = () => ({ origem: 'cofre', destino: 'cx-1m', especie: '', moedas: '', obs: '', lacre: '', lacreFechamento: '', bolsas: '' });
  const form = novo();
  let erro = '';
  C.aoReiniciar(() => { Object.assign(form, novo()); erro = ''; });

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const bolsasDe = () => form.bolsas.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
  const ehMalote = () => C.conta(form.origem).tipo === 'cofre' && C.conta(form.destino).tipo === 'caixa';

  function bloco(atualizar) {
    const s = U.secao('Nova transferência');
    if (form.destino === form.origem) form.destino = C.estado.contas.find((c) => c.id !== form.origem).id;
    const contas = C.estado.contas.map((c) => [c.id, c.nome]);
    const origem = seletor(contas, form.origem); origem.onchange = () => { form.origem = origem.value; atualizar(); };
    const destino = seletor(contas.filter(([id]) => id !== form.origem), form.destino); destino.onchange = () => { form.destino = destino.value; atualizar(); };
    const total = el('strong', 'caixa-dinheiro', moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0)));
    const din = (chave, rotulo) => {
      const i = entrada('text', form[chave], { inputMode: 'decimal', placeholder: '0,00' });
      i.oninput = () => { form[chave] = i.value; total.textContent = moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0)); };
      return campo(rotulo, i);
    };
    const obs = el('textarea'); obs.rows = 2; obs.value = form.obs; obs.oninput = () => { form.obs = obs.value; };
    const g = el('div', 'caixa-grade');
    g.append(campo('Origem / Saída', origem, 'Disponível em ' + C.conta(form.origem).nome + ': ' + moeda(C.saldoConta(form.origem))), campo('Destino / Entrada', destino),
      din('especie', 'Dinheiro físico (R$)'), din('moedas', 'Moedas (R$)'));
    const itens = [g];
    if (ehMalote()) {
      const lacre = entrada('text', form.lacre, { placeholder: 'Ex.: 002', autocomplete: 'off' }); lacre.oninput = () => { form.lacre = lacre.value; };
      const lacreF = entrada('text', form.lacreFechamento, { placeholder: 'Ex.: FCH-002', autocomplete: 'off' }); lacreF.oninput = () => { form.lacreFechamento = lacreF.value; };
      const bolsas = el('textarea'); bolsas.rows = 2; bolsas.placeholder = 'SNG-021, SNG-022'; bolsas.value = form.bolsas; bolsas.oninput = () => { form.bolsas = bolsas.value; };
      const g2 = el('div', 'caixa-grade');
      g2.append(campo('Lacre do malote de abertura', lacre, 'Selo físico; único na empresa. O operador digita este número para abrir o caixa.'),
        campo('Lacre do malote de fechamento', lacreF, 'Vai aberto dentro do malote: o operador só fecha o caixa com este lacre.'));
      const cb = campo('Lacres de retorno / sangria (opcional)', bolsas, 'Bolsas separadas por vírgula; o operador escolhe uma em cada sangria.');
      cb.classList.add('caixa-largo'); g2.append(cb);
      itens.push(U.nota('Cofre → conta de posto é MALOTE: exige lacres. O destino abre o caixa com o lacre de abertura.'), g2);
    } else itens.push(U.nota('Entre contas e locais comuns não há lacre: o destino confirma o recebimento (a Tesouraria também pode).'));
    const ob = campo('Observação (opcional)', obs); ob.classList.add('caixa-largo'); const g3 = el('div', 'caixa-grade'); g3.append(ob); itens.push(g3);
    const linha = el('p', 'caixa-total'); linha.append(document.createTextNode('Total da transferência: '), total);
    const msg = el('div', 'caixa-pendencias'); msg.setAttribute('role', 'alert'); if (erro) msg.append(el('b', null, erro));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Recebimento: aguardando confirmação do destinatário. O dinheiro já sai da origem ao salvar.'), botao('Salvar', () => confirmar(atualizar), 'btn'));
    s.append(corpoSecao(...itens, linha, msg, acoes));
    return s;
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
      montar: (f) => {
        const pares = [['Valor total enviado', moeda(especie + moedas)], ['Origem → destino', C.conta(form.origem).nome + ' · ' + C.conta(form.destino).nome], ['Dinheiro físico', moeda(especie)], ['Moedas', moeda(moedas)]];
        if (malote) pares.push(['Lacre do malote', form.lacre.trim()], ['Lacre reservado para fechamento', form.lacreFechamento.trim()], ['Lacres de retorno / sangria', bolsas.length ? bolsas.length + ' lacre(s): ' + bolsas.join(' · ') : 'Nenhum']);
        else pares.push(['Lacre', 'Sem lacre: quem recebe confirma o recebimento.']);
        const dl = el('dl', 'caixa-declarado');
        pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); });
        f.append(dl);
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
