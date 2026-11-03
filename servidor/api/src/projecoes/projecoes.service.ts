import type { TransacaoBanco } from "../banco/conexao.ts";
import { ErroProjecao } from "./leitura.ts";
import { PROJETORES, type Projetor } from "./projetores.ts";
import { lerDocumentosParaProjecao, registrarSituacao } from "./projecoes.repository.ts";

// Mensagem legível para as regras que o próprio banco garante (nome da constraint → frase).
const REGRAS_DO_BANCO: Record<string, string> = {
  fin_taxas_sem_sobreposicao: "Há condições de taxa com vigências e parcelas sobrepostas na mesma operadora, bandeira e modalidade.",
  fin_taxas_vigencia_check: "Há condição de taxa com fim da vigência antes do início.",
  fin_taxas_parcelas_check: "Há condição de taxa com faixa de parcelas inválida.",
  fin_taxas_mdr_check: "Há MDR fora de 0 a 100%.",
  fin_taxas_antecipacao_check: "Há taxa de antecipação fora de 0 a 100%.",
  fin_grupos_pkey: "Há dois itens com o mesmo id na mesma coleção.",
  fin_bandeiras_pkey: "Há duas bandeiras com o mesmo id.",
  fin_tipos_venda_pkey: "Há dois tipos de venda com o mesmo id.",
  fin_operadoras_pkey: "Há duas operadoras com o mesmo id."
};

type ErroDoBanco = { code?: string; constraint?: string; cause?: ErroDoBanco };

function erroDeRegra(erro: unknown): string | null {
  let atual = erro as ErroDoBanco | undefined;
  for (let i = 0; atual && i < 4; i += 1, atual = atual.cause) {
    // 23xxx = violação de integridade (FK, CHECK, UNIQUE, EXCLUDE).
    if (atual.code?.startsWith("23")) {
      return (atual.constraint && REGRAS_DO_BANCO[atual.constraint]) ?? `Dado fere uma regra do banco (${atual.constraint ?? atual.code}).`;
    }
  }
  return null;
}

async function projetar(tx: TransacaoBanco, empresaId: string, projetor: Projetor) {
  const linhas = await lerDocumentosParaProjecao(tx, empresaId, projetor.chaves);
  const valores = new Map(linhas.map((linha) => [linha.chave, linha.valor]));
  const versaoDocumento = Math.max(0, ...linhas.map((linha) => linha.versao));
  try {
    // Savepoint: se a projeção falhar, desfaz só ela; a gravação do documento continua valendo.
    await tx.transaction(async (ponto) => projetor.projetar(ponto, empresaId, valores));
    await registrarSituacao(tx, { empresaId, assunto: projetor.assunto, situacao: "ok", versaoDocumento, mensagem: null });
  } catch (erro) {
    // Nunca derruba a gravação da tela: erro inesperado também vira "falha", com registro no log.
    let mensagem = erro instanceof ErroProjecao ? erro.message : erroDeRegra(erro);
    if (mensagem === null) {
      console.error(`[projecao] ${projetor.assunto} falhou sem regra conhecida`, erro);
      mensagem = "Erro interno ao montar as tabelas deste assunto. O dado da tela foi salvo; avise o suporte.";
    }
    await registrarSituacao(tx, { empresaId, assunto: projetor.assunto, situacao: "falha", versaoDocumento, mensagem });
  }
}

// Chamado na mesma transação da gravação dos documentos: atualiza só os assuntos tocados.
export async function atualizarProjecoes(tx: TransacaoBanco, empresaId: string, chavesAlteradas: string[]) {
  for (const projetor of PROJETORES) {
    if (projetor.chaves.some((chave) => chavesAlteradas.includes(chave))) await projetar(tx, empresaId, projetor);
  }
}

// Reconstrói todos os assuntos a partir dos documentos (ex.: depois de uma migration nova).
export async function reprocessarTodas(tx: TransacaoBanco, empresaId: string) {
  for (const projetor of PROJETORES) await projetar(tx, empresaId, projetor);
}
