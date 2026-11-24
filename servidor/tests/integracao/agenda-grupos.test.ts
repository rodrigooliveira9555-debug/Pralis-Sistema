import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp } from "./ajuda.ts";
import { ajudaAgenda, novoId, type Conta, type Pool } from "./ajuda-agenda.ts";

// Listas, membros, colunas, pessoas, avaliação, soneca e ligações do mapa (plano, seções 3 e 7). Dados fictícios.

let app: FastifyInstance;
let pool: Pool;

beforeAll(async () => {
  app = await criarApp();
  ({ pool } = await import("../../api/src/banco/conexao.ts"));
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

const { logado, cenario, pedir, agenda } = ajudaAgenda(() => app, () => pool);

async function criar(c: Conta, extra: object = {}) {
  const r = await pedir(c.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "Conferir câmara fria", ...extra });
  expect(r.statusCode, r.body).toBe(201);
  return r.json().data as { id: string; versao: number };
}

describe("agenda: pessoas", () => {
  it("contas ativas da empresa, só id e nome", async () => {
    const { gestor, resp } = await cenario();
    const r = (await pedir(resp.cookie, "GET", "/api/agenda/pessoas")).json().data.pessoas;
    expect(r).toHaveLength(4);
    expect(Object.keys(r[0]).sort()).toEqual(["id", "nome"]);
    expect(r.map((p: { id: string }) => p.id)).toContain(gestor.usuarioId);
  });
});

describe("agenda: listas", () => {
  it("quem cria é dona e membro; cor só #rrggbb; nome sem repetir", async () => {
    const { resp } = await cenario();
    const id = novoId("lista");
    const r = await pedir(resp.cookie, "POST", "/api/agenda/grupos", { id, nome: "Estoque", cor: "#16a34a" });
    expect(r.statusCode).toBe(201);
    expect(r.json().data).toMatchObject({ donoId: resp.usuarioId, membro: true, podeGerir: true });
    const cor = await pedir(resp.cookie, "POST", "/api/agenda/grupos", { id: novoId("lista"), nome: "Outra", cor: '"><script>' });
    expect(cor.statusCode).toBe(400);
    const nome = await pedir(resp.cookie, "POST", "/api/agenda/grupos", { id: novoId("lista"), nome: " loja ", cor: "#000000" });
    expect(nome.statusCode).toBe(409);
    expect(nome.json().code).toBe("AGENDA_LISTA_NOME_EM_USO");
  });

  it("só a dona ou o administrador muda, exclui e escolhe membros; lista com compromisso não sai", async () => {
    const { gestor, resp, leitor } = await cenario();
    const outro = await pedir(leitor.cookie, "PUT", "/api/agenda/grupos/lista-loja", { versao: 1, nome: "Minha" });
    expect(outro.statusCode).toBe(403);
    const ok = await pedir(gestor.cookie, "PUT", "/api/agenda/grupos/lista-loja", { versao: 1, nome: "Loja Centro", ordenacao: "data" });
    expect(ok.json().data).toMatchObject({ nome: "Loja Centro", ordenacao: "data", versao: 2 });
    expect((await pedir(gestor.cookie, "PUT", "/api/agenda/grupos/lista-loja", { versao: 1, nome: "X" })).json().code).toBe("AGENDA_VERSAO");

    const m = await pedir(gestor.cookie, "PUT", "/api/agenda/grupos/lista-loja/membros", { usuarioIds: [resp.usuarioId] });
    expect(m.json().data.usuarioIds.sort()).toEqual([gestor.usuarioId, resp.usuarioId].sort());
    const outraEmpresa = await logado("usuario");
    expect((await pedir(gestor.cookie, "PUT", "/api/agenda/grupos/lista-loja/membros", { usuarioIds: [outraEmpresa.usuarioId] })).statusCode).toBe(400);
    // Quem saiu da lista não cria mais nela.
    expect((await pedir(leitor.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "x" })).statusCode).toBe(403);

    await criar(gestor);
    const cheia = await pedir(gestor.cookie, "DELETE", "/api/agenda/grupos/lista-loja?versao=2");
    expect(cheia.json().code).toBe("AGENDA_GRUPO_COM_COMPROMISSOS");
  });

  it("lista vazia sai (escondida), mas nunca a última", async () => {
    const { gestor } = await cenario();
    const id = novoId("lista");
    await pedir(gestor.cookie, "POST", "/api/agenda/grupos", { id, nome: "Temporária", cor: "#52525b" });
    expect((await pedir(gestor.cookie, "DELETE", `/api/agenda/grupos/${id}?versao=1`)).statusCode).toBe(200);
    expect((await agenda(gestor)).grupos.map((g: { id: string }) => g.id)).toEqual(["lista-loja"]);
    expect((await pedir(gestor.cookie, "DELETE", "/api/agenda/grupos/lista-loja?versao=1")).json().code).toBe("AGENDA_ULTIMA_LISTA");
  });
});

