// Проверка доступа к читалке
async function checkAccess() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        if (!currentUser.id) {
            console.error('❌ No user ID found');
            window.location.replace('index.html');
            return;
        }
        
        // Получаем ID книги из URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('book') || '1';
        
        console.log('🔍 Checking access for user:', currentUser.id, 'book:', bookId);
        
        // Проверяем доступ через API
        const response = await fetch(`/api/books/${bookId}/access`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentUser.token || ''}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ Access denied:', response.status);
            window.location.replace('index.html');
            return;
        }
        
        const data = await response.json();
        console.log('✅ Access granted:', data);
        
        return { user: currentUser, bookId: parseInt(bookId) };
        
    } catch (error) {
        console.error('❌ Access check failed:', error);
        window.location.replace('index.html');
        return null;
    }
}

// Профессиональная система отображения текста
class ProfessionalReader {
    constructor() {
        this.container = null;
        this.content = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageHeight = 0;
        this.contentHeight = 0;
        this.isAnimating = false;
        this.settings = this.loadSettings();
        
        // Привязка методов
        this.handleResize = this.handleResize.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }
    
    async init() {
        // Проверяем доступ
        const access = await checkAccess();
        if (!access) return;
        
        this.container = document.getElementById('textContent');
        if (!this.container) {
            console.error('❌ Text content container not found');
            return;
        }
        
        // Загружаем контент
        await this.loadContent(access.bookId);
        
        // Инициализируем читалку
        this.setupEventListeners();
        this.calculateDimensions();
        this.applySettings();
        this.renderCurrentPage();
        this.updateUI();
        
        console.log('📚 Professional reader initialized');
    }
    
    async loadContent(bookId) {
        try {
            const response = await fetch(`/api/books/${bookId}/content`);
            if (!response.ok) throw new Error('Failed to load content');
            
            const data = await response.json();
            this.content = data.content;
            
            // Очищаем контейнер
            this.container.innerHTML = '';
            
            // Создаем элементы страниц
            this.createPages();
            
        } catch (error) {
            console.error('❌ Failed to load content:', error);
            this.container.innerHTML = '<p>Ошибка загрузки контента</p>';
        }
    }
    
    createPages() {
        if (!this.content) return;
        
        // Разбиваем контент на страницы
        const words = this.content.split(' ');
        const wordsPerPage = this.calculateWordsPerPage();
        
        this.pages = [];
        for (let i = 0; i < words.length; i += wordsPerPage) {
            const pageWords = words.slice(i, i + wordsPerPage);
            this.pages.push(pageWords.join(' '));
        }
        
        this.totalPages = this.pages.length;
        console.log(`📄 Created ${this.totalPages} pages`);
    }
    
    calculateWordsPerPage() {
        // Базовое количество слов на страницу
        let baseWords = 200;
        
        // Корректируем в зависимости от настроек
        if (this.settings.fontSize <= 14) baseWords += 50;
        if (this.settings.fontSize >= 18) baseWords -= 50;
        
        if (this.settings.textWidth === 'narrow') baseWords -= 30;
        if (this.settings.textWidth === 'wide') baseWords += 30;
        
        if (this.settings.lineHeight <= 1.4) baseWords += 20;
        if (this.settings.lineHeight >= 1.8) baseWords -= 20;
        
        return Math.max(50, baseWords);
    }
    
    calculateDimensions() {
        if (!this.container) return;
        
        // Получаем размеры контейнера
        const rect = this.container.getBoundingClientRect();
        this.pageHeight = rect.height;
        
        // Рассчитываем высоту контента
        this.contentHeight = this.pageHeight * this.totalPages;
        
        console.log('📏 Dimensions calculated:', {
            pageHeight: this.pageHeight,
            totalPages: this.totalPages,
            contentHeight: this.contentHeight
        });
    }
    
    renderCurrentPage() {
        if (!this.container || !this.pages || this.currentPage < 1 || this.currentPage > this.totalPages) {
            return;
        }
        
        const pageContent = this.pages[this.currentPage - 1];
        this.container.innerHTML = `<div class="page-content">${pageContent}</div>`;
        
        console.log(`📖 Rendered page ${this.currentPage}/${this.totalPages}`);
    }
    
