import { describe, expect, it } from "vitest";
import { ContadorTentativas } from "../../api/src/auth/tentativas.ts";

const JANELA = 15 * 60 * 1000;
const novo = (capacidade = 100) => new ContadorTentativas({ janelaMs: JANELA, maximo: 3, capacidade });

describe("contador de tentativas de senha", () => {
  it("barra a partir da tentativa seguinte ao teto, dentro da janela", () => {
    const contador = novo();
    expect([1, 2, 3].map(() => contador.esgotou("email:a", 0))).toEqual([false, false, false]);
    expect(contador.esgotou("email:a", 1000)).toBe(true);
  });

  it("a janela vencida recomeça a contagem", () => {
    const contador = novo();
    for (let i = 0; i < 4; i += 1) contador.esgotou("email:a", 0);
    expect(contador.esgotou("email:a", JANELA + 1)).toBe(false);
  });

  it("chave nula não conta nada", () => {
    const contador = novo();
    expect(contador.esgotou(null, 0)).toBe(false);
    expect(contador.tamanho).toBe(0);
  });

  // B5 (26/11/2026): antes, encher o contador apagava tudo e liberava a conta bloqueada.
  it("encher o contador com e-mails inventados não desbloqueia a conta bloqueada", () => {
    const contador = novo(50);
    for (let i = 0; i < 4; i += 1) contador.esgotou("email:vitima", 0);
    for (let i = 0; i < 5_000; i += 1) contador.esgotou(`email:lixo-${i}`, 10);
    expect(contador.esgotou("email:vitima", 20)).toBe(true);
    expect(contador.tamanho).toBeLessThanOrEqual(50);
  });

  it("ao encher, sai primeiro o que já venceu", () => {
    const contador = novo(3);
    contador.esgotou("email:velho", 0);
    contador.esgotou("email:b", JANELA);
    contador.esgotou("email:c", JANELA);
    contador.esgotou("email:d", JANELA + 10);
    // "velho" venceu e saiu; b e c (ainda na janela) continuam contando.
    contador.esgotou("email:b", JANELA + 20);
    contador.esgotou("email:b", JANELA + 30);
    expect(contador.esgotou("email:b", JANELA + 40)).toBe(true);
  });

  // Revisão de 26/11: quem está a uma tentativa do bloqueio também não pode ser despejado pela inundação.
  it("conta perto do bloqueio fica; saem antes as de 1 tentativa", () => {
    const contador = novo(50);
    for (let i = 0; i < 2; i += 1) contador.esgotou("email:vitima", 0);
    for (let i = 0; i < 5_000; i += 1) contador.esgotou(`email:lixo-${i}`, 10);
    expect(contador.esgotou("email:vitima", 20)).toBe(false);
    expect(contador.esgotou("email:vitima", 30)).toBe(true);
  });

  it("mesmo com todas bloqueadas, o mapa não passa de 2x a capacidade", () => {
    const contador = novo(10);
    for (let i = 0; i < 500; i += 1) for (let j = 0; j < 4; j += 1) contador.esgotou(`email:x-${i}`, i);
    expect(contador.tamanho).toBeLessThanOrEqual(20);
  });
});
