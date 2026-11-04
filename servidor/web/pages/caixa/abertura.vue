<script setup lang="ts">
import { Store } from "lucide-vue-next";
import { MALOTE, MAQUININHAS, RESPONSAVEIS, SUPERVISORES } from "~/utils/caixa-casca";

// Abertura do caixa (casca): três blocos como no sistema principal. A abertura só é confirmada
// depois da conferência do malote. Erros aparecem depois da primeira tentativa.
useHead({ title: "Abrir caixa · CICLUZ" });
const { estado, posto, abrirCaixa } = useCaixaCasca();
if (estado.value.perfil !== "operador" || estado.value.status !== "fechado") await navigateTo("/caixa", { replace: true });

const abertura = computed(() => estado.value.abertura);
const tentou = ref(false);
const confirmar = ref(false);

const bloqueios = computed(() => {
  const a = abertura.value;
  const lista: string[] = [];
  if (a.lacre.trim() !== MALOTE.lacre) lista.push("Informe o lacre do malote de abertura.");
  else if (a.conferido === null) lista.push("Confira o malote.");
  else if (a.conferido === false) {
    const dinheiro = centavosDoTexto(a.dinheiroContado);
    const moedas = centavosDoTexto(a.moedasContadas);
    if (dinheiro === null || moedas === null) lista.push("Informe o dinheiro e as moedas contados.");
    else if (dinheiro + moedas !== MALOTE.dinheiro + MALOTE.moedas && !a.motivo.trim()) lista.push("Explique o motivo da divergência.");
  }
  if (!a.responsavel) lista.push("Escolha o responsável pelo caixa.");
  if (!a.supervisor) lista.push("Escolha o supervisor responsável.");
  if (!a.maquininha) lista.push("Escolha a maquininha de cartão.");
  return lista;
});

const passo = computed(() => (abertura.value.lacre.trim() !== MALOTE.lacre || abertura.value.conferido === null ? 2 : 3));

function tentarAbrir() {
  tentou.value = true;
  if (!bloqueios.value.length) confirmar.value = true;
}

async function confirmarAbertura() {
  abrirCaixa();
  confirmar.value = false;
  await navigateTo("/caixa/turno?aberto=1");
}
</script>

<template>
  <CaixaTela titulo="Abrir caixa" :caminho="`Caixa / Início do turno · ${posto.pdv} · ${posto.turno}`" :icone="Store">
    <p class="intro">Preencha os três blocos abaixo. A abertura só é confirmada depois da conferência do malote.</p>

    <section class="bloco" aria-labelledby="bloco-posto">
      <div class="bloco-topo">
        <span class="bloco-num feito" aria-hidden="true">1</span>
        <div><h2 id="bloco-posto">Onde você vai operar</h2><p>O posto do caixa deste login.</p></div>
      </div>
      <div class="grade-2">
        <v-text-field :model-value="posto.pdv" label="Ponto de venda vinculado" readonly hint="Travado pelo login do posto." persistent-hint />
        <v-text-field :model-value="posto.turno" label="Turno do caixa" readonly />
      </div>
    </section>

    <section class="bloco" aria-labelledby="bloco-malote">
      <div class="bloco-topo">
        <span class="bloco-num" :class="passo > 2 ? 'feito' : 'ativo'" aria-hidden="true">2</span>
        <div><h2 id="bloco-malote">Conferir malote de abertura</h2><p>{{ MALOTE.rota }}</p></div>
      </div>
      <AberturaMalote :mostrar-erros="tentou" />
    </section>

    <section class="bloco" aria-labelledby="bloco-responsaveis">
      <div class="bloco-topo">
        <span class="bloco-num" :class="passo === 3 ? 'ativo' : ''" aria-hidden="true">3</span>
        <div><h2 id="bloco-responsaveis">Responsáveis e terminal</h2><p>Quem responde pelo caixa e qual maquininha vai usar.</p></div>
      </div>
      <div class="grade-2">
        <v-select v-model="abertura.responsavel" :items="RESPONSAVEIS" label="Responsável pelo caixa (obrigatório)" :error-messages="tentou && !abertura.responsavel ? 'Obrigatório' : ''" />
        <v-select v-model="abertura.supervisor" :items="SUPERVISORES" label="Supervisor responsável (obrigatório)" :error-messages="tentou && !abertura.supervisor ? 'Obrigatório' : ''" />
        <v-select
          v-model="abertura.maquininha"
          :items="MAQUININHAS"
          label="Maquininha de cartão (obrigatório)"
          hint="Obrigatória para o relatório final deste turno."
          persistent-hint
          :error-messages="tentou && !abertura.maquininha ? 'Obrigatório' : ''"
        />
        <v-text-field :model-value="posto.usuario" label="Usuário logado" readonly />
      </div>
    </section>

    <div v-if="tentou && bloqueios.length" class="pendencias" role="alert">
      <strong>Antes de abrir:</strong>
      <ul><li v-for="item in bloqueios" :key="item">{{ item }}</li></ul>
    </div>

    <template #rodape-info>
      <p class="rodape-aviso texto-suave">Abra somente quando estiver no PDV.</p>
    </template>
    <template #rodape>
      <v-btn color="primary" @click="tentarAbrir">Conferir e abrir caixa</v-btn>
    </template>

    <DialogoConfirmarAbertura v-model="confirmar" @confirmado="confirmarAbertura" />
  </CaixaTela>
</template>

<style scoped>
.intro { margin: 0 0 14px; font-size: 13px; }
.pendencias { padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, var(--falta) var(--mistura-estado), transparent); font-size: 13px; }
.pendencias ul { margin: 6px 0 0; padding-left: 18px; }
.rodape-aviso { margin: 0; font-size: 11px; line-height: 14px; }

@media (max-width: 600px) {
  .rodape-aviso { display: none; }
}
</style>
