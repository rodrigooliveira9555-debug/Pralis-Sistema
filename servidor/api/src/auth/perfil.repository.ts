import { eq } from "drizzle-orm";
import { empresas, perfisUsuarios, usuarioAutenticacao } from "@cicluz/db/schema";
import { banco } from "../banco/conexao.ts";

export async function obterPerfilPorUsuarioId(usuarioId: string) {
  const [linha] = await banco
    .select({
      usuarioId: perfisUsuarios.usuarioId,
      nome: perfisUsuarios.nome,
      papel: perfisUsuarios.papel,
      ativo: perfisUsuarios.ativo,
      email: usuarioAutenticacao.email,
      empresaId: empresas.id,
      empresaNome: empresas.nome,
      empresaAtiva: empresas.ativo,
      dadosImportadosEm: empresas.dadosImportadosEm
    })
    .from(perfisUsuarios)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, perfisUsuarios.usuarioId))
    .innerJoin(empresas, eq(empresas.id, perfisUsuarios.empresaId))
    .where(eq(perfisUsuarios.usuarioId, usuarioId))
    .limit(1);
  return linha ?? null;
}
