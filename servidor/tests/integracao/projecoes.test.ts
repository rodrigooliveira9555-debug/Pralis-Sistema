import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import catalogo from "@cicluz/db/dados/cargos-referencia.json" with { type: "json" };
// @ts-expect-error script .mjs sem tipos
import { lerCatalogoDaTela } from "../../scripts/extrair-cargos-referencia.mjs";
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

// Documento no formato que groups.js grava (seed + uma operadora editada na tela).
function financeiro(regras: Array<Record<string, string>>) {
  return JSON.stringify({
    mercadorias: [{ id: "g0", name: "Cigarros", active: true, icon: 0, purpose: "VENDA", children: [{ id: "g0s0", name: "Souza Cruz", active: true, icon: 0 }] }],
    despesas: [
      { id: "g23", name: "Desp. Bancárias", active: true, icon: 0, directEntry: true, children: [{ id: "g23s0", name: "Taxas de cartão", active: true, icon: 0 }] }
    ],
    vendas: [{ id: "g0", name: "Caixa PDV", active: true, icon: 0, children: [{ id: "g0s0", name: "1M", active: true, icon: 0 }] }],
    retiradas: [],
    "tipos-venda": [{ id: "sale-type-1", name: "II - CRÉDITO (VND)", active: true, icon: 0, children: [] }],
    bandeiras: [{ id: "brand-7", name: "Visa", active: true, icon: 0, saleTypeId: "sale-type-1", children: [] }],
    operadoras: [
      {
        id: "operator-0",
        name: "Stone",
        active: true,
        icon: "operator:stone",
        identityMode: "icon",
        sigla: "STO",
        color: "#22c55e",
        document: "DOC/F",
        children: [],
        fees: { overhead: "Aluguel R$ 89", brands: { "brand-7": regras } }
      }
    ]
  });
}

const regra = (extra: Record<string, string> = {}) => ({
  start: "2026-01-01",
  end: "",
  mode: "Crédito à vista",
  from: "",
  to: "",
  mdr: "1.99",
  fixed: "0.5",
  advanceMode: "Sem antecipação",
  advance: "",
  period: "Selecione",
  days: "30",
  dayKind: "Dias corridos",
  notes: "",
  expenseId: "g23s0",
  accountGroup: "CNT Conta - Stone",
  ...extra
});

async function empresaComDados(documentos: Array<{ chave: string; valor: string }>) {
  const conta = await criarConta("administrador");
  const { cookie } = await entrar(app, conta.email, conta.senha);
  const resposta = await app.inject({ method: "POST", url: "/api/documentos/importacao", headers: comSessao(cookie), payload: { itens: documentos } });
  expect(resposta.statusCode).toBe(201);
  return { ...conta, cookie };
}

const get = (cookie: string, url: string) => app.inject({ method: "GET", url, headers: comSessao(cookie) }).then((r) => r.json().data);

async function situacao(cookie: string, assunto: string) {
  const dados = await get(cookie, "/api/projecoes");
  return dados.assuntos.find((a: { assunto: string }) => a.assunto === assunto);
}

describe("financeiro em tabelas", () => {
  it("monta grupos, bandeira ligada ao tipo de venda e taxa com os valores exatos da tela", async () => {
    const admin = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra()]) }]);
    expect(await situacao(admin.cookie, "financeiro")).toMatchObject({ situacao: "ok" });

    const grupos = (await get(admin.cookie, "/api/financeiro/grupos?colecao=despesas")).grupos;
    expect(grupos.map((g: { itemId: string }) => g.itemId)).toEqual(["g23", "g23s0"]);
    expect(grupos[0]).toMatchObject({ lancamentoDireto: true });

    const [bandeira] = (await get(admin.cookie, "/api/financeiro/bandeiras")).bandeiras;
    expect(bandeira).toMatchObject({ itemId: "brand-7", tipoVendaId: "sale-type-1" });

    const [taxa] = (await get(admin.cookie, "/api/financeiro/taxas?data=2026-11-03")).taxas;
    expect(taxa).toMatchObject({
      operadoraId: "operator-0",
      bandeiraId: "brand-7",
      mdrPercentual: "1.9900",
      tarifaReais: "0.5000",
      antecipacaoPeriodo: null,
      prazoDias: 30,
      contaNome: "CNT Conta - Stone"
    });
    expect((await get(admin.cookie, "/api/financeiro/taxas?data=2025-12-31")).taxas).toHaveLength(0);
  });

  it("vigências sobrepostas na mesma modalidade: o documento salva, as tabelas ficam na versão boa e a falha diz por quê", async () => {
    const admin = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra()]) }]);
    const sobreposta = financeiro([regra(), regra({ start: "2026-06-01", mdr: "2.50" })]);
    const gravou = await app.inject({
      method: "PUT",
      url: "/api/documentos",
      headers: comSessao(admin.cookie),
      payload: { itens: [{ chave: HIERARQUIA, valor: sobreposta, versaoBase: 1 }] }
    });
    expect(gravou.statusCode).toBe(200);
    expect(await situacao(admin.cookie, "financeiro")).toMatchObject({
      situacao: "falha",
      mensagem: expect.stringContaining("sobrepostas")
    });
    expect((await get(admin.cookie, "/api/financeiro/taxas")).taxas).toHaveLength(1);
  });

  it("taxa apontando para grupo de despesa excluído vira falha com a localização", async () => {
    const admin = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra({ expenseId: "grupo-apagado" })]) }]);
    expect(await situacao(admin.cookie, "financeiro")).toMatchObject({
      situacao: "falha",
      mensagem: expect.stringContaining('Operadora "Stone", bandeira "Visa", condição 1')
    });
  });
});

