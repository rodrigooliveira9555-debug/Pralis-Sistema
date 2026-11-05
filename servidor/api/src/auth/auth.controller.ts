import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { CHAVES_ADOTADAS_DO_APARELHO, CHAVES_SINCRONIZADAS, ok, problema } from "@cicluz/shared";
import { env } from "../env.ts";
import { auth, CABECALHO_IP_CLIENTE } from "./config.ts";
import { exigirAutenticacao } from "./guards.ts";

const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;
const MAXIMO_TENTATIVAS = 10;
const tentativas = new Map<string, { quantidade: number; inicio: number }>();

// Conta tentativas de senha por conta, na memória do processo (um servidor só nesta fase): por
// e-mail na entrada e por sessão na troca de senha (uma sessão roubada não testa a senha atual sem fim).
function tentativasEsgotadas(chave: string | null): boolean {
  if (!chave) return false;
  const agora = Date.now();
  const registro = tentativas.get(chave);
  if (!registro || agora - registro.inicio > JANELA_TENTATIVAS_MS) {
    tentativas.set(chave, { quantidade: 1, inicio: agora });
    if (tentativas.size > 10_000) tentativas.clear();
    return false;
  }
  registro.quantidade += 1;
  return registro.quantidade > MAXIMO_TENTATIVAS;
}

function chaveDeTentativa(url: string, corpo: unknown, cookie: string | undefined): string | null {
  if (url.startsWith("/api/auth/sign-in/")) {
    const email = (corpo as { email?: unknown } | null)?.email;
    return typeof email === "string" ? `email:${email.trim().toLowerCase()}` : null;
  }
  if (url.startsWith("/api/auth/change-password")) {
    const sessao = /session_token=([^;]+)/.exec(cookie ?? "")?.[1];
    return sessao ? `sessao:${sessao}` : null;
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
      if (tentativasEsgotadas(chaveDeTentativa(request.url, request.body, request.headers.cookie))) {
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
