require('dotenv').config();
const axios = require('axios');

const API_TOKEN = 'kjvHiQNRxutJKrlFApVWhTcj';
const CPF_TESTE = '05585016482';
const url = `https://completa.workbuscas.com/api?token=${API_TOKEN}&modulo=cpf&consulta=${CPF_TESTE}`;

console.log('🔍 Testando diretamente com o token fornecido...');
console.log(`📍 URL: ${url.replace(API_TOKEN, 'TOKEN_HIDDEN')}\n`);

async function testar() {
    try {
        const response = await axios.get(url, {
            timeout: 60000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('✅ Status:', response.status);
        console.log('✅ Status Code da API:', response.data.status);
        console.log('');

        // Buscar RG em TODOS os lugares possíveis
        const dados = response.data;
        console.log('🔍 BUSCA COMPLETA DE RG:\n');

        // 1. registroGeral
        console.log('1. registroGeral:', JSON.stringify(dados.registroGeral));

        // 2. DadosBasicos
        if (dados.DadosBasicos) {
            console.log('\n2. DadosBasicos.rg:', dados.DadosBasicos.rg);
            console.log('   DadosBasicos.identidade:', dados.DadosBasicos.identidade);
            console.log('   DadosBasicos.numeroIdentidade:', dados.DadosBasicos.numeroIdentidade);
        }

        // 3. listaDocumentos
        if (dados.listaDocumentos) {
            console.log('\n3. listaDocumentos:', JSON.stringify(dados.listaDocumentos, null, 2));
        }

        // 4. Busca recursiva por qualquer campo com "rg" no nome
        console.log('\n4. Busca recursiva por campos contendo "rg":');
        function buscarCampo(obj, path = '', campo = 'rg') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const value = obj[key];
                    
                    if (key.toLowerCase().includes(campo.toLowerCase())) {
                        console.log(`   ✅ ${currentPath}: ${JSON.stringify(value)}`);
                    }
                    
                    if (typeof value === 'object' && value !== null) {
                        if (Array.isArray(value)) {
                            value.forEach((item, idx) => {
                                if (typeof item === 'object' && item !== null) {
                                    buscarCampo(item, `${currentPath}[${idx}]`, campo);
                                }
                            });
                        } else {
                            buscarCampo(value, currentPath, campo);
                        }
                    }
                }
            }
        }
        buscarCampo(dados);

        // Salvar resposta completa em arquivo para análise
        const fs = require('fs');
        fs.writeFileSync('resposta-api-completa.json', JSON.stringify(dados, null, 2));
        console.log('\n💾 Resposta completa salva em: resposta-api-completa.json');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testar();

