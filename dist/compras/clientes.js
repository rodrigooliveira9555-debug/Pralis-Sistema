/*
 * VND - Clientes (Entradas › Vendas › Cadastros Geral), 17/11/2026.
 * Quatro modalidades no mesmo registro: Pessoa Física ou Jurídica × Cadastro Simples (uma página) ou Completo (etapas).
 * Os dois controles são o mesmo quadro da "Situação do fornecedor" (interruptor com texto ao lado), exclusivos entre si.
 * Dados: cicluz-compras-v1 → clientes (mesmo armazenamento e transação de Fornecedores; sem backend novo). Os campos de
 * cada tipo ficam guardados no registro: trocar de tipo ou de modalidade nunca apaga nada, e salvar só grava o que está em uso.
 * Só informação cadastral: nada aqui gera cobrança, pagamento, cobrança recorrente ou sorteio.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const D = window.CicluzComprasDominio; const S = window.CicluzComprasDados;
  if (!U || !D || !S) return;
  const { el, botao, campo, entrada, seletor } = U;
  const R = () => window.CicluzFieldRules;
  const CAD = () => window.CicluzComprasCadastros;
  // Cor da seção Entradas (a do menu, índice 0) e o texto escuro correspondente.
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[0]) || '#eab308';
  const cores = () => ({ cor: cor(), corTexto: '#785600' });
  const ICO_PESSOA = '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>';
  /** Os quatro modelos de link de cadastro (Enviar Link de Cadastro): o modelo vem do link, quem preenche não escolhe. */
  const MODELOS_LINK = [
    { id: 'pf-simples', titulo: 'Pessoa Física — Simples', icone: ICO_PESSOA, modelo: { tipoPessoa: 'fisica', cadastro: 'simples' } },
    { id: 'pf-completo', titulo: 'Pessoa Física — Completo', icone: ICO_PESSOA, modelo: { tipoPessoa: 'fisica', cadastro: 'completo' } },
    { id: 'pj-simples', titulo: 'Pessoa Jurídica — Simples', icone: U.ICONES.fornecedor, modelo: { tipoPessoa: 'juridica', cadastro: 'simples' } },
    { id: 'pj-completo', titulo: 'Pessoa Jurídica — Completo', icone: U.ICONES.fornecedor, modelo: { tipoPessoa: 'juridica', cadastro: 'completo' } },
  ];
  const mascara = (input, fn) => { input.addEventListener('input', () => { input.value = fn(input.value); }); return input; };
  const texto = (v, extra = {}) => entrada('text', v || '', { maxLength: 120, ...extra });
  const email = (v) => { const i = entrada('email', v || '', { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); i.dataset.textoLivre = '1'; return i; };
  const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };
  const dataBR = (iso) => (iso ? window.CicluzDateFields.display(iso) : '');
  const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
  const ICONE_PF = '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>';
  const ICONE_PJ = '<path d="M4 21V5h10v16M14 9h6v12M8 9h2M8 13h2M8 17h2"/>';
  const clientes = () => (Array.isArray(S.dados.clientes) ? S.dados.clientes : []);

  /** Seções [título, [[rótulo, valor]]] do que está cadastrado, só com o que foi preenchido (visualização e revisão). */
  function secoesCliente(c) {
    const pj = c.tipoPessoa === 'juridica'; const completo = c.cadastro === 'completo'; const e = c.endereco || {};
    const enderecoLinhas = [['CEP', e.cep], ['Rua / logradouro', e.logradouro], ['Número', e.numero], ['Complemento', e.complemento], ['Bairro', e.bairro], ['Cidade', e.cidade], ['UF', e.uf]];
    const contato = (x, extra = []) => [['Nome', x && x.nome], ['WhatsApp', x && x.whatsapp], ['E-mail', x && x.email], ...extra];
    let secoes;
    if (!pj && !completo) secoes = [['Dados do cliente', [['Nome', c.nome], ['WhatsApp', c.whatsapp], ['E-mail', c.email], ['Data de aniversário', D.aniversarioTexto(D.aniversarioCliente(c))], ['Situação', c.situacao === 'inativo' ? 'Inativo' : 'Ativo']]], ['Endereço', enderecoLinhas]];
    else if (!pj) secoes = [
      ['Dados pessoais', [['Nome completo', c.nome], ['CPF', c.cpf], ['WhatsApp', c.whatsapp], ['E-mail', c.email], ['Data de aniversário', D.aniversarioTexto(D.aniversarioCliente(c))], ['Situação', c.situacao === 'inativo' ? 'Inativo' : 'Ativo']]],
      ['Endereço', enderecoLinhas],
      ['Informações complementares', [['Sorteio', 'Em definição']]],
    ];
    else if (!completo) secoes = [['Dados da empresa', [['CNPJ', c.cnpj], ['Razão Social', c.razaoSocial], ['Nome Fantasia', c.nomeFantasia], ['WhatsApp', c.whatsapp], ['E-mail', c.email]]], ['Endereço', enderecoLinhas]];
    else {
      secoes = [
        ['Dados cadastrais', [['CNPJ', c.cnpj], ['Razão Social', c.razaoSocial], ['Nome Fantasia', c.nomeFantasia], ['Regime tributário', nomeDe(D.REGIMES_TRIBUTARIOS, c.regimeTributario)], ['Situação', c.situacao === 'inativo' ? 'Inativo' : 'Ativo']]],
        ['Endereço', enderecoLinhas],
        ['Dados do responsável financeiro da empresa', [['Nome', c.contatoNome], ['WhatsApp', c.whatsapp], ['E-mail (financeiro e/ou fiscal)', c.email], ['Aniversário', D.aniversarioTexto(c.contatoAniversario)], ['Cliente mensal', c.contrato && c.contrato.clienteMensal ? 'Sim' : 'Não']]],
        // Cadastro anterior a 17/11/2026 com um financeiro diferente do contato: continua à vista, para não sumir.
        ...(c.financeiro && c.financeiro.mesmo === false && (c.financeiro.nome || c.financeiro.whatsapp || c.financeiro.email) ? [['Financeiro (cadastro anterior)', contato(c.financeiro)]] : []),
        ['Dados do responsável geral da empresa', contato(c.representante, [['Cargo', nomeDe(D.CARGOS_REPRESENTANTE, c.representante && c.representante.cargo)]])],
      ];
    }
    return secoes.map(([t, l]) => [t, l.filter(([, v]) => v)]).filter(([, l]) => l.length);
  }
  const rotuloModalidade = (c) => nomeDe(D.TIPOS_PESSOA_CLIENTE, c.tipoPessoa) + ' · ' + nomeDe(D.TIPOS_CADASTRO_CLIENTE, c.cadastro);
  // aoEditar(titulo): devolve a função que leva à etapa daquele bloco (ou nada). Com ela, o bloco ganha o botão "Editar".
  const dlDe = (secoes, aoEditar) => {
    const box = el('div', 'compras-largo');
    secoes.forEach(([t, linhas]) => {
      const fs = el('fieldset', 'compras-fieldset'); fs.append(el('legend', null, t));
      const editar = aoEditar && aoEditar(t);
      if (editar) fs.append(U.botaoEditarBloco(t, editar));
      const dl = el('dl', 'profiles-info');
      linhas.forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, String(v))));
      fs.append(dl); box.append(fs);
    });
    return box;
  };

  /* ---------------------------------------------------------------- Formulário ---------------------------------------------------------------- */
  /** opcoes: { modelo: { tipoPessoa, cadastro }, previa } — a prévia abre o formulário no modelo escolhido e não salva nada. */
  function editarCliente(c, opcoes = {}) {
    let enviado = false; // cadastro enviado pelo link de teste (opcoes.externo): o modelo vem do link e a pessoa não escolhe nada acima do formulário
    U.dialogo({
      titulo: opcoes.previa ? 'Prévia — Novo cliente' : opcoes.externo ? 'Cadastro de cliente' : c ? 'Editar cliente' : 'Novo cliente', aoFechar: () => { if (opcoes.externo && !enviado) window.CicluzConviteLink.sairModoExterno(); }, ...cores(), largo: true, classe: 'compras-form-padrao', rotuloSalvar: 'Salvar Cliente',
      montar: (form, dlg) => {
        const v = c || {}; const e = v.endereco || {};
        const C = window.CicluzConsultas;
        const tel = (valor) => mascara(entrada('tel', valor || '', { inputMode: 'numeric', placeholder: '(00) 00000-0000' }), CAD().mascaraTelefone);
        /* Campos (criados uma vez; mudam de lugar conforme a modalidade, então nada digitado se perde) */
        const nome = texto(v.nome);
        const cpf = mascara(entrada('text', v.cpf || '', { inputMode: 'numeric', placeholder: '000.000.000-00', maxLength: 14 }), R().cpfMask);
        // Pessoa física: data de aniversário (dia e mês), não mais a data de nascimento completa (pedido do Rodrigo, 17/11/2026).
        const anivPF = CAD().seletoresAniversario(D.aniversarioCliente(v), { rotulo: 'Data de aniversário *' });
        const whats = tel(v.whatsapp); const mail = email(v.email);
        const cnpj = mascara(entrada('text', v.cnpj || '', { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }), R().cnpjMask);
        const razao = texto(v.razaoSocial, { maxLength: 160 }); const fantasia = texto(v.nomeFantasia);
        const regime = seletor(D.REGIMES_TRIBUTARIOS, v.regimeTributario || '', 'Selecione');
        const cep = mascara(entrada('text', e.cep || '', { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9 }), C.cepMask);
        const rua = texto(e.logradouro, { maxLength: 160 }); const numero = texto(e.numero, { maxLength: 20 }); const complemento = texto(e.complemento, { maxLength: 80 });
        const bairro = texto(e.bairro, { maxLength: 80 }); const cidade = texto(e.cidade, { maxLength: 80 }); const uf = seletor(C.UFS, e.uf || '', 'UF');
        const contatoNome = texto(v.contatoNome); const aniv = CAD().seletoresAniversario(v.contatoAniversario || '', { rotulo: 'Aniversário *' });
        const situacao = U.quadroSituacao('Situação do cliente', v.situacao ? v.situacao === 'ativo' : true, { dica: 'Cliente inativo continua cadastrado.' });
        const F = {
          nome: campo('Nome completo *', nome), cpf: campo('CPF *', cpf), nasc: anivPF.no, whats: campo('WhatsApp *', whats), mail: campo('E-mail', mail),
          cnpj: campo('CNPJ *', cnpj), razao: campo('Razão Social *', razao), fantasia: campo('Nome Fantasia', fantasia), regime: campo('Regime tributário', regime), contatoNome: campo('Nome do responsável *', contatoNome),
        };
        const ajudaMail = el('small', 'profiles-note', 'Usamos este e-mail para enviar notas e cobranças.'); F.mail.append(ajudaMail);
        const avisoCnpj = el('p', 'profiles-note compras-largo'); avisoCnpj.setAttribute('role', 'status');
        const avisoCep = el('p', 'profiles-note compras-largo'); avisoCep.setAttribute('role', 'status');
        const e0 = Object.values(e).some((x) => String(x || '').trim());
        // "Preencher endereço" (só nos cadastros simples): desligado, o endereço some e não é exigido; ligado, aparece o que já foi digitado.
        const endSw = U.quadroSituacao('Preencher endereço', e0, { textos: ['Sim', 'Não'], dica: 'Endereço é opcional neste cadastro.', aoMudar: () => pintarEndereco() });
        endSw.classList.add('compras-largo'); endSw.querySelector('.account-status-switch').setAttribute('aria-label', 'Preencher endereço');
        const sEnd = el('fieldset', 'compras-fieldset');
        sEnd.append(el('legend', null, 'Endereço'), campo('CEP', cep), campo('Rua / logradouro', rua), campo('Número', numero), campo('Complemento', complemento), campo('Bairro', bairro), campo('Cidade', cidade), campo('UF', uf), avisoCep);
        // Buscas já existentes (consultas-publicas.js): só preenchem o que está vazio e nunca trocam o que a pessoa digitou.
        const completar = (pares) => pares.forEach(([alvo, valor]) => { if (valor && !alvo.value.trim()) alvo.value = valor; });
        const falha = { 'nao-encontrado': 'não encontrado', indisponivel: 'consulta indisponível agora' };
        let cepFeito = D.digitos(cep.value); let cnpjFeito = D.digitos(cnpj.value);
        const aoEnter = (buscar) => (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); buscar(true); } };
        const buscarCep = async (forcar) => {
          const n = D.digitos(cep.value); if (n.length !== 8 || (n === cepFeito && !forcar)) return;
          const trocouCep = Boolean(cepFeito) || Boolean(forcar); cepFeito = n; // CEP diferente do que estava: o endereço novo substitui o antigo
          avisoCep.textContent = 'Buscando o endereço do CEP…';
          const r = await C.cep(n); if (D.digitos(cep.value) !== n) return;
          if (r.erro) { avisoCep.textContent = 'CEP ' + falha[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha o endereço à mão.'; return; }
          const paresCep = [[rua, r.dados.logradouro], [bairro, r.dados.bairro], [cidade, r.dados.cidade], [uf, r.dados.uf]];
          if (trocouCep) paresCep.forEach(([alvo, valor]) => { alvo.value = valor || ''; }); else completar(paresCep);
          avisoCep.textContent = trocouCep ? 'CEP novo: rua, bairro, cidade e UF foram trocados. Confira o número e o complemento.' : 'Endereço do CEP conferido. Confira e informe o número.';
        };
        // Enter no campo busca na hora e troca os dados (pedido do Rodrigo, 17/11/2026), sem salvar o formulário.
        cep.addEventListener('input', () => buscarCep(false)); cep.addEventListener('keydown', aoEnter(buscarCep));
        const buscarCnpj = async (forcar) => {
          const n = D.digitos(cnpj.value); if (n.length !== 14 || (n === cnpjFeito && !forcar) || !R().cnpjValid(n)) return;
          const trocouCnpj = Boolean(cnpjFeito) || Boolean(forcar); cnpjFeito = n; // CNPJ diferente do que estava é outra empresa: os dados dela substituem os antigos
          avisoCnpj.textContent = 'Buscando os dados da empresa pelo CNPJ…';
          const r = await C.cnpj(n); if (D.digitos(cnpj.value) !== n) return;
          if (r.erro) { avisoCnpj.textContent = 'CNPJ ' + falha[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha os dados à mão.'; return; }
          const x = r.dados; const en = x.endereco || {};
          const paresCnpj = [[razao, x.razaoSocial], [fantasia, x.nomeFantasia], [cep, en.cep], [rua, en.logradouro], [numero, en.numero], [complemento, en.complemento], [bairro, en.bairro], [cidade, en.cidade], [uf, en.uf]];
          if (trocouCnpj) paresCnpj.forEach(([alvo, valor]) => { alvo.value = valor || ''; }); else completar(paresCnpj);
          cepFeito = D.digitos(cep.value);
          avisoCnpj.textContent = trocouCnpj ? 'CNPJ novo: razão social, nome fantasia e endereço foram trocados pelos dados dele. Confira antes de salvar.' : 'Dados do CNPJ conferidos; só os campos vazios foram preenchidos. Confira antes de salvar.';
        };
        cnpj.addEventListener('input', () => buscarCnpj(false)); cnpj.addEventListener('keydown', aoEnter(buscarCnpj));

        /* Contato do financeiro e do representante: "O mesmo da etapa anterior" no quadro Sim / Não (como em Fornecedores) */
        function contatoBloco(dados, sufixo, anterior, titulo) {
          const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, titulo));
          const mesmo = U.quadroSituacao('O mesmo da etapa anterior', Boolean(dados && dados.mesmo), { textos: ['Sim', 'Não'], dica: 'Preenche o nome, o WhatsApp e o e-mail com os da etapa anterior.', aoMudar: () => pintar() });
          mesmo.classList.add('compras-largo');
          mesmo.querySelector('.account-status-switch').setAttribute('aria-label', 'O mesmo da etapa anterior (' + sufixo + ')');
          const n = texto(dados && dados.nome); const w = tel(dados && dados.whatsapp); const m = email(dados && dados.email);
          const pintar = () => {
            const copia = mesmo.ativo;
            if (copia) { const a = anterior(); n.value = a.nome; w.value = a.whatsapp; m.value = a.email; }
            [n, w, m].forEach((i) => { i.readOnly = copia; });
          };
          s.append(mesmo, campo('Nome do ' + sufixo, n), campo('WhatsApp do ' + sufixo, w), campo('E-mail do ' + sufixo, m));
          return { no: s, mesmo, nome: n, whatsapp: w, email: m, pintar, ler: () => ({ mesmo: mesmo.ativo, nome: n.value.trim(), whatsapp: w.value.trim(), email: m.value.trim() }) };
        }
        // O responsável financeiro é o próprio contato da etapa 2. Só o cadastro antigo com um financeiro diferente
        // (mesmo: false) guarda outra pessoa; ela continua no registro, sem ser sobrescrita.
        const contatoAtual = () => ({ nome: contatoNome.value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim() });
        const finAntigo = v.financeiro && v.financeiro.mesmo === false && (v.financeiro.nome || v.financeiro.whatsapp || v.financeiro.email) ? v.financeiro : null;
        const fin = { ler: () => finAntigo || { mesmo: true, ...contatoAtual() }, pintar: () => {} };
        const rep = contatoBloco(v.representante, 'responsável geral', () => contatoAtual(), 'Dados do responsável geral da empresa');
        const repCargo = seletor(D.CARGOS_REPRESENTANTE, (v.representante && v.representante.cargo) || '', 'Selecione');
        rep.no.append(campo('Cargo na empresa', repCargo));

        /* Informações de Pagamento (sempre à vista): forma de pagamento, recorrência, valor e referência ao salário mínimo (mesmos componentes de Fornecedores) */
        const ct = v.contrato || {};
        const mensal = U.quadroSituacao('É cliente mensal?', Boolean(ct.clienteMensal), { textos: ['Sim', 'Não'], dica: 'Cliente mensal: período do dia 1 ao último dia do mês, boleto e vencimento todo dia 10.' });
        mensal.classList.add('compras-largo');
        mensal.querySelector('.account-status-switch').setAttribute('aria-label', 'É cliente mensal?');
        // Informações de cobrança (17/11/2026, Rodrigo): só a pergunta "É cliente mensal?". Forma de pagamento, recorrência,
        // valor, salário mínimo, vigência, reajuste e observações saíram da tela; o que já estava gravado em contrato fica
        // guardado como está. Ligar "cliente mensal" grava boleto e vencimento no dia 10, a regra de antes.
        const cDados = el('fieldset', 'compras-fieldset'); cDados.append(el('legend', null, 'Informações de cobrança'), mensal);
        const lerContrato = () => ({
          ...ct, tem: true, clienteMensal: mensal.ativo,
          ...(mensal.ativo ? { formaPagamento: D.CLIENTE_MENSAL.formaPagamento, vencimentoDia: D.CLIENTE_MENSAL.vencimentoDia } : ct.clienteMensal ? { formaPagamento: '', vencimentoDia: null } : {}),
        });

        /* Revisão (última etapa do completo) */
        const revisao = el('div', 'compras-largo');

        /* Controles principais */
        const m0 = c ? v : (opcoes.modelo || v);
        let tipo = m0.tipoPessoa === 'juridica' ? 'juridica' : 'fisica';
        // Cliente novo cadastrado aqui dentro (não o link nem a prévia): Pessoa Jurídica abre no cadastro em etapas, com a barra
        // de evolução, como era antes de 17/11/2026 (pedido do Rodrigo); Pessoa Física continua numa página só.
        const novoPorDentro = !c && !opcoes.externo && !opcoes.previa;
        let cadastro = m0.cadastro === 'completo' || (novoPorDentro && tipo === 'juridica') ? 'completo' : 'simples';
        let passo = 0;
        // Uma só seção no alto: Pessoa Física e Pessoa Jurídica lado a lado; o Tipo de cadastro (Simples | Completo) mora dentro do cartão marcado.
        // A escolha só muda a tela depois de pedirTroca/aplicar (que pode pedir confirmação); pintarTopo() redesenha a partir de tipo e cadastro.
        const ICO_PF = '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>';
        const cartoesTopo = el('div', 'compras-tipo-cartoes'); cartoesTopo.setAttribute('role', 'radiogroup'); cartoesTopo.setAttribute('aria-label', 'Tipo de cliente');
        const topo = ['fisica', 'juridica'].map((id) => {
          const box = el('div', 'compras-tipo-cartao');
          const cab = el('button', 'compras-tipo-cab'); cab.type = 'button'; cab.setAttribute('role', 'radio');
          const ic = el('span', 'compras-linha-icone'); ic.setAttribute('aria-hidden', 'true'); ic.innerHTML = U.svg(id === 'fisica' ? ICO_PF : U.ICONES.fornecedor);
          const tx = el('span', 'compras-cartao-texto'); tx.append(el('strong', null, id === 'fisica' ? 'PF - Pessoa Física' : 'PJ - Pessoa Jurídica'));
          const marca = el('span', 'compras-cartao-marca'); marca.setAttribute('aria-hidden', 'true'); marca.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
          cab.append(ic, tx, marca);
          cab.onclick = () => { if (id !== tipo) pedirTroca('tipo', id === 'juridica'); };
          const seg = el('div', 'compras-segmentado'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Tipo de cadastro');
          const segBtns = [['simples', 'Simples'], ['completo', 'Completo']].map(([cid, rot]) => {
            const b = el('button', null, rot); b.type = 'button'; b.setAttribute('role', 'radio');
            b.onclick = () => { if (id === tipo && cid !== cadastro) pedirTroca('cadastro', cid === 'completo'); };
            seg.append(b); return [cid, b];
          });
          box.append(cab, seg); cartoesTopo.append(box);
          return { id, box, cab, seg, segBtns };
        });
        function pintarTopo() {
          topo.forEach((t) => {
            // Novo Cliente (manual), prévia e link: só Pessoa Física / Pessoa Jurídica; o Simples | Completo fica só para quem edita um cadastro que já existe.
            const on = t.id === tipo; t.box.dataset.marcado = String(on); t.cab.setAttribute('aria-checked', String(on)); t.seg.hidden = !on || !c;
            t.segBtns.forEach(([cid, b]) => { b.setAttribute('aria-checked', String(on && cid === cadastro)); });
          });
        }
        const tipoSw = { set ativo(_) { pintarTopo(); }, get ativo() { return tipo === 'juridica'; } };
        const cadSw = { set ativo(_) { pintarTopo(); }, get ativo() { return cadastro === 'completo'; } };
        const tipoBox = el('div', 'account-status compras-situacao-quadro compras-tipo-pessoa'); tipoBox.append(el('span', null, 'Tipo de cliente'), cartoesTopo);
        pintarTopo();
        const controles = el('div', 'compras-largo compras-cliente-controles'); controles.append(tipoBox);
        const barraBox = el('div', 'compras-largo');
        const corpo = el('div', 'compras-largo');
        const erroEtapa = el('p', 'profiles-error compras-largo'); erroEtapa.setAttribute('role', 'alert');
        const nav = el('div', 'compras-form-rodape compras-etapas-nav compras-largo');
        let barra = null; let passos = [];

        const temDadosPF = () => [nome, cpf].some((i) => i.value.trim()) || Boolean(anivPF.valor());
        const temDadosPJ = () => [cnpj, razao, fantasia, contatoNome].some((i) => i.value.trim()) || rep.ler().nome;
        const temDadosCompleto = () => (tipo === 'fisica' ? [cpf, cep, rua, numero, bairro, cidade].some((i) => i.value.trim()) : [regime, cep, rua, contatoNome].some((i) => i.value.trim()) || mensal.ativo || rep.ler().nome);
        /** Trocar de tipo ou de modalidade nunca apaga: o que já foi digitado fica guardado. Pede confirmação quando há risco de a pessoa achar que perdeu. */
        function pedirTroca(qual, ligado) {
          const novoTipo = qual === 'tipo' ? (ligado ? 'juridica' : 'fisica') : tipo; const novoCad = qual === 'cadastro' ? (ligado ? 'completo' : 'simples') : cadastro;
          const reverter = () => { (qual === 'tipo' ? tipoSw : cadSw).ativo = !ligado; };
          const risco = qual === 'tipo' ? (tipo === 'fisica' ? temDadosPF() : temDadosPJ()) : (cadastro === 'completo' && temDadosCompleto());
          if (!risco) { aplicar(novoTipo, novoCad); return; }
          let confirmado = false;
          U.dialogo({
            titulo: qual === 'tipo' ? 'Trocar o tipo de pessoa?' : 'Passar para o cadastro simples?', ...cores(), rotuloSalvar: 'Trocar',
            montar: (f2) => { f2.append(el('p', null, qual === 'tipo'
              ? 'Os dados de ' + (tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica') + ' ficam guardados no cadastro, mas não aparecem enquanto ele for ' + (novoTipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica') + '. Nada é apagado.'
              : 'Os dados do cadastro completo ficam guardados, mas só aparecem quando o cadastro voltar a ser Completo. Nada é apagado.')); },
            salvar: () => { confirmado = true; aplicar(novoTipo, novoCad); },
            aoFechar: () => { if (!confirmado) reverter(); },
          });
        }
        function aplicar(novoTipo, novoCad) { tipo = novoTipo; cadastro = novoPorDentro ? (novoTipo === 'juridica' ? 'completo' : 'simples') : novoCad; passo = 0; desenhar(); }

        /* Páginas de cada modalidade (os mesmos campos mudam de lugar) */
        const bloco = (...nos) => nos;
        // Pessoa jurídica em etapas: na 1ª etapa tudo é obrigatório, menos o complemento; o " *" entra e sai do rótulo com a modalidade.
        const obrigatorioNaPJ = [F.fantasia, F.regime, ...[cep, rua, numero, bairro, cidade, uf].map((i) => i.closest('label'))];
        function marcarObrigatorios() {
          const sim = tipo === 'juridica' && cadastro === 'completo';
          obrigatorioNaPJ.forEach((l) => { const r = l && l.querySelector('.compras-rotulo'); if (!r) return; const base = r.textContent.endsWith(' *') ? r.textContent.slice(0, -2) : r.textContent; r.textContent = sim ? base + ' *' : base; });
        }
        function paginas() {
          marcarObrigatorios();
          // A "Situação do cliente" (ativo/inativo) aparece em toda modalidade do cadastro feito aqui dentro; no link de cadastro, não.
          const sit = opcoes.externo ? [] : [situacao];
          // Cada assunto dentro de um quadro com borda e título (pedido do Rodrigo, 17/11/2026): nenhum campo fica solto.
          const quadro = (legenda, ...nos) => { const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, legenda), ...nos); return q; };
          if (tipo === 'fisica' && cadastro === 'simples') return [bloco(...sit, quadro('Dados pessoais', F.nome, F.whats, F.mail, F.nasc), endSw, sEnd)];
          if (tipo === 'fisica') {
            const comp = el('fieldset', 'compras-fieldset'); comp.append(el('legend', null, 'Sorteio'), el('p', 'profiles-note', 'Sorteio — Em definição'), el('small', 'profiles-note', 'Funcionalidade futura: por enquanto não há número, participação, prêmio nem regra de sorteio.'));
            return [bloco(...sit, quadro('Dados pessoais', F.nome, F.cpf, F.whats, F.mail, F.nasc)), bloco(sEnd), bloco(comp), bloco(revisao)];
          }
          if (cadastro === 'simples') return [bloco(...sit, quadro('Dados da empresa', F.cnpj, avisoCnpj, F.razao, F.fantasia, F.whats, F.mail), endSw, sEnd)];
          // 17/11/2026 (Rodrigo): o contato e o financeiro viram uma etapa só, "Dados do responsável financeiro": o quadro
          // "Dados do responsável" em cima e as Informações de Pagamento embaixo; não existe mais um contato do financeiro à parte.
          const contato = el('fieldset', 'compras-fieldset'); contato.append(el('legend', null, 'Dados do responsável'), F.contatoNome, F.whats, F.mail, aniv.no);
          return [bloco(...sit, quadro('Dados da empresa', F.cnpj, avisoCnpj, F.razao, F.fantasia, F.regime), sEnd), bloco(contato, cDados), bloco(rep.no), bloco(revisao)];
        }
        /** Cadastro lido do formulário: só o tipo e a modalidade em uso (o resto do registro fica como está). */
        function pintarEndereco() { mostrar(sEnd, cadastro === 'completo' || endSw.ativo); }
        function ler() {
          const base = { tipoPessoa: tipo, cadastro, ...(opcoes.externo ? {} : { situacao: situacao.ativo ? 'ativo' : 'inativo' }) };
          const endereco = cadastro === 'simples' && !endSw.ativo ? (c && c.endereco ? c.endereco : undefined) : { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value };
          if (tipo === 'fisica') return { ...base, nome: nome.value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim(), aniversario: anivPF.valor(), nascimento: v.nascimento && v.nascimento.slice(5) === anivPF.valor() ? v.nascimento : undefined, endereco, ...(cadastro === 'completo' ? { cpf: cpf.value.trim() } : {}) };
          if (cadastro === 'simples') return { ...base, cnpj: cnpj.value.trim(), razaoSocial: razao.value.trim(), nomeFantasia: fantasia.value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim(), endereco };
          fin.pintar(); rep.pintar();
          return { ...base, cnpj: cnpj.value.trim(), razaoSocial: razao.value.trim(), nomeFantasia: fantasia.value.trim(), regimeTributario: regime.value, endereco, whatsapp: whats.value.trim(), email: mail.value.trim(),
            contatoNome: contatoNome.value.trim(), contatoAniversario: aniv.valor(), financeiro: fin.ler(), representante: { ...rep.ler(), cargo: repCargo.value }, contrato: lerContrato() };
        }
        const registro = () => ({ ...(c || {}), ...ler(), id: c ? c.id : undefined });
        const conferir = () => D.validarClienteEtapas(registro(), R(), { clientes: clientes() });

        const voltar = botao('Voltar', () => ir(passo - 1), 'btn secondary footer-cancel-accent form-back-action');
        voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => { const falta = conferir()[passo]; if (falta) { erroEtapa.textContent = falta; U.sinalizarObrigatorios(passos[passo]); return; } ir(passo + 1); }, 'btn form-next-action');
        const cancelar = botao('Cancelar', () => dlg.close(), 'btn secondary footer-cancel-accent');
        const salvarFim = el('button', 'btn', 'Salvar Cliente'); salvarFim.type = 'submit';
        function desenhar() {
          tipoSw.ativo = tipo === 'juridica'; cadSw.ativo = cadastro === 'completo'; pintarEndereco();
          // Pessoa jurídica em etapas: o e-mail do responsável é o que recebe notas e cobranças, e é obrigatório (17/11/2026, Rodrigo).
          const pjEtapas = tipo === 'juridica' && cadastro === 'completo';
          const rotE = pjEtapas ? 'E-mail (financeiro e/ou fiscal) *' : tipo === 'fisica' ? 'E-mail *' : 'E-mail';
          F.mail.querySelector('.compras-rotulo').textContent = rotE; mail.setAttribute('aria-label', rotE);
          mostrar(ajudaMail, pjEtapas);
          const pags = paginas();
          passos = pags.map((nos) => { const d = el('div', 'compras-etapa'); d.append(...nos); return d; });
          corpo.replaceChildren(...passos);
          const nomes = D.etapasCliente(tipo, cadastro);
          if (nomes.length) {
            barra = window.CicluzStepper.create({ steps: nomes.map((label) => ({ label })), current: 0, label: 'Etapas do cadastro do cliente', onSelect: (i) => { if (c || i <= passo) ir(i); } });
            barraBox.replaceChildren(barra.el);
          } else { barra = null; barraBox.replaceChildren(); }
          ir(0);
        }
        function ir(i) {
          passo = Math.max(0, Math.min(passos.length - 1, i));
          passos.forEach((p, k) => mostrar(p, k === passo));
          if (barra) barra.update(nomes0(), passo);
          erroEtapa.textContent = '';
          const ultima = passo === passos.length - 1; const etapas = passos.length > 1;
          if (etapas && ultima) {
            // Cada bloco da revisão leva à etapa de onde os dados vieram.
            const etapaDoBloco = { 'Dados cadastrais': 0, 'Dados pessoais': 0, 'Endereço': tipo === 'juridica' ? 0 : 1, 'Informações complementares': 2, 'Dados do responsável financeiro da empresa': 1, 'Dados do responsável geral da empresa': 2 };
            revisao.replaceChildren(el('p', 'profiles-note', 'Confira os dados antes de salvar. Para corrigir, toque em Editar no bloco.'), dlDe(secoesCliente(registro()), (t) => (t in etapaDoBloco ? () => ir(etapaDoBloco[t]) : null)));
          }
          U.subirAoTopo(barraBox, form);
          nav.replaceChildren(...(etapas ? [passo > 0 && voltar, !ultima && avancar, (c || ultima) && salvarFim] : [cancelar, salvarFim]).filter(Boolean));
        }
        const nomes0 = () => D.etapasCliente(tipo, cadastro).map((label) => ({ label }));
        form.append(...(opcoes.externo ? [] : [controles]), barraBox, corpo, erroEtapa, nav);
        desenhar();
        return { ler, registro, conferir, ir, datas: [] };
      },
      salvar: (ctx) => {
        if (opcoes.previa) return 'Isto é só uma prévia do formulário: nada é salvo.';
        if (ctx.datas.some((d) => !d.checkValidity())) return 'Confira as datas: use DD/MM/AA.';
        const dados = ctx.ler();
        const faltas = ctx.conferir(); const k = faltas.findIndex(Boolean);
        if (k >= 0) { ctx.ir(k); return faltas[k]; }
        const agora = S.agoraIso();
        const ok = S.transacao((d) => {
          if (!Array.isArray(d.clientes)) d.clientes = [];
          if (c) {
            const x = d.clientes.find((y) => y.id === c.id);
            if (!x) throw new Error('cliente');
            if (x.cadastro !== dados.cadastro || x.tipoPessoa !== dados.tipoPessoa) x.historico = [...(x.historico || []), { em: agora, de: (x.tipoPessoa || '') + '/' + (x.cadastro || ''), para: dados.tipoPessoa + '/' + dados.cadastro }];
            Object.assign(x, dados, { atualizadoEm: agora });
          } else d.clientes.push({ id: S.novoId('cl'), situacao: 'ativo', ...dados, ...(opcoes.externo ? { situacao: 'inativo', statusCadastro: 'recebido', origem: 'link-teste' } : {}), criadoEm: agora, atualizadoEm: agora });
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        render();
        if (opcoes.externo) { enviado = true; window.CicluzConviteLink.confirmarRecebimento(cores()); return; }
        U.avisar('Cliente salvo.');
      },
    });
  }

  /* ---------------------------------------------------------------- Visualização e situação ---------------------------------------------------------------- */
  function visualizar(c) {
    U.dialogo({
      titulo: 'Cliente — ' + D.nomeCliente(c), ...cores(), largo: true,
      montar: (form) => {
        form.append(el('p', 'profiles-note compras-largo', rotuloModalidade(c) + (c.situacao === 'inativo' ? ' · Inativo' : '')), dlDe(secoesCliente(c)));
      },
    });
  }
  function alternarSituacao(c) {
    const run = () => { const ok = S.transacao((d) => { const x = d.clientes.find((y) => y.id === c.id); x.situacao = c.situacao === 'inativo' ? 'ativo' : 'inativo'; x.atualizadoEm = S.agoraIso(); }); if (ok) render(); return ok ? undefined : 'Não foi possível salvar neste navegador.'; };
    if (c.situacao === 'inativo') run();
    else U.confirmar('Desativar cliente', '"' + D.nomeCliente(c) + '" fica inativo, mas continua cadastrado: nada é apagado.', 'Desativar', run, cores());
  }

  /* ---------------------------------------------------------------- Lista (mesmo padrão de DES - Fornecedores) ---------------------------------------------------------------- */
  let tela = null; let busca = '';
  function abrir() {
    if (!tela) {
      const caminho = (typeof sections !== 'undefined' && sections[0] ? sections[0][0] : 'Entradas · Vendas') + ' / Cadastros Geral / VND - Clientes';
      tela = U.criarTela({ id: 'vnd-clientes', titulo: 'VND - Clientes', caminho, icone: 'cadastro', voltar: () => menuBack(0, 'Cadastros Geral')(), ...cores() });
      U.atalho(tela, 'Novo cliente', 'M12 5v14M5 12h14', () => editarCliente(), { criar: true });
    }
    tela.ativar();
    render();
  }
  function render() {
    if (!tela) return;
    const todos = clientes();
    const lista = todos.filter((c) => U.dobrar([D.nomeCliente(c), c.nome, c.razaoSocial, c.nomeFantasia, c.cpf, c.cnpj, c.whatsapp, c.email].join(' ')).includes(U.dobrar(busca)))
      .sort((a, b) => (a.situacao === b.situacao ? 0 : a.situacao === 'inativo' ? 1 : -1) || D.nomeCliente(a).localeCompare(D.nomeCliente(b), 'pt-BR'));
    const caixa = U.buscaRodape(tela, 'Buscar cliente', (valor) => { busca = valor; if (tela.view.classList.contains('show')) render(); });
    const linhas = el('div', 'compras-lista compras-lista-grade'); U.arrastarParaRolar(linhas);
    const ativos = todos.filter((c) => c.situacao !== 'inativo').length;
    const ponta = U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' cliente ativo' : ' clientes ativos'));
    const sec = U.secao('Clientes', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Cliente', 'Cadastrar cliente', () => editarCliente()), ...(window.CicluzConviteLink ? [window.CicluzConviteLink.botao({ cores: cores(), modelos: MODELOS_LINK, visualizar: (id) => editarCliente(null, { modelo: MODELOS_LINK.find((m) => m.id === id).modelo, previa: true }) })] : []));
    sec.append(linhas);
    if (!lista.length) linhas.append(U.vazio(busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.', busca ? '' : 'Use "Novo Cliente" para escolher Pessoa Física ou Jurídica e o cadastro Simples ou Completo.'));
    else {
      const cab = U.cabecalhoColunas('grade-cliente', [
        { chave: 'nome', rotulo: 'Cliente' }, { chave: 'tipo', rotulo: 'Tipo de cliente', ocultavel: true }, { chave: 'cadastro', rotulo: 'Tipo de cadastro', ocultavel: true },
        { chave: 'whatsapp', rotulo: 'WhatsApp', ocultavel: true }, { chave: 'email', rotulo: 'E-mail', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
      ], { lista: linhas, preferencia: 'cicluz-clientes-colunas' });
      linhas.append(cab); ponta.append(cab.botaoGeral);
      lista.forEach((c) => linhas.append(linhaCliente(c, linhas)));
    }
    tela.body.replaceChildren(caixa, U.nota(todos.length + ' cliente(s). Cliente não é excluído: use a seta da linha para editar ou desativar.'), sec);
  }
  function linhaCliente(c, linhas) {
    const nomeC = D.nomeCliente(c) || '(sem nome)'; const inativo = c.situacao === 'inativo';
    const row = U.linhaLista({
      icones: [{ icone: c.tipoPessoa === 'juridica' ? ICONE_PJ : ICONE_PF, rotulo: nomeDe(D.TIPOS_PESSOA_CLIENTE, c.tipoPessoa) }], grade: 'grade-cliente',
      colunas: [{ chave: 'nome', conteudo: nomeC }, { chave: 'tipo', conteudo: nomeDe(D.TIPOS_PESSOA_CLIENTE, c.tipoPessoa) }, { chave: 'cadastro', conteudo: nomeDe(D.TIPOS_CADASTRO_CLIENTE, c.cadastro) },
        { chave: 'whatsapp', conteudo: c.whatsapp }, { chave: 'email', conteudo: c.email }],
      estado: c.statusCadastro === 'recebido' ? 'Recebido' : inativo ? 'Inativo' : 'Ativo',
      acoes: { rotulo: nomeC, lista: linhas, aoEditar: () => editarCliente(c), aoExcluir: () => alternarSituacao(c) },
    });
    if (inativo) row.classList.add('inativo');
    // Tocar na linha mostra os dados; a seta revela o lápis (editar) e o botão de ativar/desativar no lugar da lixeira.
    const arrow = row.querySelector('.account-action-toggle'); const drawer = row.querySelector('.account-row-actions');
    const off = [...drawer.children].find((b) => /^Excluir/.test(b.getAttribute('aria-label') || ''));
    const rotuloOff = (inativo ? 'Ativar ' : 'Desativar ') + nomeC;
    off.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (inativo ? 'm5 12 4 4L19 6' : 'M5.6 5.6l12.8 12.8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z') + '"/></svg>';
    off.title = rotuloOff; off.setAttribute('aria-label', rotuloOff);
    row.onclick = (e) => { if (e.target.closest('button')) return; if (!drawer.hidden) { drawer.hidden = true; arrow.setAttribute('aria-expanded', 'false'); return; } visualizar(c); };
    row.onkeydown = (e) => { if (e.target === row && e.key === 'Enter') { e.preventDefault(); visualizar(c); } };
    row.setAttribute('aria-label', 'Visualizar ' + nomeC);
    return row;
  }

  window.CicluzComprasClientes = { abrir, secoesCliente, MODELOS_LINK, abrirExterno: (modelo) => editarCliente(null, { modelo, externo: true }) };
})();
