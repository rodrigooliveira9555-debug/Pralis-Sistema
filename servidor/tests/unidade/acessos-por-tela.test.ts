import { describe, expect, it } from "vitest";
import { cadeiaDaArea, podeUsar, resolverConfig, sincronizarAcessosSchema, temAcesso, type ConfigTela } from "@cicluz/shared";

const c = (telas: Record<string, string[]>, acoes: string[] = []): ConfigTela => ({ telas, acoes });
// Loja (A) › Caixa (S) › PDV1 (L)
const pais = { A: null, S: "A", L: "S" };

describe("Acesso por Tela: quem pode usar o sistema", () => {
  it("a cadeia da área vai da mais específica para a mais geral", () => {
    expect(cadeiaDaArea(pais, "L")).toEqual(["L", "S", "A"]);
    expect(cadeiaDaArea(pais, "A")).toEqual(["A"]);
    expect(cadeiaDaArea(pais, "zzz")).toEqual(["zzz"]);
  });

  it("temAcesso exige ao menos uma permissão ou ação ligada", () => {
    expect(temAcesso(c({ a: [] }))).toBe(false);
    expect(temAcesso(c({ a: ["ver"] }))).toBe(true);
    expect(temAcesso(c({}, ["sangria"]))).toBe(true);
    expect(temAcesso(null)).toBe(false);
  });

  const configs = {
    "area:A": c({ vendas: ["ver"] }),
    "area:S": c({ vendas: ["ver", "lan"] }),
    "cargo:A|c-1": c({ vendas: ["ver", "pag"] }, ["sangria"]),
    "pessoa:p9": c({ vendas: ["ver"] })
  };

  it("vale a mais específica: pessoa, depois cargo, depois área mais próxima", () => {
    expect(resolverConfig({ id: "p1", cargoId: "c-1", areaIds: ["L"] }, configs, pais).nivel).toBe("cargo");
    const area = resolverConfig({ id: "p2", cargoId: "c-2", areaIds: ["L"] }, configs, pais);
    expect(area.nivel).toBe("area");
    expect(area.origens).toEqual(["area:S"]);
    expect(resolverConfig({ id: "p9", cargoId: "c-1", areaIds: ["L"] }, configs, pais).nivel).toBe("pessoa");
  });

  it("em mais de uma área com configurações diferentes valem as permissões maiores", () => {
    const r = resolverConfig({ id: "p3", cargoId: "c-9", areaIds: ["A", "S"] }, { "area:A": c({ vendas: ["ver"] }), "area:S": c({ vendas: ["lan"], caixa: ["ver"] }) }, pais);
    expect(r.origens.sort()).toEqual(["area:A", "area:S"]);
    expect([...(r.config.telas["vendas"] ?? [])].sort()).toEqual(["lan", "ver"]);
    expect(r.config.telas["caixa"]).toEqual(["ver"]);
  });

  it("sem cargo, sem configuração ou com tudo desligado a pessoa não usa o sistema", () => {
    expect(podeUsar({ id: "x", cargoId: null, areaIds: ["A"] }, configs, pais).motivo).toMatch(/ligado a um cargo/);
    expect(podeUsar({ id: "x", cargoId: "c-9", areaIds: [] }, configs, pais).motivo).toMatch(/Nenhuma permissão/);
    expect(podeUsar({ id: "x", cargoId: "c-9", areaIds: ["A"] }, { "area:A": c({ v: [] }) }, pais).motivo).toMatch(/não libera nenhuma tela/);
    expect(podeUsar(null, configs, pais).ok).toBe(false);
    expect(podeUsar({ id: "x", cargoId: "c-9", areaIds: ["L"] }, configs, pais)).toMatchObject({ ok: true, nivel: "area" });
  });

  it("o envio do aparelho só aceita chaves conhecidas e não leva CPF", () => {
    const base = { colaboradores: [{ id: "demo-colab-01", nome: "Ana", cargoId: "ref:3", areaIds: ["a1"], ativo: true }], areaPais: { a1: null }, configs: { "area:a1": c({ v: ["ver"] }) } };
    expect(sincronizarAcessosSchema.safeParse(base).success).toBe(true);
    expect(sincronizarAcessosSchema.safeParse({ ...base, configs: { "qualquer:coisa": c({}) } }).success).toBe(false);
    const comCpf = sincronizarAcessosSchema.parse({ ...base, colaboradores: [{ ...base.colaboradores[0], cpf: "12345678901" }] });
    expect(JSON.stringify(comCpf)).not.toContain("12345678901");
  });
});
