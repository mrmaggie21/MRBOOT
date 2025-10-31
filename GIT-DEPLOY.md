# Deploy usando Git Repository (GitHub/GitLab)

Esta é a solução recomendada quando o upload via API do Portainer não funciona.

## 📋 Pré-requisitos

1. Repositório Git criado (GitHub, GitLab, etc.)
2. Código commitado e no repositório remoto
3. Portainer com acesso ao Git (público ou privado com credenciais)

## 🔧 Configuração

### 1. Criar Repositório no GitHub

1. Acesse GitHub e crie um novo repositório
2. Faça push do código:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env`:

```env
# Portainer API Configuration
PORTAINER_URL=https://portainer.lemontech.cloud
PORTAINER_USERNAME=lemontech
PORTAINER_PASSWORD=Lemon@Technology1
PORTAINER_ENDPOINT_ID=1
PORTAINER_STACK_NAME=telegram-cpf-bot
PORTAINER_STACK_FILE=docker-compose.yml

# Git Repository Configuration (para deploy via Git)
GIT_REPOSITORY_URL=https://github.com/seu-usuario/seu-repo.git
GIT_REFERENCE=main
COMPOSE_FILE_PATH=docker-compose.yml

# Credenciais Git (opcional - apenas para repositórios privados)
# GIT_USERNAME=seu-usuario-github
# GIT_PASSWORD=seu-token-github
```

### 3. Para Repositórios Privados

Se o repositório for privado, você precisa:

1. **Criar um Personal Access Token no GitHub**:
   - Vá em Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Gere um novo token com permissão `repo`
   
2. **Configurar no `.env`**:
```env
GIT_USERNAME=seu-usuario-github
GIT_PASSWORD=ghp_seu-token-aqui
```

## 🚀 Deploy

Execute o script de deploy:

```bash
npm run deploy
```

O script irá:
1. ✅ Autenticar no Portainer
2. ✅ Buscar stack existente
3. ✅ Criar nova stack ou atualizar existente usando Git Repository
4. ✅ O Portainer fará clone do repositório e build automaticamente

## 📝 Como Funciona

1. O Portainer clona o repositório Git
2. Localiza o arquivo `docker-compose.yml` especificado
3. Faz build das imagens conforme configurado no Dockerfile
4. Inicia os containers automaticamente

## 🔄 Atualizações

Quando você fizer push de novas alterações:

```bash
git add .
git commit -m "Atualização"
git push
```

Depois, execute novamente:

```bash
npm run deploy
```

O Portainer irá:
1. Fazer pull das últimas mudanças do repositório
2. Rebuild da imagem se necessário
3. Reiniciar os containers com as novas mudanças

## ✅ Vantagens

- ✅ Não precisa fazer upload manual de arquivos
- ✅ Versionamento automático do código
- ✅ Deploy automático a cada push
- ✅ Histórico de commits e mudanças
- ✅ Funciona com repositórios públicos e privados

## ⚠️ Importante

- Mantenha o `.env` fora do repositório (use `.gitignore`)
- Não commite tokens ou senhas
- Use variáveis de ambiente no Portainer para dados sensíveis

