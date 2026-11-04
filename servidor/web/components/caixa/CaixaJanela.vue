<script setup lang="ts">
import { X } from "lucide-vue-next";

// Janela do Caixa no padrão do site: três retângulos (cabeçalho na cor de origem, conteúdo e
// rodapé com o símbolo à esquerda e as ações à direita). Devolve o foco a quem abriu.
const props = defineProps<{ titulo: string; subtitulo?: string; largura?: number; persistente?: boolean }>();
const aberto = defineModel<boolean>({ required: true });
const estilo = useEstiloOrigem("vendas");

let quemAbriu: HTMLElement | null = null;
watch(aberto, (valor) => {
  if (valor) quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
});
</script>

<template>
  <v-dialog
    v-model="aberto"
    :max-width="props.largura ?? 560"
    :persistent="persistente"
    scrollable
    :aria-label="titulo"
    @after-leave="quemAbriu?.focus()"
  >
    <div class="janela" :style="estilo">
      <header class="tela-topo">
        <div class="janela-titulo">
          <h2>{{ titulo }}</h2>
          <p v-if="subtitulo">{{ subtitulo }}</p>
        </div>
        <button type="button" class="janela-fechar" aria-label="Fechar" @click="aberto = false"><X :size="20" /></button>
      </header>
      <section class="tela-conteudo janela-corpo">
        <slot />
      </section>
      <footer class="tela-rodape janela-rodape">
        <img src="/marca/simbolo.png" alt="" width="32" height="29" />
        <div class="acoes">
          <slot name="acoes" />
        </div>
      </footer>
    </div>
  </v-dialog>
</template>

<style scoped>
.janela {
  display: flex;
  flex-direction: column;
  gap: var(--respiro);
  max-height: calc(100dvh - 48px);
}

.janela-corpo { overflow-y: auto; }
.janela-titulo { flex: 1; min-width: 0; }
.janela-titulo p { margin: 0; }

.janela-fechar {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.janela-rodape { position: static; }
</style>
