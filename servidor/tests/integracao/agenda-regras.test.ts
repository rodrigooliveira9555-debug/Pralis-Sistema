import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { horaLocal, situacaoNaEscala, type DiaExpediente } from "../../api/src/agenda/rotina.regras.ts";
import { criarApp } from "./ajuda.ts";
import { ajudaAgenda, novoId, type Conta, type Pool } from "./ajuda-agenda.ts";

// Respostas do Zé às perguntas da P-46 (24/11/2026, migration 0009): tarefa por permissão (lançar produção,
// integração de colaborador novo), lista ligada a uma área, expediente vindo dos Horários/Escalas e sair por
// tempo parado no servidor. Dados fictícios.

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

/** Tira todas as permissões de produção e de pessoas da conta (exceções "bloqueia"; sem cargo). */
async function semProducaoNemPessoas(admin: Conta, alvo: Conta) {
  const excecoes = { producao_visualizar: false, producao_lancar: false, pessoas_visualizar: false, pessoas_editar: false, cargos_salarios_editar: false };
  const r = await pedir(admin.cookie, "PUT", `/api/usuarios/${alvo.usuarioId}/acessos`, { excecoes });
  expect(r.statusCode, r.body).toBe(200);
}

const hoje = () => horaLocal(new Date()).data;
const somar = (dia: string, n: number) => { const d = new Date(dia + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

describe("agenda: tarefa por permissão (P-46 itens 1 e 2)", () => {
  const lancar = (pedidoId: string) => ({
    id: novoId(), vinculoRef: `producao:lancar:${pedidoId}`, vinculoTela: "#/saidas-mercadorias/lancamentos-producao/producao-mapa",
    vinculoTitulo: "MER - Mapa de Produção", titulo: "Lançar a produção do pedido nº 12", data: hoje(), paraQuemTem: "producao_lancar"
  });

  it("lançar produção vai para todas as contas com a permissão; quem não tem não recebe nem dispara", async () => {
    const { gestor: admin, resp, leitor, fora } = await cenario();
    await semProducaoNemPessoas(admin, fora);
    const r = await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", lancar("pp-1"));
    expect(r.statusCode, r.body).toBe(201);
    const t = r.json().data.compromisso;
    const responsaveis = t.pessoas.filter((p: { responsavel: boolean }) => p.responsavel).map((p: { id: string }) => p.id).sort();
    expect(responsaveis).toEqual([admin.usuarioId, resp.usuarioId, leitor.usuarioId].sort());
    expect((await agenda(fora)).compromissos.map((c: { id: string }) => c.id)).not.toContain(t.id);
    // Quem não tem a permissão não dispara a regra.
    expect((await pedir(fora.cookie, "POST", "/api/agenda/tarefas-de-tela", lancar("pp-2"))).statusCode).toBe(403);
    // Cada referência só aceita a sua permissão; e não dá para misturar com responsáveis escolhidos.
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...lancar("pp-3"), paraQuemTem: "pessoas_editar" })).statusCode).toBe(400);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...lancar("pp-4"), responsaveis: [resp.usuarioId] })).statusCode).toBe(400);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", { ...lancar("pp-5"), paraQuemTem: undefined, responsaveis: [resp.usuarioId] })).statusCode).toBe(400);
    // Um lança: conclui para todos.
    const c = await pedir(leitor.cookie, "POST", "/api/agenda/tarefas-de-tela/concluir", { vinculoRef: "producao:lancar:pp-1" });
    expect(c.statusCode, c.body).toBe(200);
    expect((await agenda(resp)).compromissos.find((x: { id: string }) => x.id === t.id).concluida).toBe(true);
  });

  it("pedido cancelado: a tarefa aberta sai; concluída fica; sem a permissão não cancela", async () => {
    const { gestor: admin, resp, fora } = await cenario();
    await semProducaoNemPessoas(admin, fora);
    const aberta = (await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", lancar("pp-c1"))).json().data;
    expect((await pedir(fora.cookie, "POST", "/api/agenda/tarefas-de-tela/cancelar", { vinculoRef: "producao:lancar:pp-c1" })).statusCode).toBe(403);
    // Referência de tarefa com responsáveis escolhidos (não é regra por permissão) não se cancela por aqui.
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/cancelar", { vinculoRef: "compras:oc:qualquer" })).statusCode).toBe(403);
    const r = await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/cancelar", { vinculoRef: "producao:lancar:pp-c1" });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().data.resultado).toBe("cancelada");
    expect((await agenda(admin)).compromissos.map((c: { id: string }) => c.id)).not.toContain(aberta.id);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/cancelar", { vinculoRef: "producao:lancar:pp-c1" })).json().data.resultado).toBe("sem-mudanca");

    await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", lancar("pp-c2"));
    await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/concluir", { vinculoRef: "producao:lancar:pp-c2" });
    expect((await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela/cancelar", { vinculoRef: "producao:lancar:pp-c2" })).json().data.resultado).toBe("sem-mudanca");
  });

  it("colaborador novo: 'Integração de …' com as três subtarefas, para quem cadastra colaboradores", async () => {
    const { gestor: admin, resp, fora } = await cenario();
    await semProducaoNemPessoas(admin, fora);
    const subtarefas = ["Conferir documentos", "Entregar uniforme", "Treinamento/integração"];
    const r = await pedir(resp.cookie, "POST", "/api/agenda/tarefas-de-tela", {
      id: novoId(), vinculoRef: "pessoas:integracao:col-ficticio-1", vinculoTela: "#/saidas-despesas/cadastros-geral-colaboradores/des-colaboradores",
      vinculoTitulo: "DES - Colaboradores", titulo: "Integração de Pessoa Fictícia", paraQuemTem: "pessoas_editar", subtarefas
    });
    expect(r.statusCode, r.body).toBe(201);
    const t = r.json().data.compromisso;
    expect(t.subtarefas.map((s: { titulo: string; concluida: boolean }) => [s.titulo, s.concluida])).toEqual(subtarefas.map((s) => [s, false]));
    expect(t.pessoas.map((p: { id: string }) => p.id)).not.toContain(fora.usuarioId);
    // Quem não cadastra colaboradores não dispara a integração.
    const semPermissao = await pedir(fora.cookie, "POST", "/api/agenda/tarefas-de-tela", {
      id: novoId(), vinculoRef: "pessoas:integracao:col-ficticio-2", vinculoTela: "#/saidas-despesas/cadastros-geral-colaboradores/des-colaboradores",
      vinculoTitulo: "DES - Colaboradores", titulo: "Integração de Outra Pessoa", paraQuemTem: "pessoas_editar", subtarefas
    });
    expect(semPermissao.statusCode).toBe(403);
  });
});

describe("agenda: lista ligada a uma área (P-46 item 3)", () => {
  it("membros = contas com permissão na área (e a dona); perder a permissão tira do grupo; escolher à mão é recusado", async () => {
    const { gestor: admin, resp, leitor, fora } = await cenario();
    const id = novoId();
    const r = await pedir(resp.cookie, "POST", "/api/agenda/grupos", { id, nome: "Produção", cor: "#16a34a", area: "producao" });
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json().data).toMatchObject({ area: "producao", membro: true });
    const membros = async () => ((await pedir(admin.cookie, "GET", `/api/agenda/grupos/${id}/membros`)).json().data.usuarioIds as string[]).sort();
    expect(await membros()).toEqual([admin.usuarioId, resp.usuarioId, leitor.usuarioId, fora.usuarioId].sort());

    // O fora perde a produção: na próxima leitura da Agenda ele sai do grupo e não vê mais a lista.
    await semProducaoNemPessoas(admin, fora);
    expect((await agenda(fora)).grupos.map((g: { id: string }) => g.id)).not.toContain(id);
    expect(await membros()).toEqual([admin.usuarioId, resp.usuarioId, leitor.usuarioId].sort());
    expect((await pedir(fora.cookie, "GET", `/api/agenda/grupos/${id}/mensagens`)).statusCode).toBe(403);

    const g = (await agenda(resp)).grupos.find((x: { id: string }) => x.id === id);
    const mao = await pedir(resp.cookie, "PUT", `/api/agenda/grupos/${id}/membros`, { usuarioIds: [resp.usuarioId] });
    expect(mao.statusCode).toBe(409);
    expect(mao.json().code).toBe("AGENDA_LISTA_POR_AREA");

    // Tirar a área: os membros de agora ficam, e passam a ser escolhidos à mão.
    const sem = await pedir(resp.cookie, "PUT", `/api/agenda/grupos/${id}`, { versao: g.versao, area: "" });
    expect(sem.statusCode, sem.body).toBe(200);
    expect(sem.json().data.area).toBe("");
    expect(await membros()).toEqual([admin.usuarioId, resp.usuarioId, leitor.usuarioId].sort());
    expect((await pedir(resp.cookie, "PUT", `/api/agenda/grupos/${id}/membros`, { usuarioIds: [leitor.usuarioId] })).statusCode).toBe(200);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/grupos", { id: novoId(), nome: "Outra", cor: "#16a34a", area: "padaria" })).statusCode).toBe(400);
  });
});

