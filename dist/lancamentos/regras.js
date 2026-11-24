/*
 * ARQUIVO GERADO — não edite. Fonte: servidor/shared/src/lancamentos/regras-site.ts
 * Gerar de novo: node servidor/scripts/gerar-regras-lancamentos.mjs
 * Conta de dinheiro (juros, discriminação com rateio) e leitura de números digitados, escritas uma vez para o servidor e para a tela.
 */
(function (root) {
  'use strict';
"use strict";
var regras = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // servidor/shared/src/lancamentos/regras-site.ts
  var regras_site_exports = {};
  __export(regras_site_exports, {
    apiParaDinheiro: () => apiParaDinheiro,
    calcularDiscriminacao: () => calcularDiscriminacao,
    campoInvalido: () => campoInvalido,
    diaNegocio: () => diaNegocio,
    dinheiroParaApi: () => dinheiroParaApi,
    jurosCentavos: () => jurosCentavos,
    numeroParaApi: () => numeroParaApi,
    paraCentavos: () => paraCentavos
  });

  // servidor/shared/src/lancamentos/dinheiro.ts
  function paraCentavos(valor) {
    const texto = String(valor ?? 0).trim();
    if (!texto) return 0;
    const negativo = texto.startsWith("-");
    const normalizado = (negativo ? texto.slice(1) : texto).replace(",", ".");
    const [inteiroRaw = "0", decimalRaw = ""] = normalizado.split(".");
    const inteiro = Number.parseInt(inteiroRaw.replace(/\D/g, "") || "0", 10);
    const decimal = Number.parseInt(decimalRaw.padEnd(2, "0").slice(0, 2), 10) || 0;
    const centavos = inteiro * 100 + decimal;
    return negativo ? -centavos : centavos;
  }
  function pontosPercentuaisEmDezMilesimos(informado) {
    const texto = String(informado ?? 0).trim().replace(",", ".");
    const numero2 = Number(texto);
    return Number.isFinite(numero2) ? Math.round(numero2 * 1e4) : 0;
  }
  function jurosCentavos(entrada) {
    if (!entrada.jurosTipo) return 0;
    if (entrada.jurosTipo === "valor") return Math.max(0, paraCentavos(entrada.jurosValorInformado));
    const base = paraCentavos(entrada.valorOriginal);
    const pontos = pontosPercentuaisEmDezMilesimos(entrada.jurosValorInformado);
    if (base <= 0 || pontos <= 0) return 0;
    return Math.round(base * pontos / 1e6);
  }

  // servidor/shared/src/lancamentos/discriminacao.ts
  function arredondar(valor) {
    return Math.round(valor);
  }
  function naoNegativo(centavos) {
    return centavos > 0 ? centavos : 0;
  }
  function numero(valor) {
    if (valor === null || valor === void 0 || valor === "") return 0;
    const convertido = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }
  function descontoCentavos(base, tipo, valor) {
    if (!tipo || valor === null || valor === void 0 || valor === "") return 0;
    if (tipo === "percentual") return arredondar(base * numero(valor) / 100);
    return paraCentavos(valor);
  }
  function calcularTotaisDoItem(item) {
    const quantidade = numero(item.quantidade);
    const unitarioCentavos = numero(item.valorUnitario) * 100;
    const valorBrutoCentavos = arredondar(quantidade * unitarioCentavos);
    const descontoUnitario = descontoCentavos(unitarioCentavos, item.descontoTipo, item.descontoValor);
    const aposNivel1 = naoNegativo(valorBrutoCentavos - arredondar(descontoUnitario * quantidade));
    const descontoTotal = descontoCentavos(aposNivel1, item.descontoTotalTipo, item.descontoTotalValor);
    return { quantidade, valorBrutoCentavos, valorTotalCentavos: naoNegativo(aposNivel1 - descontoTotal) };
  }
  function ratearCentavos(total, pesos) {
    const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);
    if (total <= 0 || somaPesos <= 0) return pesos.map(() => 0);
    const partes = pesos.map((peso) => Math.floor(total * peso / somaPesos));
    const distribuido = partes.reduce((soma, parte) => soma + parte, 0);
    const ultimo = partes.length - 1;
    partes[ultimo] = (partes[ultimo] ?? 0) + (total - distribuido);
    return partes;
  }
  function calcularDiscriminacao(entrada) {
    const totais = entrada.itens.map(calcularTotaisDoItem);
    const totalItensCentavos = totais.reduce((soma, item) => soma + item.valorTotalCentavos, 0);
    const descontoGeralBruto = descontoCentavos(
      totalItensCentavos,
      entrada.descontoGeralTipo,
      entrada.descontoGeralValor
    );
    const descontoGeralCentavos = Math.min(descontoGeralBruto, totalItensCentavos);
    const rateio = ratearCentavos(
      descontoGeralCentavos,
      totais.map((item) => item.valorTotalCentavos)
    );
    const itens = totais.map((item, indice) => {
      const rateioDescontoGeralCentavos = rateio[indice] ?? 0;
      const valorTotalComDescontoCentavos = naoNegativo(item.valorTotalCentavos - rateioDescontoGeralCentavos);
      return {
        valorBrutoCentavos: item.valorBrutoCentavos,
        valorTotalCentavos: item.valorTotalCentavos,
        rateioDescontoGeralCentavos,
        valorTotalComDescontoCentavos,
        // DERIVADO — ver a nota de fonte da verdade no topo do arquivo.
        valorUnitarioComDescontoCentavos: item.quantidade > 0 ? arredondar(valorTotalComDescontoCentavos / item.quantidade) : 0
      };
    });
    return {
      itens,
      totalItensCentavos,
      descontoGeralCentavos,
      totalComDescontoCentavos: totalItensCentavos - descontoGeralCentavos
    };
  }

  // servidor/shared/src/lancamentos/datas.ts
  var FUSO_NEGOCIO = "America/Sao_Paulo";
  var formatadorDiaNegocio = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  function diaNegocio(instante) {
    return formatadorDiaNegocio.format(new Date(instante));
  }

  // servidor/shared/src/lancamentos/entrada.ts
  function numeroParaApi(texto, casas) {
    const limpo = (texto ?? "").replace(/^R\$\s*/, "").replace(/\s/g, "");
    if (!limpo) return null;
    let normalizado;
    if (limpo.includes(",")) {
      if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(limpo)) return null;
      normalizado = limpo.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
      normalizado = limpo.replace(/\./g, "");
    } else {
      normalizado = limpo;
    }
    const [, decimais = ""] = normalizado.split(".");
    if (!/^\d+(\.\d+)?$/.test(normalizado) || decimais.length > casas) return null;
    return normalizado;
  }
  function dinheiroParaApi(texto) {
    return numeroParaApi(texto, 2);
  }
  function campoInvalido(texto, casas) {
    return Boolean((texto ?? "").trim()) && numeroParaApi(texto, casas) === null;
  }
  function apiParaDinheiro(valor) {
    if (valor === null || valor === void 0 || valor === "") return "";
    const n = Number(valor);
    return Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "";
  }
  return __toCommonJS(regras_site_exports);
})();
  if (typeof module !== 'undefined' && module.exports) module.exports = regras;
  root.CicluzLancamentosRegras = regras;
})(typeof window !== 'undefined' ? window : globalThis);
