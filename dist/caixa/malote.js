/*
 * Caixa — Malote da Tesouraria (casca). Começo do fluxo: a Tesouraria cria o malote com lacre
 * (Cofre → conta do PDV) e a Gerência pode enviar dinheiro SEM lacre no meio do turno.
 * Regras do principal (TransferenciasHost, transferencias.service, doc 02 do Caixa-Brain):
 *  - composição obrigatória (dinheiro físico + moedas = valor), lacre de abertura e de fechamento obrigatórios;
 *  - lacres distintos entre si e únicos na empresa ("Lacre ja utilizado em outro movimento");
 *  - bolsas de sangria opcionais; o dinheiro "sai" da origem na criação e só entra no caixa na abertura;
 *  - sem lacre: só com caixa aberto no PDV de destino (senão o dinheiro vai pelo malote) e quem enviou não confirma.
 * Adaptação da casca: no principal isto é a tela Transferências; aqui é um card de Entradas → Caixas.
 * Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Malote da Tesouraria';
  const PDVS = ['PDV 1', 'PDV 2', 'PDV 3', 'PDV 4'];
  let tela = null;
  let corpo = null;
  const form = { pdv: 'PDV 1', especie: '', moedas: '', lacre: '', lacreFechamento: '', bolsas: '' };
  const sem = { pdv: 'PDV 1', especie: '', moedas: '', obs: '' };
  let erroMalote = '';
  let erroSem = '';

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-malote', titulo: 'VND - Malote da Tesouraria', caminho: CAMINHO });
    tela.ativar();
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A Tesouraria cria o malote; o operador abre o caixa com o lacre.', atualizar, ['operador', 'gerencia', 'tesouraria']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => {
    Object.assign(form, { pdv: 'PDV 1', especie: '', moedas: '', lacre: '', lacreFechamento: '', bolsas: '' });
    Object.assign(sem, { pdv: 'PDV 1', especie: '', moedas: '', obs: '' });
    erroMalote = erroSem = '';
    if (tela) montar();
  });

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const bolsasDe = () => form.bolsas.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);

  function atualizar() {
    if (!C.pode('criarMalote')) {
      const s = U.secao('Sem permissão');
      s.append(corpoSecao(U.nota('O operador de caixa não cria malote: ele só abre o caixa com o lacre que a Tesouraria entregou. Troque o "Ver como" para Tesouraria ou Gerência.')));
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
    const destino = seletor(PDVS, form.pdv);
    destino.onchange = () => { form.pdv = destino.value; };
    const dinheiro = (chave, rotulo, dica) => {
      const i = entrada('text', form[chave], { inputMode: 'decimal', placeholder: '0,00' });
      i.oninput = () => { form[chave] = i.value; total.textContent = moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0)); };
      return campo(rotulo, i, dica);
    };
    const total = el('strong', 'caixa-dinheiro', moeda((centavos(form.especie) || 0) + (centavos(form.moedas) || 0)));
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
      campo('Destino (conta do PDV)', destino),
      dinheiro('especie', 'Dinheiro físico (R$)'),
      dinheiro('moedas', 'Moedas (R$)'),
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
    return '';
  }

  function confirmarMalote() {
    erroMalote = validarMalote();
    if (erroMalote) return atualizar();
    const especie = centavos(form.especie), moedas = centavos(form.moedas), bolsas = bolsasDe();
    C.dialogo({
      titulo: 'Confirmar malote',
      subtitulo: 'Revise antes de enviar. O lacre não poderá ser reutilizado.',
      rotuloSalvar: 'Criar malote',
      montar: (f) => {
        const dl = el('dl', 'caixa-declarado');
        [['Origem → destino', 'Cofre Principal → ' + form.pdv], ['Dinheiro físico', moeda(especie)], ['Moedas', moeda(moedas)], ['Valor total', moeda(especie + moedas)],
          ['Lacre de abertura', form.lacre.trim()], ['Lacre de fechamento', form.lacreFechamento.trim()], ['Bolsas de sangria', bolsas.length ? bolsas.join(' · ') : 'Nenhuma']]
          .forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); });
        f.append(dl);
      },
      salvar: () => {
        C.estado.malotes.push({
          id: 'ml-' + (C.estado.malotes.length + 1), lacre: form.lacre.trim(), pdv: form.pdv, origem: 'Cofre Principal', especie, moedas, valor: especie + moedas,
          lacresRetorno: bolsas, lacreFechamento: form.lacreFechamento.trim(), criadoPor: C.estado.perfil === 'gerencia' ? 'Patrícia Souza (Gerência)' : 'Carla (Tesouraria)', criadoEm: C.hora(), situacao: 'disponivel',
        });
        Object.assign(form, { especie: '', moedas: '', lacre: '', lacreFechamento: '', bolsas: '' });
        erroMalote = '';
        U.avisar('Malote criado. O operador do ' + form.pdv + ' já pode abrir o caixa com o lacre.');
        atualizar();
      },
    });
  }

  /* ---------- Envio sem lacre (R-231, só Gerência) ---------- */

  function blocoSemLacre() {
    const s = U.secao('Envio sem lacre (meio do turno)');
    const destino = seletor(PDVS, sem.pdv);
    destino.onchange = () => { sem.pdv = destino.value; };
    const din = (chave, rotulo) => { const i = entrada('text', sem[chave], { inputMode: 'decimal', placeholder: '0,00' }); i.oninput = () => { sem[chave] = i.value; }; return campo(rotulo, i); };
    const obs = el('textarea');
    obs.rows = 2;
    obs.value = sem.obs;
    obs.oninput = () => { sem.obs = obs.value; };
    const g = el('div', 'caixa-grade');
    g.append(campo('Destino (conta do PDV)', destino), din('especie', 'Dinheiro físico (R$)'), din('moedas', 'Moedas (R$)'), campo('Observação (opcional)', obs));
    g.lastChild.classList.add('caixa-largo');
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (erroSem) msg.append(el('b', null, erroSem));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Só vale com caixa aberto no PDV. Quem enviou não confirma: o operador confirma em "Recebimentos pendentes".'), botao('Enviar sem lacre', enviarSemLacre, 'btn secondary'));
    s.append(corpoSecao(g, msg, acoes));
    return s;
  }

  function enviarSemLacre() {
    const especie = centavos(sem.especie), moedas = centavos(sem.moedas);
    erroSem = '';
    if (especie === null || moedas === null) erroSem = 'Informe o dinheiro físico e as moedas (use 0,00 quando não houver).';
    else if (especie + moedas <= 0) erroSem = 'O valor precisa ser maior que zero.';
    else if (especie + moedas > 100000000) erroSem = 'Valor acima do limite de R$ 1.000.000,00.';
    else if (C.estado.status !== 'aberto' || !C.estado.abertura || C.estado.abertura.pdv !== sem.pdv) {
      erroSem = 'O ' + sem.pdv + ' não tem caixa aberto. Sem caixa aberto o dinheiro vai pelo malote com lacre.';
    }
    if (erroSem) return atualizar();
    C.estado.turno.recebimentos.push({
      id: 'rec-' + (C.estado.turno.recebimentos.length + 1), valor: especie + moedas, especie, moedas, origem: 'Cofre Principal',
      enviadoPor: 'Patrícia Souza (Gerência)', hora: C.hora(), observacao: sem.obs.trim(), situacao: 'pendente',
    });
    Object.assign(sem, { especie: '', moedas: '', obs: '' });
    U.avisar('Enviado sem lacre. O operador do ' + sem.pdv + ' precisa confirmar em "Recebimentos pendentes".');
    atualizar();
  }

  /* ---------- Malotes e lacres ---------- */

  function blocoLista() {
    const s = U.secao('Malotes e lacres', C.estado.malotes.length);
    const tabela = U.tabela(
      [
        ['Lacre de abertura', (m) => m.lacre],
        ['Destino', (m) => m.pdv],
        ['Valor', (m) => moeda(m.valor), 'caixa-num'],
        ['Fechamento reservado', (m) => m.lacreFechamento],
        ['Bolsas', (m) => (m.lacresRetorno.length ? m.lacresRetorno.join(' · ') : '—')],
        ['Situação', (m) => U.situacao(m.situacao === 'disponivel' ? 'Disponível' : 'Usado' + (m.caixa ? ' · ' + m.caixa : ''), m.situacao === 'disponivel' ? 'positivo' : 'neutro')],
      ],
      C.estado.malotes,
      { vazioTexto: 'Nenhum malote criado.' }
    );
    s.append(tabela);
    return s;
  }

  C.registrar('malote', abrir);
})();
