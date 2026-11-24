// Gera dist/agenda/regras.js (window.CicluzAgendaRegras e module.exports) a partir de
// servidor/shared/src/agenda/regras.ts, que é a fonte única da regra da Agenda.
//   node servidor/scripts/gerar-regras-agenda.mjs            → grava o arquivo
//   node servidor/scripts/gerar-regras-agenda.mjs --conferir → sai com erro se o arquivo estiver diferente da fonte
// O teste "regras da agenda: arquivo gerado igual à fonte" roda o --conferir.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const FONTE = fileURLToPath(new URL("../shared/src/agenda/regras.ts", import.meta.url));
export const DESTINO = fileURLToPath(new URL("../../dist/agenda/regras.js", import.meta.url));

export async function gerarRegrasAgenda() {
  const r = await build({
    entryPoints: [FONTE],
    // Fixo na raiz do repositório: o comentário com o caminho da fonte não muda com a pasta de onde se roda.
    absWorkingDir: fileURLToPath(new URL("../../", import.meta.url)),
    bundle: true,
    write: false,
    format: "iife",
    globalName: "regras",
    target: "es2020",
    charset: "utf8",
    legalComments: "none",
    logLevel: "silent"
  });
  const codigo = r.outputFiles[0].text.replace(/\r\n/g, "\n").trimEnd();
  return [
    "/*",
    " * ARQUIVO GERADO — não edite. Fonte: servidor/shared/src/agenda/regras.ts",
    " * Gerar de novo: node servidor/scripts/gerar-regras-agenda.mjs",
    " * Regra da Agenda escrita uma vez (quem pode o quê, avaliação, validação, repetição).",
    " */",
    "(function (root) {",
    "  'use strict';",
    codigo,
    "  if (typeof module !== 'undefined' && module.exports) module.exports = regras;",
    "  root.CicluzAgendaRegras = regras;",
    "})(typeof window !== 'undefined' ? window : globalThis);",
    ""
  ].join("\n");
}

const lerDestino = () => { try { return readFileSync(DESTINO, "utf8").replace(/\r\n/g, "\n"); } catch { return ""; } };

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const novo = await gerarRegrasAgenda();
  if (process.argv.includes("--conferir")) {
    if (lerDestino() !== novo) {
      console.error("[agenda] dist/agenda/regras.js está diferente da fonte. Rode: node servidor/scripts/gerar-regras-agenda.mjs");
      process.exit(1);
    }
    console.info("[agenda] dist/agenda/regras.js igual à fonte");
  } else {
    writeFileSync(DESTINO, novo);
    console.info("[agenda] dist/agenda/regras.js gerado");
  }
}
