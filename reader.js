/**
 * Профессиональная читалка с правильной логикой отображения
 * Система страниц без погрешностей и с сохранением позиции
 */

class ProfessionalReader {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageHeight = 0;
        this.contentHeight = 0;
        this.containerHeight = 0;
        this.settings = this.loadSettings();
        this.isAnimating = false;
        
        // Элементы DOM
        this.textContent = null;
        this.container = null;
        this.wrapper = null;
        
        this.init();
    }
    
    init() {
        this.checkAccess().then(() => {
            this.setupElements();
            this.loadContent();
            this.calculateDimensions();
            this.setupEventListeners();
            this.applySettings();
            this.loadProgress();
        });
    }
    
    async checkAccess() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const accessToken = localStorage.getItem('accessToken');
        
        if (!currentUser.email || !accessToken) {
            window.location.replace('/index.html');
            return;
        }
        
        try {
            const response = await fetch('/api/users/library', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const bookId = 1;
                
                if (!data.library || !data.library.some(book => book.id === bookId)) {
                    window.location.replace('/index.html');
                    return;
                }
            } else {
                window.location.replace('/index.html');
                return;
            }
        } catch (error) {
            console.error('Access check failed:', error);
            window.location.replace('/index.html');
            return;
        }
    }
    
    setupElements() {
        this.textContent = document.getElementById('textContent');
        this.container = document.querySelector('.reader-container');
        this.wrapper = document.querySelector('.text-content-wrapper');
        
        if (!this.textContent || !this.container || !this.wrapper) {
            console.error('Required elements not found');
            return;
        }
    }
    
    async loadContent() {
        try {
            const response = await fetch('/api/books/1/content');
            if (response.ok) {
                const data = await response.json();
                this.textContent.innerHTML = data.content;
            }
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    }
    
    calculateDimensions() {
        // Получаем размеры контейнера
        const containerRect = this.container.getBoundingClientRect();
        this.containerHeight = containerRect.height;
        
        // Применяем настройки для точного расчета
        this.applySettings();
        
        // Ждем перерисовки
        requestAnimationFrame(() => {
            // Получаем высоту контента после применения стилей
            this.contentHeight = this.textContent.scrollHeight;
            
            // Вычисляем высоту страницы (видимая область)
            this.pageHeight = this.containerHeight;
            
            // Вычисляем общее количество страниц
            this.totalPages = Math.max(1, Math.ceil(this.contentHeight / this.pageHeight));
            
            console.log('📏 Dimensions calculated:', {
                containerHeight: this.containerHeight,
                contentHeight: this.contentHeight,
                pageHeight: this.pageHeight,
                totalPages: this.totalPages
            });
            
            this.updateUI();
        });
    }
    
    applySettings() {
        if (!this.textContent) return;
        
        // Применяем настройки шрифта
        this.textContent.style.fontSize = this.settings.fontSize + 'px';
        this.textContent.style.fontFamily = this.settings.fontFamily;
        this.textContent.style.lineHeight = this.settings.lineHeight;
        
        // Применяем настройки ширины
        const widthMap = {
            'narrow': '60%',
            'medium': '75%',
            'wide': '90%'
        };
        this.textContent.style.maxWidth = widthMap[this.settings.textWidth] || '75%';
        
        // Применяем тему
        this.textContent.className = `text-content theme-${this.settings.theme}`;
    }
    
    goToPage(pageNumber) {
        if (this.isAnimating) return;
        
        pageNumber = Math.max(1, Math.min(pageNumber, this.totalPages));
        
        if (pageNumber === this.currentPage) return;
        
        this.isAnimating = true;
        this.currentPage = pageNumber;
        
        // Вычисляем offset для страницы
        const offset = (pageNumber - 1) * this.pageHeight;
        
        // Применяем трансформацию с анимацией
        this.textContent.style.transition = 'transform 0.3s ease-in-out';
        this.textContent.style.transform = `translateY(-${offset}px)`;
        
        // Обновляем UI
        this.updateUI();
        
        // Сохраняем прогресс
        this.saveProgress();
        
        // Сбрасываем флаг анимации
        setTimeout(() => {
            this.isAnimating = false;
            this.textContent.style.transition = '';
        }, 300);
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }
    
    updateUI() {
        // Обновляем номер страницы
        const pageDisplay = document.querySelector('.page-number');
        if (pageDisplay) {
            pageDisplay.textContent = `${this.currentPage} / ${this.totalPages}`;
        }
        
        // Обновляем прогресс-бар
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const progress = (this.currentPage / this.totalPages) * 100;
            progressBar.style.width = progress + '%';
        }
        
        // Обновляем кнопки навигации
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages;
    }
    
    // Настройки
    changeFontSize(delta) {
        const oldProgress = this.getProgressPercent();
        
        this.settings.fontSize = Math.max(12, Math.min(24, this.settings.fontSize + delta));
        document.getElementById('fontSizeDisplay').textContent = this.settings.fontSize + 'px';
        
        this.applySettings();
        this.saveSettings();
        
        // Пересчитываем размеры и восстанавливаем позицию
        setTimeout(() => {
            this.calculateDimensions();
            this.goToPageByProgress(oldProgress);
        }, 100);
    }
    
    changeFontFamily(family) {
        const oldProgress = this.getProgressPercent();
        
        this.settings.fontFamily = family;
        this.applySettings();
        this.saveSettings();
        
        setTimeout(() => {
            this.calculateDimensions();
            this.goToPageByProgress(oldProgress);
        }, 100);
    }
    
    setTextWidth(width) {
        const oldProgress = this.getProgressPercent();
        
        this.settings.textWidth = width;
        this.applySettings();
        this.saveSettings();
        
        // Обновляем активную кнопку
        const widthButtons = document.querySelectorAll('.width-btn');
        widthButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.width === width);
        });
        
        setTimeout(() => {
            this.calculateDimensions();
            this.goToPageByProgress(oldProgress);
        }, 100);
    }
    
    setLineHeight(height) {
        const oldProgress = this.getProgressPercent();
        
        this.settings.lineHeight = height;
        this.applySettings();
        this.saveSettings();
        
        // Обновляем активную кнопку
        const heightButtons = document.querySelectorAll('.lh-btn');
        heightButtons.forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.height) === height);
        });
        
        setTimeout(() => {
            this.calculateDimensions();
            this.goToPageByProgress(oldProgress);
        }, 100);
    }
    
    setTheme(theme) {
        this.settings.theme = theme;
        this.applySettings();
        this.saveSettings();
        
        // Обновляем активную кнопку
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }
    
    getProgressPercent() {
        return this.totalPages > 1 ? (this.currentPage - 1) / (this.totalPages - 1) : 0;
    }
    
    goToPageByProgress(progress) {
        const targetPage = Math.max(1, Math.min(this.totalPages, Math.round(progress * (this.totalPages - 1) + 1)));
        this.goToPage(targetPage);
    }
    
    // Сохранение/загрузка
    saveSettings() {
        localStorage.setItem('readingSettings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const defaultSettings = {
            fontSize: 16,
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
            textWidth: 'medium',
            theme: 'light'
        };
        
        const saved = localStorage.getItem('readingSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    
    saveProgress() {
        const progress = {
            page: this.currentPage,
            progress: this.getProgressPercent(),
            timestamp: Date.now()
        };
        localStorage.setItem('readingProgress', JSON.stringify(progress));
    }
    
    loadProgress() {
        const saved = localStorage.getItem('readingProgress');
        if (saved) {
            const progress = JSON.parse(saved);
            this.goToPage(progress.page);
        }
    }
    
    // Оглавление
    goToChapter(chapterIndex) {
        // Простая реализация - можно улучшить
        const targetPage = Math.max(1, Math.floor((chapterIndex / 10) * this.totalPages));
        this.goToPage(targetPage);
    }
    
    // События
    setupEventListeners() {
        // Кнопки навигации
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.previousPage();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.nextPage();
            }
        });
        
        // Изменение размера окна
        window.addEventListener('resize', () => {
            const oldProgress = this.getProgressPercent();
            this.calculateDimensions();
            this.goToPageByProgress(oldProgress);
        });
    }
}

// Глобальные функции для совместимости с HTML
let reader;

function initializeReader() {
    reader = new ProfessionalReader();
}

// Функции для кнопок
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

function previousPage() {
    if (reader) reader.previousPage();
}

function nextPage() {
    if (reader) reader.nextPage();
}

function goToChapter(index) {
    if (reader) reader.goToChapter(index);
}

function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openTableOfContents() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('open');
}

function closeTableOfContents() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initializeReader);
