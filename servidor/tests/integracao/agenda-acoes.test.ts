import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { horaLocal } from "../../api/src/agenda/rotina.regras.ts";
import { criarApp } from "./ajuda.ts";
import { ajudaAgenda, novoId, type Conta, type Pool } from "./ajuda-agenda.ts";

// Áudio do Rodrigo de 25/11/2026 (P-53, migration 0012): ação programada por tela que conclui sozinha (ação +
// quantidade, por repetição), telas do ícone de agendar escolhidas pelo administrador, e foto/áudio no chat.
// Dados fictícios.

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

const { cenario, pedir, agenda } = ajudaAgenda(() => app, () => pool);
const TELA = "#/saidas-mercadorias/cadastros-geral/compras-produtos";
const hoje = () => horaLocal(new Date()).data;
const somar = (dia: string, n: number) => { const d = new Date(dia + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function criar(c: Conta, extra: object) {
  const r = await pedir(c.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "Excluir 3 produtos", vinculoTela: TELA, vinculoTitulo: "MER - Produtos", ...extra });
  expect(r.statusCode, r.body).toBe(201);
  return r.json().data as { id: string; acaoTela: string; acaoQuantidade: number | null; acaoFeitas: number; data: string };
}
const fazer = (c: Conta, acao: string, quantidade = 1) => pedir(c.cookie, "POST", "/api/agenda/acoes-de-tela", { acao, quantidade });

describe("agenda: ação programada por tela (P-53)", () => {
  it("conta a ação do responsável e conclui sozinha na quantidade; quem não participa não conta", async () => {
    const { gestor: admin, resp, fora } = await cenario();
    const t = await criar(admin, { data: hoje(), acaoTela: "produtos:excluir", acaoQuantidade: 3, pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    expect(t).toMatchObject({ acaoTela: "produtos:excluir", acaoQuantidade: 3, acaoFeitas: 0 });
    // Quem não participa faz a ação: não conta para esta tarefa.
    expect((await fazer(fora, "produtos:excluir")).json().data.tarefas).toEqual([]);
    // Outra ação não conta.
    expect((await fazer(resp, "produtos:alterar")).json().data.tarefas).toEqual([]);
    const r1 = (await fazer(resp, "produtos:excluir", 2)).json().data.tarefas;
    expect(r1).toEqual([{ id: t.id, feitas: 2, quantidade: 3, concluiu: false }]);
    expect((await agenda(resp)).compromissos.find((c: { id: string }) => c.id === t.id).acaoFeitas).toBe(2);
    const r2 = (await fazer(resp, "produtos:excluir")).json().data.tarefas;
    expect(r2).toEqual([{ id: t.id, feitas: 3, quantidade: 3, concluiu: true }]);
    expect((await agenda(admin)).compromissos.find((c: { id: string }) => c.id === t.id).concluida).toBe(true);
    // Concluída: novas ações não mexem nela.
    expect((await fazer(resp, "produtos:excluir")).json().data.tarefas).toEqual([]);
  });

  it("repetição: ao chegar na quantidade, a repetição avança e a contagem recomeça; antes do dia não conta", async () => {
    const { gestor: admin, resp } = await cenario();
    const mensal = await criar(admin, { data: hoje(), repeticao: { tipo: "mes" }, acaoTela: "produtos:excluir", acaoQuantidade: 1, pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    const futura = await criar(admin, { data: somar(hoje(), 3), acaoTela: "produtos:excluir", acaoQuantidade: 1, pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    const r = (await fazer(resp, "produtos:excluir")).json().data.tarefas;
    expect(r).toEqual([{ id: mensal.id, feitas: 1, quantidade: 1, concluiu: true }]);
    const depois = (await agenda(resp)).compromissos.find((c: { id: string }) => c.id === mensal.id);
    expect(depois.concluida).toBe(false);
    expect(depois.data > hoje()).toBe(true);
    expect(depois.acaoFeitas).toBe(0);
    expect((await agenda(resp)).compromissos.find((c: { id: string }) => c.id === futura.id).acaoFeitas).toBe(0);
  });

  it("ação só com tela ligada; ação e quantidade inválidas são recusadas", async () => {
    const { gestor: admin } = await cenario();
    const sem = await pedir(admin.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "Sem tela", acaoTela: "produtos:excluir", acaoQuantidade: 2 });
    expect(sem.statusCode, sem.body).toBe(201);
    expect(sem.json().data).toMatchObject({ acaoTela: "", acaoQuantidade: null });
    expect((await pedir(admin.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "X", vinculoTela: TELA, acaoTela: "Produtos excluir", acaoQuantidade: 2 })).statusCode).toBe(400);
    expect((await pedir(admin.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "X", vinculoTela: TELA, acaoTela: "produtos:excluir", acaoQuantidade: 0 })).statusCode).toBe(400);
    expect((await fazer(admin, "nada")).statusCode).toBe(400);
  });
});

describe("agenda: ação geral \"Salvar algo nesta tela\" (P-53, 26/11/2026)", () => {
  it("conta só para a tarefa ligada à tela em que a pessoa salvou; sem a tela é recusada", async () => {
    const { gestor: admin, resp } = await cenario();
    const OUTRA = "#/saidas-despesas/lancamentos/vz-lan-des-despesas";
    const aqui = await criar(admin, { data: hoje(), acaoTela: "tela:salvar", acaoQuantidade: 2, pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    const la = await criar(admin, { data: hoje(), vinculoTela: OUTRA, vinculoTitulo: "DES - Despesas", acaoTela: "tela:salvar", acaoQuantidade: 1, pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    const salvar = (tela?: string) => pedir(resp.cookie, "POST", "/api/agenda/acoes-de-tela", { acao: "tela:salvar", quantidade: 1, ...(tela ? { tela } : {}) });
    expect((await salvar()).statusCode).toBe(400);
    expect((await salvar(TELA)).json().data.tarefas).toEqual([{ id: aqui.id, feitas: 1, quantidade: 2, concluiu: false }]);
    expect((await salvar(TELA)).json().data.tarefas).toEqual([{ id: aqui.id, feitas: 2, quantidade: 2, concluiu: true }]);
    // A tarefa da outra tela continua esperando.
    const outra = (await agenda(resp)).compromissos.find((c: { id: string }) => c.id === la.id);
    expect(outra).toMatchObject({ concluida: false, acaoFeitas: 0 });
    expect((await salvar(OUTRA)).json().data.tarefas).toEqual([{ id: la.id, feitas: 1, quantidade: 1, concluiu: true }]);
  });
});

describe("agenda: telas do ícone de agendar (P-53)", () => {
  it("o administrador liga e desliga; todos leem; quem não é administrador não muda", async () => {
    const { gestor: admin, resp } = await cenario();
    expect((await pedir(resp.cookie, "GET", "/api/agenda/telas-icone")).json().data.telas).toEqual({});
    const put = await pedir(admin.cookie, "PUT", "/api/agenda/telas-icone", { tela: TELA, mostrar: false });
    expect(put.statusCode, put.body).toBe(200);
    expect((await pedir(resp.cookie, "GET", "/api/agenda/telas-icone")).json().data.telas).toEqual({ [TELA]: false });
    expect((await pedir(admin.cookie, "PUT", "/api/agenda/telas-icone", { tela: TELA, mostrar: true })).statusCode).toBe(200);
    expect((await pedir(resp.cookie, "GET", "/api/agenda/telas-icone")).json().data.telas).toEqual({ [TELA]: true });
    expect((await pedir(resp.cookie, "PUT", "/api/agenda/telas-icone", { tela: TELA, mostrar: false })).statusCode).toBe(403);
    expect((await pedir(admin.cookie, "PUT", "/api/agenda/telas-icone", { tela: "javascript:x", mostrar: false })).statusCode).toBe(400);
  });
});

describe("agenda: foto e áudio no chat do compromisso (P-53)", () => {
  it("áudio (Ogg) vira arquivo e a mensagem aponta para ele; arquivo de outro compromisso é recusado", async () => {
    const { gestor: admin, resp } = await cenario();
    const p = [{ id: resp.usuarioId, responsavel: true, concluir: true }];
    const a = await criar(admin, { titulo: "Com áudio", pessoas: p });
    const b = await criar(admin, { titulo: "Outro", pessoas: p });
    const ogg = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(60, 1)]).toString("base64");
    const arq = await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${a.id}/arquivos`, { nome: "audio.ogg", conteudoBase64: ogg });
    expect(arq.statusCode, arq.body).toBe(201);
    expect(arq.json().data.tipo).toBe("audio/ogg");
    const m = await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${a.id}/mensagens`, { texto: "Áudio", arquivoId: arq.json().data.id });
    expect(m.statusCode, m.body).toBe(201);
    expect(m.json().data.arquivo).toMatchObject({ id: arq.json().data.id, tipo: "audio/ogg" });
    const lidas = (await pedir(admin.cookie, "GET", `/api/agenda/compromissos/${a.id}/mensagens`)).json().data.mensagens;
    expect(lidas.at(-1).arquivo).toMatchObject({ nome: "audio.ogg", tipo: "audio/ogg" });
    expect((await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${b.id}/mensagens`, { texto: "Áudio", arquivoId: arq.json().data.id })).statusCode).toBe(404);
    // Extensão de áudio com conteúdo que não é áudio: recusado.
    expect((await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${a.id}/arquivos`, { nome: "falso.ogg", conteudoBase64: Buffer.from("<html>oi</html>").toString("base64") })).statusCode).toBe(415);
  });
});
