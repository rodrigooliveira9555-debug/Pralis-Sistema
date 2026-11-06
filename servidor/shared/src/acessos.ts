import { z } from "zod";
import type { Papel } from "./sessao.ts";

// Permissões do S2. Modelo do Sistema Pralis (doc 23 do principal), simplificado: o cargo de
// acesso libera; a exceção por pessoa libera ou bloqueia; o resto é negado. "Cargo de acesso" não
// é o cargo do DP (CBO, salário): uma pessoa pode ser Balconista no DP e ter o cargo de acesso Caixa.
//
// `aplicada`: a API já recusa a ação sem a permissão. As outras ficam gravadas e aparecem na tela,
// mas a tela correspondente ainda não as consulta (o módulo ainda grava no aparelho).
export const AREAS_PERMISSAO = [
  ["lancamentos", "Lançamentos financeiros"],
  ["caixa", "Caixa"],
  ["transferencias", "Transferências e lacres"],
  ["compras", "Compras e estoque"],
  ["producao", "Produção"],
  ["pessoas", "Pessoas e DP"],
  ["relatorios", "Relatórios"],
  ["configuracoes", "Configurações"]
] as const;
export type AreaPermissao = (typeof AREAS_PERMISSAO)[number][0];

type DefinicaoPermissao = { chave: string; area: AreaPermissao; rotulo: string; aplicada: boolean };

const p = (area: AreaPermissao, chave: string, rotulo: string, aplicada = false): DefinicaoPermissao => ({
  chave,
  area,
  rotulo,
  aplicada
});

export const PERMISSOES = [
  p("lancamentos", "lancamentos_visualizar", "Ver os lançamentos", true),
  p("lancamentos", "lancamentos_criar", "Lançar", true),
  p("lancamentos", "lancamentos_editar", "Editar lançamento não pago", true),
  p("lancamentos", "lancamentos_discriminar", "Discriminar (classificar depois)", true),
  p("lancamentos", "lancamentos_pagar", "Registrar pagamento", true),
  p("lancamentos", "lancamentos_editar_pago", "Editar lançamento já pago", true),
  p("lancamentos", "lancamentos_recorrencia", "Criar recorrência", true),
  p("lancamentos", "lancamentos_cancelar_serie", "Cancelar série recorrente", true),
  p("lancamentos", "lancamentos_pagamento_retroativo", "Pagamento com data passada", true),
  p("caixa", "caixa_operar", "Abrir, operar e fechar o próprio caixa"),
  p("caixa", "caixa_sangria", "Fazer sangria"),
  p("caixa", "caixa_monitorar", "Ver os caixas abertos e mandar mensagem"),
  p("caixa", "caixa_conferir_fechamento", "Conferir fechamento (fechou certo / teve quebra)"),
  p("transferencias", "transferencias_visualizar", "Ver as transferências"),
  p("transferencias", "transferencias_lancar", "Lançar transferência"),
  p("transferencias", "transferencias_confirmar", "Confirmar recebimento de lacre"),
  p("transferencias", "lacres_gerenciar", "Cadastrar e baixar lacres"),
  p("compras", "compras_visualizar", "Ver compras e estoque"),
  p("compras", "compras_solicitar", "Solicitar compra"),
  p("compras", "compras_cotar", "Fazer cotação"),
  p("compras", "compras_aprovar", "Aprovar pedido de compra"),
  p("compras", "compras_receber", "Receber e conferir mercadoria"),
  p("producao", "producao_visualizar", "Ver a produção"),
  p("producao", "producao_lancar", "Lançar pedido e ordem de produção"),
  p("pessoas", "pessoas_visualizar", "Ver colaboradores"),
  p("pessoas", "pessoas_editar", "Cadastrar e editar colaboradores"),
  p("pessoas", "cargos_salarios_editar", "Editar cargos e salários do DP"),
  p("relatorios", "relatorios_visualizar", "Ver relatórios"),
  p("configuracoes", "usuarios_visualizar", "Ver as pessoas com acesso", true),
  p("configuracoes", "usuarios_gerenciar", "Criar, editar e desativar usuários", true),
  p("configuracoes", "permissoes_gerenciar", "Montar cargos de acesso e acessos por pessoa", true)
] as const satisfies readonly DefinicaoPermissao[];

