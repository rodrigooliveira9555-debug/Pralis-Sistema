import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calcularDiscriminacao, jurosCentavos, paraCentavos } from "@cicluz/shared";
import type * as RegrasSite from "../../shared/src/lancamentos/regras-site.ts";

// As telas de Lançamentos do site (dist/lancamentos) calculam a prévia com a cópia gerada da regra do servidor.
// Aqui: a cópia está igual à fonte e dá exatamente os mesmos números que o servidor.
const regras = createRequire(import.meta.url)("../../../dist/lancamentos/regras.js") as typeof RegrasSite;

describe("regras de lançamentos no site", () => {
  it("arquivo gerado dist/lancamentos/regras.js igual à fonte", () => {
    const script = fileURLToPath(new URL("../../scripts/gerar-regras-lancamentos.mjs", import.meta.url));
    expect(() => execFileSync(process.execPath, [script, "--conferir"], { stdio: "pipe" })).not.toThrow();
  });

  it("juros e discriminação: a cópia do site dá o mesmo que o servidor", () => {
    expect(regras.jurosCentavos({ valorOriginal: "333.33", jurosTipo: "percentual", jurosValorInformado: "2" })).toBe(
      jurosCentavos({ valorOriginal: "333.33", jurosTipo: "percentual", jurosValorInformado: "2" })
    );
    expect(regras.paraCentavos("1234.5")).toBe(paraCentavos("1234.5"));
    const entrada = {
      itens: [
        { quantidade: "3", valorUnitario: "3.3", descontoTipo: "percentual" as const, descontoValor: "10" },
        { quantidade: "1", valorUnitario: "10" }
      ],
      descontoGeralTipo: "valor" as const,
      descontoGeralValor: "1"
    };
    expect(regras.calcularDiscriminacao(entrada)).toEqual(calcularDiscriminacao(entrada));
  });

  it("número digitado: vírgula decimal, milhar e casas demais", () => {
    expect(regras.dinheiroParaApi("1.234,56")).toBe("1234.56");
    expect(regras.dinheiroParaApi("1,234")).toBeNull();
    expect(regras.numeroParaApi("2,5", 4)).toBe("2.5");
    expect(regras.apiParaDinheiro("1234.5")).toBe("1.234,50");
  });
});
