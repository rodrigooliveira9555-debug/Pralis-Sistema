import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { problema } from "@cicluz/shared";
import { exigirAutenticacao } from "./auth/guards.ts";
import { registrarRotasAuth } from "./auth/auth.controller.ts";
import { registrarRotasDocumentos } from "./documentos/documentos.controller.ts";
import { env, origensWebPermitidas } from "./env.ts";
import { ErroDominio, proibido } from "./erros.ts";
import { registrarRotasSaude } from "./saude/saude.controller.ts";

// Rotas que cuidam da própria autenticação. Todo o resto de /api exige sessão ANTES do handler
// (default-deny, como no Sistema Pralis): rota nova sem cuidado nasce protegida, nunca pública.
const rotasComAutenticacaoPropria = new Set(["/health", "/api/auth/*"]);

const pastaSite = fileURLToPath(new URL("../../../dist", import.meta.url));

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            // Credenciais nunca vão para o log.
            redact: {
              paths: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
              censor: "[redigido]"
            }
          },
    // Atrás do proxy do Vercel/Coolify: IP real do cliente para o limite de tentativas.
    trustProxy: env.NODE_ENV === "production"
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(
        problema(
          400,
          "Requisição inválida",
          "VALIDATION_ERROR",
          error.issues.map((issue) => ({ caminho: issue.path.join("."), mensagem: issue.message }))
        )
      );
    }
    if (error instanceof ErroDominio) {
      return reply.status(error.status).send(problema(error.status, error.message, error.code, error.details));
    }
    const statusFastify = (error as { statusCode?: number }).statusCode;
    if (statusFastify === 429) {
      return reply.status(429).send(problema(429, "Muitas tentativas; aguarde um minuto", "RATE_LIMITED"));
    }
    if (statusFastify === 413) {
      return reply.status(413).send(problema(413, "Dado grande demais para salvar", "PAYLOAD_TOO_LARGE"));
    }
    if (statusFastify && statusFastify >= 400 && statusFastify < 500) {
      return reply.status(statusFastify).send(problema(statusFastify, "Requisição inválida", "BAD_REQUEST"));
    }
    request.log.error(error);
    return reply.status(500).send(problema(500, "Erro interno", "INTERNAL_ERROR"));
  });

  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || origensWebPermitidas.includes(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  });
  // O site do Rodrigo usa <style> e <script> embutidos, Google Fonts e a busca de ícones do
  // Iconify: a CSP padrão do helmet quebraria a tela. Quando a API entrega o site, a CSP fica
  // desligada; nas respostas JSON ela não tem efeito.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request) => {
    if (request.method === "OPTIONS") return;
    // Escrita só a partir do próprio site: outra origem não grava, mesmo que o navegador mande o
    // cookie (o better-auth faz a mesma conferência nas rotas dele).
    const origem = request.headers.origin;
    if (request.method !== "GET" && origem && !origensWebPermitidas.includes(origem)) {
      throw proibido("Origem não permitida", "ORIGIN_NOT_ALLOWED");
    }
    const rota = request.routeOptions.url;
    if (!rota || !rota.startsWith("/api/") || rotasComAutenticacaoPropria.has(rota)) return;
    await exigirAutenticacao(request);
  });

  await registrarRotasSaude(app);
  await registrarRotasAuth(app);
  await registrarRotasDocumentos(app);

  if (env.SERVIR_SITE === "1") {
    await app.register(fastifyStatic, { root: pastaSite, index: ["index.html"] });
  }

  return app;
}
