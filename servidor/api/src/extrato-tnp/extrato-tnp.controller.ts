import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  consultaExtratoTnpSchema,
  fonteExtratoSchema,
  ok,
  type FonteExtrato,
  type PerfilSessao,
} from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { exigirPermissao } from "../auth/permissoes.ts";
import { proibido } from "../erros.ts";
import {
  buscarExtrato,
  extratoConfigurado,
  ligacaoDa,
} from "./extrato-tnp.cliente.ts";

// Extrato bancário (Open Finance) da TNP ou do HORA. Permissão própria E empresa: cada coletor tem a sua empresa do
// S2; outra empresa nunca vê esse extrato. Limite por usuário (no preHandler, depois da sessão).
const SEM_ACESSO = "Você não tem acesso ao extrato bancário.";
function exigirAcesso(perfil: PerfilSessao, fonte: FonteExtrato) {
  exigirPermissao(perfil, "extrato_bancario_visualizar", SEM_ACESSO);
  // Sem empresa configurada a leitura está desligada (situação diz "não ligado" e a busca nem sai daqui):
  // não é falta de acesso da pessoa.
  const { empresaId } = ligacaoDa(fonte);
  if (empresaId && perfil.empresa.id !== empresaId)
    throw proibido(SEM_ACESSO, "INSUFFICIENT_PERMISSION");
}
const fonteDa = (query: unknown) =>
  fonteExtratoSchema.parse((query as { fonte?: unknown } | null)?.fonte ?? "tnp");
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
    const fonte = fonteDa(request.query);
    exigirAcesso(perfilDaRequisicao(request), fonte);
    return ok({ configurado: extratoConfigurado(fonte) });
  });

  app.get("/api/extrato-tnp", { config: limite }, async (request) => {
    const consulta = consultaExtratoTnpSchema.parse(request.query);
    exigirAcesso(perfilDaRequisicao(request), consulta.fonte);
    return ok(await buscarExtrato(consulta));
  });
}
