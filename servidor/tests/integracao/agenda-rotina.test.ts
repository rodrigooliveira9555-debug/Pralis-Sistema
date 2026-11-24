import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { horaLocal, situacaoNoExpediente } from "../../api/src/agenda/rotina.regras.ts";
import { criarApp } from "./ajuda.ts";
import { ajudaAgenda, novoId, type Conta, type Pool } from "./ajuda-agenda.ts";

// Rotina da Agenda (0008, P-45): configurações por pessoa, expediente, hora fora do expediente, desempenho,
// tarefa vinda de uma tela e chat do grupo. Dados fictícios.

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
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

/** Uma janela de expediente que NÃO contém o horário de agora (na loja), para testar "fora do expediente". */
function janelaFora() {
  const m = horaLocal(new Date()).minutos;
  return m < 12 * 60 ? { expedienteInicio: "22:00", expedienteFim: "23:00" } : { expedienteInicio: "01:00", expedienteFim: "02:00" };
}
const diaInteiro = { expedienteInicio: "00:00", expedienteFim: "23:59" };
const configurar = (admin: Conta, alvo: Conta, corpo: object) => pedir(admin.cookie, "PUT", `/api/agenda/configuracoes/${alvo.usuarioId}`, corpo);

async function criar(c: Conta, extra: object = {}) {
  const r = await pedir(c.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "Fechar o caixa", ...extra });
  expect(r.statusCode, r.body).toBe(201);
  return r.json().data as { id: string; versao: number } & Record<string, unknown>;
}

describe("agenda: expediente (regra pura)", () => {
  it("terça 19h com expediente até 17h = 120 min depois; domingo = folga; 7h = 60 min antes; sem expediente", () => {
    const c = { expedienteDias: [1, 2, 3, 4, 5], expedienteInicio: "08:00", expedienteFim: "17:00" };
    expect(situacaoNoExpediente(c, new Date("2026-11-24T22:00:00Z"))).toEqual({ onde: "depois", minutos: 120, dia: "2026-11-24" });
    expect(situacaoNoExpediente(c, new Date("2026-11-24T10:00:00Z"))).toEqual({ onde: "antes", minutos: 60, dia: "2026-11-24" });
    expect(situacaoNoExpediente(c, new Date("2026-11-24T15:00:00Z")).onde).toBe("dentro");
    expect(situacaoNoExpediente(c, new Date("2026-11-22T15:00:00Z"))).toEqual({ onde: "folga", minutos: null, dia: "2026-11-22" });
    expect(situacaoNoExpediente({ expedienteDias: [], expedienteInicio: "", expedienteFim: "" }, new Date()).onde).toBe("sem-expediente");
    // 01h UTC de quarta = 22h de terça na loja.
    expect(horaLocal(new Date("2026-11-25T01:00:00Z"))).toEqual({ data: "2026-11-24", diaSemana: 2, minutos: 22 * 60 });
  });
});

