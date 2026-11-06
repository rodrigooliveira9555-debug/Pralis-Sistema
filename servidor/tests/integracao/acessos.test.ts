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

async function criarCargo(cookie: string, nome: string, permissoes: string[]) {
  const resposta = await app.inject({
    method: "POST",
    url: "/api/cargos-acesso",
    headers: comSessao(cookie),
    payload: { nome, permissoes }
  });
  return resposta;
}

// Cargos pela tela Usuários; exceções pela tela Permissões.
async function darCargos(cookie: string, usuarioId: string, cargos: string[]) {
  return app.inject({ method: "PATCH", url: `/api/usuarios/${usuarioId}`, headers: comSessao(cookie), payload: { cargos } });
}

async function darExcecoes(cookie: string, usuarioId: string, excecoes: Record<string, boolean>) {
  return app.inject({ method: "PUT", url: `/api/usuarios/${usuarioId}/acessos`, headers: comSessao(cookie), payload: { excecoes } });
}

async function permissoesDaSessao(cookie: string): Promise<string[]> {
  const resposta = await app.inject({ method: "GET", url: "/api/sessao", headers: comSessao(cookie) });
  return resposta.json().data.perfil.permissoes;
}

describe("cargos de acesso e permissões", () => {
  it("administrador monta um cargo; nome repetido na mesma empresa é recusado", async () => {
    const admin = await contaLogada("administrador");
    const criado = await criarCargo(admin.cookie, "Tesouraria", ["transferencias_visualizar", "transferencias_confirmar"]);
    expect(criado.statusCode).toBe(201);
    expect(criado.json().data).toMatchObject({ nome: "Tesouraria", ativo: true, pessoas: 0 });

    const repetido = await criarCargo(admin.cookie, "tesouraria", []);
    expect(repetido.statusCode).toBe(409);
    expect(repetido.json().code).toBe("CARGO_NAME_IN_USE");

    const desconhecida = await criarCargo(admin.cookie, "Outro", ["permissao_que_nao_existe"]);
    expect(desconhecida.statusCode).toBe(400);
  });

  it("sem cargo vale o acesso de antes; com cargo, só o que o cargo libera; a exceção vence", async () => {
    const admin = await contaLogada("administrador");
    const pessoa = await criarConta("usuario", admin.empresaNome);
    const sessao = await entrar(app, pessoa.email, pessoa.senha);

    const antes = await permissoesDaSessao(sessao.cookie);
    expect(antes).toContain("lancamentos_criar");
    expect(antes).not.toContain("lancamentos_pagar");
    expect(antes).not.toContain("usuarios_visualizar");

    const cargo = (await criarCargo(admin.cookie, "Consulta", ["lancamentos_visualizar", "usuarios_visualizar"])).json().data;
    const comCargoNaLista = await darCargos(admin.cookie, pessoa.usuarioId, [cargo.id]);
    expect(comCargoNaLista.json().data.cargos).toEqual([{ id: cargo.id, nome: "Consulta" }]);
    const comCargo = await permissoesDaSessao(sessao.cookie);
    expect(comCargo.sort()).toEqual(["lancamentos_visualizar", "usuarios_visualizar"]);

    const lista = await app.inject({ method: "GET", url: "/api/usuarios", headers: comSessao(sessao.cookie) });
    expect(lista.statusCode).toBe(200);
    const hoje = new Date().toISOString().slice(0, 10);
    const lancar = await app.inject({
      method: "POST",
      url: "/api/lancamentos/despesas",
      headers: comSessao(sessao.cookie),
      payload: { dataReferencia: hoje, dataVencimento: hoje, observacao: "Luz", valorOriginal: "10.00", contaNome: "CNT Cofre", grupoId: "g1s0" }
    });
    expect(lancar.statusCode).toBe(403);
    expect(lancar.json().details).toEqual({ permissao: "criar" });

    expect((await darExcecoes(admin.cookie, pessoa.usuarioId, { usuarios_visualizar: false, lancamentos_pagar: true })).statusCode).toBe(200);
    const comExcecao = await permissoesDaSessao(sessao.cookie);
    expect(comExcecao.sort()).toEqual(["lancamentos_pagar", "lancamentos_visualizar"]);

    // Cargo desativado deixa de contar na hora.
    await app.inject({ method: "PATCH", url: `/api/cargos-acesso/${cargo.id}`, headers: comSessao(admin.cookie), payload: { ativo: false } });
    expect(await permissoesDaSessao(sessao.cookie)).toEqual(["lancamentos_pagar"]);
  });

  it("quem monta acessos não libera o que não tem nem mexe nos próprios acessos", async () => {
    const admin = await contaLogada("administrador");
    const gestor = await contaLogada("usuario", admin.empresaNome);
    const outra = await criarConta("usuario", admin.empresaNome);
    const montador = (
      await criarCargo(admin.cookie, "Montador", ["permissoes_gerenciar", "usuarios_visualizar", "usuarios_gerenciar", "relatorios_visualizar"])
    ).json().data;
    const pagador = (await criarCargo(admin.cookie, "Pagador", ["lancamentos_pagar"])).json().data;
    await darCargos(admin.cookie, gestor.usuarioId, [montador.id]);

    const alem = await criarCargo(gestor.cookie, "Pagador 2", ["lancamentos_pagar"]);
    expect(alem.statusCode).toBe(403);
    expect(alem.json().code).toBe("CANNOT_GRANT");
    expect((await darCargos(gestor.cookie, outra.usuarioId, [pagador.id])).json().code).toBe("CANNOT_GRANT");

    const dentro = await criarCargo(gestor.cookie, "Leitura", ["relatorios_visualizar"]);
    expect(dentro.statusCode).toBe(201);
    expect((await darCargos(gestor.cookie, outra.usuarioId, [dentro.json().data.id])).statusCode).toBe(200);
    expect((await darExcecoes(gestor.cookie, outra.usuarioId, { lancamentos_pagar: true })).json().code).toBe("CANNOT_GRANT");

    const proprio = await darExcecoes(gestor.cookie, gestor.usuarioId, { lancamentos_pagar: true });
    expect(proprio.statusCode).toBe(409);
    expect(proprio.json().code).toBe("SELF_ACCESS");
  });

  it("cargo de outra empresa não entra e não aparece", async () => {
    const admin = await contaLogada("administrador");
    const outraEmpresa = await contaLogada("administrador");
    const alheio = (await criarCargo(outraEmpresa.cookie, "Alheio", [])).json().data;
    const pessoa = await criarConta("usuario", admin.empresaNome);

    expect((await darCargos(admin.cookie, pessoa.usuarioId, [alheio.id])).json().code).toBe("CARGO_INVALID");
    const lista = await app.inject({ method: "GET", url: "/api/cargos-acesso", headers: comSessao(admin.cookie) });
    expect(lista.json().data.cargos.map((c: { id: string }) => c.id)).not.toContain(alheio.id);
    const editar = await app.inject({ method: "PATCH", url: `/api/cargos-acesso/${alheio.id}`, headers: comSessao(admin.cookie), payload: { nome: "Meu" } });
    expect(editar.statusCode).toBe(404);
  });

  it("cargos sugeridos nascem uma vez só", async () => {
    const admin = await contaLogada("administrador");
    const primeira = await app.inject({ method: "POST", url: "/api/cargos-acesso/sugeridos", headers: comSessao(admin.cookie) });
    expect(primeira.json().data.criados).toBe(8);
    const segunda = await app.inject({ method: "POST", url: "/api/cargos-acesso/sugeridos", headers: comSessao(admin.cookie) });
    expect(segunda.json().data.criados).toBe(0);
    expect(segunda.json().data.cargos).toHaveLength(8);
  });
});

