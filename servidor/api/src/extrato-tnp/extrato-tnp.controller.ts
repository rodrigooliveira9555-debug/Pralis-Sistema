import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  consultaExtratoTnpSchema,
  ok,
  type PerfilSessao,
} from "@cicluz/shared";
import { env } from "../env.ts";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { exigirPermissao } from "../auth/permissoes.ts";
import { proibido } from "../erros.ts";
import { buscarExtrato, extratoConfigurado } from "./extrato-tnp.cliente.ts";

// Extrato da Caixa PJ da TNP (Open Finance). Permissão própria E empresa: o token do coletor é da TNP; outra empresa
// do S2 nunca vê esse extrato. Limite por usuário (no preHandler, depois da sessão).
const SEM_ACESSO = "Você não tem acesso ao extrato bancário.";
function exigirAcesso(perfil: PerfilSessao) {
  exigirPermissao(perfil, "extrato_bancario_visualizar", SEM_ACESSO);
  // Sem empresa configurada a leitura está desligada (situação diz "não ligado" e a busca nem sai daqui):
  // não é falta de acesso da pessoa.
  if (env.TNP_EXTRATO_EMPRESA_ID && perfil.empresa.id !== env.TNP_EXTRATO_EMPRESA_ID)
    throw proibido(SEM_ACESSO, "INSUFFICIENT_PERMISSION");
}
const chaveDoUsuario = (request: FastifyRequest) =>
  request.perfilUsuario
    ? `usuario:${request.perfilUsuario.usuarioId}`
    : `ip:${request.ip}`;
const limite = {
  rateLimit: {
    max: 30,
    timeWindow: "1 minute",
    hook: "preHandler" as const,
    keyGenerator: chaveDoUsuario,
  },
};

export async function registrarRotasExtratoTnp(app: FastifyInstance) {
  app.get("/api/extrato-tnp/situacao", async (request) => {
    exigirAcesso(perfilDaRequisicao(request));
    return ok({ configurado: extratoConfigurado() });
  });

  app.get("/api/extrato-tnp", { config: limite }, async (request) => {
    exigirAcesso(perfilDaRequisicao(request));
    return ok(
      await buscarExtrato(consultaExtratoTnpSchema.parse(request.query)),
    );
  });
}
