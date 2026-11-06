/*
 * RET - Patrimônios (Saídas · Retiradas → Cadastros Geral). Substitui a prévia que não salvava.
 * Bens nas 4 categorias do Rodrigo, com o que a produção precisa: capacidade (o tempo dobra quando
 * passa dela), medidas (assadeiras) e energia com consumo por hora (guardado para o custo futuro).
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
        && U.dobrar([b.nome, b.marca, b.modelo, b.numeroPatrimonio, b.numeroSerie].join(' ')).includes(U.dobrar(filtro.busca)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      lista.replaceChildren();
      if (!bens.length) lista.append(U.vazio('Nenhum bem cadastrado.', 'Cadastre com o "+": por exemplo, a masseira de 40 kg e as assadeiras.'));
      else if (!vis.length) lista.append(U.vazio('Nada neste filtro.'));
      vis.forEach((b) => lista.append(U.linhaLista({
        icone: 'patrimonio', titulo: b.nome, detalhe: detalhe(b),
        direita: [b.ativo === false ? U.situacao('Inativo', 'neutro') : null, botao('Editar', () => formulario(b))].filter(Boolean),

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
        s1.append(campo('Nome do bem *', nome), campo('Categoria *', categoria), campo('Marca', marca), campo('Modelo', modelo),
          campo('Número de série', serie), campo('Número de patrimônio', numero), campo('Valor', valor),
          campo('Onde fica', local, S.locais().length ? 'Da árvore Área / Setor / Local (Saídas · Despesas → Cadastros Geral Colaboradores).' : 'Cadastre a árvore em Saídas · Despesas → Cadastros Geral Colaboradores → DES - Área / Setor / Local.'));

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
        return { nome, categoria, marca, modelo, serie, numero, valor, local, capValor, capUn, larg, comp, energia, consumo };
      },
      rotuloSalvar: 'Salvar bem',
      salvar: (c) => {
        const n = (i) => (String(i.value).trim() ? CD.lerNumero(i.value) : null);
        const cap = n(c.capValor);
        const l = n(c.larg); const co = n(c.comp);
        const r = SV.salvarBem({
          id: b?.id, nome: c.nome.value, categoria: c.categoria.value, marca: c.marca.value.trim(), modelo: c.modelo.value.trim(),
          numeroSerie: c.serie.value.trim(), numeroPatrimonio: c.numero.value.trim(), valor: n(c.valor), localId: c.local.value,
          capacidade: cap != null ? { valor: cap, unidade: c.capUn.value } : null,
          medidas: l != null || co != null ? { largura: l, comprimento: co } : null,
          energia: c.energia.value, consumoHora: n(c.consumo),
        });
        if (r.erro) return r.erro;
        U.avisar('Bem salvo.');
      },
    });
  }

  M.registrar('patrimonio', abrir);
  window.CicluzProducaoPatrimonio = { abrir, formulario };
})();
