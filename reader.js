(() => {
    'use strict';

    // Simple DOM utilities
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
        reader: null,
        publication: null,
        chapters: [],
        currentChapter: 0,
        currentPosition: 0,
        totalChapters: 0,
        uiVisible: false,
        
        settings: {
            theme: 'dark',
            fontFamily: 'serif',
            fontSize: 100,
            lineHeight: 1.6,
            columnWidth: 'medium',
            justifyText: true
        }
    };

    // Settings management
    const settings = {
        load() {
            const saved = storage.get('readium_reader_settings');
            if (saved) {
                Object.assign(state.settings, saved);
            }
            this.apply();
        },
        
        save() {
            storage.set('readium_reader_settings', state.settings);
        },
        
        apply() {
            document.body.setAttribute('data-theme', state.settings.theme);
            
            // Apply Readium CSS settings
            if (state.reader) {
                const userSettings = {
                    appearance: state.settings.theme === 'dark' ? 'night' : 
                               state.settings.theme === 'sepia' ? 'sepia' : 'default',
                    fontSize: `${state.settings.fontSize}%`,
                    fontFamily: state.settings.fontFamily,
                    lineHeight: state.settings.lineHeight,
                    columnWidth: state.settings.columnWidth,
                    textAlign: state.settings.justifyText ? 'justify' : 'start'
                };
                
                state.reader.updateSettings(userSettings);
            }
            
            this.updateUI();
            this.save();
        },
        
        update(key, value) {
            state.settings[key] = value;
            this.apply();
        },
        
        updateUI() {
            // Update theme buttons
            $$('.theme-option').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
            });
            
            // Update font family
            const fontSelect = $('#font-family');
            if (fontSelect) fontSelect.value = state.settings.fontFamily;
            
            // Update font size
            const fontSizeSlider = $('#font-size');
            const fontSizeDisplay = $('#font-size-display');
            if (fontSizeSlider && fontSizeDisplay) {
                fontSizeSlider.value = state.settings.fontSize;
                fontSizeDisplay.textContent = `${state.settings.fontSize}%`;
            }
            
            // Update line height
            const lineHeightRadio = $(`[name="line-height"][value="${state.settings.lineHeight}"]`);
            if (lineHeightRadio) lineHeightRadio.checked = true;
            
            // Update column width
            const columnWidthRadio = $(`[name="column-width"][value="${state.settings.columnWidth}"]`);
            if (columnWidthRadio) columnWidthRadio.checked = true;
            
            // Update justify text
            const justifyCheckbox = $('#justify-text');
            if (justifyCheckbox) justifyCheckbox.checked = state.settings.justifyText;
        }
    };

    // Progress management
    const progress = {
        save() {
            storage.set('readium_reader_progress', {
                chapter: state.currentChapter,
                position: state.currentPosition,
                timestamp: Date.now()
            });
        },
        
        load() {
            const saved = storage.get('readium_reader_progress');
            if (saved && state.reader) {
                // Restore reading position
                state.reader.goToChapter(saved.chapter, saved.position);
            }
        },
        
        update() {
            const currentPos = $('#current-position');
            const progressPercent = $('#progress-percent');
            const readingTime = $('#reading-time');
            const progressFill = $('#progress-fill');
            const progressHandle = $('#progress-handle');
            const currentPage = $('#current-page');
            const totalPages = $('#total-pages');
            
            if (state.reader && state.publication) {
                const location = state.reader.getCurrentLocation();
                
                if (currentPos) {
                    const chapterTitle = state.chapters[state.currentChapter]?.title || `Глава ${state.currentChapter + 1}`;
                    currentPos.textContent = chapterTitle;
                }
                
                if (progressPercent && location) {
                    const percent = Math.round(location.progression * 100);
                    progressPercent.textContent = `${percent}%`;
                    
                    if (progressFill) progressFill.style.width = `${percent}%`;
                    if (progressHandle) progressHandle.style.left = `${percent}%`;
                }
                
                if (readingTime && location) {
                    const remainingPercent = 100 - (location.progression * 100);
                    const estimatedMinutes = Math.ceil((remainingPercent / 100) * 45); // Estimate 45 min total
                    readingTime.textContent = `~${estimatedMinutes} мин`;
                }
                
                if (currentPage && totalPages && location) {
                    currentPage.textContent = location.position || '1';
                    totalPages.textContent = location.total || '100';
                }
            }
            
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
        
        showSidebar() {
            const sidebar = $('#toc-sidebar');
            const overlay = $('#overlay');
            
            if (sidebar) sidebar.classList.add('visible');
            if (overlay) overlay.classList.add('visible');
        },
        
        hideSidebar() {
            const sidebar = $('#toc-sidebar');
            const overlay = $('#overlay');
            
            if (sidebar) sidebar.classList.remove('visible');
            if (overlay) overlay.classList.remove('visible');
        },
        
        showSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.add('visible');
        },
        
        hideSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.remove('visible');
        },
        
        renderTOC() {
            const tocList = $('#toc-list');
            if (!tocList || !state.chapters.length) return;
            
            tocList.innerHTML = '';
            
            state.chapters.forEach((chapter, index) => {
                const item = document.createElement('div');
                item.className = 'toc-item';
                if (index === state.currentChapter) item.classList.add('active');
                
                item.innerHTML = `
                    <div class="toc-item-title">${chapter.title || `Глава ${index + 1}`}</div>
                    <div class="toc-item-page">Глава ${index + 1}</div>
                `;
                
                on(item, 'click', () => {
                    if (state.reader) {
                        state.reader.goToChapter(index);
                        ui.hideSidebar();
                    }
                });
                
                tocList.appendChild(item);
            });
        }
    };

    // Main Reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Инициализация Readium Reader...');
                
                settings.load();
                await this.loadBook();
                await this.initializeReader();
                
                progress.load();
                ui.renderTOC();
                this.bindEvents();
                
                ui.hideLoading();
                
                // Show UI briefly
                setTimeout(() => {
                    ui.toggleUI();
                    setTimeout(() => ui.toggleUI(), 3000);
                }, 500);
                
            } catch (error) {
                console.error('Failed to initialize reader:', error);
                ui.showLoading('Ошибка инициализации ридера. Проверьте подключение.');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка книги...');
                
                // Load chapters metadata
                const response = await fetch('book/chapters.json');
                if (!response.ok) throw new Error('Failed to load chapters.json');
                
                state.chapters = await response.json();
                state.totalChapters = state.chapters.length;
                
                // Create publication manifest for Readium
                const manifest = {
                    "@context": "https://readium.org/webpub-manifest/context.jsonld",
                    "metadata": {
                        "title": "Хаджи-Гирай",
                        "author": "Алим Къуртсеит",
                        "language": "crh",
                        "publisher": "КрымЧиталка"
                    },
                    "readingOrder": state.chapters.map((chapter, index) => ({
                        "href": chapter.href,
                        "type": "text/html",
                        "title": chapter.title || `Глава ${index + 1}`
                    }))
                };
                
                state.publication = manifest;
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        async initializeReader() {
            try {
                ui.showLoading('Инициализация читалки...');
                
                const container = $('#readium-reader');
                if (!container) throw new Error('Reader container not found');
                
                // Initialize Readium Navigator
                // Note: This is a simplified version - real Readium integration would be more complex
                state.reader = {
                    container: container,
                    currentChapter: 0,
                    currentPosition: 0,
                    
                    async loadChapter(chapterIndex) {
                        if (chapterIndex < 0 || chapterIndex >= state.chapters.length) return;
                        
                        try {
                            const chapter = state.chapters[chapterIndex];
                            const response = await fetch(chapter.href);
                            const content = await response.text();
                            
                            // Create a styled chapter container
                            container.innerHTML = `
                                <div class="readium-chapter" style="
                                    max-width: 680px;
                                    margin: 0 auto;
                                    padding: 2rem;
                                    font-family: var(--font-reading-serif);
                                    font-size: 1.125rem;
                                    line-height: 1.6;
                                    color: var(--text-primary);
                                ">
                                    <h1 style="
                                        font-size: 2rem;
                                        font-weight: 700;
                                        margin-bottom: 2rem;
                                        text-align: center;
                                        color: var(--text-primary);
                                    ">${chapter.title || `Глава ${chapterIndex + 1}`}</h1>
                                    <div style="text-align: justify;">${content}</div>
                                </div>
                            `;
                            
                            state.currentChapter = chapterIndex;
                            progress.update();
                            ui.renderTOC();
                            
                        } catch (error) {
                            console.error(`Failed to load chapter ${chapterIndex}:`, error);
                            container.innerHTML = `
                                <div style="text-align: center; padding: 4rem; color: var(--text-secondary);">
                                    <h2>Ошибка загрузки главы</h2>
                                    <p>Попробуйте обновить страницу</p>
                                </div>
                            `;
                        }
                    },
                    
                    goToChapter(chapterIndex, position = 0) {
                        this.loadChapter(chapterIndex);
                        state.currentPosition = position;
                    },
                    
                    nextChapter() {
                        if (state.currentChapter < state.totalChapters - 1) {
                            this.goToChapter(state.currentChapter + 1);
                        }
                    },
                    
                    prevChapter() {
                        if (state.currentChapter > 0) {
                            this.goToChapter(state.currentChapter - 1);
                        }
                    },
                    
                    getCurrentLocation() {
                        return {
                            progression: (state.currentChapter + 1) / state.totalChapters,
                            position: state.currentChapter + 1,
                            total: state.totalChapters
                        };
                    },
                    
                    updateSettings(userSettings) {
                        const chapterEl = container.querySelector('.readium-chapter');
                        if (chapterEl) {
                            // Apply font settings
                            if (userSettings.fontFamily === 'serif') {
                                chapterEl.style.fontFamily = 'var(--font-reading-serif)';
                            } else if (userSettings.fontFamily === 'sans') {
                                chapterEl.style.fontFamily = 'var(--font-reading-sans)';
                            } else if (userSettings.fontFamily === 'mono') {
                                chapterEl.style.fontFamily = 'var(--font-reading-mono)';
                            }
                            
                            // Apply font size
                            if (userSettings.fontSize) {
                                const baseSize = 1.125; // 18px equivalent
                                const newSize = baseSize * (parseInt(userSettings.fontSize) / 100);
                                chapterEl.style.fontSize = `${newSize}rem`;
                            }
                            
                            // Apply line height
                            if (userSettings.lineHeight) {
                                chapterEl.style.lineHeight = userSettings.lineHeight;
                            }
                            
                            // Apply text alignment
                            const contentEl = chapterEl.querySelector('div');
                            if (contentEl) {
                                contentEl.style.textAlign = userSettings.textAlign || 'justify';
                            }
                        }
                    }
                };
                
                // Load first chapter
                await state.reader.loadChapter(0);
                
            } catch (error) {
                console.error('Failed to initialize reader:', error);
                throw error;
            }
        },
        
        bindEvents() {
            // Navigation
            on($('#nav-prev'), 'click', () => state.reader?.prevChapter());
            on($('#nav-next'), 'click', () => state.reader?.nextChapter());
            on($('#nav-center'), 'click', () => ui.toggleUI());
            
            // Header buttons
            on($('#back-btn'), 'click', () => history.back());
            on($('#toc-btn'), 'click', () => ui.showSidebar());
            on($('#settings-btn'), 'click', () => ui.showSettings());
            
            // Footer controls
            on($('#prev-chapter'), 'click', () => state.reader?.prevChapter());
            on($('#next-chapter'), 'click', () => state.reader?.nextChapter());
            
            // Progress bar
            on($('#progress-bar'), 'click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const chapterIndex = Math.floor(ratio * state.totalChapters);
                state.reader?.goToChapter(chapterIndex);
            });
            
            // Sidebar
            on($('#close-toc'), 'click', () => ui.hideSidebar());
            on($('#overlay'), 'click', () => ui.hideSidebar());
            
            // Settings
            on($('#close-settings'), 'click', () => ui.hideSettings());
            on($('#settings-modal .modal-backdrop'), 'click', () => ui.hideSettings());
            
            // Theme selection
            $$('.theme-option').forEach(btn => {
                on(btn, 'click', () => settings.update('theme', btn.dataset.theme));
            });
            
            // Font family
            on($('#font-family'), 'change', (e) => settings.update('fontFamily', e.target.value));
            
            // Font size
            on($('#font-size'), 'input', (e) => {
                const size = parseInt(e.target.value);
                $('#font-size-display').textContent = `${size}%`;
                settings.update('fontSize', size);
            });
            
            // Line height
            $$('[name="line-height"]').forEach(radio => {
                on(radio, 'change', (e) => settings.update('lineHeight', parseFloat(e.target.value)));
            });
            
            // Column width
            $$('[name="column-width"]').forEach(radio => {
                on(radio, 'change', (e) => settings.update('columnWidth', e.target.value));
            });
            
            // Justify text
            on($('#justify-text'), 'change', (e) => settings.update('justifyText', e.target.checked));
            
            // Keyboard shortcuts
            on(document, 'keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
                
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'PageUp':
                        e.preventDefault();
                        state.reader?.prevChapter();
                        break;
                    case 'ArrowRight':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault();
                        state.reader?.nextChapter();
                        break;
                    case 'Home':
                        e.preventDefault();
                        state.reader?.goToChapter(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        state.reader?.goToChapter(state.totalChapters - 1);
                        break;
                    case 'Escape':
                        if ($('#settings-modal')?.classList.contains('visible')) {
                            ui.hideSettings();
                        } else if ($('#toc-sidebar')?.classList.contains('visible')) {
                            ui.hideSidebar();
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
