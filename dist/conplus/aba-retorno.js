/*
 * Área ConPlus (laboratório) — aba Retorno: o que volta da ConPlus.
 *   1. CSV dos relatórios (folha do dia 05, adiantamento do dia 20, rescisões e férias): a leitura é a que já existe
 *      (folhas-csv.js), nas telas DES - Folha de Pagamento… em Cadastros Geral Colaboradores. Aqui não há um segundo importador:
 *      só o resumo do que foi importado nesta sessão e o atalho para cada tela.
 *   2. Vínculo CPF ↔ código do contrato (CODIGOFUNCCONTR): os relatórios não trazem CPF, e a consulta do Questor só lista
 *      contratos ativos. Guardado em cicluz-conplus-v1.vinculos; a importação das folhas usa esse vínculo para ligar o relatório
 *      ao cadastro quando a linha não traz CPF.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const D = window.CicluzConplusDominio; const S = window.CicluzConplusDados; const K = window.CicluzConplusComum;
  if (!U || !L || !D || !S || !K) return;
  const { el, botao } = U;

  function editar(item, aoSalvar) {
    U.dialogo({
      titulo: (item ? 'Editar' : 'Novo') + ' vínculo CPF ↔ contrato', cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo',
      montar: (form) => {
        const cpf = U.entrada('text', item ? item.cpf : '', { maxLength: 14, inputMode: 'numeric' });
        const contrato = U.entrada('text', item ? item.contrato : '', { maxLength: 10, inputMode: 'numeric' }); contrato.dataset.textoLivre = '1';
        const nome = U.entrada('text', item ? item.nome : '', { maxLength: 80 }); nome.dataset.textoLivre = '1';
        const cnpj = U.entrada('text', item ? item.cnpj : L.CNPJ_HOMOLOGACAO, { maxLength: 18, inputMode: 'numeric' }); cnpj.dataset.textoLivre = '1';
        form.append(U.campo('CPF *', cpf, 'Fictício no laboratório.'), U.campo('Código do contrato (CODIGOFUNCCONTR) *', contrato, 'Volta na linha A da importação da admissão.'), U.campo('Nome (opcional)', nome), U.campo('CNPJ da empresa *', cnpj));
        return { cpf, contrato, nome, cnpj };
      },
      salvar: (c) => {
        const v = { cpf: c.cpf.value.trim(), contrato: c.contrato.value.trim(), nome: c.nome.value.trim(), cnpj: c.cnpj.value.trim() };
        const p = D.problemaDoVinculo({ ...v, id: item && item.id }, S.ler().vinculos, item && item.id); if (p) return p;
        const ok = S.mudar((d) => {
          if (item) d.vinculos = d.vinculos.map((x) => (x.id === item.id ? { ...x, ...v } : x));
          else d.vinculos.push({ id: S.novoId('vc'), ...v, origem: 'manual', criadoEm: S.agoraIso() });
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        aoSalvar(); return undefined;
      },
    });
  }

  async function importar(aoSalvar) {
    const arq = await K.escolherArquivo('.csv,.txt,text/csv,text/plain'); if (!arq) return;
    const linhas = K.linhasDoCsv(arq.texto);
    if (!linhas) { U.avisar('A leitura de CSV ainda não carregou. Tente de novo.'); return; }
    const r = D.vinculosDoCsv(linhas, L.CNPJ_HOMOLOGACAO, S.ler().vinculos);
    U.dialogo({
      titulo: 'Importar vínculos CPF ↔ contrato', cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo', rotuloSalvar: 'Importar ' + r.itens.length,
      montar: (form) => {
        form.append(U.nota(arq.nome + ' · ' + (linhas.length - 1) + ' linha(s). Cabeçalho esperado: CPF (ou CPFFUNC), CONTRATO (ou CODIGOFUNCCONTR), NOME e CNPJ (opcionais).'));
        form.append(el('p', 'conplus-situacao ' + (r.itens.length ? 'tom-ok' : 'tom-erro'), r.itens.length + ' vínculo(s) para importar' + (r.erros.length ? ' · ' + r.erros.length + ' linha(s) com problema' : '') + '.'));
        if (r.erros.length) { const ul = el('ul', 'conplus-erros tom-erro'); r.erros.slice(0, 30).forEach((e) => ul.append(el('li', null, e))); form.append(ul); }
      },
      salvar: () => {
        if (!r.itens.length) return 'Nada para importar.';
        const ok = S.mudar((d) => { d.vinculos = d.vinculos.concat(r.itens.map((x) => ({ id: S.novoId('vc'), ...x, origem: 'csv', criadoEm: S.agoraIso() }))); });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar(r.itens.length + ' vínculo(s) importado(s).'); aoSalvar(); return undefined;
      },
    });
  }

  function remover(x, aoSalvar) {
    U.confirmar('Remover o vínculo', 'Remover o vínculo do contrato ' + x.contrato + ' com o CPF ' + x.cpf + '? Os relatórios desse contrato deixam de se ligar ao cadastro.', 'Remover', () => {
      const ok = S.mudar((d) => { d.vinculos = d.vinculos.filter((y) => y.id !== x.id); });
      if (!ok) return 'Não foi possível remover. Tente de novo.';
      aoSalvar(); return undefined;
    }, { cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo-remover' });
  }

  async function resumoRelatorios() {
    const sec = U.secao('CSV dos relatórios');
    const F = window.CicluzFolhas; const C = window.CicluzFolhasCsv;
    sec.append(U.nota('A importação do CSV é a das telas de documentos de pagamento (Saídas · Despesas › Cadastros Geral Colaboradores): mesma leitura, mesmo lugar. Os dados importados ficam só na memória da página. Quando a linha do relatório não traz CPF, o código do funcionário é procurado nos vínculos abaixo (a confirmar com o CSV real da ConPlus que ele é o CODIGOFUNCCONTR).'));
    if (!F || !C) { sec.append(U.vazio('As telas de documentos de pagamento não carregaram.')); return sec; }
    const linhas = [];
    for (const [tipo, t] of Object.entries(F.TIPOS)) {
      const regs = C.has(tipo) ? await C.listar(tipo) : [];
      const ligados = regs.filter((x) => x.vinculo && x.vinculo.ok).length;
      linhas.push({ tipo, titulo: t.titulo, regs: regs.length, ligados });
    }
    sec.append(U.tabela([
      ['Tela', (x) => x.titulo], ['Importados nesta sessão', (x) => String(x.regs), 'conplus-num'], ['Ligados ao cadastro', (x) => (x.regs ? String(x.ligados) : '—'), 'conplus-num'],
      ['', (x) => botao('Abrir a tela', () => { if (typeof window.showFolhaConplus === 'function') window.showFolhaConplus(x.tipo); }, 'btn secondary')],
    ], linhas));
    return sec;
  }

  function montar(corpo) {
    const relatorios = el('div');
    const vinculos = el('div');
    function desenharVinculos() {
      const itens = [...S.ler().vinculos].sort((a, b) => Number(a.contrato) - Number(b.contrato));
      const sec = U.secao('Vínculo CPF ↔ contrato', itens.length);
      const acoes = el('div', 'conplus-acoes');
      acoes.append(botao('Novo vínculo', () => editar(null, desenharVinculos), 'btn'), botao('Importar CSV', () => importar(desenharVinculos), 'btn secondary'));
      sec.append(U.nota('Os relatórios da ConPlus identificam o empregado pelo contrato, não pelo CPF. Guarde aqui o contrato que volta na linha A de cada admissão (ou a lista que a ConPlus mandar). O mesmo CPF pode ter mais de um contrato (readmissão).'), acoes,
        U.tabela([
          ['Contrato', (x) => x.contrato, 'conplus-num'], ['CPF', (x) => x.cpf], ['Nome', (x) => x.nome || '—'], ['CNPJ', (x) => x.cnpj], ['Origem', (x) => (x.origem === 'csv' ? 'CSV' : 'Manual')],
          ['', (x) => { const b = el('span', 'conplus-linha-acoes'); b.append(botao('Editar', () => editar(x, desenharVinculos), 'btn ghost'), botao('Remover', () => remover(x, desenharVinculos), 'btn ghost conplus-remover')); return b; }],
        ], itens, { vazioTexto: 'Nenhum vínculo ainda.' }));
      vinculos.replaceChildren(sec);
    }
    corpo.append(relatorios, vinculos);
    desenharVinculos();
    resumoRelatorios().then((s) => relatorios.replaceChildren(s));
  }

  (window.CicluzConplusAbas = window.CicluzConplusAbas || {}).retorno = { titulo: 'Retorno', montar };
  // Usado pela importação das folhas (folhas-csv.js) para ligar o relatório ao cadastro pelo contrato.
  window.CicluzConplus = Object.assign(window.CicluzConplus || {}, { cpfDoContrato: (contrato, cnpj) => D.cpfDoContrato(S.ler().vinculos, contrato, cnpj && /\d{14}/.test(String(cnpj).replace(/\D/g, '')) ? cnpj : undefined) });
})();
