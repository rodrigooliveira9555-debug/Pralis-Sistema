import { afterEach, describe, expect, it, vi } from "vitest";
import type { PerfilSessao } from "@cicluz/shared";
import { env } from "../../api/src/env.ts";
import { buscarComandas, buscarDetalhe, consultaComandasSchema } from "../../api/src/comandas-creare/comandas-creare.cliente.ts";
import { listarComandas, situacaoComandas } from "../../api/src/comandas-creare/comandas-creare.service.ts";

// Painel de comandas do CREARE (R-248 do S1): sem banco, fetch falso. Confere o que sai para o S1 (rota, token no
// cabeçalho, filtros), a lista branca do que volta e a regra "só administrador da empresa da loja".
const TOKEN = "token-de-leitura-".padEnd(48, "z");
const EMPRESA = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  vi.unstubAllGlobals();
  env.S1_VENDAS_URL = "";
  env.S1_VENDAS_TOKEN = "";
  env.S1_VENDAS_EMPRESA_ID = "";
});

function configurar() {
  env.S1_VENDAS_URL = "https://s1.exemplo.test";
  env.S1_VENDAS_TOKEN = TOKEN;
  env.S1_VENDAS_EMPRESA_ID = EMPRESA;
}
const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

const perfil = (papel: string, empresaId = EMPRESA) =>
  ({ usuarioId: "u", nome: "N", email: "e@x.test", papel, permissoes: [], empresa: { id: empresaId, nome: "E", dadosImportados: true } }) as unknown as PerfilSessao;

describe("comandas do CREARE - cliente do S1", () => {
  it("Deve_PedirComOsFiltros_E_FiltrarOsCampos", async () => {
    configurar();
    const falso = vi.fn(async () =>
      resposta(200, {
        ok: true,
        data: [{ idComanda: 9, numero: 430, situacao: "conta", valorTotalCentavos: 876459, segredo: "x", puxadaAproximada: true }],
        meta: { pagination: { total: 1, page: 1, pageSize: 50 } }
      })
    );
    vi.stubGlobal("fetch", falso);
    const pagina = await buscarComandas(consultaComandasSchema.parse({ aba: "fechadas", dia: "2026-11-25", numero: "430", funcionario: "" }));
    const [url, opcoes] = falso.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://s1.exemplo.test/api/s2/comandas?aba=fechadas&dia=2026-11-25&numero=430&pagina=1&porPagina=50"
    );
    expect((opcoes.headers as Record<string, string>)["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(opcoes.redirect).toBe("error");
    expect(pagina.total).toBe(1);
    expect(pagina.itens[0]).toMatchObject({ numero: 430, situacao: "conta", valorTotalCentavos: 876459 });
    expect(pagina.itens[0]).not.toHaveProperty("segredo");
  });

  it("Deve_DescartarEventoDesconhecido_NoDetalhe", async () => {
    configurar();
    vi.stubGlobal("fetch", vi.fn(async () =>
      resposta(200, {
        ok: true,
        data: {
          idComanda: 9,
          numero: 430,
          situacao: "inventada",
          itens: [{ idItem: 1, descricao: "PAO", quantidade: 2, valorTotalCentavos: 500, cancelado: true, motivoCancelamento: "x", extra: 1 }],
          linhaDoTempo: [{ tipo: "abriu", em: "2026-11-25T10:00:00.000Z", texto: "Comanda aberta" }, { tipo: "script", em: "", texto: "" }]
        }
      })
    ));
    const detalhe = await buscarDetalhe(9);
    expect(detalhe.situacao).toBe("aberta");
    expect(detalhe.itens[0]).not.toHaveProperty("extra");
    expect(detalhe.itens[0]?.cancelado).toBe(true);
    expect(detalhe.linhaDoTempo.map((e) => e.tipo)).toEqual(["abriu"]);
  });

  it("Deve_DeixarSoOAdministradorDaEmpresaDaLoja", async () => {
    configurar();
    const falso = vi.fn();
    vi.stubGlobal("fetch", falso);
    expect(() => situacaoComandas(perfil("usuario"))).toThrow(/só do administrador/u);
    await expect(listarComandas(perfil("administrador", "33333333-3333-4333-8333-333333333333"), consultaComandasSchema.parse({}))).rejects.toThrow(
      /só do administrador/u
    );
    expect(falso).not.toHaveBeenCalled();
    expect(situacaoComandas(perfil("administrador"))).toEqual({ configurada: true });
  });

  it("Deve_RecusarConsultaInvalida", () => {
    expect(() => consultaComandasSchema.parse({ aba: "todas" })).toThrow();
    expect(() => consultaComandasSchema.parse({ porPagina: 500 })).toThrow();
    expect(() => consultaComandasSchema.parse({ dia: "25/11/2026" })).toThrow();
  });
});
