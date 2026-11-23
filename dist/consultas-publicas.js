/*
 * Consultas públicas de CNPJ e de CEP, para preencher cadastro (15/11/2026, pedido do Rodrigo no cadastro de fornecedor).
 * Chamada externa: BrasilAPI (https://brasilapi.com.br), direto do navegador. Vai SÓ o número do CNPJ (dado público
 * de empresa) ou do CEP; nunca CPF, nome nem dado de contato. Tem tempo limite e nunca trava o formulário: sem
 * internet, com o serviço fora do ar ou com resposta estranha, devolve { erro } e a pessoa digita à mão.
 * As funções "normalizar" são puras (testadas em tests/consultas-publicas.cjs).
 */
(function (root) {
  'use strict';
  const BASE = 'https://brasilapi.com.br/api';
  const TEMPO_LIMITE_MS = 8000;
  const digitos = (v) => String(v || '').replace(/\D/g, '');
  // Texto no padrão de nomes do sistema (formatSystemName, quando a tela carregou a regra): a Receita e os Correios
  // devolvem tudo em maiúsculas; o cadastro guarda "Padaria Exemplo Ltda", "Rua das Flores".
  const texto = (v) => { const t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return typeof root.formatSystemName === 'function' ? root.formatSystemName(t) : t; };
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const uf = (v) => { const u = texto(v).toUpperCase(); return UFS.includes(u) ? u : ''; };
  const cepMask = (v) => { const d = digitos(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };

  /** Resposta do serviço de CNPJ no formato do cadastro. Campo que não veio fica ''. */
  function normalizarCnpj(j) {
    if (!j || typeof j !== 'object') return null;
    const tipo = texto(j.descricao_tipo_de_logradouro);
    const rua = texto(j.logradouro);
    return {
      razaoSocial: texto(j.razao_social),
      nomeFantasia: texto(j.nome_fantasia),
      endereco: {
        cep: cepMask(j.cep),
        logradouro: tipo && rua && !rua.toUpperCase().startsWith(tipo.toUpperCase()) ? tipo + ' ' + rua : rua,
        numero: texto(j.numero), complemento: texto(j.complemento), bairro: texto(j.bairro), cidade: texto(j.municipio), uf: uf(j.uf),
      },
    };
  }
  /** Resposta do serviço de CEP no formato do cadastro. */
  function normalizarCep(j) {
    if (!j || typeof j !== 'object') return null;
    return { cep: cepMask(j.cep), logradouro: texto(j.street), bairro: texto(j.neighborhood), cidade: texto(j.city), uf: uf(j.state) };
  }

  async function buscar(caminho) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    try {
      const r = await fetch(BASE + caminho, { signal: controle.signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (r.status === 404) return { erro: 'nao-encontrado' };
      // O motivo real aparece na mensagem (o serviço respondeu com erro, limite de consultas, tempo esgotado ou sem conexão).
      if (!r.ok) return { erro: 'indisponivel', motivo: r.status === 429 ? 'limite de consultas do serviço' : 'o serviço respondeu com erro ' + r.status };
      return { dados: await r.json() };
    } catch (e) {
      return { erro: 'indisponivel', motivo: e && e.name === 'AbortError' ? 'tempo esgotado' : 'sem conexão com o serviço' };
    } finally {
      clearTimeout(relogio);
    }
  }
  /** Dados públicos da empresa pelo CNPJ (14 dígitos): { dados: { razaoSocial, nomeFantasia, endereco } } ou { erro }. */
  async function cnpj(numero) {
    const n = digitos(numero);
    if (n.length !== 14) return { erro: 'invalido' };
    const r = await buscar('/cnpj/v1/' + n);
    if (r.erro) return r;
    const dados = normalizarCnpj(r.dados);
    return dados ? { dados } : { erro: 'indisponivel' };
  }
  /** Endereço pelo CEP (8 dígitos): { dados: { cep, logradouro, bairro, cidade, uf } } ou { erro }. */
  async function cep(numero) {
    const n = digitos(numero);
    if (n.length !== 8) return { erro: 'invalido' };
    const r = await buscar('/cep/v2/' + n);
    if (r.erro) return r;
    const dados = normalizarCep(r.dados);
    return dados ? { dados } : { erro: 'indisponivel' };
  }

  const api = { UFS, cepMask, normalizarCnpj, normalizarCep, cnpj, cep };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzConsultas = api;
})(typeof self !== 'undefined' ? self : this);
