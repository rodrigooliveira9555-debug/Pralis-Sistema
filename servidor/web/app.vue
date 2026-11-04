<script setup lang="ts">
import { useTheme } from "vuetify";

// Mesmo tema do site: a chave "cicluz-tema" ("luz"/"sombra") é a do botão Luz/Sombra do menu.
const tema = useTheme();
onMounted(() => {
  try {
    tema.global.name.value = localStorage.getItem("cicluz-tema") === "sombra" ? "cicluzSombra" : "cicluzLuz";
  } catch {
    // Sem acesso ao armazenamento: fica no tema claro.
  }
});
</script>

<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>
