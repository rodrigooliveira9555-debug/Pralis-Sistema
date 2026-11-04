import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgresql://cicluz:cicluz@localhost:5545/cicluz"
  },
  strict: true,
  verbose: true
});
