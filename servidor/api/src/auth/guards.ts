import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import type { PerfilSessao } from "@cicluz/shared";
import { naoAutenticado, proibido } from "../erros.ts";
import { auth } from "./config.ts";
import { buscarPerfilUsuario } from "./perfil.service.ts";

declare module "fastify" {
  interface FastifyRequest {
    perfilUsuario?: PerfilSessao;
  }
}

// Resolve a sessão do cookie e o perfil uma vez por requisição. Sem sessão: 401. Com sessão mas
// sem perfil ativo (usuário ou empresa desativados): 403, para a tela mandar de volta ao login.
export async function exigirAutenticacao(request: FastifyRequest): Promise<PerfilSessao> {
  if (request.perfilUsuario) return request.perfilUsuario;

  const sessao = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!sessao) throw naoAutenticado();

  const perfil = await buscarPerfilUsuario(sessao.user.id);
  if (!perfil) throw proibido("Acesso desativado. Fale com o administrador.", "PROFILE_INACTIVE");

  request.perfilUsuario = perfil;
  return perfil;
}

export function perfilDaRequisicao(request: FastifyRequest): PerfilSessao {
  if (!request.perfilUsuario) throw naoAutenticado();
  return request.perfilUsuario;
}
