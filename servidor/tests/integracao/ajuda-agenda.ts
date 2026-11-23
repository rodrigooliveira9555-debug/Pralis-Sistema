import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type * as Conexao from "../../api/src/banco/conexao.ts";
import { comSessao, criarConta, entrar } from "./ajuda.ts";

// Ajuda dos testes da Agenda nas tabelas. Dados fictícios.

export type Pool = typeof Conexao.pool;
export type Conta = Awaited<ReturnType<typeof criarConta>> & { cookie: string };
export type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function ajudaAgenda(app: () => FastifyInstance, pool: () => Pool) {
  async function logado(papel: "administrador" | "usuario", empresaNome?: string): Promise<Conta> {
    const conta = await criarConta(papel, empresaNome);
    const { cookie } = await entrar(app(), conta.email, conta.senha);
    return { ...conta, cookie };
  }

  /** A Agenda da empresa já nas tabelas (como a transferência deixa): contador, a lista "Loja", uma coluna e membros. */
  async function prepararAgenda(dono: Conta, membros: Conta[]) {
    const q = (sql: string, v: unknown[]) => pool().query(sql, v);
    await q(`INSERT INTO agenda_estado (empresa_id) VALUES ($1)`, [dono.empresaId]);
    await q(`INSERT INTO agenda_grupos (empresa_id, id, nome, cor, dono_id, criado_por, atualizado_por) VALUES ($1, 'lista-loja', 'Loja', '#2563eb', $2, $2, $2)`,
      [dono.empresaId, dono.usuarioId]);
    await q(`INSERT INTO agenda_colunas (empresa_id, id, nome, ordem, criado_por, atualizado_por) VALUES ($1, 'col-a-fazer', 'A fazer', 0, $2, $2)`,
      [dono.empresaId, dono.usuarioId]);
    for (const m of [dono, ...membros]) {
      await q(`INSERT INTO agenda_grupo_membros (empresa_id, grupo_id, usuario_id, criado_por) VALUES ($1, 'lista-loja', $2, $3)`, [dono.empresaId, m.usuarioId, dono.usuarioId]);
    }
  }

  /** Gestor (administrador), responsável, leitor e alguém de fora (membro da lista, não participa). */
  async function cenario() {
    const gestor = await logado("administrador");
    const resp = await logado("usuario", gestor.empresaNome);
    const leitor = await logado("usuario", gestor.empresaNome);
    const fora = await logado("usuario", gestor.empresaNome);
    await prepararAgenda(gestor, [resp, leitor, fora]);
    return { gestor, resp, leitor, fora };
  }

  const pedir = (cookie: string, method: Metodo, url: string, payload?: object) =>
    app().inject({ method, url, headers: comSessao(cookie), ...(payload ? { payload } : {}) });

  const agenda = async (c: Conta) => (await pedir(c.cookie, "GET", "/api/agenda")).json().data;

  return { logado, prepararAgenda, cenario, pedir, agenda };
}

export const novoId = (prefixo = "ag") => prefixo + "-" + randomUUID();
