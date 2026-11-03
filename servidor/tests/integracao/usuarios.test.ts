import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comSessao, criarApp, criarConta, entrar } from "./ajuda.ts";

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await app.close();
  const { pool } = await import("../../api/src/banco/conexao.ts");
  await pool.end();
});

async function contaLogada(papel: "administrador" | "usuario", empresaNome?: string) {
  const conta = await criarConta(papel, empresaNome);
  const { cookie } = await entrar(app, conta.email, conta.senha);
  return { ...conta, cookie };
}

describe("usuários da empresa", () => {
  it("administrador cria, lista e a pessoa nova entra com a senha inicial", async () => {
    const admin = await contaLogada("administrador");
    const criado = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "Caixa Manhã", email: "caixa.manha@teste.local", papel: "usuario", senha: "senha-inicial-123" }
    });
    expect(criado.statusCode).toBe(201);
    expect(criado.json().data).toMatchObject({ nome: "Caixa Manhã", papel: "usuario", ativo: true });

    const lista = await app.inject({ method: "GET", url: "/api/usuarios", headers: comSessao(admin.cookie) });
    expect(lista.json().data.usuarios.map((u: { email: string }) => u.email)).toContain("caixa.manha@teste.local");

    const login = await entrar(app, "caixa.manha@teste.local", "senha-inicial-123");
    expect(login.status).toBe(200);
  });

  it("usuário comum não gerencia usuários", async () => {
    const usuario = await contaLogada("usuario");
    const lista = await app.inject({ method: "GET", url: "/api/usuarios", headers: comSessao(usuario.cookie) });
    expect(lista.statusCode).toBe(403);
  });

  it("administrador não enxerga nem altera conta de outra empresa", async () => {
    const admin = await contaLogada("administrador");
    const outra = await criarConta("usuario");
    const resposta = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${outra.usuarioId}`,
      headers: comSessao(admin.cookie),
      payload: { ativo: false }
    });
    expect(resposta.statusCode).toBe(404);
  });

  it("ninguém tira o próprio acesso; a empresa não fica sem administrador", async () => {
    const admin = await contaLogada("administrador");
    const proprio = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${admin.usuarioId}`,
      headers: comSessao(admin.cookie),
      payload: { papel: "usuario" }
    });
    expect(proprio.json().code).toBe("SELF_LOCKOUT");
  });

  it("desativar encerra a sessão aberta da pessoa na hora", async () => {
    const admin = await contaLogada("administrador");
    const colega = await contaLogada("usuario", admin.empresaNome);
    const antes = await app.inject({ method: "GET", url: "/api/sessao", headers: comSessao(colega.cookie) });
    expect(antes.statusCode).toBe(200);

    await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${colega.usuarioId}`,
      headers: comSessao(admin.cookie),
      payload: { ativo: false }
    });
    const depois = await app.inject({ method: "GET", url: "/api/sessao", headers: comSessao(colega.cookie) });
    expect(depois.statusCode).toBe(401);
  });

  it("senha nova definida pelo administrador vale e a antiga deixa de valer", async () => {
    const admin = await contaLogada("administrador");
    const colega = await criarConta("usuario", admin.empresaNome);
    const resposta = await app.inject({
      method: "POST",
      url: `/api/usuarios/${colega.usuarioId}/senha`,
      headers: comSessao(admin.cookie),
      payload: { senha: "senha-trocada-456" }
    });
    expect(resposta.statusCode).toBe(204);
    expect((await entrar(app, colega.email, colega.senha)).status).toBe(401);
    expect((await entrar(app, colega.email, "senha-trocada-456")).status).toBe(200);
  });
});
