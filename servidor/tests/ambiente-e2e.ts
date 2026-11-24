// Ambiente para os testes de TELA que precisam da API de verdade (ex.: produtos no servidor).
// Sobe um Postgres limpo (Testcontainers), aplica as migrations, cria uma empresa com um administrador
// FICTÍCIO e liga a API servindo o site de dist/. Escreve uma linha JSON no stdout com { url, email, senha }
// e fica no ar até o processo que o chamou fechar o stdin. Uso: tests/servidor-api.mjs (raiz do repositório).
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { aplicarMigrations } from "@cicluz/db/migrar";

const container = await new PostgreSqlContainer("postgres:17-alpine").start();
await aplicarMigrations(container.getConnectionUri());

const porta = 4300 + Math.floor(Math.random() * 500);
const url = `http://localhost:${porta}`;
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: container.getConnectionUri(),
  AUTH_BASE_URL: url,
  WEB_ORIGINS: url,
  PORT: String(porta),
  HOST: "127.0.0.1",
  SERVIR_SITE: "1"
});

const { buildApp } = await import("../api/src/app.ts");
const { criarUsuario } = await import("../api/src/usuarios/usuarios.service.ts");
const email = `${randomUUID()}@teste.local`;
const senha = `senha-${randomUUID()}`;
await criarUsuario({ empresaNome: "Empresa de Teste", nome: "Administrador de Teste", email, senha, papel: "administrador" }, { empresaNova: true });
const app = await buildApp();
await app.listen({ port: porta, host: "127.0.0.1" });
process.stdout.write(JSON.stringify({ url, email, senha }) + "\n");

const encerrar = async () => {
  await app.close().catch(() => undefined);
  const { pool } = await import("../api/src/banco/conexao.ts");
  await pool.end().catch(() => undefined);
  await container.stop().catch(() => undefined);
  process.exit(0);
};
process.stdin.on("end", encerrar);
process.stdin.on("close", encerrar);
process.stdin.resume();
process.on("SIGTERM", encerrar);
