/*
 * Caixa — Abertura: regras puras (27/11/2026, pedido do Washington). Sem DOM e sem armazenamento; testado em tests/caixa-abertura-regras.cjs.
 * O roteiro da abertura (texto de reforço do Washington): escolher o grupo de vendas e o subgrupo (1M, 1T, 2M…), o sistema recupera o resto
 * (o hardware do subgrupo com o horário do dia), o operador confere o valor inicial e, ao confirmar, nasce um registro de
 * caixa com um IDENTIFICADOR ÚNICO, no formato proposto pelo texto: CX-AAAAMMDD-<subgrupo>-NNN (ex.: CX-20261127-1M-001).
 * O hardware aparece como TNP-PC-CXPDV-1-06:00as13:51-M (hardware, horário do dia da semana em Horários Empresa, letra do turno do subgrupo).
 * Na casca, o subgrupo de PDV (nome no formato "1M", "2T"…) aponta para a conta de posto "Caixa 1M" (contaId cx-1m) que recebe o malote;
 * esse elo é pelo código do nome do subgrupo, só enquanto não há backend (o vínculo por id fica para depois, PROJECT_BRAIN/11).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzCaixaAberturaRegras = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
  const TURNOS = { M: 'Manhã', T: 'Tarde' };

  /** O posto que um subgrupo de PDV representa: "1M" → { numero: 1, letra: 'M', turno: 'Manhã', contaId: 'cx-1m' }; outro nome → null (não é posto de PDV). */
  function postoDoSubgrupo(nome) {
    const m = /^\s*(\d{1,2})\s*([MT])\s*$/i.exec(String(nome == null ? '' : nome));
    if (!m) return null;
    const numero = parseInt(m[1], 10); const letra = m[2].toUpperCase();
    return { numero, letra, turno: TURNOS[letra], contaId: 'cx-' + numero + letra.toLowerCase() };
  }

  /** Só letras e números, em maiúsculas, sem acento ("1m" → "1M"; "Vendas Externas" → "VENDASEXTERNAS"); vazio vira "SG". */
  function sufixoDoSubgrupo(nome) {
    const s = String(nome == null ? '' : nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s || 'SG';
  }

  const dataCompacta = (data) => {
    if (data instanceof Date) return String(data.getFullYear()) + String(data.getMonth() + 1).padStart(2, '0') + String(data.getDate()).padStart(2, '0');
    return String(data || '').replace(/\D/g, '').slice(0, 8);
  };

  /**
   * O identificador do caixa que vai ser aberto: CX-AAAAMMDD-<subgrupo>-NNN. NNN é o próximo número do dia para aquele subgrupo
   * (maior número já usado + 1, a partir de "existentes", a lista de códigos já gravados), com três algarismos.
   */
  function codigoDoCaixa({ data, subgrupo, existentes = [] }) {
    const prefixo = 'CX-' + dataCompacta(data) + '-' + sufixoDoSubgrupo(subgrupo) + '-';
    const maior = (existentes || []).reduce((m, c) => {
      const t = String(c || '');
      if (!t.startsWith(prefixo)) return m;
      const n = /^(\d+)$/.exec(t.slice(prefixo.length));
      return n ? Math.max(m, parseInt(n[1], 10)) : m;
    }, 0);
    return prefixo + String(maior + 1).padStart(3, '0');
  }

  /** "06:00 às 14:00" quando os dois horários são válidos; senão ''. Fechar antes de abrir quer dizer "dia seguinte" (a mesma leitura do VND - Horário de Funcionamento). */
  function horarioDeReferencia(inicio, fim) {
    if (!HORA.test(String(inicio || '')) || !HORA.test(String(fim || ''))) return '';
    return inicio + ' às ' + fim + (fim < inicio ? ' (dia seguinte)' : '');
  }

  /**
   * O horário cadastrado para o dia e o turno: "doc" é o quadro de Horários Empresa (dias × turnos m/t/f; o dia é o da semana do JavaScript, 0 = domingo),
   * "data" é uma Date e "letra" é M ou T (a do subgrupo). Devolve { abre, fecha } ou null se o dia não tem as duas horas válidas nesse turno.
   * Não há calendário de feriados: vale sempre o dia da semana.
   */
  function faixaDoDia(doc, data, letra) {
    const l = String(letra == null ? '' : letra).toLowerCase();
    const t = l === 'm' || l === 't' ? l : '';
    const dia = data instanceof Date ? String(data.getDay()) : String(data);
    const f = t && doc && doc.dias && doc.dias[dia] && doc.dias[dia][t];
    if (!f || !HORA.test(String(f.abre || '')) || !HORA.test(String(f.fecha || ''))) return null;
    return { abre: f.abre, fecha: f.fecha };
  }

  /** O hardware como a Abertura o mostra: <hardware>-<abre>as<fecha>-<turno>, ex.: TNP-PC-CXPDV-1-06:00as13:51-M. Sem horário cadastrado, sai sem a parte do horário; sem hardware, vazio. */
  function rotuloDoHardware({ hardware, faixa, letra }) {
    const h = String(hardware == null ? '' : hardware).trim();
    if (!h) return '';
    return [h, faixa ? faixa.abre + 'as' + faixa.fecha : '', String(letra == null ? '' : letra).toUpperCase()].filter(Boolean).join('-');
  }

  return { HORA, TURNOS, postoDoSubgrupo, sufixoDoSubgrupo, codigoDoCaixa, horarioDeReferencia, faixaDoDia, rotuloDoHardware };
}));
