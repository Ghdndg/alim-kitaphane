// ========================================
// КОНФИГУРАЦИЯ И ПЕРЕМЕННЫЕ
// ========================================

const BOOK_FILE = 'Khadzhi-Girai.txt';
const ITEMS_PER_PAGE = 5; // Абзацев на одной странице
const STORAGE_KEY = 'book_reader_state';

let chapters = [];
let currentChapterIndex = 0;
let currentPageIndex = 0;
let totalPages = 0;
let bookmarkedPages = new Set();
let userSettings = {
    fontSize: 16,
    fontFamily: 'Inter',
    theme: 'light',
    textWidth: 'medium',
    lineHeight: 1.6
};

// ========================================
// ИНИЦИАЛИЗАЦИЯ
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация читалки...');
    
    loadSettings();
    applySettings();
    setupEventListeners();
    
    await loadAndParseBook();
    renderCurrentPage();
    updateTableOfContents();
    loadBookmarkState();
    updateProgressBar();
    
    console.log('✅ Читалка инициализирована');
});

// ========================================
// ЗАГРУЗКА И ПАРСИНГ КНИГИ
// ========================================

async function loadAndParseBook() {
    try {
        console.log('📖 Загрузка книги...');
        const response = await fetch(BOOK_FILE);
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        
        const text = await response.text();
        chapters = parseBook(text);
        
        console.log(`📚 Загружено ${chapters.length} глав`);
        console.log('Главы:', chapters.map(ch => ch.title));
        
        calculateTotalPages();
    } catch (error) {
        console.error('❌ Ошибка при загрузке книги:', error);
        showError('Ошибка загрузки книги. Проверьте файл ' + BOOK_FILE);
    }
}

function parseBook(text) {
    const chapterRegex = /^# (.+?)$/gm;
    const chapters = [];
    let match;
    let lastIndex = 0;

    // Находим все главы
    while ((match = chapterRegex.exec(text)) !== null) {
        const chapterTitle = match[1].trim();
        const startIndex = match.index + match[0].length;
        
        // Получаем текст следующей главы или конец файла
        const nextMatch = chapterRegex.exec(text);
        const endIndex = nextMatch ? nextMatch.index : text.length;
        
        // Возвращаем позицию для следующего поиска
        if (nextMatch) {
            chapterRegex.lastIndex = endIndex;
        }
        
        const chapterContent = text.substring(startIndex, endIndex).trim();
        const paragraphs = parseChapterContent(chapterContent);
        
        chapters.push({
            title: chapterTitle,
            paragraphs: paragraphs
        });
        
        lastIndex = endIndex;
    }

    return chapters;
}

function parseChapterContent(content) {
    // Разбиваем на абзацы (двойные или больше переносов)
    const paragraphRegex = /\n\n+/;
    const rawParagraphs = content.split(paragraphRegex);
    
    return rawParagraphs
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => p.replace(/\n/g, ' ')); // Заменяем одинарные переносы на пробелы
}

// ========================================
// РАСЧЕТ СТРАНИЦ
// ========================================

function calculateTotalPages() {
    totalPages = 0;
    
    chapters.forEach(chapter => {
        const pageCount = Math.ceil(chapter.paragraphs.length / ITEMS_PER_PAGE);
        totalPages += pageCount;
        chapter.pages = pageCount;
    });
    
    console.log(`📄 Всего страниц: ${totalPages}`);
}

function getAbsolutePageIndex(chapterIndex, pageIndex) {
    let absoluteIndex = 0;
    
    for (let i = 0; i < chapterIndex; i++) {
        absoluteIndex += chapters[i].pages || 0;
    }
    
    absoluteIndex += pageIndex;
    return absoluteIndex;
}

// ========================================
// РЕНДЕРИНГ СТРАНИЦЫ
// ========================================

