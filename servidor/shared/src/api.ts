// Formato das respostas da API, igual ao do Sistema Pralis: sucesso em { ok, data }, erro em
// ProblemDetails (RFC 9457) com `code` estável para a tela decidir o que fazer.
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ApiSuccess<T> = { ok: true; data: T };

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  code?: string;
  details?: JsonValue;
};

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function problema(status: number, title: string, code?: string, details?: JsonValue): ProblemDetails {
  return {
    type: "about:blank",
    title,
    status,
    ...(code ? { code } : {}),
    ...(details === undefined ? {} : { details })
  };
}
