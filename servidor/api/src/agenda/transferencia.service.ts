import type { JsonValue, PerfilSessao, TransferenciaAgenda } from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import * as repo from "./transferencia.repository.ts";
import { estado } from "./compromissos.repository.ts";
import { converter, nadaExistente, somaFecha, type Conversao, type Pendencia } from "./transferencia.regras.ts";

// Leva a Agenda do documento "cicluz-agenda-v1" para as tabelas (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 4).
// O servidor lê o PRÓPRIO documento (um corpo mandado pelo aparelho poderia ser forjado: é o G1). Uma transação:
// converte, grava, confere no banco; se a soma não fechar, nada muda e a tentativa fica registrada como recusada.
// O documento não é apagado nem alterado. Rodar de novo não duplica nem sobrescreve o que foi mexido pela tela nova.

function exigirAdministrador(perfil: PerfilSessao) {
  if (perfil.papel !== "administrador") throw proibido("Só o administrador leva a Agenda para o servidor.", "ADMIN_ONLY");
}

class Recusa extends Error {
  constructor(readonly motivo: string, readonly conversao: Conversao | null) { super(motivo); }
}

function lerDocumento(doc: { valor: string } | null): unknown {
  if (!doc) return null;
  try {
    const x = JSON.parse(doc.valor) as unknown;
    if (x && typeof x === "object" && !Array.isArray(x)) return x;
  } catch {
    // cai no erro abaixo
  }
  throw new ErroDominio("O documento da Agenda no servidor está ilegível; nada foi feito. Avise o suporte.", 409, "AGENDA_DOCUMENTO_ILEGIVEL");
}

const itensDe = (x: unknown): Array<Record<string, unknown>> => {
  const itens = (x && typeof x === "object" ? (x as Record<string, unknown>)["itens"] : null) ?? [];
  return Array.isArray(itens) ? (itens.filter((i) => i && typeof i === "object") as Array<Record<string, unknown>>) : [];
};

/** Prévia para o administrador: contagens, pendências, ids sem conta, órfãos e o que sumiu em conflitos antigos. */
export async function previa(perfil: PerfilSessao) {
  exigirAdministrador(perfil);
  const empresaId = perfil.empresa.id;
  const doc = await repo.documento(banco, empresaId);
  const dados = lerDocumento(doc);
  const [contas, ex, est] = [await repo.contas(banco, empresaId), await repo.existentes(banco, empresaId), await estado(banco, empresaId)];
  const conv = converter(dados, {
    empresaId, adminId: perfil.usuarioId, gestorSemCriador: perfil.usuarioId, dePara: {},
    contas: new Set(contas.map((c) => c.id)), contasAtivas: contas.filter((c) => c.ativo).map((c) => c.id), existentes: ex
  });
  const idsDoc = itensDe(dados).map((i) => String(i["id"]));
  const atuais = new Set(idsDoc);
  // G4: compromissos que aparecem em gravações recusadas e não estão no documento atual nem nas tabelas.
  const perdidos = new Map<string, { id: string; titulo: string; gravadoEm: string }>();
  for (const h of await repo.conflitosGuardados(empresaId)) {
    let guardado: unknown = null;
    try { guardado = h.valor ? JSON.parse(h.valor) : null; } catch { continue; }
    for (const i of itensDe(guardado)) {
      const id = String(i["id"] ?? "");
      if (id && !atuais.has(id) && !ex.compromissos.has(id)) perdidos.set(id, { id, titulo: String(i["titulo"] ?? "").slice(0, 120), gravadoEm: h.gravadoEm.toISOString() });
    }
  }
  return {
    jaTransferida: Boolean(est),
    documento: { existe: Boolean(doc), versao: doc?.versao ?? null },
    contagens: conv.antes,
    pendencias: conv.pendencias,
    idsSemConta: conv.idsSemConta,
    itensSemCriador: conv.itensSemCriador,
    pessoas: contas.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: c.nome })),
    orfaos: await repo.orfaos(empresaId, idsDoc),
    perdidosEmConflito: [...perdidos.values()],
    somaFecha: somaFecha(conv) === ""
  };
}