describe("agenda: expediente dos Horários/Escalas (P-46 item 5)", () => {
  it("regra pura: hoje, véspera e turno que passa da meia-noite", () => {
    const dias = new Map<string, DiaExpediente>([
      ["2026-11-23", { trabalha: true, inicio: "22:00", fim: "06:00" }],
      ["2026-11-24", { trabalha: false, inicio: "", fim: "" }]
    ]);
    // 03h de terça (06h UTC): ainda no turno que começou segunda às 22h; a hora conta para segunda.
    expect(situacaoNaEscala(dias, new Date("2026-11-24T06:00:00Z"))).toEqual({ onde: "dentro", minutos: 0, dia: "2026-11-23" });
    // 07h de terça (hoje folga): 60 min depois do turno de segunda, na conta de segunda.
    expect(situacaoNaEscala(dias, new Date("2026-11-24T10:00:00Z"))).toEqual({ onde: "depois", minutos: 60, dia: "2026-11-23" });
    // 20h de terça: longe do fim de ontem (mais de 12 h): é folga.
    expect(situacaoNaEscala(dias, new Date("2026-11-24T23:00:00Z"))).toEqual({ onde: "folga", minutos: null, dia: "2026-11-24" });
    // Turno 22–06 todo dia: 07h = 60 min depois (de ontem), não 15 h antes de hoje; 21h = 60 min antes de hoje.
    const noite = new Map<string, DiaExpediente>([
      ["2026-11-23", { trabalha: true, inicio: "22:00", fim: "06:00" }],
      ["2026-11-24", { trabalha: true, inicio: "22:00", fim: "06:00" }]
    ]);
    expect(situacaoNaEscala(noite, new Date("2026-11-24T10:00:00Z"))).toEqual({ onde: "depois", minutos: 60, dia: "2026-11-23" });
    expect(situacaoNaEscala(noite, new Date("2026-11-25T00:00:00Z"))).toEqual({ onde: "antes", minutos: 60, dia: "2026-11-24" });
    // Hoje não enviado, mas a madrugada é do turno de ontem: dentro.
    expect(situacaoNaEscala(new Map([["2026-11-23", { trabalha: true, inicio: "22:00", fim: "06:00" }]]), new Date("2026-11-24T06:00:00Z"))?.onde).toBe("dentro");
    // Quarta não foi enviada (e a véspera é folga): fica para o expediente da Agenda.
    expect(situacaoNaEscala(dias, new Date("2026-11-25T13:00:00Z"))).toBeUndefined();
    // Segunda 23h: dentro; segunda 21h: 60 min antes.
    expect(situacaoNaEscala(dias, new Date("2026-11-24T02:00:00Z"))?.onde).toBe("dentro");
    expect(situacaoNaEscala(dias, new Date("2026-11-24T00:00:00Z"))).toEqual({ onde: "antes", minutos: 60, dia: "2026-11-23" });
  });

  it("conta ligada ao colaborador usa o dia da escala; sem o dia, vale o da Agenda; só o ligado é guardado", async () => {
    const { gestor: admin, resp, leitor, fora } = await cenario();
    await semProducaoNemPessoas(admin, fora);
    const ligar = (c: Conta, colaboradorId: string | null) => pedir(admin.cookie, "PUT", `/api/agenda/expedientes/contas/${c.usuarioId}`, { colaboradorId });
    expect((await ligar(resp, "col-ficticio-a")).statusCode).toBe(200);
    expect((await pedir(resp.cookie, "PUT", `/api/agenda/expedientes/contas/${leitor.usuarioId}`, { colaboradorId: "col-x" })).statusCode).toBe(403);
    // Um colaborador, uma conta.
    expect((await ligar(leitor, "col-ficticio-a")).statusCode).toBe(409);

    const contas = (await pedir(leitor.cookie, "GET", "/api/agenda/expedientes/contas")).json().data.contas;
    expect(contas.find((c: { usuarioId: string }) => c.usuarioId === resp.usuarioId).colaboradorId).toBe("col-ficticio-a");
    expect((await pedir(fora.cookie, "GET", "/api/agenda/expedientes/contas")).statusCode).toBe(403);

    const m = horaLocal(new Date()).minutos;
    const fora1h = m < 12 * 60 ? { inicio: "22:00", fim: "23:00" } : { inicio: "01:00", fim: "02:00" };
    const envio = {
      de: somar(hoje(), -1), ate: somar(hoje(), 1),
      colaboradores: [
        { colaboradorId: "col-ficticio-a", dias: [{ dia: somar(hoje(), -1), trabalha: false }, { dia: hoje(), trabalha: true, ...fora1h }] },
        { colaboradorId: "col-nao-ligado", dias: [{ dia: hoje(), trabalha: true, inicio: "08:00", fim: "17:00" }] }
      ]
    };
    expect((await pedir(fora.cookie, "PUT", "/api/agenda/expedientes", envio)).statusCode).toBe(403);
    const e = await pedir(leitor.cookie, "PUT", "/api/agenda/expedientes", envio);
    expect(e.statusCode, e.body).toBe(200);
    expect(e.json().data).toEqual({ recebidos: 1, ignorados: 1 });
    expect((await pool.query(`SELECT colaborador_id FROM expedientes_colaboradores WHERE empresa_id = $1`, [admin.empresaId])).rows.map((r) => r.colaborador_id))
      .toEqual(["col-ficticio-a", "col-ficticio-a"]);

    // Na Agenda havia outro expediente (o dia inteiro): a escala vale mais.
    await pedir(admin.cookie, "PUT", `/api/agenda/configuracoes/${resp.usuarioId}`, { expedienteDias: [0, 1, 2, 3, 4, 5, 6], expedienteInicio: "00:00", expedienteFim: "23:59", foraExpediente: "bloquear" });
    const minha = (await pedir(resp.cookie, "GET", "/api/agenda/configuracoes/minha")).json().data;
    expect(minha).toMatchObject({ origemExpediente: "escala", bloqueadaAgora: true, descricaoExpediente: `Hoje, das ${fora1h.inicio} às ${fora1h.fim} (Horários/Escalas)` });
    expect((await pedir(resp.cookie, "GET", "/api/agenda")).json().code).toBe("AGENDA_FORA_EXPEDIENTE");

    // Desligar o colaborador: volta o expediente da Agenda (dia inteiro: abre).
    await ligar(resp, null);
    expect((await pedir(resp.cookie, "GET", "/api/agenda/configuracoes/minha")).json().data).toMatchObject({ origemExpediente: "agenda", bloqueadaAgora: false });

    // Aparelho sem a escala (manda o colaborador sem nenhum dia): não apaga o que já estava lá.
    await ligar(resp, "col-ficticio-a");
    const sem = await pedir(leitor.cookie, "PUT", "/api/agenda/expedientes", { de: envio.de, ate: envio.ate, colaboradores: [{ colaboradorId: "col-ficticio-a", dias: [] }] });
    expect(sem.statusCode, sem.body).toBe(200);
    expect((await pool.query(`SELECT 1 FROM expedientes_colaboradores WHERE empresa_id = $1`, [admin.empresaId])).rows).toHaveLength(2);

    // Janela fora do aceito e dia com horário inválido.
    expect((await pedir(leitor.cookie, "PUT", "/api/agenda/expedientes", { de: somar(hoje(), -90), ate: hoje(), colaboradores: [] })).statusCode).toBe(400);
    expect((await pedir(leitor.cookie, "PUT", "/api/agenda/expedientes", { de: hoje(), ate: hoje(), colaboradores: [{ colaboradorId: "col-ficticio-a", dias: [{ dia: hoje(), trabalha: true }] }] })).statusCode).toBe(400);
    // Nada de nome nem anotação do dia: campo a mais é recusado.
    expect((await pedir(leitor.cookie, "PUT", "/api/agenda/expedientes", { de: hoje(), ate: hoje(), colaboradores: [{ colaboradorId: "col-ficticio-a", dias: [{ dia: hoje(), trabalha: false, nota: "atestado" }] }] })).statusCode).toBe(400);
  });
});

