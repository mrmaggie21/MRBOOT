# Solução para Build no Portainer

## ⚠️ Problema Atual

O Portainer está tentando fazer build mas não encontra os arquivos (`package.json` não encontrado).

## ✅ Solução Rápida: Build via Portainer UI

Como o build via API não tem acesso aos arquivos, você precisa fazer build via UI do Portainer:

### Passo 1: Acesse o Portainer
1. Acesse: https://portainer.lemontech.cloud
2. Vá em **Stacks** → **telegram-cpf-bot**
3. Clique em **Editor**

### Passo 2: Fazer Upload dos Arquivos

No Portainer, você pode fazer upload dos arquivos necessários:

1. Na stack, vá em **Editor** ou **Update Stack**
2. Use **Upload** para fazer upload de um arquivo tar.gz com todos os arquivos

Ou:

### Passo 3: Usar Git Repository (Recomendado)

1. Faça push do código para GitHub/GitLab
2. No Portainer, edite a stack e configure para usar Git:
   - Repository URL: `https://github.com/seu-usuario/seu-repo.git`
   - Reference: `main` ou `master`
   - Compose file path: `docker-compose.yml`

3. O Portainer irá clonar e fazer build automaticamente

### Passo 4: Build Manual via UI

1. Vá em **Stacks** → **Add Stack**
2. Nome: `telegram-cpf-bot`
3. Método: **Web editor**
4. Cole o conteúdo do `docker-compose.yml`
5. Vá em **Advanced mode**
6. Faça upload dos arquivos:
   - `Dockerfile`
   - `package.json`
   - `package-lock.json`
   - `bot.js`
   - `.dockerignore`
7. Clique em **Deploy the stack**

## 📦 Arquivos Necessários para Build

Para fazer build, o Portainer precisa destes arquivos:

- ✅ `Dockerfile`
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `bot.js`
- ✅ `.dockerignore`
- ⚠️ `.env` (não fazer upload, configurar via UI)

## 🔧 Alternativa: Build Local e Push

Se você tiver Docker instalado:

```bash
# 1. Build local
docker build -t telegram-cpf-bot:latest .

# 2. Tag para registry (se usar)
docker tag telegram-cpf-bot:latest seu-registry/telegram-cpf-bot:latest

# 3. Push (se usar registry)
docker push seu-registry/telegram-cpf-bot:latest

# 4. Atualizar docker-compose.yml para usar a imagem
# De: build: context: .
# Para: image: seu-registry/telegram-cpf-bot:latest
```

## 🎯 Solução Imediata

Para resolver agora:

1. **Opção 1**: Deletar a stack atual no Portainer e criar nova via UI com upload de arquivos
2. **Opção 2**: Configurar Git repository e fazer deploy novamente
3. **Opção 3**: Fazer build local (se tiver Docker) e usar imagem pré-construída

