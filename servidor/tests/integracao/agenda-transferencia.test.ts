import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { converter, nadaExistente, somaFecha } from "../../api/src/agenda/transferencia.regras.ts";
import { comSessao, criarApp } from "./ajuda.ts";
import { ajudaAgenda, type Conta, type Pool } from "./ajuda-agenda.ts";

// Transferência do documento "cicluz-agenda-v1" para as tabelas (plano, seções 4 e 7). Dados fictícios.

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

const { logado, pedir, agenda } = ajudaAgenda(() => app, () => pool);
const CHAVE = "cicluz-agenda-v1";

/** Documento como o iPad deixou: com os defeitos que a revisão de 23/11 achou. */
function documento(g: Conta, resp: Conta) {
  return {
    versao: 1,
    listas: [
      { id: "lista-gestao-pessoas", nome: "Gestão de Pessoas", cor: "#7c3aed", icone: "pessoas", ordenacao: "manual" },
      { id: "lista-loja", nome: "Loja", cor: '"><img src=x onerror=alert(1)>' },
      { id: "lista-loja-2", nome: " loja " }
    ],
    colunas: [{ id: "col-a-fazer", nome: "A fazer" }],
    itens: [
      { id: "ag-1", listaId: "lista-loja", titulo: "Fechar o caixa", criadoPor: g.usuarioId, criadoEm: "2026-11-05T10:00:00.000Z", atualizadoEm: "2026-11-05T10:00:00.000Z",
        pessoas: [{ id: resp.usuarioId, responsavel: true, ver: true, concluir: true }, { id: "u-jose", ver: true, editar: true }],
        avaliacao: { tipo: "estrelas", notas: [{ avaliadoId: resp.usuarioId, porId: g.usuarioId, papel: "gestor", valor: 4, em: "2026-11-06T10:00:00.000Z" }] },
        concluida: true, concluidaEm: "2026-11-06T09:00:00.000Z", adiadoPara: "2026-11-05T11:00:00.000Z" },
      { id: "ag-antigo", listaId: "lista-gestao-pessoas", titulo: "Feito antes do login", criadoPor: "", responsavelId: "u-ana" },
      { id: "ag-perdido", listaId: "lista-que-sumiu", titulo: "Lista apagada", criadoPor: g.usuarioId },
      { id: "ag-rep", listaId: "lista-loja", titulo: "Contar estoque", criadoPor: g.usuarioId, data: "2026-11-12", hora: "08:00",
        repeticao: { tipo: "semana", feitas: 1, ancora: "2026-11-05", fim: { tipo: "nunca" } }, subtarefas: [{ id: "sub-1", titulo: "Câmara", concluida: false }] },
      { id: "ag-rep-c1", origemId: "ag-rep", listaId: "lista-loja", titulo: "Contar estoque", criadoPor: g.usuarioId, data: "2026-11-05", concluida: true, concluidaEm: "2026-11-05T09:00:00.000Z" },
      { id: "ag-rep-c1b", origemId: "ag-rep", listaId: "lista-loja", titulo: "Contar estoque", criadoPor: g.usuarioId, data: "2026-11-05", concluida: true, concluidaEm: "2026-11-05T09:00:01.000Z" }
    ],
    relacoes: [
      { id: "rel-1", de: "ag-1", para: "ag-rep", rotulo: "antes de" },
      { id: "rel-2", de: "ag-1", para: "ag-nao-existe" }
    ]
  };
}

async function cenario() {
  const g = await logado("administrador");
  const resp = await logado("usuario", g.empresaNome);
  const fora = await logado("usuario", g.empresaNome);
  const doc = documento(g, resp);
  const r = await pedir(g.cookie, "POST", "/api/documentos/importacao", { itens: [{ chave: CHAVE, valor: JSON.stringify(doc) }] });
  expect(r.statusCode).toBe(201);
  return { g, resp, fora, doc };
}

const transferir = (g: Conta, corpo: object) => pedir(g.cookie, "POST", "/api/agenda/transferencia", { documentoVersao: 1, gestorSemCriador: g.usuarioId, ...corpo });

