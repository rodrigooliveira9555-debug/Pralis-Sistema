/*
 * Caixa — entrada do módulo no menu do S2 (casca: só tela, dados fictícios, nada gravado).
 * Entradas · Vendas / Faturamento → Lançamentos traz os cartões abaixo. Fluxo e regras vêm do Caixa do
 * sistema principal (web-vue/components/caixa); o visual é o das telas internas do S2.
 * Cada tela se registra com CicluzCaixa.registrar(nome, abrir).
 *
 * ESTADO ÚNICO da casca (CicluzCaixa.estado): tudo em memória e em centavos; recarregar zera. As telas leem e
 * gravam SÓ aqui (nenhuma guarda estado próprio), por isso uma ação numa tela aparece nas outras:
 *   contas ← transferencias (pendente/recebida) + lancamentos → saldo de cada conta/local
 *   lacres (abertura · fechamento · bolsa de sangria) ligados à transferência que os trouxe
 *   caixa vivo (abertura, turno, status, fechamento) · fechamentos (caixas já fechados) · mensagens · notificacoes
 * As sementes fictícias ficam em dados.js; os valores derivados (saldo, resumo) nunca são gravados.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzCaixaDados;
  const COR = '#eab308';
  const COR_TEXTO = '#785600';
  const ICONE = '<path d="' + telaIcone.computador + '"/>';
  const reinicios = [];

  // Adaptação da casca: no principal a criação do malote fica em Transferências e a Conferência/Histórico
  // em telas próprias; aqui o Caixa mora em Entradas → Lançamentos e a Tesouraria em Transferências → Lançamentos.
  // [grupo, id, título, subtítulo]. Grupo "caixa" = Entradas → Lançamentos; "relatorios" = Entradas → Relatórios;
  // "tesouraria" = Transferências → Lançamentos.
  const CARDS = [
    ['caixa', 'abertura', 'VND - Abertura de Caixa', 'Conferir o malote e abrir o turno'],
    ['caixa', 'turno', 'VND - Turno do Caixa', 'Resumo, sangria, PDV e vendas'],
    ['caixa', 'fechamento', 'VND - Fechamento de Caixa', 'Contagem, folha, maquininha e lacre'],
    ['caixa', 'gerencia', 'VND - Gerência de Caixas', 'Monitor, recebimento e mensagens'],
    ['relatorios', 'fechamentos', 'VND - Fechamentos de Caixa', 'Fila, histórico, dossiê e conferência'],
    ['tesouraria', 'tesouraria', 'CNT - Tesouraria', 'Transferências, lacres, conferência e saldo das contas'],
  ];
  const voltar = () => menuBack(0, 'Lançamentos')();

  /* ---------- Formatação (dinheiro sempre em centavos) ---------- */

  const moeda = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  /** "1.234,56" → 123456; vazio ou inválido → null. */
  function centavos(texto) {
    const limpo = String(texto || '').replace(/[R$\s.]/g, '').replace(',', '.');
    if (!limpo || !/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
    return Math.round(Number(limpo) * 100);
  }
  const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  function somarMin(hhmm, minutos) { // as vendas fictícias do turno ficam depois da abertura
    const [h, m] = hhmm.split(':').map(Number);
    const t = (((h * 60 + m + minutos) % 1440) + 1440) % 1440; // minutos negativos: vendas antes da abertura
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  const totalItens = (itens) => itens.reduce((s, [, q, u]) => s + q * u, 0);

  /* ---------- Perfis ("Ver como") e permissões ---------- */

  const PERFIS = [['operador', 'Operador'], ['gerente', 'Gerente'], ['tesoureiro', 'Tesoureiro'], ['financeiro', 'Financeiro']];
  // Padrão de referência do principal (Caixa-Brain/07). Quem confere o fechamento (tesoureiro × financeiro) é pergunta em aberto.
  const PODE = {
    operar: ['operador', 'gerente'], verSaldo: ['gerente'], historico: ['gerente'], conferir: ['tesoureiro'], fechamentos: ['tesoureiro', 'financeiro', 'gerente'], // ver a tela; só a Tesouraria decide
    tesouraria: ['tesoureiro', 'financeiro', 'gerente'], // ver e criar transferências, conferir recebimentos (transferencias_conferir)
    ajustarSaldo: ['tesoureiro'], // doc 72: só Tesouraria (e administrador)
    envioSemLacre: ['gerente'], mensagens: ['gerente'],
  };
  const pode = (acao) => PODE[acao].includes(estado.perfil);

  /* ---------- Estado único ---------- */

  const base = () => ({
    perfil: 'operador', status: 'fechado', abertura: null, turno: null, fechamento: null,
    contas: D.contas(), transferencias: D.transferencias(), lacres: D.lacres(), lancamentos: D.lancamentos(),
    fechamentos: D.fechamentos(), caixasFicticios: D.caixasFicticios(), mensagens: [], notificacoes: [], quebras: [],
  });
  const estado = base();

  const conta = (id) => estado.contas.find((c) => c.id === id);
  const transferencia = (id) => estado.transferencias.find((t) => t.id === id) || null;
  const contaDoPosto = (pdv, turno) => estado.contas.find((c) => c.tipo === 'caixa' && c.pdv === pdv && c.turno === turno);
  const vivo = () => estado.status === 'aberto' || estado.status === 'em_fechamento';
  const proximoId = (prefixo, lista) => prefixo + '-' + String(lista.length + 1).padStart(3, '0');

  /** Vendas em dinheiro do caixa vivo: entram no saldo da conta do posto enquanto o caixa está aberto. */
  const vendasDinheiro = () => (!estado.turno ? 0 : estado.turno.vendas.reduce((s, v) => s + v.formas.filter((f) => f[0] === 'Dinheiro').reduce((x, f) => x + f[1], 0), 0));

  /** Saldo da conta/local = inicial + entradas recebidas − saídas (pendente, recebida, divergente) + lançamentos. Nunca é gravado. */
  function saldoConta(id) {
    let s = conta(id).inicial;
    estado.transferencias.forEach((t) => {
      if (t.destino === id && (t.situacao === 'recebida' || t.situacao === 'divergente')) s += t.valorRecebido == null ? t.valor : t.valorRecebido;
      if (t.origem === id && ['pendente', 'recebida', 'divergente'].includes(t.situacao)) s -= t.valor;
    });
    estado.lancamentos.forEach((l) => { if (l.contaId === id) s += l.valor; });
    if (vivo() && estado.abertura && estado.abertura.contaId === id) s += vendasDinheiro();
    return s;
  }

  /** Malotes como a Tesouraria e a Abertura os veem (derivado das transferências do tipo malote). */
  function malotes() {
    return estado.transferencias.filter((t) => t.tipo === 'malote').map((t) => {
      const c = conta(t.destino);
      return { id: t.id, lacre: t.lacre, pdv: c.pdv, turno: c.turno, destino: c.nome, origem: conta(t.origem).nome, especie: t.especie, moedas: t.moedas, valor: t.valor,
        lacresRetorno: t.bolsas.slice(), lacreFechamento: t.lacreFechamento, criadoPor: t.criadoPor, criadoEm: t.criadoEm,
        situacao: t.situacao === 'pendente' ? 'disponivel' : t.situacao === 'recebida' ? 'usado' : 'cancelado', caixa: t.caixaRotulo || '' };
    });
  }
  const malotePorLacre = (n) => malotes().find((m) => m.lacre.toLowerCase() === String(n).trim().toLowerCase()) || null;
  const lacreExiste = (n) => estado.lacres.some((l) => l.numero.toLowerCase() === String(n).trim().toLowerCase());
  const lacre = (n) => estado.lacres.find((l) => l.numero === n) || null;

  /* ---------- Tesouraria: malote com lacre e envio sem lacre ---------- */

  function criarMalote({ destino, especie, moedas, lacre: abertura, lacreFechamento, bolsas, criadoPor }) {
    const id = proximoId('tr', estado.transferencias);
    estado.transferencias.push({ id, tipo: 'malote', origem: 'cofre', destino, valor: especie + moedas, especie, moedas, valorRecebido: null, lacre: abertura, lacreFechamento, bolsas: bolsas.slice(),
      situacao: 'pendente', caixaId: null, criadoPor, criadoEm: hora(), observacao: '' });
    estado.lacres.push({ numero: abertura, tipo: 'abertura', transferenciaId: id, situacao: 'disponivel' }, { numero: lacreFechamento, tipo: 'fechamento', transferenciaId: id, situacao: 'reservado' },
      ...bolsas.map((b) => ({ numero: b, tipo: 'sangria', transferenciaId: id, situacao: 'disponivel' })));
    return id;
  }
  /** Envio sem lacre (R-231): só com caixa aberto naquela conta; o operador confirma. Devolve erro (string) ou null. */
  function criarSemLacre({ origem = 'cofre', destino, especie, moedas, observacao, criadoPor }) {
    if (estado.status !== 'aberto' || !estado.abertura || estado.abertura.contaId !== destino) return 'O ' + conta(destino).nome + ' não tem caixa aberto. Sem caixa aberto o dinheiro vai pelo malote com lacre.';
    estado.transferencias.push({ id: proximoId('tr', estado.transferencias), tipo: 'sem_lacre', origem, destino, valor: especie + moedas, especie, moedas, valorRecebido: null, lacre: '',
      situacao: 'pendente', caixaId: estado.abertura.caixaId, criadoPor, criadoEm: hora(), observacao: observacao || '' });
    return null;
  }

  /* ---------- Caixa vivo: abertura, sangria, recebimentos, fechamento ---------- */

  const pendentesSemLacre = () => (!vivo() || !estado.abertura ? [] : estado.transferencias.filter((t) => t.tipo === 'sem_lacre' && t.situacao === 'pendente' && t.destino === estado.abertura.contaId));
  const sangriasDoCaixa = () => (!estado.abertura ? [] : estado.transferencias.filter((t) => t.tipo === 'sangria' && t.caixaId === estado.abertura.caixaId && t.situacao !== 'cancelada'));
  /** Bolsas de sangria ainda livres do malote com que este caixa abriu. */
  const bolsasLivres = () => (!estado.abertura ? [] : estado.lacres.filter((l) => l.tipo === 'sangria' && l.transferenciaId === estado.abertura.maloteId && l.situacao === 'disponivel').map((l) => l.numero));

  const novaVenda = (id, hora, forma, itens) => {
    const valor = totalItens(itens);
    return { id, hora, valor, itens, formas: Array.isArray(forma) ? forma : [[forma, valor]], descricao: itens.map(([p, q]) => q + '× ' + p).join(', ') };
  };
  const novoTurno = (abertura) => ({
    pdvLigado: true, parada: null, paradas: [],
    vendas: D.vendas.map(([min, forma, itens], i) => novaVenda('V-' + (101 + i), somarMin(abertura.abertoEm, min), forma, itens)),
    // vendas do PDV antes da abertura no sistema: sem caixa até o ajuste do início das vendas (inicio-vendas.js, R-224)
    semCaixa: D.vendasSemCaixa.map(([min, forma, itens], i) => novaVenda('P-' + (901 + i), somarMin(abertura.abertoEm, min), forma, itens)),
    canceladas: D.canceladas.map((c) => ({ ...c, hora: somarMin(abertura.abertoEm, c.min), valor: totalItens(c.itens), descricao: c.itens.map(([p, q]) => q + '× ' + p).join(', ') })),
  });

  /** A Abertura confirma: o malote vira "recebida" (pelo CONTADO), o lacre é rompido e o turno nasce. */
  function abrirCaixa(abertura) {
    const m = transferencia(abertura.maloteId);
    const caixaId = proximoId('cx', estado.fechamentos) + '-v';
    estado.abertura = { ...abertura, caixaId, inicioVendas: abertura.abertoEm, edicoes: [] }; // início das vendas = abertura até o ajuste (R-224)
    m.situacao = 'recebida'; m.valorRecebido = abertura.valorInicial; m.caixaId = caixaId; m.caixaRotulo = abertura.pdv + ' · ' + abertura.turno;
    lacre(m.lacre).situacao = 'usado';
    if (abertura.divergencia) estado.notificacoes.push({ tipo: 'quebra_caixa', titulo: 'Divergência na abertura do caixa - ' + abertura.responsavel, valor: abertura.divergencia, para: 'Tesouraria' });
    estado.turno = novoTurno(abertura);
    estado.status = 'aberto';
    // A Gerência já mandou um reforço sem lacre: chega ao Turno para o operador confirmar ou recusar.
    estado.transferencias.push({ id: proximoId('tr', estado.transferencias), tipo: 'sem_lacre', origem: 'cofre', destino: abertura.contaId, valor: 15000, especie: 10000, moedas: 5000, valorRecebido: null, lacre: '',
      situacao: 'pendente', caixaId, criadoPor: 'Patrícia Souza (Gerente)', criadoEm: abertura.abertoEm, observacao: 'Reforço de troco para o movimento.' });
    // Mensagens vigentes da Gerência para a empresa ou para este PDV chegam a quem abre (nunca bloqueiam a abertura).
    estado.mensagens.forEach((m2) => {
      const vigente = !m2.encerrada && (!m2.validade || new Date(m2.validade).getTime() > Date.now());
      const alcanca = m2.alvoTipo === 'empresa' || (m2.alvoTipo === 'pdvs' && m2.pdvs.includes(abertura.pdv));
      if (vigente && alcanca && !m2.entregas.some((x) => x.pdv === abertura.pdv)) m2.entregas.push({ operador: abertura.responsavel, pdv: abertura.pdv, situacao: 'entregue' });
    });
  }

  /** Sangria = transferência do caixa ao Cofre: sai do caixa na hora, entra no Cofre quando a Tesouraria confirmar. */
  function registrarSangria({ valor, especie, moedas, lacre: bolsa, obs, responsavel }) {
    const a = estado.abertura;
    estado.transferencias.push({ id: proximoId('tr', estado.transferencias), tipo: 'sangria', origem: a.contaId, destino: 'cofre', valor, especie, moedas, valorRecebido: null, lacre: bolsa,
      situacao: 'pendente', caixaId: a.caixaId, criadoPor: responsavel, criadoEm: hora(), observacao: obs || '' });
    lacre(bolsa).situacao = 'usada_aguardando_conferencia';
  }
  /** Recebimento sem lacre: o operador confirma (entra no saldo) ou diz "Não recebi" (cancela; o dinheiro volta à origem). */
  function resolverRecebimento(id, recebi) {
    const t = transferencia(id);
    t.situacao = recebi ? 'recebida' : 'cancelada';
    if (recebi) t.valorRecebido = t.valor;
  }
  /** Tesouraria confere uma transferência pendente: entra no destino e o lacre dela é dado como conferido/usado. */
  function confirmarTransferencia(id) {
    const t = transferencia(id);
    t.situacao = 'recebida'; t.valorRecebido = t.valor;
    const l = t.lacre && lacre(t.lacre);
    if (l) l.situacao = t.tipo === 'sangria' ? 'conferida' : 'usado';
  }
  const quemOpera = () => ({ tesoureiro: 'Carla (Tesoureiro)', financeiro: 'Financeiro', gerente: 'Patrícia Souza (Gerente)' }[estado.perfil] || 'Usuário');

  /** Transferência comum entre contas/locais (não é malote nem do caixa). Nasce pendente; o dinheiro já sai da origem. Devolve erro ou null. */
  function criarTransferencia({ origem, destino, especie, moedas, observacao }) {
    if (origem === destino) return 'Conta de destino deve ser diferente da origem.';
    if (especie + moedas <= 0) return 'Informe o dinheiro físico ou as moedas.';
    if (saldoConta(origem) < especie + moedas) return 'Saldo insuficiente em ' + conta(origem).nome + ': não existe transferência sem fundo na origem.';
    estado.transferencias.push({ id: proximoId('tr', estado.transferencias), tipo: 'comum', origem, destino, valor: especie + moedas, especie, moedas, valorRecebido: null, lacre: '',
      situacao: 'pendente', caixaId: null, criadoPor: quemOpera(), criadoEm: hora(), observacao: observacao || '', recusas: [] });
    return null;
  }

  /**
   * Conferência ESTRITA do retorno do caixa (sangria e retorno final), como o /confirmar do principal: valor, dinheiro, moedas e lacre
   * precisam bater com o declarado. Qualquer diferença NÃO confirma: devolve { divergente } e o caminho é recusarConferencia.
   */
  function conferirTransferencia(id, { especie, moedas, lacre: informado }) {
    const t = transferencia(id);
    if (!t || t.situacao !== 'pendente') return { erro: 'Transferência não está pendente de confirmação.' };
    if (t.tipo === 'sem_lacre') return { erro: 'Dinheiro sem lacre é confirmado pelo operador, em Recebimentos pendentes na tela do Caixa.' };
    if (t.tipo === 'malote') return { erro: 'O malote para o PDV só é recebido pela abertura do caixa, usando o lacre do malote.' };
    if (t.tipo === 'comum') { confirmarTransferencia(id); return {}; } // a Tesouraria é exceção à segregação criador/confirmador (R-189)
    if (especie + moedas !== t.valor || especie !== t.especie || moedas !== t.moedas || String(informado || '').trim() !== t.lacre) {
      return { divergente: true, erro: 'Conferência divergente: registre a recusa com o motivo.' };
    }
    confirmarTransferencia(id);
    return {};
  }
  /**
   * Recusa da conferência. Sem "encerrar" a transferência continua pendente e a tentativa fica registrada; com "encerrar" ela vira
   * divergente (estado final): o CONTADO entra no destino e a falta vira quebra (R-183). Contado acima do declarado exige confirmar a sobra.
   */
  function recusarConferencia(id, { motivo, especie, moedas, lacre: informado, encerrar, sobraConfirmada }) {
    const t = transferencia(id);
    if (!t || t.situacao !== 'pendente' || !['sangria', 'retorno_final'].includes(t.tipo)) return { erro: 'Registro não encontrado.' };
    if (!String(motivo || '').trim()) return { erro: 'Informe o motivo da recusa.' };
    const contado = especie + moedas;
    if (encerrar && contado > t.valor && !sobraConfirmada) return { erro: 'Contagem acima do declarado: confirme a sobra para encerrar a divergência.' };
    t.recusas = t.recusas || [];
    t.recusas.push({ motivo: motivo.trim(), contado, especie, moedas, lacre: String(informado || '').trim(), por: quemOpera(), em: hora(), encerrou: Boolean(encerrar) });
    estado.notificacoes.push({ tipo: 'transferencia_divergencia', titulo: 'Conferência recusada - ' + (t.tipo === 'sangria' ? 'sangria ' : 'retorno final ') + t.lacre, valor: contado - t.valor, para: 'Tesouraria' });
    if (!encerrar) return {};
    t.situacao = 'divergente'; t.valorRecebido = contado;
    const l = lacre(t.lacre);
    if (l) l.situacao = t.tipo === 'sangria' ? 'conferida' : 'usado';
    if (contado < t.valor) {
      estado.quebras.push({ transferenciaId: t.id, valor: contado - t.valor, motivo: motivo.trim(), por: quemOpera(), em: hora() });
      estado.notificacoes.push({ tipo: 'quebra_caixa', titulo: 'Quebra na conferência - ' + t.lacre, valor: contado - t.valor, para: 'Tesouraria' });
    }
    return {};
  }
  /** Ajuste de saldo da conta (doc 72): imutável (saldo anterior, desejado, diferença, motivo, autor). Devolve erro ou null. */
  function ajustarSaldo(contaId, desejado, motivo) {
    if (!pode('ajustarSaldo')) return 'Somente o Tesoureiro (ou o administrador) pode ajustar saldo de conta.';
    if (desejado === null) return 'Informe o saldo desejado.';
    if (String(motivo || '').trim().length < 5) return 'Informe uma justificativa com pelo menos 5 caracteres.';
    const atual = saldoConta(contaId);
    if (desejado === atual) return 'A conta já está com o saldo informado.';
    estado.lancamentos.push({ contaId, tipo: 'ajuste', valor: desejado - atual, ref: 'ajuste-' + (estado.lancamentos.length + 1), motivo: motivo.trim(), por: quemOpera(), em: hora(), saldoAnterior: atual, saldoPosterior: desejado });
    return null;
  }

  /** Valores derivados do caixa vivo (a casca calcula aqui; no servidor virá pronto). */
  function resumo() {
    const t = estado.turno;
    const a = estado.abertura;
    if (!t || !a) return null;
    const porForma = new Map();
    let entradas = 0;
    t.vendas.forEach((v) => {
      entradas += v.valor;
      v.formas.forEach(([forma, valor]) => { const x = porForma.get(forma) || { valor: 0, qtd: 0 }; x.valor += valor; x.qtd += 1; porForma.set(forma, x); });
    });
    const recebido = estado.transferencias.filter((x) => x.tipo === 'sem_lacre' && x.situacao === 'recebida' && x.destino === a.contaId && x.caixaId === a.caixaId).reduce((s, x) => s + x.valor, 0);
    const sangrias = sangriasDoCaixa().reduce((s, x) => s + x.valor, 0);
    const saldo = saldoConta(a.contaId);
    return { entradas, porForma: [...porForma].map(([f, x]) => [f, x.valor, x.qtd]), recebido, sangrias, saldo, saldoLivre: Math.max(0, saldo), pendentes: pendentesSemLacre() };
  }

  const novoFechamento = () => ({
    etapa: 1, gerente: '', gerenteOk: false, corte: hora(),
    contagem: { especie: '', moedas: '', registrada: null }, // registrada = { total, esperado, diferenca, correcoes[] }
    folha: { anexo: null, campos: null, travados: true, correcao: '', periodoDe: '' }, relatorioGerado: false,
    maq: { comprovante: null, valores: null, travados: true, salvo: false }, folhaFechamento: null, lacre: '', observacao: '', resultado: null,
  });
  /** "Encerrar vendas": grava o corte e abre o fechamento (sem volta). */
  function iniciarFechamento() { estado.status = 'em_fechamento'; estado.fechamento = novoFechamento(); }
  const diferencaDe = (contado, esperado) => contado - esperado;

  /** Conclui o fechamento (regras do `fecharCaixa` do principal, na ordem do servidor). Devolve erro (string) ou null. */
  function fecharCaixa({ lacre: lacreInformado, observacao }) {
    const f = estado.fechamento;
    const a = estado.abertura;
    if (estado.status !== 'em_fechamento' || !f) return 'Inicie o fechamento e conclua os relatórios antes de fechar o caixa.';
    if (estado.turno.pdvLigado === false) return 'Registre o retorno do computador do PDV antes de fechar o caixa.';
    if (lacreInformado !== a.lacreFechamento) return 'O lacre informado não corresponde ao lacre de fechamento reservado no malote.';
    if (!f.folhaFechamento) return 'Anexe ao menos uma foto da folha de fechamento antes de fechar o caixa.';
    if (!f.relatorioGerado) return 'Gere o relatório completo de vendas antes de fechar o caixa.';
    if (!f.contagem.registrada) return 'Informe a contagem física (cédulas e moedas) em Vendas e gere o relatório antes de fechar o caixa.';
    if (!f.maq.salvo) return 'Salve a conferência da maquininha antes de fechar o caixa.';
    if (pendentesSemLacre().length) return 'Há dinheiro sem lacre aguardando confirmação neste caixa. Confirme o recebimento ou marque “Não recebi” antes de fechar.';
    const r = resumo();
    const esperado = r.saldo; // recalculado no fechamento, como no servidor
    if (esperado < 0) return 'O saldo físico calculado está negativo. Revise as saídas físicas antes de fechar o caixa.';
    const contado = f.contagem.registrada.total;
    const diferenca = diferencaDe(contado, esperado);
    if (diferenca !== 0 && !String(observacao || '').trim()) return 'Observação obrigatória quando a contagem física do fechamento divergir.';
    const id = a.caixaId;
    const retornoId = contado > 0 ? proximoId('tr', estado.transferencias) : null;
    // As vendas em dinheiro e a quebra/sobra passam a lançamentos da conta; o contado sai como retorno final ao Cofre (pendente).
    estado.lancamentos.push({ contaId: a.contaId, tipo: 'vendas', valor: vendasDinheiro(), ref: id }, { contaId: a.contaId, tipo: 'fechamento', valor: diferenca, ref: id });
    if (retornoId) estado.transferencias.push({ id: retornoId, tipo: 'retorno_final', origem: a.contaId, destino: 'cofre', valor: contado, especie: f.contagem.registrada.especie, moedas: f.contagem.registrada.moedas, valorRecebido: null,
      lacre: lacreInformado, situacao: 'pendente', caixaId: id, criadoPor: a.responsavel, criadoEm: hora(), observacao: '' });
    lacre(lacreInformado).situacao = 'usado';
    const registro = {
      id, data: new Date().toLocaleDateString('pt-BR'), pdv: a.pdv, turno: a.turno, contaId: a.contaId, operador: a.responsavel, supervisor: f.gerente || a.supervisor, abertura: a.abertoEm, fechamento: hora(), fechadoPor: a.responsavel,
      entradas: r.entradas, transfEntrada: a.valorInicial + r.recebido, transfSaida: r.sangrias, esperado, contado, diferenca, lacreFechamento: lacreInformado, lacreReservado: a.lacreFechamento,
      observacao: String(observacao || '').trim(), retornoId, conferencias: [], anexos: { folha: 1, creare: 1, comprovantes: 1 }, desta_sessao: true,
      // Retrato do que o dossiê mostra (a tela de Fechamentos não lê o turno vivo, que some ao recomeçar).
      contagem: { especie: f.contagem.registrada.especie, moedas: f.contagem.registrada.moedas, total: contado, correcoes: f.contagem.registrada.correcoes.slice() },
      folha: { campos: { ...f.folha.campos }, correcao: f.folha.correcao.trim() }, maquininha: { ...f.maq.valores },
      pdvForma: Object.fromEntries(['Crédito', 'Débito', 'Dinheiro', 'Pix', 'Voucher'].map((n) => [n, (r.porForma.find((x) => x[0] === n) || [n, 0])[1]])),
      paradas: estado.turno.paradas.map((p) => ({ ...p })), canceladas: estado.turno.canceladas.length,
      inicioVendas: a.inicioVendas, edicoes: a.edicoes.map((e) => ({ ...e })), periodoFolha: f.folha.periodoDe,
    };
    estado.fechamentos.unshift(registro);
    // Notificações como no principal: falta = quebra + aviso; sobra = só aviso; sem usuário de Tesouraria não há aviso.
    if (diferenca < 0) estado.notificacoes.push({ tipo: 'quebra_caixa', titulo: 'Quebra de caixa - ' + a.responsavel, valor: diferenca, para: 'Tesouraria' });
    if (diferenca > 0) estado.notificacoes.push({ tipo: 'transferencia_divergencia', titulo: 'Sobra na conferência de fechamento - ' + a.responsavel, valor: diferenca, para: 'Tesouraria' });
    f.resultado = registro;
    estado.status = 'fechado';
    return null;
  }

  /** Todos os caixas, vivos e fechados, para os monitores (Gerente/Financeiro). */
  function caixas() {
    const l = estado.fechamentos.map((h) => ({ ...h, situacao: 'fechado', saldo: 0 }));
    if (vivo() && estado.abertura) {
      const r = resumo(); const a = estado.abertura;
      l.unshift({ id: a.caixaId, data: new Date().toLocaleDateString('pt-BR'), pdv: a.pdv, turno: a.turno, contaId: a.contaId, operador: a.responsavel, abertura: a.abertoEm, fechamento: '',
        entradas: r.entradas, transfEntrada: a.valorInicial + r.recebido, transfSaida: r.sangrias, saldo: r.saldo, situacao: estado.status, sessao: true });
    }
    estado.caixasFicticios.forEach((c) => l.unshift({ ...c, data: new Date().toLocaleDateString('pt-BR'), fechamento: '' }));
    return l;
  }

  /** Caixas ABERTOS agora (o monitor da Gerência não mostra os em fechamento). */
  const caixasAbertos = () => caixas().filter((c) => c.situacao === 'aberto');

  /** Recomeça a demonstração inteira; cada tela limpa o que guardou ao se registrar em aoReiniciar. */
  function reiniciar() { Object.assign(estado, base()); reinicios.forEach((f) => f()); }
  const aoReiniciar = (f) => reinicios.push(f);

  /** Situação do caixa fechado para a Tesouraria (derivada, como no principal; a conferência não muda o status). */
  function situacaoDe(h) {
    const ultima = h.conferencias[h.conferencias.length - 1];
    if (ultima) return ultima.resultado === 'conferido' ? 'conferido_tesouraria' : 'divergencia_confirmada_tesouraria';
    if (h.diferenca < 0) return 'com_quebra';
    return h.diferenca === 0 ? 'fechado_sem_pendencias' : 'aguardando_tesouraria';
  }
  const ROTULO_SITUACAO = { aguardando_tesouraria: 'Aguardando Tesouraria', fechado_sem_pendencias: 'Fechado sem pendências', com_quebra: 'Com quebra',
    conferido_tesouraria: 'Conferido pela Tesouraria', divergencia_confirmada_tesouraria: 'Divergência confirmada pela Tesouraria' };
  const TOM_SITUACAO = { aguardando_tesouraria: 'atencao', fechado_sem_pendencias: 'info', com_quebra: 'negativo', conferido_tesouraria: 'positivo', divergencia_confirmada_tesouraria: 'atencao' };

  window.CicluzCaixa = {
    COR, COR_TEXTO, PERFIS, estado, pode,
    moeda, centavos, hora, somarMin, totalItens,
    conta, saldoConta, contaDoPosto, transferencia, malotes, malotePorLacre, lacreExiste, lacre, bolsasLivres, pendentesSemLacre, sangriasDoCaixa,
    criarMalote, criarSemLacre, abrirCaixa, registrarSangria, resolverRecebimento, confirmarTransferencia, quemOpera, criarTransferencia, conferirTransferencia, recusarConferencia, ajustarSaldo, resumo, iniciarFechamento, fecharCaixa, diferencaDe, caixas, caixasAbertos,
    reiniciar, aoReiniciar, situacaoDe, ROTULO_SITUACAO, TOM_SITUACAO,
    cards: (grupo = 'caixa') => CARDS.filter((c) => c[0] === grupo).map(([, id, t, d]) => [t, d, 'caixa:' + id]),
    icone: () => U.svg(ICONE),
    voltar,
  };
})();