    nextPage() {
        if (this.isAnimating || this.currentPage >= this.totalPages) return;
        
        this.isAnimating = true;
        this.currentPage++;
        
        // Анимация перелистывания
        this.container.style.transform = 'translateX(-100%)';
        this.container.style.opacity = '0.7';
        
        setTimeout(() => {
            this.renderCurrentPage();
            this.container.style.transform = 'translateX(0)';
            this.container.style.opacity = '1';
            
            setTimeout(() => {
                this.isAnimating = false;
                this.updateUI();
                this.saveProgress();
            }, 150);
        }, 150);
    }
    
    previousPage() {
        if (this.isAnimating || this.currentPage <= 1) return;
        
        this.isAnimating = true;
        this.currentPage--;
        
        // Анимация перелистывания
        this.container.style.transform = 'translateX(100%)';
        this.container.style.opacity = '0.7';
        
        setTimeout(() => {
            this.renderCurrentPage();
            this.container.style.transform = 'translateX(0)';
            this.container.style.opacity = '1';
            
            setTimeout(() => {
                this.isAnimating = false;
                this.updateUI();
                this.saveProgress();
            }, 150);
        }, 150);
    }
    
    goToPage(pageNumber) {
        if (this.isAnimating || pageNumber < 1 || pageNumber > this.totalPages) return;
        
        this.currentPage = pageNumber;
        this.renderCurrentPage();
        this.updateUI();
        this.saveProgress();
    }
    
    updateUI() {
        // Обновляем прогресс-бар
        const progress = (this.currentPage / this.totalPages) * 100;
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Обновляем номера страниц
        const pageNumbers = document.querySelectorAll('.page-number');
        pageNumbers.forEach(el => {
            el.textContent = `${this.currentPage} / ${this.totalPages}`;
        });
        
        // Обновляем кнопки навигации
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    }
    
    applySettings() {
        if (!this.container) return;
        
        const pageContent = this.container.querySelector('.page-content');
        if (!pageContent) return;
        
        // Применяем настройки шрифта
        pageContent.style.fontSize = `${this.settings.fontSize}px`;
        pageContent.style.fontFamily = this.settings.fontFamily;
        pageContent.style.lineHeight = this.settings.lineHeight;
        
        // Применяем настройки ширины
        const widthClasses = {
            'narrow': 'text-narrow',
            'medium': 'text-medium', 
            'wide': 'text-wide'
        };
        
        // Убираем старые классы
        Object.values(widthClasses).forEach(cls => {
            pageContent.classList.remove(cls);
        });
        
        // Добавляем новый класс
        pageContent.classList.add(widthClasses[this.settings.textWidth]);
        
        // Применяем тему
        const themeClasses = {
            'light': 'theme-light',
            'sepia': 'theme-sepia',
            'dark': 'theme-dark'
        };
        
        // Убираем старые классы темы
        Object.values(themeClasses).forEach(cls => {
            document.body.classList.remove(cls);
        });
        
        // Добавляем новую тему
        document.body.classList.add(themeClasses[this.settings.theme]);
        
        console.log('🎨 Settings applied:', this.settings);
    }
    
    changeFontSize(delta) {
        const newSize = Math.max(12, Math.min(24, this.settings.fontSize + delta));
        if (newSize === this.settings.fontSize) return;
        
        this.settings.fontSize = newSize;
        this.applySettings();
        this.saveSettings();
        
        // Пересоздаем страницы с новыми настройками
        this.createPages();
        this.calculateDimensions();
        this.renderCurrentPage();
        this.updateUI();
        
        console.log(`🔤 Font size changed to ${newSize}px`);
    }
    
    changeFontFamily(family) {
        this.settings.fontFamily = family;
        this.applySettings();
        this.saveSettings();
        
        // Пересоздаем страницы
        this.createPages();
        this.calculateDimensions();
        this.renderCurrentPage();
        this.updateUI();
        
        console.log(`📝 Font family changed to ${family}`);
    }
    
    setTextWidth(width) {
        this.settings.textWidth = width;
        this.applySettings();
        this.saveSettings();
        
        // Пересоздаем страницы
        this.createPages();
        this.calculateDimensions();
        this.renderCurrentPage();
        this.updateUI();
        
        console.log(`📏 Text width changed to ${width}`);
    }
    
