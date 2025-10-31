require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

// Carregar variáveis de ambiente
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_TOKEN = process.env.API_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL || 'https://completa.workbuscas.com/api';
const WEBSHARE_API_KEY = process.env.WEBSHARE_API_KEY;
const WEBSHARE_API_URL = process.env.WEBSHARE_API_URL || 'https://proxy.webshare.io/api/v2/proxy/list';
const USE_PROXY = process.env.USE_PROXY === 'true' || process.env.USE_PROXY === '1' || process.env.USE_PROXY === 'yes';

// Lista de proxies
let proxies = [];
let currentProxyIndex = 0;

// Função para buscar proxies do WebShare (sem usar proxy, pois ainda não temos)
async function buscarProxiesWebShare() {
    try {
        if (!WEBSHARE_API_KEY) {
            console.error('⚠️ WEBSHARE_API_KEY não definido');
            return [];
        }

        console.log(`🔍 Buscando proxies BR do WebShare...`);
        console.log(`   URL: ${WEBSHARE_API_URL}`);
        
        // Tentar primeiro com filtro de país BR
        let response;
        try {
            response = await axios.get(WEBSHARE_API_URL, {
                headers: {
                    'Authorization': `Token ${WEBSHARE_API_KEY}`
                },
                params: {
                    mode: 'direct',
                    page: 1,
                    page_size: 100,
                    country_code: 'BR' // Filtrar apenas proxies do Brasil
                },
                timeout: 30000
            });
        } catch (err) {
            // Se falhar, tentar sem filtro de país
            console.log('   Filtro de país não funcionou, buscando todos os proxies...');
            response = await axios.get(WEBSHARE_API_URL, {
                headers: {
                    'Authorization': `Token ${WEBSHARE_API_KEY}`
                },
                params: {
                    mode: 'direct',
                    page: 1,
                    page_size: 100
                },
                timeout: 30000
            });
        }

        if (response.data && response.data.results && response.data.results.length > 0) {
            // Filtrar apenas proxies do Brasil (BR)
            const todosProxies = response.data.results.map(proxy => ({
                host: proxy.proxy_address,
                port: proxy.port,
                username: proxy.username,
                password: proxy.password,
                country: proxy.country_code || proxy.country,
                url: `http://${proxy.username}:${proxy.password}@${proxy.proxy_address}:${proxy.port}`
            }));

            // Filtrar apenas BR
            proxies = todosProxies.filter(proxy => {
                const country = (proxy.country || '').toUpperCase();
                const isBR = country === 'BR' || country === 'BRAZIL';
                return isBR;
            });
            
            console.log(`📊 Total de proxies retornados: ${todosProxies.length}`);
            console.log(`🇧🇷 Proxies do Brasil (BR) filtrados: ${proxies.length}`);
            
            if (proxies.length > 0) {
                console.log(`✅ ${proxies.length} proxies BR carregados do WebShare`);
                console.log(`   Exemplo: ${proxies[0].host}:${proxies[0].port} (${proxies[0].country || 'BR'})`);
                
                // Mostrar países dos outros proxies se não encontrar BR suficiente
                if (todosProxies.length > proxies.length && todosProxies.length > 0) {
                    const paises = [...new Set(todosProxies.map(p => (p.country || 'N/A').toUpperCase()))];
                    console.log(`   Outros países disponíveis: ${paises.join(', ')}`);
                }
                
                // Testar os primeiros proxies para garantir que funcionam (limitado a 10 para não demorar muito)
                console.log(`\n🧪 Testando conectividade dos proxies (máximo 10)...`);
                const proxiesParaTestar = proxies.slice(0, Math.min(10, proxies.length));
                const proxiesValidos = [];
                
                for (let i = 0; i < proxiesParaTestar.length; i++) {
                    const resultado = await testarProxy(proxiesParaTestar[i], 8000); // 8s timeout para teste
                    if (resultado.valido) {
                        proxiesValidos.push(proxiesParaTestar[i]);
                    }
                }
                
                if (proxiesValidos.length > 0) {
                    console.log(`✅ ${proxiesValidos.length}/${proxiesParaTestar.length} proxies testados são válidos`);
                    // Manter apenas proxies válidos + os não testados
                    proxies = [...proxiesValidos, ...proxies.slice(proxiesParaTestar.length)];
                    console.log(`📊 Total de proxies disponíveis: ${proxies.length}`);
                } else {
                    console.warn(`⚠️ Nenhum proxy testado funcionou, usando todos mesmo assim`);
                }
                console.log('');
            } else {
                console.warn(`⚠️ Nenhum proxy BR encontrado! Total de proxies: ${todosProxies.length}`);
                // Tentar buscar todos e filtrar manualmente se necessário
                if (todosProxies.length > 0) {
                    const paises = [...new Set(todosProxies.map(p => (p.country || 'N/A').toUpperCase()))];
                    console.log(`   Países disponíveis: ${paises.join(', ')}`);
                    console.log(`   Primeiro proxy: ${todosProxies[0].host} - País: ${todosProxies[0].country || 'N/A'}`);
                }
            }
            return proxies;
        }
        
        console.error('⚠️ Nenhum proxy encontrado na resposta da API');
        if (response.data) {
            console.error('   Resposta:', JSON.stringify(response.data).substring(0, 200));
            // Tentar buscar sem filtro de país se não encontrar BR
            if (response.data.results && response.data.results.length > 0) {
                console.log('   Tentando filtrar manualmente proxies BR...');
                const todosProxies = response.data.results.filter(p => {
                    const country = (p.country_code || p.country || '').toUpperCase();
                    return country === 'BR' || country === 'BRAZIL';
                });
                
                if (todosProxies.length > 0) {
                    proxies = todosProxies.map(proxy => ({
                        host: proxy.proxy_address,
                        port: proxy.port,
                        username: proxy.username,
                        password: proxy.password,
                        country: proxy.country_code || proxy.country,
                        url: `http://${proxy.username}:${proxy.password}@${proxy.proxy_address}:${proxy.port}`
                    }));
                    console.log(`✅ ${proxies.length} proxies BR encontrados após filtro manual`);
                    return proxies;
                }
            }
        }
        return [];
    } catch (error) {
        console.error('❌ Erro ao buscar proxies do WebShare:');
        console.error(`   Mensagem: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        return [];
    }
}

// Função para testar conectividade de um proxy
async function testarProxy(proxy, timeout = 10000) {
    try {
        const proxyUrl = proxy.url || `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
        const agents = createProxyAgent(proxy);
        
        const startTime = Date.now();
        
        // Testar com uma requisição simples (Google)
        const testAxios = axios.create({
            httpsAgent: agents.https,
            httpAgent: agents.http,
            timeout: timeout
        });
        
        await testAxios.get('https://www.google.com', {
            timeout: timeout,
            validateStatus: () => true // Aceitar qualquer status
        });
        
        const tempoResposta = Date.now() - startTime;
        
        console.log(`   ✅ Proxy ${proxy.host}:${proxy.port} testado - ${tempoResposta}ms`);
        return { valido: true, tempo: tempoResposta };
    } catch (error) {
        console.log(`   ❌ Proxy ${proxy.host}:${proxy.port} falhou: ${error.message.substring(0, 50)}`);
        return { valido: false, tempo: null };
    }
}

// Função para obter próximo proxy (rotação)
function getNextProxy() {
    if (proxies.length === 0) return null;
    
    const proxy = proxies[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    return proxy;
}

// Função para criar agent do proxy
function createProxyAgent(proxy) {
    if (!proxy) return null;
    
    const proxyUrl = proxy.url || `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    return {
        https: new HttpsProxyAgent(proxyUrl),
        http: new HttpProxyAgent(proxyUrl)
    };
}

// Configurar axios com proxy
function createAxiosInstance(useProxy = true, timeoutCustom = 60000) {
    const config = {
        timeout: timeoutCustom, // Timeout aumentado para 60s
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    };

    // Só usar proxy se USE_PROXY estiver ativado E tiver proxies disponíveis
    if (useProxy && USE_PROXY && proxies.length > 0) {
        const proxy = getNextProxy();
        if (proxy) {
            const agents = createProxyAgent(proxy);
            config.httpsAgent = agents.https;
            config.httpAgent = agents.http;
            console.log(`🌐 Usando proxy: ${proxy.host}:${proxy.port}`);
        }
    } else if (useProxy && USE_PROXY && proxies.length === 0) {
        console.log('⚠️ Proxies solicitados mas nenhum disponível. Fazendo requisição direta.');
    }

    return axios.create(config);
}

// Variável global do bot
let bot;

// Função para inicializar o bot com proxy
function inicializarBot() {
    const botOptions = {
        polling: true,
        request: {}
    };

    // Se USE_PROXY estiver ativado E tiver proxies, configurar para o bot também
    if (USE_PROXY && proxies.length > 0) {
        const proxy = getNextProxy();
        if (proxy) {
            const proxyUrl = proxy.url || `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
            const agents = createProxyAgent(proxy);
            
            // Configurar proxy de múltiplas formas para garantir compatibilidade
            // 1. Via agent (recomendado)
            botOptions.request.httpsAgent = agents.https;
            botOptions.request.httpAgent = agents.http;
            botOptions.request.agent = agents.https; // Para compatibilidade com versões antigas
            
            // 2. Via proxy URL (para módulos que suportam)
            botOptions.request.proxy = proxyUrl;
            
            // 3. Via variáveis de ambiente (como fallback)
            process.env.HTTPS_PROXY = proxyUrl;
            process.env.HTTP_PROXY = proxyUrl;
            process.env.https_proxy = proxyUrl;
            process.env.http_proxy = proxyUrl;
            
            console.log(`🌐 Bot configurado com proxy: ${proxy.host}:${proxy.port}`);
            console.log(`🔗 URL do proxy: http://${proxy.username}:****@${proxy.host}:${proxy.port}`);
            console.log(`✅ Proxy configurado via agent e variáveis de ambiente`);
        } else {
            console.warn('⚠️ Nenhum proxy disponível para o bot');
        }
    } else if (!USE_PROXY) {
        console.log('ℹ️  Proxies desativados. Bot funcionando sem proxy.');
    } else {
        console.warn('⚠️ Nenhum proxy disponível. Bot funcionando sem proxy.');
    }

    try {
        bot = new TelegramBot(TELEGRAM_TOKEN, botOptions);
        console.log('✅ Bot inicializado');
        return bot;
    } catch (error) {
        console.error('❌ Erro ao inicializar bot:', error.message);
        throw error;
    }
}

