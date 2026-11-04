import { PAPEIS, type Papel } from "@cicluz/shared";
import { pool } from "../banco/conexao.ts";
import { criarUsuario } from "../usuarios/usuarios.service.ts";

// Cria uma conta de acesso. Os dados vêm de variáveis de ambiente (e não de argumentos) para a
// senha não ficar no histórico do terminal:
//   CICLUZ_EMPRESA="Cicluz" CICLUZ_NOME="Rodrigo" CICLUZ_EMAIL="..." CICLUZ_SENHA="..." \
//   CICLUZ_PAPEL=administrador npm run usuario:criar
const papel = (process.env["CICLUZ_PAPEL"] ?? "usuario") as Papel;
if (!(PAPEIS as readonly string[]).includes(papel)) {
  console.error(`[usuario] CICLUZ_PAPEL deve ser ${PAPEIS.join(" ou ")}`);
  process.exit(1);
}

try {
  const criado = await criarUsuario({
    empresaNome: process.env["CICLUZ_EMPRESA"] ?? "",
    nome: process.env["CICLUZ_NOME"] ?? "",
    email: process.env["CICLUZ_EMAIL"] ?? "",
    senha: process.env["CICLUZ_SENHA"] ?? "",
    papel
  }, { empresaNova: process.env["CICLUZ_EMPRESA_NOVA"] === "1" });
  console.info(`[usuario] conta criada (usuário ${criado.usuarioId}, empresa ${criado.empresaId})`);
} catch (error) {
  console.error("[usuario] não foi possível criar:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
