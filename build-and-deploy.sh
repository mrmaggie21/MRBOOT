#!/bin/bash

# Script para fazer build da imagem Docker e deploy no Portainer

echo "🏗️ Construindo imagem Docker..."
docker build -t telegram-cpf-bot:latest .

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📦 Fazendo push para registry (se necessário)..."
    # docker tag telegram-cpf-bot:latest seu-registry/telegram-cpf-bot:latest
    # docker push seu-registry/telegram-cpf-bot:latest
    
    echo "🚀 Fazendo deploy via API do Portainer..."
    node deploy-portainer.js
else
    echo "❌ Erro ao fazer build!"
    exit 1
fi

