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

defineProps<{ grupos: OpcaoGrupo[]; totaisCentavos: number[]; linhaComErro: number | null }>();
const itens = defineModel<ItemForm[]>({ required: true });

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

function remover(indice: number) {
  itens.value.splice(indice, 1);
}
</script>

<template>
  <section class="itens" aria-label="Itens da discriminação">
    <div v-for="(item, indice) in itens" :key="indice" class="item" :class="{ 'com-erro': linhaComErro === indice + 1 }">
      <p class="item-numero">Linha {{ indice + 1 }}</p>
      <v-text-field v-model="item.descricao" label="Descrição" class="item-descricao" />
      <v-text-field v-model="item.quantidade" label="Qtd." inputmode="decimal" class="item-curto" />
      <v-text-field v-model="item.valorUnitario" label="V. unit. (R$)" inputmode="decimal" class="item-curto" />
      <div class="item-desconto">
        <v-select v-model="item.descontoTipo" :items="TIPOS" label="Desc. unit." clearable />
        <v-text-field v-model="item.descontoValor" label="Valor" inputmode="decimal" :disabled="!item.descontoTipo" />
      </div>
      <div class="item-desconto">
        <v-select v-model="item.descontoTotalTipo" :items="TIPOS" label="Desc. total" clearable />
        <v-text-field v-model="item.descontoTotalValor" label="Valor" inputmode="decimal" :disabled="!item.descontoTotalTipo" />
      </div>
      <v-autocomplete v-model="item.grupoId" :items="grupos" label="Grupo" clearable class="item-grupo" />
      <p class="item-total">{{ formatarCentavos(totaisCentavos[indice] ?? 0) }}</p>
      <button type="button" class="item-remover" :aria-label="`Remover linha ${indice + 1}`" @click="remover(indice)">
        <Trash2 :size="18" />
      </button>
    </div>
    <v-btn variant="outlined" color="primary" @click="adicionar"><Plus :size="18" class="mr-1" /> Adicionar item</v-btn>
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

.item-descricao { grid-column: span 6; }
.item-curto { grid-column: span 3; }
.item-desconto { grid-column: span 6; display: grid; grid-template-columns: 96px 1fr; gap: 8px; }
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

.item-remover:focus-visible {
  outline: 2px solid rgb(var(--v-theme-error));
  outline-offset: 2px;
}

@media (max-width: 700px) {
  .item-descricao,
  .item-desconto,
  .item-grupo { grid-column: 1 / -1; }
  .item-curto { grid-column: span 6; }
  .item-total { grid-column: span 9; text-align: left; }
  .item-remover { grid-column: span 3; }
}
</style>
