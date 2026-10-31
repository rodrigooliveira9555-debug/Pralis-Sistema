// Configuração única de títulos, cores e hierarquia dos cadastros financeiros.
const groupConfig={'tipos-venda':{title:'VND - Tipos de Venda',color:'#eab308',code:'',flat:true,singular:'tipo de venda',plural:'tipos de venda'},'bandeiras':{title:'VND - Tipos de Bandeiras',color:'#eab308',code:'',flat:true,singular:'bandeira',plural:'bandeiras'},'operadoras':{title:'VND - Tipos de Operadoras',color:'#eab308',code:'',flat:true,singular:'operadora',plural:'operadoras'},contas:{title:'CNT - Grupos de Contas',color:'#f97316',code:'CNT'},vendas:{title:'VND - Grupos de Vendas',color:'#eab308',code:'VND'},retiradas:{title:'RET - Grupos de Retiradas',color:'#2563eb',code:'RET'},mercadorias:{title:'MER - Grupos de Mercadorias',color:'#22c55e',code:'MER'},despesas:{title:'DES - Grupos de Despesas',color:'#ef4444',code:'DES'}};
const groupSeed={
  "mercadorias": [
    {
      "id": "g0",
      "name": "CIGARROS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g0s0",
          "name": "TRADICIONAIS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s1",
          "name": "PALHA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s2",
          "name": "ACESSORIOS: CEDA/ISQUEIRO/ETC",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g1",
      "name": "BOMBONIERI",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g1s0",
          "name": "CHICLETES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g1s1",
          "name": "BALAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g1s2",
          "name": "CHOCOLATES",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g2",
      "name": "SORVETES",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g2s0",
          "name": "POTES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g2s1",
          "name": "PICOLÉS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g3",
      "name": "BEBIDAS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g3s0",
          "name": "REFRIGERANTES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g3s1",
          "name": "CERVEJAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g3s2",
          "name": "SUCOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g3s3",
          "name": "ISOTÔNICOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g3s4",
          "name": "ÁGUAS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g4",
      "name": "FRIOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g4s0",
          "name": "MUSSARELAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s1",
          "name": "QUEIJO PRATO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s2",
          "name": "QUEIJO PARMESÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s3",
          "name": "PRESUNTOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s4",
          "name": "APRESUNTADOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s5",
          "name": "PEITO PERUS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s6",
          "name": "MORTADELAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g4s7",
          "name": "SALAMINHOS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g5",
      "name": "LATICÍNIOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g5s0",
          "name": "MANTEIGAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s1",
          "name": "REQUEIJÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s2",
          "name": "PATÊS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s3",
          "name": "QUEIJOS/EMBUTIDOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s4",
          "name": "LEITES SAQUINHO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s5",
          "name": "LEITES UHT LONGA VIDA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s6",
          "name": "IOGURTES",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g6",
      "name": "BISCOITOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g6s0",
          "name": "DOCES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s1",
          "name": "SALGADOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s2",
          "name": "REVENDA MARCA PRALIS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g7",
      "name": "MERCEARIA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g7s0",
          "name": "ALIMENTOS BÁSICOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g7s1",
          "name": "ALIMENTOS DIVERSOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g7s2",
          "name": "NÃO ALIMENTOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g7s3",
          "name": "HIGIENE PESSOAL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g7s4",
          "name": "PRODUTOS DE LIMPEZA",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g8",
      "name": "CONGELADOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g8s0",
          "name": "PÃO DE QUEIJO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g8s1",
          "name": "MINI SALGADO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g9",
      "name": "POLPA DE FRUTA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g9s0",
          "name": "REFRESQUEIRA",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g10",
      "name": "FAB. PRÓPRIA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g10s0",
          "name": "PANIFICAÇÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s1",
          "name": "CONFEITARIA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s2",
          "name": "SALGADOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s3",
          "name": "SANDUÍCHE",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s4",
          "name": "ALMOÇO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s5",
          "name": "SALADAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s6",
          "name": "MASSAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s7",
          "name": "BEBIDAS/COPA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s8",
          "name": "LANCHES/CHAPA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s9",
          "name": "ACRECIMOS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g11",
      "name": "FAB. PRÓPRIA BASE",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g11s0",
          "name": "RECHEIOS PRALIS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g11s1",
          "name": "MASSAS PRALIS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g11s2",
          "name": "CORBERTURAS PRALIS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g11s3",
          "name": "INGREDIENTES PRALIS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g12",
      "name": "EMBALAGENS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g12s0",
          "name": "ISOPOR",
          "active": true,
          "icon": 0
        },
        {
          "id": "g12s1",
          "name": "PAPEL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g12s2",
          "name": "PLASTICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g12s3",
          "name": "LAMINADOS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g13",
      "name": "MAT. PRIMA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g13s0",
          "name": "CONDIMENTOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s1",
          "name": "FARINHAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s2",
          "name": "FERMENTOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s3",
          "name": "REFORCADORES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s4",
          "name": "AÇÚCARES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s5",
          "name": "SAL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s6",
          "name": "MASSAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s7",
          "name": "GRÃOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s8",
          "name": "CHOCOLATES EM PÓ",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s9",
          "name": "COCOLATES EM BARRA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s10",
          "name": "FRIOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s11",
          "name": "LATICÍNIOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s12",
          "name": "LEITES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s13",
          "name": "LEITE CONDENSADO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s14",
          "name": "FRUTAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s15",
          "name": "LEGUMES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s16",
          "name": "VERDURAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s17",
          "name": "PROTEINAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g13s18",
          "name": "REFRIGERANTES",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g14",
      "name": "PATRIMONIO NÃO VENDAS",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g15",
      "name": "INATIVOS",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g16",
      "name": "MATERIAL LIMPEZA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g16s0",
          "name": "EMPRESA",
          "active": true,
          "icon": 0
        }
      ]
    }
  ],
  "despesas": [
    {
      "id": "g0",
      "name": "IMPOSTOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g0s0",
          "name": "FEDERAL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s1",
          "name": "ESTADUAL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s2",
          "name": "MUNICIPAL",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g1",
      "name": "TAXA CARTÕES",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g1s0",
          "name": "CREDITO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g1s1",
          "name": "DEBITO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g1s2",
          "name": "VOUCHER",
          "active": true,
          "icon": 0
        },
        {
          "id": "g1s3",
          "name": "PIX",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g2",
      "name": "ALUGUEL",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g3",
      "name": "IPTU",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g4",
      "name": "ÁGUA",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g5",
      "name": "ENERGIA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g5s0",
          "name": "ELÉTRICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s1",
          "name": "SOLAR",
          "active": true,
          "icon": 0
        },
        {
          "id": "g5s2",
          "name": "GÁS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g6",
      "name": "OUTRAS DESP. FIXAS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g6s0",
          "name": "SINDICATO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s1",
          "name": "HOSPEDAGEM EMAIL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s2",
          "name": "CONTABILIDADE",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s3",
          "name": "SIST. OPERACIONAIS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s4",
          "name": "DETETIZADORA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s5",
          "name": "MEDICINA TRABALHO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s6",
          "name": "SEGURO LOJA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s7",
          "name": "ADVOGADOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g6s8",
          "name": "SEGURANÇA",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g7",
      "name": "TELEFONIA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g7s0",
          "name": "INTERNET",
          "active": true,
          "icon": 0
        },
        {
          "id": "g7s1",
          "name": "TELEFONE",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g8",
      "name": "FOLHA PAG",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g8s0",
          "name": "PAGAMENTO 5º",
          "active": true,
          "icon": 0
        },
        {
          "id": "g8s1",
          "name": "ADIANTAMENTO 20°",
          "active": true,
          "icon": 0
        },
        {
          "id": "g8s2",
          "name": "CONTRATO TRABALHO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g8s3",
          "name": "OUTROS ADIANTAMENTOS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g8s4",
          "name": "PAGAMENTOS EXTRAS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g9",
      "name": "PREMIAÇÃO",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g9s0",
          "name": "SALÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g9s1",
          "name": "PRODUÇÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g9s2",
          "name": "ADM",
          "active": true,
          "icon": 0
        },
        {
          "id": "g9s3",
          "name": "MISTO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g10",
      "name": "BENEFÍCIOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g10s0",
          "name": "PLANO DE SAÚDE",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s1",
          "name": "PLANO ODONTOLÓGICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s2",
          "name": "SEGURO DE VIDA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s3",
          "name": "CESTA BÁSICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s4",
          "name": "SEGUROS VIDA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g10s5",
          "name": "ALIMENTAÇÃO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g11",
      "name": "DIARIAS E H. EXTRAS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g11s0",
          "name": "DIÁRIA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g11s1",
          "name": "HORA EXTRA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g11s2",
          "name": "VALE TRANS.",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g12",
      "name": "ENCARGOS SOCIAIS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g12s0",
          "name": "PREVIDÊNCIA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g12s1",
          "name": "FUNDO GARANTIA",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g13",
      "name": "VALE TRANS.",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g14",
      "name": "13º",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g15",
      "name": "FÉRIAS E RESCISÕES",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g15s0",
          "name": "FÉRIAS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g15s1",
          "name": "RECISOES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g15s2",
          "name": "MULTAS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g16",
      "name": "UNIFORMES",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g16s0",
          "name": "GERAL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g16s1",
          "name": "PRODUÇÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g16s2",
          "name": "SALÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g16s3",
          "name": "ADM",
          "active": true,
          "icon": 0
        },
        {
          "id": "g16s4",
          "name": "MISTO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g17",
      "name": "DIRETORIA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g17s0",
          "name": "CEO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g17s1",
          "name": "COO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g18",
      "name": "MANUT. EMPRESA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g18s0",
          "name": "SERVIÇO ELÉTRICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s1",
          "name": "SERVIÇO HIDRÁULICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s2",
          "name": "SERVIÇO MÁQ./EQUIP.",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s3",
          "name": "SERVIÇO MOB./BALCÕES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s4",
          "name": "SERVIÇO UTENC./FERRA.",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s5",
          "name": "MAT. E PECAS ELÉTRICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s6",
          "name": "MAT. E PECAS HIDRÁULICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s7",
          "name": "MAT. E PECAS EST. FISICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s8",
          "name": "MAT. E PECAS MÁQ./EQUIP.",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s9",
          "name": "MAT. E PECAS MOB./BALCÕES",
          "active": true,
          "icon": 0
        },
        {
          "id": "g18s10",
          "name": "MAT. E PECAS UTENC./FERRA.",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g19",
      "name": "DOAÇÃO",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g20",
      "name": "GELO",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g21",
      "name": "MAT. ESCRITÓRIO",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g22",
      "name": "DATAS COMEMORATIVAS",
      "active": true,
      "icon": 0,
      "children": []
    },
    {
      "id": "g23",
      "name": "DESP. BANCÁRIAS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g23s0",
          "name": "JUROS",
          "active": true,
          "icon": 0
        },
        {
          "id": "g23s1",
          "name": "IOF",
          "active": true,
          "icon": 0
        },
        {
          "id": "g23s2",
          "name": "SERVIÇOS",
          "active": true,
          "icon": 0
        }
      ],
      "directEntry": true
    },
    {
      "id": "g24",
      "name": "MAT. LIMPEZA",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g24s0",
          "name": "PAPEL TOALHA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g24s1",
          "name": "PRODUTO QUÍMICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g24s2",
          "name": "UTENC. DESCARTÁVEIS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g25",
      "name": "TRANSPORTE",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g25s0",
          "name": "COMBUSTÍVEL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g25s1",
          "name": "LIMPEZA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g25s2",
          "name": "ESTACIONAMENTO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g25s3",
          "name": "MANUTENÇÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g25s4",
          "name": "MOTORISTA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g25s5",
          "name": "SEGURO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g25s6",
          "name": "TAXAS E DOCUMENTAÇÃO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g26",
      "name": "TREINAMENTO",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g26s0",
          "name": "GERAL",
          "active": true,
          "icon": 0
        },
        {
          "id": "g26s1",
          "name": "PRODUÇÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g26s2",
          "name": "SALÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g26s3",
          "name": "ADM",
          "active": true,
          "icon": 0
        },
        {
          "id": "g26s4",
          "name": "MISTO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g27",
      "name": "MARKETING",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g27s0",
          "name": "SOCIAL MÍDIA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s1",
          "name": "GRAFICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s2",
          "name": "TRÁFEGO",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s3",
          "name": "INFLUENCER",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s4",
          "name": "DSIGNER",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s5",
          "name": "COPI",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s6",
          "name": "OUTROS MAT. CAMPANHA",
          "active": true,
          "icon": 0
        },
        {
          "id": "g27s7",
          "name": "ÁUDIO, IMAGEM E VÍDEO",
          "active": true,
          "icon": 0
        }
      ]
    }
  ],
  "vendas": [
    {
      "id": "g0",
      "name": "CAIXA PDV",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g0s0",
          "name": "1M",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s1",
          "name": "1T",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s2",
          "name": "2M",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s3",
          "name": "2T",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s4",
          "name": "3M",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s5",
          "name": "3T",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s6",
          "name": "4M",
          "active": true,
          "icon": 0
        },
        {
          "id": "g0s7",
          "name": "4T",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g1",
      "name": "NFE",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g1s0",
          "name": "EMPRESAS",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "g2",
      "name": "DELIVERY",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "g2s0",
          "name": "IFOOD",
          "active": true,
          "icon": 0
        }
      ]
    }
  ],
  "retiradas": [
    {
      "id": "ret-g0",
      "name": "INVESTIMENTO",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "ret-g0s0",
          "name": "ELETRICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g0s1",
          "name": "HIDRÁULICO",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g0s2",
          "name": "EST. FISICA",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g0s3",
          "name": "MÁQ./EQUIP.",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g0s4",
          "name": "MOB./BALCÕES",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g0s5",
          "name": "UTEN./FERRA.",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "ret-g1",
      "name": "SÓCIOS",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "ret-g1s0",
          "name": "RODRIGO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "ret-g2",
      "name": "PRO LABORE",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "ret-g2s0",
          "name": "RODRIGO",
          "active": true,
          "icon": 0
        }
      ]
    },
    {
      "id": "ret-g3",
      "name": "PARTICIPAÇÃO",
      "active": true,
      "icon": 0,
      "children": [
        {
          "id": "ret-g3s0",
          "name": "PRODUÇÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g3s1",
          "name": "SALÃO",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g3s2",
          "name": "ADM",
          "active": true,
          "icon": 0
        },
        {
          "id": "ret-g3s3",
          "name": "MISTO",
          "active": true,
          "icon": 0
        }
      ]
    }
  ]
};
groupSeed['tipos-venda']=[{"id": "sale-type-0", "name": "I - DINHEIRO (VND)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-1", "name": "D - DEBITO (VND/TRAN)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-2", "name": "C - CREDITO (VND/TRANS)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-3", "name": "V - VOUCHER (VND/TRANS)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-4", "name": "P - PIX (VND/TRANS)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-5", "name": "R - CLIENTES (VND/TRANS)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-6", "name": "E - COLABORADORES (VND/DES)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-7", "name": "L - ALIMENTAÇÃO -66,6% (VND/DES)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-8", "name": "F - ROUBO/FURTO (VND/DES)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-9", "name": "O - SOCIOS/PROPRIETARIOS (VND/RET)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-10", "name": "S - SOBRA/PERDA -66,6% (MER)", "active": true, "icon": 0, "children": []}, {"id": "sale-type-11", "name": "CREDIARIO", "active": true, "icon": 0, "children": []}, {"id": "sale-type-12", "name": "P - PIX BANCO (VND/TRANS)", "active": true, "icon": 0, "children": []}];
groupSeed.bandeiras=[{"id": "brand-0", "name": "DINHEIRO", "active": true, "icon": 0, "children": []}, {"id": "brand-1", "name": "ELO CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-2", "name": "ELO DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-3", "name": "VISA DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-4", "name": "VISA CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-5", "name": "MASTERCARD CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-6", "name": "MASTERCARD DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-7", "name": "HIPERCARD CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-8", "name": "AMEX CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-9", "name": "CABAL DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-10", "name": "SODEXO ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-11", "name": "SODEXO REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-12", "name": "SODEXO BENEFÍCIOS", "active": true, "icon": 0, "children": []}, {"id": "brand-13", "name": "UP ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-14", "name": "UP REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-15", "name": "UP DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-16", "name": "UP CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-17", "name": "CABAL ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-18", "name": "CABAL REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-19", "name": "REDECOMPRAS CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-20", "name": "REDECOMPRAS ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-21", "name": "REDECOMPRAS REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-22", "name": "ALELO REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-23", "name": "ALELO ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-24", "name": "ALELO BENEFÍCIOS", "active": true, "icon": 0, "children": []}, {"id": "brand-25", "name": "VR ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-26", "name": "VR REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-27", "name": "TICKET. RES REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-28", "name": "TICKET. RES ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-29", "name": "TICKET. RES BENEFÍCIOS", "active": true, "icon": 0, "children": []}, {"id": "brand-30", "name": "GREEN CARD ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-31", "name": "GREEN CARD REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-32", "name": "BEN VISA VALE ALIMENTAÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-33", "name": "BEN VISA VALE REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-34", "name": "BK BANK BENEFÍCIOS", "active": true, "icon": 0, "children": []}, {"id": "brand-35", "name": "PIX DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-36", "name": "MAESTRO DEBITO", "active": true, "icon": 0, "children": []}, {"id": "brand-37", "name": "MAESTRO CREDITO", "active": true, "icon": 0, "children": []}, {"id": "brand-38", "name": "PLUXEE REFEIÇÃO", "active": true, "icon": 0, "children": []}, {"id": "brand-39", "name": "PLUXEE GIFT", "active": true, "icon": 0, "children": []}, {"id": "brand-40", "name": "PLUXEE ALIMENTÇÃO", "active": true, "icon": 0, "children": []}];groupSeed.operadoras=[{"id": "operator-0", "name": "Stone", "active": true, "icon": 0, "children": []}, {"id": "operator-1", "name": "Getnet", "active": true, "icon": 0, "children": []}, {"id": "operator-2", "name": "Cielo", "active": true, "icon": 0, "children": []}, {"id": "operator-3", "name": "PagBank", "active": true, "icon": 0, "children": []}, {"id": "operator-4", "name": "SafraPay", "active": true, "icon": 0, "children": []}, {"id": "operator-5", "name": "Rede", "active": true, "icon": 0, "children": []}, {"id": "operator-6", "name": "Mercado Pago", "active": true, "icon": 0, "children": []}, {"id": "operator-7", "name": "SumUp", "active": true, "icon": 0, "children": []}, {"id": "operator-8", "name": "Ton", "active": true, "icon": 0, "children": []}, {"id": "operator-9", "name": "InfinitePay", "active": true, "icon": 0, "children": []}];
groupSeed.despesas.find(g=>g.name==='DESP. BANCÁRIAS').directEntry=true;
const groupStorage='cicluz-financial-hierarchy-v1';
let financialGroups;try{financialGroups=JSON.parse(localStorage.getItem(groupStorage)||'null')}catch{}
if(!financialGroups||typeof financialGroups!=='object')financialGroups=structuredClone(groupSeed);
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f\u2060]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
// Reconcile the complete imported lists once, retaining edits, states and added records.
const importRevision='cicluz-financial-import-complete-v3-ret';
if(!localStorage.getItem(importRevision)){
 for(const [key,seeds] of Object.entries(groupSeed)){
  if(!Array.isArray(financialGroups[key]))financialGroups[key]=[];
  for(const seed of seeds){let group=financialGroups[key].find(g=>g.id===seed.id||normalized(g.name)===normalized(seed.name));
   if(!group){financialGroups[key].push(structuredClone(seed));continue}
   if(!Array.isArray(group.children))group.children=[];
   if(seed.directEntry)group.directEntry=true;
   for(const child of seed.children)if(!group.children.some(c=>c.id===child.id||normalized(c.name)===normalized(child.name)))group.children.push(structuredClone(child));
  }
 }
 try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups));localStorage.setItem(importRevision,'1')}catch{}
}

