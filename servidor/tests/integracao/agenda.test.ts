import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comSessao, criarApp, criarConta, entrar } from "./ajuda.ts";

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await app.close();
  const { pool } = await import("../../api/src/banco/conexao.ts");
  await pool.end();
});

const CHAVE = "cicluz-agenda-v1";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function logado(papel: "administrador" | "usuario", empresaNome?: string) {
  const conta = await criarConta(papel, empresaNome);
  const { cookie } = await entrar(app, conta.email, conta.senha);
  return { ...conta, cookie };
}

/** Empresa com gestor, dois responsáveis (um só vê e conclui), alguém de fora e o documento da agenda. */
async function cenario() {
  const gestor = await logado("administrador");
  const resp = await logado("usuario", gestor.empresaNome);
  const leitor = await logado("usuario", gestor.empresaNome);
  const fora = await logado("usuario", gestor.empresaNome);
  const agenda = {
    versao: 1, listas: [], colunas: [], relacoes: [],
    itens: [
      { id: "ag-1", titulo: "Fechar o caixa", criadoPor: gestor.usuarioId, pessoas: [{ id: resp.usuarioId, responsavel: true, ver: true, editar: false, concluir: true }, { id: leitor.usuarioId, ver: true }] },
      { id: "ag-antigo", titulo: "Feito antes do login", criadoPor: "" }
    ]
  };
  const r = await app.inject({ method: "POST", url: "/api/documentos/importacao", headers: comSessao(gestor.cookie), payload: { itens: [{ chave: CHAVE, valor: JSON.stringify(agenda) }] } });
  expect(r.statusCode).toBe(201);
  return { gestor, resp, leitor, fora };
}

const pedir = (cookie: string, method: "GET" | "POST" | "DELETE", url: string, payload?: object) =>
  app.inject({ method, url, headers: comSessao(cookie), ...(payload ? { payload } : {}) });
const enviarArquivo = (cookie: string, compromisso: string, nome: string, conteudo: Buffer) =>
  pedir(cookie, "POST", `/api/agenda/compromissos/${compromisso}/arquivos`, { nome, conteudoBase64: conteudo.toString("base64") });

