/*
 * Configurações → Empresa → Dados da Empresa (pedido do Rodrigo, 17/11/2026).
 * Um cadastro só, o da própria empresa: os campos da 1ª etapa do cliente pessoa jurídica (CNPJ, razão social, nome
 * fantasia, regime tributário e endereço) e os responsáveis pela empresa. Tocar no cartão abre direto a ficha:
 * com dados já gravados ela abre só para leitura, com o botão Editar; Editar libera os campos e mostra o Salvar.
 * Responsáveis: um bloco por pessoa ("Dados do responsável"; escolhido o cargo, o título leva o cargo), com o botão
 * de acrescentar. Cargo: Proprietário, Sócio-proprietário, Diretor não sócio ou Procurador (lista própria da empresa;
 * fornecedor e cliente seguem com a lista deles).
 * Fica em dados.empresa, dentro do documento do Compras (cicluz-compras-v1): campo novo e opcional, sem migração.
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos;
  const U = window.CicluzComprasUI;
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  if (!A || !U || !D || !S) return;
  const { el, botao, campo, entrada, seletor } = U;
  const regras = () => window.CicluzFieldRules;
  const C = () => window.CicluzConsultas;
  const mascara = (input, fn) => { input.addEventListener('input', () => { input.value = fn(input.value); }); return input; };
  const cheio = (v) => String(v || '').trim();
  const CARGOS_EMPRESA = [['proprietario', 'Proprietário'], ['socio-proprietario', 'Sócio-proprietário'], ['diretor-nao-socio', 'Diretor não sócio'], ['procurador', 'Procurador']];
  const nomeDoCargo = (id) => (CARGOS_EMPRESA.find(([x]) => x === id) || [])[1] || '';
  const tituloDoResponsavel = (cargo) => 'Dados do responsável' + (nomeDoCargo(cargo) ? ' — ' + nomeDoCargo(cargo) : '');

  /** Responsáveis gravados; o primeiro formato (um responsável só, em "responsavel") vira o primeiro da lista. */
  function responsaveisDe(v) {
    const lista = Array.isArray(v.responsaveis) ? v.responsaveis : v.responsavel ? [v.responsavel] : [];
    return lista.map((r) => ({ id: r.id || S.novoId('resp'), nome: r.nome || '', whatsapp: r.whatsapp || '', email: r.email || '', cargo: nomeDoCargo(r.cargo) ? r.cargo : '' }));
  }

  /** O que impede salvar ('' quando está em ordem): empresa e endereço obrigatórios, menos o complemento; responsáveis opcionais. */
  function validarEmpresa(x) {
    const e = x.endereco || {};
    if (!regras().cnpjValid(x.cnpj)) return 'Informe um CNPJ válido (14 dígitos).';
    if (!cheio(x.razaoSocial)) return 'Informe a razão social.';
    if (!cheio(x.nomeFantasia)) return 'Informe o nome fantasia.';
    if (!D.REGIMES_TRIBUTARIOS.some(([id]) => id === x.regimeTributario)) return 'Selecione o regime tributário.';
    if (D.digitos(e.cep).length !== 8) return 'Informe o CEP (8 dígitos).';
    if (!cheio(e.logradouro)) return 'Informe a rua ou o logradouro.';
    if (!cheio(e.numero)) return 'Informe o número do endereço.';
    if (!cheio(e.bairro)) return 'Informe o bairro.';
    if (!cheio(e.cidade)) return 'Informe a cidade.';
    if (!e.uf) return 'Selecione a UF.';
    // Responsáveis: o que vier preenchido precisa estar no formato.
    const lista = x.responsaveis || [];
    for (let i = 0; i < lista.length; i++) {
      const r = lista[i]; const quem = 'responsável ' + (i + 1);
      const fone = D.digitos(r.whatsapp);
      if (fone && (fone.length < 10 || fone.length > 11)) return 'WhatsApp do ' + quem + ' inválido: informe o DDD e o número.';
      const mail = cheio(r.email);
      if (mail && (mail.includes(' ') || mail.split('@').length !== 2 || !mail.split('@')[0] || !mail.split('@')[1].includes('.'))) return 'E-mail do ' + quem + ' inválido.';
      if (r.cargo && !nomeDoCargo(r.cargo)) return 'Cargo do ' + quem + ' inválido.';
    }
    return '';
  }

  function abrir() {
    const v = S.dados.empresa || {}; const e = v.endereco || {};
    const jaTemDados = Boolean(cheio(v.cnpj));
    let editando = !jaTemDados;
    const dlg = U.dialogo({
      titulo: 'Dados da Empresa', cor: A.COR, corTexto: A.COR_TEXTO, largo: true, classe: 'compras-form-padrao', rotuloSalvar: 'Salvar',
      montar: (form, d) => {
        const texto = (valor, extra = {}) => entrada('text', valor || '', { maxLength: 120, ...extra });
        const cnpj = mascara(entrada('text', v.cnpj || '', { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }), regras().cnpjMask);
        const razao = texto(v.razaoSocial, { maxLength: 160 }); const fantasia = texto(v.nomeFantasia);
        const regime = seletor(D.REGIMES_TRIBUTARIOS, v.regimeTributario || '', 'Selecione');
        const cep = mascara(entrada('text', e.cep || '', { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9 }), C().cepMask);
        const rua = texto(e.logradouro, { maxLength: 160 }); const numero = texto(e.numero, { maxLength: 20 }); const complemento = texto(e.complemento, { maxLength: 80 });
        const bairro = texto(e.bairro, { maxLength: 80 }); const cidade = texto(e.cidade, { maxLength: 80 }); const uf = seletor(C().UFS, e.uf || '', 'UF');
        const avisoCnpj = el('p', 'profiles-note compras-largo'); avisoCnpj.setAttribute('role', 'status');
        const avisoCep = el('p', 'profiles-note compras-largo'); avisoCep.setAttribute('role', 'status');
        // Buscas do CNPJ e do CEP (consultas-publicas.js): só preenchem o que está vazio e nunca trocam o que a pessoa digitou.
        const completar = (pares) => pares.forEach(([alvo, valor]) => { if (valor && !alvo.value.trim()) alvo.value = valor; });
        const falha = { 'nao-encontrado': 'não encontrado', indisponivel: 'consulta indisponível agora' };
        let cepFeito = D.digitos(cep.value); let cnpjFeito = D.digitos(cnpj.value);
        cep.addEventListener('input', async () => {
          const n = D.digitos(cep.value); if (n.length !== 8 || n === cepFeito) return; cepFeito = n;
          avisoCep.textContent = 'Buscando o endereço do CEP…';
          const r = await C().cep(n); if (D.digitos(cep.value) !== n) return;
          if (r.erro) { avisoCep.textContent = 'CEP ' + falha[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha o endereço à mão.'; return; }
          completar([[rua, r.dados.logradouro], [bairro, r.dados.bairro], [cidade, r.dados.cidade], [uf, r.dados.uf]]);
          avisoCep.textContent = 'Endereço do CEP conferido. Confira e informe o número.';
        });
        cnpj.addEventListener('input', async () => {
          const n = D.digitos(cnpj.value); if (n.length !== 14 || n === cnpjFeito || !regras().cnpjValid(n)) return; cnpjFeito = n;
          avisoCnpj.textContent = 'Buscando os dados da empresa pelo CNPJ…';
          const r = await C().cnpj(n); if (D.digitos(cnpj.value) !== n) return;
          if (r.erro) { avisoCnpj.textContent = 'CNPJ ' + falha[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha os dados à mão.'; return; }
          const x = r.dados; const en = x.endereco || {};
          completar([[razao, x.razaoSocial], [fantasia, x.nomeFantasia], [cep, en.cep], [rua, en.logradouro], [numero, en.numero], [complemento, en.complemento], [bairro, en.bairro], [cidade, en.cidade], [uf, en.uf]]);
          cepFeito = D.digitos(cep.value);
          avisoCnpj.textContent = 'Dados do CNPJ conferidos; só os campos vazios foram preenchidos. Confira antes de salvar.';
        });
        const empresa = el('fieldset', 'compras-fieldset');
        empresa.append(el('legend', null, 'Dados da empresa'), campo('CNPJ *', cnpj), avisoCnpj, campo('Razão Social *', razao), campo('Nome Fantasia *', fantasia), campo('Regime tributário *', regime));
        const endereco = el('fieldset', 'compras-fieldset');
        endereco.append(el('legend', null, 'Endereço'), campo('CEP *', cep), campo('Rua / logradouro *', rua), campo('Número *', numero), campo('Complemento', complemento), campo('Bairro *', bairro), campo('Cidade *', cidade), campo('UF *', uf), avisoCep);

        /* Responsáveis: um bloco por pessoa; o título acompanha o cargo escolhido; o botão acrescenta mais um. */
        const responsaveis = responsaveisDe(v);
        if (!responsaveis.length) responsaveis.push({ id: S.novoId('resp'), nome: '', whatsapp: '', email: '', cargo: '' });
        const CAD = window.CicluzComprasCadastros;
        const caixaResp = el('div', 'compras-etapa compras-largo');
        const adicionar = botao('Adicionar responsável', () => { responsaveis.push({ id: S.novoId('resp'), nome: '', whatsapp: '', email: '', cargo: '' }); desenharResponsaveis(); pintarModo(); }, 'btn');
        const linhaAdicionar = el('div', 'compras-form-rodape compras-largo'); linhaAdicionar.append(adicionar);
        function desenharResponsaveis() {
          caixaResp.replaceChildren(...responsaveis.map((r, i) => {
            const bloco = el('fieldset', 'compras-fieldset');
            const titulo = el('legend', null, tituloDoResponsavel(r.cargo));
            const cargo = seletor(CARGOS_EMPRESA, r.cargo, 'Selecione');
            const nome = texto(r.nome);
            const whats = entrada('tel', r.whatsapp, { inputMode: 'numeric', placeholder: '(00) 00000-0000' });
            if (CAD && CAD.mascaraTelefone) mascara(whats, CAD.mascaraTelefone);
            const mail = entrada('email', r.email, { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); mail.dataset.textoLivre = '1';
            cargo.addEventListener('change', () => { r.cargo = cargo.value; titulo.textContent = tituloDoResponsavel(r.cargo); });
            nome.addEventListener('input', () => { r.nome = nome.value; });
            whats.addEventListener('input', () => { r.whatsapp = whats.value; });
            mail.addEventListener('input', () => { r.email = mail.value; });
            bloco.append(titulo, campo('Cargo na empresa', cargo), campo('Nome do responsável', nome), campo('WhatsApp do responsável', whats), campo('E-mail do responsável', mail));
            if (responsaveis.length > 1) {
              const tirar = botao('Remover', () => { responsaveis.splice(i, 1); desenharResponsaveis(); pintarModo(); }, 'btn secondary perigo-texto');
              const pe = el('div', 'compras-form-rodape compras-largo compras-empresa-remover'); pe.append(tirar);
              bloco.append(pe);
            }
            return bloco;
          }));
        }
        desenharResponsaveis();

        /* Leitura × edição: com dados gravados, a ficha abre travada e o Editar libera; sem dados, já abre para preencher. */
        const editar = botao('Editar', () => { editando = true; pintarModo(); cnpj.focus({ preventScroll: true }); }, 'btn');
        const cancelar = botao('Cancelar', () => d.close(), 'btn secondary');
        const salvarFim = el('button', 'btn', 'Salvar'); salvarFim.type = 'submit';
        const nav = el('div', 'compras-form-rodape compras-etapas-nav compras-largo');
        const notaModo = el('p', 'profiles-note compras-largo'); notaModo.setAttribute('role', 'status');
        function pintarModo() {
          [empresa, endereco, ...caixaResp.querySelectorAll('fieldset')].forEach((q) => { q.disabled = !editando; });
          adicionar.disabled = !editando; linhaAdicionar.style.display = editando ? '' : 'none';
          caixaResp.querySelectorAll('.compras-empresa-remover').forEach((x) => { x.style.display = editando ? '' : 'none'; });
          notaModo.textContent = editando ? '' : 'Dados gravados. Toque em Editar para alterar.';
          nav.replaceChildren(...(editando ? [cancelar, salvarFim] : [editar]));
        }
        form.append(notaModo, empresa, endereco, caixaResp, linhaAdicionar, nav);
        pintarModo();
        return {
          ler: () => ({
            cnpj: cnpj.value.trim(), razaoSocial: razao.value.trim(), nomeFantasia: fantasia.value.trim(), regimeTributario: regime.value,
            endereco: { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value },
            // Bloco em branco não é gravado.
            responsaveis: responsaveis.map((r) => ({ id: r.id, nome: cheio(r.nome), whatsapp: cheio(r.whatsapp), email: cheio(r.email).toLocaleLowerCase('pt-BR'), cargo: r.cargo || '' })).filter((r) => r.nome || r.whatsapp || r.email || r.cargo),
          }),
        };
      },
      salvar: (ctx) => {
        if (!editando) return 'Toque em Editar para alterar os dados.';
        const novo = ctx.ler();
        const falta = validarEmpresa(novo);
        if (falta) return falta;
        const ok = S.transacao((d) => {
          const { responsavel, ...resto } = d.empresa || {}; // o formato de um responsável só deixa de existir: a lista o substitui
          d.empresa = { ...resto, ...novo, atualizadoEm: S.agoraIso() };
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar('Dados da empresa salvos.');
        return undefined;
      },
    });
    // A janela é aberta por cima do menu, sem trocar de tela: o cabeçalho recebe aqui o ícone do cartão (o da pessoa jurídica).
    setTimeout(() => { const i = dlg.querySelector('.head .sector-icon'); if (i) i.innerHTML = U.svg(U.ICONES.fornecedor); }, 160);
    return dlg;
  }

  A.registrar('empresa', abrir);
  window.CicluzEmpresa = { abrir, validarEmpresa, CARGOS_EMPRESA, dados: () => S.dados.empresa || null };
})();
