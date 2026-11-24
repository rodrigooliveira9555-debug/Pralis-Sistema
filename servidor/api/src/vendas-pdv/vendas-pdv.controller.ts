import type { FastifyInstance, FastifyRequest } from "fastify";
import { consultaVendasPdvSchema, ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { listarVendas, opcoesVendas, situacaoVendas, totaisVendas } from "./vendas-pdv.service.ts";

// Por usuário (a sessão já foi resolvida no onRequest; o limite roda no preHandler): vários aparelhos da loja saem
// pelo mesmo IP, e o cookie não serve de chave (dá para forjar um balde novo a cada pedido). Cabe a leitura a cada
// minuto (lista, totais e um total por PDV: até ~10 pedidos) e os filtros.
function chaveDoUsuario(request: FastifyRequest) {
  return request.perfilUsuario ? `usuario:${request.perfilUsuario.usuarioId}` : `ip:${request.ip}`;
}
const limite = { rateLimit: { max: 90, timeWindow: "1 minute", hook: "preHandler" as const, keyGenerator: chaveDoUsuario } };

export async function registrarRotasVendasPdv(app: FastifyInstance) {
  app.get("/api/vendas-pdv/situacao", async (request) => ok(situacaoVendas(perfilDaRequisicao(request))));

  app.get("/api/vendas-pdv/opcoes", { config: limite }, async (request) =>
    ok(await opcoesVendas(perfilDaRequisicao(request))));

  app.get("/api/vendas-pdv", { config: limite }, async (request) =>
    ok(await listarVendas(perfilDaRequisicao(request), consultaVendasPdvSchema.parse(request.query))));

  app.get("/api/vendas-pdv/totais", { config: limite }, async (request) =>
    ok(await totaisVendas(perfilDaRequisicao(request), consultaVendasPdvSchema.parse(request.query))));
}
