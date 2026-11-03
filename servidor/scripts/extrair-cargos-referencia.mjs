// Copia o catálogo de 32 cargos de referência (const referenceJobs, inline em dist/index.html) para
// db/dados/cargos-referencia.json. A tela é a fonte: rode isto quando o Rodrigo mudar o catálogo.
// O teste "catálogo de cargos igual ao da tela" falha enquanto a cópia estiver diferente.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function lerCatalogoDaTela(caminhoIndex) {
  const html = readFileSync(caminhoIndex, "utf8");
  const marca = "const referenceJobs=";
  const inicio = html.indexOf(marca);
  if (inicio < 0) throw new Error("referenceJobs não encontrado no index.html");
  let i = inicio + marca.length;
  let profundidade = 0;
  let dentroDeTexto = false;
  for (; i < html.length; i += 1) {
    const c = html[i];
    if (dentroDeTexto) {
      if (c === "\\") i += 1;
      else if (c === '"') dentroDeTexto = false;
    } else if (c === '"') dentroDeTexto = true;
    else if (c === "[") profundidade += 1;
    else if (c === "]" && --profundidade === 0) break;
  }
  return JSON.parse(html.slice(inicio + marca.length, i + 1));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const raiz = new URL("../../", import.meta.url);
  const catalogo = lerCatalogoDaTela(fileURLToPath(new URL("dist/index.html", raiz)));
  writeFileSync(new URL("../db/dados/cargos-referencia.json", import.meta.url), JSON.stringify(catalogo, null, 2) + "\n");
  console.info(`[cargos] ${catalogo.length} cargos de referência copiados`);
}
