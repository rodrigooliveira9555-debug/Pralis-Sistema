import { empresas } from "@cicluz/db/schema";
import { banco, pool } from "../banco/conexao.ts";
import { listarSituacoes } from "../projecoes/projecoes.repository.ts";
import { reprocessarTodas } from "../projecoes/projecoes.service.ts";

// Reconstrói as tabelas relacionais de todas as empresas a partir dos documentos. Roda no deploy,
// depois das migrations: uma tabela nova nasce vazia e só se enche aqui (ou na próxima gravação).
try {
  for (const empresa of await banco.select({ id: empresas.id, nome: empresas.nome }).from(empresas)) {
    await banco.transaction((tx) => reprocessarTodas(tx, empresa.id));
    const falhas = (await listarSituacoes(empresa.id)).filter((assunto) => assunto.situacao === "falha");
    console.info(`[projecoes] ${empresa.nome}: ${falhas.length ? `${falhas.length} assunto(s) com falha` : "tudo em dia"}`);
    for (const falha of falhas) console.info(`[projecoes]   ${falha.assunto}: ${falha.mensagem}`);
  }
} catch (error) {
  console.error("[projecoes] reprocessamento falhou:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
