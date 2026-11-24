import type { ConsultaVendasPdv, PerfilSessao } from "@cicluz/shared";
import { exigirPermissao } from "../auth/permissoes.ts";
import { buscarOpcoes, buscarTotais, buscarVendas, leituraConfigurada } from "./vendas-pdv.cliente.ts";

const SEM_ACESSO = "Você não tem acesso às vendas dos PDVs.";

export async function listarVendas(perfil: PerfilSessao, consulta: ConsultaVendasPdv) {
  exigirPermissao(perfil, "vendas_pdv_visualizar", SEM_ACESSO);
  return buscarVendas(consulta);
}

export async function totaisVendas(perfil: PerfilSessao, consulta: ConsultaVendasPdv) {
  exigirPermissao(perfil, "vendas_pdv_visualizar", SEM_ACESSO);
  return buscarTotais(consulta);
}

export async function opcoesVendas(perfil: PerfilSessao) {
  exigirPermissao(perfil, "vendas_pdv_visualizar", SEM_ACESSO);
  return buscarOpcoes();
}

/** Para a tela decidir entre mostrar o relatório ou o aviso de configuração, sem bater no S1. */
export function situacaoVendas(perfil: PerfilSessao) {
  exigirPermissao(perfil, "vendas_pdv_visualizar", SEM_ACESSO);
  return { configurada: leituraConfigurada() };
}
