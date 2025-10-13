// Профессиональная читалка с правильной логикой отображения
let currentUser = null;
let currentBook = null;
let currentChapter = 0;
let chapters = [];
let readingSettings = {
    fontSize: 16,
    fontFamily: 'Georgia',
    textWidth: 'medium',
    lineHeight: 1.6,
    theme: 'light'
};

// Новая система отображения страниц
let pageSystem = {
    currentPage: 1,
    totalPages: 1,
    pageHeight: 0,
    contentHeight: 0,
    visibleContent: null,
    pageContainer: null,
    isAnimating: false
};

// Инициализация читалки
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация профессиональной читалки');
    
    // Проверяем доступ
    checkAccess().then(() => {
        initializeReader();
        loadSettings();
        initializeButtons();
    }).catch(error => {
        console.error('❌ Ошибка доступа:', error);
        window.location.replace('index.html');
    });
});

// Проверка доступа к книге
async function checkAccess() {
    try {
        // Получаем пользователя из localStorage
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            throw new Error('Пользователь не авторизован');
        }
        
        currentUser = JSON.parse(userData);
        console.log('👤 Пользователь:', currentUser.name);
        
        // Получаем ID книги из URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('book') || '1';
        
        // Проверяем доступ к книге через API
        const response = await fetch(`/api/books/${bookId}/access`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentUser.token || 'dummy'}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Нет доступа к книге');
        }
        
        const bookData = await response.json();
        currentBook = bookData.book;
        chapters = bookData.chapters;
        
        console.log('📚 Книга загружена:', currentBook.title);
        console.log('📖 Глав:', chapters.length);
        
    } catch (error) {
        console.error('❌ Ошибка проверки доступа:', error);
        throw error;
    }
}

// Инициализация читалки
function initializeReader() {
    console.log('🔧 Инициализация системы отображения');
    
    // Создаем контейнер для страниц
    createPageContainer();
    
    // Загружаем контент
    loadAllContent();
    
    // Настраиваем систему страниц
    setupPageSystem();
    
    // Загружаем прогресс
    loadReadingProgress();
    
    console.log('✅ Читалка инициализирована');
}

// Создание контейнера для страниц
function createPageContainer() {
    const readerMain = document.querySelector('.reader-main');
    const existingContent = document.getElementById('textContent');
    
    // Удаляем старый контент
    if (existingContent) {
        existingContent.remove();
    }
    
    // Создаем новый контейнер
    pageSystem.pageContainer = document.createElement('div');
    pageSystem.pageContainer.className = 'page-container';
    pageSystem.pageContainer.innerHTML = `
        <div class="page-content" id="pageContent">
            <div class="page-text" id="pageText"></div>
        </div>
    `;
    
    readerMain.appendChild(pageSystem.pageContainer);
    
    // Стили для контейнера
    const style = document.createElement('style');
    style.textContent = `
        .page-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            background: var(--bg-color);
        }
        
        .page-content {
            position: absolute;
            top: 80px;
            left: 20px;
            right: 20px;
            bottom: 80px;
            overflow: hidden;
            background: var(--bg-color);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease-in-out;
        }
        
        .page-text {
            padding: 30px;
            height: 100%;
            overflow: hidden;
            font-family: var(--font-family);
            font-size: var(--font-size);
            line-height: var(--line-height);
            color: var(--text-color);
            text-align: justify;
        }
        
        .page-turning {
            transform: translateX(-100%);
        }
        
        .page-turning-in {
            transform: translateX(100%);
            animation: slideIn 0.3s ease-in-out forwards;
        }
        
        @keyframes slideIn {
            to { transform: translateX(0); }
        }
        
        @media (max-width: 768px) {
            .page-content {
                top: 60px;
                left: 10px;
                right: 10px;
                bottom: 60px;
            }
            
            .page-text {
                padding: 20px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Загрузка всего контента
async function loadAllContent() {
    console.log('📖 Загрузка контента книги');
    
    let fullContent = '';
    
    for (let i = 0; i < chapters.length; i++) {
        try {
            const response = await fetch(`/api/books/${currentBook.id}/chapters/${chapters[i].id}`);
            const chapterData = await response.json();
            
            fullContent += `<div class="chapter" data-chapter="${i}">`;
            fullContent += `<h2 class="chapter-title">${chapters[i].title}</h2>`;
            fullContent += `<div class="chapter-content">${chapterData.content}</div>`;
            fullContent += `</div>`;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки главы ${i}:`, error);
        }
    }
    
    // Сохраняем полный контент
    pageSystem.fullContent = fullContent;
    console.log('✅ Контент загружен, символов:', fullContent.length);
}

