import { z } from "zod";
import type { ChavePermissao } from "./acessos.ts";

// Produtos no servidor (docs/PRODUTOS_NO_SERVIDOR_PLANO.md). Contrato da API e regras puras usadas pela API.
// As regras de casar grupo/local por nome vieram de dist/compras/produto-importacao.js (importação de 09/11);
// a tela passa a usar a API na fase 2, e a cópia da tela sai nessa entrega.

/* ---------- Permissões (decisão do Zé, 09/11/2026: as de Compras) ---------- */
export const PERMISSAO_VER_PRODUTOS: ChavePermissao[] = ["compras_visualizar"];
// Quem trabalha em Compras (solicita, cota, aprova ou recebe) mantém o cadastro, como na tela de hoje.
export const PERMISSAO_EDITAR_PRODUTOS: ChavePermissao[] = ["compras_solicitar", "compras_cotar", "compras_aprovar", "compras_receber"];
// Importar do app de produtos e revincular continuam só do administrador (como na tela de hoje).

/* ---------- Normalização e casamento por nome (só exato depois de normalizar) ---------- */
const FORMATO = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g;
export function limparNome(s: unknown): string {
  return String(s ?? "")
    .replace(FORMATO, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
export function separarGrupo(texto: unknown): { grupo: string; sub: string } | null {
  const t = limparNome(texto).replace(/^MER\.?\s+/, "");
  if (!t) return null;
  const i = t.indexOf(" - ");
  return i >= 0 ? { grupo: t.slice(0, i).trim(), sub: t.slice(i + 3).trim() } : { grupo: t, sub: "" };
}
export type GrupoParaCasar = { id: string; nome: string; subgrupos: { id: string; nome: string }[] };
export function casarGrupo(texto: unknown, grupos: GrupoParaCasar[]): { grupoId: string; subgrupoId: string | null } | null {
  const g = separarGrupo(texto);
  if (!g) return null;
  const G = grupos.find((x) => limparNome(x.nome) === g.grupo);
  if (!G) return null;
  if (!g.sub) return { grupoId: G.id, subgrupoId: null };
  const S = G.subgrupos.find((x) => limparNome(x.nome) === g.sub);
  return S ? { grupoId: G.id, subgrupoId: S.id } : null;
}
export type LocalParaCasar = { id: string; nome: string; caminho: string[] };
const VAZIOS = new Set(["", "-", "."]);
// Primeiro texto que casa com UM nó (nome ou caminho "ÁREA - SETOR - …"); nome repetido é ambíguo e não casa.
export function casarLocal(textos: unknown[], nos: LocalParaCasar[]): string | null {
  for (const bruto of textos) {
    const t = limparNome(bruto);
    if (VAZIOS.has(t)) continue;
    const achados = nos.filter((n) => limparNome(n.nome) === t || limparNome(n.caminho.join(" - ")) === t);
    if (achados.length === 1) return achados[0]!.id;
  }
  return null;
}

/* ---------- Contrato ---------- */
const TETO = 99_999_999_999;
// Decimal não negativo com no máximo `casas` casas, como número ou texto com ponto. Sai como TEXTO (numeric).
function decimal(casas: number, rotulo: string) {
  const formato = new RegExp(`^\\d+(\\.\\d{1,${casas}})?$`);
  return z
    .union([z.number(), z.string().trim()])
    .transform((v) => (typeof v === "number" ? (Number.isFinite(v) ? String(v) : "x") : v))
    .refine((v) => formato.test(v), `${rotulo}: use no máximo ${casas} casas decimais`)
    .refine((v) => Number(v) <= TETO, `${rotulo}: valor grande demais`);
}
const opcional = <T extends z.ZodType>(s: T) => s.nullable().optional();
const texto = (max: number) => z.string().trim().max(max);
const LIMITE_DADOS = 200_000; // foto em data URL de 320 px cabe com folga

const dadosSchema = z
  .record(z.string(), z.unknown())
  .refine((d) => JSON.stringify(d).length <= LIMITE_DADOS, "Cadastro grande demais (a foto pode estar grande demais)");

const camposProduto = {
  nome: texto(200).min(1, "Informe o nome"),
  descricao: texto(300).min(1, "Informe a descrição"),
  marca: opcional(texto(120)),
  codigoBarras: opcional(texto(60)),
  tipo: z.enum(["revenda", "transformacao"]),
  status: z.enum(["ativo", "inativo"]),
  liberadoCompra: z.boolean(),
  grupoId: opcional(texto(80)),
  subgrupoId: opcional(texto(80)),
  localId: opcional(texto(80)),
  custo: opcional(decimal(2, "Custo")),
  margem: opcional(decimal(6, "Margem")),
  precoVenda: opcional(decimal(2, "Preço de venda")),
  calculoAutomatico: z.boolean(),
  dados: dadosSchema.default({})
};
export const produtoCriacaoSchema = z.object(camposProduto);
export const produtoEdicaoSchema = z.object({ ...camposProduto, versao: z.number().int().positive() });
export type ProdutoCriacao = z.infer<typeof produtoCriacaoSchema>;
export type ProdutoEdicao = z.infer<typeof produtoEdicaoSchema>;

// Produto vindo do app de produtos (já no formato do S2, montado pela tela a partir do Backup XLSX).
export const produtoImportadoSchema = z.object({
  ...camposProduto,
  liberadoCompra: z.boolean().optional(),
  codigoInterno: texto(20).regex(/^\d+$/, "Código interno só com números"),
  appId: texto(80).min(1),
  appLojaId: opcional(texto(80)),
  origemGrupo: opcional(texto(200)),
  origemLocais: z.array(texto(120)).max(10).default([])
});
export const importacaoProdutosSchema = z.object({
  produtos: z.array(produtoImportadoSchema).min(1).max(500, "Mande no máximo 500 produtos por lote"),
  maiorCodigoApp: z.number().int().nonnegative().max(699_999)
});
export type ProdutoImportado = z.infer<typeof produtoImportadoSchema>;
export type ImportacaoProdutos = z.infer<typeof importacaoProdutosSchema>;

export const ORDENS_PRODUTOS = ["recentes", "nome", "codigo"] as const;
export const listarProdutosSchema = z.object({
  busca: z.string().trim().max(120).optional(),
  status: z.enum(["ativo", "inativo", "todos"]).default("ativo"),
  tipo: z.enum(["revenda", "transformacao"]).optional(),
  grupoId: z.string().trim().max(80).optional(),
  vinculo: z.enum(["sem_vinculo", "sem_grupo", "sem_local"]).optional(),
  ordem: z.enum(ORDENS_PRODUTOS).default("recentes"),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(100).default(12)
});
export type FiltroProdutos = z.infer<typeof listarProdutosSchema>;

export type ProdutoResposta = {
  id: string;
  codigoInterno: string;
  codigoBarras: string | null;
  nome: string;
  descricao: string;
  marca: string | null;
  tipo: "revenda" | "transformacao";
  status: "ativo" | "inativo";
  liberadoCompra: boolean;
  grupoId: string | null;
  subgrupoId: string | null;
  localId: string | null;
  custo: string | null;
  margem: string | null;
  precoVenda: string | null;
  calculoAutomatico: boolean;
  dados: Record<string, unknown>;
  appId: string | null;
  versao: number;
  semGrupo: boolean;
  semLocal: boolean;
  atualizadoEm: string;
};
export type PaginaProdutos = {
  itens: ProdutoResposta[];
  total: number;
  pagina: number;
  paginas: number;
  contagens: { ativos: number; inativos: number; semVinculo: number; semGrupo: number; semLocal: number };
};
// Campos do `dados` que vão no resumo dos ativos (Compras, Produção e estoque; fica guardado no aparelho).
export const CAMPOS_RESUMO = ["unidade", "unidadeIndividual", "quantidadeIndividual", "embalagem", "cDe", "qtdEmbalagem", "medidaCompra", "estoqueMin", "estoqueMax", "setorEstoque"] as const;

/* ---------- Reimportação: o que é do S2 não volta ao valor do app ---------- */
// No `dados`, estes campos são do S2 (não existem no app) e sobrevivem à reimportação.
export const DADOS_DO_S2 = ["conversoes", "pesavel", "teclaBalanca", "validadeBalanca", "areaEstoque", "areaVenda", "vinculoManual"] as const;
export type VinculoManual = { grupo?: boolean; local?: boolean };
export function vinculoManualDe(dados: unknown): VinculoManual {
  const v = (dados as { vinculoManual?: unknown } | null)?.vinculoManual;
  return v && typeof v === "object" ? (v as VinculoManual) : {};
}
