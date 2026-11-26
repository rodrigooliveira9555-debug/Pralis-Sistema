import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { importacaoProdutosSchema, LIMITE_CORPO_LOTE, listarProdutosSchema, ok, produtoCriacaoSchema, produtoEdicaoSchema, transferenciaProdutosSchema } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { limitePorUsuario } from "../auth/limites.ts";
import { criar, editar, importar, listar, obter, resumo, revincular, transferir } from "./produtos.service.ts";

const idParams = z.object({ id: z.string().trim().min(1).max(80) });

// Por pessoa (vários aparelhos saem pelo mesmo IP da loja). A importação de ~7.200 produtos vai em ~15 lotes.
const limiteImportacao = limitePorUsuario(60);

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

  app.post("/api/produtos/transferencia", { bodyLimit: LIMITE_CORPO_LOTE, config: limiteImportacao }, async (request) =>
    ok(await transferir(perfilDaRequisicao(request), transferenciaProdutosSchema.parse(request.body))));

  app.post("/api/produtos/revincular", { config: limiteImportacao }, async (request) => ok(await revincular(perfilDaRequisicao(request))));
}