describe("contas, cargos, salários, locais e organograma em tabelas", () => {
  it("monta tudo e calcula o salário vigente como a tela", async () => {
    const admin = await empresaComDados([
      { chave: "cicluz-ti-groups-v1", valor: JSON.stringify({ contas: ["CNT Conta - Stone", "CNT Cofre Principal"] }) },
      { chave: "cicluz-ti-account-details-v1", valor: JSON.stringify({ "CNT Cofre Principal": { document: "", status: "INATIVA", icon: "safe", color: "#f97316" } }) },
      { chave: "cicluz-cargos-v1", valor: JSON.stringify([{ nome: "Confeiteiro Chefe", cbo: "8483-05", valor: "R$ 3.200,00", ano: "2026", origem: "local" }]) },
      { chave: "cicluz-cargos-referencia-v1", valor: JSON.stringify({ "0": { deleted: true } }) },
      {
        chave: "cicluz-salarios-vigencias-v1",
        valor: JSON.stringify([
          { start: "2026-01-01", note: "", values: [{ key: "local:0", nome: "Confeiteiro Chefe", valor: 3000 }] },
          { start: "2026-07-01", note: "", values: [{ key: "local:0", nome: "Confeiteiro Chefe", valor: 3250.5 }] },
          { start: "2027-01-01", note: "", values: [{ key: "local:0", nome: "Confeiteiro Chefe", valor: 3500 }] }
        ])
      },
      {
        chave: "cicluz-location-tree-v1",
        valor: JSON.stringify({
          tree: [{ id: "a1", name: "Produção", icon: 0, color: "#7c3aed", children: [{ id: "s1", name: "Confeitaria", icon: 3, children: [] }] }],
          history: []
        })
      },
      {
        chave: "cicluz-organogram-positions-v1",
        valor: JSON.stringify({
          nodes: [{ id: "p1", jobKey: "local:0", jobName: "Confeiteiro Chefe", cbo: "8483-05", quantity: 1, label: "", children: [] }],
          versions: []
        })
      }
    ]);

    for (const assunto of ["contas", "cargos", "salarios", "locais", "organograma"]) {
      expect(await situacao(admin.cookie, assunto)).toMatchObject({ situacao: "ok" });
    }
    const contas = (await get(admin.cookie, "/api/contas")).contas;
    expect(contas).toEqual([
      expect.objectContaining({ nome: "CNT Conta - Stone", situacao: "ATIVA", ordem: 0 }),
      expect.objectContaining({ nome: "CNT Cofre Principal", situacao: "INATIVA", icone: "safe" })
    ]);

    const cargos = (await get(admin.cookie, "/api/cargos")).cargos;
    expect(cargos).toHaveLength(1 + catalogo.length - 1);
    expect(cargos[0]).toMatchObject({ chave: "local:0", valorFicha: "R$ 3.200,00" });
    expect(cargos.some((c: { chave: string }) => c.chave === "ref:0")).toBe(false);

    const salarios = await get(admin.cookie, "/api/salarios/vigentes?data=2026-11-03");
    expect(salarios.salarios).toEqual([expect.objectContaining({ cargoChave: "local:0", valorReais: "3250.5000", inicio: "2026-07-01" })]);

    const locais = (await get(admin.cookie, "/api/locais")).locais;
    expect(locais.map((l: { id: string; nivel: number }) => [l.id, l.nivel])).toEqual([["a1", 1], ["s1", 2]]);

    const posicoes = (await get(admin.cookie, "/api/organograma")).posicoes;
    expect(posicoes).toEqual([expect.objectContaining({ id: "p1", cargoNome: "Confeiteiro Chefe" })]);
  });

  it("salário zerado vira falha; o resto continua", async () => {
    const admin = await empresaComDados([
      { chave: "cicluz-salarios-vigencias-v1", valor: JSON.stringify([{ start: "2026-01-01", values: [{ key: "ref:1", nome: "X", valor: 0 }] }]) },
      { chave: "cicluz-ti-groups-v1", valor: JSON.stringify({ contas: ["CNT A"] }) }
    ]);
    expect(await situacao(admin.cookie, "salarios")).toMatchObject({ situacao: "falha", mensagem: expect.stringContaining("maior que zero") });
    expect(await situacao(admin.cookie, "contas")).toMatchObject({ situacao: "ok" });
  });

  it("reprocessar reconstrói todos os assuntos", async () => {
    const admin = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra()]) }]);
    const resposta = await app.inject({ method: "POST", url: "/api/projecoes/reprocessar", headers: comSessao(admin.cookie) });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data.assuntos.length).toBe(8);
  });
});

