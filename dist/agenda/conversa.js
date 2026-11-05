/*
 * Agenda — chat e arquivos de cada compromisso (no servidor: servidor/api/src/agenda).
 * - Chat: conversa de quem participa do compromisso; com a janela aberta, confere novidades a cada
 *   5 s; mensagens não lidas aparecem na linha do compromisso.
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
  const ICONE_ARQUIVO = '<path d="M14 3H6v18h12V7zM14 3v4h4"/>';

  const api = (caminho, opcoes) => window.CicluzSync.api(caminho, opcoes);
  const online = () => Boolean(A.usuarioAtual() && window.CicluzSync && window.CicluzSync.api);
  const cor = () => ({ cor: window.CicluzAgenda.COR, corTexto: window.CicluzAgenda.COR_TEXTO });
  const mensagemErro = (e) => (e && e.codigo === 'AGENDA_COMPROMISSO_NAO_ENCONTRADO' ? 'Este compromisso ainda está indo para o servidor. Tente de novo em alguns segundos.' : (e && e.message) || 'Não foi possível falar com o servidor.');
  const hora = (iso) => { const d = new Date(iso); return D.rotuloData(D.isoData(d), new Date()) + ' ' + D.horaAgora(d); };
  const tamanho = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB');

  /* ---------- Não lidas (para a linha do compromisso) ---------- */
  let naoLidas = {};
  let ultimaConsulta = 0;
  async function atualizarNaoLidas(forcar) {
    if (!online() || (!forcar && Date.now() - ultimaConsulta < INTERVALO_NAO_LIDAS - 1000)) return;
    ultimaConsulta = Date.now();
    try {
      const r = await api('/agenda/chat/nao-lidas');
      const novo = r.naoLidas || {};
      if (JSON.stringify(novo) !== JSON.stringify(naoLidas)) { naoLidas = novo; document.dispatchEvent(new CustomEvent('cicluz-agenda-conversa')); }
    } catch (e) { /* sem servidor agora: tenta na próxima */ }
  }
  setInterval(() => { const v = document.getElementById('agenda-view'); if (v && v.classList.contains('show')) atualizarNaoLidas(); }, INTERVALO_NAO_LIDAS);

  /* ---------- Chat ---------- */
  function abrirChat(item) {
    if (!online()) return U.avisar('O chat precisa do servidor: entre com seu usuário.');
    let ultima = '';
    let timer = null;
    const eu = A.usuarioAtual();
    U.dialogo({
      titulo: 'Chat · ' + item.titulo,
      subtitulo: 'Quem participa do compromisso vê esta conversa.',
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
        const texto = el('textarea');
        texto.rows = 2;
        texto.maxLength = 2000;
        texto.placeholder = 'Escreva a mensagem (Enter envia, Shift+Enter quebra a linha)';
        texto.setAttribute('aria-label', 'Mensagem');
        const enviar = botao('Enviar', () => mandar(), 'btn');
        linha.append(texto, enviar);
        form.append(lista, estado, linha);

        const desenhar = (mensagens) => {
          if (!mensagens.length) return;
          if (lista.querySelector('.compras-vazio')) lista.replaceChildren();
          mensagens.forEach((m) => {
            if (lista.querySelector('[data-id="' + m.id + '"]')) return;
            const minha = m.autorId === eu;
            const b = el('div', 'agenda-chat-msg' + (minha ? ' minha' : ''));
            b.dataset.id = m.id;
            if (!minha) b.append(el('small', 'agenda-chat-autor', m.autorNome));
            b.append(el('span', 'agenda-chat-texto', m.texto), el('small', 'agenda-chat-hora', hora(m.criadoEm)));
            lista.append(b);
            ultima = m.criadoEm;
          });
          lista.scrollTop = lista.scrollHeight;
        };
        async function buscar(primeira) {
          try {
            const r = await api('/agenda/compromissos/' + encodeURIComponent(item.id) + '/mensagens' + (ultima ? '?depois=' + encodeURIComponent(ultima) : ''));
            if (primeira && !r.mensagens.length) lista.replaceChildren(U.vazio('Nenhuma mensagem ainda.', 'Comece a conversa abaixo.'));
            if (r.mensagens.length || primeira) { desenhar(r.mensagens); api('/agenda/compromissos/' + encodeURIComponent(item.id) + '/leitura', { metodo: 'POST', corpo: {} }).catch(() => {}); }
            estado.textContent = '';
          } catch (e) { estado.textContent = mensagemErro(e); }
        }
        async function mandar() {
          const t = texto.value.trim();
          if (!t) return;
          enviar.disabled = true;
          try {
            const m = await api('/agenda/compromissos/' + encodeURIComponent(item.id) + '/mensagens', { metodo: 'POST', corpo: { texto: t } });
            texto.value = '';
            desenhar([m]);
            estado.textContent = '';
          } catch (e) { estado.textContent = mensagemErro(e); }
          finally { enviar.disabled = false; texto.focus(); }
        }
        texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mandar(); } });
        buscar(true);
        timer = setInterval(() => buscar(false), INTERVALO_CHAT);
        setTimeout(() => texto.focus(), 150);
        return {};
      },
    });
  }

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
      } catch (e) { lista.replaceChildren(); estado.textContent = mensagemErro(e); }
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

  window.CicluzAgendaConversa = { secao, abrirChat, atualizarNaoLidas, naoLidas: () => naoLidas, ICONE_CHAT };
})();