// Função para formatar CPF (remove caracteres não numéricos)
function formatarCPF(cpf) {
    return cpf.replace(/\D/g, '');
}

// Função para validar CPF (verificação básica)
function validarCPF(cpf) {
    cpf = formatarCPF(cpf);
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    return true;
}

// Função para consultar CPF na API com retry e proxy
async function consultarCPF(cpf, maxRetries = 5, consultaId = '') {
    const cpfFormatado = formatarCPF(cpf);
    const url = `${API_BASE_URL}?token=${API_TOKEN}&modulo=cpf&consulta=${cpfFormatado}`;
    const logPrefix = consultaId ? `[${consultaId}]` : '';
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Timeout maior: 90 segundos para primeira tentativa, 60s para outras
            const timeout = attempt === 0 ? 90000 : 60000;
            const axiosInstance = createAxiosInstance(true, timeout);
            
            const startTime = Date.now();
            const response = await axiosInstance.get(url);
            const tempoTotal = Date.now() - startTime;
            
            // Logs removidos - apenas erros críticos serão logados
            
            // A API pode retornar dados em diferentes estruturas
            // Aceitar se tem status 200 OU se tem campos principais
            if (response.data) {
                // Se tem status 404 (CPF não encontrado), não retornar dados
                if (response.data.status === 404 || response.data.statusMsg === 'Not found') {
                    return null;
                }
                
                // Se tem status 200, retornar
                if (response.data.status === 200) {
                    return response.data;
                }
                
                // Se não tem status mas tem campos principais, também aceitar
                if (response.data.DadosBasicos || response.data.dados || response.data.data) {
                    return response.data;
                }
                
                // Se tem algum conteúdo válido, retornar mesmo assim (pode ser uma estrutura diferente)
                const keys = Object.keys(response.data);
                // Ignorar respostas que só têm status, statusMsg, reason (são erros)
                const camposValidos = keys.filter(k => !['status', 'statusMsg', 'reason', 'contate'].includes(k));
                if (camposValidos.length > 0) {
                    return response.data;
                }
            }
            
            return null;
        } catch (error) {
            if (attempt < maxRetries - 1) {
                // Tentar próximo proxy com delay maior
                const delay = (attempt + 1) * 2000; // 2s, 4s, 6s...
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                return null;
            }
        }
    }
    
    return null;
}

