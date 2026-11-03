import { randomUUID } from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { schema } from "@cicluz/db/schema";
import { banco } from "../banco/conexao.ts";
import { env, origensWebPermitidas } from "../env.ts";
import { buscarPerfilUsuario } from "./perfil.service.ts";

const producao = env.NODE_ENV === "production";

export const CABECALHO_IP_CLIENTE = "x-cicluz-ip-cliente";

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
    database: { generateId: () => randomUUID() },
    // O IP vem do Fastify (que respeita PROXIES_CONFIAVEIS), repassado em cabeçalho próprio pelo
    // auth.controller.ts. Ler X-Forwarded-For direto deixaria o cliente escolher o próprio IP.
    ipAddress: { ipAddressHeaders: [CABECALHO_IP_CLIENTE] },
    // Fixos aqui, e não confiados ao padrão da biblioteca.
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: producao, path: "/" }
  },
  // Usuário ou empresa desativados não abrem sessão nova.
  databaseHooks: {
    session: {
      create: {
        before: async (sessao) => (await buscarPerfilUsuario(sessao.userId)) !== null
      }
    }
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
