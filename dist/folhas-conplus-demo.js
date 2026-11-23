/* DADOS DEMONSTRATIVOS (FICTÍCIOS) das quatro telas de documentos de pagamento.
   Nenhuma pessoa, valor ou documento aqui é real: servem só para visualizar como as informações da Conplus ficarão organizadas.
   Estrutura espelha as abas CONPLUS da planilha (campos e nomes). Quando a API da Conplus existir, troque a fonte em folhas-conplus.js
   (CicluzFolhas.usarFonte) e este arquivo deixa de ser carregado. Gerado uma vez; os valores já vêm somados. */
window.CicluzFolhasDemo={
 "aviso": "Dados fictícios de demonstração. Não são documentos oficiais.",
 "empresa": {
  "nome": "Empresa Demonstração Ltda",
  "cnpj": "00.000.000/0001-00"
 },
 "folha05": [
  {
   "id": "f05-101",
   "codigo": "101",
   "nome": "Colaborador Demonstração 01",
   "adm": "19/09/2025",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "CAIXA",
   "chm": "220:00",
   "salario": 2058,
   "cbo": "421125",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 1,
     "nome": "Horas Normais Diurnas",
     "nat": 1,
     "ref": "30 Dias",
     "valor": 2058
    },
    {
     "cod": 35,
     "nome": "Horas Extras 50% Diurnas",
     "nat": 1,
     "ref": "006:09 hs",
     "valor": 40
    },
    {
     "cod": 59,
     "nome": "DSR S/Horas Extras",
     "nat": 1,
     "ref": "001:10 hs",
     "valor": 6
    },
    {
     "cod": 66,
     "nome": "Quebra de Caixa",
     "nat": 1,
     "ref": "10,00 %",
     "valor": 205.8
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.15
    },
    {
     "cod": 1950,
     "nome": "INSS",
     "nat": 3,
     "ref": "8,00 %",
     "valor": 184.78
    },
    {
     "cod": 815,
     "nome": "Vale Transporte (A)",
     "nat": 3,
     "ref": "6,00 %",
     "valor": 123.48
    },
    {
     "cod": 1900,
     "nome": "FGTS",
     "nat": 4,
     "ref": "8,00 %",
     "valor": 184.78
    }
   ],
   "totais": {
    "proventos": 2309.8,
    "vantagens": 0.15,
    "descontos": 308.26,
    "liquido": 2001.69
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 2309.8,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 2309.8,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 2309.8,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 2309.8,
     "valor": 184.78
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f05-102",
   "codigo": "102",
   "nome": "Colaborador Demonstração 02",
   "adm": "01/07/2026",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "ATENDENTE",
   "chm": "220:00",
   "salario": 1802,
   "cbo": "521140",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 1,
     "nome": "Horas Normais Diurnas",
     "nat": 1,
     "ref": "30 Dias",
     "valor": 1802
    },
    {
     "cod": 35,
     "nome": "Horas Extras 50% Diurnas",
     "nat": 1,
     "ref": "002:22 hs",
     "valor": 52.5
    },
    {
     "cod": 59,
     "nome": "DSR S/Horas Extras",
     "nat": 1,
     "ref": "001:17 hs",
     "valor": 7.75
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.25
    },
    {
     "cod": 1950,
     "nome": "INSS",
     "nat": 3,
     "ref": "8,00 %",
     "valor": 148.98
    },
    {
     "cod": 815,
     "nome": "Vale Transporte (A)",
     "nat": 3,
     "ref": "6,00 %",
     "valor": 108.12
    },
    {
     "cod": 1900,
     "nome": "FGTS",
     "nat": 4,
     "ref": "8,00 %",
     "valor": 148.98
    }
   ],
   "totais": {
    "proventos": 1862.25,
    "vantagens": 0.25,
    "descontos": 257.1,
    "liquido": 1605.4
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 1862.25,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 1862.25,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 1862.25,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 1862.25,
     "valor": 148.98
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f05-103",
   "codigo": "103",
   "nome": "Colaborador Demonstração 03",
   "adm": "07/04/2026",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "AUX DE LIMPEZA",
   "chm": "220:00",
   "salario": 1802,
   "cbo": "514320",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 1,
     "nome": "Horas Normais Diurnas",
     "nat": 1,
     "ref": "30 Dias",
     "valor": 1802
    },
    {
     "cod": 35,
     "nome": "Horas Extras 50% Diurnas",
     "nat": 1,
     "ref": "000:35 hs",
     "valor": 65
    },
    {
     "cod": 59,
     "nome": "DSR S/Horas Extras",
     "nat": 1,
     "ref": "001:24 hs",
     "valor": 9.5
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.35
    },
    {
     "cod": 1950,
     "nome": "INSS",
     "nat": 3,
     "ref": "8,00 %",
     "valor": 150.12
    },
    {
     "cod": 815,
     "nome": "Vale Transporte (A)",
     "nat": 3,
     "ref": "6,00 %",
     "valor": 108.12
    },
    {
     "cod": 1900,
     "nome": "FGTS",
     "nat": 4,
     "ref": "8,00 %",
     "valor": 150.12
    }
   ],
   "totais": {
    "proventos": 1876.5,
    "vantagens": 0.35,
    "descontos": 258.24,
    "liquido": 1618.61
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 1876.5,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 1876.5,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 1876.5,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 1876.5,
     "valor": 150.12
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": "Exemplo fictício de dados adicionais: período de afastamento informado pela contabilidade."
  },
  {
   "id": "f05-104",
   "codigo": "104",
   "nome": "Colaborador Demonstração 04",
   "adm": "13/02/2021",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "COZINHEIRO",
   "chm": "220:00",
   "salario": 2064,
   "cbo": "513205",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 1,
     "nome": "Horas Normais Diurnas",
     "nat": 1,
     "ref": "30 Dias",
     "valor": 2064
    },
    {
     "cod": 35,
     "nome": "Horas Extras 50% Diurnas",
     "nat": 1,
     "ref": "011:11 hs",
     "valor": 77.5
    },
    {
     "cod": 59,
     "nome": "DSR S/Horas Extras",
     "nat": 1,
     "ref": "001:31 hs",
     "valor": 11.25
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.45
    },
    {
     "cod": 1950,
     "nome": "INSS",
     "nat": 3,
     "ref": "8,00 %",
     "valor": 172.22
    },
    {
     "cod": 815,
     "nome": "Vale Transporte (A)",
     "nat": 3,
     "ref": "6,00 %",
     "valor": 123.84
    },
    {
     "cod": 1900,
     "nome": "FGTS",
     "nat": 4,
     "ref": "8,00 %",
     "valor": 172.22
    }
   ],
   "totais": {
    "proventos": 2152.75,
    "vantagens": 0.45,
    "descontos": 296.06,
    "liquido": 1857.14
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 2152.75,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 2152.75,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 2152.75,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 2152.75,
     "valor": 172.22
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f05-105",
   "codigo": "105",
   "nome": "Colaborador Demonstração 05",
   "adm": "11/03/2026",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "ATENDENTE",
   "chm": "220:00",
   "salario": 1802,
   "cbo": "521140",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 1,
     "nome": "Horas Normais Diurnas",
     "nat": 1,
     "ref": "30 Dias",
     "valor": 1802
    },
    {
     "cod": 35,
     "nome": "Horas Extras 50% Diurnas",
     "nat": 1,
     "ref": "001:14 hs",
     "valor": 90
    },
    {
     "cod": 59,
     "nome": "DSR S/Horas Extras",
     "nat": 1,
     "ref": "001:38 hs",
     "valor": 13
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.55
    },
    {
     "cod": 1950,
     "nome": "INSS",
     "nat": 3,
     "ref": "8,00 %",
     "valor": 152.4
    },
    {
     "cod": 815,
     "nome": "Vale Transporte (A)",
     "nat": 3,
     "ref": "6,00 %",
     "valor": 108.12
    },
    {
     "cod": 1900,
     "nome": "FGTS",
     "nat": 4,
     "ref": "8,00 %",
     "valor": 152.4
    }
   ],
   "totais": {
    "proventos": 1905,
    "vantagens": 0.55,
    "descontos": 260.52,
    "liquido": 1645.03
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 1905,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 1905,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 1905,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 1905,
     "valor": 152.4
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f05-106",
   "codigo": "106",
   "nome": "Colaborador Demonstração 06",
   "adm": "25/10/2024",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "CAIXA",
   "chm": "220:00",
   "salario": 2058,
   "cbo": "421125",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 1,
     "nome": "Horas Normais Diurnas",
     "nat": 1,
     "ref": "30 Dias",
     "valor": 2058
    },
    {
     "cod": 35,
     "nome": "Horas Extras 50% Diurnas",
     "nat": 1,
     "ref": "003:40 hs",
     "valor": 102.5
    },
    {
     "cod": 59,
     "nome": "DSR S/Horas Extras",
     "nat": 1,
     "ref": "001:45 hs",
     "valor": 14.75
    },
    {
     "cod": 66,
     "nome": "Quebra de Caixa",
     "nat": 1,
     "ref": "10,00 %",
     "valor": 205.8
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.65
    },
    {
     "cod": 1950,
     "nome": "INSS",
     "nat": 3,
     "ref": "8,00 %",
     "valor": 190.48
    },
    {
     "cod": 815,
     "nome": "Vale Transporte (A)",
     "nat": 3,
     "ref": "6,00 %",
     "valor": 123.48
    },
    {
     "cod": 1900,
     "nome": "FGTS",
     "nat": 4,
     "ref": "8,00 %",
     "valor": 190.48
    }
   ],
   "totais": {
    "proventos": 2381.05,
    "vantagens": 0.65,
    "descontos": 313.96,
    "liquido": 2067.74
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 2381.05,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 2381.05,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 2381.05,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 2381.05,
     "valor": 190.48
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  }
 ],
 "folha20": [
  {
   "id": "f20-101",
   "codigo": "101",
   "nome": "Colaborador Demonstração 01",
   "adm": "19/09/2025",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "CAIXA",
   "chm": "220:00",
   "salario": 2058,
   "cbo": "421125",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 80,
     "nome": "Adiantamento Salarial",
     "nat": 1,
     "ref": "40,00 %",
     "valor": 823.2
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.2
    },
    {
     "cod": 165,
     "nome": "Troco do Mês Anterior",
     "nat": 3,
     "ref": "",
     "valor": 0.1
    }
   ],
   "totais": {
    "proventos": 823.2,
    "vantagens": 0.2,
    "descontos": 0.1,
    "liquido": 823.3
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 823.2,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 0,
     "valor": 0
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f20-102",
   "codigo": "102",
   "nome": "Colaborador Demonstração 02",
   "adm": "01/07/2026",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "ATENDENTE",
   "chm": "220:00",
   "salario": 1802,
   "cbo": "521140",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 80,
     "nome": "Adiantamento Salarial",
     "nat": 1,
     "ref": "40,00 %",
     "valor": 720.8
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.25
    },
    {
     "cod": 165,
     "nome": "Troco do Mês Anterior",
     "nat": 3,
     "ref": "",
     "valor": 0.13
    },
    {
     "cod": 4006,
     "nome": "Provisão Empréstimo Crédito do Trabalhador - Adto",
     "nat": 3,
     "ref": "",
     "valor": 60
    }
   ],
   "totais": {
    "proventos": 720.8,
    "vantagens": 0.25,
    "descontos": 60.13,
    "liquido": 660.92
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 720.8,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 0,
     "valor": 0
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f20-103",
   "codigo": "103",
   "nome": "Colaborador Demonstração 03",
   "adm": "07/04/2026",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "AUX DE LIMPEZA",
   "chm": "220:00",
   "salario": 1802,
   "cbo": "514320",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 80,
     "nome": "Adiantamento Salarial",
     "nat": 1,
     "ref": "40,00 %",
     "valor": 720.8
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.3
    },
    {
     "cod": 165,
     "nome": "Troco do Mês Anterior",
     "nat": 3,
     "ref": "",
     "valor": 0.16
    }
   ],
   "totais": {
    "proventos": 720.8,
    "vantagens": 0.3,
    "descontos": 0.16,
    "liquido": 720.94
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 720.8,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 0,
     "valor": 0
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f20-104",
   "codigo": "104",
   "nome": "Colaborador Demonstração 04",
   "adm": "13/02/2021",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "COZINHEIRO",
   "chm": "220:00",
   "salario": 2064,
   "cbo": "513205",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 80,
     "nome": "Adiantamento Salarial",
     "nat": 1,
     "ref": "40,00 %",
     "valor": 825.6
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.35
    },
    {
     "cod": 165,
     "nome": "Troco do Mês Anterior",
     "nat": 3,
     "ref": "",
     "valor": 0.19
    },
    {
     "cod": 4006,
     "nome": "Provisão Empréstimo Crédito do Trabalhador - Adto",
     "nat": 3,
     "ref": "",
     "valor": 80
    }
   ],
   "totais": {
    "proventos": 825.6,
    "vantagens": 0.35,
    "descontos": 80.19,
    "liquido": 745.76
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 825.6,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 0,
     "valor": 0
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f20-105",
   "codigo": "105",
   "nome": "Colaborador Demonstração 05",
   "adm": "11/03/2026",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "ATENDENTE",
   "chm": "220:00",
   "salario": 1802,
   "cbo": "521140",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 80,
     "nome": "Adiantamento Salarial",
     "nat": 1,
     "ref": "40,00 %",
     "valor": 720.8
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.4
    },
    {
     "cod": 165,
     "nome": "Troco do Mês Anterior",
     "nat": 3,
     "ref": "",
     "valor": 0.22
    }
   ],
   "totais": {
    "proventos": 720.8,
    "vantagens": 0.4,
    "descontos": 0.22,
    "liquido": 720.98
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 720.8,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 0,
     "valor": 0
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  },
  {
   "id": "f20-106",
   "codigo": "106",
   "nome": "Colaborador Demonstração 06",
   "adm": "25/10/2024",
   "dem": "",
   "depIR": "00",
   "deducaoIR": 0,
   "depSF": "00",
   "cargo": "CAIXA",
   "chm": "220:00",
   "salario": 2058,
   "cbo": "421125",
   "sind": "0000",
   "freg": "",
   "situacao": "Trabalhando",
   "filial": "0001",
   "cnpj": "00.000.000/0001-00",
   "organograma": "999 - OPERACIONAL ANALITICA",
   "competencia": "07/2026",
   "status": "Demonstrativo",
   "eventos": [
    {
     "cod": 80,
     "nome": "Adiantamento Salarial",
     "nat": 1,
     "ref": "40,00 %",
     "valor": 823.2
    },
    {
     "cod": 167,
     "nome": "Troco do Mês",
     "nat": 2,
     "ref": "",
     "valor": 0.45
    },
    {
     "cod": 165,
     "nome": "Troco do Mês Anterior",
     "nat": 3,
     "ref": "",
     "valor": 0.25
    },
    {
     "cod": 4006,
     "nome": "Provisão Empréstimo Crédito do Trabalhador - Adto",
     "nat": 3,
     "ref": "",
     "valor": 100
    }
   ],
   "totais": {
    "proventos": 823.2,
    "vantagens": 0.45,
    "descontos": 100.25,
    "liquido": 723.4
   },
   "bases": {
    "irrf": {
     "13": 0,
     "normal": 823.2,
     "ferias": 0,
     "lucro": 0
    },
    "inss": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "inssEmpresa": {
     "13": 0,
     "normal": 0,
     "ferias": 0,
     "lucro": 0
    },
    "difTeto": 0,
    "fgts": {
     "base": 0,
     "valor": 0
    },
    "grrf": {
     "base": 0,
     "valor": 0
    },
    "pis": {
     "base": 0,
     "valor": 0
    }
   },
   "adicionais": ""
  }
 ],
 "rescisao": [
  {
   "id": "resc-201",
   "codigo": "201",
   "nome": "Colaborador Demonstração 07",
   "cargo": "ATENDENTE",
   "empresa": "Empresa Demonstração Ltda",
   "adm": "15/10/2025",
   "avisoPrevio": "17/07/2026",
   "dem": "16/08/2026",
   "seq": "C",
   "saldoFgts": 1441.6,
   "salario": 1802,
   "proventos": 2162.4,
   "descontos": 450.5,
   "liquido": 1711.9,
   "fgtsGrrf": 162.18,
   "causa": "2-Demissão Sem Justa Causa",
   "competencia": "08/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "resc-202",
   "codigo": "202",
   "nome": "Colaborador Demonstração 08",
   "cargo": "CAIXA",
   "empresa": "Empresa Demonstração Ltda",
   "adm": "22/05/2025",
   "avisoPrevio": "10/08/2026",
   "dem": "10/08/2026",
   "seq": "C",
   "saldoFgts": 0,
   "salario": 2058,
   "proventos": 3189.9,
   "descontos": 637.98,
   "liquido": 2551.92,
   "fgtsGrrf": 185.22,
   "causa": "12-Fim do Contrato de Trabalho",
   "competencia": "08/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "resc-203",
   "codigo": "203",
   "nome": "Colaborador Demonstração 09",
   "cargo": "AUX DE LIMPEZA",
   "empresa": "Empresa Demonstração Ltda",
   "adm": "15/07/2026",
   "avisoPrevio": "",
   "dem": "29/07/2026",
   "seq": "C",
   "saldoFgts": 1441.6,
   "salario": 1802,
   "proventos": 3423.8,
   "descontos": 666.74,
   "liquido": 2757.06,
   "fgtsGrrf": 162.18,
   "causa": "7-ACORDO",
   "competencia": "07/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "resc-204",
   "codigo": "204",
   "nome": "Colaborador Demonstração 10",
   "cargo": "COZINHEIRO",
   "empresa": "Empresa Demonstração Ltda",
   "adm": "02/03/2026",
   "avisoPrevio": "30/06/2026",
   "dem": "30/07/2026",
   "seq": "C",
   "saldoFgts": 0,
   "salario": 2064,
   "proventos": 4644,
   "descontos": 887.52,
   "liquido": 3756.48,
   "fgtsGrrf": 185.76,
   "causa": "4-Inic.Empregado S/Justa Causa",
   "competencia": "07/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "resc-205",
   "codigo": "205",
   "nome": "Colaborador Demonstração 11",
   "cargo": "ATENDENTE",
   "empresa": "Empresa Demonstração Ltda",
   "adm": "13/07/2026",
   "avisoPrevio": "",
   "dem": "27/07/2026",
   "seq": "C",
   "saldoFgts": 1484,
   "salario": 1855,
   "proventos": 4823,
   "descontos": 908.95,
   "liquido": 3914.05,
   "fgtsGrrf": 166.95,
   "causa": "12-Fim do Contrato de Trabalho",
   "competencia": "07/2026",
   "status": "Demonstrativo"
  }
 ],
 "ferias": [
  {
   "id": "fer-301",
   "codigo": "301",
   "nome": "Colaborador Demonstração 12",
   "cargo": "ATENDENTE",
   "empresa": "Empresa Demonstração Ltda",
   "mes": "SET",
   "limiteSemDobra": "03/08/2028",
   "adm": "29/10/2021",
   "periodoInicial": "04/09/2026",
   "periodoFinal": "03/09/2027",
   "faltas": 0,
   "afastamentos": 0,
   "saldo": 30,
   "pago": 0,
   "tipo": "A",
   "qtd": 20,
   "competencia": "09/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "fer-302",
   "codigo": "302",
   "nome": "Colaborador Demonstração 13",
   "cargo": "CAIXA",
   "empresa": "Empresa Demonstração Ltda",
   "mes": "MAR",
   "limiteSemDobra": "28/01/2028",
   "adm": "01/03/2021",
   "periodoInicial": "01/03/2026",
   "periodoFinal": "28/02/2027",
   "faltas": 0,
   "afastamentos": 0,
   "saldo": 30,
   "pago": 0,
   "tipo": "A",
   "qtd": 30,
   "competencia": "03/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "fer-303",
   "codigo": "303",
   "nome": "Colaborador Demonstração 14",
   "cargo": "COZINHEIRO",
   "empresa": "Empresa Demonstração Ltda",
   "mes": "AGO",
   "limiteSemDobra": "01/07/2028",
   "adm": "01/08/2026",
   "periodoInicial": "01/08/2026",
   "periodoFinal": "31/07/2027",
   "faltas": 0,
   "afastamentos": 0,
   "saldo": 0,
   "pago": 0,
   "tipo": "A",
   "qtd": 18,
   "competencia": "08/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "fer-304",
   "codigo": "304",
   "nome": "Colaborador Demonstração 15",
   "cargo": "AUX DE LIMPEZA",
   "empresa": "Empresa Demonstração Ltda",
   "mes": "AGO",
   "limiteSemDobra": "09/07/2028",
   "adm": "10/08/2026",
   "periodoInicial": "10/08/2026",
   "periodoFinal": "09/08/2027",
   "faltas": 0,
   "afastamentos": 0,
   "saldo": 0,
   "pago": 0,
   "tipo": "A",
   "qtd": 19,
   "competencia": "08/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "fer-305",
   "codigo": "305",
   "nome": "Colaborador Demonstração 16",
   "cargo": "ATENDENTE",
   "empresa": "Empresa Demonstração Ltda",
   "mes": "AGO",
   "limiteSemDobra": "17/07/2028",
   "adm": "18/08/2026",
   "periodoInicial": "18/08/2026",
   "periodoFinal": "17/08/2027",
   "faltas": 2,
   "afastamentos": 0,
   "saldo": 0,
   "pago": 0,
   "tipo": "A",
   "qtd": 19,
   "competencia": "08/2026",
   "status": "Demonstrativo"
  },
  {
   "id": "fer-306",
   "codigo": "306",
   "nome": "Colaborador Demonstração 17",
   "cargo": "CAIXA",
   "empresa": "Empresa Demonstração Ltda",
   "mes": "AGO",
   "limiteSemDobra": "18/07/2028",
   "adm": "19/08/2026",
   "periodoInicial": "19/08/2026",
   "periodoFinal": "18/08/2027",
   "faltas": 0,
   "afastamentos": 5,
   "saldo": 0,
   "pago": 0,
   "tipo": "A",
   "qtd": 19,
   "competencia": "08/2026",
   "status": "Demonstrativo"
  }
 ]
};
