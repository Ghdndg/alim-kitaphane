(() => {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const on = (element, event, handler) => element?.addEventListener(event, handler);

    // Хранилище настроек
    const storage = {
        get(key, fallback = null) {
            try {
                return JSON.parse(localStorage.getItem(key)) || fallback;
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

    // Состояние приложения
    const state = {
        bookText: '',
        uiVisible: false,
        settings: {
            theme: 'dark',
            fontSize: 18,
            lineHeight: 1.7
        }
    };

    // Управление настройками
    const settings = {
        load() {
            const saved = storage.get('reader_settings');
            if (saved) {
                Object.assign(state.settings, saved);
            }
            this.apply();
            this.updateUI();
        },
        
        save() {
            storage.set('reader_settings', state.settings);
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
            // Обновляем кнопки тем
            $$('.option-card[data-theme]').forEach(card => {
                card.classList.toggle('active', card.dataset.theme === state.settings.theme);
            });
            
            // Обновляем слайдеры
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

    // Управление прогрессом
    const progress = {
        save() {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            storage.set('reading_progress', {
                scrollPercent: Math.max(0, Math.min(100, scrollPercent)),
                timestamp: Date.now()
            });
        },
        
        load() {
            const saved = storage.get('reading_progress');
            if (saved && saved.scrollPercent > 0) {
                setTimeout(() => {
                    const targetScroll = (saved.scrollPercent / 100) * (document.documentElement.scrollHeight - window.innerHeight);
                    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }, 800);
            }
        },
        
        update() {
            const progressBar = $('#progress-bar');
            if (progressBar) {
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
                progressBar.style.width = `${Math.max(0, Math.min(100, scrollPercent))}%`;
            }
        }
    };

    // Управление UI
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
        
        toggleNavbar() {
            state.uiVisible = !state.uiVisible;
            const navbar = $('#navbar');
            const floatingBtn = $('#settings-btn');
            
            if (navbar) navbar.classList.toggle('visible', state.uiVisible);
            if (floatingBtn) floatingBtn.classList.toggle('visible', state.uiVisible);
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

    // Основная логика ридера
    const reader = {
        async init() {
            try {
                ui.showLoading('Загрузка книги...');
                
                settings.load();
                await this.loadBook();
                this.renderBook();
                this.bindEvents();
                
                ui.hideLoading();
                
                // Показываем UI на несколько секунд
                setTimeout(() => {
                    ui.toggleNavbar();
                    setTimeout(() => ui.toggleNavbar(), 4000);
                }, 1000);
                
                // Загружаем прогресс после рендера
                setTimeout(() => {
                    progress.load();
                    progress.update();
                }, 1200);
                
                console.log('📚 Новый ридер запущен успешно!');
                
            } catch (error) {
                console.error('Ошибка инициализации:', error);
                ui.showLoading('Ошибка загрузки. Проверьте файл Khadzhi-Girai.txt');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка текста...');
                
                const response = await fetch('Khadzhi-Girai.txt');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: файл не найден`);
                }
                
                state.bookText = await response.text();
                console.log('📖 Загружено символов:', state.bookText.length);
                
                if (!state.bookText.trim()) {
                    throw new Error('Файл книги пустой');
                }
                
            } catch (error) {
                console.error('Ошибка загрузки книги:', error);
                throw error;
            }
        },
        
        renderBook() {
            ui.showLoading('Форматирование текста...');
            
            const content = $('#book-content');
            if (!content) return;
            
            // Очистка текста
            const cleanText = state.bookText
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            // Разбиение на абзацы
            const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
            
            let html = '';
            let foundTitle = false;
            let foundAuthor = false;
            let firstParagraph = true;
            
            paragraphs.forEach((paragraph) => {
                const trimmed = paragraph.trim().replace(/\n/g, ' ');
                if (!trimmed) return;
                
                // Заглавие книги
                if (!foundTitle && trimmed.includes('Хаджи-Гирай')) {
                    html += `<h1 class="book-title">Хаджи-Гирай</h1>`;
                    foundTitle = true;
                } 
                // Имя автора
                else if (!foundAuthor && trimmed.includes('Алим Къуртсеит')) {
                    html += `<div class="book-author">Алим Къуртсеит</div>`;
                    foundAuthor = true;
                }
                // Заголовки глав
                else if (trimmed.length < 100 && (
                    trimmed.startsWith('Глава') ||
                    trimmed.startsWith('ГЛАВА') ||
                    /^[А-ЯЁ\s\-]{4,60}$/.test(trimmed)
                )) {
                    html += `<h2 class="chapter-title">${trimmed}</h2>`;
                    firstParagraph = true; // После заголовка будет первый абзац
                } 
                // Обычные абзацы
                else {
                    const className = firstParagraph && foundTitle && foundAuthor ? 'text-paragraph' : 'text-paragraph';
                    html += `<p class="${className}">${trimmed}</p>`;
                    firstParagraph = false;
                }
            });
            
            content.innerHTML = html;
            
            console.log('📝 Отформатировано абзацев:', paragraphs.length);
        },
        
        bindEvents() {
            // Настройки
            on($('#settings-btn'), 'click', () => ui.showSettings());
            on($('#close-settings'), 'click', () => ui.hideSettings());
            
            // Клик вне модального окна
            on($('#settings-modal'), 'click', (e) => {
                if (e.target.id === 'settings-modal') {
                    ui.hideSettings();
                }
            });
            
            // Кнопки тем
            $$('.option-card[data-theme]').forEach(card => {
                on(card, 'click', () => settings.update('theme', card.dataset.theme));
            });
            
            // Слайдер размера шрифта
            const fontSizeSlider = $('#font-size-slider');
            const fontSizeValue = $('#font-size-value');
            if (fontSizeSlider && fontSizeValue) {
                on(fontSizeSlider, 'input', (e) => {
                    const size = parseInt(e.target.value);
                    fontSizeValue.textContent = `${size}px`;
                    settings.update('fontSize', size);
                });
            }
            
            // Слайдер междустрочного интервала
            const lineHeightSlider = $('#line-height-slider');
            const lineHeightValue = $('#line-height-value');
            if (lineHeightSlider && lineHeightValue) {
                on(lineHeightSlider, 'input', (e) => {
                    const height = parseFloat(e.target.value);
                    lineHeightValue.textContent = height.toFixed(1);
                    settings.update('lineHeight', height);
                });
            }
            
            // Прогресс прокрутки
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                progress.update();
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    progress.save();
                }, 250);
            });
            
            // Тап для переключения UI
            let tapTimeout;
            document.addEventListener('click', (e) => {
                // Не переключать UI при клике на кнопки или модальные окна
                if (e.target.closest('button') || e.target.closest('.settings-modal')) return;
                
                clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => {
                    ui.toggleNavbar();
                }, 100);
            });
            
            // Горячие клавиши
            document.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowUp':
                    case 'PageUp':
                        window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
                        break;
                    case 'ArrowDown':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault();
                        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                        break;
                    case 'Home':
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        break;
                    case 'End':
                        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
                        break;
                    case 'Escape':
                        if ($('#settings-modal')?.classList.contains('visible')) {
                            ui.hideSettings();
                        } else if (state.uiVisible) {
                            ui.toggleNavbar();
                        }
                        break;
                }
            });
        }
    };

    // Запуск приложения
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => reader.init());
    } else {
        reader.init();
    }
})();
