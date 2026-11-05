import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { arquivoSchema, compromissoIdSchema, LIMITE_CORPO_ARQUIVO, listarMensagensSchema, mensagemSchema, ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { abreNoNavegador, disposicao } from "./agenda.regras.ts";
import * as servico from "./agenda.service.ts";

const compromissoParams = z.object({ id: compromissoIdSchema });
const arquivoParams = z.object({ id: z.string().uuid() });
// O chat confere novidades a cada 5 s: o teto fica bem acima disso. Envio de arquivo tem teto próprio.
const limiteChat = { rateLimit: { max: 120, timeWindow: "1 minute" } };
const limiteArquivo = { rateLimit: { max: 20, timeWindow: "1 minute" } };

export async function registrarRotasAgenda(app: FastifyInstance) {
  app.get("/api/agenda/compromissos/:id/mensagens", { config: limiteChat }, async (request) => {
    const { id } = compromissoParams.parse(request.params);
    const { depois } = listarMensagensSchema.parse(request.query);
    return ok({ mensagens: await servico.listarMensagens(perfilDaRequisicao(request), id, depois) });
  });

  app.post("/api/agenda/compromissos/:id/mensagens", { config: limiteChat }, async (request, reply) => {
    const { id } = compromissoParams.parse(request.params);
    const { texto } = mensagemSchema.parse(request.body);
    return reply.status(201).send(ok(await servico.enviarMensagem(perfilDaRequisicao(request), id, texto)));
  });

  app.post("/api/agenda/compromissos/:id/leitura", { config: limiteChat }, async (request) => {
    const { id } = compromissoParams.parse(request.params);
    await servico.marcarLido(perfilDaRequisicao(request), id);
    return ok({});
  });

  app.get("/api/agenda/chat/nao-lidas", { config: limiteChat }, async (request) => ok({ naoLidas: await servico.naoLidas(perfilDaRequisicao(request)) }));

  app.get("/api/agenda/compromissos/:id/arquivos", async (request) => {
    const { id } = compromissoParams.parse(request.params);
    return ok({ arquivos: await servico.listarArquivos(perfilDaRequisicao(request), id) });
  });

  app.post("/api/agenda/compromissos/:id/arquivos", { bodyLimit: LIMITE_CORPO_ARQUIVO, config: limiteArquivo }, async (request, reply) => {
    const { id } = compromissoParams.parse(request.params);
    const entrada = arquivoSchema.parse(request.body);
    return reply.status(201).send(ok(await servico.enviarArquivo(perfilDaRequisicao(request), id, entrada)));
  });

  app.get("/api/agenda/arquivos/:id", async (request, reply) => {
    const { id } = arquivoParams.parse(request.params);
    const a = await servico.baixarArquivo(perfilDaRequisicao(request), id);
    return reply
      .header("Content-Type", a.tipo)
      .header("Content-Disposition", disposicao(a.nome, abreNoNavegador(a.tipo)))
      .header("Content-Length", String(a.conteudo.length))
      // Arquivo enviado por alguém nunca roda como página do site.
      .header("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox")
      .header("Cache-Control", "private, max-age=0, must-revalidate")
      .send(a.conteudo);
  });

  app.delete("/api/agenda/arquivos/:id", async (request) => {
    const { id } = arquivoParams.parse(request.params);
    await servico.excluirArquivo(perfilDaRequisicao(request), id);
    return ok({});
  });
}
