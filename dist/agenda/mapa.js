/*
 * Agenda — lugar do compromisso no mapa (como a localização do Lembretes do iPhone):
 * Atual (o GPS do aparelho), Personalizada (procurar o endereço ou tocar no mapa), e o aviso
 * Ao entrar / Ao sair com o raio desenhado no mapa. Tocar no mapa marca o ponto e preenche o endereço.
 *
 * Serviços externos (só quando o mapa é aberto): mapa do OpenStreetMap (tile.openstreetmap.org) e busca
 * de endereço do Nominatim (nominatim.openstreetmap.org), gratuitos e com regra de uso justo: no máximo
 * uma busca por segundo e só quando a pessoa pede (sem busca a cada letra). Vão o texto procurado e o
 * ponto tocado; nenhum dado de pessoa. A biblioteca do mapa (Leaflet 1.9.4) fica no próprio site
 * (dist/vendor/leaflet), conferida pelo SHA-256 oficial.
 * "Entrar/Sair do carro" do iPhone usa o Bluetooth do carro e não existe para site; aqui, Ao entrar/Ao
 * sair valem para o lugar marcado (o "Personalizado" do iPhone).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const { el, botao, svg } = U;
  const CENTRO_PADRAO = { lat: -21.7642, lng: -43.3503 }; // Juiz de Fora/MG (unidades da padaria)
  const NOMINATIM = 'https://nominatim.openstreetmap.org/';
  const ICONES = {
    atual: '<path d="m3 11 18-8-8 18-2-8z"/>',
    entrar: '<path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
    sair: '<path d="M14 17l5-5-5-5M19 12H7M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/>',
    personalizada: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  };

  let carregando = null;
  /** Carrega o Leaflet do próprio site, uma vez. */
  function carregarLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (carregando) return carregando;
    const base = 'vendor/leaflet/';
    carregando = new Promise((ok, falha) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = base + 'leaflet.css?v=1.9.4';
      document.head.append(css);
      const s = document.createElement('script');
      s.src = base + 'leaflet.js?v=1.9.4';
      s.onload = () => ok(window.L);
      s.onerror = () => { carregando = null; falha(new Error('Leaflet')); };
      document.head.append(s);
    });
    return carregando;
  }

  let ultimaBusca = 0;
  async function pedir(caminho, params) {
    const espera = 1000 - (Date.now() - ultimaBusca);
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimaBusca = Date.now();
    const q = new URLSearchParams({ format: 'jsonv2', 'accept-language': 'pt-BR', ...params });
    // O site manda Referrer-Policy same-origin; o Nominatim pede a origem para identificar quem usa.
    const r = await fetch(NOMINATIM + caminho + '?' + q.toString(), { referrerPolicy: 'strict-origin-when-cross-origin', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('busca ' + r.status);
    return r.json();
  }
  /** Endereço curto e legível a partir da resposta do Nominatim. */
  function enderecoDe(r) {
    const a = (r && r.address) || {};
    const rua = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(', ');
    const partes = [r && r.name && r.name !== a.road ? r.name : '', rua, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state_code || a.state].filter(Boolean);
    return [...new Set(partes)].join(' - ') || (r && r.display_name) || '';
  }
  const buscar = (texto) => pedir('search', { q: texto, limit: '5', addressdetails: '1', countrycodes: 'br' });
  const reverso = (p) => pedir('reverse', { lat: String(p.lat), lon: String(p.lng), addressdetails: '1', zoom: '18' });

  /**
   * Monta o seletor de lugar dentro do diálogo.
   * inicial: { localizacao, local }; campoEndereco: o input "Local" (o endereço preenchido vai para ele).
   * Devolve { no, valor() } — valor() = { lat, lng, aviso, raio } ou null.
   */
  function seletor(inicial, campoEndereco) {
    const loc = inicial.localizacao || {};
    const estado = {
      ponto: D.temPonto(loc) ? { lat: loc.lat, lng: loc.lng } : null,
      aviso: loc.aviso || '',
      raio: Number(loc.raio) || 200,
      procurar: !D.temPonto(loc),
    };
    const no = el('div', 'agenda-mapa-seletor');
    const botoes = el('div', 'agenda-mapa-botoes');
    botoes.setAttribute('role', 'group');
    botoes.setAttribute('aria-label', 'Localização');
    const aviso = el('p', 'profiles-note agenda-mapa-aviso');
    aviso.setAttribute('role', 'status');
    const busca = el('div', 'agenda-mapa-busca');
    // Campo de texto (o S2 recolhe campos de busca em um ícone).
    const campoBusca = U.entrada('text', '', { placeholder: 'Procurar endereço ou lugar', maxLength: 200, enterKeyHint: 'search' });
    campoBusca.dataset.textoLivre = '';
    campoBusca.setAttribute('aria-label', 'Procurar endereço ou lugar');
    const procurar = botao('Procurar', () => fazerBusca(), 'compras-chip');
    const resultados = el('div', 'agenda-mapa-resultados');
    busca.append(campoBusca, procurar);
    campoBusca.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); fazerBusca(); } };
    const caixaMapa = el('div', 'agenda-mapa');
    caixaMapa.setAttribute('aria-label', 'Mapa: toque para marcar o lugar');
    const raioSel = U.seletor(D.RAIOS, String(estado.raio));
    const raioCampo = U.campo('Raio do aviso', raioSel, 'Avisa ao cruzar este círculo.');
    const rodape = el('div', 'agenda-mapa-rodape');
    const comoChegar = el('a', 'agenda-link', 'Como chegar');
    comoChegar.target = '_blank';
    comoChegar.rel = 'noopener noreferrer';
    const tirar = botao('Tirar do mapa', () => { estado.ponto = null; estado.aviso = ''; desenhar(); }, 'agenda-link');
    rodape.append(comoChegar, tirar);
    no.append(botoes, busca, resultados, caixaMapa, raioCampo, aviso, rodape);

    let mapa = null;
    let marcador = null;
    let circulo = null;
    const B = (id, rotulo, acao) => {
      const b = botao('', acao, 'agenda-mapa-botao');
      b.dataset.modo = id;
      const i = el('span', 'agenda-mapa-botao-icone');
      i.innerHTML = svg(ICONES[id]);
      b.append(i, el('small', null, rotulo));
      b.setAttribute('aria-label', rotulo);
      return b;
    };
    const bAtual = B('atual', 'Atual', usarAtual);
    const bEntrar = B('entrar', 'Ao entrar', () => { estado.aviso = estado.aviso === 'entrar' ? '' : 'entrar'; desenhar(); });
    const bSair = B('sair', 'Ao sair', () => { estado.aviso = estado.aviso === 'sair' ? '' : 'sair'; desenhar(); });
    const bPers = B('personalizada', 'Personalizada', () => { estado.procurar = !estado.procurar; desenhar(); if (estado.procurar) campoBusca.focus(); });
    botoes.append(bAtual, bEntrar, bSair, bPers);
    raioSel.onchange = () => { estado.raio = Number(raioSel.value); desenhar(); };

    function marcar(p, preencher = true) {
      estado.ponto = { lat: +p.lat, lng: +p.lng };
      desenhar(true);
      if (!preencher) return;
      aviso.textContent = 'Buscando o endereço…';
      reverso(estado.ponto).then((r) => {
        const e = enderecoDe(r);
        if (e) { campoEndereco.value = e; campoEndereco.dispatchEvent(new Event('input', { bubbles: true })); }
        aviso.textContent = e ? 'Endereço preenchido. Pode corrigir no campo Endereço.' : 'Ponto marcado. Escreva o endereço, se quiser.';
      }).catch(() => { aviso.textContent = 'Ponto marcado, mas o endereço não veio (sem internet?). Escreva no campo Endereço, se quiser.'; });
    }

    function usarAtual() {
      if (!navigator.geolocation) { aviso.textContent = 'Este aparelho não informa a localização.'; return; }
      aviso.textContent = 'Pegando a sua localização…';
      navigator.geolocation.getCurrentPosition(
        (pos) => marcar({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (e) => { aviso.textContent = e.code === 1 ? 'A localização foi negada. Libere nas configurações do navegador para usar "Atual".' : 'Não foi possível pegar a localização agora.'; },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    }

    async function fazerBusca() {
      const texto = campoBusca.value.trim();
      if (texto.length < 3) { aviso.textContent = 'Escreva pelo menos 3 letras para procurar.'; return; }
      procurar.disabled = true;
      aviso.textContent = 'Procurando…';
      try {
        const lista = await buscar(texto);
        resultados.replaceChildren(...lista.map((r) => {
          const b = botao('', () => {
            resultados.replaceChildren();
            const p = { lat: +r.lat, lng: +r.lon };
            campoEndereco.value = enderecoDe(r);
            campoEndereco.dispatchEvent(new Event('input', { bubbles: true }));
            marcar(p, false);
            aviso.textContent = 'Lugar marcado.';
          }, 'compras-linha agenda-mapa-resultado');
          b.append(el('span', null, enderecoDe(r)));
          return b;
        }));
        aviso.textContent = lista.length ? 'Escolha um resultado ou toque no mapa.' : 'Nada encontrado. Tente outro endereço ou toque no mapa.';
      } catch (e) {
        aviso.textContent = 'A busca não respondeu (sem internet?). Toque no mapa para marcar.';
      } finally {
        procurar.disabled = false;
      }
    }

    function desenhar(centralizar) {
      bEntrar.setAttribute('aria-pressed', String(estado.aviso === 'entrar'));
      bSair.setAttribute('aria-pressed', String(estado.aviso === 'sair'));
      bPers.setAttribute('aria-pressed', String(estado.procurar));
      bAtual.setAttribute('aria-pressed', 'false');
      busca.hidden = !estado.procurar;
      if (!estado.procurar) resultados.replaceChildren();
      raioCampo.hidden = !estado.aviso;
      rodape.hidden = !estado.ponto;
      if (estado.ponto) comoChegar.href = 'https://www.google.com/maps/dir/?api=1&destination=' + estado.ponto.lat + ',' + estado.ponto.lng;
      if (estado.aviso && !estado.ponto) aviso.textContent = 'Marque o lugar: procure o endereço, use "Atual" ou toque no mapa.';
      if (!mapa) return;
      const L = window.L;
      if (estado.ponto) {
        if (!marcador) marcador = L.marker(estado.ponto, { icon: L.divIcon({ className: 'agenda-mapa-pino', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 26] }), keyboard: false }).addTo(mapa);
        marcador.setLatLng(estado.ponto);
        if (estado.aviso) {
          if (!circulo) circulo = L.circle(estado.ponto, { radius: estado.raio, color: '#7c3aed', weight: 2, fillOpacity: 0.12 }).addTo(mapa);
          circulo.setLatLng(estado.ponto);
          circulo.setRadius(estado.raio);
        } else if (circulo) { circulo.remove(); circulo = null; }
        if (centralizar) mapa.setView(estado.ponto, Math.max(mapa.getZoom(), 16));
        if (circulo && estado.aviso) mapa.fitBounds(circulo.getBounds(), { maxZoom: 17, padding: [16, 16] });
      } else {
        if (marcador) { marcador.remove(); marcador = null; }
        if (circulo) { circulo.remove(); circulo = null; }
      }
    }

    carregarLeaflet().then((L) => {
      mapa = L.map(caixaMapa, { center: estado.ponto || CENTRO_PADRAO, zoom: estado.ponto ? 16 : 13, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        referrerPolicy: 'strict-origin-when-cross-origin',
      }).addTo(mapa);
      mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
      mapa.on('click', (e) => marcar({ lat: e.latlng.lat, lng: e.latlng.lng }));
      // O diálogo acabou de abrir: o mapa mede o tamanho certo depois de aparecer.
      setTimeout(() => { mapa.invalidateSize(); desenhar(Boolean(estado.ponto)); }, 150);
    }).catch(() => { caixaMapa.replaceChildren(el('p', 'agenda-mapa-erro', 'O mapa não carregou. O endereço pode ser escrito no campo Endereço.')); });

    desenhar();
    return {
      no,
      valor: () => (estado.ponto || estado.aviso ? { lat: estado.ponto ? estado.ponto.lat : undefined, lng: estado.ponto ? estado.ponto.lng : undefined, aviso: estado.aviso, raio: estado.raio } : null),
    };
  }

  window.CicluzAgendaMapa = { seletor, enderecoDe, carregarLeaflet };
})();