describe("casos do pré-mortem", () => {
  it("tarifa com 4 casas fica exata; com 5 casas ou em formato estranho vira falha, sem arredondar", async () => {
    const admin = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra({ fixed: "0.0125" })]) }]);
    const [taxa] = (await get(admin.cookie, "/api/financeiro/taxas")).taxas;
    expect(taxa.tarifaReais).toBe("0.0125");

    for (const ruim of [{ fixed: "0.00001" }, { mdr: "1e1" }, { fixed: "1,50" }]) {
      const outra = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra(ruim)]) }]);
      expect(await situacao(outra.cookie, "financeiro")).toMatchObject({ situacao: "falha" });
    }
  });

  it("dois aparelhos gravando contas e detalhes ao mesmo tempo: a tabela final bate com os dois documentos", async () => {
    const admin = await empresaComDados([
      { chave: "cicluz-ti-groups-v1", valor: JSON.stringify({ contas: ["CNT A"] }) },
      { chave: "cicluz-ti-account-details-v1", valor: JSON.stringify({}) }
    ]);
    const gravar = (chave: string, valor: unknown) =>
      app.inject({ method: "PUT", url: "/api/documentos", headers: comSessao(admin.cookie), payload: { itens: [{ chave, valor: JSON.stringify(valor), versaoBase: 1 }] } });
    const [a, b] = await Promise.all([
      gravar("cicluz-ti-groups-v1", { contas: ["CNT A", "CNT B"] }),
      gravar("cicluz-ti-account-details-v1", { "CNT A": { status: "INATIVA", icon: "bank" } })
    ]);
    expect([a.statusCode, b.statusCode]).toEqual([200, 200]);
    expect(await situacao(admin.cookie, "contas")).toMatchObject({ situacao: "ok" });
    const contas = (await get(admin.cookie, "/api/contas")).contas;
    expect(contas.map((c: { nome: string; situacao: string }) => `${c.nome}:${c.situacao}`)).toEqual(["CNT A:INATIVA", "CNT B:ATIVA"]);
  });

  it("gravação que ficou sem projeção (janela do deploy) é reconstruída na conferência", async () => {
    const admin = await empresaComDados([{ chave: "cicluz-ti-groups-v1", valor: JSON.stringify({ contas: ["CNT A"] }) }]);
    const { banco } = await import("../../api/src/banco/conexao.ts");
    const { documentos } = await import("@cicluz/db/schema");
    const { and, eq } = await import("drizzle-orm");
    // Simula a versão antiga da API gravando o documento sem reconstruir as tabelas.
    await banco
      .update(documentos)
      .set({ valor: JSON.stringify({ contas: ["CNT A", "CNT Nova"] }), versao: 2 })
      .where(and(eq(documentos.empresaId, admin.empresaId), eq(documentos.chave, "cicluz-ti-groups-v1")));

    const { assuntosDefasados, reprocessarDefasadas } = await import("../../api/src/projecoes/projecoes.service.ts");
    expect((await assuntosDefasados(admin.empresaId)).map((p) => p.assunto)).toEqual(["contas"]);
    await reprocessarDefasadas(() => undefined);
    expect((await get(admin.cookie, "/api/contas")).contas).toHaveLength(2);
    expect(await assuntosDefasados(admin.empresaId)).toEqual([]);
  });

  it("toda consulta informa a situação do assunto", async () => {
    const admin = await empresaComDados([{ chave: HIERARQUIA, valor: financeiro([regra({ expenseId: "apagado" })]) }]);
    const dados = await get(admin.cookie, "/api/financeiro/taxas");
    expect(dados.situacao).toEqual([expect.objectContaining({ assunto: "financeiro", situacao: "falha" })]);
  });
});

describe("catálogo de cargos de referência", () => {
  it("a cópia do servidor é igual à da tela (rode scripts/extrair-cargos-referencia.mjs se mudar)", () => {
    const daTela = lerCatalogoDaTela(fileURLToPath(new URL("../../../dist/index.html", import.meta.url)));
    expect(catalogo).toEqual(daTela);
  });
});
