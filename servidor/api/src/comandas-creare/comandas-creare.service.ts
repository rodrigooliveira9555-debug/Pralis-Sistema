import type { PerfilSessao } from "@cicluz/shared";
import { env } from "../env.ts";
import { proibido } from "../erros.ts";
import { leituraConfigurada } from "../vendas-pdv/vendas-pdv.cliente.ts";
import {
  buscarComandas,
  buscarDetalhe,
  buscarIndicadores,
  buscarOpcoes,
  type ConsultaComandas
} from "./comandas-creare.cliente.ts";

const SO_ADMINISTRADOR = "O painel de comandas é só do administrador.";

// Só administrador (Marco, 25/11/2026) E a empresa da loja: o token do S1 é de uma loja só.
function exigirAcesso(perfil: PerfilSessao) {
  if (perfil.papel !== "administrador") throw proibido(SO_ADMINISTRADOR, "INSUFFICIENT_PERMISSION");
  if (env.S1_VENDAS_EMPRESA_ID && perfil.empresa.id !== env.S1_VENDAS_EMPRESA_ID) {
    throw proibido(SO_ADMINISTRADOR, "INSUFFICIENT_PERMISSION");
  }
}

export function situacaoComandas(perfil: PerfilSessao) {
  exigirAcesso(perfil);
  return { configurada: leituraConfigurada() };
}

export async function listarComandas(perfil: PerfilSessao, consulta: ConsultaComandas) {
  exigirAcesso(perfil);
  return buscarComandas(consulta);
}

export async function indicadoresComandas(perfil: PerfilSessao, dia?: string) {
  exigirAcesso(perfil);
  return buscarIndicadores(dia);
}

export async function detalheComanda(perfil: PerfilSessao, idComanda: number) {
  exigirAcesso(perfil);
  return buscarDetalhe(idComanda);
}

export async function opcoesComandas(perfil: PerfilSessao) {
  exigirAcesso(perfil);
  return buscarOpcoes();
}
