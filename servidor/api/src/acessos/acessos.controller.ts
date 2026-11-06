import type { FastifyInstance } from "fastify";
import {
  acessosUsuarioSchema,
  AREAS_PERMISSAO,
  CARGOS_SUGERIDOS,
  cargoAcessoSchema,
  cargoIdParamsSchema,
  editarCargoAcessoSchema,
  ok,
  PERMISSOES,
  PERMISSOES_SEM_CARGO,
  PDVS_POSTO,
  TURNOS_POSTO,
  usuarioIdParamsSchema
} from "@cicluz/shared";
import { senhaMinimaAutenticacao } from "../auth/config.ts";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { criarCargo, criarCargosSugeridos, editarCargo, listarCargos, obterAcessos, salvarAcessos } from "./acessos.service.ts";

export async function registrarRotasAcessos(app: FastifyInstance) {
  // Catálogo fixo (vem do código): qualquer pessoa logada lê, para a tela saber o que mostrar.
  app.get("/api/acessos/catalogo", async () =>
    ok({
      areas: AREAS_PERMISSAO.map(([id, nome]) => ({ id, nome })),
      permissoes: PERMISSOES,
      permissoesSemCargo: PERMISSOES_SEM_CARGO,
      // As telas mostram e conferem a mesma senha mínima que o servidor exige.
      senhaMinima: senhaMinimaAutenticacao,
      cargosSugeridos: CARGOS_SUGERIDOS.map(({ nome, descricao }) => ({ nome, descricao })),
      postos: { pdvs: PDVS_POSTO, turnos: TURNOS_POSTO.map(([id, nome]) => ({ id, nome })) }
    })
  );

  app.get("/api/cargos-acesso", async (request) => ok({ cargos: await listarCargos(perfilDaRequisicao(request)) }));

  app.post("/api/cargos-acesso", async (request, reply) => {
    const dados = cargoAcessoSchema.parse(request.body);
    return reply.status(201).send(ok(await criarCargo(perfilDaRequisicao(request), dados)));
  });

  app.post("/api/cargos-acesso/sugeridos", async (request) => ok(await criarCargosSugeridos(perfilDaRequisicao(request))));

  app.patch("/api/cargos-acesso/:id", async (request) => {
    const { id } = cargoIdParamsSchema.parse(request.params);
    const dados = editarCargoAcessoSchema.parse(request.body);
    return ok(await editarCargo(perfilDaRequisicao(request), id, dados));
  });

  app.get("/api/usuarios/:id/acessos", async (request) => {
    const { id } = usuarioIdParamsSchema.parse(request.params);
    return ok(await obterAcessos(perfilDaRequisicao(request), id));
  });

  app.put("/api/usuarios/:id/acessos", async (request) => {
    const { id } = usuarioIdParamsSchema.parse(request.params);
    const dados = acessosUsuarioSchema.parse(request.body);
    return ok(await salvarAcessos(perfilDaRequisicao(request), id, dados));
  });
}
