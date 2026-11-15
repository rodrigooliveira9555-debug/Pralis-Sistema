/*
 * RET - Patrimônios (Saídas · Retiradas → Cadastros Geral). Substitui a prévia que não salvava.
 * Bens nas 4 categorias do Rodrigo, com o que a produção precisa: capacidade (o tempo dobra quando
 * passa dela), medidas (assadeiras) e energia com consumo por hora (guardado para o custo futuro).
 * Manutenção (15/11/2026, pedido do Rodrigo): a Categoria é o primeiro campo; cada bem pode ter peças
 * principais com a data da próxima substituição, a data da próxima revisão periódica e uma observação
 * em áudio (peça compartilhada de audio-nota.js; o áudio fica só no aparelho).
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
  /** Datas de manutenção já passadas (peça a substituir ou revisão), para o selo da lista. */
  function vencidos(b) {
    const hoje = S.hojeIso();
    const r = (b.pecas || []).filter((p) => p.proximaTroca && p.proximaTroca < hoje).map((p) => 'Substituir ' + p.nome);
    if (b.revisao && b.revisao.proxima < hoje) r.push('Revisão vencida');
    return r;
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
    if (b.revisao) partes.push('revisão ' + dataBR(b.revisao.proxima));
    if (b.audio) partes.push('áudio');
    return partes.join(' · ');
  }

  function render() {
    const bens = S.patrimonio.dados.bens;
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Utensílios, máquinas, equipamentos e mobiliário. As fichas técnicas usam estes bens em cada etapa, e a capacidade decide quando o processo precisa ser repetido.'));
    const filtros = el('div', 'compras-filtros');
    const busca = U.busca('Buscar bem', (v) => { filtro.busca = v; desenha(); });
    busca.value = filtro.busca;
    const cat = U.chips([['', 'Todos'], ...D.CATEGORIAS], filtro.categoria, (v) => { filtro.categoria = v; desenha(); });
    const inat = el('label', 'compras-interruptor');
    const inatInput = entrada('checkbox');
    inatInput.checked = filtro.inativos;
    inatInput.onchange = () => { filtro.inativos = inatInput.checked; desenha(); };
    inat.append(inatInput, el('span', null, 'Mostrar inativos'));
    filtros.append(busca, cat, inat);
    const sec = U.secao('Bens', bens.filter((b) => b.ativo !== false).length);
    const lista = el('div', 'compras-lista');
    sec.append(lista);
    function desenha() {
      const vis = bens.filter((b) => (filtro.inativos || b.ativo !== false) && (!filtro.categoria || b.categoria === filtro.categoria)
        && U.dobrar([b.nome, b.marca, b.modelo, b.numeroPatrimonio, b.numeroSerie, ...(b.pecas || []).map((p) => p.nome)].join(' ')).includes(U.dobrar(filtro.busca)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      lista.replaceChildren();
      if (!bens.length) lista.append(U.vazio('Nenhum bem cadastrado.', 'Cadastre com o "+": por exemplo, a masseira de 40 kg e as assadeiras.'));
      else if (!vis.length) lista.append(U.vazio('Nada neste filtro.'));
      vis.forEach((b) => lista.append(U.linhaLista({
        icone: 'patrimonio', titulo: b.nome, detalhe: detalhe(b),
        direita: [b.ativo === false ? U.situacao('Inativo', 'neutro') : null, ...vencidos(b).slice(0, 1).map((t) => U.situacao(vencidos(b).length > 1 ? vencidos(b).length + ' manutenções vencidas' : t, 'atencao')), botao('Editar', () => formulario(b))].filter(Boolean),
      })));
    }
    desenha();
    tela.body.replaceChildren(topo, filtros, sec);
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

        // Peças principais: uma linha por peça; a linha em branco não é salva.
        const s3 = sec('Peças principais');
        const listaPecas = el('div', 'producao-bloco compras-largo');
        const linhasPecas = [];
        function linhaPeca(p = {}) {
          const r = el('div', 'producao-linha patrimonio-peca');
          const nomeP = entrada('text', p.nome || '', { placeholder: 'Ex.: correia, resistência' });
          const troca = entrada('date', p.proximaTroca || '');
          const item = { id: p.id || '', nome: nomeP, troca };
          const rm = botao('Remover', () => { linhasPecas.splice(linhasPecas.indexOf(item), 1); r.remove(); numerar(); }, 'btn secondary perigo-texto');
          item.rm = rm;
          r.append(campo('Peça', nomeP), campo('Substituir em', troca), rm);
          linhasPecas.push(item);
          listaPecas.append(r);
          numerar();
          return item;
        }
        // O rótulo numerado distingue as linhas para o leitor de tela.
        function numerar() {
          linhasPecas.forEach((x, k) => {
            x.nome.setAttribute('aria-label', 'Peça ' + (k + 1));
            x.troca.setAttribute('aria-label', 'Substituir a peça ' + (k + 1) + ' em');
            // O date-fields.js copia o rótulo para o campo DD/MM/AA quando monta: renumera a cópia também.
            const visivel = x.troca.previousElementSibling;
            if (visivel && visivel.dataset.dateDisplay) visivel.setAttribute('aria-label', x.troca.getAttribute('aria-label'));
            x.rm.setAttribute('aria-label', 'Remover peça ' + (k + 1));
          });
        }
        (b?.pecas || []).forEach((p) => linhaPeca(p));
        s3.append(U.nota('Só para o bem que tem peças de troca. Informe cada peça e a data prevista da próxima substituição.'), listaPecas,
          botao('Adicionar peça', () => linhaPeca().nome.focus()));

        const s4 = sec('Revisão periódica');
        const revisao = entrada('date', b?.revisao?.proxima || '');
        s4.append(campo('Próxima revisão', revisao, 'Data agendada para a próxima revisão do bem. Deixe em branco se não houver.'));

        const s5 = sec('Observação em áudio');
        const audio = window.CicluzAudioNota.criar({ rotulo: 'Observação em áudio (opcional)', classe: 'compras-largo', aoSalvar: 'o bem' });
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
            botao('Excluir', () => { form.closest('dialog').close(); U.confirmar('Excluir bem', 'Excluir "' + b.nome + '"? Não dá para desfazer.', 'Excluir', () => { const r = SV.excluirBem(b.id); if (r.erro) return r.erro; U.avisar('Bem excluído.'); }, cores); }, 'btn secondary perigo-texto'),
          );
          form.append(rod);
        }
        return { nome, categoria, marca, modelo, serie, numero, valor, local, capValor, capUn, larg, comp, energia, consumo, linhasPecas, revisao, audio };
      },
      rotuloSalvar: 'Salvar bem',
      salvar: async (c) => {
        if (c.audio.gravando()) return 'Pare a gravação do áudio antes de salvar.';
        if ([c.revisao, ...c.linhasPecas.map((x) => x.troca)].some((d) => !d.checkValidity())) return 'Confira as datas: use DD/MM/AA.';
        const n = (i) => (String(i.value).trim() ? CD.lerNumero(i.value) : null);
        const cap = n(c.capValor);
        const l = n(c.larg); const co = n(c.comp);
        const dados = {
          id: b?.id, nome: c.nome.value, categoria: c.categoria.value, marca: c.marca.value.trim(), modelo: c.modelo.value.trim(),
          numeroSerie: c.serie.value.trim(), numeroPatrimonio: c.numero.value.trim(), valor: n(c.valor), localId: c.local.value,
          capacidade: cap != null ? { valor: cap, unidade: c.capUn.value } : null,
          medidas: l != null || co != null ? { largura: l, comprimento: co } : null,
          energia: c.energia.value, consumoHora: n(c.consumo),
          pecas: c.linhasPecas.map((x) => ({ id: x.id, nome: x.nome.value, proximaTroca: x.troca.value })),
          revisao: c.revisao.value ? { proxima: c.revisao.value } : null,
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
