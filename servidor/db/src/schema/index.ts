import * as autenticacao from "./autenticacao.ts";
import * as cadastro from "./cadastro.ts";
import * as documentos from "./documentos.ts";

export * from "./autenticacao.ts";
export * from "./cadastro.ts";
export * from "./documentos.ts";

export const schema = { ...autenticacao, ...cadastro, ...documentos };
export type Schema = typeof schema;
