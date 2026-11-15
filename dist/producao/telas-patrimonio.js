/*
 * RET - Patrimônios (Saídas · Retiradas → Cadastros Geral). Substitui a prévia que não salvava.
 * Bens nas 4 categorias do Rodrigo, com o que a produção precisa: capacidade (o tempo dobra quando
 * passa dela), medidas (assadeiras) e energia com consumo por hora (guardado para o custo futuro).
 * Manutenção (15/11/2026, pedido do Rodrigo): a Categoria é o primeiro campo; cada bem pode ter peças e
 * materiais da manutenção periódica (marca, modelo, fornecedor, grupo de despesas, valor, imagem e a data
 * da próxima substituição), a data da próxima manutenção periódica e uma observação em áudio (peça
 * compartilhada de audio-nota.js; o áudio fica só no aparelho). No dado salvo a manutenção periódica
 * continua no campo `revisao` (nome antigo do quadro), para não mudar o formato.
 * Entrada (15/11/2026, decisão final do Rodrigo): a tela abre na lista de todos os bens; tocar no bem abre
 * a edição dele e a bolinha "+" do cabeçalho da lista (ou o "+" da barra) abre o cadastro de um bem novo.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio;
  const S = window.CicluzProducaoDados;
  const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI;
  const CD = window.CicluzComprasDominio;
  const M = window.CicluzProducao;
  const { el, botao, campo, entrada, seletor } = U;
  const cores = { cor: M.COR_RET, corTexto: M.COR_RET_TEXTO };
  const UNIDADES_CAPACIDADE = [['KG', 'kg'], ['G', 'g'], ['UN', 'unidades'], ['LT', 'litros']];
  const dataBR = (iso) => window.CicluzDateFields.display(iso);
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

  let tela = null;
  const filtro = { busca: '', categoria: '', inativos: false };

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-patrimonio', titulo: 'RET - Patrimônios', caminho: 'Saídas · Retiradas / Cadastros Geral / RET - Patrimônios', icone: 'patrimonio', voltar: M.voltarPatrimonio, ...cores });
      U.atalho(tela, 'Novo bem', 'M12 5v14M5 12h14', () => formulario(), { criar: true });
      document.addEventListener('cicluz-patrimonio-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    tela.ativar();
    render();
  }

  function detalhe(b) {
    const partes = [D.nomeDe(D.CATEGORIAS, b.categoria)];
    if (b.localId) partes.push(S.nomeLocal(b.localId));
    if (b.capacidade) partes.push('capacidade ' + CD.numero(b.capacidade.valor) + ' ' + b.capacidade.unidade.toLowerCase());
    if (b.medidas) partes.push(CD.numero(b.medidas.largura) + ' × ' + CD.numero(b.medidas.comprimento) + ' cm');
    if (b.energia && b.energia !== 'nenhuma') partes.push(D.nomeDe(D.ENERGIAS, b.energia) + ' ' + CD.numero(b.consumoHora) + ' ' + D.UNIDADE_CONSUMO[b.energia]);
    if (b.numeroPatrimonio) partes.push('nº ' + b.numeroPatrimonio);
    if (b.pecas && b.pecas.length) partes.push(b.pecas.length + (b.pecas.length > 1 ? ' peças' : ' peça'));
    if (b.revisao && b.revisao.proxima) partes.push('manutenção ' + dataBR(b.revisao.proxima));
    if (b.audio) partes.push('áudio');
    return partes.join(' · ');
  }

  function render() {
    const bens = S.patrimonio.dados.bens;
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Utensílios, máquinas, equipamentos e mobiliário. As fichas técnicas usam estes bens em cada etapa, e a capacidade decide quando o processo precisa ser repetido. Toque em um bem para editar.'));
    const filtros = el('div', 'compras-filtros');
    // Busca pela lupa do rodapé (um caminho só para buscar), como em Fornecedores.
    const busca = U.buscaRodape(tela, 'Buscar bem', (v) => { filtro.busca = v; if (tela.view.classList.contains('show')) render(); });
    const cat = U.chips([['', 'Todos'], ...D.CATEGORIAS], filtro.categoria, (v) => { filtro.categoria = v; desenha(); });
    const inat = el('label', 'compras-interruptor');
    const inatInput = entrada('checkbox');
    inatInput.checked = filtro.inativos;
    inatInput.onchange = () => { filtro.inativos = inatInput.checked; desenha(); };
    inat.append(inatInput, el('span', null, 'Mostrar inativos'));
    filtros.append(cat, inat);
    // Cabeçalho branco da lista, igual ao de Fornecedores: título de um lado; na outra ponta, a quantidade num círculo e a bolinha "+".
    const ativos = bens.filter((b) => b.ativo !== false).length;
    const sec = U.secao('Bens', undefined, U.contagemECadastro(ativos, ativos + (ativos === 1 ? ' bem ativo' : ' bens ativos'),
      U.botaoRedondo('Cadastrar patrimônio', 'M12 5v14M5 12h14', () => formulario())));
    const lista = el('div', 'compras-lista');
    sec.append(lista);
    function desenha() {
      const vis = bens.filter((b) => (filtro.inativos || b.ativo !== false) && (!filtro.categoria || b.categoria === filtro.categoria)
        && U.dobrar([b.nome, b.marca, b.modelo, b.numeroPatrimonio, b.numeroSerie, ...(b.pecas || []).flatMap((p) => [p.nome, p.marca, p.modelo])].join(' ')).includes(U.dobrar(filtro.busca)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      lista.replaceChildren();
      if (!bens.length) lista.append(U.vazio('Nenhum bem cadastrado.', 'Use o "+" para cadastrar: por exemplo, a masseira de 40 kg e as assadeiras.'));
      else if (!vis.length) lista.append(U.vazio('Nada neste filtro.'));
      vis.forEach((b) => lista.append(U.linhaLista({
        icone: 'patrimonio', titulo: b.nome, detalhe: detalhe(b),
        estado: b.ativo === false ? 'Inativo' : 'Ativo',
        direita: [avisoManutencao(b)].filter(Boolean),
        // Mesma linha dos cadastros de grupos: tocar edita; a setinha revela Editar e Excluir.
        acoes: { rotulo: b.nome, lista, aoEditar: () => formulario(b), aoExcluir: () => excluir(b) },
      })));
    }
    desenha();
    tela.body.replaceChildren(busca, topo, filtros, sec);
  }

  /**
   * Lixeira da linha. Bem usado em ficha técnica ou formato de produto não é excluído: a lixeira oferece
   * inativar, e se já está inativo só explica. Sem uso, exclui depois de confirmar.
   */
  function excluir(b) {
    const usos = SV.usosDoBem(b.id);
    if (!usos.length) {
      return U.confirmar('Excluir bem', 'Excluir "' + b.nome + '"? Não dá para desfazer.', 'Excluir', () => { const r = SV.excluirBem(b.id); if (r.erro) return r.erro; U.avisar('Bem excluído.'); }, cores);
    }
    const onde = 'Usado em: ' + usos.slice(0, 3).join(', ') + (usos.length > 3 ? '…' : '') + '.';
    if (b.ativo === false) {
      return U.dialogo({ titulo: 'Bem não pode ser excluído', ...cores, montar: (form) => { form.append(el('p', null, '"' + b.nome + '" já está inativo e não pode ser excluído enquanto estiver em uso. ' + onde)); } });
    }
    U.confirmar('Inativar bem', '"' + b.nome + '" não pode ser excluído enquanto estiver em uso. ' + onde + ' Inativar?', 'Inativar', () => { const r = SV.alternarBem(b.id); if (r.erro) return r.erro; U.avisar('Bem inativado.'); }, cores);
  }

  function formulario(b) {
    U.dialogo({
      titulo: b ? 'Editar bem' : 'Novo bem', ...cores, largo: true,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const s1 = sec('Identificação');
        const nome = entrada('text', b?.nome || '');
        const categoria = seletor(D.CATEGORIAS, b?.categoria || '', 'Selecione');
        const marca = entrada('text', b?.marca || '');
        const modelo = entrada('text', b?.modelo || '');
        const serie = entrada('text', b?.numeroSerie || '');
        const numero = entrada('text', b?.numeroPatrimonio || '');
        const valor = entrada('text', b?.valor != null ? CD.moeda(b.valor) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' });
        const local = seletor(S.locais().map((l) => [l.id, l.caminho]), b?.localId || '', 'Sem local');
        s1.append(campo('Categoria *', categoria), campo('Nome do bem *', nome), campo('Marca', marca), campo('Modelo', modelo),
          campo('Número de série', serie), campo('Número de patrimônio', numero), campo('Valor', valor),
          campo('Onde fica', local, S.locais().length ? 'Da árvore Área / Setor / Local (Saídas · Despesas → Cadastros Geral Colaboradores).' : 'Cadastre a árvore em Saídas · Despesas → Cadastros Geral Colaboradores → DES - Área / Setor / Local.'));

        // Peças e materiais da manutenção: um cartão por peça; o cartão em branco não é salvo.
        const s3 = sec('Peças/Materiais manutenção periódica');
        const blocoPecas = el('div', 'producao-bloco compras-largo');
        const listaPecas = el('div', 'producao-etapas');
        const linhasPecas = [];
        const meses = (v) => entrada('number', v ?? '', { min: 1, step: 1, inputMode: 'numeric', placeholder: 'Ex.: 6' });
        // Última data + intervalo em meses decidem a próxima; sem um dos dois, a próxima é digitada.
        function ligarRepeticao(ultima, cada, proxima) {
          const atualiza = () => {
            const calculada = D.proximaData(ultima.value, cada.value === '' ? null : Number(cada.value));
            if (calculada) proxima.value = calculada;
            proxima.readOnly = !!calculada;
          };
          [ultima, cada].forEach((x) => { x.addEventListener('input', atualiza); x.addEventListener('change', atualiza); });
          atualiza();
        }
        // Fornecedor (cadastro do Compras) e grupo de despesas (DES - Grupos de Despesas): vínculo pelo id.
        // O que já está escolhido continua na lista mesmo se foi inativado depois.
        const opcoesFornecedor = (atual) => S.fornecedores().filter((f) => f.situacao === 'ativo' || f.id === atual)
          .sort((a, b2) => a.nome.localeCompare(b2.nome, 'pt-BR')).map((f) => [f.id, f.nome + (f.situacao === 'ativo' ? '' : ' (inativo)')]);
        function opcoesGrupo(grupoAtual, subAtual) {
          const r = [];
          S.gruposDespesa().forEach((g) => {
            const meu = g.id === grupoAtual;
            if (g.ativo || (meu && !subAtual)) r.push([g.id + '|', g.nome]);
            g.subgrupos.forEach((s) => { if ((g.ativo && s.ativo) || (meu && s.id === subAtual)) r.push([g.id + '|' + s.id, g.nome + ' › ' + s.nome]); });
          });
          if (grupoAtual && !r.some((o) => o[0] === grupoAtual + '|' + (subAtual || ''))) r.push([grupoAtual + '|' + (subAtual || ''), S.nomeGrupoDespesa(grupoAtual, subAtual)]);
          return r;
        }
        function linhaPeca(p = {}) {
          const r = el('section', 'producao-etapa patrimonio-peca');
          const cab = el('div', 'producao-etapa-cab');
          const titulo = el('h4');
          const nomeP = entrada('text', p.nome || '', { placeholder: 'Ex.: correia, resistência' });
          const marcaP = entrada('text', p.marca || '');
          const modeloP = entrada('text', p.modelo || '');
          const forn = seletor(opcoesFornecedor(p.fornecedorId), p.fornecedorId || '', S.fornecedores().length ? 'Sem fornecedor' : 'Cadastre em MER - Fornecedores');
          const grupo = seletor(opcoesGrupo(p.grupoDespesaId, p.subgrupoDespesaId), p.grupoDespesaId ? p.grupoDespesaId + '|' + (p.subgrupoDespesaId || '') : '', 'Sem grupo');
          const valorP = entrada('text', p.valor != null ? CD.moeda(p.valor) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' });
          const ultima = entrada('date', p.ultimaTroca || '');
          const cada = meses(p.intervaloMeses);
          const troca = entrada('date', p.proximaTroca || '');
          const foto = window.CicluzProdutoExtras.campoFoto(p.foto || null, () => nomeP.value.trim(), { vazio: 'Adicione uma imagem da peça (opcional)', pendente: 'A imagem nova é gravada ao salvar o bem.', coisa: 'peça' });
          foto.no.classList.add('compras-largo');
          const item = { id: p.id || '', titulo, nome: nomeP, marca: marcaP, modelo: modeloP, forn, grupo, valor: valorP, ultima, cada, troca, foto };
          const rm = botao('Remover', () => { linhasPecas.splice(linhasPecas.indexOf(item), 1); r.remove(); numerar(); }, 'btn secondary perigo-texto');
          item.rm = rm;
          cab.append(titulo, rm);
          const grade = el('div', 'producao-etapa-grade');
          grade.append(campo('Peça', nomeP), campo('Marca', marcaP), campo('Modelo', modeloP), campo('Fornecedor', forn),
            campo('Grupo de despesas', grupo, 'Ao lançar a despesa desta peça, é este o grupo que deve vir preenchido.'), campo('Valor', valorP),
            campo('Última troca', ultima), campo('A cada (meses)', cada), campo('Substituir em', troca));
          r.append(cab, grade, foto.no);
          ligarRepeticao(ultima, cada, troca);
          linhasPecas.push(item);
          listaPecas.append(r);
          numerar();
          return item;
        }
        // O número no título e nos rótulos distingue os cartões, também para o leitor de tela.
        function numerar() {
          linhasPecas.forEach((x, k) => {
            const n = k + 1;
            x.titulo.textContent = 'Peça ' + n;
            x.nome.setAttribute('aria-label', 'Peça ' + n);
            x.marca.setAttribute('aria-label', 'Marca da peça ' + n);
            x.modelo.setAttribute('aria-label', 'Modelo da peça ' + n);
            x.forn.setAttribute('aria-label', 'Fornecedor da peça ' + n);
            x.grupo.setAttribute('aria-label', 'Grupo de despesas da peça ' + n);
            x.valor.setAttribute('aria-label', 'Valor da peça ' + n);
            x.cada.setAttribute('aria-label', 'Trocar a peça ' + n + ' a cada (meses)');
            // O date-fields.js copia o rótulo para o campo DD/MM/AA quando monta: renumera a cópia também.
            for (const [data, rotulo] of [[x.ultima, 'Última troca da peça ' + n], [x.troca, 'Substituir a peça ' + n + ' em']]) {
              data.setAttribute('aria-label', rotulo);
              const visivel = data.previousElementSibling;
              if (visivel && visivel.dataset.dateDisplay) visivel.setAttribute('aria-label', rotulo);
            }
            x.rm.setAttribute('aria-label', 'Remover peça ' + n);
          });
        }
        (b?.pecas || []).forEach((p) => linhaPeca(p));
        s3.append(U.nota('Peças e materiais que este bem troca na manutenção. Cada peça tem marca, modelo, fornecedor, grupo de despesas, valor e imagem; com a última troca e o intervalo em meses, a data da próxima substituição é calculada (sem eles, digite a data).'), blocoPecas);
        blocoPecas.append(listaPecas, botao('Adicionar peça', () => linhaPeca().nome.focus()));

        const s4 = sec('Manutenção periódica');
        const revisaoUltima = entrada('date', b?.revisao?.ultima || '');
        const revisaoCada = meses(b?.revisao?.intervaloMeses);
        const revisao = entrada('date', b?.revisao?.proxima || '');
        s4.append(campo('Última manutenção', revisaoUltima), campo('A cada (meses)', revisaoCada),
          campo('Próxima manutenção', revisao, 'Calculada pela última manutenção e pelo intervalo; sem eles, digite a data. Deixe tudo em branco se não houver manutenção periódica.'));
        ligarRepeticao(revisaoUltima, revisaoCada, revisao);

        const s5 = sec('Observação em áudio');
        const audio = window.CicluzAudioNota.criar({ rotulo: '', classe: 'compras-largo', aoSalvar: 'o bem' });
        audio.definir(b?.audio || null);
        s5.append(audio.no);

        const s2 = sec('Para a produção');
        const capValor = entrada('text', b?.capacidade ? String(b.capacidade.valor).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'Ex.: 40' });
        const capUn = seletor(UNIDADES_CAPACIDADE, b?.capacidade?.unidade || 'KG');
        const larg = entrada('text', b?.medidas ? String(b.medidas.largura).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'cm' });
        const comp = entrada('text', b?.medidas ? String(b.medidas.comprimento).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'cm' });
        const energia = seletor(D.ENERGIAS, b?.energia || 'nenhuma');
        const consumo = entrada('text', b?.consumoHora != null ? String(b.consumoHora).replace('.', ',') : '', { inputMode: 'decimal' });
        const consumoCampo = campo('Consumo por hora', consumo);
        const mostra = () => { consumoCampo.style.display = energia.value === 'nenhuma' ? 'none' : ''; consumoCampo.querySelector('.compras-rotulo').textContent = 'Consumo (' + (D.UNIDADE_CONSUMO[energia.value] || 'por hora') + ') *'; };
        energia.onchange = mostra;
        s2.append(campo('Capacidade', capValor, 'Quanto cabe por vez (ex.: masseira 40 kg). Passou disso, a ficha repete o processo.'), campo('Unidade da capacidade', capUn),
          campo('Largura (cm)', larg), campo('Comprimento (cm)', comp), campo('Energia', energia), consumoCampo,
          U.nota('O consumo fica guardado para o custo de energia, que entra depois de as fórmulas de custo serem aprovadas.'));
        mostra();
        if (b) {
          const rod = el('div', 'compras-form-rodape');
          rod.append(
            botao(b.ativo === false ? 'Reativar' : 'Inativar', () => { const r = SV.alternarBem(b.id); if (r.erro) return U.avisar(r.erro); form.closest('dialog').close(); U.avisar(b.ativo === false ? 'Bem reativado.' : 'Bem inativado.'); }),
          );
          form.append(rod);
        }
        return { nome, categoria, marca, modelo, serie, numero, valor, local, capValor, capUn, larg, comp, energia, consumo, linhasPecas, revisaoUltima, revisaoCada, revisao, audio };
      },
      rotuloSalvar: 'Salvar bem',
      salvar: async (c) => {
        if (c.audio.gravando()) return 'Pare a gravação do áudio antes de salvar.';
        if ([c.revisaoUltima, c.revisao, ...c.linhasPecas.flatMap((x) => [x.ultima, x.troca])].some((d) => !d.checkValidity())) return 'Confira as datas: use DD/MM/AA.';
        const n = (i) => (String(i.value).trim() ? CD.lerNumero(i.value) : null);
        const cap = n(c.capValor);
        const l = n(c.larg); const co = n(c.comp);
        const dados = {
          id: b?.id, nome: c.nome.value, categoria: c.categoria.value, marca: c.marca.value.trim(), modelo: c.modelo.value.trim(),
          numeroSerie: c.serie.value.trim(), numeroPatrimonio: c.numero.value.trim(), valor: n(c.valor), localId: c.local.value,
          capacidade: cap != null ? { valor: cap, unidade: c.capUn.value } : null,
          medidas: l != null || co != null ? { largura: l, comprimento: co } : null,
          energia: c.energia.value, consumoHora: n(c.consumo),
          pecas: c.linhasPecas.map((x) => {
            const [grupoDespesaId = '', subgrupoDespesaId = ''] = x.grupo.value.split('|');
            return {
              id: x.id, nome: x.nome.value, marca: x.marca.value, modelo: x.modelo.value, fornecedorId: x.forn.value,
              grupoDespesaId, subgrupoDespesaId, valor: n(x.valor), foto: x.foto.valor(),
              ultimaTroca: x.ultima.value, intervaloMeses: x.cada.value, proximaTroca: x.troca.value,
            };
          }),
          revisao: { ultima: c.revisaoUltima.value, intervaloMeses: c.revisaoCada.value, proxima: c.revisao.value },
          audio: b?.audio || null,
        };
        // Confere tudo antes de guardar o áudio, para não deixar arquivo sem cadastro.
        const falta = SV.conferirBem(dados);
        if (falta) return falta;
        const som = await c.audio.guardar();
        if (som.error) return som.error;
        dados.audio = som.meta;
        const r = SV.salvarBem(dados);
        if (r.erro) return r.erro;
        U.avisar('Bem salvo.');
      },
    });
  }

  M.registrar('patrimonio', abrir);
  window.CicluzProducaoPatrimonio = { abrir, formulario };
})();
