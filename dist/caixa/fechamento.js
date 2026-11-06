/*
 * Caixa — Fechamento (casca): tela, gerente, navegação das etapas e caixa fechado. Wizard de 4 etapas como no principal (CaixaFechamentoWizard):
 *  gerente responsável → 1 Vendas (contagem cega + folha CREARE) → 2 Maquininha → 3 Relatório final → 4 Fechamento.
 * Regras (ver Caixa-Brain/05): contagem por DOIS totais (cédulas e moedas), esperado congelado ao gerar o relatório,
 * diferença = contado − esperado sem tolerância, folha e maquininha só INFORMAM (só a contagem física vira quebra),
 * lacre de fechamento = o reservado pela Tesouraria, observação obrigatória se houver falta OU sobra.
 * Adaptação da casca: a leitura da folha CREARE e do comprovante (IA no principal) é SIMULADA por um botão;
 * anexos são só um nome de arquivo. Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada } = U;
  const { moeda } = C;
  const { ctx: K, corpoSecao, dl } = window.CicluzCaixaFechamentoComum;
  const P = window.CicluzCaixaFechamentoPartes;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Fechamento de Caixa';
  const ETAPAS = ['Vendas', 'Maquininha', 'Relatório final', 'Fechamento'];

  let tela = null;
  let corpo = null;
  let gerenteDialogoVisto = false;

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-fechamento', titulo: 'VND - Fechamento de Caixa', caminho: CAMINHO });
    tela.ativar();
    montar();
    const f = C.estado.fechamento;
    if (C.estado.status === 'em_fechamento' && f && !f.gerenteOk && !gerenteDialogoVisto) { gerenteDialogoVisto = true; dialogoGerente(); }
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A leitura da folha e do comprovante (IA no principal) é simulada por botão.', atualizar, ['operador', 'gerente']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { gerenteDialogoVisto = false; K.erroGerar = K.erroMaq = K.justContagem = ''; K.corrigindoContagem = false; if (tela) montar(); });

  /* ---------- tela ---------- */

  K.atualizar = () => atualizar();

  function atualizar() {
    const e = C.estado;
    const f = e.fechamento;
    if (e.status === 'fechado' && f && f.resultado) return corpo.replaceChildren(blocoFechado(f.resultado));
    if (e.status !== 'em_fechamento' || !f) {
      const s = U.secao('Fechamento ainda não iniciado');
      const acoes = el('div', 'caixa-acoes');
      acoes.append(botao(e.status === 'aberto' ? 'Ir para o Turno' : 'Ir para a Abertura', () => C.abrir(e.status === 'aberto' ? 'turno' : 'abertura'), 'btn'));
      s.append(corpoSecao(U.nota('O fechamento começa depois de "Fechar caixa" → "Encerrar vendas e ir para conferência" no Turno do caixa.'), acoes));
      return corpo.replaceChildren(s);
    }
    const partes = [blocoGerente(f), blocoNavegacao(f)];
    partes.push([P.etapa1, P.etapa2, P.etapa3, P.etapa4][f.etapa - 1](f));
    partes.push(blocoRodape(f));
    corpo.replaceChildren(...partes);
  }

  /* ---------- gerente responsável ---------- */

  function blocoGerente(f) {
    const s = el('section', 'compras-secao caixa-bloco');
    const cab = el('div', 'compras-secao-cab');
    cab.append(el('h3', null, 'Gerente responsável'), f.gerenteOk ? U.situacao('Confirmado: ' + f.gerente, 'positivo') : U.situacao('Falta confirmar', 'atencao'));
    s.append(cab);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Responsável pelo caixa (R-226): ' + C.estado.abertura.responsavel + ', quem abriu. Corte das vendas: ' + f.corte + '.'),
      botao(f.gerenteOk ? 'Alterar gerente' : 'Confirmar gerente', dialogoGerente, f.gerenteOk ? 'btn secondary' : 'btn'));
    s.append(corpoSecao(acoes));
    return s;
  }

  function dialogoGerente() {
    const f = C.estado.fechamento;
    const atual = C.estado.abertura.supervisor;
    C.dialogo({
      titulo: 'Gerente responsável pelo fechamento',
      subtitulo: 'Quem confirma este fechamento pela gerência.',
      rotuloSalvar: 'Confirmar gerente',
      montar: (form) => {
        const ctx = { mesmo: Boolean(atual), nome: null };
        const nome = entrada('text', '', { placeholder: 'Nome do gerente', autocomplete: 'off' });
        const campoNome = campo('Nome do gerente responsável', nome, 'Nome livre: o principal não valida se o gerente existe.');
        campoNome.hidden = ctx.mesmo;
        if (atual) {
          form.append(el('p', null, 'Gerente que abriu o caixa: ' + atual + '. É o mesmo no fechamento?'));
          const opc = U.chips([['sim', 'Sim, confirmar'], ['outro', 'Não, é outro']], 'sim', (v) => { ctx.mesmo = v === 'sim'; campoNome.hidden = ctx.mesmo; });
          form.append(opc);
        } else {
          form.append(U.nota('Este caixa não registrou o gerente na abertura. Informe quem responde pelo fechamento.'));
        }
        form.append(campoNome);
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
    const s = U.secao('Caixa fechado · ' + h.pdv + ' · ' + h.turno);
    s.querySelector('.compras-secao-cab').append(U.situacao(C.ROTULO_SITUACAO[C.situacaoDe(h)], C.TOM_SITUACAO[C.situacaoDe(h)]));
    const d = h.diferenca;
    const itens = [
      dl([['Fechado por', h.fechadoPor], ['Gerente', h.supervisor], ['Lacre de fechamento', h.lacreFechamento], ['Esperado', moeda(h.esperado)], ['Contado', moeda(h.contado)], ['Diferença', (d > 0 ? '+' : '') + moeda(d)]]),
      el('p', 'caixa-diferenca ' + (d < 0 ? 'falta' : d > 0 ? 'sobra' : 'bateu'), d < 0 ? '▼ Falta de ' + moeda(-d) + ': quebra registrada e Tesouraria avisada.' : d > 0 ? '▲ Sobra de ' + moeda(d) + ': Tesouraria avisada (sem quebra).' : '✓ Bateu: sem diferença.'),
    ];
    if (h.retornoId) itens.push(U.nota('Retorno final ao Cofre: ' + moeda(C.transferencia(h.retornoId).valor) + ' (sem lacre próprio, aguardando conferência da Tesouraria).'));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Recomeçar a demonstração', () => { C.reiniciar(); }, 'btn secondary'), botao('Ir para Fechamentos de Caixa', () => C.abrir('fechamentos'), 'btn'));
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    return s;
  }


  C.registrar('fechamento', abrir);
})();
