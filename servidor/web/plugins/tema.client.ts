import { aplicarTema, CHAVE_TEMA } from "~/utils/tema";

// Aplica o tema salvo assim que o Vuetify fica pronto, antes de a primeira tela pintar.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("vuetify:ready", (vuetify) => {
    let sombra = false;
    try {
      sombra = localStorage.getItem(CHAVE_TEMA) === "sombra";
    } catch {
      // Sem acesso ao armazenamento: fica no tema claro.
    }
    const nome = sombra ? "cicluzSombra" : "cicluzLuz";
    vuetify.theme.global.name.value = nome;
    aplicarTema(nome);
  });
});
