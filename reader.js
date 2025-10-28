class BookReader {
    constructor() {
        this.bookText = '';
        this.pages = [];
        this.currentPageIndex = 0;
        this.totalPages = 0;
        this.isUIVisible = false;
        
        this.settings = {
            theme: 'dark',
            fontSize: 18,
            lineHeight: 1.6,
            wordsPerPage: 300
        };
        
        this.elements = {
            loadingScreen: document.getElementById('loadingScreen'),
            loadingStatus: document.getElementById('loadingStatus'),
            readerInterface: document.getElementById('readerInterface'),
            pageContent: document.getElementById('pageContent'),
            currentPage: document.getElementById('currentPage'),
            totalPages: document.getElementById('totalPages'),
            progressFill: document.getElementById('progressFill'),
            readingTime: document.getElementById('readingTime'),
            pageInput: document.getElementById('pageInput'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            settingsModal: document.getElementById('settingsModal')
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.loadSettings();
            await this.loadBookFile();
            this.createPages();
            this.bindEvents();
            this.loadProgress();
            this.renderCurrentPage();
            this.hideLoading();
            this.showUIBriefly();
            
            console.log('📖 Книга успешно загружена');
            console.log(`📊 Создано страниц: ${this.totalPages}`);
            console.log(`📝 Слов на страницу: ${this.settings.wordsPerPage}`);
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки книги. Проверьте файл Khadzhi-Girai.txt');
        }
    }
    
    async loadBookFile() {
        this.updateLoadingStatus('Загрузка текста книги...');
        
        try {
            const response = await fetch('Khadzhi-Girai.txt');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Файл не найден`);
            }
            
            this.bookText = await response.text();
            
            if (!this.bookText.trim()) {
                throw new Error('Файл пуст');
            }
            
            console.log(`📚 Загружено символов: ${this.bookText.length}`);
        } catch (error) {
            throw new Error(`Не удалось загрузить файл: ${error.message}`);
        }
    }
    
    createPages() {
        this.updateLoadingStatus('Создание страниц...');
        
        // Очистка и нормализация текста
        const cleanText = this.bookText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        // Разделение на параграфы
        const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
        
        this.pages = [];
        let currentPageParagraphs = [];
        let currentWordCount = 0;
        
        console.log(`🔄 Обрабатывается ${paragraphs.length} параграфов...`);
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            const wordCount = this.countWords(paragraph);
            
            // Проверяем, поместится ли параграф на текущую страницу
            if (currentWordCount + wordCount > this.settings.wordsPerPage && currentPageParagraphs.length > 0) {
                // Сохраняем текущую страницу
                this.pages.push(this.formatPage(currentPageParagraphs));
                console.log(`📄 Страница ${this.pages.length}: ${currentWordCount} слов`);
                
                // Начинаем новую страницу
                currentPageParagraphs = [paragraph];
                currentWordCount = wordCount;
            } else {
                // Добавляем параграф на текущую страницу
                currentPageParagraphs.push(paragraph);
                currentWordCount += wordCount;
            }
            
            // Показываем прогресс
            if (i % 10 === 0) {
                this.updateLoadingStatus(`Обработка... ${i + 1}/${paragraphs.length} параграфов`);
                await this.delay(1);
            }
        }
        
        // Добавляем последнюю страницу
        if (currentPageParagraphs.length > 0) {
            this.pages.push(this.formatPage(currentPageParagraphs));
            console.log(`📄 Финальная страница ${this.pages.length}: ${currentWordCount} слов`);
        }
        
        this.totalPages = this.pages.length;
        
        // Проверка целостности данных
        this.verifyDataIntegrity(paragraphs);
    }
    
    countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    formatPage(paragraphs) {
        return paragraphs.map(paragraph => {
            const text = paragraph.trim();
            
            // Определяем тип контента
            if (this.isMainTitle(text)) {
                return `<h1>${text}</h1>`;
            } else if (this.isAuthor(text)) {
                return `<div class="author">${text}</div>`;
            } else if (this.isChapterTitle(text)) {
                return `<h2>${text}</h2>`;
            } else {
                return `<p>${text}</p>`;
            }
        }).join('');
    }
    
    isMainTitle(text) {
        return text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай');
    }
    
    isAuthor(text) {
        return text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит');
    }
    
    isChapterTitle(text) {
        return text.length < 80 && (
            text.startsWith('Глава') ||
            text.startsWith('ГЛАВА') ||
            /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
            text === text.toUpperCase()
        );
    }
    
    verifyDataIntegrity(originalParagraphs) {
        const originalWordCount = originalParagraphs.reduce((total, p) => total + this.countWords(p), 0);
        
        let pagesWordCount = 0;
        this.pages.forEach(page => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page;
            const pageText = tempDiv.textContent || tempDiv.innerText || '';
            pagesWordCount += this.countWords(pageText);
        });
        
        const lostWords = originalWordCount - pagesWordCount;
        
        console.log(`🔍 Проверка целостности:`);
        console.log(`   Исходных слов: ${originalWordCount}`);
        console.log(`   Слов в страницах: ${pagesWordCount}`);
        console.log(`   Потеряно слов: ${lostWords}`);
        
        if (Math.abs(lostWords) > 10) {
            console.warn('⚠️ Обнаружена возможная потеря данных');
        } else {
            console.log('✅ Данные сохранены без потерь');
        }
    }
    
    renderCurrentPage() {
        if (!this.pages[this.currentPageIndex]) return;
        
        this.elements.pageContent.innerHTML = this.pages[this.currentPageIndex];
        this.updateUI();
    }
    
    updateUI() {
        const current = this.currentPageIndex + 1;
        const total = this.totalPages;
        
        this.elements.currentPage.textContent = current;
        this.elements.totalPages.textContent = total;
        this.elements.pageInput.value = current;
        this.elements.pageInput.max = total;
        
        // Обновление прогресс-бара
        const progress = total > 1 ? (this.currentPageIndex / (total - 1)) * 100 : 0;
        this.elements.progressFill.style.width = `${progress}%`;
        
        // Расчет времени чтения
        const remainingPages = total - current;
        const estimatedMinutes = Math.ceil(remainingPages * (this.settings.wordsPerPage / 200));
        this.elements.readingTime.textContent = `${estimatedMinutes} мин`;
        
        // Состояние кнопок навигации
        this.elements.prevBtn.disabled = this.currentPageIndex === 0;
        this.elements.nextBtn.disabled = this.currentPageIndex === total - 1;
        
        this.saveProgress();
    }
    
    nextPage() {
        if (this.currentPageIndex < this.totalPages - 1) {
            this.currentPageIndex++;
            this.renderCurrentPage();
        }
    }
    
    prevPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            this.renderCurrentPage();
        }
    }
    
    goToPage(pageNumber) {
        const pageIndex = Math.max(0, Math.min(pageNumber - 1, this.totalPages - 1));
        if (pageIndex !== this.currentPageIndex) {
            this.currentPageIndex = pageIndex;
            this.renderCurrentPage();
        }
    }
    
    updateLoadingStatus(message) {
        this.elements.loadingStatus.textContent = message;
    }
    
    hideLoading() {
        this.elements.loadingScreen.classList.add('hidden');
        this.elements.readerInterface.style.display = 'flex';
        setTimeout(() => {
            this.elements.loadingScreen.style.display = 'none';
        }, 500);
    }
    
    showError(message) {
        this.elements.loadingStatus.textContent = message;
        this.elements.loadingScreen.querySelector('.spinner').style.display = 'none';
    }
    
    showUIBriefly() {
        // UI показывается сразу и скрывается через 3 секунды
        setTimeout(() => {
            // Можно добавить логику скрытия UI
        }, 3000);
    }
    
    // Настройки
    loadSettings() {
        try {
            const saved = localStorage.getItem('bookReaderSettings');
            if (saved) {
                Object.assign(this.settings, JSON.parse(saved));
            }
        } catch (error) {
            console.warn('Не удалось загрузить настройки:', error);
        }
        
        this.applySettings();
    }
    
    saveSettings() {
        try {
            localStorage.setItem('bookReaderSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Не удалось сохранить настройки:', error);
        }
    }
    
    applySettings() {
        document.body.setAttribute('data-theme', this.settings.theme);
        
        if (this.elements.pageContent) {
            this.elements.pageContent.style.fontSize = `${this.settings.fontSize}px`;
            this.elements.pageContent.style.lineHeight = this.settings.lineHeight;
        }
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.applySettings();
        this.saveSettings();
        
        // Пересоздаем страницы при изменении количества слов
        if (key === 'wordsPerPage') {
            const currentProgress = this.currentPageIndex / (this.totalPages - 1);
            this.createPages();
            this.currentPageIndex = Math.round(currentProgress * (this.totalPages - 1));
            this.renderCurrentPage();
        }
    }
    
    // Прогресс чтения
    saveProgress() {
        try {
            localStorage.setItem('bookReaderProgress', JSON.stringify({
                pageIndex: this.currentPageIndex,
                totalPages: this.totalPages,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Не удалось сохранить прогресс:', error);
        }
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('bookReaderProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                if (progress.pageIndex < this.totalPages) {
                    this.currentPageIndex = progress.pageIndex;
                }
            }
        } catch (error) {
            console.warn('Не удалось загрузить прогресс:', error);
        }
    }
    
    bindEvents() {
        // Навигация кнопками
        this.elements.prevBtn.addEventListener('click', () => this.prevPage());
        this.elements.nextBtn.addEventListener('click', () => this.nextPage());
        
        // Зоны касания
        document.getElementById('prevZone').addEventListener('click', () => this.prevPage());
        document.getElementById('nextZone').addEventListener('click', () => this.nextPage());
        document.getElementById('menuZone').addEventListener('click', () => this.toggleSettings());
        
        // Ввод номера страницы
        this.elements.pageInput.addEventListener('change', (e) => {
            this.goToPage(parseInt(e.target.value) || 1);
        });
        
        // Прогресс-бар
        document.getElementById('progressBar').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const targetPage = Math.ceil(ratio * this.totalPages);
            this.goToPage(targetPage);
        });
        
        // Настройки
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeBtn').addEventListener('click', () => this.hideSettings());
        
        // Клик вне модального окна
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.hideSettings();
            }
        });
        
        // Кнопки тем
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateSetting('theme', btn.dataset.theme);
            });
        });
        
        // Слайдеры
        this.bindSlider('fontSizeSlider', 'fontSizeValue', 'fontSize', (value) => `${value}px`);
        this.bindSlider('lineHeightSlider', 'lineHeightValue', 'lineHeight', (value) => value.toFixed(1));
        this.bindSlider('wordsPerPageSlider', 'wordsPerPageValue', 'wordsPerPage', (value) => value.toString());
        
        // Клавиатурные сокращения
        document.addEventListener('keydown', (e) => {
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
                    this.goToPage(this.totalPages);
                    break;
                case 'Escape':
                    if (this.elements.settingsModal.classList.contains('visible')) {
                        this.hideSettings();
                    }
                    break;
            }
        });
        
        // Обновление значений слайдеров при загрузке
        this.updateSettingsUI();
    }
    
    bindSlider(sliderId, valueId, settingKey, formatter) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        slider.addEventListener('input', (e) => {
            const value = settingKey === 'lineHeight' ? parseFloat(e.target.value) : parseInt(e.target.value);
            valueDisplay.textContent = formatter(value);
            this.updateSetting(settingKey, value);
        });
    }
    
    updateSettingsUI() {
        // Обновляем значения слайдеров
        document.getElementById('fontSizeSlider').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = `${this.settings.fontSize}px`;
        
        document.getElementById('lineHeightSlider').value = this.settings.lineHeight;
        document.getElementById('lineHeightValue').textContent = this.settings.lineHeight.toFixed(1);
        
        document.getElementById('wordsPerPageSlider').value = this.settings.wordsPerPage;
        document.getElementById('wordsPerPageValue').textContent = this.settings.wordsPerPage.toString();
        
        // Обновляем активную тему
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
        });
    }
    
    toggleSettings() {
        if (this.elements.settingsModal.classList.contains('visible')) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }
    
    showSettings() {
        this.elements.settingsModal.classList.add('visible');
        this.updateSettingsUI();
    }
    
    hideSettings() {
        this.elements.settingsModal.classList.remove('visible');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new BookReader();
});
