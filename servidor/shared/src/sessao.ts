import { z } from "zod";
import type { ChavePermissao } from "./acessos.ts";

// Administrador: tudo que o usuário faz, mais a importação inicial dos dados do aparelho.
// Usuário: o que os cargos de acesso dele liberam (acessos.ts). Sem cargo, o acesso de antes.
export const PAPEIS = ["administrador", "usuario"] as const;
export type Papel = (typeof PAPEIS)[number];

export type PerfilSessao = {
  usuarioId: string;
  nome: string;
  email: string;
  papel: Papel;
  // Permissões efetivas (cargos de acesso + exceções da pessoa), resolvidas a cada requisição.
  permissoes: ChavePermissao[];
  // Um usuário pertence a uma empresa nesta versão (sem troca de empresa na tela).
  empresa: { id: string; nome: string; dadosImportados: boolean };
};

export const criarUsuarioSchema = z.object({
  empresaNome: z.string().trim().min(2).max(120),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(8).max(128),
  papel: z.enum(PAPEIS)
});

export type CriarUsuario = z.infer<typeof criarUsuarioSchema>;
