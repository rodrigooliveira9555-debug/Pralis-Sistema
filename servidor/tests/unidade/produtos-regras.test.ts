import { describe, expect, it } from "vitest";
import { casarGrupo, casarLocal, limparNome, produtoCriacaoSchema, separarGrupo, vinculoManualDe } from "@cicluz/shared";

// Regras puras dos produtos no servidor (shared/src/produtos.ts). Dados fictícios.
const WJ = "⁠";
const GRUPOS = [
  { id: "g3", nome: "BEBIDAS", subgrupos: [{ id: "g3s0", nome: "REFRIGERANTES" }] },
  { id: "g15", nome: "INATIVOS", subgrupos: [] }
];
const NOS = [
  { id: "a-lj", nome: "LJ", caminho: ["LJ"] },
  { id: "s-vit", nome: "VITRINES", caminho: ["LJ", "VITRINES"] },
  { id: "s-e1", nome: "ESTOQUE", caminho: ["LJ", "ESTOQUE"] },
  { id: "s-e2", nome: "ESTOQUE", caminho: ["PROD.", "ESTOQUE"] }
];

describe("regras dos produtos", () => {
  it("normaliza tirando U+2060, acento, caixa e espaços", () => {
    expect(limparNome(" mer " + WJ + "Fab.  Própria ")).toBe("MER FAB. PROPRIA");
    expect(separarGrupo("MER " + WJ + "BEBIDAS - " + WJ + "SUCOS")).toEqual({ grupo: "BEBIDAS", sub: "SUCOS" });
    expect(separarGrupo("")).toBeNull();
  });

  it("grupo casa só exato; subgrupo inexistente não casa parecido", () => {
    expect(casarGrupo("MER BEBIDAS - REFRIGERANTES", GRUPOS)).toEqual({ grupoId: "g3", subgrupoId: "g3s0" });
    expect(casarGrupo("MER INATIVOS", GRUPOS)).toEqual({ grupoId: "g15", subgrupoId: null });
    expect(casarGrupo("MER BEBIDAS - VINHOS", GRUPOS)).toBeNull();
    expect(casarGrupo("MER BEBIDA - REFRIGERANTES", GRUPOS)).toBeNull();
  });

  it("local casa por nome ou caminho; nome repetido é ambíguo", () => {
    expect(casarLocal(["LJ - VITRINES"], NOS)).toBe("s-vit");
    expect(casarLocal(["vitrines"], NOS)).toBe("s-vit");
    expect(casarLocal(["ESTOQUE"], NOS)).toBeNull();
    expect(casarLocal(["-", "", "PROD. - ESTOQUE"], NOS)).toBe("s-e2");
  });

  it("dinheiro com no máximo 2 casas; sai como texto para o numeric", () => {
    const base = { nome: "X", descricao: "X", tipo: "revenda", status: "ativo", liberadoCompra: true, calculoAutomatico: false };
    expect(produtoCriacaoSchema.parse({ ...base, custo: 10.5, precoVenda: "15.90" })).toMatchObject({ custo: "10.5", precoVenda: "15.90" });
    expect(produtoCriacaoSchema.safeParse({ ...base, custo: "0.455" }).success).toBe(false);
    expect(produtoCriacaoSchema.safeParse({ ...base, precoVenda: -1 }).success).toBe(false);
  });

  it("vínculo manual lido do dados", () => {
    expect(vinculoManualDe({ vinculoManual: { grupo: true } })).toEqual({ grupo: true });
    expect(vinculoManualDe(null)).toEqual({});
  });
});
