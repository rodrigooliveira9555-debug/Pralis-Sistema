/*
 * Configurações → Empresa → Horários Empresa (27/11/2026, pedido do Washington, a partir do esboço dele).
 * O esboço é um quadro: os dias no alto (S T Q Q S S D F = segunda a domingo e feriado) e, embaixo, os turnos M (manhã), T (tarde) e
 * Funcionamento, com o horário de cada um em cada dia, e setas copiando o horário de segunda para os outros dias.
 * Aqui o quadro vira o padrão linha por linha da Nova Transferência (nada de grade de 8 colunas, que não cabe em 320 px):
 *  - Tela: uma lista com um dia por linha e as colunas Manhã, Tarde e Funcionamento (colunas recolhíveis, como em Patrimônios);
 *    tocar no dia abre a janela de edição nesse dia.
 *  - Janela "Horários da semana": no quadro fixo do alto, os dias do esboço (S T Q Q S S D F); embaixo, um grupo por turno com as linhas
 *    Abre e Fecha (hora em painel, como a Hora da Transferência) e o grupo "Copiar para outros dias" (o das setas do esboço). Salvar grava
 *    a semana inteira de uma vez; Cancelar descarta.
 * Regras (horarios-empresa-dominio.js, testadas): faixa = abre e fecha, ou nenhuma; fechar antes de abrir = dia seguinte. Não há conferência entre
 * turnos e Funcionamento (decisão pendente, PROJECT_BRAIN/11, P-55). Dados: cicluz-compras-v1.horariosEmpresa (coleção nova e opcional).
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos; const U = window.CicluzComprasUI; const S = window.CicluzComprasDados; const H = window.CicluzHorariosEmpresaDominio;
  if (!A || !U || !S || !H) return;
  const { el, botao } = U;
  const cores = { cor: A.COR, corTexto: A.COR_TEXTO };
  const RELOGIO = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  const lerDoc = () => H.normalizar(S.dados && S.dados.horariosEmpresa);

  /* ============================== Janela de edição ============================== */
  function editar(diaInicial) {
    const P = window.CicluzTransferencias && window.CicluzTransferencias.pecas;
    if (!P) { U.avisar('A tela de Transferências ainda não carregou. Tente de novo.'); return; }
    const { linha, quadro, secao, abreAoTocarNaLinha, linhaQueAbre } = P;
    const rascunho = lerDoc();
    let dia = H.DIAS.some(([k]) => k === diaInicial) ? diaInicial : '1';
    U.dialogo({
      titulo: 'Horários da semana', ...cores, classe: 'compras-form-padrao transferencia-tela', rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove(); // o caminho já está no cabeçalho
        const corpo = el('div', 'transferencia-corpo');

        /* Quadro fixo do alto: os dias do esboço (S T Q Q S S D F). */
        const cab = el('div', 'transferencia-valor-cab'); const diasBox = el('div', 'compras-chips hr-dias'); diasBox.setAttribute('role', 'group'); diasBox.setAttribute('aria-label', 'Dia da semana');
        const nomeDia = el('span', 'hr-dia-nome'); nomeDia.setAttribute('aria-live', 'polite');
        cab.append(el('span', 'transferencia-valor-rotulo', 'Dia da semana'), diasBox, nomeDia);
        const botoesDia = new Map();
        H.DIAS.forEach(([k, letra, nome]) => {
          const b = botao(letra, () => trocarDia(k), 'compras-chip hr-dia'); b.title = nome; botoesDia.set(k, b); diasBox.append(b);
        });

        /* Um grupo por turno: Abre e Fecha, com a hora em painel. Os seis campos servem a todos os dias: ao trocar de dia, trocam os valores. */
        const campos = {};
        const linhaHora = (rotulo, h) => { const l = abreAoTocarNaLinha(linha(rotulo, h.caixa, h.painel), h.input, h.painel); l.classList.add('hr-linha'); return l; };
        const grupos = H.TURNOS.map(([t, , nome]) => {
          campos[t] = { abre: U.campoHora({ rotulo: nome + ': abre' }), fecha: U.campoHora({ rotulo: nome + ': fecha' }) };
          return secao(nome, quadro(linhaHora('Abre', campos[t].abre), linhaHora('Fecha', campos[t].fecha)));
        });

        /* Copiar para outros dias (as setas do esboço): marca os dias de destino e copia os três turnos do dia atual. */
        const destinos = new Set();
        const copiaAbre = linhaQueAbre('Copiar este dia para', () => abrirCopia(painelCopia.hidden));
        const chipsCopia = el('div', 'compras-chips hr-dias hr-dias-copia'); chipsCopia.setAttribute('role', 'group'); chipsCopia.setAttribute('aria-label', 'Dias que vão receber o horário');
        const aviso = el('small', 'profiles-note'); aviso.setAttribute('role', 'status');
        const copiar = botao('Copiar', () => {
          if (!destinos.size) { aviso.textContent = 'Toque nos dias que vão receber o horário.'; return; }
          guardar();
          const nova = H.copiar(rascunho, dia, [...destinos]);
          Object.assign(rascunho.dias, nova.dias);
          const nomes = [...destinos].map((k) => H.nomeDoDia(k)).join(', ');
          aviso.textContent = 'Copiado para: ' + nomes + '.'; destinos.clear(); pintarCopia(); pintarDias();
        }, 'btn secondary hr-copiar');
        const painelCopia = el('div', 'transferencia-multi-painel'); painelCopia.hidden = true; painelCopia.append(chipsCopia, aviso, copiar);
        const opcaoCopia = el('div', 'transferencia-opcao'); opcaoCopia.append(copiaAbre.no, painelCopia);
        function abrirCopia(sim) { painelCopia.hidden = !sim; copiaAbre.abrir(sim); }
        dlg.addEventListener('click', (e) => { if (!painelCopia.hidden && !opcaoCopia.contains(e.target)) abrirCopia(false); });
        opcaoCopia.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painelCopia.hidden) { abrirCopia(false); e.stopPropagation(); e.preventDefault(); copiaAbre.no.focus(); } });
        function pintarCopia() {
          chipsCopia.replaceChildren(...H.DIAS.filter(([k]) => k !== dia).map(([k, letra, nome]) => {
            const b = botao(letra, () => { destinos.has(k) ? destinos.delete(k) : destinos.add(k); pintarCopia(); }, 'compras-chip hr-dia' + (destinos.has(k) ? ' ativo' : ''));
            b.title = nome; b.setAttribute('aria-label', nome); b.setAttribute('aria-pressed', String(destinos.has(k))); return b;
          }));
          copiaAbre.resumo.textContent = destinos.size ? destinos.size + (destinos.size === 1 ? ' dia' : ' dias') : 'Escolher';
        }

        /* Leitura e escrita dos seis campos <-> rascunho do dia. */
        function guardar() {
          const d = rascunho.dias[dia];
          H.TURNOS.forEach(([t]) => { d[t] = { abre: campos[t].abre.input.value.trim(), fecha: campos[t].fecha.input.value.trim() }; });
        }
        function carregar() {
          const d = rascunho.dias[dia];
          H.TURNOS.forEach(([t]) => ['abre', 'fecha'].forEach((c) => {
            const i = campos[t][c].input; i.value = d[t][c]; i.dispatchEvent(new Event('input', { bubbles: true }));
          }));
        }
        function pintarDias() {
          botoesDia.forEach((b, k) => {
            const nome = H.nomeDoDia(k); const tem = H.temHorario(rascunho.dias[k]);
            b.classList.toggle('ativo', k === dia); b.classList.toggle('tem', tem); b.setAttribute('aria-pressed', String(k === dia));
            b.setAttribute('aria-label', nome + (tem ? ' (com horário)' : ' (sem horário)'));
          });
          nomeDia.textContent = H.nomeDoDia(dia);
        }
        function trocarDia(k) {
          if (k === dia) return;
          guardar(); dia = k; destinos.clear(); aviso.textContent = ''; carregar(); pintarDias(); pintarCopia();
        }
        // Mudou uma hora: o ponto de "tem horário" nos dias acompanha.
        form.addEventListener('change', () => { guardar(); pintarDias(); });

        corpo.append(cab, ...grupos, secao('Copiar para outros dias', quadro(opcaoCopia)),
          U.nota('Cada dia tem Manhã, Tarde e Funcionamento. Deixe as duas horas de um turno vazias quando não houver. Fechar antes de abrir quer dizer que fecha no dia seguinte. Salvar guarda a semana inteira.'));
        form.append(corpo);
        carregar(); pintarDias(); pintarCopia();
        return { guardar };
      },
      salvar: (c) => {
        c.guardar();
        const msg = H.validar(rascunho); if (msg) return msg;
        const ok = S.transacao((d) => { d.horariosEmpresa = H.paraSalvar(rascunho, S.agoraIso()); });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar('Horários salvos.'); render(); return undefined;
      },
    });
  }

  /* ============================== Tela: um dia por linha, com as colunas dos turnos ============================== */
  let tela = null;
  function render() {
    if (!tela) return;
    const doc = lerDoc(); const com = H.diasComHorario(doc);
    const ponta = U.pontaDaLista(com, com + ' de ' + H.DIAS.length + ' dias com horário');
    const sec = U.secao('Horários da semana', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Editar Horários', 'Editar os horários da semana', () => editar('1')));
    const linhas = el('div', 'compras-lista compras-lista-grade'); U.arrastarParaRolar(linhas);
    const cabecalho = U.cabecalhoColunas('grade-horarios-empresa', [
      { chave: 'nome', rotulo: 'Dia' }, { chave: 'manha', rotulo: 'Manhã', ocultavel: true }, { chave: 'tarde', rotulo: 'Tarde', ocultavel: true }, { chave: 'func', rotulo: 'Funcionamento' },
    ], { lista: linhas, preferencia: 'cicluz-horarios-empresa-colunas' });
    linhas.append(cabecalho); ponta.append(cabecalho.botaoGeral);
    H.DIAS.forEach(([k, , nome]) => {
      const d = doc.dias[k];
      linhas.append(U.linhaLista({
        icones: [{ icone: RELOGIO, rotulo: 'Horário' }], grade: 'grade-horarios-empresa', aoClicar: () => editar(k),
        colunas: [{ chave: 'nome', conteudo: nome }, { chave: 'manha', conteudo: H.texto(d.m) }, { chave: 'tarde', conteudo: H.texto(d.t) }, { chave: 'func', conteudo: H.texto(d.f) }],
      }));
    });
    sec.append(linhas);
    const vazio = com === 0 ? U.vazio('Nenhum horário definido.', 'Toque em "Editar Horários" e escolha, dia a dia, a hora de abrir e a de fechar de cada turno.') : null;
    tela.body.replaceChildren(U.nota('Manhã, Tarde e Funcionamento de cada dia, de segunda a domingo, e o horário de feriado. Toque em um dia para editar; o botão Editar Horários abre a semana inteira.'), ...(vazio ? [vazio] : []), sec);
  }
  function abrir() {
    if (!tela) tela = A.criarTela({ id: 'acessos-horarios-empresa', titulo: 'Horários Empresa', tela: 'horarios' });
    tela.ativar();
    render();
  }
  A.registrar('horarios', abrir);
  window.CicluzHorariosEmpresa = { abrir, editar };
})();
