import { eq } from "drizzle-orm";
import { empresas, perfisUsuarios, usuarioAutenticacao } from "@cicluz/db/schema";
import type { Papel } from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";

export async function emailJaCadastrado(email: string) {
  const [linha] = await banco
    .select({ id: usuarioAutenticacao.id })
    .from(usuarioAutenticacao)
    .where(eq(usuarioAutenticacao.email, email))
    .limit(1);
  return Boolean(linha);
}

export async function obterEmpresaPorNome(nome: string) {
  const [empresa] = await banco.select({ id: empresas.id }).from(empresas).where(eq(empresas.nome, nome)).limit(1);
  return empresa ?? null;
}

export async function criarEmpresa(nome: string) {
  const [empresa] = await banco.insert(empresas).values({ nome }).returning({ id: empresas.id });
  if (!empresa) throw new Error("empresa não criada");
  return empresa;
}

export async function inserirPerfil(dados: { usuarioId: string; empresaId: string; nome: string; papel: Papel }) {
  await banco.insert(perfisUsuarios).values(dados);
}
