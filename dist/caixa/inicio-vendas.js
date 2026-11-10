/*
 * Caixa — Ajustar início das vendas (R-224, Marco 28/10/2026; Caixa-Brain/04 §8). Regra de domínio, sem tela.
 * Quando o operador abre o caixa no sistema depois de já estar vendendo no PDV, ele pode recuar o INÍCIO das vendas:
 * as vendas do PDV desse intervalo que estão SEM caixa passam a ser deste caixa (Entradas, saldo e relatório). A abertura
 * oficial nunca muda; muda só o início do período. Limites: no máximo 60 min antes da abertura oficial, no mesmo dia, nunca
 * no mesmo minuto nem antes do fechamento do caixa anterior do mesmo PDV (o primeiro minuto é o seguinte), só com o caixa aberto ou em fechamento, motivo de 3 a 500 letras.
 * Cada ajuste fica registrado (quem, quando, motivo e as duas horas). Com o caixa em fechamento, o relatório de vendas já
 * gerado é descartado e precisa ser gerado de novo. Folha × início: tolerância de 2 min.
 * Adaptações da casca: o início é uma HORA do mesmo dia (o principal pede data e hora com fuso); a venda "de outro caixa"
 * não existe (cada PDV tem um caixa por vez); as vendas sem caixa são FICTÍCIAS (dados.js), em centavos, só em memória.
 */