function renderCurrentPage() {
    const bookContent = document.getElementById('bookContent');
    bookContent.innerHTML = '';

    if (chapters.length === 0) {
        bookContent.innerHTML = '<div class="loading"><p>Нет содержимого для отображения</p></div>';
        return;
    }

    const chapter = chapters[currentChapterIndex];
    if (!chapter) {
        console.error('❌ Глава не найдена:', currentChapterIndex);
        return;
    }

    // Создаем элемент главы
    const chapterEl = document.createElement('div');
    chapterEl.className = 'chapter';
    chapterEl.dataset.chapter = currentChapterIndex;

    // Заголовок главы
    const titleEl = document.createElement('h2');
    titleEl.className = 'chapter-title';
    titleEl.textContent = chapter.title;
    chapterEl.appendChild(titleEl);

    // Контент главы (абзацы на текущей странице)
    const bodyEl = document.createElement('div');
    bodyEl.className = 'chapter-body';

    const startIdx = currentPageIndex * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, chapter.paragraphs.length);

    for (let i = startIdx; i < endIdx; i++) {
        const pEl = document.createElement('p');
        pEl.textContent = chapter.paragraphs[i];
        bodyEl.appendChild(pEl);
    }

    chapterEl.appendChild(bodyEl);

    // Разделитель (если не последняя страница главы)
    if (endIdx < chapter.paragraphs.length || currentChapterIndex < chapters.length - 1) {
        const dividerEl = document.createElement('div');
        dividerEl.className = 'chapter-divider';
        dividerEl.textContent = '* * *';
        chapterEl.appendChild(dividerEl);
    }

    bookContent.appendChild(chapterEl);

    // Обновляем информацию о странице
    updatePageInfo();
    updateBookmarkButton();

    // Скроллим в начало
    document.querySelector('.reader-main').scrollTop = 0;
}

function updatePageInfo() {
    const currentAbsolutePage = getAbsolutePageIndex(currentChapterIndex, currentPageIndex) + 1;
    document.getElementById('pageNumber').textContent = currentAbsolutePage;
    document.getElementById('totalPages').textContent = totalPages;
    
    // Обновляем кнопки навигации
    document.getElementById('prevPageBtn').disabled = currentAbsolutePage === 1;
    document.getElementById('nextPageBtn').disabled = currentAbsolutePage === totalPages;
}

// ========================================
// НАВИГАЦИЯ
// ========================================

function nextPage() {
    const chapter = chapters[currentChapterIndex];
    const pagesInChapter = Math.ceil(chapter.paragraphs.length / ITEMS_PER_PAGE);

    if (currentPageIndex < pagesInChapter - 1) {
        currentPageIndex++;
    } else if (currentChapterIndex < chapters.length - 1) {
        currentChapterIndex++;
        currentPageIndex = 0;
    }

    saveBookState();
    renderCurrentPage();
    updateProgressBar();
}

function prevPage() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
    } else if (currentChapterIndex > 0) {
        currentChapterIndex--;
        const pagesInChapter = Math.ceil(chapters[currentChapterIndex].paragraphs.length / ITEMS_PER_PAGE);
        currentPageIndex = pagesInChapter - 1;
    }

    saveBookState();
    renderCurrentPage();
    updateProgressBar();
}

function goToChapter(chapterIndex) {
    currentChapterIndex = chapterIndex;
    currentPageIndex = 0;
    saveBookState();
    renderCurrentPage();
    updateProgressBar();
    updateTableOfContents();
    closeModal('tocModal');
}

// ========================================
// ЗАКЛАДКИ
// ========================================

function toggleBookmark() {
    const currentAbsolutePage = getAbsolutePageIndex(currentChapterIndex, currentPageIndex);
    
    if (bookmarkedPages.has(currentAbsolutePage)) {
        bookmarkedPages.delete(currentAbsolutePage);
        showNotification('Закладка удалена');
    } else {
        bookmarkedPages.add(currentAbsolutePage);
        showNotification('Закладка добавлена');
    }

    updateBookmarkButton();
    saveBookmarkState();
}

function updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const currentAbsolutePage = getAbsolutePageIndex(currentChapterIndex, currentPageIndex);
    
    if (bookmarkedPages.has(currentAbsolutePage)) {
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
    } else {
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i>';
    }
}

