import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as Conexao from "../../api/src/banco/conexao.ts";
import { comSessao, criarApp, criarConta, entrar } from "./ajuda.ts";

// Compromissos da Agenda nas tabelas (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seções 3 e 7). Dados fictícios.

let app: FastifyInstance;
let pool: typeof Conexao.pool;

beforeAll(async () => {
  app = await criarApp();
  ({ pool } = await import("../../api/src/banco/conexao.ts"));
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

type Conta = Awaited<ReturnType<typeof criarConta>> & { cookie: string };
async function logado(papel: "administrador" | "usuario", empresaNome?: string): Promise<Conta> {
  const conta = await criarConta(papel, empresaNome);
  const { cookie } = await entrar(app, conta.email, conta.senha);
  return { ...conta, cookie };
}

/** A Agenda da empresa "já nas tabelas" (o que a transferência do passo A6 faz): contador, uma lista e membros. */
async function prepararAgenda(dono: Conta, membros: Conta[]) {
  await pool.query(`INSERT INTO agenda_estado (empresa_id) VALUES ($1)`, [dono.empresaId]);
  await pool.query(`INSERT INTO agenda_grupos (empresa_id, id, nome, cor, dono_id, criado_por, atualizado_por) VALUES ($1, 'lista-loja', 'Loja', '#2563eb', $2, $2, $2)`,
    [dono.empresaId, dono.usuarioId]);
  await pool.query(`INSERT INTO agenda_colunas (empresa_id, id, nome, ordem, criado_por, atualizado_por) VALUES ($1, 'col-a-fazer', 'A fazer', 0, $2, $2)`,
    [dono.empresaId, dono.usuarioId]);
  for (const m of [dono, ...membros]) {
    await pool.query(`INSERT INTO agenda_grupo_membros (empresa_id, grupo_id, usuario_id, criado_por) VALUES ($1, 'lista-loja', $2, $3)`, [dono.empresaId, m.usuarioId, dono.usuarioId]);
  }
}

/** Gestor, responsável (edita e conclui), leitor (só vê), alguém de fora (membro da lista, não participa). */
async function cenario() {
  const gestor = await logado("administrador");
  const resp = await logado("usuario", gestor.empresaNome);
  const leitor = await logado("usuario", gestor.empresaNome);
  const fora = await logado("usuario", gestor.empresaNome);
  await prepararAgenda(gestor, [resp, leitor, fora]);
  return { gestor, resp, leitor, fora };
}

const pedir = (cookie: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object) =>
  app.inject({ method, url, headers: comSessao(cookie), ...(payload ? { payload } : {}) });

const novoId = () => "ag-" + randomUUID();
const base = (extra: object = {}) => ({ grupoId: "lista-loja", titulo: "Fechar o caixa", ...extra });

async function criar(c: Conta, extra: object = {}) {
  const id = novoId();
  const r = await pedir(c.cookie, "POST", "/api/agenda/compromissos", { id, ...base(extra) });
  expect(r.statusCode, r.body).toBe(201);
  return r.json().data as { id: string; versao: number; data: string; repeticao: { ancora: string; feitas: number } | null } & Record<string, unknown>;
}
const agenda = async (c: Conta) => (await pedir(c.cookie, "GET", "/api/agenda")).json().data;

describe("agenda: antes da transferência", () => {
  it("GET diz que ainda não está no servidor; gravar é recusado", async () => {
    const g = await logado("administrador");
    const a = await agenda(g);
    expect(a.estado.noServidor).toBe(false);
    expect(a.compromissos).toEqual([]);
    const r = await pedir(g.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), ...base() });
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe("AGENDA_NAO_TRANSFERIDA");
  });
});