describe("agenda: chat", () => {
  it("participantes conversam; quem não participa não lê nem escreve", async () => {
    const { gestor, resp, leitor, fora } = await cenario();
    const m1 = await pedir(gestor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "  Pode fechar às 18h?  " });
    expect(m1.statusCode).toBe(201);
    expect(m1.json().data.texto).toBe("Pode fechar às 18h?");
    expect((await pedir(resp.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "Combinado" })).statusCode).toBe(201);
    expect((await pedir(leitor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "Vi aqui" })).statusCode).toBe(201);

    const lista = await pedir(resp.cookie, "GET", "/api/agenda/compromissos/ag-1/mensagens");
    expect(lista.json().data.mensagens.map((m: { texto: string }) => m.texto)).toEqual(["Pode fechar às 18h?", "Combinado", "Vi aqui"]);
    expect(lista.json().data.mensagens[0].autorNome).toBe("Pessoa de Teste");

    const desde = lista.json().data.mensagens[1].criadoEm;
    const novas = await pedir(gestor.cookie, "GET", `/api/agenda/compromissos/ag-1/mensagens?depois=${encodeURIComponent(desde)}`);
    expect(novas.json().data.mensagens.map((m: { texto: string }) => m.texto)).toEqual(["Vi aqui"]);

    const negado = await pedir(fora.cookie, "GET", "/api/agenda/compromissos/ag-1/mensagens");
    expect(negado.statusCode).toBe(403);
    expect(negado.json().code).toBe("AGENDA_SEM_ACESSO");
    expect((await pedir(fora.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "oi" })).statusCode).toBe(403);
    // Compromisso sem criador (feito antes do login): sem controle, como na tela
    expect((await pedir(fora.cookie, "POST", "/api/agenda/compromissos/ag-antigo/mensagens", { texto: "oi" })).statusCode).toBe(201);
  });

  it("mensagem vazia ou longa é recusada; compromisso inexistente dá 404", async () => {
    const { gestor } = await cenario();
    expect((await pedir(gestor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "   " })).statusCode).toBe(400);
    expect((await pedir(gestor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "x".repeat(2001) })).statusCode).toBe(400);
    const r = await pedir(gestor.cookie, "GET", "/api/agenda/compromissos/ag-nao-existe/mensagens");
    expect(r.statusCode).toBe(404);
    expect(r.json().code).toBe("AGENDA_COMPROMISSO_NAO_ENCONTRADO");
    expect((await pedir(gestor.cookie, "GET", "/api/agenda/compromissos/..%2Fx/mensagens")).statusCode).toBe(400);
  });

  it("não lidas: contam as mensagens dos outros depois da última leitura", async () => {
    const { gestor, resp, fora } = await cenario();
    await pedir(gestor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "um" });
    await pedir(gestor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "dois" });
    expect((await pedir(resp.cookie, "GET", "/api/agenda/chat/nao-lidas")).json().data.naoLidas).toEqual({ "ag-1": 2 });
    expect((await pedir(gestor.cookie, "GET", "/api/agenda/chat/nao-lidas")).json().data.naoLidas).toEqual({});
    expect((await pedir(fora.cookie, "GET", "/api/agenda/chat/nao-lidas")).json().data.naoLidas).toEqual({});
    expect((await pedir(resp.cookie, "POST", "/api/agenda/compromissos/ag-1/leitura", {})).statusCode).toBe(200);
    expect((await pedir(resp.cookie, "GET", "/api/agenda/chat/nao-lidas")).json().data.naoLidas).toEqual({});
  });

  it("outra empresa não enxerga o compromisso", async () => {
    const { gestor } = await cenario();
    await pedir(gestor.cookie, "POST", "/api/agenda/compromissos/ag-1/mensagens", { texto: "segredo" });
    const outra = await logado("administrador");
    const r = await pedir(outra.cookie, "GET", "/api/agenda/compromissos/ag-1/mensagens");
    expect(r.statusCode).toBe(404);
  });
});