// ========================================
// ОГЛАВЛЕНИЕ
// ========================================

function updateTableOfContents() {
    const tocList = document.getElementById('tocList');
    tocList.innerHTML = '';

    chapters.forEach((chapter, index) => {
        const tocItem = document.createElement('div');
        tocItem.className = 'toc-item';
        if (index === currentChapterIndex) {
            tocItem.classList.add('active');
        }

        tocItem.innerHTML = `
            <strong>${index + 1}.</strong> ${chapter.title}
            <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
                ${chapter.paragraphs.length} абзацев
            </div>
        `;

        tocItem.addEventListener('click', () => goToChapter(index));
        tocList.appendChild(tocItem);
    });
}

// ========================================
// НАСТРОЙКИ
// ========================================

function setupEventListeners() {
    // Навигация
    document.getElementById('nextPageBtn').addEventListener('click', nextPage);
    document.getElementById('prevPageBtn').addEventListener('click', prevPage);
    document.getElementById('backBtn').addEventListener('click', () => window.history.back());

    // Модальные окна
    document.getElementById('tableOfContentsBtn').addEventListener('click', () => openModal('tocModal'));
    document.getElementById('settingsBtn').addEventListener('click', () => openModal('settingsModal'));
    document.getElementById('bookmarkBtn').addEventListener('click', toggleBookmark);

    // Закрытие модалей
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Настройки
    document.getElementById('fontSizeSlider').addEventListener('change', (e) => {
        userSettings.fontSize = parseInt(e.target.value);
        document.getElementById('fontSizeValue').textContent = userSettings.fontSize;
        applySettings();
        saveSettings();
    });

    document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
        userSettings.fontFamily = e.target.value;
        applySettings();
        saveSettings();
    });

    document.getElementById('themeSelect').addEventListener('change', (e) => {
        userSettings.theme = e.target.value;
        applySettings();
        saveSettings();
    });

    document.getElementById('textWidthSelect').addEventListener('change', (e) => {
        userSettings.textWidth = e.target.value;
        applySettings();
        saveSettings();
    });

    document.getElementById('lineHeightSlider').addEventListener('change', (e) => {
        userSettings.lineHeight = parseFloat(e.target.value);
        document.getElementById('lineHeightValue').textContent = userSettings.lineHeight;
        applySettings();
        saveSettings();
    });

    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);

    // Горячие клавиши
    document.addEventListener('keydown', handleKeyPress);

    // Закрытие модалей при клике вне
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function applySettings() {
    const root = document.documentElement;
    const body = document.body;
    const bookContent = document.getElementById('bookContent');

    // Размер шрифта
    root.style.fontSize = userSettings.fontSize + 'px';

    // Шрифт
    bookContent.style.fontFamily = userSettings.fontFamily + ', sans-serif';

    // Тема
    body.className = '';
    if (userSettings.theme === 'dark') {
        body.classList.add('dark-theme');
    } else if (userSettings.theme === 'sepia') {
        body.classList.add('sepia-theme');
    } else {
        body.classList.add('light-theme');
    }

    // Ширина текста
    bookContent.className = 'book-content width-' + userSettings.textWidth;

    // Межстрочный интервал
    root.style.setProperty('--line-height', userSettings.lineHeight);
    const paragraphs = document.querySelectorAll('.chapter-body p');
    paragraphs.forEach(p => {
        p.style.lineHeight = userSettings.lineHeight;
    });

    console.log('⚙️ Настройки применены:', userSettings);
}

function resetSettings() {
    userSettings = {
        fontSize: 16,
        fontFamily: 'Inter',
        theme: 'light',
        textWidth: 'medium',
        lineHeight: 1.6
    };

    // Обновляем UI настроек
    document.getElementById('fontSizeSlider').value = 16;
    document.getElementById('fontSizeValue').textContent = '16';
    document.getElementById('fontFamilySelect').value = 'Inter';
    document.getElementById('themeSelect').value = 'light';
    document.getElementById('textWidthSelect').value = 'medium';
    document.getElementById('lineHeightSlider').value = 1.6;
    document.getElementById('lineHeightValue').textContent = '1.6';

    applySettings();
    saveSettings();
    showNotification('Настройки сброшены');
}

