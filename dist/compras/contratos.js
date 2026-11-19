/*
 * Contratos do fornecedor e do cliente (18/11/2026; a etapa Contrato em blocos é a mesma nos dois cadastros — etapaContrato): atividades e responsabilidades incluídas e não incluídas, seleção hierárquica no padrão de
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
  // perigo: o botão de excluir, em vermelho (padrão do sistema: editar na cor do cabeçalho, excluir em vermelho).
  const bolinha = (rotulo, desenho, acao, perigo) => { const b = el('button', 'shortcut-circle compras-redondo' + (perigo ? ' perigo' : '')); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = SVG(desenho); b.onclick = acao; return b; };
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
        acoes.append(bolinha('Editar atividade ' + i.texto, ICO.lapis, () => editar(i)), bolinha('Excluir atividade ' + i.texto, ICO.lixo, () => { api.trocar(api.itens().filter((x) => x.id !== i.id)); desenhar(); api.mudou(); }, true));
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
          w.append(t, x, bolinha('Excluir cláusula ' + (k + 1), ICO.lixo, () => { clausulas.splice(k, 1); desenharCl(); }, true)); return w;
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
          w.append(r, t, obL, bolinha('Excluir campo adicional ' + (k + 1), ICO.lixo, () => { campos.splice(k, 1); desenharCa(); }, true)); return w;
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
  const enderecoTexto = (e) => { const x = e || {}; return [x.logradouro, x.numero, x.complemento, x.bairro, x.cidade, x.uf, x.cep].filter(Boolean).join(', '); };
  const empresasCadastradas = () => (window.CicluzEmpresa && window.CicluzEmpresa.todas ? window.CicluzEmpresa.todas() : []);
  /**
   * As duas partes do contrato, só com o que está cadastrado: a sua empresa (Configurações → Empresa) e o fornecedor ou o cliente.
   * papel 'fornecedor': a empresa contrata o fornecedor. papel 'cliente': o cliente (pessoa jurídica ou física) contrata a empresa.
   */
  /** Qualificação de quem assina, como um contrato pede: nacionalidade, estado civil, profissão, RG, CPF e endereço. Só o que estiver cadastrado. */
  const qualificacaoDe = (r) => {
    if (!r) return '';
    const E = window.CicluzEmpresa || {}; const end = enderecoTexto(r.endereco);
    return [r.nacionalidade, nomeDe(E.ESTADOS_CIVIS || [], r.estadoCivil), r.profissao, r.rg ? 'RG ' + r.rg + (r.rgOrgao ? ' (' + r.rgOrgao + ')' : '') : '', r.cpf ? 'CPF ' + r.cpf : '', end ? 'endereço: ' + end : ''].filter(Boolean).join(', ');
  };
  function partesDoContrato(f, papel = 'fornecedor') {
    const c = f.contrato || {}; const cliente = papel === 'cliente'; const pf = !cliente && f.tipoPessoa === 'fisica';
    const emp = empresasCadastradas().find((x) => x.id === c[D.papelContrato(papel).empresa]) || null;
    const respEmp = emp && (emp.responsaveis || []).find((r) => String(r.nome || '').trim());
    const cargoEmp = respEmp && window.CicluzEmpresa.CARGOS_EMPRESA ? nomeDe(window.CicluzEmpresa.CARGOS_EMPRESA, respEmp.cargo) : '';
    const rep2 = f.representante || {};
    const empresa = { nome: emp ? emp.razaoSocial || emp.nomeFantasia || '' : '', fantasia: emp ? emp.nomeFantasia || '' : '', documento: emp ? emp.cnpj || '' : '', pf: false, endereco: emp ? enderecoTexto(emp.endereco) : '',
      representante: respEmp ? respEmp.nome : '', cargo: cargoEmp, qualificacao: qualificacaoDe(respEmp) };
    const clientePF = cliente && f.tipoPessoa === 'fisica';
    const outra = clientePF
      // Cliente pessoa física: ele mesmo assina; a qualificação traz o que o documento e o endereço (linhas próprias) não mostram.
      ? { nome: f.nome || '', fantasia: '', documento: f.cpf || '', pf: true, endereco: enderecoTexto(f.endereco), representante: f.nome || '', cargo: '',
        qualificacao: qualificacaoDe({ nacionalidade: f.nacionalidade, estadoCivil: f.estadoCivil, profissao: f.profissao, rg: f.rg, rgOrgao: f.rgOrgao }) }
      : cliente
      ? { nome: f.razaoSocial || f.nomeFantasia || '', fantasia: f.razaoSocial && f.nomeFantasia !== f.razaoSocial ? f.nomeFantasia || '' : '', documento: f.cnpj || '', pf: false, endereco: enderecoTexto(f.endereco),
        // Com contrato, o responsável legal do cliente é cadastrado por completo (cargo da lista de Dados da Empresa e a qualificação).
        representante: rep2.nome || '', cargo: (c.temDocumento && window.CicluzEmpresa && nomeDe(window.CicluzEmpresa.CARGOS_EMPRESA || [], rep2.cargoEmpresa)) || nomeDe(D.CARGOS_REPRESENTANTE, rep2.cargo),
        qualificacao: c.temDocumento ? qualificacaoDe(rep2) : '' }
      : { nome: f.razaoSocial || f.nome || '', fantasia: pf ? '' : (f.razaoSocial && f.nome !== f.razaoSocial ? f.nome : ''), documento: f.documento || '', pf, endereco: enderecoTexto(f.endereco),
        // Com contrato, o responsável legal do fornecedor é cadastrado por completo (cargo da lista de Dados da Empresa e a qualificação).
        representante: pf ? f.nome || '' : rep2.nome || '', cargo: pf ? '' : (c.tem && window.CicluzEmpresa && nomeDe(window.CicluzEmpresa.CARGOS_EMPRESA || [], rep2.cargoEmpresa)) || nomeDe(D.CARGOS_REPRESENTANTE, rep2.cargo),
        qualificacao: c.tem ? qualificacaoDe(rep2) : '' };
    return cliente ? { contratante: outra, contratado: empresa } : { contratante: empresa, contratado: outra };
  }
  const tituloDoContrato = (f, papel) => (papel !== 'cliente' && (f.categorias || []).includes('servico') ? 'Contrato de prestação de serviços' : 'Contrato de fornecimento');
  /**
   * Contrato padrão em blocos (18/11/2026, Rodrigo): o documento é montado na ordem dos blocos da etapa Contrato — contratante,
   * contratado, objeto do contrato (produtos, despesas e patrimônios vinculados), valor e pagamento, vigência e vencimento, reajuste, o que está incluso, o que não está, condições de rescisão e,
   * por fim, as camadas opcionais (cláusulas do tipo de contrato, informações adicionais, observações). Só entra o que está
   * preenchido; os blocos são numerados na ordem em que aparecem. Seção = [título, [[rótulo, texto]] | { itens } | { texto }].
   * Nada jurídico é acrescentado pelo sistema: o texto da rescisão é o que a pessoa escreveu.
   */
  function secoesContrato(f, papel = 'fornecedor') {
    const c = f.contrato || {}; const p = partesDoContrato(f, papel);
    const pessoa = (x, rotuloNome, rotuloDoc) => [[rotuloNome, x.nome], ['Nome fantasia', x.fantasia], [rotuloDoc, x.documento], ['Endereço', x.endereco], ['Representante legal', [x.representante, x.cargo].filter(Boolean).join(' — ')], ['Qualificação do representante', x.qualificacao]];
    const rec = c.recorrencia === 'personalizado' ? 'Personalizado' : c.recorrencia === 'compra-mensal' ? 'Compra Mensal' : nomeDe(D.RECORRENCIAS_CONTRATO, c.recorrencia);
    const vencimento = c.diaPagamento === 'sexta' ? 'Toda sexta-feira' : c.vencimentoData ? dataBR(c.vencimentoData) : Number.isInteger(c.vencimentoDia) ? 'Todo dia ' + c.vencimentoDia : '';
    const reajuste = nomeDe(D.REAJUSTES_CONTRATO, c.reajuste) + (c.reajuste === 'percentual' && typeof c.reajustePercentual === 'number' && !Number.isNaN(c.reajustePercentual) ? ' de ' + String(c.reajustePercentual).replace('.', ',') + '%' : '');
    const vals = c.camposAdicionais || {};
    const extras = (c.camposAdicionaisDef || []).map((d) => { const v = vals[d.id]; return [d.rotulo, d.tipo === 'data' ? dataBR(v) : d.tipo === 'moeda' && Number.isInteger(v) ? D.moeda(v / 100) : v]; });
    const secoes = [
      ['Contratante', pessoa(p.contratante, p.contratante.pf ? 'Nome completo' : 'Razão social', p.contratante.pf ? 'CPF' : 'CNPJ')],
      ['Contratado', pessoa(p.contratado, p.contratado.pf ? 'Nome completo' : 'Razão social', p.contratado.pf ? 'CPF' : 'CNPJ')],
      ['Objeto do contrato', [['Produtos', ((c.objeto || {}).produtoIds || []).map(nomeDoObjeto.produto).join('; ')], ['Despesas', ((c.objeto || {}).despesaIds || []).map(nomeDoObjeto.despesa).join('; ')], ['Patrimônios', ((c.objeto || {}).patrimonioIds || []).map(nomeDoObjeto.patrimonio).join('; ')]]],
      ['Valor e pagamento', [['Valor', Number.isInteger(c.valorCentavos) ? D.moeda(c.valorCentavos / 100) : ''], ['Recorrência', rec], ['Forma de pagamento', nomeDe(D.FORMAS_PAGAMENTO_CONTRATO, c.formaPagamento)]]],
      ['Vigência e vencimento', [['Início da vigência', dataBR(c.inicio)], ['Término da vigência', dataBR(c.fim)], ['Renovação', nomeDe(D.RENOVACOES_CONTRATO, c.renovacao)], ['Vencimento', vencimento]]],
      ['Reajuste', [['Reajuste', reajuste]]],
      ['O que está incluso no contrato', { itens: (c.atividadesIncluidas || []).map((i) => i.texto) }],
      ['O que não está incluso no contrato', { itens: (c.atividadesExcluidas || []).map((i) => i.texto) }],
      ['Condições de rescisão', { texto: String(c.rescisao || '').trim() }],
      ['Cláusulas' + (c.modeloNome ? ' — ' + c.modeloNome + (c.modeloVersao ? ' (versão ' + c.modeloVersao + ')' : '') : ''), { itens: (c.clausulas || []).map((x) => (x.titulo ? x.titulo + ': ' : '') + x.texto) }],
      ['Informações adicionais', extras],
      ['Observações', { texto: String(c.observacoes || '').trim() }],
    ];
    return secoes.map(([t, l]) => [t, Array.isArray(l) ? l.filter(([, v]) => v !== '' && v != null) : l])
      .filter(([, l]) => (Array.isArray(l) ? l.length : l.itens ? l.itens.length : Boolean(l.texto)))
      .map(([t, l], k) => [(k + 1) + '. ' + t, l]);
  }
  /** Nome de cada item do objeto do contrato, lido do cadastro de origem na hora (o vínculo é por id). */
  const bensCadastrados = () => { const p = window.CicluzProducaoDados; return (p && p.patrimonio && p.patrimonio.dados && p.patrimonio.dados.bens) || []; };
  const nomeDoObjeto = {
    produto: (id) => (S.produto(id) || {}).descricao || 'Produto removido',
    despesa: (id) => nomeDoGrupo(id) || 'Grupo de despesa removido',
    patrimonio: (id) => (bensCadastrados().find((b) => b.id === id) || {}).nome || 'Patrimônio removido',
  };
  /** Se faltar dado, devolve true depois de mostrar a lista do que falta (nenhum documento é gerado). */
  function incompleto(f, aviso, papel) {
    const faltas = D.faltasDoContrato(f, papel);
    if (!faltas.length) { aviso.textContent = ''; return false; }
    aviso.textContent = faltas.length === 1 && /Tem contrato/.test(faltas[0]) ? faltas[0] : 'O documento só é gerado com o contrato completo. Falta: ' + faltas.join('; ') + '.';
    return true;
  }
  function imprimirContrato(f, papel) {
    const ifr = document.createElement('iframe'); ifr.setAttribute('aria-hidden', 'true'); ifr.tabIndex = -1; ifr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.append(ifr);
    const d = ifr.contentDocument; d.open(); d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato</title></head><body></body></html>'); d.close();
    const mk = (tag, texto, css) => { const n = d.createElement(tag); if (texto != null) n.textContent = texto; if (css) n.style.cssText = css; return n; };
    d.body.style.cssText = 'font:13px/1.5 Arial,sans-serif;color:#111;margin:28px';
    const partes = partesDoContrato(f, papel);
    d.body.append(mk('h1', tituloDoContrato(f, papel), 'font-size:20px;margin:0 0 4px'), mk('p', 'Documento gerado pelo sistema a partir dos dados cadastrados. Não é um contrato assinado e não substitui a revisão da empresa.', 'margin:0 0 14px;color:#555'));
    secoesContrato(f, papel).forEach(([t, l]) => {
      d.body.append(mk('h2', t, 'font-size:14px;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:2px'));
      if (Array.isArray(l)) l.forEach(([k, v]) => { const p = mk('p', null, 'margin:2px 0'); p.append(mk('b', k + ': '), d.createTextNode(String(v))); d.body.append(p); });
      else if (l.itens) { const ol = mk('ol', null, 'margin:4px 0 0 18px;padding:0'); l.itens.forEach((x) => ol.append(mk('li', x, 'margin:2px 0'))); d.body.append(ol); }
      else d.body.append(mk('p', l.texto, 'margin:2px 0;white-space:pre-wrap'));
    });
    // Linhas de assinatura com o nome de quem assina por cada parte: a assinatura é feita à mão, depois de impresso. Imprimir não registra assinatura.
    d.body.append(mk('h2', 'Assinaturas', 'font-size:14px;margin:24px 0 6px;border-bottom:1px solid #999;padding-bottom:2px'), mk('p', 'Local e data: ______________________________, ____ de ______________ de ________.', 'margin:8px 0 0'));
    const ass = mk('div', null, 'display:flex;gap:40px;margin-top:56px'); [['Contratante', partes.contratante], ['Contratado', partes.contratado]].forEach(([t, x]) => { const b = mk('div', null, 'flex:1;text-align:center'); b.append(mk('div', null, 'border-top:1px solid #000;margin-bottom:4px'), mk('div', t + (x.nome ? ': ' + x.nome : ''), 'font-weight:bold'), mk('small', [x.representante, x.cargo].filter(Boolean).join(' — '))); ass.append(b); });
    d.body.append(ass);
    const limpar = () => { if (ifr.isConnected) ifr.remove(); }; ifr.contentWindow.addEventListener('afterprint', limpar); setTimeout(limpar, 120000); ifr.contentWindow.focus(); ifr.contentWindow.print();
  }
  function visualizarContrato(f, cores, papel) {
    U.dialogo({
      titulo: tituloDoContrato(f, papel) + ' — visualização', ...cc(cores), largo: true,
      montar: (form) => {
        form.append(el('p', 'profiles-note compras-largo', 'Prévia do documento gerado a partir dos dados cadastrados. Não é um contrato assinado.'));
        secoesContrato(f, papel).forEach(([t, l]) => {
          const fs = el('fieldset', 'compras-fieldset compras-largo'); fs.append(el('legend', null, t));
          if (Array.isArray(l)) { const dl = el('dl', 'profiles-info'); l.forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, String(v)))); fs.append(dl); }
          else if (l.itens) { const ol = el('ol'); l.itens.forEach((x) => ol.append(el('li', null, x))); fs.append(ol); }
          else { const p = el('p', 'compras-contrato-texto', l.texto); fs.append(p); }
          form.append(fs);
        });
        // Quem assina: só os nomes; a assinatura continua sendo feita no papel (ou, no futuro, pelo serviço de assinatura digital).
        const partes = partesDoContrato(f, papel); const fsA = el('fieldset', 'compras-fieldset compras-largo'); fsA.append(el('legend', null, 'Assinaturas'));
        const dlA = el('dl', 'profiles-info'); [['Contratante', partes.contratante], ['Contratado', partes.contratado]].forEach(([t, x]) => dlA.append(el('dt', null, t), el('dd', null, [x.nome, [x.representante, x.cargo].filter(Boolean).join(' — ')].filter(Boolean).join(' · ') || '—')));
        fsA.append(dlA); form.append(fsA);
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
  /** Botões do documento: Imprimir / Assinatura Física, Enviar / Assinatura Digital e Visualizar contrato. lerFornecedor() devolve o cadastro lido do formulário (do fornecedor ou, com papel 'cliente', do cliente). */
  function botoesDocumento({ lerFornecedor, cores, aviso, papel = 'fornecedor' }) {
    const linha = el('div', 'compras-form-rodape compras-largo compras-doc-acoes');
    linha.append(
      U.botaoTitulo('Imprimir / Assinatura Física', 'Imprimir o contrato para assinar à mão', () => { const f = lerFornecedor(); if (!incompleto(f, aviso, papel)) imprimirContrato(f, papel); }, ICO.imprimir),
      U.botaoTitulo('Enviar / Assinatura Digital', 'Enviar o contrato para assinatura digital', () => { const f = lerFornecedor(); if (!incompleto(f, aviso, papel)) assinaturaDigital(cores); }, U.ICONES.send),
      U.botaoTitulo('Visualizar contrato', 'Ver o documento do contrato', () => { const f = lerFornecedor(); if (!incompleto(f, aviso, papel)) visualizarContrato(f, cores, papel); }, ICO.olho),
    );
    return linha;
  }

  /* =============== Etapa Contrato em blocos (fornecedor e cliente) =============== */
  /**
   * Monta a etapa Contrato, a mesma nos dois cadastros (18/11/2026, Rodrigo: "no contrato do cliente, trazer o modelo criado no
   * cadastro de fornecedor"). Os blocos seguem a ordem em que o documento é montado: 1 Contratante · 2 Contratado · 3 Valor,
   * vencimento e reajuste · 4 O que está incluso · 5 O que não está incluso · 6 Condições de rescisão · 7 Tipo de contrato e
   * cláusulas (opcional) · 8 Assinaturas e documento. Entre o Contratado e o Valor entra o Objeto do contrato (os números abaixo já contam com ele).
   * papel: 'fornecedor' (a sua empresa contrata o fornecedor) ou 'cliente' (o cliente contrata a sua empresa).
   * lerRegistro(): o cadastro lido do formulário. mensal(): só no cliente, diz se "É cliente mensal?" está ligado.
   * temExterno(): quando a pergunta "Terá contrato?" é feita em outra etapa (a do responsável legal, nos dois cadastros), devolve a resposta;
   * aí esta etapa não repete a pergunta e traz só os blocos.
   * Devolve { nos, ler, datas, pintar, bloco }. Tudo só informado: sem fórmula, sem lançamento e sem cálculo de reajuste.
   */
  function etapaContrato({ contrato, papel = 'fornecedor', lerRegistro, cores, mensal, temExterno }) {
    const cliente = papel === 'cliente'; const P = D.papelContrato(papel);
    const R = () => window.CicluzFieldRules;
    const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };
    const ct = contrato || {};
    const cDados = el('fieldset', 'compras-fieldset');
    cDados.append(el('legend', null, 'Dados do contrato'));
    const temContrato = U.quadroSituacao('Tem contrato?', Boolean(ct[P.tem]), { textos: ['Sim', 'Não'], dica: cliente ? 'Contrato de fornecimento com este cliente.' : 'Contrato de fornecimento ou de prestação de serviço com este fornecedor.', aoMudar: () => pintarContrato() });
    temContrato.classList.add('compras-largo');
    const temAtivo = () => (temExterno ? Boolean(temExterno()) : temContrato.ativo);
    // Forma de pagamento: Boleto ou Dinheiro. Valor antigo (PIX, transferência) continua aparecendo até ser trocado.
    const formas = [...(cliente ? D.FORMAS_PAGAMENTO_CONTRATO : D.FORMAS_PAGAMENTO_FORNECEDOR)];
    const formaAntiga = ct.formaPagamento && !formas.some(([id]) => id === ct.formaPagamento) ? D.FORMAS_PAGAMENTO_CONTRATO.find(([id]) => id === ct.formaPagamento) : null;
    if (formaAntiga) formas.push([formaAntiga[0], formaAntiga[1] + ' (cadastro anterior)']);
    const cForma = seletor(formas, ct.formaPagamento || '', 'Selecione');
    const formaCampo = campo('Forma de pagamento', cForma);
    // No fornecedor, pagamento em dinheiro é toda sexta-feira. No cliente mensal, a forma e o vencimento vêm das Informações de cobrança.
    const sexta = () => !cliente && cForma.value === 'dinheiro';
    const ehMensal = () => Boolean(mensal && mensal());
    const notaMensal = el('p', 'profiles-note compras-largo', 'Cliente mensal: fechamento do dia 1º ao último dia do mês, pagamento por boleto, com vencimento todo dia ' + D.CLIENTE_MENSAL.vencimentoDia + ' (definido nas Informações de cobrança, na etapa do responsável financeiro).');
    const cVencData = entrada('date', ct.vencimentoData || '');
    const vencDataCampo = campo('Data de vencimento do boleto', cVencData);
    const diaPagtoCampo = el('div', 'compras-campo');
    diaPagtoCampo.append(el('span', 'compras-rotulo', 'Dia de pagamento'), el('strong', null, 'Toda sexta-feira'), el('small', 'profiles-note', 'Só informativo: o sistema não faz o pagamento nem marca como pago.'));
    // Tipo de recorrência no estilo do Calendário e dos Lembretes (recorrencia.js): lista compacta e painel Personalizado.
    const rec = window.CicluzComprasRecorrencia.criar({ valor: ct.recorrencia || '', personalizada: ct.recorrenciaPersonalizada || null, cores: cc(cores), aoMudar: () => pintarValor() });
    // Valor: máscara brasileira (R$ 1.500,00) e a frase informativa conforme a recorrência. Não calcula total nem cria pagamento.
    const cValor = entrada('text', Number.isInteger(ct.valorCentavos) ? R().moneyMask(String(ct.valorCentavos)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 });
    const valorCampo = campo('Valor (R$)', cValor);
    const valorResumo = el('small', 'profiles-note compras-valor-resumo'); valorResumo.setAttribute('aria-live', 'polite');
    valorCampo.append(valorResumo);
    const valorCentavos = () => { const n = D.digitos(cValor.value).replace(/^0+(?=\d)/, ''); return n ? parseInt(n, 10) : null; };
    function pintarValor() { const c = valorCentavos(); valorResumo.textContent = c == null ? '' : D.resumoValorRecorrencia(c, rec.atual()); }
    cValor.addEventListener('input', () => { cValor.value = R().moneyMask(cValor.value); pintarValor(); });
    // Referência ao salário mínimo: só informação cadastral (percentual); não consulta o mínimo nem calcula.
    const sm0 = ct.salarioMinimo || {};
    const smQuadro = U.quadroSituacao('Referência do salário mínimo', Boolean(sm0.ativo), { aoMudar: () => pintarContrato() });
    const smPct = entrada('text', typeof sm0.percentual === 'number' ? String(sm0.percentual).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'Ex.: 50', maxLength: 8 });
    const smPctCampo = campo('Percentual do salário mínimo (%)', smPct);
    // O rótulo com "salário" faria o field-validation.js tratar o campo como dinheiro: o nome para leitor de tela evita isso.
    smPct.setAttribute('aria-label', 'Percentual sobre o mínimo (%)');
    U.mascaraPercentual(smPct); // mostra o "%" enquanto digita
    const smBox = el('div', 'compras-largo compras-sm');
    /* Percentual ↔ valor pelo salário mínimo vigente (18/11/2026, aprovado pelo Rodrigo). O valor do salário vem de Configurações →
       Empresa → Salário Mínimo Vigente. Digitar o percentual calcula o valor; digitar o valor calcula o percentual. Sem salário
       cadastrado, nada é calculado. Contrato já gravado abre como foi salvo: só um aviso diz quando o salário mudou. */
    const smNota = el('small', 'profiles-note'); smNota.setAttribute('role', 'status');
    const smVigente = () => D.salarioMinimoVigente((S.dados && S.dados.salariosMinimos) || [], D.isoData(new Date()));
    const smNumero = () => { const n = D.lerNumero(U.lerPercentual(smPct)); return typeof n === 'number' && n > 0 ? n : null; };
    const pintarSm = () => {
      if (!smQuadro.ativo) { smNota.textContent = ''; return; }
      const v = smVigente();
      if (!v) { smNota.textContent = 'Cadastre o salário mínimo em Configurações → Empresa → Salário Mínimo Vigente para o valor ser calculado. Enquanto isso, nada é calculado.'; return; }
      const base = 'Salário mínimo vigente: ' + D.moeda(v.valorCentavos / 100) + ' (desde ' + window.CicluzDateFields.display(v.inicio) + '). ';
      const esperado = D.valorDoPercentualDoMinimo(v.valorCentavos, smNumero()); const atual = valorCentavos();
      smNota.textContent = base + (esperado != null && atual != null && esperado !== atual
        ? 'Atenção: pelo salário vigente, este percentual dá ' + D.moeda(esperado / 100) + ', e o valor do contrato está em ' + D.moeda(atual / 100) + '. Digite o percentual de novo para atualizar o valor.'
        : 'Digite o percentual para calcular o valor, ou o valor para calcular o percentual.');
    };
    smPct.addEventListener('input', () => {
      const v = smVigente(); const calculado = smQuadro.ativo && v ? D.valorDoPercentualDoMinimo(v.valorCentavos, smNumero()) : null;
      if (calculado != null) { cValor.value = R().moneyMask(String(calculado)); pintarValor(); }
      pintarSm();
    });
    cValor.addEventListener('input', () => {
      const v = smVigente(); const pct = smQuadro.ativo && v ? D.percentualDoValorSobreMinimo(valorCentavos(), v.valorCentavos) : null;
      if (pct != null) smPct.value = String(pct).replace('.', ',') + '%';
      pintarSm();
    });
    smBox.append(smQuadro, smPctCampo, smNota);
    const cInicio = entrada('date', ct.inicio || '');
    const cFim = entrada('date', ct.fim || '');
    const cReajuste = seletor(D.REAJUSTES_CONTRATO, ct.reajuste || '', 'Selecione');
    const cPercentual = entrada('text', ct.reajustePercentual != null ? String(ct.reajustePercentual).replace('.', ',') : '', { inputMode: 'decimal', placeholder: '0,00', maxLength: 6 });
    U.mascaraPercentual(cPercentual);
    const percentualCampo = campo('Percentual do reajuste (%) *', cPercentual);
    const cObs = el('textarea');
    cObs.rows = 3; cObs.maxLength = 2000; cObs.value = ct.observacoes || '';
    const obsCampo = campo('Observações do contrato', cObs);
    obsCampo.classList.add('compras-largo');
    cDados.append(notaMensal, formaCampo, vencDataCampo, diaPagtoCampo, rec.no, valorCampo, smBox, campo('Início da vigência', cInicio), campo('Término da vigência', cFim),
      campo('Reajuste', cReajuste, 'Só o índice combinado; o sistema não calcula o reajuste.'), percentualCampo, obsCampo);
    // Mostra ou esconde os blocos do contrato conforme "Tem contrato?" (a função de verdade é ligada quando a etapa Contrato é montada).
    let pintarBlocosContrato = () => {};
    const pintarContrato = () => {
      pintarBlocosContrato();
      mostrar(notaMensal, ehMensal()); mostrar(formaCampo, !ehMensal());
      mostrar(vencDataCampo, !ehMensal() && !sexta() && cForma.value !== '');
      vencDataCampo.querySelector('.compras-rotulo').textContent = cForma.value === 'boleto' ? 'Data de vencimento do boleto' : 'Data de vencimento';
      mostrar(diaPagtoCampo, !ehMensal() && sexta());
      mostrar(smPctCampo, smQuadro.ativo); pintarSm();
      mostrar(percentualCampo, cReajuste.value === 'percentual');
    };
    cForma.onchange = pintarContrato;
    cReajuste.onchange = pintarContrato;
    pintarContrato();
    pintarValor();
    // Número digitado: null quando vazio, NaN quando não é número (para a validação recusar em vez de virar vazio).
    const numeroOuNada = (input) => { const t = U.lerPercentual(input); if (!t) return null; const n = D.lerNumero(t); return n == null ? NaN : n; };
    // Etapa 6 (18/11/2026): tipo de contrato (cópia do modelo), cláusulas, atividades incluídas e não incluídas e campos adicionais.
    const ct6 = {
      modeloId: ct.modeloId || '', modeloNome: ct.modeloNome || '', modeloVersao: ct.modeloVersao || null, clausulas: (ct.clausulas || []).map((x) => ({ ...x })),
      incl: (ct.atividadesIncluidas || []).map((x) => ({ ...x })), excl: (ct.atividadesExcluidas || []).map((x) => ({ ...x })),
      camposDef: (ct.camposAdicionaisDef || []).map((x) => ({ ...x })), campos: { ...(ct.camposAdicionais || {}) }, renovacao: ct.renovacao || '',
    };
    const datasExtras = [];
    const lerContrato = () => {
      const pct = numeroOuNada(cPercentual); const pctMinimo = numeroOuNada(smPct);
      return {
        modeloId: ct6.modeloId, modeloNome: ct6.modeloNome, modeloVersao: ct6.modeloVersao, clausulas: ct6.clausulas, atividadesIncluidas: ct6.incl, atividadesExcluidas: ct6.excl,
        camposAdicionaisDef: ct6.camposDef, camposAdicionais: ct6.campos, renovacao: ct6.renovacao,
        // Blocos novos do contrato padrão (campos opcionais): a empresa contratante (vínculo por id) e o texto da rescisão.
        [P.empresa]: selContratante.value, rescisao: cRescisao.value.trim(),
        // Objeto do contrato: ids dos cadastros de produtos, grupos de despesa e patrimônios (campo novo e opcional).
        objeto: { produtoIds: [...objeto.produto], despesaIds: [...objeto.despesa], patrimonioIds: [...objeto.patrimonio] },
        [P.tem]: temAtivo(), formaPagamento: cForma.value,
        // Vencimento: só em dinheiro some (o pagamento é toda sexta-feira, informativo). O dia do mês antigo fica guardado como estava.
        vencimentoData: sexta() ? '' : cVencData.value, vencimentoDia: ct.vencimentoDia != null ? ct.vencimentoDia : null,
        diaPagamento: sexta() ? 'sexta' : '',
        ...rec.ler(),
        valorCentavos: valorCentavos(),
        salarioMinimo: { ativo: smQuadro.ativo, percentual: pctMinimo == null ? null : Number.isNaN(pctMinimo) ? NaN : Math.round(pctMinimo * 100) / 100 },
        inicio: cInicio.value, fim: cFim.value,
        reajuste: cReajuste.value, reajustePercentual: cReajuste.value === 'percentual' ? (pct == null ? null : Math.round(pct * 100) / 100) : null,
        observacoes: cObs.value.trim(),
      };
    };
    const blocoContrato = (titulo, explicacao, ...nos) => { const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, titulo), el('p', 'profiles-note compras-largo', explicacao), ...nos); return q; };
    const empresasContratantes = () => (window.CicluzEmpresa && window.CicluzEmpresa.todas ? window.CicluzEmpresa.todas() : []);
    const selContratante = seletor(empresasContratantes().map((e) => [e.id, (e.razaoSocial || e.nomeFantasia || '(empresa sem nome)') + (e.vinculo === 'matriz' ? ' (Matriz)' : '')]),
      empresasContratantes().some((e) => e.id === ct[P.empresa]) ? ct[P.empresa] : (empresasContratantes()[0] || {}).id || '', 'Selecione a empresa');
    const resumoContratante = el('dl', 'profiles-info compras-largo'); const resumoContratado = el('dl', 'profiles-info compras-largo'); const resumoAssinaturas = el('dl', 'profiles-info compras-largo');
    const semEmpresaNota = el('p', 'profiles-note compras-largo', 'Nenhuma empresa cadastrada. Cadastre em Configurações → Empresa → Dados da Empresa para ela aparecer aqui.');
    const pintarPartes = () => {
      const p = partesDoContrato(lerRegistro(), papel);
      const linhas = (dl, x, pares) => dl.replaceChildren(...pares.filter(([, v]) => v).flatMap(([k, v]) => [el('dt', null, k), el('dd', null, v)]), ...(pares.some(([, v]) => v) ? [] : [el('dt', null, 'Sem dados'), el('dd', null, '—')]));
      const quem = (x) => [x.representante, x.cargo].filter(Boolean).join(' — ');
      linhas(resumoContratante, p.contratante, [[p.contratante.pf ? 'Nome completo' : 'Razão social', p.contratante.nome], ['Nome fantasia', p.contratante.fantasia], [p.contratante.pf ? 'CPF' : 'CNPJ', p.contratante.documento], ['Endereço', p.contratante.endereco], ['Representante legal', quem(p.contratante)], ['Qualificação do representante', p.contratante.qualificacao]]);
      linhas(resumoContratado, p.contratado, [[p.contratado.pf ? 'Nome completo' : 'Razão social', p.contratado.nome], ['Nome fantasia', p.contratado.fantasia], [p.contratado.pf ? 'CPF' : 'CNPJ', p.contratado.documento], ['Endereço', p.contratado.endereco], ['Representante legal', quem(p.contratado)], ['Qualificação do representante', p.contratado.qualificacao]]);
      linhas(resumoAssinaturas, null, [['Assina pelo contratante', [p.contratante.nome, quem(p.contratante)].filter(Boolean).join(' · ')], ['Assina pelo contratado', [p.contratado.nome, quem(p.contratado)].filter(Boolean).join(' · ')]]);
      mostrar(semEmpresaNota, !empresasContratantes().length);
    };
    const pintarResumoContrato = () => pintarPartes();
    selContratante.onchange = pintarPartes;
    // Condições de rescisão: texto livre. O "texto sugerido" é só um ponto de partida, com o prazo em branco para a pessoa preencher.
    const RESCISAO_SUGERIDA = 'Qualquer das partes pode encerrar este contrato, sem multa, mediante aviso por escrito à outra parte com antecedência mínima de ____ dias. O contrato também pode ser encerrado de imediato, por qualquer das partes, se a outra descumprir o que foi combinado e não corrigir a falha depois de avisada por escrito. Os valores devidos até a data do encerramento continuam devidos.';
    const cRescisao = el('textarea'); cRescisao.rows = 5; cRescisao.maxLength = 2000; cRescisao.value = ct.rescisao || ''; cRescisao.dataset.textoLivre = '1'; cRescisao.setAttribute('aria-label', 'Condições de rescisão');
    const avisoRescisao = el('p', 'profiles-note compras-largo'); avisoRescisao.setAttribute('role', 'status');
    const linhaRescisao = el('div', 'compras-form-rodape compras-largo');
    linhaRescisao.append(botao('Usar texto sugerido', () => {
      if (cRescisao.value.trim()) { avisoRescisao.textContent = 'Já existe um texto: apague-o antes, se quiser usar o sugerido.'; return; }
      cRescisao.value = RESCISAO_SUGERIDA; avisoRescisao.textContent = 'Texto sugerido inserido: preencha o prazo e revise com quem cuida da parte jurídica da empresa.';
    }, 'btn secondary'));
    const notasModelo = el('p', 'profiles-note'); notasModelo.setAttribute('role', 'status');
    const selModelo = seletor([], '', 'Selecione o tipo de contrato'); selModelo.setAttribute('aria-label', 'Tipo de contrato');
    const modelosAtivos = () => modelos().filter((m) => m.ativo !== false || m.id === ct6.modeloId);
    const pintarModelos = () => {
      selModelo.replaceChildren(new Option(modelosAtivos().length ? 'Selecione o tipo de contrato' : 'Nenhum tipo de contrato cadastrado', ''), ...modelosAtivos().sort((a, b2) => a.nome.localeCompare(b2.nome, 'pt-BR')).map((m) => new Option(m.nome + (m.ativo === false ? ' (inativo)' : ''), m.id)));
      if (ct6.modeloId && !modelosAtivos().some((m) => m.id === ct6.modeloId)) selModelo.append(new Option(ct6.modeloNome + ' (modelo removido)', ct6.modeloId));
      selModelo.value = ct6.modeloId;
    };
    const boxClausulas = el('div', 'compras-largo'); const boxCampos = el('div', 'compras-largo compras-campos-adicionais');
    const desenharClausulas = () => {
      boxClausulas.replaceChildren(...(ct6.clausulas.length ? [el('span', 'compras-rotulo', 'Cláusulas do tipo de contrato (cópia da versão ' + (ct6.modeloVersao || '—') + ')'),
        ...ct6.clausulas.map((x, k) => { const p = el('p', 'profiles-note compras-clausula'); p.append(el('b', null, (k + 1) + '. ' + (x.titulo ? x.titulo + ': ' : '')), document.createTextNode(x.texto)); return p; })] : []));
    };
    const desenharCampos = () => {
      datasExtras.length = 0;
      boxCampos.replaceChildren(...(ct6.camposDef.length ? [el('span', 'compras-rotulo', 'Informações adicionais do contrato'), ...ct6.camposDef.map((d2) => {
        const v = ct6.campos[d2.id]; let inp;
        if (d2.tipo === 'data') { inp = entrada('date', v || ''); datasExtras.push(inp); const sync = () => { ct6.campos[d2.id] = inp.value; }; inp.addEventListener('input', sync); inp.addEventListener('change', sync); }
        else if (d2.tipo === 'moeda') { inp = entrada('text', Number.isInteger(v) ? R().moneyMask(String(v)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 }); inp.addEventListener('input', () => { inp.value = R().moneyMask(inp.value); const n = D.digitos(inp.value).replace(/^0+(?=\d)/, ''); ct6.campos[d2.id] = n ? parseInt(n, 10) : ''; }); }
        else { inp = entrada('text', v == null ? '' : String(v), { inputMode: d2.tipo === 'numero' ? 'decimal' : 'text', maxLength: 500 }); inp.dataset.textoLivre = '1'; inp.addEventListener('input', () => { ct6.campos[d2.id] = inp.value; }); }
        return campo(d2.rotulo + (d2.obrigatorio ? ' *' : ''), inp);
      })] : []));
    };
    const aplicarModelo = (m) => {
      const { patch, notas } = D.aplicarModeloAoContrato(lerContrato(), m);
      ct6.modeloId = patch.modeloId; ct6.modeloNome = patch.modeloNome; ct6.modeloVersao = patch.modeloVersao; ct6.clausulas = patch.clausulas;
      ct6.incl = patch.atividadesIncluidas; ct6.excl = patch.atividadesExcluidas; ct6.camposDef = patch.camposAdicionaisDef;
      const novos = {}; patch.camposAdicionaisDef.forEach((d2) => { if (ct6.campos[d2.id] != null) novos[d2.id] = ct6.campos[d2.id]; }); ct6.campos = novos;
      if ('renovacao' in patch) ct6.renovacao = patch.renovacao;
      if ('valorCentavos' in patch) { cValor.value = R().moneyMask(String(patch.valorCentavos)); pintarValor(); }
      if ('recorrencia' in patch) rec.definir(patch.recorrencia);
      if ('fim' in patch) { cFim.value = patch.fim; cFim.dispatchEvent(new Event('change', { bubbles: true })); }
      notasModelo.textContent = notas.join(' ');
      desenharClausulas(); desenharCampos(); listaInc.desenhar(); listaExc.desenhar(); pintarModelos(); pintarResumoContrato();
    };
    selModelo.onchange = () => {
      const m = modelosAtivos().find((x) => x.id === selModelo.value); if (!m) { selModelo.value = ct6.modeloId; return; }
      if (!ct6.modeloId || ct6.modeloId === m.id) { aplicarModelo(m); return; }
      let ok = false;
      U.dialogo({ titulo: 'Trocar o tipo de contrato?', ...cc(cores), rotuloSalvar: 'Trocar',
        montar: (f2) => { f2.append(el('p', null, 'As cláusulas e os campos adicionais do tipo atual (' + ct6.modeloNome + ') serão trocados pelos de "' + m.nome + '". As atividades que você já tem ficam, e o que já estava preenchido é mantido.')); },
        salvar: () => { ok = true; aplicarModelo(m); },
        aoFechar: () => { if (!ok) selModelo.value = ct6.modeloId; } });
    };
    const abrirModelosBtn = U.botaoTitulo('Tipos de contrato', 'Cadastrar e editar os tipos (modelos) de contrato', () => abrirModelos({ cores, aoFechar: () => { pintarModelos(); } }), U.ICONES.contrato || undefined);
    const linhaModelo = el('div', 'compras-form-rodape compras-largo'); linhaModelo.append(selModelo, abrirModelosBtn);
    const listaInc = listaAtividades({ tipo: 'incluidas', cores, api: { itens: () => ct6.incl, trocar: (v) => { ct6.incl = v; }, outra: () => ct6.excl, mudou: () => pintarResumoContrato() } });
    const listaExc = listaAtividades({ tipo: 'excluidas', cores, api: { itens: () => ct6.excl, trocar: (v) => { ct6.excl = v; }, outra: () => ct6.incl, mudou: () => pintarResumoContrato() } });
    listaInc.classList.add('compras-largo'); listaExc.classList.add('compras-largo');
    const avisoContrato = el('p', 'profiles-error compras-largo'); avisoContrato.setAttribute('role', 'alert');
    const acoesContrato = botoesDocumento({ lerFornecedor: lerRegistro, cores, aviso: avisoContrato, papel });
    pintarModelos(); desenharClausulas(); desenharCampos();
    const campoRescisao = campo('Condições de rescisão', cRescisao); campoRescisao.classList.add('compras-largo');
    const campoEmpresa = campo(cliente ? 'Empresa contratada' : 'Empresa contratante', selContratante);
    cDados.querySelector('legend').textContent = '4 · Valor, vencimento e reajuste';
    cDados.querySelector('legend').after(el('p', 'profiles-note compras-largo', 'Quanto é, como e quando se paga, por quanto tempo vale e como o valor é reajustado.'));
    /* Bloco 3 · Objeto do contrato (18/11/2026, Rodrigo): o que está sendo contratado — produtos, despesas e/ou patrimônios, escolhidos
       dos cadastros que já existem (MER - Produtos, DES - Grupos de Despesas, RET - Patrimônios). Só vínculo por id: nada é digitado,
       nada é calculado e os cadastros de origem não são alterados. Pode ter um ou vários, de mais de um tipo. */
    const obj0 = ct.objeto && typeof ct.objeto === 'object' ? ct.objeto : {};
    const objeto = { produto: new Set(obj0.produtoIds || []), despesa: new Set(obj0.despesaIds || []), patrimonio: new Set(obj0.patrimonioIds || []) };
    // Cada lista na cor da sua origem no menu (18/11/2026, Rodrigo): produtos em Mercadorias, despesas em Despesas, patrimônios em Retiradas.
    const COR_DO_OBJETO = { produto: () => U.corOrigem('mercadorias', '#22c55e'), despesa: () => U.corOrigem('despesas', '#ef4444'), patrimonio: () => U.corOrigem('retiradas', '#2563eb') };
    const caixaObjeto = (tipo, rotulo, rotuloBotao, dica, vazio, plural, escolher) => {
      const box = el('div', 'compras-campo compras-largo compras-objeto-origem'); box.style.setProperty('--menu-accent', COR_DO_OBJETO[tipo]()); const chipsBox = el('div', 'compras-chips'); const resumo = el('p', 'profiles-note'); resumo.setAttribute('role', 'status');
      const desenhar = () => {
        const ids = [...objeto[tipo]];
        chipsBox.replaceChildren(...ids.map((id) => { const nome = nomeDoObjeto[tipo](id); const c = botao(nome + ' ×', () => { objeto[tipo].delete(id); desenhar(); }, 'compras-chip ativo'); c.setAttribute('aria-label', 'Remover ' + nome); return c; }));
        resumo.textContent = ids.length ? plural(ids.length) : vazio;
      };
      const trocar = (escolha) => { objeto[tipo].clear(); escolha.forEach((id) => objeto[tipo].add(id)); desenhar(); };
      const linha = el('div', 'compras-form-rodape'); linha.append(U.botaoTitulo(rotuloBotao, dica, () => escolher(trocar)));
      box.append(el('span', 'compras-rotulo', rotulo), linha, resumo, chipsBox); desenhar();
      return box;
    };
    const n = (q, um, varios) => (q === 1 ? '1 ' + um : q + ' ' + varios) + (q === 1 ? ' vinculado.' : ' vinculados.');
    const objProdutos = caixaObjeto('produto', 'Produtos do contrato', 'Grupo de produtos', 'Escolher os produtos deste contrato', 'Nenhum produto vinculado.', (q) => n(q, 'produto', 'produtos'), (trocar) => U.seletorDeItens({
      titulo: 'Produtos do contrato', rotuloBusca: 'Buscar produto', cor: COR_DO_OBJETO.produto(), corTexto: cc(cores).corTexto, marcados: objeto.produto, aoConfirmar: trocar,
      itens: ((S.dados && S.dados.produtos) || []).filter((p) => p.status === 'ativo' || objeto.produto.has(p.id)).sort((a, b) => String(a.descricao).localeCompare(String(b.descricao), 'pt-BR')).map((p) => ({ id: p.id, rotulo: p.descricao + (p.status === 'ativo' ? '' : ' (inativo)') })),
    }));
    const objDespesas = caixaObjeto('despesa', 'Despesas do contrato', 'Grupo de despesas', 'Escolher os grupos e subgrupos de despesa deste contrato', 'Nenhuma despesa vinculada.', (q) => (q === 1 ? '1 grupo ou subgrupo vinculado.' : q + ' grupos ou subgrupos vinculados.'), (trocar) => seletorHierarquico({
      titulo: 'Despesas do contrato: grupos de despesa', cores: { cor: COR_DO_OBJETO.despesa(), corTexto: cc(cores).corTexto }, marcados: objeto.despesa, aoConfirmar: trocar,
    }));
    const objPatrimonios = caixaObjeto('patrimonio', 'Patrimônios do contrato', 'Grupo de patrimônios', 'Escolher os patrimônios deste contrato', 'Nenhum patrimônio vinculado.', (q) => n(q, 'patrimônio', 'patrimônios'), (trocar) => U.seletorDeItens({
      titulo: 'Patrimônios do contrato', rotuloBusca: 'Buscar patrimônio', cor: COR_DO_OBJETO.patrimonio(), corTexto: cc(cores).corTexto, marcados: objeto.patrimonio, aoConfirmar: trocar,
      itens: bensCadastrados().filter((b) => !b.baixa || objeto.patrimonio.has(b.id)).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')).map((b) => ({ id: b.id, rotulo: b.nome + (b.baixa ? ' (baixado)' : '') })),
    }));
    const quadroTem = blocoContrato('Contrato', 'Marque Sim para montar o contrato deste ' + (cliente ? 'cliente' : 'fornecedor') + '. Ele é montado em blocos, de cima para baixo, com o que você preencher em cada um.', temContrato);
    const daEmpresa = 'Os dados vêm de Configurações → Empresa → Dados da Empresa.'; const doCadastro = 'Os dados vêm das etapas anteriores deste cadastro.';
    const blocosDoContrato = [
      cliente ? blocoContrato('1 · Contratante', 'Quem contrata: este cliente. ' + doCadastro, resumoContratante)
        : blocoContrato('1 · Contratante', 'Quem contrata: a sua empresa. ' + daEmpresa, campoEmpresa, semEmpresaNota, resumoContratante),
      cliente ? blocoContrato('2 · Contratado', 'Quem é contratado: a sua empresa. ' + daEmpresa, campoEmpresa, semEmpresaNota, resumoContratado)
        : blocoContrato('2 · Contratado', 'Quem é contratado: este fornecedor. ' + doCadastro, resumoContratado),
      blocoContrato('3 · Objeto do contrato', 'O que está sendo contratado: produtos, despesas e/ou patrimônios, escolhidos dos cadastros que já existem. Pode ter um ou vários.', objProdutos, objDespesas, objPatrimonios),
      cDados,
      blocoContrato('5 · O que está incluso', 'As atividades e responsabilidades que fazem parte do contrato.', listaInc),
      blocoContrato('6 · O que não está incluso', 'O que fica de fora, para não haver dúvida depois.', listaExc),
      blocoContrato('7 · Condições de rescisão', 'Como o contrato pode ser encerrado e com quanto tempo de aviso.', campoRescisao, linhaRescisao, avisoRescisao),
      blocoContrato('8 · Tipo de contrato e cláusulas', 'Opcional: um tipo de contrato traz cláusulas e campos prontos, que se somam aos blocos acima.', campo('Tipo de contrato', linhaModelo), notasModelo, boxClausulas, boxCampos),
      blocoContrato('9 · Assinaturas e documento', 'Confira quem assina por cada parte e gere o documento. A assinatura é feita no papel impresso.', resumoAssinaturas, acoesContrato, avisoContrato),
    ];
    pintarBlocosContrato = () => blocosDoContrato.forEach((b) => mostrar(b, temAtivo()));
    pintarBlocosContrato();
    return {
      nos: [...(temExterno ? [] : [quadroTem]), ...blocosDoContrato], ler: lerContrato, bloco: blocoContrato,
      datas: () => [cVencData, cInicio, cFim, ...datasExtras],
      /** Redesenha o que depende de outras etapas (as partes, o cliente mensal, a lista de tipos de contrato). */
      pintar: () => { pintarPartes(); pintarContrato(); pintarModelos(); },
    };
  }

  window.CicluzContratos = { abrirModelos, listaAtividades, seletorHierarquico, botoesDocumento, secoesContrato, partesDoContrato, enderecoTexto, modelos, etapaContrato };
})();
