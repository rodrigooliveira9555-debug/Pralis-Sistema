import { useTheme } from "vuetify";
import { estiloDaOrigem, type Origem } from "~/utils/cores";

// Estilo da cor de origem que acompanha o tema Luz/Sombra.
export function useEstiloOrigem(origem: MaybeRefOrGetter<Origem>) {
  const tema = useTheme();
  return computed(() => estiloDaOrigem(toValue(origem), tema.global.current.value.dark));
}
