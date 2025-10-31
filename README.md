# Telegram CPF Bot

Bot do Telegram para consulta de CPF usando API WorkBuscas.

## 🚀 Como Usar

1. Configure as variáveis de ambiente no arquivo `.env` (veja `env.example`)
2. Execute: `npm start`

## 📋 Variáveis de Ambiente

Copie `env.example` para `.env` e configure:

- `TELEGRAM_TOKEN` - Token do bot do Telegram
- `API_TOKEN` - Token da API WorkBuscas
- `WEBSHARE_API_KEY` - Chave da API WebShare (opcional, para proxies)
- `USE_PROXY` - `true` ou `false` para ativar/desativar proxies

## 🐳 Deploy com Docker

Use o `docker-compose.yml` para fazer deploy no Portainer ou Docker Swarm.

Configure as variáveis de ambiente no Portainer durante o deploy.
