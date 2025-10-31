require('dotenv').config();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

const WEBSHARE_API_KEY = process.env.WEBSHARE_API_KEY;
const WEBSHARE_API_URL = process.env.WEBSHARE_API_URL || 'https://proxy.webshare.io/api/v2/proxy/list';
const API_BASE_URL = process.env.API_BASE_URL || 'https://completa.workbuscas.com/api';
const API_TOKEN = process.env.API_TOKEN;

// Função para criar agent do proxy
function createProxyAgent(proxy) {
    if (!proxy) return null;
    const proxyUrl = proxy.url || `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    return {
        https: new HttpsProxyAgent(proxyUrl),
        http: new HttpProxyAgent(proxyUrl)
    };
}

// Função para buscar proxies
async function buscarProxies() {
    try {
        console.log('🔍 Buscando proxies BR do WebShare...\n');
        
        const response = await axios.get(WEBSHARE_API_URL, {
            headers: {
                'Authorization': `Token ${WEBSHARE_API_KEY}`
            },
            params: {
                mode: 'direct',
                page: 1,
                page_size: 100,
                country_code: 'BR'
            },
            timeout: 30000
        });

        if (response.data && response.data.results && response.data.results.length > 0) {
            const todosProxies = response.data.results.map(proxy => ({
                host: proxy.proxy_address,
                port: proxy.port,
                username: proxy.username,
                password: proxy.password,
                country: proxy.country_code || proxy.country,
                url: `http://${proxy.username}:${proxy.password}@${proxy.proxy_address}:${proxy.port}`
            }));

            const proxiesBR = todosProxies.filter(proxy => {
                const country = (proxy.country || '').toUpperCase();
                return country === 'BR' || country === 'BRAZIL';
            });

            console.log(`✅ ${proxiesBR.length} proxies BR encontrados\n`);
            return proxiesBR;
        }

        return [];
    } catch (error) {
        console.error('❌ Erro ao buscar proxies:', error.message);
        return [];
    }
}

// Teste 1: Testar conexão básica (Google)
async function testeConexaoBasica(proxy, timeout = 10000) {
    try {
        const agents = createProxyAgent(proxy);
        const axiosInstance = axios.create({
            httpsAgent: agents.https,
            httpAgent: agents.http,
            timeout: timeout
        });

        const startTime = Date.now();
        await axiosInstance.get('https://www.google.com', {
            validateStatus: () => true
        });
        const tempo = Date.now() - startTime;

        return { sucesso: true, tempo, erro: null };
    } catch (error) {
        return { sucesso: false, tempo: null, erro: error.message };
    }
}

