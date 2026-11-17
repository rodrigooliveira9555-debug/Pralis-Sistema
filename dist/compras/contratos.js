/*
 * Contratos do fornecedor (18/11/2026): atividades e responsabilidades incluídas e não incluídas, seleção hierárquica no padrão de
 * DES - Grupos de Despesas, tipos (modelos) de contrato, e o documento do contrato (imprimir para assinar à mão, enviar para assinatura
 * digital, visualizar). As regras ficam em compras/dominio.js (testadas); aqui só há tela.
 * Nada é inventado: o contrato só usa o que foi cadastrado (cláusulas dos modelos, atividades, valores). Assinatura digital NÃO existe
 * ainda (falta contratar e integrar um serviço): o botão diz isso e nunca registra assinatura concluída. Imprimir não assina nada.
 * Os grupos de despesa são só lidos; este módulo nunca altera DES - Grupos de Despesas.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const D = window.CicluzComprasDominio; const S = window.CicluzComprasDados;
  if (!U || !D || !S) return;
  const { el, botao, entrada, seletor, campo } = U;
  const SVG = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICO = {
    cima: '<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    baixo: '<path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
    lapis: '<path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/>', lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    pasta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', etiqueta: '<path d="M20 12 12 20 3 11V3h8zM7.5 7.5h.01"/>',
    seta: '<path d="m9 6 6 6-6 6"/>', imprimir: '<path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
  };
  const bolinha = (rotulo, desenho, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = SVG(desenho); b.onclick = acao; return b; };
  const grupos = () => (window.CicluzProducaoDados && window.CicluzProducaoDados.gruposDespesa()) || [];
  const modelos = () => (S.dados && Array.isArray(S.dados.modelosContrato) ? S.dados.modelosContrato : []);
  const cc = (c) => (typeof c === 'function' ? c() : c || {});
  const pluralItens = (n) => n + (n === 1 ? ' item' : ' itens');

  /* =============== Seletor hierárquico (padrão de DES - Grupos de Despesas) =============== */
  /**
   * Janela com grupos e subgrupos de despesa em níveis, que abrem e fecham, com caixa de marcar à ESQUERDA do ícone, contagem de itens,
   * situação e busca. Marcar um grupo marca só ele (não marca os filhos). marcados: Set de ids ("grupo" ou "grupo|subgrupo").
   * bloqueados: Map id → motivo (itens que já estão na outra lista; aparecem travados). aoConfirmar(Set).
   */
  function seletorHierarquico({ titulo, cores, marcados, bloqueados = new Map(), aoConfirmar }) {
    const escolha = new Set(marcados); const abertos = new Set();
    U.dialogo({
      titulo, ...cc(cores), largo: true, classe: 'compras-hier-dialogo', rotuloSalvar: 'Confirmar',
      montar: (form) => {
        const busca = entrada('text', '', { placeholder: 'Buscar grupo ou subgrupo', maxLength: 80, autocomplete: 'off' }); busca.setAttribute('aria-label', 'Buscar grupo ou subgrupo');
        busca.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        const resumo = el('p', 'profiles-note'); resumo.setAttribute('role', 'status'); const arvore = el('div', 'compras-hier'); arvore.setAttribute('role', 'tree');
        const caixa = (id, rotulo, ativo) => {
          const c = entrada('checkbox'); c.checked = escolha.has(id) || bloqueados.has(id); c.disabled = bloqueados.has(id) || (!ativo && !escolha.has(id));
          c.setAttribute('aria-label', 'Selecionar ' + rotulo); c.onchange = () => { if (c.checked) escolha.add(id); else escolha.delete(id); contar(); }; return c;
        };
        const pill = (ativo) => el('span', 'pill ' + (ativo ? 'p-green' : 'p-red'), ativo ? 'Ativo' : 'Inativo');
        const linha = (id, rotulo, ativo, icone, nivel) => {
          const l = el('div', 'compras-hier-linha' + (nivel ? ' filho' : '')); l.setAttribute('role', 'treeitem');
          const ic = el('span', 'compras-hier-icone'); ic.innerHTML = SVG(icone);
          l.append(caixa(id, rotulo, ativo), ic, el('span', 'compras-hier-nome', rotulo));
          if (bloqueados.has(id)) l.append(el('small', 'profiles-note', bloqueados.get(id)));
          l.append(pill(ativo)); return l;
        };
        const desenhar = () => {
          const termo = U.dobrar(busca.value.trim()); arvore.replaceChildren();
          for (const g of grupos()) {
            const filhos = g.subgrupos.filter((s) => !termo || U.dobrar(g.nome + ' ' + s.nome).includes(termo));
            const proprio = !termo || U.dobrar(g.nome).includes(termo);
            if (!proprio && !filhos.length) continue;
            const aberto = Boolean(termo) || abertos.has(g.id); const bloco = el('div', 'compras-hier-grupo');
            const cab = linha(g.id, g.nome, g.ativo, ICO.pasta, 0);
            const seta = el('button', 'compras-hier-seta' + (aberto ? ' aberto' : '')); seta.type = 'button'; seta.innerHTML = SVG(ICO.seta); seta.disabled = !g.subgrupos.length;
            seta.setAttribute('aria-label', (aberto ? 'Recolher ' : 'Expandir ') + g.nome); seta.setAttribute('aria-expanded', String(aberto));
            seta.onclick = () => { if (abertos.has(g.id)) abertos.delete(g.id); else abertos.add(g.id); desenhar(); };
            cab.prepend(seta); cab.querySelector('.compras-hier-nome').after(el('small', 'profiles-note compras-hier-conta', pluralItens(g.subgrupos.length)));
            bloco.append(cab);
            if (aberto) filhos.forEach((s) => bloco.append(linha(g.id + '|' + s.id, g.nome + ' › ' + s.nome, g.ativo && s.ativo, ICO.etiqueta, 1)));
            arvore.append(bloco);
          }
          if (!arvore.children.length) arvore.append(el('p', 'profiles-note', termo ? 'Nada encontrado.' : 'Nenhum grupo de despesa cadastrado em Saídas › Grupos de Despesas.'));
          contar();
        };
        const contar = () => { resumo.textContent = (escolha.size === 1 ? '1 selecionado' : escolha.size + ' selecionados') + '.'; };
        busca.addEventListener('input', desenhar);
        const box = el('div', 'compras-campo compras-largo'); box.append(busca, resumo, arvore); form.append(box); desenhar();
      },
      salvar: () => { aoConfirmar(escolha); },
    });
  }
  const nomeDoGrupo = (id) => {
    const [gid, sid] = String(id).split('|'); const g = grupos().find((x) => x.id === gid); if (!g) return '';
    if (!sid) return g.nome; const s = g.subgrupos.find((x) => x.id === sid); return s ? g.nome + ' › ' + s.nome : '';
  };

  /* =============== Lista de atividades (incluídas ou não incluídas) =============== */
  /**
   * api: { itens() → array vivo, trocar(novoArray), outra() → itens da lista oposta, mudou() }. tipo: 'incluidas' | 'excluidas'.
   * Adicionar, editar e remover; sem repetir e sem pôr a mesma atividade nas duas listas; escolha pela lista de grupos de despesa.
   */
  function listaAtividades({ tipo, cores, api }) {
    const inc = tipo === 'incluidas';
    const no = el('section', 'compras-atividades ' + tipo); no.setAttribute('aria-label', inc ? 'Atividades incluídas no contrato' : 'Atividades não incluídas no contrato');
    const cab = el('div', 'compras-atividades-cab'); const ic = el('span', 'compras-atividades-icone'); ic.innerHTML = SVG(inc ? ICO.cima : ICO.baixo);
    const titulo = el('h4', null, inc ? 'Atividades e responsabilidades incluídas no contrato' : 'Atividades e responsabilidades não incluídas no contrato'); cab.append(ic, titulo);
    const lista = el('ul', 'compras-atividades-lista'); const msg = el('p', 'profiles-error'); msg.setAttribute('role', 'alert');
    const campoTexto = entrada('text', '', { placeholder: inc ? 'Ex.: limpeza das áreas de produção' : 'Ex.: pintura e reformas', maxLength: 200 }); campoTexto.setAttribute('aria-label', (inc ? 'Nova atividade incluída' : 'Nova atividade não incluída')); campoTexto.dataset.textoLivre = '1';
    const adicionar = () => {
      msg.textContent = ''; const r = D.novaAtividade(api.itens(), api.outra(), campoTexto.value);
      if (r.erro) { msg.textContent = r.erro; return; }
      api.trocar([...api.itens(), r.item]); campoTexto.value = ''; desenhar(); api.mudou();
    };
    campoTexto.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } });
    const linhaAdd = el('div', 'compras-form-rodape'); linhaAdd.append(campoTexto, botao('Adicionar', adicionar, 'btn secondary'));
    const escolherGrupos = botao('Escolher da lista de grupos de despesa', () => {
      msg.textContent = '';
      const meus = new Set(api.itens().map((i) => i.ref).filter(Boolean)); const bloqueados = new Map();
      api.outra().forEach((i) => { if (i.ref) bloqueados.set(i.ref, 'Já está em ' + (inc ? '"não incluídas"' : '"incluídas"') + '.'); });
      seletorHierarquico({
        titulo: inc ? 'Atividades incluídas: grupos de despesa' : 'Atividades não incluídas: grupos de despesa', cores, marcados: meus, bloqueados,
        aoConfirmar: (escolha) => {
          let itens = api.itens().filter((i) => !i.ref || escolha.has(i.ref)); const avisos = [];
          escolha.forEach((ref) => {
            if (itens.some((i) => i.ref === ref) || bloqueados.has(ref)) return;
            const nome = nomeDoGrupo(ref); if (!nome) return;
            const r = D.novaAtividade(itens, api.outra(), nome, { ref }); if (r.item) itens = [...itens, r.item]; else avisos.push(nome + ': ' + r.erro);
          });
          api.trocar(itens); desenhar(); api.mudou(); if (avisos.length) msg.textContent = avisos.join(' ');
        },
      });
    }, 'btn secondary');
    function editar(item) {
      U.dialogo({
        titulo: 'Editar atividade', ...cc(cores), rotuloSalvar: 'Salvar',
        montar: (form) => { const t = entrada('text', item.texto, { maxLength: 200 }); t.setAttribute('aria-label', 'Texto da atividade'); t.dataset.textoLivre = '1'; form.append(campo('Atividade', t)); return { t }; },
        salvar: (c) => {
          const r = D.novaAtividade(api.itens(), api.outra(), c.t.value, { ignorarId: item.id, ref: item.ref || '' }); if (r.erro) return r.erro;
          api.trocar(api.itens().map((i) => (i.id === item.id ? { ...i, texto: r.item.texto } : i))); desenhar(); api.mudou(); return null;
        },
      });
    }
    function desenhar() {
      const itens = api.itens(); titulo.dataset.conta = String(itens.length);
      lista.replaceChildren(...(itens.length ? itens.map((i) => {
        const li = el('li', 'compras-atividade-item'); const mar = el('span', 'compras-atividade-marca'); mar.innerHTML = SVG(inc ? ICO.cima : ICO.baixo);
        const acoes = el('span', 'compras-atividade-acoes');
        acoes.append(bolinha('Editar atividade ' + i.texto, ICO.lapis, () => editar(i)), bolinha('Remover atividade ' + i.texto, ICO.lixo, () => { api.trocar(api.itens().filter((x) => x.id !== i.id)); desenhar(); api.mudou(); }));
        li.append(mar, el('span', 'compras-atividade-texto', i.texto), acoes); return li;
      }) : [el('li', 'profiles-note compras-atividade-vazia', inc ? 'Nenhuma atividade incluída ainda.' : 'Nenhuma atividade excluída ainda.')]));
    }
    no.append(cab, lista, linhaAdd, escolherGrupos, msg); desenhar(); no.desenhar = desenhar; return no;
  }

  /* =============== Modelos (tipos) de contrato =============== */
  function abrirModelos({ cores = {}, aoFechar } = {}) {
    U.dialogo({
      titulo: 'Tipos de contrato (modelos)', ...cc(cores), largo: true, classe: 'compras-modelos-dialogo', aoFechar,
      montar: (form) => {
        const lista = el('div', 'compras-modelos-lista'); const aviso = el('p', 'profiles-note compras-largo', 'O contrato do fornecedor guarda uma cópia do modelo no momento em que ele é escolhido: mudar o modelo depois não altera contratos que já foram feitos.');
        const novo = botao('Novo tipo de contrato', () => editarModelo(null), 'btn');
        function desenhar() {
          const ms = modelos().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
          lista.replaceChildren(...(ms.length ? ms.map((m) => {
            const l = el('div', 'compras-modelo-linha'); const t = el('div', 'compras-modelo-texto');
            t.append(el('b', null, m.nome + (m.ativo === false ? ' (inativo)' : '')), el('small', 'profiles-note', 'Versão ' + (m.versao || 1) + ' · ' + (m.clausulas || []).length + ' cláusula(s) · ' + (m.incluidas || []).length + ' incluída(s) · ' + (m.excluidas || []).length + ' não incluída(s)'));
            const ac = el('div', 'compras-atividade-acoes');
            ac.append(bolinha('Editar o modelo ' + m.nome, ICO.lapis, () => editarModelo(m)), botao(m.ativo === false ? 'Reativar' : 'Inativar', () => alternar(m), 'btn secondary'));
            l.append(t, ac); return l;
          }) : [el('p', 'profiles-note', 'Nenhum tipo de contrato cadastrado.')]));
        }
        function alternar(m) { S.transacao((d) => { const x = d.modelosContrato.find((y) => y.id === m.id); if (x) x.ativo = x.ativo === false; }); desenhar(); }
        function editarModelo(m) { abrirEditorModelo({ modelo: m, cores, aoSalvar: desenhar }); }
        form.append(novo, lista, aviso); desenhar();
      },
    });
  }

  function abrirEditorModelo({ modelo, cores, aoSalvar }) {
    const m0 = modelo || {};
    U.dialogo({
      titulo: modelo ? 'Editar tipo de contrato' : 'Novo tipo de contrato', ...cc(cores), largo: true, classe: 'compras-modelo-editor', rotuloSalvar: 'Salvar',
      montar: (form) => {
        let incl = (m0.incluidas || []).map((i) => ({ ...i })); let excl = (m0.excluidas || []).map((i) => ({ ...i }));
        let clausulas = (m0.clausulas || []).map((c) => ({ ...c })); let campos = (m0.camposAdicionais || []).map((c) => ({ ...c }));
        const nome = entrada('text', m0.nome || '', { maxLength: 80 }); nome.setAttribute('aria-label', 'Nome do tipo de contrato'); nome.dataset.textoLivre = '1';
        const descricao = el('textarea'); descricao.rows = 2; descricao.maxLength = 1000; descricao.value = m0.descricao || ''; descricao.dataset.textoLivre = '1'; descricao.setAttribute('aria-label', 'Descrição do modelo');
        const msgs = el('p', 'profiles-error'); msgs.setAttribute('role', 'alert');
        /* cláusulas: só o texto cadastrado aqui; o sistema não escreve cláusula nenhuma */
        const boxCl = el('div', 'compras-modelo-clausulas');
        const desenharCl = () => boxCl.replaceChildren(...clausulas.map((c, k) => {
          const w = el('div', 'compras-modelo-clausula'); const t = entrada('text', c.titulo || '', { maxLength: 120, placeholder: 'Título da cláusula (opcional)' }); t.setAttribute('aria-label', 'Título da cláusula ' + (k + 1)); t.dataset.textoLivre = '1'; t.oninput = () => { c.titulo = t.value; };
          const x = el('textarea'); x.rows = 3; x.maxLength = 4000; x.value = c.texto || ''; x.setAttribute('aria-label', 'Texto da cláusula ' + (k + 1)); x.dataset.textoLivre = '1'; x.oninput = () => { c.texto = x.value; };
          w.append(t, x, bolinha('Remover cláusula ' + (k + 1), ICO.lixo, () => { clausulas.splice(k, 1); desenharCl(); })); return w;
        }));
        const addCl = botao('Adicionar cláusula', () => { clausulas.push({ titulo: '', texto: '' }); desenharCl(); }, 'btn secondary');
        /* atividades */
        const listaInc = listaAtividades({ tipo: 'incluidas', cores, api: { itens: () => incl, trocar: (v) => { incl = v; }, outra: () => excl, mudou: () => {} } });
        const listaExc = listaAtividades({ tipo: 'excluidas', cores, api: { itens: () => excl, trocar: (v) => { excl = v; }, outra: () => incl, mudou: () => {} } });
        const duas = el('div', 'compras-atividades-duas compras-largo'); duas.append(listaInc, listaExc);
        /* condições */
        const valor = entrada('text', Number.isInteger(m0.valorCentavos) ? window.CicluzFieldRules.moneyMask(String(m0.valorCentavos)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 });
        valor.addEventListener('input', () => { valor.value = window.CicluzFieldRules.moneyMask(valor.value); });
        const rec = seletor(D.RECORRENCIAS_CONTRATO.filter(([id]) => id !== 'personalizado'), m0.recorrencia || '', 'Não definida');
        const vig = entrada('text', m0.vigenciaMeses != null ? String(m0.vigenciaMeses) : '', { inputMode: 'numeric', placeholder: 'Ex.: 12', maxLength: 3 }); vig.addEventListener('input', () => { vig.value = vig.value.replace(/\D/g, ''); });
        const ren = seletor(D.RENOVACOES_CONTRATO.filter(([id]) => id), m0.renovacao || '', 'Não informada');
        /* campos adicionais */
        const boxCa = el('div', 'compras-modelo-campos');
        const desenharCa = () => boxCa.replaceChildren(...campos.map((c, k) => {
          const w = el('div', 'compras-modelo-campo'); const r = entrada('text', c.rotulo || '', { maxLength: 60, placeholder: 'Nome do campo' }); r.setAttribute('aria-label', 'Nome do campo adicional ' + (k + 1)); r.dataset.textoLivre = '1'; r.oninput = () => { c.rotulo = r.value; };
          const t = seletor(D.TIPOS_CAMPO_ADICIONAL, c.tipo || 'texto'); t.setAttribute('aria-label', 'Tipo do campo adicional ' + (k + 1)); t.onchange = () => { c.tipo = t.value; };
          const obL = el('label', 'compras-interruptor'); const obI = entrada('checkbox'); obI.checked = Boolean(c.obrigatorio); obI.onchange = () => { c.obrigatorio = obI.checked; }; obL.append(obI, el('span', null, 'Obrigatório'));
          w.append(r, t, obL, bolinha('Remover campo adicional ' + (k + 1), ICO.lixo, () => { campos.splice(k, 1); desenharCa(); })); return w;
        }));
        const addCa = botao('Adicionar campo adicional', () => { campos.push({ id: S.novoId('ca'), rotulo: '', tipo: 'texto', obrigatorio: false }); desenharCa(); }, 'btn secondary');
        const sec = (t, ...nos) => { const f = el('fieldset', 'compras-fieldset'); f.append(el('legend', null, t), ...nos); return f; };
        form.append(sec('Identificação', campo('Nome do tipo de contrato *', nome), campo('Descrição', descricao)),
          sec('Cláusulas', el('small', 'profiles-note compras-largo', 'Escreva só o texto aprovado pela empresa. O sistema não cria cláusulas.'), boxCl, addCl),
          sec('Atividades e responsabilidades', duas),
          sec('Valores, vigência e renovação', campo('Valor (R$)', valor), campo('Tipo de recorrência', rec), campo('Vigência (meses)', vig), campo('Renovação', ren)),
          sec('Campos adicionais do contrato', el('small', 'profiles-note compras-largo', 'Informações a preencher no fornecedor quando este modelo for escolhido (texto, data, número ou valor).'), boxCa, addCa), msgs);
        desenharCl(); desenharCa();
        return { nome, descricao, valor, rec, vig, ren, msgs, get: () => ({ clausulas, campos, incl, excl }) };
      },
      salvar: (c) => {
        const { clausulas, campos, incl, excl } = c.get(); const dig = String(c.valor.value).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        const novo = {
          id: modelo ? modelo.id : S.novoId('mc'), nome: c.nome.value.replace(/\s+/g, ' ').trim(), descricao: c.descricao.value.trim(),
          clausulas: clausulas.map((x) => ({ titulo: String(x.titulo || '').trim(), texto: String(x.texto || '').trim() })), incluidas: incl, excluidas: excl,
          valorCentavos: dig ? parseInt(dig, 10) : null, recorrencia: c.rec.value, vigenciaMeses: c.vig.value ? parseInt(c.vig.value, 10) : null, renovacao: c.ren.value,
          camposAdicionais: campos.map((x) => ({ id: x.id, rotulo: String(x.rotulo || '').trim(), tipo: x.tipo || 'texto', obrigatorio: Boolean(x.obrigatorio) })), ativo: modelo ? modelo.ativo !== false : true,
        };
        const falta = D.validarModeloContrato(novo, { modelos: modelos() }); if (falta) return falta;
        const assinatura = (m) => JSON.stringify([m.nome, m.descricao || '', m.clausulas || [], m.incluidas || [], m.excluidas || [], m.valorCentavos == null ? null : m.valorCentavos, m.recorrencia || '', m.vigenciaMeses == null ? null : m.vigenciaMeses, m.renovacao || '', m.camposAdicionais || []]);
        const mudou = !modelo || assinatura(novo) !== assinatura(modelo); // só sobe a versão quando o conteúdo mudou
        const agora = S.agoraIso();
        const ok = S.transacao((d) => {
          if (!Array.isArray(d.modelosContrato)) d.modelosContrato = [];
          if (modelo) { const x = d.modelosContrato.find((y) => y.id === modelo.id); if (!x) throw new Error('modelo'); Object.assign(x, novo, { versao: (modelo.versao || 1) + (mudou ? 1 : 0), atualizadoEm: agora }); }
          else d.modelosContrato.push({ ...novo, versao: 1, criadoEm: agora, atualizadoEm: agora });
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Tipo de contrato salvo.'); if (aoSalvar) aoSalvar(); return null;
      },
    });
  }

  /* =============== Documento do contrato (imprimir, enviar, visualizar) =============== */
  const dataBR = (iso) => (iso ? window.CicluzDateFields.display(iso) : '');
  const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
  /** Seções [título, [[rótulo, texto]] ou { itens: [texto] }] só com o que está cadastrado. Nada jurídico é acrescentado pelo sistema. */
  function secoesContrato(f) {
    const c = f.contrato || {}; const pf = f.tipoPessoa === 'fisica'; const e = f.endereco || {}; const empresa = window.CicluzSessao && window.CicluzSessao.perfil && window.CicluzSessao.perfil.empresa ? window.CicluzSessao.perfil.empresa.nome : '';
    const secoes = [];
    secoes.push(['Partes', [['Contratante', empresa], [pf ? 'Contratado (pessoa física)' : 'Contratado', f.razaoSocial || f.nome], [pf ? 'CPF' : 'CNPJ', f.documento], ['Endereço', [e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep].filter(Boolean).join(', ')]]]);
    secoes.push(['Tipo de contrato', [['Modelo', c.modeloNome ? c.modeloNome + (c.modeloVersao ? ' (versão ' + c.modeloVersao + ')' : '') : '']]]);
    if ((c.atividadesIncluidas || []).length) secoes.push(['Atividades e responsabilidades incluídas no contrato', { itens: c.atividadesIncluidas.map((i) => i.texto) }]);
    if ((c.atividadesExcluidas || []).length) secoes.push(['Atividades e responsabilidades não incluídas no contrato', { itens: c.atividadesExcluidas.map((i) => i.texto) }]);
    const rec = c.recorrencia === 'personalizado' ? 'Personalizado' : c.recorrencia === 'compra-mensal' ? 'Compra Mensal' : nomeDe(D.RECORRENCIAS_CONTRATO, c.recorrencia);
    secoes.push(['Condições', [['Forma de pagamento', nomeDe(D.FORMAS_PAGAMENTO_CONTRATO, c.formaPagamento)], ['Recorrência', rec], ['Valor', Number.isInteger(c.valorCentavos) ? D.moeda(c.valorCentavos / 100) : ''],
      ['Início da vigência', dataBR(c.inicio)], ['Término da vigência', dataBR(c.fim)], ['Renovação', nomeDe(D.RENOVACOES_CONTRATO, c.renovacao)], ['Reajuste', nomeDe(D.REAJUSTES_CONTRATO, c.reajuste)], ['Observações do contrato', c.observacoes]]]);
    const vals = c.camposAdicionais || {};
    const extras = (c.camposAdicionaisDef || []).map((d) => { const v = vals[d.id]; return [d.rotulo, d.tipo === 'data' ? dataBR(v) : d.tipo === 'moeda' && Number.isInteger(v) ? D.moeda(v / 100) : v]; });
    if (extras.length) secoes.push(['Informações adicionais', extras]);
    if ((c.clausulas || []).length) secoes.push(['Cláusulas', { itens: c.clausulas.map((x, k) => (x.titulo ? (k + 1) + '. ' + x.titulo + ': ' : (k + 1) + '. ') + x.texto) }]);
    return secoes.map(([t, l]) => [t, Array.isArray(l) ? l.filter(([, v]) => v !== '' && v != null) : l]).filter(([, l]) => (Array.isArray(l) ? l.length : l.itens.length));
  }
  /** Se faltar dado, devolve true depois de mostrar a lista do que falta (nenhum documento é gerado). */
  function incompleto(f, aviso) {
    const faltas = D.faltasDoContrato(f);
    if (!faltas.length) { aviso.textContent = ''; return false; }
    aviso.textContent = faltas.length === 1 && /Tem contrato/.test(faltas[0]) ? faltas[0] : 'O documento só é gerado com o contrato completo. Falta: ' + faltas.join('; ') + '.';
    return true;
  }
  function imprimirContrato(f) {
    const ifr = document.createElement('iframe'); ifr.setAttribute('aria-hidden', 'true'); ifr.tabIndex = -1; ifr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.append(ifr);
    const d = ifr.contentDocument; d.open(); d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato</title></head><body></body></html>'); d.close();
    const mk = (tag, texto, css) => { const n = d.createElement(tag); if (texto != null) n.textContent = texto; if (css) n.style.cssText = css; return n; };
    d.body.style.cssText = 'font:13px/1.5 Arial,sans-serif;color:#111;margin:28px';
    d.body.append(mk('h1', 'Contrato — ' + ((f.contrato && f.contrato.modeloNome) || ''), 'font-size:20px;margin:0 0 4px'), mk('p', 'Documento gerado pelo sistema a partir dos dados cadastrados. Não é um contrato assinado e não substitui a revisão da empresa.', 'margin:0 0 14px;color:#555'));
    secoesContrato(f).forEach(([t, l]) => {
      d.body.append(mk('h2', t, 'font-size:14px;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:2px'));
      if (Array.isArray(l)) l.forEach(([k, v]) => { const p = mk('p', null, 'margin:2px 0'); p.append(mk('b', k + ': '), d.createTextNode(String(v))); d.body.append(p); });
      else { const ol = mk('ol', null, 'margin:4px 0 0 18px;padding:0'); l.itens.forEach((x) => ol.append(mk('li', x, 'margin:2px 0'))); d.body.append(ol); }
    });
    // Linhas de assinatura em branco: a assinatura é feita à mão, depois de impresso. Imprimir não registra assinatura.
    const ass = mk('div', null, 'display:flex;gap:40px;margin-top:56px'); [['Contratante', ''], ['Contratado', '']].forEach(([t]) => { const b = mk('div', null, 'flex:1;text-align:center'); b.append(mk('div', null, 'border-top:1px solid #000;margin-bottom:4px'), mk('small', t)); ass.append(b); });
    d.body.append(ass);
    const limpar = () => { if (ifr.isConnected) ifr.remove(); }; ifr.contentWindow.addEventListener('afterprint', limpar); setTimeout(limpar, 120000); ifr.contentWindow.focus(); ifr.contentWindow.print();
  }
  function visualizarContrato(f, cores) {
    U.dialogo({
      titulo: 'Contrato — visualização', ...cc(cores), largo: true,
      montar: (form) => {
        form.append(el('p', 'profiles-note compras-largo', 'Prévia do documento gerado a partir dos dados cadastrados. Não é um contrato assinado.'));
        secoesContrato(f).forEach(([t, l]) => {
          const fs = el('fieldset', 'compras-fieldset compras-largo'); fs.append(el('legend', null, t));
          if (Array.isArray(l)) { const dl = el('dl', 'profiles-info'); l.forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, String(v)))); fs.append(dl); }
          else { const ol = el('ol'); l.itens.forEach((x) => ol.append(el('li', null, x))); fs.append(ol); }
          form.append(fs);
        });
      },
    });
  }
  function assinaturaDigital(cores) {
    U.dialogo({
      titulo: 'Assinatura digital', ...cc(cores),
      montar: (form) => {
        form.append(el('p', null, 'A assinatura digital ainda não está ativa neste sistema.'),
          el('small', 'profiles-note', 'Falta contratar e integrar um serviço de assinatura eletrônica. Enquanto isso, nada é enviado e nenhuma assinatura é registrada. Use "Imprimir / Assinatura Física" para assinar à mão.'));
      },
    });
  }
  /** Botões do documento: Imprimir / Assinatura Física, Enviar / Assinatura Digital e Visualizar contrato. lerFornecedor() devolve o cadastro lido do formulário. */
  function botoesDocumento({ lerFornecedor, cores, aviso }) {
    const linha = el('div', 'compras-form-rodape compras-largo compras-doc-acoes');
    linha.append(
      U.botaoTitulo('Imprimir / Assinatura Física', 'Imprimir o contrato para assinar à mão', () => { const f = lerFornecedor(); if (!incompleto(f, aviso)) imprimirContrato(f); }, ICO.imprimir),
      U.botaoTitulo('Enviar / Assinatura Digital', 'Enviar o contrato para assinatura digital', () => { const f = lerFornecedor(); if (!incompleto(f, aviso)) assinaturaDigital(cores); }, U.ICONES.send),
      U.botaoTitulo('Visualizar contrato', 'Ver o documento do contrato', () => { const f = lerFornecedor(); if (!incompleto(f, aviso)) visualizarContrato(f, cores); }, ICO.olho),
    );
    return linha;
  }

  window.CicluzContratos = { abrirModelos, listaAtividades, seletorHierarquico, botoesDocumento, secoesContrato, modelos };
})();
