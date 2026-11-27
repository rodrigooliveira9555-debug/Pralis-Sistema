/*
 * Caixa — Abertura (casca), em formulário linha por linha (padrão da Nova Transferência: grupo, quadro, linhas).
 * Refeita em 27/11/2026 (pedido do Washington, com o roteiro da abertura): em vez de um posto fixo, o operador ESCOLHE o grupo de vendas e o
 * subgrupo (1M, 1T, 2M…, de VND - Grupos de Vendas) e o resto vem dos cadastros, só para leitura: estabelecimento, operador (o usuário que entrou),
 * hardware e horário de referência do subgrupo e a data. O horário EFETIVO da abertura é o da confirmação e fica separado do de referência.
 * Os blocos "Responsável pelo caixa", "Supervisor responsável" e "Usuário logado" saíram: quem opera e quem supervisiona virão do nível
 * hierárquico e das permissões (o operador é o usuário que entrou). A maquininha subiu para o grupo de identificação.
 * O valor inicial continua vindo da TRANSFERÊNCIA (o malote do Cofre, conferido pelo lacre); ao confirmar nasce o registro do caixa com o
 * identificador único CX-AAAAMMDD-<subgrupo>-NNN (abertura-regras.js, testado). Dados FICTÍCIOS, em centavos; nada é gravado e tudo some ao recarregar.
 * Na casca só os subgrupos de PDV (nome "1M", "2T"…) têm conta de posto e malote; os outros (NFE › EMPRESAS, DELIVERY › IFOOD) são bloqueados com aviso.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const R = window.CicluzCaixaAberturaRegras;
  const { el, botao, entrada, seletor } = U;

  // Malote que a Tesouraria declarou para o lacre digitado (vem de C.estado.malotes; o 001 já existe de início).
  const MALOTE = { lacre: '', dinheiro: 0, moedas: 0, lacresSangria: [], lacreFechamento: '', rota: 'Malote Cofre → Conta do PDV' };
  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Vendas / Abertura de Caixa';
  const { moeda, centavos, hora } = C;

  // Campos do formulário (só da Abertura). O que vale para as outras telas fica em C.estado.
  const novoEstado = () => ({ grupoId: '', subgrupoId: '', lacre: '', encontrado: false, conferido: null, dinheiro: '', moedas: '', motivo: '', maquininha: '', tentou: false });
  let estado = novoEstado();
  let tela = null;
  let espera = 0;

  /* ---------- O posto escolhido: grupo e subgrupo do cadastro, e a conta de posto que recebe o malote ---------- */
  const grupoAtual = () => C.gruposDeVendas().find((g) => g.id === estado.grupoId) || null;
  const subgrupoAtual = () => { const g = grupoAtual(); return (g && g.subgrupos.find((s) => s.id === estado.subgrupoId)) || null; };
  /** Subgrupo de PDV (1M, 1T…) → { pdv, turno, contaId } da conta de posto; outro subgrupo ou conta que não existe → null. */
  function posto() {
    const s = subgrupoAtual();
    const p = s && R.postoDoSubgrupo(s.nome);
    const conta = p && C.estado.contas.find((c) => c.id === p.contaId && c.tipo === 'caixa');
    return conta ? { pdv: conta.pdv, turno: conta.turno, contaId: conta.id } : null;
  }
  const limparMalote = () => Object.assign(estado, { lacre: '', encontrado: false, conferido: null, dinheiro: '', moedas: '', motivo: '', erroLacre: '' });
  const operador = () => C.usuarioLogado() || 'Usuário não identificado';
  const hoje = () => new Date().toLocaleDateString('pt-BR');

  /** Consulta o lacre como o servidor: inexistente, já rompido ou de outro posto recusam com a mensagem do principal. */
  function consultarLacre(digitado) {
    const p = posto();
    if (!p) return { erro: 'Escolha o subgrupo de vendas antes de informar o lacre.' };
    const m = C.malotePorLacre(digitado);
    if (!m) return { erro: 'Lacre inexistente. Confira o número no malote.' };
    if (m.situacao !== 'disponivel') return { erro: 'Lacre já rompido - não pode ser reutilizado.' };
    if (m.pdv !== p.pdv || m.turno !== p.turno) return { erro: 'A conta deste caixa não é destino desta transferência.' };
    Object.assign(MALOTE, { lacre: m.lacre, dinheiro: m.especie, moedas: m.moedas, lacresSangria: m.lacresRetorno.slice(), lacreFechamento: m.lacreFechamento, rota: 'Malote ' + m.origem + ' → ' + m.destino, id: m.id });
    return { m };
  }

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-abertura', titulo: 'VND - Abertura de Caixa', caminho: CAMINHO, voltar: C.voltarVendas });
    tela.ativar();
    render();
  }

  // Peças do formulário linha por linha (a Nova Transferência é a referência): grupo com título, quadro e linhas.
  const { linha, linhaDe, quadro, secao } = C.pecas();
  const { valorDa, formulario, linhaLeitura } = C;
  /** Linha de escolha obrigatória: o valor vai para estado[chave]; "aoMudar" roda depois (por exemplo, limpar o que depende da escolha). */
  const escolha = (rotulo, opcoes, chave, aoMudar, desligada) => {
    const s = seletor(opcoes, estado[chave], 'Escolha…');
    s.required = true;
    if (desligada) s.disabled = true;
    s.onchange = () => { estado[chave] = s.value; if (aoMudar) aoMudar(); };
    return linhaDe(rotulo + ' *', s);
  };

  function bloqueios() {
    const lista = [];
    if (!estado.grupoId) lista.push('Escolha o grupo de vendas.');
    else if (!estado.subgrupoId) lista.push('Escolha o subgrupo de vendas.');
    else if (!posto()) lista.push('Este subgrupo não é um posto de PDV: a demonstração só abre os postos 1M a 4T.');
    if (posto()) {
      if (!estado.encontrado) lista.push('Informe o lacre do malote de abertura.');
      else if (estado.conferido === null) lista.push('Responda se o malote confere.');
      else if (estado.conferido === false) {
        const d = centavos(estado.dinheiro), m = centavos(estado.moedas);
        if (d === null || m === null) lista.push('Informe o dinheiro e as moedas contados.');
        else if (d + m !== MALOTE.dinheiro + MALOTE.moedas && !estado.motivo.trim()) lista.push('Explique o motivo da divergência.');
      }
    }
    if (!C.maquininhas().length) lista.push('Cadastre uma máquina de cartão em VND - Tipos de Operadoras Cartões.');
    else if (!estado.maquininha) lista.push('Escolha a maquininha de cartão.');
    return lista;
  }

  function render() {
    if (C.estado.status !== 'fechado') return renderAberto();
    const aviso = U.nota('Demonstração: dados fictícios, nada é gravado. Use um lacre criado em "Malote da Tesouraria" (o 001 do Caixa 1M, subgrupo 1M, já existe).');
    aviso.classList.add('caixa-aviso');
    const intro = U.nota('Escolha o grupo e o subgrupo de vendas; o restante vem dos cadastros. A abertura só é confirmada depois da conferência do malote.');

    const g1 = blocoIdentificacao();
    const sub = subgrupoAtual();
    const g1b = sub ? blocoAutomatico(sub) : null;
    const g2 = posto() ? secao('Conferir malote de abertura', ...blocoMalote()) : null;

    const pend = el('div', 'caixa-pendencias');
    pend.setAttribute('role', 'alert');
    const lista = estado.tentou ? bloqueios() : [];
    if (lista.length) {
      pend.append(el('b', null, 'Antes de abrir:'));
      const ul = el('ul');
      lista.forEach((t) => ul.append(el('li', null, t)));
      pend.append(ul);
    }

    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Abra somente quando estiver no PDV.'), botao('Conferir e abrir caixa', tentarAbrir, 'btn'));
    tela.body.replaceChildren(formulario(aviso, intro, g1, ...(g1b ? [g1b] : []), ...(g2 ? [g2, ...blocoComposicao()] : []), pend, acoes));
  }

  /** Identificação da operação: grupo de vendas, subgrupo (do grupo escolhido) e maquininha. */
  function blocoIdentificacao() {
    const grupos = C.gruposDeVendas();
    const g = grupoAtual();
    const maqs = C.maquininhas();
    const trocouGrupo = () => { estado.subgrupoId = ''; limparMalote(); render(); };
    const trocouSubgrupo = () => { limparMalote(); render(); };
    const linhas = [
      escolha('Grupo de vendas', grupos.map((x) => [x.id, x.nome]), 'grupoId', trocouGrupo),
      escolha('Subgrupo de vendas', g ? g.subgrupos.map((x) => [x.id, x.nome]) : [], 'subgrupoId', trocouSubgrupo, !g),
      maqs.length ? escolha('Maquininha de cartão', maqs.map((m) => [m.id, m.rotulo]), 'maquininha') : linha('Maquininha de cartão *', valorDa('Nenhuma cadastrada')),
    ];
    const notas = [];
    if (!grupos.length) notas.push(U.nota('Nenhum grupo de vendas cadastrado. Cadastre em Entradas › Cadastros Geral › VND - Grupos de Vendas.'));
    else if (g && !g.subgrupos.length) notas.push(U.nota('Este grupo não tem subgrupo ativo. Cadastre em VND - Grupos de Vendas.'));
    if (subgrupoAtual() && !posto()) {
      const n = U.nota('Este subgrupo não é um posto de PDV (1M, 1T, 2M…). Na demonstração, só os postos de PDV têm malote e abrem caixa.');
      n.classList.add('caixa-aviso');
      notas.push(n);
    }
    notas.push(U.nota('Quem opera e quem supervisiona virão do nível hierárquico e das permissões. A maquininha é obrigatória para o relatório final deste turno.' + (maqs.length ? '' : ' Cadastre as máquinas em Entradas › Cadastros Geral › VND - Tipos de Operadoras Cartões (etapa Cadastro das máquinas).')));
    return secao('Identificação da operação', quadro(...linhas), ...notas);
  }

  /** O que o sistema recupera sozinho depois do subgrupo (só leitura): estabelecimento, operador, hardware, horário de referência, data e o horário efetivo. */
  function blocoAutomatico(sub) {
    const hardware = C.nomeDoComputador(sub.computerId);
    const referencia = R.horarioDeReferencia(sub.inicio, sub.fim);
    const notas = [U.nota('Vem dos cadastros e da sessão. O horário efetivo de abertura é o da confirmação e fica separado do horário de referência do subgrupo (abrir às 05:55 num caixa de referência 06:00 é normal).')];
    if (!hardware || !referencia) notas.push(U.nota('Falta no cadastro do subgrupo:' + (hardware ? '' : ' o computador') + (!hardware && !referencia ? ' e' : '') + (referencia ? '' : ' o horário inicial e final') + '. Complete em Entradas › Cadastros Geral › VND - Grupos de Vendas › subgrupo.'));
    return secao('Dados da operação (automático)', quadro(
      linhaLeitura('Estabelecimento', C.estabelecimento() || 'Não cadastrado'),
      linhaLeitura('Operador', operador()),
      linhaLeitura('Hardware', hardware || 'Não vinculado ao subgrupo'),
      linhaLeitura('Horário de referência', referencia || 'Não cadastrado'),
      linhaLeitura('Data da operação', hoje()),
      linhaLeitura('Horário efetivo de abertura', 'Registrado ao confirmar')), ...notas);
  }

  /** Grupo do lacre: a linha do lacre, a rota do malote e o resultado da consulta. Devolve os filhos do grupo. */
  function blocoMalote() {
    const lacre = entrada('text', estado.lacre, { placeholder: 'Ex.: 001', autocomplete: 'off', required: true });
    const status = el('small', 'caixa-status');
    status.setAttribute('role', 'status');
    if (estado.lacre && !estado.encontrado) { status.textContent = estado.erroLacre || 'Lacre não encontrado. Confira o número no malote.'; status.classList.add('erro'); }
    lacre.oninput = () => {
      clearTimeout(espera);
      estado.lacre = lacre.value;
      estado.encontrado = false;
      estado.conferido = null;
      status.classList.remove('erro');
      status.textContent = lacre.value.trim() ? 'Consultando a composição declarada do malote…' : '';
      if (!lacre.value.trim()) return;
      // Simula a consulta do lacre na Tesouraria.
      espera = setTimeout(() => {
        const r = consultarLacre(lacre.value);
        estado.encontrado = !r.erro;
        estado.erroLacre = r.erro || '';
        render();
        const novo = tela.body.querySelector('.caixa-malote-lacre input');
        if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
      }, 500);
    };
    const linhaLacre = linhaDe('Lacre do malote de abertura *', lacre);
    linhaLacre.classList.add('caixa-malote-lacre');
    return [quadro(linhaLacre), U.nota(MALOTE.rota + '. Use o lacre do malote recebido da Tesouraria; ele é diferente do lacre de fechamento.'), status];
  }

  /** Grupo da composição declarada e da conferência (só depois de achar o lacre). Devolve uma lista de grupos (vazia sem lacre). */
  function blocoComposicao() {
    if (!estado.encontrado) return [];
    const declarado = secao('Composição declarada do malote', quadro(
      linhaLeitura('Origem do valor inicial', 'Transferência (malote)'),
      linhaLeitura('Malote declarado', moeda(MALOTE.dinheiro + MALOTE.moedas)),
      linhaLeitura('Dinheiro', moeda(MALOTE.dinheiro)),
      linhaLeitura('Moedas', moeda(MALOTE.moedas)),
      linhaLeitura('Lacres para sangria', MALOTE.lacresSangria.join(' · ')),
      linhaLeitura('Lacre para fechar o caixa', MALOTE.lacreFechamento)));
    const opcoes = U.chips([['sim', 'Sim, confere'], ['nao', 'Não confere']], estado.conferido === null ? '' : estado.conferido ? 'sim' : 'nao', (v) => { estado.conferido = v === 'sim'; render(); });
    const linhas = [linha('Confere com o recebido? *', opcoes)];
    if (estado.conferido === false) linhas.push(...contagem());
    return [declarado, secao('Conferência', quadro(...linhas))];
  }

  /** "Não confere": conta dinheiro e moedas; havendo diferença, o motivo é obrigatório. Linhas sempre presentes (sem aparecer e sumir). */
  function contagem() {
    const resumo = el('p', 'caixa-diferenca');
    resumo.setAttribute('role', 'status');
    const linhaResumo = el('div', 'transferencia-linha transferencia-linha-resumo');
    linhaResumo.append(resumo);
    const motivo = entrada('text', estado.motivo, { placeholder: 'Obrigatório se houver diferença', maxLength: 500 });
    motivo.oninput = () => { estado.motivo = motivo.value; };
    const atualizar = () => {
      const d = centavos(estado.dinheiro), m = centavos(estado.moedas);
      if (d === null || m === null) { resumo.className = 'caixa-diferenca'; resumo.textContent = 'Informe o dinheiro e as moedas contados.'; return; }
      const dif = d + m - (MALOTE.dinheiro + MALOTE.moedas);
      resumo.className = 'caixa-diferenca ' + (dif < 0 ? 'falta' : dif > 0 ? 'sobra' : 'bateu');
      resumo.textContent = dif ? (dif < 0 ? '▼ Falta de ' : '▲ Sobra de ') + moeda(Math.abs(dif)) + ' em relação ao declarado.' : '✓ Sem diferença em relação ao declarado.';
    };
    const dinheiro = (rotulo, chave) => {
      const i = entrada('text', estado[chave], { inputMode: 'decimal', placeholder: '0,00', required: true });
      i.oninput = () => { estado[chave] = i.value; atualizar(); };
      return linhaDe(rotulo + ' *', i);
    };
    atualizar();
    return [dinheiro('Dinheiro físico contado (R$)', 'dinheiro'), dinheiro('Moedas contadas (R$)', 'moedas'), linhaResumo, linhaDe('Motivo da divergência', motivo)];
  }

  /** O identificador do caixa que vai nascer: CX-AAAAMMDD-<subgrupo>-NNN, o próximo número do dia para o subgrupo. */
  const codigoNovo = (sub) => R.codigoDoCaixa({ data: new Date(), subgrupo: sub.nome, existentes: C.estado.fechamentos.map((h) => h.codigo) });

  function tentarAbrir() {
    estado.tentou = true;
    if (bloqueios().length) { render(); tela.body.querySelector('.caixa-pendencias').scrollIntoView({ block: 'center' }); return; }
    const maquina = C.maquininhas().find((m) => m.id === estado.maquininha);
    if (!maquina) { estado.maquininha = ''; render(); return U.avisar('Essa máquina de cartão não está mais ativa. Escolha outra.'); }
    const maq = maquina.rotulo;
    const p = posto(); const g = grupoAtual(); const sub = subgrupoAtual();
    const hardware = C.nomeDoComputador(sub.computerId);
    const referencia = R.horarioDeReferencia(sub.inicio, sub.fim);
    const contado = (centavos(estado.dinheiro) || 0) + (centavos(estado.moedas) || 0);
    C.dialogo({
      titulo: 'Confirmar abertura do caixa',
      subtitulo: 'Revise a operação e o malote antes de iniciar as vendas.',
      rotuloSalvar: 'Confirmar e abrir',
      montar: (form) => {
        form.append(el('p', 'caixa-alerta', 'A primeira venda já começa a contar neste turno.'));
        form.append(formulario(secao('Resumo da abertura', quadro(
          ...[['Identificador do caixa', codigoNovo(sub)], ['Grupo de vendas', g.nome], ['Subgrupo de vendas', sub.nome], ['Operador', operador()], ['Hardware', hardware || 'Não vinculado ao subgrupo'],
            ['Horário de referência', referencia || 'Não cadastrado'], ['Data da operação', hoje()], ['Horário efetivo de abertura', 'Ao confirmar'], ['Maquininha', maq],
            ['Lacre do malote', estado.lacre.trim()], ['Origem do valor inicial', 'Transferência (malote)']].map(([t, v]) => linhaLeitura(t, v))))));
        form.append(estado.conferido
          ? el('p', 'caixa-diferenca bateu', '✓ Composição confirmada: dinheiro ' + moeda(MALOTE.dinheiro) + ' · moedas ' + moeda(MALOTE.moedas) + '.')
          : el('p', 'caixa-diferenca falta', 'Contagem informada: ' + moeda(contado) + ' para ' + moeda(MALOTE.dinheiro + MALOTE.moedas) + ' declarado.' + (estado.motivo.trim() ? ' Motivo: ' + estado.motivo.trim() : '')));
      },
      salvar: () => {
        const abertoEm = hora();
        const codigo = codigoNovo(sub);
        // O turno nasce no estado único: o saldo inicial é o declarado (confere) ou o contado (divergência).
        // "responsavel" guarda o operador (o usuário que entrou): é o campo que Turno, Fechamento e dossiê já leem; supervisor não existe mais na abertura.
        C.abrirCaixa({
          codigo, grupoId: g.id, grupoNome: g.nome, subgrupoId: sub.id, subgrupoNome: sub.nome, estabelecimento: C.estabelecimento(), hardware, horarioReferencia: referencia, dataOperacao: hoje(),
          pdv: p.pdv, turno: p.turno, usuario: operador(), abertoEm,
          lacre: estado.lacre.trim(), maquininha: maq, maquininhaId: maquina.id,
          responsavel: operador(), supervisor: '',
          valorInicial: estado.conferido ? MALOTE.dinheiro + MALOTE.moedas : contado,
          divergencia: estado.conferido ? 0 : contado - (MALOTE.dinheiro + MALOTE.moedas),
          motivoDivergencia: estado.conferido ? '' : estado.motivo.trim(),
          lacresSangria: MALOTE.lacresSangria.slice(), lacreFechamento: MALOTE.lacreFechamento,
          contaId: p.contaId, maloteId: MALOTE.id,
        });
        // Abrir é confirmar o recebimento: C.abrirCaixa recebe o malote pelo CONTADO e rompe o lacre.
        estado = novoEstado(); // o formulário não carrega o malote antigo para a próxima abertura
        render();
        U.avisar('Caixa ' + codigo + ' aberto às ' + abertoEm + '.');
      },
    });
  }

  function renderAberto() {
    const e = C.estado;
    const a = e.abertura;
    const fechando = e.status === 'em_fechamento';
    const situacao = el('span', 'transferencia-linha-valor');
    situacao.append(U.situacao(fechando ? 'Aguardando conferência' : 'Aberto às ' + a.abertoEm, fechando ? 'atencao' : 'positivo'));
    const grupo = secao((fechando ? 'Vendas encerradas · ' : 'Caixa aberto · ') + a.pdv + ' · ' + a.turno,
      quadro(linha('Situação', situacao), linhaLeitura('Identificador do caixa', a.codigo), linhaLeitura('Grupo › subgrupo', a.grupoNome + ' › ' + a.subgrupoNome), linhaLeitura('Operador', a.responsavel), linhaLeitura('Lacre do malote', a.lacre)),
      U.nota(fechando ? 'O fechamento será a próxima tela da casca.' : 'Próximo passo: acompanhar o turno (resumo, sangria, PDV e vendas).'));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Recomeçar a demonstração', () => { C.reiniciar(); render(); }, 'btn secondary'));
    if (!fechando) acoes.append(botao('Ir para o turno', () => C.abrir('turno'), 'btn'));
    tela.body.replaceChildren(formulario(grupo, acoes));
  }

  C.aoReiniciar(() => { estado = novoEstado(); });
  C.registrar('abertura', abrir);
})();
