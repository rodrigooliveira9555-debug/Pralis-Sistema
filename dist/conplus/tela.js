/*
 * Área ConPlus (laboratório, 27/11/2026) — Saídas · Despesas › API › DES - API Dados Contábeis TNP / Contabilidade Conplus (laboratório).
 * Uma área isolada para testar a troca de dados com o DP da ConPlus (Questor) "como se fosse a API, mas por arquivo"
 * (decisão do Marco de 27/11/2026: sem a API paga). Não mexe no cadastro de pessoas nem nas telas de DP que já existem;
 * o lugar definitivo é este, Saídas › API (Marco, 27/11/2026). A admissão pode vir do Cadastro do S2 (só leitura; PROJECT_BRAIN/11, P-57).
 * Abas: Admissão (A–D), Eventos (E), Ler arquivo, Códigos (de-para), Colaboradores (ativos vindos da ConPlus, para tratar depois)
 * e Retorno (CSV dos relatórios + vínculo CPF ↔ contrato).
 * Empresa de homologação da ConPlus (84.859.909/0001-90): só dados fictícios. Dado real de pessoa só vai para empresa real.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const K = window.CicluzConplusComum;
  if (!U || !L || !K) return;
  const { el } = U;
  U.ICONES.conplus = '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/><path d="M3 9h4M3 13h4M3 17h4"/>';
  const ORDEM = ['admissao', 'eventos', 'leitor', 'codigos', 'colaboradores', 'retorno'];
  const TITULO = 'DES - API Dados Contábeis TNP / Contabilidade Conplus';
  let tela = null;
  let aba = 'admissao';
  let painel = null;

  function topo() {
    const abas = el('div', 'vendas-pdv-abas conplus-abas');
    abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Área ConPlus');
    const A = window.CicluzConplusAbas || {};
    ORDEM.filter((id) => A[id]).forEach((id) => {
      const marcada = aba === id;
      const b = el('button', 'vendas-pdv-aba' + (marcada ? ' ativa' : ''), A[id].titulo);
      b.type = 'button'; b.id = 'conplus-aba-' + id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(marcada)); b.setAttribute('aria-controls', 'conplus-painel'); b.tabIndex = marcada ? 0 : -1;
      b.onclick = () => escolher(id);
      abas.append(b);
    });
    abas.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const ids = ORDEM.filter((id) => A[id]); const i = ids.indexOf(aba);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
      escolher(ids[j]);
      requestAnimationFrame(() => { const n = document.getElementById('conplus-aba-' + ids[j]); if (n) n.focus(); });
    });
    return abas;
  }

  function faixa() {
    const f = el('div', 'conplus-faixa');
    f.setAttribute('role', 'note');
    f.append(el('b', null, 'ConPlus por arquivo'), el('span', null, 'Na empresa de homologação (' + L.CNPJ_HOMOLOGACAO + '), só dados fictícios: o que é importado nela é gravado de verdade no Questor. Dados reais (cadastro, colaboradores) ficam só neste aparelho. Nada é enviado daqui: o arquivo é baixado e vai para a ConPlus por e-mail ou pelo Zen.'));
    return f;
  }

  /** Troca de aba; dados (ex.: linhas lidas) seguem para a aba nova quando ela sabe recebê-los. */
  function escolher(id, dados) {
    const A = window.CicluzConplusAbas || {};
    if (!A[id]) return;
    aba = id;
    if (dados && A[id].carregarLinhas) A[id].carregarLinhas(dados);
    desenhar();
  }

  function desenhar() {
    const A = window.CicluzConplusAbas || {};
    painel = el('div', 'conplus-painel'); painel.id = 'conplus-painel';
    painel.setAttribute('role', 'tabpanel'); painel.setAttribute('aria-labelledby', 'conplus-aba-' + aba);
    tela.body.replaceChildren(faixa(), topo(), painel);
    A[aba].montar(painel, { irPara: escolher });
  }

  function abrir() {
    if (!tela) {
      tela = U.criarTela({
        id: 'conplus-view', titulo: TITULO, caminho: 'Saídas · Despesas / Custos / API / ' + TITULO, icone: 'conplus',
        voltar: () => openSection(sections[2][0], 'API', 'tree', K.COR), cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-view',
      });
    }
    tela.ativar();
    desenhar();
  }

  window.CicluzConplus = Object.assign(window.CicluzConplus || {}, {
    cards: () => [[TITULO, 'Testar a troca com o DP da ConPlus por arquivo: admissão, eventos, leitura, códigos e retorno', 'conplus:area']],
    abrir: () => abrir(),
  });
})();
