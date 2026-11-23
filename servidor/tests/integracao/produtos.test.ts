import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comSessao, criarApp, criarConta, entrar } from "./ajuda.ts";

// Produtos no servidor (fase 1 do docs/PRODUTOS_NO_SERVIDOR_PLANO.md). Dados 100% fictícios.
let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await app.close();
  const { pool } = await import("../../api/src/banco/conexao.ts");
  await pool.end();
});

const WJ = "⁠";
const GRUPOS = {
  mercadorias: [
    { id: "g3", name: "BEBIDAS", active: true, icon: 0, children: [{ id: "g3s0", name: "REFRIGERANTES", active: true, icon: 0 }] },
    { id: "g10", name: "FAB. PRÓPRIA", active: true, icon: 0, children: [{ id: "g10s0", name: "PANIFICAÇÃO", active: true, icon: 0 }] }
  ],
  despesas: [], vendas: [], retiradas: [], "tipos-venda": [], bandeiras: [], operadoras: []
};
const ARVORE = { tree: [{ id: "a-lj", name: "LJ", children: [{ id: "s-vit", name: "VITRINES", children: [] }] }], history: [] };

// Empresa com grupos de mercadorias e árvore de locais, como sairia das telas do site.
async function empresaPronta() {
  const admin = await criarConta("administrador");
  const { cookie } = await entrar(app, admin.email, admin.senha);
  const r = await app.inject({
    method: "POST", url: "/api/documentos/importacao", headers: comSessao(cookie),
    payload: { itens: [
      { chave: "cicluz-financial-hierarchy-v1", valor: JSON.stringify(GRUPOS) },
      { chave: "cicluz-location-tree-v1", valor: JSON.stringify(ARVORE) }
    ] }
  });
  expect(r.statusCode).toBeLessThan(300);
  return { admin, cookie };
}

const importado = (codigo: string, extra: Record<string, unknown> = {}) => ({
  appId: "app-" + codigo, appLojaId: "tnp-" + codigo, codigoInterno: codigo, nome: "PRODUTO " + codigo, descricao: "PRODUTO " + codigo,
  tipo: "revenda", status: "ativo", calculoAutomatico: false, custo: 10.5, precoVenda: 15.9, origemGrupo: "MER " + WJ + "BEBIDAS - " + WJ + "REFRIGERANTES",
  origemLocais: ["LJ - VITRINES"], dados: { unidade: "UN", embalagem: "CX", qtdEmbalagem: 6 }, ...extra
});
const importar = (cookie: string, produtos: unknown[], maiorCodigoApp = 13213) =>
  app.inject({ method: "POST", url: "/api/produtos/importacao", headers: comSessao(cookie), payload: { produtos, maiorCodigoApp } });
const listar = (cookie: string, query = "") => app.inject({ method: "GET", url: "/api/produtos" + query, headers: comSessao(cookie) });
const novo = { nome: "PÃO DE SAL", descricao: "PÃO DE SAL", tipo: "transformacao", status: "ativo", liberadoCompra: true, calculoAutomatico: false, custo: "0.45", precoVenda: "0.90" };

