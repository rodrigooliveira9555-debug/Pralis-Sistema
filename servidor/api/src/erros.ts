import type { JsonValue } from "@cicluz/shared";

// Erro de regra de negócio: o handler global responde com status, mensagem e código próprios.
// Qualquer outro erro vira 500 "Erro interno", logado, sem detalhe interno no corpo.
export class ErroDominio extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: JsonValue
  ) {
    super(message);
  }
}

export function naoAutenticado() {
  return new ErroDominio("Não autenticado", 401, "UNAUTHENTICATED");
}

export function proibido(message: string, code = "FORBIDDEN") {
  return new ErroDominio(message, 403, code);
}

export function conflito(message: string, code: string, details?: JsonValue) {
  return new ErroDominio(message, 409, code, details);
}
