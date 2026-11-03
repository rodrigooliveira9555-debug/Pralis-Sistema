import { randomUUID } from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { schema } from "@cicluz/db/schema";
import { banco } from "../banco/conexao.ts";
import { env, origensWebPermitidas } from "../env.ts";

const producao = env.NODE_ENV === "production";

// Mesma política do Sistema Pralis: 10 caracteres em produção, 8 fora dela.
export const senhaMinimaAutenticacao = producao ? 10 : 8;

export const auth = betterAuth({
  database: drizzleAdapter(banco, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.usuarioAutenticacao,
      session: schema.sessaoAutenticacao,
      account: schema.contaAutenticacao,
      verification: schema.verificacaoAutenticacao
    }
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.AUTH_BASE_URL,
  trustedOrigins: origensWebPermitidas,
  advanced: {
    database: { generateId: () => randomUUID() }
  },
  // Sistema fechado: conta só nasce pelo script de administrador (api/src/scripts/criar-usuario.ts).
  // Sem auto-cadastro pela internet e sem redefinição por e-mail enquanto não houver envio de e-mail.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: senhaMinimaAutenticacao
  },
  session: {
    // Turno de padaria: a sessão dura 12 horas e se renova enquanto a pessoa usa o sistema.
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60
  }
});
