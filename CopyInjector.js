class CombinedCopyInjector {
        constructor() {
            this.copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`;
            this.successIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`;
        }

        inject(targetContainer) {
            if (!targetContainer) {
                console.error("Não foi possível encontrar o local para injetar o botão de cópia combinada.");
                return;
            }

            const button = document.createElement('button');
            button.className = 'combined-copy-btn';
            button.title = 'Copiar nome e protocolo';
            button.innerHTML = this.copyIconSVG;

            button.style.cssText = `
                cursor: pointer;
                transition: background-color 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgb(28, 126, 225);
                border-radius: 6px;
                padding: 5px;
                border: 2px solid rgb(255, 255, 255);
                margin-left: 8px;
            `;

            button.addEventListener('mouseenter', () => button.style.backgroundColor = '#1565C0');
            button.addEventListener('mouseleave', () => button.style.backgroundColor = 'rgb(28, 126, 225)');
            button.addEventListener('click', async () => {
                const originalIcon = button.innerHTML;
                button.disabled = true;

                try {
                    // Passo 1: Clicar no botão original e pegar o valor da área de transferência
                    const originalCopyButton = document.querySelector('.copy-action-button');
                    if (!originalCopyButton) {
                        throw new Error('Botão de cópia original (.copy-action-button) não encontrado.');
                    }
                    originalCopyButton.click();
                    
                    // Pausa para a área de transferência ser atualizada
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const step1Value = await navigator.clipboard.readText();
                    if (!step1Value) {
                        throw new Error('Não foi possível ler o valor da área de transferência após o primeiro clique.');
                    }

                    // Passo 2: Copiar o valor do nome do participante
                    const participantElement = document.getElementById('interaction-header-participant-name');
                    if (!participantElement) {
                        throw new Error('Elemento com o nome do participante (interaction-header-participant-name) não encontrado.');
                    }
                    const participantName = participantElement.textContent.trim();

                    // Passo 3: Montar a string final e copiar
                    const finalValue = `${participantName}\n${step1Value}`;
                    await navigator.clipboard.writeText(finalValue);

                    // Feedback visual de sucesso
                    button.innerHTML = this.successIconSVG;
                    button.style.backgroundColor = '#28a745';

                } catch (error) {
                    console.error('❌ Erro na cópia combinada:', error);
                    alert(`Erro ao executar a cópia combinada: ${error.message}`);
                    button.style.backgroundColor = '#dc3545'; // Feedback de erro
                } finally {
                    // Restaurar o botão após um tempo
                    setTimeout(() => {
                        button.innerHTML = originalIcon;
                        button.disabled = false;
                        button.style.backgroundColor = 'rgb(28, 126, 225)';
                    }, 2000);
                }
            });

            targetContainer.appendChild(button);
            console.log(`✅ Botão de cópia combinada injetado com sucesso!`);
        }

        // Vigia para garantir que o botão sempre exista no local correto
        startWatcher(interval = 1000) {
            setInterval(() => {
                const targetContainer = document.querySelector('.actions-container');
                if (targetContainer && !targetContainer.querySelector('.combined-copy-btn')) {
                    console.log('🔎 Injetando botão de cópia combinada...');
                    this.inject(targetContainer);
                }
            }, interval);
            console.log('📡 Vigia de injeção de botão de cópia combinada ativado.');
        }
    }

    // Inicializa o sistema
    if (window.top === window.self) {
        const combinedCopyManager = new CombinedCopyInjector();
        combinedCopyManager.startWatcher();
    }
