/*
 * Área ConPlus — o nome de cada coluna, tirado dos .nli aprovados pela ConPlus (WorkDrive "API nWeb", lidos em 27/11/2026):
 * A_FunContratoPre, B_DadosObrigatoriosAdmissao, C_DadosNaoObrigatoriosAdmissao, D_DependenteRascunho e EventoVariavel.
 * Cada item: [coluna, campo no Questor, rótulo em português, tipo]. O tipo vem do .nli (Precisao = 2 → decimal) ou do nome do
 * campo (DATA…, EXPED…, VALID…, EMISS… → data; CPF… → cpf). Os .nli NÃO dizem o que é obrigatório (isso está no manual).
 * Campos que o .nli marca como Ignorar ou na coluna 1 não vão no arquivo e ficam fora daqui.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzConplusCamposNli = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const D = 'data'; const N = 'decimal'; const C = 'cpf'; const J = 'cnpj';
  const CAMPOS = {
    A: [
      [2, 'TERMOCONSENTIMENTO', 'Termo de consentimento'], [3, 'GERARPRELIMINAR', 'Gerar evento preliminar (S-2190)'], [4, 'CODIGOEMPRESA', 'CNPJ da empresa', J],
      [5, 'CODIGOTIPOCONTR', 'Tipo de contrato'], [6, 'CPFFUNC', 'CPF', C], [7, 'NOMEFUNC', 'Nome'], [8, 'DATANASC', 'Data de nascimento', D], [9, 'DATAADM', 'Data de admissão', D],
      [10, 'CATEGESOCIAL', 'Categoria eSocial'], [11, 'CATEGORIA', 'Categoria'], [12, 'CODIGOSIND', 'Sindicato'], [13, 'DIACONTREXP', 'Dias de experiência'],
      [14, 'DIAPRORROGCONTREXP', 'Dias de prorrogação'], [15, 'DATACONTREXP1', 'Fim da experiência', D], [16, 'DATACONTREXP2', 'Fim da prorrogação', D],
      [17, 'CODIGOTIPOFATO', 'Fato do prazo determinado'], [18, 'CODIGOCARGO', 'Cargo'], [19, 'TIPOSALARIO', 'Tipo de salário'], [20, 'VALORSAL', 'Salário', N], [21, 'DESCRSAL', 'Descrição do salário'],
    ],
    B: [
      [2, 'CODIGOEMPRESA', 'CNPJ da empresa', J], [3, 'PISFUNC', 'PIS'], [4, 'DATACADPIS', 'Cadastro do PIS', D], [5, 'CEPFUNC', 'CEP'], [6, 'CODIGOTIPOLOGRAD', 'Tipo de logradouro'],
      [7, 'ENDERFUNC', 'Endereço'], [8, 'NUMEROENDER', 'Número'], [9, 'COMPLENDER', 'Complemento'], [10, 'BAIRROFUNC', 'Bairro'], [11, 'SIGLAESTADO', 'UF'],
      [12, 'CODIGOMUNIC', 'Município'], [13, 'SIGLAESTADONASC', 'UF de nascimento'], [14, 'CODIGOMUNICNASC', 'Município de nascimento'], [15, 'SEXO', 'Sexo'], [16, 'RACACOR', 'Raça/cor'],
      [17, 'DEFFISICA', 'Deficiência física'], [18, 'DEFVISUAL', 'Deficiência visual'], [19, 'DEFAUDITIVA', 'Deficiência auditiva'], [20, 'DEFINTELECTUAL', 'Deficiência intelectual'],
      [21, 'DEFMENTAL', 'Deficiência mental'], [22, 'DEFCOTA', 'Preenche cota de PcD'], [23, 'DEFREABILITADO', 'Reabilitado'], [24, 'DEFOBS', 'Observação da deficiência'],
      [25, 'ESTADOCIVIL', 'Estado civil'], [26, 'GRAUINSTR', 'Grau de instrução'], [27, 'NACIONALIDADE', 'Nacionalidade'], [28, 'PAISORIGEM', 'País de origem'],
      [29, 'DATANATURAL', 'Data da naturalização', D], [30, 'TMPRESID', 'Tempo de residência'], [31, 'TIPOVISTO', 'Tipo de visto'], [32, 'UTILIZACARTEIRADIGITAL', 'Usa a CTPS digital'],
      [33, 'NUMEROCTPS', 'Número da CTPS'], [34, 'SERIECTPS', 'Série da CTPS'], [35, 'SIGLAESTADOCTPS', 'UF da CTPS'], [36, 'EXPEDCTPS', 'Expedição da CTPS', D],
      [37, 'OPTANTEFGTS', 'Optante do FGTS'], [38, 'DATAOPCAOFGTS', 'Data de opção do FGTS', D], [39, 'TIPOVINCULO', 'Tipo de vínculo'], [40, 'CODIGOESTAB', 'Filial / estabelecimento'],
      [41, 'CLASSIFORGAN', 'Organograma'], [42, 'TIPOADMRAIS', 'Tipo de admissão (RAIS)'], [43, 'TIPOADMCAGED', 'Tipo de admissão (CAGED)'], [44, 'RECEBSEGURODESEMPREGO', 'Recebe seguro-desemprego'],
      [45, 'LIVROREG', 'Livro de registro'], [46, 'FOLHALIVROREG', 'Folha do livro de registro'], [47, 'FICHAREG', 'Ficha de registro'], [48, 'CODIGOLOCALCTB', 'Local contábil'],
      [49, 'SINDICALIZADO', 'Sindicalizado'], [50, 'DESCMENSSIND', 'Desconta mensalidade sindical'], [51, 'DESCCUSTCONFED', 'Desconta custeio confederativo'],
      [52, 'DESCTAXAASSIST', 'Desconta taxa assistencial'], [53, 'DESCONTAREVSAL', 'Desconta revisão salarial'], [54, 'DESCCONTRIBSIND', 'Desconta contribuição sindical'],
      [55, 'DESCANOADMISSAO', 'Desconta no ano da admissão'], [56, 'CLAUSULAASSEGRESC', 'Cláusula assecuratória'], [57, 'RECEBEADTO', 'Recebe adiantamento'],
      [58, 'RECEBE13SAL', 'Recebe 13º'], [59, 'PERCADTO', 'Percentual de adiantamento', N], [60, 'MODOPGTO', 'Modo de pagamento'], [61, 'TIPOCONTA', 'Tipo de conta'],
      [62, 'CODIGOBANCO', 'Banco'], [63, 'NUMEROAGENCIA', 'Agência (sem o dígito)'], [64, 'NUMEROCONTA', 'Conta'], [65, 'DIGITOCONTA', 'Dígito da conta'], [66, 'TIPOPIX', 'Tipo de Pix'],
      [67, 'TIPOCHAVEPIX', 'Tipo de chave Pix'], [68, 'CHAVEPIX', 'Chave Pix'], [69, 'CHAVEPIXQRCODE', 'Pix (QR Code)'], [70, 'PARTICPAT', 'Participa do PAT'], [71, 'POSSUIALVARA', 'Possui alvará'],
      [72, 'CODIGOESCALA', 'Escala'], [73, 'REGIMEJOR', 'Regime de jornada'], [74, 'TIPOJORNADA', 'Tipo de jornada'], [75, 'DESCRTIPOJORNADA', 'Descrição da jornada'],
      [76, 'TEMPOPARCIAL', 'Tempo parcial'], [77, 'PERCINSALUB', 'Percentual de insalubridade'], [78, 'PERCPERICUL', 'Percentual de periculosidade'], [79, 'AGENTENOCIVO', 'Agente nocivo'],
      [80, 'JAEXPOSTO', 'Já exposto a agente nocivo'], [81, 'PAI', 'Nome do pai'], [82, 'MAE', 'Nome da mãe'], [83, 'TIPOADM', 'Tipo de admissão'], [84, 'INDICATPRIMEMP', 'Primeiro emprego'],
      [85, 'UTILIZAQCOLABORE', 'Usa o Questor Colabore'],
    ],
    C: [
      [2, 'CODIGOEMPRESA', 'CNPJ da empresa', J], [3, 'CODIGOFUNCCONTR', 'Contrato (preenchido pelo Questor a partir do A)'], [4, 'NOMESOCIAL', 'Nome social'], [5, 'APELIDOFUNC', 'Apelido'],
      [6, 'CODIGOPOSTAL', 'Código postal'], [7, 'DDDFONE', 'DDD do telefone'], [8, 'NUMEROFONE', 'Telefone'], [9, 'RAMALFONE', 'Ramal'], [10, 'DDDCELULAR', 'DDD do celular'],
      [11, 'NUMEROCELULAR', 'Celular'], [12, 'ENDERELETR', 'E-mail'], [13, 'DATACHEGADA', 'Chegada ao Brasil', D], [14, 'CASADOBR', 'Casado com brasileiro(a)'], [15, 'FILHOSBR', 'Tem filhos brasileiros'],
      [16, 'CARTRNE', 'RNE'], [17, 'EXPEDICAORNE', 'Expedição do RNE', D], [18, 'CODIGOORGAOEMISSORRNE', 'Órgão emissor do RNE (código)'], [19, 'VALIDRNE', 'Validade do RNE', D],
      [20, 'PORTNATNUMERO', 'Portaria de naturalização'], [21, 'PORTNATDATA', 'Data da portaria', D], [22, 'NUMERORG', 'RG'], [23, 'COMPLRG', 'Complemento do RG'],
      [24, 'CODIGOORGAOEMISSORRG', 'Órgão emissor do RG (código)'], [25, 'SIGLAESTADORG', 'UF do RG'], [26, 'EMISSRG', 'Emissão do RG', D], [27, 'TITELEIT', 'Título de eleitor'],
      [28, 'ZONATITELEIT', 'Zona eleitoral'], [29, 'SECAOTITELEIT', 'Seção eleitoral'], [30, 'CNHFUNC', 'CNH'], [31, 'CATEGCNH', 'Categoria da CNH'], [32, 'EXPEDICAOCNH', 'Expedição da CNH', D],
      [33, 'CODIGOORGAOEMISSORCNH', 'Órgão emissor da CNH (código)'], [34, 'VALIDCNH', 'Validade da CNH', D], [35, 'UFCNH', 'UF da CNH'], [36, 'PRIMHABCNH', 'Primeira habilitação', D],
      [37, 'CARTRESERV', 'Certificado de reservista'], [38, 'CATEGCARTRESERV', 'Categoria do reservista'], [39, 'CODIGOCONSELHO', 'Conselho profissional'], [40, 'NUMEROREGIST', 'Registro no conselho'],
      [41, 'DATAREGIST', 'Data do registro', D], [42, 'VALIDADEREGIST', 'Validade do registro', D], [43, 'NUMEROCNS', 'Cartão Nacional de Saúde'], [44, 'CERTCIVILTIPO', 'Certidão civil: tipo'],
      [45, 'CERTCIVILEMISSAO', 'Certidão civil: emissão', D], [46, 'CERTCIVILTERMO', 'Certidão civil: termo'], [47, 'CERTCIVILLIVRO', 'Certidão civil: livro'], [48, 'CERTCIVILFOLHA', 'Certidão civil: folha'],
      [49, 'CERTCIVILCARTORIO', 'Certidão civil: cartório'], [50, 'CERTCIVILSIGLAESTADO', 'Certidão civil: UF'], [51, 'CERTCIVILMUNIC', 'Certidão civil: município'], [52, 'DATAAPOSENT', 'Data da aposentadoria', D],
      [53, 'NATUREZAESTAGIO', 'Estágio: natureza'], [54, 'NIVELESTAGIO', 'Estágio: nível'], [55, 'AREAATUACAO', 'Estágio: área de atuação'], [56, 'INSTITUICAOENSINO', 'Estágio: instituição de ensino'],
      [57, 'AGENTEINTEGRACAO', 'Estágio: agente de integração'], [58, 'CODIGOSUPERVISORESTAGIO', 'Estágio: supervisor'], [59, 'MOTIVOCONTRAT', 'Motivo da contratação'],
      [60, 'JUSTCONTR', 'Justificativa da contratação'], [61, 'TPINCLCONTR', 'Tipo de inclusão do contrato'], [62, 'ORGEMISRG', 'Órgão emissor do RG'], [63, 'ORGAOEMISSORCNH', 'Órgão emissor da CNH'],
      [64, 'INDAPREND', 'Modalidade de contratação do aprendiz'], [65, 'CNPJENTQUAL', 'CNPJ da entidade qualificadora'], [66, 'CNPJPRAT', 'CNPJ da prática do aprendiz'], [67, 'ORGAOEMISSORRNE', 'Órgão emissor do RNE'],
    ],
    D: [
      [2, 'CODIGOEMPRESA', 'CNPJ da empresa', J], [3, 'CPFFUNC', 'CPF do titular', C], [4, 'DATAADM', 'Admissão do titular', D], [5, 'CODIGODEPEND', 'Código do dependente'],
      [6, 'NOMEDEPEND', 'Nome do dependente'], [7, 'DATANASC', 'Nascimento do dependente', D], [8, 'PARENTESCO', 'Parentesco'], [9, 'CPFDEPEND', 'CPF do dependente', C], [10, 'SEXO', 'Sexo'],
      [11, 'ESTADOCIVIL', 'Estado civil'], [12, 'GRAUINSTR', 'Grau de instrução'], [13, 'IDADEMINCRECHE', 'Auxílio-creche: idade mínima (meses)'], [14, 'IDADELIMCRECHE', 'Auxílio-creche: idade máxima (meses)'],
      [15, 'IDADELIMSALFAM', 'Idade limite do salário-família'], [16, 'IDADELIMIR', 'Idade limite do IR'], [17, 'INCAPAZTRABALHAR', 'Incapaz para o trabalho'], [18, 'FORMACONTROLEIR', 'Forma de controle do IR'],
      [19, 'CONTROLEVACIN', 'Controle de vacinação'], [20, 'DATAVACIN', 'Data da vacinação', D], [21, 'SIGLAESTADO', 'UF de nascimento'], [22, 'CODIGOMUNIC', 'Município de nascimento'],
      [23, 'NACIONALIDADE', 'Nacionalidade'], [24, 'CARTORIO', 'Cartório'], [25, 'LIVROREG', 'Livro do registro'], [26, 'FOLHALIVROREG', 'Folha do registro'], [27, 'NUMEROREG', 'Número do registro'],
      [28, 'MATRICULA', 'Matrícula da certidão'], [29, 'NUMDECLARNASCVIVO', 'Declaração de nascido vivo'], [30, 'FUMANTE', 'Fumante'], [31, 'CONSOMEALCOOL', 'Consome álcool'],
    ],
    E: [
      [2, 'CODIGOEMPRESA', 'CNPJ da empresa', J], [3, 'CODIGOPERCALCULO', 'Período de cálculo'], [4, 'SEQ', 'SEQ'], [5, 'CODIGOFUNCCONTR', 'Contrato do empregado'], [6, 'CODIGOEVENTO', 'Evento'],
      [7, 'REFEREVENTO', 'Referência', N], [8, 'VALOREVENTO', 'Valor', N], [9, 'CODIGOBENEF', 'Beneficiado (pensão judicial)'], [10, 'CODIGOOUTEMP', 'Outra empresa'],
      [11, 'CODIGOCENTROCUSTO', 'Centro de custo'], [12, 'CODIGOPROFTIPOAULA', 'Tipo de aula'], [13, 'BUSCARULTVALORCALC', 'Buscar último valor calculado'],
    ],
  };
  const porColuna = {};
  Object.entries(CAMPOS).forEach(([r, lista]) => { porColuna[r] = {}; lista.forEach(([n, campo, nome, tipo]) => { porColuna[r][n] = { campo, nome, tipo: tipo || '' }; }); });
  return { CAMPOS, porColuna, FONTE: '.nli da ConPlus (WorkDrive "API nWeb"), lidos em 27/11/2026' };
}));
