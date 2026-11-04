import type { PerfilSessao } from "@cicluz/shared";

// Default-deny no cliente, como no web-vue do principal: toda rota do app exige sessão. Sem
// sessão, vai para a tela de entrada do site (a única), que volta para cá depois.
export default defineNuxtRouteMiddleware(async () => {
  const sessao = useSessao();
  if (sessao.value) return;
  try {
    const dados = await chamarApi<{ perfil: PerfilSessao }>("/sessao");
    sessao.value = dados.perfil;
  } catch (erro) {
    // 401 já redirecionou em chamarApi; outro erro (API fora) deixa a página mostrar o aviso.
    if (erro instanceof ErroApi && erro.status === 401) return abortNavigation();
  }
});
