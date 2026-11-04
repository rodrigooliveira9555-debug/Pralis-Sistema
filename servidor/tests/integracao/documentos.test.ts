import { and, eq } from "drizzle-orm";
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

const HIERARQUIA = "cicluz-financial-hierarchy-v1";
const MARCA = "cicluz-financial-import-complete-v3-ret";

async function contaLogada(papel: "administrador" | "usuario", empresaNome?: string) {
  const conta = await criarConta(papel, empresaNome);
  const { cookie } = await entrar(app, conta.email, conta.senha);
  return { ...conta, cookie };
}

function importar(cookie: string, itens: Array<{ chave: string; valor: string }>) {
  return app.inject({ method: "POST", url: "/api/documentos/importacao", headers: comSessao(cookie), payload: { itens } });
}

function gravar(cookie: string, itens: Array<{ chave: string; valor: string | null; versaoBase: number }>) {
  return app.inject({ method: "PUT", url: "/api/documentos", headers: comSessao(cookie), payload: { itens } });
}

async function listar(cookie: string) {
  const resposta = await app.inject({ method: "GET", url: "/api/documentos", headers: comSessao(cookie) });
  return resposta.json().data.documentos as Array<{ chave: string; valor: string; versao: number }>;
}

async function historico(empresaId: string, chave: string) {
  const { banco } = await import("../../api/src/banco/conexao.ts");
  const { documentosHistorico } = await import("@cicluz/db/schema");
  return banco
    .select()
    .from(documentosHistorico)
    .where(and(eq(documentosHistorico.empresaId, empresaId), eq(documentosHistorico.chave, chave)));
}

describe("importação inicial", () => {
  it("antes dela nenhum aparelho grava: o seed de um navegador qualquer não vira a versão 1", async () => {
    const admin = await contaLogada("administrador");
    const resposta = await gravar(admin.cookie, [{ chave: HIERARQUIA, valor: '{"seed":true}', versaoBase: 0 }]);
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().code).toBe("IMPORT_PENDING");
    expect(await listar(admin.cookie)).toHaveLength(0);
  });

  it("só o administrador importa", async () => {
    const usuario = await contaLogada("usuario");
    const resposta = await importar(usuario.cookie, [{ chave: HIERARQUIA, valor: "{}" }]);
    expect(resposta.statusCode).toBe(403);
    expect(resposta.json().code).toBe("ADMIN_ONLY");
  });

  it("o administrador importa uma vez; a segunda é recusada", async () => {
    const admin = await contaLogada("administrador");
    const primeira = await importar(admin.cookie, [
      { chave: HIERARQUIA, valor: '{"vnd":[1]}' },
      { chave: MARCA, valor: "1" }
    ]);
    expect(primeira.statusCode).toBe(201);
    expect(await listar(admin.cookie)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ chave: HIERARQUIA, valor: '{"vnd":[1]}', versao: 1 }),
        expect.objectContaining({ chave: MARCA, valor: "1", versao: 1 })
      ])
    );

    const segunda = await importar(admin.cookie, [{ chave: HIERARQUIA, valor: "{}" }]);
    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().code).toBe("IMPORT_ALREADY_DONE");
  });

  it("chave fora da lista é recusada", async () => {
    const admin = await contaLogada("administrador");
    const resposta = await importar(admin.cookie, [{ chave: "cicluz-tema", valor: "sombra" }]);
    expect(resposta.statusCode).toBe(400);
    const cadastro = await importar(admin.cookie, [{ chave: "cicluz-cadastro-completo-v1", valor: "{}" }]);
    expect(cadastro.statusCode).toBe(400);
  });
});