describe("contas de posto e cargos na criação", () => {
  it("cria conta de posto com cargo; o mesmo posto não tem duas contas", async () => {
    const admin = await contaLogada("administrador");
    const caixa = (await criarCargo(admin.cookie, "Caixa", ["caixa_operar", "caixa_sangria"])).json().data;
    const criado = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "PDV1 Manhã", email: "pdv1.manha@teste.local", papel: "usuario", senha: "senha-inicial-123", cargos: [caixa.id], posto: { pdv: 1, turno: "manha" } }
    });
    expect(criado.statusCode).toBe(201);
    expect(criado.json().data).toMatchObject({ posto: { pdv: 1, turno: "manha" }, cargos: [{ id: caixa.id, nome: "Caixa" }] });

    const repetido = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(admin.cookie),
      payload: { nome: "Outro", email: "pdv1.outro@teste.local", papel: "usuario", senha: "senha-inicial-123", posto: { pdv: 1, turno: "manha" } }
    });
    expect(repetido.statusCode).toBe(409);
    expect(repetido.json().code).toBe("POSTO_IN_USE");

    const tarde = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${criado.json().data.id}`,
      headers: comSessao(admin.cookie),
      payload: { posto: { pdv: 1, turno: "tarde" } }
    });
    expect(tarde.json().data.posto).toEqual({ pdv: 1, turno: "tarde" });
  });

  it("quem só gerencia usuários não cria administrador nem mexe em administrador", async () => {
    const admin = await contaLogada("administrador");
    const rh = await contaLogada("usuario", admin.empresaNome);
    const cargo = (await criarCargo(admin.cookie, "Cadastro de contas", ["usuarios_visualizar", "usuarios_gerenciar"])).json().data;
    await darCargos(admin.cookie, rh.usuarioId, [cargo.id]);

    const novoAdmin = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(rh.cookie),
      payload: { nome: "Chefe", email: "chefe@teste.local", papel: "administrador", senha: "senha-inicial-123" }
    });
    expect(novoAdmin.statusCode).toBe(403);

    const desativarAdmin = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${admin.usuarioId}`,
      headers: comSessao(rh.cookie),
      payload: { ativo: false }
    });
    expect(desativarAdmin.statusCode).toBe(403);

    const comum = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: comSessao(rh.cookie),
      payload: { nome: "Balconista", email: "balconista@teste.local", papel: "usuario", senha: "senha-inicial-123" }
    });
    expect(comum.statusCode).toBe(201);
  });
});
