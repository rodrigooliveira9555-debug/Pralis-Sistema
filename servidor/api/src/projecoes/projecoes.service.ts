import type { TransacaoBanco } from "../banco/conexao.ts";
import { ErroProjecao } from "./leitura.ts";
import { PROJETORES, type Projetor } from "./projetores.ts";
import {
  executarEmTransacao,
  lerDocumentosParaProjecao,
  lerProjecoesRegistradas,
  lerVersoesDosDocumentos,
  listarEmpresas,
  registrarSituacao,
  travarAssunto
} from "./projecoes.repository.ts";

// Mensagem legível para as regras que o próprio banco garante (nome da constraint → frase).
const REGRAS_DO_BANCO: Record<string, string> = {
  fin_taxas_sem_sobreposicao: "Há condições de taxa com vigências e parcelas sobrepostas na mesma operadora, bandeira e modalidade.",
  fin_taxas_vigencia_check: "Há condição de taxa com fim da vigência antes do início.",
  fin_taxas_parcelas_check: "Há condição de taxa com faixa de parcelas inválida.",
  fin_taxas_mdr_check: "Há MDR fora de 0 a 100%.",
  fin_taxas_antecipacao_check: "Há taxa de antecipação fora de 0 a 100%.",
  fin_taxas_tarifa_check: "Há tarifa por transação negativa.",
  contas_nome_sem_caixa_idx: "Há duas contas com o mesmo nome (maiúsculas e minúsculas contam como iguais)."
};

// Nome que o Drizzle dá às chaves primárias: "<tabela>_<colunas>_pk".
const TABELAS: Record<string, string> = {
  fin_grupos: "grupos",
  fin_tipos_venda: "tipos de venda",
  fin_bandeiras: "bandeiras",
  fin_operadoras: "operadoras",
  fin_taxas: "condições de taxa",
  contas: "contas",
  cargos: "cargos",
  perfis_areas: "áreas da ficha de cargos",
  perfis_cargos: "cargos da ficha",
  perfis_requisitos: "exigências da ficha",
  locais: "locais",
  organograma_posicoes: "posições do organograma",
  icones_personalizados: "ícones próprios"
};

const LIMITE_MENSAGEM = 300;

type ErroDoBanco = { code?: string; constraint?: string; cause?: ErroDoBanco };

function causaNoBanco(erro: unknown): ErroDoBanco | null {
  let atual = erro as ErroDoBanco | undefined;
  for (let i = 0; atual && i < 4; i += 1, atual = atual.cause) if (atual.code) return atual;
  return null;
}

// Erro que é do DADO da tela (e não do servidor): vira mensagem de onde corrigir.
function mensagemDoDado(causa: ErroDoBanco | null): string | null {
  if (!causa?.code) return null;
  if (causa.code.startsWith("23")) {
    const constraint = causa.constraint ?? "";
    if (REGRAS_DO_BANCO[constraint]) return REGRAS_DO_BANCO[constraint];
    const tabela = Object.keys(TABELAS).find((nome) => constraint.startsWith(`${nome}_`) && constraint.endsWith("_pk"));
    if (tabela) return `Há dois itens com o mesmo identificador em ${TABELAS[tabela]}.`;
    return `Dado fere uma regra do banco (${constraint || causa.code}).`;
  }
  // 22xxx: número grande demais, data impossível etc.
  if (causa.code.startsWith("22")) return "Há um número ou data fora do que o banco aceita (valor grande demais ou data impossível).";
  return null;
}

