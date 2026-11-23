/*
 * ARQUIVO GERADO — não edite. Fonte: servidor/shared/src/agenda/regras.ts
 * Gerar de novo: node servidor/scripts/gerar-regras-agenda.mjs
 * Regra da Agenda escrita uma vez (quem pode o quê, avaliação, validação, repetição).
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

  // servidor/shared/src/agenda/regras.ts
  var regras_exports = {};
  __export(regras_exports, {
    ORDENACOES: () => ORDENACOES,
    PERMISSOES: () => PERMISSOES,
    PRIORIDADES: () => PRIORIDADES,
    REPETICOES: () => REPETICOES,
    TIPOS_AVALIACAO: () => TIPOS_AVALIACAO,
    acesso: () => acesso,
    comparativo: () => comparativo,
    dataValida: () => dataValida,
    diaDaSemana: () => diaDaSemana,
    horaValida: () => horaValida,
    inicioDaSemana: () => inicioDaSemana,
    isoData: () => isoData,
    normalizarEtiquetas: () => normalizarEtiquetas,
    normalizarPessoas: () => normalizarPessoas,
    pessoaResponsavel: () => pessoaResponsavel,
    podeAvaliar: () => podeAvaliar,
    proxima: () => proxima,
    responsaveis: () => responsaveis,
    somarDias: () => somarDias,
    somarMeses: () => somarMeses,
    temPonto: () => temPonto,
    temRepeticao: () => temRepeticao,
    validar: () => validar,
    valorValido: () => valorValido
  });
  var PRIORIDADES = [
    ["muito-baixa", "Muito baixa"],
    ["baixa", "Baixa"],
    ["normal", "Normal"],
    ["alta", "Alta"],
    ["muito-alta", "Muito alta"]
  ];
  var PESO_PRIORIDADE = Object.fromEntries(PRIORIDADES.map(([id], i) => [id, i]));
  var REPETICOES = [
    ["nunca", "Nunca"],
    ["hora", "De hora em hora"],
    ["dia", "Todo dia"],
    ["dias-uteis", "Dias úteis (seg. a sex.)"],
    ["fins-de-semana", "Fins de semana"],
    ["semana", "Toda semana"],
    ["quinzena", "A cada 2 semanas"],
    ["mes", "Todo mês"],
    ["trimestre", "A cada 3 meses"],
    ["semestre", "A cada 6 meses"],
    ["ano", "Todo ano"],
    ["personalizada", "Personalizada"]
  ];
  var ORDENACOES = [
    ["manual", "Manual"],
    ["data", "Data"],
    ["criacao", "Criação"],
    ["prioridade", "Prioridade"],
    ["titulo", "Título"]
  ];
  var PERMISSOES = [["ver", "Ver"], ["editar", "Editar"], ["concluir", "Concluir"], ["excluir", "Excluir"]];
  var TIPOS_AVALIACAO = [
    ["", "Sem avaliação"],
    ["estrelas", "Estrelas (1 a 5)"],
    ["niveis", "5 níveis"],
    ["nps", "NPS (0 a 10)"],
    ["feito", "Feito (sim ou não)"]
  ];
  var doisDigitos = (n) => String(n).padStart(2, "0");
  var isoData = (d) => d.getFullYear() + "-" + doisDigitos(d.getMonth() + 1) + "-" + doisDigitos(d.getDate());
  var paraData = (iso) => {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d, 12);
  };
  function somarDias(iso, n) {
    const d = paraData(iso);
    d.setDate(d.getDate() + n);
    return isoData(d);
  }
  var ultimoDia = (ano, mes0) => new Date(ano, mes0 + 1, 0).getDate();
  function somarMeses(iso, n, diaAlvo) {
    const d = paraData(iso);
    const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    alvo.setDate(Math.min(diaAlvo || d.getDate(), ultimoDia(alvo.getFullYear(), alvo.getMonth())));
    return isoData(alvo);
  }
  var diaDaSemana = (iso) => paraData(iso).getDay();
  var inicioDaSemana = (iso) => somarDias(iso, -diaDaSemana(iso));
  var minutos = (h) => h ? +h.slice(0, 2) * 60 + +h.slice(3, 5) : 0;
  var paraHora = (m) => doisDigitos(Math.floor(m / 60)) + ":" + doisDigitos(m % 60);
  function dataValida(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m || !iso) return false;
    const d = paraData(iso);
    return d.getFullYear() === +(m[1] ?? "") && d.getMonth() + 1 === +(m[2] ?? "") && d.getDate() === +(m[3] ?? "");
  }
  var horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h || "");
  var temRepeticao = (item) => Boolean(item.repeticao && item.repeticao.tipo && item.repeticao.tipo !== "nunca");
  function proxima(item, de = { data: item.data, hora: item.hora }) {
    const r = item.repeticao;
    if (!r || !temRepeticao(item) || !de.data) return null;
    const ancora = r.ancora || item.data || de.data;
    const diaAlvo = +ancora.slice(8, 10);
    const n = Math.max(1, +(r.intervalo ?? 1) || 1);
    let data = de.data;
    let hora = de.hora;
    const proximoDiaEm = (dias) => {
      let d = somarDias(data, 1);
      while (!dias.includes(diaDaSemana(d))) d = somarDias(d, 1);
      return d;
    };
    switch (r.tipo) {
      case "hora":
        if (!hora) {
          data = somarDias(data, 1);
          break;
        }
        if (minutos(hora) + 60 >= 1440) {
          data = somarDias(data, 1);
          hora = paraHora(minutos(hora) + 60 - 1440);
        } else hora = paraHora(minutos(hora) + 60);
        break;
      case "dia":
        data = somarDias(data, 1);
        break;
      case "dias-uteis":
        data = proximoDiaEm([1, 2, 3, 4, 5]);
        break;
      case "fins-de-semana":
        data = proximoDiaEm([0, 6]);
        break;
      case "semana":
        data = somarDias(data, 7);
        break;
      case "quinzena":
        data = somarDias(data, 14);
        break;
      case "mes":
        data = somarMeses(data, 1, diaAlvo);
        break;
      case "trimestre":
        data = somarMeses(data, 3, diaAlvo);
        break;
      case "semestre":
        data = somarMeses(data, 6, diaAlvo);
        break;
      case "ano":
        data = somarMeses(data, 12, diaAlvo);
        break;
      case "personalizada": {
        const u = r.unidade || "semana";
        if (u === "dia") data = somarDias(data, n);
        else if (u === "mes") data = somarMeses(data, n, diaAlvo);
        else if (u === "ano") data = somarMeses(data, 12 * n, diaAlvo);
        else {
          const dias = (r.diasSemana && r.diasSemana.length ? r.diasSemana : [diaDaSemana(ancora)]).slice().sort();
          const hojeNaSemana = diaDaSemana(data);
          const resto = dias.filter((d) => d > hojeNaSemana);
          data = resto.length ? somarDias(data, (resto[0] ?? 0) - hojeNaSemana) : somarDias(inicioDaSemana(data), 7 * n + (dias[0] ?? 0));
        }
        break;
      }
      default:
        return null;
    }
    const fim = r.fim || { tipo: "nunca" };
    if (fim.tipo === "data" && fim.data && data > fim.data) return null;
    if (fim.tipo === "vezes" && (r.feitas || 0) + 1 >= Math.max(1, +(fim.vezes ?? 1) || 1)) return null;
    return { data, hora };
  }
  var TUDO = { ver: true, editar: true, concluir: true, excluir: true };
  function normalizarPessoas(lista) {
    const vistos = /* @__PURE__ */ new Set();
    return (lista || []).filter((p) => Boolean(p && p.id && !vistos.has(p.id) && vistos.add(p.id))).map((p) => {
      const x = { id: String(p.id), responsavel: Boolean(p.responsavel), ver: Boolean(p.ver), editar: Boolean(p.editar), concluir: Boolean(p.concluir), excluir: Boolean(p.excluir) };
      if (x.responsavel || x.editar || x.concluir || x.excluir) x.ver = true;
      return x;
    });
  }
  var pessoaResponsavel = (id) => ({ id, responsavel: true, ver: true, editar: true, concluir: true, excluir: false });
  var responsaveis = (item) => (item.pessoas || []).filter((p) => p.responsavel).map((p) => p.id);
  function acesso(item, usuarioId) {
    if (!usuarioId || !item.criadoPor || item.criadoPor === usuarioId) return { ...TUDO, gestor: true, responsavel: responsaveis(item).includes(usuarioId) };
    const p = (item.pessoas || []).find((x) => x.id === usuarioId);
    if (!p) return { ver: false, editar: false, concluir: false, excluir: false, gestor: false, responsavel: false };
    return {
      ver: Boolean(p.ver || p.editar || p.concluir || p.excluir || p.responsavel),
      editar: Boolean(p.editar),
      concluir: Boolean(p.concluir),
      excluir: Boolean(p.excluir),
      gestor: false,
      responsavel: Boolean(p.responsavel)
    };
  }
  function valorValido(tipo, v) {
    if (typeof v !== "number" || !Number.isInteger(v)) return false;
    if (tipo === "estrelas" || tipo === "niveis") return v >= 1 && v <= 5;
    if (tipo === "nps") return v >= 0 && v <= 10;
    if (tipo === "feito") return v === 0 || v === 1;
    return false;
  }
  function podeAvaliar(item, usuarioId, avaliadoId) {
    const tipo = item.avaliacao && item.avaliacao.tipo;
    if (!tipo) return { erro: "Este compromisso não tem avaliação." };
    if (!item.concluida) return { erro: "A avaliação é feita depois de concluído." };
    if (!usuarioId) return { erro: "Entre com seu usuário para avaliar." };
    if (!responsaveis(item).includes(avaliadoId)) return { erro: "Só a execução dos responsáveis é avaliada." };
    const papel = item.criadoPor === usuarioId ? "gestor" : usuarioId === avaliadoId ? "auto" : "";
    if (!papel) return { erro: "Só o gestor e o próprio responsável avaliam." };
    if ((item.avaliacao?.notas || []).some((n) => n.avaliadoId === avaliadoId && n.papel === papel)) return { erro: "Avaliação já registrada; ela não muda." };
    return { papel };
  }
  function comparativo(item, usuarioId) {
    const notas = item.avaliacao && item.avaliacao.notas || [];
    const gestor = !usuarioId || !item.criadoPor || item.criadoPor === usuarioId;
    return responsaveis(item).filter((id) => gestor || id === usuarioId).map((id) => ({
      id,
      gestor: gestor ? notas.find((n) => n.avaliadoId === id && n.papel === "gestor") || null : null,
      auto: notas.find((n) => n.avaliadoId === id && n.papel === "auto") || null
    }));
  }
  var temPonto = (loc) => Boolean(loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng));
  function validar(item) {
    const titulo = String(item.titulo || "").trim();
    if (!titulo) return "Informe o título do compromisso.";
    if (titulo.length > 200) return "O título passa de 200 letras.";
    if (item.data && !dataValida(item.data)) return "Informe uma data válida (DD/MM/AA).";
    if (item.hora && !horaValida(item.hora)) return "Informe uma hora válida (HH:MM).";
    if (item.hora && !item.data) return "Para marcar a hora, informe também a data.";
    if (item.horaFim && !horaValida(item.horaFim)) return "Informe uma hora de término válida (HH:MM).";
    if (item.horaFim && !item.hora) return "Para marcar o término, informe a hora de início.";
    if (item.horaFim && item.hora && item.horaFim <= item.hora) return "O término precisa ser depois do início.";
    if (item.prioridade && !(item.prioridade in PESO_PRIORIDADE)) return "Prioridade inválida.";
    if ((item.subtarefas || []).some((s) => !String(s.titulo || "").trim())) return "Há subtarefa sem nome.";
    if (item.url && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(item.url)) return "Informe o endereço completo, começando com http:// ou https://.";
    const r = item.repeticao;
    if (r && r.tipo && r.tipo !== "nunca") {
      if (!item.data) return "Para repetir, informe a data.";
      if (r.tipo === "hora" && !item.hora) return "Para repetir de hora em hora, informe a hora.";
      if (r.tipo === "personalizada" && !(+(r.intervalo ?? NaN) >= 1 && +(r.intervalo ?? NaN) <= 99)) return "Informe de quanto em quanto tempo repete (1 a 99).";
      if (r.fim && r.fim.tipo === "data" && (!dataValida(r.fim.data) || (r.fim.data ?? "") < item.data)) return "O fim da repetição precisa ser uma data a partir do primeiro dia.";
      if (r.fim && r.fim.tipo === "vezes" && !(+(r.fim.vezes ?? NaN) >= 1 && +(r.fim.vezes ?? NaN) <= 999)) return "Informe quantas vezes repete (1 a 999).";
    }
    if (item.alerta !== null && item.alerta !== void 0 && item.alerta !== "" && !item.data) return "Para o alerta, informe a data.";
    const loc = item.localizacao;
    if (loc && (loc.lat !== void 0 || loc.lng !== void 0) && !(temPonto(loc) && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180)) return "O ponto marcado no mapa é inválido.";
    if (loc && loc.aviso && !temPonto(loc)) return "Para avisar ao entrar ou sair, marque o lugar no mapa.";
    if (loc && loc.aviso && !["entrar", "sair"].includes(loc.aviso)) return "Aviso por lugar inválido.";
    if (loc && loc.aviso && !(+(loc.raio ?? NaN) >= 50 && +(loc.raio ?? NaN) <= 5e4)) return "Informe o raio do aviso.";
    if (item.avaliacao && item.avaliacao.tipo && !TIPOS_AVALIACAO.some(([k]) => k === item.avaliacao?.tipo)) return "Tipo de avaliação inválido.";
    return "";
  }
  var MARCAS = new RegExp("[" + String.fromCharCode(768) + "-" + String.fromCharCode(879) + "]", "g");
  var dobrar = (s) => String(s || "").normalize("NFD").replace(MARCAS, "").toLocaleLowerCase("pt-BR");
  function normalizarEtiquetas(lista) {
    const vistas = /* @__PURE__ */ new Set();
    const saida = [];
    [].concat(lista || []).forEach((bruta) => {
      String(bruta || "").split(/[,;]/).forEach((parte) => {
        const t = parte.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 30);
        const k = dobrar(t);
        if (t && !vistas.has(k)) {
          vistas.add(k);
          saida.push(t);
        }
      });
    });
    return saida;
  }
  return __toCommonJS(regras_exports);
})();
  if (typeof module !== 'undefined' && module.exports) module.exports = regras;
  root.CicluzAgendaRegras = regras;
})(typeof window !== 'undefined' ? window : globalThis);
