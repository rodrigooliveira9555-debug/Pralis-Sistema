// Tema Luz/Sombra: a MESMA chave do botão do site ("cicluz-tema" = "luz" | "sombra").
export const CHAVE_TEMA = "cicluz-tema";

// color-scheme no <html>: controles nativos (rolagem, seletores) seguem o tema.
export function aplicarTema(nome: "cicluzLuz" | "cicluzSombra") {
  document.documentElement.style.colorScheme = nome === "cicluzSombra" ? "dark" : "light";
}
