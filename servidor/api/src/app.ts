import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import { problema } from "@cicluz/shared";
import { exigirAutenticacao } from "./auth/guards.ts";
import { registrarRotasAuth } from "./auth/auth.controller.ts";
import { registrarRotasConsultas } from "./consultas/consultas.controller.ts";
import { registrarRotasDocumentos } from "./documentos/documentos.controller.ts";
import { env, origensWebPermitidas } from "./env.ts";
import { ErroDominio, proibido } from "./erros.ts";
import { registrarRotasSaude } from "./saude/saude.controller.ts";
import { registrarRotasUsuarios } from "./usuarios/usuarios.controller.ts";

// Rotas que cuidam da própria autenticação. Todo o resto de /api exige sessão ANTES do handler
// (default-deny, como no Sistema Pralis): rota nova sem cuidado nasce protegida, nunca pública.
const rotasComAutenticacaoPropria = new Set(["/health", "/api/auth/*"]);

const pastaSite = fileURLToPath(new URL("../../../dist", import.meta.url));
const pastaApp = fileURLToPath(new URL("../../web/.output/public", import.meta.url));

export async function buildApp(): Promise<FastifyInstance> {
  const opcoes: FastifyServerOptions = {
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
    // IP real do cliente para o limite de tentativas: confia só no número de proxies declarado (0 =
    // nenhum, o IP é o da conexão).
    trustProxy: (_endereco: string, salto: number) => salto < env.PROXIES_CONFIAVEIS
  };
  const app = Fastify(opcoes);

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
    const codigoBanco = ((error as { cause?: { code?: string } }).cause ?? (error as { code?: string })).code;
    if (codigoBanco === "40P01" || codigoBanco === "40001") {
      return reply.status(503).send(problema(503, "Servidor ocupado; tente de novo", "TRY_AGAIN"));
    }
    request.log.error(error);
    return reply.status(500).send(problema(500, "Erro interno", "INTERNAL_ERROR"));
  });

  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || origensWebPermitidas.includes(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
  // O site do Rodrigo usa <style> e <script> embutidos, Google Fonts e a busca de ícones do
  // Iconify: a CSP padrão do helmet quebraria a tela. Quando a API entrega o site, a CSP fica
  // desligada; nas respostas JSON ela não tem efeito.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  // Só JSON: um formulário de outro site não consegue mandar corpo que a API aceite.
  app.removeContentTypeParser("text/plain");

  app.addHook("onRequest", async (request) => {
    if (request.method === "OPTIONS") return;
    // Escrita só a partir do próprio site. O navegador sempre manda Origin em POST/PUT/DELETE; sem
    // ele, só passa se o próprio navegador disser que é a mesma origem (Sec-Fetch-Site).
    if (!["GET", "HEAD"].includes(request.method) && request.url.startsWith("/api/")) {
      const origem = request.headers.origin;
      const mesmaOrigem = request.headers["sec-fetch-site"] === "same-origin";
      if (origem ? !origensWebPermitidas.includes(origem) : !mesmaOrigem) {
        throw proibido("Origem não permitida", "ORIGIN_NOT_ALLOWED");
      }
    }
    const rota = request.routeOptions.url;
    if (!rota || !rota.startsWith("/api/") || rotasComAutenticacaoPropria.has(rota)) return;
    await exigirAutenticacao(request);
  });

  await registrarRotasSaude(app);
  await registrarRotasAuth(app);
  await registrarRotasDocumentos(app);
  await registrarRotasUsuarios(app);
  await registrarRotasConsultas(app);

  // App das telas novas (Nuxt gerado em web/.output/public), em /app/ no mesmo domínio do site.
  // Em produção o Vercel repassa /app/* e /api/* para cá; rota interna do app sem arquivo cai no
  // index.html dele (SPA).
  if (existsSync(pastaApp)) {
    await app.register(fastifyStatic, { root: pastaApp, prefix: "/app/", decorateReply: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && request.url.startsWith("/app/")) {
        return reply.type("text/html").send(readFileSync(join(pastaApp, "index.html")));
      }
      return reply.status(404).send(problema(404, "Não encontrado", "NOT_FOUND"));
    });
  }

  if (env.SERVIR_SITE === "1") {
    await app.register(fastifyStatic, { root: pastaSite, index: ["index.html"] });
  }

  return app;
}
