import { z } from "zod";
import { PAPEIS, type Papel } from "./sessao.ts";

// Tela "Usuários" (só administrador): contas da própria empresa.
export const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  papel: z.enum(PAPEIS),
  // Senha inicial definida pelo administrador; a pessoa troca depois em "Minha senha".
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128)
});

export const editarUsuarioSchema = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    papel: z.enum(PAPEIS).optional(),
    ativo: z.boolean().optional()
  })
  .refine((dados) => Object.keys(dados).length > 0, "Nada para alterar");

export const definirSenhaSchema = z.object({
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128)
});

export const usuarioIdParamsSchema = z.object({ id: z.string().uuid() });

export type NovoUsuario = z.infer<typeof novoUsuarioSchema>;
export type EditarUsuario = z.infer<typeof editarUsuarioSchema>;

export type UsuarioResposta = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
};
