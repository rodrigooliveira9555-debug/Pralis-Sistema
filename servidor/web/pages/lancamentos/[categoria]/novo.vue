<script setup lang="ts">
import { CATEGORIAS_LANCAMENTO, type CategoriaLancamento } from "@cicluz/shared";
import { CATEGORIAS } from "~/utils/formato";

// Formulário de uma nova Despesa, Mercadoria ou Retirada (tela própria, sem janela).
const route = useRoute();
const categoria = String(route.params["categoria"]) as CategoriaLancamento;
if (!(CATEGORIAS_LANCAMENTO as readonly string[]).includes(categoria)) {
  throw createError({ statusCode: 404, statusMessage: "Tela não encontrada" });
}
useHead({ title: `Nova ${CATEGORIAS[categoria].singular} · CICLUZ` });
</script>

<template>
  <FormularioLancamentoTela :categoria="categoria" :lancamento="null" />
</template>
