# 🔧 Configuração de Variáveis de Ambiente no Portainer

## ⚠️ IMPORTANTE

O `docker-compose.yml` está configurado para receber as variáveis de ambiente, mas você **DEVE configurá-las no Portainer** durante o deploy.

## 📋 Variáveis Necessárias

Quando fizer deploy via UI do Portainer, configure estas variáveis de ambiente:

### 1. Variáveis Obrigatórias

```
TELEGRAM_TOKEN=5515582616:AAHGsAj0CYG-lSM0i2leMbm3frmcoNg_4Z4
API_TOKEN=kjvHiQNRxutJKrlFApVWhTcj
WEBSHARE_API_KEY=qxew5x0zbdftbcsh63ql5flysll0jaf5u96msek9
```

### 2. Variáveis Opcionais (com valores padrão)

```
API_BASE_URL=https://completa.workbuscas.com/api
WEBSHARE_API_URL=https://proxy.webshare.io/api/v2/proxy/list
NODE_ENV=production
```

## 📝 Como Configurar no Portainer UI

1. **Acesse**: https://portainer.lemontech.cloud
2. **Vá em**: Stacks → Add Stack
3. **Configure Git Repository**:
   - Repository URL: `https://github.com/mrmaggie21/MRBOOT.git`
   - Reference: `main`
   - Compose file: `docker-compose.yml`
4. **Role até "Environment variables"**
5. **Adicione cada variável**:
   - Clique em **Add environment variable**
   - Digite o nome (ex: `TELEGRAM_TOKEN`)
   - Digite o valor (ex: `5515582616:AAHGsAj0CYG-lSM0i2leMbm3frmcoNg_4Z4`)
   - Repita para cada variável

### Variáveis para Adicionar:

```
TELEGRAM_TOKEN = 5515582616:AAHGsAj0CYG-lSM0i2leMbm3frmcoNg_4Z4
API_TOKEN = kjvHiQNRxutJKrlFApVWhTcj
API_BASE_URL = https://completa.workbuscas.com/api
WEBSHARE_API_KEY = qxew5x0zbdftbcsh63ql5flysll0jaf5u96msek9
WEBSHARE_API_URL = https://proxy.webshare.io/api/v2/proxy/list
NODE_ENV = production
```

6. **Clique em "Deploy the stack"**

## ✅ Verificação

Após o deploy, verifique os logs:

1. Vá em **Stacks** → `telegram-cpf-bot` → **Logs**
2. Procure por: `🚀 Iniciando bot...`
3. Se aparecer `✅ Bot iniciado com sucesso!`, está tudo certo
4. Se aparecer `❌ Erro: TELEGRAM_TOKEN não definido`, significa que as variáveis não foram configuradas corretamente

## 🔄 Atualizar Variáveis Existente

Se a stack já existe e você quer atualizar as variáveis:

1. Vá em **Stacks** → `telegram-cpf-bot` → **Editor**
2. Edite a seção `environment:` no `docker-compose.yml`
3. Ou use **Update Stack** e configure nas variáveis de ambiente

