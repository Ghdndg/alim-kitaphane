// Простой рабочий JavaScript без TypeScript синтаксиса
class YandexStyleReader {
    constructor() {
        this.WORDS_PER_PAGE = 250; // Уменьшили для лучшего отображения
        this.STORAGE_KEY = 'yandex-reader-state';
        
        // Инициализируем состояние
        this.state = {
            bookText: '',
            pages: [],
            currentPageIndex: 0,
            totalPages: 0,
            isUIVisible: false,
            isSettingsVisible: false,
            settings: {
                theme: 'dark',
                fontSize: 18,
                lineHeight: 1.6,
                alignment: 'justify',
                brightness: 100,
                scrollMode: false
            }
        };
        
        this.elements = {};
        this.init();
    }

    // Инициализация приложения
    async init() {
        try {
            console.log('🚀 Запуск ридера...');
            
            this.bindElements();
            this.loadSettings();
            
            this.updateLoadingStatus('Загрузка текста книги...');
            await this.loadBookFile();
            
            this.updateLoadingStatus('Создание страниц...');
            this.createPages();
            
            this.updateLoadingStatus('Настройка интерфейса...');
            this.bindEventListeners();
            this.loadProgress();
            
            this.renderCurrentPage();
            this.hideLoading();
            this.showUIBriefly();
            
            console.log('✅ Ридер успешно инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки книги: ' + error.message);
        }
    }

