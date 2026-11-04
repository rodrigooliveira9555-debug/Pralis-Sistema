# API do CICLUZ (Fastify + better-auth + Drizzle) + o app das telas novas (Nuxt gerado estático,
# servido pela própria API em /app/). Mesma imagem para o passo de migration e para a API; o
# docker-compose.coolify.yml escolhe o comando.

# 1) Gera o app (precisa das dependências de desenvolvimento do Nuxt).
FROM node:24-alpine AS app
WORKDIR /app
ENV NUXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY db/package.json db/
COPY api/package.json api/
COPY web/package.json web/
COPY tests/package.json tests/
RUN npm ci --no-audit --no-fund
COPY shared shared
COPY web web
RUN npm run build --workspace @cicluz/web

# 2) Imagem final: só dependências de produção da API.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY db/package.json db/
COPY api/package.json api/
COPY web/package.json web/
COPY tests/package.json tests/
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts && npm cache clean --force

COPY shared shared
COPY db db
COPY api api
COPY --from=app /app/web/.output/public web/.output/public

USER node
EXPOSE 4200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4200/health || exit 1

CMD ["npm", "run", "start", "--workspace", "@cicluz/api"]
