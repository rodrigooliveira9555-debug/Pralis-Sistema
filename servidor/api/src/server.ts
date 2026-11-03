import { buildApp } from "./app.ts";
import { env } from "./env.ts";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.info(`[api] CICLUZ pronta em http://localhost:${env.PORT}`);
  if (env.SERVIR_SITE === "1") console.info(`[api] Site: http://localhost:${env.PORT}/entrar.html`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
