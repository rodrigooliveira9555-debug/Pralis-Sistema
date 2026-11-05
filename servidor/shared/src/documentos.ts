import { z } from "zod";

// Chaves do localStorage do site que são DADO DE NEGÓCIO da empresa: vão para o banco e valem em
// todos os aparelhos. Lista fechada de propósito: a API recusa qualquer outra chave. É a fonte
// única: o navegador recebe esta lista em GET /api/sessao, não tem cópia própria.
//
// Ficam FORA, de propósito:
// - preferências de tela de cada aparelho (tema, ordem e visibilidade de menus, ordenação, barra
//   de busca): são do aparelho, não da empresa;
// - "cicluz-cadastro-completo-v1": tem CPF e dados pessoais. Só entra com decisão registrada sobre
//   LGPD (PROJECT_BRAIN/11, P-11).
export const CHAVES_SINCRONIZADAS = [
  // Financeiro: grupos (VND/DES/MER/RET), tipos de venda, bandeiras, operadoras e taxas.
  "cicluz-financial-hierarchy-v1",
  // Contas (CNT).
  "cicluz-ti-groups-v1",
  "cicluz-ti-account-details-v1",
  // Pessoas: cargos, salários por vigência, ficha de cargos, organograma.
  "cicluz-cargos-v1",
  "cicluz-cargos-referencia-v1",
  "cicluz-salarios-vigencias-v1",
  "cicluz-job-profiles-v1",
  "cicluz-organogram-positions-v1",
  // Estrutura física: área, setor, local e sublocal.
  "cicluz-location-tree-v1",
  "cicluz-location-custom-colors-v1",
  // Identidade cadastrada: biblioteca de ícones e cores próprias.
  "cicluz-icon-library-v1",
  "cicluz-custom-colors-v1",
  // Compras (fornecedores, produtos, agendas, cotações, pedidos, estoque, conferências), num documento
  // só. Tem CPF/CNPJ e WhatsApp de fornecedor: contato comercial, necessário para cotar. Entrou por
  // decisão do Zé (04/11/2026), registrada em PROJECT_BRAIN/11 como exceção ao P-11.
  "cicluz-compras-v1",
  // Agenda (listas e compromissos com subtarefas), num documento só. O responsável é gravado pelo id.
  "cicluz-agenda-v1",
  // Marcas de importação dos seeds. Precisam acompanhar os dados (e ir no mesmo lote): sem elas,
  // um aparelho novo reimportaria o seed por cima do que veio do servidor.
  "cicluz-financial-import-complete-v3-ret",
  "cicluz-financial-legacy-import-v1",
  "cicluz-bandeiras-import-v1",
  "cicluz-operadoras-import-v1",
  "cicluz-ti-contas-seed-v1",
  "cicluz-icon-pilot-migrated-v1",
  "cicluz-job-icon-pilot-v1"
] as const;

export type ChaveSincronizada = (typeof CHAVES_SINCRONIZADAS)[number];

// Chaves que entraram na lista depois da importação inicial. Na entrada, se o servidor ainda não tem o
// documento e o aparelho (da mesma empresa) tem, o aparelho envia o dele em vez de apagá-lo. Só vale
// para chave que a tela nunca apaga: para as outras, "sem documento" pode ser uma remoção feita em
// outro aparelho, e reenviar ressuscitaria o dado apagado.
export const CHAVES_ADOTADAS_DO_APARELHO = ["cicluz-compras-v1", "cicluz-agenda-v1"] as const satisfies readonly ChaveSincronizada[];

export function chaveSincronizada(chave: string): chave is ChaveSincronizada {
  return (CHAVES_SINCRONIZADAS as readonly string[]).includes(chave);
}

// Teto por documento, em bytes UTF-8 (o mesmo que o corpo HTTP mede). O teto existe para um bug de
// tela não encher o banco; o corpo do lote aceita até LIMITE_CORPO_LOTE.
export const TAMANHO_MAXIMO_DOCUMENTO = 4 * 1024 * 1024;
export const LIMITE_CORPO_LOTE = 16 * 1024 * 1024;

const codificador = new TextEncoder();

export function bytesUtf8(texto: string): number {
  return codificador.encode(texto).length;
}

const chaveSchema = z.string().refine(chaveSincronizada, "Chave não sincronizada");
const valorSchema = z
  .string()
  .refine((valor) => bytesUtf8(valor) <= TAMANHO_MAXIMO_DOCUMENTO, "Documento grande demais");

function chavesUnicas(itens: Array<{ chave: string }>) {
  return new Set(itens.map((item) => item.chave)).size === itens.length;
}

// Gravação em lote, tudo ou nada: a tela grava dado e marca de seed (ou contas e detalhes das
// contas) juntos; se um item não puder entrar, nenhum entra.
export const gravarLoteSchema = z.object({
  itens: z
    .array(
      z.object({
        chave: chaveSchema,
        // A string exata do localStorage (JSON ou marca "1"). null = a tela apagou a chave.
        valor: valorSchema.nullable(),
        // Versão que esta aba tinha quando editou. 0 = a aba acha que o documento não existe.
        versaoBase: z.number().int().min(0)
      })
    )
    .min(1)
    .max(CHAVES_SINCRONIZADAS.length)
    .refine(chavesUnicas, "Chave repetida no lote")
});

// Importação inicial: os dados do aparelho escolhido pelo administrador viram a versão 1. Uma vez
// por empresa. Lista vazia = começar do zero (as telas criam os dados padrão depois).
export const importacaoSchema = z.object({
  itens: z
    .array(z.object({ chave: chaveSchema, valor: valorSchema }))
    .max(CHAVES_SINCRONIZADAS.length)
    .refine(chavesUnicas, "Chave repetida na importação")
});

// O que o aparelho tinha antes de receber a versão do servidor. Só vai para o histórico.
export const copiasSchema = z.object({
  itens: z
    .array(z.object({ chave: chaveSchema, valor: valorSchema }))
    .min(1)
    .max(CHAVES_SINCRONIZADAS.length)
});

export type GravarLote = z.infer<typeof gravarLoteSchema>;
export type Importacao = z.infer<typeof importacaoSchema>;
export type Copias = z.infer<typeof copiasSchema>;

export type DocumentoResposta = {
  chave: ChaveSincronizada;
  valor: string;
  versao: number;
  atualizadoEm: string;
};

export type VersaoDocumento = { chave: ChaveSincronizada; versao: number };
