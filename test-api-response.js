require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://completa.workbuscas.com/api';
const API_TOKEN = process.env.API_TOKEN || 'kjvHiQNRxutJKrlFApVWhTcj';

// CPF de teste (substitua por um CPF válido que você sabe que retorna dados)
const CPF_TESTE = '05585016482'; // CPF que retorna RG

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

        // Verificar registroGeral (campo principal da API para RG)
        if (response.data.registroGeral !== undefined) {
            console.log('');
            console.log('🪪 Campo registroGeral encontrado:');
            console.log(JSON.stringify(response.data.registroGeral, null, 2));
            if (response.data.registroGeral) {
                console.log(`  - numero: ${response.data.registroGeral.numero || 'NÃO ENCONTRADO'}`);
                console.log(`  - rg: ${response.data.registroGeral.rg || 'NÃO ENCONTRADO'}`);
                console.log(`  - dataExpedicao: ${response.data.registroGeral.dataExpedicao || 'NÃO ENCONTRADO'}`);
                console.log(`  - dataEmissao: ${response.data.registroGeral.dataEmissao || 'NÃO ENCONTRADO'}`);
                console.log(`  - orgaoExpedidor: ${response.data.registroGeral.orgaoExpedidor || 'NÃO ENCONTRADO'}`);
            } else {
                console.log('  ⚠️ registroGeral está null');
            }
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

        // Busca recursiva profunda por RG
        console.log('');
        console.log('🔍 Busca recursiva profunda por campos contendo "rg", "RG", "identidade", "registro":');
        const camposRG = [];
        function buscarRG(obj, path = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const value = obj[key];
                    const keyLower = key.toLowerCase();
                    
                    // Verificar se a chave contém alguma palavra relacionada a RG
                    if (keyLower.includes('rg') || 
                        keyLower.includes('identidade') || 
                        keyLower.includes('registro') ||
                        keyLower.includes('documento')) {
                        camposRG.push({
                            path: currentPath,
                            value: value,
                            type: typeof value
                        });
                    }
                    
                    // Continuar busca recursiva
                    if (typeof value === 'object' && value !== null) {
                        if (Array.isArray(value)) {
                            value.forEach((item, index) => {
                                if (typeof item === 'object' && item !== null) {
                                    buscarRG(item, `${currentPath}[${index}]`);
                                }
                            });
                        } else {
                            buscarRG(value, currentPath);
                        }
                    }
                }
            }
        }
        buscarRG(response.data);
        
        console.log('');
        console.log(`📋 Total de ${camposRG.length} campos encontrados relacionados a RG/identidade:`);
        camposRG.forEach(campo => {
            console.log(`  ✅ ${campo.path}: ${JSON.stringify(campo.value)} (${campo.type})`);
        });
        
        // Verificar listaDocumentos em detalhe
        if (response.data.listaDocumentos) {
            console.log('');
            console.log('📄 Análise detalhada de listaDocumentos:');
            console.log(JSON.stringify(response.data.listaDocumentos, null, 2));
        }

    } catch (error) {
        console.error('❌ Erro ao testar API:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testarAPI();