async function projetarUmaVez(tx: TransacaoBanco, empresaId: string, projetor: Projetor) {
  await travarAssunto(tx, empresaId, projetor.assunto);
  const linhas = await lerDocumentosParaProjecao(tx, empresaId, projetor.chaves);
  const valores = new Map(linhas.map((linha) => [linha.chave, linha.valor]));
  const versoes = Object.fromEntries(projetor.chaves.map((chave) => [chave, linhas.find((l) => l.chave === chave)?.versao ?? 0]));
  const base = { empresaId, assunto: projetor.assunto, versoes, versaoRegra: projetor.versaoRegra };
  try {
    // Savepoint: se a projeção falhar, desfaz só ela; a gravação do documento continua valendo.
    await tx.transaction(async (ponto) => projetor.projetar(ponto, empresaId, valores));
    await registrarSituacao(tx, { ...base, situacao: "ok", mensagem: null });
  } catch (erro) {
    const causa = causaNoBanco(erro);
    // Deadlock / serialização: transitório, quem chamou tenta de novo.
    if (causa?.code?.startsWith("40")) throw erro;
    // Nunca derruba a gravação da tela: erro inesperado também vira "falha".
    let mensagem = erro instanceof ErroProjecao ? erro.message : mensagemDoDado(causa);
    if (mensagem === null) {
      // Só código e constraint: o erro do Drizzle carrega o SQL e os parâmetros (salários, taxas).
      console.error(`[projecao] ${projetor.assunto} falhou sem regra conhecida`, { code: causa?.code, constraint: causa?.constraint });
      mensagem = "Erro interno ao montar as tabelas deste assunto. O dado da tela foi salvo; avise o suporte.";
    }
    await registrarSituacao(tx, { ...base, situacao: "falha", mensagem: mensagem.slice(0, LIMITE_MENSAGEM) });
  }
}

// Chamado na mesma transação da gravação dos documentos: só os assuntos cujas chaves MUDARAM
// (repetir um envio igual não reconstrói nada). Os projetores rodam sempre na mesma ordem, então as
// travas de assunto são pegas na mesma ordem por todas as transações.
export async function atualizarProjecoes(tx: TransacaoBanco, empresaId: string, chavesAlteradas: string[]) {
  for (const projetor of PROJETORES) {
    if (projetor.chaves.some((chave) => chavesAlteradas.includes(chave))) await projetarUmaVez(tx, empresaId, projetor);
  }
}

async function reprocessar(empresaId: string, projetores: Projetor[]) {
  for (const projetor of projetores) {
    // Uma transação por assunto, com uma nova tentativa em caso de deadlock.
    for (let tentativa = 1; ; tentativa += 1) {
      try {
        await executarEmTransacao((tx) => projetarUmaVez(tx, empresaId, projetor));
        break;
      } catch (erro) {
        if (tentativa >= 2 || !causaNoBanco(erro)?.code?.startsWith("40")) throw erro;
      }
    }
  }
}

export async function reprocessarTodas(empresaId: string) {
  await reprocessar(empresaId, PROJETORES);
}

// Assuntos cuja projeção registrada não bate com os documentos atuais (gravação feita durante um
// deploy, por exemplo) ou que foram projetados por uma regra mais antiga do código.
export async function assuntosDefasados(empresaId: string): Promise<Projetor[]> {
  const [registradas, documentosAtuais] = await Promise.all([lerProjecoesRegistradas(empresaId), lerVersoesDosDocumentos(empresaId)]);
  const versaoAtual = new Map(documentosAtuais.map((doc) => [doc.chave, doc.versao]));
  return PROJETORES.filter((projetor) => {
    const registrada = registradas.find((r) => r.assunto === projetor.assunto);
    if (!registrada) return projetor.chaves.some((chave) => versaoAtual.has(chave));
    if (registrada.versaoRegra !== projetor.versaoRegra) return true;
    return projetor.chaves.some((chave) => (registrada.versoes[chave] ?? 0) !== (versaoAtual.get(chave) ?? 0));
  });
}

// Na subida da API e no deploy: reconstrói só o que está defasado, empresa por empresa.
export async function reprocessarDefasadas(log: (mensagem: string) => void) {
  for (const empresa of await listarEmpresas()) {
    const defasados = await assuntosDefasados(empresa.id);
    if (!defasados.length) continue;
    await reprocessar(empresa.id, defasados);
    log(`[projecoes] ${empresa.nome}: reconstruídos ${defasados.map((p) => p.assunto).join(", ")}`);
  }
}
