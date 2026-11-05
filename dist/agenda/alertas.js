/*
 * Agenda — alertas (o aviso do Lembretes/Calendário). Com o S2 aberto, a cada 30 s confere os
 * compromissos com alerta vencido e mostra um aviso na tela (Concluir, Adiar 15 min / 1 h / amanhã,
 * Abrir) e, se a pessoa permitir, a notificação do aparelho.
 * Limite honesto: um site só avisa enquanto está aberto (aba ou app instalado); com tudo fechado,
 * só um aplicativo nativo ou notificação pelo servidor (push) avisaria.
 * Aviso por lugar (Ao entrar / Ao sair): com a localização permitida, o aparelho acompanha a posição
 * enquanto o S2 está aberto e avisa ao cruzar o raio (a posição não é gravada nem enviada a ninguém).
 * Quais alertas já foram mostrados fica no aparelho (preferência local, não é dado da empresa).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const A = window.CicluzAgendaDados;
  const { el, botao } = U;
  const CHAVE = 'cicluz-agenda-alertas-mostrados';
  const JANELA_MS = 12 * 60 * 60 * 1000; // alerta com mais de 12 h de atraso não aparece (evita enxurrada)

  let mostrados = {};
  try { mostrados = JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) { mostrados = {}; }
  const guardar = () => {
    const limite = Date.now() - 7 * 86400000;
    Object.keys(mostrados).forEach((k) => { if (mostrados[k] < limite) delete mostrados[k]; });
    try { localStorage.setItem(CHAVE, JSON.stringify(mostrados)); } catch (e) { /* segue na memória */ }
  };

  const suportado = () => typeof Notification !== 'undefined';

  /* ---------- Aviso por lugar ---------- */
  const comLugar = () => A.dados.itens.filter((i) => !i.concluida && i.localizacao && i.localizacao.aviso && D.temPonto(i.localizacao));
  const dentro = {}; // id → estava dentro do raio (só na memória)
  let vigia = null;
  let localizacaoLiberada = false;
  /** Nova posição do aparelho: confere quem entrou ou saiu do raio. Devolve quantos avisou. */
  function posicao(p) {
    let n = 0;
    comLugar().forEach((i) => {
      const r = D.cruzouLugar(i, p, dentro[i.id]);
      dentro[i.id] = r.dentro;
      if (r.disparar) { n++; mostrar(i, 'lugar@' + i.id + '@' + Date.now(), i.localizacao.aviso === 'entrar' ? 'Você chegou: ' + (i.local || 'lugar marcado') : 'Você saiu: ' + (i.local || 'lugar marcado')); }
    });
    return n;
  }
  function vigiar() {
    if (vigia !== null || !navigator.geolocation || !comLugar().length) return;
    vigia = navigator.geolocation.watchPosition((pos) => { localizacaoLiberada = true; posicao({ lat: pos.coords.latitude, lng: pos.coords.longitude }); }, (e) => { if (e.code === 1) { navigator.geolocation.clearWatch(vigia); vigia = null; } }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 60000 });
  }
  // Só começa sozinho se a localização já foi liberada antes (não pede permissão sem a pessoa tocar).
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then((s) => { localizacaoLiberada = s.state === 'granted'; if (localizacaoLiberada) vigiar(); s.onchange = () => { localizacaoLiberada = s.state === 'granted'; if (localizacaoLiberada) vigiar(); }; }).catch(() => {});
  }
  document.addEventListener('cicluz-agenda-mudou', () => { if (localizacaoLiberada) vigiar(); });

  /** Faixas de permissão: notificação do aparelho e localização (para os avisos por lugar). */
  function convite() {
    if (comLugar().length && !localizacaoLiberada && navigator.geolocation) {
      const faixa = el('div', 'agenda-convite');
      faixa.append(el('span', null, 'Para avisar ao entrar ou sair de um lugar, permita a localização neste aparelho (vale enquanto o S2 estiver aberto).'), botao('Permitir localização', () => { vigiar(); faixa.remove(); }, 'compras-chip ativo'));
      return faixa;
    }
    if (!suportado() || Notification.permission !== 'default') return null;
    if (!A.dados.itens.some((i) => D.momentoAlerta(i))) return null;
    const faixa = el('div', 'agenda-convite');
    faixa.append(el('span', null, 'Quer receber os alertas da Agenda como notificação neste aparelho?'), botao('Ativar avisos', () => {
      Notification.requestPermission().then(() => { faixa.remove(); });
    }, 'compras-chip ativo'));
    return faixa;
  }

  function painel() {
    let p = document.getElementById('agenda-alertas');
    if (!p) {
      p = el('div', 'agenda-alertas');
      p.id = 'agenda-alertas';
      p.setAttribute('role', 'region');
      p.setAttribute('aria-label', 'Alertas da Agenda');
      p.setAttribute('aria-live', 'assertive');
      document.body.append(p);
    }
    return p;
  }

  function mostrar(item, chave, texto) {
    const cartao = el('div', 'agenda-alerta');
    cartao.dataset.chave = chave;
    const lst = A.lista(item.listaId);
    if (lst) cartao.style.setProperty('--lista-cor', lst.cor);
    const fechar = () => { cartao.remove(); };
    const adiar = (min) => { A.adiar(item.id, min); fechar(); U.avisar('Vou avisar de novo.'); };
    const amanha = () => {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
      adiar(Math.max(1, Math.round((d - Date.now()) / 60000)));
    };
    cartao.append(el('small', null, 'Agenda · ' + (lst ? lst.nome : '')), el('b', null, item.titulo), el('span', null, texto || D.quando(item, new Date()) || 'Sem data'));
    const acoes = el('div', 'agenda-alerta-acoes');
    acoes.append(
      botao('Concluir', () => { A.alternarConcluida(item.id); fechar(); }, 'compras-chip ativo'),
      botao('Adiar 15 min', () => adiar(15), 'compras-chip'),
      botao('Adiar 1 h', () => adiar(60), 'compras-chip'),
      botao('Amanhã', amanha, 'compras-chip'),
      botao('Abrir', () => { fechar(); window.CicluzAgenda.abrir(); window.CicluzAgenda.editar(item.id); }, 'compras-chip'),
      botao('Fechar', fechar, 'compras-chip'),
    );
    cartao.append(acoes);
    painel().append(cartao);
    if (suportado() && Notification.permission === 'granted') {
      try {
        const n = new Notification(item.titulo, { body: (texto || D.quando(item, new Date())) + (lst ? ' · ' + lst.nome : ''), tag: chave });
        n.onclick = () => { window.focus(); window.CicluzAgenda.abrir(); window.CicluzAgenda.editar(item.id); n.close(); };
      } catch (e) { /* alguns navegadores só notificam pelo service worker */ }
    }
  }

  /** Confere os alertas vencidos. agora: injetável nos testes. */
  function conferir(agora = new Date()) {
    let novos = 0;
    A.dados.itens.forEach((i) => {
      const m = D.momentoAlerta(i);
      if (!m || m > agora || agora - m > JANELA_MS) return;
      const chave = i.id + '@' + m.toISOString();
      if (mostrados[chave]) return;
      mostrados[chave] = Date.now();
      novos++;
      mostrar(i, chave);
    });
    if (novos) guardar();
    return novos;
  }

  setInterval(() => conferir(), 30000);
  setTimeout(() => conferir(), 2000);

  window.CicluzAgendaAlertas = { conferir, convite, posicao };
})();