describe("agenda: criar", () => {
  it("gestor = quem criou; repetir o pedido não duplica; id de outro é recusado", async () => {
    const { gestor, resp } = await cenario();
    const id = novoId();
    const corpo = { id, ...base({ pessoas: [{ id: resp.usuarioId, responsavel: true, editar: true, concluir: true }] }) };
    const r1 = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos", corpo);
    expect(r1.statusCode).toBe(201);
    expect(r1.json().data).toMatchObject({ id, gestorId: gestor.usuarioId, versao: 1, acesso: { gestor: true } });
    expect(r1.json().data.pessoas[0]).toEqual({ id: resp.usuarioId, responsavel: true, ver: true, editar: true, concluir: true, excluir: false });
    const r2 = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos", corpo);
    expect(r2.statusCode).toBe(200);
    expect((await agenda(gestor)).compromissos.filter((c: { id: string }) => c.id === id)).toHaveLength(1);
    const r3 = await pedir(resp.cookie, "POST", "/api/agenda/compromissos", { id, ...base() });
    expect(r3.statusCode).toBe(409);
    expect(r3.json().code).toBe("AGENDA_ID_EM_USO");
  });

  it("o corpo não escolhe o gestor; pessoa de outra empresa e lista de que não participa são recusadas", async () => {
    const { gestor } = await cenario();
    const r = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), ...base(), gestorId: "outro", criadoPor: "outro" });
    expect(r.statusCode).toBe(201);
    expect(r.json().data.gestorId).toBe(gestor.usuarioId);
    const outra = await logado("usuario");
    const p = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), ...base({ pessoas: [{ id: outra.usuarioId, ver: true }] }) });
    expect(p.statusCode).toBe(400);
    expect(p.json().code).toBe("AGENDA_INVALIDO");
    const naoMembro = await logado("usuario", gestor.empresaNome);
    const m = await pedir(naoMembro.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), ...base() });
    expect(m.statusCode).toBe(403);
  });

  it("o banco se defende pela API: término antes do início e repetição sem data", async () => {
    const { gestor } = await cenario();
    const t = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), ...base({ data: "2026-11-05", hora: "10:00", horaFim: "09:00" }) });
    expect(t.statusCode).toBe(400);
    expect(t.json().title).toBe("O término precisa ser depois do início.");
    const r = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), ...base({ repeticao: { tipo: "dia" } }) });
    expect(r.statusCode).toBe(400);
    expect(r.json().title).toBe("Para repetir, informe a data.");
  });
});

describe("agenda: quem vê o quê", () => {
  it("quem não participa não recebe; leitor recebe sem notas; responsável só a própria autoavaliação; outra empresa nada", async () => {
    const { gestor, resp, leitor, fora } = await cenario();
    const c = await criar(gestor, {
      avaliacaoTipo: "estrelas",
      pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }, { id: leitor.usuarioId, ver: true }]
    });
    await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true });
    await pool.query(`INSERT INTO agenda_avaliacoes (empresa_id, compromisso_id, avaliado_id, por_id, papel, tipo, valor) VALUES ($1, $2, $3, $4, 'gestor', 'estrelas', 4), ($1, $2, $3, $3, 'auto', 'estrelas', 5)`,
      [gestor.empresaId, c.id, resp.usuarioId, gestor.usuarioId]);

    expect((await agenda(fora)).compromissos.map((x: { id: string }) => x.id)).not.toContain(c.id);
    expect((await pedir(fora.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).statusCode).toBe(404);
    const doLeitor = (await agenda(leitor)).compromissos.find((x: { id: string }) => x.id === c.id);
    expect(doLeitor.avaliacao.notas).toEqual([]);
    expect(doLeitor.acesso).toMatchObject({ ver: true, editar: false, concluir: false, excluir: false });
    const doResp = (await agenda(resp)).compromissos.find((x: { id: string }) => x.id === c.id);
    expect(doResp.avaliacao.notas.map((n: { papel: string }) => n.papel)).toEqual(["auto"]);
    expect((await agenda(gestor)).compromissos.find((x: { id: string }) => x.id === c.id).avaliacao.notas).toHaveLength(2);
    const outra = await logado("administrador");
    expect((await pedir(outra.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).statusCode).toBe(409); // a outra empresa nem tem Agenda
  });

  it("ETag: sem mudança responde 304; depois de gravar, os dados novos", async () => {
    const { gestor } = await cenario();
    const r1 = await pedir(gestor.cookie, "GET", "/api/agenda");
    const etag = r1.headers["etag"] as string;
    const r2 = await app.inject({ method: "GET", url: "/api/agenda", headers: { ...comSessao(gestor.cookie), "if-none-match": etag } });
    expect(r2.statusCode).toBe(304);
    await criar(gestor);
    const r3 = await app.inject({ method: "GET", url: "/api/agenda", headers: { ...comSessao(gestor.cookie), "if-none-match": etag } });
    expect(r3.statusCode).toBe(200);
  });
});

