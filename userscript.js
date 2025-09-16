// ==UserScript==
// @name         Genesys Helper Suite
// @namespace    http://your-domain.com/
// @version      3.3
// @description  Sistema unificado para cronômetro de conversas, busca de documentos (CPF/CNPJ) e cópia combinada de informações do participante.
// @author       KouttaK 
// @match        *://*/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        WATCHER_INTERVAL_MS: 1000,
        IFRAME_SRC: "https://apps.sae1.pure.cloud/messaging-gadget/messaging-gadget.html",

        TIMER: {
            LIMIT_TIME_MS: 70 * 1000,
            UPDATE_INTERVAL_MS: 100,
            HOLD_TO_COMPLETE_MS: 5000,
            SELECTORS: {
                conversation: 'div.interaction-group',
                activeConversation: 'div.interaction-group.is-selected',
            },
            CLASSES: {
                container: 'injected-conversation-timer',
                number: 'injected-conversation-number',
                running: 'timer-running',
                paused: 'timer-paused',
                completed: 'timer-completed'
            },
            TEXT: {
                completed: '✓'
            }
        },

        DOC_SEARCH: {
            SELECTORS: {
                iframe_chatContainer: '[data-automation-id="message-history"]',
                iframe_messageBody: '[data-automation-id="messaging-gadget-message-textbody"]',
                iframe_actionBar: '[data-automation-id="messaging-gadget-footer-actions"]',
                iframe_systemMessage: 'p[data-automation-id="message-history-system-message"]',
            },
            CLASSES: {
                button: 'doc-search-btn-v3'
            }
        },

        COMBINED_COPY: {
            SELECTORS: {
                main_actionsContainer: '.actions-container',
                main_originalCopyButton: '.copy-action-button',
                main_participantName: '#interaction-header-participant-name',
            },
            CLASSES: {
                button: 'combined-copy-btn-v3'
            }
        }
    };

    // ==================== STYLES ====================
    const STYLES = `
        /* Estilos do Cronômetro */
        .${CONFIG.TIMER.CLASSES.container} {
            position: absolute; top: 50%; right: 10px; transform: translateY(-50%);
            padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 999;
            min-width: 50px; text-align: center; cursor: pointer; user-select: none;
            transition: all 0.2s ease; font-family: monospace; font-weight: bold;
        }
        .${CONFIG.TIMER.CLASSES.running}, .${CONFIG.TIMER.CLASSES.paused} {
            background-color: #e7e9f8; color: #333;
        }
        .${CONFIG.TIMER.CLASSES.completed} {
            background-color: #13429e; color: white; font-size: 16px; min-width: 30px;
        }
        .${CONFIG.TIMER.CLASSES.number} {
            position: absolute; top: 5px; right: 5px; padding: 2px 6px;
            border-radius: 50%; font-size: 11px; font-family: sans-serif; font-weight: bold;
            z-index: 9999; min-width: 20px; text-align: center;
            background-color: #199ff0; color: white;
        }
        /* Estilo do Toast de Feedback */
        #copy-feedback-toast-v3 {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background-color: #28a745; color: white; padding: 12px 20px;
            border-radius: 8px; z-index: 10001; font-family: Arial, sans-serif;
            font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            opacity: 0; pointer-events: none; transition: opacity 0.3s, bottom 0.3s;
        }
    `;

    // ==================== UTILITIES & SERVICES ====================

    class DocumentValidator {
        static validateCPF(cpf) { const cleanCPF = String(cpf).replace(/\D/g, ''); if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i)) * (10 - i); let remainder = (sum * 10) % 11; if (remainder === 10) remainder = 0; if (remainder !== parseInt(cleanCPF.charAt(9))) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i)) * (11 - i); remainder = (sum * 10) % 11; if (remainder === 10) remainder = 0; return remainder === parseInt(cleanCPF.charAt(10)); }
        static validateCNPJ(cnpj) { const cleanCNPJ = String(cnpj).replace(/\D/g, ''); if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) return false; const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let sum = 0; for (let i = 0; i < 12; i++) sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i]; let remainder = sum % 11; remainder = remainder < 2 ? 0 : 11 - remainder; if (remainder !== parseInt(cleanCNPJ.charAt(12))) return false; const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; sum = 0; for (let i = 0; i < 13; i++) sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i]; remainder = sum % 11; remainder = remainder < 2 ? 0 : 11 - remainder; return remainder === parseInt(cleanCNPJ.charAt(13)); }
        static findDocuments(text) { if (typeof text !== 'string' || !text) return []; const documents = new Map(); const docRegex = /(?:\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b)|(?:\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b)/g; const matches = text.match(docRegex) || []; for (const match of matches) { const cleanMatch = match.replace(/\D/g, ''); if (cleanMatch.length === 11) { if (!documents.has(cleanMatch) && this.validateCPF(cleanMatch)) { documents.set(cleanMatch, { type: 'CPF', formatted: this.formatCPF(cleanMatch) }); } } else if (cleanMatch.length === 14) { if (!documents.has(cleanMatch) && this.validateCNPJ(cleanMatch)) { documents.set(cleanMatch, { type: 'CNPJ', formatted: this.formatCNPJ(cleanMatch) }); } } } return Array.from(documents.values()); }
        static formatCPF(cpf) { return String(cpf).replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); }
        static formatCNPJ(cnpj) { return String(cnpj).replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); }
    }

    class UIManager {
        constructor() { this.popupContainer = null; this.feedbackTimeout = null; }
        createPopup(title, bodyElement, borderColor = '#007bff') { this.removePopup(); this.popupContainer = document.createElement('div'); const backdrop = document.createElement('div'); backdrop.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;`; const modal = document.createElement('div'); modal.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; border:2px solid ${borderColor}; border-radius:10px; padding:20px; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index:10000; max-width:400px; max-height:500px; overflow-y:auto; font-family:Arial,sans-serif;`; const header = document.createElement('div'); header.style.cssText = `display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;`; const heading = document.createElement('h3'); heading.textContent = title; heading.style.cssText = `margin:0; color:${borderColor};`; const closeBtn = document.createElement('button'); closeBtn.textContent = '×'; closeBtn.style.cssText = `background:#dc3545; color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;`; header.appendChild(heading); header.appendChild(closeBtn); modal.appendChild(header); modal.appendChild(bodyElement); this.popupContainer.appendChild(backdrop); this.popupContainer.appendChild(modal); document.body.appendChild(this.popupContainer); closeBtn.addEventListener('click', () => this.removePopup()); backdrop.addEventListener('click', () => this.removePopup()); }
        showDocumentsPopup(documents) { const listContainer = document.createElement('div'); documents.forEach(doc => { const isCPF = doc.type === 'CPF'; const docElement = document.createElement('div'); docElement.style.cssText = `margin-bottom:10px; padding:10px; background:${isCPF ? '#e3f2fd' : '#f3e5f5'}; border-radius:5px; border-left:4px solid ${isCPF ? '#2196f3' : '#9c27b0'}; display:flex; justify-content:space-between; align-items:center;`; const textContainer = document.createElement('div'); const typeStrong = document.createElement('strong'); typeStrong.textContent = `${doc.type}: `; typeStrong.style.color = isCPF ? '#1976d2' : '#7b1fa2'; const valueSpan = document.createElement('span'); valueSpan.textContent = doc.formatted; valueSpan.style.fontFamily = 'monospace'; textContainer.append(typeStrong, valueSpan); const copyBtn = document.createElement('button'); copyBtn.textContent = '📋 Copiar'; copyBtn.style.cssText = `background:#28a745; color:white; border:none; border-radius:4px; padding:5px 10px; cursor:pointer; font-size:12px; transition:background-color 0.2s;`; copyBtn.addEventListener('click', () => this.copyToClipboard(doc.formatted, copyBtn, true)); docElement.append(textContainer, copyBtn); listContainer.appendChild(docElement); }); this.createPopup(`📄 Documentos Encontrados (${documents.length})`, listContainer); }
        showInfoPopup(title, message, icon, color) { const body = document.createElement('div'); body.style.textAlign = 'center'; const iconDiv = document.createElement('div'); iconDiv.textContent = icon; iconDiv.style.fontSize = '48px'; const messageP = document.createElement('p'); messageP.textContent = message; body.append(iconDiv, messageP); this.createPopup(title, body, color); }
        showNoDocumentsPopup() { this.showInfoPopup('Nenhum Documento', 'Não foram encontrados CPFs ou CNPJs válidos.', '⚠️', '#ffc107'); }
        showErrorPopup(errorMessage) { this.showInfoPopup('Erro', errorMessage, '❌', '#dc3545'); }
        async copyToClipboard(text, buttonElement = null, closeModal = false) { try { await navigator.clipboard.writeText(text); if (buttonElement) { const originalText = buttonElement.textContent; buttonElement.textContent = '✅ Copiado!'; buttonElement.style.backgroundColor = '#17a2b8'; if (closeModal) setTimeout(() => this.removePopup(), 800); else setTimeout(() => { buttonElement.textContent = originalText; buttonElement.style.backgroundColor = '#28a745'; }, 2000); } } catch (err) { console.error('Failed to copy:', err); this.showErrorPopup('Não foi possível copiar para a área de transferência.'); } }
        removePopup() { this.popupContainer?.remove(); this.popupContainer = null; }
        showFeedbackToast(message) { if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout); let feedbackEl = document.getElementById('copy-feedback-toast-v3'); if (!feedbackEl) { feedbackEl = document.createElement('div'); feedbackEl.id = 'copy-feedback-toast-v3'; document.body.appendChild(feedbackEl); } feedbackEl.textContent = message; setTimeout(() => { feedbackEl.style.opacity = '1'; feedbackEl.style.bottom = '30px'; feedbackEl.style.pointerEvents = 'auto'; }, 10); this.feedbackTimeout = setTimeout(() => { feedbackEl.style.opacity = '0'; feedbackEl.style.bottom = '20px'; feedbackEl.style.pointerEvents = 'none'; setTimeout(() => feedbackEl.remove(), 300); }, 3000); }
    }

    class ButtonFactory {
        constructor() { this.icons = { search: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>`, copy: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`, loading: `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#FFFFFF"><style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 1.2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="3"></circle></g></svg>`, success: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>` }; }
        createButton({ className, title, icon, onClick, border = '1px solid #fff' }) {
            const button = document.createElement('button');
            button.className = className;
            button.title = title;
            button.innerHTML = this.icons[icon] || icon;
            this._applyBaseStyles(button, border);
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.setButtonState(button, 'loading');
                try {
                    await onClick(e);
                    // On success, the onClick handler should manage the final state
                } catch (error) {
                    console.error(`Button action for "${title}" failed:`, error);
                    this.setButtonState(button, 'error');
                    setTimeout(() => this.setButtonState(button, 'default', this.icons[icon] || icon), 2000);
                }
            });
            return button;
        }
        _applyBaseStyles(button, border) {
            Object.assign(button.style, { cursor: 'pointer', transition: 'background-color 0.3s, opacity 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c7ee1', borderRadius: '6px', padding: '5px', border: border, marginLeft: '8px', opacity: '1' });
            button.addEventListener('mouseenter', () => { if (!button.disabled) button.style.backgroundColor = '#1565C0'; });
            button.addEventListener('mouseleave', () => { if (!button.disabled) button.style.backgroundColor = '#1c7ee1'; });
        }
        setButtonState(button, state, icon = null) {
            button.disabled = (state === 'loading');
            button.innerHTML = state === 'loading' ? this.icons.loading : (icon || button.innerHTML);
            switch (state) {
                case 'success': button.style.backgroundColor = '#28a745'; break;
                case 'error': button.style.backgroundColor = '#dc3545'; break;
                default: button.style.backgroundColor = '#1c7ee1'; button.disabled = false; break;
            }
        }
    }

    // ==================== CORE & FEATURE MODULES ====================

    class ConversationTimer {
        constructor(element) { this.element = element; this.startTime = Date.now(); this.totalPausedTime = 0; this.isRunning = false; this.isCompleted = false; this.intervalId = null; this.timerDiv = null; this.numberDiv = null; this.holdTimer = null; this.boundStartHold = this.startHold.bind(this); this.boundCancelHold = this.cancelHold.bind(this); this.createElements(); this.pause(); }
        createElements() { this.element.style.position = 'relative'; this.timerDiv = document.createElement('div'); this.timerDiv.className = CONFIG.TIMER.CLASSES.container; this.element.appendChild(this.timerDiv); this.numberDiv = document.createElement('div'); this.numberDiv.className = CONFIG.TIMER.CLASSES.number; this.element.appendChild(this.numberDiv); this.setupHoldToComplete(); }
        setupHoldToComplete() { this.timerDiv.addEventListener('mousedown', this.boundStartHold); this.timerDiv.addEventListener('mouseup', this.boundCancelHold); this.timerDiv.addEventListener('mouseleave', this.boundCancelHold); }
        startHold(e) { e.stopPropagation(); if (this.isCompleted) return; this.holdTimer = setTimeout(() => this.complete(), CONFIG.TIMER.HOLD_TO_COMPLETE_MS); }
        cancelHold(e) { e.stopPropagation(); clearTimeout(this.holdTimer); }
        start() { if (this.isRunning || this.isCompleted) return; this.isRunning = true; this.startTime = Date.now() - this.totalPausedTime; this.intervalId = setInterval(() => this.update(), CONFIG.TIMER.UPDATE_INTERVAL_MS); this.updateStyle(CONFIG.TIMER.CLASSES.running); }
        pause() { if (!this.isRunning || this.isCompleted) return; this.isRunning = false; this.totalPausedTime = Date.now() - this.startTime; clearInterval(this.intervalId); this.updateStyle(CONFIG.TIMER.CLASSES.paused); }
        complete() { if (this.isCompleted) return; this.isCompleted = true; this.isRunning = false; clearInterval(this.intervalId); this.timerDiv.textContent = CONFIG.TIMER.TEXT.completed; this.updateStyle(CONFIG.TIMER.CLASSES.completed); }
        update() { if (!this.isRunning) return; const elapsedTime = Date.now() - this.startTime; if (elapsedTime >= CONFIG.TIMER.LIMIT_TIME_MS) { this.complete(); } else { this.updateDisplay(elapsedTime); } }
        updateDisplay(elapsedTime) { const seconds = Math.floor(elapsedTime / 1000); this.timerDiv.textContent = `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`; }
        updateStyle(stateClass) { this.timerDiv.className = `${CONFIG.TIMER.CLASSES.container} ${stateClass}`; }
        setNumber(number) { if (this.numberDiv) this.numberDiv.textContent = number; }
        destroy() { clearInterval(this.intervalId); clearTimeout(this.holdTimer); if (this.timerDiv) { this.timerDiv.removeEventListener('mousedown', this.boundStartHold); this.timerDiv.removeEventListener('mouseup', this.boundCancelHold); this.timerDiv.removeEventListener('mouseleave', this.boundCancelHold); this.timerDiv.remove(); } this.numberDiv?.remove(); this.timerDiv = null; this.numberDiv = null; this.element = null; }
    }

    class TimerModule {
        constructor() {
            this.timers = new Map();
            this.updateQueued = false;
        }
        addTimer(element) { if (element && !this.timers.has(element)) { this.timers.set(element, new ConversationTimer(element)); } }
        removeTimer(element) { const timer = this.timers.get(element); if (timer) { timer.destroy(); this.timers.delete(element); } }
        queueUpdate() { if(this.updateQueued) return; this.updateQueued = true; requestAnimationFrame(()=>this.performUpdate()); }
        performUpdate() {
            this.timers.forEach((timer, element) => { if (!document.body.contains(element)) this.removeTimer(element); });
            const visibleConversations = Array.from(this.timers.keys()).filter(el => el.offsetParent !== null).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
            visibleConversations.forEach((conv, index) => this.timers.get(conv)?.setNumber(index + 1));
            const activeConv = document.querySelector(CONFIG.TIMER.SELECTORS.activeConversation);
            this.timers.forEach((timer, element) => { element === activeConv ? timer.start() : timer.pause(); });
            this.updateQueued = false;
        }
        updateFromDOM() {
            document.querySelectorAll(CONFIG.TIMER.SELECTORS.conversation).forEach(conv => this.addTimer(conv));
            this.queueUpdate();
        }
    }

    class DocSearchModule {
        constructor(uiManager, buttonFactory) {
            this.uiManager = uiManager;
            this.buttonFactory = buttonFactory;
        }

        injectOrUpdate() {
            this._findTargetIframes().forEach(iframe => {
                try {
                    const actionBar = iframe.contentDocument?.querySelector(CONFIG.DOC_SEARCH.SELECTORS.iframe_actionBar);
                    if (actionBar && !actionBar.querySelector(`.${CONFIG.DOC_SEARCH.CLASSES.button}`)) {
                        const button = this.buttonFactory.createButton({
                            className: CONFIG.DOC_SEARCH.CLASSES.button,
                            title: 'Buscar CPF/CNPJ na conversa',
                            icon: 'search',
                            onClick: async () => {
                                await this._findAndProcessDocuments(iframe.contentDocument);
                                // The button state is reset inside the click handler logic
                            }
                        });
                        actionBar.appendChild(button);
                    }
                } catch (e) { /* ignore cross-origin errors */ }
            });
        }

        async _findAndProcessDocuments(iframeDoc) {
            const button = iframeDoc.querySelector(`.${CONFIG.DOC_SEARCH.CLASSES.button}`);
            try {
                const chatContainer = iframeDoc.querySelector(CONFIG.DOC_SEARCH.SELECTORS.iframe_chatContainer);
                if (!chatContainer) throw new Error('Chat container not found inside the iframe.');

                await this._scrollToTop(chatContainer);
                await new Promise(resolve => setTimeout(resolve, 500));

                const messagesText = this._extractTextFromMessages(chatContainer);
                const documents = DocumentValidator.findDocuments(messagesText);

                if (documents.length === 1) {
                    const docToCopy = documents[0];
                    await this.uiManager.copyToClipboard(docToCopy.formatted);
                    this.uiManager.showFeedbackToast(`Copiado: ${docToCopy.formatted}`);
                } else if (documents.length > 1) {
                    this.uiManager.showDocumentsPopup(documents);
                } else {
                    this.uiManager.showNoDocumentsPopup();
                }
            } catch (error) {
                console.error('Error during document search:', error);
                this.uiManager.showErrorPopup(error.message);
                if(button) this.buttonFactory.setButtonState(button, 'error', this.buttonFactory.icons.search);
            } finally {
                 if(button) setTimeout(()=> this.buttonFactory.setButtonState(button, 'default', this.buttonFactory.icons.search), 1500);
            }
        }

        _extractTextFromMessages(chatContainer) {
            if (!chatContainer) return '';
            const messages = chatContainer.querySelectorAll(CONFIG.DOC_SEARCH.SELECTORS.iframe_messageBody);
            return Array.from(messages).map(msg => msg.textContent).join('\n');
        }

        async _scrollToTop(chatContainer) {
            return new Promise(resolve => {
                let attempts = 0;
                const scrollInterval = setInterval(() => {
                    const systemMessage = chatContainer.querySelector(CONFIG.DOC_SEARCH.SELECTORS.iframe_systemMessage);
                    if ((systemMessage && systemMessage.offsetParent !== null) || ++attempts > 50) {
                        clearInterval(scrollInterval);
                        resolve();
                    } else {
                        chatContainer.scrollTop = 0;
                    }
                }, 100);
            });
        }

        _findTargetIframes(root = document) {
            let results = [];
            root.querySelectorAll('iframe').forEach(iframe => { if (iframe.src.startsWith(CONFIG.IFRAME_SRC)) results.push(iframe); });
            root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) results = results.concat(this._findTargetIframes(el.shadowRoot)); });
            return results;
        }
    }

    class CombinedCopyModule {
        constructor(uiManager, buttonFactory) {
            this.uiManager = uiManager;
            this.buttonFactory = buttonFactory;
        }

        injectOrUpdate() {
            const targetContainer = document.querySelector(CONFIG.COMBINED_COPY.SELECTORS.main_actionsContainer);
            if (targetContainer && !targetContainer.querySelector(`.${CONFIG.COMBINED_COPY.CLASSES.button}`)) {
                const button = this.buttonFactory.createButton({
                    className: CONFIG.COMBINED_COPY.CLASSES.button,
                    title: 'Copiar nome e protocolo',
                    icon: 'copy',
                    border: '2px solid rgb(255, 255, 255)',
                    onClick: async (e) => {
                        await this._performCombinedCopy(e.target.closest('button'));
                    }
                });
                targetContainer.appendChild(button);
            }
        }

        async _performCombinedCopy(button) {
            try {
                const originalCopyButton = document.querySelector(CONFIG.COMBINED_COPY.SELECTORS.main_originalCopyButton);
                if (!originalCopyButton) throw new Error('Botão de cópia original não encontrado.');
                originalCopyButton.click();

                await new Promise(resolve => setTimeout(resolve, 150));
                const protocol = await navigator.clipboard.readText();
                if (!protocol) throw new Error('Não foi possível ler o protocolo.');

                const participantElem = document.querySelector(CONFIG.COMBINED_COPY.SELECTORS.main_participantName);
                if (!participantElem) throw new Error('Nome do participante não encontrado.');

                const participantName = participantElem.textContent.trim();
                const combinedText = `${participantName}\n${protocol}`;
                await navigator.clipboard.writeText(combinedText);

                this.uiManager.showFeedbackToast('Nome e protocolo copiados!');
                this.buttonFactory.setButtonState(button, 'default', this.buttonFactory.icons.copy);

            } catch (error) {
                console.error('Combined copy failed:', error);
                this.uiManager.showErrorPopup(error.message);
                throw error; // Propagate error to be caught by the generic handler in createButton
            }
        }
    }


    // ==================== MAIN APPLICATION ====================
    class GenesysHelperSuite {
        constructor() {
            this.uiManager = new UIManager();
            this.buttonFactory = new ButtonFactory();
            this.timerModule = new TimerModule();
            this.docSearchModule = new DocSearchModule(this.uiManager, this.buttonFactory);
            this.combinedCopyModule = new CombinedCopyModule(this.uiManager, this.buttonFactory);
            this.observer = null;
        }

        init() {
            console.log('🚀 Initializing Genesys Helper Suite v3.3...');
            if (typeof GM_addStyle === 'function') {
                GM_addStyle(STYLES);
            } else {
                const styleSheet = document.createElement("style");
                styleSheet.innerText = STYLES;
                document.head.appendChild(styleSheet);
            }
            this.startUnifiedWatcher();
        }

        startUnifiedWatcher() {
            console.log('📡 Unified Watcher enabled.');
            const observerCallback = (mutations) => {
                let needsTimerUpdate = false;
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'class')) {
                         if(mutation.target.matches(CONFIG.TIMER.SELECTORS.conversation) || mutation.target.querySelector(CONFIG.TIMER.SELECTORS.conversation)) {
                            needsTimerUpdate = true;
                         }
                    }
                }

                // Inject buttons on any relevant DOM change
                this.docSearchModule.injectOrUpdate();
                this.combinedCopyModule.injectOrUpdate();

                if (needsTimerUpdate) {
                    this.timerModule.updateFromDOM();
                }
            };

            this.observer = new MutationObserver(observerCallback);
            this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

            // Perform an initial check
            this.timerModule.updateFromDOM();
            this.docSearchModule.injectOrUpdate();
            this.combinedCopyModule.injectOrUpdate();
        }
    }

    // ==================== INITIALIZATION ====================
    const app = new GenesysHelperSuite();
    app.init();

})();
