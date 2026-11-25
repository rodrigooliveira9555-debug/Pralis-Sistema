// Gera dist/lancamentos/regras.js (window.CicluzLancamentosRegras e module.exports) a partir de
// servidor/shared/src/lancamentos/regras-site.ts, que é a fonte única da regra dLançamentos.
//   node servidor/scripts/gerar-regras-lancamentos.mjs            → grava o arquivo
//   node servidor/scripts/gerar-regras-lancamentos.mjs --conferir → sai com erro se o arquivo estiver diferente da fonte
// O teste "regras da agenda: arquivo gerado igual à fonte" roda o --conferir.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const FONTE = fileURLToPath(new URL("../shared/src/lancamentos/regras-site.ts", import.meta.url));
export const DESTINO = fileURLToPath(new URL("../../dist/lancamentos/regras.js", import.meta.url));

export async function gerarRegrasLancamentos() {
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
    " * ARQUIVO GERADO — não edite. Fonte: servidor/shared/src/lancamentos/regras-site.ts",
    " * Gerar de novo: node servidor/scripts/gerar-regras-lancamentos.mjs",
    " * Conta de dinheiro (juros, discriminação com rateio) e leitura de números digitados, escritas uma vez para o servidor e para a tela.",
    " */",
    "(function (root) {",
    "  'use strict';",
    codigo,
    "  if (typeof module !== 'undefined' && module.exports) module.exports = regras;",
    "  root.CicluzLancamentosRegras = regras;",
    "})(typeof window !== 'undefined' ? window : globalThis);",
    ""
  ].join("\n");
}

const lerDestino = () => { try { return readFileSync(DESTINO, "utf8").replace(/\r\n/g, "\n"); } catch { return ""; } };

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const novo = await gerarRegrasLancamentos();
  if (process.argv.includes("--conferir")) {
    if (lerDestino() !== novo) {
      console.error("[lancamentos] dist/lancamentos/regras.js está diferente da fonte. Rode: node servidor/scripts/gerar-regras-lancamentos.mjs");
      process.exit(1);
    }
    console.info("[lancamentos] dist/lancamentos/regras.js igual à fonte");
  } else {
    writeFileSync(DESTINO, novo);
    console.info("[lancamentos] dist/lancamentos/regras.js gerado");
  }
}
