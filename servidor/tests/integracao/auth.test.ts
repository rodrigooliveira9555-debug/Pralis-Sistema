import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comSessao, criarApp, criarConta, entrar, ORIGEM } from "./ajuda.ts";

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await app.close();
  const { pool } = await import("../../api/src/banco/conexao.ts");
  await pool.end();
});

describe("login", () => {
  it("entra com e-mail e senha e devolve o perfil com a empresa", async () => {
    const conta = await criarConta("administrador");
    const login = await entrar(app, conta.email, conta.senha);
    expect(login.status).toBe(200);
    expect(login.cookie).toContain("better-auth.session_token");

    const sessao = await app.inject({ method: "GET", url: "/api/sessao", headers: comSessao(login.cookie) });
    expect(sessao.statusCode).toBe(200);
    const corpo = sessao.json();
    expect(corpo.data.perfil).toMatchObject({
      email: conta.email,
      papel: "administrador",
      empresa: { id: conta.empresaId, nome: conta.empresaNome, dadosImportados: false }
    });
    expect(corpo.data.chavesSincronizadas).toContain("cicluz-financial-hierarchy-v1");
  });

  it("recusa senha errada sem criar sessão", async () => {
    const conta = await criarConta("usuario");
    const login = await entrar(app, conta.email, "senha-errada-123");
    expect(login.status).toBe(401);
    expect(login.cookie).not.toContain("session_token");
  });

  it("sem sessão, toda rota de /api responde 401", async () => {
    for (const url of ["/api/sessao", "/api/documentos", "/api/documentos/versoes"]) {
      const resposta = await app.inject({ method: "GET", url });
      expect(resposta.statusCode).toBe(401);
      expect(resposta.json().code).toBe("UNAUTHENTICATED");
    }
  });

  it("o cadastro público está desligado", async () => {
    const resposta = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      headers: { origin: ORIGEM, "content-type": "application/json" },
      payload: { name: "Intruso", email: "intruso@teste.local", password: "senha-forte-123" }
    });
    expect(resposta.statusCode).toBeGreaterThanOrEqual(400);
    const { banco } = await import("../../api/src/banco/conexao.ts");
    const { usuarioAutenticacao } = await import("@cicluz/db/schema");
    const achados = await banco
      .select()
      .from(usuarioAutenticacao)
      .where(eq(usuarioAutenticacao.email, "intruso@teste.local"));
    expect(achados).toHaveLength(0);
  });

  it("usuário desativado com sessão viva não abre nada (403)", async () => {
    const conta = await criarConta("usuario");
    const login = await entrar(app, conta.email, conta.senha);
    const { banco } = await import("../../api/src/banco/conexao.ts");
    const { perfisUsuarios } = await import("@cicluz/db/schema");
    await banco.update(perfisUsuarios).set({ ativo: false }).where(eq(perfisUsuarios.usuarioId, conta.usuarioId));

    const resposta = await app.inject({ method: "GET", url: "/api/documentos", headers: comSessao(login.cookie) });
    expect(resposta.statusCode).toBe(403);
    expect(resposta.json().code).toBe("PROFILE_INACTIVE");
  });

  it("sair encerra a sessão", async () => {
    const conta = await criarConta("usuario");
    const login = await entrar(app, conta.email, conta.senha);
    const saida = await app.inject({
      method: "POST",
      url: "/api/auth/sign-out",
      headers: { ...comSessao(login.cookie), "content-type": "application/json" },
      payload: {}
    });
    expect(saida.statusCode).toBe(200);
    const depois = await app.inject({ method: "GET", url: "/api/sessao", headers: comSessao(login.cookie) });
    expect(depois.statusCode).toBe(401);
  });

  it("gravação vinda de outra origem é recusada", async () => {
    const conta = await criarConta("administrador");
    const login = await entrar(app, conta.email, conta.senha);
    const resposta = await app.inject({
      method: "POST",
      url: "/api/documentos/importacao",
      headers: { cookie: login.cookie, origin: "https://site-malicioso.example" },
      payload: { itens: [] }
    });
    expect(resposta.statusCode).toBe(403);
    expect(resposta.json().code).toBe("ORIGIN_NOT_ALLOWED");
  });
});