describe("agenda: colunas do quadro", () => {
  it("criar, renomear e excluir só sem cartão aberto; nunca a última; 'Concluído' é reservado", async () => {
    const { gestor, resp } = await cenario();
    const id = novoId("col");
    expect((await pedir(resp.cookie, "POST", "/api/agenda/colunas", { id, nome: "Em progresso" })).statusCode).toBe(201);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/colunas", { id: novoId("col"), nome: "CONCLUÍDO" })).statusCode).toBe(409);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/colunas", { id: novoId("col"), nome: "a fazer" })).json().code).toBe("AGENDA_COLUNA_NOME_EM_USO");
    expect((await pedir(resp.cookie, "PUT", `/api/agenda/colunas/${id}`, { nome: "Fazendo" })).json().data.nome).toBe("Fazendo");
    const c = await criar(gestor, { colunaId: id });
    expect((await pedir(gestor.cookie, "DELETE", `/api/agenda/colunas/${id}`)).json().code).toBe("AGENDA_COLUNA_COM_CARTOES");
    await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true });
    expect((await pedir(gestor.cookie, "DELETE", `/api/agenda/colunas/${id}`)).statusCode).toBe(200);
    expect((await pedir(gestor.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).json().data.colunaId).toBe("");
    expect((await pedir(gestor.cookie, "DELETE", "/api/agenda/colunas/col-a-fazer")).json().code).toBe("AGENDA_ULTIMA_COLUNA");
  });

  it("levar um cartão concluído para outra coluna reabre (com permissão de concluir)", async () => {
    const { gestor } = await cenario();
    const c = await criar(gestor);
    await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true });
    const r = await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${c.id}`, { versao: 2, colunaId: "col-a-fazer" });
    expect(r.json().data).toMatchObject({ concluida: false, colunaId: "col-a-fazer" });
  });
});

describe("agenda: avaliação imutável (G5)", () => {
  it("gestor avalia o responsável, responsável se autoavalia; segunda nota 409; outro 403; tipo não muda depois da nota", async () => {
    const { gestor, resp, leitor } = await cenario();
    const c = await criar(gestor, { avaliacaoTipo: "estrelas", pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }, { id: leitor.usuarioId, ver: true }] });
    const cedo = await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, { avaliadoId: resp.usuarioId, valor: 4 });
    expect(cedo.json().title).toBe("A avaliação é feita depois de concluído.");
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true });

    expect((await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, { avaliadoId: resp.usuarioId, valor: 9 })).json().title).toBe("Escolha a nota.");
    const g = await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, { avaliadoId: resp.usuarioId, valor: 4, comentario: "Bem feito" });
    expect(g.statusCode).toBe(201);
    const auto = await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, { avaliadoId: resp.usuarioId, valor: 5 });
    expect(auto.statusCode).toBe(201);
    expect(auto.json().data.avaliacao.notas.map((n: { papel: string }) => n.papel)).toEqual(["auto"]);
    const de_novo = await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, { avaliadoId: resp.usuarioId, valor: 1 });
    expect(de_novo.statusCode).toBe(409);
    expect(de_novo.json().code).toBe("AGENDA_AVALIACAO_REGISTRADA");
    expect((await pedir(leitor.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, { avaliadoId: resp.usuarioId, valor: 3 })).statusCode).toBe(403);

    const atual = (await pedir(gestor.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).json().data;
    const put = await pedir(gestor.cookie, "PUT", `/api/agenda/compromissos/${c.id}`, {
      versao: atual.versao, grupoId: "lista-loja", titulo: "Conferir câmara fria", avaliacaoTipo: "nps",
      pessoas: atual.pessoas
    });
    expect(put.json().data.avaliacao.tipo).toBe("estrelas");
  });

  it("duas notas iguais ao mesmo tempo: uma entra, a outra é recusada", async () => {
    const { gestor, resp } = await cenario();
    const c = await criar(gestor, { avaliacaoTipo: "feito", pessoas: [{ id: resp.usuarioId, responsavel: true }] });
    await pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true });
    const corpo = { avaliadoId: resp.usuarioId, valor: 1 };
    const rs = await Promise.all([1, 2].map(() => pedir(gestor.cookie, "POST", `/api/agenda/compromissos/${c.id}/avaliacoes`, corpo)));
    expect(rs.map((r) => r.statusCode).sort()).toEqual([201, 409]);
  });
});

describe("agenda: soneca por pessoa (M3)", () => {
  it("adiar o alerta de uma pessoa não cala o das outras; mudar a hora tira a soneca de todos", async () => {
    const { gestor, resp } = await cenario();
    const c = await criar(gestor, { data: "2026-11-05", hora: "10:00", alerta: 15, pessoas: [{ id: resp.usuarioId, responsavel: true, editar: true }] });
    const ate = "2026-11-05T13:20:00.000Z";
    const r = await pedir(resp.cookie, "PUT", `/api/agenda/compromissos/${c.id}/adiamento`, { ate });
    expect(r.json().data.adiadoPara).toBe(ate);
    expect((await pedir(gestor.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).json().data.adiadoPara).toBe("");
    await pedir(gestor.cookie, "PATCH", `/api/agenda/compromissos/${c.id}`, { versao: 1, hora: "11:00" });
    expect((await pedir(resp.cookie, "GET", `/api/agenda/compromissos/${c.id}`)).json().data.adiadoPara).toBe("");
  });
});

describe("agenda: ligações do mapa", () => {
  it("editar na ponta de, ver na ponta para; não repete em sentido nenhum; some quando o compromisso sai", async () => {
    const { gestor, leitor } = await cenario();
    const a = await criar(gestor, { titulo: "A", pessoas: [{ id: leitor.usuarioId, ver: true }] });
    const b = await criar(gestor, { titulo: "B" });
    const id = novoId("rel");
    const r = await pedir(gestor.cookie, "POST", "/api/agenda/relacoes", { id, de: a.id, para: b.id, rotulo: "antes de" });
    expect(r.statusCode).toBe(201);
    expect((await pedir(gestor.cookie, "POST", "/api/agenda/relacoes", { id: novoId("rel"), de: b.id, para: a.id })).json().code).toBe("AGENDA_JA_LIGADOS");
    expect((await pedir(leitor.cookie, "PATCH", `/api/agenda/relacoes/${id}`, { rotulo: "x" })).statusCode).toBe(403);
    expect((await agenda(leitor)).relacoes).toEqual([]); // o leitor não vê a ponta B
    expect((await agenda(gestor)).relacoes).toEqual([{ id, de: a.id, para: b.id, rotulo: "antes de" }]);
    await pedir(gestor.cookie, "DELETE", `/api/agenda/compromissos/${b.id}?versao=1`);
    expect((await agenda(gestor)).relacoes).toEqual([]);
  });
});
