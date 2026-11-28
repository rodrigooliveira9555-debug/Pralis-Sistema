/*
 * Área ConPlus (laboratório, 27/11/2026) — o layout de importação do Questor, registro a registro.
 * Fontes: o nome e o campo de cada coluna vêm dos .nli aprovados pela ConPlus (campos-nli.js, lidos em 27/11/2026); as regras
 * (obrigatórios, códigos aceitos, consultas, dicas) vêm da documentação da ConPlus (nweb.evolvisolucoes.com.br/readme, seções 05
 * e 09). Os .nli não dizem o que é obrigatório: obrigatório aqui é só o que a doc diz. Coluna que nenhuma das duas fontes nomeia
 * ficaria "Coluna N" (aConfirmar); depois dos .nli, nenhuma ficou assim.
 * Sem DOM. Testado em tests/conplus-dominio.cjs.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./campos-nli.js') : root.CicluzConplusCamposNli,
    isNode ? require('./regras-questor.js') : root.CicluzConplusRegrasQuestor,
    isNode ? require('./rotulos-questor.js') : root.CicluzConplusRotulosQuestor);
  if (isNode) module.exports = api;
  else root.CicluzConplusLayout = api;
}(typeof self !== 'undefined' ? self : this, function (NLI, REGRAS, ROTULOS) {
  'use strict';

  const CNPJ_HOMOLOGACAO = '84.859.909/0001-90';

  /* O modelo de admissão testado pela ConPlus na empresa de homologação em 24/11/2026 (dados fictícios) e a linha E
     de exemplo da doc. Gerar exatamente estas linhas é o primeiro teste de aceite da área. */
  const MODELO = {
    A: 'A;0;0;84.859.909/0001-90;3;900.100.237-47;MODELO ADMISSAO API;01/01/1995;01/12/2026;101;01;;45;45;;;;10786;1;2500,00;',
    B: 'B;84.859.909/0001-90;;;36025-000;33;RUA DAS ACÁCIAS;100;;SÃO MATEUS;MG;420;MG;420;1;2;0;0;0;0;0;0;0;;1;7;10;;;1;;1;1234567;0010;MG;;1;01/12/2026;10;1;001.999;2;20;0;;;;0;0;0;0;0;0;0;0;0;1;1;40,00;1;;;;;;0;00;;;0;0;8794;1;9;Demais tipos de jornada;0;;;00;0;;MARIA DA CONCEIÇÃO TESTE;1;0;0',
    C: 'C;84.859.909/0001-90;;;;;32;33334444;;32;999998888;modelo@exemplo.com.br;;;;;;;;;;MG1234567;;;MG;10/01/2015;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;',
    D: 'D;84.859.909/0001-90;900.100.237-47;01/12/2026;1;FILHO MODELO API;01/01/2020;01;;1;1;0;;;;;;1;;;;;10;;;;;;;0;0',
    E: 'E;84.859.909/0001-90;2505;1;1;318;5,00;0,00;;;;;0;',
  };

  /*
   * Colunas conhecidas. Campos: nome (rótulo), campo (nome no Questor, quando a doc diz), tipo (cnpj, cpf, data, decimal,
   * inteiro, codigo, email, texto), obrig, fixo ('valor' ou 'cnpj'), deriva (cópia de outra coluna), opcoes, depara
   * (tabela de-para que ajuda a preencher), consulta (consulta do Questor que traz os códigos), dica.
   * Colunas em faixa (grupo) recebem o rótulo do grupo quando não têm nome próprio.
   */
  const REGISTROS = {
    A: {
      nome: 'Contrato (pré-admissão)', layout: 'A_FunContratoPre.nli', colunas: 21, grupo: 'Admissao',
      dica: 'Uma pessoa por arquivo. A linha A volta da ConPlus com o código do contrato (CODIGOFUNCCONTR). O campo GERARPRELIMINAR = 1 gera o S-2190 do eSocial; a doc não diz a coluna.',
      conhecidas: {
        4: { nome: 'CNPJ da empresa', tipo: 'cnpj', obrig: true, fixo: 'cnpj' },
        6: { nome: 'CPF', tipo: 'cpf', obrig: true, dica: 'Com pontuação. Troque por outro CPF fictício válido para gravar uma pessoa nova.' },
        7: { nome: 'Nome', tipo: 'texto', obrig: true },
        8: { nome: 'Data de nascimento', tipo: 'data', obrig: true },
        9: { nome: 'Data de admissão', tipo: 'data', obrig: true },
        13: { nome: 'Dias de experiência', tipo: 'inteiro' },
        14: { nome: 'Dias de prorrogação', tipo: 'inteiro' },
        18: { nome: 'Cargo', campo: 'CODIGOCARGO', tipo: 'codigo', obrig: true, depara: 'cargo', consulta: 'nFpaDCCargoEmpresa' },
        20: { nome: 'Salário', campo: 'VALORSAL', tipo: 'decimal', obrig: true, dica: 'Vírgula como separador decimal, sem ponto de milhar (ex.: 2500,00).' },
      },
    },
    B: {
      nome: 'Dados obrigatórios da admissão', layout: 'B_DadosObrigatoriosAdmissao.nli', colunas: 85, grupo: 'Admissao',
      dica: 'Obrigatório junto com o A. Depois de gravado, o B só é corrigido pela ConPlus no Questor.',
      grupos: [
        [5, 14, 'Endereço, município e naturalidade', 'Município é o código do cadastro do Questor (nGemDCMunicipio), não o do IBGE: Juiz de Fora é 420.'],
        [33, 35, 'CTPS'],
        [49, 54, 'Opção da contribuição sindical', 'O Questor recusa o B com qualquer uma vazia: use 0 (Não) quando não se aplicar.'],
        [61, 65, 'Pagamento em conta'],
      ],
      conhecidas: {
        2: { nome: 'CNPJ da empresa', tipo: 'cnpj', obrig: true, fixo: 'cnpj' },
        12: { depara: 'municipio', consulta: 'nGemDCMunicipio' },
        14: { depara: 'municipio', consulta: 'nGemDCMunicipio' },
        38: { nome: 'Data de opção do FGTS', tipo: 'data', dica: 'No modelo, a data de admissão.' },
        40: { nome: 'Filial / estabelecimento', campo: 'CODIGOESTAB', tipo: 'codigo', obrig: true, depara: 'filial', consulta: 'nGemDCEstab', dica: 'A matriz costuma ser 1.' },
        41: { nome: 'Organograma', campo: 'CLASSIFORGAN', tipo: 'texto', obrig: true, consulta: 'nFpaDCOrganograma', dica: 'Classificação analítica (TIPOCONTA vazio), como 001.999.' },
        48: { nome: 'Local contábil', campo: 'CODIGOLOCALCTB', tipo: 'codigo', obrig: true, consulta: 'nFpaDCLocalContabil', dica: '0 ("Nenhum") quando a empresa não usa local contábil.' },
        49: { tipo: 'codigo', obrig: true }, 50: { tipo: 'codigo', obrig: true }, 51: { tipo: 'codigo', obrig: true },
        52: { tipo: 'codigo', obrig: true }, 53: { tipo: 'codigo', obrig: true }, 54: { tipo: 'codigo', obrig: true },
        56: { nome: 'Cláusula assecuratória', tipo: 'codigo', obrig: true, dica: '0 (Não) quando não se aplicar.' },
        57: { nome: 'Recebe adiantamento', campo: 'RECEBEADTO', tipo: 'codigo', opcoes: [['1', 'No mês da admissão'], ['2', 'Mês seguinte'], ['3', 'Não recebe'], ['4', 'Após o tempo de experiência']], dica: 'Siga a configuração da filial (na homologação: 1).' },
        59: { nome: 'Percentual de adiantamento', campo: 'PERCADTO', tipo: 'decimal', dica: 'Siga a filial (na homologação: 40,00).' },
        60: { nome: 'Modo de pagamento', campo: 'MODOPGTO', tipo: 'codigo', dica: '3 = Bancária (pede tipo de conta, banco, agência, conta e dígito).' },
        61: { nome: 'Tipo de conta', tipo: 'codigo' },
        62: { nome: 'Banco', campo: 'CODIGOBANCO', tipo: 'codigo', depara: 'banco', consulta: 'nGemDCBanco' },
        63: { nome: 'Agência (sem o dígito)', campo: 'NUMEROAGENCIA', tipo: 'codigo', consulta: 'nGemDCAgencia', dica: 'Só agência já cadastrada no Questor.' },
        64: { nome: 'Conta', tipo: 'texto' },
        65: { nome: 'Dígito da conta', tipo: 'texto' },
        72: { nome: 'Escala', campo: 'CODIGOESCALA', tipo: 'codigo', depara: 'escala', consulta: 'nFpaDCEscalaEmpresa' },
        74: { nome: 'Tipo de jornada', campo: 'TIPOJORNADA', tipo: 'codigo', dica: '0 (Não se aplica) não vale para o eSocial: a API recusa.' },
        75: { nome: 'Descrição da jornada', campo: 'DESCRTIPOJORNADA', tipo: 'texto' },
        82: { nome: 'Nome da mãe', tipo: 'texto' },
      },
    },
    C: {
      nome: 'Dados não obrigatórios', layout: 'C_DadosNaoObrigatoriosAdmissao.nli', colunas: 67, grupo: 'Admissao', opcional: true,
      dica: 'Uma linha só quando houver algum dado complementar. Linha C vazia não é enviada.',
      grupos: [[7, 12, 'Telefone, celular e e-mail'], [22, 26, 'RG']],
      conhecidas: {
        2: { nome: 'CNPJ da empresa', tipo: 'cnpj', obrig: true, fixo: 'cnpj' },
        3: { nome: 'Preenchida pelo Questor a partir do A', fixo: 'valor', valor: '' },
        12: { tipo: 'email' },
        62: { nome: 'Órgão emissor do RG', tipo: 'texto', dica: 'Sigla, como SSP.' },
        63: { nome: 'Órgão emissor da CNH', tipo: 'texto', dica: 'Sigla, como DETRAN.' },
        64: { nome: 'Modalidade de contratação do aprendiz', campo: 'INDAPREND', tipo: 'codigo', opcoes: [['1', 'Contratação direta'], ['2', 'Contratação indireta']] },
        67: { nome: 'Órgão emissor do RNE', tipo: 'texto', dica: 'Sigla, como DPF.' },
      },
    },
    D: {
      nome: 'Dependente (rascunho)', layout: 'D_DependenteRascunho.nli', colunas: 31, grupo: 'Admissao', opcional: true, varios: true,
      dica: 'Uma linha por dependente. Obrigatórios (doc da ConPlus): código, nome, nascimento, parentesco, sexo, estado civil, grau de instrução, forma de controle do IR, nacionalidade, fumante e consome álcool.',
      conhecidas: {
        2: { nome: 'CNPJ da empresa', tipo: 'cnpj', obrig: true, fixo: 'cnpj' },
        3: { nome: 'CPF do titular', tipo: 'cpf', obrig: true, deriva: ['A', 6] },
        4: { nome: 'Admissão do titular', tipo: 'data', obrig: true, deriva: ['A', 9] },
        5: { nome: 'Código do dependente', campo: 'CODIGODEPEND', tipo: 'inteiro', obrig: true, dica: '1, 2, 3…' },
        6: { nome: 'Nome do dependente', tipo: 'texto', obrig: true },
        7: { nome: 'Nascimento do dependente', tipo: 'data', obrig: true },
        8: { nome: 'Parentesco', tipo: 'codigo', obrig: true },
        9: { nome: 'CPF do dependente', tipo: 'cpf', dica: 'Não obrigatório no layout.' },
        13: { nome: 'Auxílio-creche: idade mínima (meses)', campo: 'IDADEMINCRECHE', tipo: 'inteiro' },
        14: { nome: 'Auxílio-creche: idade máxima (meses)', campo: 'IDADELIMCRECHE', tipo: 'inteiro' },
        10: { tipo: 'codigo', obrig: true }, 11: { tipo: 'codigo', obrig: true }, 12: { tipo: 'codigo', obrig: true },
        17: { nome: 'Incapaz para o trabalho', campo: 'INCAPAZTRABALHAR', tipo: 'codigo' },
        18: { tipo: 'codigo', obrig: true }, 23: { tipo: 'codigo', obrig: true }, 30: { tipo: 'codigo', obrig: true }, 31: { tipo: 'codigo', obrig: true },
      },
    },
    E: {
      nome: 'Evento variável', layout: 'EventoVariavel.nli', colunas: 13, grupo: 'EventoVariavel', pontoFinal: true,
      dica: 'O lançamento é identificado por empresa, período, SEQ e contrato. Repetir o SEQ não grava de novo.',
      conhecidas: {
        2: { nome: 'CNPJ da empresa', tipo: 'cnpj', obrig: true, fixo: 'cnpj' },
        3: { nome: 'Período de cálculo', campo: 'CODIGOPERCALCULO', tipo: 'codigo', obrig: true, consulta: 'nFpaDCPeriodoCalculo2' },
        4: { nome: 'SEQ', tipo: 'inteiro', obrig: true, dica: 'Gerado uma vez e guardado pelo S2.' },
        5: { nome: 'Contrato do empregado', campo: 'CODIGOFUNCCONTR', tipo: 'codigo', obrig: true, consulta: 'nFpaDCFuncContratoEstab' },
        6: { nome: 'Evento', campo: 'CODIGOEVENTO', tipo: 'codigo', obrig: true, depara: 'evento', consulta: 'nFpaDCEventoMenor1000' },
        7: { nome: 'Referência', tipo: 'decimal' },
        8: { nome: 'Valor', tipo: 'decimal' },
        9: { nome: 'Beneficiado (pensão judicial)', fixo: 'valor', valor: '' },
        10: { nome: 'Outra empresa', campo: 'CODIGOOUTEMP', fixo: 'valor', valor: '' },
        11: { nome: 'Centro de custo', fixo: 'valor', valor: '' },
        12: { nome: 'Tipo de aula', fixo: 'valor', valor: '' },
        13: { nome: 'Buscar último valor calculado', campo: 'BUSCARULTVALORCALC', obrig: true, fixo: 'valor', valor: '0', dica: '0. O 1 só vale na rescisão complementar.' },
      },
    },
  };

  const DATA = /^\d{2}\/\d{2}\/\d{4}$/;
  const DECIMAL = /^\d+,\d+$/;
  const CPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
  /** Tipo de uma coluna que a doc não nomeia: o formato do valor no modelo testado (data, decimal ou CPF); senão, texto livre. */
  const tipoPeloModelo = (v) => (DATA.test(v) ? 'data' : DECIMAL.test(v) ? 'decimal' : CPF.test(v) ? 'cpf' : 'texto');

  const cache = {};
  /** As colunas completas de um registro (1..N), com rótulo, tipo e o valor do modelo. A coluna 1 é o identificador. */
  function colunas(reg) {
    if (cache[reg]) return cache[reg];
    const R = REGISTROS[reg];
    if (!R) return null;
    const modelo = MODELO[reg].split(';');
    const lista = [];
    for (let n = 1; n <= R.colunas; n++) {
      const k = R.conhecidas[n] || {};
      const q = (NLI && NLI.porColuna[reg] && NLI.porColuna[reg][n]) || null; // nome e campo do .nli
      const rq = (q && REGRAS && REGRAS.regra(reg, q.campo)) || null; // regra oficial da documentação do Questor (via S1)
      const tipoRegra = rq && rq.tipo !== 'texto' ? (rq.tipo === 'logico' ? 'codigo' : rq.tipo) : '';
      const opcoesRegra = rq && rq.dominio ? rq.dominio.filter((x) => x !== '').map((x) => [x, (ROTULOS && ROTULOS.rotulo(q.campo, x, rq.tipo === 'logico')) || '']) : null;
      const g = (R.grupos || []).find(([de, ate]) => n >= de && n <= ate);
      const valorModelo = modelo[n - 1] || '';
      const c = {
        n, registro: reg,
        nome: n === 1 ? 'Identificador do registro' : k.nome || (q && q.nome) || (g ? g[2] + ' (coluna ' + n + ')' : 'Coluna ' + n),
        campo: (q && q.campo) || k.campo || '', tipo: n === 1 ? 'texto' : k.tipo || (q && q.tipo) || tipoRegra || tipoPeloModelo(valorModelo),
        obrig: n === 1 || Boolean(k.obrig), aConfirmar: n !== 1 && !k.nome && !q,
        obrigDoc: Boolean(rq && rq.obrigDoc) && !k.obrig && !k.fixo && !k.deriva, tamanho: (rq && rq.tamanho) || 0, dominio: (rq && rq.dominio) || null,
        fixo: n === 1 ? 'valor' : k.fixo || '', valor: n === 1 ? reg : k.valor,
        deriva: k.deriva || null, opcoes: k.opcoes || opcoesRegra || null, depara: k.depara || '', consulta: k.consulta || '',
        dica: [k.dica, g && g[3] && n === g[0] ? g[3] : ''].filter(Boolean).join(' '), modelo: valorModelo,
      };
      lista.push(c);
    }
    cache[reg] = lista;
    return lista;
  }

  /** Rótulo curto de uma coluna, como a API escreve nos erros: "VALORSAL (coluna 20)" ou "Nome (coluna 7)". */
  const rotuloErro = (c) => (c.campo || c.nome) + ' (coluna ' + c.n + ')';

  return { CNPJ_HOMOLOGACAO, MODELO, REGISTROS, colunas, rotuloErro, tipoPeloModelo };
}));