    setLineHeight(height) {
        this.settings.lineHeight = height;
        this.applySettings();
        this.saveSettings();
        
        // Пересоздаем страницы
        this.createPages();
        this.calculateDimensions();
        this.renderCurrentPage();
        this.updateUI();
        
        console.log(`📐 Line height changed to ${height}`);
    }
    
    setTheme(theme) {
        this.settings.theme = theme;
        this.applySettings();
        this.saveSettings();
        
        console.log(`🎨 Theme changed to ${theme}`);
    }
    
    setupEventListeners() {
        // Обработчики кнопок
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        
        // Клавиатурные сокращения
        document.addEventListener('keydown', this.handleKeyPress);
        
        // Изменение размера окна
        window.addEventListener('resize', this.handleResize);
        
        // Обработчики настроек
        this.setupSettingsHandlers();
    }
    
    setupSettingsHandlers() {
        // Кнопки размера шрифта
        const fontSizeButtons = document.querySelectorAll('.font-size-btn');
        fontSizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const delta = btn.dataset.delta ? parseInt(btn.dataset.delta) : 0;
                this.changeFontSize(delta);
            });
        });
        
        // Кнопки семейства шрифтов
        const fontFamilyButtons = document.querySelectorAll('.font-family-btn');
        fontFamilyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.changeFontFamily(btn.dataset.family);
            });
        });
        
        // Кнопки ширины текста
        const widthButtons = document.querySelectorAll('.width-btn');
        widthButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTextWidth(btn.dataset.width);
            });
        });
        
        // Кнопки межстрочного интервала
        const lineHeightButtons = document.querySelectorAll('.lh-btn');
        lineHeightButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setLineHeight(parseFloat(btn.dataset.height));
            });
        });
        
        // Кнопки темы
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
            });
        });
    }
    
    handleKeyPress(event) {
        if (this.isAnimating) return;
        
        switch(event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                this.previousPage();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
                event.preventDefault();
                this.nextPage();
                break;
            case 'Home':
                event.preventDefault();
                this.goToPage(1);
                break;
            case 'End':
                event.preventDefault();
                this.goToPage(this.totalPages);
                break;
        }
    }
    
    handleResize() {
        // Дебаунс для производительности
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.calculateDimensions();
            this.createPages();
            this.renderCurrentPage();
            this.updateUI();
        }, 250);
    }
    
    loadSettings() {
        const defaultSettings = {
            fontSize: 16,
            fontFamily: 'Georgia, serif',
            textWidth: 'medium',
            lineHeight: 1.6,
            theme: 'light'
        };
        
        try {
            const saved = localStorage.getItem('readingSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
            return defaultSettings;
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('readingSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
        }
    }
    
    saveProgress() {
        try {
            const progress = {
                page: this.currentPage,
                totalPages: this.totalPages,
                timestamp: Date.now()
            };
            localStorage.setItem('readingProgress', JSON.stringify(progress));
        } catch (error) {
            console.error('❌ Failed to save progress:', error);
        }
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('readingProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                if (progress.page && progress.page <= this.totalPages) {
                    this.currentPage = progress.page;
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Failed to load progress:', error);
        }
        return false;
    }
}

// Инициализация читалки
let reader = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        reader = new ProfessionalReader();
        await reader.init();
        
        // Загружаем сохраненный прогресс
        if (reader.loadProgress()) {
            reader.renderCurrentPage();
            reader.updateUI();
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize reader:', error);
    }
});

// Глобальные функции для совместимости с HTML
function previousPage() {
    if (reader) reader.previousPage();
}

function nextPage() {
    if (reader) reader.nextPage();
}

function changeFontSize(delta) {
    if (reader) reader.changeFontSize(delta);
}

function changeFontFamily(family) {
    if (reader) reader.changeFontFamily(family);
}

function setTextWidth(width) {
    if (reader) reader.setTextWidth(width);
}

function setLineHeight(height) {
    if (reader) reader.setLineHeight(height);
}

function setTheme(theme) {
    if (reader) reader.setTheme(theme);
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openTableOfContents() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('open');
}

function closeTableOfContents() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
}

function goToChapter(chapterIndex) {
    if (reader) reader.goToPage(chapterIndex + 1);
    closeTableOfContents();
}

function toggleBookmark() {
    // Реализация закладок
    console.log('🔖 Bookmark toggled');
}

function scrollToTop() {
    if (reader) reader.goToPage(1);
}