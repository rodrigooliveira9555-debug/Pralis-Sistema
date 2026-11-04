import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./integracao/banco-de-teste.ts"],
    include: ["**/*.test.ts"],
    // Um Postgres para a suíte inteira; os arquivos rodam em sequência no mesmo processo.
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000
  }
});
