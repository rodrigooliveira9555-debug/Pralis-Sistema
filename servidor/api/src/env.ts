import { z } from "zod";

const segredoDev = "dev-secret-change-me-dev-secret-change-me";

const envSchema = z.object({
  // Enum fechado: um typo (ex.: "prod") derruba o boot em vez de desligar os cuidados de produção.
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().default("postgresql://cicluz:cicluz@localhost:5545/cicluz"),
  BETTER_AUTH_SECRET: z.string().min(32).default(segredoDev),
  // Endereço público por onde o navegador fala com a API (em produção, o próprio domínio do site,
  // porque o Vercel repassa /api/* para cá e o cookie fica sendo do site).
  AUTH_BASE_URL: z.string().url().default("http://localhost:4200"),
  WEB_ORIGINS: z.string().default("http://localhost:4200"),
  PORT: z.coerce.number().int().default(4200),
  HOST: z.string().default("0.0.0.0"),
  // "1" = a API também entrega o site de dist/ (desenvolvimento local ou servidor único).
  SERVIR_SITE: z.enum(["0", "1"]).default("0")
});

const lido = envSchema.parse(process.env);

if (lido.NODE_ENV === "production" && lido.BETTER_AUTH_SECRET === segredoDev) {
  throw new Error("BETTER_AUTH_SECRET de desenvolvimento em produção: defina um segredo próprio");
}

export const env = lido;

export const origensWebPermitidas = env.WEB_ORIGINS.split(",")
  .map((origem) => origem.trim())
  .filter(Boolean);
