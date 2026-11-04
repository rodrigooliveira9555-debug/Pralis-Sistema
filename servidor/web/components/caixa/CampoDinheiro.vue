<script setup lang="ts">
import { campoInvalido } from "~/utils/entrada";

// Dinheiro digitado no formato brasileiro (1.234,56). Fonte 16px para o iPhone não ampliar.
// O "obrigatório" só aparece depois que a pessoa passou pelo campo ou tentou avançar.
const props = defineProps<{ rotulo: string; obrigatorio?: boolean; mostrarErro?: boolean; dica?: string; desabilitado?: boolean }>();
const modelo = defineModel<string>({ required: true });
const tocado = ref(false);

const erro = computed(() => {
  if (campoInvalido(modelo.value, 2)) return "Use reais com até 2 casas, ex.: 1.234,56";
  if (props.obrigatorio && !modelo.value && (tocado.value || props.mostrarErro)) return "Obrigatório";
  return "";
});
</script>

<template>
  <v-text-field
    v-model="modelo"
    :label="obrigatorio ? `${rotulo} (obrigatório)` : rotulo"
    prefix="R$"
    placeholder="0,00"
    inputmode="decimal"
    autocomplete="off"
    class="campo-dinheiro"
    :hint="dica"
    :persistent-hint="Boolean(dica)"
    :disabled="desabilitado"
    :aria-required="obrigatorio ? 'true' : undefined"
    :error-messages="erro"
    @blur="tocado = true"
  />
</template>

<style scoped>
.campo-dinheiro :deep(input) {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
