/*
 * Agenda — chat e arquivos (no servidor: servidor/api/src/agenda).
 * - Chat do compromisso: conversa de quem participa dele. Chat do grupo (P-46): cada lista é um grupo, e quem é
 *   membro conversa ali. As duas conversas usam a MESMA janela, no jeito do WhatsApp (balões, dia, hora no balão).
 *   Com a janela aberta, confere novidades a cada 5 s; não lidas aparecem na linha do compromisso e na lista.
 * - Arquivos: até 10 MB (imagem, PDF, Word, Excel, PowerPoint, TXT, CSV). O responsável manda
 *   "evidência" (o que fez); o gestor e quem pode editar mandam "material". Só quem enviou ou o gestor
 *   exclui. O servidor confere tudo isso pelo compromisso (quem não participa não vê).
 * Sem login (revisão local) não há servidor: a seção explica isso.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const A = window.CicluzAgendaDados;
  const { el, botao, svg } = U;
  const TAMANHO_MAXIMO = 10 * 1024 * 1024;
  const ACEITOS = '.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
  const INTERVALO_CHAT = 5000;
  const INTERVALO_NAO_LIDAS = 30000;
  const ICONE_CHAT = '<path d="M4 5h16v11H8l-4 4z"/>';
  const ICONE_ENVIAR = '<path d="M4 12 20 4l-4 16-4-7zM12 13l8-9"/>';
  const ICONE_ARQUIVO = '<path d="M14 3H6v18h12V7zM14 3v4h4"/>';

  const api = (caminho, opcoes) => window.CicluzSync.api(caminho, opcoes);
  const online = () => Boolean(A.usuarioAtual() && window.CicluzSync && window.CicluzSync.api);
  const cor = () => ({ cor: window.CicluzAgenda.COR, corTexto: window.CicluzAgenda.COR_TEXTO });
  // A rota inteira não existe (404 genérico, não o do compromisso): a API publicada é anterior ao chat.
  const apiSemAgenda = (e) => Boolean(e && e.status === 404 && e.codigo !== 'AGENDA_COMPROMISSO_NAO_ENCONTRADO' && e.codigo !== 'ARQUIVO_NAO_ENCONTRADO');
  function mensagemErro(e) {
    if (e && e.codigo === 'AGENDA_COMPROMISSO_NAO_ENCONTRADO') return 'Este compromisso ainda está indo para o servidor. Tente de novo em alguns segundos.';
    if (apiSemAgenda(e)) return 'O servidor ainda não tem chat e arquivos: a API precisa ser atualizada (avise o responsável pelo sistema).';
    if (e && e.codigo === 'NETWORK') return 'Sem conexão com o servidor agora. Tente de novo daqui a pouco.';
    return (e && e.message) || 'Não foi possível falar com o servidor.';
  }
  const hora = (iso) => { const d = new Date(iso); return D.rotuloData(D.isoData(d), new Date()) + ' ' + D.horaAgora(d); };
  /** Separador de dia do chat: Hoje, Ontem ou DD/MM/AA. */
  function rotuloDia(iso) {
    const dia = D.isoData(new Date(iso));
    const hoje = D.isoData(new Date());
    if (dia === hoje) return 'Hoje';
    if (dia === D.somarDias(hoje, -1)) return 'Ontem';
    return D.dataCurta(dia);
  }
  const iniciais = (nome) => String(nome || '?').split(/\s+/).filter((p) => /^[A-Za-zÀ-ÿ]/.test(p)).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
  const tamanho = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB');

  /* ---------- Não lidas (para a linha do compromisso) ---------- */
  let naoLidas = {};
  let naoLidasGrupos = {};
  let ultimaConsulta = 0;
  async function atualizarNaoLidas(forcar) {
    if (!online() || A.situacao !== 'servidor' || (!forcar && Date.now() - ultimaConsulta < INTERVALO_NAO_LIDAS - 1000)) return;
    ultimaConsulta = Date.now();
    try {
      const auto = { automatico: true };
      const [r, g] = await Promise.all([api('/agenda/chat/nao-lidas', auto), api('/agenda/grupos-chat/nao-lidas', auto).catch(() => ({ naoLidas: naoLidasGrupos }))]);
      const novo = r.naoLidas || {};
      const novoGrupos = g.naoLidas || {};
      if (JSON.stringify(novo) !== JSON.stringify(naoLidas) || JSON.stringify(novoGrupos) !== JSON.stringify(naoLidasGrupos)) {
        naoLidas = novo;
        naoLidasGrupos = novoGrupos;
        document.dispatchEvent(new CustomEvent('cicluz-agenda-conversa'));
      }
    } catch (e) { /* sem servidor agora: tenta na próxima */ }
  }
  setInterval(() => { const v = document.getElementById('agenda-view'); if (v && v.classList.contains('show')) atualizarNaoLidas(); }, INTERVALO_NAO_LIDAS);

  /* ---------- Chat (compromisso ou grupo), no jeito do WhatsApp ---------- */
  /**
   * base: '/agenda/compromissos/<id>' ou '/agenda/grupos/<id>' (as duas têm /mensagens e /leitura).
   * mostrarAutor: no grupo, o nome de quem escreveu aparece sempre (como num grupo do WhatsApp).
   */
  function abrirConversa({ titulo, subtitulo, base, mostrarAutor = true }) {
    if (!online()) return U.avisar('O chat precisa do servidor: entre com seu usuário.');
    let ultima = '';
    let ultimoDia = '';
    let ultimoAutor = '';
    let timer = null;
    const eu = A.usuarioAtual();
    U.dialogo({
      titulo,
      subtitulo,
      ...cor(),
      classe: 'agenda-dialog agenda-chat-dialog',
      aoFechar: () => { clearInterval(timer); atualizarNaoLidas(true); },
      montar: (form) => {
        form.dataset.textoLivre = '';
        const lista = el('div', 'agenda-chat-lista');
        lista.setAttribute('role', 'log');
        lista.setAttribute('aria-live', 'polite');
        lista.setAttribute('aria-label', 'Mensagens');
        const estado = el('p', 'profiles-note agenda-chat-estado', 'Carregando…');
        const linha = el('div', 'agenda-chat-envio');
        // Campo de uma linha, como o do WhatsApp (a caixa de várias linhas do sistema tem 84 px no mínimo).
        const texto = el('input');
        texto.type = 'text';
        texto.maxLength = 2000;
        texto.placeholder = 'Mensagem';
        texto.autocomplete = 'off';
        texto.enterKeyHint = 'send';
        texto.setAttribute('aria-label', 'Mensagem (Enter envia)');
        const enviar = botao('', () => mandar(), 'agenda-chat-enviar');
        enviar.innerHTML = svg(ICONE_ENVIAR);
        enviar.title = 'Enviar';
        enviar.setAttribute('aria-label', 'Enviar mensagem');
        linha.append(texto, enviar);
        form.append(lista, estado, linha);

        const desenhar = (mensagens) => {
          if (!mensagens.length) return;
          if (lista.querySelector('.compras-vazio')) lista.replaceChildren();
          mensagens.forEach((m) => {
            if (lista.querySelector('[data-id="' + m.id + '"]')) return;
            const dia = rotuloDia(m.criadoEm);
            if (dia !== ultimoDia) { lista.append(el('div', 'agenda-chat-dia', dia)); ultimoDia = dia; ultimoAutor = ''; }
            const minha = m.autorId === eu;
            const seguida = m.autorId === ultimoAutor;
            const b = el('div', 'agenda-chat-msg' + (minha ? ' minha' : '') + (seguida ? ' seguida' : ''));
            b.dataset.id = m.id;
            if (!minha && !seguida) {
              const av = el('span', 'agenda-chat-avatar', iniciais(m.autorNome));
              av.setAttribute('aria-hidden', 'true');
              b.append(av);
            }
            const balao = el('div', 'agenda-chat-balao');
            if (!minha && !seguida && mostrarAutor) balao.append(el('small', 'agenda-chat-autor', m.autorNome));
            balao.append(el('span', 'agenda-chat-texto', m.texto), el('small', 'agenda-chat-hora', D.horaAgora(new Date(m.criadoEm))));
            b.append(balao);
            b.title = (minha ? 'Você' : m.autorNome) + ' · ' + hora(m.criadoEm);
            lista.append(b);
            ultima = m.criadoEm;
            ultimoAutor = m.autorId;
          });
          lista.scrollTop = lista.scrollHeight;
        };
        async function buscar(primeira) {
          try {
            // Só a primeira leitura é da pessoa; as seguintes (a cada X s) são automáticas.
            const auto = primeira ? {} : { automatico: true };
            const r = await api(base + '/mensagens' + (ultima ? '?depois=' + encodeURIComponent(ultima) : ''), auto);
            if (primeira && !r.mensagens.length) lista.replaceChildren(U.vazio('Nenhuma mensagem ainda.', 'Comece a conversa abaixo.'));
            if (r.mensagens.length || primeira) { desenhar(r.mensagens); api(base + '/leitura', Object.assign({ metodo: 'POST', corpo: {} }, auto)).catch(() => {}); }
            estado.textContent = '';
          } catch (e) {
            estado.textContent = mensagemErro(e);
            if (apiSemAgenda(e)) { clearInterval(timer); lista.replaceChildren(); enviar.disabled = true; texto.disabled = true; }
          }
        }
        async function mandar() {
          const t = texto.value.trim();
          if (!t) return;
          enviar.disabled = true;
          try {
            const m = await api(base + '/mensagens', { metodo: 'POST', corpo: { texto: t } });
            texto.value = '';
            desenhar([m]);
            estado.textContent = '';
          } catch (e) { estado.textContent = mensagemErro(e); }
          finally { enviar.disabled = false; texto.focus(); }
        }
        // Chat: Enter envia, como no WhatsApp (exceção ao "Enter nunca salva", registrada no DESIGN_SYSTEM).
        texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); mandar(); } });
        buscar(true);
        timer = setInterval(() => buscar(false), INTERVALO_CHAT);
        setTimeout(() => texto.focus(), 150);
        return {};
      },
    });
  }
  const abrirChat = (item) => abrirConversa({ titulo: 'Chat · ' + item.titulo, subtitulo: 'Quem participa do compromisso vê esta conversa.', base: '/agenda/compromissos/' + encodeURIComponent(item.id) });
  /** Chat do grupo: a lista é o grupo; conversam os membros, quem criou a lista e o administrador. */
  const abrirChatGrupo = (lista) => abrirConversa({ titulo: 'Grupo · ' + lista.nome, subtitulo: 'Conversa de quem é membro da lista "' + lista.nome + '".', base: '/agenda/grupos/' + encodeURIComponent(lista.id) });

  /* ---------- Seção do compromisso: chat + arquivos ---------- */
  function secao(item) {
    const s = el('fieldset', 'agenda-form-secao agenda-conversa');
    s.append(el('legend', null, 'Chat e arquivos'));
    if (!online()) { s.append(U.nota('Chat e arquivos ficam no servidor: entre com seu usuário para usar.')); return s; }
    const ac = A.acesso(item);
    const n = naoLidas[item.id] || 0;
    const chat = botao(n ? 'Abrir chat (' + n + ' nova' + (n > 1 ? 's' : '') + ')' : 'Abrir chat', () => abrirChat(item), 'btn secondary');
    s.append(chat);

    const lista = el('div', 'compras-lista agenda-arquivos');
    const estado = el('p', 'profiles-note');
    estado.setAttribute('role', 'status');
    const podeEnviar = ac.gestor || ac.editar || ac.responsavel;
    const entrada = el('input');
    entrada.type = 'file';
    entrada.multiple = true;
    entrada.accept = ACEITOS;
    entrada.hidden = true;
    entrada.setAttribute('aria-label', 'Escolher arquivos');
    const anexar = botao(ac.responsavel && !ac.gestor ? 'Enviar evidência' : 'Adicionar arquivos', () => entrada.click(), 'btn secondary');
    anexar.hidden = !podeEnviar;
    s.append(lista, estado, anexar, entrada, U.nota('Até 10 MB cada: imagem, PDF, Word, Excel, PowerPoint, TXT ou CSV.' + (ac.responsavel && !ac.gestor ? ' O que você enviar fica marcado como evidência do responsável.' : '')));

    async function carregar() {
      try {
        const r = await api('/agenda/compromissos/' + encodeURIComponent(item.id) + '/arquivos');
        desenhar(r.arquivos);
      } catch (e) { lista.replaceChildren(); estado.textContent = mensagemErro(e); if (apiSemAgenda(e)) anexar.hidden = true; }
    }
    function desenhar(arquivos) {
      lista.replaceChildren(...(arquivos.length ? arquivos.map((a) => {
        const url = '/api/agenda/arquivos/' + a.id;
        const linha = el('div', 'compras-linha agenda-arquivo');
        if (a.tipo.startsWith('image/') && a.tipo !== 'image/heic') {
          const img = el('img', 'agenda-arquivo-miniatura');
          img.src = url;
          img.alt = '';
          img.loading = 'lazy';
          linha.append(img);
        } else { const i = el('span', 'agenda-arquivo-icone'); i.innerHTML = svg(ICONE_ARQUIVO); linha.append(i); }
        const meio = el('span', 'compras-linha-texto');
        const link = el('a', 'agenda-arquivo-nome', a.nome);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        meio.append(link, el('small', null, (a.papel === 'evidencia' ? 'Evidência do responsável' : 'Material') + ' · ' + a.enviadoPorNome + ' · ' + hora(a.criadoEm) + ' · ' + tamanho(a.tamanho)));
        linha.append(meio);
        if (a.podeExcluir) {
          linha.append(botao('Excluir', () => U.confirmar('Excluir arquivo', 'Excluir "' + a.nome + '"? Não dá para desfazer.', 'Excluir', () => {
            api('/agenda/arquivos/' + a.id, { metodo: 'DELETE' }).then(() => { U.avisar('Arquivo excluído.'); carregar(); }).catch((e) => U.avisar(mensagemErro(e)));
          }, { ...cor(), classe: 'agenda-dialog' }), 'btn secondary perigo-texto'));
        }
        return linha;
      }) : [U.nota('Nenhum arquivo.')]));
    }
    entrada.onchange = async () => {
      const arquivos = [...entrada.files];
      entrada.value = '';
      for (const f of arquivos) {
        if (f.size > TAMANHO_MAXIMO) { estado.textContent = '"' + f.name + '" passa de 10 MB.'; continue; }
        estado.textContent = 'Enviando "' + f.name + '"…';
        try {
          const base64 = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => falha(new Error('leitura')); r.readAsDataURL(f); });
          await api('/agenda/compromissos/' + encodeURIComponent(item.id) + '/arquivos', { metodo: 'POST', corpo: { nome: f.name, conteudoBase64: base64 } });
          estado.textContent = '"' + f.name + '" enviado.';
        } catch (e) { estado.textContent = '"' + f.name + '": ' + mensagemErro(e); }
      }
      carregar();
    };
    lista.append(U.nota('Carregando…'));
    carregar();
    return s;
  }

  window.CicluzAgendaConversa = { secao, abrirChat, abrirChatGrupo, atualizarNaoLidas, naoLidas: () => naoLidas, naoLidasGrupos: () => naoLidasGrupos, ICONE_CHAT };
})();
