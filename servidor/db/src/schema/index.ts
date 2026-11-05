import * as agenda from "./agenda.ts";
import * as autenticacao from "./autenticacao.ts";
import * as cadastro from "./cadastro.ts";
import * as documentos from "./documentos.ts";
import * as estrutura from "./estrutura.ts";
import * as financeiro from "./financeiro.ts";
import * as lancamentos from "./lancamentos.ts";
import * as projecoes from "./projecoes.ts";

export * from "./agenda.ts";
export * from "./autenticacao.ts";
export * from "./cadastro.ts";
export * from "./documentos.ts";
export * from "./estrutura.ts";
export * from "./financeiro.ts";
export * from "./lancamentos.ts";
export * from "./projecoes.ts";

export const schema = { ...agenda, ...autenticacao, ...cadastro, ...documentos, ...estrutura, ...financeiro, ...lancamentos, ...projecoes };
export type Schema = typeof schema;
