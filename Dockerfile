# Estágio de build: instala todas as dependências e compila o TypeScript
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Estágio final: apenas dependências de produção + dist/
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
