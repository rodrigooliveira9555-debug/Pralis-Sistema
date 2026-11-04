import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { diaNegocio, somarDias } from "@cicluz/shared";
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

const hoje = () => diaNegocio(new Date());

// Empresa com cadastro financeiro e contas, como sairia das telas do site.
async function empresaPronta() {
  const admin = await criarConta("administrador");
  const { cookie } = await entrar(app, admin.email, admin.senha);
  const financeiro = {
    mercadorias: [{ id: "g0", name: "Cigarros", active: true, icon: 0, children: [] }],
    despesas: [
      { id: "g1", name: "Energia", active: true, icon: 0, children: [{ id: "g1s0", name: "Luz da loja", active: true, icon: 0 }] }
    ],
    vendas: [],
    retiradas: [{ id: "ret-g0", name: "Sócios", active: true, icon: 0, children: [] }],
    "tipos-venda": [],
    bandeiras: [],
    operadoras: []
  };
  await app.inject({
    method: "POST",
    url: "/api/documentos/importacao",
    headers: comSessao(cookie),
    payload: {
      itens: [
        { chave: "cicluz-financial-hierarchy-v1", valor: JSON.stringify(financeiro) },
        { chave: "cicluz-ti-groups-v1", valor: JSON.stringify({ contas: ["CNT Cofre"] }) }
      ]
    }
  });
  return { ...admin, cookie };
}

function lancar(cookie: string, categoria: string, corpo: Record<string, unknown>) {
  return app.inject({ method: "POST", url: `/api/lancamentos/${categoria}`, headers: comSessao(cookie), payload: corpo });
}

const base = () => ({
  dataReferencia: hoje(),
  dataVencimento: somarDias(hoje(), 10),
  observacao: "Conta de luz",
  valorOriginal: "300.00",
  contaNome: "CNT Cofre",
  grupoId: "g1s0"
});