describe("agenda: permissões e versão", () => {
  it("só-ver não edita, conclui nem exclui; responsável não muda pessoas nem o tipo de avaliação", async () => {
    const { gestor, resp, leitor } = await cenario();
    const c = await criar(gestor, { pessoas: [{ id: resp.usuarioId, responsavel: true, editar: true, concluir: true }, { id: leitor.usuarioId, ver: true }] });
    expect((await pedir(leitor.cookie, "PATCH", `/api/agenda/compromissos/${c.id}`, { versao: 1, titulo: "Outro" })).statusCode).toBe(403);
    expect((await pedir(leitor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true })).statusCode).toBe(403);
    expect((await pedir(leitor.cookie, "DELETE", `/api/agenda/compromissos/${c.id}?versao=1`)).statusCode).toBe(403);
    expect((await pedir(resp.cookie, "DELETE", `/api/agenda/compromissos/${c.id}?versao=1`)).statusCode).toBe(403);

    const e = await pedir(resp.cookie, "PUT", `/api/agenda/compromissos/${c.id}`, { versao: 1, ...base({ titulo: "Fechar o caixa às 18h", pessoas: [{ id: resp.usuarioId, responsavel: true, editar: true, concluir: true, excluir: true }], avaliacaoTipo: "nps" }) });
    expect(e.statusCode).toBe(200);
    expect(e.json().data.titulo).toBe("Fechar o caixa às 18h");
    expect(e.json().data.pessoas).toHaveLength(2);
    expect(e.json().data.pessoas[0].excluir).toBe(false);
    expect(e.json().data.avaliacao.tipo).toBe("");
  });

  it("conflito só no compromisso que mudou (409 com a versão atual)", async () => {
    const { gestor } = await cenario();
    const x = await criar(gestor, { titulo: "X" });
    const y = await criar(gestor, { titulo: "Y" });
    expect((await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${x.id}`, { versao: 1, titulo: "X do aparelho A" })).statusCode).toBe(200);
    const b = await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${x.id}`, { versao: 1, titulo: "X do aparelho B" });
    expect(b.statusCode).toBe(409);
    expect(b.json().code).toBe("AGENDA_VERSAO");
    expect(b.json().details.compromisso).toMatchObject({ titulo: "X do aparelho A", versao: 2 });
    expect((await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${y.id}`, { versao: 1, titulo: "Y do aparelho B" })).statusCode).toBe(200);
  });
});

describe("agenda: concluir pelo estado desejado", () => {
  it("duplo toque num que repete: UMA cópia, feitas + 1, próxima data uma vez só", async () => {
    const { gestor } = await cenario();
    const c = await criar(gestor, { data: "2026-11-05", hora: "10:00", horaFim: "10:30", repeticao: { tipo: "dia" }, subtarefas: [{ titulo: "Contar notas", concluida: true }] });
    const corpo = { concluida: true, ocorrencia: "2026-11-05" };
    const [a, b] = await Promise.all([
      pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, corpo),
      pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, corpo)
    ]);
    expect([a.statusCode, b.statusCode]).toEqual([200, 200]);
    expect([a.json().data.resultado, b.json().data.resultado].sort()).toEqual(["repetiu", "sem-mudanca"]);
    const todos = (await agenda(gestor)).compromissos;
    const copias = todos.filter((x: { origemId: string }) => x.origemId === c.id);
    expect(copias).toHaveLength(1);
    expect(copias[0]).toMatchObject({ concluida: true, ocorrencia: "2026-11-05", repeticao: null, data: "2026-11-05" });
    const original = todos.find((x: { id: string }) => x.id === c.id);
    expect(original).toMatchObject({ concluida: false, data: "2026-11-06", hora: "10:00", horaFim: "10:30" });
    expect(original.repeticao.feitas).toBe(1);
    expect(original.subtarefas[0].concluida).toBe(false);
    // Cartão de alerta velho (M4): pede "concluída" da ocorrência que já passou → nada muda.
    const velho = await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, corpo);
    expect(velho.json().data.resultado).toBe("sem-mudanca");
  });

  it("não repetitivo: concluído uma vez; pedido de concluir num já concluído continua concluído; reabrir só com false", async () => {
    const { gestor } = await cenario();
    const c = await criar(gestor);
    const vizinho = await criar(gestor, { titulo: "Vizinho" });
    expect((await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true })).json().data.resultado).toBe("concluiu");
    const de_novo = await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true });
    expect(de_novo.json().data).toMatchObject({ resultado: "sem-mudanca", compromisso: { concluida: true } });
    expect((await pedir(gestor.cookie, "GET", `/api/agenda/compromissos/${vizinho.id}`)).json().data).toMatchObject({ concluida: false, versao: 1 });
    expect((await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: false })).json().data.resultado).toBe("reabriu");
  });

  it("subtarefa pelo estado desejado (repetir não desfaz)", async () => {
    const { gestor } = await cenario();
    const c = await criar(gestor, { subtarefas: [{ titulo: "Levar planilha" }] });
    const subId = (c["subtarefas"] as Array<{ id: string }>)[0]!.id;
    for (let i = 0; i < 2; i++) {
      const r = await pedir(gestor.cookie, "PUT", `/api/agenda/compromissos/${c.id}/subtarefas/${subId}`, { concluida: true });
      expect(r.json().data.subtarefas[0].concluida).toBe(true);
    }
  });
});

describe("agenda: âncora da repetição (M5) por um caminho só", () => {
  it("mensal do dia 31 levado para o dia 10 pelo formulário ou pela mudança parcial: as próximas no dia 10", async () => {
    const { gestor } = await cenario();
    const pelaTela = await criar(gestor, { data: "2026-01-31", repeticao: { tipo: "mes" } });
    expect(pelaTela.repeticao?.ancora).toBe("2026-01-31");
    const put = await pedir(gestor.cookie, "PUT", `/api/agenda/compromissos/${pelaTela.id}`, { versao: 1, ...base({ data: "2026-02-10", repeticao: { tipo: "mes" } }) });
    expect(put.json().data.repeticao.ancora).toBe("2026-02-10");
    const concl = await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${pelaTela.id}/conclusao`, { concluida: true, ocorrencia: "2026-02-10" });
    expect(concl.json().data.compromisso.data).toBe("2026-03-10");

    const peloMapa = await criar(gestor, { data: "2026-01-31", repeticao: { tipo: "mes" } });
    const patch = await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${peloMapa.id}`, { versao: 1, data: "2026-02-10" });
    expect(patch.json().data.repeticao.ancora).toBe("2026-02-10");
  });

  it("tirar a data pela mudança parcial tira hora, repetição e alerta junto", async () => {
    const { gestor } = await cenario();
    const c = await criar(gestor, { data: "2026-11-05", hora: "10:00", alerta: 15, repeticao: { tipo: "semana" } });
    const r = await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${c.id}`, { versao: 1, data: "" });
    expect(r.json().data).toMatchObject({ data: "", hora: "", repeticao: null, alerta: null });
  });
});

