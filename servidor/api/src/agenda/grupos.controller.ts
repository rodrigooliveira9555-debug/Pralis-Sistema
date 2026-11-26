import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  adiamentoSchema,
  avaliacaoSchema,
  colunaCriacaoSchema,
  colunaEdicaoSchema,
  compromissoIdSchema,
  copiaDoAparelhoSchema,
  exclusaoCompromissoSchema,
  grupoCriacaoSchema,
  grupoEdicaoSchema,
  grupoMembrosSchema,
  LIMITE_CORPO_AGENDA,
  ok,
  relacaoCriacaoSchema,
  relacaoEdicaoSchema,
  transferenciaAgendaSchema
} from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { limitePorUsuario } from "../auth/limites.ts";
import * as grupos from "./grupos.service.ts";
import * as interacoes from "./interacoes.service.ts";
import * as transferencia from "./transferencia.service.ts";

// Rotas de listas, membros, colunas, pessoas, avaliação, soneca e ligações do mapa (plano, seção 3).

const idParams = z.object({ id: compromissoIdSchema });

export async function registrarRotasGrupos(app: FastifyInstance) {
  app.get("/api/agenda/pessoas", async (request) => ok({ pessoas: await grupos.pessoas(perfilDaRequisicao(request)) }));

  /* Listas */
  app.post("/api/agenda/grupos", async (request, reply) => {
    const r = await grupos.criarGrupo(perfilDaRequisicao(request), grupoCriacaoSchema.parse(request.body));
    return reply.status(r.criado ? 201 : 200).send(ok(r.grupo));
  });
  app.put("/api/agenda/grupos/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await grupos.editarGrupo(perfilDaRequisicao(request), id, grupoEdicaoSchema.parse(request.body)));
  });
  app.delete("/api/agenda/grupos/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    const { versao } = exclusaoCompromissoSchema.parse(request.query);
    await grupos.excluirGrupo(perfilDaRequisicao(request), id, versao);
    return ok({});
  });
  app.get("/api/agenda/grupos/:id/membros", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok({ usuarioIds: await grupos.membros(perfilDaRequisicao(request), id) });
  });
  app.put("/api/agenda/grupos/:id/membros", async (request) => {
    const { id } = idParams.parse(request.params);
    const { usuarioIds } = grupoMembrosSchema.parse(request.body);
    return ok({ usuarioIds: await grupos.definirMembros(perfilDaRequisicao(request), id, usuarioIds) });
  });

  /* Colunas do Kanban */
  app.post("/api/agenda/colunas", async (request, reply) => {
    const { id, nome } = colunaCriacaoSchema.parse(request.body);
    const r = await grupos.criarColuna(perfilDaRequisicao(request), id, nome);
    return reply.status(r.criada ? 201 : 200).send(ok(r.coluna));
  });
  app.put("/api/agenda/colunas/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    const { nome } = colunaEdicaoSchema.parse(request.body);
    return ok(await grupos.renomearColuna(perfilDaRequisicao(request), id, nome));
  });
  app.delete("/api/agenda/colunas/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    await grupos.excluirColuna(perfilDaRequisicao(request), id);
    return ok({});
  });

  /* Avaliação e soneca */
  app.post("/api/agenda/compromissos/:id/avaliacoes", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    return reply.status(201).send(ok(await interacoes.avaliar(perfilDaRequisicao(request), id, avaliacaoSchema.parse(request.body))));
  });
  app.put("/api/agenda/compromissos/:id/adiamento", async (request) => {
    const { id } = idParams.parse(request.params);
    const { ate } = adiamentoSchema.parse(request.body);
    return ok(await interacoes.adiar(perfilDaRequisicao(request), id, ate));
  });
  app.delete("/api/agenda/compromissos/:id/adiamento", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await interacoes.tirarAdiamento(perfilDaRequisicao(request), id));
  });

  /* Ligações do mapa mental */
  app.post("/api/agenda/relacoes", async (request, reply) =>
    reply.status(201).send(ok(await interacoes.criarRelacao(perfilDaRequisicao(request), relacaoCriacaoSchema.parse(request.body)))));
  app.patch("/api/agenda/relacoes/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    const { rotulo } = relacaoEdicaoSchema.parse(request.body);
    return ok(await interacoes.rotularRelacao(perfilDaRequisicao(request), id, rotulo));
  });
  app.delete("/api/agenda/relacoes/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    await interacoes.excluirRelacao(perfilDaRequisicao(request), id);
    return ok({});
  });
}

/* Transferência do documento antigo (plano, seção 4) */
export async function registrarRotasTransferencia(app: FastifyInstance) {
  // Por pessoa (vários aparelhos saem pelo mesmo IP da loja), como a importação de produtos.
  const limite = limitePorUsuario(10);
  app.get("/api/agenda/transferencia", async (request) => ok(await transferencia.previa(perfilDaRequisicao(request))));
  app.post("/api/agenda/transferencia", { config: limite }, async (request) =>
    ok(await transferencia.executar(perfilDaRequisicao(request), transferenciaAgendaSchema.parse(request.body))));
  app.post("/api/agenda/transferencia/aparelho", { bodyLimit: LIMITE_CORPO_AGENDA, config: limite }, async (request) => {
    const { valor } = copiaDoAparelhoSchema.parse(request.body);
    return ok(await transferencia.receberDoAparelho(perfilDaRequisicao(request), valor));
  });
}
