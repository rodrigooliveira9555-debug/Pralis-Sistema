/*
 * Cadastro de Fornecedores, que alimenta Compras (Produtos fica em telas-produto-*.js).
 * É o cadastro único de fornecedor do sistema: abre por Saídas · Mercadorias → Cadastros Geral
 * (MER - Fornecedores) e por Saídas · Despesas → Cadastros Geral (DES - Fornecedores).
 * Espelham /fornecedores e /produtos do S1 (main).
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const { el, botao, campo, entrada, seletor } = U;

  /* ---------- Máscaras ---------- */
  function mascaraDocumento(v) {
    const d = D.digitos(v).slice(0, 14);
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  function mascaraTelefone(v) {
    const d = D.digitos(v).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  /* ----- Etapa 6: ficha do fornecedor (impressão e envio) e documentos. A ficha é montada só com o que está no cadastro;
     não é contrato nem documento assinado, e nada é gerado ou enviado sem a pessoa tocar e confirmar. ----- */
  const dataBR = (iso) => (iso ? window.CicluzDateFields.display(iso) : '');
  const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
  /** Linhas [rótulo, valor] do contrato, só as preenchidas. */
  function linhasContrato(c) {
    const sm = c.salarioMinimo;
    const rec = c.recorrencia === 'personalizado' ? 'Personalizado — ' + (D.resumoRecorrenciaPersonalizada(c.recorrenciaPersonalizada) || 'a configurar')
      : c.recorrencia === 'compra-mensal' ? 'Compra Mensal' + (D.resumoTermino(c.terminoMensal) ? ', ' + D.resumoTermino(c.terminoMensal) : '') : nomeDe(D.RECORRENCIAS_CLIENTE, c.recorrencia);
    const dinheiro = c.formaPagamento === 'dinheiro';
    return [
      ['Cliente mensal', c.clienteMensal ? 'Sim — período do dia 1 ao último dia do mês' : ''],
      ['Tipo de contrato', c.modeloNome ? c.modeloNome + (c.modeloVersao ? ' (versão ' + c.modeloVersao + ')' : '') : ''],
      ['Forma de pagamento', nomeDe(D.FORMAS_PAGAMENTO_CONTRATO, c.formaPagamento)],
      c.clienteMensal ? ['Vencimento', 'Todo dia ' + D.CLIENTE_MENSAL.vencimentoDia] : dinheiro ? ['Dia de pagamento', 'Toda sexta-feira'] : ['Vencimento', dataBR(c.vencimentoData) || (Number.isInteger(c.vencimentoDia) ? 'Todo dia ' + c.vencimentoDia : '')],
      ['Recorrência', rec],
      ['Valor', Number.isInteger(c.valorCentavos) ? D.resumoValorRecorrencia(c.valorCentavos, c.recorrencia).replace(/\.$/, '') : ''],
      ['Referência do salário mínimo', sm && sm.ativo && typeof sm.percentual === 'number' && !Number.isNaN(sm.percentual) ? String(sm.percentual).replace('.', ',') + '% do salário mínimo' : ''],
      ['Vigência', [dataBR(c.inicio), dataBR(c.fim)].filter(Boolean).join(' a ')],
      ['Reajuste', c.reajuste ? nomeDe(D.REAJUSTES_CONTRATO, c.reajuste) + (c.reajuste === 'percentual' && typeof c.reajustePercentual === 'number' && !Number.isNaN(c.reajustePercentual) ? ' de ' + String(c.reajustePercentual).replace('.', ',') + '%' : '') : ''],
    ].filter(([, v]) => v);
  }
  /** Seções [título, [[rótulo, valor]]] da ficha, a partir do cadastro lido do formulário. */
  function secoesFicha(c) {
    const pf = c.tipoPessoa === 'fisica'; const e = c.endereco || {};
    const contato = (x, extra = []) => [['Nome', x && x.nome], ['WhatsApp', x && x.whatsapp], ['E-mail', x && x.email], ...extra];
    const secoes = [
      ['Identificação', [['Categoria', D.nomeCategoriasFornecedor(c)], ['Tipo de fornecedor', pf ? 'PF - Pessoa Física' : 'PJ - Pessoa Jurídica'], [pf ? 'Nome completo' : 'Nome fantasia', c.nome], ...(pf ? [] : [['Razão social', c.razaoSocial], ['Regime tributário', nomeDe(D.REGIMES_TRIBUTARIOS, c.regimeTributario)]]), [pf ? 'CPF' : 'CNPJ', c.documento], ['Situação', c.situacao === 'ativo' ? 'Ativo' : 'Inativo']]],
      ['Endereço', [['CEP', e.cep], ['Rua / logradouro', e.logradouro], ['Número', e.numero], ['Complemento', e.complemento], ['Bairro', e.bairro], ['Cidade', e.cidade], ['UF', e.uf]]],
      ['Contato (vendedor ou prestador)', [['Nome', c.contatoNome], ['WhatsApp', c.whatsapp], ['E-mail', c.email], ['Aniversário', D.aniversarioTexto(c.vendedorAniversario)]]],
      ['Financeiro', contato(c.financeiro)],
      ['Representante', contato(c.representante, [['Cargo', nomeDe(D.CARGOS_REPRESENTANTE, c.representante && c.representante.cargo)]])],
    ];
    if (c.contrato && c.contrato.tem) secoes.push(['Contrato', linhasContrato(c.contrato)]);
    return secoes.map(([t, l]) => [t, l.filter(([, v]) => v)]).filter(([, l]) => l.length);
  }
  const textoFicha = (c) => ['FICHA DE CADASTRO DO FORNECEDOR', '(gerada pelo sistema a partir do cadastro; não é contrato nem documento assinado)', ''].concat(
    ...secoesFicha(c).map(([t, l]) => [t.toUpperCase(), ...l.map(([k, v]) => k + ': ' + v), ''])).join('\n').trim();
  /** Impressão: a ficha vai para um quadro invisível e abre a impressão do navegador (que oferece a prévia e o PDF). */
  function imprimirFicha(c) {
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true'); ifr.tabIndex = -1;
    ifr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.append(ifr);
    const d = ifr.contentDocument;
    d.open(); d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha do fornecedor</title></head><body></body></html>'); d.close();
    const mk = (tag, texto, css) => { const n = d.createElement(tag); if (texto != null) n.textContent = texto; if (css) n.style.cssText = css; return n; };
    d.body.style.cssText = 'font:13px/1.45 Arial,sans-serif;color:#111;margin:24px';
    d.body.append(mk('h1', 'Ficha de cadastro do fornecedor', 'font-size:20px;margin:0 0 4px'), mk('p', 'Gerada pelo sistema a partir do cadastro. Não é contrato nem documento assinado.', 'margin:0 0 16px;color:#555'));
    secoesFicha(c).forEach(([titulo, linhas]) => {
      d.body.append(mk('h2', titulo, 'font-size:14px;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:2px'));
      linhas.forEach(([k, v]) => { const p = mk('p', null, 'margin:2px 0'); p.append(mk('b', k + ': '), d.createTextNode(v)); d.body.append(p); });
    });
    const limpar = () => { if (ifr.isConnected) ifr.remove(); };
    ifr.contentWindow.addEventListener('afterprint', limpar);
    setTimeout(limpar, 120000);
    ifr.contentWindow.focus();
    ifr.contentWindow.print();
  }
  /** Envio: mostra a mensagem e deixa a pessoa escolher o canal; o aplicativo abre com a mensagem pronta e só envia quando ela confirma lá. */
  function enviarFicha(c, cores) {
    U.dialogo({
      titulo: 'Enviar ficha do fornecedor', ...cores,
      montar: (form) => {
        const texto = el('textarea'); texto.readOnly = true; texto.rows = 10; texto.value = textoFicha(c); texto.setAttribute('aria-label', 'Mensagem que será aberta no canal escolhido');
        texto.dataset.textoLivre = '1';
        const aviso = el('p', 'profiles-note compras-largo'); aviso.setAttribute('role', 'status');
        aviso.textContent = 'Escolha o canal. O sistema só abre o aplicativo com a mensagem pronta; nada é enviado até você confirmar lá.';
        const G = window.CicluzGP;
        const abrir = (url) => { const X = window.CicluzUniformUI; if (X && X.openExternal) X.openExternal(url); else window.open(url, '_blank', 'noopener'); };
        const canal = (rotulo, icone, acao) => {
          const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo);
          b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icone + '</svg>';
          b.onclick = () => { acao(); aviso.textContent = rotulo + ': aplicativo aberto com a mensagem. Ela só é enviada quando você confirmar lá.'; };
          return b;
        };
        const linha = el('div', 'compras-form-rodape compras-largo compras-doc-acoes');
        linha.append(
          canal('Enviar por WhatsApp', U.ICONES.whatsapp, () => abrir(G && G.waLink ? G.waLink(c.whatsapp, texto.value) : 'https://wa.me/?text=' + encodeURIComponent(texto.value))),
          canal('Enviar por e-mail', U.ICONES.email, () => abrir(G && G.mailLink ? G.mailLink(c.email, 'Ficha de cadastro do fornecedor', texto.value) : 'mailto:' + encodeURIComponent(c.email || '') + '?subject=' + encodeURIComponent('Ficha de cadastro do fornecedor') + '&body=' + encodeURIComponent(texto.value))),
        );
        form.append(campo('Mensagem', texto), linha, aviso);
      },
    });
  }
  /** Documentos do fornecedor: f.documentos = [{ id, nome, tipo (MIME), dados (data URL) }]. Só lê e baixa uma cópia; o original não muda. */
  function documentosDoFornecedor(f) {
    return (f && Array.isArray(f.documentos) ? f.documentos : []).filter((x) => x && x.nome && typeof x.dados === 'string' && x.dados.startsWith('data:'));
  }
  function verDocumentos(f, cores) {
    const docs = documentosDoFornecedor(f);
    U.dialogo({
      titulo: 'Documentos do fornecedor', ...cores, largo: true,
      montar: (form) => {
        const previa = el('div', 'compras-largo compras-doc-previa');
        docs.forEach((x) => {
          const linha = el('div', 'compras-form-rodape compras-largo');
          const ver = botao('Visualizar ' + x.nome, () => {
            previa.replaceChildren(/^image\//.test(x.tipo || '') ? Object.assign(el('img'), { src: x.dados, alt: x.nome }) : Object.assign(el('iframe'), { src: x.dados, title: x.nome }));
          }, 'btn secondary');
          const baixar = el('a', 'btn secondary', 'Baixar cópia'); baixar.href = x.dados; baixar.download = x.nome;
          linha.append(ver, baixar); form.append(linha);
        });
        form.append(previa);
      },
    });
  }
  /**
   * Data de aniversário: dia e mês, sem ano, num campo só (pedido do Rodrigo, 17/11/2026; substitui os dois seletores de
   * 16/11). O campo tem a máscara DD/MM para digitar e, ao tocar nele ou no botão do calendário, abre um painel com os
   * meses e os dias (painel cinza, opções brancas, a escolhida na cor do menu): escolhe-se o mês e o dia e o painel fecha.
   * O campo mostra "25/jan". valor() devolve "MM-DD", '' quando nada foi escolhido, ou
   * o formato antigo (AAAA-MM) intacto enquanto a pessoa não mexer; escolha pela metade segue incompleta para a
   * validação recusar. rotulo: o nome do campo (um " *" no fim marca obrigatório).
   */
  const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MESES_CURTOS = D.MESES_ABREVIADOS;
  const DIAS_DO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function seletoresAniversario(valorInicial, { rotulo = 'Aniversário' } = {}) {
    const p = D.aniversarioPartes(valorInicial);
    let dia = p.dia; let mes = p.mes; let mexeu = false;
    const nomeCampo = rotulo.endsWith(' *') ? rotulo.slice(0, -2) : rotulo;
    // O campo mostra o dia e o mês abreviado ("25/jan"); enquanto a pessoa digita os números, mostra os números.
    const escrito = () => (dia && mes && MESES_CURTOS[Number(mes) - 1] ? dia + '/' + MESES_CURTOS[Number(mes) - 1] : dia || mes ? (dia || '') + (mes ? '/' + mes : '') : '');
    const input = entrada('text', dia && mes ? escrito() : '', { inputMode: 'numeric', placeholder: 'DD/MM', maxLength: 6, autocomplete: 'off' });
    input.setAttribute('aria-label', nomeCampo);
    input.dataset.textoLivre = '1'; // "25/jan" não é nome: fica fora das maiúsculas automáticas
    const botaoPainel = el('button', 'shortcut-circle compras-redondo');
    botaoPainel.type = 'button'; botaoPainel.title = 'Escolher o dia e o mês'; botaoPainel.setAttribute('aria-label', nomeCampo + ': escolher o dia e o mês');
    botaoPainel.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>';
    const caixa = el('div', 'compras-aniv-campo'); caixa.append(input, botaoPainel);
    const painel = el('div', 'compras-escolha-painel compras-aniv-painel'); painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', nomeCampo + ': dia e mês');
    const gradeMes = el('div', 'compras-grade-escolha em-4'); const gradeDia = el('div', 'compras-grade-escolha em-7');
    // Ordem do campo: primeiro o dia, depois o mês (pedido do Rodrigo, 17/11/2026).
    painel.append(el('span', 'compras-rotulo', 'Dia'), gradeDia, el('span', 'compras-rotulo', 'Mês'), gradeMes);
    const abrir = U.flutuante(caixa, painel);
    const resumo = el('small', 'profiles-note'); resumo.setAttribute('aria-live', 'polite');
    const no = el('div', 'compras-campo compras-aniv');
    no.append(el('span', 'compras-rotulo', rotulo), caixa, painel, resumo);
    let pelaMetade = false; // digitou só parte de DD/MM
    const valor = () => {
      if (dia && mes) return mes + '-' + dia;
      if (pelaMetade) return '-' + dia;
      if (!dia && !mes) return '';
      if (p.legado && !mexeu) return String(valorInicial);
      return mes + '-' + dia;
    };
    const celula = (texto, marcado, nome, aoTocar) => {
      const b = el('button', 'compras-grade-celula', texto);
      b.type = 'button'; b.setAttribute('aria-pressed', String(marcado)); b.setAttribute('aria-label', nome); b.onclick = aoTocar;
      return b;
    };
    function pintar(escreve = true) {
      if (escreve) input.value = escrito();
      const v = valor();
      resumo.textContent = D.aniversarioRuim(v) || (dia && mes ? Number(dia) + ' de ' + MESES_LONGOS[Number(mes) - 1].toLowerCase() : '');
      gradeMes.replaceChildren(...MESES_CURTOS.map((m, i) => { const n = String(i + 1).padStart(2, '0'); return celula(m, n === mes, MESES_LONGOS[i], () => { mes = n; mexeu = true; pelaMetade = false; pintar(); if (dia && !D.aniversarioRuim(valor())) fechar(); }); }));
      const total = mes ? DIAS_DO_MES[Number(mes) - 1] || 31 : 31;
      gradeDia.replaceChildren(...Array.from({ length: total }, (_, i) => { const n = String(i + 1).padStart(2, '0'); return celula(String(i + 1), n === dia, 'Dia ' + (i + 1), () => { dia = n; mexeu = true; pelaMetade = false; pintar(); if (mes) fechar(); }); }));
    }
    const fechar = () => { abrir(false); input.focus(); input.dispatchEvent(new Event('change', { bubbles: true })); };
    // Máscara DD/MM: só números; a barra entra sozinha depois do dia.
    input.addEventListener('input', () => {
      const d = input.value.split('').filter((c) => c >= '0' && c <= '9').join('').slice(0, 4);
      input.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
      // Com os 4 dígitos, vale; pela metade, fica incompleto (a validação recusa) sem trocar o que a pessoa vê.
      dia = d.length >= 2 ? d.slice(0, 2) : ''; mes = d.length === 4 ? d.slice(2) : '';
      mexeu = true; pelaMetade = d.length > 0 && d.length < 4;
      // Completo e com mês que existe: troca os números do mês pela abreviação.
      pintar(d.length === 4 && Boolean(MESES_CURTOS[Number(mes) - 1]));
    });
    input.addEventListener('click', () => abrir(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); abrir(true); } });
    botaoPainel.addEventListener('click', () => abrir(painel.hidden));
    pintar();
    return { no, valor, input };
  }
  const aplicarMascara = (input, fn) => { input.addEventListener('input', () => { input.value = fn(input.value); }); return input; };
  function interruptor(rotulo, marcado, dica) {
    const l = el('label', 'compras-interruptor');
    const c = entrada('checkbox');
    c.checked = Boolean(marcado);
    l.append(c, el('span', null, rotulo));
    if (dica) l.append(el('small', 'profiles-note', dica));
    l.input = c;
    return l;
  }

  /* =====================================================================
   * Fornecedores — cadastro único (decisão do Rodrigo, 15/11/2026). As linhas DES - Fornecedores
   * (Saídas · Despesas) e MER - Fornecedores (Saídas · Mercadorias) abrem este mesmo cadastro, cada
   * uma na cor e com o Voltar do menu de onde veio. Os dados são os de cicluz-compras-v1.fornecedores.
   * ===================================================================== */
  // Cor das origens: a mesma fonte dos cartões do menu (groupConfig, de groups.js), com o padrão de cada origem.
  const corOrigem = (chave, padrao) => { try { return (typeof groupConfig !== 'undefined' && groupConfig[chave] && groupConfig[chave].color) || padrao; } catch (e) { return padrao; } };
  const corMercadorias = () => corOrigem('mercadorias', U.COR);
  const corDespesas = () => corOrigem('despesas', '#ef4444');
  const ORIGENS = {
    mer: { id: 'compras-fornecedores', titulo: 'MER - Fornecedores', caminho: 'Saídas · Mercadorias / Cadastros Geral / MER - Fornecedores', voltar: () => menuBack(3, 'Cadastros Geral')(), get cor() { return corMercadorias(); }, corTexto: U.COR_TEXTO },
    des: { id: 'despesas-fornecedores', titulo: 'DES - Fornecedores', caminho: 'Saídas · Despesas / Cadastros Geral / DES - Fornecedores', voltar: () => menuBack(2, 'Cadastros Geral')(), get cor() { return corDespesas(); }, corTexto: '#a11c1c' },
  };
  /**
   * Ícones da linha pela categoria, iguais nos dois caminhos de entrada (decisão do Rodrigo, 15/11/2026):
   * o desenho é o próprio ícone da linha do menu (o bonequinho de fornecedor), lido de onde o menu lê (iconeLinha,
   * em index.html), para acompanhar se o ícone do menu for trocado. Produto = ícone de MER - Fornecedores em verde
   * (cor de Mercadorias); Serviço = ícone de DES - Fornecedores em vermelho (cor de Despesas); sem categoria
   * escolhida (nenhuma, ou as duas de um cadastro antigo) = o mesmo ícone em cinza. O nome da categoria também vai escrito na linha.
   */
  function iconeDoMenu(grupo, linha) {
    try {
      const desenho = typeof iconeLinha !== 'undefined' && iconeLinha[grupo] && iconeLinha[grupo][linha];
      if (typeof desenho === 'function') return { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + desenho() + '</svg>' };
    } catch (e) { /* menu ainda não carregado */ }
    return { icone: 'fornecedor' };
  }
  function iconesDaCategoria(f) {
    const cat = D.categoriaFornecedor(f);
    const mer = iconeDoMenu('3:Cadastros Geral', 'MER - Fornecedores');
    const des = iconeDoMenu('2:Cadastros Geral', 'DES - Fornecedores');
    if (cat === 'produto') return [{ ...mer, cor: corMercadorias(), rotulo: 'Produto' }];
    if (cat === 'servico') return [{ ...des, cor: corDespesas(), rotulo: 'Serviço' }];
    return [{ ...mer, cor: 'var(--navigation-ink, #a2a0aa)', rotulo: 'Sem categoria' }];
  }
  /* ---------- Enviar link para cadastro (P-29): a parte visível existe; o envio está desligado ---------- */
  /**
   * ÚNICO ponto para ligar o envio quando a P-29 (parte do servidor) for decidida: recebe o canal, o prazo e a mensagem e deve
   * devolver { url } para abrir (wa.me, mailto:, sms:) com a mensagem e o link do convite. Hoje devolve null, porque
   * o link ainda não tem para onde levar: nada de link falso nem de abrir o WhatsApp com endereço que não existe.
   */
  function conviteCadastro(canal, prazo, mensagem) { // eslint-disable-line no-unused-vars
    return null;
  }
  /** "Enviar" de Fornecedores: o botão comum (U.botaoEnviar) com o Prazo de resposta (padrão 3 dias úteis, ou data e hora). */
  function botaoEnviarConvite() {
    const aviso = el('p', 'profiles-note');
    aviso.setAttribute('role', 'status');
    const prazo = U.prazoResposta();
    // A Mensagem aparece como em Clientes e Patrimônios (18/11/2026, Rodrigo); ela só segue quando o envio for ligado (P-29).
    const mensagem = U.mensagemEnvio();
    return U.botaoEnviar({
      dica: 'Enviar link para cadastro', campos: [...prazo.campos, mensagem.campo], depois: [aviso],
      aoCanal: (id) => {
        const convite = conviteCadastro(id, prazo.ler(), mensagem.texto());
        if (!convite) { aviso.textContent = 'O link de cadastro ainda não está ativo. Falta a liberação da parte do servidor.'; return; }
        window.open(convite.url, '_blank', 'noopener');
      },
    });
  }
  const telasF = {};
  let origemF = 'mer';
  const buscaF = { mer: '', des: '' };
  /**
   * Cor do cadastro (17/11/2026): quem escolhe é o tipo do fornecedor. Produto = verde de Mercadorias; Serviço = vermelho de Despesas;
   * sem tipo escolhido (ou com os dois, de um cadastro antigo), vale a cor da entrada (MER - Fornecedores verde, DES - Fornecedores vermelho).
   * temaForm é o tipo em uso enquanto o formulário está aberto; as janelas de dentro dele (peças, vínculos, confirmações) herdam a mesma cor.
   */
  let temaForm = null;
  const TEMAS = {
    produto: { get cor() { return corMercadorias(); }, corTexto: U.COR_TEXTO },
    servico: { get cor() { return corDespesas(); }, corTexto: '#a11c1c' },
  };
  const coresF = () => { const t = temaForm && TEMAS[temaForm]; return t ? { cor: t.cor, corTexto: t.corTexto } : { cor: ORIGENS[origemF].cor, corTexto: ORIGENS[origemF].corTexto }; };
  function abrirFornecedores(origem = 'mer') {
    origemF = ORIGENS[origem] ? origem : 'mer';
    const o = ORIGENS[origemF];
    if (!telasF[origemF]) {
      const t = U.criarTela({ id: o.id, titulo: o.titulo, caminho: o.caminho, icone: 'fornecedor', voltar: o.voltar, cor: o.cor, corTexto: o.corTexto });
      U.atalho(t, 'Novo fornecedor', 'M12 5v14M5 12h14', () => editarFornecedor(), { criar: true });
      telasF[origemF] = t;
    }
    telasF[origemF].ativar();
    renderFornecedores();
  }
  function renderFornecedores() {
    const tela = telasF[origemF];
    const lista = S.dados.fornecedores
      .filter((f) => U.dobrar([f.nome, f.razaoSocial, f.documento, f.whatsapp, f.contatoNome, f.ramo, D.nomeCategoriasFornecedor(f)].join(' ')).includes(U.dobrar(buscaF[origemF])))
      // Organizada pela categoria (pedido do Rodrigo): Produto, Serviço e, por último, sem categoria escolhida;
      // dentro de cada uma, os ativos antes dos inativos e, entre eles, por nome.
      .sort((a, b) => ordemCategoria(a) - ordemCategoria(b) || (a.situacao === b.situacao ? 0 : a.situacao === 'ativo' ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
    // Busca pela lupa do rodapé (um caminho só para buscar). O cadastro novo é a bolinha "+" do cabeçalho da lista.
    const origem = origemF;
    const busca = U.buscaRodape(tela, 'Buscar fornecedor', (v) => { buscaF[origem] = v; if (origemF === origem && tela.view.classList.contains('show')) renderFornecedores(); });
    const semWhats = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && !D.podeConvidar(f)).length;
    const incompletos = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && pendencias(f).length).length;
    // Mesma linha dos cadastros de grupos: tocar edita; a setinha revela Editar e Excluir.
    // Linha fina, uma por fornecedor, em colunas fixas (grade-fornecedor, em compras.css). Sequência final do Rodrigo:
    // ícone da categoria, Fornecedor (nome fantasia), Categoria, Nome do contato, WhatsApp, Razão social, CNPJ,
    // Ramo, avisos, situação e seta. O ícone e o Fornecedor são fixos (nunca ocultam e ficam parados na rolagem); cada
    // uma das outras colunas tem no título a setinha que a oculta ou mostra (preferência do aparelho); o que não couber
    // rola para o lado dentro da lista.
    const linhas = el('div', 'compras-lista compras-lista-grade');
    U.arrastarParaRolar(linhas);
    // Cabeçalho branco da lista (desenho final do Rodrigo): à esquerda, o botão retangular "Fornecedores" com o "+", que abre
    // o cadastro, e o botão retangular "Enviar" (aviãozinho), que abre o painel do link de cadastro; na outra ponta, a quantidade num círculo e a bolinha "‹ ›" de ocultar ou mostrar todas as colunas.
    const ativos = S.dados.fornecedores.filter((f) => f.situacao === 'ativo').length;
    const ponta = U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' fornecedor ativo' : ' fornecedores ativos'));
    const sec = U.secao('Fornecedores', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Fornecedor', 'Cadastrar fornecedor', () => editarFornecedor()), botaoEnviarConvite(), ...(window.CicluzContratos ? [U.botaoTitulo('Contratos', 'Tipos de contrato (modelos)', () => window.CicluzContratos.abrirModelos({ cores: coresF() }), U.ICONES.contrato || undefined)] : []));
    sec.append(linhas);
    if (!lista.length) linhas.append(U.vazio(buscaF[origemF] ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'));
    if (lista.length) {
      const cabecalho = U.cabecalhoColunas('grade-fornecedor', [
      { chave: 'nome', rotulo: 'Fornecedor' }, { chave: 'categoria', rotulo: 'Categoria', ocultavel: true },
      { chave: 'contato', rotulo: 'Nome do contato', ocultavel: true }, { chave: 'whatsapp', rotulo: 'WhatsApp', ocultavel: true },
      { chave: 'razao', rotulo: 'Razão social', ocultavel: true }, { chave: 'documento', rotulo: 'CNPJ / CPF', ocultavel: true },
      { chave: 'ramo', rotulo: 'Ramo', ocultavel: true }, { chave: 'selos', rotulo: 'Avisos', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
      ], { lista: linhas, preferencia: 'cicluz-fornecedores-colunas' });
      linhas.append(cabecalho);
      ponta.append(cabecalho.botaoGeral);
    }
    lista.forEach((f) => {
      const ativo = f.situacao === 'ativo';
      const categoria = D.nomeCategoriasFornecedor(f);
      const falta = pendencias(f).filter((p) => p !== 'categoria');
      const semDdd = ativo && D.motivoNaoConvidavel(f);
      linhas.append(U.linhaLista({
        icones: iconesDaCategoria(f), grade: 'grade-fornecedor',
        colunas: [
          // nome = nome fantasia: é o nome de uso, o mesmo que cotação e pedido mostram.
          { chave: 'nome', conteudo: f.nome },
          // Sem categoria: o aviso ocupa o lugar do texto da categoria (por isso o ícone está cinza).
          { chave: 'categoria', conteudo: categoria || U.situacao('Completar cadastro', 'atencao') },
          { chave: 'contato', conteudo: f.contatoNome },
          { chave: 'whatsapp', conteudo: f.whatsapp },
          { chave: 'razao', conteudo: f.razaoSocial },
          { chave: 'documento', conteudo: f.documento },
          { chave: 'ramo', conteudo: f.ramo },
          { chave: 'selos', conteudo: [
            ativo && categoria && falta.length ? U.situacao('Completar cadastro', 'atencao') : null,
            semDdd ? U.situacao(f.whatsapp ? 'WhatsApp sem DDD' : 'Sem WhatsApp', 'atencao') : null,
          ] },
        ],
        estado: ativo ? 'Ativo' : 'Inativo',
        acoes: { rotulo: f.nome, lista: linhas, aoEditar: () => editarFornecedor(f), aoExcluir: () => excluirFornecedor(f) },
      }));
    });
    tela.body.replaceChildren(
      busca,
      U.nota(lista.length + ' fornecedor(es), os mesmos em Despesas e em Mercadorias. ' + (incompletos ? incompletos + ' ativo(s) com cadastro a completar (toque para editar). ' : '') + (semWhats ? semWhats + ' ativo(s) sem WhatsApp válido não podem receber cotação. ' : '') + 'Fornecedor já usado em cotação, pedido, compra ou peça não é excluído: a lixeira inativa.'),
      sec,
    );
  }
  const contar = D.contarVinculos;
  /** Onde o fornecedor é usado: Compras (catálogo, histórico, cotações, pedidos), peças do patrimônio e compras de uniformes. */
  function usosDoFornecedor(id) {
    const usos = [];
    const compras = D.vinculosComProdutos(S.dados, id);
    if (compras) usos.push(compras + ' registro(s) do Compras (catálogo, histórico, cotação ou pedido)');
    const bens = window.CicluzProducaoDados ? window.CicluzProducaoDados.patrimonio.dados.bens : [];
    const pecas = contar(bens, 'fornecedorId', id);
    if (pecas) usos.push(pecas + ' peça(s) do patrimônio');
    let uniformes = 0;
    try { uniformes = contar(JSON.parse(localStorage.getItem('cicluz-uniformes-v1') || 'null'), 'supplierId', id); } catch (e) { /* sem compras de uniformes */ }
    if (uniformes) usos.push(uniformes + ' compra(s) de uniformes');
    return usos;
  }
  /**
   * Lixeira da linha. Fornecedor com vínculo não é excluído (regra do Compras): a lixeira oferece inativar, e se já
   * está inativo só explica. Sem vínculo nenhum, exclui depois de confirmar.
   */
  function excluirFornecedor(f) {
    const usos = usosDoFornecedor(f.id);
    if (!usos.length) {
      return U.confirmar('Excluir fornecedor', 'Excluir "' + f.nome + '"? Ele não tem cotação, pedido, compra nem peça vinculada. Não dá para desfazer.', 'Excluir', () => {
        if (usosDoFornecedor(f.id).length) return 'Este fornecedor passou a ter vínculos. Inative em vez de excluir.';
        if (!S.transacao((d) => { d.fornecedores = d.fornecedores.filter((x) => x.id !== f.id); })) return 'Não foi possível salvar neste navegador.';
        U.avisar('Fornecedor excluído.');
        renderFornecedores();
      }, coresF());
    }
    const onde = 'Usado em: ' + usos.join('; ') + '.';
    if (f.situacao !== 'ativo') {
      return U.dialogo({ titulo: 'Fornecedor não pode ser excluído', ...coresF(), montar: (form) => { form.append(el('p', null, '"' + f.nome + '" já está inativo e não pode ser excluído, para o histórico não ficar sem fornecedor. ' + onde)); } });
    }
    U.confirmar('Inativar fornecedor', '"' + f.nome + '" não pode ser excluído, para o histórico não ficar sem fornecedor. ' + onde + ' Inativar? Ele deixa de aparecer para novas cotações e peças.', 'Inativar', () => {
      if (!S.transacao((d) => { d.fornecedores.find((x) => x.id === f.id).situacao = 'inativo'; })) return 'Não foi possível salvar neste navegador.';
      U.avisar('Fornecedor inativado.');
      renderFornecedores();
    }, coresF());
  }
  /** Posição do fornecedor na lista pela categoria: Produto, Serviço, sem categoria escolhida. */
  function ordemCategoria(f) {
    const cat = D.categoriaFornecedor(f);
    return cat === 'produto' ? 0 : cat === 'servico' ? 1 : 2;
  }
  /** O que falta no cadastro para os obrigatórios de 15/11/2026 (só para avisar na lista; quem já existia continua valendo). */
  function pendencias(f) {
    const p = [];
    if (!D.nomeCategoriasFornecedor(f)) p.push('categoria');
    // Cadastro antigo com CPF (de quando existia pessoa física) também cai aqui: fica em "Completar cadastro" até receber o CNPJ.
    if (f.tipoPessoa === 'fisica' ? !R().cpfValid(f.documento) : !R().cnpjValid(f.documento)) p.push(f.tipoPessoa === 'fisica' ? 'CPF' : 'CNPJ');
    if (!D.digitos(f.whatsapp)) p.push('WhatsApp');
    return p;
  }
  const R = () => window.CicluzFieldRules;

  /**
   * Cadastro em 4 etapas, com a barra de etapas única do sistema (CicluzStepper, a mesma do Cadastro Completo):
   * 1) Dados da empresa (CNPJ primeiro, que busca razão social, nome fantasia e endereço; endereço começando pelo CEP),
   * 2) Dados do vendedor (ou do prestador, pela categoria), 3) Dados do financeiro, 4) Dados do representante.
   * O nome da etapa é o mesmo na barra, no título do quadro e nos rótulos dos campos.
   * No cadastro novo, Avançar confere a etapa antes de seguir; na edição, toca-se direto em qualquer etapa. O ✓ do
   * rodapé (e o Salvar da última etapa) confere tudo e, se faltar algo, leva à etapa onde está o problema.
   */
  function editarFornecedor(f) {
    U.dialogo({
      titulo: f ? 'Editar fornecedor' : 'Cadastro fornecedor', ...(() => { temaForm = Array.isArray(f && f.categorias) && f.categorias.length === 1 ? f.categorias[0] : null; return coresF(); })(), largo: true, classe: 'compras-form-padrao',
      aoFechar: () => { temaForm = null; },
      montar: (form, dlg) => {
        const texto = (v, extra = {}) => entrada('text', v || '', { maxLength: 120, ...extra });
        const email = (v) => { const i = entrada('email', v || '', { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); i.dataset.textoLivre = '1'; return i; };
        const telefone = (v) => aplicarMascara(entrada('tel', v || '', { inputMode: 'numeric', placeholder: '(00) 00000-0000' }), mascaraTelefone);
        // display, não hidden: o .compras-campo e o fieldset definem display e venceriam o atributo.
        const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };

        /* ----- Etapa 1: dados da empresa ----- */
        const s1 = el('fieldset', 'compras-fieldset');
        s1.append(el('legend', null, 'Dados da empresa'));
        // Mesmo quadro branco da "Situação do fornecedor" (mesmas classes), com os cartões dentro (pedido do Rodrigo).
        const catBox = el('div', 'account-status compras-situacao-quadro');
        // Categoria em cartões (desenho escolhido pelo Rodrigo): o mesmo ícone e a mesma cor da lista, por categoria
        // (Produto = MER - Fornecedores em verde; Serviço = DES - Fornecedores em vermelho), seja qual for a tela de entrada.
        const desenhoCat = {
          produto: { ...iconeDoMenu('3:Cadastros Geral', 'MER - Fornecedores'), cor: corMercadorias(), detalhe: 'Vende mercadorias' },
          servico: { ...iconeDoMenu('2:Cadastros Geral', 'DES - Fornecedores'), cor: corDespesas(), detalhe: 'Presta serviços' },
        };
        const catOpcoes = U.cartoesEscolha({
          rotulo: 'Categoria', multiplo: false,
          opcoes: D.CATEGORIAS_FORNECEDOR.map(([id, nomeCat]) => ({ id, titulo: nomeCat, ...desenhoCat[id], marcado: Array.isArray(f?.categorias) && f.categorias.includes(id) })),
          aoMudar: () => { barra.update(etapas(), atual); pintarVendedor(); aplicarTema(); },
        });
        catBox.append(el('span', null, 'Categoria do fornecedor *'), catOpcoes, el('small', 'profiles-note', 'Toque em uma: Produto ou Serviço.'));
        // Fornecedor é sempre por CNPJ. Razão social e Nome fantasia; o campo salvo de uso é sempre "nome" (o que
        // cotação, pedido e recebimento mostram); a razão social é um campo a mais.
        const razao = texto(f?.razaoSocial, { maxLength: 160 });
        const razaoCampo = campo('Razão social', razao);
        const nome = texto(f?.nome);
        const nomeCampo = campo('Nome fantasia', nome);
        // Cadastro antigo com CPF: o CNPJ abre vazio e um aviso mostra o documento que está gravado.
        const docAntigo = D.documentoAntigoFornecedor(f);
        // Pessoa física ou jurídica: cadastro novo começa em PJ; o antigo segue o que foi gravado (CPF de 11 dígitos é PF).
        const tipoInicial = f && (f.tipoPessoa === 'fisica' || D.digitos(f.documento).length === 11) ? 'fisica' : 'juridica';
        const cnpj = aplicarMascara(entrada('text', docAntigo || tipoInicial === 'fisica' ? '' : f?.documento || '', { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }), R().cnpjMask);
        const cnpjCampo = campo('CNPJ *', cnpj);
        const avisoAntigo = el('p', 'profiles-note compras-largo', docAntigo
          ? 'Este cadastro é antigo e tem outro documento gravado: ' + (D.digitos(docAntigo).length === 11 ? 'CPF ' : '') + docAntigo + '. Fornecedor agora é só por CNPJ: informe o CNPJ para salvar. O documento antigo continua guardado.' : '');
        const regime = seletor(D.REGIMES_TRIBUTARIOS, f?.regimeTributario || '', 'Selecione');
        const regimeCampo = campo('Regime tributário', regime);
        const cpf = aplicarMascara(entrada('text', tipoInicial === 'fisica' ? f?.documento || '' : '', { inputMode: 'numeric', placeholder: '000.000.000-00', maxLength: 14 }), R().cpfMask);
        const cpfCampo = campo('CPF *', cpf);
        const tipoBox = el('div', 'account-status compras-situacao-quadro');
        const tipoOpcoes = U.cartoesEscolha({
          // Mesmo desenho do "Tipo de cliente" (18/11/2026, Rodrigo): "PF - Pessoa Física" e "PJ - Pessoa Jurídica", sem linha de detalhe.
          rotulo: 'Tipo de fornecedor', multiplo: false,
          opcoes: [
            { id: 'fisica', titulo: 'PF - Pessoa Física', icone: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>', cor: 'var(--menu-accent)', marcado: tipoInicial === 'fisica' },
            { id: 'juridica', titulo: 'PJ - Pessoa Jurídica', icone: U.ICONES.fornecedor, cor: 'var(--menu-accent)', marcado: tipoInicial === 'juridica' },
          ],
          aoMudar: () => pintarTipo(),
        });
        tipoBox.append(el('span', null, 'Tipo de fornecedor *'), tipoOpcoes);
        const ehPF = () => tipoOpcoes.marcados()[0] === 'fisica';
        const situacao = U.quadroSituacao('Situação do fornecedor', f ? f.situacao === 'ativo' : true, { dica: 'Fornecedor inativo não aparece no seletor de cotação.' });
        // Ordem do Rodrigo: categoria, CNPJ (que puxa os dados), razão social, nome fantasia, regime tributário; depois o endereço; por último o ramo.
        const avisoCnpj = el('p', 'profiles-note compras-largo');
        avisoCnpj.setAttribute('role', 'status');
        // Ordem do Rodrigo: a Situação do fornecedor vem logo depois da Categoria.
        s1.append(catBox, tipoBox, situacao, cnpjCampo, cpfCampo, ...(docAntigo ? [avisoAntigo] : []), avisoCnpj, razaoCampo, nomeCampo, regimeCampo);

        /* Endereço: CEP primeiro (puxa rua, bairro, cidade e UF); número e complemento são digitados. */
        const sEnd = el('fieldset', 'compras-fieldset');
        sEnd.append(el('legend', null, 'Endereço'));
        // "Preencher endereço" (18/11/2026, Rodrigo), igual ao cadastro de cliente: na pessoa jurídica o endereço é opcional, então o
        // quadro abre só com a pergunta e mostra os campos quando ela é ligada (já vem ligada se houver endereço gravado). Na pessoa
        // física o endereço completo é obrigatório (decisão do Rodrigo), então a pergunta não aparece e os campos ficam sempre à vista.
        const endSw = U.quadroSituacao('Preencher endereço', Object.values(f?.endereco || {}).some((x) => String(x || '').trim()), { textos: ['Sim', 'Não'], dica: 'Endereço é opcional neste cadastro.', aoMudar: () => pintarEndereco() });
        endSw.classList.add('compras-largo'); endSw.querySelector('.account-status-switch').setAttribute('aria-label', 'Preencher endereço');
        sEnd.append(endSw);
        const comEndereco = () => ehPF() || endSw.ativo;
        function pintarEndereco() { mostrar(endSw, !ehPF()); sEnd.classList.toggle('compras-so-pergunta', !comEndereco()); }
        const C = window.CicluzConsultas;
        const cep = aplicarMascara(entrada('text', f?.endereco?.cep || '', { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9 }), C.cepMask);
        const rua = texto(f?.endereco?.logradouro, { maxLength: 160 });
        const numero = texto(f?.endereco?.numero, { maxLength: 20 });
        const complemento = texto(f?.endereco?.complemento, { maxLength: 80 });
        const bairro = texto(f?.endereco?.bairro, { maxLength: 80 });
        const cidade = texto(f?.endereco?.cidade, { maxLength: 80 });
        const uf = seletor(C.UFS, f?.endereco?.uf || '', 'UF');
        const avisoCep = el('p', 'profiles-note compras-largo');
        avisoCep.setAttribute('role', 'status');
        sEnd.append(campo('CEP', cep), campo('Rua / logradouro', rua), campo('Número', numero), campo('Complemento', complemento), campo('Bairro', bairro), campo('Cidade', cidade), campo('UF', uf), avisoCep);

        const etapa1 = el('div', 'compras-etapa');
        etapa1.append(s1, sEnd);
        // Pessoa física: CPF, nome completo e endereço completo; razão social, CNPJ e regime tributário saem da vista (o que foi digitado fica).
        let aoMudarTipo = () => {};
        function pintarTipo() {
          const pf = ehPF();
          [cnpjCampo, razaoCampo, regimeCampo, avisoCnpj, ...(docAntigo ? [avisoAntigo] : [])].forEach((n) => mostrar(n, !pf));
          mostrar(cpfCampo, pf);
          const rot = pf ? 'Nome completo' : 'Nome fantasia';
          nomeCampo.querySelector('.compras-rotulo').textContent = rot; nome.setAttribute('aria-label', rot);
          // Como no cliente: na pessoa física o Nome completo vem antes do CPF; o endereço chama-se só "Endereço".
          s1.querySelector('legend').textContent = pf ? 'Dados do vendedor' : 'Dados da empresa'; // o nome certo (vendedor ou prestador) vem de pintarVendedor, pela categoria
          if (pf) cpfCampo.before(nomeCampo); else regimeCampo.before(nomeCampo);
          nome.placeholder = pf ? 'Ex: Nome e sobrenome...' : 'Ex: Nome da empresa...';
          pintarEndereco();
          aoMudarTipo();
        }
        pintarTipo();

        /* Buscas (consultas-publicas.js): na primeira consulta só preenchem o que está livre; com um CEP ou CNPJ DIFERENTE do
           que estava no campo, trocam os dados antigos pelos novos (regra do Rodrigo, 17/11/2026). Se o serviço falhar, avisam discretamente
           e o cadastro segue à mão. Cada número é consultado uma vez. Um campo é "livre" para a consulta quando está
           vazio ou quando ainda tem exatamente o valor que uma consulta anterior pôs (a pessoa não mexeu): assim, ao
           trocar o CEP ou o CNPJ, o resultado novo substitui o da consulta anterior em bloco (não sobra a UF antiga). */
        const daConsulta = new Map();
        const livre = (c) => !c.value.trim() || daConsulta.get(c) === c.value;
        const completar = (pares) => {
          const feitos = []; const limpos = [];
          pares.forEach(([campoAlvo, valor, nomeCampoAlvo]) => {
            if (!livre(campoAlvo)) return;
            const antes = campoAlvo.value;
            campoAlvo.value = valor || '';
            if (campoAlvo.value) daConsulta.set(campoAlvo, campoAlvo.value); else daConsulta.delete(campoAlvo);
            if (campoAlvo.value !== antes) (campoAlvo.value ? feitos : limpos).push(nomeCampoAlvo);
          });
          return { feitos, limpos };
        };
        const resumo = (r) => (r.limpos.length ? ' Esvaziado, por ser da consulta anterior: ' + r.limpos.join(', ') + '.' : '');
        const FALHA = { 'nao-encontrado': 'não encontrado', indisponivel: 'consulta indisponível agora' };
        let cepConsultado = D.digitos(cep.value);
        async function buscarCep(forcar) {
          const n = D.digitos(cep.value);
          if (n.length !== 8 || (n === cepConsultado && forcar !== true)) return;
          // CEP diferente do que estava (ou Enter no campo): o endereço novo substitui o antigo, mesmo o que veio gravado ou foi digitado.
          if (cepConsultado || forcar === true) [rua, bairro, cidade, uf].forEach((c) => daConsulta.set(c, c.value));
          cepConsultado = n;
          avisoCep.textContent = 'Buscando o endereço do CEP…';
          const r = await C.cep(n);
          if (D.digitos(cep.value) !== n) return;
          if (r.erro) { avisoCep.textContent = 'CEP ' + FALHA[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha o endereço à mão.'; return; }
          const e = r.dados;
          // Rua, bairro, cidade e UF vão juntos; número e complemento não vêm do CEP e só são esvaziados se eram da consulta anterior.
          const r2 = completar([[rua, e.logradouro, 'rua'], [bairro, e.bairro, 'bairro'], [cidade, e.cidade, 'cidade'], [uf, e.uf, 'UF'], [numero, '', 'número'], [complemento, '', 'complemento']]);
          avisoCep.textContent = (r2.feitos.length ? 'Preenchido pelo CEP: ' + r2.feitos.join(', ') + '. Confira e informe o número.' : 'Endereço do CEP conferido; nada foi trocado.') + resumo(r2);
        }
        // Enter no campo busca na hora e troca os dados (pedido do Rodrigo, 17/11/2026), sem salvar o formulário.
        const aoEnter = (buscar) => (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); buscar(true); } };
        cep.addEventListener('input', () => buscarCep(false)); cep.addEventListener('keydown', aoEnter(buscarCep));
        let cnpjConsultado = D.digitos(cnpj.value);
        async function buscarCnpj(forcar) {
          const n = D.digitos(cnpj.value);
          if (n.length !== 14 || (n === cnpjConsultado && forcar !== true) || !R().cnpjValid(n)) return;
          // CNPJ diferente do que estava (ou Enter no campo) traz os dados da empresa e substitui os antigos.
          if (cnpjConsultado || forcar === true) [razao, nome, cep, rua, numero, complemento, bairro, cidade, uf].forEach((c) => daConsulta.set(c, c.value));
          cnpjConsultado = n;
          avisoCnpj.textContent = 'Buscando os dados da empresa pelo CNPJ…';
          const r = await C.cnpj(n);
          if (D.digitos(cnpj.value) !== n) return;
          if (r.erro) { avisoCnpj.textContent = 'CNPJ ' + FALHA[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha os dados à mão.'; return; }
          const x = r.dados;
          const e = x.endereco;
          const r2 = completar([[razao, x.razaoSocial, 'razão social'], [nome, x.nomeFantasia, 'nome fantasia'], [cep, e.cep, 'CEP'], [rua, e.logradouro, 'rua'],
            [numero, e.numero, 'número'], [complemento, e.complemento, 'complemento'], [bairro, e.bairro, 'bairro'], [cidade, e.cidade, 'cidade'], [uf, e.uf, 'UF']]);
          cepConsultado = D.digitos(cep.value);
          // A consulta do CNPJ trouxe endereço: o quadro abre sozinho, para a pessoa ver e conferir o que veio.
          if (!endSw.ativo && [cep, rua, bairro, cidade].some((i) => i.value.trim())) { endSw.ativo = true; pintarEndereco(); }
          avisoCnpj.textContent = (r2.feitos.length ? 'Preenchido pela consulta do CNPJ: ' + r2.feitos.join(', ') + '. Confira antes de salvar.' : 'Dados do CNPJ conferidos; nada foi trocado.') + resumo(r2);
        }
        cnpj.addEventListener('input', () => buscarCnpj(false)); cnpj.addEventListener('keydown', aoEnter(buscarCnpj));

        /* ----- Etapa 2: vendedor ou prestador de serviço (é o contato do fornecedor; o WhatsApp dele recebe a cotação) ----- */
        const s2 = el('fieldset', 'compras-fieldset');
        const vNome = texto(f?.contatoNome);
        // Aniversário: dia e mês, sem ano (campo DD/MM com painel). A data completa antiga fica no dado.
        const vAniv = seletoresAniversario(D.aniversarioVendedor(f));
        const whats = telefone(f?.whatsapp);
        const mail = email(f?.email);
        // O CPF do vendedor não é mais pedido (decisão do Rodrigo): o campo saiu; valor já gravado fica como está, sem uso.
        const tituloS2 = el('legend');
        const camposS2 = [[campo('Nome', vNome), vNome, 'Nome do ', ''], [campo('WhatsApp', whats), whats, 'WhatsApp do ', ' *'], [campo('E-mail', mail), mail, 'E-mail do ', '']];

        /* Funções do prestador: seleção múltipla sobre o cadastro d.funcoesPrestador (vínculo por id). "Acrescentar
           opção" abre a janelinha flutuante (a mesma do Prazo de resposta do Enviar) com o nome e Salvar; a função
           nova entra na lista de todos os fornecedores. */
        const quadrosFuncoes = [];
        /**
         * Gerenciar funções (18/11/2026, Rodrigo): a lista das funções do cadastro, no padrão das outras listas — tocar na linha
         * edita o nome; a seta revela Editar e Excluir. Função em uso por algum fornecedor gravado não é excluída (o prestador
         * ficaria sem ela): passa a inativa e sai das opções. Sem uso, é excluída depois da confirmação.
         */
        function gerenciarFuncoes() {
          const emUsoPor = (id) => S.dados.fornecedores.filter((x) => (x.prestadores || []).some((p) => (p.funcoes || []).includes(id))).length;
          const repintar = () => quadrosFuncoes.forEach((q) => q.desenhar());
          U.dialogo({
            titulo: 'Funções do prestador', ...coresF(), quadro: 'Funções',
            montar: (f2) => {
              const linhas = el('div', 'compras-lista compras-largo');
              const desenhaLista = () => {
                const lista = S.dados.funcoesPrestador.slice().sort((a, b2) => (a.ativa === b2.ativa ? a.nome.localeCompare(b2.nome, 'pt-BR') : a.ativa === false ? 1 : -1));
                linhas.replaceChildren(...(lista.length ? lista.map((x) => {
                  const uso = emUsoPor(x.id);
                  const linha = U.linhaLista({
                    icone: 'lista', titulo: x.nome, detalhe: uso ? 'Em uso por ' + uso + (uso === 1 ? ' fornecedor' : ' fornecedores') : 'Sem uso', estado: x.ativa === false ? 'Inativa' : 'Ativa',
                    acoes: { rotulo: x.nome, lista: linhas, aoEditar: () => editarFuncao(x), aoExcluir: () => excluirFuncao(x) },
                  });
                  if (x.ativa === false) linha.classList.add('inativo');
                  return linha;
                }) : [U.vazio('Nenhuma função cadastrada.', 'Use "Acrescentar opção" para criar.')]));
              };
              function editarFuncao(x) {
                U.dialogo({
                  titulo: 'Editar função', ...coresF(), quadro: 'Dados da função',
                  montar: (f3) => {
                    const nomeF = texto(x.nome, { maxLength: 60 });
                    const sit = U.quadroSituacao('Situação da função', x.ativa !== false, { feminino: true, dica: 'Função inativa sai das opções. Nada é apagado.' });
                    sit.classList.add('compras-largo');
                    f3.append(sit, campo('Nome da função *', nomeF));
                    return { nomeF, sit };
                  },
                  salvar: (c3) => {
                    const falta = D.validarFuncaoPrestador(c3.nomeF.value, S.dados.funcoesPrestador.filter((o) => o.id !== x.id));
                    if (falta) return falta;
                    if (!S.transacao((d) => { Object.assign(d.funcoesPrestador.find((o) => o.id === x.id), { nome: c3.nomeF.value.trim(), ativa: c3.sit.ativo }); })) return 'Não foi possível salvar neste navegador.';
                    U.avisar('Função salva.'); desenhaLista(); repintar();
                  },
                });
              }
              function excluirFuncao(x) {
                const uso = emUsoPor(x.id);
                if (uso) {
                  U.confirmar('Função em uso', '"' + x.nome + '" está em uso por ' + uso + (uso === 1 ? ' fornecedor' : ' fornecedores') + ' e não pode ser excluída. Deixar inativa? Ela sai das opções, e quem já usa continua com ela.', 'Deixar inativa', () => {
                    if (!S.transacao((d) => { d.funcoesPrestador.find((o) => o.id === x.id).ativa = false; })) return 'Não foi possível salvar neste navegador.';
                    U.avisar('Função inativa.'); desenhaLista(); repintar();
                  }, coresF());
                  return;
                }
                U.confirmar('Excluir função?', '"' + x.nome + '" não está em uso e será excluída. Não dá para desfazer.', 'Excluir', () => {
                  if (!S.transacao((d) => { d.funcoesPrestador = d.funcoesPrestador.filter((o) => o.id !== x.id); })) return 'Não foi possível excluir neste navegador.';
                  quadrosFuncoes.forEach((q) => q.tirar(x.id)); // se estava marcada neste cadastro aberto, sai da seleção
                  U.avisar('Função excluída.'); desenhaLista(); repintar();
                }, coresF());
              }
              f2.append(U.nota('Tocar na linha edita o nome; a seta à direita mostra Editar e Excluir.'), linhas);
              desenhaLista();
            },
          });
        }
        function quadroFuncoes(marcadasAntes, numero) {
          const escolhidas = new Set(marcadasAntes || []);
          const box = el('div', 'compras-campo compras-largo');
          box.setAttribute('role', 'group');
          box.setAttribute('aria-label', 'Funções do prestador ' + numero);
          const chips = el('div', 'compras-chips');
          const desenhar = () => chips.replaceChildren(...S.dados.funcoesPrestador.filter((x) => x.ativa !== false || escolhidas.has(x.id))
            .sort((a, b2) => a.nome.localeCompare(b2.nome, 'pt-BR')).map((x) => {
              const c = botao(x.nome, () => { if (escolhidas.has(x.id)) escolhidas.delete(x.id); else escolhidas.add(x.id); desenhar(); }, 'compras-chip' + (escolhidas.has(x.id) ? ' ativo' : ''));
              c.setAttribute('aria-pressed', String(escolhidas.has(x.id)));
              return c;
            }));
          // Janelinha de acrescentar: só o nome e Salvar. Enter salva aqui (não envia o cadastro de trás).
          const nomeNovo = texto('', { maxLength: 60 });
          const erroNovo = el('p', 'profiles-error');
          erroNovo.setAttribute('role', 'alert');
          const painel = el('div', 'compras-enviar-painel');
          painel.setAttribute('role', 'dialog');
          painel.setAttribute('aria-label', 'Acrescentar função');
          const caixa = el('div', 'compras-enviar-prazo');
          const salvarNovo = () => {
            const falta = D.validarFuncaoPrestador(nomeNovo.value, S.dados.funcoesPrestador);
            const igual = D.funcaoPrestadorIgual(S.dados.funcoesPrestador, nomeNovo.value);
            // Nome que já existe não duplica: a função existente fica marcada.
            if (igual && String(nomeNovo.value).trim()) { escolhidas.add(igual.id); if (igual.ativa === false) S.transacao((d) => { d.funcoesPrestador.find((x) => x.id === igual.id).ativa = true; }); }
            else if (falta) { erroNovo.textContent = falta; return; }
            else {
              const id = S.novoId('fp');
              if (!S.transacao((d) => { d.funcoesPrestador.push({ id, nome: nomeNovo.value.trim(), ativa: true }); })) { erroNovo.textContent = 'Não foi possível salvar neste navegador.'; return; }
              escolhidas.add(id);
            }
            nomeNovo.value = ''; erroNovo.textContent = '';
            quadrosFuncoes.forEach((q) => q.desenhar());
            abrirNovo(false); mais.focus();
          };
          nomeNovo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvarNovo(); } });
          caixa.append(campo('Nova função', nomeNovo), erroNovo, botao('Salvar', salvarNovo, 'btn'));
          painel.append(caixa);
          const mais = U.botaoTitulo('Acrescentar opção', 'Acrescentar função', () => abrirNovo(painel.hidden)); // botão retangular padrão, como o "Adicionar prestador"
          const abrirNovo = U.flutuante(mais, painel, { foco: nomeNovo });
          const linha = el('div', 'compras-form-rodape');
          linha.append(mais, U.botaoTitulo('Gerenciar funções', 'Editar ou excluir funções', () => gerenciarFuncoes(), U.ICONES.lista));
          box.append(el('span', 'compras-rotulo', 'Funções (pode marcar várias)'), chips, linha, painel);
          desenhar();
          const q = { no: box, desenhar, valores: () => [...escolhidas], tirar: (id) => { escolhidas.delete(id); } };
          quadrosFuncoes.push(q);
          return q;
        }
        const funcoes1 = quadroFuncoes(f?.prestadores?.[0]?.funcoes, 1);
        // Pessoa física (18/11/2026, Rodrigo): a própria pessoa é o vendedor ou prestador, e a etapa "Dados do vendedor" não existe para
        // ela. O nome do contato acompanha sempre o Nome completo (o campo "Nome do vendedor" fica fora da tela, só espelhando).
        const sincNomePF = () => { if (ehPF()) vNome.value = nome.value.trim(); };
        nome.addEventListener('input', sincNomePF);
        // Pessoa física no padrão do cliente (18/11/2026, Rodrigo): WhatsApp, e-mail e data de aniversário sobem para o quadro
        // "Dados pessoais" da 1ª etapa. São os MESMOS campos (e o mesmo dado: whatsapp, email, vendedorAniversario) da 2ª etapa da
        // pessoa jurídica; só mudam de lugar, então nada do que foi digitado se perde ao trocar o tipo.
        function moverContatoPF() {
          const [, zap, correio] = camposS2.map((x) => x[0]);
          // Pessoa física, na ordem do cliente pessoa física: Nome completo, WhatsApp, E-mail, Data de aniversário; depois o CPF.
          if (ehPF()) s1.append(zap, correio, vAniv.no, cpfCampo, funcoes1.no);
          else { camposS2[0][0].after(zap, vAniv.no, correio); s2.append(funcoes1.no); }
          // Categoria Serviço: as funções e os outros prestadores acompanham a etapa da pessoa.
          (ehPF() ? etapa1 : etapa2).append(listaExtras, adicionarLinha);
          const rAniv = vAniv.no.querySelector('.compras-rotulo'); if (rAniv) rAniv.textContent = ehPF() ? 'Data de aniversário' : 'Aniversário';
        }
        aoMudarTipo = () => {
          sincNomePF(); moverContatoPF(); pintarVendedor();
          // Os quadros do financeiro e do responsável legal levam o nome da etapa (sem "da empresa" na pessoa física).
          const nomes = D.etapasFornecedor(marcadas(), ehPF() ? 'fisica' : 'juridica'); const k = ehPF() ? 1 : 2;
          fin.no.querySelector('legend').textContent = nomes[k]; rep.no.querySelector('legend').textContent = nomes[k + 1];
          if (barra) { atual = 0; barra.update(etapas(), 0); }
        };
        s2.append(tituloS2, camposS2[0][0], camposS2[1][0], vAniv.no, camposS2[2][0], funcoes1.no);

        /* Prestadores 2, 3…: só na categoria Serviço. Cada quadro pode ser removido. */
        const idPrestador1 = f?.prestadores?.[0]?.id || S.novoId('pr');
        const extras = [];
        const listaExtras = el('div', 'compras-etapa');
        const numerar = () => extras.forEach((x, i) => { x.titulo.textContent = 'Prestador ' + (i + 2); });
        function quadroPrestador(p) {
          const q = el('fieldset', 'compras-fieldset');
          const x = {
            id: p?.id || S.novoId('pr'), no: q, titulo: el('legend'), nome: texto(p?.nome), whatsapp: telefone(p?.whatsapp), email: email(p?.email),
            aniversario: seletoresAniversario(p?.aniversario || ''),
          };
          x.funcoes = quadroFuncoes(p?.funcoes, extras.length + 2);
          const remover = botao('Remover prestador', () => {
            extras.splice(extras.indexOf(x), 1); quadrosFuncoes.splice(quadrosFuncoes.indexOf(x.funcoes), 1); q.remove(); numerar();
          }, 'btn secondary');
          const rod = el('div', 'compras-form-rodape compras-largo');
          rod.append(remover);
          q.append(x.titulo, campo('Nome do prestador *', x.nome), campo('WhatsApp do prestador', x.whatsapp), x.aniversario.no, campo('E-mail do prestador', x.email), x.funcoes.no, rod);
          extras.push(x); listaExtras.append(q); numerar();
          return x;
        }
        (f?.prestadores || []).slice(1).forEach(quadroPrestador);
        const adicionar = U.botaoTitulo('Adicionar prestador', 'Adicionar prestador', () => quadroPrestador().nome.focus());
        const adicionarLinha = el('div', 'compras-form-rodape');
        adicionarLinha.append(adicionar);
        const etapa2 = el('div', 'compras-etapa');
        etapa2.append(s2, listaExtras, adicionarLinha);
        const ehServico = () => { const c = marcadas(); return c.length === 1 && c[0] === 'servico'; };
        // Título e rótulos acompanham a categoria: Produto = "Dados do vendedor"; Serviço = "Prestador 1", com as
        // funções e os demais prestadores (que somem, sem perder o que foi digitado, se a categoria voltar a Produto).
        const pintarVendedor = () => {
          const quem = D.quemVendeFornecedor(marcadas());
          const servico = ehServico();
          tituloS2.textContent = servico ? 'Prestador 1' : 'Dados do vendedor';
          // Pessoa física: o primeiro quadro leva o nome da etapa ("Dados do prestador de serviço" ou "Dados do vendedor"), como o Rodrigo pediu.
          s1.querySelector('legend').textContent = ehPF() ? D.etapasFornecedor(marcadas(), 'fisica')[0] : 'Dados da empresa';
          camposS2.forEach(([no, input, antes, depois], k) => {
            // Na pessoa física o WhatsApp e o e-mail estão no primeiro quadro e são da própria pessoa: rótulo sem "do vendedor".
            const rotulo = ehPF() && k > 0 ? antes.replace(/ do $/, '') + depois : antes + quem + depois;
            no.querySelector('.compras-rotulo').textContent = rotulo;
            input.setAttribute('aria-label', rotulo);
          });
          [funcoes1.no, listaExtras, adicionarLinha].forEach((no) => mostrar(no, servico));
        };

        /* ----- Etapas 3 e 4: contato com a opção "O mesmo da etapa anterior" em primeiro lugar. Marcada, os campos
           continuam à vista, preenchidos com a etapa anterior e só para leitura; a cópia acompanha a etapa anterior
           enquanto a opção estiver marcada. Desmarcada, o que foi copiado fica e volta a ser editável. ----- */
        function etapaContato(dados, sufixo, anterior, titulo) {
          const s = el('fieldset', 'compras-fieldset');
          s.append(el('legend', null, titulo || 'Dados do ' + sufixo));
          // Mesmo quadro da "Situação do fornecedor" (16/11/2026): interruptor com Sim / Não ao lado.
          const mesmo = U.quadroSituacao('O mesmo da etapa anterior', Boolean(dados?.mesmo), { textos: ['Sim', 'Não'], dica: 'Preenche o nome, o WhatsApp e o e-mail com os da etapa anterior.', aoMudar: () => pintar() });
          mesmo.classList.add('compras-largo');
          mesmo.querySelector('.account-status-switch').setAttribute('aria-label', 'O mesmo da etapa anterior (' + sufixo + ')');
          const n = texto(dados?.nome);
          const w = telefone(dados?.whatsapp);
          const m = email(dados?.email);
          const campos = [campo('Nome do ' + sufixo, n), campo('WhatsApp do ' + sufixo, w), campo('E-mail do ' + sufixo, m)];
          const pintar = () => {
            const copia = mesmo.ativo;
            if (copia) { const a = anterior(); n.value = a.nome; w.value = a.whatsapp; m.value = a.email; }
            [n, w, m].forEach((i) => { i.readOnly = copia; });
          };
          s.append(mesmo, ...campos);
          return { no: s, mesmo, nome: n, whatsapp: w, email: m, pintar };
        }
        const valores = (c) => ({ nome: c.nome.value.trim(), whatsapp: c.whatsapp.value.trim(), email: c.email.value.trim() });
        const fin = etapaContato(f?.financeiro, 'financeiro', () => ({ nome: (ehPF() ? nome : vNome).value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim() }), 'Dados do responsável financeiro');
        const rep = etapaContato(f?.representante, 'representante', () => valores(fin), 'Dados do responsável legal');
        // A cópia segue a ordem das etapas: primeiro o financeiro (copia o vendedor), depois o representante (copia o financeiro).
        const pintarCopias = () => { fin.pintar(); rep.pintar(); };
        // Cargo na empresa: não é copiado; com "O mesmo da etapa anterior" marcado, é o único campo a preencher na etapa.
        const repCargo = seletor(D.CARGOS_REPRESENTANTE, f?.representante?.cargo || '', 'Selecione');
        rep.no.append(campo('Cargo na empresa', repCargo));

        /* ----- Barra de etapas e navegação ----- */
        /* ----- Etapa 5: vínculos. Só guarda o vínculo; não cria lançamento nem regra de dinheiro. -----
           Produto: os produtos que este fornecedor fornece. É outra porta para o MESMO dado do Compras (d.catalogo,
           o vínculo produto × fornecedor de "Cadastro de compras", "Vincular aos selecionados" e do alerta de
           vínculo): marcar aqui cria o vínculo aprovado igual ao de lá. O Compras não tem como desfazer vínculo
           aprovado, então o que já está vinculado aparece marcado e travado.
           Serviço: um ou mais grupos e subgrupos de despesa (DES - Grupos de Despesas), em f.gruposDespesaIds: o id
           do grupo, ou "idDoGrupo|idDoSubgrupo" para um subgrupo (o mesmo formato do patrimônio).
           Nos dois casos (pedido do Rodrigo): um botão retangular abre a lista em tela cheia, com busca, marcação
           múltipla e confirmar; a etapa mostra só o que foi escolhido, com opção de remover. */
        const s5 = el('fieldset', 'compras-fieldset');
        s5.append(el('legend', null, 'Vínculos'));
        const doFornecedor = (status) => new Set(f ? S.dados.catalogo.filter((v) => v.fornecedorId === f.id && v.status === status).map((v) => v.produtoId) : []);
        const jaVinculados = doFornecedor('aprovado');
        const sugeridos = doFornecedor('pendente');
        const novosProdutos = new Set();
        /** Janela de escolha: busca, lista de caixas de marcar (com níveis) e confirmar. itens: [{ id, rotulo, busca, nivel, travado, dica }]. */
        function abrirSeletor({ titulo, rotuloBusca, itens, marcados, aoConfirmar, limite = 80 }) {
          const escolha = new Set(marcados);
          const LIMITE = limite;
          U.dialogo({
            titulo, ...coresF(), rotuloSalvar: 'Confirmar',
            montar: (fm) => {
              const busca = texto('', { placeholder: rotuloBusca, maxLength: 80, autocomplete: 'off' });
              busca.setAttribute('aria-label', rotuloBusca);
              busca.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
              const resumo = el('p', 'profiles-note');
              resumo.setAttribute('role', 'status');
              const lista = el('div', 'compras-vinculos-lista');
              const desenhar = () => {
                const termo = U.dobrar(busca.value.trim());
                const achados = itens.filter((i) => !termo || U.dobrar(i.busca || i.rotulo).includes(termo));
                lista.replaceChildren(...achados.slice(0, LIMITE).map((i) => {
                  const l = interruptor(i.rotulo, Boolean(i.travado) || escolha.has(i.id), i.dica || '');
                  if (i.nivel) l.classList.add('compras-vinculo-nivel');
                  l.input.disabled = Boolean(i.travado);
                  l.input.onchange = () => { if (l.input.checked) escolha.add(i.id); else escolha.delete(i.id); contar(achados.length); };
                  return l;
                }));
                if (!achados.length) lista.append(el('p', 'profiles-note', termo ? 'Nada encontrado.' : 'Nada cadastrado.'));
                contar(achados.length);
              };
              const contar = (achados) => {
                resumo.textContent = (escolha.size === 1 ? '1 marcado' : escolha.size + ' marcados') + '.' + (achados > LIMITE ? ' Mostrando ' + LIMITE + ' de ' + achados + ': use a busca.' : '');
              };
              busca.addEventListener('input', desenhar);
              const box = el('div', 'compras-campo compras-largo');
              box.append(busca, resumo, lista);
              fm.append(box);
              desenhar();
            },
            salvar: () => { aoConfirmar(escolha); },
          });
        }
        /** Chip do que foi escolhido: com "×" para remover, ou travado (sem ação). */
        const chipEscolhido = (rotulo, aoRemover) => {
          if (!aoRemover) return el('span', 'compras-chip ativo', rotulo);
          const c = botao(rotulo + ' ×', aoRemover, 'compras-chip ativo');
          c.setAttribute('aria-label', 'Remover ' + rotulo);
          return c;
        };

        const boxProdutos = el('div', 'compras-campo compras-largo');
        const escolhidosProdutos = el('div', 'compras-chips');
        const resumoProdutos = el('p', 'profiles-note');
        resumoProdutos.setAttribute('role', 'status');
        const desenharProdutos = () => {
          const nomeP = (id) => (S.produto(id) || {}).descricao || 'Produto removido';
          const porNome = (a, b2) => nomeP(a).localeCompare(nomeP(b2), 'pt-BR');
          escolhidosProdutos.replaceChildren(
            ...[...jaVinculados].sort(porNome).map((id) => chipEscolhido(nomeP(id))),
            ...[...novosProdutos].sort(porNome).map((id) => chipEscolhido(nomeP(id), () => { novosProdutos.delete(id); desenharProdutos(); })),
          );
          const n = jaVinculados.size + novosProdutos.size;
          resumoProdutos.textContent = (n === 1 ? '1 produto vinculado' : n + ' produtos vinculados') + (novosProdutos.size ? ' (' + novosProdutos.size + ' a vincular ao salvar)' : '') + '.'
            + (jaVinculados.size ? ' Os que já estavam vinculados não saem por aqui.' : '');
        };
        const escolherProdutos = () => abrirSeletor({
          titulo: 'Produtos do fornecedor', rotuloBusca: 'Buscar produto',
          itens: S.dados.produtos.filter((p) => p.status === 'ativo' || jaVinculados.has(p.id) || novosProdutos.has(p.id))
            .sort((a, b2) => a.descricao.localeCompare(b2.descricao, 'pt-BR'))
            .map((p) => ({ id: p.id, rotulo: p.descricao, travado: jaVinculados.has(p.id) || sugeridos.has(p.id),
              dica: jaVinculados.has(p.id) ? 'Já vinculado.' : sugeridos.has(p.id) ? 'Sugestão do fornecedor aguardando decisão no Cadastro de compras.' : '' })),
          marcados: novosProdutos,
          aoConfirmar: (escolha) => { novosProdutos.clear(); escolha.forEach((id) => { if (!jaVinculados.has(id) && !sugeridos.has(id)) novosProdutos.add(id); }); desenharProdutos(); },
        });
        const linhaProdutos = el('div', 'compras-form-rodape');
        linhaProdutos.append(U.botaoTitulo('Produtos', 'Escolher os produtos que este fornecedor fornece', escolherProdutos));
        boxProdutos.append(el('span', 'compras-rotulo', 'Produtos que este fornecedor fornece'), linhaProdutos, resumoProdutos, escolhidosProdutos);

        const gruposEscolhidos = new Set(Array.isArray(f?.gruposDespesaIds) ? f.gruposDespesaIds : []);
        const boxGrupos = el('div', 'compras-campo compras-largo');
        const escolhidosGrupos = el('div', 'compras-chips');
        const resumoGrupos = el('p', 'profiles-note');
        resumoGrupos.setAttribute('role', 'status');
        const gruposDeDespesa = () => (window.CicluzProducaoDados && window.CicluzProducaoDados.gruposDespesa()) || [];
        /** Todos os grupos e subgrupos, na ordem da hierarquia; inativo só entra se já estava escolhido. */
        const itensGrupos = () => gruposDeDespesa().flatMap((g) => {
          const filhos = g.subgrupos.filter((s) => (g.ativo && s.ativo) || gruposEscolhidos.has(g.id + '|' + s.id))
            .map((s) => ({ id: g.id + '|' + s.id, rotulo: s.nome + (g.ativo && s.ativo ? '' : ' (inativo)'), busca: g.nome + ' ' + s.nome, nivel: 1, nomeCompleto: g.nome + ' › ' + s.nome }));
          const proprio = g.ativo || gruposEscolhidos.has(g.id) || filhos.length;
          return proprio ? [{ id: g.id, rotulo: g.nome + (g.ativo ? '' : ' (inativo)'), busca: g.nome, nomeCompleto: g.nome }, ...filhos] : [];
        });
        const desenharGrupos = () => {
          const itens = itensGrupos();
          const nomeG = (id) => (itens.find((i) => i.id === id) || {}).nomeCompleto || 'Grupo removido';
          escolhidosGrupos.replaceChildren(...[...gruposEscolhidos].map((id) => chipEscolhido(nomeG(id), () => { gruposEscolhidos.delete(id); desenharGrupos(); })));
          resumoGrupos.textContent = gruposEscolhidos.size ? (gruposEscolhidos.size === 1 ? '1 grupo ou subgrupo vinculado.' : gruposEscolhidos.size + ' grupos ou subgrupos vinculados.') : 'Nenhum grupo de despesa vinculado.';
        };
        const escolherGrupos = () => abrirSeletor({
          // Sem limite: a lista traz todos os grupos e subgrupos de uma vez (são poucas centenas, no máximo).
          titulo: 'Grupos de despesa', rotuloBusca: 'Buscar grupo ou subgrupo', itens: itensGrupos(), marcados: gruposEscolhidos, limite: Infinity,
          aoConfirmar: (escolha) => { gruposEscolhidos.clear(); escolha.forEach((id) => gruposEscolhidos.add(id)); desenharGrupos(); },
        });
        const linhaGrupos = el('div', 'compras-form-rodape');
        linhaGrupos.append(U.botaoTitulo('Grupo de despesas', 'Escolher os grupos e subgrupos de despesa deste prestador', escolherGrupos));
        boxGrupos.append(el('span', 'compras-rotulo', 'Grupos de despesa deste prestador (um ou mais)'), linhaGrupos, resumoGrupos, escolhidosGrupos);
        const semCategoria = el('p', 'profiles-note compras-largo', 'Escolha a categoria na primeira etapa para vincular produtos ou grupos de despesa.');
        s5.append(boxProdutos, boxGrupos, semCategoria);
        const pintarVinculos = () => {
          const c = marcadas(); const cat = c.length === 1 ? c[0] : '';
          mostrar(boxProdutos, cat === 'produto'); mostrar(boxGrupos, cat === 'servico'); mostrar(semCategoria, !cat);
          if (cat === 'produto') desenharProdutos();
          if (cat === 'servico') desenharGrupos();
        };

        /* ----- Contrato, dentro dos dados do financeiro (etapa 3): quadro "Tem contrato?" (Sim / Não) no padrão do
           quadro de Situação; com Sim aparecem a forma de pagamento, a recorrência, o vencimento, o valor, a vigência e
           o reajuste. Tudo só informado: sem fórmula, sem lançamento e sem cálculo de reajuste. ----- */
        const ct = f?.contrato || {};
        const cDados = el('fieldset', 'compras-fieldset');
        cDados.append(el('legend', null, 'Dados do contrato'));
        const temContrato = U.quadroSituacao('Tem contrato?', Boolean(ct.tem), { textos: ['Sim', 'Não'], dica: 'Contrato de fornecimento ou de prestação de serviço com este fornecedor.', aoMudar: () => pintarContrato() });
        // Forma de pagamento: Boleto ou Dinheiro. Valor antigo (PIX, transferência) continua aparecendo até ser trocado.
        const formas = [...D.FORMAS_PAGAMENTO_FORNECEDOR];
        const formaAntiga = ct.formaPagamento && !formas.some(([id]) => id === ct.formaPagamento) ? D.FORMAS_PAGAMENTO_CONTRATO.find(([id]) => id === ct.formaPagamento) : null;
        if (formaAntiga) formas.push([formaAntiga[0], formaAntiga[1] + ' (cadastro anterior)']);
        const cForma = seletor(formas, ct.formaPagamento || '', 'Selecione');
        const cVencData = entrada('date', ct.vencimentoData || '');
        const vencDataCampo = campo('Data de vencimento do boleto', cVencData);
        const diaPagtoCampo = el('div', 'compras-campo');
        diaPagtoCampo.append(el('span', 'compras-rotulo', 'Dia de pagamento'), el('strong', null, 'Toda sexta-feira'), el('small', 'profiles-note', 'Só informativo: o sistema não faz o pagamento nem marca como pago.'));
        // Tipo de recorrência no estilo do Calendário e dos Lembretes (recorrencia.js): lista compacta e painel Personalizado.
        const rec = window.CicluzComprasRecorrencia.criar({ valor: ct.recorrencia || '', personalizada: ct.recorrenciaPersonalizada || null, cores: coresF(), aoMudar: () => pintarValor() });
        // Valor: máscara brasileira (R$ 1.500,00) e a frase informativa conforme a recorrência. Não calcula total nem cria pagamento.
        const cValor = entrada('text', Number.isInteger(ct.valorCentavos) ? R().moneyMask(String(ct.valorCentavos)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 });
        const valorCampo = campo('Valor (R$)', cValor);
        const valorResumo = el('small', 'profiles-note compras-valor-resumo'); valorResumo.setAttribute('aria-live', 'polite');
        valorCampo.append(valorResumo);
        const valorCentavos = () => { const n = D.digitos(cValor.value).replace(/^0+(?=\d)/, ''); return n ? parseInt(n, 10) : null; };
        function pintarValor() { const c = valorCentavos(); valorResumo.textContent = c == null ? '' : D.resumoValorRecorrencia(c, rec.atual()); }
        cValor.addEventListener('input', () => { cValor.value = R().moneyMask(cValor.value); pintarValor(); });
        // Referência ao salário mínimo: só informação cadastral (percentual); não consulta o mínimo nem calcula.
        const sm0 = ct.salarioMinimo || {};
        const smQuadro = U.quadroSituacao('Referência do salário mínimo', Boolean(sm0.ativo), { aoMudar: () => pintarContrato() });
        const smPct = entrada('text', typeof sm0.percentual === 'number' ? String(sm0.percentual).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'Ex.: 50', maxLength: 8 });
        const smPctCampo = campo('Percentual do salário mínimo (%)', smPct);
        // O rótulo com "salário" faria o field-validation.js tratar o campo como dinheiro: o nome para leitor de tela evita isso.
        smPct.setAttribute('aria-label', 'Percentual sobre o mínimo (%)');
        smPct.addEventListener('input', () => { smPct.value = smPct.value.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, ''); });
        const smBox = el('div', 'compras-largo compras-sm');
        smBox.append(smQuadro, smPctCampo, el('small', 'profiles-note', 'Só informação cadastral: o sistema não consulta o salário mínimo, não calcula reajuste e não troca o valor informado.'));
        const cInicio = entrada('date', ct.inicio || '');
        const cFim = entrada('date', ct.fim || '');
        const cReajuste = seletor(D.REAJUSTES_CONTRATO, ct.reajuste || '', 'Selecione');
        const cPercentual = entrada('text', ct.reajustePercentual != null ? String(ct.reajustePercentual).replace('.', ',') : '', { inputMode: 'decimal', placeholder: '0,00', maxLength: 6 });
        const percentualCampo = campo('Percentual do reajuste (%) *', cPercentual);
        const cObs = el('textarea');
        cObs.rows = 3; cObs.maxLength = 2000; cObs.value = ct.observacoes || '';
        const obsCampo = campo('Observações do contrato', cObs);
        obsCampo.classList.add('compras-largo');
        cDados.append(campo('Forma de pagamento', cForma), vencDataCampo, diaPagtoCampo, rec.no, valorCampo, smBox, campo('Início da vigência', cInicio), campo('Término da vigência', cFim),
          campo('Reajuste', cReajuste, 'Só o índice combinado; o sistema não calcula o reajuste.'), percentualCampo, obsCampo);
        const pintarContrato = () => {
          cDados.classList.toggle('compras-so-pergunta', !temContrato.ativo); // desligado, o quadro mostra só a pergunta
          mostrar(vencDataCampo, cForma.value !== 'dinheiro' && cForma.value !== '');
          vencDataCampo.querySelector('.compras-rotulo').textContent = cForma.value === 'boleto' ? 'Data de vencimento do boleto' : 'Data de vencimento';
          mostrar(diaPagtoCampo, cForma.value === 'dinheiro');
          mostrar(smPctCampo, smQuadro.ativo);
          mostrar(percentualCampo, cReajuste.value === 'percentual');
        };
        cForma.onchange = pintarContrato;
        cReajuste.onchange = pintarContrato;
        pintarContrato();
        pintarValor();
        // Número digitado: null quando vazio, NaN quando não é número (para a validação recusar em vez de virar vazio).
        const numeroOuNada = (input) => { const t = String(input.value).trim(); if (!t) return null; const n = D.lerNumero(t); return n == null ? NaN : n; };
        // Etapa 6 (18/11/2026): tipo de contrato (cópia do modelo), cláusulas, atividades incluídas e não incluídas e campos adicionais.
        const ct6 = {
          modeloId: ct.modeloId || '', modeloNome: ct.modeloNome || '', modeloVersao: ct.modeloVersao || null, clausulas: (ct.clausulas || []).map((x) => ({ ...x })),
          incl: (ct.atividadesIncluidas || []).map((x) => ({ ...x })), excl: (ct.atividadesExcluidas || []).map((x) => ({ ...x })),
          camposDef: (ct.camposAdicionaisDef || []).map((x) => ({ ...x })), campos: { ...(ct.camposAdicionais || {}) }, renovacao: ct.renovacao || '',
        };
        const datasExtras = [];
        const lerContrato = () => {
          const pct = numeroOuNada(cPercentual); const pctMinimo = numeroOuNada(smPct);
          return {
            modeloId: ct6.modeloId, modeloNome: ct6.modeloNome, modeloVersao: ct6.modeloVersao, clausulas: ct6.clausulas, atividadesIncluidas: ct6.incl, atividadesExcluidas: ct6.excl,
            camposAdicionaisDef: ct6.camposDef, camposAdicionais: ct6.campos, renovacao: ct6.renovacao,
            tem: temContrato.ativo, formaPagamento: cForma.value,
            // Vencimento: só em dinheiro some (o pagamento é toda sexta-feira, informativo). O dia do mês antigo fica guardado como estava.
            vencimentoData: cForma.value === 'dinheiro' ? '' : cVencData.value, vencimentoDia: ct.vencimentoDia != null ? ct.vencimentoDia : null,
            diaPagamento: cForma.value === 'dinheiro' ? 'sexta' : '',
            ...rec.ler(),
            valorCentavos: valorCentavos(),
            salarioMinimo: { ativo: smQuadro.ativo, percentual: pctMinimo == null ? null : Number.isNaN(pctMinimo) ? NaN : Math.round(pctMinimo * 100) / 100 },
            inicio: cInicio.value, fim: cFim.value,
            reajuste: cReajuste.value, reajustePercentual: cReajuste.value === 'percentual' ? (pct == null ? null : Math.round(pct * 100) / 100) : null,
            observacoes: cObs.value.trim(),
          };
        };
        const etapa3 = el('div', 'compras-etapa');
        temContrato.classList.add('compras-largo'); cDados.querySelector('legend').after(temContrato); // a pergunta abre o quadro "Dados do contrato"
        etapa3.append(fin.no, cDados);

        /* ----- Etapa 6: contrato (o documento). Mostra o que foi combinado no financeiro; o modelo de contrato e a
           assinatura ainda não existem (aguardam decisão). ----- */
        const s6 = el('fieldset', 'compras-fieldset');
        s6.append(el('legend', null, 'Contrato'));
        const resumoContrato = el('div', 'compras-campo compras-largo');
        const pintarResumoContrato = () => {
          const c = lerContrato();
          const linhas = !c.tem ? [] : linhasContrato(c);
          resumoContrato.replaceChildren(el('span', 'compras-rotulo', 'Combinado nos dados do financeiro'),
            ...(linhas.length ? linhas.map(([k, v]) => el('p', 'profiles-note', k + ': ' + v)) : [el('p', 'profiles-note', c.tem ? 'Contrato marcado, ainda sem dados preenchidos.' : 'Este fornecedor está sem contrato (etapa Dados do financeiro).')]));
        };
        // Documentos (16/11/2026): imprimir a ficha, enviar e visualizar o documento do fornecedor. Nada é gerado ou enviado sozinho.
        const avisoDoc = el('p', 'profiles-note compras-largo');
        avisoDoc.setAttribute('role', 'status');
        const bolinha = (rotuloBtn, desenho, acao) => {
          const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotuloBtn; b.setAttribute('aria-label', rotuloBtn);
          b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + desenho + '</svg>';
          b.onclick = acao;
          return b;
        };
        const acoesDoc = el('div', 'compras-form-rodape compras-largo compras-doc-acoes');
        acoesDoc.append(
          bolinha('Imprimir ficha do fornecedor', '<path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>', () => { avisoDoc.textContent = ''; imprimirFicha(ler()); }),
          bolinha('Enviar ficha do fornecedor', U.ICONES.send, () => { avisoDoc.textContent = ''; enviarFicha(ler(), coresF()); }),
          botao('Visualizar documento', () => {
            if (documentosDoFornecedor(f).length) { avisoDoc.textContent = ''; verDocumentos(f, coresF()); return; }
            avisoDoc.textContent = 'Este fornecedor não tem documento disponível.';
          }, 'btn secondary'),
        );
        // Conteúdo do contrato (só aparece com "Tem contrato?" = Sim).
        const boxContrato = el('div', 'compras-largo compras-contrato-corpo'); const semContratoNota = el('p', 'profiles-note compras-largo', 'Este fornecedor está sem contrato: marque "Tem contrato?" nos dados do responsável financeiro para preencher esta etapa.');
        const notasModelo = el('p', 'profiles-note'); notasModelo.setAttribute('role', 'status');
        const selModelo = seletor([], '', 'Selecione o tipo de contrato'); selModelo.setAttribute('aria-label', 'Tipo de contrato');
        const modelosAtivos = () => (window.CicluzContratos ? window.CicluzContratos.modelos() : []).filter((m) => m.ativo !== false || m.id === ct6.modeloId);
        const pintarModelos = () => {
          selModelo.replaceChildren(new Option(modelosAtivos().length ? 'Selecione o tipo de contrato' : 'Nenhum tipo de contrato cadastrado', ''), ...modelosAtivos().sort((a, b2) => a.nome.localeCompare(b2.nome, 'pt-BR')).map((m) => new Option(m.nome + (m.ativo === false ? ' (inativo)' : ''), m.id)));
          if (ct6.modeloId && !modelosAtivos().some((m) => m.id === ct6.modeloId)) selModelo.append(new Option(ct6.modeloNome + ' (modelo removido)', ct6.modeloId));
          selModelo.value = ct6.modeloId;
        };
        const boxClausulas = el('div', 'compras-largo'); const boxCampos = el('div', 'compras-largo compras-campos-adicionais');
        const desenharClausulas = () => {
          boxClausulas.replaceChildren(...(ct6.clausulas.length ? [el('span', 'compras-rotulo', 'Cláusulas do tipo de contrato (cópia da versão ' + (ct6.modeloVersao || '—') + ')'),
            ...ct6.clausulas.map((x, k) => { const p = el('p', 'profiles-note compras-clausula'); p.append(el('b', null, (k + 1) + '. ' + (x.titulo ? x.titulo + ': ' : '')), document.createTextNode(x.texto)); return p; })] : []));
        };
        const desenharCampos = () => {
          datasExtras.length = 0;
          boxCampos.replaceChildren(...(ct6.camposDef.length ? [el('span', 'compras-rotulo', 'Informações adicionais do contrato'), ...ct6.camposDef.map((d2) => {
            const v = ct6.campos[d2.id]; let inp;
            if (d2.tipo === 'data') { inp = entrada('date', v || ''); datasExtras.push(inp); const sync = () => { ct6.campos[d2.id] = inp.value; }; inp.addEventListener('input', sync); inp.addEventListener('change', sync); }
            else if (d2.tipo === 'moeda') { inp = entrada('text', Number.isInteger(v) ? R().moneyMask(String(v)) : '', { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 }); inp.addEventListener('input', () => { inp.value = R().moneyMask(inp.value); const n = D.digitos(inp.value).replace(/^0+(?=\d)/, ''); ct6.campos[d2.id] = n ? parseInt(n, 10) : ''; }); }
            else { inp = entrada('text', v == null ? '' : String(v), { inputMode: d2.tipo === 'numero' ? 'decimal' : 'text', maxLength: 500 }); inp.dataset.textoLivre = '1'; inp.addEventListener('input', () => { ct6.campos[d2.id] = inp.value; }); }
            return campo(d2.rotulo + (d2.obrigatorio ? ' *' : ''), inp);
          })] : []));
        };
        const aplicarModelo = (m) => {
          const { patch, notas } = D.aplicarModeloAoContrato(lerContrato(), m);
          ct6.modeloId = patch.modeloId; ct6.modeloNome = patch.modeloNome; ct6.modeloVersao = patch.modeloVersao; ct6.clausulas = patch.clausulas;
          ct6.incl = patch.atividadesIncluidas; ct6.excl = patch.atividadesExcluidas; ct6.camposDef = patch.camposAdicionaisDef;
          const novos = {}; patch.camposAdicionaisDef.forEach((d2) => { if (ct6.campos[d2.id] != null) novos[d2.id] = ct6.campos[d2.id]; }); ct6.campos = novos;
          if ('renovacao' in patch) ct6.renovacao = patch.renovacao;
          if ('valorCentavos' in patch) { cValor.value = R().moneyMask(String(patch.valorCentavos)); pintarValor(); }
          if ('recorrencia' in patch) rec.definir(patch.recorrencia);
          if ('fim' in patch) { cFim.value = patch.fim; cFim.dispatchEvent(new Event('change', { bubbles: true })); }
          notasModelo.textContent = notas.join(' ');
          desenharClausulas(); desenharCampos(); listaInc.desenhar(); listaExc.desenhar(); pintarModelos(); pintarResumoContrato();
        };
        selModelo.onchange = () => {
          const m = modelosAtivos().find((x) => x.id === selModelo.value); if (!m) { selModelo.value = ct6.modeloId; return; }
          if (!ct6.modeloId || ct6.modeloId === m.id) { aplicarModelo(m); return; }
          let ok = false;
          U.dialogo({ titulo: 'Trocar o tipo de contrato?', ...coresF(), rotuloSalvar: 'Trocar',
            montar: (f2) => { f2.append(el('p', null, 'As cláusulas e os campos adicionais do tipo atual (' + ct6.modeloNome + ') serão trocados pelos de "' + m.nome + '". As atividades que você já tem ficam, e o que já estava preenchido é mantido.')); },
            salvar: () => { ok = true; aplicarModelo(m); },
            aoFechar: () => { if (!ok) selModelo.value = ct6.modeloId; } });
        };
        const abrirModelosBtn = U.botaoTitulo('Tipos de contrato', 'Cadastrar e editar os tipos (modelos) de contrato', () => window.CicluzContratos.abrirModelos({ cores: coresF, aoFechar: () => { pintarModelos(); } }), U.ICONES.contrato || undefined);
        const linhaModelo = el('div', 'compras-form-rodape compras-largo'); linhaModelo.append(selModelo, abrirModelosBtn);
        const listaInc = window.CicluzContratos.listaAtividades({ tipo: 'incluidas', cores: coresF, api: { itens: () => ct6.incl, trocar: (v) => { ct6.incl = v; }, outra: () => ct6.excl, mudou: () => pintarResumoContrato() } });
        const listaExc = window.CicluzContratos.listaAtividades({ tipo: 'excluidas', cores: coresF, api: { itens: () => ct6.excl, trocar: (v) => { ct6.excl = v; }, outra: () => ct6.incl, mudou: () => pintarResumoContrato() } });
        const duasListas = el('div', 'compras-atividades-duas compras-largo'); duasListas.append(listaInc, listaExc);
        const avisoContrato = el('p', 'profiles-error compras-largo'); avisoContrato.setAttribute('role', 'alert');
        const acoesContrato = window.CicluzContratos.botoesDocumento({ lerFornecedor: () => ler(), cores: coresF, aviso: avisoContrato });
        boxContrato.append(campo('Tipo de contrato', linhaModelo), notasModelo, boxClausulas, duasListas, boxCampos,
          el('span', 'compras-rotulo compras-largo', 'Documento do contrato'), acoesContrato, avisoContrato);
        pintarModelos(); desenharClausulas(); desenharCampos();
        s6.append(resumoContrato, semContratoNota, boxContrato, el('span', 'compras-rotulo compras-largo', 'Ficha do fornecedor'), acoesDoc, avisoDoc);
        s6.pintarTem = () => { mostrar(boxContrato, temContrato.ativo); mostrar(semContratoNota, !temContrato.ativo); };

        // 7ª etapa · Revisão dos dados (18/11/2026, Rodrigo): o mesmo fluxo dos outros cadastros — um bloco por etapa, só para leitura,
        // com "Editar" em cada bloco e o Salvar no fim. Os dados são lidos das próprias etapas na hora de abrir a Revisão.
        const eRevisao = el('div', 'compras-etapa');
        const quadros = [etapa1, etapa2, etapa3, rep.no, s5, s6, eRevisao];
        const marcadas = () => catOpcoes.marcados();
        // Sequência em uso: a pessoa física não tem a etapa do vendedor à parte (posição 1 de quadros); "atual" é a posição nesta sequência.
        const seq = () => (ehPF() ? [0, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6]);
        const etapas = () => D.etapasFornecedor(marcadas(), ehPF() ? 'fisica' : 'juridica').map((label) => ({ label }));
        // O que falta em cada posição da sequência: na pessoa física, a conferência da 2ª etapa (prestadores) soma-se à 1ª.
        const faltasDaSequencia = () => { const t = D.validarFornecedorEtapas(ler(), R(), { fornecedores: S.dados.fornecedores, funcoes: S.dados.funcoesPrestador }); return seq().map((q) => t[q] || (ehPF() && q === 0 ? t[1] : '') || ''); };
        let barra = null;
        // Troca a cor na hora, sem recarregar nem mexer nos dados: as mesmas variáveis que a janela recebeu ao abrir.
        function aplicarTema() {
          const m = marcadas(); temaForm = m.length === 1 ? m[0] : null;
          const c = coresF();
          dlg.style.setProperty('--menu-accent', c.cor); dlg.style.setProperty('--dialog-accent', c.cor); dlg.style.setProperty('--panel-text', c.corTexto);
        }
        let atual = 0;
        const quadroAtual = () => quadros[seq()[atual]];
        const erroEtapa = el('p', 'profiles-error');
        erroEtapa.setAttribute('role', 'alert');
        // Rodapé do formulário no padrão: Voltar sem cor (contorno, como o Cancelar), Avançar e Salvar na cor do menu,
        // todos com a mesma largura (o layout-review.js iguala os botões destas classes dentro do mesmo grupo).
        const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
        voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => {
          const falta = faltasDaSequencia()[atual];
          if (falta) { erroEtapa.textContent = falta; U.sinalizarObrigatorios(quadroAtual()); return; }
          ir(atual + 1);
        }, 'btn form-next-action');
        const salvarFim = el('button', 'btn', 'Salvar');
        salvarFim.type = 'submit';
        const cancelar = botao('Cancelar', () => dlg.close(), 'btn secondary footer-cancel-accent');
        const nav = el('div', 'compras-form-rodape compras-etapas-nav');
        // No cadastro novo só se volta pela barra (para a frente, pelo Avançar, que confere a etapa); na edição, qualquer etapa.
        barra = window.CicluzStepper.create({ steps: etapas(), current: 0, label: 'Etapas do cadastro do fornecedor', onSelect: (i) => { if (f || i <= atual) ir(i); } });
        function ir(i) {
          const ordem = seq();
          atual = Math.max(0, Math.min(ordem.length - 1, i));
          pintarCopias();
          pintarVinculos();
          pintarResumoContrato(); s6.pintarTem(); pintarModelos();
          const ultima = atual === ordem.length - 1;
          if (ultima) eRevisao.replaceChildren(el('p', 'profiles-note', 'Confira os dados antes de salvar. Para corrigir, toque em Editar no bloco.'), ...U.revisaoDasEtapas(ordem.slice(0, -1).map((q) => quadros[q]), etapas().map((x) => x.label), ir));
          quadros.forEach((q, k) => mostrar(q, k === ordem[atual]));
          barra.update(etapas(), atual);
          erroEtapa.textContent = '';
          // Os botões entram e saem da barra (o formato padrão dos botões de rodapé força a exibição mesmo com hidden):
          // Voltar a partir da 2ª etapa, Avançar até a penúltima; Salvar em todas na edição e só na última no cadastro novo.
          nav.replaceChildren(...[atual > 0 && voltar, cancelar, (f || ultima) && salvarFim, !ultima && avancar].filter(Boolean));
          const foco = quadroAtual().querySelector('input:not([type=checkbox]):not([readonly]),select');
          if (foco && form.isConnected) foco.focus({ preventScroll: true });
          U.subirAoTopo(barra.el, form);
        }
        pintarVendedor();
        aplicarTema();
        aoMudarTipo();

        /** Lê o formulário no formato salvo. "O mesmo da etapa anterior" copia os dados da etapa de antes. */
        function ler() {
          const razaoSocial = razao.value.trim();
          sincNomePF();
          pintarCopias();
          const vendedor = { nome: vNome.value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim() };
          const contato = (c) => ({ mesmo: c.mesmo.ativo, ...valores(c) });
          return {
            // tipoPessoa continua gravado (sempre 'juridica') para quem lê o dado; o documento antigo (CPF) não se perde.
            // O campo Ramo saiu do cadastro (16/11/2026); o que já estava gravado em f.ramo fica como está (a chave não vai no salvamento).
            id: f?.id, categorias: marcadas(), tipoPessoa: ehPF() ? 'fisica' : 'juridica', ...(docAntigo && !ehPF() ? { documentoAnterior: docAntigo } : {}),
            // Sem nome fantasia, a razão social vira o nome de uso. Pessoa física: nome completo, CPF, sem razão social nem regime.
            nome: ehPF() ? nome.value.trim() : nome.value.trim() || razaoSocial, razaoSocial: ehPF() ? '' : razaoSocial,
            documento: ehPF() ? cpf.value.trim() : cnpj.value.trim(),
            regimeTributario: ehPF() ? '' : regime.value,
            endereco: !comEndereco() ? (f?.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }) : { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value },
            contatoNome: vendedor.nome, whatsapp: vendedor.whatsapp, email: vendedor.email,
            // Texto incompleto segue como está para a validação recusar (não vira vazio em silêncio).
            vendedorAniversario: vAniv.valor(), contatoMesmo: ehPF(),
            // Serviço: a lista de prestadores; o 1º espelha o contato acima (é dele que a lista e a cotação leem).
            // Produto: a chave não vai, para não apagar prestadores gravados se a categoria for trocada por engano.
            contrato: lerContrato(),
            // Grupos de despesa: só na categoria Serviço (em Produto a chave não vai, para não apagar o que estava gravado).
            ...(ehServico() ? { gruposDespesaIds: [...gruposEscolhidos] } : {}),
            ...(ehServico() ? { prestadores: [
              { id: idPrestador1, nome: vendedor.nome, whatsapp: vendedor.whatsapp, email: vendedor.email, aniversario: vAniv.valor(), funcoes: funcoes1.valores() },
              ...extras.map((x) => ({ id: x.id, nome: x.nome.value.trim(), whatsapp: x.whatsapp.value.trim(), email: x.email.value.trim(), aniversario: x.aniversario.valor(), funcoes: x.funcoes.valores() })),
            ] } : {}),
            financeiro: contato(fin), representante: { ...contato(rep), cargo: repCargo.value },
            situacao: situacao.ativo ? 'ativo' : 'inativo',
          };
        }
        form.append(barra.el, ...quadros, erroEtapa, nav);
        ir(0);
        // Produtos marcados agora (categoria Produto): viram vínculo no mesmo catálogo do Compras ao salvar.
        // irQuadro(q): leva à posição da sequência em que está o quadro q (na pessoa física, o quadro do vendedor é o primeiro).
        const irQuadro = (q) => { const p = seq().indexOf(q); ir(p >= 0 ? p : 0); };
        return { ler, ir, irQuadro, get datasContrato() { return [cVencData, cInicio, cFim, ...datasExtras]; }, novosProdutos: () => (marcadas().join() === 'produto' ? [...novosProdutos] : []) };
      },
      salvar: (c) => {
        if (c.datasContrato.some((d2) => !d2.checkValidity())) { c.irQuadro(2); return 'Confira as datas do contrato: use DD/MM/AA.'; }
        const campos = c.ler();
        const faltas = D.validarFornecedorEtapas(campos, R(), { fornecedores: S.dados.fornecedores, funcoes: S.dados.funcoesPrestador });
        const etapaComFalta = faltas.findIndex(Boolean);
        if (etapaComFalta >= 0) { c.irQuadro(etapaComFalta); return faltas[etapaComFalta]; }
        delete campos.id;
        const idFornecedor = f ? f.id : S.novoId('f');
        const ok = S.transacao((d) => {
          if (f) Object.assign(d.fornecedores.find((y) => y.id === f.id), campos);
          else d.fornecedores.push({ id: idFornecedor, ...campos });
          // Vínculo produto × fornecedor: o mesmo registro que SV.vincular cria (catálogo do Compras), sem duplicar.
          for (const produtoId of c.novosProdutos()) {
            if (d.catalogo.some((v) => v.fornecedorId === idFornecedor && v.produtoId === produtoId && v.status !== 'rejeitado')) continue;
            d.catalogo.push({ id: S.novoId('v'), fornecedorId: idFornecedor, produtoId, origem: 'compras', status: 'aprovado', precoOfertado: null, criadoEm: S.agoraIso() });
          }
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Fornecedor salvo.');
        renderFornecedores();
      },
    });
  }

  window.CicluzComprasCadastros = { abrirFornecedores, mascaraTelefone, mascaraDocumento, seletoresAniversario, linhasContrato };
})();
