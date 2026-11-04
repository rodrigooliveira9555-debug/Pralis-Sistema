<script setup lang="ts">
import { Check, X } from "lucide-vue-next";
import { MALOTE } from "~/utils/caixa-casca";

// Bloco 2 da abertura: lacre do malote recebido da Tesouraria → composição declarada → o operador
// diz se confere. Se não confere, conta dinheiro e moedas e explica a diferença.
defineProps<{ mostrarErros: boolean }>();
const { estado } = useCaixaCasca();
const abertura = computed(() => estado.value.abertura);

const consultando = ref(false);
const encontrado = ref(abertura.value.lacre === MALOTE.lacre);
let espera: ReturnType<typeof setTimeout> | undefined;

// Simula a consulta do lacre (na casca, só o 001 existe).
watch(() => abertura.value.lacre, (lacre) => {
  clearTimeout(espera);
  encontrado.value = false;
  abertura.value.conferido = null;
  if (!lacre.trim()) return;
  consultando.value = true;
  espera = setTimeout(() => {
    consultando.value = false;
    encontrado.value = lacre.trim() === MALOTE.lacre;
  }, 500);
});
onBeforeUnmount(() => clearTimeout(espera));

const declarado = MALOTE.dinheiro + MALOTE.moedas;
const contado = computed(() => {
  const dinheiro = centavosDoTexto(abertura.value.dinheiroContado);
  const moedas = centavosDoTexto(abertura.value.moedasContadas);
  return dinheiro === null || moedas === null ? null : dinheiro + moedas;
});
const divergencia = computed(() => (contado.value === null ? null : contado.value - declarado));

const erroLacre = computed(() => {
  if (consultando.value) return "";
  if (abertura.value.lacre.trim() && !encontrado.value) return "Lacre não encontrado. Confira o número no malote.";
  return "";
});
</script>

<template>
  <div class="grade-2">
    <v-text-field
      v-model="abertura.lacre"
      label="Lacre do malote de abertura"
      aria-required="true"
      placeholder="Ex.: 001"
      autocomplete="off"
      hint="Use o lacre do malote recebido da Tesouraria. Ele é diferente do lacre de fechamento. (Na demonstração: 001.)"
      persistent-hint
      :error-messages="erroLacre || (mostrarErros && !abertura.lacre ? 'Obrigatório' : '')"
      :loading="consultando"
    />
  </div>

  <p v-if="consultando" class="texto-suave mt-3" role="status">Consultando a composição declarada do malote…</p>

  <template v-if="encontrado">
    <dl class="malote">
      <div><dt>Malote declarado</dt><dd><Dinheiro :centavos="declarado" tamanho="total" /></dd></div>
      <div><dt>Dinheiro</dt><dd><Dinheiro :centavos="MALOTE.dinheiro" /></dd></div>
      <div><dt>Moedas</dt><dd><Dinheiro :centavos="MALOTE.moedas" /></dd></div>
      <div><dt>Lacres para sangria</dt><dd>{{ MALOTE.lacresSangria.join(" · ") }}</dd></div>
      <div><dt>Lacre reservado para fechar este caixa</dt><dd>{{ MALOTE.lacreFechamento }}</dd></div>
    </dl>

    <fieldset class="conferencia">
      <legend>Conferência do malote</legend>
      <p>O valor e a composição conferem com o que foi recebido?</p>
      <div class="escolha" role="group" aria-label="O malote confere?">
        <v-btn
          :variant="abertura.conferido === true ? 'flat' : 'outlined'"
          color="primary"
          :aria-pressed="abertura.conferido === true"
          @click="abertura.conferido = true"
        >
          <Check :size="18" class="mr-1" aria-hidden="true" /> Sim, confere
        </v-btn>
        <v-btn
          :variant="abertura.conferido === false ? 'flat' : 'outlined'"
          color="error"
          :aria-pressed="abertura.conferido === false"
          @click="abertura.conferido = false"
        >
          <X :size="18" class="mr-1" aria-hidden="true" /> Não confere
        </v-btn>
      </div>
      <p v-if="mostrarErros && abertura.conferido === null" class="erro-texto" role="alert">Responda se o malote confere.</p>

      <div v-if="abertura.conferido === false" class="grade-2 mt-4">
        <CampoDinheiro v-model="abertura.dinheiroContado" rotulo="Dinheiro físico contado" obrigatorio :mostrar-erro="mostrarErros" />
        <CampoDinheiro v-model="abertura.moedasContadas" rotulo="Moedas contadas" obrigatorio :mostrar-erro="mostrarErros" />
        <p v-if="divergencia" class="diferenca-linha" :class="divergencia < 0 ? 'texto-falta' : 'texto-sobra'" role="status">
          {{ divergencia < 0 ? "Falta" : "Sobra" }} de <Dinheiro :centavos="Math.abs(divergencia)" /> em relação ao declarado.
        </p>
        <v-textarea
          v-if="divergencia"
          v-model="abertura.motivo"
          label="Motivo da divergência (obrigatório)"
          rows="2"
          auto-grow
          class="largo"
          :error-messages="mostrarErros && !abertura.motivo.trim() ? 'Obrigatório' : ''"
        />
      </div>
    </fieldset>
  </template>
</template>

<style scoped>
.malote {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px 16px;
  margin: 16px 0;
}

.malote dt { color: var(--texto-suave); font-size: 11px; }
.malote dd { margin: 2px 0 0; font-size: 14px; font-weight: 600; }

.conferencia {
  margin: 0;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--borda) 55%, transparent);
  border-radius: 10px;
}

.conferencia legend { padding: 0 6px; font-size: 12px; font-weight: 600; }
.conferencia > p { margin: 0 0 10px; font-size: 13px; }
.escolha { display: flex; flex-wrap: wrap; gap: 8px; }
.erro-texto { margin: 8px 0 0; color: rgb(var(--v-theme-error)); font-size: 12px; }
.largo, .diferenca-linha { grid-column: 1 / -1; }
.diferenca-linha { margin: 0 0 12px; font-size: 13px; font-weight: 600; }
</style>
