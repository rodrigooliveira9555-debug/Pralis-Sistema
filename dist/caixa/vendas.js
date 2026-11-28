/*
 * Caixa — VND - Vendas (Entradas › Lançamentos). Tela única que reúne as três etapas do caixa, na ordem em que acontecem:
 * 1 Abertura · 2 Turno · 3 Fechamento. Cada etapa abre a sua tela e o Voltar dela traz de volta para cá.
 * A tela só mostra em que etapa o caixa está (C.estado.status); as regras de cada etapa continuam nas próprias telas.
 * Lista em grupos de linhas (padrão da Nova Transferência, 27/11/2026): um grupo por etapa, com a linha que abre a tela (nome, estado à
 * direita e a seta ›) e a explicação da etapa depois do quadro.
 * Dados FICTÍCIOS, em memória: nada é gravado.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el } = U;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Vendas';
  // [tela, título, texto, rótulo da linha que abre a etapa]
  const ETAPAS = [
    ['abertura', 'Abertura de caixa', 'Conferir o malote pelo lacre e abrir o turno.', 'Abrir o caixa'],
    ['turno', 'Turno do caixa', 'Resumo, sangria, PDV e vendas do turno.', 'Ver o turno'],
    ['fechamento', 'Fechamento de caixa', 'Contagem, folha, maquininha e lacre.', 'Fechar o caixa'],
  ];
  let tela = null;

  /** Em que etapa o caixa está agora: 0 = nenhuma aberta (começa pela Abertura), 1 = turno aberto, 2 = em fechamento. */
  const etapaAtual = () => ({ fechado: 0, aberto: 1, em_fechamento: 2 }[C.estado.status] ?? 0);

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-vendas', titulo: 'VND - Vendas', caminho: CAMINHO, voltar: C.voltarLancamentos });
    tela.ativar();
    render();
  }

  /** Linha que abre uma etapa: o nome, o estado (palavra, não só cor) e a seta. */
  function linhaDaEtapa(rotulo, estado, aoToque) {
    const b = el('button', 'transferencia-linha transferencia-linha-acao');
    b.type = 'button';
    if (estado.atual) b.setAttribute('aria-current', 'step');
    const valor = el('span', 'transferencia-linha-valor');
    valor.append(U.situacao(estado.texto, estado.tom));
    const seta = el('span', 'transferencia-seta');
    seta.setAttribute('aria-hidden', 'true');
    seta.innerHTML = U.svg('<path d="m9 6 6 6-6 6"/>');
    b.append(el('span', 'transferencia-linha-rotulo', rotulo), valor, seta);
    b.onclick = aoToque;
    return b;
  }

  function render() {
    const atual = etapaAtual();
    const aviso = U.nota('Demonstração: dados fictícios, nada é gravado. As etapas seguem a ordem do caixa: abrir, vender no turno e fechar.');
    aviso.classList.add('caixa-aviso');
    const grupos = ETAPAS.map(([nome, titulo, texto, rotulo], i) => {
      const estado = i < atual ? { texto: 'Feita', tom: 'positivo' } : i === atual ? { texto: 'Atual', tom: 'info', atual: true } : { texto: 'A seguir', tom: 'neutro' };
      return C.grupo((i + 1) + ' · ' + titulo, [linhaDaEtapa(rotulo, estado, () => C.abrir(nome))], U.nota(texto));
    });
    tela.body.replaceChildren(C.formulario(aviso, ...grupos));
  }

  C.registrar('vendas', abrir);
})();
