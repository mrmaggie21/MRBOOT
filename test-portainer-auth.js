require('dotenv').config();
const axios = require('axios');

const PORTAINER_URL = process.env.PORTAINER_URL || 'https://portainer.lemontech.cloud';
const PORTAINER_USERNAME = process.env.PORTAINER_USERNAME || 'lemontech';
const PORTAINER_PASSWORD = process.env.PORTAINER_PASSWORD || 'Lemon@Technology1';

async function testarAuth() {
    try {
        console.log('🔐 Testando autenticação no Portainer...\n');
        console.log(`URL: ${PORTAINER_URL}/api/auth\n`);
        
        // Testar autenticação
        const authResponse = await axios.post(`${PORTAINER_URL}/api/auth`, {
            Username: PORTAINER_USERNAME,
            Password: PORTAINER_PASSWORD
        });

        console.log('✅ Autenticação OK');
        console.log('Resposta completa:', JSON.stringify(authResponse.data, null, 2));
        
        const token = authResponse.data.jwt || authResponse.data.token || authResponse.data.accessToken;
        
        if (!token) {
            console.error('❌ Token não encontrado!');
            return;
        }
        
        console.log(`\n🔑 Token obtido: ${token.substring(0, 30)}...\n`);
        
        // Testar listar endpoints - tentar X-API-Key primeiro
        console.log('🧪 Testando listagem de endpoints (X-API-Key)...');
        try {
            const endpointsResponse = await axios.get(`${PORTAINER_URL}/api/endpoints`, {
                headers: { 'X-API-Key': token }
            });
            console.log('✅ Endpoints OK');
            console.log(`   Encontrados ${endpointsResponse.data.length} endpoints`);
            endpointsResponse.data.forEach(e => {
                console.log(`   - ${e.Name} (ID: ${e.Id})`);
            });
        } catch (err) {
            console.error('❌ Erro ao listar endpoints:', err.message);
            if (err.response) {
                console.error('   Status:', err.response.status);
                console.error('   Data:', JSON.stringify(err.response.data));
            }
        }
        
        // Testar também com Authorization Bearer
        console.log('\n🧪 Testando com Authorization Bearer...');
        try {
            const endpointsResponse2 = await axios.get(`${PORTAINER_URL}/api/endpoints`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Authorization Bearer OK');
            console.log(`   Encontrados ${endpointsResponse2.data.length} endpoints`);
        } catch (err) {
            console.error('❌ Authorization Bearer também falhou');
        }
        
        // Testar listar stacks
        console.log('\n🧪 Testando listagem de stacks...');
        try {
            const stacksResponse = await axios.get(`${PORTAINER_URL}/api/stacks`, {
                headers: { 'X-API-Key': token }
            });
            console.log('✅ Stacks OK');
            console.log(`   Encontradas ${stacksResponse.data?.length || 0} stacks`);
            if (stacksResponse.data && stacksResponse.data.length > 0) {
                stacksResponse.data.forEach(s => {
                    console.log(`   - ${s.Name} (ID: ${s.Id}, Endpoint: ${s.EndpointId})`);
                });
            }
        } catch (err) {
            console.error('❌ Erro ao listar stacks:', err.message);
            if (err.response) {
                console.error('   Status:', err.response.status);
                console.error('   Data:', JSON.stringify(err.response.data));
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data));
        }
    }
}

testarAuth();

