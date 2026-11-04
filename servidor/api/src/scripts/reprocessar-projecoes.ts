import { pool } from "../banco/conexao.ts";
import { reprocessarDefasadas } from "../projecoes/projecoes.service.ts";

// Reconstrói as tabelas relacionais que estão defasadas em relação aos documentos (tabela nova,
// regra nova ou gravação que ficou sem projeção). Roda no deploy, depois das migrations; a API faz a
// mesma conferência ao subir.
try {
  await reprocessarDefasadas((mensagem) => console.info(mensagem));
  console.info("[projecoes] conferência concluída");
} catch (error) {
  console.error("[projecoes] reprocessamento falhou:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