// Função para processar consulta de CPF
async function processarConsulta(chatId, cpf, username = null, firstName = null) {
    if (!validarCPF(cpf)) {
        bot.sendMessage(chatId, 
            '❌ CPF inválido!\n\n' +
            'Por favor, use um CPF válido no formato:\n' +
            '• 123.456.789-00\n' +
            '• 12345678900\n' +
            '• 123 456 789 00\n\n' +
            'Use /help para mais informações.'
        );
        return;
    }

    try {
        // Log simples: apenas usuário
        const userInfo = username || firstName || `ID: ${chatId}`;
        console.log(`📥 Consulta - Usuário: ${userInfo} | CPF: ${cpf.substring(0, 3)}***`);
        
        // Enviar mensagem de "processando"
        const processingMsg = await bot.sendMessage(chatId, '⏳ Consultando CPF... Por favor, aguarde.', {
            parse_mode: 'Markdown'
        });

        // Consultar CPF (sem logs detalhados)
        const dados = await consultarCPF(cpf, 5, '');

        // Remover mensagem de processamento
        bot.deleteMessage(chatId, processingMsg.message_id);

        // Validar se há dados válidos (verificar campos principais ou se tem dados dentro)
        if (!dados || (!dados.DadosBasicos && !dados.dados && !dados.data)) {
            bot.sendMessage(chatId, '❌ Não foi possível obter dados para este CPF. Verifique se o CPF está correto ou tente novamente.');
            return;
        }

        // Enviar resultado (agora retorna array de mensagens)
        const mensagens = formatarResposta(dados);
        // Enviar todas as mensagens
        for (let i = 0; i < mensagens.length; i++) {
            // Verificar tamanho antes de enviar (segurança extra)
            if (mensagens[i].length > 4096) {
                // Se ainda exceder, dividir novamente
                const partes = dividirMensagens(mensagens[i], 3900);
                for (const parte of partes) {
                    await bot.sendMessage(chatId, parte, { 
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true 
                    });
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } else {
                await bot.sendMessage(chatId, mensagens[i], { 
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true 
                });
            }
            // Pequeno delay entre mensagens para evitar rate limit
            if (i < mensagens.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        console.log(`✅ Consulta finalizada - ${userInfo}`);
    } catch (error) {
        console.error(`❌ Erro na consulta - ${userInfo}:`, error.message);
        bot.sendMessage(chatId, '❌ Erro ao processar sua consulta. Tente novamente mais tarde.');
    }
}

// Função auxiliar para dividir texto em chunks menores que 3900 caracteres
function dividirMensagens(texto, limite = 3900) {
    if (texto.length <= limite) {
        return [texto];
    }
    
    const mensagens = [];
    let parteAtual = '';
    const linhas = texto.split('\n');
    
    for (const linha of linhas) {
        // Se a linha sozinha é maior que o limite, dividir por palavras
        if (linha.length > limite) {
            // Salvar parte atual se houver
            if (parteAtual.trim().length > 0) {
                mensagens.push(parteAtual.trim());
                parteAtual = '';
            }
            
            // Dividir linha muito longa
            const palavras = linha.split(' ');
            let linhaAtual = '';
            for (const palavra of palavras) {
                if ((linhaAtual + palavra + ' ').length > limite) {
                    if (linhaAtual.trim().length > 0) {
                        mensagens.push(linhaAtual.trim());
                    }
                    linhaAtual = palavra + ' ';
                } else {
                    linhaAtual += palavra + ' ';
                }
            }
            if (linhaAtual.trim().length > 0) {
                parteAtual = linhaAtual.trim() + '\n';
            }
        } else {
            // Se adicionar esta linha excede o limite, salvar parte atual e começar nova
            if ((parteAtual + linha + '\n').length > limite) {
                if (parteAtual.trim().length > 0) {
                    mensagens.push(parteAtual.trim());
                }
                parteAtual = linha + '\n';
            } else {
                parteAtual += linha + '\n';
            }
        }
    }
    
    // Adicionar última parte se houver
    if (parteAtual.trim().length > 0) {
        mensagens.push(parteAtual.trim());
    }
    
    return mensagens;
}

// Função para formatar dados do CPF para exibição (retorna array de mensagens)
function formatarResposta(dados) {
    if (!dados) {
        return ['❌ Erro ao consultar CPF. Tente novamente mais tarde.'];
    }

    const basicos = dados.DadosBasicos || {};
    const economicos = dados.DadosEconomicos || {};
    const enderecos = dados.enderecos || [];
    const telefones = dados.telefones || [];
    const emails = dados.emails || [];
    const parentes = dados.parentes || [];
    const vizinhos = dados.vizinhos || [];
    const profissao = dados.DadosEconomicos?.profissao || {};
    const empregos = dados.DadosEconomicos?.empregos || [];
    const empresas = dados.DadosEconomicos?.empresas || [];
    const documentos = dados.listaDocumentos || {};
    const vacinas = dados.imunoBiologicos || [];
    const perfilConsumo = dados.perfilConsumo || {};
    const beneficios = dados.beneficios || [];

    const MENSAGEM_LIMITE = 3900; // Limite seguro para Telegram (máximo é 4096)
    let resposta = '📋 *CONSULTA COMPLETA DE CPF*\n\n';
    
    // Dados Básicos COMPLETOS
    resposta += '👤 *DADOS BÁSICOS*\n';
    resposta += `Nome: ${basicos.nome || 'N/A'}\n`;
    resposta += `CPF: ${basicos.cpf || 'N/A'}\n`;
    resposta += `CNS: ${basicos.cns || 'N/A'}\n`;
    // RG - verificar em TODOS os lugares possíveis (busca completa)
    let rgNumero = null;
    let rgDataExpedicao = null;
    let rgOrgaoExpedidor = null;
    let rgSource = null; // Para debug: saber de onde veio o RG
    
    // 1. Verificar registroGeral (campo principal) - campos corretos: rgNumero, dataEmissao, orgaoEmissor
    if (dados.registroGeral) {
        rgNumero = dados.registroGeral.rgNumero || dados.registroGeral.numero || dados.registroGeral.rg || null;
        if (rgNumero) {
            rgSource = 'registroGeral';
            rgDataExpedicao = dados.registroGeral.dataEmissao || dados.registroGeral.dataExpedicao || null;
            rgOrgaoExpedidor = dados.registroGeral.orgaoEmissor || dados.registroGeral.orgaoExpedidor || null;
        }
    }
    
    // 2. Verificar DadosBasicos
    if (!rgNumero) {
        rgNumero = basicos.rg || basicos.identidade || basicos.numeroIdentidade || null;
        if (rgNumero) {
            rgSource = 'DadosBasicos';
            if (!rgDataExpedicao) {
                rgDataExpedicao = basicos.rgDataExpedicao || basicos.dataExpedicao || basicos.dataEmissao || null;
            }
        }
    }
    
    // 3. Verificar listaDocumentos (estrutura completa)
    if (!rgNumero && documentos) {
        // Verificar documentos.RG (pode ser objeto ou string)
        if (documentos.RG) {
            if (typeof documentos.RG === 'string') {
                rgNumero = documentos.RG;
                rgSource = 'listaDocumentos.RG (string)';
            } else if (documentos.RG.numero || documentos.RG.numeroRG || documentos.RG.rg) {
                rgNumero = documentos.RG.numero || documentos.RG.numeroRG || documentos.RG.rg;
                rgSource = 'listaDocumentos.RG (objeto)';
                if (!rgDataExpedicao) {
                    rgDataExpedicao = documentos.RG.dataExpedicao || documentos.RG.dataEmissao || null;
                }
                rgOrgaoExpedidor = documentos.RG.orgaoExpedidor || null;
            }
        }
        
        // Verificar documentos.rg (minúsculo)
        if (!rgNumero && documentos.rg) {
            if (typeof documentos.rg === 'string') {
                rgNumero = documentos.rg;
                rgSource = 'listaDocumentos.rg (string)';
            } else if (documentos.rg.numero || documentos.rg.numeroRG || documentos.rg.rg) {
                rgNumero = documentos.rg.numero || documentos.rg.numeroRG || documentos.rg.rg;
                rgSource = 'listaDocumentos.rg (objeto)';
                if (!rgDataExpedicao) {
                    rgDataExpedicao = documentos.rg.dataExpedicao || documentos.rg.dataEmissao || null;
                }
                rgOrgaoExpedidor = documentos.rg.orgaoExpedidor || null;
            }
        }
        
        // Verificar documentos.outros.Identidade (dentro de outros) - campo correto!
        if (!rgNumero && documentos.outros) {
            if (documentos.outros.Identidade) {
                rgNumero = documentos.outros.Identidade.numeroIdentidade || null;
                if (rgNumero) {
                    rgSource = 'listaDocumentos.outros.Identidade';
                    if (!rgDataExpedicao) {
                        rgDataExpedicao = documentos.outros.Identidade.dataExpedicao || null;
                    }
                    // OrgaoEmissor pode ser objeto com nomeOrgaoEmissor
                    if (documentos.outros.Identidade.OrgaoEmissor) {
                        rgOrgaoExpedidor = documentos.outros.Identidade.OrgaoEmissor.nomeOrgaoEmissor || 
                                          documentos.outros.Identidade.OrgaoEmissor.siglaOrgaoEmissor || null;
                    }
                }
            }
            // Verificar documentos.outros.RG também (fallback)
            if (!rgNumero && documentos.outros.RG) {
                if (typeof documentos.outros.RG === 'string') {
                    rgNumero = documentos.outros.RG;
                    rgSource = 'listaDocumentos.outros.RG (string)';
                } else if (documentos.outros.RG.numero || documentos.outros.RG.rg) {
                    rgNumero = documentos.outros.RG.numero || documentos.outros.RG.rg;
                    rgSource = 'listaDocumentos.outros.RG (objeto)';
                    if (!rgDataExpedicao) {
                        rgDataExpedicao = documentos.outros.RG.dataExpedicao || documentos.outros.RG.dataEmissao || null;
                    }
                    rgOrgaoExpedidor = documentos.outros.RG.orgaoExpedidor || null;
                }
            }
        }
    }
    
    // Log removido - apenas exibe no resultado
    
    // Exibir RG
    resposta += `RG: ${rgNumero || 'N/A'}\n`;
    
    // Exibir Data de Expedição se encontrada
    if (rgDataExpedicao) {
        resposta += `Data Expedição RG: ${rgDataExpedicao}\n`;
    }
    
    // Exibir Órgão Expedidor se encontrado
    if (rgOrgaoExpedidor) {
        resposta += `Órgão Expedidor: ${rgOrgaoExpedidor}\n`;
    }
    resposta += `Data de Nascimento: ${basicos.dataNascimento || 'N/A'}\n`;
    resposta += `Sexo: ${basicos.sexo || 'N/A'}\n`;
    resposta += `Cor/Raça: ${basicos.cor || 'N/A'}\n`;
    resposta += `Nome da Mãe: ${basicos.nomeMae || 'N/A'}\n`;
    resposta += `Nome do Pai: ${basicos.nomePai || 'N/A'}\n`;
    resposta += `Município de Nascimento: ${basicos.municipioNascimento || 'N/A'}\n`;
    resposta += `Escolaridade: ${basicos.escolaridade || 'N/A'}\n`;
    resposta += `Estado Civil: ${basicos.estadoCivil || 'N/A'}\n`;
    resposta += `Nacionalidade: ${basicos.nacionalidade || 'N/A'}\n`;
    resposta += `Óbito: ${basicos.obito?.obito || 'NÃO'}\n`;
    if (basicos.obito?.dataObito && basicos.obito.obito === 'SIM') {
        resposta += `Data Óbito: ${basicos.obito.dataObito}\n`;
    }
    resposta += `Situação Cadastral: ${basicos.situacaoCadastral?.descricaoSituacaoCadastral || 'N/A'}\n`;
    resposta += `Data Situação: ${basicos.situacaoCadastral?.dataSituacaoCadastral || 'N/A'}\n\n`;

    // Dados Econômicos COMPLETOS
    if (economicos.renda || economicos.score || economicos.serasaMosaic) {
        resposta += '💰 *DADOS ECONÔMICOS*\n';
        if (economicos.renda) {
            resposta += `Renda: R$ ${economicos.renda}\n`;
        }
        if (economicos.poderAquisitivo) {
            resposta += `Poder Aquisitivo: ${economicos.poderAquisitivo.poderAquisitivoDescricao || 'N/A'}\n`;
            resposta += `Faixa de Renda: ${economicos.poderAquisitivo.faixaPoderAquisitivo || 'N/A'}\n`;
        }
        if (economicos.score) {
            resposta += `\nScore CSB: ${economicos.score.scoreCSB || 'N/A'}\n`;
            resposta += `Faixa Risco CSB: ${economicos.score.scoreCSBFaixaRisco || 'N/A'}\n`;
            resposta += `Score CSBA: ${economicos.score.scoreCSBA || 'N/A'}\n`;
            resposta += `Faixa Risco CSBA: ${economicos.score.scoreCSBAFaixaRisco || 'N/A'}\n`;
        }
        if (economicos.serasaMosaic) {
            resposta += `\nMosaic Novo: ${economicos.serasaMosaic.descricaoMosaicNovo || 'N/A'}\n`;
            resposta += `Classe Mosaic: ${economicos.serasaMosaic.classeMosaicNovo || 'N/A'}\n`;
            resposta += `Mosaic Secundário: ${economicos.serasaMosaic.descricaoMosaicSecundario || 'N/A'}\n`;
        }
        resposta += '\n';

    }

    // Profissão
    if (profissao.cbo || profissao.cboDescricao) {
        resposta += '💼 *PROFISSÃO*\n';
        resposta += `CBO: ${profissao.cbo || 'N/A'}\n`;
        resposta += `Descrição: ${profissao.cboDescricao || 'N/A'}\n`;
        resposta += `PIS: ${profissao.pis || 'N/A'}\n\n`;
    }

    // Empregos
    if (empregos.length > 0) {
        resposta += '👔 *EMPREGOS*\n';
        empregos.forEach((emprego, index) => {
            resposta += `\n*Emprego ${index + 1}:*\n`;
            resposta += `Empresa: ${emprego.empresa || 'N/A'}\n`;
            resposta += `Cargo: ${emprego.cargo || 'N/A'}\n`;
            resposta += `Data Admissão: ${emprego.dataAdmissao || 'N/A'}\n`;
        });
        resposta += '\n';
    }

    // Empresas
    if (empresas.length > 0) {
        resposta += '🏢 *EMPRESAS*\n';
        empresas.forEach((empresa, index) => {
            resposta += `\n*Empresa ${index + 1}:*\n`;
            resposta += `Razão Social: ${empresa.razaoSocial || 'N/A'}\n`;
            resposta += `CNPJ: ${empresa.cnpj || 'N/A'}\n`;
        });
        resposta += '\n';
    }

    // Endereços COMPLETOS
    if (enderecos.length > 0) {
        resposta += '📍 *ENDEREÇOS*\n';
        enderecos.forEach((endereco, index) => {
            resposta += `\n*Endereço ${index + 1}:*\n`;
            resposta += `${endereco.tipoLogradouro || ''} ${endereco.logradouro || ''}, ${endereco.logradouroNumero || ''}\n`;
            resposta += `Complemento: ${endereco.complemento || 'N/A'}\n`;
            resposta += `Bairro: ${endereco.bairro || 'N/A'}\n`;
            resposta += `Cidade: ${endereco.cidade || 'N/A'}/${endereco.uf || 'N/A'}\n`;
            resposta += `CEP: ${endereco.cep || 'N/A'}\n`;
        });
        resposta += '\n';
    }

    // Telefones COMPLETOS
    if (telefones.length > 0) {
        resposta += '📞 *TELEFONES*\n';
        telefones.forEach((tel) => {
            resposta += `${tel.telefone || 'N/A'} - ${tel.tipo || 'N/A'}\n`;
            resposta += `Operadora: ${tel.operadora || 'N/A'}\n`;
            resposta += `WhatsApp: ${tel.whatsapp ? 'SIM' : 'NÃO'}\n\n`;
        });
        resposta += '\n';
    }

    // Emails COMPLETOS
    if (emails.length > 0) {
        resposta += '📧 *E-MAILS*\n';
        emails.forEach((email) => {
            resposta += `${email.email || 'N/A'}\n`;
            resposta += `Prioridade: ${email.prioridade || 'N/A'}\n`;
            resposta += `Qualidade: ${email.qualidade || 'N/A'}\n`;
            resposta += `Pessoal: ${email.emailPessoal || 'N/A'}\n`;
            resposta += `Blacklist: ${email.blacklist || 'N/A'}\n\n`;
        });
        resposta += '\n';
    }

    // Documentos
    if (documentos.CNS || documentos.outros || documentos.RG || documentos.rg || basicos.rg || basicos.identidade || dados.registroGeral) {
        resposta += '🪪 *DOCUMENTOS*\n';
        
        // RG - verificar em registroGeral primeiro (campo principal da API)
        const registroGeral = dados.registroGeral;
        if (registroGeral && (registroGeral.numero || registroGeral.rg)) {
            resposta += '*RG:*\n';
            resposta += `Número: ${registroGeral.numero || registroGeral.rg || 'N/A'}\n`;
            if (registroGeral.dataExpedicao || registroGeral.dataEmissao) {
                resposta += `Data Expedição: ${registroGeral.dataExpedicao || registroGeral.dataEmissao}\n`;
            }
            if (registroGeral.orgaoExpedidor) {
                resposta += `Órgão Expedidor: ${registroGeral.orgaoExpedidor}\n`;
            }
            resposta += '\n';
        } else {
            // Busca completa em todos os lugares possíveis
            let rgNumeroDoc = null;
            let rgDataDoc = null;
            let rgOrgaoDoc = null;
            
            // Verificar DadosBasicos
            rgNumeroDoc = basicos.rg || basicos.identidade || basicos.numeroIdentidade || null;
            if (!rgDataDoc) {
                rgDataDoc = basicos.rgDataExpedicao || basicos.dataExpedicao || basicos.dataEmissao || null;
            }
            
            // Verificar listaDocumentos
            if (!rgNumeroDoc && documentos) {
                if (documentos.RG) {
                    if (typeof documentos.RG === 'string') {
                        rgNumeroDoc = documentos.RG;
                    } else {
                        rgNumeroDoc = documentos.RG.numero || documentos.RG.numeroRG || documentos.RG.rg || null;
                        if (!rgDataDoc) {
                            rgDataDoc = documentos.RG.dataExpedicao || documentos.RG.dataEmissao || null;
                        }
                        rgOrgaoDoc = documentos.RG.orgaoExpedidor || null;
                    }
                }
                if (!rgNumeroDoc && documentos.rg) {
                    if (typeof documentos.rg === 'string') {
                        rgNumeroDoc = documentos.rg;
                    } else {
                        rgNumeroDoc = documentos.rg.numero || documentos.rg.numeroRG || documentos.rg.rg || null;
                        if (!rgDataDoc) {
                            rgDataDoc = documentos.rg.dataExpedicao || documentos.rg.dataEmissao || null;
                        }
                        rgOrgaoDoc = documentos.rg.orgaoExpedidor || null;
                    }
                }
                // Verificar dentro de outros.Identidade (campo correto!)
                if (!rgNumeroDoc && documentos.outros && documentos.outros.Identidade) {
                    rgNumeroDoc = documentos.outros.Identidade.numeroIdentidade || null;
                    if (rgNumeroDoc) {
                        if (!rgDataDoc) {
                            rgDataDoc = documentos.outros.Identidade.dataExpedicao || null;
                        }
                        if (documentos.outros.Identidade.OrgaoEmissor) {
                            rgOrgaoDoc = documentos.outros.Identidade.OrgaoEmissor.nomeOrgaoEmissor || 
                                        documentos.outros.Identidade.OrgaoEmissor.siglaOrgaoEmissor || null;
                        }
                    }
                }
                // Verificar documentos.outros.RG também (fallback)
                if (!rgNumeroDoc && documentos.outros && documentos.outros.RG) {
                    if (typeof documentos.outros.RG === 'string') {
                        rgNumeroDoc = documentos.outros.RG;
                    } else {
                        rgNumeroDoc = documentos.outros.RG.numero || documentos.outros.RG.rg || null;
                        if (!rgDataDoc) {
                            rgDataDoc = documentos.outros.RG.dataExpedicao || documentos.outros.RG.dataEmissao || null;
                        }
                        rgOrgaoDoc = documentos.outros.RG.orgaoExpedidor || null;
                    }
                }
            }
            
            if (rgNumeroDoc) {
                resposta += '*RG:*\n';
                resposta += `Número: ${rgNumeroDoc}\n`;
                if (rgDataDoc) {
                    resposta += `Data Expedição: ${rgDataDoc}\n`;
                }
                if (rgOrgaoDoc) {
                    resposta += `Órgão Expedidor: ${rgOrgaoDoc}\n`;
                }
                resposta += '\n';
            }
        }
        
        // CNS
        if (documentos.CNS && documentos.CNS.length > 0) {
            resposta += '*CNS:*\n';
            documentos.CNS.forEach((cns, index) => {
                resposta += `${index + 1}. ${cns.numeroCNS || 'N/A'}\n`;
                resposta += `   Tipo: ${cns.tipoCartao || 'N/A'}\n`;
                resposta += `   Data: ${cns.dataAtribuicao || 'N/A'}\n`;
            });
        }
        
        // NIS
        if (documentos.outros?.NIS) {
            resposta += `\n*NIS:* ${documentos.outros.NIS.numeroDocumento || 'N/A'}\n`;
        }
        
        resposta += '\n';
    }

    // Parentes
    if (parentes.length > 0) {
        resposta += '👨‍👩‍👧‍👦 *PARENTES*\n';
        parentes.forEach((parente, index) => {
            resposta += `${index + 1}. ${parente.nomeParente || 'N/A'}\n`;
            resposta += `   CPF: ${parente.cpfParente || 'N/A'}\n`;
            resposta += `   Grau: ${parente.grauParentesco || 'N/A'}\n\n`;
        });
        resposta += '\n';
    }

    // Benefícios COMPLETOS
    if (beneficios.length > 0) {
        resposta += '💳 *BENEFÍCIOS*\n';
        beneficios.forEach((beneficio) => {
            resposta += `*${beneficio.beneficio}:*\n`;
            resposta += `Parcelas Recebidas: ${beneficio.totalParcelasRecebidas || 0}\n`;
            resposta += `Total Recebido: ${beneficio.totalRecebido || 'R$ 0'}\n\n`;
        });
        resposta += '\n';
    }

    // Vacinas
    if (vacinas.length > 0) {
        resposta += '💉 *VACINAS (COVID-19)*\n';
        vacinas.forEach((vacina, index) => {
            resposta += `\n*Dose ${index + 1}:*\n`;
            resposta += `Vacina: ${vacina.VacinaNome || 'N/A'}\n`;
            resposta += `Fabricante: ${vacina.VacinaFabricanteNome || 'N/A'}\n`;
            resposta += `Dose: ${vacina.VacinaDescricaoDose || 'N/A'}\n`;
            resposta += `Data: ${vacina.VacinaDataAplicacao || 'N/A'}\n`;
            resposta += `Lote: ${vacina.VacinaLote || 'N/A'}\n`;
        });
        resposta += '\n';
    }

    // Vizinhos
    if (vizinhos.length > 0) {
        resposta += '🏘️ *VIZINHOS*\n';
        vizinhos.slice(0, 10).forEach((vizinho, index) => {
            resposta += `${index + 1}. ${vizinho.nome || 'N/A'}\n`;
            resposta += `   CPF: ${vizinho.cpf || 'N/A'}\n`;
            resposta += `   Idade: ${vizinho.idade || 'N/A'}\n`;
            resposta += `   Sexo: ${vizinho.sexo || 'N/A'}\n\n`;
        });
        if (vizinhos.length > 10) {
            resposta += `\n... e mais ${vizinhos.length - 10} vizinho(s)\n`;
        }
        resposta += '\n';
    }

    // Perfil de Consumo (resumo)
    if (perfilConsumo && Object.keys(perfilConsumo).length > 0) {
        resposta += '🛒 *PERFIL DE CONSUMO*\n';
        const possui = [];
        const naoPossui = [];
        
        Object.keys(perfilConsumo).forEach(key => {
            if (typeof perfilConsumo[key] === 'boolean') {
                if (perfilConsumo[key]) {
                    possui.push(key.replace(/_/g, ' '));
                }
            }
        });

        if (possui.length > 0) {
            resposta += '*Possui:*\n';
            possui.slice(0, 10).forEach(item => {
                resposta += `✓ ${item}\n`;
            });
        }

        // Probabilidades (top 5)
        const probabilidades = [];
        Object.keys(perfilConsumo).forEach(key => {
            if (typeof perfilConsumo[key] === 'string' && perfilConsumo[key].includes('%')) {
                const match = perfilConsumo[key].match(/(\d+)%/);
                if (match) {
                    probabilidades.push({
                        item: key.replace(/_/g, ' '),
                        prob: parseInt(match[1])
                    });
                }
            }
        });
        
        if (probabilidades.length > 0) {
            resposta += '\n*Maiores Probabilidades:*\n';
            probabilidades.sort((a, b) => b.prob - a.prob).slice(0, 5).forEach(item => {
                resposta += `${item.item}: ${item.prob}%\n`;
            });
        }
        resposta += '\n';
    }

    // Dividir a resposta completa em mensagens menores se necessário
    const mensagensDivididas = dividirMensagens(resposta.trim(), MENSAGEM_LIMITE);
    
    return mensagensDivididas.length > 0 ? mensagensDivididas : ['❌ Nenhum dado encontrado.'];
}

// Função para configurar handlers do bot
function configurarHandlers() {
    // Comando /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = `
🤖 *Bem-vindo ao Bot de Consulta de CPF*

Envie um CPF para consultar os dados.

*Formato aceito:*
• 123.456.789-00
• 12345678900
• 123 456 789 00

*Comandos disponíveis:*
/start - Iniciar o bot
/help - Ver esta mensagem
/consulta <cpf> - Consultar CPF

*Exemplo:*
/consulta 123.456.789-00

⚠️ *Atenção:* Este bot é apenas para fins informativos.
        `;
        
        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Comando /help
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        const helpMessage = `
📖 *AJUDA*

*Como usar:*
1. Use o comando: /consulta <cpf>
2. Ou simplesmente envie o CPF diretamente

*Formatos aceitos:*
• 123.456.789-00
• 12345678900
• 123 456 789 00

*Comandos:*
/start - Iniciar o bot
/help - Ver esta mensagem
/consulta <cpf> - Consultar CPF

*Exemplos de uso:*
/consulta 123.456.789-00
/consulta 12345678900
Ou simplesmente envie o CPF diretamente.

⚠️ Este bot é apenas para fins informativos.
        `;
        
        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Comando /consulta <cpf>
    bot.onText(/\/consulta (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const cpf = match[1].trim();
        const username = msg.from?.username || null;
        const firstName = msg.from?.first_name || null;
        
        await processarConsulta(chatId, cpf, username, firstName);
    });

    // Lidar com mensagens de texto (CPF)
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        // Ignorar comandos
        if (text && text.startsWith('/')) {
            return;
        }

        // Verificar se é um CPF
        if (text && validarCPF(text)) {
            const username = msg.from?.username || null;
            const firstName = msg.from?.first_name || null;
            await processarConsulta(chatId, text, username, firstName);
        } else if (text) {
            // Mensagem não é um CPF válido
            bot.sendMessage(chatId, 
                '❌ CPF inválido!\n\n' +
                'Por favor, envie um CPF válido no formato:\n' +
                '• 123.456.789-00\n' +
                '• 12345678900\n' +
                '• 123 456 789 00\n\n' +
                'Use /help para mais informações.'
            );
        }
    });
}

// Função de inicialização assíncrona
async function iniciar() {
    try {
        console.log('🚀 Iniciando bot...');
        
        // Validar variáveis de ambiente
        if (!TELEGRAM_TOKEN) {
            console.error('❌ Erro: TELEGRAM_TOKEN não definido no .env');
            process.exit(1);
        }
        if (!API_TOKEN) {
            console.error('❌ Erro: API_TOKEN não definido no .env');
            process.exit(1);
        }
        
        console.log('✅ Variáveis de ambiente validadas');

        // Buscar proxies do WebShare ANTES de inicializar o bot (se USE_PROXY estiver ativado)
        if (USE_PROXY) {
            if (WEBSHARE_API_KEY) {
                console.log('🔍 Buscando proxies do WebShare...');
                await buscarProxiesWebShare();
                
                // Se não carregou proxies, tentar novamente após 5 segundos
                if (proxies.length === 0) {
                    console.log('⚠️ Nenhum proxy encontrado. Tentando novamente em 5 segundos...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await buscarProxiesWebShare();
                }

                if (proxies.length === 0) {
                    console.warn('⚠️ Nenhum proxy disponível. Bot funcionando sem proxy.');
                    console.warn('   Verifique se WEBSHARE_API_KEY está correto.');
                } else {
                    console.log(`✅ ${proxies.length} proxies carregados com sucesso`);
                }
            } else {
                console.warn('⚠️ USE_PROXY está ativado mas WEBSHARE_API_KEY não está definido.');
                console.warn('   Bot funcionando sem proxy.');
            }
        } else {
            console.log('ℹ️  Proxies desativados (USE_PROXY=false). Bot funcionando sem proxy.');
        }
        
        // Atualizar proxies a cada 30 minutos (apenas se USE_PROXY estiver ativado)
        if (USE_PROXY) {
            setInterval(async () => {
                console.log('🔄 Atualizando lista de proxies...');
                await buscarProxiesWebShare();
                console.log(`✅ ${proxies.length} proxies disponíveis agora`);
            }, 30 * 60 * 1000); // 30 minutos
        }

        // Inicializar bot APÓS carregar proxies
        console.log('🤖 Inicializando bot do Telegram...');
        inicializarBot();

        // Configurar handlers do bot
        configurarHandlers();

        // Tratamento de erros
        bot.on('polling_error', (error) => {
            console.error('❌ Erro no polling:', error.message);
            console.error('   Código:', error.code);
            
            // Se for erro de timeout/conexão, tentar reconectar com novo proxy
            if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED') || error.code === 'EFATAL') {
                console.error('🔴 Erro de conectividade detectado!');
                
                if (proxies.length > 0) {
                    console.log(`🔄 Tentando reconectar com novo proxy (${proxies.length} disponíveis)...`);
                    setTimeout(() => {
                        try {
                            if (bot) {
                                bot.stopPolling().catch(() => {});
                            }
                            console.log('   Reinicializando bot com novo proxy...');
                            inicializarBot();
                            configurarHandlers();
                            bot.startPolling();
                            console.log('✅ Reconexão realizada com novo proxy');
                        } catch (reconnectError) {
                            console.error('❌ Erro ao reconectar:', reconnectError.message);
                            console.error('   Tentando novamente em 10 segundos...');
                            setTimeout(() => iniciar(), 10000);
                        }
                    }, 3000);
                } else {
                    console.error('❌ CRÍTICO: Nenhum proxy disponível para reconexão!');
                    console.error('   Tentando buscar proxies novamente...');
                    setTimeout(async () => {
                        await buscarProxiesWebShare();
                        if (proxies.length > 0) {
                            console.log('✅ Proxies encontrados, reiniciando bot...');
                            iniciar();
                        } else {
                            console.error('❌ Ainda sem proxies. Tentando novamente em 30 segundos...');
                            setTimeout(() => iniciar(), 30000);
                        }
                    }, 5000);
                }
            }
        });

        console.log('\n✅ ========================================');
        console.log('🤖 Bot iniciado com sucesso!');
        console.log(`📊 Total de proxies disponíveis: ${proxies.length}`);
        if (proxies.length > 0) {
            console.log(`🌐 Bot usando proxy para todas as conexões`);
        } else {
            console.log(`⚠️ Bot funcionando SEM proxy (pode ter problemas de conectividade)`);
        }
        console.log('✅ ========================================\n');
        console.log('Aguardando mensagens...\n');
    } catch (error) {
        console.error('❌ Erro ao iniciar bot:', error);
        process.exit(1);
    }
}

// Iniciar aplicação
iniciar();

