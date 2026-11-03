import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { ok } from "@cicluz/shared";
import { perfilDaRequisicao } from "../auth/guards.ts";
import { proibido } from "../erros.ts";
import { executarEmTransacao } from "../documentos/documentos.repository.ts";
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

export async function registrarRotasConsultas(app: FastifyInstance) {
  // Situação das tabelas de cada assunto (ok / falha com a mensagem de onde corrigir na tela).
  app.get("/api/projecoes", async (request) => ok({ assuntos: await listarSituacoes(empresaDe(request)) }));

  // Reconstrói todas as tabelas a partir dos documentos (ex.: depois de uma migration nova).
  app.post("/api/projecoes/reprocessar", async (request) => {
    const perfil = perfilDaRequisicao(request);
    if (perfil.papel !== "administrador") throw proibido("Só o administrador reprocessa.", "ADMIN_ONLY");
    await executarEmTransacao((tx) => reprocessarTodas(tx, perfil.empresa.id));
    return ok({ assuntos: await listarSituacoes(perfil.empresa.id) });
  });

  app.get("/api/financeiro/grupos", async (request) => {
    const { colecao } = z
      .object({ colecao: z.enum(["mercadorias", "despesas", "vendas", "retiradas"]).optional() })
      .parse(request.query);
    return ok({ grupos: await listarGrupos(empresaDe(request), colecao) });
  });
  app.get("/api/financeiro/tipos-venda", async (request) => ok({ tiposVenda: await listarTiposVenda(empresaDe(request)) }));
  app.get("/api/financeiro/bandeiras", async (request) => ok({ bandeiras: await listarBandeiras(empresaDe(request)) }));
  app.get("/api/financeiro/operadoras", async (request) => ok({ operadoras: await listarOperadoras(empresaDe(request)) }));
  app.get("/api/financeiro/taxas", async (request) => {
    const filtro = z
      .object({ operadora: z.string().optional(), bandeira: z.string().optional(), data: dataSchema.optional() })
      .parse(request.query);
    const limpo = Object.fromEntries(Object.entries(filtro).filter(([, valor]) => valor !== undefined));
    return ok({ taxas: await listarTaxas(empresaDe(request), limpo) });
  });

  app.get("/api/contas", async (request) => ok({ contas: await listarContas(empresaDe(request)) }));
  app.get("/api/cargos", async (request) => ok({ cargos: await listarCargos(empresaDe(request)) }));
  app.get("/api/salarios/vigentes", async (request) => {
    const { data } = z.object({ data: dataSchema.optional() }).parse(request.query);
    const dia = data ?? hojeSaoPaulo();
    return ok({ data: dia, salarios: await listarSalariosVigentes(empresaDe(request), dia) });
  });
  app.get("/api/locais", async (request) => ok({ locais: await listarLocais(empresaDe(request)) }));
  app.get("/api/organograma", async (request) => ok({ posicoes: await listarOrganograma(empresaDe(request)) }));
  app.get("/api/ficha-de-cargos", async (request) => ok(await listarFichaDeCargos(empresaDe(request))));
}
