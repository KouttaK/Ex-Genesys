(function() {
    'use strict';

    // ==========================
    // Sistema Unificado de Contagem e Injeção de Botões em Iframes (Shadow DOM incluído)
    // ==========================
    class ShadowIframeButtonManager {
        constructor(targetSrc) {
            this.targetSrc = targetSrc;
            this.buttonInjector = new ButtonInjector();
        }

        // Percorre recursivamente shadow DOMs para encontrar iframes com src alvo
        findTargetIframes(root = document) {
            let result = [];
            const iframes = root.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.src === this.targetSrc) result.push(iframe);
            });

            const shadowHosts = root.querySelectorAll('*');
            shadowHosts.forEach(el => {
                if (el.shadowRoot) {
                    result = result.concat(this.findTargetIframes(el.shadowRoot));
                }
            });

            return result;
        }

        // Injeta o botão em cada iframe encontrado, se ainda não existir
        injectButtonInIframes() {
            const iframes = this.findTargetIframes();
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument;
                    if (!iframeDoc) return;

                    const actionBar = iframeDoc.querySelector('[data-automation-id="messaging-gadget-footer-actions"]');
                    if (!actionBar) return;

                    if (!actionBar.querySelector('.document-search-btn')) {
                        console.log('🔎 Injetando botão no iframe detectado...');
                        this.buttonInjector.inject(iframeDoc);
                    }

                } catch (err) {
                    console.warn('⚠️ Não foi possível acessar iframe:', err);
                }
            });
        }

        // Vigia contínuo usando setInterval
        startWatcher(interval = 1000) {
            setInterval(() => this.injectButtonInIframes(), interval);
            console.log('📡 Vigia de injeção de botões ativada.');
        }

        initialize() {
            console.log('🚀 Inicializando ShadowIframeButtonManager...');
            this.injectButtonInIframes();
            this.startWatcher();
        }
    }

    class DocumentValidator {
        static validateCPF(cpf) { const cleanCPF = String(cpf).replace(/[^\d]/g, ''); if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i)) * (10 - i); let digit1 = (sum * 10) % 11; if (digit1 === 10) digit1 = 0; if (digit1 !== parseInt(cleanCPF.charAt(9))) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i)) * (11 - i); let digit2 = (sum * 10) % 11; if (digit2 === 10) digit2 = 0; return digit2 === parseInt(cleanCPF.charAt(10)); }
        static validateCNPJ(cnpj) { const cleanCNPJ = String(cnpj).replace(/[^\d]/g, ''); if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) return false; const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let sum = 0; for (let i = 0; i < 12; i++) sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i]; let digit1 = sum % 11; digit1 = digit1 < 2 ? 0 : 11 - digit1; if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false; const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; sum = 0; for (let i = 0; i < 13; i++) sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i]; let digit2 = sum % 11; digit2 = digit2 < 2 ? 0 : 11 - digit2; return digit2 === parseInt(cleanCNPJ.charAt(13)); }
        static findDocuments(text) { if (typeof text !== 'string' || !text) return []; const documents = []; const seen = new Set(); const docRegex = /(?:\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b)|(?:\b\d{3}\.?\d{3}\.?\d{3}[.-]?\d{2}\b)|(?:\b\d{11,14}\b)/g; const matches = text.match(docRegex) || []; for (const match of matches) { const cleanMatch = match.replace(/[^\d]/g, ''); if (cleanMatch.length === 11) { if (!seen.has(cleanMatch) && this.validateCPF(cleanMatch)) { documents.push({ type: 'CPF', formatted: this.formatCPF(cleanMatch) }); seen.add(cleanMatch); } } else if (cleanMatch.length === 14) { if (!seen.has(cleanMatch) && this.validateCNPJ(cleanMatch)) { documents.push({ type: 'CNPJ', formatted: this.formatCNPJ(cleanMatch) }); seen.add(cleanMatch); } } } return documents; }
        static formatCPF(cpf) { return String(cpf).replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); }
        static formatCNPJ(cnpj) { return String(cnpj).replace(/[^\d]/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); }
    }

    class PopupManager {
        constructor() { this.popupContainer = null; this.feedbackTimeout = null; }
        createPopup(documents) { this.removePopup(); this.popupContainer = document.createElement('div'); this.popupContainer.id = 'document-finder-popup'; this.popupContainer.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:2px solid #007bff;border-radius:10px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;max-width:400px;max-height:500px;overflow-y:auto;font-family:Arial,sans-serif;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px;"><h3 style="margin:0;color:#007bff;">📄 Documentos Encontrados (${documents.length})</h3><button id="close-popup-btn" style="background:#dc3545;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">×</button></div><div id="documents-list">${documents.map(doc=>`<div style="margin-bottom:10px;padding:10px;background:${doc.type==='CPF'?'#e3f2fd':'#f3e5f5'};border-radius:5px;border-left:4px solid ${doc.type==='CPF'?'#2196f3':'#9c27b0'};"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong style="color:${doc.type==='CPF'?'#1976d2':'#7b1fa2'};">${doc.type}:</strong><span style="font-family:monospace;margin-left:5px;">${doc.formatted}</span></div><button class="copy-doc-btn" data-document="${doc.formatted}" style="background:#28a745;color:white;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px;transition:background-color 0.2s;">📋 Copiar</button></div></div>`).join('')}</div></div><div id="popup-backdrop" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;"></div>`; document.body.appendChild(this.popupContainer); this.attachEventListeners(); }
        attachEventListeners() { const closeBtn = this.popupContainer.querySelector('#close-popup-btn'); const backdrop = this.popupContainer.querySelector('#popup-backdrop'); closeBtn?.addEventListener('click', () => this.removePopup()); backdrop?.addEventListener('click', () => this.removePopup()); this.popupContainer.querySelectorAll('.copy-doc-btn').forEach(btn => { btn.addEventListener('click', (e) => { const button = e.currentTarget; const documentToCopy = button.getAttribute('data-document'); this.copyToClipboard(documentToCopy, button, true); }); }); }
        copyToClipboard(text, buttonElement = null, closeModal = false) { if (!text) return; navigator.clipboard.writeText(text).then(() => { if (buttonElement) { const originalText = buttonElement.textContent; buttonElement.textContent = '✅ Copiado!'; buttonElement.style.background = '#17a2b8'; if (closeModal) { setTimeout(() => this.removePopup(), 800); } else { setTimeout(() => { buttonElement.textContent = originalText; buttonElement.style.background = '#28a745'; }, 2000); } } }).catch(err => console.error('Erro ao copiar:', err)); }
        removePopup() { if (this.popupContainer) { this.popupContainer.remove(); this.popupContainer = null; } }
        
        // ✨ MÉTODO CORRIGIDO ✨
        showFeedback(message) {
            if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
            let feedbackEl = document.getElementById('copy-feedback-toast');
            if (!feedbackEl) {
                feedbackEl = document.createElement('div');
                feedbackEl.id = 'copy-feedback-toast';
                feedbackEl.style.cssText = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #28a745; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; font-family: Arial, sans-serif; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); opacity: 0; pointer-events: none; transition: opacity 0.3s, bottom 0.3s;`;
                document.body.appendChild(feedbackEl);
            }
            feedbackEl.textContent = message;
            
            setTimeout(() => {
                feedbackEl.style.opacity = '1';
                feedbackEl.style.bottom = '30px';
                feedbackEl.style.pointerEvents = 'auto';
            }, 10);

            this.feedbackTimeout = setTimeout(() => {
                feedbackEl.style.opacity = '0';
                feedbackEl.style.bottom = '20px';
                feedbackEl.style.pointerEvents = 'none';

                // Remove o elemento do DOM após a transição de 0.3s
                setTimeout(() => {
                    if (feedbackEl) {
                        feedbackEl.remove();
                    }
                }, 300); // Duração da transição

            }, 3000);
        }

        showInfoPopup(title, message, borderColor) { this.removePopup(); this.popupContainer = document.createElement('div'); this.popupContainer.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:2px solid ${borderColor};border-radius:10px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;max-width:350px;text-align:center;font-family:Arial,sans-serif;"><div style="font-size:48px;margin-bottom:10px;">${borderColor === '#ffc107' ? '⚠️' : '❌'}</div><h3 style="margin:10px 0;">${title}</h3><p style="color:#6c757d;margin-bottom:20px; text-align: left;">${message}</p><button id="close-info-btn" style="background:${borderColor};color:white;border:none;border-radius:5px;padding:10px 20px;cursor:pointer;font-weight:bold;">OK</button></div><div id="info-backdrop" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;"></div>`; document.body.appendChild(this.popupContainer); this.popupContainer.querySelector('#close-info-btn')?.addEventListener('click', () => this.removePopup()); this.popupContainer.querySelector('#info-backdrop')?.addEventListener('click', () => this.removePopup()); }
        showNoDocumentsPopup() { this.showInfoPopup('Nenhum Documento Encontrado', 'Não foram encontrados CPFs ou CNPJs válidos na conversa atual.', '#ffc107'); }
        showErrorPopup(errorMessage) { this.showInfoPopup('Erro na Busca', `<strong>Detalhes:</strong><br>${errorMessage}`, '#dc3545'); }
    }

    class ChatProcessor {
        constructor(iframeDocument) { this.iframeDoc = iframeDocument; this.popupManager = new PopupManager(); }
        extractMessagesText(chatContainer) { if (!chatContainer) return ''; const messages = chatContainer.querySelectorAll('[data-automation-id="messaging-gadget-message-textbody"]'); return Array.from(messages).map(msg => msg.textContent).join('\n'); }
        async scrollToTop(chatContainer) { return new Promise((resolve) => { let scrollAttempts = 0; let lastScrollHeight = -1; const maxAttempts = 100; const scrollInterval = setInterval(() => { const systemMessage = chatContainer.querySelector('p[data-automation-id="message-history-system-message"]'); const isSystemMessageVisible = systemMessage && systemMessage.offsetParent !== null; if (isSystemMessageVisible || (scrollAttempts > 5 && chatContainer.scrollHeight === lastScrollHeight) || scrollAttempts >= maxAttempts) { clearInterval(scrollInterval); console.log(`📜 Scroll finalizado para o chat atual. Tentativas: ${scrollAttempts}`); resolve(); } else { lastScrollHeight = chatContainer.scrollHeight; chatContainer.scrollTop = 0; scrollAttempts++; } }, 200); }); }
        async searchDocuments() { try { const chatContainer = this.iframeDoc.querySelector('[data-automation-id="message-history"]'); if (!chatContainer) throw new Error('Contêiner do chat não encontrado dentro do iframe.'); console.log('📜 Rolando até o topo do chat atual...'); await this.scrollToTop(chatContainer); console.log('⏳ Aguardando renderização final das mensagens...'); await new Promise(resolve => setTimeout(resolve, 500)); console.log('📖 Extraindo texto das mensagens...'); const messagesText = this.extractMessagesText(chatContainer); const documents = DocumentValidator.findDocuments(messagesText); console.log(`✅ Busca concluída. ${documents.length} documento(s) válido(s) encontrado(s).`); if (documents.length === 1) { navigator.clipboard.writeText(documents[0].formatted).then(() => this.popupManager.showFeedback(`Copiado: ${documents[0].formatted}`)).catch(err => console.error('Falha ao copiar documento único:', err)); } else if (documents.length > 1) { this.popupManager.createPopup(documents); } else { this.popupManager.showNoDocumentsPopup(); } } catch (error) { console.error('❌ Erro durante a busca no chat atual:', error); this.popupManager.showErrorPopup(error.message); } }
    }

    class ButtonInjector {
        constructor() {
            this.searchIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M200-800v241-1 400-640 200-200Zm0 720q-33 0-56.5-23.5T120-160v-640q0-33 23.5-56.5T200-880h320l240 240v100q-19-8-39-12.5t-41-6.5v-41H480v-200H200v640h241q16 24 36 44.5T521-80H200Zm460-120q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29ZM864-40 756-148q-21 14-45.5 21t-50.5 7q-75 0-127.5-52.5T480-300q0-75 52.5-127.5T660-480q75 0 127.5 52.5T840-300q0 26-7 50.5T812-204L920-96l-56 56Z"></path></svg>`;
            this.loadingIconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#e3e3e3"><style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 1.2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#e3e3e3" stroke-width="3"></circle></g></svg>`;
        }

        inject(iframeDoc) {
            const targetContainer = iframeDoc.querySelector('[data-automation-id="messaging-gadget-footer-actions"]');
            if (!targetContainer) return;

            const button = iframeDoc.createElement('button');
            button.className = 'document-search-btn';
            button.title = 'Buscar CPF/CNPJ nesta conversa';
            button.innerHTML = this.searchIconSVG;

            button.style.cssText = `
                cursor: pointer;
                transition: background-color 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #1c7ee1;
                border-radius: 6px;
                padding: 5px;
                border: 1px solid #fff;
                margin-left: 8px;
            `;

            button.addEventListener('mouseenter', () => button.style.backgroundColor = '#1565C0');
            button.addEventListener('mouseleave', () => button.style.backgroundColor = '#1c7ee1');
            button.addEventListener('click', async () => {
                const processor = new ChatProcessor(iframeDoc);
                button.disabled = true;
                button.innerHTML = this.loadingIconSVG;
                await processor.searchDocuments();
                button.disabled = false;
                button.innerHTML = this.searchIconSVG;
            });

            targetContainer.appendChild(button);
            console.log(`✅ Botão de busca injetado no iframe!`);
        }
    }

    // ==========================
    // Inicializa o sistema
    // ==========================
    const manager = new ShadowIframeButtonManager("https://apps.sae1.pure.cloud/messaging-gadget/messaging-gadget.html");
    manager.initialize();

})();