export type ChavePermissao = (typeof PERMISSOES)[number]["chave"];
export const CHAVES_PERMISSAO = PERMISSOES.map((item) => item.chave) as ChavePermissao[];
const conjuntoChaves = new Set<string>(CHAVES_PERMISSAO);
export const ehChavePermissao = (valor: string): valor is ChavePermissao => conjuntoChaves.has(valor);

// O que o papel "usuario" fazia antes dos cargos de acesso (P-12, doc 13): tudo, menos o que era
// exclusivo do administrador. Vale só para as contas de antes desta tela que ainda não foram
// configuradas (perfis_usuarios.acessos_configurados_em nulo), para não perderem acesso no dia em que
// ela entrar. Conta nova e conta já configurada nunca caem aqui: sem cargo, ficam sem acesso.
const SO_ADMINISTRADOR_ANTES: readonly ChavePermissao[] = [
  "lancamentos_pagar",
  "lancamentos_editar_pago",
  "lancamentos_recorrencia",
  "lancamentos_cancelar_serie",
  "lancamentos_pagamento_retroativo",
  "usuarios_visualizar",
  "usuarios_gerenciar",
  "permissoes_gerenciar"
];
export const PERMISSOES_SEM_CARGO = CHAVES_PERMISSAO.filter((chave) => !SO_ADMINISTRADOR_ANTES.includes(chave));

export type OrigemPermissao = { tipo: "administrador" } | { tipo: "sem_cargo" } | { tipo: "cargo"; cargos: string[] } | { tipo: "excecao" };

export type EntradaPermissoes = {
  papel: Papel;
  // Conta de antes dos cargos de acesso, ainda não configurada (ver PERMISSOES_SEM_CARGO).
  legado: boolean;
  // Só os cargos ATIVOS da pessoa.
  cargos: { nome: string; permissoes: readonly string[] }[];
  excecoes: Record<string, boolean>;
};

// Ordem: administrador tem tudo → conta de antes ainda não configurada, o acesso de antes → senão, a
// soma dos cargos ativos, e a exceção da pessoa vence o cargo (libera ou bloqueia). Chave fora do
// catálogo é ignorada: permissão removida do sistema não volta a valer por um registro antigo.
export function resolverPermissoes(entrada: EntradaPermissoes): Map<ChavePermissao, OrigemPermissao> {
  const efetivas = new Map<ChavePermissao, OrigemPermissao>();
  if (entrada.papel === "administrador") {
    for (const chave of CHAVES_PERMISSAO) efetivas.set(chave, { tipo: "administrador" });
    return efetivas;
  }
  if (entrada.legado) {
    for (const chave of PERMISSOES_SEM_CARGO) efetivas.set(chave, { tipo: "sem_cargo" });
    return efetivas;
  }
  const excecoes = Object.entries(entrada.excecoes).filter(([chave]) => ehChavePermissao(chave));
  for (const cargo of entrada.cargos) {
    for (const chave of cargo.permissoes) {
      if (!ehChavePermissao(chave)) continue;
      const atual = efetivas.get(chave);
      if (atual?.tipo === "cargo") atual.cargos.push(cargo.nome);
      else efetivas.set(chave, { tipo: "cargo", cargos: [cargo.nome] });
    }
  }
  for (const [chave, permitido] of excecoes) {
    if (permitido) efetivas.set(chave as ChavePermissao, { tipo: "excecao" });
    else efetivas.delete(chave as ChavePermissao);
  }
  return efetivas;
}

export const listaPermissoes = (entrada: EntradaPermissoes): ChavePermissao[] => [...resolverPermissoes(entrada).keys()];