describe("agenda: configurações por pessoa", () => {
  it("só o administrador lista e muda; regra inválida é recusada; o administrador não se tranca", async () => {
    const { gestor: admin, resp } = await cenario();
    expect((await pedir(resp.cookie, "GET", "/api/agenda/configuracoes")).statusCode).toBe(403);
    expect((await configurar(resp, resp, { foraExpediente: "permitir" })).statusCode).toBe(403);
    // Sem expediente não dá para bloquear nem registrar a hora fora.
    expect((await configurar(admin, resp, { foraExpediente: "bloquear" })).statusCode).toBe(400);
    expect((await configurar(admin, resp, { horaFora: "extra" })).statusCode).toBe(400);
    expect((await configurar(admin, resp, { expedienteDias: [1], expedienteInicio: "17:00", expedienteFim: "08:00" })).statusCode).toBe(400);
    expect((await configurar(admin, admin, { expedienteDias: TODOS_OS_DIAS, ...diaInteiro, foraExpediente: "bloquear" })).statusCode).toBe(400);

    const ok = await configurar(admin, resp, { expedienteDias: [5, 1, 1, 2], expedienteInicio: "08:00", expedienteFim: "17:00", horaFora: "comum", inatividadeMinutos: 15 });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(ok.json().data).toMatchObject({ usuarioId: resp.usuarioId, expedienteDias: [1, 2, 5], horaFora: "comum", inatividadeMinutos: 15, foraExpediente: "permitir" });
    const lista = (await pedir(admin.cookie, "GET", "/api/agenda/configuracoes")).json().data.pessoas;
    expect(lista.find((p: { usuarioId: string }) => p.usuarioId === resp.usuarioId).inatividadeMinutos).toBe(15);
    const minha = (await pedir(resp.cookie, "GET", "/api/agenda/configuracoes/minha")).json().data;
    expect(minha).toMatchObject({ inatividadeMinutos: 15, bloqueadaAgora: false, descricaoExpediente: "seg, ter, sex, das 08:00 às 17:00" });
  });

  it("fora do expediente com 'bloquear': a Agenda, o chat e gravar são recusados; dentro, abre", async () => {
    const { gestor: admin, resp } = await cenario();
    const c = await criar(admin, { pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    expect((await configurar(admin, resp, { expedienteDias: TODOS_OS_DIAS, ...janelaFora(), foraExpediente: "bloquear" })).statusCode).toBe(200);
    expect((await pedir(resp.cookie, "GET", "/api/agenda/configuracoes/minha")).json().data.bloqueadaAgora).toBe(true);
    const ler = await pedir(resp.cookie, "GET", "/api/agenda");
    expect(ler.statusCode).toBe(403);
    expect(ler.json().code).toBe("AGENDA_FORA_EXPEDIENTE");
    expect((await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${c.id}/conclusao`, { concluida: true })).json().code).toBe("AGENDA_FORA_EXPEDIENTE");
    expect((await pedir(resp.cookie, "GET", `/api/agenda/compromissos/${c.id}/mensagens`)).json().code).toBe("AGENDA_FORA_EXPEDIENTE");
    // Quem não tem a regra continua usando.
    expect((await pedir(admin.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
    // Dentro do expediente: abre.
    await configurar(admin, resp, { expedienteDias: TODOS_OS_DIAS, ...diaInteiro, foraExpediente: "bloquear" });
    expect((await pedir(resp.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
  });
});

describe("agenda: hora fora do expediente e desempenho", () => {
  it("concluir fora do expediente registra os minutos; dentro não registra; o desempenho soma", async () => {
    const { gestor: admin, resp, leitor } = await cenario();
    const hoje = horaLocal(new Date()).data;
    const fora = await criar(admin, { data: hoje, pessoas: [{ id: resp.usuarioId, responsavel: true, concluir: true }] });
    const dentro = await criar(admin, { data: hoje, pessoas: [{ id: leitor.usuarioId, responsavel: true, concluir: true }] });
    await configurar(admin, resp, { expedienteDias: TODOS_OS_DIAS, ...janelaFora(), horaFora: "extra" });
    await configurar(admin, leitor, { expedienteDias: TODOS_OS_DIAS, ...diaInteiro, horaFora: "extra" });
    expect((await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${fora.id}/conclusao`, { concluida: true })).statusCode).toBe(200);
    expect((await pedir(leitor.cookie, "POST", `/api/agenda/compromissos/${dentro.id}/conclusao`, { concluida: true })).statusCode).toBe(200);
    const { rows } = await pool.query(`SELECT usuario_id, minutos, tipo FROM agenda_horas_fora WHERE empresa_id = $1`, [admin.empresaId]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ usuario_id: resp.usuarioId, tipo: "extra" });
    expect(rows[0].minutos).toBeGreaterThan(0);
    // Concluir de novo (reabrir e concluir) não duplica o registro.
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${fora.id}/conclusao`, { concluida: false });
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${fora.id}/conclusao`, { concluida: true });
    expect((await pool.query(`SELECT 1 FROM agenda_horas_fora WHERE empresa_id = $1`, [admin.empresaId])).rows).toHaveLength(1);

    const d = (await pedir(admin.cookie, "GET", `/api/agenda/desempenho?de=${hoje}&ate=${hoje}`)).json().data;
    const r = d.pessoas.find((p: { usuarioId: string }) => p.usuarioId === resp.usuarioId);
    expect(r).toMatchObject({ recebidas: 1, noPrazo: 1, foraDoPrazo: 0, naoFeitas: 0, emAberto: 0, minutosForaExpediente: rows[0].minutos });
    expect(r.tempoMedioRespostaHoras).not.toBeNull();
  });

  it("no prazo, fora do prazo, não feitas e em aberto; cada pessoa vê só o seu, o administrador vê todos", async () => {
    const { gestor: admin, resp, leitor } = await cenario();
    const hoje = horaLocal(new Date()).data;
    const dia = (n: number) => { const d = new Date(hoje + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const p = [{ id: resp.usuarioId, responsavel: true, concluir: true }];
    const atrasadaFeita = await criar(admin, { data: dia(-2), pessoas: p });
    await criar(admin, { data: dia(-1), pessoas: p }); // não feita
    await criar(admin, { data: dia(3), pessoas: p }); // em aberto
    const noPrazo = await criar(admin, { data: dia(5), pessoas: p });
    await criar(admin, { data: dia(-1), pessoas: [{ id: leitor.usuarioId, responsavel: true }] });
    await criar(admin, { data: dia(30), pessoas: p }); // fora do período
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${atrasadaFeita.id}/conclusao`, { concluida: true });
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${noPrazo.id}/conclusao`, { concluida: true });

    const periodo = `de=${dia(-7)}&ate=${dia(7)}`;
    const meu = (await pedir(resp.cookie, "GET", `/api/agenda/desempenho?${periodo}`)).json().data.pessoas;
    expect(meu).toHaveLength(1);
    expect(meu[0]).toMatchObject({ usuarioId: resp.usuarioId, recebidas: 4, noPrazo: 1, foraDoPrazo: 1, naoFeitas: 1, emAberto: 1 });
    const todos = (await pedir(admin.cookie, "GET", `/api/agenda/desempenho?${periodo}`)).json().data.pessoas;
    expect(todos.map((x: { usuarioId: string }) => x.usuarioId).sort()).toEqual([resp.usuarioId, leitor.usuarioId].sort());
    expect((await pedir(admin.cookie, "GET", `/api/agenda/desempenho?de=${dia(1)}&ate=${dia(-1)}`)).statusCode).toBe(400);
  });

  it("a hora de início não é prazo: só o término (ou o fim do dia) conta", async () => {
    const { gestor: admin, resp } = await cenario();
    const hoje = horaLocal(new Date()).data;
    const p = [{ id: resp.usuarioId, responsavel: true, concluir: true }];
    // Começou à 00:01 e não tem término: feito agora, ainda no mesmo dia = no prazo.
    const semTermino = await criar(admin, { data: hoje, hora: "00:01", pessoas: p });
    // Terminava à 00:02: feito agora = fora do prazo.
    const comTermino = await criar(admin, { data: hoje, hora: "00:01", horaFim: "00:02", pessoas: p });
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${semTermino.id}/conclusao`, { concluida: true });
    await pedir(resp.cookie, "POST", `/api/agenda/compromissos/${comTermino.id}/conclusao`, { concluida: true });
    const d = (await pedir(resp.cookie, "GET", `/api/agenda/desempenho?de=${hoje}&ate=${hoje}`)).json().data.pessoas[0];
    expect(d).toMatchObject({ recebidas: 2, noPrazo: 1, foraDoPrazo: 1 });
  });
});

describe("agenda: tarefa vinda de uma tela", () => {
  const REF = "compras:oc:oc-ag-1";
  const tarefa = (resp: Conta, ref = REF) => ({
    id: novoId(), vinculoRef: ref, vinculoTela: "#/saidas-mercadorias/lancamentos/mer-pedido-de-compra", vinculoTitulo: "MER - Pedido de Compra",
    titulo: "Fazer o pedido de compra", data: "2026-11-25", hora: "08:00", responsaveis: [resp.usuarioId]
  });

  it("cai na lista 'Tarefas das telas' para o responsável; pedir de novo não duplica; fazer o pedido conclui", async () => {
    const { gestor: admin, resp, leitor } = await cenario();
    // Quem só disparou a tela (o leitor abriu o Compras) recebe o id, não a tarefa: ele não participa dela.
    const r1 = await pedir(leitor.cookie, "POST", "/api/agenda/tarefas-de-tela", tarefa(resp));
    expect(r1.statusCode, r1.body).toBe(201);
    expect(r1.json().data.compromisso).toBeNull();
    // Outro aparelho pede a mesma tarefa (id diferente, mesma referência): devolve a mesma. O gestor é o
    // dono da lista (administrador), não quem disparou.
    const r2 = await pedir(admin.cookie, "POST", "/api/agenda/tarefas-de-tela", tarefa(resp));
    expect(r2.statusCode).toBe(200);
    expect(r2.json().data.id).toBe(r1.json().data.id);
    expect(r2.json().data.compromisso).toMatchObject({ grupoId: "lista-tarefas-das-telas", gestorId: admin.usuarioId, vinculoTitulo: "MER - Pedido de Compra", alerta: 0 });

    const doResp = await agenda(resp);
    expect(doResp.grupos.map((g: { id: string; nome: string }) => g.nome)).toContain("Tarefas das telas");
    const t = doResp.compromissos.find((c: { vinculoRef: string }) => c.vinculoRef === REF);
    expect(t.acesso).toMatchObject({ ver: true, concluir: true, responsavel: true });
    expect((await agenda(leitor)).compromissos.map((c: { id: string }) => c.id)).not.toContain(t.id);
    // Quem não é responsável nem gestor não vê a tarefa.
    const { fora } = { fora: await logado("usuario", admin.empresaNome) };
    expect((await agenda(fora)).compromissos).toHaveLength(0);
    expect((await pedir(fora.cookie, "POST", "/api/agenda/tarefas-de-tela/concluir", { vinculoRef: t.vinculoRef })).statusCode).toBe(404);

    const c = await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/concluir", { vinculoRef: t.vinculoRef });
    expect(c.statusCode, c.body).toBe(200);
    expect(c.json().data.compromisso.concluida).toBe(true);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/concluir", { vinculoRef: t.vinculoRef })).json().data.resultado).toBe("sem-mudanca");
  });

  it("pessoa que não é conta, referência ou tela inválida são recusadas; o formulário guarda a tela ligada", async () => {
    const { gestor: admin, resp } = await cenario();
    expect((await pedir(admin.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...tarefa(resp), responsaveis: ["u-jose"] })).statusCode).toBe(400);
    expect((await pedir(admin.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...tarefa(resp), vinculoRef: "com espaço" })).statusCode).toBe(400);
    // Só as telas que criam tarefa (pedido de compra e de produção): outra referência é recusada.
    expect((await pedir(admin.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...tarefa(resp), vinculoRef: "qualquer:coisa" })).statusCode).toBe(400);
    // O id de um compromisso alheio com uma referência nova: 409, sem devolver nada dele.
    const alheio = await criar(admin, { titulo: "Assunto reservado" });
    const tentativa = await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...tarefa(resp, "compras:oc:oc-novo"), id: alheio.id });
    expect(tentativa.statusCode).toBe(409);
    expect(tentativa.body).not.toContain("Assunto reservado");
    expect((await pedir(admin.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...tarefa(resp), vinculoTela: "javascript:alert(1)" })).statusCode).toBe(400);
    const c = await criar(admin, { vinculoTela: "#/agenda/lancamentos", vinculoTitulo: "Agenda" });
    expect(c).toMatchObject({ vinculoTela: "#/agenda/lancamentos", vinculoTitulo: "Agenda", vinculoRef: "" });
    const r = await pedir(admin.cookie, "POST", "/api/agenda/compromissos", { id: novoId(), grupoId: "lista-loja", titulo: "X", vinculoTela: "https://fora.com" });
    expect(r.statusCode).toBe(400);
  });
});

describe("agenda: chat do grupo", () => {
  it("membro conversa e vê não lidas; quem não é membro não lê nem envia", async () => {
    const { gestor: admin, resp, leitor } = await cenario();
    const naoMembro = await logado("usuario", admin.empresaNome);
    const m = await pedir(resp.cookie, "POST", "/api/agenda/grupos/lista-loja/mensagens", { texto: "Bom dia, equipe" });
    expect(m.statusCode, m.body).toBe(201);
    expect(m.json().data).toMatchObject({ texto: "Bom dia, equipe", autorId: resp.usuarioId });
    expect((await pedir(leitor.cookie, "GET", "/api/agenda/grupos-chat/nao-lidas")).json().data.naoLidas).toEqual({ "lista-loja": 1 });
    const lidas = (await pedir(leitor.cookie, "GET", "/api/agenda/grupos/lista-loja/mensagens")).json().data.mensagens;
    expect(lidas.map((x: { texto: string }) => x.texto)).toEqual(["Bom dia, equipe"]);
    await pedir(leitor.cookie, "POST", "/api/agenda/grupos/lista-loja/leitura");
    expect((await pedir(leitor.cookie, "GET", "/api/agenda/grupos-chat/nao-lidas")).json().data.naoLidas).toEqual({});
    expect((await pedir(naoMembro.cookie, "GET", "/api/agenda/grupos/lista-loja/mensagens")).statusCode).toBe(403);
    expect((await pedir(naoMembro.cookie, "POST", "/api/agenda/grupos/lista-loja/mensagens", { texto: "oi" })).statusCode).toBe(403);
    expect((await pedir(naoMembro.cookie, "GET", "/api/agenda/grupos-chat/nao-lidas")).json().data.naoLidas).toEqual({});
    // Outra empresa: a lista nem existe para ela.
    const outra = await logado("administrador");
    expect((await pedir(outra.cookie, "GET", "/api/agenda/grupos/lista-loja/mensagens")).statusCode).toBe(409);
    expect((await pedir(admin.cookie, "POST", "/api/agenda/grupos/lista-loja/mensagens", { texto: "  " })).statusCode).toBe(400);
  });
});
