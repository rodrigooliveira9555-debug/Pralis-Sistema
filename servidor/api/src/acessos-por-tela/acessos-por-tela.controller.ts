import type { FastifyInstance } from "fastify";
import { ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { situacaoDosAcessos, sincronizarAcessos } from "./acessos-por-tela.service.ts";

export async function registrarRotasAcessosPorTela(app: FastifyInstance) {
  app.get("/api/acessos-por-tela", async (request) => ok(await situacaoDosAcessos(perfilDaRequisicao(request))));

  app.put("/api/acessos-por-tela/sincronizar", async (request) => ok(await sincronizarAcessos(perfilDaRequisicao(request), request.body)));
}
