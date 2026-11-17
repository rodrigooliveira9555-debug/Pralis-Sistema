/*
 * RET - Patrimônios (Saídas · Retiradas → Cadastros Geral): lista no modelo da tabela de Tipos de Ocorrência/Fornecedores
 * (colunas que recolhem na horizontal, uma a uma), ficha completa, etiqueta com QR Code e baixa patrimonial.
 * O cadastro em seis etapas fica em telas-patrimonio-form.js. Histórico das decisões desta tela:
 *  - 15/11/2026 (Rodrigo): categoria primeiro; peças/materiais da manutenção periódica; manutenção periódica (campo `revisao`);
 *    observação em áudio (audio-nota.js, só no aparelho); entrada na lista de todos os bens, "+" do cabeçalho abre o cadastro.
 *  - 17/11/2026: cadastro em seis etapas, tabela em colunas recolhíveis, ficha, etiqueta e baixa no lugar da lixeira (um bem
 *    cadastrado não é apagado: a baixa é um processo à parte, com motivo e data, que preserva todo o histórico).
 * Imagens e documentos ficam no IndexedDB de Documentações (só neste aparelho); o registro guarda a referência.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio; const S = window.CicluzProducaoDados; const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI; const CD = window.CicluzComprasDominio; const M = window.CicluzProducao; const PD = window.CicluzPatrimonioDominio;
  const { el, botao } = U;
  const cores = { cor: M.COR_RET, corTexto: M.COR_RET_TEXTO };
  const dataBR = (iso) => (iso ? window.CicluzDateFields.display(iso) : '');
  const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
  const dinheiro = (n) => (n == null || n === '' ? '' : CD.moeda(n));
  const arquivos = () => window.CicluzDocuments && window.CicluzDocuments.files;
  const SVG = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICO = { ver: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>', baixar: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', caixa: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
    arquivar: '<path d="M4 7h16v3H4zM6 10v9h12v-9M10 14h4"/>' };
  const bolinha = (rotulo, desenho, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = SVG(desenho); b.onclick = acao; return b; };
  const situacaoDe = (b) => b.situacaoPatrimonial || (b.ativo === false ? 'inativo' : 'ativo');
  const setorDe = (b) => (b.localId ? S.nomeLocal(b.localId) : (b.localizacao && b.localizacao.departamento) || '');

  /* ---- Imagens (IndexedDB) ---- */
  const urls = new Map();
  async function urlDe(id) {
    if (urls.has(id)) return urls.get(id);
    try { const bl = await arquivos().get(id); if (!bl) return ''; const u = URL.createObjectURL(bl); urls.set(id, u); return u; } catch (e) { return ''; }
  }
  const principal = (b) => (b.imagens || []).find((i) => i.principal) || (b.imagens || [])[0] || null;
  async function baixarArquivo(meta) {
    try {
      const bl = await arquivos().get(meta.id);
      if (!bl) { U.avisar('O arquivo não está neste aparelho.'); return; }
      const u = URL.createObjectURL(bl); const a = document.createElement('a'); a.href = u; a.download = meta.name || 'arquivo'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch (e) { U.avisar('Não foi possível baixar o arquivo.'); }
  }
  const comoDataUrl = (bl) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(''); r.readAsDataURL(bl); });

  /** Selo da lista: manutenções vencidas (atenção) ou, se não houver, as dos próximos dias (informação). */
  function avisoManutencao(b) {
    const hoje = S.hojeIso();
    const datas = [...(b.pecas || []).map((p) => ['Substituir ' + p.nome, p.proximaTroca]), ['Manutenção', b.revisao && b.revisao.proxima]]
      .map(([rotulo, iso]) => ({ rotulo, iso, situacao: D.situacaoManutencao(iso, hoje) }));
    for (const [situacao, tom, sufixo, plural] of [['vencida', 'atencao', ' vencida', ' manutenções vencidas'], ['proxima', 'info', ' em ', ' manutenções próximas']]) {
      const l = datas.filter((x) => x.situacao === situacao).sort((a, b2) => a.iso.localeCompare(b2.iso));
      if (!l.length) continue;
      const um = situacao === 'vencida' ? (l[0].rotulo === 'Manutenção' ? 'Manutenção vencida' : l[0].rotulo) : l[0].rotulo + sufixo + dataBR(l[0].iso);
      return U.situacao(l.length > 1 ? l.length + plural : um, tom);
    }
    return null;
  }

  /* ============================== Texto da ficha (a mesma base da tela e da impressão) ============================== */
  const sim = (x) => (x ? 'Sim' : '');
  function secoesTexto(b) {
    const n = PD.normalizar(b); const f = n.financeiro || {}; const c = n.contabil || {}; const g = n.garantia || {}; const s = n.seguro || {}; const l = n.localizacao || {}; const r = n.responsavel || {}; const t = n.tecnicas || {}; const m = n.manutencao || {}; const i = n.inspecao || {}; const dm = n.dimensoesFisicas;
    const doc = (id) => { const d = (n.documentos || []).find((x) => x.id === id); return d ? d.name : ''; };
    const prazo = (a, z) => { const p = PD.prazoRestante(a, z, S.hojeIso()); return p ? p.texto : ''; };
    const tec = PD.TECNICAS.filter(([k]) => t[k]).map(([k, rot]) => [rot, t[k]]);
    return [
      ['Identificação', [['Número de patrimônio', n.numeroPatrimonio], ['Nome simplificado', n.nome], ['Nome técnico', n.nomeTecnico], ['Categoria', nomeDe(D.CATEGORIAS, n.categoria)], ['Marca', n.marca], ['Modelo', n.modelo], ['Número de série', n.numeroSerie],
        ['Valor do patrimônio', dinheiro(n.valor)], ['Descrição', n.descricao], ['Tipo de bem', nomeDe(PD.TIPOS_BEM, n.tipoBem)], ['Natureza', nomeDe(PD.NATUREZAS, n.natureza)], ['Situação patrimonial', nomeDe(PD.SITUACOES, situacaoDe(n))],
        ['Estado de conservação', nomeDe(PD.CONSERVACAO, n.conservacao)], ['Data de cadastro', dataBR(n.dataCadastro)], ['Código interno', n.codigoInterno], ['Quantidade', n.quantidade != null ? n.quantidade + (n.unidade ? ' ' + n.unidade : '') : ''],
        ['Individual ou conjunto', n.conjunto ? 'Conjunto' : ''], ['Observações', n.observacoes]]],
      ['Especificação técnica', [...tec,
        ['Dimensões', dm ? [dm.altura != null ? 'altura ' + CD.numero(dm.altura) : '', dm.largura != null ? 'largura ' + CD.numero(dm.largura) : '', dm.profundidade != null ? 'profundidade ' + CD.numero(dm.profundidade) : ''].filter(Boolean).join(' · ') + ' ' + (dm.unidade || 'm') : ''],
        ['Materiais', (n.materiais || []).join(', ')],
        ['Tipo de energia', n.energia && n.energia !== 'nenhuma' ? nomeDe(D.ENERGIAS, n.energia) : ''],
        ['Consumo de gás por hora', n.consumoGas && n.consumoGas.valor != null ? CD.numero(n.consumoGas.valor) + ' ' + (n.consumoGas.unidade === 'm3/h' ? 'm³/h' : n.consumoGas.unidade) : n.energia === 'gas' && n.consumoHora ? CD.numero(n.consumoHora) + ' kg/h' : ''],
        ['Potência elétrica', n.potenciaW != null ? CD.numero(n.potenciaW) + ' W' : n.energia === 'eletrica' && n.consumoHora ? CD.numero(n.consumoHora) + ' kWh por hora (cadastro anterior)' : ''],
        ['Ficha técnica do equipamento', n.fichaTecnica ? n.fichaTecnica.name : '']]],
      ['Produção', [['Utilizado na produção', n.usadoNaProducao ? 'Sim' : ''], ['Capacidade de produção', n.capacidade ? CD.numero(n.capacidade.valor) + ' ' + String(n.capacidade.unidade) : ''],
        ['Utensílios utilizados', (n.utensiliosIds || []).map((id) => S.nomeBem(id)).join(', ')],
        ['Medidas (utensílio)', n.medidas ? CD.numero(n.medidas.largura) + ' × ' + CD.numero(n.medidas.comprimento) + ' cm' : '']]],
      ['Localização', [['Empresa proprietária', l.empresa], ['CNPJ', l.cnpj], ['Unidade ou filial', l.unidade], ['Estabelecimento', l.estabelecimento], ['Setor / local', n.localId ? S.nomeLocal(n.localId) : ''], ['Departamento', l.departamento],
        ['Ambiente', l.ambiente], ['Sala', l.sala], ['Andar', l.andar], ['Localização detalhada', l.detalhe]]],
      ['Responsável', [['Responsável atual', r.nome], ['Cargo ou função', r.cargo], ['Departamento', r.departamento], ['Data de atribuição', dataBR(r.dataAtribuicao)], ['Tipo de responsabilidade', nomeDe(PD.TIPOS_RESPONSABILIDADE, r.tipo)]]],
      ['Composição', [['Patrimônios vinculados', (n.vinculados || []).map((id) => S.nomeBem(id)).join(', ')]]],
      ['Financeiro', [['Tipo de aquisição', nomeDe(PD.TIPOS_AQUISICAO, f.tipoAquisicao)], ['Data de aquisição', dataBR(f.dataAquisicao)], ['Data de recebimento', dataBR(f.dataRecebimento)], ['Entrada em operação', dataBR(f.dataOperacao)],
        ['Fornecedor', f.fornecedorId ? S.nomeFornecedor(f.fornecedorId) : ''], ['Nota fiscal', [f.nf, f.serieNf ? 'série ' + f.serieNf : ''].filter(Boolean).join(' · ')], ['Valor de aquisição', dinheiro(f.valorAquisicao)], ['Frete', dinheiro(f.frete)], ['Instalação', dinheiro(f.instalacao)],
        ['Custos adicionais', dinheiro(f.custosAdicionais)], ['Descontos', dinheiro(f.descontos)], ['Valor total de aquisição', f.valorTotal ? dinheiro(f.valorTotal) : ''],
        ['Grupo patrimonial', c.grupo], ['Conta contábil', c.conta], ['Centro de custo', c.centroCusto], ['Valor residual estimado', dinheiro(c.valorResidual)], ['Vida útil estimada', c.vidaUtilMeses ? c.vidaUtilMeses + ' meses' : ''],
        ['Início de depreciação', dataBR(c.inicioDepreciacao)], ['Método de depreciação', nomeDe(PD.METODOS_DEPRECIACAO, c.metodo)], ['Valor contábil informado', dinheiro(c.valorContabil)], ['Observações contábeis', c.obs]]],
      ['Garantia', g.possui ? [['Possui garantia', 'Sim'], ['Início', dataBR(g.inicio)], ['Término', dataBR(g.fim)], ['Prazo', prazo(g.inicio, g.fim)], ['Empresa responsável', g.empresa], ['Contato da assistência', g.contato], ['Certificado', g.certificado], ['Condições', g.condicoes], ['Documento', doc(g.documentoId)]] : []],
      ['Seguro', s.possui ? [['Possui seguro', 'Sim'], ['Seguradora', s.seguradora], ['Apólice', s.apolice], ['Valor segurado', dinheiro(s.valorSegurado)], ['Início da cobertura', dataBR(s.inicio)], ['Término da cobertura', dataBR(s.fim)], ['Prazo', prazo(s.inicio, s.fim)], ['Observações', s.obs]] : []],
      ['Manutenção e controle', [['Manutenção periódica', sim(m.exige || n.revisao)], ['Tipo de manutenção', nomeDe(PD.TIPOS_MANUTENCAO, m.tipo)], ['Periodicidade', n.revisao && n.revisao.intervaloMeses ? 'a cada ' + n.revisao.intervaloMeses + ' mês(es)' : ''],
        ['Última manutenção', dataBR(n.revisao && n.revisao.ultima)], ['Próxima manutenção', dataBR(n.revisao && n.revisao.proxima)], ['Responsável pela manutenção', m.responsavel], ['Fornecedor ou prestador', m.fornecedorId ? S.nomeFornecedor(m.fornecedorId) : ''], ['Custo estimado', dinheiro(m.custoEstimado)],
        ['Observações da manutenção', m.obs], ['Inspeção periódica', sim(i.necessita)], ['Tipo de inspeção', i.tipo], ['Última inspeção', dataBR(i.ultima)], ['Próxima inspeção', dataBR(i.proxima)], ['Resultado da inspeção', nomeDe(PD.RESULTADOS_INSPECAO, i.resultado)],
        ['Responsável pela inspeção', i.responsavel], ['Documento da inspeção', doc(i.documentoId)], ['Observações da inspeção', i.obs]]],
      ['Baixa patrimonial', n.baixa ? [['Motivo', nomeDe(PD.MOTIVOS_BAIXA, n.baixa.motivo)], ['Data', dataBR(n.baixa.data)], ['Observação', n.baixa.observacao]] : []],
    ].map(([t0, linhas]) => [t0, linhas.filter(([, x]) => x !== '' && x != null)]).filter(([, linhas]) => linhas.length);
  }
  /** Listas da ficha (componentes, manutenções, movimentações, alterações) como linhas de texto, para a impressão. */
  function listasTexto(b) {
    const n = PD.normalizar(b); const out = [];
    if (n.pecas.length) out.push(['Peças e componentes', n.pecas.map((p) => [p.nome + (p.codigo ? ' (' + p.codigo + ')' : ''), [p.quantidade + (p.unidade ? ' ' + p.unidade : ''), p.valor != null ? dinheiro(p.valor) + ' cada = ' + dinheiro(PD.totalPeca(p)) : '', nomeDe(PD.SITUACOES_PECA, p.situacao)].filter(Boolean).join(' · ')])]);
    if (n.manutencoes.length) out.push(['Histórico de manutenção', n.manutencoes.map((m) => [dataBR(m.data) + ' — ' + nomeDe(PD.TIPOS_MANUTENCAO, m.tipo), [m.descricao, m.responsavel, m.custo != null ? dinheiro(m.custo) : '', nomeDe(PD.SITUACOES_MANUTENCAO, m.situacao)].filter(Boolean).join(' · ')])]);
    if (n.movimentacoes.length) out.push(['Movimentações', n.movimentacoes.map((m) => [dataBR(m.data) + ' — ' + nomeDe(PD.TIPOS_MOVIMENTACAO, m.tipo), [m.origem && 'de ' + m.origem, m.destino && 'para ' + m.destino, m.responsavel, m.motivo].filter(Boolean).join(' · ')])]);
    if (n.documentos.length) out.push(['Documentos', n.documentos.map((d) => [d.name, [nomeDe(PD.TIPOS_DOCUMENTO, d.tipo), dataBR(d.data), d.descricao].filter(Boolean).join(' · ')])]);
    if ((b.historico || []).length) out.push(['Histórico de alterações', b.historico.slice().reverse().slice(0, 30).map((h) => [new Date(h.em).toLocaleString('pt-BR'), (h.campos || []).join(', ')])]);
    return out;
  }

  /* ============================== Impressão e etiqueta (quadro invisível + impressão do navegador) ============================== */
  function imprimirHtml(titulo, montar) {
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true'); ifr.tabIndex = -1; ifr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.append(ifr);
    const d = ifr.contentDocument; d.open(); d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + titulo.replace(/[<&]/g, '') + '</title></head><body></body></html>'); d.close();
    const mk = (tag, txt, css) => { const x = d.createElement(tag); if (txt != null) x.textContent = txt; if (css) x.style.cssText = css; return x; };
    d.body.style.cssText = 'font:13px/1.45 Arial,sans-serif;color:#111;margin:24px';
    montar(d, mk);
    const limpar = () => { if (ifr.isConnected) ifr.remove(); };
    ifr.contentWindow.addEventListener('afterprint', limpar); setTimeout(limpar, 120000);
    ifr.contentWindow.focus(); ifr.contentWindow.print();
  }
  async function imprimirFicha(b) {
    const img = principal(b); let dataUrl = '';
    if (img && arquivos()) { try { const bl = await arquivos().get(img.id); if (bl) dataUrl = await comoDataUrl(bl); } catch (e) { /* sem imagem na impressão */ } }
    imprimirHtml('Ficha do patrimônio', (d, mk) => {
      d.body.append(mk('h1', 'Ficha do patrimônio — ' + b.nome, 'font-size:20px;margin:0 0 4px'), mk('p', 'Gerada pelo sistema a partir do cadastro. Não é um relatório contábil oficial.', 'margin:0 0 12px;color:#555'));
      if (dataUrl) { const im = d.createElement('img'); im.src = dataUrl; im.style.cssText = 'max-width:220px;max-height:160px;margin:0 0 8px;border:1px solid #999'; d.body.append(im); }
      secoesTexto(b).forEach(([t, linhas]) => { d.body.append(mk('h2', t, 'font-size:14px;margin:14px 0 4px;border-bottom:1px solid #999;padding-bottom:2px')); linhas.forEach(([k, x]) => { const p = mk('p', null, 'margin:2px 0'); p.append(mk('b', k + ': '), d.createTextNode(String(x))); d.body.append(p); }); });
      listasTexto(b).forEach(([t, linhas]) => { d.body.append(mk('h2', t, 'font-size:14px;margin:14px 0 4px;border-bottom:1px solid #999;padding-bottom:2px')); linhas.forEach(([k, x]) => { const p = mk('p', null, 'margin:2px 0'); p.append(mk('b', k + ': '), d.createTextNode(String(x))); d.body.append(p); }); });
    });
  }
  /** O QR guarda só o identificador interno do bem (nada de valor, dado pessoal ou link público). */
  function qrSvg(b) { try { return window.CicluzQR ? window.CicluzQR.svg(b.id) : ''; } catch (e) { return ''; } }
  function etiqueta(b) {
    U.dialogo({
      titulo: 'Etiqueta patrimonial', ...cores,
      montar: (form) => {
        const emp = [b.localizacao && b.localizacao.empresa, b.localizacao && b.localizacao.unidade].filter(Boolean).join(' · ');
        const caixa = el('div', 'patrimonio-etiqueta compras-largo');
        const qr = qrSvg(b); const q = el('div', 'patrimonio-etiqueta-qr'); q.innerHTML = qr || ''; if (!qr) q.append(el('small', 'profiles-note', 'QR Code indisponível.'));
        const t = el('div', 'patrimonio-etiqueta-texto'); t.append(el('b', 'patrimonio-etiqueta-numero', b.numeroPatrimonio || 'Sem número'), el('span', null, b.nome), el('small', null, emp || '—'));
        caixa.append(q, t);
        form.append(caixa, el('p', 'profiles-note compras-largo', 'O QR Code guarda só o identificador interno do cadastro: não contém valor nem dado pessoal e não abre link público.'),
          botao('Imprimir etiqueta', () => imprimirHtml('Etiqueta ' + (b.numeroPatrimonio || b.nome), (d, mk) => {
            d.body.style.margin = '8mm';
            const box = mk('div', null, 'display:flex;align-items:center;gap:10px;border:1px solid #000;padding:8px;width:80mm');
            const qd = mk('div', null, 'width:28mm;height:28mm;flex:none'); qd.innerHTML = qr; const sv = qd.querySelector('svg'); if (sv) { sv.setAttribute('width', '100%'); sv.setAttribute('height', '100%'); }
            const tx = mk('div', null, 'min-width:0'); tx.append(mk('div', b.numeroPatrimonio || 'Sem número', 'font:bold 16px Arial'), mk('div', b.nome, 'font-size:12px'), mk('div', emp, 'font-size:10px;color:#444'));
            box.append(qd, tx); d.body.append(box);
          }), 'btn secondary'));
      },
    });
  }

  /* ============================== Baixa patrimonial ============================== */
  function baixa(b) {
    const usos = SV.usosDoBem(b.id);
    U.dialogo({
      titulo: 'Baixa patrimonial — ' + b.nome, ...cores, rotuloSalvar: 'Registrar baixa',
      montar: (form) => {
        const motivo = U.seletor(PD.MOTIVOS_BAIXA, '', 'Selecione'); const data = U.entrada('date', S.hojeIso()); const obs = el('textarea'); obs.rows = 3; obs.maxLength = 500;
        form.append(el('p', 'compras-largo', 'A baixa marca "' + b.nome + '" como Baixado e o tira das escolhas da Produção. Nada é apagado: cadastro, localização, movimentações e histórico continuam. Não faz baixa contábil nem lançamento.'),
          ...(usos.length ? [el('p', 'profiles-note compras-largo', 'Atenção: este bem é usado em ' + usos.slice(0, 3).join(', ') + (usos.length > 3 ? '…' : '') + '. As fichas continuam apontando para ele.')] : []),
          U.campo('Motivo da baixa *', motivo), U.campo('Data da baixa *', data), U.campo('Observação', obs));
        return { motivo, data, obs };
      },
      salvar: (c) => {
        if (!c.data.checkValidity()) return 'Confira a data da baixa (DD/MM/AA).';
        const r = SV.baixarBem(b.id, { motivo: c.motivo.value, data: c.data.value, observacao: c.obs.value });
        if (r.erro) return r.erro;
        U.avisar('Baixa registrada.');
        return null;
      },
    });
  }

  /* ============================== Ficha ============================== */
  function ficha(b0) {
    const b = S.bem(b0.id) || b0;
    U.dialogo({
      titulo: 'Patrimônio — ' + b.nome, ...cores, largo: true, classe: 'patrimonio-ficha',
      montar: (form, dlg) => {
        const topo = el('div', 'patrimonio-ficha-topo compras-largo');
        const foto = el('div', 'patrimonio-ficha-foto'); const im = principal(b);
        if (im) { const img = el('img'); img.alt = 'Imagem principal de ' + b.nome; foto.append(img); urlDe(im.id).then((u) => { if (u) img.src = u; }); foto.onclick = () => arquivos().view('Imagem — ' + b.nome, im, false); foto.title = 'Ampliar'; foto.classList.add('com-imagem'); }
        else foto.innerHTML = SVG(ICO.caixa);
        const id = el('div', 'patrimonio-ficha-id'); id.append(el('b', null, b.nome), el('span', null, b.numeroPatrimonio ? 'Nº ' + b.numeroPatrimonio : 'Sem número de patrimônio'), el('span', 'pill', nomeDe(PD.SITUACOES, situacaoDe(b))), el('small', null, [nomeDe(D.CATEGORIAS, b.categoria), b.marca, b.modelo].filter(Boolean).join(' · ')));
        const acoes = el('div', 'patrimonio-acoes patrimonio-ficha-acoes');
        acoes.append(botao('Editar', () => { dlg.close(); window.CicluzProducaoPatrimonioForm.abrir(b); }, 'btn'), botao('Imprimir', () => imprimirFicha(b), 'btn secondary'), botao('Etiqueta', () => etiqueta(b), 'btn secondary'));
        if (!b.baixa) acoes.append(botao('Baixar', () => { dlg.close(); baixa(b); }, 'btn secondary'));
        topo.append(foto, id, acoes);
        form.append(topo);
        secoesTexto(b).forEach(([t, linhas]) => {
          const fs = el('fieldset', 'compras-fieldset compras-largo'); fs.append(el('legend', null, t)); const dl = el('dl', 'profiles-info');
          linhas.forEach(([k, x]) => dl.append(el('dt', null, k), el('dd', null, String(x)))); fs.append(dl); form.append(fs);
        });
        /* Componentes */
        const n = PD.normalizar(b);
        if (n.pecas.length) {
          const fs = el('fieldset', 'compras-fieldset compras-largo'); const t0 = PD.totaisComponentes(n.pecas);
          fs.append(el('legend', null, 'Peças e componentes'), el('p', 'profiles-note', t0.tipos + ' tipo(s) de componente · ' + t0.unidades + ' unidade(s) · ' + t0.ativos + ' ativo(s)' + (t0.substituidos ? ' · ' + t0.substituidos + ' substituído(s)' : '')));
          const box = el('div', 'patrimonio-tabela-box'); const tb = el('table', 'compras-tabela'); const th = el('thead'); const trh = el('tr');
          ['Código', 'Peça', 'Tipo', 'Marca', 'Modelo', 'Série', 'Qtd.', 'Valor unitário', 'Valor total', 'Situação'].forEach((h) => { const c = el('th', null, h); c.scope = 'col'; trh.append(c); }); th.append(trh);
          const corpo = el('tbody'); n.pecas.forEach((p) => { const tr = el('tr'); [p.codigo, p.nome, p.tipo, p.marca, p.modelo, p.serie, p.quantidade + (p.unidade ? ' ' + p.unidade : ''), dinheiro(p.valor), dinheiro(PD.totalPeca(p)), nomeDe(PD.SITUACOES_PECA, p.situacao)].forEach((x) => tr.append(el('td', null, x || '—'))); corpo.append(tr); });
          tb.append(th, corpo); box.append(tb); fs.append(box); form.append(fs);
        }
        /* Documentos e imagens */
        if (n.documentos.length || n.imagens.length || n.fichaTecnica) {
          const fs = el('fieldset', 'compras-fieldset compras-largo'); fs.append(el('legend', null, 'Imagens e documentos'));
          [...n.imagens.map((x) => ({ ...x, rot: 'Imagem' + (x.tipo ? ' (' + nomeDe(PD.TIPOS_IMAGEM, x.tipo).toLowerCase() + ')' : '') })), ...(n.fichaTecnica ? [{ ...n.fichaTecnica, rot: 'Ficha técnica do equipamento' }] : []), ...n.documentos.map((x) => ({ ...x, rot: nomeDe(PD.TIPOS_DOCUMENTO, x.tipo) || 'Documento' }))].forEach((x) => {
            const lin = el('div', 'patrimonio-doc'); lin.append(el('b', null, x.name), el('span', null, [x.rot, dataBR(x.data), x.descricao].filter(Boolean).join(' · ')));
            const ac = el('div', 'patrimonio-acoes'); ac.append(bolinha('Visualizar ' + x.name, ICO.ver, () => arquivos().view(x.rot + ' — ' + b.nome, x, false)), bolinha('Baixar ' + x.name, ICO.baixar, () => baixarArquivo(x))); lin.append(ac); fs.append(lin);
          });
          form.append(fs);
        }
        /* Movimentações, manutenções e alterações */
        listasTexto(b).filter(([t]) => ['Movimentações', 'Histórico de manutenção', 'Histórico de alterações'].includes(t)).forEach(([t, linhas]) => {
          const fs = el('fieldset', 'compras-fieldset compras-largo'); fs.append(el('legend', null, t)); const dl = el('dl', 'profiles-info');
          linhas.forEach(([k, x]) => dl.append(el('dt', null, k), el('dd', null, x || '—'))); fs.append(dl); form.append(fs);
        });
        const log = el('p', 'profiles-note compras-largo'); log.textContent = 'Imagens e documentos ficam só neste aparelho. O histórico de alterações mostra o que mudou em cada salvamento.'; form.append(log);
      },
    });
  }

  /* ============================== Lista ============================== */
  let tela = null;
  const filtro = { busca: '', categoria: '', situacao: '', inativos: false };
  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-patrimonio', titulo: 'RET - Patrimônios', caminho: 'Saídas · Retiradas / Cadastros Geral / RET - Patrimônios', icone: 'patrimonio', voltar: M.voltarPatrimonio, ...cores });
      U.atalho(tela, 'Novo patrimônio', 'M12 5v14M5 12h14', () => window.CicluzProducaoPatrimonioForm.abrir(), { criar: true });
      document.addEventListener('cicluz-patrimonio-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    tela.ativar();
    render();
  }
  function textoBusca(b) {
    const l = b.localizacao || {}; const r = b.responsavel || {};
    return U.dobrar([b.numeroPatrimonio, b.nome, b.nomeTecnico, nomeDe(D.CATEGORIAS, b.categoria), b.marca, b.modelo, b.numeroSerie, l.empresa, l.unidade, setorDe(b), r.nome, nomeDe(PD.SITUACOES, situacaoDe(b)), ...(b.pecas || []).flatMap((p) => [p.nome, p.marca, p.modelo])].join(' '));
  }
  function render() {
    const bens = S.patrimonio.dados.bens;
    const busca = U.buscaRodape(tela, 'Buscar patrimônio', (v) => { filtro.busca = v; if (tela.view.classList.contains('show')) render(); });
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Utensílios, máquinas, equipamentos, mobiliário, veículos, imóveis e demais bens. As fichas técnicas da Produção usam estes bens, e a capacidade decide quando o processo precisa ser repetido. Toque em um bem para ver a ficha.'));
    const usadas = [...new Set(bens.map((b) => b.categoria))].filter(Boolean);
    const filtros = el('div', 'compras-filtros');
    const cat = U.chips([['', 'Todos'], ...D.CATEGORIAS.filter(([k]) => usadas.includes(k))], filtro.categoria, (v) => { filtro.categoria = v; desenha(); });
    const sit = U.seletor([['', 'Todas as situações'], ...PD.SITUACOES], filtro.situacao); sit.setAttribute('aria-label', 'Filtrar por situação'); sit.onchange = () => { filtro.situacao = sit.value; desenha(); };
    const inat = el('label', 'compras-interruptor'); const inatInput = U.entrada('checkbox'); inatInput.checked = filtro.inativos; inatInput.onchange = () => { filtro.inativos = inatInput.checked; desenha(); };
    inat.append(inatInput, el('span', null, 'Mostrar inativos e baixados'));
    filtros.append(cat, sit, inat);
    const ativos = bens.filter((b) => b.ativo !== false).length;
    const ponta = U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' patrimônio ativo' : ' patrimônios ativos'));
    const sec = U.secao('Patrimônios', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Patrimônios', 'Cadastrar patrimônio', () => window.CicluzProducaoPatrimonioForm.abrir()), ...(window.CicluzConviteLink ? [window.CicluzConviteLink.botao({ cores: { cor: M.COR_RET, corTexto: M.COR_RET_TEXTO }, modelos: [{ id: 'patrimonio', titulo: 'Cadastro de patrimônio', detalhe: 'Formulário completo de patrimônio, com as seis etapas (identificação, imagens e documentos, localização, composição e especificação técnica, aquisição e manutenção).' }], visualizar: () => window.CicluzProducaoPatrimonioForm.abrir(null, { previa: true }) })] : []));
    const linhas = el('div', 'compras-lista compras-lista-grade'); U.arrastarParaRolar(linhas);
    sec.append(linhas);
    function desenha() {
      const vis = bens.filter((b) => (filtro.inativos || b.ativo !== false || b.statusCadastro === 'recebido') && (!filtro.categoria || b.categoria === filtro.categoria) && (!filtro.situacao || situacaoDe(b) === filtro.situacao) && textoBusca(b).includes(U.dobrar(filtro.busca)))
        .sort((a, c) => a.nome.localeCompare(c.nome, 'pt-BR'));
      linhas.replaceChildren();
      ponta.querySelector('.compras-colunas-geral')?.remove();
      if (!bens.length) { linhas.append(U.vazio('Nenhum patrimônio cadastrado.', 'Use o "+" para cadastrar: por exemplo, a masseira de 40 kg e as assadeiras.')); return; }
      if (!vis.length) { linhas.append(U.vazio('Nada neste filtro.')); return; }
      const cab = U.cabecalhoColunas('grade-patrimonio', [
        { chave: 'nome', rotulo: 'Nome simplificado' }, { chave: 'numero', rotulo: 'Número do patrimônio', ocultavel: true }, { chave: 'imagem', rotulo: 'Imagem', ocultavel: true }, { chave: 'categoria', rotulo: 'Categoria', ocultavel: true },
        { chave: 'marca', rotulo: 'Marca', ocultavel: true }, { chave: 'modelo', rotulo: 'Modelo', ocultavel: true }, { chave: 'serie', rotulo: 'Número de série', ocultavel: true }, { chave: 'empresa', rotulo: 'Empresa', ocultavel: true },
        { chave: 'unidade', rotulo: 'Unidade', ocultavel: true }, { chave: 'setor', rotulo: 'Setor', ocultavel: true }, { chave: 'responsavel', rotulo: 'Responsável', ocultavel: true }, { chave: 'qtd', rotulo: 'Quantidade', ocultavel: true },
        { chave: 'valor', rotulo: 'Valor', ocultavel: true }, { chave: 'conservacao', rotulo: 'Estado de conservação', ocultavel: true }, { chave: 'avisos', rotulo: 'Avisos', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
      ], { lista: linhas, preferencia: 'cicluz-patrimonios-colunas' });
      linhas.append(cab); ponta.append(cab.botaoGeral);
      vis.forEach((b) => linhas.append(linha(b, linhas)));
    }
    desenha();
    tela.body.replaceChildren(busca, topo, filtros, sec);
  }
  function linha(b, linhas) {
    const l = b.localizacao || {}; const r = b.responsavel || {}; const im = principal(b);
    const mini = el('span', 'patrimonio-mini');
    if (im) { const img = el('img'); img.alt = 'Imagem de ' + b.nome; mini.append(img); urlDe(im.id).then((u) => { if (u) img.src = u; else mini.textContent = '—'; }); } else mini.textContent = '—';
    const row = U.linhaLista({
      icones: [{ icone: ICO.caixa, rotulo: nomeDe(D.CATEGORIAS, b.categoria) }], grade: 'grade-patrimonio',
      colunas: [{ chave: 'nome', conteudo: b.nome }, { chave: 'numero', conteudo: b.numeroPatrimonio }, { chave: 'imagem', conteudo: mini }, { chave: 'categoria', conteudo: nomeDe(D.CATEGORIAS, b.categoria) }, { chave: 'marca', conteudo: b.marca }, { chave: 'modelo', conteudo: b.modelo },
        { chave: 'serie', conteudo: b.numeroSerie }, { chave: 'empresa', conteudo: l.empresa }, { chave: 'unidade', conteudo: l.unidade }, { chave: 'setor', conteudo: setorDe(b) }, { chave: 'responsavel', conteudo: r.nome },
        { chave: 'qtd', conteudo: b.quantidade != null ? b.quantidade + (b.unidade ? ' ' + b.unidade : '') : '' }, { chave: 'valor', conteudo: dinheiro(b.valor) }, { chave: 'conservacao', conteudo: nomeDe(PD.CONSERVACAO, b.conservacao) }, { chave: 'avisos', conteudo: [avisoManutencao(b)].filter(Boolean) }],
      estado: b.statusCadastro === 'recebido' ? 'Recebido' : nomeDe(PD.SITUACOES, situacaoDe(b)),
      acoes: { rotulo: b.nome, lista: linhas, aoEditar: () => window.CicluzProducaoPatrimonioForm.abrir(b), aoExcluir: () => baixa(b) },
    });
    if (b.ativo === false) row.classList.add('inativo');
    /* Tocar na linha mostra a ficha; a seta revela o lápis (editar) e Baixar (no lugar da lixeira: um bem cadastrado não se apaga). */
    const arrow = row.querySelector('.account-action-toggle'); const drawer = row.querySelector('.account-row-actions');
    const off = [...drawer.children].find((x) => /^Excluir/.test(x.getAttribute('aria-label') || ''));
    if (b.baixa) off.remove(); else { off.innerHTML = SVG(ICO.arquivar); off.title = 'Baixar ' + b.nome; off.setAttribute('aria-label', 'Baixar ' + b.nome); }
    row.onclick = (e) => { if (e.target.closest('button')) return; if (!drawer.hidden) { drawer.hidden = true; arrow.setAttribute('aria-expanded', 'false'); return; } ficha(b); };
    row.onkeydown = (e) => { if (e.target === row && e.key === 'Enter') { e.preventDefault(); ficha(b); } };
    row.setAttribute('aria-label', 'Ver ficha de ' + b.nome);
    return row;
  }

  M.registrar('patrimonio', abrir);
  window.CicluzProducaoPatrimonio = { abrir, ficha, etiqueta, baixa, formulario: (b) => window.CicluzProducaoPatrimonioForm.abrir(b) };
})();
