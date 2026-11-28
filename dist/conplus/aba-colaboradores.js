/*
 * Área ConPlus — aba Colaboradores: os colaboradores ativos que vêm da ConPlus (Questor), guardados numa lista própria para tratar
 * depois (pedido do Marco, 27/11/2026). Não grava no cadastro de pessoas: só mostra se cada um já existe lá (pelo CPF).
 * Importação: CSV com as colunas da consulta de contratos do Questor (CODIGOFUNCCONTR, NOMEFUNC, CPFFUNC, PISFUNC, DATAADM…).
 * Reimportar o mesmo arquivo não duplica; contrato que não veio não é apagado. Ao importar, os vínculos CPF ↔ contrato que faltam
 * entram também (são eles que ligam os relatórios da folha ao cadastro). Dados reais: ficam só neste aparelho (P-11).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const C = window.CicluzConplusColaboradores; const S = window.CicluzConplusDados; const K = window.CicluzConplusComum;
  if (!U || !C || !S || !K) return;
  const { el, botao } = U;
  let busca = '';

  const pessoas = () => { try { const P = window.CicluzPeople; if (!P) return []; P.load?.(); return P.get().people || []; } catch (e) { return []; } };
  const SITUACAO = { 'no-cadastro': ['Já no cadastro', 'positivo'], fora: ['Fora do cadastro', 'atencao'], duplicado: ['CPF repetido no cadastro', 'negativo'] };

  async function importar(aoSalvar) {
    const arq = await K.escolherArquivo('.csv,.txt,text/csv,text/plain'); if (!arq) return;
    const linhas = K.linhasDoCsv(arq.texto);
    if (!linhas) { U.avisar('A leitura de CSV ainda não carregou. Tente de novo.'); return; }
    const r = C.colaboradoresDoCsv(linhas);
    const atual = S.ler().colaboradores;
    const previa = C.juntar(atual, r.itens);
    U.dialogo({
      titulo: 'Importar colaboradores da ConPlus', cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo', rotuloSalvar: 'Importar',
      montar: (form) => {
        form.append(U.nota(arq.nome + ' · ' + arq.codificacao + ' · ' + (linhas.length - 1) + ' linha(s). Colunas esperadas: CODIGOFUNCCONTR, NOMEFUNC, CPFFUNC (obrigatórias) e CNPJ, CODIGOEMPRESA, CODIGOESTAB, PISFUNC, DATAADM, DATADEM, CODIGOTIPOCONTR, DESCRTIPOCONTR.'));
        form.append(el('p', 'conplus-situacao ' + (r.itens.length ? 'tom-ok' : 'tom-erro'),
          previa.novos + ' novo(s) · ' + previa.atualizados + ' atualizado(s) · ' + previa.iguais + ' sem mudança' + (r.erros.length ? ' · ' + r.erros.length + ' linha(s) com problema' : '') + '.'));
        if (r.erros.length) { const ul = el('ul', 'conplus-erros tom-erro'); r.erros.slice(0, 30).forEach((e) => ul.append(el('li', null, e))); form.append(ul); }
        form.append(U.nota('Nada vai para o cadastro de pessoas. Os dados ficam só neste aparelho. Contratos que já estão na lista e não vieram no arquivo continuam como estão.'));
      },
      salvar: () => {
        if (!r.itens.length) return 'Nada para importar.';
        let res = null; let novosVinculos = 0;
        const ok = S.mudar((d) => {
          res = C.juntar(d.colaboradores, r.itens, { agora: S.agoraIso(), novoId: () => S.novoId('cc') });
          d.colaboradores = res.lista;
          const falta = C.vinculosQueFaltam(res.lista, d.vinculos);
          novosVinculos = falta.length;
          d.vinculos = d.vinculos.concat(falta.map((v) => ({ id: S.novoId('vc'), ...v, origem: 'conplus', criadoEm: S.agoraIso() })));
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar(res.novos + ' novo(s), ' + res.atualizados + ' atualizado(s)' + (novosVinculos ? ', ' + novosVinculos + ' vínculo(s) CPF ↔ contrato' : '') + '.');
        aoSalvar(); return undefined;
      },
    });
  }

  function removerTudo(aoSalvar) {
    U.confirmar('Apagar a lista de colaboradores', 'Apagar os ' + S.ler().colaboradores.length + ' colaborador(es) importados da ConPlus deste aparelho? O cadastro de pessoas e os vínculos CPF ↔ contrato não mudam. Para ter a lista de novo, importe o CSV outra vez.', 'Apagar', () => {
      const ok = S.mudar((d) => { d.colaboradores = []; });
      if (!ok) return 'Não foi possível apagar. Tente de novo.';
      aoSalvar(); return undefined;
    }, { cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo-remover' });
  }

  function montar(corpo) {
    const conteudo = el('div');
    function desenhar() {
      const todos = S.ler().colaboradores;
      const ps = pessoas();
      const contagem = { 'no-cadastro': 0, fora: 0, duplicado: 0 };
      todos.forEach((x) => { contagem[C.situacaoNoCadastro(x, ps)]++; });
      const sec = U.secao('Colaboradores da ConPlus', todos.length);
      const acoes = el('div', 'conplus-acoes');
      acoes.append(botao('Importar CSV', () => importar(desenhar), 'btn'));
      if (todos.length) acoes.append(botao('Apagar a lista', () => removerTudo(desenhar), 'btn ghost conplus-remover'));
      const campoBusca = U.entrada('search', busca, { placeholder: 'Ex: nome, contrato ou CPF...' }); campoBusca.dataset.textoLivre = '1';
      campoBusca.addEventListener('input', () => { busca = campoBusca.value; desenharLista(); });
      const resumo = todos.length ? el('p', 'profiles-note', contagem['no-cadastro'] + ' já no cadastro de pessoas · ' + contagem.fora + ' fora do cadastro' + (contagem.duplicado ? ' · ' + contagem.duplicado + ' com CPF repetido no cadastro' : '') + '.') : null;
      const filtro = el('div', 'conplus-filtro conplus-filtro-largo'); filtro.append(U.campo('Buscar', campoBusca));
      sec.append(K.corpo(U.nota('Os ativos que a ConPlus tem no Questor, uma linha por contrato, para tratar depois. Nada aqui entra no cadastro de pessoas: a coluna Cadastro só mostra se o CPF já existe lá. Dados reais, guardados só neste aparelho; dados bancários não são importados.'), acoes, resumo, todos.length ? filtro : null));
      const lista = el('div');
      function desenharLista() {
        const termo2 = busca.trim().toLowerCase(); const dig2 = termo2.replace(/\D/g, '');
        const vis = todos.filter((x) => !termo2 || String(x.nome).toLowerCase().includes(termo2) || (dig2 && (String(x.contrato) === dig2 || String(x.cpf).replace(/\D/g, '').includes(dig2))))
          .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
        lista.replaceChildren(K.tabela([
          ['Contrato', (x) => x.contrato, 'conplus-num'], ['Nome', (x) => x.nome], ['CPF', (x) => C.mascararCpf(x.cpf)], ['Admissão', (x) => x.admissao || '—'],
          ['Tipo', (x) => (x.descrTipo || x.tipoContrato || '—') + (x.demissao ? ' · demitido em ' + x.demissao : '')],
          ['Cadastro', (x) => { const [t, tom] = SITUACAO[C.situacaoNoCadastro(x, ps)]; return U.situacao(t, tom); }],
        ], vis, { vazioTexto: todos.length ? 'Ninguém com esse nome, contrato ou CPF.' : 'Nenhum colaborador importado ainda. Use "Importar CSV" com a lista de ativos exportada do Zen da ConPlus.' }));
      }
      sec.append(lista); desenharLista();
      conteudo.replaceChildren(sec);
    }
    corpo.append(conteudo);
    desenhar();
  }

  (window.CicluzConplusAbas = window.CicluzConplusAbas || {}).colaboradores = { titulo: 'Colaboradores', montar };
})();
