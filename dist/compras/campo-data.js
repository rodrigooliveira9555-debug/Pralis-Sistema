/*
 * Campo de data com calendário (24/11/2026, pedido do Marco na tela VND - Vendas dos PDVs). Mesmo desenho do campo de hora
 * (U.campoHora): o campo com a máscara DD/MM/AA e o botão redondo do calendário (32 px, cor do menu); tocar no campo ou no
 * botão abre o painel flutuante com o mês (‹ mês ano ›), a linha dos dias da semana e os dias em células de 8 px de canto;
 * o escolhido fica cheio na cor do menu e o dia de hoje tem contorno. Escolher o dia fecha o painel e devolve o foco; Esc fecha.
 * O valor é ISO (AAAA-MM-DD), como em todo o sistema; o texto segue CicluzDateFields (DD/MM/AA).
 * Acrescentado em 25/11/2026 (Washington, telas de Lançamentos): botão Limpar ao lado de Hoje (esvazia o campo) e, ao tocar no título, a escolha de Mês e Ano
 * (12 anos por vez, com ‹ ›) para ir longe sem passar mês a mês; escolher o mês volta à grade dos dias. Quem só precisa de uma data não muda nada.
 * Uso: const d = U.campoData({ valor, rotulo }); a tela põe d.caixa no campo e d.painel ao lado; lê d.valor(); ouve 'change' em d.input.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const F = window.CicluzDateFields;
  const { el } = U;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = [['D', 'Domingo'], ['S', 'Segunda'], ['T', 'Terça'], ['Q', 'Quarta'], ['Q', 'Quinta'], ['S', 'Sexta'], ['S', 'Sábado']];
  const hojeIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const doisDigitos = (n) => String(n).padStart(2, '0');

  function campoData({ valor = '', rotulo = 'Data' } = {}) {
    let atual = F.valid(valor) ? valor : '';
    let ultimo = atual; // última data válida: só serve de referência para o século de um ano digitado com dois números
    let mes = (atual || hojeIso()).slice(0, 7); // AAAA-MM à vista no painel
    const input = U.entrada('text', F.display(atual), { inputMode: 'numeric', placeholder: 'DD/MM/AA', maxLength: 8, autocomplete: 'off' });
    input.setAttribute('aria-label', rotulo);
    input.dataset.textoLivre = '1';
    const botao = el('button', 'shortcut-circle compras-redondo');
    botao.type = 'button'; botao.title = 'Abrir o calendário'; botao.setAttribute('aria-label', rotulo + ': abrir o calendário');
    botao.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    const caixa = el('div', 'compras-aniv-campo compras-data-campo'); caixa.append(input, botao);

    const painel = el('div', 'compras-escolha-painel compras-aniv-painel compras-data-painel');
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', rotulo + ': calendário');
    const titulo = el('button', 'compras-data-titulo compras-data-titulo-botao');
    titulo.type = 'button'; titulo.setAttribute('aria-live', 'polite');
    let modoMesAno = false; let anoBase = 0;
    const passo = (rot, desenho, delta) => {
      const b = el('button', 'compras-data-passo');
      b.type = 'button'; b.setAttribute('aria-label', rot);
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + desenho + '"/></svg>';
      b.onclick = () => {
        if (modoMesAno) { anoBase += 12 * delta; pintar(); return; }
        const [a, m] = mes.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 + delta, 1)); mes = d.toISOString().slice(0, 7); pintar();
      };
      return b;
    };
    const topo = el('div', 'compras-data-topo');
    topo.append(passo('Mês anterior', 'm15 5-7 7 7 7', -1), titulo, passo('Próximo mês', 'm9 5 7 7-7 7', 1));
    const grade = el('div', 'compras-grade-escolha em-7 compras-data-grade');
    grade.setAttribute('role', 'grid');
    const gradeMes = el('div', 'compras-grade-escolha em-4'); const gradeAno = el('div', 'compras-grade-escolha em-4');
    const vistaMesAno = el('div', 'compras-data-vista'); vistaMesAno.hidden = true;
    vistaMesAno.append(el('span', 'compras-rotulo', 'Mês'), gradeMes, el('span', 'compras-rotulo', 'Ano'), gradeAno);
    const atalhoHoje = U.botao('Hoje', () => escolher(hojeIso()), 'compras-chip');
    const atalhoLimpar = U.botao('Limpar', () => escolher(''), 'compras-chip');
    const pe = el('div', 'compras-data-pe'); pe.append(atalhoLimpar, atalhoHoje);
    titulo.onclick = () => { modoMesAno = !modoMesAno; anoBase = Number(mes.slice(0, 4)) - 5; pintar(); };
    painel.append(topo, grade, vistaMesAno, pe);
    const abrir = U.flutuante(caixa, painel);

    function escolher(iso) {
      atual = iso; if (iso) ultimo = iso; mes = (iso || hojeIso()).slice(0, 7);
      input.value = iso ? F.display(iso) : '';
      input.setCustomValidity('');
      input.removeAttribute('aria-invalid');
      abrir(false); input.focus();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function pintar() {
      const [a, m] = mes.split('-').map(Number);
      titulo.textContent = MESES[m - 1] + ' de ' + a + (modoMesAno ? ' ▴' : ' ▾');
      titulo.title = modoMesAno ? 'Voltar aos dias' : 'Escolher o mês e o ano';
      grade.hidden = modoMesAno; vistaMesAno.hidden = !modoMesAno;
      if (modoMesAno) {
        const celula = (texto, marcado, nome, aoTocar) => { const b = el('button', 'compras-grade-celula', texto); b.type = 'button'; b.setAttribute('aria-pressed', String(marcado)); b.setAttribute('aria-label', nome); b.onclick = aoTocar; return b; };
        gradeMes.replaceChildren(...MESES.map((n, i) => celula(n.slice(0, 3), m === i + 1, n, () => { mes = a + '-' + doisDigitos(i + 1); modoMesAno = false; pintar(); })));
        gradeAno.replaceChildren(...Array.from({ length: 12 }, (_, i) => celula(String(anoBase + i), a === anoBase + i, 'Ano ' + (anoBase + i), () => { mes = (anoBase + i) + '-' + doisDigitos(m); pintar(); })));
        return;
      }
      const primeiro = new Date(Date.UTC(a, m - 1, 1)).getUTCDay();
      const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
      const hoje = hojeIso();
      const cabecalho = SEMANA.map(([l, nome]) => { const c = el('span', 'compras-data-semana', l); c.title = nome; c.setAttribute('aria-hidden', 'true'); return c; });
      const vazios = Array.from({ length: primeiro }, () => el('span'));
      const celulas = Array.from({ length: dias }, (_, i) => {
        const iso = a + '-' + doisDigitos(m) + '-' + doisDigitos(i + 1);
        const b = el('button', 'compras-grade-celula' + (iso === hoje ? ' hoje' : ''), String(i + 1));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(iso === atual));
        b.setAttribute('aria-label', (i + 1) + ' de ' + MESES[m - 1] + ' de ' + a + (iso === hoje ? ', hoje' : ''));
        b.onclick = () => escolher(iso);
        return b;
      });
      grade.replaceChildren(...cabecalho, ...vazios, ...celulas);
    }
    // Digitar continua valendo (máscara DD/MM/AA); data incompleta ou impossível deixa o campo inválido.
    input.addEventListener('input', () => {
      input.value = F.mask(input.value);
      const iso = F.parse(input.value, ultimo);
      // Texto apagado ou incompleto não pode deixar a data antiga valendo (valor() devolve '' até a data ficar completa).
      atual = iso || '';
      if (iso) { ultimo = iso; mes = iso.slice(0, 7); }
      input.setCustomValidity(!input.value || iso ? '' : 'Informe uma data válida no formato DD/MM/AA.');
      if (input.value && !iso) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      if (iso) input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const abrirNoMes = (sim) => { if (sim) modoMesAno = false; pintar(); abrir(sim); };
    input.addEventListener('click', () => abrirNoMes(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); abrirNoMes(true); } });
    botao.addEventListener('click', () => abrirNoMes(painel.hidden));
    pintar();
    return {
      caixa, painel, input,
      valor: () => atual,
      definir: (iso) => { atual = F.valid(iso) ? iso : ''; if (atual) ultimo = atual; mes = (atual || hojeIso()).slice(0, 7); input.value = F.display(atual); pintar(); },
    };
  }

  U.campoData = campoData;
})();
