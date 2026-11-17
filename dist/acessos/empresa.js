/*
 * Configurações → Empresa → Dados da Empresa (pedido do Rodrigo, 17/11/2026).
 * Um cadastro só, o da própria empresa: os mesmos campos da 1ª etapa do cliente pessoa jurídica (CNPJ, razão social,
 * nome fantasia, regime tributário e endereço). Tocar no cartão abre direto o formulário, já com o que está gravado.
 * Fica em dados.empresa, dentro do mesmo documento do Compras (cicluz-compras-v1): campo novo e opcional, sem migração.
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos;
  const U = window.CicluzComprasUI;
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  if (!A || !U || !D || !S) return;
  const { el, campo, entrada, seletor } = U;
  const regras = () => window.CicluzFieldRules;
  const C = () => window.CicluzConsultas;
  const mascara = (input, fn) => { input.addEventListener('input', () => { input.value = fn(input.value); }); return input; };
  const cheio = (v) => String(v || '').trim();

  /** O que impede salvar ('' quando está em ordem): tudo é obrigatório, menos o complemento (a regra da 1ª etapa do cliente PJ). */
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
    // Responsável geral: opcional; o que vier preenchido precisa estar no formato.
    const r = x.responsavel || {};
    const fone = D.digitos(r.whatsapp);
    if (fone && (fone.length < 10 || fone.length > 11)) return 'WhatsApp do responsável geral inválido: informe o DDD e o número.';
    const mail = cheio(r.email);
    if (mail && (mail.includes(' ') || mail.split('@').length !== 2 || !mail.split('@')[0] || !mail.split('@')[1].includes('.'))) return 'E-mail do responsável geral inválido.';
    if (r.cargo && !D.CARGOS_REPRESENTANTE.some(([id]) => id === r.cargo)) return 'Cargo do responsável geral inválido.';
    return '';
  }

  function abrir() {
    const v = S.dados.empresa || {}; const e = v.endereco || {};
    U.dialogo({
      titulo: 'Dados da Empresa', cor: A.COR, corTexto: A.COR_TEXTO, largo: true, classe: 'compras-form-padrao', rotuloSalvar: 'Salvar',
      montar: (form) => {
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
        // Dados do responsável geral da empresa: os mesmos campos da etapa do cliente pessoa jurídica (nome, WhatsApp, e-mail e cargo).
        const rp = v.responsavel || {};
        const CAD = window.CicluzComprasCadastros;
        const rNome = texto(rp.nome);
        const rWhats = entrada('tel', rp.whatsapp || '', { inputMode: 'numeric', placeholder: '(00) 00000-0000' });
        if (CAD && CAD.mascaraTelefone) mascara(rWhats, CAD.mascaraTelefone);
        const rMail = entrada('email', rp.email || '', { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); rMail.dataset.textoLivre = '1';
        const rCargo = seletor(D.CARGOS_REPRESENTANTE, rp.cargo || '', 'Selecione');
        const responsavel = el('fieldset', 'compras-fieldset');
        responsavel.append(el('legend', null, 'Dados do responsável geral da empresa'), campo('Nome do responsável geral', rNome), campo('WhatsApp do responsável geral', rWhats), campo('E-mail do responsável geral', rMail), campo('Cargo na empresa', rCargo));
        form.append(empresa, endereco, responsavel);
        return {
          ler: () => ({
            cnpj: cnpj.value.trim(), razaoSocial: razao.value.trim(), nomeFantasia: fantasia.value.trim(), regimeTributario: regime.value,
            endereco: { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value },
            responsavel: { nome: rNome.value.trim(), whatsapp: rWhats.value.trim(), email: rMail.value.trim().toLocaleLowerCase('pt-BR'), cargo: rCargo.value },
          }),
        };
      },
      salvar: (ctx) => {
        const novo = ctx.ler();
        const falta = validarEmpresa(novo);
        if (falta) return falta;
        const ok = S.transacao((d) => { d.empresa = { ...(d.empresa || {}), ...novo, atualizadoEm: S.agoraIso() }; });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar('Dados da empresa salvos.');
        return undefined;
      },
    });
  }

  A.registrar('empresa', abrir);
  window.CicluzEmpresa = { abrir, validarEmpresa, dados: () => S.dados.empresa || null };
})();
