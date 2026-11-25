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

async function adminLogado() {
  const conta = await criarConta("administrador");
  const { cookie } = await entrar(app, conta.email, conta.senha);
  return { ...conta, cookie };
}

const configTudoLigado = { telas: { "vz-lan-vnd---vendas": ["lan", "ver"] }, acoes: [] };

async function enviar(cookie: string, corpo: unknown) {
  return app.inject({ method: "PUT", url: "/api/acessos-por-tela/sincronizar", headers: comSessao(cookie), payload: corpo as object });
}

describe("Acesso por Tela no servidor", () => {
  it("o administrador envia colaboradores e configurações e vê quem pode usar o sistema", async () => {
    const admin = await adminLogado();
    const resposta = await enviar(admin.cookie, {
      colaboradores: [
        { id: "colab-a", nome: "Ana", cargoId: "ref:3", areaIds: ["loja"], ativo: true },
        { id: "colab-b", nome: "Bia", cargoId: "ref:4", areaIds: ["producao"], ativo: true }
      ],
      areaPais: { loja: null, producao: null },
      configs: { "area:loja": configTudoLigado }
    });
    expect(resposta.statusCode).toBe(200);
    const situacao = resposta.json().data;
    expect(situacao.colaboradores.find((c: { id: string }) => c.id === "colab-a").podeUsar).toBe(true);
    expect(situacao.colaboradores.find((c: { id: string }) => c.id === "colab-b").podeUsar).toBe(false);

    const lida = await app.inject({ method: "GET", url: "/api/acessos-por-tela", headers: comSessao(admin.cookie) });
    expect(lida.statusCode).toBe(200);
    expect(Object.keys(lida.json().data.configs)).toEqual(["area:loja"]);
  });

  it("quem não monta acessos não envia, e o envio não aceita chave desconhecida", async () => {
    const admin = await adminLogado();
    const dono = await criarConta("usuario", admin.empresaNome);
    const { cookie } = await entrar(app, dono.email, dono.senha);
    const semPermissao = await enviar(cookie, { colaboradores: [], areaPais: {}, configs: {} });
    expect(semPermissao.statusCode).toBe(403);
    const invalido = await enviar(admin.cookie, { colaboradores: [], areaPais: {}, configs: { "qualquer:coisa": configTudoLigado } });
    expect(invalido.statusCode).toBe(400);
  });

  it("a conta ligada ao colaborador só abre com permissão; o administrador nunca é barrado", async () => {
    const admin = await adminLogado();
    await enviar(admin.cookie, {
      colaboradores: [{ id: `colab-${admin.empresaNome}`, nome: "Caixa Um", cargoId: "ref:16", areaIds: ["loja"], ativo: true }],
      areaPais: { loja: null },
      configs: {}
    });
    const colabId = `colab-${admin.empresaNome}`;
    const criada = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "Caixa Um", email: `caixa-${Date.now()}@teste.local`, papel: "usuario", senha: "senha-inicial-123", colaboradorId: colabId }
    });
    expect(criada.statusCode).toBe(201);
    expect(criada.json().data).toMatchObject({ colaboradorId: colabId, colaboradorNome: "Caixa Um" });
    const email = criada.json().data.email as string;

    // Sem nenhuma configuração: entra, mas nada abre.
    const entrada = await entrar(app, email, "senha-inicial-123");
    expect(entrada.status).toBe(200);
    const barrado = await app.inject({ method: "GET", url: "/api/acessos/catalogo", headers: comSessao(entrada.cookie) });
    expect(barrado.statusCode).toBe(403);
    expect(barrado.json().error?.code ?? barrado.json().code).toBe("NO_PERMISSIONS");

    // O administrador continua abrindo normalmente.
    const adminOk = await app.inject({ method: "GET", url: "/api/acessos/catalogo", headers: comSessao(admin.cookie) });
    expect(adminOk.statusCode).toBe(200);

    // Com a configuração da área dele, abre.
    await enviar(admin.cookie, {
      colaboradores: [{ id: colabId, nome: "Caixa Um", cargoId: "ref:16", areaIds: ["loja"], ativo: true }],
      areaPais: { loja: null },
      configs: { "area:loja": configTudoLigado }
    });
    const liberado = await app.inject({ method: "GET", url: "/api/acessos/catalogo", headers: comSessao(entrada.cookie) });
    expect(liberado.statusCode).toBe(200);
  });

  it("a configuração própria da pessoa vence a da área, e o colaborador só tem uma conta", async () => {
    const admin = await adminLogado();
    const colabId = `colab-p-${admin.empresaNome}`;
    await enviar(admin.cookie, {
      colaboradores: [{ id: colabId, nome: "Dina", cargoId: "ref:9", areaIds: ["loja"], ativo: true }],
      areaPais: { loja: null },
      configs: { "area:loja": configTudoLigado, [`pessoa:${colabId}`]: { telas: { x: [] }, acoes: [] } }
    });
    const criada = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "Dina", email: `dina-${Date.now()}@teste.local`, papel: "usuario", senha: "senha-inicial-123", colaboradorId: colabId }
    });
    expect(criada.statusCode).toBe(201);
    const entrada = await entrar(app, criada.json().data.email, "senha-inicial-123");
    // A configuração própria da Dina não libera nada: vence a da área e ela fica barrada.
    expect((await app.inject({ method: "GET", url: "/api/acessos/catalogo", headers: comSessao(entrada.cookie) })).statusCode).toBe(403);

    const duplicada = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "Dina 2", email: `dina2-${Date.now()}@teste.local`, papel: "usuario", senha: "senha-inicial-123", colaboradorId: colabId }
    });
    expect(duplicada.statusCode).toBe(409);
    const inexistente = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "Sem Colab", email: `sc-${Date.now()}@teste.local`, papel: "usuario", senha: "senha-inicial-123", colaboradorId: "nao-existe" }
    });
    expect(inexistente.statusCode).toBe(404);
  });
});
