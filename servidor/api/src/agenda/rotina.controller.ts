import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  compromissoIdSchema,
  acaoFeitaSchema,
  colaboradorDaContaSchema,
  concluirPorVinculoSchema,
  configPessoaSchema,
  desempenhoQuerySchema,
  expedientesSchema,
  listarMensagensSchema,
  mensagemSchema,
  ok,
  tarefaDeTelaSchema,
  telaIconeSchema
} from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import * as acoes from "./acoes-tela.service.ts";
import * as rotina from "./rotina.service.ts";

// Rotas da rotina da Agenda (0008, P-46): configurações por pessoa, desempenho, tarefa vinda de tela, chat do grupo.

const grupoParams = z.object({ id: compromissoIdSchema });
const pessoaParams = z.object({ usuarioId: z.string().trim().min(1).max(200) });
const limiteChat = { rateLimit: { max: 120, timeWindow: "1 minute" } };
const limiteTarefas = { rateLimit: { max: 60, timeWindow: "1 minute" } };

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
  // Tarefa de tela: só o id volta sempre; o compromisso, só para quem participa dele. Teto próprio de pedidos.
  app.post("/api/agenda/tarefas-de-tela", { config: limiteTarefas }, async (request, reply) => {
    const r = await rotina.criarTarefaDeTela(perfilDaRequisicao(request), tarefaDeTelaSchema.parse(request.body));
    return reply.status(r.criado ? 201 : 200).send(ok({ id: r.id, compromisso: r.compromisso }));
  });
  app.post("/api/agenda/tarefas-de-tela/concluir", async (request) => {
    const { vinculoRef } = concluirPorVinculoSchema.parse(request.body);
    return ok(await rotina.concluirPorVinculo(perfilDaRequisicao(request), vinculoRef));
  });
  app.post("/api/agenda/tarefas-de-tela/cancelar", async (request) => {
    const { vinculoRef } = concluirPorVinculoSchema.parse(request.body);
    return ok(await rotina.cancelarPorVinculo(perfilDaRequisicao(request), vinculoRef));
  });

  /* Ações programadas por tela (0012, P-52): a tela avisa a ação feita; o administrador escolhe as telas do ícone */
  app.post("/api/agenda/acoes-de-tela", { config: limiteTarefas }, async (request) => {
    const { acao, quantidade } = acaoFeitaSchema.parse(request.body);
    return ok({ tarefas: await acoes.acaoFeita(perfilDaRequisicao(request), acao, quantidade) });
  });
  app.get("/api/agenda/telas-icone", async (request) => ok({ telas: await acoes.telasIcone(perfilDaRequisicao(request)) }));
  app.put("/api/agenda/telas-icone", async (request) => {
    const { tela, mostrar } = telaIconeSchema.parse(request.body);
    return ok(await acoes.definirTelaIcone(perfilDaRequisicao(request), tela, mostrar));
  });

  /* Conta ligada ao colaborador e expediente dos Horários/Escalas (0009, P-46 item 5) */
  app.get("/api/agenda/expedientes/contas", async (request) => ok({ contas: await rotina.contasEColaboradores(perfilDaRequisicao(request)) }));
  app.put("/api/agenda/expedientes/contas/:usuarioId", async (request) => {
    const { usuarioId } = pessoaParams.parse(request.params);
    const { colaboradorId } = colaboradorDaContaSchema.parse(request.body);
    return ok(await rotina.ligarColaborador(perfilDaRequisicao(request), usuarioId, colaboradorId));
  });
  app.put("/api/agenda/expedientes", { config: limiteTarefas }, async (request) =>
    ok(await rotina.receberExpedientes(perfilDaRequisicao(request), expedientesSchema.parse(request.body))));

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
