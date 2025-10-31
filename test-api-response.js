require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://completa.workbuscas.com/api';
const API_TOKEN = process.env.API_TOKEN;

// CPF de teste (substitua por um CPF válido que você sabe que retorna dados)
const CPF_TESTE = '04435790599'; // CPF do exemplo original

async function testarAPI() {
    if (!API_TOKEN) {
        console.error('❌ API_TOKEN não definido no .env');
        process.exit(1);
    }

    const url = `${API_BASE_URL}?token=${API_TOKEN}&modulo=cpf&consulta=${CPF_TESTE}`;
    console.log('🔍 Testando endpoint da API...');
    console.log(`📍 URL: ${url.replace(API_TOKEN, 'TOKEN_HIDDEN')}`);
    console.log('');

    try {
        const response = await axios.get(url, {
            timeout: 30000
        });

        console.log('✅ Resposta recebida com sucesso!');
        console.log('');
        console.log('📋 Estrutura completa da resposta:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('');
        console.log('📊 Campos principais encontrados:');
        console.log('- Nível raiz:', Object.keys(response.data || {}).join(', '));
        
        if (response.data.DadosBasicos) {
            console.log('- DadosBasicos:', Object.keys(response.data.DadosBasicos).join(', '));
            
            // Procurar por RG
            console.log('');
            console.log('🔍 Buscando campos relacionados a RG:');
            const basicos = response.data.DadosBasicos;
            console.log(`  - rg: ${basicos.rg || 'NÃO ENCONTRADO'}`);
            console.log(`  - identidade: ${basicos.identidade || 'NÃO ENCONTRADO'}`);
            console.log(`  - numeroIdentidade: ${basicos.numeroIdentidade || 'NÃO ENCONTRADO'}`);
            console.log(`  - rgDataExpedicao: ${basicos.rgDataExpedicao || 'NÃO ENCONTRADO'}`);
            console.log(`  - dataExpedicao: ${basicos.dataExpedicao || 'NÃO ENCONTRADO'}`);
            console.log(`  - dataEmissao: ${basicos.dataEmissao || 'NÃO ENCONTRADO'}`);
        }

        if (response.data.listaDocumentos) {
            console.log('');
            console.log('📄 Documentos encontrados:');
            const docs = response.data.listaDocumentos;
            console.log('- listaDocumentos:', Object.keys(docs).join(', '));
            
            if (docs.RG || docs.rg) {
                console.log('  - RG encontrado em listaDocumentos:', docs.RG || docs.rg);
            }
        }

        // Procurar RG em todos os níveis
        console.log('');
        console.log('🔍 Busca recursiva por campos contendo "rg" ou "RG":');
        function buscarRG(obj, path = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const value = obj[key];
                    
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        buscarRG(value, currentPath);
                    } else if (key.toLowerCase().includes('rg') || key.toLowerCase().includes('identidade')) {
                        console.log(`  ✅ ${currentPath}: ${value}`);
                    }
                }
            }
        }
        buscarRG(response.data);

    } catch (error) {
        console.error('❌ Erro ao testar API:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testarAPI();

