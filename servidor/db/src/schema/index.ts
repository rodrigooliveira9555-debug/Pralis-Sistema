import * as autenticacao from "./autenticacao.ts";
import * as cadastro from "./cadastro.ts";
import * as documentos from "./documentos.ts";
import * as estrutura from "./estrutura.ts";
import * as financeiro from "./financeiro.ts";
import * as projecoes from "./projecoes.ts";

export * from "./autenticacao.ts";
export * from "./cadastro.ts";
export * from "./documentos.ts";
export * from "./estrutura.ts";
export * from "./financeiro.ts";
export * from "./projecoes.ts";

export const schema = { ...autenticacao, ...cadastro, ...documentos, ...estrutura, ...financeiro, ...projecoes };
export type Schema = typeof schema;
