import { describe, expect, it } from "vitest";
import { dataParaIso, dinheiroParaApi, mascararData, numeroParaApi } from "../../web/utils/entrada.ts";

// O que a pessoa digita na tela do app → o que vai para a API. Nunca mandar valor diferente do
// digitado: o que não dá para ler sem adivinhar volta null (o campo mostra o erro).
describe("conversão de dinheiro digitado", () => {
  it.each([
    ["1.234,56", "1234.56"],
    ["1,5", "1.5"],
    ["R$ 10,00", "10.00"],
    ["1.234", "1234"],
    ["1.234.567", "1234567"],
    ["12.50", "12.50"],
    ["1.5", "1.5"],
    ["300", "300"]
  ])("%s → %s", (digitado, api) => {
    expect(dinheiroParaApi(digitado)).toBe(api);
  });

  it.each(["10,999", "1,2,3", "abc", "1.23.4", "-5", "1e3", "12.345,6,7"])("%s é recusado", (digitado) => {
    expect(dinheiroParaApi(digitado)).toBeNull();
  });

  it("quantidade aceita 3 casas e o percentual 4", () => {
    expect(numeroParaApi("1,234", 3)).toBe("1.234");
    expect(numeroParaApi("1,2345", 3)).toBeNull();
    expect(numeroParaApi("1,9999", 4)).toBe("1.9999");
  });
});

describe("datas DD/MM/AA", () => {
  it("máscara e século como no site (00–49 = 20xx, 50–99 = 19xx)", () => {
    expect(mascararData("031126")).toBe("03/11/26");
    expect(dataParaIso("03/11/26")).toBe("2026-11-03");
    expect(dataParaIso("01/01/75")).toBe("1975-01-01");
  });

  it("data impossível é recusada", () => {
    expect(dataParaIso("31/02/26")).toBeNull();
    expect(dataParaIso("3/11/26")).toBeNull();
  });
});
