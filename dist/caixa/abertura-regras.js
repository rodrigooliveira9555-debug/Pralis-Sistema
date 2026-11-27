/*
 * Caixa — Abertura: regras puras (27/11/2026, pedido do Washington). Sem DOM e sem armazenamento; testado em tests/caixa-abertura-regras.cjs.
 * O roteiro da abertura (texto de reforço do Washington): escolher o grupo de vendas e o subgrupo (1M, 1T, 2M…), o sistema recupera o resto
 * (hardware e horário de referência do subgrupo, operador, data), o operador confere o valor inicial e, ao confirmar, nasce um registro de
 * caixa com um IDENTIFICADOR ÚNICO, no formato proposto pelo texto: CX-AAAAMMDD-<subgrupo>-NNN (ex.: CX-20261127-1M-001).
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

  /** "06:00 às 14:00" quando o subgrupo tem os dois horários válidos; senão ''. Fechar antes de abrir quer dizer "dia seguinte" (a mesma leitura do VND - Horário de Funcionamento). */
  function horarioDeReferencia(inicio, fim) {
    if (!HORA.test(String(inicio || '')) || !HORA.test(String(fim || ''))) return '';
    return inicio + ' às ' + fim + (fim < inicio ? ' (dia seguinte)' : '');
  }

  return { HORA, TURNOS, postoDoSubgrupo, sufixoDoSubgrupo, codigoDoCaixa, horarioDeReferencia };
}));
