(() => {
    'use strict';

    // Утилиты
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const on = (element, event, handler) => element?.addEventListener(event, handler);
    
    // Хранилище настроек
    class Storage {
        static get(key, fallback = null) {
            try {
                const value = localStorage.getItem(`crimreader_${key}`);
                return value ? JSON.parse(value) : fallback;
            } catch {
                return fallback;
            }
        }
        
        static set(key, value) {
            try {
                localStorage.setItem(`crimreader_${key}`, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage failed:', e);
            }
        }
    }
    
    // Главный класс приложения
    class PremiumReader {
        constructor() {
            this.state = {
                bookContent: '',
                isUIVisible: false,
                isLoading: true,
                settings: {
                    theme: 'dark',
                    fontSize: 19,
                    lineHeight: 1.65,
                    font: 'crimson'
                }
            };
            
            this.elements = {
                loading: $('#loading'),
                navbar: $('#navbar'),
                content: $('#content'),
                progressBar: $('#progress-bar'),
                floatingControls: $('#floating-controls'),
                settingsModal: $('#settings-modal')
            };
            
            this.init();
        }
        
        async init() {
            this.showLoading('Инициализация премиум ридера...');
            
            try {
                this.loadSettings();
                await this.loadBook();
                this.renderContent();
                this.bindEvents();
                this.setupProgressTracking();
                this.restoreReadingPosition();
                
                await this.delay(1500); // Красивая пауза
                this.hideLoading();
                this.showUIBriefly();
                
                console.log('🎖️ Premium Reader initialized successfully');
            } catch (error) {
                console.error('Failed to initialize:', error);
                this.showError('Ошибка загрузки книги');
            }
        }
        
        async loadBook() {
            this.showLoading('Загрузка "Хаджи-Гирай"...');
            
            try {
                const response = await fetch('Khadzhi-Girai.txt');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                this.state.bookContent = await response.text();
                console.log(`📚 Book loaded: ${this.state.bookContent.length} characters`);
            } catch (error) {
                throw new Error('Не удалось загрузить файл Khadzhi-Girai.txt');
            }
        }
        
        renderContent() {
            this.showLoading('Форматирование текста...');
            
            const cleanText = this.state.bookContent
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
            let html = '';
            let foundTitle = false;
            let foundAuthor = false;
            
            paragraphs.forEach(paragraph => {
                const text = paragraph.trim().replace(/\n/g, ' ');
                if (!text) return;
                
                // Заголовок книги
                if (!foundTitle && (text.includes('Хаджи-Гирай') || text === 'Хаджи-Гирай')) {
                    html += `<h1>Хаджи-Гирай</h1>`;
                    foundTitle = true;
                }
                // Автор
                else if (!foundAuthor && (text.includes('Алим Къуртсеит') || text === 'Алим Къуртсеит')) {
                    html += `<div class="author">Алим Къуртсеит</div>`;
                    foundAuthor = true;
                }
                // Заголовки глав
                else if (this.isChapterTitle(text)) {
                    html += `<h2>${text}</h2>`;
                }
                // Обычные параграфы
                else {
                    html += `<p>${text}</p>`;
                }
            });
            
            this.elements.content.innerHTML = html;
            console.log(`📝 Rendered ${paragraphs.length} paragraphs`);
        }
        
        isChapterTitle(text) {
            return text.length < 80 && (
                text.startsWith('Глава') ||
                text.startsWith('ГЛАВА') ||
                /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
                text === text.toUpperCase()
            );
        }
        
        bindEvents() {
            // Настройки
            on($('#settings-btn'), 'click', () => this.showSettings());
            on($('#close-settings'), 'click', () => this.hideSettings());
            on($('#settings-modal'), 'click', (e) => {
                if (e.target.id === 'settings-modal') this.hideSettings();
            });
            
            // Смена темы
            on($('#theme-btn'), 'click', () => this.cycleTheme());
            
            // Плавающие кнопки
            on($('#scroll-top'), 'click', () => this.scrollToTop());
            on($('#scroll-bottom'), 'click', () => this.scrollToBottom());
            
            // Настройки в модальном окне
            $$('.settings-btn[data-theme]').forEach(btn => {
                on(btn, 'click', () => this.updateSetting('theme', btn.dataset.theme));
            });
            
            $$('.settings-btn[data-font]').forEach(btn => {
                on(btn, 'click', () => this.updateSetting('font', btn.dataset.font));
            });
            
            // Слайдеры
            const fontSlider = $('#font-size-slider');
            const lineHeightSlider = $('#line-height-slider');
            
            on(fontSlider, 'input', (e) => {
                const size = parseInt(e.target.value);
                $('#font-size-value').textContent = `${size}px`;
                this.updateSetting('fontSize', size);
            });
            
            on(lineHeightSlider, 'input', (e) => {
                const height = parseFloat(e.target.value);
                $('#line-height-value').textContent = height.toFixed(2);
                this.updateSetting('lineHeight', height);
            });
            
            // Управление UI
            let tapTimeout;
            on(document, 'click', (e) => {
                if (e.target.closest('button') || e.target.closest('.modal')) return;
                
                clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => this.toggleUI(), 100);
            });
            
            // Клавиатурное управление
            on(document, 'keydown', (e) => {
                if (e.target.tagName === 'INPUT') return;
                
                switch (e.key) {
                    case 'ArrowUp':
                    case 'PageUp':
                        this.smoothScroll(-window.innerHeight * 0.8);
                        break;
                    case 'ArrowDown':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault();
                        this.smoothScroll(window.innerHeight * 0.8);
                        break;
                    case 'Home':
                        this.scrollToTop();
                        break;
                    case 'End':
                        this.scrollToBottom();
                        break;
                    case 'Escape':
                        if (this.elements.settingsModal.classList.contains('visible')) {
                            this.hideSettings();
                        } else if (this.state.isUIVisible) {
                            this.hideUI();
                        }
                        break;
                    case 't':
                    case 'T':
                        this.cycleTheme();
                        break;
                }
            });
        }
        
        setupProgressTracking() {
            let scrollTimeout;
            
            on(window, 'scroll', () => {
                this.updateProgress();
                this.updateFloatingControls();
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => this.saveReadingPosition(), 300);
            });
        }
        
        updateProgress() {
            const scrolled = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const progress = maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0;
            
            this.elements.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        updateFloatingControls() {
            const scrolled = window.scrollY;
            const shouldShow = scrolled > 300;
            
            this.elements.floatingControls.classList.toggle('visible', shouldShow);
        }
        
        saveReadingPosition() {
            const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            Storage.set('reading_position', {
                progress: Math.max(0, Math.min(100, progress)),
                timestamp: Date.now()
            });
        }
        
        restoreReadingPosition() {
            const saved = Storage.get('reading_position');
            if (saved && saved.progress > 0) {
                setTimeout(() => {
                    const targetScroll = (saved.progress / 100) * (document.documentElement.scrollHeight - window.innerHeight);
                    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }, 1000);
            }
        }
        
        // UI методы
        showLoading(message) {
            $('#loading-status').textContent = message;
            this.elements.loading.classList.remove('hidden');
        }
        
        hideLoading() {
            this.elements.loading.classList.add('hidden');
            this.state.isLoading = false;
        }
        
        showError(message) {
            $('#loading-status').textContent = message;
            this.elements.loading.classList.remove('hidden');
        }
        
        toggleUI() {
            this.state.isUIVisible ? this.hideUI() : this.showUI();
        }
        
        showUI() {
            this.state.isUIVisible = true;
            this.elements.navbar.classList.add('visible');
        }
        
        hideUI() {
            this.state.isUIVisible = false;
            this.elements.navbar.classList.remove('visible');
        }
        
        showUIBriefly() {
            this.showUI();
            setTimeout(() => this.hideUI(), 4000);
        }
        
        showSettings() {
            this.elements.settingsModal.classList.add('visible');
            this.updateSettingsUI();
        }
        
        hideSettings() {
            this.elements.settingsModal.classList.remove('visible');
        }
        
        // Настройки
        loadSettings() {
            const saved = Storage.get('settings');
            if (saved) {
                Object.assign(this.state.settings, saved);
            }
            this.applySettings();
        }
        
        updateSetting(key, value) {
            this.state.settings[key] = value;
            this.applySettings();
            this.saveSettings();
            this.updateSettingsUI();
        }
        
        applySettings() {
            const { theme, fontSize, lineHeight, font } = this.state.settings;
            
            document.body.setAttribute('data-theme', theme);
            
            document.documentElement.style.setProperty('--font-size-reading', `${fontSize}px`);
            document.documentElement.style.setProperty('--line-height-reading', lineHeight);
            
            const fontMap = {
                crimson: '"Crimson Text", Georgia, serif',
                playfair: '"Playfair Display", Georgia, serif',
                georgia: 'Georgia, "Times New Roman", serif'
            };
            
            document.documentElement.style.setProperty('--font-reading', fontMap[font]);
        }
        
        saveSettings() {
            Storage.set('settings', this.state.settings);
        }
        
        updateSettingsUI() {
            const { theme, fontSize, lineHeight, font } = this.state.settings;
            
            // Обновляем кнопки тем
            $$('.settings-btn[data-theme]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });
            
            // Обновляем кнопки шрифтов
            $$('.settings-btn[data-font]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.font === font);
            });
            
            // Обновляем слайдеры
            const fontSlider = $('#font-size-slider');
            const fontValue = $('#font-size-value');
            if (fontSlider && fontValue) {
                fontSlider.value = fontSize;
                fontValue.textContent = `${fontSize}px`;
            }
            
            const lineSlider = $('#line-height-slider');
            const lineValue = $('#line-height-value');
            if (lineSlider && lineValue) {
                lineSlider.value = lineHeight;
                lineValue.textContent = lineHeight.toFixed(2);
            }
        }
        
        cycleTheme() {
            const themes = ['dark', 'light', 'warm'];
            const currentIndex = themes.indexOf(this.state.settings.theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            this.updateSetting('theme', nextTheme);
        }
        
        // Утилиты прокрутки
        scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        scrollToBottom() {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }
        
        smoothScroll(offset) {
            window.scrollBy({ top: offset, behavior: 'smooth' });
        }
        
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
    
    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new PremiumReader());
    } else {
        new PremiumReader();
    }
})();
