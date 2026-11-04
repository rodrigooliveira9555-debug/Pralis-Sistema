<script setup lang="ts">
import { dataParaIso, isoParaTela, mascararData } from "~/utils/entrada";

// Data no padrão do site: digitação DD/MM/AA, sem ícone de calendário; o valor do modelo é ISO.
const props = defineProps<{ rotulo: string; obrigatorio?: boolean; desabilitado?: boolean }>();
const modelo = defineModel<string | null>({ required: true });

const texto = ref(isoParaTela(modelo.value));
watch(modelo, (iso) => {
  if (iso !== dataParaIso(texto.value)) texto.value = isoParaTela(iso);
});

const erro = computed(() => {
  if (!texto.value) return props.obrigatorio ? "Obrigatório" : "";
  return texto.value.length === 8 && dataParaIso(texto.value) ? "" : "Use DD/MM/AA com uma data que existe";
});

function aoDigitar(valor: string) {
  texto.value = mascararData(valor);
  modelo.value = texto.value ? dataParaIso(texto.value) : null;
}
</script>

<template>
  <v-text-field
    :model-value="texto"
    :label="rotulo"
    placeholder="DD/MM/AA"
    inputmode="numeric"
    maxlength="8"
    autocomplete="off"
    :disabled="desabilitado"
    :error-messages="texto || obrigatorio ? erro : ''"
    @update:model-value="aoDigitar"
  />
</template>
