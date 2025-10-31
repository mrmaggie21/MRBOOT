# Deploy Manual via UI do Portainer - Docker Swarm

Como o endpoint é **Docker Swarm** e a API está com problemas, faça o deploy manualmente via UI:

## 📋 Passo a Passo

### 1. Acessar o Portainer

1. Acesse: https://portainer.lemontech.cloud
2. Faça login com:
   - Usuário: `lemontech`
   - Senha: `Lemon@Technology1`

### 2. Criar Nova Stack

1. Vá em **Stacks** (menu lateral)
2. Clique em **Add Stack** ou **Add stack**
3. **Nome da Stack**: `telegram-cpf-bot`

### 3. Configurar Stack

1. **Método de Build**: Selecione **Git repository**

2. **Configurações do Git**:
   - **Repository URL**: `https://github.com/mrmaggie21/MRBOOT.git`
   - **Repository Reference**: `main`
   - **Compose file path**: `docker-compose-swarm.yml` ⚠️ **IMPORTANTE: Use docker-compose-swarm.yml**

3. **Autenticação Git**:
   - Marque **Authentication**
   - **Username**: `mrmaggie21`
   - **Password**: Token do GitHub (veja no arquivo .env)

### 4. Configurar Variáveis de Ambiente

1. Role a página até **Environment variables**
2. Clique em **Add environment variable** e adicione:

```
TELEGRAM_TOKEN=5515582616:AAHGsAj0CYG-lSM0i2leMbm3frmcoNg_4Z4
API_TOKEN=kjvHiQNRxutJKrlFApVWhTcj
API_BASE_URL=https://completa.workbuscas.com/api
WEBSHARE_API_KEY=qxew5x0zbdftbcsh63ql5flysll0jaf5u96msek9
WEBSHARE_API_URL=https://proxy.webshare.io/api/v2/proxy/list
NODE_ENV=production
```

### 5. Deploy

1. Clique em **Deploy the stack**
2. Aguarde o deploy completar
3. Verifique os logs se necessário

## ✅ Verificação

Após o deploy:

1. Vá em **Containers** e verifique se o container `telegram-cpf-bot` está rodando
2. Vá em **Stacks** → `telegram-cpf-bot` → **Logs** para ver os logs
3. Teste o bot no Telegram com o comando `/start` ou `/consulta <cpf>`

## ⚠️ Importante

- **Docker Swarm não suporta `build:` diretamente**
- Use `docker-compose-swarm.yml` que usa `image: node:18-alpine`
- O arquivo `docker-compose-swarm.yml` está configurado para Swarm com:
  - `deploy:` em vez de `restart:`
  - `image:` em vez de `build:`
  - `driver: overlay` para networks

