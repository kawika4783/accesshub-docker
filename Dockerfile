FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html ./
COPY src ./src
RUN pnpm build

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8000
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=build /app/dist ./dist
COPY server ./server
RUN mkdir -p /app/work/uploads && chown -R node:node /app
USER node
EXPOSE 8000
CMD ["node", "server/index.js"]
