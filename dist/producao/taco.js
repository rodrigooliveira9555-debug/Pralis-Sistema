/*
 * Tabela TACO e ingredientes da ficha técnica — regras puras (18/11/2026, pedido do Rodrigo).
 * A Tabela TACO (NEPA/UNICAMP) é a tabela de nutrição: cada alimento tem um código oficial e os valores por 100 g. O cadastro
 * de ingredientes é uma lista própria (separada do MER - Produtos, decisão do Rodrigo): cada ingrediente tem nome e pode ser
 * ligado a um alimento da TACO pelo código. Aqui não há cálculo nenhum: só leitura, busca, conferência e importação.
 * Sem tela e sem armazenamento: roda no navegador (window.CicluzTaco) e no Node (testes).
 */
(function (raiz) {
  'use strict';
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();

  /** Nutrientes mostrados no resumo, na ordem do rótulo de alimentos: [chave, nome, unidade]. */
  const RESUMO = [['kcal', 'Valor energético', 'kcal'], ['carboidrato', 'Carboidratos', 'g'], ['proteina', 'Proteínas', 'g'], ['lipideos', 'Gorduras totais', 'g'],
    ['saturados', 'Gorduras saturadas', 'g'], ['fibra', 'Fibra alimentar', 'g'], ['sodio', 'Sódio', 'mg']];
  /** Nome de cada coluna da tabela, para a ficha completa do alimento. */
  const NOMES = { umidade: 'Umidade', kcal: 'Energia', kj: 'Energia', proteina: 'Proteína', lipideos: 'Lipídeos', colesterol: 'Colesterol', carboidrato: 'Carboidrato', fibra: 'Fibra alimentar', cinzas: 'Cinzas',
    calcio: 'Cálcio', magnesio: 'Magnésio', manganes: 'Manganês', fosforo: 'Fósforo', ferro: 'Ferro', sodio: 'Sódio', potassio: 'Potássio', cobre: 'Cobre', zinco: 'Zinco', retinol: 'Retinol', re: 'RE', rae: 'RAE',
    tiamina: 'Tiamina', riboflavina: 'Riboflavina', piridoxina: 'Piridoxina', niacina: 'Niacina', vitaminaC: 'Vitamina C', saturados: 'Saturados', monoinsaturados: 'Monoinsaturados', poliinsaturados: 'Poli-insaturados' };

  /** Transforma a tabela compacta ({ colunas: [[chave, unidade]], linhas: [[código, descrição, grupo, ...valores]] }) em itens. */
  function itensDe(tabela) {
    if (!tabela || !Array.isArray(tabela.linhas) || !Array.isArray(tabela.colunas)) return [];
    return tabela.linhas.map((l) => ({ codigo: l[0], descricao: l[1], grupo: l[2], valores: Object.fromEntries(tabela.colunas.map(([k], i) => [k, l[3 + i] === undefined ? null : l[3 + i]])) }));
  }
  /** Valor para mostrar: número com vírgula e a unidade; "Tr" = traço; sem valor = "não analisado". */
  function valorTexto(v, unidade) {
    if (v === null || v === undefined || v === '') return 'não analisado';
    if (typeof v === 'number') return String(v).replace('.', ',') + (unidade ? ' ' + unidade : '');
    if (v === 'Tr') return 'traço';
    return String(v);
  }
  /** Linhas [nome, texto] do resumo nutricional de um alimento (por 100 g). */
  const resumo = (item) => (item ? RESUMO.map(([k, nome, un]) => [nome, valorTexto(item.valores[k], un)]) : []);
  /** Todas as linhas [nome, texto] do alimento, na ordem das colunas da tabela. */
  const completo = (item, colunas) => (item ? (colunas || []).map(([k, un]) => [(NOMES[k] || k) + (k === 'kj' ? ' (kJ)' : ''), valorTexto(item.valores[k], un)]) : []);
  const porCodigo = (itens, codigo) => (itens || []).find((i) => String(i.codigo) === String(codigo == null ? '' : codigo).trim()) || null;
  /** Busca por código exato ou por pedaços da descrição (sem diferenciar acento nem maiúscula); todos os pedaços precisam aparecer. */
  function buscar(itens, texto, limite = 30) {
    const t = semAcento(texto); if (!t) return (itens || []).slice(0, limite);
    if (/^\d+$/.test(t)) { const exato = porCodigo(itens, t); return exato ? [exato] : []; }
    const partes = t.split(/[\s,]+/).filter(Boolean);
    return (itens || []).filter((i) => { const d = semAcento(i.descricao); return partes.every((p) => d.includes(p)); }).slice(0, limite);
  }

  /** O que impede salvar o ingrediente, ou ''. lista: os ingredientes já gravados; itens: a tabela TACO em uso. */
  function validarIngrediente(ing, lista, itens) {
    const nome = String((ing && ing.nome) || '').trim();
    if (!nome) return 'Informe o nome do ingrediente.';
    if (nome.length > 80) return 'O nome do ingrediente deve ter no máximo 80 caracteres.';
    if ((lista || []).some((x) => x.id !== ing.id && semAcento(x.nome) === semAcento(nome))) return 'Já existe um ingrediente com este nome.';
    const cod = ing.tacoCodigo;
    if (cod !== null && cod !== undefined && cod !== '' && !porCodigo(itens, cod)) return 'O código ' + cod + ' não existe na Tabela TACO em uso.';
    return '';
  }

  /**
   * Importação de uma tabela em CSV (separado por ponto e vírgula), para atualizar a tabela em uso. A primeira linha é o
   * cabeçalho: "codigo;descricao;grupo" e, em seguida, as colunas de valores com os mesmos nomes da tabela oficial (kcal,
   * proteina, lipideos, carboidrato, fibra, sodio…). Número com vírgula ou ponto; "Tr" é traço; vazio ou "NA" é não analisado.
   * Devolve { tabela, erros }: com qualquer erro, nada é importado.
   */
  function lerCsv(texto, colunasOficiais) {
    const linhas = String(texto || '').replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linhas.length < 2) return { tabela: null, erros: ['O arquivo está vazio: precisa do cabeçalho e de pelo menos um alimento.'] };
    const cab = linhas[0].split(';').map((c) => semAcento(c));
    const erros = [];
    ['codigo', 'descricao'].forEach((c) => { if (!cab.includes(c)) erros.push('Falta a coluna "' + c + '" no cabeçalho.'); });
    const unidades = Object.fromEntries((colunasOficiais || []).map(([k, u]) => [semAcento(k), [k, u]]));
    const colunas = cab.map((c, i) => (unidades[c] ? { i, chave: unidades[c][0], unidade: unidades[c][1] } : null)).filter(Boolean);
    if (!colunas.length) erros.push('Nenhuma coluna de valores reconhecida (ex.: kcal, proteina, lipideos, carboidrato, fibra, sodio).');
    if (erros.length) return { tabela: null, erros };
    const iCod = cab.indexOf('codigo'); const iDesc = cab.indexOf('descricao'); const iGrupo = cab.indexOf('grupo');
    const vistos = new Set(); const saida = [];
    linhas.slice(1).forEach((l, n) => {
      const c = l.split(';').map((x) => x.trim()); const onde = 'Linha ' + (n + 2) + ': ';
      if (!/^\d+$/.test(c[iCod] || '')) { erros.push(onde + 'o código deve ser um número inteiro.'); return; }
      if (vistos.has(c[iCod])) { erros.push(onde + 'código ' + c[iCod] + ' repetido.'); return; }
      if (!c[iDesc]) { erros.push(onde + 'falta a descrição do alimento.'); return; }
      vistos.add(c[iCod]);
      const valores = colunas.map(({ i, chave }) => {
        const v = c[i] === undefined ? '' : c[i];
        if (v === '' || /^na$/i.test(v)) return null;
        if (/^tr$/i.test(v)) return 'Tr';
        const num = Number(v.replace(',', '.'));
        if (Number.isNaN(num)) { erros.push(onde + 'valor "' + v + '" inválido na coluna ' + chave + '.'); return null; }
        return Math.round(num * 100) / 100;
      });
      saida.push([Number(c[iCod]), c[iDesc], iGrupo >= 0 ? c[iGrupo] || '' : '', ...valores]);
    });
    if (erros.length) return { tabela: null, erros: erros.slice(0, 12) };
    return { tabela: { colunas: colunas.map((x) => [x.chave, x.unidade]), linhas: saida }, erros: [] };
  }
  /** CSV-modelo (só o cabeçalho e um exemplo da própria tabela oficial), para quem for importar. */
  function modeloCsv(tabela) {
    const cols = (tabela && tabela.colunas) || [];
    const cab = ['codigo', 'descricao', 'grupo', ...cols.map(([k]) => k)].join(';');
    const l = tabela && tabela.linhas && tabela.linhas[0];
    return cab + '\r\n' + (l ? l.map((v) => (v === null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v))).join(';') + '\r\n' : '');
  }

  const api = { RESUMO, NOMES, itensDe, valorTexto, resumo, completo, porCodigo, buscar, validarIngrediente, lerCsv, modeloCsv, semAcento };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.CicluzTaco = api;
})(typeof window !== 'undefined' ? window : globalThis);
