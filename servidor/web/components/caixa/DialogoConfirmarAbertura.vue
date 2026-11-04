<script setup lang="ts">
import { MALOTE, MAQUININHAS } from "~/utils/caixa-casca";

// "Confirmar abertura do caixa": revisão do posto e do malote antes de iniciar as vendas.
const aberto = defineModel<boolean>({ required: true });
const emit = defineEmits<{ confirmado: [] }>();
const { estado, posto } = useCaixaCasca();
const abertura = computed(() => estado.value.abertura);
const maquininha = computed(() => MAQUININHAS.find((item) => item.value === abertura.value.maquininha)?.title ?? "—");
const contado = computed(() => (centavosDoTexto(abertura.value.dinheiroContado) ?? 0) + (centavosDoTexto(abertura.value.moedasContadas) ?? 0));
</script>

<template>
  <CaixaJanela v-model="aberto" titulo="Confirmar abertura do caixa" subtitulo="Revise o turno e o malote antes de iniciar as vendas.">
    <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
      A primeira venda já começa a contar neste turno.
    </v-alert>

    <dl class="revisao">
      <div><dt>PDV</dt><dd>{{ posto.pdv }}</dd></div>
      <div><dt>Turno</dt><dd>{{ posto.turno }}</dd></div>
      <div><dt>Lacre do malote</dt><dd>{{ abertura.lacre }}</dd></div>
      <div><dt>Maquininha</dt><dd>{{ maquininha }}</dd></div>
      <div><dt>Responsável do caixa</dt><dd>{{ abertura.responsavel }}</dd></div>
      <div><dt>Supervisor</dt><dd>{{ abertura.supervisor }}</dd></div>
    </dl>

    <div v-if="abertura.conferido" class="diferenca diferenca--bateu">
      <div>
        <strong>Composição confirmada da Tesouraria</strong>
        <p>Dinheiro <Dinheiro :centavos="MALOTE.dinheiro" /> · Moedas <Dinheiro :centavos="MALOTE.moedas" /></p>
      </div>
    </div>
    <div v-else class="diferenca diferenca--falta">
      <div>
        <strong>Contagem informada pelo Caixa</strong>
        <p>Total contado <Dinheiro :centavos="contado" /> para <Dinheiro :centavos="MALOTE.dinheiro + MALOTE.moedas" /> declarado.</p>
        <p v-if="abertura.motivo">Abertura com divergência. Motivo: {{ abertura.motivo }}</p>
      </div>
    </div>

    <template #acoes>
      <v-btn variant="outlined" color="primary" @click="aberto = false">Voltar e revisar</v-btn>
      <v-btn color="primary" @click="emit('confirmado')">Confirmar e abrir</v-btn>
    </template>
  </CaixaJanela>
</template>

<style scoped>
.revisao {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0 0 16px;
}

.revisao dt { color: var(--texto-suave); font-size: 11px; }
.revisao dd { margin: 0; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.diferenca strong { font-size: 13px; }

@media (max-width: 600px) {
  .revisao { grid-template-columns: minmax(0, 1fr); }
}
</style>
