<script setup lang="ts">
import { CATEGORIAS_LANCAMENTO, type CategoriaLancamento, type LancamentoResposta } from "@cicluz/shared";
import { CATEGORIAS } from "~/utils/formato";

// Edição de um lançamento (tela própria, sem janela): carrega o registro e abre o mesmo formulário.
const route = useRoute();
const categoria = String(route.params["categoria"]) as CategoriaLancamento;
const id = String(route.params["id"]);
if (!(CATEGORIAS_LANCAMENTO as readonly string[]).includes(categoria)) {
  throw createError({ statusCode: 404, statusMessage: "Tela não encontrada" });
}
useHead({ title: `Editar ${CATEGORIAS[categoria].singular} · CICLUZ` });

const lancamento = ref<LancamentoResposta | null>(null);
const erro = ref("");

onMounted(async () => {
  try {
    lancamento.value = await chamarApi<LancamentoResposta>(`/lancamentos/item/${id}`);
  } catch (e) {
    erro.value = e instanceof Error ? e.message : "Não foi possível abrir.";
  }
});
</script>

<template>
  <FormularioLancamentoTela v-if="lancamento" :key="lancamento.id" :categoria="categoria" :lancamento="lancamento" />
  <div v-else class="tela">
    <section class="tela-conteudo">
      <v-alert v-if="erro" type="error" variant="tonal" class="mb-3">{{ erro }}</v-alert>
      <p v-else class="texto-suave" role="status">Abrindo o lançamento…</p>
      <v-btn variant="outlined" color="primary" :to="`/lancamentos/${categoria}`">Voltar para a lista</v-btn>
    </section>
  </div>
</template>
