// Porta de entrada do SITE (dist/): só o que as telas de Lançamentos do site precisam da regra do servidor.
// A cópia pronta para o navegador é dist/lancamentos/regras.js (window.CicluzLancamentosRegras), feita por
// servidor/scripts/gerar-regras-lancamentos.mjs. A tela mostra a prévia com a MESMA conta que o servidor grava.
export { paraCentavos, jurosCentavos } from "./dinheiro.ts";
export { calcularDiscriminacao } from "./discriminacao.ts";
export { diaNegocio } from "./datas.ts";
export { apiParaDinheiro, campoInvalido, dinheiroParaApi, numeroParaApi } from "./entrada.ts";
