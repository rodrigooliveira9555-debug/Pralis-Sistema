<script setup lang="ts">
// Valor em reais com dígitos tabulares, "R$" menor e sinal tipográfico (− U+2212) no negativo.
const props = defineProps<{ centavos: number; tamanho?: "total" | "destaque"; sinal?: boolean }>();

const partes = computed(() => {
  const numero = (Math.abs(props.centavos) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sinal = props.centavos < 0 ? "− " : props.sinal && props.centavos > 0 ? "+ " : "";
  return { sinal, numero };
});
</script>

<template>
  <span class="dinheiro" :class="tamanho && `dinheiro--${tamanho}`">{{ partes.sinal }}<small>R$</small>{{ partes.numero }}</span>
</template>
