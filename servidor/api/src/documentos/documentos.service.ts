import type {
  ChaveSincronizada,
  Copias,
  DocumentoResposta,
  GravarLote,
  Importacao,
  JsonValue,
  PerfilSessao,
  VersaoDocumento
} from "@cicluz/shared";
import { chaveSincronizada } from "@cicluz/shared";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import {
  atualizarDocumento,
  bancoDocumentos,
  contarDocumentos,
  executarEmTransacao,
  inserirDocumento,
  listarDocumentos,
  listarVersoes,
  marcarDadosImportados,
  registrarHistorico,
  removerDocumento,
  travarDocumentos,
  travarEmpresa,
  travarEmpresaParaImportar,
  type TipoHistorico
} from "./documentos.repository.ts";

type ConflitoDeVersao = { chave: string; versaoAtual: number };

// Interrompe a transação do lote: nada do lote fica gravado.
class LoteRecusado extends Error {
  constructor(readonly conflitos: ConflitoDeVersao[]) {
    super("lote recusado por conflito de versão");
  }
}

function importacaoPendente() {
  return new ErroDominio(
    "Os dados ainda não foram enviados ao servidor. O administrador precisa fazer a importação inicial.",
    409,
    "IMPORT_PENDING"
  );
}

export async function listar(perfil: PerfilSessao): Promise<DocumentoResposta[]> {
  const linhas = await listarDocumentos(perfil.empresa.id);
  // Uma chave que saiu da lista continua no banco (nada se apaga), mas não volta para a tela.
  return linhas.flatMap((linha) =>
    chaveSincronizada(linha.chave)
      ? [{ chave: linha.chave, valor: linha.valor, versao: linha.versao, atualizadoEm: linha.atualizadoEm.toISOString() }]
      : []
  );
}

export async function versoes(perfil: PerfilSessao): Promise<VersaoDocumento[]> {
  const linhas = await listarVersoes(perfil.empresa.id);
  return linhas.flatMap((linha) => (chaveSincronizada(linha.chave) ? [{ chave: linha.chave, versao: linha.versao }] : []));
}

function linhaHistorico(perfil: PerfilSessao, chave: string, valor: string | null, versao: number | null, tipo: TipoHistorico) {
  return { empresaId: perfil.empresa.id, chave, valor, versao, tipo, usuarioId: perfil.usuarioId };
}

// Grava um lote inteiro ou nada. Cada item só entra se a aba editou a partir da versão atual; um
// item com o mesmo conteúdo da versão atual é a repetição de um envio que já chegou e não conta
// como conflito. Lote recusado: o conteúdo que chegou vai para o histórico (tipo conflito) e a
// resposta é 409 com as chaves em conflito.
export async function gravarLote(perfil: PerfilSessao, lote: GravarLote): Promise<VersaoDocumento[]> {
  const empresaId = perfil.empresa.id;
  try {
    return await executarEmTransacao(async (tx) => {
      const empresa = await travarEmpresa(tx, empresaId);
      if (!empresa?.dadosImportadosEm) throw importacaoPendente();

      const atuais = new Map(
        (await travarDocumentos(tx, empresaId, lote.itens.map((item) => item.chave))).map((linha) => [linha.chave, linha])
      );

      const conflitos: ConflitoDeVersao[] = [];
      for (const item of lote.itens) {
        const atual = atuais.get(item.chave);
        if (!atual) {
          if (item.valor !== null && item.versaoBase !== 0) conflitos.push({ chave: item.chave, versaoAtual: 0 });
        } else if (atual.valor !== item.valor && atual.versao !== item.versaoBase) {
          conflitos.push({ chave: item.chave, versaoAtual: atual.versao });
        }
      }
      if (conflitos.length) throw new LoteRecusado(conflitos);

      const resultado: VersaoDocumento[] = [];
      const historico = [];
      for (const item of lote.itens) {
        const atual = atuais.get(item.chave);
        const dados = { empresaId, chave: item.chave, usuarioId: perfil.usuarioId };

        if (item.valor === null) {
          if (atual) {
            if (!(await removerDocumento(tx, empresaId, item.chave, atual.versao))) {
              throw new LoteRecusado([{ chave: item.chave, versaoAtual: atual.versao }]);
            }
            historico.push(linhaHistorico(perfil, item.chave, atual.valor, atual.versao, "removida"));
          }
          resultado.push({ chave: item.chave, versao: 0 });
          continue;
        }

        if (atual?.valor === item.valor) {
          resultado.push({ chave: item.chave, versao: atual.versao });
          continue;
        }

        const gravada = atual
          ? await atualizarDocumento(tx, { ...dados, valor: item.valor, versaoBase: atual.versao })
          : await inserirDocumento(tx, { ...dados, valor: item.valor });
        if (!gravada) throw new LoteRecusado([{ chave: item.chave, versaoAtual: atual?.versao ?? 1 }]);
        historico.push(linhaHistorico(perfil, item.chave, item.valor, gravada.versao, "gravada"));
        resultado.push({ chave: item.chave, versao: gravada.versao });
      }

      await registrarHistorico(tx, historico);
      return resultado;
    });
  } catch (error) {
    if (!(error instanceof LoteRecusado)) throw error;
    // Fora da transação de propósito: o 409 não pode desfazer a cópia do que o aparelho mandou.
    await registrarHistorico(
      bancoDocumentos,
      lote.itens.map((item) => linhaHistorico(perfil, item.chave, item.valor, null, "conflito"))
    );
    throw conflito(
      "Outro aparelho salvou antes. As suas alterações foram guardadas no histórico; atualize para ver a versão atual.",
      "DOCUMENT_VERSION_CONFLICT",
      { conflitos: error.conflitos as unknown as JsonValue }
    );
  }
}

// Importação inicial, uma vez por empresa, só pelo administrador: os dados do aparelho que ele
// escolheu viram a versão 1. Até ela acontecer, nenhum aparelho grava (ver gravarLote).
export async function importar(perfil: PerfilSessao, importacao: Importacao) {
  if (perfil.papel !== "administrador") {
    throw proibido("Só o administrador faz a importação inicial dos dados.", "ADMIN_ONLY");
  }
  const empresaId = perfil.empresa.id;
  return executarEmTransacao(async (tx) => {
    const empresa = await travarEmpresaParaImportar(tx, empresaId);
    if (!empresa) throw proibido("Empresa não encontrada", "COMPANY_NOT_FOUND");
    if (empresa.dadosImportadosEm || (await contarDocumentos(tx, empresaId)) > 0) {
      throw conflito("A importação inicial desta empresa já foi feita.", "IMPORT_ALREADY_DONE");
    }

    const historico = [];
    for (const item of importacao.itens) {
      const inserida = await inserirDocumento(tx, { empresaId, chave: item.chave, valor: item.valor, usuarioId: perfil.usuarioId });
      if (!inserida) throw conflito("A importação inicial desta empresa já foi feita.", "IMPORT_ALREADY_DONE");
      historico.push(linhaHistorico(perfil, item.chave, item.valor, inserida.versao, "gravada"));
    }
    await registrarHistorico(tx, historico);
    await marcarDadosImportados(tx, empresaId);
    return { importados: importacao.itens.length };
  });
}

// O aparelho entrega o que tinha antes de receber a versão do servidor. Só vai para o histórico:
// nada do que estava no iPad se perde.
export async function guardarCopias(perfil: PerfilSessao, copias: Copias) {
  await registrarHistorico(
    bancoDocumentos,
    copias.itens.map((item) => linhaHistorico(perfil, item.chave as ChaveSincronizada, item.valor, null, "substituida_pelo_servidor"))
  );
}
