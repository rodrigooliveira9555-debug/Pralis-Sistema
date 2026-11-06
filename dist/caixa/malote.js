/*
 * Caixa — Malote da Tesouraria (casca). Começo do fluxo: a Tesouraria cria o malote com lacre
 * (Cofre → conta do posto, ex.: Caixa 1M) e o Gerente pode enviar dinheiro SEM lacre no meio do turno.
 * Regras do principal (TransferenciasHost, transferencias.service, Caixa-Brain/02):
 *  - composição obrigatória (dinheiro físico + moedas = valor), lacre de abertura e de fechamento obrigatórios;
 *  - lacres distintos entre si e únicos na empresa ("Lacre já utilizado em outro movimento");
 *  - bolsas de sangria opcionais; o dinheiro "sai" da origem na criação e só entra no caixa quando o operador abre;
 *  - sem lacre: só com caixa aberto na conta de destino (senão o dinheiro vai pelo malote) e quem enviou não confirma.
 * Tudo vai para o estado único (CicluzCaixa.criarMalote / criarSemLacre): a lista e os saldos vêm de lá.
 * Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Malote da Tesouraria';
  let tela = null;
  let corpo = null;
  const form = { destino: 'cx-1m', especie: '', moedas: '', lacre: '', lacreFechamento: '', bolsas: '' };
  const sem = { destino: 'cx-1m', especie: '', moedas: '', obs: '' };
  let erroMalote = '';
  let erroSem = '';

  const opcoesContas = () => C.estado.contas.filter((c) => c.tipo === 'caixa').map((c) => [c.id, c.nome + ' (' + c.pdv + ' · ' + c.turno + ')']);
  const quemCria = () => (C.estado.perfil === 'gerente' ? 'Patrícia Souza (Gerente)' : C.estado.perfil === 'financeiro' ? 'Financeiro' : 'Carla (Tesoureiro)');

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-malote', titulo: 'VND - Malote da Tesouraria', caminho: CAMINHO });
    tela.ativar();
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A Tesouraria cria o malote; o operador abre o caixa com o lacre.', atualizar),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => {
    Object.assign(form, { destino: 'cx-1m', especie: '', moedas: '', lacre: '', lacreFechamento: '', bolsas: '' });
    Object.assign(sem, { destino: 'cx-1m', especie: '', moedas: '', obs: '' });
    erroMalote = erroSem = '';
    if (tela) montar();
  });

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const bolsasDe = () => form.bolsas.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);

  function atualizar() {
    if (!C.pode('criarMalote')) {
      const s = U.secao('Sem permissão');
      s.append(corpoSecao(U.nota('O operador de caixa não cria malote: ele só abre o caixa com o lacre que a Tesouraria entregou. Troque o "Ver como" para Tesoureiro, Gerente ou Financeiro.')));
      return corpo.replaceChildren(s);
    }
    const partes = [blocoNovoMalote()];
    if (C.pode('envioSemLacre')) partes.push(blocoSemLacre());
    partes.push(blocoLista());
    corpo.replaceChildren(...partes);
  }

  /* ---------- Novo malote (com lacre) ---------- */

  function blocoNovoMalote() {
    const s = U.secao('Novo malote com lacre');
    const g = el('div', 'caixa-grade');
    const destino = seletor(opcoesContas(), form.destino);
    destino.onchange = () => { form.destino = destino.value; };
    const total = el('strong', 'caixa-dinheiro', moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0)));
    const dinheiro = (chave, rotulo) => {
      const i = entrada('text', form[chave], { inputMode: 'decimal', placeholder: '0,00' });
      i.oninput = () => { form[chave] = i.value; total.textContent = moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0)); };
      return campo(rotulo, i);
    };
    const lacre = entrada('text', form.lacre, { placeholder: 'Ex.: 002', autocomplete: 'off' });
    lacre.oninput = () => { form.lacre = lacre.value; };
    const lacreF = entrada('text', form.lacreFechamento, { placeholder: 'Ex.: FCH-002', autocomplete: 'off' });
    lacreF.oninput = () => { form.lacreFechamento = lacreF.value; };
    const bolsas = el('textarea');
    bolsas.rows = 2;
    bolsas.placeholder = 'SNG-021, SNG-022';
    bolsas.value = form.bolsas;
    bolsas.oninput = () => { form.bolsas = bolsas.value; };
    g.append(
      campo('Origem', entrada('text', 'Cofre Principal', { readOnly: true }), 'Todo malote sai do Cofre.'),
      campo('Destino (conta do posto)', destino, 'Cada posto (PDV + turno) tem a sua conta: o malote da Tarde não abre o caixa da Manhã.'),
      dinheiro('especie', 'Dinheiro físico (R$)'), dinheiro('moedas', 'Moedas (R$)'),
      campo('Lacre de abertura', lacre, 'Número do selo físico. Único na empresa; o operador digita este número para abrir o caixa.'),
      campo('Lacre de fechamento reservado', lacreF, 'Vai aberto dentro do malote; o operador só poderá fechar o caixa com este lacre.'),
      campo('Bolsas de sangria (opcional)', bolsas, 'Lacres separados por vírgula. O operador escolhe uma bolsa em cada sangria.')
    );
    g.lastChild.classList.add('caixa-largo');
    const linhaTotal = el('p', 'caixa-total');
    linhaTotal.append(document.createTextNode('Valor total do malote: '), total);
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (erroMalote) msg.append(el('b', null, erroMalote));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'O dinheiro sai do Cofre na criação e só entra no caixa quando o operador abre com o lacre.'), botao('Criar malote', confirmarMalote, 'btn'));
    s.append(corpoSecao(g, linhaTotal, msg, acoes));
    return s;
  }

  function validarMalote() {
    const especie = centavos(form.especie), moedas = centavos(form.moedas);
    if (especie === null || moedas === null) return 'Informe o dinheiro físico e as moedas (use 0,00 quando não houver).';
    if (especie + moedas <= 0) return 'O valor do malote precisa ser maior que zero.';
    const lacre = form.lacre.trim(), fech = form.lacreFechamento.trim(), bolsas = bolsasDe();
    if (!lacre) return 'Informe o lacre de abertura.';
    if (!fech) return 'Informe o lacre de fechamento reservado.';
    const todos = [lacre, fech, ...bolsas].map((l) => l.toLowerCase());
    if (new Set(todos).size !== todos.length) return 'Os lacres de abertura, fechamento e das bolsas precisam ser diferentes entre si.';
    if (bolsas.length > 50) return 'No máximo 50 bolsas por malote.';
    const repetido = [lacre, fech, ...bolsas].find((l) => C.lacreExiste(l));
    if (repetido) return 'Lacre já utilizado em outro movimento: ' + repetido + '.';
    if (C.saldoConta('cofre') < especie + moedas) return 'Saldo insuficiente no Cofre Principal para este malote.'; // não existe transferência sem fundo na origem
    return '';
  }

  function confirmarMalote() {
    erroMalote = validarMalote();
    if (erroMalote) return atualizar();
    const especie = centavos(form.especie), moedas = centavos(form.moedas), bolsas = bolsasDe();
    const destinoConta = C.conta(form.destino);
    C.dialogo({
      titulo: 'Confirmar malote',
      subtitulo: 'Revise antes de enviar. O lacre não poderá ser reutilizado.',
      rotuloSalvar: 'Criar malote',
      montar: (f) => {
        const dl = el('dl', 'caixa-declarado');
        [['Origem → destino', 'Cofre Principal → ' + destinoConta.nome], ['Dinheiro físico', moeda(especie)], ['Moedas', moeda(moedas)], ['Valor total', moeda(especie + moedas)],
          ['Lacre de abertura', form.lacre.trim()], ['Lacre de fechamento', form.lacreFechamento.trim()], ['Bolsas de sangria', bolsas.length ? bolsas.join(' · ') : 'Nenhuma']]
          .forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); });
        f.append(dl);
      },
      salvar: () => {
        C.criarMalote({ destino: form.destino, especie, moedas, lacre: form.lacre.trim(), lacreFechamento: form.lacreFechamento.trim(), bolsas, criadoPor: quemCria() });
        Object.assign(form, { especie: '', moedas: '', lacre: '', lacreFechamento: '', bolsas: '' });
        erroMalote = '';
        U.avisar('Malote criado. O operador do ' + destinoConta.nome + ' já pode abrir o caixa com o lacre.');
        atualizar();
      },
    });
  }

  /* ---------- Envio sem lacre (R-231, só Gerente) ---------- */

  function blocoSemLacre() {
    const s = U.secao('Envio sem lacre (meio do turno)');
    const destino = seletor(opcoesContas(), sem.destino);
    destino.onchange = () => { sem.destino = destino.value; };
    const din = (chave, rotulo) => { const i = entrada('text', sem[chave], { inputMode: 'decimal', placeholder: '0,00' }); i.oninput = () => { sem[chave] = i.value; }; return campo(rotulo, i); };
    const obs = el('textarea');
    obs.rows = 2;
    obs.value = sem.obs;
    obs.oninput = () => { sem.obs = obs.value; };
    const g = el('div', 'caixa-grade');
    g.append(campo('Destino (conta do posto)', destino), din('especie', 'Dinheiro físico (R$)'), din('moedas', 'Moedas (R$)'), campo('Observação (opcional)', obs));
    g.lastChild.classList.add('caixa-largo');
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (erroSem) msg.append(el('b', null, erroSem));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Só vale com caixa aberto na conta. Quem enviou não confirma: o operador confirma em "Recebimentos pendentes".'), botao('Enviar sem lacre', enviarSemLacre, 'btn secondary'));
    s.append(corpoSecao(g, msg, acoes));
    return s;
  }

  function enviarSemLacre() {
    const especie = centavos(sem.especie), moedas = centavos(sem.moedas);
    erroSem = '';
    if (especie === null || moedas === null) erroSem = 'Informe o dinheiro físico e as moedas (use 0,00 quando não houver).';
    else if (especie + moedas <= 0) erroSem = 'O valor precisa ser maior que zero.';
    else if (especie + moedas > 100000000) erroSem = 'Valor acima do limite de R$ 1.000.000,00.';
    else if (C.saldoConta('cofre') < especie + moedas) erroSem = 'Saldo insuficiente no Cofre Principal.';
    else erroSem = C.criarSemLacre({ destino: sem.destino, especie, moedas, observacao: sem.obs.trim(), criadoPor: quemCria() }) || '';
    if (erroSem) return atualizar();
    const nome = C.conta(sem.destino).nome;
    Object.assign(sem, { especie: '', moedas: '', obs: '' });
    U.avisar('Enviado sem lacre. O operador do ' + nome + ' precisa confirmar em "Recebimentos pendentes".');
    atualizar();
  }

  /* ---------- Malotes e lacres ---------- */

  function blocoLista() {
    const ms = C.malotes();
    const s = U.secao('Malotes e lacres', ms.length);
    s.append(U.tabela(
      [
        ['Lacre de abertura', (m) => m.lacre],
        ['Destino', (m) => m.destino],
        ['Valor', (m) => moeda(m.valor), 'caixa-num'],
        ['Fechamento reservado', (m) => m.lacreFechamento],
        ['Bolsas', (m) => (m.lacresRetorno.length ? m.lacresRetorno.join(' · ') : '—')],
        ['Situação', (m) => U.situacao(m.situacao === 'disponivel' ? 'Disponível' : 'Usado' + (m.caixa ? ' · ' + m.caixa : ''), m.situacao === 'disponivel' ? 'positivo' : 'neutro')],
      ],
      ms,
      { vazioTexto: 'Nenhum malote criado.' }
    ));
    return s;
  }

  C.registrar('malote', abrir);
})();
