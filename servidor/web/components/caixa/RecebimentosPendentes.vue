<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
import type { Recebimento } from "~/utils/caixa-casca";

// Dinheiro sem lacre enviado pela Gerência. Enquanto houver pendência, o caixa não fecha.
const { pendentes } = useCaixaCasca();
const recusando = ref<Recebimento | null>(null);
const janela = computed({ get: () => recusando.value !== null, set: (v) => { if (!v) recusando.value = null; } });
const aviso = ref("");

function confirmar(item: Recebimento) {
  item.situacao = "confirmado";
  aviso.value = "Recebimento confirmado. O valor entrou no caixa.";
}

function recusar() {
  if (recusando.value) recusando.value.situacao = "recusado";
  recusando.value = null;
  aviso.value = "Recusa registrada. A Gerência foi avisada.";
}
</script>

<template>
  <section v-if="pendentes.length" class="recebimentos" aria-labelledby="titulo-recebimentos">
    <h2 id="titulo-recebimentos" class="titulo-secao"><Inbox :size="16" aria-hidden="true" /> Recebimentos pendentes</h2>
    <ul class="lista-caixa">
      <li v-for="item in pendentes" :key="item.id" class="linha-caixa recebimento">
        <span class="texto">
          <strong><Dinheiro :centavos="item.valor" /></strong>
          <small>Dinheiro <Dinheiro :centavos="item.dinheiro" /> · Moedas <Dinheiro :centavos="item.moedas" /></small>
          <small>De {{ item.de }} · enviado por {{ item.enviadoPor }} · {{ item.quando }}</small>
        </span>
        <span class="botoes">
          <v-btn variant="outlined" color="error" size="small" @click="recusando = item">Não recebi</v-btn>
          <v-btn color="primary" size="small" @click="confirmar(item)">Confirmar recebimento</v-btn>
        </span>
      </li>
    </ul>
  </section>
  <p class="visualmente-oculto" role="status">{{ aviso }}</p>

  <CaixaJanela v-model="janela" :titulo="`Não recebeu ${recusando ? formatarCentavos(recusando.valor) : ''}?`" subtitulo="A Gerência será avisada para conferir o envio.">
    <p class="texto-janela">Use só se o dinheiro não chegou ao PDV. O valor não entra no seu caixa.</p>
    <template #acoes>
      <v-btn variant="outlined" color="primary" @click="janela = false">Voltar</v-btn>
      <v-btn color="error" @click="recusar">Não recebi</v-btn>
    </template>
  </CaixaJanela>
</template>

<style scoped>
.recebimentos { margin-bottom: 16px; }
.titulo-secao { display: flex; align-items: center; gap: 6px; margin-top: 0; }
.recebimento { flex-wrap: wrap; border-color: var(--cor-origem-texto); }
.botoes { display: flex; flex-wrap: wrap; gap: 8px; }
.texto-janela { margin: 0; font-size: 13px; }
</style>
