/*
 * Área ConPlus — os eventos variáveis configurados no Zen para cada empresa, como a ConPlus mandou
 * (eventos_variaveis_por_empresa.csv, WorkDrive "API nWeb", lido em 27/11/2026). Só leitura: quem muda é a ConPlus.
 * Cada evento: código do Questor, descrição, sequência, filial, unidade (Hora, Dia ou Valor), tipo (H = horas, R = referência,
 * V = valor) e natureza. Segundo a ConPlus, o lançamento precisa bater no código E na unidade configurada no Zen.
 * Empresa identificada pela razão social do arquivo (o CSV não traz CNPJ).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzConplusEventos = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TNP = 'COMERCIAL TUDONUPAO LTDA'; const LIS = 'COMERCIAL LISBOA ALIMENTOS LTDA'; const BUR = 'BURPIZ LTDA';
  const H = ['Hora', 'H']; const R = ['Dia', 'R']; const V = ['Valor', 'V'];
  // [empresa, código, descrição, sequência, filial, unidade, natureza]
  const LINHAS = [
    [BUR, '35', 'Horas Extras 50% Diurnas', '1', '1', H, 'Provento'], [BUR, '49', 'Horas Extras 100% Diurnas', '1', '1', H, 'Provento'],
    [BUR, '63', 'Horas Atrasos Diurnas', '1', '1', H, 'Desconto'], [BUR, '97', 'Feriado', '1', '1', R, 'Provento'],
    [BUR, '109', 'Horas Trabalhadas Diurnas', '1', '1', H, 'Provento'], [BUR, '317', 'Adicional Noturno', '1', '1', H, 'Provento'],
    [BUR, '800', 'Desconto de Vales', '2', '1', V, 'Desconto'], [BUR, '1073', 'Dias faltas', '1', '1', R, 'Desconto'],
    [BUR, '1087', 'DSR Dias Faltas', '1', '1', R, 'Desconto'],
    [LIS, '35', 'Horas Extras 50% Diurnas', '1', '1', H, 'Provento'], [LIS, '36', 'Horas Extras 50% Noturnas', '1', '1', H, 'Provento'],
    [LIS, '49', 'Horas Extras 100% Diurnas', '1', '1', H, 'Provento'], [LIS, '50', 'Horas Extras 100% Noturnas', '1', '1', H, 'Provento'],
    [LIS, '63', 'Horas Atrasos Diurnas', '1', '1', H, 'Desconto'], [LIS, '97', 'Feriado', '1', '1', R, 'Provento'],
    [LIS, '105', 'Vale Compras', '1', '1', V, 'Desconto'], [LIS, '109', 'Horas Trabalhadas Diurnas', '1', '1', H, 'Provento'],
    [LIS, '317', 'Adicional Noturno', '1', '1', H, 'Provento'], [LIS, '712', 'Feriado horas', '1', '1', H, 'Provento'],
    [LIS, '800', 'Desconto de Vales', '1', '1', V, 'Desconto'], [LIS, '842', 'Assiduidade', '1', '1', V, 'Provento'],
    [LIS, '1073', 'Dias faltas', '1', '1', R, 'Desconto'], [LIS, '1087', 'DSR Dias Faltas', '1', '1', R, 'Desconto'],
    [LIS, '1407', 'Desconto Consumo', '1', '1', V, 'Desconto'],
    [TNP, '35', 'Horas Extras 50% Diurnas', '1', '1', H, 'Provento'], [TNP, '36', 'Horas Extras 50% Noturnas', '1', '1', H, 'Provento'],
    [TNP, '49', 'Horas Extras 100% Diurnas', '1', '1', H, 'Provento'], [TNP, '50', 'Horas Extras 100% Noturnas', '1', '1', H, 'Provento'],
    [TNP, '63', 'Horas Atrasos Diurnas', '1', '1', H, 'Desconto'], [TNP, '97', 'Feriado', '1', '1', R, 'Provento'],
    [TNP, '109', 'Horas Trabalhadas Diurnas', '1', '1', H, 'Provento'], [TNP, '317', 'Adicional Noturno', '1', '1', H, 'Provento'],
    [TNP, '708', 'Premio', '1', '1', V, 'Provento'], [TNP, '800', 'Desconto de Vales', '1', '1', V, 'Desconto'],
    [TNP, '842', 'Assiduidade', '1', '1', V, 'Provento'], [TNP, '1073', 'Dias faltas', '1', '1', R, 'Desconto'],
    [TNP, '1087', 'DSR Dias Faltas', '1', '1', R, 'Desconto'], [TNP, '1407', 'Desconto Consumo', '1', '1', V, 'Desconto'],
  ];
  const EVENTOS = LINHAS.map(([empresa, codigo, descricao, sequencia, filial, [unidade, tipo], natureza]) => ({ empresa, codigo, descricao, sequencia, filial, unidade, tipo, natureza }));
  const EMPRESAS = [TNP, LIS, BUR];
  return { EVENTOS, EMPRESAS, FONTE: 'eventos_variaveis_por_empresa.csv da ConPlus (WorkDrive, 27/11/2026)' };
}));
