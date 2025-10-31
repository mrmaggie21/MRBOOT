require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const PORTAINER_URL = process.env.PORTAINER_URL;
const PORTAINER_USERNAME = process.env.PORTAINER_USERNAME;
const PORTAINER_PASSWORD = process.env.PORTAINER_PASSWORD;
const PORTAINER_ENDPOINT_ID = process.env.PORTAINER_ENDPOINT_ID || 1;
const PORTAINER_STACK_NAME = process.env.PORTAINER_STACK_NAME || 'telegram-cpf-bot';
const PORTAINER_STACK_FILE = process.env.PORTAINER_STACK_FILE || 'docker-compose.yml';

// Git Repository Configuration (opcional - se não configurado, usa método file/string)
const GIT_REPOSITORY_URL = process.env.GIT_REPOSITORY_URL; // Ex: https://github.com/usuario/repo.git
const GIT_REFERENCE = process.env.GIT_REFERENCE || 'main'; // branch ou tag
const GIT_USERNAME = process.env.GIT_USERNAME; // opcional - para repositórios privados
const GIT_PASSWORD = process.env.GIT_PASSWORD; // opcional - token ou senha
const COMPOSE_FILE_PATH = process.env.COMPOSE_FILE_PATH || 'docker-compose.yml';

let jwtToken = null;

// Função para autenticar no Portainer
async function autenticarPortainer() {
    try {
        console.log('🔐 Autenticando no Portainer...');
        console.log(`   URL: ${PORTAINER_URL}/api/auth`);
        
        const response = await axios.post(`${PORTAINER_URL}/api/auth`, {
            Username: PORTAINER_USERNAME,
            Password: PORTAINER_PASSWORD
        });

        // O token pode estar em jwt ou token dependendo da versão do Portainer
        jwtToken = response.data.jwt || response.data.token || response.data.accessToken;
        
        if (!jwtToken) {
            console.error('❌ Token não encontrado na resposta:', JSON.stringify(response.data));
            throw new Error('Token JWT não encontrado na resposta da autenticação');
        }
        
        console.log('✅ Autenticação realizada com sucesso');
        console.log(`   Token obtido (primeiros 20 chars): ${jwtToken.substring(0, 20)}...`);
        return jwtToken;
    } catch (error) {
        console.error('❌ Erro ao autenticar:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data));
        }
        throw error;
    }
}

// Função para verificar tipo do endpoint
async function verificarTipoEndpoint(jwtToken) {
    try {
        const response = await axios.get(
            `${PORTAINER_URL}/api/endpoints/${PORTAINER_ENDPOINT_ID}`,
            {
                headers: { 
                    'Authorization': `Bearer ${jwtToken}` 
                }
            }
        );
        return response.data.Type; // 1 = Docker, 2 = Docker Swarm, etc.
    } catch (error) {
        console.warn('   ⚠️ Não foi possível verificar tipo do endpoint, assumindo Docker Standalone');
        return 1; // Assumir Docker Standalone
    }
}

// Função para buscar stack existente
async function buscarStack(jwtToken) {
    try {
        console.log(`   Buscando stacks no endpoint ${PORTAINER_ENDPOINT_ID}...`);
        
        // Primeiro buscar todas as stacks do endpoint
        const response = await axios.get(
            `${PORTAINER_URL}/api/stacks`,
            {
                headers: { 
                    'Authorization': `Bearer ${jwtToken}` 
                },
                params: {
                    filters: JSON.stringify({
                        EndpointId: parseInt(PORTAINER_ENDPOINT_ID)
                    })
                }
            }
        );

        console.log(`   Encontradas ${response.data?.length || 0} stacks`);

        // Filtrar pela stack com o nome correto
        if (response.data && response.data.length > 0) {
            const stack = response.data.find(s => s.Name === PORTAINER_STACK_NAME);
            if (stack) {
                console.log(`   Stack encontrada: ${stack.Name} (ID: ${stack.Id})`);
                return stack;
            }
        }
        return null;
    } catch (error) {
        if (error.response && error.response.status !== 404) {
            console.error('❌ Erro ao buscar stack:', error.message);
            if (error.response.data) {
                console.error('   Detalhes:', JSON.stringify(error.response.data));
            }
        }
        return null;
    }
}