/** Executa (primeira vez ou retransferência). Nada é apagado; a soma tem de fechar. */
export async function executar(perfil: PerfilSessao, entrada: TransferenciaAgenda) {
  exigirAdministrador(perfil);
  const empresaId = perfil.empresa.id;
  const todas = await repo.contas(banco, empresaId);
  const ativas = new Set(todas.filter((c) => c.ativo).map((c) => c.id));
  if (!ativas.has(entrada.gestorSemCriador)) throw new ErroDominio("Escolha uma conta ativa da empresa para os compromissos sem criador.", 400, "AGENDA_INVALIDO");
  const contas = new Set(todas.map((c) => c.id));
  if (Object.values(entrada.dePara).some((para) => para !== null && !contas.has(para))) {
    throw new ErroDominio("Uma das ligações aponta para uma conta que não é desta empresa.", 400, "AGENDA_INVALIDO");
  }

  let origem: "servidor" | "retransferencia" = "servidor";
  let documentoVersao: number | null = null;
  try {
    return await banco.transaction(async (tx) => {
      await repo.travar(tx, empresaId);
      const doc = await repo.documento(tx, empresaId);
      documentoVersao = doc?.versao ?? null;
      if (documentoVersao !== entrada.documentoVersao) {
        throw conflito("A Agenda antiga mudou depois da prévia. Veja a prévia de novo antes de confirmar.", "AGENDA_DOCUMENTO_MUDOU");
      }
      const dados = lerDocumento(doc);
      if (await estado(tx, empresaId)) origem = "retransferencia";
      const conv = converter(dados, {
        empresaId, adminId: perfil.usuarioId, gestorSemCriador: entrada.gestorSemCriador, dePara: entrada.dePara,
        contas, contasAtivas: [...ativas], existentes: origem === "servidor" ? nadaExistente() : await repo.existentes(tx, empresaId)
      });
      const motivo = somaFecha(conv);
      if (motivo) throw new Recusa(motivo, conv);

      await repo.criarOuSubirEstado(tx, empresaId);
      let pulados: string[];
      try {
        ({ pulados } = await repo.gravarConversao(tx, empresaId, conv));
      } catch (e) {
        // O banco recusou alguma linha (regra que a conversão não previu): tudo é desfeito e fica registrado.
        throw new Recusa("o banco recusou uma linha (" + (e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)).slice(0, 300) + ")", conv);
      }
      // Conferência no banco: tudo o que devia estar na tabela está.
      const noBanco = await repo.presentes(tx, empresaId, conv.esperados);
      const esperado = { listas: conv.esperados.grupos.length, colunas: conv.esperados.colunas.length, itens: conv.esperados.compromissos.length, relacoes: conv.esperados.relacoes.length };
      for (const [cat, n] of Object.entries(esperado)) {
        if (noBanco[cat as keyof typeof noBanco] !== n) throw new Recusa(`${cat}: esperados ${n} na tabela, o banco tem ${noBanco[cat as keyof typeof noBanco]}`, conv);
      }
      // Mexidos pela tela nova enquanto a transferência rodava: ficou a versão da tela nova (vão para a pendência).
      const pendencias: Pendencia[] = [
        ...conv.pendencias,
        ...pulados.map((id) => ({
          tipo: "compromisso", id, titulo: String(conv.atualizar.find((l) => l.id === id)?.titulo ?? "").slice(0, 80),
          detalhe: "Mudou no documento antigo e também pela Agenda nova durante a transferência; ficou a versão da Agenda nova. Confira."
        }))
      ];
      const depois = { ...conv.destino, noBanco } as unknown as JsonValue;
      await repo.registrar(tx, {
        empresaId, origem, documentoVersao, contagemAntes: conv.antes, contagemDepois: depois,
        pendencias, situacao: "concluida", feitaPor: perfil.usuarioId
      });
      return {
        situacao: "concluida" as const, origem, contagens: conv.antes, destino: conv.destino, pendencias,
        novos: { listas: conv.grupos.length, colunas: conv.colunas.length, compromissos: conv.compromissos.length, atualizados: conv.atualizar.length - pulados.length, ligacoes: conv.relacoes.length, notas: conv.avaliacoes.length }
      };
    });
  } catch (erro) {
    if (!(erro instanceof Recusa)) throw erro;
    // A transação foi desfeita: nada mudou. A tentativa fica registrada com o motivo.
    await repo.registrar(banco, {
      empresaId, origem, documentoVersao, contagemAntes: erro.conversao?.antes ?? {}, contagemDepois: (erro.conversao?.destino ?? {}) as JsonValue,
      pendencias: [{ tipo: "recusa", detalhe: erro.motivo } satisfies Pendencia, ...(erro.conversao?.pendencias ?? [])], situacao: "recusada", feitaPor: perfil.usuarioId
    });
    throw conflito("A conferência não fechou; nada foi mudado. Motivo: " + erro.motivo, "AGENDA_TRANSFERENCIA_RECUSADA");
  }
}

/**
 * A cópia antiga que ainda está num aparelho (iPad): guardada inteira no histórico e comparada com as tabelas.
 * NÃO aplica nada: o administrador vê a lista e decide.
 */
export async function receberDoAparelho(perfil: PerfilSessao, valor: string) {
  const empresaId = perfil.empresa.id;
  await repo.guardarCopiaDoAparelho(empresaId, valor, perfil.usuarioId);
  let dados: unknown = null;
  try { dados = JSON.parse(valor); } catch { dados = null; }
  const itens = itensDe(dados);
  const naTabela = new Map((await repo.compromissosPorId(empresaId, itens.map((i) => String(i["id"] ?? "")).filter(Boolean))).map((c) => [c.id, c]));
  const pendencias: Pendencia[] = [];
  for (const i of itens) {
    const id = String(i["id"] ?? "");
    const titulo = String(i["titulo"] ?? "").slice(0, 80);
    const linha = naTabela.get(id);
    const quando = new Date(String(i["atualizadoEm"] ?? ""));
    if (!linha) pendencias.push({ tipo: "so-no-aparelho", id, titulo, detalhe: "Está só na cópia do aparelho." });
    else if (!Number.isNaN(quando.getTime()) && quando.getTime() > linha.atualizadoEm.getTime()) {
      pendencias.push({ tipo: "diferente", id, titulo, detalhe: "A cópia do aparelho é mais nova que a do servidor." });
    }
  }
  if (dados === null) pendencias.push({ tipo: "ilegivel", detalhe: "A cópia do aparelho não pôde ser lida; ficou guardada como veio." });
  const resumo = { soNoAparelho: pendencias.filter((x) => x.tipo === "so-no-aparelho").length, diferentes: pendencias.filter((x) => x.tipo === "diferente").length };
  await repo.registrar(banco, {
    empresaId, origem: "aparelho", documentoVersao: null, contagemAntes: { itens: itens.length }, contagemDepois: resumo,
    pendencias, situacao: "concluida", feitaPor: perfil.usuarioId
  });
  return { guardada: true, ...resumo };
}
