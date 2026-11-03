import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

export const ORIGEM = "http://localhost:4200";

export async function criarApp() {
  const { buildApp } = await import("@cicluz/api/app");
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function criarConta(papel: "administrador" | "usuario", empresaNome = `Empresa ${randomUUID()}`) {
  const { criarUsuario } = await import("../../api/src/usuarios/usuarios.service.ts");
  const email = `${randomUUID()}@teste.local`;
  const senha = `senha-${randomUUID()}`;
  const criado = await criarUsuario({ empresaNome, nome: "Pessoa de Teste", email, senha, papel });
  return { ...criado, email, senha, empresaNome };
}

// Entra pela rota real do better-auth e devolve o cookie de sessão para as próximas chamadas.
export async function entrar(app: FastifyInstance, email: string, senha: string) {
  const resposta = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: ORIGEM, "content-type": "application/json" },
    payload: { email, password: senha }
  });
  const cookies = resposta.headers["set-cookie"];
  const lista = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const cookie = lista.map((linha) => linha.split(";")[0]).join("; ");
  return { status: resposta.statusCode, cookie };
}

export function comSessao(cookie: string) {
  return { cookie, origin: ORIGEM };
}
