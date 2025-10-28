// TypeScript-style interfaces (в комментариях для JavaScript)
interface ReaderState {
    bookText: string;
    pages: Page[];
    currentPageIndex: number;
    totalPages: number;
    isUIVisible: boolean;
    isSettingsVisible: boolean;
    settings: ReaderSettings;
}

interface Page {
    id: number;
    content: string;
    wordCount: number;
}

interface ReaderSettings {
    theme: 'sepia' | 'gray' | 'dark' | 'auto';
    fontSize: number;
    lineHeight: number;
    alignment: 'left' | 'justify' | 'center';
    brightness: number;
    scrollMode: boolean;
}

/**
 * Профессиональный ридер в стиле Яндекс.Книг
 * Архитектура: TypeScript-подобная с прямым DOM рендерингом
 */
class YandexStyleReader {
    private state: ReaderState;
    private elements: { [key: string]: HTMLElement };
    private readonly WORDS_PER_PAGE = 300;
    private readonly STORAGE_KEY = 'yandex-reader-state';
    
    constructor() {
        this.state = this.initializeState();
        this.elements = this.bindElements();
        this.init();
    }

    /**
     * Инициализация состояния приложения
     */
    private initializeState(): ReaderState {
        const savedSettings = this.loadFromStorage('settings');
        return {
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
                scrollMode: false,
                ...savedSettings
            }
        };
    }

    /**
     * Связывание DOM элементов
     */
    private bindElements(): { [key: string]: HTMLElement } {
        const elements = {
            // Основные контейнеры
            loadingScreen: document.getElementById('loadingScreen'),
            loadingStatus: document.getElementById('loadingStatus'),
            readerApp: document.getElementById('readerApp'),
            
            // Элементы интерфейса
            topBar: document.getElementById('topBar'),
            bottomBar: document.getElementById('bottomBar'),
            progressFill: document.getElementById('progressFill'),
            
            // Контент
            pageContent: document.getElementById('pageContent'),
            currentPage: document.getElementById('currentPage'),
            readingTime: document.getElementById('readingTime'),
            
            // Кнопки навигации
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            menuBtn: document.getElementById('menuBtn'),
            backBtn: document.getElementById('backBtn'),
            
            // Зоны касания
            leftZone: document.getElementById('leftZone'),
            centerZone: document.getElementById('centerZone'),
            rightZone: document.getElementById('rightZone'),
            
            // Панель настроек
            settingsPanel: document.getElementById('settingsPanel'),
            settingsOverlay: document.getElementById('settingsOverlay'),
            
            // Контролы настроек
            brightnessSlider: document.getElementById('brightnessSlider'),
            decreaseFont: document.getElementById('decreaseFont'),
            increaseFont: document.getElementById('increaseFont'),
            scrollToggle: document.getElementById('scrollToggle')
        };

        // Проверка обязательных элементов
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`Element not found: ${key}`);
            }
        });

        return elements;
    }

    /**
     * Инициализация приложения
     */
    private async init(): Promise<void> {
        try {
            this.updateLoadingStatus('Инициализация ридера...');
            
            this.applySettings();
            await this.loadBookFile();
            this.createPages();
            this.bindEventListeners();
            this.loadProgress();
            
            this.renderCurrentPage();
            this.hideLoading();
            this.showUIBriefly();
            
            console.log('📖 Ридер инициализирован успешно');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки книги');
        }
    }

    /**
     * Загрузка файла книги
     */
    private async loadBookFile(): Promise<void> {
        this.updateLoadingStatus('Загрузка текста книги...');
        
        try {
            const response = await fetch('Khadzhi-Girai.txt');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Файл не найден`);
            }
            
            this.state.bookText = await response.text();
            
            if (!this.state.bookText.trim()) {
                throw new Error('Файл пуст');
            }
            
            console.log(`📚 Загружено ${this.state.bookText.length} символов`);
        } catch (error) {
            throw new Error(`Не удалось загрузить книгу: ${error.message}`);
        }
    }

    /**
     * Создание страниц с точной пагинацией
     */
    private createPages(): void {
        this.updateLoadingStatus('Создание страниц...');
        
        const cleanText = this.preprocessText(this.state.bookText);
        const paragraphs = this.splitIntoParagraphs(cleanText);
        
        this.state.pages = [];
        let currentPageParagraphs: string[] = [];
        let currentWordCount = 0;
        
        console.log(`🔄 Обработка ${paragraphs.length} параграфов...`);
        
        for (const paragraph of paragraphs) {
            const wordCount = this.countWords(paragraph);
            
            if (currentWordCount + wordCount > this.WORDS_PER_PAGE && currentPageParagraphs.length > 0) {
                // Создаем страницу из текущих параграфов
                this.addPage(currentPageParagraphs, currentWordCount);
                
                // Начинаем новую страницу
                currentPageParagraphs = [paragraph];
                currentWordCount = wordCount;
            } else {
                currentPageParagraphs.push(paragraph);
                currentWordCount += wordCount;
            }
        }
        
        // Добавляем последнюю страницу
        if (currentPageParagraphs.length > 0) {
            this.addPage(currentPageParagraphs, currentWordCount);
        }
        
        this.state.totalPages = this.state.pages.length;
        this.validatePagination(paragraphs);
        
        console.log(`✅ Создано ${this.state.totalPages} страниц`);
    }

    /**
     * Предобработка текста
     */
    private preprocessText(text: string): string {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Разделение на параграфы
     */
    private splitIntoParagraphs(text: string): string[] {
        return text.split('\n\n').filter(p => p.trim());
    }

    /**
     * Подсчет слов в тексте
     */
    private countWords(text: string): number {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Добавление страницы
     */
    private addPage(paragraphs: string[], wordCount: number): void {
        const content = this.formatPageContent(paragraphs);
        const page: Page = {
            id: this.state.pages.length,
            content,
            wordCount
        };
        
        this.state.pages.push(page);
    }

    /**
     * Форматирование содержимого страницы
     */
    private formatPageContent(paragraphs: string[]): string {
        return paragraphs.map(paragraph => {
            const text = paragraph.trim();
            
            // Заголовок книги
            if (this.isMainTitle(text)) {
                return `<h1>${text}</h1>`;
            }
            
            // Автор
            if (this.isAuthor(text)) {
                return `<div class="author">${text}</div>`;
            }
            
            // Заголовок главы
            if (this.isChapterTitle(text)) {
                return `<h2>${text}</h2>`;
            }
            
            // Обычный параграф
            return `<p>${text}</p>`;
        }).join('');
    }

    /**
     * Проверка на заголовок книги
     */
    private isMainTitle(text: string): boolean {
        return text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай');
    }

    /**
     * Проверка на автора
     */
    private isAuthor(text: string): boolean {
        return text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит');
    }

    /**
     * Проверка на заголовок главы
     */
    private isChapterTitle(text: string): boolean {
        return text.length < 80 && (
            text.startsWith('Глава') ||
            text.startsWith('ГЛАВА') ||
            /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
            text === text.toUpperCase()
        );
    }

    /**
     * Валидация пагинации
     */
    private validatePagination(originalParagraphs: string[]): void {
        const originalWordCount = originalParagraphs.reduce((total, p) => total + this.countWords(p), 0);
        const paginatedWordCount = this.state.pages.reduce((total, page) => total + page.wordCount, 0);
        
        const difference = Math.abs(originalWordCount - paginatedWordCount);
        
        if (difference > 10) {
            console.warn(`⚠️ Возможная потеря данных: ${difference} слов`);
        } else {
            console.log('✅ Пагинация выполнена без потерь');
        }
    }

    /**
     * Привязка обработчиков событий
     */
    private bindEventListeners(): void {
        // Навигация
        this.elements.prevBtn?.addEventListener('click', () => this.previousPage());
        this.elements.nextBtn?.addEventListener('click', () => this.nextPage());
        
        // Зоны касания
        this.elements.leftZone?.addEventListener('click', () => this.previousPage());
        this.elements.rightZone?.addEventListener('click', () => this.nextPage());
        this.elements.centerZone?.addEventListener('click', () => this.toggleUI());
        
        // Панель настроек
        this.elements.menuBtn?.addEventListener('click', () => this.toggleSettings());
        this.elements.settingsOverlay?.addEventListener('click', () => this.hideSettings());
        
        // Настройки
        this.elements.brightnessSlider?.addEventListener('input', (e) => {
            this.updateBrightness((e.target as HTMLInputElement).valueAsNumber);
        });
        
        this.elements.decreaseFont?.addEventListener('click', () => this.adjustFontSize(-1));
        this.elements.increaseFont?.addEventListener('click', () => this.adjustFontSize(1));
        
        this.elements.scrollToggle?.addEventListener('change', (e) => {
            this.toggleScrollMode((e.target as HTMLInputElement).checked);
        });
        
        // Кнопки тем
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-theme');
                if (theme) this.updateTheme(theme as any);
            });
        });
        
        // Межстрочный интервал
        document.querySelectorAll('.line-height-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const height = parseFloat(btn.getAttribute('data-height') || '1.6');
                this.updateLineHeight(height);
            });
        });
        
        // Выравнивание
        document.querySelectorAll('.alignment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const align = btn.getAttribute('data-align');
                if (align) this.updateAlignment(align as any);
            });
        });
        
        // Клавиатурная навигация
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Жесты
        this.bindGestures();
    }

    /**
     * Привязка жестов
     */
    private bindGestures(): void {
        let startX = 0;
        let startY = 0;
        
        this.elements.pageContent?.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        this.elements.pageContent?.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Проверяем горизонтальный свайп
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.previousPage();
                } else {
                    this.nextPage();
                }
            }
        });
    }

    /**
     * Обработка клавиатуры
     */
    private handleKeydown(e: KeyboardEvent): void {
        if (e.target instanceof HTMLInputElement) return;
        
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

    /**
     * Рендеринг текущей страницы
     */
    private renderCurrentPage(): void {
        const currentPage = this.state.pages[this.state.currentPageIndex];
        if (!currentPage || !this.elements.pageContent) return;
        
        // Прямой DOM рендеринг без виртуального DOM
        this.elements.pageContent.innerHTML = currentPage.content;
        
        this.updateUI();
        this.saveProgress();
    }

    /**
     * Обновление UI элементов
     */
    private updateUI(): void {
        const current = this.state.currentPageIndex + 1;
        const total = this.state.totalPages;
        const progress = total > 1 ? (this.state.currentPageIndex / (total - 1)) * 100 : 0;
        
        // Обновляем прогресс
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }
        
        // Обновляем счетчик страниц (в процентах как в Яндекс.Книгах)
        if (this.elements.currentPage) {
            this.elements.currentPage.textContent = Math.round(progress).toString();
        }
        
        // Время чтения
        if (this.elements.readingTime) {
            const remainingPages = total - current;
            const minutes = Math.ceil(remainingPages * 1.5);
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

    /**
     * Навигация по страницам
     */
    private nextPage(): void {
        if (this.state.currentPageIndex < this.state.totalPages - 1) {
            this.state.currentPageIndex++;
            this.renderCurrentPage();
        }
    }

    private previousPage(): void {
        if (this.state.currentPageIndex > 0) {
            this.state.currentPageIndex--;
            this.renderCurrentPage();
        }
    }

    private goToPage(pageIndex: number): void {
        const clampedIndex = Math.max(0, Math.min(pageIndex, this.state.totalPages - 1));
        if (clampedIndex !== this.state.currentPageIndex) {
            this.state.currentPageIndex = clampedIndex;
            this.renderCurrentPage();
        }
    }

    /**
     * Управление UI
     */
    private toggleUI(): void {
        if (this.state.isUIVisible) {
            this.hideUI();
        } else {
            this.showUI();
        }
    }

    private showUI(): void {
        this.state.isUIVisible = true;
        this.elements.topBar?.classList.add('visible');
        this.elements.bottomBar?.classList.add('visible');
    }

    private hideUI(): void {
        this.state.isUIVisible = false;
        this.elements.topBar?.classList.remove('visible');
        this.elements.bottomBar?.classList.remove('visible');
    }

    private showUIBriefly(): void {
        this.showUI();
        setTimeout(() => {
            if (!this.state.isSettingsVisible) {
                this.hideUI();
            }
        }, 3000);
    }

    /**
     * Управление настройками
     */
    private toggleSettings(): void {
        if (this.state.isSettingsVisible) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }

    private showSettings(): void {
        this.state.isSettingsVisible = true;
        this.elements.settingsPanel?.classList.add('visible');
        this.showUI(); // Показываем UI при открытии настроек
        this.updateSettingsUI();
    }

    private hideSettings(): void {
        this.state.isSettingsVisible = false;
        this.elements.settingsPanel?.classList.remove('visible');
    }

    /**
     * Обновление настроек UI
     */
    private updateSettingsUI(): void {
        // Яркость
        if (this.elements.brightnessSlider) {
            (this.elements.brightnessSlider as HTMLInputElement).value = this.state.settings.brightness.toString();
        }
        
        // Режим прокрутки
        if (this.elements.scrollToggle) {
            (this.elements.scrollToggle as HTMLInputElement).checked = this.state.settings.scrollMode;
        }
        
        // Активная тема
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === this.state.settings.theme);
        });
        
        // Межстрочный интервал
        document.querySelectorAll('.line-height-btn').forEach(btn => {
            const height = parseFloat(btn.getAttribute('data-height') || '1.6');
            btn.classList.toggle('active', Math.abs(height - this.state.settings.lineHeight) < 0.1);
        });
        
        // Выравнивание
        document.querySelectorAll('.alignment-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-align') === this.state.settings.alignment);
        });
    }

    /**
     * Обновление настроек
     */
    private updateTheme(theme: string): void {
        this.state.settings.theme = theme as any;
        document.body.setAttribute('data-theme', theme);
        this.saveSettings();
        this.updateSettingsUI();
    }

    private updateBrightness(brightness: number): void {
        this.state.settings.brightness = brightness;
        document.documentElement.style.filter = `brightness(${brightness}%)`;
        this.saveSettings();
    }

    private adjustFontSize(delta: number): void {
        const newSize = Math.max(14, Math.min(28, this.state.settings.fontSize + delta));
        if (newSize !== this.state.settings.fontSize) {
            this.state.settings.fontSize = newSize;
            this.applySettings();
            this.saveSettings();
        }
    }

    private updateLineHeight(lineHeight: number): void {
        this.state.settings.lineHeight = lineHeight;
        this.applySettings();
        this.saveSettings();
        this.updateSettingsUI();
    }

    private updateAlignment(alignment: string): void {
        this.state.settings.alignment = alignment as any;
        this.applySettings();
        this.saveSettings();
        this.updateSettingsUI();
    }

    private toggleScrollMode(enabled: boolean): void {
        this.state.settings.scrollMode = enabled;
        document.body.classList.toggle('scroll-mode', enabled);
        this.saveSettings();
    }

    /**
     * Применение настроек
     */
    private applySettings(): void {
        const { theme, fontSize, lineHeight, alignment, brightness, scrollMode } = this.state.settings;
        
        // Тема
        document.body.setAttribute('data-theme', theme);
        
        // Яркость
        document.documentElement.style.filter = `brightness(${brightness}%)`;
        
        // Режим прокрутки
        document.body.classList.toggle('scroll-mode', scrollMode);
        
        // Стили текста
        if (this.elements.pageContent) {
            this.elements.pageContent.style.fontSize = `${fontSize}px`;
            this.elements.pageContent.style.lineHeight = lineHeight.toString();
            this.elements.pageContent.style.textAlign = alignment;
        }
        
        // CSS переменные
        document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
        document.documentElement.style.setProperty('--line-height', lineHeight.toString());
    }

    /**
     * Сохранение и загрузка состояния
     */
    private saveSettings(): void {
        this.saveToStorage('settings', this.state.settings);
    }

    private saveProgress(): void {
        this.saveToStorage('progress', {
            pageIndex: this.state.currentPageIndex,
            totalPages: this.state.totalPages,
            timestamp: Date.now()
        });
    }

    private loadProgress(): void {
        const progress = this.loadFromStorage('progress');
        if (progress && progress.pageIndex < this.state.totalPages) {
            this.state.currentPageIndex = progress.pageIndex;
        }
    }

    private saveToStorage(key: string, data: any): void {
        try {
            localStorage.setItem(`${this.STORAGE_KEY}-${key}`, JSON.stringify(data));
        } catch (error) {
            console.warn('Не удалось сохранить в localStorage:', error);
        }
    }

    private loadFromStorage(key: string): any {
        try {
            const data = localStorage.getItem(`${this.STORAGE_KEY}-${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Не удалось загрузить из localStorage:', error);
            return null;
        }
    }

    /**
     * Утилиты загрузки
     */
    private updateLoadingStatus(message: string): void {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = message;
        }
    }

    private hideLoading(): void {
        this.elements.loadingScreen?.classList.add('hidden');
        if (this.elements.readerApp) {
            this.elements.readerApp.style.display = 'flex';
        }
        
        setTimeout(() => {
            if (this.elements.loadingScreen) {
                this.elements.loadingScreen.style.display = 'none';
            }
        }, 300);
    }

    private showError(message: string): void {
        this.updateLoadingStatus(message);
        console.error(message);
    }
}

// Синхронизация состояния между устройствами (заглушка для демонстрации)
class StateSynchronizer {
    static sync(state: any): void {
        // В реальном приложении здесь была бы синхронизация с сервером
        console.log('Синхронизация состояния:', state);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const reader = new YandexStyleReader();
    
    // Периодическая синхронизация (демонстрация)
    setInterval(() => {
        StateSynchronizer.sync({
            page: reader['state'].currentPageIndex,
            settings: reader['state'].settings
        });
    }, 30000);
});
