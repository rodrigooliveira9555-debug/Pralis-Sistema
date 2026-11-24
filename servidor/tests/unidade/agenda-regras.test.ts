import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AgendaRegras as R } from "@cicluz/shared";

// Regra única da Agenda (shared/src/agenda/regras.ts). Os 125 casos completos rodam em tests/agenda-dominio.cjs
// (raiz), contra a cópia gerada dist/agenda/regras.js. Aqui: a cópia está igual à fonte e o servidor usa a mesma regra.
// Ids fictícios.

describe("regras da agenda", () => {
  it("arquivo gerado dist/agenda/regras.js igual à fonte", () => {
    const script = fileURLToPath(new URL("../../scripts/gerar-regras-agenda.mjs", import.meta.url));
    expect(() => execFileSync(process.execPath, [script, "--conferir"], { stdio: "pipe" })).not.toThrow();
  });

  it("acesso: gestor tudo; participante só o marcado; de fora nada", () => {
    const item = { criadoPor: "g", pessoas: R.normalizarPessoas([R.pessoaResponsavel("r"), { id: "v", ver: true }]) };
    expect(R.acesso(item, "g")).toEqual({ ver: true, editar: true, concluir: true, excluir: true, gestor: true, responsavel: false });
    expect(R.acesso(item, "r")).toEqual({ ver: true, editar: true, concluir: true, excluir: false, gestor: false, responsavel: true });
    expect(R.acesso(item, "v")).toEqual({ ver: true, editar: false, concluir: false, excluir: false, gestor: false, responsavel: false });
    expect(R.acesso(item, "fora").ver).toBe(false);
    // Pessoa gravada sem as marcas (documento antigo): devolve false, não undefined.
    expect(R.acesso({ criadoPor: "g", pessoas: [{ id: "x" }] }, "x")).toEqual({ ver: false, editar: false, concluir: false, excluir: false, gestor: false, responsavel: false });
  });

  it("avaliação, validação e repetição com âncora", () => {
    const feito = { criadoPor: "g", concluida: true, pessoas: [R.pessoaResponsavel("r")], avaliacao: { tipo: "nps", notas: [] } };
    expect(R.podeAvaliar(feito, "g", "r")).toEqual({ papel: "gestor" });
    expect(R.podeAvaliar(feito, "x", "r")).toEqual({ erro: "Só o gestor e o próprio responsável avaliam." });
    expect(R.valorValido("nps", 10) && !R.valorValido("nps", 11) && !R.valorValido("estrelas", "3")).toBe(true);
    expect(R.validar({ titulo: "Teste", data: "2026-11-05", hora: "10:00", horaFim: "09:00" })).toBe("O término precisa ser depois do início.");
    expect(R.validar({ titulo: "Teste", data: "2026-11-05", hora: "08:00", repeticao: { tipo: "semana" } })).toBe("");
    expect(R.proxima({ data: "2026-02-28", repeticao: { tipo: "mes", ancora: "2026-01-31" } })).toEqual({ data: "2026-03-31", hora: undefined });
  });
});
