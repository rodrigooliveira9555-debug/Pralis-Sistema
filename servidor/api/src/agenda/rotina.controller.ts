import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  compromissoIdSchema,
  concluirPorVinculoSchema,
  configPessoaSchema,
  desempenhoQuerySchema,
  listarMensagensSchema,
  mensagemSchema,
  ok,
  tarefaDeTelaSchema
} from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import * as rotina from "./rotina.service.ts";

// Rotas da rotina da Agenda (0008, P-45): configurações por pessoa, desempenho, tarefa vinda de tela, chat do grupo.

const grupoParams = z.object({ id: compromissoIdSchema });
const pessoaParams = z.object({ usuarioId: z.string().trim().min(1).max(200) });
const limiteChat = { rateLimit: { max: 120, timeWindow: "1 minute" } };

export async function registrarRotasRotina(app: FastifyInstance) {
  /* Configurações da Agenda */
  app.get("/api/agenda/configuracoes", async (request) => ok({ pessoas: await rotina.listarConfigs(perfilDaRequisicao(request)) }));
  app.get("/api/agenda/configuracoes/minha", async (request) => ok(await rotina.minhaConfig(perfilDaRequisicao(request))));
  app.put("/api/agenda/configuracoes/:usuarioId", async (request) => {
    const { usuarioId } = pessoaParams.parse(request.params);
    return ok(await rotina.salvarConfig(perfilDaRequisicao(request), usuarioId, configPessoaSchema.parse(request.body)));
  });

  /* Desempenho */
  app.get("/api/agenda/desempenho", async (request) => {
    const { de, ate } = desempenhoQuerySchema.parse(request.query);
    return ok(await rotina.desempenho(perfilDaRequisicao(request), de, ate));
  });

  /* Tarefa vinda de uma tela */
  app.post("/api/agenda/tarefas-de-tela", async (request, reply) => {
    const r = await rotina.criarTarefaDeTela(perfilDaRequisicao(request), tarefaDeTelaSchema.parse(request.body));
    return reply.status(r.criado ? 201 : 200).send(ok(r.compromisso));
  });
  app.post("/api/agenda/tarefas-de-tela/concluir", async (request) => {
    const { vinculoRef } = concluirPorVinculoSchema.parse(request.body);
    return ok(await rotina.concluirPorVinculo(perfilDaRequisicao(request), vinculoRef));
  });

  /* Chat do grupo (cada lista) */
  app.get("/api/agenda/grupos/:id/mensagens", { config: limiteChat }, async (request) => {
    const { id } = grupoParams.parse(request.params);
    const { depois } = listarMensagensSchema.parse(request.query);
    return ok({ mensagens: await rotina.listarMensagensGrupo(perfilDaRequisicao(request), id, depois) });
  });
  app.post("/api/agenda/grupos/:id/mensagens", { config: limiteChat }, async (request, reply) => {
    const { id } = grupoParams.parse(request.params);
    const { texto } = mensagemSchema.parse(request.body);
    return reply.status(201).send(ok(await rotina.enviarMensagemGrupo(perfilDaRequisicao(request), id, texto)));
  });
  app.post("/api/agenda/grupos/:id/leitura", { config: limiteChat }, async (request) => {
    const { id } = grupoParams.parse(request.params);
    await rotina.marcarLidoGrupo(perfilDaRequisicao(request), id);
    return ok({});
  });
  app.get("/api/agenda/grupos-chat/nao-lidas", { config: limiteChat }, async (request) => ok({ naoLidas: await rotina.naoLidasGrupos(perfilDaRequisicao(request)) }));
}
