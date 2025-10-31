# Bot de Consulta de CPF para Telegram

Bot do Telegram desenvolvido em Node.js para consultar dados de CPF usando a API WorkBuscas com suporte a proxies WebShare para resolver problemas de conectividade.

## 🚀 Instalação

1. Instale as dependências:
```bash
npm install
```

## 📝 Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Telegram Bot Token
TELEGRAM_TOKEN=seu_token_do_telegram

# API WorkBuscas
API_TOKEN=seu_token_da_api
API_BASE_URL=https://completa.workbuscas.com/api

# WebShare Proxy API Key
WEBSHARE_API_KEY=sua_chave_webshare
WEBSHARE_API_URL=https://proxy.webshare.io/api/v2/proxy/list
```

### Como obter as credenciais:

- **TELEGRAM_TOKEN**: Obtenha com o [@BotFather](https://t.me/BotFather) no Telegram
- **API_TOKEN**: Token da API WorkBuscas
- **WEBSHARE_API_KEY**: Chave da API do WebShare para gerenciamento de proxies

> ⚠️ **Importante**: O arquivo `.env` está no `.gitignore` e não será commitado. Crie manualmente na produção.

## ▶️ Executar

Para iniciar o bot:
```bash
npm start
```

Ou:
```bash
node bot.js
```

## 🚀 Deploy no Portainer

### Usando Git Repository (Recomendado)

A melhor forma de fazer deploy é usando **Git Repository**:

1. **Criar repositório no GitHub** e fazer push do código
2. **Configurar `.env`** com as variáveis do Git:
```env
# Git Repository Configuration
GIT_REPOSITORY_URL=https://github.com/seu-usuario/seu-repo.git
GIT_REFERENCE=main
COMPOSE_FILE_PATH=docker-compose.yml
```
3. **Fazer deploy**:
```bash
npm run deploy
```

📚 **Veja `README-GIT.md` para instruções completas!**

### Outras opções

- **Upload manual via UI**: Veja `SOLUCAO-BUILD.md`
- **Deploy via API**: Veja `DEPLOY.md`

## 🌐 Sistema de Proxies

O bot utiliza proxies do WebShare para:
- ✅ Resolver problemas de conectividade (timeout, bloqueios)
- ✅ Melhorar confiabilidade em servidores com restrições de rede
- ✅ Rotação automática de proxies
- ✅ Atualização automática da lista de proxies a cada 30 minutos

### Funcionalidades:

- **Carregamento automático**: Busca proxies do WebShare na inicialização
- **Rotação inteligente**: Usa diferentes proxies para cada requisição
- **Retry automático**: Tenta novamente com outro proxy em caso de falha
- **Reconexão automática**: Reconecta com novo proxy em caso de erro de polling

## 💬 Como Usar

1. Abra o Telegram e procure pelo seu bot
2. Envie `/start` para iniciar
3. Envie um CPF no formato:
   - 123.456.789-00
   - 12345678900
   - 123 456 789 00

## 📋 Comandos Disponíveis

- `/start` - Inicia o bot e mostra mensagem de boas-vindas
- `/help` - Mostra ajuda e instruções de uso
- `/consulta <cpf>` - Consulta um CPF específico (ex: `/consulta 123.456.789-00`)

## 📦 Dependências

- `node-telegram-bot-api` - Biblioteca para interagir com a API do Telegram
- `axios` - Cliente HTTP para fazer requisições à API WorkBuscas
- `dotenv` - Gerenciamento de variáveis de ambiente
- `https-proxy-agent` - Suporte a proxies HTTPS
- `http-proxy-agent` - Suporte a proxies HTTP

## ⚠️ Aviso

Este bot é apenas para fins informativos. Certifique-se de que o uso está em conformidade com as leis de proteção de dados.

## 🔧 Estrutura do Projeto

```
.
├── bot.js          # Arquivo principal do bot
├── package.json    # Dependências e scripts
├── .env            # Variáveis de ambiente (criar manualmente)
├── .gitignore      # Arquivos ignorados pelo git
└── README.md       # Este arquivo
```

## 🔍 Logs e Monitoramento

O bot exibe logs informativos durante a execução:
- ✅ Proxies carregados
- 🌐 Proxy em uso
- ❌ Erros de conexão
- 🔄 Tentativas de reconexão

## 🐛 Troubleshooting

### Problema: "ETELEGRAM: 400 Bad Request: message is too long"
- **Solução**: O bot já divide mensagens automaticamente. Se ocorrer, verifique a versão atualizada.

### Problema: "connect ETIMEDOUT"
- **Solução**: O bot usa proxies para resolver isso. Verifique se `WEBSHARE_API_KEY` está configurado corretamente.

### Problema: Bot não inicia
- **Verifique**: Se todas as variáveis no `.env` estão preenchidas corretamente
- **Verifique**: Se o token do Telegram é válido