describe("agenda: ordem, excluir e limpar", () => {
  it("ordem manual: pôr antes de outro muda só um registro", async () => {
    const { gestor } = await cenario();
    const a = await criar(gestor, { titulo: "A" });
    const b = await criar(gestor, { titulo: "B" });
    const c = await criar(gestor, { titulo: "C" });
    const r = await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${c.id}`, { versao: 1, antesDe: b.id });
    expect(r.statusCode).toBe(200);
    const ordem = (await agenda(gestor)).compromissos.sort((x: { ordem: number }, y: { ordem: number }) => x.ordem - y.ordem).map((x: { titulo: string }) => x.titulo);
    expect(ordem).toEqual(["A", "C", "B"]);
    const versoes = (await agenda(gestor)).compromissos.map((x: { id: string; versao: number }) => [x.id === c.id ? "c" : "outro", x.versao]);
    expect(versoes.filter(([q]: [string]) => q === "outro").every(([, v]: [string, number]) => v === 1)).toBe(true);
    expect(a.versao).toBe(1);
  });

  it("excluir esconde (com versão); limpar concluídos só os que a pessoa pode excluir", async () => {
    const { gestor, resp } = await cenario();
    const c = await criar(gestor);
    expect((await pedir(gestor.cookie, "DELETE", `/api/agenda/compromissos/${c.id}?versao=9`)).statusCode).toBe(409);
    expect((await pedir(gestor.cookie, "DELETE", `/api/agenda/compromissos/${c.id}?versao=1`)).statusCode).toBe(200);
    expect((await pedir(gestor.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).statusCode).toBe(404);
    const { rows } = await pool.query(`SELECT excluido_em FROM agenda_compromissos WHERE empresa_id = $1 AND id = $2`, [gestor.empresaId, c.id]);
    expect(rows[0].excluido_em).not.toBeNull(); // continua no banco

    const meu = await criar(resp);
    const dele = await criar(gestor, { pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    for (const x of [meu, dele]) await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${x.id}/conclusao`, { concluida: true });
    const l = await pedir(resp.cookie, "POST", "/api/agenda/limpar-concluidos", { grupoId: "lista-loja" });
    expect(l.json().data.excluidos).toBe(1);
    expect((await pedir(resp.cookie, "GET", `/api/agenda/compromissos/${dele.id}`)).json().data.concluida).toBe(true);
  });
});