describe("gravação em lote", () => {
  async function empresaImportada() {
    const admin = await contaLogada("administrador");
    await importar(admin.cookie, [
      { chave: HIERARQUIA, valor: '{"v":1}' },
      { chave: MARCA, valor: "1" }
    ]);
    return admin;
  }

  it("grava a partir da versão atual e sobe a versão", async () => {
    const admin = await empresaImportada();
    const resposta = await gravar(admin.cookie, [{ chave: HIERARQUIA, valor: '{"v":2}', versaoBase: 1 }]);
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data.documentos).toEqual([{ chave: HIERARQUIA, versao: 2 }]);
    const tipos = (await historico(admin.empresaId, HIERARQUIA)).map((linha) => linha.tipo);
    expect(tipos).toEqual(["gravada", "gravada"]);
  });

  it("versão velha: recusa o lote inteiro, não muda nada e guarda o que chegou no histórico", async () => {
    const admin = await empresaImportada();
    await gravar(admin.cookie, [{ chave: HIERARQUIA, valor: '{"v":2}', versaoBase: 1 }]);

    // Aba velha: ainda acha que está na versão 1, e grava junto uma marca que estaria livre.
    const resposta = await gravar(admin.cookie, [
      { chave: HIERARQUIA, valor: '{"aba-velha":true}', versaoBase: 1 },
      { chave: MARCA, valor: "2", versaoBase: 1 }
    ]);
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().code).toBe("DOCUMENT_VERSION_CONFLICT");
    expect(resposta.json().details.conflitos).toEqual([{ chave: HIERARQUIA, versaoAtual: 2 }]);

    const docs = await listar(admin.cookie);
    expect(docs.find((d) => d.chave === HIERARQUIA)).toMatchObject({ valor: '{"v":2}', versao: 2 });
    expect(docs.find((d) => d.chave === MARCA)).toMatchObject({ valor: "1", versao: 1 });

    const conflitos = (await historico(admin.empresaId, HIERARQUIA)).filter((linha) => linha.tipo === "conflito");
    expect(conflitos.map((linha) => linha.valor)).toEqual(['{"aba-velha":true}']);
  });

  it("repetir um envio que já chegou não vira conflito", async () => {
    const admin = await empresaImportada();
    await gravar(admin.cookie, [{ chave: HIERARQUIA, valor: '{"v":2}', versaoBase: 1 }]);
    const repetido = await gravar(admin.cookie, [{ chave: HIERARQUIA, valor: '{"v":2}', versaoBase: 1 }]);
    expect(repetido.statusCode).toBe(200);
    expect(repetido.json().data.documentos).toEqual([{ chave: HIERARQUIA, versao: 2 }]);
  });

  it("chave nova entra com versão base 0 e remoção guarda o conteúdo antigo", async () => {
    const admin = await empresaImportada();
    const nova = await gravar(admin.cookie, [{ chave: "cicluz-cargos-v1", valor: "[]", versaoBase: 0 }]);
    expect(nova.json().data.documentos).toEqual([{ chave: "cicluz-cargos-v1", versao: 1 }]);

    const removida = await gravar(admin.cookie, [{ chave: "cicluz-cargos-v1", valor: null, versaoBase: 1 }]);
    expect(removida.statusCode).toBe(200);
    expect((await listar(admin.cookie)).some((d) => d.chave === "cicluz-cargos-v1")).toBe(false);
    const tipos = (await historico(admin.empresaId, "cicluz-cargos-v1")).map((linha) => linha.tipo);
    expect(tipos).toContain("removida");
  });

  it("dois aparelhos criando a mesma chave ao mesmo tempo: um grava, o outro recebe 409", async () => {
    const admin = await empresaImportada();
    const [a, b] = await Promise.all([
      gravar(admin.cookie, [{ chave: "cicluz-job-profiles-v1", valor: '{"a":1}', versaoBase: 0 }]),
      gravar(admin.cookie, [{ chave: "cicluz-job-profiles-v1", valor: '{"b":1}', versaoBase: 0 }])
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
  });

  it("documento de 1,5 MB passa; acima de 4 MB é recusado", async () => {
    const admin = await empresaImportada();
    const grande = JSON.stringify({ texto: "ç".repeat(750_000) });
    const ok = await gravar(admin.cookie, [{ chave: "cicluz-location-tree-v1", valor: grande, versaoBase: 0 }]);
    expect(ok.statusCode).toBe(200);

    const enorme = "x".repeat(4 * 1024 * 1024 + 1);
    const recusado = await gravar(admin.cookie, [{ chave: "cicluz-organogram-positions-v1", valor: enorme, versaoBase: 0 }]);
    expect(recusado.statusCode).toBe(400);
  });

  it("outra empresa não enxerga nem grava os documentos desta", async () => {
    const admin = await empresaImportada();
    const outra = await contaLogada("administrador");
    await importar(outra.cookie, []);
    expect(await listar(outra.cookie)).toHaveLength(0);

    // Mesmo sabendo a chave e a versão, a gravação cai na empresa da sessão, nunca na outra.
    await gravar(outra.cookie, [{ chave: HIERARQUIA, valor: '{"invasao":true}', versaoBase: 0 }]);
    const daPrimeira = await listar(admin.cookie);
    expect(daPrimeira.find((d) => d.chave === HIERARQUIA)).toMatchObject({ valor: '{"v":1}' });
  });

  it("usuário da mesma empresa grava, e as versões aparecem na rota leve", async () => {
    const admin = await empresaImportada();
    const colega = await contaLogada("usuario", admin.empresaNome);
    const resposta = await gravar(colega.cookie, [{ chave: HIERARQUIA, valor: '{"v":"colega"}', versaoBase: 1 }]);
    expect(resposta.statusCode).toBe(200);
    const versoes = await app.inject({ method: "GET", url: "/api/documentos/versoes", headers: comSessao(admin.cookie) });
    expect(versoes.json().data.versoes).toEqual(expect.arrayContaining([{ chave: HIERARQUIA, versao: 2 }]));
  });

  it("cópia do aparelho vai só para o histórico", async () => {
    const admin = await empresaImportada();
    const resposta = await app.inject({
      method: "POST",
      url: "/api/documentos/copias",
      headers: comSessao(admin.cookie),
      payload: { itens: [{ chave: HIERARQUIA, valor: '{"do-ipad":true}' }] }
    });
    expect(resposta.statusCode).toBe(201);
    const docs = await listar(admin.cookie);
    expect(docs.find((d) => d.chave === HIERARQUIA)).toMatchObject({ valor: '{"v":1}' });
    const tipos = (await historico(admin.empresaId, HIERARQUIA)).map((linha) => linha.tipo);
    expect(tipos).toContain("substituida_pelo_servidor");

    // Igual à versão atual não é cópia: não entra no histórico.
    const igual = await app.inject({
      method: "POST",
      url: "/api/documentos/copias",
      headers: comSessao(admin.cookie),
      payload: { itens: [{ chave: HIERARQUIA, valor: '{"v":1}' }] }
    });
    expect(igual.json().data.guardadas).toBe(0);
  });
});