// ========================================
// ГОРЯЧИЕ КЛАВИШИ
// ========================================

function handleKeyPress(e) {
    if (document.querySelector('.modal:not(.hidden)')) {
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal:not(.hidden)');
            closeModal(modal.id);
        }
        return;
    }

    switch (e.key) {
        case 'ArrowRight':
            nextPage();
            e.preventDefault();
            break;
        case 'ArrowLeft':
            prevPage();
            e.preventDefault();
            break;
        case 'Escape':
            window.history.back();
            break;
    }

    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                toggleBookmark();
                e.preventDefault();
                break;
            case 's':
                openModal('settingsModal');
                e.preventDefault();
                break;
            case 't':
                openModal('tocModal');
                e.preventDefault();
                break;
        }
    }
}

// ========================================
// МОДАЛЬНЫЕ ОКНА
// ========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
}

// ========================================
// ПРОГРЕСС БАР
// ========================================

function updateProgressBar() {
    const currentAbsolutePage = getAbsolutePageIndex(currentChapterIndex, currentPageIndex) + 1;
    const percentage = (currentAbsolutePage / totalPages) * 100;
    document.getElementById('progressFill').style.width = percentage + '%';
}

// ========================================
// УВЕДОМЛЕНИЯ
// ========================================

function showNotification(text) {
    const notification = document.getElementById('bookmarkNotification');
    document.getElementById('notificationText').textContent = text;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 2000);
}

function showError(message) {
    console.error('❌ Ошибка:', message);
    const bookContent = document.getElementById('bookContent');
    bookContent.innerHTML = `
        <div class="loading" style="color: red;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px;"></i>
            <p>${message}</p>
        </div>
    `;
}

// ========================================
// ЛОКАЛЬНОЕ ХРАНИЛИЩЕ
// ========================================

function saveBookState() {
    const state = {
        chapterIndex: currentChapterIndex,
        pageIndex: currentPageIndex,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY + '_state', JSON.stringify(state));
}

function loadBookState() {
    const saved = localStorage.getItem(STORAGE_KEY + '_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            currentChapterIndex = state.chapterIndex;
            currentPageIndex = state.pageIndex;
            console.log('📍 Восстановлена позиция чтения:', state);
        } catch (e) {
            console.error('Ошибка при загрузке состояния:', e);
        }
    }
}

function saveBookmarkState() {
    const bookmarksArray = Array.from(bookmarkedPages);
    localStorage.setItem(STORAGE_KEY + '_bookmarks', JSON.stringify(bookmarksArray));
}

function loadBookmarkState() {
    const saved = localStorage.getItem(STORAGE_KEY + '_bookmarks');
    if (saved) {
        try {
            const bookmarksArray = JSON.parse(saved);
            bookmarkedPages = new Set(bookmarksArray);
            console.log('🔖 Закладки загружены:', bookmarkedPages.size);
        } catch (e) {
            console.error('Ошибка при загрузке закладок:', e);
        }
    }
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(userSettings));
}

function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY + '_settings');
    if (saved) {
        try {
            userSettings = { ...userSettings, ...JSON.parse(saved) };
            console.log('⚙️ Настройки загружены:', userSettings);
        } catch (e) {
            console.error('Ошибка при загрузке настроек:', e);
        }
    }

    // Обновляем UI настроек
    document.getElementById('fontSizeSlider').value = userSettings.fontSize;
    document.getElementById('fontSizeValue').textContent = userSettings.fontSize;
    document.getElementById('fontFamilySelect').value = userSettings.fontFamily;
    document.getElementById('themeSelect').value = userSettings.theme;
    document.getElementById('textWidthSelect').value = userSettings.textWidth;
    document.getElementById('lineHeightSlider').value = userSettings.lineHeight;
    document.getElementById('lineHeightValue').textContent = userSettings.lineHeight;
}