// Sugestão para começar (inspirada em db/src/referencia-permissoes.ts do principal). Nasce só quando
// o administrador pede, e depois é editável como qualquer outro cargo.
const tudoDe = (...areas: AreaPermissao[]) => PERMISSOES.filter((item) => areas.includes(item.area)).map((item) => item.chave);
export const CARGOS_SUGERIDOS: { nome: string; descricao: string; permissoes: ChavePermissao[] }[] = [
  {
    nome: "Caixa",
    descricao: "Operador do posto: abre, opera e fecha o próprio caixa",
    permissoes: ["caixa_operar", "caixa_sangria", "lancamentos_visualizar", "lancamentos_criar", "lancamentos_editar"]
  },
  {
    nome: "Tesouraria",
    descricao: "Recebe os lacres, confere fechamentos e transferências",
    permissoes: [...tudoDe("transferencias"), "caixa_conferir_fechamento", "lancamentos_visualizar", "lancamentos_discriminar", "relatorios_visualizar"]
  },
  {
    nome: "Gerência",
    descricao: "Acompanha a loja: caixas abertos, compras e lançamentos",
    permissoes: [
      "caixa_monitorar",
      "transferencias_visualizar",
      "transferencias_lancar",
      "lancamentos_visualizar",
      "lancamentos_criar",
      "lancamentos_editar",
      "lancamentos_discriminar",
      "lancamentos_recorrencia",
      "compras_visualizar",
      "compras_solicitar",
      "compras_aprovar",
      "compras_receber",
      "producao_visualizar",
      "pessoas_visualizar",
      "relatorios_visualizar"
    ]
  },
  {
    nome: "Compras",
    descricao: "Solicita, cota, compra e recebe mercadoria",
    permissoes: [...tudoDe("compras"), "producao_visualizar", "lancamentos_visualizar", "lancamentos_criar"]
  },
  {
    nome: "DP",
    descricao: "Departamento pessoal: colaboradores, cargos e salários",
    permissoes: [...tudoDe("pessoas"), "lancamentos_visualizar", "lancamentos_criar"]
  },
  {
    nome: "Financeiro",
    descricao: "Paga, confere e fecha o financeiro",
    permissoes: [...tudoDe("lancamentos"), "transferencias_visualizar", "caixa_conferir_fechamento", "relatorios_visualizar"]
  },
  {
    nome: "Diretor de Operações",
    descricao: "Produção, compras e acompanhamento das lojas",
    permissoes: [...tudoDe("producao"), "compras_visualizar", "compras_aprovar", "caixa_monitorar", "pessoas_visualizar", "lancamentos_visualizar", "relatorios_visualizar"]
  },
  {
    nome: "Diretor Geral",
    descricao: "Vê e aprova tudo; usuários e permissões continuam com o administrador",
    permissoes: CHAVES_PERMISSAO.filter((chave) => !chave.startsWith("usuarios_") && chave !== "permissoes_gerenciar")
  }
];

// Contas de posto do caixa: uma conta por PDV × turno (doc 73 do principal: 8 postos, PDV1 a PDV4 ×
// Manhã/Tarde). O posto é da conta, não da pessoa: quem opera o PDV1 de manhã entra nesta conta.
export const PDVS_POSTO = [1, 2, 3, 4] as const;
export const TURNOS_POSTO = [
  ["manha", "Manhã"],
  ["tarde", "Tarde"]
] as const;
export type TurnoPosto = (typeof TURNOS_POSTO)[number][0];
export const postoSchema = z.object({
  pdv: z.number().int().min(1).max(PDVS_POSTO.length),
  turno: z.enum(["manha", "tarde"])
});
export type Posto = z.infer<typeof postoSchema>;
export const rotuloPosto = (posto: Posto) =>
  `PDV${posto.pdv} · ${TURNOS_POSTO.find(([valor]) => valor === posto.turno)?.[1] ?? posto.turno}`;

const chavePermissaoSchema = z.string().refine(ehChavePermissao, "Permissão desconhecida");

export const cargoAcessoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cargo").max(60),
  descricao: z.string().trim().max(200).default(""),
  permissoes: z.array(chavePermissaoSchema).max(CHAVES_PERMISSAO.length).default([])
});
export const editarCargoAcessoSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do cargo").max(60).optional(),
    descricao: z.string().trim().max(200).optional(),
    ativo: z.boolean().optional(),
    permissoes: z.array(chavePermissaoSchema).max(CHAVES_PERMISSAO.length).optional()
  })
  .refine((dados) => Object.keys(dados).length > 0, "Nada para alterar");

// Exceções da pessoa (Permissões → Acessos por pessoa). Os cargos dela são escolhidos em Usuários.
export const acessosUsuarioSchema = z.object({
  excecoes: z.record(chavePermissaoSchema, z.boolean())
});
export const cargoIdParamsSchema = z.object({ id: z.string().uuid() });

export type CargoAcessoEntrada = z.infer<typeof cargoAcessoSchema>;
export type EditarCargoAcesso = z.infer<typeof editarCargoAcessoSchema>;
export type AcessosUsuario = z.infer<typeof acessosUsuarioSchema>;

export type CargoAcessoResposta = {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  permissoes: ChavePermissao[];
  pessoas: number;
};

export type AcessosUsuarioResposta = {
  legado: boolean;
  cargos: string[];
  excecoes: Record<string, boolean>;
  efetivas: { chave: ChavePermissao; origem: OrigemPermissao }[];
};