describe("lançamentos", () => {
  it("cria despesa com juros calculado pelo servidor (2% sobre o valor, um arredondamento)", async () => {
    const admin = await empresaPronta();
    const resposta = await lancar(admin.cookie, "despesas", { ...base(), valorOriginal: "333.33", jurosTipo: "percentual", jurosValorInformado: "2" });
    expect(resposta.statusCode).toBe(201);
    const { id } = resposta.json().data;
    const detalhe = (await app.inject({ method: "GET", url: `/api/lancamentos/item/${id}`, headers: comSessao(admin.cookie) })).json().data;
    expect(detalhe).toMatchObject({ valorAcrescimo: "6.67", valorTotal: "340.00", grupoNome: "Luz da loja", pendenteDiscriminacao: true });
  });

  it("observação, conta e grupo do cadastro são conferidos", async () => {
    const admin = await empresaPronta();
    expect((await lancar(admin.cookie, "despesas", { ...base(), observacao: " " })).statusCode).toBe(400);
    expect((await lancar(admin.cookie, "despesas", { ...base(), contaNome: "Conta que não existe" })).json().code).toBe("CONTA_DESCONHECIDA");
    // Grupo de retirada não serve para despesa.
    expect((await lancar(admin.cookie, "despesas", { ...base(), grupoId: "ret-g0" })).json().code).toBe("GRUPO_DESCONHECIDO");
  });

  it("discriminação: soma diferente do valor bloqueia (D5) e o desconto geral é rateado com sobra no último (D4)", async () => {
    const admin = await empresaPronta();
    const itens = [
      { descricao: "Lâmpada", quantidade: "1", valorUnitario: "100" },
      { descricao: "Reator", quantidade: "1", valorUnitario: "100" },
      { descricao: "Fio", quantidade: "1", valorUnitario: "100" }
    ];
    const divergente = await lancar(admin.cookie, "despesas", { ...base(), valorOriginal: "299.00", itens });
    expect(divergente.statusCode).toBe(422);
    expect(divergente.json()).toMatchObject({ code: "DISCRIMINACAO_DIVERGENTE", details: { diferenca: "1.00", linhaProvavel: 1 } });

    const certo = await lancar(admin.cookie, "despesas", { ...base(), itens, descontoGeralTipo: "valor", descontoGeralValor: "10" });
    expect(certo.statusCode).toBe(201);
    const detalhe = (await app.inject({ method: "GET", url: `/api/lancamentos/item/${certo.json().data.id}`, headers: comSessao(admin.cookie) })).json().data;
    expect(detalhe.valorDesconto).toBe("10.00");
    expect(detalhe.valorTotal).toBe("290.00");
    expect(detalhe.itens.map((i: { valorTotalComDesconto: string }) => i.valorTotalComDesconto)).toEqual(["96.67", "96.67", "96.66"]);
  });

  it("retirada não tem discriminação nem desconto (D12)", async () => {
    const admin = await empresaPronta();
    const resposta = await lancar(admin.cookie, "retiradas", { ...base(), grupoId: "ret-g0", itens: [{ descricao: "x", valorUnitario: "300" }] });
    expect(resposta.statusCode).toBe(400);
  });

  it("data de pagamento: despesa retroativa só o administrador; retirada retroativa ninguém; usuário não paga", async () => {
    const admin = await empresaPronta();
    const ontem = somarDias(hoje(), -1);
    expect((await lancar(admin.cookie, "despesas", { ...base(), dataPagamento: ontem })).statusCode).toBe(201);
    expect((await lancar(admin.cookie, "retiradas", { ...base(), grupoId: "ret-g0", dataPagamento: ontem })).statusCode).toBe(400);

    const colega = await criarConta("usuario", admin.empresaNome);
    const { cookie } = await entrar(app, colega.email, colega.senha);
    expect((await lancar(cookie, "despesas", base())).statusCode).toBe(201);
    expect((await lancar(cookie, "despesas", { ...base(), dataPagamento: hoje() })).statusCode).toBe(403);
  });

  it("recorrência mensal cria a série inteira; só o administrador; cancelar apaga só as futuras não pagas", async () => {
    const admin = await empresaPronta();
    const corpo = { ...base(), dataVencimento: hoje(), dataPagamento: hoje(), recorrencia: { frequencia: "mes", repeticoes: 24 } };
    const criada = await lancar(admin.cookie, "despesas", corpo);
    expect(criada.statusCode).toBe(201);
    // Teto de 12 meses (D3): 24 pedidas → 13 datas (hoje + 12 meses).
    expect(criada.json().data).toMatchObject({ serie: 13, serieLimitada: true });

    const lista = (await app.inject({ method: "GET", url: "/api/lancamentos/despesas?pageSize=100", headers: comSessao(admin.cookie) })).json().data;
    expect(lista.total).toBe(13);
    const recorrenciaId = lista.lancamentos[0].recorrenciaId;

    const colega = await criarConta("usuario", admin.empresaNome);
    const { cookie } = await entrar(app, colega.email, colega.senha);
    expect((await lancar(cookie, "despesas", corpo)).statusCode).toBe(403);

    const cancelada = await app.inject({ method: "PATCH", url: `/api/lancamentos/series/${recorrenciaId}/cancelar`, headers: comSessao(admin.cookie) });
    expect(cancelada.json().data.removidas).toBe(12);
    const depois = (await app.inject({ method: "GET", url: "/api/lancamentos/despesas", headers: comSessao(admin.cookie) })).json().data;
    expect(depois.total).toBe(1);
  });

  it("lançamento pago: o usuário não edita; o administrador edita", async () => {
    const admin = await empresaPronta();
    const { id } = (await lancar(admin.cookie, "despesas", { ...base(), dataPagamento: hoje() })).json().data;
    const colega = await criarConta("usuario", admin.empresaNome);
    const { cookie } = await entrar(app, colega.email, colega.senha);
    const editar = (c: string) =>
      app.inject({ method: "PUT", url: `/api/lancamentos/item/${id}`, headers: comSessao(c), payload: { ...base(), dataPagamento: hoje(), observacao: "Luz corrigida" } });
    expect((await editar(cookie)).statusCode).toBe(403);
    expect((await editar(admin.cookie)).statusCode).toBe(200);
  });

  it("discriminar depois confere contra o valor já gravado; outra empresa não enxerga", async () => {
    const admin = await empresaPronta();
    const { id } = (await lancar(admin.cookie, "mercadorias", { ...base(), grupoId: "g0", valorOriginal: "50" })).json().data;
    const discriminar = (itens: unknown[]) =>
      app.inject({ method: "PATCH", url: `/api/lancamentos/item/${id}/discriminar`, headers: comSessao(admin.cookie), payload: { itens } });
    expect((await discriminar([{ descricao: "Maço", quantidade: "4", valorUnitario: "12" }])).statusCode).toBe(422);
    expect((await discriminar([{ descricao: "Maço", quantidade: "4", valorUnitario: "12.5", grupoId: "g0" }])).statusCode).toBe(200);

    const outra = await empresaPronta();
    const visto = await app.inject({ method: "GET", url: `/api/lancamentos/item/${id}`, headers: comSessao(outra.cookie) });
    expect(visto.statusCode).toBe(404);
  });

  it("valores fora do contrato voltam 400 (nada de 500 nem de casa cortada calada)", async () => {
    const admin = await empresaPronta();
    for (const ruim of [{ valorOriginal: -5 }, { valorOriginal: "10.999" }, { valorOriginal: 1e-7 }, { valorOriginal: 1e15 }]) {
      const resposta = await lancar(admin.cookie, "despesas", { ...base(), ...ruim });
      expect(resposta.statusCode, JSON.stringify(ruim)).toBe(400);
    }
    const itemRuim = await lancar(admin.cookie, "despesas", {
      ...base(),
      valorOriginal: "10",
      itens: [{ descricao: "x", quantidade: "0", valorUnitario: "10" }]
    });
    expect(itemRuim.statusCode).toBe(400);
    const jurosEmReaisComTresCasas = await lancar(admin.cookie, "despesas", { ...base(), jurosTipo: "valor", jurosValorInformado: "1.234" });
    expect(jurosEmReaisComTresCasas.statusCode).toBe(400);
  });

  it("edição concorrente: quem salva com a versão velha recebe 409 e nada se perde", async () => {
    const admin = await empresaPronta();
    const { id } = (await lancar(admin.cookie, "despesas", base())).json().data;
    const aberto = (await app.inject({ method: "GET", url: `/api/lancamentos/item/${id}`, headers: comSessao(admin.cookie) })).json().data;
    // Outra pessoa discrimina primeiro.
    const discriminou = await app.inject({
      method: "PATCH",
      url: `/api/lancamentos/item/${id}/discriminar`,
      headers: comSessao(admin.cookie),
      payload: { itens: [{ descricao: "Luz", valorUnitario: "300" }], atualizadoEmBase: aberto.atualizadoEm }
    });
    expect(discriminou.statusCode).toBe(200);
    // A primeira tela, ainda com a versão antiga, tenta salvar sem itens.
    const atrasada = await app.inject({
      method: "PUT",
      url: `/api/lancamentos/item/${id}`,
      headers: comSessao(admin.cookie),
      payload: { ...base(), observacao: "Luz", atualizadoEmBase: aberto.atualizadoEm }
    });
    expect(atrasada.statusCode).toBe(409);
    expect(atrasada.json().code).toBe("LANCAMENTO_ALTERADO");
    const depois = (await app.inject({ method: "GET", url: `/api/lancamentos/item/${id}`, headers: comSessao(admin.cookie) })).json().data;
    expect(depois.itens).toHaveLength(1);
  });

  it("lista por período e situação com total", async () => {
    const admin = await empresaPronta();
    await lancar(admin.cookie, "despesas", { ...base(), valorOriginal: "10" });
    await lancar(admin.cookie, "despesas", { ...base(), valorOriginal: "20", dataPagamento: hoje() });
    const pendentes = (await app.inject({ method: "GET", url: "/api/lancamentos/despesas?situacao=pendentes", headers: comSessao(admin.cookie) })).json().data;
    expect(pendentes).toMatchObject({ total: 1, valorTotal: "10.00" });
    const todos = (await app.inject({ method: "GET", url: "/api/lancamentos/despesas", headers: comSessao(admin.cookie) })).json().data;
    expect(todos).toMatchObject({ total: 2, valorTotal: "30.00" });
  });
});
