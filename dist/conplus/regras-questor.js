/*
 * Área ConPlus — regras OFICIAIS de cada campo da admissão (A, B, C e D), trazidas do Sistema Pralis principal (S1):
 * shared/src/conplus/questor-admissao-layout.ts, gerado da tabela de campos da documentação do Questor
 * (docs.questor.com.br › ERP Parceiro x Questor Folha › nfpaadmissaofuncionario) e conferido com os .nli (22/10/2026).
 * Por campo: [obrigatório na documentação (1/0), tipo (i inteiro, n numérico com 2 casas, d data, l lógico, t texto),
 * tamanho máximo (o do .nli; sem ele, o da documentação; 0 = sem limite conhecido), valores aceitos (quando a documentação lista)].
 * Ligado ao layout pelo NOME do campo, não pela coluna: onde a documentação e o .nli divergem de coluna (INDAPREND, ENTREGACERT),
 * vale a coluna do .nli. GERADO por script a partir do S1 em 27/11/2026: para mudar, gere de novo; não edite à mão.
 * Obrigatório da documentação vira AVISO na conferência: o modelo que a ConPlus testou e aceitou deixa CODIGOSIND e PISFUNC
 * vazios (a pré-admissão aceita; o DP completa). Valores aceitos e tamanho viram ERRO, como no Questor.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzConplusRegrasQuestor = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const REGRAS = {
    A: {
      "TERMOCONSENTIMENTO": [1, "i", 5, ["0","1","2"]], "GERARPRELIMINAR": [1, "t", 1, ["1","0"]], "CODIGOTIPOCONTR": [1, "i", 3],
      "CPFFUNC": [1, "t", 14], "NOMEFUNC": [1, "t", 70], "DATANASC": [1, "d", 10],
      "DATAADM": [1, "d", 10], "CATEGESOCIAL": [1, "i", 3], "CATEGORIA": [1, "t", 2, ["01","02","03","04","05","06","07","11"]],
      "CODIGOSIND": [1, "i", 5], "DIACONTREXP": [1, "i", 5], "DIAPRORROGCONTREXP": [1, "i", 4],
      "DATACONTREXP1": [0, "d", 10], "DATACONTREXP2": [0, "d", 10], "CODIGOTIPOFATO": [0, "i", 5],
      "CODIGOCARGO": [0, "i", 7], "TIPOSALARIO": [1, "i", 5, ["1","2","5","6","7"]], "VALORSAL": [1, "n", 16],
      "DESCRSAL": [0, "t", 999],
    },
    B: {
      "PISFUNC": [1, "t", 14], "DATACADPIS": [0, "d", 10], "CEPFUNC": [1, "t", 10],
      "CODIGOTIPOLOGRAD": [1, "i", 21], "ENDERFUNC": [1, "t", 40], "NUMEROENDER": [1, "i", 7],
      "COMPLENDER": [0, "t", 20], "BAIRROFUNC": [1, "t", 30], "SIGLAESTADO": [1, "t", 2],
      "CODIGOMUNIC": [1, "i", 8], "SIGLAESTADONASC": [1, "t", 2], "CODIGOMUNICNASC": [1, "i", 8],
      "SEXO": [1, "i", 2, ["1","2"]], "RACACOR": [1, "i", 5, ["1","2","4","6","8","9"]], "DEFFISICA": [1, "l", 1, ["1","0"]],
      "DEFVISUAL": [1, "l", 1, ["1","0"]], "DEFAUDITIVA": [1, "l", 1, ["1","0"]], "DEFINTELECTUAL": [1, "l", 1, ["1","0"]],
      "DEFMENTAL": [1, "l", 1, ["1","0"]], "DEFCOTA": [1, "l", 1, ["1","0"]], "DEFREABILITADO": [1, "l", 1, ["1","0"]],
      "DEFOBS": [0, "t", 255], "ESTADOCIVIL": [1, "i", 2, ["0","1","2","7","8","9","3","4","5","6"]], "GRAUINSTR": [1, "i", 3, ["0","1","2","3","4","5","6","7","8","9","10","11","12","13"]],
      "NACIONALIDADE": [1, "i", 3, ["0","10","15","20","21","22","23","24","25","26","27","28","29","30","31","32","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","60","61","62","70"]], "PAISORIGEM": [0, "i", 5], "DATANATURAL": [0, "d", 10],
      "TMPRESID": [0, "i", 5, ["1","2"]], "TIPOVISTO": [0, "i", 2, ["1","2","3","4","13","5","6","7","8","9","10","11","12"]], "UTILIZACARTEIRADIGITAL": [1, "l", 1, ["1","0"]],
      "NUMEROCTPS": [1, "t", 11], "SERIECTPS": [1, "t", 5], "SIGLAESTADOCTPS": [1, "t", 2],
      "EXPEDCTPS": [0, "d", 10], "OPTANTEFGTS": [1, "l", 1, ["1","0"]], "DATAOPCAOFGTS": [0, "d", 10],
      "TIPOVINCULO": [1, "t", 2, ["10","15","20","25","30","31","35","40","50","55","60","65","70","75","80","90","95","96","97"]], "CODIGOESTAB": [1, "i", 5], "CLASSIFORGAN": [1, "t", 20],
      "TIPOADMRAIS": [1, "i", 5, ["1","2","3","4","5"]], "TIPOADMCAGED": [1, "t", 2, ["10","20","25","35","70"]], "RECEBSEGURODESEMPREGO": [1, "l", 1, ["1","0"]],
      "LIVROREG": [0, "i", 5], "FOLHALIVROREG": [0, "i", 5], "FICHAREG": [0, "i", 10],
      "CODIGOLOCALCTB": [0, "i", 5], "SINDICALIZADO": [1, "l", 1, ["1","0"]], "DESCMENSSIND": [1, "l", 1, ["1","0"]],
      "DESCCUSTCONFED": [1, "l", 1, ["0","1"]], "DESCTAXAASSIST": [1, "l", 1, ["1","0"]], "DESCONTAREVSAL": [1, "l", 1, ["1","0"]],
      "DESCCONTRIBSIND": [0, "l", 1, ["1","0"]], "DESCANOADMISSAO": [1, "l", 1, ["2","1","0"]], "CLAUSULAASSEGRESC": [1, "l", 1, ["2","1","0"]],
      "RECEBEADTO": [1, "i", 2, ["1","2","3","4"]], "RECEBE13SAL": [1, "l", 1, ["2","1","0"]], "PERCADTO": [0, "i", 8],
      "MODOPGTO": [1, "i", 2, ["1","2","3"]], "TIPOCONTA": [0, "i", 2, ["1","2","3","4","5","6"]], "CODIGOBANCO": [0, "i", 5],
      "NUMEROAGENCIA": [0, "i", 6], "NUMEROCONTA": [0, "t", 30], "DIGITOCONTA": [0, "t", 2],
      "TIPOPIX": [0, "i", 5, ["0","1","2"]], "TIPOCHAVEPIX": [0, "t", 2, ["00","01","02","03","04"]], "CHAVEPIX": [0, "t", 99],
      "CHAVEPIXQRCODE": [0, "t", 30], "PARTICPAT": [1, "l", 1, ["1","0"]], "POSSUIALVARA": [1, "l", 1, ["1","0"]],
      "CODIGOESCALA": [1, "i", 6], "REGIMEJOR": [1, "i", 5, ["1","2","3","4"]], "TIPOJORNADA": [1, "i", 5, ["2","3","4","5","6","7","9"]],
      "DESCRTIPOJORNADA": [0, "t", 999], "TEMPOPARCIAL": [1, "i", 5, ["0","1","2","3"]], "PERCINSALUB": [0, "i", 16],
      "PERCPERICUL": [0, "i", 16], "AGENTENOCIVO": [1, "t", 2, ["00","15","20","25"]], "JAEXPOSTO": [1, "l", 1, ["1","0"]],
      "PAI": [0, "t", 70], "MAE": [1, "t", 70], "TIPOADM": [1, "i", 5, ["1","2","3","4","5","6","7"]],
      "INDICATPRIMEMP": [1, "l", 1, ["1","0"]], "UTILIZAQCOLABORE": [1, "l", 1, ["1","0"]],
    },
    C: {
      "CODIGOFUNCCONTR": [0, "i", 7], "NOMESOCIAL": [0, "t", 70], "APELIDOFUNCA": [0, "t", 30],
      "CODIGOPOSTAL": [0, "t", 10], "DDDFONE": [0, "i", 5], "NUMEROFONE": [0, "i", 10],
      "RAMALFONE": [0, "i", 5], "DDDCELULAR": [0, "i", 5], "NUMEROCELULAR": [0, "i", 11],
      "ENDERELETRE": [0, "t", 100], "DATACHEGADA": [0, "d", 10], "CASADOBR": [0, "l", 1, ["1","0"]],
      "FILHOSBR": [0, "l", 1, ["1","0"]], "CARTRNE": [0, "t", 20], "EXPEDICAORNE": [0, "d", 10],
      "CODIGOORGAOEMISSORRNE": [0, "i", 21], "VALIDRNE": [0, "d", 10], "PORTNATNUMERO": [0, "i", 10],
      "PORTNATDATA": [0, "d", 10], "NUMERORG": [0, "t", 20], "COMPLRG": [0, "t", 20],
      "CODIGOORGAOEMISSORRG": [0, "i", 21], "SIGLAESTADORG": [0, "t", 2], "EMISSRG": [0, "d", 10],
      "TITELEIT": [0, "t", 13], "ZONATITELEIT": [0, "i", 4], "SECAOTITELEIT": [0, "i", 5],
      "CNHFUNC": [0, "t", 15], "CATEGCNH": [0, "t", 3], "EXPEDICAOCNH": [0, "d", 10],
      "CODIGOORGAOEMISSORCNH": [0, "i", 21], "VALIDCNH": [0, "d", 10], "UFCNH": [0, "t", 2],
      "PRIMHABCNH": [0, "d", 10], "CARTRESERV": [0, "t", 20], "CATEGCARTRESERV": [0, "t", 3],
      "CODIGOCONSELHO": [0, "i", 4], "NUMEROREGIST": [0, "t", 15], "DATAREGIST": [0, "d", 10],
      "VALIDADEREGIST": [0, "d", 10], "NUMEROCNS": [0, "t", 18], "CERTCIVILTIPO": [0, "t", 1, ["0","1","2","3",""]],
      "CERTCIVILEMISSAO": [0, "d", 10], "CERTCIVILTERMO": [0, "t", 40], "CERTCIVILLIVRO": [0, "t", 15],
      "CERTCIVILFOLHA": [0, "i", 10], "CERTCIVILCARTORIO": [0, "t", 40], "CERTCIVILSIGLAESTADO": [0, "t", 2],
      "CERTCIVILMUNIC": [0, "i", 21], "DATAAPOSENT": [0, "d", 10], "NATUREZAESTAGIO": [0, "t", 1, ["1","0"]],
      "NIVELESTAGIO": [0, "i", 5, ["1","2","3","4","8","9"]], "AREAATUACAO": [0, "t", 100], "INSTITUICAOENSINO": [0, "i", 6],
      "AGENTEINTEGRACAO": [0, "i", 6], "CODIGOSUPERVISORESTAGIO": [0, "i", 9], "MOTIVOCONTRAT": [0, "i", 5, ["1","2"]],
      "JUSTCONTR": [0, "t", 999], "TPINCLCONTR": [0, "i", 5, ["1","2","3"]], "ORGEMISRG": [0, "t", 10],
      "ORGAOEMISSORCNH": [0, "t", 10], "ORGAOEMISSORRNE": [0, "t", 10], "CNPJENTQUAL": [0, "t", 18],
      "CNPJPRAT": [0, "t", 18], "INDAPREND": [0, "t", 1],
    },
    D: {
      "CPFFUNC": [1, "t", 14], "DATAADM": [1, "d", 10], "CODIGODEPEND": [0, "i", 5],
      "NOMEDEPEND": [1, "t", 70], "DATANASC": [1, "d", 10], "PARENTESCO": [1, "t", 2, ["01","02","22","16","03","04","05","06","07","08","09","10","11","12","19","20","13","17","18","15","21","14"]],
      "CPFDEPEND": [0, "t", 14], "SEXO": [1, "t", 2, ["0","1","2"]], "ESTADOCIVIL": [1, "t", 2, ["0","1","2","7","8","9","3","4","5","6"]],
      "GRAUINSTR": [1, "t", 3, ["0","1","2","3","4","5","6","7","8","9","10","11","12","13"]], "IDADEMINCRECHE": [0, "t", 5], "IDADELIMCRECHE": [0, "t", 5],
      "IDADELIMSALFAM": [0, "t", 3], "IDADELIMIR": [0, "t", 4], "INCAPAZTRABALHAR": [0, "l", 1, ["1","0"]],
      "FORMACONTROLEIR": [1, "t", 5, ["1","2"]], "CONTROLEVACIN": [0, "t", 2, ["1","2","3"]], "DATAVACIN": [0, "d", 10],
      "SIGLAESTADO": [0, "t", 2], "CODIGOMUNIC": [0, "t", 8], "NACIONALIDADE": [1, "t", 3, ["0","10","15","20","21","22","23","24","25","26","27","28","29","30","31","32","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","60","61","62","70"]],
      "CARTORIO": [0, "t", 30], "LIVROREG": [0, "t", 6], "FOLHALIVROREG": [0, "t", 6],
      "NUMEROREG": [0, "t", 10], "MATRICULA": [0, "t", 50], "NUMDECLARNASCVIVO": [0, "t", 20],
      "FUMANTE": [1, "l", 1, ["1","0"]], "CONSOMEALCOOL": [1, "l", 1, ["1","0"]], "ENTREGACERT": [0, "d", 10],
    },
  };
  const TIPOS = { i: 'inteiro', n: 'decimal', d: 'data', l: 'logico', t: 'texto' };
  /** Regra de um campo de um registro (ou null). */
  function regra(registro, campo) {
    const r = REGRAS[registro] && REGRAS[registro][campo];
    if (!r) return null;
    return { obrigDoc: r[0] === 1, tipo: TIPOS[r[1]], tamanho: r[2] || 0, dominio: r[3] || null };
  }
  return { REGRAS, regra, FONTE: 'S1 shared/src/conplus/questor-admissao-layout.ts (documentação oficial do Questor + .nli)' };
}));