    // Связывание DOM элементов
    bindElements() {
        const elementIds = [
            'loadingScreen', 'loadingStatus', 'readerApp',
            'topBar', 'bottomBar', 'progressFill',
            'pageContent', 'currentPage', 'readingTime',
            'prevBtn', 'nextBtn', 'menuBtn', 'backBtn',
            'leftZone', 'centerZone', 'rightZone',
            'settingsPanel', 'settingsOverlay'
        ];
        
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
            } else {
                console.warn(`Элемент не найден: ${id}`);
            }
        });
        
        console.log('🔗 DOM элементы связаны:', Object.keys(this.elements).length);
    }

    // Загрузка файла книги
    async loadBookFile() {
        try {
            console.log('📚 Загрузка файла Khadzhi-Girai.txt...');
            
            const response = await fetch('Khadzhi-Girai.txt');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Файл не найден`);
            }
            
            this.state.bookText = await response.text();
            
            if (!this.state.bookText.trim()) {
                throw new Error('Файл пуст');
            }
            
            console.log(`✅ Загружено ${this.state.bookText.length} символов`);
        } catch (error) {
            throw new Error(`Не удалось загрузить книгу: ${error.message}`);
        }
    }

    // ИСПРАВЛЕННОЕ создание страниц
    createPages() {
        console.log('📄 Создание страниц...');
        
        // Очистка текста
        const cleanText = this.state.bookText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        // Разделение на параграфы
        const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
        console.log(`📝 Найдено параграфов: ${paragraphs.length}`);
        
        this.state.pages = [];
        let currentPageParagraphs = [];
        let currentWordCount = 0;
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            const wordCount = this.countWords(paragraph);
            
            // Проверяем, поместится ли параграф на текущую страницу
            if (currentWordCount + wordCount > this.WORDS_PER_PAGE && currentPageParagraphs.length > 0) {
                // Создаем страницу из накопленных параграфов
                const pageContent = this.formatPageContent(currentPageParagraphs);
                this.state.pages.push({
                    id: this.state.pages.length,
                    content: pageContent,
                    wordCount: currentWordCount
                });
                
                // Начинаем новую страницу
                currentPageParagraphs = [paragraph];
                currentWordCount = wordCount;
            } else {
                // Добавляем параграф на текущую страницу
                currentPageParagraphs.push(paragraph);
                currentWordCount += wordCount;
            }
            
            // Показываем прогресс
            if (i % 20 === 0) {
                this.updateLoadingStatus(`Обработано ${i}/${paragraphs.length} параграфов...`);
            }
        }
        
        // Добавляем последнюю страницу
        if (currentPageParagraphs.length > 0) {
            const pageContent = this.formatPageContent(currentPageParagraphs);
            this.state.pages.push({
                id: this.state.pages.length,
                content: pageContent,
                wordCount: currentWordCount
            });
        }
        
        this.state.totalPages = this.state.pages.length;
        
        console.log(`✅ Создано страниц: ${this.state.totalPages}`);
        console.log(`📊 Слов на страницу: ~${this.WORDS_PER_PAGE}`);
        
        // Проверка целостности
        this.verifyPages(paragraphs);
    }

    // Подсчет слов
    countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    // ИСПРАВЛЕННОЕ форматирование содержимого страницы
    formatPageContent(paragraphs) {
        return paragraphs.map(paragraph => {
            const text = paragraph.trim();
            
            // Заголовок книги
            if (text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай')) {
                return `<h1>${text}</h1>`;
            }
            
            // Автор
            if (text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит')) {
                return `<div class="author">${text}</div>`;
            }
            
            // Заголовок главы
            if (text.length < 80 && (
                text.startsWith('Глава') ||
                text.startsWith('ГЛАВА') ||
                /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
                text === text.toUpperCase()
            )) {
                return `<h2>${text}</h2>`;
            }
            
            // Обычный параграф
            return `<p>${text}</p>`;
        }).join('');
    }

    // Проверка целостности страниц
    verifyPages(originalParagraphs) {
        const originalWordCount = originalParagraphs.reduce((total, p) => total + this.countWords(p), 0);
        const paginatedWordCount = this.state.pages.reduce((total, page) => total + page.wordCount, 0);
        
        const difference = Math.abs(originalWordCount - paginatedWordCount);
        
        if (difference > 20) {
            console.warn(`⚠️ Возможная потеря данных: ${difference} слов`);
        } else {
            console.log('✅ Пагинация выполнена без значительных потерь');
        }
        
        console.log(`📊 Статистика: оригинал ${originalWordCount} слов, страницы ${paginatedWordCount} слов`);
    }

    // Привязка событий
    bindEventListeners() {
        console.log('🎮 Настройка событий...');
        
        // Навигация
        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => this.previousPage());
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => this.nextPage());
        }
        
        // Зоны касания
        if (this.elements.leftZone) {
            this.elements.leftZone.addEventListener('click', () => this.previousPage());
        }
        if (this.elements.rightZone) {
            this.elements.rightZone.addEventListener('click', () => this.nextPage());
        }
        if (this.elements.centerZone) {
            this.elements.centerZone.addEventListener('click', () => this.toggleUI());
        }
        
        // Настройки
        if (this.elements.menuBtn) {
            this.elements.menuBtn.addEventListener('click', () => this.toggleSettings());
        }
        if (this.elements.settingsOverlay) {
            this.elements.settingsOverlay.addEventListener('click', () => this.hideSettings());
        }
        
        // Клавиатура
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        console.log('✅ События настроены');
    }

    // Обработка клавиатуры
    handleKeydown(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault();
                this.previousPage();
                break;
            case 'ArrowRight':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                this.nextPage();
                break;
            case 'Home':
                this.goToPage(0);
                break;
            case 'End':
                this.goToPage(this.state.totalPages - 1);
                break;
            case 'Escape':
                if (this.state.isSettingsVisible) {
                    this.hideSettings();
                } else if (this.state.isUIVisible) {
                    this.hideUI();
                }
                break;
        }
    }

    // Рендеринг страницы
    renderCurrentPage() {
        const currentPage = this.state.pages[this.state.currentPageIndex];
        if (!currentPage || !this.elements.pageContent) {
            console.warn('Нет страницы для отображения');
            return;
        }
        
        // Плавная смена контента
        this.elements.pageContent.style.opacity = '0.7';
        
        setTimeout(() => {
            this.elements.pageContent.innerHTML = currentPage.content;
            this.elements.pageContent.style.opacity = '1';
            this.updateUI();
            this.saveProgress();
        }, 100);
    }

    // Обновление UI
    updateUI() {
        const current = this.state.currentPageIndex + 1;
        const total = this.state.totalPages;
        const progress = total > 1 ? (this.state.currentPageIndex / (total - 1)) * 100 : 0;
        
        // Прогресс
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }
        
        // Счетчик страниц (в процентах как в Яндекс.Книгах)
        if (this.elements.currentPage) {
            this.elements.currentPage.textContent = Math.round(progress).toString();
        }
        
        // Время чтения
        if (this.elements.readingTime) {
            const remainingPages = total - current;
            const minutes = Math.ceil(remainingPages * 1.2);
            this.elements.readingTime.textContent = `${minutes} мин`;
        }
        
        // Кнопки навигации
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.state.currentPageIndex === 0;
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = this.state.currentPageIndex === total - 1;
        }
    }

    // Навигация
    nextPage() {
        if (this.state.currentPageIndex < this.state.totalPages - 1) {
            this.state.currentPageIndex++;
            this.renderCurrentPage();
        }
    }

    previousPage() {
        if (this.state.currentPageIndex > 0) {
            this.state.currentPageIndex--;
            this.renderCurrentPage();
        }
    }

    goToPage(pageIndex) {
        const clampedIndex = Math.max(0, Math.min(pageIndex, this.state.totalPages - 1));
        if (clampedIndex !== this.state.currentPageIndex) {
            this.state.currentPageIndex = clampedIndex;
            this.renderCurrentPage();
        }
    }

    // Управление UI
    toggleUI() {
        if (this.state.isUIVisible) {
            this.hideUI();
        } else {
            this.showUI();
        }
    }

    showUI() {
        this.state.isUIVisible = true;
        if (this.elements.topBar) this.elements.topBar.classList.add('visible');
        if (this.elements.bottomBar) this.elements.bottomBar.classList.add('visible');
    }

    hideUI() {
        this.state.isUIVisible = false;
        if (this.elements.topBar) this.elements.topBar.classList.remove('visible');
        if (this.elements.bottomBar) this.elements.bottomBar.classList.remove('visible');
    }

    showUIBriefly() {
        this.showUI();
        setTimeout(() => {
            if (!this.state.isSettingsVisible) {
                this.hideUI();
            }
        }, 3000);
    }

    // Управление настройками
    toggleSettings() {
        if (this.state.isSettingsVisible) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }

    showSettings() {
        this.state.isSettingsVisible = true;
        if (this.elements.settingsPanel) this.elements.settingsPanel.classList.add('visible');
        this.showUI();
    }

    hideSettings() {
        this.state.isSettingsVisible = false;
        if (this.elements.settingsPanel) this.elements.settingsPanel.classList.remove('visible');
    }

    // Настройки
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY + '-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                Object.assign(this.state.settings, settings);
            }
        } catch (error) {
            console.warn('Не удалось загрузить настройки:', error);
        }
        this.applySettings();
    }

    saveSettings() {
        try {
            localStorage.setItem(this.STORAGE_KEY + '-settings', JSON.stringify(this.state.settings));
        } catch (error) {
            console.warn('Не удалось сохранить настройки:', error);
        }
    }

    applySettings() {
        const { theme, fontSize, lineHeight, alignment, brightness } = this.state.settings;
        
        document.body.setAttribute('data-theme', theme);
        document.documentElement.style.filter = `brightness(${brightness}%)`;
        
        if (this.elements.pageContent) {
            this.elements.pageContent.style.fontSize = `${fontSize}px`;
            this.elements.pageContent.style.lineHeight = lineHeight.toString();
            this.elements.pageContent.style.textAlign = alignment;
        }
    }

    // Прогресс чтения
    saveProgress() {
        try {
            const progress = {
                pageIndex: this.state.currentPageIndex,
                totalPages: this.state.totalPages,
                timestamp: Date.now()
            };
            localStorage.setItem(this.STORAGE_KEY + '-progress', JSON.stringify(progress));
        } catch (error) {
            console.warn('Не удалось сохранить прогресс:', error);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY + '-progress');
            if (saved) {
                const progress = JSON.parse(saved);
                if (progress.pageIndex < this.state.totalPages) {
                    this.state.currentPageIndex = progress.pageIndex;
                }
            }
        } catch (error) {
            console.warn('Не удалось загрузить прогресс:', error);
        }
    }

    // Утилиты загрузки
    updateLoadingStatus(message) {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = message;
        }
        console.log('🔄', message);
    }

    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.classList.add('hidden');
        }
        if (this.elements.readerApp) {
            this.elements.readerApp.style.display = 'flex';
        }
        
        setTimeout(() => {
            if (this.elements.loadingScreen) {
                this.elements.loadingScreen.style.display = 'none';
            }
        }, 300);
    }

    showError(message) {
        this.updateLoadingStatus(message);
        console.error('❌', message);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM загружен, запуск ридера...');
    
    try {
        window.reader = new YandexStyleReader();
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; font-family: Arial, sans-serif; text-align: center;">
                <div>
                    <h2>Ошибка инициализации</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007aff; color: white; border: none; border-radius: 8px; cursor: pointer;">Перезагрузить</button>
                </div>
            </div>
        `;
    }
});
