import type { ConsultaVendasPdv, PerfilSessao } from "@cicluz/shared";
import { env } from "../env.ts";
import { exigirPermissao } from "../auth/permissoes.ts";
import { proibido } from "../erros.ts";
import { buscarOpcoes, buscarTotais, buscarVendas, leituraConfigurada } from "./vendas-pdv.cliente.ts";

const SEM_ACESSO = "Você não tem acesso às vendas dos PDVs.";

// Permissão E empresa: o token do S1 é de uma loja só; outra empresa do S2 nunca vê essas vendas.
function exigirAcesso(perfil: PerfilSessao) {
  exigirPermissao(perfil, "vendas_pdv_visualizar", SEM_ACESSO);
  if (perfil.empresa.id !== env.S1_VENDAS_EMPRESA_ID) throw proibido(SEM_ACESSO, "INSUFFICIENT_PERMISSION");
}

export async function listarVendas(perfil: PerfilSessao, consulta: ConsultaVendasPdv) {
  exigirAcesso(perfil);
  return buscarVendas(consulta);
}

export async function totaisVendas(perfil: PerfilSessao, consulta: ConsultaVendasPdv) {
  exigirAcesso(perfil);
  return buscarTotais(consulta);
}

export async function opcoesVendas(perfil: PerfilSessao) {
  exigirAcesso(perfil);
  return buscarOpcoes();
}

/** Para a tela decidir entre mostrar o relatório ou o aviso de configuração, sem bater no S1. */
export function situacaoVendas(perfil: PerfilSessao) {
  exigirAcesso(perfil);
  return { configurada: leituraConfigurada() };
}
