(() => {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const on = (element, event, handler) => element?.addEventListener(event, handler);

    // Storage utilities
    const storage = {
        get(key, fallback = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : fallback;
            } catch {
                return fallback;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {}
        }
    };

    // Application state
    const state = {
        bookText: '',
        pages: [],
        currentPageIndex: 0,
        totalPages: 0,
        uiVisible: false,
        
        settings: {
            theme: 'dark',
            fontSize: 18,
            lineHeight: 1.6
        }
    };

    // Settings management
    const settings = {
        load() {
            const saved = storage.get('crimchitalka_settings');
            if (saved) {
                Object.assign(state.settings, saved);
            }
            this.apply();
            this.updateUI();
        },
        
        save() {
            storage.set('crimchitalka_settings', state.settings);
        },
        
        apply() {
            document.body.setAttribute('data-theme', state.settings.theme);
            
            document.documentElement.style.setProperty('--font-size-reading', `${state.settings.fontSize}px`);
            document.documentElement.style.setProperty('--line-height-reading', state.settings.lineHeight);
            
            this.save();
        },
        
        update(key, value) {
            state.settings[key] = value;
            this.apply();
            this.updateUI();
            
            // Re-paginate when settings change
            setTimeout(() => {
                reader.createPages();
                reader.render();
            }, 100);
        },
        
        updateUI() {
            // Update theme buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
            });
            
            // Update sliders
            const fontSizeSlider = $('#font-size-slider');
            const fontSizeValue = $('#font-size-value');
            if (fontSizeSlider && fontSizeValue) {
                fontSizeSlider.value = state.settings.fontSize;
                fontSizeValue.textContent = `${state.settings.fontSize}px`;
            }
            
            const lineHeightSlider = $('#line-height-slider');
            const lineHeightValue = $('#line-height-value');
            if (lineHeightSlider && lineHeightValue) {
                lineHeightSlider.value = state.settings.lineHeight;
                lineHeightValue.textContent = state.settings.lineHeight.toFixed(1);
            }
        }
    };

    // Progress management
    const progress = {
        save() {
            storage.set('crimchitalka_progress', {
                pageIndex: state.currentPageIndex,
                timestamp: Date.now()
            });
        },
        
        load() {
            const saved = storage.get('crimchitalka_progress');
            if (saved && saved.pageIndex < state.totalPages) {
                state.currentPageIndex = saved.pageIndex;
            }
        },
        
        update() {
            const currentPos = $('#current-page');
            const totalPos = $('#total-pages');
            const readingTime = $('#reading-time');
            const progressFill = $('#progress-fill');
            const pageInput = $('#page-input');
            
            const currentPage = state.currentPageIndex + 1;
            
            if (currentPos) currentPos.textContent = currentPage;
            if (totalPos) totalPos.textContent = state.totalPages;
            if (pageInput) {
                pageInput.value = currentPage;
                pageInput.max = state.totalPages;
            }
            
            if (readingTime) {
                const remainingPages = state.totalPages - currentPage;
                const minutes = Math.ceil(remainingPages * 1.5);
                readingTime.textContent = `~${minutes} мин`;
            }
            
            const progressPercent = state.totalPages > 1 ? (state.currentPageIndex / (state.totalPages - 1)) * 100 : 0;
            if (progressFill) progressFill.style.width = `${progressPercent}%`;
            
            this.save();
        }
    };

    // UI management
    const ui = {
        showLoading(message = 'Загрузка...') {
            const loading = $('#loading');
            const status = $('#loading-status');
            if (status) status.textContent = message;
            if (loading) loading.classList.remove('hidden');
        },
        
        hideLoading() {
            const loading = $('#loading');
            if (loading) loading.classList.add('hidden');
        },
        
        toggleUI() {
            state.uiVisible = !state.uiVisible;
            const header = $('#header');
            const footer = $('#footer');
            
            if (header) header.classList.toggle('visible', state.uiVisible);
            if (footer) footer.classList.toggle('visible', state.uiVisible);
        },
        
        showSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.add('visible');
        },
        
        hideSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.remove('visible');
        }
    };

    // Main reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Загрузка книги...');
                
                settings.load();
                await this.loadBook();
                this.createPages();
                
                progress.load();
                this.bindEvents();
                this.render();
                
                ui.hideLoading();
                
                // Show UI briefly
                setTimeout(() => {
                    ui.toggleUI();
                    setTimeout(() => ui.toggleUI(), 3000);
                }, 500);
                
            } catch (error) {
                console.error('Failed to initialize reader:', error);
                ui.showLoading('Ошибка загрузки. Проверьте файл Khadzhi-Girai.txt');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка текста книги...');
                
                const response = await fetch('Khadzhi-Girai.txt');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Khadzhi-Girai.txt not found`);
                }
                
                state.bookText = await response.text();
                console.log('Book loaded, length:', state.bookText.length);
                
                if (!state.bookText.trim()) {
                    throw new Error('Book file is empty');
                }
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        createPages() {
            ui.showLoading('Создание идеальных страниц...');
            
            state.pages = [];
            
            // Create measuring container
            const measuringContainer = document.createElement('div');
            measuringContainer.style.cssText = `
                position: absolute;
                visibility: hidden;
                top: -9999px;
                left: 0;
                width: 100%;
                max-width: 680px;
                margin: 0 auto;
                padding: 20px;
                font-family: "Crimson Text", Georgia, serif;
                font-size: ${state.settings.fontSize}px;
                line-height: ${state.settings.lineHeight};
                color: var(--text-primary);
                overflow: hidden;
                box-sizing: border-box;
                white-space: pre-wrap;
            `;
            
            // Calculate available height
            const header = $('#header');
            const footer = $('#footer');
            const headerHeight = 56;
            const footerHeight = 80;
            const availableHeight = window.innerHeight - headerHeight - footerHeight - 40; // 40px padding
            
            measuringContainer.style.height = `${availableHeight}px`;
            document.body.appendChild(measuringContainer);
            
            // Clean and split text into paragraphs
            const cleanText = state.bookText
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
            
            let currentPageContent = '';
            
            for (const paragraph of paragraphs) {
                const trimmedParagraph = paragraph.trim();
                if (!trimmedParagraph) continue;
                
                // Test if adding this paragraph exceeds page height
                const testContent = currentPageContent + (currentPageContent ? '\n\n' : '') + trimmedParagraph;
                
                measuringContainer.textContent = testContent;
                
                const contentFits = measuringContainer.scrollHeight <= availableHeight;
                
                if (contentFits) {
                    // Content fits, add to current page
                    currentPageContent = testContent;
                } else {
                    // Content doesn't fit
                    if (currentPageContent.trim()) {
                        // Save current page
                        state.pages.push(this.formatPageContent(currentPageContent));
                        currentPageContent = trimmedParagraph;
                    } else {
                        // Even single paragraph doesn't fit, need to split by sentences
                        const sentences = trimmedParagraph.split(/(?<=[.!?])\s+/);
                        let sentenceBuffer = '';
                        
                        for (const sentence of sentences) {
                            const testSentence = sentenceBuffer + (sentenceBuffer ? ' ' : '') + sentence;
                            measuringContainer.textContent = testSentence;
                            
                            if (measuringContainer.scrollHeight <= availableHeight) {
                                sentenceBuffer = testSentence;
                            } else {
                                if (sentenceBuffer.trim()) {
                                    state.pages.push(this.formatPageContent(sentenceBuffer));
                                    sentenceBuffer = sentence;
                                } else {
                                    // Even single sentence is too long, split by words
                                    const words = sentence.split(' ');
                                    let wordBuffer = '';
                                    
                                    for (const word of words) {
                                        const testWord = wordBuffer + (wordBuffer ? ' ' : '') + word;
                                        measuringContainer.textContent = testWord;
                                        
                                        if (measuringContainer.scrollHeight <= availableHeight) {
                                            wordBuffer = testWord;
                                        } else {
                                            if (wordBuffer.trim()) {
                                                state.pages.push(this.formatPageContent(wordBuffer));
                                                wordBuffer = word;
                                            } else {
                                                // Single word is too long, just add it
                                                state.pages.push(this.formatPageContent(word));
                                                wordBuffer = '';
                                            }
                                        }
                                    }
                                    
                                    if (wordBuffer.trim()) {
                                        sentenceBuffer = wordBuffer;
                                    }
                                }
                            }
                        }
                        
                        if (sentenceBuffer.trim()) {
                            currentPageContent = sentenceBuffer;
                        }
                    }
                }
            }
            
            // Add last page
            if (currentPageContent.trim()) {
                state.pages.push(this.formatPageContent(currentPageContent));
            }
            
            // Remove measuring container
            document.body.removeChild(measuringContainer);
            
            state.totalPages = state.pages.length;
            
            console.log(`Created ${state.totalPages} perfectly fitted pages`);
        },
        
        formatPageContent(text) {
            // Format text as HTML paragraphs
            return text
                .split('\n\n')
                .map(paragraph => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return '';
                    
                    // Check if it looks like a title (short line, possibly all caps)
                    if (trimmed.length < 50 && (trimmed === trimmed.toUpperCase() || /^[А-ЯЁ\s\-]+$/.test(trimmed))) {
                        return `<h2>${trimmed}</h2>`;
                    } else {
                        return `<p>${trimmed}</p>`;
                    }
                })
                .filter(p => p)
                .join('');
        },
        
        render() {
            const pageContent = $('#page-content');
            if (!pageContent || !state.pages[state.currentPageIndex]) return;
            
            const currentPage = state.pages[state.currentPageIndex];
            pageContent.innerHTML = currentPage;
            
            progress.update();
        },
        
        nextPage() {
            if (state.currentPageIndex < state.totalPages - 1) {
                state.currentPageIndex++;
                this.render();
            }
        },
        
        prevPage() {
            if (state.currentPageIndex > 0) {
                state.currentPageIndex--;
                this.render();
            }
        },
        
        goToPage(pageNumber) {
            const pageIndex = Math.max(0, Math.min(pageNumber - 1, state.totalPages - 1));
            if (pageIndex !== state.currentPageIndex) {
                state.currentPageIndex = pageIndex;
                this.render();
            }
        },
        
        bindEvents() {
            // Touch zones
            on($('#prev-zone'), 'click', () => this.prevPage());
            on($('#next-zone'), 'click', () => this.nextPage());
            on($('#menu-zone'), 'click', () => ui.toggleUI());
            
            // Navigation buttons
            on($('#prev-btn'), 'click', () => this.prevPage());
            on($('#next-btn'), 'click', () => this.nextPage());
            
            // Header buttons
            on($('#back-btn'), 'click', () => history.back());
            on($('#settings-btn'), 'click', () => ui.showSettings());
            
            // Page input
            on($('#page-input'), 'change', (e) => this.goToPage(parseInt(e.target.value) || 1));
            
            // Progress bar
            on($('#progress-bar'), 'click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const page = Math.ceil(ratio * state.totalPages);
                this.goToPage(page);
            });
            
            // Settings modal
            on($('#close-settings'), 'click', () => ui.hideSettings());
            on($('#settings-modal .modal-backdrop'), 'click', () => ui.hideSettings());
            
            // Settings buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                on(btn, 'click', () => settings.update('theme', btn.dataset.theme));
            });
            
            // Range sliders
            const fontSizeSlider = $('#font-size-slider');
            const fontSizeValue = $('#font-size-value');
            if (fontSizeSlider && fontSizeValue) {
                on(fontSizeSlider, 'input', (e) => {
                    const size = parseInt(e.target.value);
                    fontSizeValue.textContent = `${size}px`;
                    settings.update('fontSize', size);
                });
            }
            
            const lineHeightSlider = $('#line-height-slider');
            const lineHeightValue = $('#line-height-value');
            if (lineHeightSlider && lineHeightValue) {
                on(lineHeightSlider, 'input', (e) => {
                    const height = parseFloat(e.target.value);
                    lineHeightValue.textContent = height.toFixed(1);
                    settings.update('lineHeight', height);
                });
            }
            
            // Window resize
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    this.createPages();
                    this.render();
                }, 300);
            });
            
            // Keyboard shortcuts
            on(document, 'keydown', (e) => {
                if (e.target.tagName === 'INPUT') return;
                
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'PageUp':
                        e.preventDefault();
                        this.prevPage();
                        break;
                    case 'ArrowRight':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault();
                        this.nextPage();
                        break;
                    case 'Home':
                        e.preventDefault();
                        this.goToPage(1);
                        break;
                    case 'End':
                        e.preventDefault();
                        this.goToPage(state.totalPages);
                        break;
                    case 'Escape':
                        if ($('#settings-modal')?.classList.contains('visible')) {
                            ui.hideSettings();
                        } else if (state.uiVisible) {
                            ui.toggleUI();
                        }
                        break;
                }
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => reader.init());
    } else {
        reader.init();
    }
})();
