import { buildApp } from "./app.ts";
import { env } from "./env.ts";
import { reprocessarDefasadas } from "./projecoes/projecoes.service.ts";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.info(`[api] CICLUZ pronta em http://localhost:${env.PORT}`);
  if (env.SERVIR_SITE === "1") console.info(`[api] Site: http://localhost:${env.PORT}/entrar.html`);
  // Gravações feitas enquanto a versão anterior ainda respondia (janela do deploy) ou regra nova de
  // projeção: reconstrói o que estiver defasado, sem segurar a subida.
  void reprocessarDefasadas((mensagem) => app.log.info(mensagem)).catch((error) => app.log.error(error));
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
