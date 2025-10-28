class BookReader {
    constructor() {
        this.book = '';
        this.pages = [];
        this.current = 0;
        this.ui = false;
        this.settings = { theme: 'dark', size: 17, line: 1.5 };
        
        this.el = {
            loading: document.getElementById('loading'),
            status: document.getElementById('status'),
            header: document.getElementById('header'),
            footer: document.getElementById('footer'),
            content: document.getElementById('content'),
            info: document.getElementById('info'),
            time: document.getElementById('time'),
            fill: document.getElementById('fill'),
            input: document.getElementById('input'),
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
            this.showUI();
        } catch (e) {
            this.el.status.textContent = 'Ошибка загрузки книги';
        }
    }
    
    async loadBook() {
        this.el.status.textContent = 'Загрузка текста...';
        const res = await fetch('Khadzhi-Girai.txt');
        if (!res.ok) throw new Error('File not found');
        this.book = await res.text();
        console.log('Книга загружена:', this.book.length, 'символов');
    }
    
    createPages() {
        this.el.status.textContent = 'Создание страниц...';
        
        // Очистка текста
        const clean = this.book
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        const paragraphs = clean.split('\n\n').filter(p => p.trim());
        
        // ПРОСТОЙ алгоритм: фиксированное количество слов на страницу
        const wordsPerPage = window.innerWidth <= 768 ? 180 : 250;
        
        this.pages = [];
        let currentWords = [];
        let wordCount = 0;
        
        for (const p of paragraphs) {
            const words = p.trim().split(/\s+/).length;
            
            if (wordCount + words > wordsPerPage && currentWords.length > 0) {
                this.pages.push(this.formatPage(currentWords));
                currentWords = [p.trim()];
                wordCount = words;
            } else {
                currentWords.push(p.trim());
                wordCount += words;
            }
        }
        
        if (currentWords.length > 0) {
            this.pages.push(this.formatPage(currentWords));
        }
        
        console.log('Создано страниц:', this.pages.length);
        console.log('Слов на страницу:', wordsPerPage);
        
        // Проверка на потери
        const originalWords = paragraphs.join(' ').split(/\s+/).length;
        let pageWords = 0;
        this.pages.forEach(page => {
            const div = document.createElement('div');
            div.innerHTML = page;
            pageWords += (div.textContent || '').split(/\s+/).length;
        });
        
        console.log('Слов в оригинале:', originalWords);
        console.log('Слов на страницах:', pageWords);
        console.log('Потерь:', originalWords - pageWords);
    }
    
    formatPage(paragraphs) {
        return paragraphs.map(p => {
            if (p === 'Хаджи-Гирай' || p.includes('Хаджи-Гирай')) {
                return `<h1>Хаджи-Гирай</h1>`;
            }
            if (p === 'Алим Къуртсеит' || p.includes('Алим Къуртсеит')) {
                return `<div class="author">Алим Къуртсеит</div>`;
            }
            if (p.length < 60 && (p === p.toUpperCase() || /^[А-ЯЁ\s\-\.]{3,50}$/.test(p))) {
                return `<h2>${p}</h2>`;
            }
            return `<p>${p}</p>`;
        }).join('');
    }
    
    render() {
        if (!this.pages[this.current]) return;
        
        this.el.content.innerHTML = this.pages[this.current];
        
        const total = this.pages.length;
        const num = this.current + 1;
        
        this.el.info.textContent = `${num} / ${total}`;
        this.el.input.value = num;
        this.el.input.max = total;
        
        const progress = total > 1 ? (this.current / (total - 1)) * 100 : 0;
        this.el.fill.style.width = `${progress}%`;
        
        const remaining = total - num;
        const minutes = Math.ceil(remaining * 1.2);
        this.el.time.textContent = `${minutes} мин`;
        
        this.el.prevBtn.disabled = this.current === 0;
        this.el.nextBtn.disabled = this.current === total - 1;
        
        this.saveProgress();
    }
    
    next() {
        if (this.current < this.pages.length - 1) {
            this.current++;
            this.render();
        }
    }
    
    prev() {
        if (this.current > 0) {
            this.current--;
            this.render();
        }
    }
    
    goto(page) {
        const p = Math.max(0, Math.min(page - 1, this.pages.length - 1));
        if (p !== this.current) {
            this.current = p;
            this.render();
        }
    }
    
    toggleUI() {
        this.ui = !this.ui;
        this.el.header.classList.toggle('visible', this.ui);
        this.el.footer.classList.toggle('visible', this.ui);
    }
    
    showUI() {
        this.ui = true;
        this.el.header.classList.add('visible');
        this.el.footer.classList.add('visible');
        
        setTimeout(() => {
            this.ui = false;
            this.el.header.classList.remove('visible');
            this.el.footer.classList.remove('visible');
        }, 3000);
    }
    
    hideLoading() {
        this.el.loading.classList.add('hidden');
    }
    
    showModal() {
        this.el.modal.classList.add('visible');
        this.updateUI();
    }
    
    hideModal() {
        this.el.modal.classList.remove('visible');
    }
    
    updateSetting(key, val) {
        this.settings[key] = val;
        this.applySettings();
        this.saveSettings();
        
        if (key === 'size' || key === 'line') {
            setTimeout(() => {
                this.createPages();
                this.render();
            }, 100);
        }
    }
    
    applySettings() {
        const { theme, size, line } = this.settings;
        
        if (theme === 'light') {
            document.body.style.background = '#fff';
            document.body.style.color = '#000';
        } else if (theme === 'sepia') {
            document.body.style.background = '#f4f1e8';
            document.body.style.color = '#5d4e37';
        } else {
            document.body.style.background = '#000';
            document.body.style.color = '#fff';
        }
        
        this.el.content.style.fontSize = `${size}px`;
        this.el.content.style.lineHeight = line;
    }
    
    updateUI() {
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
        });
        
        document.getElementById('size').value = this.settings.size;
        document.getElementById('size-val').textContent = `${this.settings.size}px`;
        
        document.getElementById('line').value = this.settings.line;
        document.getElementById('line-val').textContent = this.settings.line.toFixed(1);
    }
    
    saveSettings() {
        localStorage.setItem('reader_settings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('reader_settings');
            if (saved) Object.assign(this.settings, JSON.parse(saved));
        } catch {}
        this.applySettings();
    }
    
    saveProgress() {
        localStorage.setItem('reader_progress', this.current);
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('reader_progress');
            if (saved) this.current = Math.min(parseInt(saved), this.pages.length - 1);
        } catch {}
    }
    
    bindEvents() {
        // Навигация
        this.el.nextBtn.onclick = () => this.next();
        this.el.prevBtn.onclick = () => this.prev();
        
        // Зоны
        document.getElementById('prev').onclick = () => this.prev();
        document.getElementById('next').onclick = () => this.next();
        document.getElementById('menu').onclick = () => this.toggleUI();
        
        // Ввод
        this.el.input.onchange = (e) => this.goto(parseInt(e.target.value) || 1);
        
        // Прогресс
        document.getElementById('bar').onclick = (e) => {
            const rect = e.target.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const page = Math.ceil(ratio * this.pages.length);
            this.goto(page);
        };
        
        // Настройки
        document.getElementById('settings-btn').onclick = () => this.showModal();
        document.getElementById('close').onclick = () => this.hideModal();
        
        // Темы
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.onclick = () => this.updateSetting('theme', btn.dataset.theme);
        });
        
        // Слайдеры
        document.getElementById('size').oninput = (e) => {
            const val = parseInt(e.target.value);
            document.getElementById('size-val').textContent = `${val}px`;
            this.updateSetting('size', val);
        };
        
        document.getElementById('line').oninput = (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('line-val').textContent = val.toFixed(1);
            this.updateSetting('line', val);
        };
        
        // Клавиши
        document.onkeydown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.prev();
                    break;
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    this.next();
                    break;
                case 'Home':
                    this.goto(1);
                    break;
                case 'End':
                    this.goto(this.pages.length);
                    break;
                case 'Escape':
                    if (this.el.modal.classList.contains('visible')) {
                        this.hideModal();
                    } else if (this.ui) {
                        this.toggleUI();
                    }
                    break;
            }
        };
        
        this.loadProgress();
    }
}

new BookReader();
