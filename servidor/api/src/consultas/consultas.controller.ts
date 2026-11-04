import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { proibido } from "../erros.ts";
import { listarSituacoes } from "../projecoes/projecoes.repository.ts";
import { reprocessarTodas } from "../projecoes/projecoes.service.ts";
import {
  listarBandeiras,
  listarCargos,
  listarContas,
  listarFichaDeCargos,
  listarGrupos,
  listarLocais,
  listarOperadoras,
  listarOrganograma,
  listarSalariosVigentes,
  listarTaxas,
  listarTiposVenda
} from "./consultas.repository.ts";

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

// Dia de negócio em America/Sao_Paulo (padrão do Sistema Pralis), não o UTC do servidor.
function hojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const empresaDe = (request: FastifyRequest) => perfilDaRequisicao(request).empresa.id;

// Toda consulta diz se as tabelas do assunto estão em dia: com "falha", os dados são os da última
// versão boa e a mensagem diz o que corrigir na tela.
async function situacaoDe(empresaId: string, assuntos: string[]) {
  const todas = await listarSituacoes(empresaId);
  return assuntos.map((assunto) => {
    const registro = todas.find((s) => s.assunto === assunto);
    return { assunto, situacao: registro?.situacao ?? "sem_dados", mensagem: registro?.mensagem ?? null };
  });
}

export async function registrarRotasConsultas(app: FastifyInstance) {
  // Situação das tabelas de cada assunto (ok / falha com a mensagem de onde corrigir na tela).
  app.get("/api/projecoes", async (request) => ok({ assuntos: await listarSituacoes(empresaDe(request)) }));

  // Reconstrói todas as tabelas a partir dos documentos (ex.: depois de uma migration nova).
  app.post("/api/projecoes/reprocessar", async (request) => {
    const perfil = perfilDaRequisicao(request);
    if (perfil.papel !== "administrador") throw proibido("Só o administrador reprocessa.", "ADMIN_ONLY");
    await reprocessarTodas(perfil.empresa.id);
    return ok({ assuntos: await listarSituacoes(perfil.empresa.id) });
  });

  app.get("/api/financeiro/grupos", async (request) => {
    const { colecao } = z
      .object({ colecao: z.enum(["mercadorias", "despesas", "vendas", "retiradas"]).optional() })
      .parse(request.query);
    return ok({ grupos: await listarGrupos(empresaDe(request), colecao), situacao: await situacaoDe(empresaDe(request), ["financeiro"]) });
  });
  app.get("/api/financeiro/tipos-venda", async (request) => ok({ tiposVenda: await listarTiposVenda(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["financeiro"]) }));
  app.get("/api/financeiro/bandeiras", async (request) => ok({ bandeiras: await listarBandeiras(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["financeiro"]) }));
  app.get("/api/financeiro/operadoras", async (request) => ok({ operadoras: await listarOperadoras(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["financeiro"]) }));
  app.get("/api/financeiro/taxas", async (request) => {
    const filtro = z
      .object({ operadora: z.string().optional(), bandeira: z.string().optional(), data: dataSchema.optional() })
      .parse(request.query);
    const limpo = Object.fromEntries(Object.entries(filtro).filter(([, valor]) => valor !== undefined));
    return ok({ taxas: await listarTaxas(empresaDe(request), limpo), situacao: await situacaoDe(empresaDe(request), ["financeiro"]) });
  });

  app.get("/api/contas", async (request) => ok({ contas: await listarContas(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["contas"]) }));
  app.get("/api/cargos", async (request) => ok({ cargos: await listarCargos(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["cargos"]) }));
  app.get("/api/salarios/vigentes", async (request) => {
    const { data } = z.object({ data: dataSchema.optional() }).parse(request.query);
    const dia = data ?? hojeSaoPaulo();
    return ok({
      data: dia,
      salarios: await listarSalariosVigentes(empresaDe(request), dia),
      // O salário vigente depende dos cargos (chave e nome) e dos lançamentos de salário.
      situacao: await situacaoDe(empresaDe(request), ["cargos", "salarios"])
    });
  });
  app.get("/api/locais", async (request) => ok({ locais: await listarLocais(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["locais"]) }));
  app.get("/api/organograma", async (request) => ok({ posicoes: await listarOrganograma(empresaDe(request)), situacao: await situacaoDe(empresaDe(request), ["organograma"]) }));
  app.get("/api/ficha-de-cargos", async (request) => ok({ ...(await listarFichaDeCargos(empresaDe(request))), situacao: await situacaoDe(empresaDe(request), ["ficha-de-cargos"]) }));
}
