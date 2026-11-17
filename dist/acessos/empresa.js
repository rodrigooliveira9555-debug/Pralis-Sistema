/*
 * Configurações → Empresa → Dados da Empresa (pedido do Rodrigo, 17/11/2026).
 * Um cadastro só, o da própria empresa: os campos da 1ª etapa do cliente pessoa jurídica (CNPJ, razão social, nome
 * fantasia, regime tributário e endereço) e os responsáveis legais. Três etapas com a barra do sistema: Dados da
 * empresa · Dados dos responsáveis legais · Revisão. Tocar no cartão abre direto a ficha: com dados já gravados ela
 * abre na Revisão, só para leitura; Editar (ou o lápis de um bloco) libera os campos e mostra o Salvar.
 * Responsáveis: um bloco por pessoa ("Dados do responsável"; escolhido o cargo, o título leva o cargo), com o botão
 * de acrescentar; cada um guarda os dados que um contrato pede (nome completo, CPF, RG, nacionalidade, estado civil,
 * profissão e endereço). Cargo: Proprietário, Sócio-proprietário, Diretor não sócio ou Procurador (lista própria da empresa;
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
  const ESTADOS_CIVIS = [['solteiro', 'Solteiro(a)'], ['casado', 'Casado(a)'], ['uniao-estavel', 'União estável'], ['divorciado', 'Divorciado(a)'], ['separado', 'Separado(a)'], ['viuvo', 'Viúvo(a)']];
  const RESPONSAVEL_VAZIO = () => ({ id: S.novoId('resp'), cargo: '', nome: '', cpf: '', rg: '', rgOrgao: '', nacionalidade: '', estadoCivil: '', profissao: '', whatsapp: '', email: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' } });
  const tituloDoResponsavel = (cargo) => 'Dados do responsável legal' + (nomeDoCargo(cargo) ? ' — ' + nomeDoCargo(cargo) : '');

  /** Responsáveis gravados; o primeiro formato (um responsável só, em "responsavel") vira o primeiro da lista. */
  function responsaveisDe(v) {
    const lista = Array.isArray(v.responsaveis) ? v.responsaveis : v.responsavel ? [v.responsavel] : [];
    return lista.map((r) => ({ ...RESPONSAVEL_VAZIO(), ...r, id: r.id || S.novoId('resp'), cargo: nomeDoCargo(r.cargo) ? r.cargo : '', endereco: { ...RESPONSAVEL_VAZIO().endereco, ...(r.endereco || {}) } }));
  }

  /** O que impede salvar ('' quando está em ordem): empresa e endereço obrigatórios, menos o complemento; responsáveis opcionais. */
  const ETAPAS = ['Dados da empresa', 'Dados dos responsáveis legais', 'Revisão'];
  /** Uma mensagem por etapa ('' quando em ordem): [empresa e endereço, responsáveis, revisão]. */
  const validarEmpresaEtapas = (x) => [validarDadosDaEmpresa(x), validarResponsaveis(x), ''];
  const validarEmpresa = (x) => validarEmpresaEtapas(x).find(Boolean) || '';
  function validarDadosDaEmpresa(x) {
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
    return '';
  }
  /** Responsáveis: opcionais; o que vier preenchido precisa estar no formato. */
  function validarResponsaveis(x) {
    const lista = x.responsaveis || [];
    for (let i = 0; i < lista.length; i++) {
      const r = lista[i]; const quem = 'responsável ' + (i + 1);
      const fone = D.digitos(r.whatsapp);
      if (fone && (fone.length < 10 || fone.length > 11)) return 'WhatsApp do ' + quem + ' inválido: informe o DDD e o número.';
      const mail = cheio(r.email);
      if (mail && (mail.includes(' ') || mail.split('@').length !== 2 || !mail.split('@')[0] || !mail.split('@')[1].includes('.'))) return 'E-mail do ' + quem + ' inválido.';
      if (r.cargo && !nomeDoCargo(r.cargo)) return 'Cargo do ' + quem + ' inválido.';
      if (cheio(r.cpf) && !regras().cpfValid(r.cpf)) return 'CPF do ' + quem + ' inválido.';
      if (r.estadoCivil && !ESTADOS_CIVIS.some(([id]) => id === r.estadoCivil)) return 'Estado civil do ' + quem + ' inválido.';
      const cepR = D.digitos(r.endereco && r.endereco.cep);
      if (cepR && cepR.length !== 8) return 'CEP do ' + quem + ' deve ter 8 dígitos.';
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
        const cnpjGravado = D.digitos(v.cnpj);
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
          const pares = [[razao, x.razaoSocial], [fantasia, x.nomeFantasia], [cep, en.cep], [rua, en.logradouro], [numero, en.numero], [complemento, en.complemento], [bairro, en.bairro], [cidade, en.cidade], [uf, en.uf]];
          // CNPJ diferente do que estava gravado é outra empresa: os dados dela substituem os antigos (pedido do Rodrigo,
          // 17/11/2026). Na primeira vez, ou repetindo o mesmo CNPJ, só o que está vazio é preenchido.
          const trocou = Boolean(cnpjGravado) && n !== cnpjGravado;
          if (trocou) pares.forEach(([alvo, valor]) => { alvo.value = valor || ''; });
          else completar(pares);
          cepFeito = D.digitos(cep.value);
          avisoCnpj.textContent = trocou ? 'CNPJ novo: razão social, nome fantasia e endereço foram trocados pelos dados dele. Confira o regime tributário e salve.' : 'Dados do CNPJ conferidos; só os campos vazios foram preenchidos. Confira antes de salvar.';
        });
        const empresa = el('fieldset', 'compras-fieldset');
        empresa.append(el('legend', null, 'Dados da empresa'), campo('CNPJ *', cnpj), avisoCnpj, campo('Razão Social *', razao), campo('Nome Fantasia *', fantasia), campo('Regime tributário *', regime));
        const endereco = el('fieldset', 'compras-fieldset');
        endereco.append(el('legend', null, 'Endereço'), campo('CEP *', cep), campo('Rua / logradouro *', rua), campo('Número *', numero), campo('Complemento', complemento), campo('Bairro *', bairro), campo('Cidade *', cidade), campo('UF *', uf), avisoCep);

        /* Responsáveis: um bloco por pessoa; o título acompanha o cargo escolhido; o botão acrescenta mais um. */
        const responsaveis = responsaveisDe(v);
        if (!responsaveis.length) responsaveis.push(RESPONSAVEL_VAZIO());
        const CAD = window.CicluzComprasCadastros;
        const caixaResp = el('div', 'compras-etapa compras-largo');
        const adicionar = botao('Adicionar responsável', () => { responsaveis.push(RESPONSAVEL_VAZIO()); desenharResponsaveis(); pintarModo(); }, 'btn');
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
            // Dados que um contrato pede para qualificar quem assina: nome completo, nacionalidade, estado civil,
            // profissão, RG, CPF e endereço (pedido do Rodrigo, 17/11/2026). Tudo opcional; o que vier preenchido é conferido.
            const liga = (input, chave, alvo = r) => { input.addEventListener('input', () => { alvo[chave] = input.value; }); input.addEventListener('change', () => { alvo[chave] = input.value; }); return input; };
            const cpf = liga(mascara(entrada('text', r.cpf, { inputMode: 'numeric', placeholder: '000.000.000-00', maxLength: 14 }), regras().cpfMask), 'cpf');
            const rg = liga(entrada('text', r.rg, { maxLength: 20 }), 'rg'); rg.dataset.textoLivre = '1';
            const rgOrgao = liga(entrada('text', r.rgOrgao, { maxLength: 20, placeholder: 'Ex: SSP/MG...' }), 'rgOrgao'); rgOrgao.dataset.textoLivre = '1';
            const nacionalidade = liga(texto(r.nacionalidade, { maxLength: 40, placeholder: 'Ex: Brasileira...' }), 'nacionalidade');
            const estadoCivil = liga(seletor(ESTADOS_CIVIS, r.estadoCivil, 'Selecione'), 'estadoCivil');
            const profissao = liga(texto(r.profissao, { maxLength: 60, placeholder: 'Ex: Empresário...' }), 'profissao');
            const en = r.endereco;
            const rCep = liga(mascara(entrada('text', en.cep, { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9 }), C().cepMask), 'cep', en);
            const rRua = liga(texto(en.logradouro, { maxLength: 160 }), 'logradouro', en); const rNumero = liga(texto(en.numero, { maxLength: 20 }), 'numero', en);
            const rCompl = liga(texto(en.complemento, { maxLength: 80 }), 'complemento', en); const rBairro = liga(texto(en.bairro, { maxLength: 80 }), 'bairro', en);
            const rCidade = liga(texto(en.cidade, { maxLength: 80 }), 'cidade', en); const rUf = liga(seletor(C().UFS, en.uf, 'UF'), 'uf', en);
            const avisoCepR = el('p', 'profiles-note compras-largo'); avisoCepR.setAttribute('role', 'status');
            let cepRFeito = D.digitos(en.cep);
            rCep.addEventListener('input', async () => {
              const nn = D.digitos(rCep.value); if (nn.length !== 8 || nn === cepRFeito) return; cepRFeito = nn;
              avisoCepR.textContent = 'Buscando o endereço do CEP…';
              const res = await C().cep(nn); if (D.digitos(rCep.value) !== nn) return;
              if (res.erro) { avisoCepR.textContent = 'CEP ' + falha[res.erro] + ': preencha o endereço à mão.'; return; }
              [[rRua, 'logradouro'], [rBairro, 'bairro'], [rCidade, 'cidade'], [rUf, 'uf']].forEach(([alvo, chave]) => { if (res.dados[chave] && !alvo.value.trim()) { alvo.value = res.dados[chave]; en[chave] = res.dados[chave]; } });
              avisoCepR.textContent = 'Endereço do CEP conferido. Confira e informe o número.';
            });
            const sub = (t) => el('span', 'compras-rotulo compras-largo compras-empresa-sub', t);
            bloco.append(titulo, campo('Cargo na empresa', cargo), campo('Nome completo do responsável', nome),
              campo('CPF do responsável', cpf), campo('RG do responsável', rg), campo('Órgão emissor do RG', rgOrgao),
              campo('Nacionalidade', nacionalidade), campo('Estado civil', estadoCivil), campo('Profissão', profissao),
              campo('WhatsApp do responsável', whats), campo('E-mail do responsável', mail),
              sub('Endereço do responsável'), campo('CEP do responsável', rCep), campo('Rua / logradouro', rRua), campo('Número', rNumero), campo('Complemento', rCompl), campo('Bairro', rBairro), campo('Cidade', rCidade), campo('UF', rUf), avisoCepR);
            if (responsaveis.length > 1) {
              const tirar = botao('Remover', () => { responsaveis.splice(i, 1); desenharResponsaveis(); pintarModo(); }, 'btn secondary perigo-texto');
              const pe = el('div', 'compras-form-rodape compras-largo compras-empresa-remover'); pe.append(tirar);
              bloco.append(pe);
            }
            return bloco;
          }));
        }
        desenharResponsaveis();

        /* Três etapas com a barra do sistema (pedido do Rodrigo, 17/11/2026), como o cliente pessoa jurídica:
           1 Dados da empresa (empresa e endereço) · 2 Dados dos responsáveis legais · 3 Revisão.
           Leitura × edição: com dados gravados, a ficha abre na Revisão, travada; "Editar" (ou o lápis de um bloco) libera
           os campos. Sem dados, já abre na etapa 1 para preencher; Avançar confere a etapa. */
        const etapa1 = el('div', 'compras-etapa compras-largo'); etapa1.append(empresa, endereco);
        const etapa2 = el('div', 'compras-etapa compras-largo'); etapa2.append(caixaResp, linhaAdicionar);
        const etapa3 = el('div', 'compras-etapa compras-largo');
        const quadros = [etapa1, etapa2, etapa3];
        let atual = jaTemDados ? 2 : 0;
        const erroEtapa = el('p', 'profiles-error compras-largo'); erroEtapa.setAttribute('role', 'alert');
        const notaModo = el('p', 'profiles-note compras-largo'); notaModo.setAttribute('role', 'status');
        const editar = botao('Editar', () => { editando = true; ir(0); }, 'btn');
        const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
        voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => {
          const falta = validarEmpresaEtapas(ler())[atual];
          if (falta) { erroEtapa.textContent = falta; U.sinalizarObrigatorios(quadros[atual]); return; }
          ir(atual + 1);
        }, 'btn form-next-action');
        const salvarFim = el('button', 'btn', 'Salvar'); salvarFim.type = 'submit';
        const nav = el('div', 'compras-form-rodape compras-etapas-nav compras-largo');
        // Na ficha nova só se anda para a frente pelo Avançar; com dados gravados, qualquer etapa abre pelo toque na barra.
        const barra = window.CicluzStepper.create({ steps: ETAPAS.map((label) => ({ label })), current: atual, label: 'Etapas dos dados da empresa', onSelect: (i) => { if (jaTemDados || i <= atual) ir(i); } });
        const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
        function pintarRevisao() {
          const x = ler(); const en = x.endereco;
          const blocos = [
            ['Dados da empresa', 0, [['CNPJ', x.cnpj], ['Razão Social', x.razaoSocial], ['Nome Fantasia', x.nomeFantasia], ['Regime tributário', nomeDe(D.REGIMES_TRIBUTARIOS, x.regimeTributario)]]],
            ['Endereço', 0, [['CEP', en.cep], ['Rua / logradouro', en.logradouro], ['Número', en.numero], ['Complemento', en.complemento], ['Bairro', en.bairro], ['Cidade', en.cidade], ['UF', en.uf]]],
            ...x.responsaveis.map((r) => [tituloDoResponsavel(r.cargo), 1, [['Nome completo', r.nome], ['CPF', r.cpf], ['RG', r.rg + (r.rg && r.rgOrgao ? ' · ' + r.rgOrgao : '')], ['Nacionalidade', r.nacionalidade], ['Estado civil', nomeDe(ESTADOS_CIVIS, r.estadoCivil)], ['Profissão', r.profissao], ['WhatsApp', r.whatsapp], ['E-mail', r.email],
              ['Endereço', [r.endereco.logradouro, r.endereco.numero, r.endereco.complemento, r.endereco.bairro, r.endereco.cidade, r.endereco.uf, r.endereco.cep].filter(Boolean).join(', ')]]]),
          ];
          if (!x.responsaveis.length) blocos.push(['Dados dos responsáveis legais', 1, [['Responsáveis', 'Nenhum responsável informado']]]);
          etapa3.replaceChildren(...blocos.map(([titulo, etapa, linhas]) => {
            const fs0 = el('fieldset', 'compras-fieldset'); fs0.append(el('legend', null, titulo));
            // O lápis leva à etapa do bloco, já liberando a edição.
            fs0.append(U.botaoEditarBloco(titulo, () => { editando = true; ir(etapa); }));
            const dl = el('dl', 'profiles-info');
            linhas.filter(([, valor]) => valor).forEach(([k, valor]) => dl.append(el('dt', null, k), el('dd', null, String(valor))));
            fs0.append(dl);
            return fs0;
          }));
        }
        function pintarModo() {
          [empresa, endereco, ...caixaResp.querySelectorAll('fieldset')].forEach((q) => { q.disabled = !editando; });
          adicionar.disabled = !editando; linhaAdicionar.style.display = editando ? '' : 'none';
          caixaResp.querySelectorAll('.compras-empresa-remover').forEach((x) => { x.style.display = editando ? '' : 'none'; });
          notaModo.textContent = editando ? '' : 'Dados gravados. Toque em Editar, ou no lápis de um bloco, para alterar.';
          const ultima = atual === quadros.length - 1;
          // Lendo: só o Editar. Editando: Voltar a partir da 2ª etapa, Avançar até a penúltima; Salvar em todas quando a
          // ficha já existia e só na Revisão na ficha nova.
          nav.replaceChildren(...(editando ? [atual > 0 && voltar, !ultima && avancar, (jaTemDados || ultima) && salvarFim].filter(Boolean) : [editar]));
        }
        function ir(i) {
          atual = Math.max(0, Math.min(quadros.length - 1, i));
          if (atual === quadros.length - 1) pintarRevisao();
          quadros.forEach((q, k) => { q.style.display = k === atual ? '' : 'none'; });
          barra.set(atual);
          erroEtapa.textContent = '';
          pintarModo();
          U.subirAoTopo(barra.el, form);
        }
        const ler = () => ({
          cnpj: cnpj.value.trim(), razaoSocial: razao.value.trim(), nomeFantasia: fantasia.value.trim(), regimeTributario: regime.value,
          endereco: { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value },
          // Bloco em branco não é gravado.
          responsaveis: responsaveis.map((r) => ({
            id: r.id, cargo: r.cargo || '', nome: cheio(r.nome), cpf: cheio(r.cpf), rg: cheio(r.rg), rgOrgao: cheio(r.rgOrgao), nacionalidade: cheio(r.nacionalidade), estadoCivil: r.estadoCivil || '', profissao: cheio(r.profissao),
            whatsapp: cheio(r.whatsapp), email: cheio(r.email).toLocaleLowerCase('pt-BR'),
            endereco: Object.fromEntries(Object.entries(r.endereco || {}).map(([k, val]) => [k, cheio(val)])),
          })).filter((r) => r.nome || r.whatsapp || r.email || r.cargo || r.cpf || r.rg),
        });
        form.append(barra.el, notaModo, ...quadros, erroEtapa, nav);
        ir(atual);
        return { ler, ir, etapaComErro: () => validarEmpresaEtapas(ler()).findIndex(Boolean) };
      },
      salvar: (ctx) => {
        if (!editando) return 'Toque em Editar para alterar os dados.';
        const novo = ctx.ler();
        const falta = validarEmpresa(novo);
        if (falta) { const k = ctx.etapaComErro(); if (k >= 0) ctx.ir(k); return falta; } // leva à etapa onde está o problema
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
  window.CicluzEmpresa = { abrir, validarEmpresa, validarEmpresaEtapas, ETAPAS, CARGOS_EMPRESA, dados: () => S.dados.empresa || null };
})();
