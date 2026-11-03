import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { CHAVES_SINCRONIZADAS, ok, problema } from "@cicluz/shared";
import { env } from "../env.ts";
import { auth } from "./config.ts";
import { exigirAutenticacao } from "./guards.ts";

export async function registrarRotasAuth(app: FastifyInstance) {
  // A tela de entrada e o cicluz-sessao.js perguntam aqui "quem sou eu". 401 = ir para o login.
  app.get("/api/sessao", async (request) => {
    const perfil = await exigirAutenticacao(request);
    // A lista de chaves vai junto: o navegador não tem cópia própria dela.
    return ok({ perfil, chavesSincronizadas: CHAVES_SINCRONIZADAS });
  });

  // Rotas do better-auth (entrar, sair, sessão). Teto de 20 por minuto contra tentativa de senha.
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    async handler(request, reply) {
      try {
        const url = new URL(request.url, env.AUTH_BASE_URL);
        const req = new Request(url.toString(), {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          ...(request.body ? { body: JSON.stringify(request.body) } : {})
        });
        const response = await auth.handler(req);
        reply.status(response.status);
        for (const [chave, valor] of response.headers.entries()) {
          // set-cookie pode vir mais de uma vez; o Headers junta, então repassa cada um.
          if (chave.toLowerCase() === "set-cookie") continue;
          reply.header(chave, valor);
        }
        const cookies = response.headers.getSetCookie();
        if (cookies.length) reply.header("set-cookie", cookies);
        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        request.log.error(error, "rota de autenticação falhou");
        return reply.status(500).send(problema(500, "Erro interno de autenticação", "AUTH_FAILURE"));
      }
    }
  });
}
