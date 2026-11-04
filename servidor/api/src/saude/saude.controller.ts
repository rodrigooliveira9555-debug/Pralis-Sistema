import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { banco } from "../banco/conexao.ts";

// Healthcheck do servidor: 200 com banco respondendo, 503 sem banco.
export async function registrarRotasSaude(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    try {
      await banco.execute(sql`select 1`);
      return { ok: true };
    } catch {
      return reply.status(503).send({ ok: false });
    }
  });
}
