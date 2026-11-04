<script setup lang="ts">
// Recorrência (D3 do principal): a série inteira nasce ao salvar, como lançamentos não pagos.
// "Repetir" é o TOTAL, contando este. Dia/semana/quinzena/mês param em 12 meses.
export type RecorrenciaForm = {
  frequencia: "dia" | "semana" | "quinzena" | "mes" | "trimestre" | "ano";
  repeticoes: number;
  diasSemana: number[];
};

const recorrencia = defineModel<RecorrenciaForm>({ required: true });

const FREQUENCIAS = [
  { title: "Todo dia", value: "dia" },
  { title: "Toda semana", value: "semana" },
  { title: "A cada 15 dias", value: "quinzena" },
  { title: "Todo mês", value: "mes" },
  { title: "A cada 3 meses", value: "trimestre" },
  { title: "Todo ano", value: "ano" }
];
const DIAS = [
  { rotulo: "Sg", nome: "Segunda", valor: 1 },
  { rotulo: "Te", nome: "Terça", valor: 2 },
  { rotulo: "Qa", nome: "Quarta", valor: 3 },
  { rotulo: "Qi", nome: "Quinta", valor: 4 },
  { rotulo: "Sx", nome: "Sexta", valor: 5 },
  { rotulo: "Sa", nome: "Sábado", valor: 6 }
];

function alternarDia(valor: number) {
  const dias = recorrencia.value.diasSemana;
  recorrencia.value.diasSemana = dias.includes(valor) ? dias.filter((d) => d !== valor) : [...dias, valor];
}
</script>

<template>
  <div class="recorrencia">
    <v-select v-model="recorrencia.frequencia" :items="FREQUENCIAS" label="Repetir" />
    <v-text-field v-model.number="recorrencia.repeticoes" type="number" min="1" max="366" label="Quantas vezes (com esta)" />
    <fieldset v-if="recorrencia.frequencia === 'semana'" class="dias">
      <legend>Dias da semana (vazio = o mesmo dia do vencimento)</legend>
      <button
        v-for="dia in DIAS"
        :key="dia.valor"
        type="button"
        class="dia"
        :aria-pressed="recorrencia.diasSemana.includes(dia.valor)"
        :aria-label="dia.nome"
        @click="alternarDia(dia.valor)"
      >
        {{ dia.rotulo }}
      </button>
    </fieldset>
    <p class="texto-suave nota">Séries diárias, semanais, quinzenais e mensais param em 12 meses.</p>
  </div>
</template>

<style scoped>
.recorrencia {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.dias {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;
  border: 0;
}

.dias legend {
  margin-bottom: 6px;
  font-size: 12px;
}

.dia {
  width: 42px;
  height: 42px;
  border: 1px solid var(--borda);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}

.dia[aria-pressed="true"] {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.dia:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.nota {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 11px;
}

@media (max-width: 600px) {
  .recorrencia { grid-template-columns: minmax(0, 1fr); }
}
</style>
