FROM node:18-alpine

WORKDIR /app

# Instalar git e dependências necessárias
RUN apk add --no-cache git

# Desabilitar BuildKit explicitamente
ENV DOCKER_BUILDKIT=0
ENV COMPOSE_DOCKER_CLI_BUILD=0

# Clonar repositório Git
ARG GIT_REPO=https://github.com/mrmaggie21/MRBOOT.git
ARG GIT_BRANCH=main
RUN git clone --branch ${GIT_BRANCH} --depth 1 ${GIT_REPO} /tmp/repo && \
    cp -r /tmp/repo/* /app/ && \
    rm -rf /tmp/repo

# Copiar arquivos de dependências primeiro (para cache do Docker)
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação (já foi copiado via git clone, mas garantindo)
COPY bot.js ./
COPY test-proxy.js ./

# Criar diretório de logs
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Variável de ambiente para indicar que está em container
ENV NODE_ENV=production

# Comando para iniciar o bot
CMD ["node", "bot.js"]