// Настройка системы страниц
function setupPageSystem() {
    console.log('⚙️ Настройка системы страниц');
    
    // Применяем настройки
    applySettings();
    
    // Рассчитываем размеры
    calculatePageDimensions();
    
    // Отображаем первую страницу
    displayCurrentPage();
    
    // Обновляем навигацию
    updateNavigation();
}

// Расчет размеров страницы
function calculatePageDimensions() {
    const pageContent = document.getElementById('pageContent');
    const pageText = document.getElementById('pageText');
    
    if (!pageContent || !pageText) return;
    
    // Получаем размеры видимой области
    const containerRect = pageContent.getBoundingClientRect();
    pageSystem.pageHeight = containerRect.height;
    
    // Временно помещаем весь контент для измерения
    pageText.innerHTML = pageSystem.fullContent;
    pageSystem.contentHeight = pageText.scrollHeight;
    
    // Рассчитываем количество страниц
    pageSystem.totalPages = Math.max(1, Math.ceil(pageSystem.contentHeight / pageSystem.pageHeight));
    
    console.log('📏 Размеры страницы:', {
        pageHeight: Math.round(pageSystem.pageHeight),
        contentHeight: Math.round(pageSystem.contentHeight),
        totalPages: pageSystem.totalPages
    });
}

// Отображение текущей страницы
function displayCurrentPage() {
    if (pageSystem.isAnimating) return;
    
    const pageText = document.getElementById('pageText');
    if (!pageText) return;
    
    // Рассчитываем видимую часть контента
    const startOffset = (pageSystem.currentPage - 1) * pageSystem.pageHeight;
    const endOffset = startOffset + pageSystem.pageHeight;
    
    // Создаем видимую страницу
    const visibleContent = createVisiblePage(startOffset, endOffset);
    pageText.innerHTML = visibleContent;
    
    // Обновляем навигацию
    updateNavigation();
    
    // Сохраняем прогресс
    saveReadingProgress();
    
    console.log(`📄 Страница ${pageSystem.currentPage}/${pageSystem.totalPages}`);
}

