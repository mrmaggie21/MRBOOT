# 🚀 Deploy via Git Repository (Recomendado)

Como o upload via API do Portainer está falhando, a **solução recomendada** é usar **Git Repository** (GitHub/GitLab).

## ✅ Vantagens

- ✅ Não precisa fazer upload manual de arquivos
- ✅ Versionamento automático do código
- ✅ Deploy automático a cada push
- ✅ Histórico de commits e mudanças
- ✅ Funciona perfeitamente com Portainer

## 📋 Passo a Passo

### 1. Criar Repositório no GitHub

1. Acesse https://github.com e crie um novo repositório
2. Não inicialize com README, .gitignore ou license (já temos)

### 2. Fazer Push do Código

```bash
# Inicializar Git (se ainda não foi feito)
git init

# Adicionar arquivos
git add .

# Commit inicial
git commit -m "Initial commit - Telegram CPF Bot"

# Renomear branch para main
git branch -M main

# Adicionar repositório remoto (substitua pela sua URL)
git remote add origin https://github.com/seu-usuario/seu-repo.git

# Fazer push
git push -u origin main
```

### 3. Configurar `.env`

Adicione as variáveis do Git no arquivo `.env`:

```env
# Portainer API Configuration (já existentes)
PORTAINER_URL=https://portainer.lemontech.cloud
PORTAINER_USERNAME=lemontech
PORTAINER_PASSWORD=Lemon@Technology1
PORTAINER_ENDPOINT_ID=1
PORTAINER_STACK_NAME=telegram-cpf-bot
PORTAINER_STACK_FILE=docker-compose.yml

# Git Repository Configuration (NOVO)
GIT_REPOSITORY_URL=https://github.com/seu-usuario/seu-repo.git
GIT_REFERENCE=main
COMPOSE_FILE_PATH=docker-compose.yml

# Credenciais Git (OPCIONAL - apenas para repositórios privados)
# GIT_USERNAME=seu-usuario-github
# GIT_PASSWORD=seu-token-github
```

### 4. Fazer Deploy

```bash
npm run deploy
```

O script irá:
1. ✅ Autenticar no Portainer
2. ✅ Criar/atualizar stack usando Git Repository
3. ✅ O Portainer irá clonar o repositório e fazer build automaticamente

## 🔄 Atualizações Futuras

Quando fizer mudanças no código:

```bash
# Fazer mudanças no código
# ...

# Commit e push
git add .
git commit -m "Descrição das mudanças"
git push

# Deploy no Portainer
npm run deploy
```

O Portainer irá automaticamente:
- Fazer pull das últimas mudanças
- Rebuild da imagem se necessário
- Reiniciar os containers

## 🔒 Repositórios Privados

Se o repositório for privado:

1. **Criar Personal Access Token no GitHub**:
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Gere token com permissão `repo`

2. **Adicionar no `.env`**:
```env
GIT_USERNAME=seu-usuario-github
GIT_PASSWORD=ghp_seu-token-aqui
```

## 📚 Documentação Completa

Veja `GIT-DEPLOY.md` para documentação completa.

