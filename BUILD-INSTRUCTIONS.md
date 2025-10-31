# Instruções de Build e Deploy

## Problema
O Portainer não tem acesso aos arquivos do projeto quando faz build de uma stack standalone via API. 

## Solução 1: Build Local + Deploy (Recomendado)

### Passo 1: Fazer build local da imagem

```bash
npm run build
```

Ou:

```bash
docker build -t telegram-cpf-bot:latest .
```

### Passo 2: Fazer deploy via API

```bash
npm run deploy
```

O `docker-compose.yml` agora usa a imagem já construída em vez de fazer build no Portainer.

## Solução 2: Build via Portainer UI

1. Acesse https://portainer.lemontech.cloud
2. Vá em **Stacks** → **Add Stack**
3. Selecione **Upload** ou **Web editor**
4. Cole o conteúdo do `docker-compose.yml` (mas usando `build:` em vez de `image:`)
5. Faça upload dos arquivos:
   - Dockerfile
   - package.json
   - package-lock.json  
   - bot.js
   - test-proxy.js
6. Clique em **Deploy the stack**

## Solução 3: Usar Git Repository

1. Faça push do código para um repositório Git (GitHub, GitLab, etc.)
2. No Portainer, crie a stack e configure para usar o repositório Git
3. O Portainer fará clone e build automaticamente

## Solução 4: Build via API do Portainer (Avançado)

Se você quiser fazer build via API do Portainer, precisa:

1. Criar um tarball com todos os arquivos:
```bash
tar -czf build-context.tar.gz Dockerfile package*.json bot.js test-proxy.js
```

2. Fazer upload do tarball via API do Portainer
3. Usar o endpoint de build

## Configuração de Variáveis de Ambiente

Após fazer deploy, configure as variáveis de ambiente no Portainer:

1. Vá na stack `telegram-cpf-bot`
2. Clique em **Editor**
3. Adicione as variáveis de ambiente:

```yaml
environment:
  - TELEGRAM_TOKEN=seu_token
  - API_TOKEN=seu_token_api
  - WEBSHARE_API_KEY=sua_chave
  # ... outras variáveis
```

Ou configure via **Environment variables** na interface do Portainer.

