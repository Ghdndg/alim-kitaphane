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
            const saved = storage.get('scroll_reader_settings');
            if (saved) {
                Object.assign(state.settings, saved);
            }
            this.apply();
            this.updateUI();
        },
        
        save() {
            storage.set('scroll_reader_settings', state.settings);
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
            const container = $('#content-container');
            if (!container) return;
            
            const scrollPercent = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
            storage.set('scroll_reader_progress', {
                scrollPercent: Math.max(0, Math.min(100, scrollPercent || 0)),
                timestamp: Date.now()
            });
        },
        
        load() {
            const saved = storage.get('scroll_reader_progress');
            if (saved && saved.scrollPercent > 0) {
                setTimeout(() => {
                    const container = $('#content-container');
                    if (container) {
                        const targetScroll = (saved.scrollPercent / 100) * (container.scrollHeight - container.clientHeight);
                        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
                    }
                }, 500);
            }
        },
        
        update() {
            const container = $('#content-container');
            const progressFill = $('#progress-fill');
            
            if (container && progressFill) {
                const scrollPercent = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
                progressFill.style.width = `${Math.max(0, Math.min(100, scrollPercent || 0))}%`;
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
            const navControls = $('#nav-controls');
            
            if (header) header.classList.toggle('visible', state.uiVisible);
            if (navControls) navControls.classList.toggle('visible', state.uiVisible);
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

    // Navigation controls
    const navigation = {
        scrollUp() {
            const container = $('#content-container');
            if (container) {
                container.scrollBy({ 
                    top: -window.innerHeight * 0.8, 
                    behavior: 'smooth' 
                });
            }
        },
        
        scrollDown() {
            const container = $('#content-container');
            if (container) {
                container.scrollBy({ 
                    top: window.innerHeight * 0.8, 
                    behavior: 'smooth' 
                });
            }
        },
        
        scrollToTop() {
            const container = $('#content-container');
            if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        
        scrollToBottom() {
            const container = $('#content-container');
            if (container) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }
    };

    // Main reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Загрузка книги...');
                
                settings.load();
                await this.loadBook();
                this.renderBook();
                
                this.bindEvents();
                progress.load();
                
                ui.hideLoading();
                
                // Show UI briefly
                setTimeout(() => {
                    ui.toggleUI();
                    setTimeout(() => ui.toggleUI(), 4000);
                }, 1000);
                
                console.log('📖 Button-controlled reader initialized successfully!');
                
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
                console.log('📖 Book loaded:', state.bookText.length, 'characters');
                
                if (!state.bookText.trim()) {
                    throw new Error('Book file is empty');
                }
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        renderBook() {
            ui.showLoading('Форматирование текста...');
            
            const content = $('#content');
            if (!content) return;
            
            // Clean text
            const cleanText = state.bookText
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            // Split into paragraphs
            const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
            
            let html = '';
            
            paragraphs.forEach(paragraph => {
                const trimmed = paragraph.trim().replace(/\n/g, ' ');
                if (!trimmed) return;
                
                // Check if it looks like a title
                if (trimmed.length < 100 && (
                    trimmed === trimmed.toUpperCase() || 
                    /^[А-ЯЁ\s\-]+$/.test(trimmed) ||
                    trimmed.startsWith('Глава') ||
                    trimmed.startsWith('ГЛАВА') ||
                    trimmed === 'Хаджи-Гирай' ||
                    trimmed === 'Алим Къуртсеит'
                )) {
                    if (trimmed === 'Хаджи-Гирай') {
                        html += `<h1>${trimmed}</h1>`;
                    } else {
                        html += `<h2>${trimmed}</h2>`;
                    }
                } else {
                    html += `<p>${trimmed}</p>`;
                }
            });
            
            content.innerHTML = html;
            
            console.log('📝 Rendered', paragraphs.length, 'paragraphs');
        },
        
        bindEvents() {
            // Settings
            on($('#settings-btn'), 'click', () => ui.showSettings());
            on($('#close-settings'), 'click', () => ui.hideSettings());
            
            // Navigation buttons
            on($('#up-btn'), 'click', () => navigation.scrollUp());
            on($('#down-btn'), 'click', () => navigation.scrollDown());
            
            // Click outside modal to close
            on($('#settings-modal'), 'click', (e) => {
                if (e.target.id === 'settings-modal') {
                    ui.hideSettings();
                }
            });
            
            // Theme buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                on(btn, 'click', () => settings.update('theme', btn.dataset.theme));
            });
            
            // Font size slider
            const fontSizeSlider = $('#font-size-slider');
            const fontSizeValue = $('#font-size-value');
            if (fontSizeSlider && fontSizeValue) {
                on(fontSizeSlider, 'input', (e) => {
                    const size = parseInt(e.target.value);
                    fontSizeValue.textContent = `${size}px`;
                    settings.update('fontSize', size);
                });
            }
            
            // Line height slider
            const lineHeightSlider = $('#line-height-slider');
            const lineHeightValue = $('#line-height-value');
            if (lineHeightSlider && lineHeightValue) {
                on(lineHeightSlider, 'input', (e) => {
                    const height = parseFloat(e.target.value);
                    lineHeightValue.textContent = height.toFixed(1);
                    settings.update('lineHeight', height);
                });
            }
            
            // Scroll progress tracking
            const container = $('#content-container');
            if (container) {
                let scrollTimeout;
                container.addEventListener('scroll', () => {
                    progress.update();
                    
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        progress.save();
                    }, 150);
                });
            }
            
            // Tap to toggle UI
            let tapTimeout;
            document.addEventListener('click', (e) => {
                // Don't toggle UI if clicking on buttons or modal
                if (e.target.closest('button') || e.target.closest('.modal')) return;
                
                clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => {
                    ui.toggleUI();
                }, 100);
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowUp':
                    case 'PageUp':
                        e.preventDefault();
                        navigation.scrollUp();
                        break;
                    case 'ArrowDown':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault();
                        navigation.scrollDown();
                        break;
                    case 'Home':
                        e.preventDefault();
                        navigation.scrollToTop();
                        break;
                    case 'End':
                        e.preventDefault();
                        navigation.scrollToBottom();
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
