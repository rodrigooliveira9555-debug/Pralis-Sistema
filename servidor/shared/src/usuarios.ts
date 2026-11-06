import { z } from "zod";
import { postoSchema, type Posto } from "./acessos.ts";
import { PAPEIS, type Papel } from "./sessao.ts";

// Configurações → Usuários: contas da própria empresa. Quem tem `usuarios_gerenciar` cria e edita;
// criar ou mexer em administrador e definir senha de outra pessoa continuam só com o administrador.
export const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  papel: z.enum(PAPEIS),
  // Senha inicial definida por quem cria; a pessoa troca depois em "Minha senha".
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128),
  // Cargos de acesso já na criação (sem cargo, vale o acesso de antes: ver acessos.ts).
  cargos: z.array(z.string().uuid()).max(20).default([]),
  // Conta de posto do caixa (PDV × turno). Nulo: conta de uma pessoa.
  posto: postoSchema.nullable().default(null)
});

export const editarUsuarioSchema = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    papel: z.enum(PAPEIS).optional(),
    ativo: z.boolean().optional(),
    posto: postoSchema.nullable().optional(),
    cargos: z.array(z.string().uuid()).max(20).optional()
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
  posto: Posto | null;
  cargos: { id: string; nome: string }[];
};
