<script setup lang="ts">
import { Power } from "lucide-vue-next";
import { MOTIVOS_PARADA } from "~/utils/caixa-casca";

// PDV LIGADO / DESLIGADO: registrar a parada do computador do PDV e a volta.
const { estado } = useCaixaCasca();
const janela = ref(false);
const motivos = ref<string[]>([]);
const outro = ref("");
const tentou = ref(false);

const ultimaParada = computed(() => estado.value.paradas.at(-1));
const erro = computed(() => {
  if (!motivos.value.length) return "Marque pelo menos um motivo.";
  if (motivos.value.includes("Outro") && !outro.value.trim()) return "Descreva o outro motivo.";
  return "";
});

function abrir() {
  motivos.value = [];
  outro.value = "";
  tentou.value = false;
  janela.value = true;
}

function registrar() {
  tentou.value = true;
  if (erro.value) return;
  estado.value.paradas.push({ motivos: [...motivos.value], outro: outro.value.trim(), inicio: horaAgora(), fim: null });
  estado.value.pdvLigado = false;
  janela.value = false;
}

function voltou() {
  const parada = ultimaParada.value;
  if (parada) parada.fim = horaAgora();
  estado.value.pdvLigado = true;
}
</script>

<template>
  <div class="pdv-faixa" :class="{ desligado: !estado.pdvLigado }">
    <span class="pdv-ponto" aria-hidden="true" />
    <span class="pdv-texto">
      <strong>{{ estado.pdvLigado ? "PDV LIGADO" : "PDV DESLIGADO" }}</strong>
      <small v-if="!estado.pdvLigado && ultimaParada">
        Desde {{ ultimaParada.inicio }} · {{ ultimaParada.motivos.filter((m) => m !== "Outro").concat(ultimaParada.outro || []).join(", ") }}
      </small>
    </span>
    <v-btn v-if="estado.pdvLigado" variant="text" size="small" color="primary" @click="abrir">
      <Power :size="16" class="mr-1" aria-hidden="true" /> Registrar parada
    </v-btn>
    <v-btn v-else size="small" color="primary" @click="voltou">Computador voltou</v-btn>
  </div>

  <CaixaJanela v-model="janela" titulo="PDV desligou?" subtitulo="Marque o que aconteceu. A parada fica no relatório do turno.">
    <fieldset class="motivos">
      <legend class="visualmente-oculto">Motivos da parada</legend>
      <v-checkbox v-for="motivo in MOTIVOS_PARADA" :key="motivo" v-model="motivos" :value="motivo" :label="motivo" hide-details density="compact" />
    </fieldset>
    <v-text-field v-if="motivos.includes('Outro')" v-model="outro" label="Descreva o outro motivo" class="mt-2" />
    <p v-if="tentou && erro" class="erro-texto" role="alert">{{ erro }}</p>
    <template #acoes>
      <v-btn variant="outlined" color="primary" @click="janela = false">Cancelar</v-btn>
      <v-btn color="primary" @click="registrar">Registrar parada</v-btn>
    </template>
  </CaixaJanela>
</template>

<style scoped>
.pdv-faixa {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  margin-bottom: 16px;
  padding: 6px 8px 6px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bateu) var(--mistura-estado), transparent);
}

.pdv-faixa.desligado { background: color-mix(in srgb, var(--navigation-ink) 18%, transparent); }
.pdv-ponto { width: 10px; height: 10px; flex: none; border-radius: 50%; background: var(--bateu); }
.desligado .pdv-ponto { background: var(--navigation-ink); }
.pdv-texto { display: grid; flex: 1; min-width: 0; line-height: 1.3; }
.pdv-texto strong { font-size: 12px; letter-spacing: 0.04em; }
.pdv-texto small { color: var(--texto-suave); font-size: 11px; }
.motivos { margin: 0; padding: 0; border: 0; }
.erro-texto { margin: 8px 0 0; color: rgb(var(--v-theme-error)); font-size: 12px; }
</style>
