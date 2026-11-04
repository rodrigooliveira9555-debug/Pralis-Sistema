import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

// App do CICLUZ para as telas novas (igual ao web-vue do Sistema Pralis: Nuxt SPA + Vuetify + TS).
// Mora em /app/ no MESMO domínio do site: usa o mesmo cookie de sessão e a mesma tela de entrada
// (entrar.html). Em produção é gerado estático e servido pela API (ver docs/BACKEND.md).
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2026-06-23",
  app: {
    baseURL: "/app/",
    head: {
      title: "CICLUZ · Gestão de Padaria",
      htmlAttrs: { lang: "pt-BR" },
      meta: [
        { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" },
        { name: "robots", content: "noindex" }
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" }
      ]
    }
  },
  alias: {
    "@cicluz/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url))
  },
  modules: ["vuetify-nuxt-module"],
  css: ["~/assets/cicluz.css"],
  // Desenvolvimento: o app roda em :3100 e fala com a API em :4200 pelo mesmo caminho /api.
  nitro: {
    devProxy: {
      "/api": { target: "http://localhost:4200/api", changeOrigin: false }
    }
  },
  vuetify: {
    vuetifyOptions: {
      defaults: {
        VBtn: { rounded: "lg", variant: "flat" },
        VTextField: { variant: "outlined", density: "comfortable", rounded: "lg" },
        VSelect: { variant: "outlined", density: "comfortable", rounded: "lg" },
        VAutocomplete: { variant: "outlined", density: "comfortable", rounded: "lg" },
        VTextarea: { variant: "outlined", density: "comfortable", rounded: "lg" }
      },
      // Mesma linguagem do site: Luz/Sombra (chave "cicluz-tema" do localStorage, a mesma do menu
      // do site) e o roxo dos formulários como cor principal.
      theme: {
        defaultTheme: "cicluzLuz",
        themes: {
          cicluzLuz: {
            dark: false,
            colors: {
              background: "#f5f5f7",
              surface: "#ffffff",
              primary: "#7c3aed",
              error: "#c24141",
              success: "#15803d",
              warning: "#b45309"
            }
          },
          cicluzSombra: {
            dark: true,
            colors: {
              background: "#151419",
              surface: "#222128",
              primary: "#b197fc",
              error: "#f87171",
              success: "#4ade80",
              warning: "#fbbf24"
            }
          }
        }
      }
    }
  },
  typescript: { strict: true, typeCheck: false }
});