// Função para criar nova stack usando Git Repository
async function criarStackComGit(jwtToken) {
    try {
        console.log('📦 Criando nova stack usando Git Repository...');
        console.log(`   Nome: ${PORTAINER_STACK_NAME}`);
        console.log(`   Endpoint ID: ${PORTAINER_ENDPOINT_ID}`);
        console.log(`   Repository: ${GIT_REPOSITORY_URL}`);
        console.log(`   Reference: ${GIT_REFERENCE}`);
        console.log(`   Compose file: ${COMPOSE_FILE_PATH}`);
        
        if (GIT_USERNAME && GIT_PASSWORD) {
            console.log(`   ✅ Usando autenticação Git`);
        } else {
            console.log(`   ℹ️  Repositório público (sem autenticação)`);
        }

        const payload = {
            Name: PORTAINER_STACK_NAME,
            RepositoryURL: GIT_REPOSITORY_URL,
            RepositoryReference: GIT_REFERENCE,
            ComposeFilePath: COMPOSE_FILE_PATH,
            RepositoryAuthentication: false,
            EndpointID: parseInt(PORTAINER_ENDPOINT_ID),
            SwarmID: '' // Obrigatório para stacks standalone
        };

        // Se tem credenciais Git, adicionar autenticação
        if (GIT_USERNAME && GIT_PASSWORD) {
            payload.RepositoryAuthentication = true;
            payload.RepositoryUsername = GIT_USERNAME;
            payload.RepositoryPassword = GIT_PASSWORD;
        }

        console.log('   Payload completo:', JSON.stringify(payload, null, 2));

        // Verificar tipo do endpoint para usar o endpoint correto
        const endpointType = await verificarTipoEndpoint(jwtToken);
        const isSwarm = endpointType === 2;
        
        // Escolher endpoint correto
        const endpointPath = isSwarm ? 'swarm' : 'standalone';
        console.log(`   Tipo do endpoint: ${isSwarm ? 'Docker Swarm' : 'Docker Standalone'}`);
        console.log(`   Usando endpoint: ${endpointPath}/repository`);
        
        if (isSwarm) {
            // Para Swarm, precisa buscar o SwarmID do cluster
            console.log('   ⚠️  Docker Swarm detectado - precisando buscar SwarmID...');
            try {
                const swarmResponse = await axios.get(
                    `${PORTAINER_URL}/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/swarm`,
                    {
                        headers: {
                            'Authorization': `Bearer ${jwtToken}`
                        }
                    }
                );
                payload.SwarmID = swarmResponse.data.ID || '';
                console.log(`   ✅ SwarmID obtido: ${payload.SwarmID.substring(0, 12)}...`);
                
                // Para Swarm, usar docker-compose-swarm.yml se existir
                if (fs.existsSync('docker-compose-swarm.yml')) {
                    console.log('   📝 Usando docker-compose-swarm.yml para Swarm');
                    payload.ComposeFilePath = 'docker-compose-swarm.yml';
                } else {
                    console.warn('   ⚠️  docker-compose-swarm.yml não encontrado, usando docker-compose.yml');
                    console.warn('   ⚠️  Swarm não suporta build:, use imagem pré-construída');
                }
            } catch (swarmError) {
                console.warn('   ⚠️ Não foi possível obter SwarmID, usando string vazia');
                payload.SwarmID = '';
            }
        }
        
        // Tentar criar a stack
        let response;
        try {
            console.log(`   Fazendo request para: ${PORTAINER_URL}/api/stacks/create/${endpointPath}/repository`);
            
            response = await axios.post(
                `${PORTAINER_URL}/api/stacks/create/${endpointPath}/repository?endpointId=${PORTAINER_ENDPOINT_ID}`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 180000, // 3 minutos para build
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
        } catch (buildError) {
            if (buildError.response?.status === 500 && buildError.response?.data?.message?.includes('Build')) {
                console.log('\n⚠️  Erro 500 relacionado ao BuildKit do Docker.');
                console.log('   O Portainer está tentando fazer build mas o BuildKit está com problemas.');
                console.log('\n💡 Solução:');
                console.log('   O payload está correto e os arquivos estão no Git.');
                console.log('   Este é um problema interno do Portainer/Docker BuildKit.');
                console.log('   Tente fazer o deploy manualmente via UI do Portainer:');
                console.log(`   ${PORTAINER_URL} → Stacks → Add Stack → Git repository`);
                console.log('\n   Os dados estão corretos:');
                console.log(`   - Repository: ${GIT_REPOSITORY_URL}`);
                console.log(`   - Reference: ${GIT_REFERENCE}`);
                console.log(`   - Compose file: ${COMPOSE_FILE_PATH}`);
                console.log(`   - Username: ${GIT_USERNAME}`);
                console.log(`   - Password: ${GIT_PASSWORD.substring(0, 10)}...`);
                throw buildError;
            }
            throw buildError;
        }

        console.log('✅ Stack criada com sucesso usando Git Repository!');
        console.log('   ID:', response.data.Id);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao criar stack com Git:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data));
        }
        throw error;
    }
}

