/*
 * Caixa — Fechamento (casca): tela, gerente, navegação das etapas e caixa fechado. Wizard de 4 etapas como no principal (CaixaFechamentoWizard):
 *  gerente responsável → 1 Vendas (contagem cega + folha CREARE) → 2 Maquininha → 3 Relatório final → 4 Fechamento.
 * Regras (ver Caixa-Brain/05): contagem por DOIS totais (cédulas e moedas), esperado congelado ao gerar o relatório,
 * diferença = contado − esperado sem tolerância, folha e maquininha só INFORMAM (só a contagem física vira quebra),
 * lacre de fechamento = o reservado pela Tesouraria, observação obrigatória se houver falta OU sobra.
 * Tela em formulário linha por linha (padrão da Nova Transferência): cada assunto é um grupo com título, quadro de linhas e notas depois do quadro.
 * Adaptação da casca: a leitura da folha CREARE e do comprovante (IA no principal) é SIMULADA por um botão;
 * anexos são só um nome de arquivo. Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda } = C;
  const { ctx: K, linhaSituacao } = window.CicluzCaixaFechamentoComum;
  const { linha, quadro, secao, chave } = C.pecas();
  const { formulario, linhaLeitura, linhaCampo } = C;
  const P = window.CicluzCaixaFechamentoPartes;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Vendas / Fechamento de Caixa';
  const ETAPAS = ['Vendas', 'Maquininha', 'Relatório final', 'Fechamento'];

  let tela = null;
  let corpo = null;
  let faixa = null;
  let gerenteDialogoVisto = false;

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-fechamento', titulo: 'VND - Fechamento de Caixa', caminho: CAMINHO, voltar: C.voltarVendas });
    tela.ativar();
    montar();
    const f = C.estado.fechamento;
    if (C.estado.status === 'em_fechamento' && f && !f.gerenteOk && !gerenteDialogoVisto) { gerenteDialogoVisto = true; dialogoGerente(); }
  }
  function montar() {
    faixa = C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A leitura da folha e do comprovante (IA no principal) é simulada por botão.', atualizar, ['operador', 'gerente']);
    corpo = formulario();
    tela.body.replaceChildren(corpo);
    atualizar();
  }
  /** Redesenha o formulário: a faixa "Ver como" fica sempre no topo e os grupos da etapa vêm depois. */
  const mostrar = (...nos) => corpo.replaceChildren(faixa, ...nos);
  C.aoReiniciar(() => { gerenteDialogoVisto = false; K.erroGerar = K.erroMaq = K.justContagem = ''; K.corrigindoContagem = false; if (tela) montar(); });

  /* ---------- tela ---------- */

  K.atualizar = () => atualizar();

  function atualizar() {
    const e = C.estado;
    const f = e.fechamento;
    if (e.status === 'fechado' && f && f.resultado) return mostrar(blocoFechado(f.resultado));
    if (e.status !== 'em_fechamento' || !f) {
      const acoes = el('div', 'caixa-acoes');
      acoes.append(botao(e.status === 'aberto' ? 'Ir para o Turno' : 'Ir para a Abertura', () => C.abrir(e.status === 'aberto' ? 'turno' : 'abertura'), 'btn'));
      return mostrar(secao('Fechamento ainda não iniciado', U.nota('O fechamento começa depois de "Fechar caixa" → "Encerrar vendas e ir para conferência" no Turno do caixa.'), acoes));
    }
    mostrar(blocoGerente(f), blocoNavegacao(f), ...[P.etapa1, P.etapa2, P.etapa3, P.etapa4][f.etapa - 1](f), blocoRodape(f));
  }

  /* ---------- gerente responsável ---------- */

  function blocoGerente(f) {
    const acoes = el('div', 'caixa-acoes caixa-acoes-esq');
    acoes.append(botao(f.gerenteOk ? 'Alterar gerente' : 'Confirmar gerente', dialogoGerente, f.gerenteOk ? 'btn secondary' : 'btn'));
    return secao('Gerente responsável',
      quadro(linhaSituacao('Situação', f.gerenteOk ? 'Confirmado: ' + f.gerente : 'Falta confirmar', f.gerenteOk ? 'positivo' : 'atencao'),
        linhaLeitura('Responsável pelo caixa', C.estado.abertura.responsavel), linhaLeitura('Corte das vendas', f.corte)),
      U.nota('O responsável pelo caixa (R-226) é quem abriu.'), acoes);
  }

  function dialogoGerente() {
    const f = C.estado.fechamento;
    const atual = C.estado.abertura.supervisor;
    C.dialogo({
      padrao: true,
      titulo: 'Gerente responsável pelo fechamento',
      subtitulo: 'Quem confirma este fechamento pela gerência.',
      rotuloSalvar: 'Confirmar gerente',
      montar: (form) => {
        const ctx = { mesmo: Boolean(atual), nome: null };
        const nome = entrada('text', '', { placeholder: 'Nome do gerente', autocomplete: 'off' });
        const linhaNome = linhaCampo('Nome do gerente responsável', nome, true);
        const dica = U.nota('Nome livre: o principal não valida se o gerente existe.');
        const q = quadro();
        // A linha do nome entra e sai do quadro (a linha é display:flex: o atributo hidden não a esconde).
        const desenhar = () => { q.replaceChildren(...linhasFixas, ...(ctx.mesmo ? [] : [linhaNome])); dica.hidden = ctx.mesmo; };
        const linhasFixas = atual ? [linhaLeitura('Gerente que abriu o caixa', atual), linha('É o mesmo no fechamento?', chave('É o mesmo no fechamento?', true, ['Sim, confirmar', 'Não, é outro'], (v) => { ctx.mesmo = v; desenhar(); if (!v) nome.focus(); }))] : [];
        desenhar();
        form.append(formulario(secao('Gerente responsável', q, ...(atual ? [] : [U.nota('Este caixa não registrou o gerente na abertura. Informe quem responde pelo fechamento.')]), dica)));
        ctx.nome = nome;
        return ctx;
      },
      salvar: (ctx) => {
        if (ctx.mesmo && atual) f.gerente = atual;
        else if (ctx.nome.value.trim().length > 1) f.gerente = ctx.nome.value.trim();
        else return 'Informe o nome do gerente responsável (mínimo 2 letras).';
        f.gerenteOk = true;
        atualizar();
      },
    });
  }

  /* ---------- navegação das etapas ---------- */

  function blocoNavegacao(f) {
    const nav = el('nav', 'caixa-trilha caixa-etapas');
    nav.setAttribute('aria-label', 'Etapas do fechamento');
    const ol = el('ol');
    ETAPAS.forEach((nome, i) => {
      const li = el('li', i + 1 < f.etapa ? 'feito' : i + 1 === f.etapa ? 'atual' : 'futuro');
      if (i + 1 === f.etapa) li.setAttribute('aria-current', 'step');
      const b = botao(nome, () => { f.etapa = i + 1; atualizar(); }, 'caixa-etapa-btn');
      const num = el('span', 'caixa-trilha-marca', String(i + 1));
      num.setAttribute('aria-hidden', 'true');
      li.append(num, b);
      ol.append(li);
    });
    nav.append(ol);
    return nav;
  }

  function blocoRodape(f) {
    const acoes = el('div', 'caixa-acoes');
    if (f.etapa > 1) acoes.append(botao('Voltar', () => { f.etapa -= 1; atualizar(); }, 'btn secondary'));
    if (f.etapa === 1) {
      const b = botao('Conferir maquininha', () => { f.etapa = 2; atualizar(); }, 'btn');
      b.disabled = !f.contagem.registrada;
      if (b.disabled) b.title = 'Gere o relatório de vendas (com a contagem) para continuar.';
      acoes.append(b);
    } else if (f.etapa === 2) acoes.append(botao('Ver relatório final', () => { f.etapa = 3; atualizar(); }, 'btn'));
    else if (f.etapa === 3) acoes.append(botao('Ir para fechamento', () => { f.etapa = 4; atualizar(); }, 'btn'));
    return acoes;
  }

  /* ---------- Caixa fechado ---------- */

  function blocoFechado(h) {
    const d = h.diferenca;
    const depois = [el('p', 'caixa-diferenca ' + (d < 0 ? 'falta' : d > 0 ? 'sobra' : 'bateu'), d < 0 ? '▼ Falta de ' + moeda(-d) + ': quebra registrada e Tesouraria avisada.' : d > 0 ? '▲ Sobra de ' + moeda(d) + ': Tesouraria avisada (sem quebra).' : '✓ Bateu: sem diferença.')];
    if (h.retornoId) depois.push(U.nota('Retorno final ao Cofre: ' + moeda(C.transferencia(h.retornoId).valor) + ' (sem lacre próprio, aguardando conferência da Tesouraria).'));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Recomeçar a demonstração', () => { C.reiniciar(); }, 'btn secondary'), botao('Ir para Fechamentos de Caixa', () => C.abrir('fechamentos'), 'btn'));
    return secao('Caixa fechado · ' + h.pdv + ' · ' + h.turno,
      quadro(linhaSituacao('Situação', C.ROTULO_SITUACAO[C.situacaoDe(h)], C.TOM_SITUACAO[C.situacaoDe(h)]),
        ...[['Fechado por', h.fechadoPor], ['Gerente', h.supervisor], ['Lacre de fechamento', h.lacreFechamento], ['Esperado', moeda(h.esperado)], ['Contado', moeda(h.contado)], ['Diferença', (d > 0 ? '+' : '') + moeda(d)]].map(([t, v]) => linhaLeitura(t, v))),
      ...depois, acoes);
  }


  C.registrar('fechamento', abrir);
})();
