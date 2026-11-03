import type { FastifyInstance } from "fastify";
import { copiasSchema, gravarLoteSchema, importacaoSchema, LIMITE_CORPO_LOTE, ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { gravarLote, guardarCopias, importar, listar, versoes } from "./documentos.service.ts";

export async function registrarRotasDocumentos(app: FastifyInstance) {
  app.get("/api/documentos", async (request) => {
    return ok({ documentos: await listar(perfilDaRequisicao(request)) });
  });

  // Leve: só as versões, para a aba aberta saber se outro aparelho gravou algo novo.
  app.get("/api/documentos/versoes", async (request) => {
    return ok({ versoes: await versoes(perfilDaRequisicao(request)) });
  });

  app.put("/api/documentos", { bodyLimit: LIMITE_CORPO_LOTE }, async (request) => {
    const lote = gravarLoteSchema.parse(request.body);
    return ok({ documentos: await gravarLote(perfilDaRequisicao(request), lote) });
  });

  app.post("/api/documentos/importacao", { bodyLimit: LIMITE_CORPO_LOTE }, async (request, reply) => {
    const importacao = importacaoSchema.parse(request.body);
    return reply.status(201).send(ok(await importar(perfilDaRequisicao(request), importacao)));
  });

  app.post("/api/documentos/copias", { bodyLimit: LIMITE_CORPO_LOTE }, async (request, reply) => {
    const copias = copiasSchema.parse(request.body);
    await guardarCopias(perfilDaRequisicao(request), copias);
    return reply.status(201).send(ok({ guardadas: copias.itens.length }));
  });
}
