// Configuração única de títulos, cores e hierarquia dos cadastros financeiros.
const groupConfig={contas:{title:'Grupo de contas / CNT',color:'#f97316',code:'CNT'},vendas:{title:'Grupo de vendas / VND',color:'#eab308',code:'VND'},retiradas:{title:'Grupo de retiradas / RET',color:'#2563eb',code:'RET'},mercadorias:{title:'Mercadoria / MER',color:'#22c55e',code:'MER'},despesas:{title:'Despesa / DES',color:'#ef4444',code:'DES'}};
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
      ]
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
  "retiradas": []
};
const groupStorage='cicluz-financial-hierarchy-v1';
let financialGroups;try{financialGroups=JSON.parse(localStorage.getItem(groupStorage)||'null')}catch{};
if(!financialGroups||typeof financialGroups!=='object')financialGroups=structuredClone(groupSeed);
for(const k of Object.keys(groupSeed))if(!Array.isArray(financialGroups[k]))financialGroups[k]=structuredClone(groupSeed[k]);
const groupIcons=[icons.groups,icons.launch,icons.records,icons.overview,icons.team,icons.settings];
const groupSvg=i=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+groupIcons[i||0]+'</svg>';
function persistGroups(){try{localStorage.setItem(groupStorage,JSON.stringify(financialGroups));return true}catch{alert('Não foi possível salvar neste navegador.');return false}}
const oldShowTiGroup=showTiGroup;
showTiGroup=function(key,title,icon){if(key==='contas'){const v=document.getElementById('sector-view');v.classList.remove('financial-groups');v.style.removeProperty('--menu-accent');return oldShowTiGroup(key,groupConfig.contas.title,icon)}if(!groupConfig[key])return oldShowTiGroup(key,title,icon);showFinancialGroup(key,icon)};
function showFinancialGroup(key,originIcon){
 const cfg=groupConfig[key],view=document.getElementById('sector-view');
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');view.classList.remove('account-orange');view.classList.add('financial-groups');
 view.style.setProperty('--menu-accent',cfg.color);view.querySelector('.panel').style.setProperty('--panel-color',cfg.color);view.querySelector('.panel').style.setProperty('--panel-text',key==='vendas'?'#785600':key==='mercadorias'?'#12672e':key==='retiradas'?'#174ca1':'#9c1c1c');
 document.getElementById('sector-title').textContent=cfg.title;document.getElementById('sector-path').textContent='Configurações · TI · '+cfg.title;document.getElementById('crumb').textContent='Configurações / TI / '+cfg.title;
 const mark=view.querySelector('.sector-icon');mark.innerHTML=originIcon||groupSvg(0);
 const box=document.getElementById('sector-content');
 const back=()=>showFinancialGroup(key,originIcon);
 const ti=()=>{view.classList.remove('financial-groups');view.style.removeProperty('--menu-accent');openSection(sections[6][0],'TI','settings','#7c3aed')};
 setSectorBack(ti);
 let query='',manual=false;
 function button(label,fn,cls='btn secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;return b}
 function ordered(rows){return [...rows].sort((a,b)=>Number(b.active)-Number(a.active)||(manual?0:a.name.localeCompare(b.name,'pt-BR',{numeric:true,sensitivity:'base'})))}
 function list(){box.replaceChildren();setSectorBack(ti);document.getElementById('sector-title').textContent=cfg.title;
 const bar=document.createElement('div');bar.className='fg-toolbar';const search=document.createElement('input');search.type='search';search.placeholder='Buscar grupo ou subgrupo';search.setAttribute('aria-label',search.placeholder);search.value=query;bar.append(search,button('+ Novo grupo',()=>edit(null), 'btn'),button('Expandir tudo',()=>box.querySelectorAll('.fg-group').forEach(d=>d.open=true)),button('Recolher tudo',()=>box.querySelectorAll('.fg-group').forEach(d=>d.open=false)));
 const sort=document.createElement('select');sort.setAttribute('aria-label','Ordenação');sort.add(new Option('Ativos primeiro · Nome A–Z','name'));sort.add(new Option('Ativos primeiro · Ordem manual','manual'));sort.value=manual?'manual':'name';sort.onchange=()=>{manual=sort.value==='manual';render()};bar.append(sort);box.append(bar);
 const note=document.createElement('small');note.textContent='Grupos e subgrupos · alterações salvas neste navegador';box.append(note);const grid=document.createElement('div');grid.className='fg-list';box.append(grid);
 function render(){grid.replaceChildren();const q=query.toLocaleLowerCase('pt-BR');const records=ordered(financialGroups[key]).filter(g=>g.name.toLocaleLowerCase('pt-BR').includes(q)||g.children.some(s=>s.name.toLocaleLowerCase('pt-BR').includes(q)));
 if(!records.length){const empty=document.createElement('p');empty.textContent=query?'Nenhum resultado encontrado.':'Nenhum grupo cadastrado. Adicione um grupo para começar.';grid.append(empty)}
 for(const g of records){const d=document.createElement('details');d.className='fg-group';d.open=!!query;const summary=document.createElement('summary');summary.append(row(g,null));d.append(summary);const children=document.createElement('div');children.className='fg-children';for(const sub of ordered(g.children).filter(s=>!q||g.name.toLocaleLowerCase('pt-BR').includes(q)||s.name.toLocaleLowerCase('pt-BR').includes(q)))children.append(row(sub,g));children.append(button('+ Novo subgrupo',()=>edit(null,g)));d.append(children);grid.append(d)}}
 function row(item,parent){const r=document.createElement('div');r.className='fg-row'+(!item.active?' fg-inactive':'');r.dataset.id=item.id;const handle=button('⠿',()=>{} ,'fg-handle');handle.title='Arrastar para organizar';handle.setAttribute('aria-label','Mover '+item.name);handle.style.touchAction='none';handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId)};handle.onpointerup=e=>{e.stopPropagation();handle.releasePointerCapture(e.pointerId);const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.fg-row');const pool=parent?parent.children:financialGroups[key];const from=pool.indexOf(item),to=pool.findIndex(x=>x.id===target?.dataset.id);if(to<0||from===to||pool[to].active!==item.active)return;const next=[...pool];next.splice(from,1);next.splice(to,0,item);if(parent)parent.children=next;else financialGroups[key]=next;manual=true;sort.value='manual';persistGroups();render()};
 const badge=document.createElement('span');badge.className='fg-badge';badge.innerHTML=groupSvg(item.icon);const name=document.createElement('span');name.className='fg-name';name.textContent=item.name;const state=document.createElement('small');state.textContent=[item.document,item.purpose,item.active?'Ativo':'Inativo'].filter(Boolean).join(' · ');
 const actions=document.createElement('div');actions.className='account-row-actions';actions.hidden=true;
 const pencil=button('',e=>edit(item,parent));pencil.innerHTML='<svg viewBox="0 0 24 24"><path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/></svg>';pencil.title='Editar';pencil.setAttribute('aria-label','Editar '+item.name);
 const del=button('',()=>{if(!confirm('Excluir '+item.name+(parent?'?':' e seus '+item.children.length+' subgrupos?')))return;const old=parent?parent.children:financialGroups[key];const next=old.filter(x=>x.id!==item.id);if(parent)parent.children=next;else financialGroups[key]=next;if(!persistGroups()){if(parent)parent.children=old;else financialGroups[key]=old}render()});del.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>';del.title='Excluir';del.setAttribute('aria-label','Excluir '+item.name);actions.append(del,pencil);
 const arrow=button('›',()=>{const opening=actions.hidden;grid.querySelectorAll('.account-row-actions').forEach(a=>a.hidden=true);actions.hidden=!opening;arrow.setAttribute('aria-expanded',String(opening))},'account-action-toggle');arrow.setAttribute('aria-label','Ações de '+item.name);arrow.setAttribute('aria-expanded','false');actions.onclick=e=>e.stopPropagation();[handle,arrow].forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()}));r.append(handle,badge,name,state,arrow,actions);return r}
 search.oninput=()=>{query=search.value;render()};render();}
 function edit(item,parent){box.replaceChildren();setSectorBack(list);document.getElementById('sector-title').textContent=(item?'Editar ':'Cadastrar ')+(parent?'subgrupo':'grupo')+' / '+cfg.code;
 const form=document.createElement('form');form.className='form-fields account-editor';const identity=document.createElement('div');identity.className='job-identity fg-identity';const label=document.createElement('label');label.textContent='Nome do '+(parent?'subgrupo':'grupo')+' *';const input=document.createElement('input');input.required=true;input.maxLength=120;input.value=item?.name||'';label.append(input);identity.append(label);
 let chosen=item?.icon||0,active=item?.active!==false;const picker=document.createElement('div');const title=document.createElement('label');title.textContent='Ícone';picker.append(title);const choices=document.createElement('div');choices.className='account-icon-options';picker.append(choices);identity.append(picker);form.append(identity);
 const preview=document.createElement('div');preview.className='icon-live-preview';const badge=document.createElement('span');badge.className='fg-badge';const text=document.createElement('b');preview.append(badge,text);form.append(preview);function refresh(){badge.innerHTML=groupSvg(chosen);text.textContent=input.value||'Nome do '+(parent?'subgrupo':'grupo');[...choices.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chosen)))};
 groupIcons.forEach((_,i)=>{const b=button('',()=>{chosen=i;refresh()},'fg-icon-choice');b.innerHTML=groupSvg(i);b.setAttribute('aria-label','Ícone '+(i+1));choices.append(b)});input.oninput=()=>{input.setCustomValidity('');refresh()};refresh();
 const documentLabel=document.createElement('label');documentLabel.textContent='Documento';const documentSelect=document.createElement('select');documentSelect.setAttribute('aria-label','Documento');for(const value of ['','DOC/F','DOC/NF','DOC/F/NF'])documentSelect.add(new Option(value||'Selecione',value));documentSelect.value=item?.document||'';documentLabel.append(documentSelect);form.append(documentLabel);
 let purposeSelect;if(key==='mercadorias'){const purposeLabel=document.createElement('label');purposeLabel.textContent='Finalidade da mercadoria';purposeSelect=document.createElement('select');purposeSelect.setAttribute('aria-label','Finalidade da mercadoria');for(const value of ['','VENDA','TRANSFORMAÇÃO'])purposeSelect.add(new Option(value||'Selecione',value));purposeSelect.value=item?.purpose||'';purposeLabel.append(purposeSelect);form.append(purposeLabel)}
 if(parent){const info=document.createElement('p');info.textContent='Grupo: '+parent.name;form.append(info)}
 const status=document.createElement('div');status.className='account-status-row';const toggle=button('',()=>{active=!active;sync()},'account-status-switch');toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Ativar ou inativar');toggle.append(document.createElement('span'));const state=document.createElement('span');function sync(){toggle.setAttribute('aria-checked',String(active));state.textContent=active?'Ativo':'Inativo'}sync();status.append(toggle,state);form.append(status);
 const actions=document.createElement('div');actions.className='actions';const save=button('Salvar',()=>{},'btn');save.type='submit';actions.append(button('Cancelar',list),save);form.append(actions);form.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(!name)return;const pool=parent?parent.children:financialGroups[key];if(pool.some(x=>x!==item&&x.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){input.setCustomValidity('Este nome já existe neste grupo.');input.reportValidity();return}const snapshot=structuredClone(financialGroups);if(item)Object.assign(item,{name,active,icon:chosen,document:documentSelect.value,...(purposeSelect?{purpose:purposeSelect.value}:{})});else pool.push({id:crypto.randomUUID(),name,active,icon:chosen,document:documentSelect.value,...(purposeSelect?{purpose:purposeSelect.value}:{}),...(!parent?{children:[]}:{})});if(!persistGroups()){financialGroups=snapshot;return}document.getElementById('sector-title').textContent=cfg.title;list()};box.append(form);input.focus();}
 list();
}
// Remover variáveis da tela anterior ao navegar para outro módulo.
const baseOpenSection=openSection;openSection=function(...args){const v=document.getElementById('sector-view');v.classList.remove('financial-groups');v.style.removeProperty('--menu-accent');return baseOpenSection(...args)};