// Preserve financial groups created in the earlier flat editor.
if(!localStorage.getItem('cicluz-financial-legacy-import-v1')){
 for(const key of ['retiradas','vendas','mercadorias','despesas']){
  const code=groupConfig[key].code;
  for(const raw of (Array.isArray(tiGroups[key])?tiGroups[key]:[])){
   if(typeof raw!=='string')continue;
   const clean=raw.replace(new RegExp('^'+code+'\\s+','i'),'').trim();if(!clean)continue;
   const split=clean.indexOf(' - '),groupName=split<0?clean:clean.slice(0,split),childName=split<0?'':clean.slice(split+3);
   let group=financialGroups[key].find(g=>normalized(g.name)===normalized(groupName));
   if(!group){group={id:crypto.randomUUID(),name:groupName,active:true,icon:0,children:[]};financialGroups[key].push(group)}
   if(childName&&!group.children.some(c=>normalized(c.name)===normalized(childName)))group.children.push({id:crypto.randomUUID(),name:childName,active:true,icon:0});
  }
 }
 try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups));localStorage.setItem('cicluz-financial-legacy-import-v1','1')}catch{}
}

for(const key of ['tipos-venda','bandeiras','operadoras'])if(!Array.isArray(financialGroups[key])){financialGroups[key]=structuredClone(groupSeed[key]);try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups))}catch{}}
if(!localStorage.getItem('cicluz-bandeiras-import-v1')){for(const seed of groupSeed.bandeiras){if(!financialGroups.bandeiras.some(g=>g.id===seed.id||normalized(g.name)===normalized(seed.name)))financialGroups.bandeiras.push(structuredClone(seed))}try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups));localStorage.setItem('cicluz-bandeiras-import-v1','1')}catch{}}
if(!localStorage.getItem('cicluz-operadoras-import-v1')){for(const seed of groupSeed.operadoras){if(!financialGroups.operadoras.some(g=>g.id===seed.id||normalized(g.name)===normalized(seed.name)))financialGroups.operadoras.push(structuredClone(seed))}try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups));localStorage.setItem('cicluz-operadoras-import-v1','1')}catch{}}
const groupIcons=[null,icons.groups,icons.launch,icons.records,icons.overview,icons.team,icons.settings];
const groupIconLabels=['Padrão do menu','Grupos','Carteira','Relógio','Painel','Pessoas','Configurações'];
function persistGroups(){try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups));return true}catch{alert('Não foi possível salvar neste navegador.');return false}}
const oldShowTiGroup=showTiGroup;
showTiGroup=function(key,title,icon){const view=document.getElementById('sector-view');view.querySelectorAll('.financial-expand-all,.view-alphabetize').forEach(b=>b.remove());view.classList.remove('financial-groups');view.style.removeProperty('--menu-accent');if(key==='contas')return oldShowTiGroup(key,groupConfig.contas.title,icon);if(!groupConfig[key])return oldShowTiGroup(key,title,icon);showFinancialGroup(key,icon)};
function showFinancialGroup(key,originIcon,editId){
 const formatName=value=>key==='tipos-venda'?formatFinancialName(value).replace(/^([a-z])(?= -)/i,m=>m.toUpperCase()).replace(/\([^)]*\)/g,m=>m.toUpperCase()):formatFinancialName(value);
 const cfg=groupConfig[key],view=document.getElementById('sector-view');view.querySelectorAll('.financial-expand-all,.view-alphabetize').forEach(b=>b.remove());const box=document.getElementById('sector-content');
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show','financial-groups');view.classList.remove('account-orange');view.style.setProperty('--menu-accent',cfg.color);view.style.setProperty('--panel-color',cfg.color);
 const panel=view.querySelector('.panel');panel.style.setProperty('--panel-color',cfg.color);panel.style.setProperty('--panel-text',(key==='vendas'||cfg.flat)?'#785600':key==='mercadorias'?'#12672e':key==='retiradas'?'#174ca1':'#9c1c1c');
 document.getElementById('sector-path').textContent='Configurações / TI / '+cfg.title;document.getElementById('crumb').textContent='Configurações / TI / '+cfg.title;
 const defaultIcon=originIcon||'<svg viewBox="0 0 24 24">'+dollar+'</svg><svg viewBox="0 0 24 24">'+moneyIcons[key==='vendas'||cfg.flat?0:2]+'</svg>';view.querySelector('.sector-icon').innerHTML=defaultIcon;
 const iconMarkup=item=>{const logo=!item.icon&&getPaymentMark(key,item.name);if(logo)return '<img src="'+logo+'" alt="" class="payment-logo">';return item.icon?'<svg viewBox="0 0 24 24">'+(groupIcons[item.icon]||icons.groups)+'</svg>':defaultIcon};
 const ti=()=>openSection(sections[6][0],'TI','settings','#7c3aed');
 let query='',mode=cfg.flat?'complete':'grouped',manual=localStorage.getItem('cicluz-'+key+'-sort')==='manual';
 const expanded=new Set();
 function button(text,fn,cls='btn secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;return b}
 function ordered(pool){return [...pool].sort((a,b)=>Number(b.active!==false)-Number(a.active!==false)||(manual?0:a.name.localeCompare(b.name,'pt-BR',{numeric:true,sensitivity:'base'})))}
 function list(){setSectorBack(ti);box.replaceChildren();document.getElementById('sector-title').textContent=cfg.title;
 view.querySelectorAll('.financial-expand-all,.view-alphabetize').forEach(b=>b.remove());
 const shortcuts=view.querySelector('.shortcut-actions');
 for(const [label,path,open] of (cfg.flat?[]:[['Expandir todos os grupos','m5 9 7 7 7-7',true],['Recolher todos os grupos','m5 15 7-7 7 7',false]])){const b=button('',()=>{mode='grouped';display.value=mode;if(open)financialGroups[key].forEach(g=>expanded.add(g.id));else expanded.clear();render()},'shortcut-circle financial-expand-all');b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';shortcuts.prepend(b)}
 const form=document.createElement('form');form.className='ti-group-form';const input=document.createElement('input');input.placeholder=cfg.flat?(key==='tipos-venda'?'Nome do Tipo de Venda':key==='bandeiras'?'Nome da Bandeira':'Nome da Operadora'):'Nome do grupo';input.setAttribute('aria-label',cfg.flat?(key==='tipos-venda'?'Nome do Tipo de Venda':key==='bandeiras'?'Nome da Bandeira':'Nome da Operadora'):'Nome do grupo');input.maxLength=120;input.required=true;
 const add=document.createElement('button');add.className='btn';add.textContent=cfg.flat?'Adicionar tipo':'Adicionar grupo';add.type='submit';form.append(input,add);form.onsubmit=e=>{e.preventDefault();edit(null,null,input.value.trim())};box.append(form);
 const toolbar=document.createElement('div');toolbar.className='financial-list-controls';
 const sort=createAlphabetizeButton(()=>{manual=false;localStorage.setItem('cicluz-'+key+'-sort','name');render()});
 const display=document.createElement('select');display.className='account-sort';display.setAttribute('aria-label','Exibição');display.add(new Option('Lista completa','complete'));display.add(new Option('Grupos e subgrupos','grouped'));display.value=mode;display.onchange=()=>{mode=display.value;localStorage.setItem('cicluz-'+key+'-display',mode);render()};
 const search=document.createElement('input');search.type='search';search.className='account-sort';search.placeholder=cfg.flat?'Buscar '+cfg.singular:'Buscar grupo ou subgrupo';search.setAttribute('aria-label',search.placeholder);search.value=query;search.oninput=()=>{query=search.value;render()};mountAlphabetizeButton(view,sort);if(!cfg.flat)toolbar.append(display);toolbar.append(search);box.append(toolbar);
 const summary=document.createElement('p');summary.className='financial-list-summary';box.append(summary);const grid=document.createElement('div');grid.className='record-grid financial-list';box.append(grid);
 function render(){grid.replaceChildren();let shown=0;const q=normalized(query);let total=0;const groups=financialGroups[key]||[];for(const g of groups)total+=g.children.length+((g.directEntry||!g.children.length)?1:0);
 if(mode==='complete'){
  for(const group of ordered(groups)){
   if(!group.children.length||group.directEntry){const label=(cfg.code+' '+group.name).trim();if(normalized(label).includes(q)){grid.append(row(group,null,label));shown++}}
   for(const item of ordered(group.children)){const label=(cfg.code+' '+group.name).trim()+' - '+item.name;if(normalized(label).includes(q)){grid.append(row(item,group,label));shown++}}
  }
 }else{

  for(const group of ordered(groups)){
   if(!normalized(group.name).includes(q)&&!group.children.some(c=>normalized(c.name).includes(q)))continue;
   const wrap=document.createElement('div');wrap.className='financial-group';const header=row(group,null,cfg.code+' '+group.name);if(group.children.length){const expand=button('',()=>{expanded.has(group.id)?expanded.delete(group.id):expanded.add(group.id);render()},'financial-expand');expand.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(expanded.has(group.id)||q?'m5 9 7 7 7-7':'m9 5 7 7-7 7')+'"/></svg>';expand.onclick=e=>{e.stopPropagation();expanded.has(group.id)?expanded.delete(group.id):expanded.add(group.id);render()};expand.setAttribute('aria-label','Subgrupos de '+group.name);expand.setAttribute('aria-expanded',String(expanded.has(group.id)||!!q));const amount=document.createElement('small');amount.className='financial-count';amount.textContent=group.children.length+(group.children.length===1?' subgrupo':' subgrupos');header.querySelector('b').append(amount);header.querySelector('b').prepend(expand)}wrap.append(header);
   if(expanded.has(group.id)||q){const children=document.createElement('div');children.className='financial-subgroups';for(const child of ordered(group.children)){if(!q||normalized(group.name).includes(q)||normalized(child.name).includes(q)){children.append(row(child,group,cfg.code+' '+group.name+' - '+child.name));shown++}}children.append(button('+ Novo subgrupo',()=>edit(null,group)));wrap.append(children)}grid.append(wrap);
  }
 }
 summary.textContent=mode==='complete'?shown+' de '+total+(cfg.flat?' '+cfg.plural:' itens · '+groups.length+' grupos'):groups.length+' grupos · '+total+' itens na lista completa';
 if(!groups.length){summary.textContent=cfg.flat?'Nenhum registro cadastrado.':'Nenhum grupo cadastrado.'}else if(!grid.children.length){const p=document.createElement('p');p.textContent='Nenhum resultado encontrado.';grid.append(p)}
 }
 function row(item,parent,label){const row=document.createElement('div');row.className='record section-card account-list-row';row.tabIndex=0;row.setAttribute('role','group');row.dataset.id=item.id;row.dataset.parentId=parent?.id||'';row.classList.toggle('account-inactive',item.active===false||parent?.active===false);row.style.setProperty('--card-color',cfg.color);
 const handle=document.createElement('span');handle.className='account-move';handle.textContent='⠿';handle.title='Arrastar para organizar';handle.setAttribute('aria-label','Mover '+label);handle.style.touchAction='none';
 handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId);row.classList.add('moving')};handle.onpointerup=e=>{row.classList.remove('moving');handle.releasePointerCapture(e.pointerId);const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-id]');const pool=parent?parent.children:financialGroups[key];const from=pool.indexOf(item),to=pool.findIndex(x=>x.id===target?.dataset.id);if(!target||target.dataset.parentId!==(parent?.id||'')||to<0||from===to||pool[to].active!==item.active)return;const prior=[...pool];const next=ordered(pool);const a=next.indexOf(item),b=next.findIndex(x=>x.id===target.dataset.id);next.splice(a,1);next.splice(b,0,item);pool.splice(0,pool.length,...next);if(!persistGroups()){pool.splice(0,pool.length,...prior);return}manual=true;localStorage.setItem('cicluz-'+key+'-sort','manual');render()};handle.onclick=e=>{e.preventDefault();e.stopPropagation()};
 enableContinuousReorder(handle,{item:()=>!parent&&mode==='grouped'?row.closest('.financial-group'):row,items:()=>{const source=!parent&&mode==='grouped'?[...grid.querySelectorAll(':scope>.financial-group')]:[...grid.querySelectorAll('[data-id]')].filter(r=>r.dataset.parentId===(parent?.id||''));return source.filter(n=>(n.matches('.account-list-row')?n:n.querySelector('.account-list-row')).classList.contains('account-inactive')===row.classList.contains('account-inactive'))},onCommit:()=>{const pool=parent?parent.children:financialGroups[key];const ids=[...grid.querySelectorAll('[data-id]')].filter(r=>r.dataset.parentId===(parent?.id||'')).map(r=>r.dataset.id);const positions=new Map(ids.map((id,i)=>[id,i]));const prior=[...pool];pool.sort((a,b)=>(positions.get(a.id)??9999)-(positions.get(b.id)??9999));if(!persistGroups())pool.splice(0,pool.length,...prior);manual=true;localStorage.setItem('cicluz-'+key+'-sort','manual');render()}});
 const badge=document.createElement('span');badge.className='card-inherited-icon';badge.innerHTML=iconMarkup(item);badge.classList.toggle('has-payment-logo',!!getPaymentMark(key,item.name)&&!item.icon);const name=document.createElement('b');name.textContent=formatName(label);if(key==='bandeiras'&&item.saleTypeId){const linked=financialGroups['tipos-venda'].find(t=>t.id===item.saleTypeId);if(linked){const link=button('Tipo: '+formatFinancialName(linked.name).replace(/\([^)]*\)/g,m=>m.toUpperCase()),()=>showFinancialGroup('tipos-venda',undefined,linked.id),'sale-type-link');name.append(link)}}const state=document.createElement('span');state.className='account-list-state';state.textContent=item.active===false?'Inativo':'Ativo';const {arrow,actions}=createFinancialActions({label,container:grid,onEdit:()=>edit(item,parent),onDelete:()=>{if(!confirm('Tem certeza que deseja excluir '+label+(!parent&&item.children.length?' e seus '+item.children.length+' subgrupos':'')+'?'))return;const pool=parent?parent.children:financialGroups[key];const index=pool.indexOf(item);pool.splice(index,1);if(!persistGroups())pool.splice(index,0,item);render()}});
 row.append(handle,badge,name,state,arrow,actions);row.onclick=e=>{if(e.target.closest('button,.account-move'))return;if(!actions.hidden){actions.hidden=true;arrow.setAttribute('aria-expanded','false');return}edit(item,parent)};row.onkeydown=e=>{if(e.target===row&&e.key==='Enter'){e.preventDefault();edit(item,parent)}};return row}
 render();}
 function edit(item,parent,initial=''){
 box.replaceChildren();view.querySelectorAll('.financial-expand-all,.view-alphabetize').forEach(b=>b.remove());setSectorBack(list);document.getElementById('sector-title').textContent=cfg.flat?'Cadastro de '+cfg.singular:parent?'Cadastro do subgrupo':'Cadastro do grupo';
 const form=document.createElement('form');form.className='form-fields account-editor';
 const field=(text,control)=>{const label=document.createElement('label');label.textContent=text;control.style.width='100%';label.append(control);form.append(label);return control};
 const name=field(cfg.flat?(key==='tipos-venda'?'Nome do Tipo de Venda':key==='bandeiras'?'Nome da Bandeira':'Nome da Operadora'):parent?'Nome do subgrupo':'Nome do grupo',document.createElement('input'));name.required=true;name.maxLength=120;name.value=formatName(item?.name||initial);
 const doc=field('Referência documental',document.createElement('select'));for(const value of ['','DOC/F','DOC/NF','DOC/F/NF'])doc.add(new Option(value||'Selecione',value));doc.value=item?.document||'';
 let saleType;if(key==='bandeiras'){saleType=field('Tipo de Venda',document.createElement('select'));saleType.required=true;saleType.setAttribute('aria-label','Tipo de Venda');saleType.add(new Option('Selecione o tipo de venda',''));for(const type of financialGroups['tipos-venda'])if(type.active!==false||type.id===item?.saleTypeId)saleType.add(new Option(formatFinancialName(type.name).replace(/^([a-z])(?= -)/i,m=>m.toUpperCase()).replace(/\([^)]*\)/g,m=>m.toUpperCase())+(type.active===false?' (Inativo)':''),type.id));saleType.value=item?.saleTypeId||'';const openType=button('Abrir Tipo de Venda',()=>{if(!saleType.value){saleType.reportValidity();return}showFinancialGroup('tipos-venda',undefined,saleType.value)},'btn secondary');form.append(openType)}
 let purpose;if(key==='mercadorias'){purpose=field('Finalidade da mercadoria',document.createElement('select'));for(const value of ['','VENDA','TRANSFORMAÇÃO'])purpose.add(new Option(value||'Selecione',value));purpose.value=item?.purpose||''}
 const statusWrap=document.createElement('div');statusWrap.className='account-status';const statusTitle=document.createElement('span');statusTitle.textContent=cfg.flat?(key==='tipos-venda'?'Situação do Tipo de Venda':key==='bandeiras'?'Situação da Bandeira':'Situação da Operadora'):parent?'Situação do subgrupo':'Situação do grupo';const switchRow=document.createElement('div');switchRow.className='account-status-row';let active=item?.active!==false;const toggle=button('',()=>{active=!active;refreshStatus()},'account-status-switch');toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Ativar ou inativar');toggle.append(document.createElement('span'));const state=document.createElement('span');state.className='account-status-text';function refreshStatus(){toggle.setAttribute('aria-checked',String(active));state.textContent=active?'Ativo':'Inativo'}refreshStatus();switchRow.append(toggle,state);statusWrap.append(statusTitle,switchRow);form.append(statusWrap);
 let chosen=item?.icon||0;const iconLabel=document.createElement('div');iconLabel.className='account-field-group';iconLabel.textContent=cfg.flat?(key==='tipos-venda'?'Ícone do Tipo de Venda':key==='bandeiras'?'Ícone da Bandeira':'Ícone da Operadora'):parent?'Ícone do subgrupo':'Ícone do grupo';const choices=document.createElement('div');choices.className='account-icon-options';iconLabel.append(choices);
 const preview=document.createElement('div');preview.className='icon-live-preview';const badge=document.createElement('span');badge.className='icon-live-badge';badge.style.background=cfg.color;badge.style.color='#fff';const previewName=document.createElement('b');preview.append(badge,previewName);
 const buttons=[];function refresh(){badge.innerHTML=iconMarkup({icon:chosen,name:name.value});badge.classList.toggle('has-payment-logo',!!getPaymentMark(key,name.value)&&!chosen);previewName.textContent=formatName(name.value)||'Nome do grupo';buttons.forEach((b,i)=>{const selected=chosen===i;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))})}
 groupIcons.forEach((_,i)=>{const b=button('',()=>{chosen=i;refresh()},'account-icon-dot');b.title=groupIconLabels[i];b.setAttribute('aria-label',b.title);b.innerHTML='<span style="display:inline-flex;width:18px;height:18px">'+iconMarkup({icon:i,name:name.value})+'</span>';buttons.push(b);choices.append(b)});
 const identity=document.createElement('div');identity.className='job-identity account-identity';const pick=document.createElement('div');pick.className='identity-pick';pick.append(iconLabel);identity.append(name.closest('label'),pick);form.prepend(identity);
 const more=document.createElement('details');more.className='identity-advanced';const moreTitle=document.createElement('summary');moreTitle.textContent='Mais ícones';const extra=document.createElement('div');extra.className='account-icon-options';buttons.slice(6).forEach(b=>extra.append(b));more.append(moreTitle,extra);choices.append(more);form.append(preview);if(parent){const context=document.createElement('p');context.className='financial-parent-context';context.textContent='Grupo: '+formatName(parent.name);form.append(context)}
 const actions=document.createElement('div');actions.className='actions';const save=button('Salvar',()=>{},'btn');save.type='submit';actions.append(save,button('Cancelar',list));form.append(actions);
 name.oninput=()=>{name.setCustomValidity('');refresh()};refresh();form.onsubmit=e=>{e.preventDefault();const next=formatName(name.value.trim());if(!next)return;const pool=parent?parent.children:financialGroups[key];if(pool.some(g=>g!==item&&normalized(g.name)===normalized(next))){name.setCustomValidity('Este nome já existe.');name.reportValidity();return}const snapshot=structuredClone(financialGroups);const value={name:next,active,icon:chosen,document:doc.value,...(saleType?{saleTypeId:saleType.value}:{}),...(purpose?{purpose:purpose.value}:{})};if(item)Object.assign(item,value);else pool.push({id:crypto.randomUUID(),...value,...(!parent?{children:[]}:{})});if(!persistGroups()){financialGroups=snapshot;return}list()};box.append(form);name.focus();
 }
 const selected=editId&&(financialGroups[key]||[]).find(t=>t.id===editId);if(selected)edit(selected,null);else list();
}
const baseOpenSection=openSection;openSection=function(...args){const v=document.getElementById('sector-view');v.querySelectorAll('.financial-expand-all,.view-alphabetize').forEach(b=>b.remove());v.classList.remove('financial-groups');v.style.removeProperty('--menu-accent');v.style.removeProperty('--panel-color');return baseOpenSection(...args)};
