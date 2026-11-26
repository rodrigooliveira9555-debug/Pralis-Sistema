import type { FastifyRequest } from "fastify";

// Chave do teto de requisições por PESSOA (B4 do plano de 26/11/2026).
//
// Antes, a chave saía do texto do cookie com /session_token=([^;]+)/, que pega o PRIMEIRO trecho
// parecido: mandar "x_session_token=<qualquer coisa>" na frente do cookie de verdade dava um balde
// novo a cada pedido, e o teto não valia. Agora a chave é o usuário da sessão JÁ conferida (o
// onRequest resolve a sessão; o limite roda no preHandler, depois dele). Sem sessão, cai no IP.
export function chaveDoUsuario(request: FastifyRequest): string {
  return request.perfilUsuario ? `usuario:${request.perfilUsuario.usuarioId}` : `ip:${request.ip}`;
}

export function limitePorUsuario(max: number) {
  return { rateLimit: { max, timeWindow: "1 minute", hook: "preHandler" as const, keyGenerator: chaveDoUsuario } };
}
