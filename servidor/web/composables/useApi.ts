import type { PerfilSessao, ProblemDetails } from "@cicluz/shared";

// Erro da API com o status e o código do ProblemDetails, para a tela decidir o que mostrar.
export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo?: string,
    readonly detalhes?: unknown
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Mesmo domínio do site: a API está em /api e o cookie de sessão vai sozinho.
export async function chamarApi<T>(caminho: string, opcoes: { metodo?: Metodo; corpo?: unknown } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: opcoes.metodo ?? "GET",
      credentials: "same-origin",
      headers: opcoes.corpo === undefined ? {} : { "content-type": "application/json" },
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)
    });
  } catch {
    throw new ErroApi("Sem conexão com o servidor.", 0, "NETWORK");
  }
  const texto = await resposta.text();
  const json = texto ? (JSON.parse(texto) as { ok?: boolean; data?: T } & Partial<ProblemDetails>) : null;
  if (!resposta.ok) {
    if (resposta.status === 401) irParaEntrada();
    throw new ErroApi(json?.title ?? "O servidor não respondeu como esperado.", resposta.status, json?.code, json?.details);
  }
  return (json?.data ?? json) as T;
}

// Uma tela de entrada só para o site e o app: entrar.html, que volta para cá depois do login.
export function irParaEntrada() {
  const voltar = window.location.pathname + window.location.search;
  window.location.replace(`/entrar.html?voltar=${encodeURIComponent(voltar)}`);
}

// Sair passa pela mesma saída do site (entrar.html?sair=1): envia o que estiver pendente no
// aparelho, encerra a sessão e limpa os dados de negócio. Um caminho só para sair.
export function sairDoSistema() {
  window.location.assign("/entrar.html?sair=1");
}

export function useSessao() {
  return useState<PerfilSessao | null>("cicluz.sessao", () => null);
}
