import type { FastifyInstance } from "fastify";
import { definirSenhaSchema, editarUsuarioSchema, novoUsuarioSchema, ok, usuarioIdParamsSchema } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { adicionarUsuario, definirSenha, editarUsuario, listarUsuarios } from "./usuarios.service.ts";

export async function registrarRotasUsuarios(app: FastifyInstance) {
  app.get("/api/usuarios", async (request) => {
    return ok({ usuarios: await listarUsuarios(perfilDaRequisicao(request)) });
  });

  app.post("/api/usuarios", async (request, reply) => {
    const dados = novoUsuarioSchema.parse(request.body);
    return reply.status(201).send(ok(await adicionarUsuario(perfilDaRequisicao(request), dados)));
  });

  app.patch("/api/usuarios/:id", async (request) => {
    const { id } = usuarioIdParamsSchema.parse(request.params);
    const dados = editarUsuarioSchema.parse(request.body);
    return ok(await editarUsuario(perfilDaRequisicao(request), id, dados));
  });

  app.post("/api/usuarios/:id/senha", async (request, reply) => {
    const { id } = usuarioIdParamsSchema.parse(request.params);
    const { senha } = definirSenhaSchema.parse(request.body);
    await definirSenha(perfilDaRequisicao(request), id, senha);
    return reply.status(204).send();
  });
}
