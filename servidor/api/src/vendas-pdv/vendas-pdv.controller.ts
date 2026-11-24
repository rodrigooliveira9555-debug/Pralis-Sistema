import type { FastifyInstance, FastifyRequest } from "fastify";
import { consultaVendasPdvSchema, ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { listarVendas, opcoesVendas, situacaoVendas, totaisVendas } from "./vendas-pdv.service.ts";

// Por sessão: o painel atualiza sozinho e vários aparelhos da loja saem pelo mesmo IP. Cabe com folga
// a atualização a cada minuto (lista, totais e um total por PDV: até ~10 pedidos) e os filtros.
function chaveDaSessao(request: FastifyRequest) {
  const sessao = /session_token=([^;]+)/.exec(request.headers.cookie ?? "")?.[1];
  return sessao ? `sessao:${sessao}` : `ip:${request.ip}`;
}
const limite = { rateLimit: { max: 90, timeWindow: "1 minute", keyGenerator: chaveDaSessao } };

export async function registrarRotasVendasPdv(app: FastifyInstance) {
  app.get("/api/vendas-pdv/situacao", async (request) => ok(situacaoVendas(perfilDaRequisicao(request))));

  app.get("/api/vendas-pdv/opcoes", { config: limite }, async (request) =>
    ok(await opcoesVendas(perfilDaRequisicao(request))));

  app.get("/api/vendas-pdv", { config: limite }, async (request) =>
    ok(await listarVendas(perfilDaRequisicao(request), consultaVendasPdvSchema.parse(request.query))));

  app.get("/api/vendas-pdv/totais", { config: limite }, async (request) =>
    ok(await totaisVendas(perfilDaRequisicao(request), consultaVendasPdvSchema.parse(request.query))));
}
