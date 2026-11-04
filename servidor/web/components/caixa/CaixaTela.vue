<script setup lang="ts">
import { Check, CheckCheck, Circle, CircleDashed, Lock, RotateCcw, TriangleAlert } from "lucide-vue-next";
import type { Component } from "vue";
import { PERFIS, type PerfilCasca } from "~/utils/caixa-casca";

// Moldura das telas do Caixa: cabeçalho no tom forte de Vendas com o selo de estado (o cabeçalho
// nunca muda de cor), aviso da casca, trilha do turno (faixa da marca + 4 marcos), conteúdo e
// rodapé fixo com o símbolo à esquerda e as ações da tela à direita.
defineProps<{ titulo: string; caminho: string; icone: Component; semTrilha?: boolean }>();

const estilo = useEstiloOrigem("vendas");
const { estado, diferenca, reiniciar } = useCaixaCasca();

const MARCOS = ["Abertura", "Turno", "Fechamento", "Tesouraria"];
const marcoAtual = computed(() => ({ fechado: 0, aberto: 1, em_fechamento: 2, encerrado: 3 })[estado.value.status]);

const selo = computed(() => {
  const status = estado.value.status;
  if (status === "encerrado" && diferenca.value) return { texto: "Fechado com divergência", icone: TriangleAlert };
  if (status === "encerrado") return { texto: "Fechado", icone: CheckCheck };
  if (status === "em_fechamento") return { texto: "Em fechamento", icone: Lock };
  if (status === "aberto") return { texto: "Aberto", icone: Circle };
  return { texto: "Aguardando abertura", icone: CircleDashed };
});

// Trocar o perfil da demonstração leva à entrada do Caixa, que escolhe a tela daquele perfil.
function trocarPerfil(perfil: PerfilCasca) {
  estado.value.perfil = perfil;
  navigateTo("/caixa");
}

function reiniciarCasca() {
  reiniciar();
  navigateTo("/caixa");
}
</script>

<template>
  <div class="tela" :style="estilo">
    <header class="tela-topo">
      <component :is="icone" class="icone-tela" aria-hidden="true" />
      <div class="topo-texto">
        <h1>{{ titulo }}</h1>
        <p>{{ caminho }}</p>
      </div>
      <span class="caixa-selo" role="status">
        <component :is="selo.icone" :size="14" aria-hidden="true" :fill="selo.icone === Circle ? 'currentColor' : 'none'" />
        {{ selo.texto }}
      </span>
    </header>

    <section class="tela-conteudo">
      <nav v-if="!semTrilha" class="caixa-trilha" aria-label="Etapas do turno">
        <span class="caixa-trilha-faixa" aria-hidden="true" />
        <ol>
          <li
            v-for="(marco, indice) in MARCOS"
            :key="marco"
            :class="indice < marcoAtual ? 'feito' : indice === marcoAtual ? 'atual' : 'futuro'"
            :aria-current="indice === marcoAtual ? 'step' : undefined"
          >
            <span class="caixa-trilha-marca" aria-hidden="true">
              <Check v-if="indice < marcoAtual" :size="12" />
              <span v-else-if="indice === marcoAtual" class="caixa-trilha-ponto" />
            </span>
            <span>{{ marco }}<span v-if="indice < marcoAtual" class="visualmente-oculto"> (concluída)</span></span>
          </li>
        </ol>
      </nav>

      <div class="casca-aviso">
        <p><strong>Casca de demonstração.</strong> Dados fictícios: nada é gravado e tudo some ao recarregar.</p>
        <v-select
          :model-value="estado.perfil"
          :items="PERFIS"
          label="Ver como"
          hide-details
          density="compact"
          class="casca-perfil"
          @update:model-value="trocarPerfil"
        />
        <v-btn variant="text" color="primary" size="small" @click="reiniciarCasca">
          <RotateCcw :size="16" class="mr-1" aria-hidden="true" /> Reiniciar
        </v-btn>
      </div>

      <slot />
    </section>

    <footer class="tela-rodape">
      <img src="/marca/simbolo.png" alt="" width="32" height="29" />
      <slot name="rodape-info" />
      <div class="acoes">
        <slot name="rodape" />
      </div>
    </footer>
  </div>
</template>

<style scoped>
.topo-texto { min-width: 0; }
.topo-texto p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 600px) {
  .caixa-selo { padding: 4px 8px; }
}
</style>
