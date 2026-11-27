/*
 * Área ConPlus — do Cadastro completo do S2 para a admissão do Questor (registros A, B, C e D), com a lista do que falta.
 * Trazido do Sistema Pralis principal (S1): shared/src/conplus/questor-de-para.ts (textos da ficha → códigos da documentação
 * do Questor) e a ideia da "prontidão" (questor-prontidao.ts): dizer o que já está pronto, o que falta e com quem está.
 * Regra do S1 mantida: só converte quando o texto da ficha é o mesmo da documentação (sem interpretar); o resto vira pendência
 * explícita, nunca um código "parecido". Nada aqui grava: recebe a pessoa e devolve valores por coluna + pendências.
 * A pessoa vem de cicluz-pessoas-v1 (name, cpf, birthDate, email, whatsapp, jobName, complete.summary = [[campo, valor]],
 * complete.deps = [[[campo, valor], …], …]). Testado em tests/conplus-dominio.cjs (dados fictícios).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzConplusCadastroQuestor = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const digitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');
  const tabela = (pares) => Object.fromEntries(Object.entries(pares).map(([k, v]) => [norm(k), v]));

  /* De-para do S1 (questor-de-para.ts), com os textos da ficha do S2. Pendências: textos sem equivalente comprovado. */
  const DE_PARA = {
    SEXO: { codigos: tabela({ Masculino: '1', Feminino: '2' }), pendentes: {} },
    RACACOR: { codigos: tabela({ Indígena: '1', Branca: '2', Preta: '4', Amarela: '6', Parda: '8', 'Não Informado': '9' }),
      pendentes: tabela({ 'Não declarado': 'a ficha diz "Não declarado" e a documentação "Não Informado"; equivalência a confirmar com a ConPlus' }) },
    ESTADOCIVIL: { codigos: tabela({ Solteiro: '1', 'Solteiro(a)': '1', Casado: '2', 'Casado(a)': '2', 'Divorciado ou Separado Judicialmente': '3', 'Divorciado(a)': '3', 'Separado(a) judicialmente': '3', Viúvo: '4', 'Viúvo(a)': '4', Concubinato: '5', Outros: '6' }),
      pendentes: tabela({ 'União estável': 'a documentação não tem "União estável"; Concubinato (5) ou Outros (6) depende da ConPlus' }) },
    NACIONALIDADE: { codigos: tabela({ Brasileiro: '10', Brasileira: '10', 'Brasileiro nascido no exterior': '15', 'Naturalizado brasileiro': '20', 'Brasileira naturalizada': '20' }),
      pendentes: tabela({ Estrangeira: '"Estrangeira" não tem código: escolha a nacionalidade específica (21 a 70)' }) },
    // Mesma escala de 13 graus da documentação, com os textos curtos da ficha do S2 (mesma ordem, mesmo sentido).
    GRAUINSTR: { codigos: tabela({ Analfabeto: '1', 'Até o 5º ano incompleto': '2', 'Até o 5º ano incompleto do Ensino Fundamental': '2', '5º ano completo': '3', '5º ano completo do Ensino Fundamental': '3',
      '6º ao 9º ano incompleto': '4', 'Do 6º ao 9º ano do Ensino Fundamental incompleto': '4', 'Ensino fundamental completo': '5', 'Ensino médio incompleto': '6', 'Ensino médio completo': '7',
      'Educação superior incompleta': '8', 'Educação superior completa': '9', Especialização: '10', 'Mestrado completo': '11', 'Doutorado completo': '12', 'Ph. D.': '13' }), pendentes: {} },
    PARENTESCO: { codigos: tabela({ 'Filho(a)': '01', 'Filho/Filha': '01', Cônjuge: '02', 'Pai/Mãe': '03', Pai: '03', Mãe: '03', 'Enteado(a)': '11', 'Enteado/Enteada': '11', Outro: '14', Outros: '14', 'Menor Sob Tutela': '15' }),
      pendentes: tabela({ 'Companheiro(a)': 'a documentação só aceita companheiro(a) "com filho ou mais de 5 anos" (16); a ficha não registra a condição',
        'Tutelado(a)': 'a documentação fala em "Menor Sob Tutela" (15); a ficha não restringe o tutelado a menor' }) },
  };
  /** { ok, codigo } | { ok: false, motivo } */
  function converter(campo, valor) {
    const t = DE_PARA[campo]; const k = norm(valor);
    if (!t || !k) return { ok: false, motivo: 'vazio' };
    if (t.codigos[k]) return { ok: true, codigo: t.codigos[k] };
    if (t.pendentes[k]) return { ok: false, motivo: t.pendentes[k] };
    return { ok: false, motivo: '"' + valor + '" não tem código documentado para ' + campo };
  }
  const SIM_NAO = (v) => (norm(v) === 'sim' ? '1' : norm(v) === 'nao' ? '0' : '');
  const cpf = (v) => { const d = digitos(v); return d.length === 11 ? d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9) : ''; };
  // CEP no formato do modelo aceito pela ConPlus ("36025-000"); a documentação escreve "99.999-999".
  const cep = (v) => { const d = digitos(v); return d.length === 8 ? d.slice(0, 5) + '-' + d.slice(5) : ''; };
  const dataIso = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const dataBr = (t) => (/^\d{2}\/\d{2}\/\d{4}$/.test(String(t || '').trim()) ? String(t).trim() : '');
  /** Tipo de logradouro pelo começo do endereço, só nos 3 que o Questor da TNP tem (4 Avenida, 28 Praça, 33 Rua). */
  function tipoLograd(endereco) {
    const t = norm(endereco);
    if (/^(rua|r\.)\s/.test(t)) return '33';
    if (/^(avenida|av\.?)\s/.test(t)) return '4';
    if (/^(praca|pca\.?)\s/.test(t)) return '28';
    return '';
  }
  /** Telefone → [DDD, número] (11 dígitos = celular, 10 = fixo). */
  const telefone = (v) => { const d = digitos(v).replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 || d.length === 10 ? [d.slice(0, 2), d.slice(2)] : null; };

  /**
   * Monta a admissão de uma pessoa. ctx: { codigos: { municipio, cargo, escala, filial } (listas de de-para), cnpj }.
   * Devolve { a, b, c, d, pendencias: [{ registro, coluna, campo, motivo, com }] }, com = 'ficha' | 'DP' | 'códigos' | 'ConPlus'.
   * Só preenche o que vem da pessoa; o que é do contrato (data de admissão, salário, tipo de contrato…) fica com o DP.
   */
  function montarDaPessoa(pessoa, ctx = {}) {
    const p = pessoa || {}; const cod = ctx.codigos || {};
    const ficha = new Map(); (p.complete && p.complete.summary || []).forEach(([k, v]) => { if (!ficha.has(norm(k))) ficha.set(norm(k), String(v == null ? '' : v).trim()); });
    const f = (nome) => ficha.get(norm(nome)) || '';
    const a = {}; const b = {}; const c = {}; const d = []; const pend = [];
    const falta = (registro, coluna, campo, motivo, com) => pend.push({ registro, coluna, campo, motivo, com });
    const por = (registro, coluna, campo, valor, motivoVazio, com = 'ficha') => { const alvo = { A: a, B: b, C: c }[registro]; if (valor) alvo[coluna] = valor; else if (motivoVazio) falta(registro, coluna, campo, motivoVazio, com); };
    const deParaCampo = (registro, coluna, campo, valor, alvo) => {
      if (!valor) { falta(registro, coluna, campo, 'a ficha não tem este dado', 'ficha'); return; }
      const r = converter(campo, valor); if (r.ok) alvo[coluna] = r.codigo; else falta(registro, coluna, campo, r.motivo, 'ConPlus');
    };
    const codigoPorNome = (lista, nome, uf) => { const n = norm(nome); if (!n) return ''; const achados = (lista || []).filter((x) => norm(x.descricao) === n || norm(x.de) === n); return achados.length === 1 ? achados[0].para : ''; };

    // A — contrato (o que vem da pessoa)
    por('A', 6, 'CPFFUNC', cpf(p.cpf || f('CPF')), 'CPF ausente ou inválido');
    por('A', 7, 'NOMEFUNC', (p.name || f('Nome completo')).toUpperCase(), 'sem nome');
    por('A', 8, 'DATANASC', dataIso(p.birthDate) || dataBr(f('Data de nascimento')), 'sem data de nascimento');
    // A — contrato (com o DP)
    [[5, 'CODIGOTIPOCONTR'], [9, 'DATAADM'], [10, 'CATEGESOCIAL'], [11, 'CATEGORIA'], [12, 'CODIGOSIND'], [13, 'DIACONTREXP'], [14, 'DIAPRORROGCONTREXP'], [19, 'TIPOSALARIO'], [20, 'VALORSAL']]
      .forEach(([n, campo]) => falta('A', n, campo, 'dado do contrato', 'DP'));
    const cargo = codigoPorNome(cod.cargo, p.jobName);
    if (cargo) a[18] = cargo; else falta('A', 18, 'CODIGOCARGO', p.jobName ? 'cargo "' + p.jobName + '" sem código na tabela de cargos' : 'pessoa sem cargo', p.jobName ? 'códigos' : 'DP');

    // B — endereço, naturalidade e pessoais
    por('B', 5, 'CEPFUNC', cep(f('CEP')), 'sem CEP válido');
    const lograd = f('Logradouro');
    por('B', 7, 'ENDERFUNC', lograd.toUpperCase(), 'sem logradouro');
    const tl = tipoLograd(lograd); if (tl) b[6] = tl; else if (lograd) falta('B', 6, 'CODIGOTIPOLOGRAD', 'tipo de logradouro não reconhecido no início do endereço', 'DP');
    por('B', 8, 'NUMEROENDER', f('Número'), 'sem número');
    if (f('Complemento')) b[9] = f('Complemento').toUpperCase();
    por('B', 10, 'BAIRROFUNC', f('Bairro').toUpperCase(), 'sem bairro');
    por('B', 11, 'SIGLAESTADO', f('UF').toUpperCase(), 'sem UF');
    const mun = codigoPorNome(cod.municipio, f('Município'));
    if (mun) b[12] = mun; else falta('B', 12, 'CODIGOMUNIC', f('Município') ? 'município "' + f('Município') + '" sem código na tabela de municípios' : 'sem município', f('Município') ? 'códigos' : 'ficha');
    por('B', 13, 'SIGLAESTADONASC', f('UF onde nasceu').toUpperCase(), 'sem UF de nascimento');
    const nat = codigoPorNome(cod.municipio, f('Naturalidade'));
    if (nat) b[14] = nat; else falta('B', 14, 'CODIGOMUNICNASC', f('Naturalidade') ? 'naturalidade "' + f('Naturalidade') + '" sem código na tabela de municípios' : 'sem naturalidade', f('Naturalidade') ? 'códigos' : 'ficha');
    deParaCampo('B', 15, 'SEXO', f('Sexo'), b);
    deParaCampo('B', 16, 'RACACOR', f('Raça/cor'), b);
    deParaCampo('B', 25, 'ESTADOCIVIL', f('Estado civil'), b);
    deParaCampo('B', 26, 'GRAUINSTR', f('Escolaridade'), b);
    deParaCampo('B', 27, 'NACIONALIDADE', f('Nacionalidade'), b);
    const prim = SIM_NAO(f('Primeiro emprego com carteira assinada?'));
    if (prim) { b[84] = prim; b[42] = prim === '1' ? '1' : '2'; b[43] = prim === '1' ? '10' : '20'; } else falta('B', 84, 'INDICATPRIMEMP', 'a ficha não diz se é o primeiro emprego', 'ficha');
    const seguro = SIM_NAO(f('Está recebendo seguro-desemprego?')); if (seguro) b[44] = seguro;
    por('B', 82, 'MAE', f('Nome da mãe').toUpperCase(), 'sem nome da mãe');
    if (f('Nome do pai')) b[81] = f('Nome do pai').toUpperCase();
    [[3, 'PISFUNC'], [33, 'NUMEROCTPS'], [34, 'SERIECTPS'], [35, 'SIGLAESTADOCTPS']].forEach(([n, campo]) => falta('B', n, campo, 'a ficha ainda não coleta este dado', 'ficha'));
    const escala = codigoPorNome(cod.escala, p.shift && (p.shift.name || p.shift));
    if (escala) b[72] = escala; else falta('B', 72, 'CODIGOESCALA', 'escala de trabalho', 'DP');
    const filiais = (cod.filial || []).filter((x) => !ctx.cnpj || digitos(x.cnpj) === digitos(ctx.cnpj));
    if (filiais.length === 1) b[40] = filiais[0].para; else falta('B', 40, 'CODIGOESTAB', filiais.length ? 'mais de uma filial: escolha a da pessoa' : 'empresa sem filial na tabela de códigos', 'DP');
    [[41, 'CLASSIFORGAN'], [48, 'CODIGOLOCALCTB'], [57, 'RECEBEADTO'], [59, 'PERCADTO'], [60, 'MODOPGTO'], [74, 'TIPOJORNADA']].forEach(([n, campo]) => falta('B', n, campo, 'dado do contrato', 'DP'));

    // C — contato e nome social
    if (f('Nome social')) c[4] = f('Nome social').toUpperCase();
    const tel = telefone(f('Telefone') || p.whatsapp);
    if (tel) { if (tel[1].length === 9) { c[10] = tel[0]; c[11] = tel[1]; } else { c[7] = tel[0]; c[8] = tel[1]; } }
    if (f('E-mail') || p.email) c[12] = (f('E-mail') || p.email).trim();

    // D — dependentes
    (p.complete && p.complete.deps || []).forEach((linhas, i) => {
      const m = new Map(linhas.map(([k, v]) => [norm(k), String(v == null ? '' : v).trim()]));
      const g = (k) => m.get(norm(k)) || '';
      const dep = { 5: String(i + 1) };
      const q = (n, campo, motivo, com) => falta('D' + (i + 1), n, campo, motivo, com);
      if (g('Nome completo')) dep[6] = g('Nome completo').toUpperCase(); else q(6, 'NOMEDEPEND', 'sem nome', 'ficha');
      if (dataBr(g('Data de nascimento'))) dep[7] = dataBr(g('Data de nascimento')); else q(7, 'DATANASC', 'sem data de nascimento', 'ficha');
      [[8, 'PARENTESCO', 'Parentesco'], [10, 'SEXO', 'Sexo'], [11, 'ESTADOCIVIL', 'Estado civil'], [12, 'GRAUINSTR', 'Escolaridade'], [23, 'NACIONALIDADE', 'Nacionalidade']].forEach(([n, campo, rot]) => {
        const v = g(rot); if (!v) { q(n, campo, 'a ficha não tem este dado', 'ficha'); return; }
        const r = converter(campo, v); if (r.ok) dep[n] = r.codigo; else q(n, campo, r.motivo, 'ConPlus');
      });
      if (cpf(g('CPF'))) dep[9] = cpf(g('CPF'));
      q(18, 'FORMACONTROLEIR', 'forma de controle do IR', 'DP');
      q(30, 'FUMANTE', 'a ficha ainda não coleta este dado', 'ficha');
      q(31, 'CONSOMEALCOOL', 'a ficha ainda não coleta este dado', 'ficha');
      d.push(dep);
    });
    return { a, b, c, d, pendencias: pend };
  }

  /** Resumo da prontidão: quantas pendências com cada um. */
  function resumo(pendencias) {
    const r = { ficha: 0, DP: 0, 'códigos': 0, ConPlus: 0 };
    (pendencias || []).forEach((x) => { r[x.com] = (r[x.com] || 0) + 1; });
    return r;
  }

  return { DE_PARA, converter, montarDaPessoa, resumo, formatos: { cpf, cep, dataIso, tipoLograd, telefone } };
}));
