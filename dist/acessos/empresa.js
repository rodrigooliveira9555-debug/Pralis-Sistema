/*
 * Configurações → Empresa → Dados da Empresa (pedido do Rodrigo, 17/11/2026).
 * Um cadastro só, o da própria empresa: os campos da 1ª etapa do cliente pessoa jurídica (CNPJ, razão social, nome
 * fantasia, regime tributário e endereço) e os responsáveis legais. Três etapas com a barra do sistema: Dados da
 * empresa · Dados dos responsáveis legais · Revisão. Tocar no cartão abre direto a ficha: com dados já gravados ela
 * abre na Revisão, só para leitura; Editar (o geral ou o de um bloco) libera os campos e mostra o Salvar.
 * Responsáveis: um bloco por pessoa ("Dados do responsável"; escolhido o cargo, o título leva o cargo), com o botão
 * de acrescentar; cada um guarda os dados que um contrato pede (nome completo, CPF, RG, nacionalidade, estado civil,
 * profissão e endereço). Cargo: Proprietário, Sócio-proprietário, Diretor não sócio ou Procurador (lista própria da empresa;
 * fornecedor e cliente seguem com a lista deles).
 * Várias empresas: a tela lista as empresas (a Matriz primeiro) e cada uma tem a sua ficha e os seus responsáveis.
 * Ficam em dados.empresas, dentro do documento do Compras (cicluz-compras-v1): campo novo e opcional.
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
  /*
   * Representante legal do responsável (pedido do Rodrigo, 17/11/2026): quando quem responde pela empresa não pode
   * assinar sozinho. Fica dentro do próprio responsável: representacao { precisa, motivo, representantes[] }.
   *   menor de 16 anos        → representado por pai, mãe ou tutor
   *   entre 16 e 18 anos      → assistido por pai, mãe ou tutor (assina junto)
   *   interditado (curatela)  → representado pelo curador
   *   espólio (sócio falecido)→ representado pelo inventariante
   * Menor emancipado assina sozinho e procurador é cargo: nenhum dos dois entra aqui.
   */
  const MOTIVOS_REPRESENTACAO = [['menor-16', 'Menor de 16 anos'], ['menor-16-18', 'Entre 16 e 18 anos (não emancipado)'], ['interditado', 'Interditado (curatela)'], ['espolio', 'Espólio (sócio falecido)']];
  const VINCULOS_REPRESENTANTE = [['pai', 'Pai'], ['mae', 'Mãe'], ['tutor', 'Tutor(a)'], ['curador', 'Curador(a)'], ['inventariante', 'Inventariante']];
  const DOCUMENTOS_REPRESENTACAO = [['certidao-nascimento', 'Certidão de nascimento'], ['termo-tutela', 'Termo de tutela'], ['termo-curatela', 'Termo de curatela'], ['termo-inventariante', 'Termo de inventariante']];
  const nomeEm = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
  const formaDaRepresentacao = (motivo) => (motivo === 'menor-16-18' ? 'assistido por' : 'representado por');
  const VINCULO_SUGERIDO = { interditado: 'curador', espolio: 'inventariante' };
  const ENDERECO_VAZIO = () => ({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
  const REPRESENTANTE_VAZIO = (motivo) => ({ id: S.novoId('rep'), vinculo: VINCULO_SUGERIDO[motivo] || '', nome: '', cpf: '', rg: '', rgOrgao: '', nacionalidade: '', estadoCivil: '', profissao: '', whatsapp: '', email: '', endereco: ENDERECO_VAZIO(), documento: '', processo: '', validade: '' });
  const representacaoDe = (r) => {
    const x = r.representacao || {};
    return { precisa: Boolean(x.precisa), motivo: nomeEm(MOTIVOS_REPRESENTACAO, x.motivo) ? x.motivo : '', representantes: (Array.isArray(x.representantes) ? x.representantes : []).map((p) => ({ ...REPRESENTANTE_VAZIO(), ...p, id: p.id || S.novoId('rep'), endereco: { ...ENDERECO_VAZIO(), ...(p.endereco || {}) } })) };
  };
  /** Idade em anos completos numa data 'AAAA-MM-DD' (ou null). */
  function idadeEm(iso, hoje = new Date()) {
    const p = String(iso || '').split('-').map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
    let anos = hoje.getFullYear() - p[0];
    if (hoje.getMonth() + 1 < p[1] || (hoje.getMonth() + 1 === p[1] && hoje.getDate() < p[2])) anos--;
    return anos;
  }
  const RESPONSAVEL_VAZIO = () => ({ id: S.novoId('resp'), nascimento: '', representacao: { precisa: false, motivo: '', representantes: [] }, cargo: '', nome: '', cpf: '', rg: '', rgOrgao: '', nacionalidade: '', estadoCivil: '', profissao: '', whatsapp: '', email: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' } });
  const tituloDoResponsavel = (cargo) => 'Dados do responsável legal da empresa' + (nomeDoCargo(cargo) ? ' — ' + nomeDoCargo(cargo) : '');

  /*
   * Várias empresas (pedido do Rodrigo, 17/11/2026): a primeira cadastrada é a Matriz; cada empresa seguinte começa
   * pelo tipo de vínculo com ela. Ficam em dados.empresas (lista); a ficha única anterior (dados.empresa) é lida como a
   * Matriz e passa para a lista na primeira gravação.
   *   Filial                  → mesmo CNPJ raiz da matriz (muda o final, /0002…); é a mesma pessoa jurídica.
   *   Empresa do mesmo grupo  → outro CNPJ, com os mesmos donos.
   *   Franquia                → outro dono, que usa a marca por contrato.
   *   Loja parceira           → empresa independente que trabalha junto.
   *   Associado               → empresa independente ligada por associação ou rede (opção pedida pelo Rodrigo).
   */
  const VINCULOS = [['matriz', 'Matriz'], ['filial', 'Filial'], ['grupo', 'Empresa do mesmo grupo'], ['franquia', 'Franquia'], ['parceira', 'Loja parceira'], ['associado', 'Associado']];
  const nomeDoVinculo = (id) => (VINCULOS.find(([x]) => x === id) || [])[1] || '';
  const empresasEm = (d) => (Array.isArray(d.empresas) ? d.empresas : d.empresa && cheio(d.empresa.cnpj) ? [{ id: 'emp-matriz', vinculo: 'matriz', ...d.empresa }] : []);
  const todas = () => empresasEm(S.dados);

  /** Responsáveis gravados; o primeiro formato (um responsável só, em "responsavel") vira o primeiro da lista. */
  function responsaveisDe(v) {
    const lista = Array.isArray(v.responsaveis) ? v.responsaveis : v.responsavel ? [v.responsavel] : [];
    const nomeArrumado = (v0) => (typeof window.formatSystemName === 'function' ? window.formatSystemName(cheio(v0)) : cheio(v0));
    return lista.map((r) => ({ ...RESPONSAVEL_VAZIO(), ...r, nascimento: r.nascimento || '', representacao: representacaoDe(r), nome: nomeArrumado(r.nome), id: r.id || S.novoId('resp'), cargo: nomeDoCargo(r.cargo) ? r.cargo : '', endereco: { ...RESPONSAVEL_VAZIO().endereco, ...(r.endereco || {}) } }));
  }

  /** O que impede salvar ('' quando está em ordem): empresa e endereço obrigatórios, menos o complemento; responsáveis opcionais. */
  const ETAPAS = ['Dados da empresa', 'Dados dos responsáveis legais da empresa', 'Revisão dos dados'];
  /** Uma mensagem por etapa ('' quando em ordem): [empresa e endereço, responsáveis, revisão]. */
  const validarEmpresaEtapas = (x) => [validarDadosDaEmpresa(x), validarResponsaveis(x), ''];
  const validarEmpresa = (x) => validarEmpresaEtapas(x).find(Boolean) || '';
  function validarDadosDaEmpresa(x) {
    const e = x.endereco || {};
    if (!nomeDoVinculo(x.vinculo)) return 'Selecione o tipo de vínculo.';
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
    if (x.responsaveisDaMatriz) return '';
    const lista = x.responsaveis || [];
    for (let i = 0; i < lista.length; i++) {
      const r = lista[i]; const quem = 'responsável ' + (i + 1);
      const fone = D.digitos(r.whatsapp);
      if (fone && (fone.length < 10 || fone.length > 11)) return 'WhatsApp do ' + quem + ' inválido: informe o DDD e o número.';
      const mail = cheio(r.email);
      if (mail && (mail.includes(' ') || mail.split('@').length !== 2 || !mail.split('@')[0] || !mail.split('@')[1].includes('.'))) return 'E-mail do ' + quem + ' inválido.';
      if (r.cargo && !nomeDoCargo(r.cargo)) return 'Cargo do ' + quem + ' inválido.';
      const rep0 = r.representacao;
      if (rep0 && rep0.precisa) {
        if (!nomeEm(MOTIVOS_REPRESENTACAO, rep0.motivo)) return 'Escolha o motivo da representação legal do ' + quem + '.';
        const reps = rep0.representantes || [];
        if (!reps.some((p) => cheio(p.nome))) return 'Informe o nome do representante legal do ' + quem + '.';
        for (const p of reps) {
          if (p.vinculo && !nomeEm(VINCULOS_REPRESENTANTE, p.vinculo)) return 'Vínculo do representante do ' + quem + ' inválido.';
          if (cheio(p.cpf) && !regras().cpfValid(p.cpf)) return 'CPF do representante do ' + quem + ' inválido.';
          const foneP = D.digitos(p.whatsapp);
          if (foneP && (foneP.length < 10 || foneP.length > 11)) return 'WhatsApp do representante do ' + quem + ' inválido: informe o DDD e o número.';
          const cepP = D.digitos(p.endereco && p.endereco.cep);
          if (cepP && cepP.length !== 8) return 'CEP do representante do ' + quem + ' deve ter 8 dígitos.';
        }
      }
      if (cheio(r.cpf) && !regras().cpfValid(r.cpf)) return 'CPF do ' + quem + ' inválido.';
      if (r.estadoCivil && !ESTADOS_CIVIS.some(([id]) => id === r.estadoCivil)) return 'Estado civil do ' + quem + ' inválido.';
      const cepR = D.digitos(r.endereco && r.endereco.cep);
      if (cepR && cepR.length !== 8) return 'CEP do ' + quem + ' deve ter 8 dígitos.';
    }
    return '';
  }

  /** Um responsável como é gravado: textos aparados, e-mail em minúsculas, representação só quando precisa. */
  function lerResponsavel(r) {
    return {
    nascimento: r.nascimento || '',
    representacao: r.representacao && r.representacao.precisa ? {
      precisa: true, motivo: r.representacao.motivo || '',
      representantes: r.representacao.representantes.map((p) => ({ ...p, nome: cheio(p.nome), cpf: cheio(p.cpf), rg: cheio(p.rg), rgOrgao: cheio(p.rgOrgao), nacionalidade: cheio(p.nacionalidade), profissao: cheio(p.profissao), whatsapp: cheio(p.whatsapp), email: cheio(p.email).toLocaleLowerCase('pt-BR'), processo: cheio(p.processo), endereco: Object.fromEntries(Object.entries(p.endereco || {}).map(([k, val]) => [k, cheio(val)])) })).filter((p) => p.nome || p.cpf || p.vinculo),
    } : { precisa: false, motivo: '', representantes: [] },
    id: r.id, cargo: r.cargo || '', nome: cheio(r.nome), cpf: cheio(r.cpf), rg: cheio(r.rg), rgOrgao: cheio(r.rgOrgao), nacionalidade: cheio(r.nacionalidade), estadoCivil: r.estadoCivil || '', profissao: cheio(r.profissao),
    whatsapp: cheio(r.whatsapp), email: cheio(r.email).toLocaleLowerCase('pt-BR'),
    endereco: Object.fromEntries(Object.entries(r.endereco || {}).map(([k, val]) => [k, cheio(val)])),
    };
  }
  /**
   * Bloco (quadro) com todos os dados de um responsável legal: cargo, dados pessoais para a qualificação em contrato, endereço e,
   * quando precisa, o representante legal dele. Peça única: Dados da Empresa e o responsável legal do cliente com contrato
   * (18/11/2026, Rodrigo). r: um responsável normalizado por responsaveisDe (o bloco altera r enquanto a pessoa digita).
   * aoMudar(): chamado quando o bloco ganha ou perde campos. titulo(cargo): o texto da moldura. semCargo, quem e quemLegal: para a
   * pessoa física com contrato, que não tem cargo e é chamada de "cliente" nos rótulos.
   */
  function blocoResponsavel(r, { aoMudar = () => {}, titulo: tituloDe = tituloDoResponsavel, semCargo = false, quem = 'responsável', quemLegal = 'responsável legal' } = {}) {
    const texto = (valor, extra = {}) => entrada('text', valor || '', { maxLength: 120, ...extra });
    const CAD = window.CicluzComprasCadastros;
    const falha = { 'nao-encontrado': 'não encontrado', indisponivel: 'consulta indisponível agora' };
    const aoEnter = (buscar) => (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); buscar(true); } };
    const pintarModo = aoMudar;
    const bloco = el('fieldset', 'compras-fieldset');
    const titulo = el('legend', null, tituloDe(r.cargo));
    const cargo = seletor(CARGOS_EMPRESA, r.cargo, 'Selecione');
    const nome = texto(r.nome);
    const whats = entrada('tel', r.whatsapp, { inputMode: 'numeric', placeholder: '(00) 00000-0000' });
    if (CAD && CAD.mascaraTelefone) mascara(whats, CAD.mascaraTelefone);
    const mail = entrada('email', r.email, { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); mail.dataset.textoLivre = '1';
    cargo.addEventListener('change', () => { r.cargo = cargo.value; titulo.textContent = tituloDe(r.cargo); });
    nome.addEventListener('input', () => { r.nome = nome.value; });
    whats.addEventListener('input', () => { r.whatsapp = whats.value; });
    mail.addEventListener('input', () => { r.email = mail.value; });
    // Dados que um contrato pede para qualificar quem assina: nome completo, nacionalidade, estado civil,
    // profissão, RG, CPF e endereço (pedido do Rodrigo, 17/11/2026). Tudo opcional; o que vier preenchido é conferido.
    const liga = (input, chave, alvo = r) => { input.addEventListener('input', () => { alvo[chave] = input.value; }); input.addEventListener('change', () => { alvo[chave] = input.value; }); return input; };
    const cpf = liga(mascara(entrada('text', r.cpf, { inputMode: 'numeric', placeholder: '000.000.000-00', maxLength: 14 }), regras().cpfMask), 'cpf');
    const rg = liga(entrada('text', r.rg, { maxLength: 20, placeholder: 'Ex: MG-00.000.000...' }), 'rg'); rg.dataset.textoLivre = '1';
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
    const buscarCepR = async (forcar) => {
      const nn = D.digitos(rCep.value); if (nn.length !== 8 || (nn === cepRFeito && !forcar)) return;
      const trocouCepR = Boolean(cepRFeito) || Boolean(forcar); cepRFeito = nn; // CEP diferente: o endereço novo substitui o antigo
      avisoCepR.textContent = 'Buscando o endereço do CEP…';
      const res = await C().cep(nn); if (D.digitos(rCep.value) !== nn) return;
      if (res.erro) { avisoCepR.textContent = 'CEP ' + falha[res.erro] + ': preencha o endereço à mão.'; return; }
      [[rRua, 'logradouro'], [rBairro, 'bairro'], [rCidade, 'cidade'], [rUf, 'uf']].forEach(([alvo, chave]) => { if (trocouCepR || (res.dados[chave] && !alvo.value.trim())) { alvo.value = res.dados[chave] || ''; en[chave] = alvo.value; } });
      avisoCepR.textContent = trocouCepR ? 'CEP novo: rua, bairro, cidade e UF foram trocados. Confira o número e o complemento.' : 'Endereço do CEP conferido. Confira e informe o número.';
    };
    rCep.addEventListener('input', () => buscarCepR(false)); rCep.addEventListener('keydown', aoEnter(buscarCepR));
    // Dois quadros com borda dentro do bloco (pedido do Rodrigo, 17/11/2026): os dados pessoais e o endereço.
    const quadro = (legenda, ...nos) => { const q = el('fieldset', 'compras-fieldset compras-largo'); q.append(el('legend', null, legenda), ...nos); return q; };
    bloco.append(titulo,
      quadro('Dados pessoais', ...(semCargo ? [] : [campo('Cargo na empresa', cargo)]), campo('Nome completo do ' + quem, nome),
        campo('CPF do ' + quem, cpf), campo('RG do ' + quem, rg), campo('Órgão emissor do RG', rgOrgao),
        campo('Nacionalidade', nacionalidade), campo('Estado civil', estadoCivil), campo('Profissão', profissao),
        campo('WhatsApp do ' + quem, whats), campo('E-mail do ' + quem, mail)),
      quadro('Endereço do ' + quemLegal, campo('CEP do ' + quem, rCep), campo('Rua / logradouro', rRua), campo('Número', rNumero), campo('Complemento', rCompl), campo('Bairro', rBairro), campo('Cidade', rCidade), campo('UF', rUf), avisoCepR));
    /* Representante legal deste responsável: interruptor Sim/Não e, com Sim, o quadro com o motivo e um quadro por
       representante (pode haver mais de um, como pai e mãe). A data de nascimento só serve para o sistema avisar
       que a pessoa é menor de idade; não entra em contrato sozinha. */
    const rp0 = r.representacao;
    const nasc = liga(entrada('date', r.nascimento || ''), 'nascimento');
    const avisoIdade = el('small', 'profiles-note');
    const campoNasc = campo('Data de nascimento', nasc, 'Opcional. Serve para o sistema avisar quando o ' + quem + ' é menor de idade.');
    campoNasc.append(avisoIdade);
    bloco.querySelector('fieldset').append(campoNasc);
    const quadroRep = el('fieldset', 'compras-fieldset compras-largo');
    const tituloRep = el('legend', null, '');
    const motivo = seletor(MOTIVOS_REPRESENTACAO, rp0.motivo, 'Selecione');
    const formaNota = el('small', 'profiles-note');
    const campoMotivo = campo('Motivo da representação *', motivo); campoMotivo.classList.add('compras-largo'); campoMotivo.append(formaNota);
    const caixaReps = el('div', 'compras-etapa compras-largo');
    const maisRep = botao('Adicionar representante', () => { rp0.representantes.push(REPRESENTANTE_VAZIO(rp0.motivo)); desenharReps(); pintarModo(); }, 'btn');
    const linhaMaisRep = el('div', 'compras-form-rodape compras-largo compras-empresa-remover'); linhaMaisRep.append(maisRep);
    quadroRep.append(tituloRep, campoMotivo, caixaReps, linhaMaisRep);
    const precisa = U.quadroSituacao('Precisa de representante legal?', rp0.precisa, {
      textos: ['Sim', 'Não'], dica: 'Marque Sim quando este ' + quem + ' é menor de idade, interditado ou falecido (espólio) e outra pessoa assina por ele.',
      aoMudar: (sim) => { rp0.precisa = sim; if (sim && !rp0.representantes.length) rp0.representantes.push(REPRESENTANTE_VAZIO(rp0.motivo)); desenharReps(); pintarRep(); pintarModo(); },
    });
    precisa.classList.add('compras-largo');
    function pintarRep() {
      quadroRep.style.display = rp0.precisa ? '' : 'none';
      tituloRep.textContent = 'Representante legal de ' + (cheio(r.nome) || 'este ' + quem);
      formaNota.textContent = rp0.motivo ? 'No contrato: "' + formaDaRepresentacao(rp0.motivo) + '…".' : '';
      const anos = idadeEm(r.nascimento);
      avisoIdade.textContent = anos == null ? '' : anos < 18 ? 'Menor de idade (' + anos + ' anos): precisa de representante legal.' : anos + ' anos.';
    }
    function desenharReps() {
      caixaReps.replaceChildren(...rp0.representantes.map((p, k) => {
        const caixa = el('fieldset', 'compras-fieldset');
        const tit = el('legend', null, '');
        const pinta = () => { tit.textContent = 'Representante' + (nomeEm(VINCULOS_REPRESENTANTE, p.vinculo) ? ' — ' + nomeEm(VINCULOS_REPRESENTANTE, p.vinculo) : ''); };
        const lg = (input, chave, alvo = p) => { input.addEventListener('input', () => { alvo[chave] = input.value; }); input.addEventListener('change', () => { alvo[chave] = input.value; }); return input; };
        const vinc = lg(seletor(VINCULOS_REPRESENTANTE, p.vinculo, 'Selecione'), 'vinculo'); vinc.addEventListener('change', pinta);
        const pNome = lg(texto(p.nome), 'nome');
        const pCpf = lg(mascara(entrada('text', p.cpf, { inputMode: 'numeric', placeholder: '000.000.000-00', maxLength: 14 }), regras().cpfMask), 'cpf');
        const pRg = lg(entrada('text', p.rg, { maxLength: 20, placeholder: 'Ex: MG-00.000.000...' }), 'rg'); pRg.dataset.textoLivre = '1';
        const pOrgao = lg(entrada('text', p.rgOrgao, { maxLength: 20, placeholder: 'Ex: SSP/MG...' }), 'rgOrgao'); pOrgao.dataset.textoLivre = '1';
        const pNac = lg(texto(p.nacionalidade, { maxLength: 40, placeholder: 'Ex: Brasileira...' }), 'nacionalidade');
        const pCivil = lg(seletor(ESTADOS_CIVIS, p.estadoCivil, 'Selecione'), 'estadoCivil');
        const pProf = lg(texto(p.profissao, { maxLength: 60, placeholder: 'Ex: Empresário...' }), 'profissao');
        const pWhats = lg(entrada('tel', p.whatsapp, { inputMode: 'numeric', placeholder: '(00) 00000-0000' }), 'whatsapp'); if (CAD && CAD.mascaraTelefone) mascara(pWhats, CAD.mascaraTelefone);
        const pMail = lg(entrada('email', p.email, { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }), 'email'); pMail.dataset.textoLivre = '1';
        const pe = p.endereco;
        const pCep = lg(mascara(entrada('text', pe.cep, { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9 }), C().cepMask), 'cep', pe);
        const pRua = lg(texto(pe.logradouro, { maxLength: 160 }), 'logradouro', pe); const pNum = lg(texto(pe.numero, { maxLength: 20 }), 'numero', pe);
        const pCompl = lg(texto(pe.complemento, { maxLength: 80 }), 'complemento', pe); const pBairro = lg(texto(pe.bairro, { maxLength: 80 }), 'bairro', pe);
        const pCidade = lg(texto(pe.cidade, { maxLength: 80 }), 'cidade', pe); const pUf = lg(seletor(C().UFS, pe.uf, 'UF'), 'uf', pe);
        const avisoCepP = el('p', 'profiles-note compras-largo'); avisoCepP.setAttribute('role', 'status');
        let cepPFeito = D.digitos(pe.cep);
        // Mesma regra de todo CEP do sistema: número diferente (ou Enter) busca e troca rua, bairro, cidade e UF.
        const buscarCepP = async (forcar) => {
          const nn = D.digitos(pCep.value); if (nn.length !== 8 || (nn === cepPFeito && !forcar)) return;
          const trocouP = Boolean(cepPFeito) || Boolean(forcar); cepPFeito = nn;
          avisoCepP.textContent = 'Buscando o endereço do CEP…';
          const res = await C().cep(nn); if (D.digitos(pCep.value) !== nn) return;
          if (res.erro) { avisoCepP.textContent = 'CEP ' + falha[res.erro] + ': preencha o endereço à mão.'; return; }
          [[pRua, 'logradouro'], [pBairro, 'bairro'], [pCidade, 'cidade'], [pUf, 'uf']].forEach(([alvo, chave]) => { if (trocouP || (res.dados[chave] && !alvo.value.trim())) { alvo.value = res.dados[chave] || ''; pe[chave] = alvo.value; } });
          avisoCepP.textContent = trocouP ? 'CEP novo: rua, bairro, cidade e UF foram trocados. Confira o número e o complemento.' : 'Endereço do CEP conferido. Confira e informe o número.';
        };
        pCep.addEventListener('input', () => buscarCepP(false)); pCep.addEventListener('keydown', aoEnter(buscarCepP));
        const pDoc = lg(seletor(DOCUMENTOS_REPRESENTACAO, p.documento, 'Selecione'), 'documento');
        const pProc = lg(entrada('text', p.processo, { maxLength: 40 }), 'processo'); pProc.dataset.textoLivre = '1';
        const pVal = lg(entrada('date', p.validade || ''), 'validade');
        caixa.append(tit, campo('Vínculo com o ' + quem, vinc), campo('Nome completo do representante *', pNome),
          campo('CPF do representante', pCpf), campo('RG do representante', pRg), campo('Órgão emissor do RG', pOrgao),
          campo('Nacionalidade', pNac), campo('Estado civil', pCivil), campo('Profissão', pProf),
          campo('WhatsApp do representante', pWhats), campo('E-mail do representante', pMail),
          campo('CEP do representante', pCep), campo('Rua / logradouro', pRua), campo('Número', pNum), campo('Complemento', pCompl), campo('Bairro', pBairro), campo('Cidade', pCidade), campo('UF', pUf), avisoCepP,
          campo('Documento que comprova', pDoc), campo('Número do processo', pProc, 'Quando houver (tutela, curatela ou inventário).'), campo('Validade do documento', pVal, 'Curatela provisória tem prazo. Vazio = sem prazo.'));
        if (rp0.representantes.length > 1) {
          const tirarRep = botao('Remover', () => { rp0.representantes.splice(k, 1); desenharReps(); pintarModo(); }, 'btn secondary perigo-texto');
          const peRep = el('div', 'compras-form-rodape compras-largo compras-empresa-remover'); peRep.append(tirarRep);
          caixa.append(peRep);
        }
        pinta();
        return caixa;
      }));
    }
    motivo.addEventListener('change', () => {
      rp0.motivo = motivo.value;
      // O motivo sugere o vínculo de quem ainda não tem um (curador, inventariante).
      rp0.representantes.forEach((p) => { if (!p.vinculo && VINCULO_SUGERIDO[rp0.motivo]) p.vinculo = VINCULO_SUGERIDO[rp0.motivo]; });
      desenharReps(); pintarRep(); pintarModo();
    });
    nome.addEventListener('input', pintarRep);
    const aoMudarNascimento = () => {
      const anos = idadeEm(r.nascimento);
      // Menor de idade: liga a representação e sugere o motivo pela idade; a pessoa confere.
      if (anos != null && anos < 18 && !rp0.precisa) { rp0.precisa = true; precisa.ativo = true; if (!rp0.motivo) { rp0.motivo = anos < 16 ? 'menor-16' : 'menor-16-18'; motivo.value = rp0.motivo; } if (!rp0.representantes.length) rp0.representantes.push(REPRESENTANTE_VAZIO(rp0.motivo)); desenharReps(); pintarModo(); }
      pintarRep();
    };
    nasc.addEventListener('input', aoMudarNascimento); nasc.addEventListener('change', aoMudarNascimento);
    desenharReps(); pintarRep();
    bloco.append(precisa, quadroRep);
    return bloco;
  }

  /** Ficha de uma empresa. emp: a empresa gravada (ou nada, para cadastrar). aoSalvar() é chamado depois de gravar. */
  /** opcoes.editar: abre a ficha já liberada para alterar (o Editar da seta da lista e os dois toques na linha). */
  function abrirFicha(emp, aoSalvar, opcoes = {}) {
    const v = emp || {}; const e = v.endereco || {};
    const gravadas = todas();
    // A primeira empresa é sempre a Matriz; as outras escolhem o vínculo.
    const matriz = emp ? emp.vinculo === 'matriz' : !gravadas.length;
    const jaTemDados = Boolean(emp);
    let editando = !jaTemDados || Boolean(opcoes.editar);
    const dlg = U.dialogo({
      titulo: emp ? 'Dados da Empresa' : matriz ? 'Cadastro empresa' : 'Cadastro empresa — ' + 'nova unidade', cor: A.COR, corTexto: A.COR_TEXTO, largo: true, classe: 'compras-form-padrao', rotuloSalvar: 'Salvar',
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
        const aoEnter = (buscar) => (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); buscar(true); } };
        const buscarCep = async (forcar) => {
          const n = D.digitos(cep.value); if (n.length !== 8 || (n === cepFeito && !forcar)) return;
          const trocouCep = Boolean(cepFeito) || Boolean(forcar); cepFeito = n; // CEP diferente do que estava: o endereço novo substitui o antigo
          avisoCep.textContent = 'Buscando o endereço do CEP…';
          const r = await C().cep(n); if (D.digitos(cep.value) !== n) return;
          if (r.erro) { avisoCep.textContent = 'CEP ' + falha[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha o endereço à mão.'; return; }
          const paresCep = [[rua, r.dados.logradouro], [bairro, r.dados.bairro], [cidade, r.dados.cidade], [uf, r.dados.uf]];
          if (trocouCep) paresCep.forEach(([alvo, valor]) => { alvo.value = valor || ''; }); else completar(paresCep);
          avisoCep.textContent = trocouCep ? 'CEP novo: rua, bairro, cidade e UF foram trocados. Confira o número e o complemento.' : 'Endereço do CEP conferido. Confira e informe o número.';
        };
        // Enter no campo busca na hora e troca os dados (pedido do Rodrigo, 17/11/2026), sem salvar o formulário.
        cep.addEventListener('input', () => buscarCep(false)); cep.addEventListener('keydown', aoEnter(buscarCep));
        const buscarCnpj = async (forcar) => {
          const n = D.digitos(cnpj.value); if (n.length !== 14 || (n === cnpjFeito && !forcar) || !regras().cnpjValid(n)) return;
          const cnpjAnterior = forcar ? n : cnpjFeito; cnpjFeito = n;
          avisoCnpj.textContent = 'Buscando os dados da empresa pelo CNPJ…';
          const r = await C().cnpj(n); if (D.digitos(cnpj.value) !== n) return;
          if (r.erro) { avisoCnpj.textContent = 'CNPJ ' + falha[r.erro] + (r.motivo ? ' (' + r.motivo + ')' : '') + ': preencha os dados à mão.'; return; }
          const x = r.dados; const en = x.endereco || {};
          const pares = [[razao, x.razaoSocial], [fantasia, x.nomeFantasia], [cep, en.cep], [rua, en.logradouro], [numero, en.numero], [complemento, en.complemento], [bairro, en.bairro], [cidade, en.cidade], [uf, en.uf]];
          // CNPJ diferente do que estava no campo é outra empresa: os dados dela substituem os antigos (pedido do Rodrigo,
          // 17/11/2026). Na primeira consulta, com o campo antes vazio, só o que está em branco é preenchido.
          const trocou = Boolean(cnpjAnterior);
          if (trocou) pares.forEach(([alvo, valor]) => { alvo.value = valor || ''; });
          else completar(pares);
          cepFeito = D.digitos(cep.value);
          avisoCnpj.textContent = trocou ? 'CNPJ novo: razão social, nome fantasia e endereço foram trocados pelos dados dele. Confira o regime tributário e salve.' : 'Dados do CNPJ conferidos; só os campos vazios foram preenchidos. Confira antes de salvar.';
        };
        cnpj.addEventListener('input', () => buscarCnpj(false)); cnpj.addEventListener('keydown', aoEnter(buscarCnpj));
        const empresa = el('fieldset', 'compras-fieldset');
        // Primeira pergunta das empresas que não são a Matriz: o tipo de vínculo.
        const vinculo = seletor(VINCULOS.filter(([id]) => id !== 'matriz'), matriz ? '' : (v.vinculo || ''), 'Selecione');
        const vinculoCampo = campo('Tipo de vínculo com a matriz *', vinculo, 'Filial: mesmo CNPJ raiz. Mesmo grupo: mesmos donos, outro CNPJ. Franquia: outro dono, usa a marca. Loja parceira: empresa independente. Associado: empresa ligada por associação ou rede.');
        vinculoCampo.classList.add('compras-largo');
        const matrizNota = el('p', 'profiles-note compras-largo', 'Esta é a Matriz: a primeira empresa cadastrada.');
        empresa.append(el('legend', null, 'Dados da empresa'), matriz ? matrizNota : vinculoCampo, campo('CNPJ *', cnpj), avisoCnpj, campo('Razão Social *', razao), campo('Nome Fantasia *', fantasia), campo('Regime tributário *', regime));
        const endereco = el('fieldset', 'compras-fieldset');
        endereco.append(el('legend', null, 'Endereço'), campo('CEP *', cep), campo('Rua / logradouro *', rua), campo('Número *', numero), campo('Complemento', complemento), campo('Bairro *', bairro), campo('Cidade *', cidade), campo('UF *', uf), avisoCep);

        /* Responsáveis: um bloco por pessoa; o título acompanha o cargo escolhido; o botão acrescenta mais um. */
        const responsaveis = responsaveisDe(v);
        if (!responsaveis.length) responsaveis.push(RESPONSAVEL_VAZIO());
        const CAD = window.CicluzComprasCadastros;
        // "Mesmos responsáveis legais da matriz" = Sim: os blocos vêm preenchidos com os da Matriz, só para leitura (pedido do
        // Rodrigo, 17/11/2026). Nada é copiado para esta empresa: ela guarda só a marca e mostra sempre o que está na Matriz.
        const daMatrizCopia = responsaveisDe(gravadas.find((x) => x.vinculo === 'matriz') || {});
        let usarDaMatriz = !matriz && Boolean(emp ? emp.responsaveisDaMatriz : false);
        const caixaResp = el('div', 'compras-etapa compras-largo');
        const adicionar = botao('Adicionar responsável', () => { responsaveis.push(RESPONSAVEL_VAZIO()); desenharResponsaveis(); pintarModo(); }, 'btn');
        const linhaAdicionar = el('div', 'compras-form-rodape compras-largo'); linhaAdicionar.append(adicionar);
        function desenharResponsaveis() {
          const lista = usarDaMatriz ? daMatrizCopia : responsaveis;
          const avisoMatriz = usarDaMatriz ? [el('p', 'profiles-note', lista.length ? 'Preenchido com os responsáveis legais da Matriz. Para mudar algum dado, altere na ficha da Matriz.' : 'A Matriz ainda não tem responsáveis legais cadastrados.')] : [];
          caixaResp.replaceChildren(...avisoMatriz, ...lista.map((r, i) => {
            const bloco = blocoResponsavel(r, { aoMudar: () => pintarModo() });
            if (!usarDaMatriz && responsaveis.length > 1) {
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
           Leitura × edição: com dados gravados, a ficha abre na Revisão, travada; "Editar" (o geral ou o de um bloco) libera
           os campos. Sem dados, já abre na etapa 1 para preencher; Avançar confere a etapa. */
        const situacao = U.quadroSituacao('Situação da empresa', v.situacao ? v.situacao === 'ativo' : true, { feminino: true, dica: 'Empresa inativa continua cadastrada.' });
        situacao.classList.add('compras-largo');
        const etapa1 = el('div', 'compras-etapa compras-largo'); empresa.querySelector('legend').after(situacao); etapa1.append(empresa, endereco); // a Situação abre o quadro "Dados da empresa": nada fica fora de moldura
        // Responsáveis legais são de cada empresa. A que não é Matriz pode usar os da Matriz (o caso da Filial, que é a mesma pessoa jurídica).
        const mesmos = U.quadroSituacao('Mesmos responsáveis legais da matriz', !matriz && Boolean(emp ? emp.responsaveisDaMatriz : false), { textos: ['Sim', 'Não'], dica: 'Sim: os responsáveis da Matriz aparecem preenchidos abaixo. Não: cadastre os responsáveis desta empresa.', aoMudar: () => { usarDaMatriz = mesmos.ativo; desenharResponsaveis(); pintarModo(); } });
        mesmos.classList.add('compras-largo');
        vinculo.addEventListener('change', () => { if (!emp && vinculo.value === 'filial') { mesmos.ativo = true; usarDaMatriz = true; desenharResponsaveis(); } pintarModo(); });
        const etapa2 = el('div', 'compras-etapa compras-largo'); etapa2.append(...(matriz ? [] : [mesmos]), caixaResp, linhaAdicionar);
        const etapa3 = el('div', 'compras-etapa compras-largo');
        const quadros = [etapa1, etapa2, etapa3];
        let atual = jaTemDados ? 2 : 0;
        const erroEtapa = el('p', 'profiles-error compras-largo'); erroEtapa.setAttribute('role', 'alert');
        const notaModo = el('p', 'profiles-note compras-largo'); notaModo.setAttribute('role', 'status');
        const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
        voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => {
          const falta = validarEmpresaEtapas(ler())[atual];
          if (falta) { erroEtapa.textContent = falta; U.sinalizarObrigatorios(quadros[atual]); return; }
          ir(atual + 1);
        }, 'btn form-next-action');
        const salvarFim = el('button', 'btn', 'Salvar'); salvarFim.type = 'submit';
        const cancelar = botao('Cancelar', () => d.close(), 'btn secondary footer-cancel-accent');
        const nav = el('div', 'compras-form-rodape compras-etapas-nav compras-largo');
        // Na ficha nova só se anda para a frente pelo Avançar; com dados gravados, qualquer etapa abre pelo toque na barra.
        const barra = window.CicluzStepper.create({ steps: ETAPAS.map((label) => ({ label })), current: atual, label: 'Etapas dos dados da empresa', podeIr: (i) => jaTemDados || i <= atual, onSelect: ir });
        const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
        function pintarRevisao() {
          const x = ler(); const en = x.endereco;
          const blocos = [
            ['Dados da empresa', 0, [['Situação', x.situacao === 'inativo' ? 'Inativa' : 'Ativa'], ['Tipo de vínculo', nomeDoVinculo(x.vinculo)], ['CNPJ', x.cnpj], ['Razão Social', x.razaoSocial], ['Nome Fantasia', x.nomeFantasia], ['Regime tributário', nomeDe(D.REGIMES_TRIBUTARIOS, x.regimeTributario)]]],
            ['Endereço', 0, [['CEP', en.cep], ['Rua / logradouro', en.logradouro], ['Número', en.numero], ['Complemento', en.complemento], ['Bairro', en.bairro], ['Cidade', en.cidade], ['UF', en.uf]]],
            ...(x.responsaveisDaMatriz ? daMatrizCopia : x.responsaveis).map((r) => [tituloDoResponsavel(r.cargo) + (x.responsaveisDaMatriz ? ' (da Matriz)' : ''), 1, [['Nome completo', r.nome], ['Representação legal', r.representacao && r.representacao.precisa ? nomeEm(MOTIVOS_REPRESENTACAO, r.representacao.motivo) + ': ' + formaDaRepresentacao(r.representacao.motivo) + ' ' + (r.representacao.representantes.map((p) => p.nome + (nomeEm(VINCULOS_REPRESENTANTE, p.vinculo) ? ' (' + nomeEm(VINCULOS_REPRESENTANTE, p.vinculo).toLocaleLowerCase('pt-BR') + ')' : '')).filter((t) => t.trim()).join(' e ') || 'representante não informado') : ''], ['CPF', r.cpf], ['RG', r.rg + (r.rg && r.rgOrgao ? ' · ' + r.rgOrgao : '')], ['Nacionalidade', r.nacionalidade], ['Estado civil', nomeDe(ESTADOS_CIVIS, r.estadoCivil)], ['Profissão', r.profissao], ['WhatsApp', r.whatsapp], ['E-mail', r.email],
              ['Endereço', [r.endereco.logradouro, r.endereco.numero, r.endereco.complemento, r.endereco.bairro, r.endereco.cidade, r.endereco.uf, r.endereco.cep].filter(Boolean).join(', ')]]]),
          ];
if (x.responsaveisDaMatriz) { if (!daMatrizCopia.length) blocos.push(['Dados dos responsáveis legais', 1, [['Responsáveis', 'Os mesmos da Matriz (ela ainda não tem responsáveis cadastrados)']]]); }
          else if (!x.responsaveis.length) blocos.push(['Dados dos responsáveis legais', 1, [['Responsáveis', 'Nenhum responsável informado']]]);
          etapa3.replaceChildren(...blocos.map(([titulo, etapa, linhas]) => {
            const fs0 = el('fieldset', 'compras-fieldset'); fs0.append(el('legend', null, titulo));
            // O Editar do bloco leva à etapa dele, já liberando a edição.
            fs0.append(U.botaoEditarBloco(titulo, () => { editando = true; ir(etapa); }));
            const dl = el('dl', 'profiles-info');
            linhas.filter(([, valor]) => valor).forEach(([k, valor]) => dl.append(el('dt', null, k), el('dd', null, String(valor))));
            fs0.append(dl);
            return fs0;
          }));
        }
        function pintarModo() {
          [empresa, endereco, ...caixaResp.querySelectorAll(':scope > fieldset')].forEach((q) => { q.disabled = !editando; });
          const daMatriz = !matriz && mesmos.ativo;
          mesmos.querySelector('.account-status-switch').disabled = !editando;
          situacao.querySelector('.account-status-switch').disabled = !editando;
          caixaResp.querySelectorAll(':scope > fieldset').forEach((q) => { q.disabled = !editando || daMatriz; });
          adicionar.disabled = !editando; linhaAdicionar.style.display = editando && !daMatriz ? '' : 'none';
          caixaResp.querySelectorAll('.compras-empresa-remover').forEach((x) => { x.style.display = editando ? '' : 'none'; });
          notaModo.textContent = editando ? '' : 'Dados gravados. Toque em Editar, no bloco que quer alterar.';
          const ultima = atual === quadros.length - 1;
          // Lendo: só o Salvar, que conclui e fecha (o Editar fica em cada bloco da Revisão — 18/11/2026, Rodrigo). Editando: Voltar a partir da 2ª etapa, Avançar até a penúltima; Salvar em todas quando a
          // ficha já existia e só na Revisão na ficha nova.
          nav.replaceChildren(...(editando ? [atual > 0 && voltar, cancelar, (jaTemDados || ultima) && salvarFim, !ultima && avancar].filter(Boolean) : [salvarFim]));
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
          situacao: situacao.ativo ? 'ativo' : 'inativo',
          vinculo: matriz ? 'matriz' : vinculo.value, responsaveisDaMatriz: !matriz && mesmos.ativo,
          cnpj: cnpj.value.trim(), razaoSocial: razao.value.trim(), nomeFantasia: fantasia.value.trim(), regimeTributario: regime.value,
          endereco: { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value },
          // Bloco em branco não é gravado.
          responsaveis: responsaveis.map(lerResponsavel).filter((r) => (matriz || !mesmos.ativo) && (r.nome || r.whatsapp || r.email || r.cargo || r.cpf || r.rg)),
        });
        form.append(barra.el, notaModo, ...quadros, erroEtapa, nav);
        ir(atual);
        return { ler, ir, etapaComErro: () => validarEmpresaEtapas(ler()).findIndex(Boolean) };
      },
      salvar: (ctx) => {
        if (!editando) return ''; // nada foi alterado: o Salvar só conclui e fecha a ficha
        const novo = ctx.ler();
        const falta = validarEmpresa(novo);
        if (falta) { const k = ctx.etapaComErro(); if (k >= 0) ctx.ir(k); return falta; } // leva à etapa onde está o problema
        if (gravadas.some((x) => x.id !== (emp && emp.id) && D.digitos(x.cnpj) === D.digitos(novo.cnpj))) { ctx.ir(0); return 'Já existe uma empresa cadastrada com este CNPJ.'; }
        const ok = S.transacao((d) => {
          const lista = empresasEm(d).map((x) => ({ ...x }));
          const { responsavel, ...anterior } = emp || {}; // o formato de um responsável só deixa de existir: a lista o substitui
          const registro = { ...anterior, ...novo, id: emp ? emp.id : S.novoId('emp'), atualizadoEm: S.agoraIso() };
          const i = lista.findIndex((x) => x.id === registro.id);
          if (i >= 0) lista[i] = registro; else lista.push(registro);
          d.empresas = lista;
          delete d.empresa; // a ficha única de antes passou para a lista, como Matriz
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar('Dados da empresa salvos.');
        if (aoSalvar) aoSalvar();
        return undefined;
      },
    });
    return dlg;
  }

  /**
   * O que impede excluir a empresa, ou ''. Regras de proteção (18/11/2026): a Matriz só sai depois das outras (as outras se apoiam nela,
   * e a primeira empresa cadastrada é sempre a Matriz); empresa usada em contrato de fornecedor ou de cliente não sai (o vínculo é por id).
   */
  function impedimentoDeExcluir(x, lista, dados) {
    if (x.vinculo === 'matriz' && lista.some((y) => y.id !== x.id)) return 'A Matriz só pode ser excluída depois das outras empresas. Exclua antes as outras, ou edite os dados da Matriz.';
    const usa = (r, chave) => Boolean(r && r.contrato && r.contrato[chave] === x.id && r.contrato[chave === 'contratanteEmpresaId' ? 'tem' : 'temDocumento']);
    const nF = (dados.fornecedores || []).filter((r) => usa(r, 'contratanteEmpresaId')).length; const nC = (dados.clientes || []).filter((r) => usa(r, 'contratadaEmpresaId')).length;
    if (nF || nC) return 'Esta empresa está em ' + [nF && nF + (nF === 1 ? ' contrato de fornecedor' : ' contratos de fornecedor'), nC && nC + (nC === 1 ? ' contrato de cliente' : ' contratos de cliente')].filter(Boolean).join(' e ') + '. Troque a empresa nesses contratos antes de excluir, ou deixe-a inativa.';
    return '';
  }
  function excluirEmpresa(x) {
    const nome = x.nomeFantasia || x.razaoSocial || 'Empresa sem nome';
    const falta = impedimentoDeExcluir(x, todas(), S.dados);
    if (falta) { U.dialogo({ titulo: 'Não é possível excluir', cor: A.COR, corTexto: A.COR_TEXTO, montar: (form) => { form.append(el('p', null, falta)); } }); return; }
    U.confirmar('Excluir empresa', 'A empresa "' + nome + '" e os responsáveis legais cadastrados nela serão apagados. Não dá para desfazer.', 'Excluir', () => {
      const ok = S.transacao((d) => { const lista = empresasEm(d).filter((y) => y.id !== x.id); d.empresas = lista; delete d.empresa; });
      if (!ok) return 'Não foi possível excluir. Tente de novo.';
      U.avisar('Empresa excluída.'); render(); return undefined;
    }, { cor: A.COR, corTexto: A.COR_TEXTO });
  }

  /* Tela "Dados da Empresa": a lista das empresas (a Matriz primeiro), com o botão de cadastrar outra. Um toque na linha abre a ficha para
     leitura; dois toques, ou a seta da direita (Editar e Excluir), abrem para editar — o mesmo padrão das outras listas. */
  let tela = null;
  function render() {
    const lista = todas();
    const ponta = U.pontaDaLista(lista.length, lista.length + (lista.length === 1 ? ' empresa cadastrada' : ' empresas cadastradas'));
    const sec = U.secao('Empresas', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo(lista.length ? 'Nova Empresa' : 'Cadastrar Matriz', lista.length ? 'Cadastrar outra empresa (filial, mesmo grupo, franquia ou loja parceira)' : 'Cadastrar a primeira empresa, a Matriz', () => abrirFicha(null, render)));
    const linhas = el('div', 'compras-lista');
    if (!lista.length) linhas.append(U.vazio('Nenhuma empresa cadastrada.', 'Comece pela Matriz, a empresa principal.'));
    lista.forEach((x) => {
      const quantos = x.responsaveisDaMatriz ? 'responsáveis da Matriz' : (x.responsaveis || []).length + ((x.responsaveis || []).length === 1 ? ' responsável legal' : ' responsáveis legais');
      const nome = x.nomeFantasia || x.razaoSocial || 'Empresa sem nome';
      const row = U.linhaLista({
        icone: 'fornecedor', titulo: nome,
        detalhe: [nomeDoVinculo(x.vinculo) || 'Sem vínculo', x.cnpj, x.razaoSocial, quantos].filter(Boolean).join(' · '),
        direita: el('span', 'account-list-state', x.situacao === 'inativo' ? 'Inativa' : 'Ativa'),
        acoes: { rotulo: nome, lista: linhas, aoEditar: () => abrirFicha(x, render, { editar: true }), aoExcluir: () => excluirEmpresa(x) },
      });
      const arrow = row.querySelector('.account-action-toggle'); const drawer = row.querySelector('.account-row-actions');
      const toque = U.umOuDoisToques(() => abrirFicha(x, render), () => abrirFicha(x, render, { editar: true }));
      row.onclick = (e) => { if (e.target.closest('button')) return; if (!drawer.hidden) { drawer.hidden = true; arrow.setAttribute('aria-expanded', 'false'); return; } toque(); };
      row.onkeydown = (e) => { if (e.target === row && e.key === 'Enter') { e.preventDefault(); abrirFicha(x, render); } };
      row.setAttribute('aria-label', 'Ver dados de ' + nome);
      linhas.append(row);
    });
    sec.append(linhas);
    tela.body.replaceChildren(U.infoDaLista(sec, 'A primeira empresa é a Matriz. As outras entram com o tipo de vínculo e têm os próprios responsáveis legais, ou usam os da Matriz.', 'empresas'));
  }
  function abrir() {
    if (!tela) tela = A.criarTela({ id: 'acessos-empresa', titulo: 'Dados da Empresa', tela: 'empresa' });
    tela.ativar();
    render();
  }

  A.registrar('empresa', abrir);

  /* Estrutura de Dados da Empresa (18/11/2026, Rodrigo): por enquanto só o cartão no menu. O conteúdo ainda vai ser definido por ele;
     a tela diz isso e não grava nada. */
  let telaEstrutura = null;
  function abrirEstrutura() {
    if (!telaEstrutura) telaEstrutura = A.criarTela({ id: 'acessos-empresa-estrutura', titulo: 'Estrutura de Dados da Empresa', tela: 'empresa-estrutura' });
    telaEstrutura.ativar();
    telaEstrutura.body.replaceChildren(U.vazio('Em definição.', 'O conteúdo desta tela ainda vai ser definido. Nada é gravado aqui por enquanto.'));
  }
  A.registrar('empresa-estrutura', abrirEstrutura);
  window.CicluzEmpresa = { abrir, abrirFicha, validarEmpresa, validarEmpresaEtapas, impedimentoDeExcluir, blocoResponsavel, lerResponsavel, responsaveisDe, validarResponsaveis, ESTADOS_CIVIS, ETAPAS, VINCULOS, CARGOS_EMPRESA, MOTIVOS_REPRESENTACAO, VINCULOS_REPRESENTANTE, idadeEm, formaDaRepresentacao, todas, dados: () => todas()[0] || null };
})();
