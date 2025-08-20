/**
 * ATENÇÃO: O CÓDIGO ABAIXO USA eval() E É INSEGURO.
 * Ele executa código de uma fonte externa com acesso total à página,
 * o que representa um risco significativo de segurança (XSS).
 * Use por sua conta e risco, apenas em ambientes controlados.
 */
(function() {
    const scriptUrl = 'https://raw.githubusercontent.com/seu-usuario/seu-repositorio/main/userscript.js'; // Substitua pela URL correta, se necessário

    console.log(`🚀 Tentando carregar e executar o script de: ${scriptUrl}`);

    fetch(scriptUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Falha na rede: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('✅ Script baixado com sucesso. Processando para execução...');

            // Ponto crucial: Encontrar o fim do bloco de metadados para removê-lo.
            const metadataEndMarker = '// ==/UserScript==';
            const codeStartIndex = text.indexOf(metadataEndMarker);

            if (codeStartIndex === -1) {
                // Se não encontrar o marcador, talvez o script não seja um Userscript.
                // Pode tentar executar o texto inteiro, mas ainda é arriscado.
                console.warn('⚠️ Marcador de fim de metadados "// ==/UserScript==" não encontrado. Tentando executar o script inteiro.');
                return text;
            }

            // Extrai apenas o código JavaScript executável, pulando o bloco de metadados.
            const executableCode = text.substring(codeStartIndex + metadataEndMarker.length);
            
            console.log('✂️ Bloco de metadados removido. Executando o código...');
            
            // A execução insegura acontece aqui.
            eval(executableCode);

            console.log('🎉 Script executado via eval().');
        })
        .catch(error => {
            console.error('❌ Erro catastrófico ao carregar ou executar o script:', error);
        });
})();
