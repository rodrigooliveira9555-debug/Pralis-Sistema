import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema, type Schema } from "@cicluz/db/schema";
import { env } from "../env.ts";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

// Sem este ouvinte, a queda do Postgres derruba a API: o pool emite `error` quando um cliente
// ocioso cai, e `error` sem ouvinte no Node vira exceção. O pool já descarta o cliente quebrado.
pool.on("error", (erro) => {
  console.error("[banco] cliente ocioso caiu; o pool reabre na próxima consulta:", erro.message);
});

export const banco: NodePgDatabase<Schema> = drizzle(pool, { schema });

export type Banco = typeof banco;
export type TransacaoBanco = Parameters<Parameters<Banco["transaction"]>[0]>[0];