describe("agenda: transferência do documento", () => {
  it("prévia só para o administrador, com contagens, ids sem conta e itens sem criador", async () => {
    const { g, resp } = await cenario();
    expect((await pedir(resp.cookie, "GET", "/api/agenda/transferencia")).statusCode).toBe(403);
    const p = (await pedir(g.cookie, "GET", "/api/agenda/transferencia")).json().data;
    expect(p).toMatchObject({ jaTransferida: false, documento: { existe: true, versao: 1 }, itensSemCriador: 1, somaFecha: true });
    expect(p.contagens).toMatchObject({ listas: 3, colunas: 1, itens: 6, copias: 2, notas: 1, relacoes: 2 });
    expect(p.idsSemConta.map((x: { id: string }) => x.id).sort()).toEqual(["u-ana", "u-jose"]);
    expect(p.pessoas).toHaveLength(3);
  });

  it("executa: tudo na tabela ou na pendência; cor com código neutralizada; nome repetido vira (2); lista sumida vai para a primeira", async () => {
    const { g, resp, fora } = await cenario();
    // Pedir para ligar uma pessoa de teste não tem mais efeito: o campo nem existe (P-46, 24/11/2026).
    const r = await transferir(g, { dePara: { "u-jose": resp.usuarioId } });
    expect(r.statusCode, r.body).toBe(200);
    const t = r.json().data;
    expect(t).toMatchObject({ situacao: "concluida", origem: "servidor" });
    const detalhes = t.pendencias.map((x: { detalhe: string }) => x.detalhe).join("\n");
    expect(detalhes).toMatch(/não é #rrggbb/);
    expect(detalhes).toMatch(/virou "loja \(2\)"/);
    expect(detalhes).toMatch(/não existe mais; foi para a primeira lista/);
    expect(detalhes).toMatch(/duplo toque/);
    expect(detalhes).toMatch(/Ligação do mapa/);

    const a = await agenda(g);
    expect(a.estado.noServidor).toBe(true);
    expect(a.grupos.find((x: { id: string }) => x.id === "lista-loja").cor).toBe("#7c3aed");
    const ag1 = a.compromissos.find((x: { id: string }) => x.id === "ag-1");
    expect(ag1.adiadoPara).toBe(""); // a soneca antiga não volta
    expect(ag1.avaliacao.notas).toHaveLength(1);
    // u-jose (pessoa de teste) fica de fora; só a conta real continua.
    expect(ag1.pessoas.map((p: { id: string }) => p.id)).toEqual([resp.usuarioId]);
    const ag1Banco = await pool.query(`SELECT legado FROM agenda_compromissos WHERE empresa_id = $1 AND id = 'ag-1'`, [g.empresaId]);
    expect(ag1Banco.rows[0].legado.pessoasSemConta.map((x: { id: string }) => x.id)).toEqual(["u-jose"]);
    expect(a.compromissos.find((x: { id: string }) => x.id === "ag-perdido").grupoId).toBe("lista-gestao-pessoas");
    expect(a.compromissos.filter((x: { origemId: string }) => x.origemId === "ag-rep").map((x: { ocorrencia: string }) => x.ocorrencia).sort()).toEqual(["", "2026-11-05"]);
    expect(a.relacoes).toEqual([{ id: "rel-1", de: "ag-1", para: "ag-rep", rotulo: "antes de" }]);

    // Item antigo sem criador deixa de ser aberto a todos: o gestor agora é a conta escolhida.
    const antigo = a.compromissos.find((x: { id: string }) => x.id === "ag-antigo");
    expect(antigo.gestorId).toBe(g.usuarioId);
    expect((await agenda(fora)).compromissos.map((x: { id: string }) => x.id)).not.toContain("ag-antigo");
    // u-ana (pessoa de teste): fora, sem acesso; registrada à parte só para conferência.
    const { rows } = await pool.query(`SELECT legado, sem_criador_original FROM agenda_compromissos WHERE empresa_id = $1 AND id = 'ag-antigo'`, [g.empresaId]);
    expect(rows[0].sem_criador_original).toBe(true);
    expect(rows[0].legado.pessoasSemConta[0].id).toBe("u-ana");
    // Todas as contas ativas viram membros das listas (como hoje, todo mundo vê todas as listas).
    expect((await agenda(fora)).grupos.map((x: { id: string }) => x.id)).toContain("lista-loja");
  });

  it("documento forjado depois da transferência não dá acesso (G1)", async () => {
    const { g, resp, fora, doc } = await cenario();
    await transferir(g, {});
    const forjado = { ...doc, itens: doc.itens.map((i) => (i.id === "ag-1" ? { ...i, criadoPor: fora.usuarioId } : i)) };
    const w = await pedir(fora.cookie, "PUT", "/api/documentos", { itens: [{ chave: CHAVE, valor: JSON.stringify(forjado), versaoBase: 1 }] });
    expect(w.statusCode).toBeLessThan(300);
    expect((await agenda(fora)).compromissos.map((x: { id: string }) => x.id)).not.toContain("ag-1");
    expect((await pedir(fora.cookie, "GET", "/api/agenda/compromissos/ag-1")).statusCode).toBe(404);
    expect((await agenda(resp)).compromissos.map((x: { id: string }) => x.id)).toContain("ag-1");
  });

  it("rodar duas vezes não duplica; retransferência traz o novo e só atualiza o que ninguém mexeu", async () => {
    const { g, doc } = await cenario();
    await transferir(g, {});
    const contar = async () => (await pool.query(`SELECT count(*)::int AS n FROM agenda_compromissos WHERE empresa_id = $1`, [g.empresaId])).rows[0].n;
    const n = await contar();
    // Mexido pela tela nova:
    await pedir(g.cookie, "PATCH", "/api/agenda/compromissos/ag-perdido", { versao: 1, titulo: "Mexido na Agenda nova" });
    // Aba antiga grava o documento depois da transferência:
    // A aba antiga grava depois da transferência: data no futuro, nunca uma data fixa (que vira passado).
    const depois = new Date(Date.now() + 60_000).toISOString();
    const novo = { ...doc, itens: [...doc.itens.map((i) => (i.id === "ag-rep" || i.id === "ag-perdido" ? { ...i, titulo: i.titulo + " (aba antiga)", atualizadoEm: depois } : i)),
      { id: "ag-novo", listaId: "lista-loja", titulo: "Novo na aba antiga", criadoPor: g.usuarioId }] };
    const w = await pedir(g.cookie, "PUT", "/api/documentos", { itens: [{ chave: CHAVE, valor: JSON.stringify(novo), versaoBase: 1 }] });
    expect(w.statusCode).toBeLessThan(300);

    const velho = await transferir(g, {});
    expect(velho.json().code).toBe("AGENDA_DOCUMENTO_MUDOU"); // a prévia era da versão 1
    const r = await transferir(g, { documentoVersao: 2 });
    expect(r.json().data).toMatchObject({ origem: "retransferencia", novos: { compromissos: 1, atualizados: 1 } });
    expect(await contar()).toBe(n + 1);
    const a = await agenda(g);
    expect(a.compromissos.find((x: { id: string }) => x.id === "ag-rep").titulo).toBe("Contar estoque (aba antiga)");
    expect(a.compromissos.find((x: { id: string }) => x.id === "ag-perdido").titulo).toBe("Mexido na Agenda nova");
    expect(r.json().data.pendencias.map((x: { detalhe: string }) => x.detalhe).join()).toMatch(/ficou a versão da Agenda nova/);
    // De novo: nada muda.
    expect((await transferir(g, { documentoVersao: 2 })).json().data.novos).toMatchObject({ compromissos: 0, atualizados: 0, listas: 0 });
    expect(await contar()).toBe(n + 1);
    const reg = await pool.query(`SELECT origem, situacao FROM agenda_transferencias WHERE empresa_id = $1 ORDER BY feita_em`, [g.empresaId]);
    expect(reg.rows.map((x: { origem: string }) => x.origem)).toEqual(["servidor", "retransferencia", "retransferencia"]);
  });

  it("retransferência não troca as pessoas de um compromisso mexido pela tela nova no meio dela", async () => {
    const { g, resp, doc } = await cenario();
    await transferir(g, {});
    // Aba antiga muda "ag-rep" no documento depois da transferência.
    const novo = { ...doc, itens: doc.itens.map((i) => (i.id === "ag-rep" ? { ...i, titulo: "Contar estoque (aba antiga)", atualizadoEm: new Date(Date.now() + 60_000).toISOString() } : i)) };
    const w = await pedir(g.cookie, "PUT", "/api/documentos", { itens: [{ chave: CHAVE, valor: JSON.stringify(novo), versaoBase: 1 }] });
    expect(w.statusCode).toBeLessThan(300);

    // A retransferência lê o que existe ("ag-rep" ainda na versão 1, então entra para ser atualizado)…
    const { banco } = await import("../../api/src/banco/conexao.ts");
    const repo = await import("../../api/src/agenda/transferencia.repository.ts");
    const contas = [g.usuarioId, resp.usuarioId];
    const conv = converter(novo, {
      empresaId: g.empresaId, adminId: g.usuarioId, gestorSemCriador: g.usuarioId,
      contas: new Set(contas), contasAtivas: contas, existentes: await repo.existentes(banco, g.empresaId)
    });
    expect(conv.atualizar.map((l) => l.id)).toContain("ag-rep");

    // …e, antes de ela gravar, alguém põe uma pessoa em "ag-rep" pela tela nova (versão 1 → 2).
    await pool.query(`UPDATE agenda_compromissos SET versao = versao + 1 WHERE empresa_id = $1 AND id = 'ag-rep'`, [g.empresaId]);
    await pool.query(
      `INSERT INTO agenda_participantes (empresa_id, compromisso_id, usuario_id, ver, criado_por) VALUES ($1, 'ag-rep', $2, true, $3)`,
      [g.empresaId, resp.usuarioId, g.usuarioId]
    );

    const r = await banco.transaction((tx) => repo.gravarConversao(tx, g.empresaId, conv));
    expect(r.pulados).toEqual(["ag-rep"]);
    const pessoas = await pool.query(`SELECT usuario_id FROM agenda_participantes WHERE empresa_id = $1 AND compromisso_id = 'ag-rep'`, [g.empresaId]);
    expect(pessoas.rows.map((x: { usuario_id: string }) => x.usuario_id)).toEqual([resp.usuarioId]);
    const linha = await pool.query(`SELECT titulo, versao FROM agenda_compromissos WHERE empresa_id = $1 AND id = 'ag-rep'`, [g.empresaId]);
    expect(linha.rows[0]).toMatchObject({ titulo: "Contar estoque", versao: 2 });
  });

  it("empresa sem documento: entram as listas e colunas iniciais", async () => {
    const g = await logado("administrador");
    const r = await transferir(g, { documentoVersao: null });
    expect(r.statusCode).toBe(200);
    const a = await agenda(g);
    expect(a.grupos.map((x: { id: string }) => x.id)).toEqual(["lista-gestao-pessoas", "lista-diretor-operacoes"]);
    expect(a.colunas.map((x: { id: string }) => x.id)).toEqual(["col-a-fazer", "col-em-progresso"]);
  });

  it("gestor dos sem criador precisa ser conta ativa da empresa; não-administrador não executa", async () => {
    const { g, resp } = await cenario();
    const outra = await logado("usuario");
    expect((await transferir(g, { gestorSemCriador: outra.usuarioId })).statusCode).toBe(400);
    expect((await pedir(resp.cookie, "POST", "/api/agenda/transferencia", { documentoVersao: 1, gestorSemCriador: resp.usuarioId })).statusCode).toBe(403);
    expect((await agenda(g)).estado.noServidor).toBe(false);
  });
});

describe("agenda: cópia antiga do aparelho", () => {
  it("fica guardada inteira, lista o que só está no aparelho ou é mais novo, e não aplica nada", async () => {
    const { g, doc } = await cenario();
    const t = await transferir(g, {});
    expect(t.statusCode, t.body).toBe(200);
    const copia = { ...doc, itens: [...doc.itens.map((i) => (i.id === "ag-1" ? { ...i, atualizadoEm: "2026-11-30T10:00:00.000Z" } : i)),
      { id: "ag-so-no-ipad", listaId: "lista-loja", titulo: "Só no iPad", criadoPor: g.usuarioId }] };
    const r = await app.inject({ method: "POST", url: "/api/agenda/transferencia/aparelho", headers: comSessao(g.cookie), payload: { valor: JSON.stringify(copia) } });
    expect(r.json().data).toEqual({ guardada: true, soNoAparelho: 1, diferentes: 1 });
    const h = await pool.query(`SELECT tipo FROM documentos_historico WHERE empresa_id = $1 AND chave = $2 AND valor LIKE '%ag-so-no-ipad%'`, [g.empresaId, CHAVE]);
    expect(h.rows.map((x: { tipo: string }) => x.tipo)).toEqual(["conflito"]);
    expect((await pedir(g.cookie, "GET", "/api/agenda/compromissos/ag-so-no-ipad")).statusCode).toBe(404);
  });
});

describe("agenda: conferência da soma", () => {
  it("se a soma não fecha, a conversão diz o motivo", () => {
    const ctx = { empresaId: "e", adminId: "a", gestorSemCriador: "a", contas: new Set(["a"]), contasAtivas: ["a"], existentes: nadaExistente() };
    const c = converter({ listas: [{ id: "lista-1", nome: "L", cor: "#000000" }], itens: [{ id: "ag-1", listaId: "lista-1", titulo: "x", criadoPor: "a" }] }, ctx);
    expect(somaFecha(c)).toBe("");
    c.destino["itens"]!.tabela -= 1;
    expect(somaFecha(c)).toMatch(/itens: o documento tem 1/);
  });
});
