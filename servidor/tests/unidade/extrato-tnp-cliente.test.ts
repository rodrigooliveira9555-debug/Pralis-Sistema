import { afterEach, describe, expect, it, vi } from "vitest";
import { consultaExtratoTnpSchema } from "@cicluz/shared";
import { env } from "../../api/src/env.ts";
import { buscarExtrato } from "../../api/src/extrato-tnp/extrato-tnp.cliente.ts";

// Cliente do coletor do extrato da TNP (Pluggy): sem banco, fetch falso. Confere token no cabeçalho, lista branca,
// centavos inteiros e como cada falha do coletor vira erro claro para a tela.
const TOKEN = "tnp-extrato-teste-".padEnd(48, "k");
const consulta = consultaExtratoTnpSchema.parse({
  desde: "2026-11-21",
  ate: "2026-11-24",
});

afterEach(() => {
  vi.unstubAllGlobals();
  env.TNP_EXTRATO_URL = "";
  env.TNP_EXTRATO_TOKEN = "";
  env.TNP_EXTRATO_EMPRESA_ID = "";
});

function configurar() {
  env.TNP_EXTRATO_URL = "https://extrato.exemplo.test";
  env.TNP_EXTRATO_TOKEN = TOKEN;
  env.TNP_EXTRATO_EMPRESA_ID = "33333333-3333-4333-8333-333333333333";
}
const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("extrato da TNP - cliente do coletor", () => {
  it("Deve_RecusarSemConfiguracao_SemChamarOColetor", async () => {
    const falso = vi.fn();
    vi.stubGlobal("fetch", falso);
    await expect(buscarExtrato(consulta)).rejects.toMatchObject({
      status: 503,
      code: "EXTRATO_NAO_CONFIGURADO",
    });
    expect(falso).not.toHaveBeenCalled();
  });

  it("Deve_MandarOTokenNoCabecalho_E_FiltrarOsCampos", async () => {
    configurar();
    const falso = vi.fn(async () =>
      resposta(200, {
        ok: true,
        geradoEm: "2026-11-24T18:52:02.090Z",
        conexoes: [
          {
            instituicao: "MeuPluggy",
            situacao: "UPDATED",
            atualizadoNaPluggy: "2026-11-24T09:00:00.000Z",
            segredo: "x",
          },
        ],
        contas: [
          {
            contaId: "c1",
            tipo: "BANK",
            subtipo: "CHECKING_ACCOUNT",
            nome: "CAIXA PJ",
            numero: "1234/567-8",
            titular: "EMPRESA",
            saldoCentavos: 152035,
          },
        ],
        todasAsContas: [
          { contaId: "c1", tipo: "BANK", subtipo: "CHECKING_ACCOUNT", nome: "CAIXA PJ", numero: "1234/567-8" },
          { contaId: "k1", tipo: "CREDIT", subtipo: "CREDIT_CARD", nome: "CAIXA VISA EMPRESARIAL", numero: "7347", limite: 1 },
        ],
        saldoTotalCentavos: 152035,
        hoje: {
          dia: "2026-11-24",
          entradas: 185000,
          saidas: -31290,
          liquido: 153710,
          quantidade: 3,
          pendentes: 1,
        },
        periodo: {
          desde: "2026-11-21",
          ate: "2026-11-24",
          entradas: 1,
          saidas: -1,
          liquido: 0,
          quantidade: 2,
          pendentes: 0,
        },
        dias: [
          {
            dia: "2026-11-24",
            entradas: 1,
            saidas: 0,
            lancamentos: [
              {
                transacaoId: "t1",
                contaId: "c1",
                data: "2026-11-24T14:22:00.000Z",
                dia: "2026-11-24",
                descricao: "PIX RECEBIDO",
                valorCentavos: 64000,
                tipo: "CREDIT",
                situacao: "PENDING",
                saldoCentavos: null,
                idNoBanco: "123",
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", falso);
    const extrato = await buscarExtrato(consulta);
    const [url, opcoes] = falso.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://extrato.exemplo.test/api/v1/extrato?desde=2026-11-21&ate=2026-11-24",
    );
    expect((opcoes.headers as Record<string, string>)["authorization"]).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(opcoes.redirect).toBe("error");
    expect(extrato.saldoTotalCentavos).toBe(152035);
    expect(extrato.hoje).toMatchObject({
      entradas: 185000,
      saidas: -31290,
      pendentes: 1,
    });
    expect(extrato.conexoes[0]).not.toHaveProperty("segredo");
    expect(extrato.contas[0]).not.toHaveProperty("titular");
    expect(extrato.contas[0]).toMatchObject({ tipo: "BANK", subtipo: "CHECKING_ACCOUNT" });
    expect(extrato.todasAsContas.map((c) => c.tipo)).toEqual(["BANK", "CREDIT"]);
    expect(extrato.todasAsContas[1]).not.toHaveProperty("limite");
    expect(extrato.dias[0]?.lancamentos[0]).toMatchObject({
      valorCentavos: 64000,
      situacao: "PENDING",
      saldoCentavos: null,
      operacao: null,
    });
    expect(extrato.dias[0]?.lancamentos[0]).not.toHaveProperty("idNoBanco");
    expect(extrato.dias[0]?.lancamentos[0]?.detalhes).toEqual({});
    expect(extrato.faturas).toEqual([]);
    expect(extrato.investimentos).toEqual([]);
  });

  it("Deve_PassarLimitesFaturasAplicacoesEDetalhes_SoComOsCamposConhecidos", async () => {
    configurar();
    const cartao = {
      contaId: "k1",
      tipo: "CREDIT",
      subtipo: "CREDIT_CARD",
      nome: "CAIXA VISA EMPRESARIAL",
      numero: "7347",
      saldoCentavos: 416543,
      detalhes: { bandeira: "VISA", limiteCentavos: 2000000, disponivelCentavos: 1583457, vencimento: "2026-12-10", segredo: "x" },
    };
    vi.stubGlobal("fetch", vi.fn(async () =>
      resposta(200, {
        ok: true,
        conexoes: [],
        contas: [cartao],
        todasAsContas: [cartao],
        faturas: [{ faturaId: "f1", vencimento: "2026-12-10", totalCentavos: 416543, minimoCentavos: 62481, encargosCentavos: 0, pagoCentavos: 0, parcelavel: true, extra: 1 }],
        investimentos: [{ investimentoId: "i1", nome: "POUPANÇA", saldoCentavos: 250050, rentabilidade12m: 6.8, cnpjEmissor: "x" }],
        dias: [{
          dia: "2026-11-24",
          entradas: 0,
          saidas: -8990,
          lancamentos: [{
            transacaoId: "t1", contaId: "k1", data: "2026-11-24T00:00:00.000Z", dia: "2026-11-24", descricao: "MERCADO", valorCentavos: -8990,
            tipo: "DEBIT", situacao: "POSTED", categoria: "Groceries",
            detalhes: {
              forma: "PIX",
              documento: { tipo: "CPF", numero: "***.456.789-**" },
              estabelecimento: { nome: "MERCADO LTDA", cnpj: "11.222.333/0001-44", ramo: "Groceries", desconhecido: "x" },
              cartao: { final: "7347", parcela: 2, parcelas: 6, mcc: "5411", outra: "x" },
              payload: { cru: true },
            },
          }],
        }],
      }),
    ));
    const extrato = await buscarExtrato(consulta);
    expect(extrato.contas[0]?.detalhes).toEqual({ bandeira: "VISA", limiteCentavos: 2000000, disponivelCentavos: 1583457, vencimento: "2026-12-10" });
    expect(extrato.faturas[0]).toEqual({ faturaId: "f1", vencimento: "2026-12-10", fechamento: null, totalCentavos: 416543, minimoCentavos: 62481, encargosCentavos: 0, pagoCentavos: 0, parcelavel: true });
    expect(extrato.investimentos[0]).not.toHaveProperty("cnpjEmissor");
    expect(extrato.investimentos[0]?.rentabilidade12m).toBe(6.8);
    const l = extrato.dias[0]?.lancamentos[0];
    expect(l?.categoria).toBe("Groceries");
    expect(l?.detalhes).toEqual({
      forma: "PIX",
      documento: { tipo: "CPF", numero: "***.456.789-**" },
      estabelecimento: { nome: "MERCADO LTDA", cnpj: "11.222.333/0001-44", ramo: "Groceries" },
      cartao: { final: "7347", parcela: 2, parcelas: 6, mcc: 5411 },
    });
  });

  it("Deve_MascararDocumentoAberto_DescartarItemNulo_CortarTexto_E_RecusarRespostaGigante", async () => {
    configurar();
    vi.stubGlobal("fetch", vi.fn(async () =>
      resposta(200, {
        ok: true,
        contas: [null, { contaId: "c1", nome: "X".repeat(500) }],
        dias: [{ dia: "2026-11-24", lancamentos: [null, {
          transacaoId: "t1", contaId: "c1", data: "2026-11-24T00:00:00.000Z", dia: "2026-11-24", descricao: "D".repeat(500), valorCentavos: 1,
          detalhes: { documento: { tipo: "CPF", numero: "123.456.789-00" } },
        }] }],
      }),
    ));
    const extrato = await buscarExtrato(consulta);
    expect(extrato.contas).toHaveLength(1);
    expect(extrato.contas[0]?.nome).toHaveLength(200);
    expect(extrato.dias[0]?.lancamentos).toHaveLength(1);
    expect(extrato.dias[0]?.lancamentos[0]?.descricao).toHaveLength(200);
    expect(extrato.dias[0]?.lancamentos[0]?.detalhes.documento).toEqual({ tipo: "CPF", numero: "***" });

    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("x", { status: 200, headers: { "content-length": String(6 * 1024 * 1024) } }),
    ));
    await expect(buscarExtrato(consulta)).rejects.toMatchObject({ status: 503, code: "EXTRATO_INDISPONIVEL" });
  });

  it("Deve_TraduzirAsFalhasDoColetor", async () => {
    configurar();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta(401, {})),
    );
    await expect(buscarExtrato(consulta)).rejects.toMatchObject({
      status: 503,
      code: "EXTRATO_TOKEN_RECUSADO",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        resposta(400, { mensagem: "Período maior que 31 dias" }),
      ),
    );
    await expect(buscarExtrato(consulta)).rejects.toMatchObject({
      status: 400,
      message: "Período maior que 31 dias",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(buscarExtrato(consulta)).rejects.toMatchObject({
      status: 503,
      code: "EXTRATO_INDISPONIVEL",
    });
  });

  it("Deve_LimitarOPeriodoA31Dias", () => {
    expect(() =>
      consultaExtratoTnpSchema.parse({
        desde: "2026-10-24",
        ate: "2026-11-24",
      }),
    ).toThrow();
    expect(
      consultaExtratoTnpSchema.parse({
        desde: "2026-10-25",
        ate: "2026-11-24",
      }),
    ).toMatchObject({ desde: "2026-10-25" });
    expect(() =>
      consultaExtratoTnpSchema.parse({
        desde: "2026-11-25",
        ate: "2026-11-24",
      }),
    ).toThrow();
  });
});
