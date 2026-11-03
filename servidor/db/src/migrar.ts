import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

export const pastaMigrations = fileURLToPath(new URL("../migrations", import.meta.url));

// Aplica as migrations versionadas em db/migrations, na ordem do journal do drizzle-kit. Usado pelo
// `npm run db:migrar` e pelos testes de integração (o mesmo caminho nos dois).
export async function aplicarMigrations(urlBanco: string) {
  const pool = new pg.Pool({ connectionString: urlBanco });
  try {
    await migrate(drizzle(pool), { migrationsFolder: pastaMigrations });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("[db] defina DATABASE_URL antes de migrar");
    process.exit(1);
  }
  await aplicarMigrations(url);
  console.info("[db] migrations aplicadas");
}
