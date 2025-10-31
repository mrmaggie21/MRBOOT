FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências primeiro (para cache do Docker)
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
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