// Função para atualizar stack usando Git Repository
async function atualizarStackComGit(jwtToken, stackId) {
    try {
        console.log('🔄 Atualizando stack usando Git Repository...');
        console.log(`   Stack ID: ${stackId}`);
        console.log(`   Repository: ${GIT_REPOSITORY_URL}`);
        console.log(`   Reference: ${GIT_REFERENCE}`);

        const payload = {
            RepositoryURL: GIT_REPOSITORY_URL,
            RepositoryReference: GIT_REFERENCE,
            ComposeFilePath: COMPOSE_FILE_PATH,
            RepositoryAuthentication: false
        };

        // Se tem credenciais Git, adicionar autenticação
        if (GIT_USERNAME && GIT_PASSWORD) {
            payload.RepositoryAuthentication = true;
            payload.RepositoryUsername = GIT_USERNAME;
            payload.RepositoryPassword = GIT_PASSWORD;
        }

        // Tentar endpoint correto para atualizar stack via Git
        let response;
        try {
            // Tentar endpoint com query parameter
            response = await axios.put(
                `${PORTAINER_URL}/api/stacks/${stackId}/git?endpointId=${PORTAINER_ENDPOINT_ID}`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (gitError) {
            // Se falhar, tentar endpoint repository
            try {
                response = await axios.put(
                    `${PORTAINER_URL}/api/stacks/${stackId}?endpointId=${PORTAINER_ENDPOINT_ID}`,
                    {
                        ...payload,
                        Name: PORTAINER_STACK_NAME
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${jwtToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } catch (error2) {
                // Se ambos falharem, deletar e recriar
                console.log('   ⚠️ Atualização via Git falhou, deletando e recriando stack...');
                await axios.delete(
                    `${PORTAINER_URL}/api/stacks/${stackId}?endpointId=${PORTAINER_ENDPOINT_ID}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${jwtToken}`
                        }
                    }
                );
                console.log('   ✅ Stack deletada, recriando com Git Repository...');
                return await criarStackComGit(jwtToken);
            }
        }

        console.log('✅ Stack atualizada com sucesso usando Git Repository!');
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao atualizar stack com Git:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data));
        }
        throw error;
    }
}

