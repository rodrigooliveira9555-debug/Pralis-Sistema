/*
 * MER - Produtos → "Importar do app de produtos" e "Revincular grupo e local" (pedido do Rodrigo, 09/11/2026).
 * Só para quem administra, com o catálogo no servidor (docs/PRODUTOS_NO_SERVIDOR_PLANO.md). O arquivo é o Backup XLSX
 * do app (Manutenção → Backup XLSX), lido NO NAVEGADOR (não vai para o repositório): a tela monta os produtos, mostra
 * a prévia e manda TODOS os da loja TNP (ativos e inativos) para a API em lotes; o servidor casa grupo e local pelo
 * nome e não duplica. Regras em produto-importacao.js. A biblioteca de planilha (SheetJS 0.20.3) só carrega aqui.
 */
(function () {
  'use strict';
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const I = window.CicluzProdutoImportacao;
  const { el, campo, entrada } = U;
  const COLUNAS_OBRIGATORIAS = ['id', 'loja', 'status', 'codigo_interno', 'base_product_id', 'nome', 'grupo'];

  /** Administrador conectado, com o catálogo no servidor. */
  function podeImportar() {
    const p = window.CicluzSessao && window.CicluzSessao.perfil;
    return Boolean(p && p.papel === 'administrador' && S.emModoServidor() && window.CicluzProdutos.conectado());
  }

  let carregando = null;
  function sheetjs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    carregando = carregando || new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'vendor/sheetjs/xlsx.full.min.js';
      s.onload = () => (window.XLSX ? ok(window.XLSX) : falha(new Error('biblioteca')));
      s.onerror = () => { carregando = null; falha(new Error('biblioteca')); };
      document.head.append(s);
    });
    return carregando;
  }

  /** Lê o backup e devolve as linhas, ou uma mensagem de erro clara. */
  async function lerBackup(arquivo) {
    const XLSX = await sheetjs();
    const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
    if (!livro.Sheets.Produtos) return { erro: 'Este arquivo não é o Backup XLSX do app de produtos (falta a aba "Produtos").' };
    const linhas = XLSX.utils.sheet_to_json(livro.Sheets.Produtos, { defval: '', raw: false });
    const falta = COLUNAS_OBRIGATORIAS.filter((c) => !linhas.length || !(c in linhas[0]));
    if (falta.length) return { erro: 'A aba "Produtos" não tem as colunas ' + falta.join(', ') + '. Baixe o backup de novo no app.' };
    const promocoes = livro.Sheets.Promocoes ? XLSX.utils.sheet_to_json(livro.Sheets.Promocoes, { defval: '', raw: false }) : [];
    return { linhas, promocoes };
  }

  function linhaResumo(rotulo, valor, tom) {
    const r = el('div', 'compras-importacao-linha');
    r.append(el('span', null, rotulo), tom ? U.situacao(String(valor), tom) : el('b', null, String(valor)));
    return r;
  }
  const alerta = (texto) => Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: texto });

  function importar(aoTerminar) {
    let preparado = null;
    const dlg = U.dialogo({
      titulo: 'Importar do app de produtos',
      subtitulo: 'Backup XLSX do app (Manutenção → Backup XLSX). Entram todos os produtos da loja TNP, ativos e inativos, direto no servidor.',
      rotuloSalvar: 'Importar',
      largo: true,
      montar: (form) => {
        const arq = entrada('file');
        arq.accept = '.xlsx';
        const previa = el('div', 'compras-importacao-previa');
        previa.append(U.nota('Escolha o arquivo para ver a prévia. Nada é gravado antes de você confirmar.'));
        arq.onchange = async () => {
          preparado = null;
          const f = arq.files && arq.files[0];
          if (!f) return;
          previa.replaceChildren(U.nota('Lendo o arquivo…'));
          try {
            const lido = await lerBackup(f);
            if (lido.erro) { previa.replaceChildren(alerta(lido.erro)); return; }
            const grupos = S.gruposMercadoria(); const arvore = S.arvoreLocais();
            const montado = I.montarProdutos(lido.linhas, lido.promocoes, { grupos, arvore });
            const todos = montado.produtos.concat(montado.inativos);
            const nos = I.nosDaArvore(arvore);
            const alertas = montado.produtos.map((p) => I.alertasDeVinculo(p, grupos, nos));
            const cf = I.conflitosDeCodigo(todos);
            preparado = { montado };
            previa.replaceChildren(
              linhaResumo('Produtos da TNP no backup', todos.length),
              linhaResumo('Ativos', montado.produtos.length),
              linhaResumo('Inativos', montado.inativos.length),
              linhaResumo('Sem grupo de mercadorias do S2 (ativos)', alertas.filter((a) => a.semGrupo).length, alertas.some((a) => a.semGrupo) ? 'atencao' : 'positivo'),
              linhaResumo('Sem local na árvore de locais (ativos)', alertas.filter((a) => a.semLocal).length, alertas.some((a) => a.semLocal) ? 'atencao' : 'positivo'),
              linhaResumo('Código interno repetido', cf.internoRepetido.length, cf.internoRepetido.length ? 'negativo' : 'positivo'),
              linhaResumo('Código de barras repetido', cf.barrasRepetido.length, cf.barrasRepetido.length ? 'negativo' : 'positivo'),
              linhaResumo('Código interno a partir de 700000 (entra como está)', cf.internoForaDaFaixa),
              linhaResumo('Ficam de fora: outras lojas (BASE, LI, HORA)', montado.contagem.total - (montado.contagem.porLoja.TNP || 0)),
              linhaResumo('Próximo código de produto novo no S2', 'acima de ' + montado.maiorCodigoApp),
            );
            if (cf.internoRepetido.length || cf.barrasRepetido.length) previa.append(U.nota('Repetidos — interno: ' + (cf.internoRepetido.join(', ') || 'nenhum') + ' · barras: ' + (cf.barrasRepetido.join(', ') || 'nenhum') + '. Entram como estão no app; confira lá.'));
            previa.append(U.nota('Vai para o servidor em lotes de 500. Quem já existe é atualizado (pelo id do app ou pelo código interno); nada se duplica, e o que é do S2 (liberado para compra, vínculo escolhido à mão) não volta atrás.'));
          } catch (e) {
            previa.replaceChildren(alerta('Não foi possível ler o arquivo (' + e.message + '). Confira se é o .xlsx do backup.'));
          }
        };
        form.append(campo('Arquivo do backup (.xlsx)', arq), previa);
        return {};
      },
      salvar: () => {
        if (!preparado) return 'Escolha o arquivo do backup e espere a prévia.';
        const erro = dlg.querySelector('.profiles-error');
        window.CicluzProdutos.importar(preparado.montado, (feitos, total) => { if (erro) erro.textContent = 'Enviando ao servidor: ' + feitos + ' de ' + total + '…'; })
          .then((r) => {
            // Os produtos de exemplo do protótipo não vão para o servidor; os registros de teste ligados a eles saem.
            S.transacao((d) => { I.tirarExemplos(d); });
            dlg.close();
            U.avisar(r.novos + ' produto(s) novos e ' + r.atualizados + ' atualizado(s) no servidor.');
            if (aoTerminar) setTimeout(aoTerminar, 0);
          })
          .catch((e) => { if (erro) erro.textContent = 'Parou no servidor: ' + e.message + '. Importe de novo: o que já foi não se repete.'; });
        return 'Enviando ao servidor…';
      },
    });
  }

  /** Refaz no servidor o casamento por nome onde o vínculo não foi feito à mão (depois de ajustar grupos ou a árvore). */
  function revincularTudo(aoTerminar) {
    U.confirmar('Revincular grupo e local',
      'Casa de novo o grupo e o local de cada produto pelo nome que veio do app, usando os grupos de mercadorias e a árvore de locais de agora. Vínculo escolhido à mão no produto não muda.',
      'Revincular', () => {
        window.CicluzProdutos.revincular()
          .then((r) => { U.avisar(r.mudaram ? r.mudaram + ' produto(s) com vínculo atualizado.' : 'Nada mudou: os vínculos já estão em dia.'); if (aoTerminar) aoTerminar(); })
          .catch((e) => U.avisar('Não foi possível revincular no servidor: ' + e.message));
      });
  }

  window.CicluzProdutoImportacaoTela = { podeImportar, importar, revincularTudo, lerBackup };
})();