(function () {
  'use strict';
  const C = window.CicluzCaixa;

  const RECUO_MAXIMO_MIN = 60;
  const TOLERANCIA_FOLHA_MIN = 2;
  const min = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
  const hhmm = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const horaValida = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));

  const ajustavel = () => (C.estado.status === 'aberto' || C.estado.status === 'em_fechamento') && Boolean(C.estado.abertura && C.estado.turno);
  const semCaixa = () => (C.estado.turno ? C.estado.turno.semCaixa : []);
  const dosAjustes = () => (C.estado.turno ? C.estado.turno.vendas.filter((v) => v.ajustada) : []);

  /** Fechamento do caixa anterior do mesmo PDV no mesmo dia (o piso do início); null se não houve. */
  function pisoCaixaAnterior() {
    const a = C.estado.abertura;
    const hoje = new Date().toLocaleDateString('pt-BR');
    const horas = C.estado.fechamentos.filter((h) => h.pdv === a.pdv && h.data === hoje && h.fechamento).map((h) => min(h.fechamento));
    return horas.length ? Math.max(...horas) : null;
  }

  /** Faixa em que o início pode ficar: [de, ate], em "HH:MM" (ate = abertura oficial). Depois do fechamento do caixa anterior: de = fechamento + 1 min. */
  function janelaInicio() {
    const oficial = min(C.estado.abertura.abertoEm);
    const piso = pisoCaixaAnterior();
    const de = Math.max(0, oficial - RECUO_MAXIMO_MIN, piso === null ? 0 : piso + 1);
    return { de: hhmm(de), ate: hhmm(oficial) };
  }

  /** Recusas, na ordem do servidor. Devolve a mensagem ou null. */
  function validarInicio(hora, motivo) {
    if (!ajustavel()) return 'O caixa não está aberto nem em fechamento: não dá para ajustar o início das vendas.';
    if (!horaValida(hora)) return 'Informe a hora do novo início (HH:MM).';
    const a = C.estado.abertura;
    const oficial = min(a.abertoEm);
    const novo = min(hora);
    if (novo > oficial) return 'O início das vendas não pode ser depois da abertura oficial (' + a.abertoEm + ').';
    if (novo < oficial - RECUO_MAXIMO_MIN) return 'O início só pode recuar até ' + RECUO_MAXIMO_MIN + ' minutos antes da abertura oficial (a partir de ' + hhmm(Math.max(0, oficial - RECUO_MAXIMO_MIN)) + ').';
    const piso = pisoCaixaAnterior();
    if (piso !== null && novo <= piso) return 'O início não pode ser no mesmo minuto nem antes do fechamento do caixa anterior deste PDV (' + hhmm(piso) + '). O primeiro minuto permitido é ' + hhmm(piso + 1) + '.';
    const m = String(motivo || '').trim();
    if (m.length < 3 || m.length > 500) return 'Informe o motivo do ajuste (de 3 a 500 letras).';
    if (hora === a.inicioVendas) return 'O início das vendas já é ' + hora + '.';
    return null;
  }

  /** Aplica o ajuste. Devolve { erro } ou { trazidas, devolvidas, relatorioDescartado }. */
  function ajustarInicioVendas(hora, motivo) {
    const erro = validarInicio(hora, motivo);
    if (erro) return { erro };
    const a = C.estado.abertura;
    const t = C.estado.turno;
    const novo = min(hora);
    let trazidas = 0;
    let devolvidas = 0;
    // O que o PDV vendeu a partir do novo início e está sem caixa passa a ser deste; o que ficou fora do período volta a ficar sem caixa.
    [...t.semCaixa].forEach((v) => { if (min(v.hora) >= novo) { t.semCaixa.splice(t.semCaixa.indexOf(v), 1); v.ajustada = true; t.vendas.push(v); trazidas += 1; } });
    dosAjustes().forEach((v) => { if (min(v.hora) < novo) { t.vendas.splice(t.vendas.indexOf(v), 1); delete v.ajustada; t.semCaixa.push(v); devolvidas += 1; } });
    t.vendas.sort((x, y) => min(x.hora) - min(y.hora));
    t.semCaixa.sort((x, y) => min(x.hora) - min(y.hora));
    a.edicoes.push({ em: C.hora(), por: a.responsavel, motivo: String(motivo).trim(), de: a.inicioVendas, para: hora, trazidas, devolvidas });
    a.inicioVendas = hora;
    let relatorioDescartado = false;
    if (C.estado.status === 'em_fechamento' && C.estado.fechamento && C.estado.fechamento.relatorioGerado) {
      C.estado.fechamento.relatorioGerado = false; // o período mudou: gerar o relatório de novo
      C.estado.fechamento.contagem.registrada = null;
      relatorioDescartado = true;
    }
    return { trazidas, devolvidas, relatorioDescartado };
  }

  /** Primeira venda do PDV (com ou sem caixa): é o "Período de" que a folha do CREARE imprime. */
  function primeiraVendaPdv() {
    const t = C.estado.turno;
    if (!t) return '';
    const horas = [...t.vendas, ...t.semCaixa].map((v) => min(v.hora));
    return horas.length ? hhmm(Math.min(...horas)) : '';
  }

  /** Compara o início da folha com o início das vendas. cabe = dá para ajustar para a hora da folha. */
  function compararFolha(periodo) {
    if (!horaValida(periodo) || !C.estado.abertura) return null;
    const inicio = min(C.estado.abertura.inicioVendas);
    const folha = min(periodo);
    const diff = folha - inicio;
    const j = janelaInicio();
    return { periodo, inicio: C.estado.abertura.inicioVendas, diff, confere: Math.abs(diff) <= TOLERANCIA_FOLHA_MIN, antes: diff < -TOLERANCIA_FOLHA_MIN, depois: diff > TOLERANCIA_FOLHA_MIN, cabe: folha >= min(j.de) && folha <= min(j.ate) };
  }

  /** Total das vendas ainda sem caixa numa forma de pagamento ("Dinheiro", "Pix", "Débito"…); sem nome, soma tudo. */
  function totalSemCaixa(forma) {
    return semCaixa().reduce((s, v) => s + v.formas.filter((f) => !forma || f[0] === forma).reduce((x, f) => x + f[1], 0), 0);
  }

  Object.assign(C, { RECUO_MAXIMO_MIN, TOLERANCIA_FOLHA_MIN, ajustavelInicio: ajustavel, janelaInicio, validarInicio, ajustarInicioVendas, primeiraVendaPdv, compararFolha, totalSemCaixa });
})();