// Função para criar nova stack (método string - sem Git Repository)
async function criarStack(jwtToken, stackContent) {
    try {
        console.log('📦 Criando nova stack (método string)...');
        console.log(`   Nome: ${PORTAINER_STACK_NAME}`);
        console.log(`   Endpoint ID: ${PORTAINER_ENDPOINT_ID}`);
        console.log(`   Tamanho do docker-compose: ${stackContent.length} bytes`);

        const payload = {
            Name: PORTAINER_STACK_NAME,
            StackFileContent: stackContent,
            EndpointID: parseInt(PORTAINER_ENDPOINT_ID),
            SwarmID: ''
        };

        const response = await axios.post(
            `${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${PORTAINER_ENDPOINT_ID}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Stack criada com sucesso!');
        console.log('   ID:', response.data.Id);
        console.log('   ⚠️  Nota: Para fazer build, configure Git Repository no .env');
        
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao criar stack:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        throw error;
    }
}

// Função para atualizar stack existente (método string - sem Git Repository)
async function atualizarStack(jwtToken, stackId, stackContent) {
    try {
        console.log('🔄 Atualizando stack existente (método string)...');
        console.log(`   Stack ID: ${stackId}`);

        const payload = {
            StackFileContent: stackContent
        };

        const response = await axios.put(
            `${PORTAINER_URL}/api/stacks/${stackId}?endpointId=${PORTAINER_ENDPOINT_ID}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Stack atualizada com sucesso!');
        console.log('   ⚠️  Nota: Para fazer build, configure Git Repository no .env');
        
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao atualizar stack:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        throw error;
    }
}

// Função para construir e fazer push da imagem (se necessário)
async function buildImage(jwtToken) {
    try {
        console.log('🏗️ Construindo imagem Docker...');
        
        // Aqui você pode adicionar lógica para build remoto
        // Por enquanto, vamos assumir que a imagem já está construída
        // ou que será construída pelo Portainer
        
        console.log('✅ Imagem pronta (assumindo build local ou automático)');
        return true;
    } catch (error) {
        console.error('❌ Erro ao construir imagem:', error.message);
        return false;
    }
}

// Função principal de deploy
async function fazerDeploy() {
    try {
        console.log('🚀 Iniciando deploy via API do Portainer...\n');

        // Validar variáveis de ambiente
        if (!PORTAINER_URL || !PORTAINER_USERNAME || !PORTAINER_PASSWORD) {
            console.error('❌ Erro: Variáveis do Portainer não configuradas no .env');
            console.error('   Necessário: PORTAINER_URL, PORTAINER_USERNAME, PORTAINER_PASSWORD');
            process.exit(1);
        }

        // Verificar se docker-compose.yml existe
        if (!fs.existsSync(PORTAINER_STACK_FILE)) {
            console.error(`❌ Arquivo ${PORTAINER_STACK_FILE} não encontrado!`);
            console.error('   Criando arquivo docker-compose.yml...');
            criarDockerCompose();
        }

        // Ler conteúdo do docker-compose.yml
        const stackContent = fs.readFileSync(PORTAINER_STACK_FILE, 'utf8');

        // Autenticar
        const token = await autenticarPortainer();

        // Verificar tipo do endpoint
        const endpointType = await verificarTipoEndpoint(token);
        const isSwarm = endpointType === 2;
        console.log(`   Tipo do endpoint: ${isSwarm ? 'Docker Swarm' : 'Docker Standalone'}`);
        
        // Se for Swarm, precisa ajustar o docker-compose (remover build:, container_name, restart)
        if (isSwarm && fs.existsSync(PORTAINER_STACK_FILE)) {
            console.log('   ⚠️  Docker Swarm detectado - docker-compose precisa ser ajustado para Swarm');
            console.log('   ℹ️  Swarm não suporta build: diretamente, precisa de imagem pré-construída');
        }

        // Verificar se está configurado para usar Git Repository
        if (GIT_REPOSITORY_URL) {
            console.log('📦 Usando Git Repository para deploy...\n');
            console.log(`   Repository: ${GIT_REPOSITORY_URL}`);
            console.log(`   Branch: ${GIT_REFERENCE}`);
            console.log(`   Compose file: ${COMPOSE_FILE_PATH}\n`);
            
            // Validar configuração Git
            if (!GIT_REPOSITORY_URL) {
                console.error('❌ Erro: GIT_REPOSITORY_URL não configurado no .env');
                console.error('   Adicione GIT_REPOSITORY_URL no arquivo .env');
                process.exit(1);
            }
            
            // Buscar stack existente
            const stackExistente = await buscarStack(token);

            if (stackExistente) {
                console.log(`📋 Stack "${PORTAINER_STACK_NAME}" encontrada (ID: ${stackExistente.Id})`);
                console.log(`   Atualizando stack usando Git Repository...\n`);
                // Atualizar stack existente usando Git
                await atualizarStackComGit(token, stackExistente.Id);
            } else {
                console.log(`📋 Stack "${PORTAINER_STACK_NAME}" não encontrada`);
                console.log(`   Criando nova stack usando Git Repository...\n`);
                // Criar nova stack usando Git
                await criarStackComGit(token);
            }
        } else {
            console.log('📦 Usando método file/string para deploy...\n');
            
            // Buscar stack existente
            const stackExistente = await buscarStack(token);

            if (stackExistente) {
                console.log(`📋 Stack "${PORTAINER_STACK_NAME}" encontrada (ID: ${stackExistente.Id})`);
                // Atualizar stack existente
                await atualizarStack(token, stackExistente.Id, stackContent);
            } else {
                console.log(`📋 Stack "${PORTAINER_STACK_NAME}" não encontrada`);
                // Criar nova stack
                await criarStack(token, stackContent);
            }
        }

        console.log('\n✅ Deploy realizado com sucesso!');
        console.log(`   Stack: ${PORTAINER_STACK_NAME}`);
        console.log(`   Endpoint: ${PORTAINER_ENDPOINT_ID}`);
        console.log(`   URL: ${PORTAINER_URL}`);
        if (GIT_REPOSITORY_URL) {
            console.log(`   Repository: ${GIT_REPOSITORY_URL}`);
            console.log(`   Branch: ${GIT_REFERENCE}`);
            console.log('\n📝 O Portainer irá automaticamente:');
            console.log('   1. Clonar o repositório Git');
            console.log('   2. Fazer build das imagens Docker');
            console.log('   3. Iniciar os containers');
        }

    } catch (error) {
        console.error('\n❌ Erro durante o deploy:', error.message);
        process.exit(1);
    }
}

// Função para criar docker-compose.yml se não existir
function criarDockerCompose() {
    const dockerCompose = `version: '3.8'

services:
  telegram-bot:
    image: telegram-cpf-bot:latest
    container_name: telegram-cpf-bot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    networks:
      - bot-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  bot-network:
    driver: bridge
`;

    fs.writeFileSync('docker-compose.yml', dockerCompose);
    console.log('✅ docker-compose.yml criado');
}

// Executar deploy
fazerDeploy();

