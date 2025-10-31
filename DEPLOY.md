# Deploy via API do Portainer

Este guia mostra como fazer deploy do bot usando a API do Portainer.

## 📋 Pré-requisitos

1. Portainer instalado e acessível
2. Credenciais de acesso ao Portainer
3. Endpoint configurado no Portainer
4. Docker instalado (para build local, se necessário)

## 🔧 Configuração

### 1. Adicionar variáveis no `.env`

Adicione as seguintes variáveis no arquivo `.env`:

```env
# Portainer API Configuration
PORTAINER_URL=http://seu-portainer:9000
PORTAINER_USERNAME=admin
PORTAINER_PASSWORD=sua_senha_aqui
PORTAINER_ENDPOINT_ID=1
PORTAINER_STACK_NAME=telegram-cpf-bot
PORTAINER_STACK_FILE=docker-compose.yml
```

### 2. Construir a imagem Docker (opcional)

Se quiser fazer build local antes:

```bash
npm run build
```

Ou:

```bash
docker build -t telegram-cpf-bot:latest .
```

## 🚀 Deploy via API

### Deploy Automático

Execute o script de deploy:

```bash
npm run deploy
```

Ou diretamente:

```bash
node deploy-portainer.js
```

O script irá:
1. ✅ Autenticar no Portainer
2. ✅ Buscar stack existente
3. ✅ Criar nova stack ou atualizar existente
4. ✅ Fazer deploy automaticamente

## 📦 Como Funciona

### Script `deploy-portainer.js`

O script realiza as seguintes operações:

1. **Autenticação**: Faz login na API do Portainer
2. **Verificação**: Busca se já existe uma stack com o nome configurado
3. **Criação/Atualização**:
   - Se a stack não existe: cria nova
   - Se a stack existe: atualiza com novo conteúdo

### Arquivos Necessários

- `Dockerfile`: Define como construir a imagem Docker
- `docker-compose.yml`: Define a stack para o Portainer
- `.dockerignore`: Arquivos ignorados no build

## 🐳 Docker Compose Manual

Se preferir fazer deploy manual via Portainer UI:

1. Acesse o Portainer
2. Vá em **Stacks**
3. Clique em **Add Stack**
4. Cole o conteúdo do `docker-compose.yml`
5. Configure as variáveis de ambiente
6. Clique em **Deploy**

## 🔍 Verificar Deploy

Após o deploy, verifique:

```bash
# Ver logs do container
npm run docker:logs

# Ou diretamente
docker-compose logs -f
```

## 📝 Variáveis do Portainer

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PORTAINER_URL` | URL do Portainer | `http://portainer:9000` |
| `PORTAINER_USERNAME` | Usuário admin | `admin` |
| `PORTAINER_PASSWORD` | Senha do Portainer | `sua_senha` |
| `PORTAINER_ENDPOINT_ID` | ID do endpoint Docker | `1` |
| `PORTAINER_STACK_NAME` | Nome da stack | `telegram-cpf-bot` |
| `PORTAINER_STACK_FILE` | Arquivo compose | `docker-compose.yml` |

## 🛠️ Troubleshooting

### Erro de autenticação
- Verifique se `PORTAINER_USERNAME` e `PORTAINER_PASSWORD` estão corretos
- Verifique se o Portainer está acessível

### Erro ao criar stack
- Verifique se o `PORTAINER_ENDPOINT_ID` está correto
- Verifique se o `docker-compose.yml` está válido

### Erro ao atualizar stack
- Verifique se a stack existe no Portainer
- Verifique se você tem permissões para atualizar

## 🔄 Atualização

Para atualizar o bot:

1. Faça as alterações no código
2. Execute novamente: `npm run deploy`
3. O script irá atualizar a stack automaticamente

## 📚 Comandos Úteis

```bash
# Build da imagem
npm run build

# Deploy via API
npm run deploy

# Iniciar localmente (Docker Compose)
npm run docker:up

# Parar localmente
npm run docker:down

# Ver logs
npm run docker:logs

# Testar proxies
npm run test-proxy
```

