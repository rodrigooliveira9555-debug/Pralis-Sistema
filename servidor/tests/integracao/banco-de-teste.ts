import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { aplicarMigrations } from "@cicluz/db/migrar";

let container: StartedPostgreSqlContainer | undefined;

// Postgres real em container, com as MESMAS migrations do `npm run db:migrar`. As variáveis são
// definidas antes de os testes importarem a API (o env é lido na importação).
export async function setup() {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  const url = container.getConnectionUri();
  await aplicarMigrations(url);
  process.env["NODE_ENV"] = "test";
  process.env["DATABASE_URL"] = url;
  process.env["AUTH_BASE_URL"] = "http://localhost:4200";
  process.env["WEB_ORIGINS"] = "http://localhost:4200";
}

export async function teardown() {
  await container?.stop();
}
