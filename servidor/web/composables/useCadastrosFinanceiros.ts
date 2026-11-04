import type { CategoriaLancamento } from "@cicluz/shared";

export type OpcaoGrupo = { title: string; value: string };
export type OpcaoConta = { title: string; value: string };

type Grupo = { itemId: string; paiId: string | null; nome: string; ativo: boolean };
type Conta = { nome: string; situacao: string };

// Contas e grupos vêm das tabelas montadas a partir das telas de cadastro do site.
export function useCadastrosFinanceiros(categoria: Ref<CategoriaLancamento>) {
  const grupos = ref<OpcaoGrupo[]>([]);
  const contas = ref<OpcaoConta[]>([]);
  const erro = ref("");

  async function carregar() {
    erro.value = "";
    try {
      const [dadosGrupos, dadosContas] = await Promise.all([
        chamarApi<{ grupos: Grupo[] }>(`/financeiro/grupos?colecao=${categoria.value}`),
        chamarApi<{ contas: Conta[] }>("/contas")
      ]);
      const nomesDosPais = new Map(dadosGrupos.grupos.filter((g) => !g.paiId).map((g) => [g.itemId, g.nome]));
      grupos.value = dadosGrupos.grupos
        .filter((g) => g.ativo)
        .map((g) => ({ value: g.itemId, title: g.paiId ? `${nomesDosPais.get(g.paiId) ?? ""} › ${g.nome}` : g.nome }));
      contas.value = dadosContas.contas.filter((c) => c.situacao === "ATIVA").map((c) => ({ value: c.nome, title: c.nome }));
    } catch (e) {
      erro.value = e instanceof Error ? e.message : "Não foi possível carregar os cadastros.";
    }
  }

  watch(categoria, carregar, { immediate: true });
  return { grupos, contas, erro, carregar };
}
