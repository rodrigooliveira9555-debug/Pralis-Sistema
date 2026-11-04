<script setup lang="ts">
// Entrada do Caixa (casca): leva cada perfil à tela certa. Operador segue o ciclo do próprio posto;
// Gerência e Tesouraria não abrem caixa e vão para o acompanhamento.
const { estado } = useCaixaCasca();

const destino =
  estado.value.perfil !== "operador"
    ? "/caixa/acompanhamento"
    : { fechado: "/caixa/abertura", aberto: "/caixa/turno", em_fechamento: "/caixa/fechamento", encerrado: "/caixa/encerrado" }[estado.value.status];

await navigateTo(destino, { replace: true });
</script>

<template>
  <div />
</template>
