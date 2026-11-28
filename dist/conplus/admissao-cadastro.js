/*
 * Área ConPlus — peças da aba Admissão para usar o Cadastro do S2: a escolha da empresa do arquivo, a escolha da pessoa e o quadro
 * "o que falta" (prontidão, como no S1). A conversão em si está em cadastro-questor.js (regras puras, testadas).
 * Regra de segurança: dado real de pessoa nunca vai para a empresa de homologação da ConPlus (lá tudo é gravado de verdade e
 * a ConPlus pede só dados fictícios). Só leitura do cadastro: nada aqui grava em cicluz-pessoas-v1.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const S = window.CicluzConplusDados; const K = window.CicluzConplusComum;
  if (!U || !L || !S || !K) return;
  const { el, botao } = U;
  const digitos = (v) => String(v || '').replace(/\D/g, '');

  /** Empresas do arquivo: a de homologação (testes) e cada CNPJ da tabela de filiais (aba Códigos). */
  function empresas() {
    const lista = [[L.CNPJ_HOMOLOGACAO, 'Homologação da ConPlus (só dados fictícios)']];
    const vistos = new Set([digitos(L.CNPJ_HOMOLOGACAO)]);
    S.ler().depara.filial.forEach((f) => { const d = digitos(f.cnpj); if (d && !vistos.has(d)) { vistos.add(d); lista.push([f.cnpj, (f.descricao || f.de || 'Empresa') + ' · ' + f.cnpj]); } });
    return lista;
  }
  const ehHomologacao = (cnpj) => digitos(cnpj) === digitos(L.CNPJ_HOMOLOGACAO);

  /** Janela para escolher a pessoa do cadastro do S2 (só leitura). */
  function escolherPessoa(aoEscolher) {
    const P = window.CicluzPeople; let pessoas = [];
    try { P.load?.(); pessoas = (P.get().people || []).filter((p) => !p.demo); } catch (e) { pessoas = []; }
    if (!pessoas.length) { U.avisar('Nenhuma pessoa no cadastro deste aparelho.'); return; }
    let escolhida = null;
    U.dialogo({
      titulo: 'Preencher a partir do cadastro', cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo', rotuloSalvar: 'Preencher',
      montar: (form) => {
        const busca = U.entrada('search', '', { placeholder: 'Ex: nome ou CPF...' }); busca.dataset.textoLivre = '1';
        const lista = el('div', 'conplus-pessoas'); lista.setAttribute('role', 'radiogroup'); lista.setAttribute('aria-label', 'Pessoa');
        const desenhar = () => {
          const t = busca.value.trim().toLowerCase(); const dg = digitos(t);
          const vis = pessoas.filter((p) => !t || String(p.name || '').toLowerCase().includes(t) || (dg && digitos(p.cpf).includes(dg)))
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR')).slice(0, 80);
          lista.replaceChildren(...vis.map((p) => {
            const lab = el('label', 'conplus-pessoa');
            const r = el('input'); r.type = 'radio'; r.name = 'conplus-pessoa'; r.checked = escolhida === p; r.onchange = () => { escolhida = p; };
            const ficha = p.complete && p.complete.status === 'concluido';
            lab.append(r, el('span', null, p.name || '(sem nome)'), U.situacao(ficha ? 'Ficha completa' : 'Sem ficha completa', ficha ? 'positivo' : 'atencao'));
            return lab;
          }));
          if (!vis.length) lista.append(el('p', 'profiles-note', 'Ninguém com esse nome ou CPF.'));
        };
        busca.addEventListener('input', desenhar);
        form.append(U.nota('Os dados da pessoa entram no formulário; o que é do contrato (admissão, salário, cargo…) fica para o DP. Nada é gravado no cadastro.'), U.campo('Buscar', busca), lista);
        desenhar();
      },
      salvar: () => { if (!escolhida) return 'Escolha a pessoa.'; aoEscolher(escolhida); return undefined; },
    });
  }

  const COM = [['ficha', 'Falta na ficha da pessoa'], ['DP', 'Com o DP (dados do contrato)'], ['códigos', 'Falta código na aba Códigos'], ['ConPlus', 'Depende da ConPlus']];
  /** Quadro "o que falta", com cada pendência levando ao campo. */
  function quadroProntidao(pessoa, pendencias, irPara) {
    const sec = U.secao('O que falta para ' + (pessoa && pessoa.name ? pessoa.name : 'esta admissão'), pendencias.length);
    const grade = el('div', 'conplus-prontidao');
    COM.forEach(([com, titulo]) => {
      const itens = pendencias.filter((x) => x.com === com);
      const bloco = el('div', 'conplus-prontidao-bloco');
      bloco.append(el('p', 'conplus-sub', titulo + ' · ' + itens.length));
      if (!itens.length) { bloco.append(el('p', 'profiles-note', 'Nada.')); grade.append(bloco); return; }
      const ul = el('ul', 'conplus-erros');
      itens.forEach((x) => {
        const reg = x.registro.charAt(0); const dep = x.registro.length > 1 ? Number(x.registro.slice(1)) - 1 : null;
        const li = el('li');
        li.append(botao(x.registro + ' · ' + x.campo + ' (coluna ' + x.coluna + '): ' + x.motivo, () => irPara({ reg, dep, n: x.coluna }), 'conplus-erro-link'));
        ul.append(li);
      });
      bloco.append(ul); grade.append(bloco);
    });
    sec.append(K.corpo(U.nota('Como a prontidão do S1: o que já está pronto vai no arquivo; o resto fica listado com quem precisa resolver.'), grade));
    return sec;
  }

  window.CicluzConplusAdmissaoCadastro = { empresas, ehHomologacao, escolherPessoa, quadroProntidao };
})();
