import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { acessosPorTela, colaboradoresAcesso, perfisUsuarios } from "@cicluz/db/schema";
import { CHAVE_ESTRUTURA_AREAS, type ConfigTela, type SincronizarAcessos } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

export type AcessosDaEmpresa = { configs: Record<string, ConfigTela>; areaPais: Record<string, string | null> };

// Todas as configurações da empresa e quem é pai de quem nas áreas (a linha especial da estrutura).
export async function lerAcessosDaEmpresa(empresaId: string): Promise<AcessosDaEmpresa> {
  const linhas = await banco.select({ chave: acessosPorTela.chave, config: acessosPorTela.config }).from(acessosPorTela).where(eq(acessosPorTela.empresaId, empresaId));
  const configs: Record<string, ConfigTela> = {};
  let areaPais: Record<string, string | null> = {};
  for (const linha of linhas) {
    if (linha.chave === CHAVE_ESTRUTURA_AREAS) areaPais = linha.config as Record<string, string | null>;
    else configs[linha.chave] = linha.config as ConfigTela;
  }
  return { configs, areaPais };
}

export async function listarColaboradoresDaEmpresa(empresaId: string) {
  return banco.select().from(colaboradoresAcesso).where(eq(colaboradoresAcesso.empresaId, empresaId));
}

export async function colaboradorDaEmpresa(empresaId: string, colaboradorId: string) {
  const [linha] = await banco
    .select()
    .from(colaboradoresAcesso)
    .where(and(eq(colaboradoresAcesso.empresaId, empresaId), eq(colaboradoresAcesso.id, colaboradorId)))
    .limit(1);
  return linha ?? null;
}

// Ids que já pertencem a OUTRA empresa: o id do colaborador é global na tabela, então nunca se sobrescreve o de outra empresa.
export async function idsDeOutraEmpresa(empresaId: string, ids: string[]) {
  if (!ids.length) return [];
  const linhas = await banco.select({ id: colaboradoresAcesso.id, empresaId: colaboradoresAcesso.empresaId }).from(colaboradoresAcesso).where(inArray(colaboradoresAcesso.id, ids));
  return linhas.filter((linha) => linha.empresaId !== empresaId).map((linha) => linha.id);
}

// O aparelho manda tudo de uma vez: colaboradores (só entram e atualizam; nenhum é apagado aqui), estrutura das áreas e configurações.
// As configurações que o aparelho não mandou mais são removidas (o aparelho é quem sabe o conjunto atual).
export async function gravarSincronizacao(tx: TransacaoBanco, empresaId: string, dados: SincronizarAcessos, atorId: string) {
  for (const c of dados.colaboradores) {
    await tx
      .insert(colaboradoresAcesso)
      .values({ id: c.id, empresaId, nome: c.nome, cargoId: c.cargoId, areaIds: c.areaIds, ativo: c.ativo })
      .onConflictDoUpdate({
        target: colaboradoresAcesso.id,
        set: { nome: c.nome, cargoId: c.cargoId, areaIds: c.areaIds, ativo: c.ativo, atualizadoEm: sql`now()` },
        setWhere: eq(colaboradoresAcesso.empresaId, empresaId)
      });
  }
  const chaves = Object.keys(dados.configs);
  const linhas = [
    ...chaves.map((chave) => ({ empresaId, chave, config: dados.configs[chave] as ConfigTela, atualizadoPor: atorId })),
    { empresaId, chave: CHAVE_ESTRUTURA_AREAS, config: dados.areaPais, atualizadoPor: atorId }
  ];
  for (const linha of linhas) {
    await tx
      .insert(acessosPorTela)
      .values(linha)
      .onConflictDoUpdate({
        target: [acessosPorTela.empresaId, acessosPorTela.chave],
        set: { config: linha.config, atualizadoEm: sql`now()`, atualizadoPor: atorId }
      });
  }
  await tx
    .delete(acessosPorTela)
    .where(and(eq(acessosPorTela.empresaId, empresaId), notInArray(acessosPorTela.chave, [...chaves, CHAVE_ESTRUTURA_AREAS])));
}

// O colaborador da conta (para a regra "sem permissão não usa"). Nulo quando a conta não tem colaborador ligado.
export async function colaboradorDoUsuario(usuarioId: string) {
  const [linha] = await banco
    .select({ id: colaboradoresAcesso.id, cargoId: colaboradoresAcesso.cargoId, areaIds: colaboradoresAcesso.areaIds, empresaId: colaboradoresAcesso.empresaId })
    .from(perfisUsuarios)
    .innerJoin(colaboradoresAcesso, eq(colaboradoresAcesso.id, perfisUsuarios.colaboradorId))
    .where(eq(perfisUsuarios.usuarioId, usuarioId))
    .limit(1);
  return linha ?? null;
}
