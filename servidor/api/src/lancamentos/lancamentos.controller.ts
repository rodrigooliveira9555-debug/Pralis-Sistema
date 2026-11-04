import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CATEGORIAS_LANCAMENTO, discriminarSchema, lancamentoSchema, listarLancamentosSchema, ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { cancelarSerie, criarLancamento, discriminarLancamento, editarLancamento, listar, obter } from "./lancamentos.service.ts";

const categoriaParams = z.object({ categoria: z.enum(CATEGORIAS_LANCAMENTO) });
const idParams = z.object({ id: z.string().uuid() });

export async function registrarRotasLancamentos(app: FastifyInstance) {
  app.get("/api/lancamentos/:categoria", async (request) => {
    const { categoria } = categoriaParams.parse(request.params);
    const filtro = listarLancamentosSchema.parse(request.query);
    return ok(await listar(perfilDaRequisicao(request), categoria, filtro));
  });

  app.post("/api/lancamentos/:categoria", async (request, reply) => {
    const { categoria } = categoriaParams.parse(request.params);
    const entrada = lancamentoSchema.parse(request.body);
    return reply.status(201).send(ok(await criarLancamento(perfilDaRequisicao(request), categoria, entrada)));
  });

  app.get("/api/lancamentos/item/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await obter(perfilDaRequisicao(request), id));
  });

  app.put("/api/lancamentos/item/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    // Recorrência só vale na criação: na edição é ignorada (cada ocorrência se edita sozinha).
    const entrada = lancamentoSchema.omit({ recorrencia: true }).parse(request.body);
    return ok(await editarLancamento(perfilDaRequisicao(request), id, entrada));
  });

  app.patch("/api/lancamentos/item/:id/discriminar", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await discriminarLancamento(perfilDaRequisicao(request), id, discriminarSchema.parse(request.body)));
  });

  app.patch("/api/lancamentos/series/:id/cancelar", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await cancelarSerie(perfilDaRequisicao(request), id));
  });
}
