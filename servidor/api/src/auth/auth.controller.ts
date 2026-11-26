import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { CHAVES_ADOTADAS_DO_APARELHO, CHAVES_SINCRONIZADAS, ok, problema } from "@cicluz/shared";
import { env } from "../env.ts";
import { auth, CABECALHO_IP_CLIENTE } from "./config.ts";
import { exigirAutenticacao } from "./guards.ts";
import { ContadorTentativas } from "./tentativas.ts";

// Tentativas de senha por conta: por e-mail na entrada e por sessão na troca de senha (uma sessão
// roubada não testa a senha atual sem fim). Ver tentativas.ts: encher o contador não zera bloqueios.
const tentativas = new ContadorTentativas({ janelaMs: 15 * 60 * 1000, maximo: 10, capacidade: 10_000 });

async function chaveDeTentativa(request: FastifyRequest): Promise<string | null> {
  if (request.url.startsWith("/api/auth/sign-in/")) {
    const email = (request.body as { email?: unknown } | null)?.email;
    return typeof email === "string" ? `email:${email.trim().toLowerCase()}` : null;
  }
  if (request.url.startsWith("/api/auth/change-password")) {
    // A sessão conferida pelo better-auth, e não o texto do cookie (que dava para variar à vontade).
    // Sem sessão válida a troca já é recusada pela biblioteca; não há o que contar.
    const sessao = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    return sessao ? `sessao:${sessao.session.id}` : null;
  }
  return null;
}

export async function registrarRotasAuth(app: FastifyInstance) {
  // A tela de entrada e o cicluz-sessao.js perguntam aqui "quem sou eu". 401 = ir para o login.
  app.get("/api/sessao", async (request) => {
    const perfil = await exigirAutenticacao(request);
    // A lista de chaves vai junto: o navegador não tem cópia própria dela.
    return ok({ perfil, chavesSincronizadas: CHAVES_SINCRONIZADAS, chavesAdotadas: CHAVES_ADOTADAS_DO_APARELHO });
  });

  // Rotas do better-auth (entrar, sair, sessão). Teto de 20 por minuto por IP e de 10 tentativas de
  // entrada por e-mail a cada 15 minutos (trocar de IP não libera mais tentativas na mesma conta).
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    async handler(request, reply) {
      if (tentativas.esgotou(await chaveDeTentativa(request))) {
        return reply.status(429).send(problema(429, "Muitas tentativas nesta conta; aguarde 15 minutos", "RATE_LIMITED"));
      }
      try {
        const url = new URL(request.url, env.AUTH_BASE_URL);
        const cabecalhos = fromNodeHeaders(request.headers);
        // Sobrescreve qualquer valor mandado pelo cliente: o IP é o que o Fastify apurou.
        cabecalhos.set(CABECALHO_IP_CLIENTE, request.ip);
        const req = new Request(url.toString(), {
          method: request.method,
          headers: cabecalhos,
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
