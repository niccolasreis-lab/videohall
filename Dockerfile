FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    APP_DATA_DIR=/data

WORKDIR /app

# O projeto não tem dependências externas: apenas módulos nativos do Node.
COPY package.json server.mjs ./
COPY src ./src
COPY public ./public

RUN mkdir -p /data && chown -R node:node /data /app

USER node

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "server.mjs"]
