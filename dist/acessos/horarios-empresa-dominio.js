/*
 * Configurações → Empresa → Horários Empresa — regras puras (27/11/2026, pedido do Washington, a partir do esboço dele).
 * Sem DOM e sem armazenamento; testado em tests/horarios-empresa-dominio.cjs.
 * O quadro é: DIAS (Segunda a Domingo e Feriado) × TURNOS (Manhã, Tarde e Funcionamento); cada célula é uma faixa { abre, fecha } em HH:MM.
 * Guardado em cicluz-compras-v1.horariosEmpresa = { version: 1, dias: { '1': { m, t, f }, … 'feriado': { m, t, f } }, atualizadoEm }:
 * coleção nova e opcional (sem migração). Faixa vazia = sem horário nesse turno; só abrir ou só fechar preenchido não vale.
 * Fechar antes de abrir quer dizer "no dia seguinte" (mesma leitura do VND - Horário de Funcionamento). Nenhuma outra regra foi
 * inventada: o sistema NÃO confere se Manhã e Tarde cabem no Funcionamento, nem calcula um turno a partir dos outros (PROJECT_BRAIN/11, P-55).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzHorariosEmpresaDominio = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /** [chave, letra do esboço, nome]. A chave é o dia da semana do JavaScript (0 = domingo) ou "feriado" (a mesma do VND - Horário de Funcionamento). */
  const DIAS = [['1', 'S', 'Segunda-feira'], ['2', 'T', 'Terça-feira'], ['3', 'Q', 'Quarta-feira'], ['4', 'Q', 'Quinta-feira'], ['5', 'S', 'Sexta-feira'], ['6', 'S', 'Sábado'], ['0', 'D', 'Domingo'], ['feriado', 'F', 'Feriado']];
  /** [chave, letra do esboço, nome]. */
  const TURNOS = [['m', 'M', 'Manhã'], ['t', 'T', 'Tarde'], ['f', 'F', 'Funcionamento']];
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

  const faixaVazia = () => ({ abre: '', fecha: '' });
  const diaVazio = () => ({ m: faixaVazia(), t: faixaVazia(), f: faixaVazia() });
  const nomeDoDia = (k) => (DIAS.find((d) => d[0] === k) || [])[2] || '';
  const nomeDoTurno = (k) => (TURNOS.find((t) => t[0] === k) || [])[2] || '';

  /** Quadro vazio, com os oito dias e os três turnos. */
  function vazio() {
    const dias = {};
    DIAS.forEach(([k]) => { dias[k] = diaVazio(); });
    return { version: 1, dias };
  }

  /** Aceita qualquer coisa que esteja guardada (ou nada) e devolve o quadro inteiro: o que falta vira vazio e hora fora do formato vira vazia. */
  function normalizar(doc) {
    const saida = vazio();
    const dias = doc && typeof doc === 'object' && doc.dias && typeof doc.dias === 'object' ? doc.dias : {};
    DIAS.forEach(([k]) => TURNOS.forEach(([t]) => {
      const f = dias[k] && dias[k][t] ? dias[k][t] : {};
      const lim = (v) => { const s = String(v == null ? '' : v).trim(); return HORA.test(s) ? s : ''; };
      saida.dias[k][t] = { abre: lim(f.abre), fecha: lim(f.fecha) };
    }));
    if (doc && typeof doc.atualizadoEm === 'string') saida.atualizadoEm = doc.atualizadoEm;
    return saida;
  }

  const faixaPreenchida = (f) => Boolean(f && (f.abre || f.fecha));
  const temHorario = (dia) => TURNOS.some(([t]) => faixaPreenchida(dia && dia[t]));
  /** Quantos dos oito dias têm ao menos um turno preenchido. */
  const diasComHorario = (doc) => DIAS.filter(([k]) => temHorario(normalizar(doc).dias[k])).length;

  /** Texto da faixa: "06:00 às 14:00", com "(dia seguinte)" quando fecha antes de abrir; "—" sem horário. */
  function texto(f) {
    if (!f || !f.abre || !f.fecha) return '—';
    return f.abre + ' às ' + f.fecha + (f.fecha < f.abre ? ' (dia seguinte)' : '');
  }

  /** '' quando a faixa vale; senão o motivo: 'incompleta', 'formato' ou 'igual'. */
  function problemaDaFaixa(f) {
    if (!faixaPreenchida(f)) return '';
    if (!f.abre || !f.fecha) return 'incompleta';
    if (!HORA.test(f.abre) || !HORA.test(f.fecha)) return 'formato';
    if (f.abre === f.fecha) return 'igual';
    return '';
  }

  /** Mensagem em português simples do primeiro problema do quadro, ou ''. */
  function validar(doc) {
    const d = doc && doc.dias ? doc.dias : {};
    for (const [k] of DIAS) {
      for (const [t] of TURNOS) {
        const p = problemaDaFaixa(d[k] && d[k][t]);
        const onde = nomeDoDia(k) + ', ' + nomeDoTurno(t);
        if (p === 'incompleta') return onde + ': informe a hora de abrir e a de fechar (ou deixe as duas vazias).';
        if (p === 'formato') return onde + ': use horas de 00:00 a 23:59.';
        if (p === 'igual') return onde + ': a hora de abrir e a de fechar não podem ser iguais.';
      }
    }
    return '';
  }

  /** Copia os três turnos de um dia para outros dias (o esboço: do dia escolhido para os demais). Devolve um quadro novo; não muda o original. */
  function copiar(doc, de, para) {
    const saida = normalizar(doc);
    const origem = saida.dias[de];
    if (!origem) return saida;
    (para || []).forEach((k) => {
      if (k === de || !saida.dias[k]) return;
      saida.dias[k] = { m: { ...origem.m }, t: { ...origem.t }, f: { ...origem.f } };
    });
    return saida;
  }

  /** O que vai para o armazenamento (só os campos conhecidos). */
  function paraSalvar(doc, agoraIso) {
    const n = normalizar(doc);
    return { version: 1, dias: n.dias, atualizadoEm: agoraIso || n.atualizadoEm || '' };
  }

  return { DIAS, TURNOS, HORA, vazio, normalizar, faixaPreenchida, temHorario, diasComHorario, texto, problemaDaFaixa, validar, copiar, paraSalvar, nomeDoDia, nomeDoTurno };
}));
