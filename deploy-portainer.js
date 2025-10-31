require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const archiver = require('archiver');

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

// Função para criar tarball com arquivos necessários para build
function criarTarball() {
    return new Promise((resolve, reject) => {
        console.log('📦 Criando tarball com arquivos para build...');
        
        const output = fs.createWriteStream('build-context.tar.gz');
        const archive = archiver('tar', {
            gzip: true,
            gzipOptions: { level: 1 }
        });

        output.on('close', () => {
            const size = archive.pointer();
            console.log(`✅ Tarball criado: ${size} bytes`);
            resolve('build-context.tar.gz');
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Adicionar arquivos necessários para build
        const arquivosParaBuild = [
            'Dockerfile',
            'package.json',
            'package-lock.json',
            'bot.js',
            '.dockerignore'
        ];

        arquivosParaBuild.forEach(arquivo => {
            if (fs.existsSync(arquivo)) {
                archive.file(arquivo, { name: arquivo });
                console.log(`   ✓ Adicionado: ${arquivo}`);
            } else {
                console.warn(`   ⚠️ Arquivo não encontrado: ${arquivo}`);
            }
        });

        archive.finalize();
    });
}

// Função para criar tarball completo incluindo docker-compose.yml
function criarTarballCompleto(stackContent) {
    return new Promise((resolve, reject) => {
        console.log('📦 Criando tarball completo com docker-compose.yml...');
        
        const output = fs.createWriteStream('build-context-completo.tar.gz');
        const archive = archiver('tar', {
            gzip: true,
            gzipOptions: { level: 1 }
        });

        output.on('close', () => {
            const size = archive.pointer();
            console.log(`✅ Tarball completo criado: ${size} bytes`);
            resolve('build-context-completo.tar.gz');
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Adicionar docker-compose.yml como string
        archive.append(stackContent, { name: 'docker-compose.yml' });
        console.log(`   ✓ Adicionado: docker-compose.yml`);

        // Adicionar arquivos necessários para build
        const arquivosParaBuild = [
            'Dockerfile',
            'package.json',
            'package-lock.json',
            'bot.js',
            '.dockerignore'
        ];

        arquivosParaBuild.forEach(arquivo => {
            if (fs.existsSync(arquivo)) {
                archive.file(arquivo, { name: arquivo });
                console.log(`   ✓ Adicionado: ${arquivo}`);
            } else {
                console.warn(`   ⚠️ Arquivo não encontrado: ${arquivo}`);
            }
        });

        archive.finalize();
    });
}

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

        const payload = {
            Name: PORTAINER_STACK_NAME,
            RepositoryURL: GIT_REPOSITORY_URL,
            RepositoryReference: GIT_REFERENCE,
            ComposeFilePath: COMPOSE_FILE_PATH,
            RepositoryAuthentication: false,
            EndpointID: parseInt(PORTAINER_ENDPOINT_ID)
        };

        // Se tem credenciais Git, adicionar autenticação
        if (GIT_USERNAME && GIT_PASSWORD) {
            payload.RepositoryAuthentication = true;
            payload.RepositoryUsername = GIT_USERNAME;
            payload.RepositoryPassword = GIT_PASSWORD;
        }

        const response = await axios.post(
            `${PORTAINER_URL}/api/stacks/create/standalone/repository?endpointId=${PORTAINER_ENDPOINT_ID}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

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

        const response = await axios.put(
            `${PORTAINER_URL}/api/stacks/${stackId}/repository?endpointId=${PORTAINER_ENDPOINT_ID}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

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

// Função para criar nova stack com upload de arquivos
async function criarStack(jwtToken, stackContent) {
    try {
        console.log('📦 Criando nova stack com upload de arquivos...');
        console.log(`   Nome: ${PORTAINER_STACK_NAME}`);
        console.log(`   Endpoint ID: ${PORTAINER_ENDPOINT_ID}`);
        console.log(`   Tamanho do docker-compose: ${stackContent.length} bytes`);

        // Criar tarball completo com docker-compose.yml e arquivos de build
        const tarballCompleto = await criarTarballCompleto(stackContent);
        const tarballCompletoBuffer = fs.readFileSync(tarballCompleto);
        
        // Criar FormData - o endpoint file espera apenas o tarball
        const formDataCompleto = new FormData();
        formDataCompleto.append('file', tarballCompletoBuffer, {
            filename: 'build-context.tar.gz',
            contentType: 'application/gzip'
        });

        console.log(`   Uploading tarball completo (${tarballCompletoBuffer.length} bytes)...`);

        try {
            // Tentar criar stack com upload de arquivos via endpoint file
            // O endpoint file espera apenas o tarball com todos os arquivos
            const response = await axios.post(
                `${PORTAINER_URL}/api/stacks/create/standalone/file?endpointId=${PORTAINER_ENDPOINT_ID}&Name=${encodeURIComponent(PORTAINER_STACK_NAME)}`,
                formDataCompleto,
                {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        ...formDataCompleto.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 120000 // 2 minutos para upload
                }
            );

            console.log('✅ Stack criada com sucesso (com arquivos)!');
            console.log('   ID:', response.data.Id);
            
            // Limpar tarball temporário
            fs.unlinkSync(tarballCompleto);
            
            return response.data;
        } catch (fileError) {
            console.log('   ❌ Método com arquivo falhou');
            if (fileError.response) {
                console.log(`   Status: ${fileError.response.status}`);
                if (fileError.response.data?.message) {
                    console.log(`   Erro: ${fileError.response.data.message}`);
                }
            }
            
            // Se tem build configurado, não criar stack sem arquivos
            if (stackContent.includes('build:') || stackContent.includes('build:')) {
                console.log('\n⚠️ ATENÇÃO: Não é possível criar a stack automaticamente!');
                console.log('   O docker-compose.yml está configurado para fazer build,');
                console.log('   mas os arquivos não puderam ser enviados via API.');
                console.log('\n📋 Soluções:');
                console.log('   1. Faça upload manual via UI do Portainer:');
                console.log(`      - Acesse: ${PORTAINER_URL}`);
                console.log(`      - Vá em Stacks → Add Stack`);
                console.log(`      - Use Upload para enviar o arquivo: build-context-completo.tar.gz`);
                console.log('   2. Ou use Git Repository no Portainer');
                console.log('   3. Ou faça build local e use imagem pré-construída');
                console.log(`\n📦 Tarball criado: ${tarballCompleto} (${tarballCompletoBuffer.length} bytes)`);
                console.log('   Este arquivo pode ser enviado manualmente via UI do Portainer.');
                
                // Não limpar o tarball para o usuário poder usá-lo
                throw new Error('Upload de arquivos falhou. Faça upload manual via UI do Portainer.');
            }
            
            // Se não tem build, pode criar normalmente
            console.log('   Tentando método string (JSON)...');
            const payload = {
                Name: PORTAINER_STACK_NAME,
                StackFileContent: stackContent,
                EndpointID: parseInt(PORTAINER_ENDPOINT_ID),
                SwarmID: ''
            };

            try {
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
                
                console.log('✅ Stack criada (método string - sem arquivos)!');
                console.log('   ⚠️ Arquivos não foram enviados - faça upload manualmente via UI');
                console.log('   ID:', response.data.Id);
                
                // Limpar tarball temporário
                if (fs.existsSync(tarballCompleto)) {
                    fs.unlinkSync(tarballCompleto);
                }
                
                return response.data;
            } catch (stringError) {
                console.error('\n❌ Também falhou ao criar via método string');
                if (stringError.response) {
                    console.error(`   Status: ${stringError.response.status}`);
                    if (stringError.response.data?.message) {
                        console.error(`   Erro: ${stringError.response.data.message}`);
                    }
                }
                
                console.log(`\n📦 Tarball criado: ${tarballCompleto} (${tarballCompletoBuffer.length} bytes)`);
                console.log('   Faça upload manual via UI do Portainer.');
                
                throw stringError;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao criar stack:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        throw error;
    }
}

// Função para atualizar stack existente com upload de arquivos
async function atualizarStack(jwtToken, stackId, stackContent) {
    try {
        console.log('🔄 Atualizando stack existente com upload de arquivos...');
        console.log(`   Stack ID: ${stackId}`);

        // Criar tarball completo com docker-compose.yml e arquivos de build
        const tarballCompleto = await criarTarballCompleto(stackContent);
        const tarballCompletoBuffer = fs.readFileSync(tarballCompleto);
        
        // Criar FormData - o endpoint file espera apenas o tarball
        const formDataCompleto = new FormData();
        formDataCompleto.append('file', tarballCompletoBuffer, {
            filename: 'build-context.tar.gz',
            contentType: 'application/gzip'
        });

        console.log(`   Uploading tarball completo (${tarballCompletoBuffer.length} bytes)...`);

        try {
            // Tentar atualizar com arquivos via endpoint file
            const response = await axios.put(
                `${PORTAINER_URL}/api/stacks/${stackId}/file?endpointId=${PORTAINER_ENDPOINT_ID}`,
                formDataCompleto,
                {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        ...formDataCompleto.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 120000 // 2 minutos para upload
                }
            );

            console.log('✅ Stack atualizada com sucesso (com arquivos)!');
            
            // Limpar tarball temporário
            fs.unlinkSync(tarballCompleto);
            
            return response.data;
        } catch (fileError) {
            console.log('   ❌ Método com arquivo falhou');
            if (fileError.response) {
                console.log(`   Status: ${fileError.response.status}`);
                if (fileError.response.data?.message) {
                    console.log(`   Erro: ${fileError.response.data.message}`);
                }
            }
            
            // Não tentar atualizar sem arquivos se o docker-compose tem build
            // porque vai falhar quando tentar fazer build
            if (stackContent.includes('build:') || stackContent.includes('build:')) {
                console.log('\n⚠️ ATENÇÃO: Não é possível atualizar a stack automaticamente!');
                console.log('   O docker-compose.yml está configurado para fazer build,');
                console.log('   mas os arquivos não puderam ser enviados via API.');
                console.log('\n📋 Soluções:');
                console.log('   1. Faça upload manual via UI do Portainer:');
                console.log(`      - Acesse: ${PORTAINER_URL}`);
                console.log(`      - Vá em Stacks → ${PORTAINER_STACK_NAME} → Editor`);
                console.log(`      - Use Upload para enviar o arquivo: build-context-completo.tar.gz`);
                console.log('   2. Ou use Git Repository no Portainer');
                console.log('   3. Ou faça build local e use imagem pré-construída');
                console.log(`\n📦 Tarball criado: ${tarballCompleto} (${tarballCompletoBuffer.length} bytes)`);
                console.log('   Este arquivo pode ser enviado manualmente via UI do Portainer.');
                
                // Não limpar o tarball para o usuário poder usá-lo
                throw new Error('Upload de arquivos falhou. Faça upload manual via UI do Portainer.');
            }
            
            // Se não tem build, pode atualizar normalmente
            console.log('   Tentando método string (JSON)...');
            const payload = {
                StackFileContent: stackContent
            };

            try {
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

                console.log('✅ Stack atualizada (método string - sem arquivos)!');
                console.log('   ⚠️ Arquivos não foram enviados - faça upload manualmente via UI');
                
                // Limpar tarball temporário
                if (fs.existsSync(tarballCompleto)) {
                    fs.unlinkSync(tarballCompleto);
                }
                
                return response.data;
            } catch (stringError) {
                console.error('\n❌ Também falhou ao atualizar via método string');
                if (stringError.response) {
                    console.error(`   Status: ${stringError.response.status}`);
                    if (stringError.response.data?.message) {
                        console.error(`   Erro: ${stringError.response.data.message}`);
                    }
                }
                
                console.log(`\n📦 Tarball criado: ${tarballCompleto} (${tarballCompletoBuffer.length} bytes)`);
                console.log('   Faça upload manual via UI do Portainer.');
                
                throw stringError;
            }
        }
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

        // Verificar se está configurado para usar Git Repository
        if (GIT_REPOSITORY_URL) {
            console.log('📦 Usando Git Repository para deploy...\n');
            
            // Buscar stack existente
            const stackExistente = await buscarStack(token);

            if (stackExistente) {
                console.log(`📋 Stack "${PORTAINER_STACK_NAME}" encontrada (ID: ${stackExistente.Id})`);
                // Atualizar stack existente usando Git
                await atualizarStackComGit(token, stackExistente.Id);
            } else {
                console.log(`📋 Stack "${PORTAINER_STACK_NAME}" não encontrada`);
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

