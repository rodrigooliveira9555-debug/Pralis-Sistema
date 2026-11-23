import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  compromissoCriacaoSchema,
  compromissoEdicaoSchema,
  compromissoIdSchema,
  compromissoMudancaSchema,
  conclusaoSchema,
  exclusaoCompromissoSchema,
  limparConcluidosSchema,
  ok,
  subtarefaEstadoSchema
} from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import * as servico from "./compromissos.service.ts";

// Rotas dos compromissos da Agenda (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 3). Todas exigem sessão
// (guard global) e valem só para a empresa da sessão.

const idParams = z.object({ id: compromissoIdSchema });
const subParams = z.object({ id: compromissoIdSchema, subId: compromissoIdSchema });
// A tela pergunta "mudou algo?" a cada 30 s em cada aparelho: o teto fica bem acima disso.
const limiteLeitura = { rateLimit: { max: 240, timeWindow: "1 minute" } };

export async function registrarRotasCompromissos(app: FastifyInstance) {
  // Tudo o que a tela precisa, já filtrado. ETag: contador da empresa + pessoa (aparelho compartilhado não
  // recebe 304 com a agenda de outra conta).
  app.get("/api/agenda", { config: limiteLeitura }, async (request, reply) => {
    const perfil = perfilDaRequisicao(request);
    const dados = await servico.agenda(perfil);
    const marca = createHash("sha256").update(perfil.usuarioId).digest("hex").slice(0, 16);
    const etag = `"agenda-${dados.estado.versao}-${marca}"`;
    reply.header("ETag", etag).header("Cache-Control", "private, no-cache");
    if (dados.estado.noServidor && request.headers["if-none-match"] === etag) return reply.status(304).send();
    return ok(dados);
  });

  app.get("/api/agenda/compromissos/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await servico.obter(perfilDaRequisicao(request), id));
  });

  app.post("/api/agenda/compromissos", async (request, reply) => {
    const r = await servico.criar(perfilDaRequisicao(request), compromissoCriacaoSchema.parse(request.body));
    return reply.status(r.criado ? 201 : 200).send(ok(r.compromisso));
  });

  app.put("/api/agenda/compromissos/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await servico.editar(perfilDaRequisicao(request), id, compromissoEdicaoSchema.parse(request.body)));
  });

  app.patch("/api/agenda/compromissos/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await servico.mudar(perfilDaRequisicao(request), id, compromissoMudancaSchema.parse(request.body)));
  });

  app.post("/api/agenda/compromissos/:id/conclusao", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await servico.concluir(perfilDaRequisicao(request), id, conclusaoSchema.parse(request.body)));
  });

  app.put("/api/agenda/compromissos/:id/subtarefas/:subId", async (request) => {
    const { id, subId } = subParams.parse(request.params);
    const { concluida } = subtarefaEstadoSchema.parse(request.body);
    return ok(await servico.marcarSubtarefa(perfilDaRequisicao(request), id, subId, concluida));
  });

  app.delete("/api/agenda/compromissos/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    const { versao } = exclusaoCompromissoSchema.parse(request.query);
    await servico.excluir(perfilDaRequisicao(request), id, versao);
    return ok({});
  });

  app.post("/api/agenda/limpar-concluidos", async (request) => {
    const { grupoId } = limparConcluidosSchema.parse(request.body ?? {});
    return ok(await servico.limparConcluidos(perfilDaRequisicao(request), grupoId));
  });
}
