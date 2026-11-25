import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { consultaComandasSchema, indicadoresComandasSchema } from "./comandas-creare.cliente.ts";
import {
  detalheComanda,
  indicadoresComandas,
  listarComandas,
  opcoesComandas,
  situacaoComandas
} from "./comandas-creare.service.ts";

// Mesmo limite por usuário das vendas dos PDVs: a tela lê a cada minuto (lista + indicadores) e abre detalhes.
function chaveDoUsuario(request: FastifyRequest) {
  return request.perfilUsuario ? `usuario:${request.perfilUsuario.usuarioId}` : `ip:${request.ip}`;
}
const limite = {
  rateLimit: { max: 90, timeWindow: "1 minute", hook: "preHandler" as const, keyGenerator: chaveDoUsuario }
};
const idSchema = z.object({ idComanda: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER) });

export async function registrarRotasComandasCreare(app: FastifyInstance) {
  app.get("/api/comandas-creare/situacao", async (request) => ok(situacaoComandas(perfilDaRequisicao(request))));

  app.get("/api/comandas-creare/opcoes", { config: limite }, async (request) =>
    ok(await opcoesComandas(perfilDaRequisicao(request))));

  app.get("/api/comandas-creare/indicadores", { config: limite }, async (request) =>
    ok(await indicadoresComandas(perfilDaRequisicao(request), indicadoresComandasSchema.parse(request.query).dia)));

  app.get("/api/comandas-creare", { config: limite }, async (request) =>
    ok(await listarComandas(perfilDaRequisicao(request), consultaComandasSchema.parse(request.query))));

  app.get("/api/comandas-creare/:idComanda", { config: limite }, async (request) =>
    ok(await detalheComanda(perfilDaRequisicao(request), idSchema.parse(request.params).idComanda)));
}
