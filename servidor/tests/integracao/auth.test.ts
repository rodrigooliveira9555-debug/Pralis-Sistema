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
    expect(corpo.data.chavesSincronizadas).toContain("cicluz-compras-v1");
    expect(corpo.data.chavesSincronizadas).toContain("cicluz-agenda-v1");
    expect(corpo.data.chavesSincronizadas).toContain("cicluz-producao-v1");
    expect(corpo.data.chavesSincronizadas).toContain("cicluz-patrimonio-v1");
    expect(corpo.data.chavesAdotadas).toEqual(["cicluz-compras-v1", "cicluz-agenda-v1", "cicluz-producao-v1", "cicluz-patrimonio-v1"]);
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

  it("gravação sem Origin e sem Sec-Fetch-Site same-origin é recusada", async () => {
    const conta = await criarConta("administrador");
    const login = await entrar(app, conta.email, conta.senha);
    const sem = await app.inject({
      method: "POST",
      url: "/api/documentos/importacao",
      headers: { cookie: login.cookie },
      payload: { itens: [] }
    });
    expect(sem.statusCode).toBe(403);
    const mesmaOrigem = await app.inject({
      method: "POST",
      url: "/api/documentos/importacao",
      headers: { cookie: login.cookie, "sec-fetch-site": "same-origin" },
      payload: { itens: [] }
    });
    expect(mesmaOrigem.statusCode).toBe(201);
  });

  it("usuário desativado não abre sessão nova", async () => {
    const conta = await criarConta("usuario");
    const { banco } = await import("../../api/src/banco/conexao.ts");
    const { perfisUsuarios } = await import("@cicluz/db/schema");
    await banco.update(perfisUsuarios).set({ ativo: false }).where(eq(perfisUsuarios.usuarioId, conta.usuarioId));
    const login = await entrar(app, conta.email, conta.senha);
    expect(login.status).toBeGreaterThanOrEqual(400);
    expect(login.cookie).not.toContain("session_token");
  });

  it("depois de 10 tentativas no mesmo e-mail, a 11ª é barrada mesmo com a senha certa", async () => {
    const conta = await criarConta("usuario");
    for (let i = 0; i < 10; i += 1) await entrar(app, conta.email, "senha-errada-123");
    const login = await entrar(app, conta.email, conta.senha);
    expect(login.status).toBe(429);
  });

  it("o cookie de sessão é httpOnly e SameSite=Lax", async () => {
    const conta = await criarConta("usuario");
    const resposta = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      headers: { origin: ORIGEM, "content-type": "application/json" },
      payload: { email: conta.email, password: conta.senha }
    });
    const cookies = ([] as string[]).concat(resposta.headers["set-cookie"] ?? []);
    const sessao = cookies.find((linha) => linha.includes("session_token"));
    expect(sessao).toMatch(/HttpOnly/i);
    expect(sessao).toMatch(/SameSite=Lax/i);
  });

  it("criar usuário em empresa que não existe exige pedido explícito", async () => {
    const { criarUsuario } = await import("../../api/src/usuarios/usuarios.service.ts");
    await expect(
      criarUsuario({ empresaNome: "Empresa Com Erro De Digitacao", nome: "Fulano", email: "fulano@teste.local", senha: "senha-forte-123", papel: "usuario" })
    ).rejects.toThrow(/não encontrada/);
  });
});
