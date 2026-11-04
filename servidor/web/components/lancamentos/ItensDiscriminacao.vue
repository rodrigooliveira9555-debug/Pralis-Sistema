<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import type { OpcaoGrupo } from "~/composables/useCadastrosFinanceiros";
import { formatarCentavos } from "~/utils/formato";

// Discriminação dos itens (só Despesas e Mercadorias). Os totais por linha vêm do cálculo
// compartilhado com o servidor (calcularDiscriminacao), passado pelo formulário.
export type ItemForm = {
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  descontoTipo: "percentual" | "valor" | null;
  descontoValor: string;
  descontoTotalTipo: "percentual" | "valor" | null;
  descontoTotalValor: string;
  grupoId: string | null;
};

defineProps<{ grupos: OpcaoGrupo[]; totaisCentavos: number[]; linhaComErro: number | null; erros: Record<string, string> }>();
const itens = defineModel<ItemForm[]>({ required: true });
const botaoAdicionar = ref<{ $el: HTMLElement } | null>(null);
const raiz = ref<HTMLElement | null>(null);

const TIPOS = [
  { title: "R$", value: "valor" },
  { title: "%", value: "percentual" }
];

function adicionar() {
  itens.value.push({
    descricao: "",
    quantidade: "1",
    valorUnitario: "",
    descontoTipo: null,
    descontoValor: "",
    descontoTotalTipo: null,
    descontoTotalValor: "",
    grupoId: null
  });
}

// Depois de remover, o foco vai para a linha anterior (ou para "Adicionar item"), nunca se perde.
async function remover(indice: number) {
  itens.value.splice(indice, 1);
  await nextTick();
  const alvo = raiz.value?.querySelectorAll<HTMLElement>(".item-remover")[Math.max(0, indice - 1)];
  (alvo ?? botaoAdicionar.value?.$el)?.focus();
}
</script>

<template>
  <section ref="raiz" class="itens" aria-label="Itens da discriminação">
    <div
      v-for="(item, indice) in itens"
      :key="indice"
      class="item"
      :class="{ 'com-erro': linhaComErro === indice + 1 }"
      role="group"
      :aria-labelledby="`linha-${indice}`"
    >
      <p :id="`linha-${indice}`" class="item-numero">
        Linha {{ indice + 1 }}<template v-if="linhaComErro === indice + 1"> · provável erro</template>
      </p>
      <v-text-field v-model="item.descricao" label="Descrição" class="item-descricao" />
      <v-text-field v-model="item.quantidade" label="Qtd." inputmode="decimal" class="item-curto" :error-messages="erros[`quantidade-${indice}`]" />
      <v-text-field
        v-model="item.valorUnitario"
        label="V. unit. (R$)"
        inputmode="decimal"
        class="item-curto"
        :error="linhaComErro === indice + 1"
        :error-messages="item.valorUnitario ? erros[`valorUnitario-${indice}`] : ''"
      />
      <div class="item-desconto">
        <v-select v-model="item.descontoTipo" :items="TIPOS" label="Tipo do desc. unit." clearable />
        <v-text-field
          v-model="item.descontoValor"
          label="Valor do desc. unit."
          inputmode="decimal"
          :disabled="!item.descontoTipo"
          :error-messages="erros[`descontoValor-${indice}`]"
        />
      </div>
      <div class="item-desconto">
        <v-select v-model="item.descontoTotalTipo" :items="TIPOS" label="Tipo do desc. total" clearable />
        <v-text-field
          v-model="item.descontoTotalValor"
          label="Valor do desc. total"
          inputmode="decimal"
          :disabled="!item.descontoTotalTipo"
          :error-messages="erros[`descontoTotalValor-${indice}`]"
        />
      </div>
      <v-autocomplete v-model="item.grupoId" :items="grupos" label="Grupo" clearable class="item-grupo" />
      <p class="item-total"><span class="visualmente-oculto">Total da linha: </span>{{ formatarCentavos(totaisCentavos[indice] ?? 0) }}</p>
      <button type="button" class="item-remover" :aria-label="`Remover linha ${indice + 1}`" @click="remover(indice)">
        <Trash2 :size="18" />
      </button>
    </div>
    <v-btn ref="botaoAdicionar" variant="outlined" color="primary" @click="adicionar"><Plus :size="18" class="mr-1" /> Adicionar item</v-btn>
  </section>
</template>

<style scoped>
.itens {
  display: grid;
  gap: 10px;
}

.item {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0 8px;
  align-items: start;
  padding: 10px 10px 0;
  border: 1px solid var(--borda);
  border-radius: 8px;
}

.item.com-erro {
  border-color: rgb(var(--v-theme-error));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-error));
}

.item-numero {
  grid-column: 1 / -1;
  margin: 0 0 6px;
  color: var(--texto-suave);
  font-size: 11px;
  font-weight: 600;
}

.com-erro .item-numero { color: rgb(var(--v-theme-error)); }

.item-descricao { grid-column: span 6; }
.item-curto { grid-column: span 3; }
.item-desconto { grid-column: span 6; display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 8px; }
.item-grupo { grid-column: span 8; }

.item-total {
  grid-column: span 3;
  margin: 12px 0 0;
  font-weight: 600;
  text-align: right;
}

.item-remover {
  grid-column: span 1;
  justify-self: end;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--borda);
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--v-theme-error));
  cursor: pointer;
}

@media (max-width: 700px) {
  .item-descricao,
  .item-desconto,
  .item-grupo { grid-column: 1 / -1; }
  .item-desconto { grid-template-columns: 110px minmax(0, 1fr); }
  .item-curto { grid-column: span 6; }
  .item-total { grid-column: span 9; text-align: left; }
  .item-remover { grid-column: span 3; }
}
</style>
