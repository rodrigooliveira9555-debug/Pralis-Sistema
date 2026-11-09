import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { importacaoProdutosSchema, LIMITE_CORPO_LOTE, listarProdutosSchema, ok, produtoCriacaoSchema, produtoEdicaoSchema } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { criar, editar, importar, listar, obter, resumo, revincular } from "./produtos.service.ts";

const idParams = z.object({ id: z.string().trim().min(1).max(80) });

// Por sessão (vários aparelhos saem pelo mesmo IP da loja). A importação de ~7.200 produtos vai em ~15 lotes.
function chaveDaSessao(request: FastifyRequest) {
  const sessao = /session_token=([^;]+)/.exec(request.headers.cookie ?? "")?.[1];
  return sessao ? `sessao:${sessao}` : `ip:${request.ip}`;
}
const limiteImportacao = { rateLimit: { max: 60, timeWindow: "1 minute", keyGenerator: chaveDaSessao } };

export async function registrarRotasProdutos(app: FastifyInstance) {
  app.get("/api/produtos", async (request) => ok(await listar(perfilDaRequisicao(request), listarProdutosSchema.parse(request.query))));

  app.get("/api/produtos/resumo", async (request) => ok(await resumo(perfilDaRequisicao(request))));

  app.get("/api/produtos/item/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await obter(perfilDaRequisicao(request), id));
  });

  app.post("/api/produtos", async (request, reply) =>
    reply.status(201).send(ok(await criar(perfilDaRequisicao(request), produtoCriacaoSchema.parse(request.body)))));

  app.put("/api/produtos/item/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await editar(perfilDaRequisicao(request), id, produtoEdicaoSchema.parse(request.body)));
  });

  app.post("/api/produtos/importacao", { bodyLimit: LIMITE_CORPO_LOTE, config: limiteImportacao }, async (request) =>
    ok(await importar(perfilDaRequisicao(request), importacaoProdutosSchema.parse(request.body))));

  app.post("/api/produtos/revincular", { config: limiteImportacao }, async (request) => ok(await revincular(perfilDaRequisicao(request))));
}