describe("sair por tempo parado no servidor (P-46 item 4)", () => {
  async function sessaoDe(c: Conta) {
    const { rows } = await pool.query(`SELECT id FROM session WHERE "userId" = $1`, [c.usuarioId]);
    return rows[0].id as string;
  }
  const ultima = async (id: string) => (await pool.query(`SELECT ultima_interacao_em FROM sessoes_atividade WHERE sessao_id = $1`, [id])).rows[0]?.ultima_interacao_em as Date;

  it("parada além do tempo (padrão 15 min, com 2 min de folga no servidor): 401 e a sessão acaba; pedido automático não conta", async () => {
    const { resp, leitor } = await cenario();
    expect((await pedir(resp.cookie, "GET", "/api/sessao")).statusCode).toBe(200);
    const id = await sessaoDe(resp);
    expect(await ultima(id)).toBeInstanceOf(Date);

    // 10 minutos parado; a atualização automática não renova.
    await pool.query(`UPDATE sessoes_atividade SET ultima_interacao_em = now() - interval '10 minutes' WHERE sessao_id = $1`, [id]);
    const antes = await ultima(id);
    const auto = await app.inject({ method: "GET", url: "/api/agenda", headers: { cookie: resp.cookie, "x-cicluz-automatico": "1" } });
    expect(auto.statusCode).toBe(200);
    expect((await ultima(id)).getTime()).toBe(antes.getTime());
    // Um pedido de verdade renova.
    expect((await pedir(resp.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
    expect((await ultima(id)).getTime()).toBeGreaterThan(antes.getTime());

    // 16 minutos parado: ainda dentro da folga do servidor (a tela é quem sai aos 15).
    await pool.query(`UPDATE sessoes_atividade SET ultima_interacao_em = now() - interval '16 minutes' WHERE sessao_id = $1`, [id]);
    expect((await pedir(resp.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
    // 18 minutos parado: sai.
    await pool.query(`UPDATE sessoes_atividade SET ultima_interacao_em = now() - interval '18 minutes' WHERE sessao_id = $1`, [id]);
    const saiu = await pedir(resp.cookie, "GET", "/api/agenda");
    expect(saiu.statusCode).toBe(401);
    expect(saiu.json().code).toBe("SESSAO_PARADA");
    expect((await pool.query(`SELECT 1 FROM session WHERE id = $1`, [id])).rows).toHaveLength(0);
    expect((await pedir(resp.cookie, "GET", "/api/sessao")).statusCode).toBe(401);
    // Os outros continuam.
    expect((await pedir(leitor.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
  });

  it("conta de posto do caixa (PDV) não sai sozinha", async () => {
    const { resp } = await cenario();
    await pool.query(`UPDATE perfis_usuarios SET posto_pdv = 1, posto_turno = 'manha' WHERE usuario_id = $1`, [resp.usuarioId]);
    await pedir(resp.cookie, "GET", "/api/sessao");
    expect((await pedir(resp.cookie, "GET", "/api/agenda/configuracoes/minha")).json().data.inatividadeEfetivaMinutos).toBeNull();
    const id = await sessaoDe(resp);
    await pool.query(`UPDATE sessoes_atividade SET ultima_interacao_em = now() - interval '5 hours' WHERE sessao_id = $1`, [id]);
    expect((await pedir(resp.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
  });

  it("o tempo da pessoa (Configurações da Agenda) vale no lugar do padrão", async () => {
    const { gestor: admin, resp } = await cenario();
    await pedir(admin.cookie, "PUT", `/api/agenda/configuracoes/${resp.usuarioId}`, { inatividadeMinutos: 60 });
    await pedir(resp.cookie, "GET", "/api/sessao");
    const id = await sessaoDe(resp);
    await pool.query(`UPDATE sessoes_atividade SET ultima_interacao_em = now() - interval '30 minutes' WHERE sessao_id = $1`, [id]);
    expect((await pedir(resp.cookie, "GET", "/api/agenda")).statusCode).toBe(200);
  });
});