describe("produtos no servidor", () => {
  it("importa do app: casa grupo e local por nome, alerta o que não casa, e reimportar não duplica", async () => {
    const { cookie } = await empresaPronta();
    const r1 = await importar(cookie, [importado("13001"), importado("13002", { origemGrupo: "", origemLocais: ["SALAO"] }), importado("13300", { status: "inativo" })]);
    expect(r1.statusCode).toBe(200);
    expect(r1.json().data).toEqual({ novos: 3, atualizados: 0 });

    const lista = (await listar(cookie, "?status=todos&ordem=codigo")).json().data;
    expect(lista.total).toBe(3);
    const [p1, p2, p3] = lista.itens;
    expect([p1.id, p1.grupoId, p1.subgrupoId, p1.localId, p1.semGrupo, p1.semLocal]).toEqual(["pi-13001", "g3", "g3s0", "s-vit", false, false]);
    expect([p1.custo, p1.precoVenda, p1.liberadoCompra]).toEqual(["10.50", "15.90", true]);
    expect([p2.semGrupo, p2.semLocal]).toEqual([true, true]);
    expect([p3.status, p3.liberadoCompra]).toEqual(["inativo", false]);
    expect(lista.contagens).toEqual({ ativos: 2, inativos: 1, semVinculo: 1, semGrupo: 1, semLocal: 1 });

    const r2 = await importar(cookie, [importado("13001", { precoVenda: 16.5 }), importado("13002", { origemGrupo: "", origemLocais: ["SALAO"] }), importado("13300", { status: "inativo" })]);
    expect(r2.json().data).toEqual({ novos: 0, atualizados: 3 });
    const depois = (await listar(cookie, "?status=todos")).json().data;
    expect(depois.total).toBe(3);
    expect(depois.itens.find((p: { id: string }) => p.id === "pi-13001").precoVenda).toBe("16.50");
  });

  it("filtra por vínculo, busca por nome sem acento, código interno e código de barras", async () => {
    const { cookie } = await empresaPronta();
    await importar(cookie, [importado("13001", { nome: "PÃO FRANCÊS", codigoBarras: "7890000000017" }), importado("13002", { origemGrupo: "" })]);
    expect((await listar(cookie, "?vinculo=sem_grupo")).json().data.itens.map((p: { id: string }) => p.id)).toEqual(["pi-13002"]);
    expect((await listar(cookie, "?busca=pao%20frances")).json().data.total).toBe(1);
    expect((await listar(cookie, "?busca=13002")).json().data.itens[0].id).toBe("pi-13002");
    expect((await listar(cookie, "?busca=7890000000017")).json().data.itens[0].id).toBe("pi-13001");
    expect((await listar(cookie, "?busca=100%25")).json().data.total).toBe(0);
  });

  it("cria com código interno do servidor, acima do maior do app, e sem repetir em criações ao mesmo tempo", async () => {
    const { cookie } = await empresaPronta();
    await importar(cookie, [importado("13001")], 13500);
    const criacoes = await Promise.all(
      Array.from({ length: 5 }, () => app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(cookie), payload: novo }))
    );
    expect(criacoes.map((r) => r.statusCode)).toEqual([201, 201, 201, 201, 201]);
    const codigos = criacoes.map((r) => r.json().data.codigoInterno).sort();
    expect(codigos).toEqual(["13501", "13502", "13503", "13504", "13505"]);
    const p = criacoes[0]!.json().data;
    expect(p.codigoBarras).toBe(p.codigoInterno);
    expect(p.id).toMatch(/^p-/);
  });

  it("empresa sem produtos: o primeiro código é 13130 (último antes do S2: 13129) e barras informado fica como veio", async () => {
    const { cookie } = await empresaPronta();
    const a = (await app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(cookie), payload: novo })).json().data;
    const b = (await app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(cookie), payload: { ...novo, codigoBarras: "7891234567895" } })).json().data;
    expect([a.codigoInterno, a.codigoBarras, b.codigoInterno, b.codigoBarras]).toEqual(["13130", "13130", "13131", "7891234567895"]);
  });

  it("edição com versão velha é recusada (409) e escolha à mão marca o vínculo como manual", async () => {
    const { cookie } = await empresaPronta();
    await importar(cookie, [importado("13002", { origemGrupo: "" })]);
    const p = (await app.inject({ method: "GET", url: "/api/produtos/item/pi-13002", headers: comSessao(cookie) })).json().data;
    const editar = (versao: number, extra: Record<string, unknown> = {}) => app.inject({
      method: "PUT", url: "/api/produtos/item/pi-13002", headers: comSessao(cookie),
      payload: { nome: p.nome, descricao: p.descricao, tipo: p.tipo, status: p.status, liberadoCompra: p.liberadoCompra, calculoAutomatico: false, custo: p.custo, precoVenda: p.precoVenda, grupoId: p.grupoId, subgrupoId: p.subgrupoId, localId: p.localId, dados: p.dados, versao, ...extra }
    });
    const ok = await editar(p.versao, { grupoId: "g10", subgrupoId: "g10s0" });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.dados.vinculoManual).toEqual({ grupo: true });
    expect(ok.json().data.semGrupo).toBe(false);
    const velho = await editar(p.versao, { nome: "OUTRO NOME" });
    expect(velho.statusCode).toBe(409);
    // Reimportar e revincular não desfazem o grupo escolhido à mão.
    await importar(cookie, [importado("13002", { origemGrupo: "" })]);
    await app.inject({ method: "POST", url: "/api/produtos/revincular", headers: comSessao(cookie) });
    const final = (await app.inject({ method: "GET", url: "/api/produtos/item/pi-13002", headers: comSessao(cookie) })).json().data;
    expect([final.grupoId, final.subgrupoId]).toEqual(["g10", "g10s0"]);
  });

  it("dinheiro com mais de 2 casas é recusado, sem arredondar calado", async () => {
    const { cookie } = await empresaPronta();
    const r = await app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(cookie), payload: { ...novo, custo: "0.455" } });
    expect(r.statusCode).toBe(400);
  });

  it("revincular casa de novo depois que a árvore de locais muda", async () => {
    const { cookie } = await empresaPronta();
    await importar(cookie, [importado("13001", { origemLocais: ["SALAO"] })]);
    expect((await listar(cookie)).json().data.itens[0].semLocal).toBe(true);
    await app.inject({
      method: "PUT", url: "/api/documentos", headers: comSessao(cookie),
      payload: { itens: [{ chave: "cicluz-location-tree-v1", valor: JSON.stringify({ tree: [{ id: "a-sal", name: "SALAO", children: [] }], history: [] }), versaoBase: 1 }] }
    });
    const r = await app.inject({ method: "POST", url: "/api/produtos/revincular", headers: comSessao(cookie) });
    expect(r.json().data.mudaram).toBe(1);
    expect((await listar(cookie)).json().data.itens[0].localId).toBe("a-sal");
  });

  it("outra empresa não enxerga; sem permissão de Compras não vê nem cria; só administrador importa", async () => {
    const { admin, cookie } = await empresaPronta();
    await importar(cookie, [importado("13001")]);
    const outra = await empresaPronta();
    expect((await listar(outra.cookie)).json().data.total).toBe(0);
    expect((await app.inject({ method: "GET", url: "/api/produtos/item/pi-13001", headers: comSessao(outra.cookie) })).statusCode).toBe(404);

    // Pessoa com cargo que não tem nada de Compras.
    const cargo = (await app.inject({ method: "POST", url: "/api/cargos-acesso", headers: comSessao(cookie), payload: { nome: "Só lançamentos", permissoes: ["lancamentos_visualizar"] } })).json().data;
    const semCargo = await criarConta("usuario", admin.empresaNome);
    await app.inject({ method: "PATCH", url: `/api/usuarios/${semCargo.usuarioId}`, headers: comSessao(cookie), payload: { cargos: [cargo.id] } });
    const s = (await entrar(app, semCargo.email, semCargo.senha)).cookie;
    expect((await listar(s)).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(s), payload: novo })).statusCode).toBe(403);
    expect((await importar(s, [importado("13009")])).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: "/api/produtos/revincular", headers: comSessao(s) })).statusCode).toBe(403);

    // Quem só VÊ Compras lista, mas não cadastra.
    const ver = (await app.inject({ method: "POST", url: "/api/cargos-acesso", headers: comSessao(cookie), payload: { nome: "Consulta Compras", permissoes: ["compras_visualizar"] } })).json().data;
    const consulta = await criarConta("usuario", admin.empresaNome);
    await app.inject({ method: "PATCH", url: `/api/usuarios/${consulta.usuarioId}`, headers: comSessao(cookie), payload: { cargos: [ver.id] } });
    const c = (await entrar(app, consulta.email, consulta.senha)).cookie;
    expect((await listar(c)).json().data.total).toBe(1);
    expect((await app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(c), payload: novo })).statusCode).toBe(403);
  });

  it("resumo traz só os ativos, com o cadastro completo", async () => {
    const { cookie } = await empresaPronta();
    await importar(cookie, [importado("13001", { dados: { unidade: "UN", embalagem: "CX", qtdEmbalagem: 6, fiscal: { ncm: "22021000" } } }), importado("13300", { status: "inativo" })]);
    const r = (await app.inject({ method: "GET", url: "/api/produtos/resumo", headers: comSessao(cookie) })).json().data;
    expect(r.ativado).toBe(true);
    expect(r.produtos.map((p: { id: string }) => p.id)).toEqual(["pi-13001"]);
    expect(r.produtos[0].dados.fiscal).toEqual({ ncm: "22021000" });
    expect([r.produtos[0].status, r.produtos[0].versao, r.produtos[0].dados.embalagem]).toEqual(["ativo", 1, "CX"]);
  });

  it("transferência do aparelho: mesmo id e código, nunca sobrescreve, diz o que faltou e ativa o catálogo", async () => {
    const { cookie } = await empresaPronta();
    expect((await app.inject({ method: "GET", url: "/api/produtos/resumo", headers: comSessao(cookie) })).json().data.ativado).toBe(false);
    const doAparelho = (id: string, codigo: string, extra: Record<string, unknown> = {}) => ({
      id, codigoInterno: codigo, nome: "ITEM " + codigo, descricao: "ITEM " + codigo, tipo: "revenda", status: "ativo",
      liberadoCompra: false, calculoAutomatico: false, precoVenda: 3, dados: { fiscal: { ncm: "1" } }, ...extra
    });
    const t = (produtos: unknown[], concluir = false) => app.inject({ method: "POST", url: "/api/produtos/transferencia", headers: comSessao(cookie), payload: { produtos, maiorCodigo: 13300, concluir } });
    const r1 = (await t([doAparelho("p-abc", "13100"), doAparelho("pi-13001", "13001", { appId: "app-13001" }), doAparelho("p-dup", "13100")])).json().data;
    expect(r1).toEqual({ recebidos: 3, presentes: 2, faltando: [{ id: "p-dup", codigoInterno: "13100" }] });
    // De novo, com o nome mudado no aparelho: o servidor NÃO sobrescreve.
    const r2 = (await t([doAparelho("p-abc", "13100", { nome: "MUDOU" })])).json().data;
    expect(r2.faltando).toEqual([]);
    const p = (await app.inject({ method: "GET", url: "/api/produtos/item/p-abc", headers: comSessao(cookie) })).json().data;
    expect([p.nome, p.liberadoCompra, p.dados.fiscal.ncm]).toEqual(["ITEM 13100", false, "1"]);
    // Lotes sozinhos não ativam o catálogo: só o pedido de conclusão.
    expect((await app.inject({ method: "GET", url: "/api/produtos/resumo", headers: comSessao(cookie) })).json().data.ativado).toBe(false);
    expect((await t([], true)).statusCode).toBe(200);
    const resumo = (await app.inject({ method: "GET", url: "/api/produtos/resumo", headers: comSessao(cookie) })).json().data;
    expect(resumo.ativado).toBe(true);
    // Produto antigo sem código interno: o servidor dá o próximo (acima do maior do aparelho), sem travar o resto.
    const r3 = (await t([{ ...doAparelho("p-sem-codigo", "x"), codigoInterno: null, codigoBarras: null }])).json().data;
    expect(r3.faltando).toEqual([]);
    const semCodigo = (await app.inject({ method: "GET", url: "/api/produtos/item/p-sem-codigo", headers: comSessao(cookie) })).json().data;
    expect([semCodigo.codigoInterno, semCodigo.codigoBarras]).toEqual(["13301", "13301"]);
    // Produto novo depois da transferência: acima do maior código do aparelho.
    const novoP = (await app.inject({ method: "POST", url: "/api/produtos", headers: comSessao(cookie), payload: novo })).json().data;
    expect(novoP.codigoInterno).toBe("13302");
  });
});
