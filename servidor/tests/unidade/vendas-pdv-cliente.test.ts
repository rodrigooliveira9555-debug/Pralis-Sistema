import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { consultaVendasPdvSchema } from "@cicluz/shared";

// Cliente do S1 (vendas dos PDVs): sem banco. O fetch é falso; confere o que sai (URL, token no cabeçalho,
// janela de hora) e como cada falha do S1 vira erro claro para a tela, sem vazar o token.
const TOKEN = "token-de-leitura-".padEnd(48, "z");
let cliente: typeof import("../../api/src/vendas-pdv/vendas-pdv.cliente.ts");
let env: typeof import("../../api/src/env.ts")["env"];

beforeAll(async () => {
  ({ env } = await import("../../api/src/env.ts"));
  cliente = await import("../../api/src/vendas-pdv/vendas-pdv.cliente.ts");
});

afterEach(() => {
  vi.unstubAllGlobals();
  env.S1_VENDAS_URL = "";
  env.S1_VENDAS_TOKEN = "";
});

function configurar() {
  env.S1_VENDAS_URL = "https://s1.exemplo.test";
  env.S1_VENDAS_TOKEN = TOKEN;
}

function respostaJson(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

const consulta = consultaVendasPdvSchema.parse({
  dataInicio: "2026-11-24",
  dataFim: "2026-11-24",
  horaInicio: "06:00",
  horaFim: "14:00",
  pdvId: "11111111-1111-4111-8111-111111111111"
});

describe("vendas dos PDVs - cliente do S1", () => {
  it("Deve_RecusarSemConfiguracao_SemChamarOS1", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    await expect(cliente.buscarVendas(consulta)).rejects.toMatchObject({ status: 503, code: "VENDAS_PDV_NAO_CONFIGURADO" });
    env.S1_VENDAS_URL = "https://s1.exemplo.test";
    env.S1_VENDAS_TOKEN = "curto";
    await expect(cliente.buscarOpcoes()).rejects.toMatchObject({ code: "VENDAS_PDV_NAO_CONFIGURADO" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("Deve_MandarOTokenNoCabecalho_E_AJanelaComoHoraDoDia", async () => {
    configurar();
    const fetchFalso = vi.fn(async () =>
      respostaJson(200, { ok: true, data: [{ id: "v1", pagamentos: null }], meta: { pagination: { total: 7, page: 1, pageSize: 50 } } })
    );
    vi.stubGlobal("fetch", fetchFalso);
    const pagina = await cliente.buscarVendas(consulta);
    const [url, opcoes] = fetchFalso.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe("https://s1.exemplo.test/api/s2/vendas");
    expect(url.searchParams.get("horaDoDiaInicio")).toBe("06:00");
    expect(url.searchParams.get("horaDoDiaFim")).toBe("14:00");
    expect(url.searchParams.get("pdvId")).toBe(consulta.pdvId);
    expect(url.toString()).not.toContain(TOKEN);
    expect((opcoes.headers as Record<string, string>)["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(pagina).toMatchObject({ total: 7, page: 1, pageSize: 50 });
    expect(pagina.itens[0]).toMatchObject({ id: "v1", pagamentos: [], itensVenda: [] });
  });

  it("Deve_TraduzirAsFalhasDoS1_SemVazarOToken", async () => {
    configurar();
    vi.stubGlobal("fetch", vi.fn(async () => respostaJson(401, { status: 401 })));
    await expect(cliente.buscarTotais(consulta)).rejects.toMatchObject({ status: 503, code: "VENDAS_PDV_TOKEN_RECUSADO" });

    vi.stubGlobal("fetch", vi.fn(async () => respostaJson(500, {})));
    await expect(cliente.buscarTotais(consulta)).rejects.toMatchObject({ status: 503, code: "VENDAS_PDV_INDISPONIVEL" });

    vi.stubGlobal("fetch", vi.fn(async () => respostaJson(429, {})));
    await expect(cliente.buscarTotais(consulta)).rejects.toMatchObject({ status: 429 });

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    const erro = await cliente.buscarOpcoes().catch((falha: unknown) => falha);
    expect(erro).toMatchObject({ status: 503, code: "VENDAS_PDV_INDISPONIVEL" });
    expect(JSON.stringify(erro)).not.toContain(TOKEN);
  });

  it("Deve_ValidarAConsulta_AntesDeIrAoS1", () => {
    expect(() => consultaVendasPdvSchema.parse({ dataInicio: "2026-11-25", dataFim: "2026-11-24" })).toThrow();
    expect(() => consultaVendasPdvSchema.parse({ dataInicio: "2025-01-01", dataFim: "2026-11-24" })).toThrow();
    expect(() => consultaVendasPdvSchema.parse({ dataInicio: "2026-11-24", dataFim: "2026-11-24", horaInicio: "24:00" })).toThrow();
    expect(() => consultaVendasPdvSchema.parse({ dataInicio: "2026-11-24", dataFim: "2026-11-24", status: "qualquer" })).toThrow();
    expect(consultaVendasPdvSchema.parse({ dataInicio: "2026-11-24", dataFim: "2026-11-24" })).toMatchObject({
      ordem: "desc",
      page: 1,
      pageSize: 50
    });
  });
});
