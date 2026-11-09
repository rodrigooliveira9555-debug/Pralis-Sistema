/*
 * MER - Produtos → "Importar do app de produtos" e "Revincular grupo e local" (pedido do Rodrigo, 09/11/2026).
 * Só para quem administra. O arquivo é o Backup XLSX do app (Manutenção → Backup XLSX) e é lido NO NAVEGADOR:
 * não vai para o repositório. Mostra uma prévia com os números e só grava ao confirmar. Entram TODOS os produtos
 * da TNP: os ativos no Compras e os inativos no arquivo compactado (cicluz-produtos-arquivo-v1).
 * Regras em produto-importacao.js. A biblioteca de planilha (SheetJS 0.20.3, vendor/sheetjs) só carrega aqui.
 */
(function () {
  'use strict';
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const I = window.CicluzProdutoImportacao;
  const { el, campo, entrada } = U;
  const COLUNAS_OBRIGATORIAS = ['id', 'loja', 'status', 'codigo_interno', 'base_product_id', 'nome', 'grupo'];

  /** Administrador (ou a sessão de revisão local, que não fala com o servidor). */
  function podeImportar() {
    const p = window.CicluzSessao && window.CicluzSessao.perfil;
    return !!p && (p.papel === 'administrador' || p.usuarioId === 'local');
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

  const mb = (n) => (n / 1048576).toFixed(2) + ' MB de ' + (I.LIMITE_BYTES / 1048576).toFixed(1) + ' MB';
  function linhaResumo(rotulo, valor, tom) {
    const r = el('div', 'compras-importacao-linha');
    r.append(el('span', null, rotulo), tom ? U.situacao(String(valor), tom) : el('b', null, String(valor)));
    return r;
  }

  function importar(aoTerminar) {
    let preparado = null;
    U.dialogo({
      titulo: 'Importar do app de produtos',
      subtitulo: 'Backup XLSX do app (Manutenção → Backup XLSX). Entram todos os produtos da loja TNP: ativos no Compras, inativos no arquivo compactado.',
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
            if (lido.erro) { previa.replaceChildren(Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: lido.erro })); return; }
            if (!I.compactacaoDisponivel()) { previa.replaceChildren(Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: 'Este navegador não compacta arquivos. Atualize o navegador (Safari 16.4 ou mais novo) e tente de novo.' })); return; }
            const opcoes = { grupos: S.gruposMercadoria(), arvore: S.arvoreLocais(), arquivo: await S.arquivo() };
            const montado = I.montarProdutos(lido.linhas, lido.promocoes, opcoes);
            const plano = I.planejar(S.dados, montado, opcoes);
            // Tamanhos depois da importação: cada documento precisa caber no servidor e os dois juntos no aparelho.
            const tamanho = I.bytes(plano.simulado.compras);
            const textoArquivo = await I.compactar(plano.simulado.arquivo);
            const tamanhoArquivo = I.bytes(textoArquivo);
            const cabe = tamanho <= I.LIMITE_BYTES && tamanhoArquivo <= I.LIMITE_BYTES;
            preparado = { montado, plano, tamanho, textoArquivo, cabe, arquivoAntes: opcoes.arquivo };
            const saem = Object.entries(plano.registrosQueSaem).map(([c, n]) => n + ' em ' + c).join(', ');
            const c = plano.conflitos;
            previa.replaceChildren(
              linhaResumo('Produtos da TNP no backup', plano.total),
              linhaResumo('Ativos → MER - Produtos (Compras)', plano.ativos),
              linhaResumo('Inativos → arquivo compactado', plano.inativos),
              linhaResumo('Entram (novos)', plano.novos),
              linhaResumo('Atualizam (já importados)', plano.atualizados),
              linhaResumo('Sem grupo de mercadorias do S2', plano.semGrupo, plano.semGrupo ? 'atencao' : 'positivo'),
              linhaResumo('Sem local na árvore de locais', plano.semLocal, plano.semLocal ? 'atencao' : 'positivo'),
              linhaResumo('Código interno repetido', c.internoRepetido.length, c.internoRepetido.length ? 'negativo' : 'positivo'),
              linhaResumo('Código de barras repetido', c.barrasRepetido.length, c.barrasRepetido.length ? 'negativo' : 'positivo'),
              linhaResumo('Código interno a partir de 700000 (entra como está)', c.internoForaDaFaixa),
              linhaResumo('Produtos de exemplo que saem', plano.exemplosQueSaem),
              linhaResumo('Registros de teste ligados aos exemplos que saem', saem || 'nenhum'),
              linhaResumo('Ficam de fora: outras lojas (BASE, LI, HORA)', plano.ignorados.outrasLojas),
              linhaResumo('Próximo código de produto novo no S2', 'acima de ' + plano.maiorCodigoApp),
              linhaResumo('Tamanho do Compras depois', mb(tamanho), tamanho > I.LIMITE_BYTES ? 'negativo' : 'positivo'),
              linhaResumo('Tamanho do arquivo de inativos', mb(tamanhoArquivo), tamanhoArquivo > I.LIMITE_BYTES ? 'negativo' : 'positivo'),
            );
            if (c.internoRepetido.length || c.barrasRepetido.length) previa.append(U.nota('Repetidos — interno: ' + (c.internoRepetido.join(', ') || 'nenhum') + ' · barras: ' + (c.barrasRepetido.join(', ') || 'nenhum') + '. Entram como estão no app; confira lá.'));
            if (!cabe) previa.append(Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: 'Não cabe: passaria do limite do servidor e do aparelho. Nada será gravado.' }));
          } catch (e) {
            previa.replaceChildren(Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: 'Não foi possível ler o arquivo (' + e.message + '). Confira se é o .xlsx do backup.' }));
          }
        };
        form.append(campo('Arquivo do backup (.xlsx)', arq), previa);
        return {};
      },
      salvar: () => {
        if (!preparado) return 'Escolha o arquivo do backup e espere a prévia.';
        if (!preparado.cabe) return 'Passaria do limite de tamanho. Nada foi gravado.';
        // Primeiro o arquivo de inativos; se não couber no aparelho, nada muda. Depois o Compras.
        if (!S.gravarArquivo(preparado.textoArquivo)) return 'Sem espaço neste navegador para o arquivo de inativos. Nada foi gravado.';
        let r = null;
        const ok = S.transacao((d) => { r = I.aplicar(d, preparado.montado, preparado.arquivoAntes); });
        if (!ok) return 'O arquivo de inativos foi gravado, mas o Compras não. Importe de novo: nada se repete.';
        U.avisar(r.novos + ' produto(s) novos e ' + r.atualizados + ' atualizado(s); ' + preparado.plano.noArquivo + ' inativo(s) no arquivo. Sem grupo: ' + preparado.plano.semGrupo + ' · sem local: ' + preparado.plano.semLocal + '.');
        if (aoTerminar) setTimeout(aoTerminar, 0);
        return undefined;
      },
    });
  }

  /** Refaz o casamento por nome onde o vínculo não foi feito à mão (depois que o Rodrigo ajustar grupos ou a árvore). */
  function revincularTudo(aoTerminar) {
    U.confirmar('Revincular grupo e local',
      'Casa de novo o grupo e o local de cada produto pelo nome que veio do app, usando os grupos de mercadorias e a árvore de locais de agora. Vínculo escolhido à mão no produto não muda.',
      'Revincular', () => {
        let n = 0;
        const ok = S.transacao((d) => { n = I.revincular(d.produtos, { grupos: S.gruposMercadoria(), arvore: S.arvoreLocais() }); });
        U.avisar(ok ? (n ? n + ' vínculo(s) atualizado(s).' : 'Nada mudou: os vínculos já estão em dia.') : 'Não foi possível gravar neste navegador.');
        if (aoTerminar) aoTerminar();
      });
  }

  window.CicluzProdutoImportacaoTela = { podeImportar, importar, revincularTudo, lerBackup };
})();