// Создание видимой страницы
function createVisiblePage(startOffset, endOffset) {
    // Создаем временный контейнер для измерения
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 100%;
        font-family: var(--font-family);
        font-size: var(--font-size);
        line-height: var(--line-height);
        color: var(--text-color);
        text-align: justify;
        padding: 30px;
        box-sizing: border-box;
    `;
    tempContainer.innerHTML = pageSystem.fullContent;
    document.body.appendChild(tempContainer);
    
    // Находим видимую часть
    const visibleContent = extractVisibleContent(tempContainer, startOffset, endOffset);
    
    // Удаляем временный контейнер
    document.body.removeChild(tempContainer);
    
    return visibleContent;
}

// Извлечение видимой части контента
function extractVisibleContent(container, startOffset, endOffset) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let currentOffset = 0;
    let visibleContent = '';
    let node;
    
    while (node = walker.nextNode()) {
        const text = node.textContent;
        const nodeStart = currentOffset;
        const nodeEnd = currentOffset + text.length;
        
        // Проверяем пересечение с видимой областью
        if (nodeEnd > startOffset && nodeStart < endOffset) {
            const visibleStart = Math.max(0, startOffset - nodeStart);
            const visibleEnd = Math.min(text.length, endOffset - nodeStart);
            
            if (visibleStart < visibleEnd) {
                const visibleText = text.substring(visibleStart, visibleEnd);
                
                // Создаем элемент с видимым текстом
                const span = document.createElement('span');
                span.textContent = visibleText;
                visibleContent += span.outerHTML;
            }
        }
        
        currentOffset = nodeEnd;
    }
    
    return visibleContent || '<p>Содержимое страницы</p>';
}

// Обновление навигации
function updateNavigation() {
    // Обновляем номер страницы
    const pageNumbers = document.querySelector('.page-numbers');
    if (pageNumbers) {
        pageNumbers.textContent = `${pageSystem.currentPage} / ${pageSystem.totalPages}`;
    }
    
    // Обновляем прогресс-бар
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const progress = (pageSystem.currentPage / pageSystem.totalPages) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // Обновляем кнопки навигации
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = pageSystem.currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = pageSystem.currentPage >= pageSystem.totalPages;
    }
}

// Переход к предыдущей странице
function previousPage() {
    if (pageSystem.currentPage <= 1 || pageSystem.isAnimating) return;
    
    pageSystem.currentPage--;
    animatePageTransition('prev');
}

// Переход к следующей странице
function nextPage() {
    if (pageSystem.currentPage >= pageSystem.totalPages || pageSystem.isAnimating) return;
    
    pageSystem.currentPage++;
    animatePageTransition('next');
}

// Анимация перехода страницы
function animatePageTransition(direction) {
    if (pageSystem.isAnimating) return;
    
    pageSystem.isAnimating = true;
    const pageContent = document.getElementById('pageContent');
    
    // Добавляем класс анимации
    pageContent.classList.add('page-turning');
    
    setTimeout(() => {
        // Обновляем контент
        displayCurrentPage();
        
        // Убираем класс анимации
        pageContent.classList.remove('page-turning');
        
        pageSystem.isAnimating = false;
    }, 300);
}

// Применение настроек чтения
function applySettings() {
    const root = document.documentElement;
    
    // Устанавливаем CSS переменные
    root.style.setProperty('--font-size', `${readingSettings.fontSize}px`);
    root.style.setProperty('--font-family', readingSettings.fontFamily);
    root.style.setProperty('--line-height', readingSettings.lineHeight);
    
    // Применяем тему
    if (readingSettings.theme === 'dark') {
        root.style.setProperty('--bg-color', '#1a1a1a');
        root.style.setProperty('--text-color', '#e0e0e0');
    } else {
        root.style.setProperty('--bg-color', '#ffffff');
        root.style.setProperty('--text-color', '#333333');
    }
    
    // Применяем ширину текста
    const pageContent = document.getElementById('pageContent');
    if (pageContent) {
        pageContent.className = `page-content text-width-${readingSettings.textWidth}`;
    }
}

// Инициализация кнопок
function initializeButtons() {
    // Кнопки навигации
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', previousPage);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', nextPage);
    }
    
    // Кнопки настроек
    const fontSizeMinus = document.querySelector('.font-size-minus');
    const fontSizePlus = document.querySelector('.font-size-plus');
    
    if (fontSizeMinus) {
        fontSizeMinus.addEventListener('click', () => changeFontSize(-1));
    }
    
    if (fontSizePlus) {
        fontSizePlus.addEventListener('click', () => changeFontSize(1));
    }
    
    // Остальные кнопки настроек...
    console.log('🎮 Кнопки инициализированы');
}

// Изменение размера шрифта
function changeFontSize(delta) {
    const newSize = Math.max(12, Math.min(24, readingSettings.fontSize + delta));
    if (newSize === readingSettings.fontSize) return;
    
    readingSettings.fontSize = newSize;
    applySettings();
    saveSettings();
    
    // Пересчитываем страницы
    setTimeout(() => {
        calculatePageDimensions();
        displayCurrentPage();
    }, 100);
    
    // Обновляем отображение
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    if (fontSizeDisplay) {
        fontSizeDisplay.textContent = `${readingSettings.fontSize}px`;
    }
}

// Сохранение настроек
function saveSettings() {
    localStorage.setItem('readingSettings', JSON.stringify(readingSettings));
}

// Загрузка настроек
function loadSettings() {
    const saved = localStorage.getItem('readingSettings');
    if (saved) {
        readingSettings = { ...readingSettings, ...JSON.parse(saved) };
    }
    applySettings();
}

// Сохранение прогресса чтения
function saveReadingProgress() {
    if (currentUser && currentBook) {
        const progress = {
            userId: currentUser.id,
            bookId: currentBook.id,
            currentPage: pageSystem.currentPage,
            totalPages: pageSystem.totalPages,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`readingProgress_${currentBook.id}`, JSON.stringify(progress));
    }
}

// Загрузка прогресса чтения
function loadReadingProgress() {
    if (currentBook) {
        const saved = localStorage.getItem(`readingProgress_${currentBook.id}`);
        if (saved) {
            const progress = JSON.parse(saved);
            pageSystem.currentPage = Math.max(1, Math.min(progress.currentPage, pageSystem.totalPages));
        }
    }
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    setTimeout(() => {
        calculatePageDimensions();
        displayCurrentPage();
    }, 100);
});

// Дополнительные функции для читалки
function goBack() {
    window.location.href = 'index.html';
}

function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function toggleBookmark() {
    // Функция закладок (пока заглушка)
    console.log('🔖 Закладка переключена');
}

function openTableOfContents() {
    document.getElementById('sidebar').classList.add('open');
}

function closeTableOfContents() {
    document.getElementById('sidebar').classList.remove('open');
}

function handleReaderLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function goToChapter(chapterIndex) {
    // Переход к главе (пока заглушка)
    console.log('📖 Переход к главе:', chapterIndex);
    closeTableOfContents();
}

function changeFontFamily(family) {
    readingSettings.fontFamily = family;
    applySettings();
    saveSettings();
    
    // Обновляем активные кнопки
    document.querySelectorAll('.font-family-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.family === family);
    });
    
    // Пересчитываем страницы
    setTimeout(() => {
        calculatePageDimensions();
        displayCurrentPage();
    }, 100);
}

function setTextWidth(width) {
    readingSettings.textWidth = width;
    applySettings();
    saveSettings();
    
    // Обновляем активные кнопки
    document.querySelectorAll('.width-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.width === width);
    });
    
    // Пересчитываем страницы
    setTimeout(() => {
        calculatePageDimensions();
        displayCurrentPage();
    }, 100);
}

function setLineHeight(height) {
    readingSettings.lineHeight = height;
    applySettings();
    saveSettings();
    
    // Обновляем активные кнопки
    document.querySelectorAll('.lh-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.height) === height);
    });
    
    // Пересчитываем страницы
    setTimeout(() => {
        calculatePageDimensions();
        displayCurrentPage();
    }, 100);
}

function setTheme(theme) {
    readingSettings.theme = theme;
    applySettings();
    saveSettings();
    
    // Обновляем активные кнопки
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// Экспорт функций для глобального доступа
window.previousPage = previousPage;
window.nextPage = nextPage;
window.changeFontSize = changeFontSize;
window.goBack = goBack;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleBookmark = toggleBookmark;
window.openTableOfContents = openTableOfContents;
window.closeTableOfContents = closeTableOfContents;
window.handleReaderLogout = handleReaderLogout;
window.goToChapter = goToChapter;
window.changeFontFamily = changeFontFamily;
window.setTextWidth = setTextWidth;
window.setLineHeight = setLineHeight;
window.setTheme = setTheme;