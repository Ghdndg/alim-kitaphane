class SimpleReader {
    constructor() {
        this.state = {
            text: '',
            pages: [],
            currentPage: 0,
            totalPages: 0,
            uiVisible: false,
            settings: { theme: 'dark', fontSize: 18, lineHeight: 1.65 }
        };
        
        this.elements = {
            loading: document.getElementById('loading'),
            loadingText: document.getElementById('loading-text'),
            header: document.getElementById('header'),
            footer: document.getElementById('footer'),
            content: document.getElementById('content'),
            pageInfo: document.getElementById('page-info'),
            timeInfo: document.getElementById('time-info'),
            progressFill: document.getElementById('progress-fill'),
            pageInput: document.getElementById('page-input'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            modal: document.getElementById('modal')
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.loadSettings();
            await this.loadBook();
            this.createPages();
            this.bindEvents();
            this.render();
            this.hideLoading();
            this.showUIBriefly();
        } catch (error) {
            this.showError('Ошибка загрузки книги');
        }
    }
    
    showLoading(text = 'Загрузка...') {
        this.elements.loadingText.textContent = text;
        this.elements.loading.classList.remove('hidden');
    }
    
    hideLoading() {
        this.elements.loading.classList.add('hidden');
    }
    
    showError(text) {
        this.elements.loadingText.textContent = text;
    }
    
    async loadBook() {
        this.showLoading('Загрузка текста...');
        
        const response = await fetch('Khadzhi-Girai.txt');
        if (!response.ok) throw new Error('File not found');
        
        this.state.text = await response.text();
        console.log('Книга загружена:', this.state.text.length, 'символов');
    }
    
    createPages() {
        this.showLoading('Создание страниц...');
        
        // Очищаем и разбиваем текст
        const cleanText = this.state.text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
        
        // Вычисляем размер страницы
        const wordsPerPage = this.getWordsPerPage();
        
        this.state.pages = [];
        let currentPageWords = [];
        let wordCount = 0;
        
        for (const paragraph of paragraphs) {
            const words = paragraph.trim().split(/\s+/);
            
            // Если параграф не помещается на текущую страницу
            if (wordCount + words.length > wordsPerPage && currentPageWords.length > 0) {
                // Сохраняем текущую страницу
                this.state.pages.push(this.formatPage(currentPageWords));
                currentPageWords = [];
                wordCount = 0;
            }
            
            currentPageWords.push(paragraph.trim());
            wordCount += words.length;
        }
        
        // Добавляем последнюю страницу
        if (currentPageWords.length > 0) {
            this.state.pages.push(this.formatPage(currentPageWords));
        }
        
        this.state.totalPages = this.state.pages.length;
        
        console.log('Создано страниц:', this.state.totalPages);
        console.log('Слов на страницу:', wordsPerPage);
    }
    
    getWordsPerPage() {
        // Простой расчет на основе размера экрана
        const isMobile = window.innerWidth <= 768;
        const baseWords = isMobile ? 200 : 300;
        
        // Корректировка на размер шрифта
        const fontRatio = this.state.settings.fontSize / 18;
        return Math.floor(baseWords / fontRatio);
    }
    
    formatPage(paragraphs) {
        let html = '';
        let foundTitle = false;
        let foundAuthor = false;
        
        for (const p of paragraphs) {
            if (!foundTitle && (p === 'Хаджи-Гирай' || p.includes('Хаджи-Гирай'))) {
                html += `<h1>Хаджи-Гирай</h1>`;
                foundTitle = true;
            } else if (!foundAuthor && (p === 'Алим Къуртсеит' || p.includes('Алим Къуртсеит'))) {
                html += `<div class="author">Алим Къуртсеит</div>`;
                foundAuthor = true;
            } else if (this.isChapter(p)) {
                html += `<h2>${p}</h2>`;
            } else {
                html += `<p>${p}</p>`;
            }
        }
        
        return html;
    }
    
    isChapter(text) {
        return text.length < 80 && (
            text.startsWith('Глава') ||
            /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
            text === text.toUpperCase()
        );
    }
    
    render() {
        if (!this.state.pages[this.state.currentPage]) return;
        
        this.elements.content.innerHTML = this.state.pages[this.state.currentPage];
        
        // Обновляем UI
        this.elements.pageInfo.textContent = `${this.state.currentPage + 1} / ${this.state.totalPages}`;
        this.elements.pageInput.value = this.state.currentPage + 1;
        this.elements.pageInput.max = this.state.totalPages;
        
        // Прогресс
        const progress = this.state.totalPages > 1 ? (this.state.currentPage / (this.state.totalPages - 1)) * 100 : 0;
        this.elements.progressFill.style.width = `${progress}%`;
        
        // Время чтения
        const remainingPages = this.state.totalPages - this.state.currentPage - 1;
        const minutes = Math.ceil(remainingPages * 1.2);
        this.elements.timeInfo.textContent = `~${minutes} мин`;
        
        // Кнопки навигации
        this.elements.prevBtn.disabled = this.state.currentPage === 0;
        this.elements.nextBtn.disabled = this.state.currentPage === this.state.totalPages - 1;
        
        this.saveProgress();
    }
    
    nextPage() {
        if (this.state.currentPage < this.state.totalPages - 1) {
            this.state.currentPage++;
            this.render();
        }
    }
    
    prevPage() {
        if (this.state.currentPage > 0) {
            this.state.currentPage--;
            this.render();
        }
    }
    
    goToPage(page) {
        const pageIndex = Math.max(0, Math.min(page - 1, this.state.totalPages - 1));
        if (pageIndex !== this.state.currentPage) {
            this.state.currentPage = pageIndex;
            this.render();
        }
    }
    
    toggleUI() {
        this.state.uiVisible = !this.state.uiVisible;
        this.elements.header.classList.toggle('visible', this.state.uiVisible);
        this.elements.footer.classList.toggle('visible', this.state.uiVisible);
    }
    
    showUIBriefly() {
        this.state.uiVisible = true;
        this.elements.header.classList.add('visible');
        this.elements.footer.classList.add('visible');
        
        setTimeout(() => {
            this.state.uiVisible = false;
            this.elements.header.classList.remove('visible');
            this.elements.footer.classList.remove('visible');
        }, 3000);
    }
    
    showSettings() {
        this.elements.modal.classList.add('visible');
        this.updateSettingsUI();
    }
    
    hideSettings() {
        this.elements.modal.classList.remove('visible');
    }
    
    updateSetting(key, value) {
        this.state.settings[key] = value;
        this.applySettings();
        this.saveSettings();
        
        if (key === 'fontSize' || key === 'lineHeight') {
            this.createPages();
            this.render();
        }
    }
    
    applySettings() {
        const { theme, fontSize, lineHeight } = this.state.settings;
        
        // Применяем тему
        if (theme === 'light') {
            document.body.style.background = '#fff';
            document.body.style.color = '#000';
        } else if (theme === 'sepia') {
            document.body.style.background = '#f7f0e6';
            document.body.style.color = '#5d4e37';
        } else {
            document.body.style.background = '#000';
            document.body.style.color = '#fff';
        }
        
        // Применяем размеры
        this.elements.content.style.fontSize = `${fontSize}px`;
        this.elements.content.style.lineHeight = lineHeight;
    }
    
    updateSettingsUI() {
        // Обновляем кнопки тем
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.state.settings.theme);
        });
        
        // Обновляем слайдеры
        document.getElementById('font-slider').value = this.state.settings.fontSize;
        document.getElementById('font-value').textContent = `${this.state.settings.fontSize}px`;
        
        document.getElementById('line-slider').value = this.state.settings.lineHeight;
        document.getElementById('line-value').textContent = this.state.settings.lineHeight.toFixed(2);
    }
    
    saveSettings() {
        localStorage.setItem('reader_settings', JSON.stringify(this.state.settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('reader_settings');
            if (saved) {
                Object.assign(this.state.settings, JSON.parse(saved));
            }
        } catch {}
        
        this.applySettings();
    }
    
    saveProgress() {
        localStorage.setItem('reader_progress', this.state.currentPage);
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('reader_progress');
            if (saved) {
                this.state.currentPage = Math.min(parseInt(saved), this.state.totalPages - 1);
            }
        } catch {}
    }
    
    bindEvents() {
        // Навигация
        this.elements.prevBtn.onclick = () => this.prevPage();
        this.elements.nextBtn.onclick = () => this.nextPage();
        
        // Touch zones
        document.getElementById('prev-zone').onclick = () => this.prevPage();
        document.getElementById('next-zone').onclick = () => this.nextPage();
        document.getElementById('menu-zone').onclick = () => this.toggleUI();
        
        // Ввод страницы
        this.elements.pageInput.onchange = (e) => this.goToPage(parseInt(e.target.value) || 1);
        
        // Прогресс бар
        document.getElementById('progress-bar').onclick = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const page = Math.ceil(ratio * this.state.totalPages);
            this.goToPage(page);
        };
        
        // Настройки
        document.getElementById('settings-btn').onclick = () => this.showSettings();
        document.getElementById('close-btn').onclick = () => this.hideSettings();
        
        // Кнопки тем
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.onclick = () => this.updateSetting('theme', btn.dataset.theme);
        });
        
        // Слайдеры
        document.getElementById('font-slider').oninput = (e) => {
            const size = parseInt(e.target.value);
            document.getElementById('font-value').textContent = `${size}px`;
            this.updateSetting('fontSize', size);
        };
        
        document.getElementById('line-slider').oninput = (e) => {
            const height = parseFloat(e.target.value);
            document.getElementById('line-value').textContent = height.toFixed(2);
            this.updateSetting('lineHeight', height);
        };
        
        // Клавиатура
        document.onkeydown = (e) => {
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
                    this.goToPage(this.state.totalPages);
                    break;
                case 'Escape':
                    if (this.elements.modal.classList.contains('visible')) {
                        this.hideSettings();
                    } else if (this.state.uiVisible) {
                        this.toggleUI();
                    }
                    break;
            }
        };
        
        // Загрузка прогресса
        this.loadProgress();
    }
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    new SimpleReader();
});
