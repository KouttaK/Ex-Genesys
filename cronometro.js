// ==UserScript==
// @name          Gerenciador de Conversas com Cronômetro e Numeração - Otimizado
// @namespace     http://seu-dominio.com.br/
// @version       2.4
// @description   Versão otimizada com novos estilos, melhorias de performance e atualizações de interface mais eficientes.
// @author        Assistente IA
// @match         
// @grant         none
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURAÇÕES ====================
    const CONFIG = {
        // Tempo limite em milissegundos (70 segundos)
        LIMIT_TIME_MS: 70 * 1000,
        // Intervalo de atualização do cronômetro
        UPDATE_INTERVAL_MS: 100,
        // Seletores CSS
        SELECTORS: {
            conversation: 'div.interaction-group',
            activeConversation: 'div.interaction-group.is-selected',
            timerClass: 'injected-conversation-timer',
            numberClass: 'injected-conversation-number'
        },
        // Estilos
        STYLES: {
            timer: {
                running: {
                    backgroundColor: '#e7e9f8', // Cinza fraco para não concluído
                    color: '#333'
                },
                paused: {
                    backgroundColor: '#e7e9f8', // Cinza fraco para não concluído
                    color: '#333'
                },
                completed: {
                    backgroundColor: '#13429e', // Azul escuro para concluído
                    color: 'white',
                    text: '✓',
                    fontSize: '16px'
                }
            },
            number: {
                backgroundColor: '#199ff0',
                color: 'white'
            }
        }
    };

    // ==================== CLASSE PRINCIPAL ====================
    class ConversationTimer {
        constructor(element) {
            this.element = element;
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.totalPausedTime = 0;
            this.isRunning = false;
            this.isCompleted = false;
            this.intervalId = null;
            this.timerDiv = null;
            this.numberDiv = null;
            
            this.createElements();
            this.pause();
        }

        createElements() {
            this.element.style.position = 'relative';
            this.createTimerElement();
            this.createNumberElement();
        }

        createTimerElement() {
            this.timerDiv = document.createElement('div');
            this.timerDiv.className = CONFIG.SELECTORS.timerClass;
            
            Object.assign(this.timerDiv.style, {
                position: 'absolute',
                top: '50%',
                right: '10px', // Aumentado
                transform: 'translateY(-50%)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: '9999',
                minWidth: '50px',
                textAlign: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s ease'
            });
            this.setupHoldToComplete();
            this.element.appendChild(this.timerDiv);
        }

        setupHoldToComplete() {
            let holdTimer = null;
            let holdStartTime = 0;
            const HOLD_DURATION = 5000; // 5 segundos
            
            const startHold = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.isCompleted) return;
                
                holdStartTime = Date.now();
                holdTimer = setInterval(() => {
                    const elapsed = Date.now() - holdStartTime;
                    if (elapsed >= HOLD_DURATION) {
                        this.complete();
                        clearInterval(holdTimer);
                        holdTimer = null;
                    }
                }, 100);
            };

            const cancelHold = (e) => {
                e.stopPropagation();
                if (holdTimer) {
                    clearInterval(holdTimer);
                    holdTimer = null;
                }
            };
            
            this.timerDiv.addEventListener('mousedown', startHold);
            this.timerDiv.addEventListener('mouseup', cancelHold);
            this.timerDiv.addEventListener('mouseleave', cancelHold);
            this.timerDiv.addEventListener('touchstart', startHold, { passive: true });
            this.timerDiv.addEventListener('touchend', cancelHold);
            this.timerDiv.addEventListener('touchcancel', cancelHold);
        }

        createNumberElement() {
            this.numberDiv = document.createElement('div');
            this.numberDiv.className = CONFIG.SELECTORS.numberClass;
            
            Object.assign(this.numberDiv.style, {
                position: 'absolute',
                top: '5px',
                right: '5px',
                padding: '2px 6px',
                borderRadius: '50%',
                fontSize: '11px',
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
                zIndex: '99999',
                minWidth: '20px',
                textAlign: 'center',
                ...CONFIG.STYLES.number
            });
            this.element.appendChild(this.numberDiv);
        }

        start() {
            if (this.isRunning || this.isCompleted) return;
            this.isRunning = true;
            this.startTime = Date.now() - this.totalPausedTime;
            
            this.intervalId = setInterval(() => this.update(), CONFIG.UPDATE_INTERVAL_MS);
            this.updateStyles('running');
        }

        pause() {
            if (!this.isRunning || this.isCompleted) return;
            this.isRunning = false;
            this.pausedTime = Date.now();
            
            clearInterval(this.intervalId);
            this.updateStyles('paused');
        }

        complete() {
            if (this.isCompleted) return;
            this.isCompleted = true;
            this.isRunning = false;
            clearInterval(this.intervalId);
            
            this.timerDiv.textContent = CONFIG.STYLES.timer.completed.text;
            this.updateStyles('completed');
            this.timerDiv.classList.add('timer-completed');
            
            console.log(`Cronômetro concluído para conversa: ${this.element.id}`);
        }

        update() {
            if (!this.isRunning || this.isCompleted) return;
            const elapsedTime = Date.now() - this.startTime;
            
            if (elapsedTime >= CONFIG.LIMIT_TIME_MS) {
                this.complete();
                return;
            }
            
            this.updateDisplay(elapsedTime);
        }

        updateDisplay(elapsedTime) {
            const totalSeconds = Math.floor(elapsedTime / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            this.timerDiv.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        updateStyles(state) {
            if (this.isCompleted && state !== 'completed') return;
            const styles = CONFIG.STYLES.timer[state];
            if (!styles) return;

            // Estilos base
            const baseStyles = {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                fontSize: styles.fontSize || '12px',
                fontFamily: 'sans-serif', // Padrão
                fontWeight: 'normal',   // Padrão
                minWidth: '50px'        // Padrão
            };

            // Estilos condicionais
            if (state === 'running' || state === 'paused') {
                baseStyles.fontFamily = 'monospace';
                baseStyles.fontWeight = 'bold';
            } else if (state === 'completed') {
                baseStyles.minWidth = '30px';
            }
            
            Object.assign(this.timerDiv.style, baseStyles);
        }

        setNumber(number) {
            if (this.numberDiv) {
                this.numberDiv.textContent = number.toString();
            }
        }

        destroy() {
            clearInterval(this.intervalId);
            this.timerDiv?.remove();
            this.numberDiv?.remove();
        }
    }

    // ==================== GERENCIADOR PRINCIPAL ====================
    class ConversationManager {
        constructor() {
            this.timers = new Map();
            this.observer = null;
            this.updateQueued = false;
            
            this.init();
        }

        init() {
            console.log('Inicializando Gerenciador de Conversas v2.4...');
            this.cleanup();
            setTimeout(() => {
                this.initializeExistingConversations();
                this.startObserver();
                this.queueUpdate();
            }, 500);
        }

        cleanup() {
            document.querySelectorAll(`.${CONFIG.SELECTORS.timerClass}, .${CONFIG.SELECTORS.numberClass}`)
                     .forEach(el => el.remove());
            this.timers.clear();
        }

        initializeExistingConversations() {
            const conversations = document.querySelectorAll(CONFIG.SELECTORS.conversation);
            conversations.forEach(conv => this.addTimer(conv));
            console.log(`Inicializadas ${conversations.length} conversas existentes.`);
        }

        addTimer(element) {
            if (!this.timers.has(element)) {
                const timer = new ConversationTimer(element);
                this.timers.set(element, timer);
            }
        }

        removeTimer(element) {
            const timer = this.timers.get(element);
            if (timer) {
                timer.destroy();
                this.timers.delete(element);
            }
        }

        performUpdate() {
            this.updateNumbers();
            this.manageActiveTimers();
            this.updateQueued = false;
        }

        queueUpdate() {
            if (this.updateQueued) return;
            this.updateQueued = true;
            requestAnimationFrame(() => this.performUpdate());
        }

        updateNumbers() {
            // Remove timers de elementos que não existem mais
            this.timers.forEach((timer, element) => {
                if (!document.body.contains(element)) {
                    this.removeTimer(element);
                }
            });

            // Ordena e renumera os timers existentes
            const conversations = Array.from(this.timers.keys())
                .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

            conversations.forEach((conv, index) => {
                this.timers.get(conv)?.setNumber(index + 1);
            });
        }

        manageActiveTimers() {
            const activeConv = document.querySelector(CONFIG.SELECTORS.activeConversation);
            
            this.timers.forEach((timer, element) => {
                if (element === activeConv) {
                    if (!timer.isCompleted) {
                        timer.start();
                    }
                } else {
                    timer.pause();
                }
            });
        }

        startObserver() {
            if (this.observer) this.observer.disconnect();
            
            const handleMutations = (mutations) => {
                let needsUpdate = false;
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                if (node.matches(CONFIG.SELECTORS.conversation)) {
                                    this.addTimer(node);
                                    needsUpdate = true;
                                }
                                node.querySelectorAll(CONFIG.SELECTORS.conversation).forEach(conv => {
                                    this.addTimer(conv);
                                    needsUpdate = true;
                                });
                            }
                        });
                        if (mutation.removedNodes.length > 0) {
                            needsUpdate = true;
                        }
                    }
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        needsUpdate = true;
                    }
                }
                if (needsUpdate) {
                    this.queueUpdate();
                }
            };
            
            this.observer = new MutationObserver(handleMutations);
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    // ==================== INICIALIZAÇÃO ====================
    if (window.conversationManager) {
        console.log('Uma versão anterior do Gerenciador de Conversas foi encontrada. Recarregando...');
        window.conversationManager.observer?.disconnect();
    }
    
    window.conversationManager = new ConversationManager();
    console.log('✅ Script Gerenciador de Conversas v2.4 carregado com sucesso!');
    console.log('💡 Mantenha pressionado o cronômetro por 5 segundos para marcar como concluído.');
})();