describe("agenda: arquivos", () => {
  it("gestor manda material, responsável manda evidência, quem só vê não manda", async () => {
    const { gestor, resp, leitor, fora } = await cenario();
    const a = await enviarArquivo(gestor.cookie, "ag-1", "foto.png", PNG);
    expect(a.statusCode).toBe(201);
    expect(a.json().data).toMatchObject({ nome: "foto.png", tipo: "image/png", tamanho: PNG.length, papel: "material", podeExcluir: true });
    const e = await enviarArquivo(resp.cookie, "ag-1", "comprovante.pdf", Buffer.from("%PDF-1.4\n1 0 obj\n"));
    expect(e.json().data.papel).toBe("evidencia");
    expect((await enviarArquivo(leitor.cookie, "ag-1", "x.png", PNG)).statusCode).toBe(403);
    expect((await enviarArquivo(fora.cookie, "ag-1", "x.png", PNG)).statusCode).toBe(403);

    const lista = await pedir(leitor.cookie, "GET", "/api/agenda/compromissos/ag-1/arquivos");
    expect(lista.json().data.arquivos.map((x: { nome: string; podeExcluir: boolean }) => [x.nome, x.podeExcluir])).toEqual([["foto.png", false], ["comprovante.pdf", false]]);
    expect((await pedir(fora.cookie, "GET", "/api/agenda/compromissos/ag-1/arquivos")).statusCode).toBe(403);

    // Baixar: imagem abre no navegador; quem não participa não baixa
    const baixado = await pedir(leitor.cookie, "GET", `/api/agenda/arquivos/${a.json().data.id}`);
    expect(baixado.statusCode).toBe(200);
    expect(baixado.headers["content-type"]).toBe("image/png");
    expect(String(baixado.headers["content-disposition"])).toContain("inline");
    expect(String(baixado.headers["content-security-policy"])).toContain("sandbox");
    expect(baixado.rawPayload.equals(PNG)).toBe(true);
    const pdf = await pedir(gestor.cookie, "GET", `/api/agenda/arquivos/${e.json().data.id}`);
    expect(String(pdf.headers["content-disposition"])).toContain("attachment");
    expect((await pedir(fora.cookie, "GET", `/api/agenda/arquivos/${a.json().data.id}`)).statusCode).toBe(403);
    const outra = await logado("administrador");
    expect((await pedir(outra.cookie, "GET", `/api/agenda/arquivos/${a.json().data.id}`)).statusCode).toBe(404);
  });

  it("formatos perigosos ou disfarçados são recusados; 10 MB no máximo", async () => {
    const { gestor } = await cenario();
    const recusa = async (nome: string, conteudo: Buffer, status = 415) => expect((await enviarArquivo(gestor.cookie, "ag-1", nome, conteudo)).statusCode).toBe(status);
    await recusa("pagina.html", Buffer.from("<!doctype html><script>alert(1)</script>"));
    await recusa("desenho.svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'));
    await recusa("nota.txt", Buffer.from("<html><script>alert(1)</script></html>"));
    await recusa("programa.exe", Buffer.from("MZ\x90\x00\x03"));
    await recusa("foto.jpg", PNG); // conteúdo PNG com nome .jpg
    await recusa("planilha.xlsx", Buffer.from("isto não é zip"));
    expect((await enviarArquivo(gestor.cookie, "ag-1", "lista.csv", Buffer.from("produto;quantidade\nfarinha;2\n"))).statusCode).toBe(201);
    const grande = Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]);
    await recusa("enorme.png", grande, 413);
  });

  it("só quem enviou ou o gestor exclui", async () => {
    const { gestor, resp, leitor } = await cenario();
    const doResp = (await enviarArquivo(resp.cookie, "ag-1", "evidencia.png", PNG)).json().data.id;
    const doGestor = (await enviarArquivo(gestor.cookie, "ag-1", "modelo.png", PNG)).json().data.id;
    expect((await pedir(leitor.cookie, "DELETE", `/api/agenda/arquivos/${doResp}`)).statusCode).toBe(403);
    expect((await pedir(resp.cookie, "DELETE", `/api/agenda/arquivos/${doGestor}`)).statusCode).toBe(403);
    expect((await pedir(resp.cookie, "DELETE", `/api/agenda/arquivos/${doResp}`)).statusCode).toBe(200);
    expect((await pedir(gestor.cookie, "DELETE", `/api/agenda/arquivos/${doGestor}`)).statusCode).toBe(200);
    expect((await pedir(gestor.cookie, "GET", "/api/agenda/compromissos/ag-1/arquivos")).json().data.arquivos).toEqual([]);
  });

  it("tirar a pessoa do compromisso tira o acesso na hora", async () => {
    const { gestor, resp } = await cenario();
    expect((await pedir(resp.cookie, "GET", "/api/agenda/compromissos/ag-1/mensagens")).statusCode).toBe(200);
    const docs = (await pedir(gestor.cookie, "GET", "/api/documentos")).json().data.documentos as Array<{ chave: string; valor: string; versao: number }>;
    const doc = docs.find((d) => d.chave === CHAVE)!;
    const dados = JSON.parse(doc.valor);
    dados.itens[0].pessoas = [];
    const g = await app.inject({ method: "PUT", url: "/api/documentos", headers: comSessao(gestor.cookie), payload: { itens: [{ chave: CHAVE, valor: JSON.stringify(dados), versaoBase: doc.versao }] } });
    expect(g.statusCode).toBe(200);
    expect((await pedir(resp.cookie, "GET", "/api/agenda/compromissos/ag-1/mensagens")).statusCode).toBe(403);
  });
});