// Teste 2: Testar API WorkBuscas
async function testeAPIWorkBuscas(proxy, timeout = 30000) {
    try {
        const agents = createProxyAgent(proxy);
        const axiosInstance = axios.create({
            httpsAgent: agents.https,
            httpAgent: agents.http,
            timeout: timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const testCPF = '04435790599'; // CPF de teste
        const url = `${API_BASE_URL}?token=${API_TOKEN}&modulo=cpf&consulta=${testCPF}`;

        const startTime = Date.now();
        const response = await axiosInstance.get(url);
        const tempo = Date.now() - startTime;

        return { 
            sucesso: response.status === 200, 
            tempo, 
            status: response.status,
            statusAPI: response.data?.status,
            erro: null 
        };
    } catch (error) {
        return { 
            sucesso: false, 
            tempo: null, 
            status: error.response?.status || 'N/A',
            erro: error.message 
        };
    }
}

// Teste 3: Testar Telegram API (similar ao bot)
async function testeTelegramAPI(proxy, timeout = 30000) {
    try {
        const agents = createProxyAgent(proxy);
        const axiosInstance = axios.create({
            httpsAgent: agents.https,
            httpAgent: agents.http,
            timeout: timeout
        });

        // Testar endpoint do Telegram (não precisa de token, só verifica conectividade)
        const startTime = Date.now();
        await axiosInstance.get('https://api.telegram.org/', {
            validateStatus: () => true
        });
        const tempo = Date.now() - startTime;

        return { sucesso: true, tempo, erro: null };
    } catch (error) {
        return { sucesso: false, tempo: null, erro: error.message };
    }
}

// Função principal de teste
async function testarProxy(proxy, index, total) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Testando Proxy ${index + 1}/${total}: ${proxy.host}:${proxy.port}`);
    console.log(`${'='.repeat(70)}`);

    const resultados = {
        proxy: `${proxy.host}:${proxy.port}`,
        testes: {}
    };

    // Teste 1: Conexão básica (Google)
    console.log('\n🧪 Teste 1: Conexão básica (Google.com)...');
    const teste1 = await testeConexaoBasica(proxy, 10000);
    resultados.testes.conexaoBasica = teste1;
    
    if (teste1.sucesso) {
        console.log(`   ✅ SUCESSO - Tempo: ${teste1.tempo}ms`);
    } else {
        console.log(`   ❌ FALHOU - Erro: ${teste1.erro?.substring(0, 100)}`);
    }

    // Teste 2: Telegram API
    console.log('\n🧪 Teste 2: Conectividade Telegram API...');
    const teste2 = await testeTelegramAPI(proxy, 30000);
    resultados.testes.telegram = teste2;
    
    if (teste2.sucesso) {
        console.log(`   ✅ SUCESSO - Tempo: ${teste2.tempo}ms`);
    } else {
        console.log(`   ❌ FALHOU - Erro: ${teste2.erro?.substring(0, 100)}`);
    }

    // Teste 3: API WorkBuscas (o mais importante)
    console.log('\n🧪 Teste 3: API WorkBuscas (consultar CPF)...');
    console.log('   ⏳ Aguarde... (pode demorar até 60s)');
    
    const teste3 = await testeAPIWorkBuscas(proxy, 60000);
    resultados.testes.workbuscas = teste3;
    
    if (teste3.sucesso && teste3.statusAPI === 200) {
        console.log(`   ✅ SUCESSO - Tempo: ${teste3.tempo}ms - Status: ${teste3.status} - API Status: ${teste3.statusAPI}`);
    } else if (teste3.sucesso) {
        console.log(`   ⚠️ CONECTOU mas API retornou status: ${teste3.statusAPI}`);
    } else {
        console.log(`   ❌ FALHOU - Erro: ${teste3.erro?.substring(0, 150)}`);
        if (teste3.status !== 'N/A') {
            console.log(`   Status HTTP: ${teste3.status}`);
        }
    }

    // Resumo
    const totalTestes = 3;
    const sucessos = [teste1.sucesso, teste2.sucesso, teste3.sucesso].filter(Boolean).length;
    
    console.log(`\n📈 Resumo: ${sucessos}/${totalTestes} testes passaram`);
    
    if (sucessos === totalTestes) {
        console.log(`✅ Proxy ${proxy.host}:${proxy.port} está FUNCIONAL\n`);
    } else if (sucessos > 0) {
        console.log(`⚠️ Proxy ${proxy.host}:${proxy.port} está PARCIALMENTE funcional\n`);
    } else {
        console.log(`❌ Proxy ${proxy.host}:${proxy.port} está INOPERANTE\n`);
    }

    return resultados;
}

// Função principal
async function main() {
    console.log('🚀 Iniciando testes de proxies...\n');

    if (!WEBSHARE_API_KEY) {
        console.error('❌ Erro: WEBSHARE_API_KEY não definido no .env');
        process.exit(1);
    }

    if (!API_TOKEN) {
        console.error('❌ Erro: API_TOKEN não definido no .env');
        process.exit(1);
    }

    // Buscar proxies
    const proxies = await buscarProxies();

    if (proxies.length === 0) {
        console.error('❌ Nenhum proxy BR encontrado!');
        process.exit(1);
    }

    console.log(`\n🧪 Vou testar os primeiros ${Math.min(5, proxies.length)} proxies...\n`);
    
    const proxiesParaTestar = proxies.slice(0, Math.min(5, proxies.length));
    const todosResultados = [];

    // Testar cada proxy
    for (let i = 0; i < proxiesParaTestar.length; i++) {
        const resultado = await testarProxy(proxiesParaTestar[i], i, proxiesParaTestar.length);
        todosResultados.push(resultado);
        
        // Delay entre testes
        if (i < proxiesParaTestar.length - 1) {
            console.log('⏳ Aguardando 3 segundos antes do próximo teste...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Relatório final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(70));

    const proxiesFuncionais = todosResultados.filter(r => 
        r.testes.conexaoBasica.sucesso && 
        r.testes.telegram.sucesso && 
        r.testes.workbuscas.sucesso &&
        r.testes.workbuscas.statusAPI === 200
    );

    const proxiesParciais = todosResultados.filter(r => 
        (r.testes.conexaoBasica.sucesso || r.testes.telegram.sucesso || r.testes.workbuscas.sucesso) &&
        !(r.testes.conexaoBasica.sucesso && r.testes.telegram.sucesso && r.testes.workbuscas.sucesso && r.testes.workbuscas.statusAPI === 200)
    );

    const proxiesInoperantes = todosResultados.filter(r => 
        !r.testes.conexaoBasica.sucesso && 
        !r.testes.telegram.sucesso && 
        !r.testes.workbuscas.sucesso
    );

    console.log(`\n✅ Proxies FUNCIONAIS: ${proxiesFuncionais.length}`);
    proxiesFuncionais.forEach(r => {
        console.log(`   - ${r.proxy}`);
        console.log(`     Google: ${r.testes.conexaoBasica.tempo}ms | Telegram: ${r.testes.telegram.tempo}ms | WorkBuscas: ${r.testes.workbuscas.tempo}ms`);
    });

    console.log(`\n⚠️ Proxies PARCIAIS: ${proxiesParciais.length}`);
    proxiesParciais.forEach(r => {
        const testes = [];
        if (r.testes.conexaoBasica.sucesso) testes.push('Google');
        if (r.testes.telegram.sucesso) testes.push('Telegram');
        if (r.testes.workbuscas.sucesso) testes.push('WorkBuscas');
        console.log(`   - ${r.proxy} (funciona: ${testes.join(', ') || 'nenhum'})`);
    });

    console.log(`\n❌ Proxies INOPERANTES: ${proxiesInoperantes.length}`);
    proxiesInoperantes.forEach(r => {
        console.log(`   - ${r.proxy}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`📈 Estatísticas:`);
    console.log(`   Total testado: ${todosResultados.length}`);
    console.log(`   Funcionais: ${proxiesFuncionais.length} (${Math.round(proxiesFuncionais.length/todosResultados.length*100)}%)`);
    console.log(`   Parciais: ${proxiesParciais.length} (${Math.round(proxiesParciais.length/todosResultados.length*100)}%)`);
    console.log(`   Inoperantes: ${proxiesInoperantes.length} (${Math.round(proxiesInoperantes.length/todosResultados.length*100)}%)`);
    console.log('='.repeat(70) + '\n');
}

// Executar
main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

