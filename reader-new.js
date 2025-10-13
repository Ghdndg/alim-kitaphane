// Проверка доступа к книге при загрузке
(async function checkAccess() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const accessToken = localStorage.getItem('accessToken');
    
    console.log('Reader access check:', {
        hasUser: !!currentUser.email,
        userEmail: currentUser.email,
        hasToken: !!accessToken
    });
    
    // Проверяем авторизацию
    if (!currentUser.email || !accessToken) {
        console.error('Access denied: No user or token');
        window.location.replace('/index.html');
        return;
    }
    
    // Проверяем покупку книги
    try {
        const response = await fetch('/api/users/library', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const bookId = 1; // ID книги Хаджи Гирай
            
            if (!data.library || !data.library.some(book => book.id === bookId)) {
                console.error('Access denied: Book not in library');
                window.location.replace('/index.html');
                return;
            }
            console.log('✅ Access granted - book is in user library');
        } else {
            console.error('Failed to fetch library');
            window.location.replace('/index.html');
            return;
        }
    } catch (error) {
        console.error('Access check error:', error);
    }
})();

// Глобальные переменные
let currentPage = 1;
let totalPages = 1;
let currentChapter = 0;
let isBookmarked = false;
let readingSettings = {
    fontSize: 16,
    fontFamily: 'Inter',
    theme: 'light',
    textWidth: 'medium',
    lineHeight: 1.6
};

// Данные книги (главы)
const chapters = [
    {
        title: "Къириш",
        content: `
            <h2 class="chapter-title">Къириш</h2>
            <div class="text-block">
                <p>Алим Мидат къалемининъ асери - "Хаджи Гирай" тарихий романы, Къырым Хандырынынъ буюк шахсиетлеринден биси акъкъында. Бу эсер садедже тарихий вакъалары анлатмай, бельки бир халкънынъ миллий рухыны, адетлерини ве ихтикъадларыны косьтере.</p>
                
                <p>Хаджи Гирай Хан - Къырым тарихининъ эн буюк шахсиетлеринден биси. Онынъ заманында Къырым Хандыры эвджинде эди. Дипломатия, тиджарет ве санат инкишаф этмишти. Къырым татарлары бутюн дюньяда хюрметле къаралырды.</p>
                
                <p>Романда автор бизни XV-XVI асырларына алып бара. О заман Къырым - Ширк Юлынынъ мархиз ноктъаларындан биси эди. Буюк тиджарет йоллары бу топракъларны кечирди. Шерклерден ве Гъарбдан тджирлер келирди.</p>
                
                <p>Лякин бу романнынъ асыл къыммети онда ки, о бизге эски Къырымнынъ гуньдалыкъ хаятыны косьтере. Халкъ насыл яшайды эди, не фикир этирди, неге инанырды - бутюн бунлар эсерде ачыкъ косьтерильди.</p>
            </div>
        `
    },
    // Остальные главы копируются из старого файла
];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeReader();
    initializeButtons();
    loadSettings();
    loadReadingProgress();
    loadAllContent();
    
    // Слушатель изменения размера окна
    window.addEventListener('resize', () => {
        debounce(() => {
            calculatePageDimensions();
            restoreScrollPosition();
        }, 300)();
    });
});

// Основная функция расчета пагинации
function calculatePageDimensions() {
    const wrapper = document.querySelector('.text-content-wrapper');
    const textContent = document.getElementById('textContent');
    
    if (!wrapper || !textContent) return;
    
    // Ширина одной страницы = ширина wrapper
    const pageWidth = wrapper.clientWidth;
    
    // Общая ширина контента (учитывая колонки)
    const scrollWidth = textContent.scrollWidth;
    
    // Количество страниц
    totalPages = Math.ceil(scrollWidth / pageWidth);
    
    // Текущая страница на основе скролла
    currentPage = Math.floor(wrapper.scrollLeft / pageWidth) + 1;
    
    console.log('📐 Page dimensions:', {
        pageWidth,
        scrollWidth,
        currentPage,
        totalPages,
        scrollLeft: wrapper.scrollLeft
    });
    
    updatePageNumbers();
    updateNavigationButtons();
}

// Предыдущая страница
function previousPage() {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    const pageWidth = wrapper.clientWidth;
    wrapper.scrollBy({
        left: -pageWidth,
        behavior: 'smooth'
    });
}

// Следующая страница  
function nextPage() {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    const pageWidth = wrapper.clientWidth;
    wrapper.scrollBy({
        left: pageWidth,
        behavior: 'smooth'
    });
}

// Обновление навигационных кнопок
function updateNavigationButtons() {
    const wrapper = document.querySelector('.text-content-wrapper');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (!wrapper || !prevBtn || !nextBtn) return;
    
    const pageWidth = wrapper.clientWidth;
    const scrollLeft = wrapper.scrollLeft;
    const maxScroll = wrapper.scrollWidth - pageWidth;
    
    prevBtn.disabled = scrollLeft <= 10; // Допуск 10px
    nextBtn.disabled = scrollLeft >= maxScroll - 10;
}

// Обновление номера страницы
function updatePageNumbers() {
    const pageDisplay = document.getElementById('pageDisplay');
    if (pageDisplay) {
        pageDisplay.textContent = `${currentPage} / ${totalPages}`;
    }
}

// Сохранение позиции чтения
function saveReadingProgress() {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    const progress = {
        scrollLeft: wrapper.scrollLeft,
        chapter: currentChapter,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('readingProgress_book1', JSON.stringify(progress));
}

// Загрузка позиции чтения
function loadReadingProgress() {
    const saved = localStorage.getItem('readingProgress_book1');
    if (saved) {
        try {
            const progress = JSON.parse(saved);
            currentChapter = progress.chapter || 0;
            
            // Восстанавливаем скролл после загрузки контента
            setTimeout(() => {
                const wrapper = document.querySelector('.text-content-wrapper');
                if (wrapper && progress.scrollLeft) {
                    wrapper.scrollLeft = progress.scrollLeft;
                    calculatePageDimensions();
                }
            }, 100);
        } catch (e) {
            console.error('Error loading progress:', e);
        }
    }
}

// Восстановление позиции после изменения настроек
function restoreScrollPosition() {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    // Сохраняем процент прогресса
    const scrollPercent = wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth) || 0;
    
    // После изменений восстанавливаем процент
    setTimeout(() => {
        const newMaxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        wrapper.scrollLeft = scrollPercent * newMaxScroll;
        calculatePageDimensions();
    }, 50);
}

// Загрузка всего контента
function loadAllContent() {
    const textContent = document.getElementById('textContent');
    if (!textContent) return;
    
    // Загружаем все главы разом
    const allContent = chapters.map(chapter => chapter.content).join('');
    textContent.innerHTML = allContent;
    
    // Пересчитываем размеры
    setTimeout(() => {
        calculatePageDimensions();
    }, 100);
}

// Изменение размера шрифта
function changeFontSize(delta) {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    // Сохраняем процент прогресса
    const scrollPercent = wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth) || 0;
    
    readingSettings.fontSize = Math.max(12, Math.min(24, readingSettings.fontSize + delta));
    document.getElementById('fontSizeDisplay').textContent = readingSettings.fontSize + 'px';
    
    applySettings();
    saveSettings();
    
    // Восстанавливаем позицию
    setTimeout(() => {
        const newMaxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        wrapper.scrollLeft = scrollPercent * newMaxScroll;
        calculatePageDimensions();
    }, 100);
}

// Изменение шрифта
function changeFontFamily(family) {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    const scrollPercent = wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth) || 0;
    
    readingSettings.fontFamily = family;
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const newMaxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        wrapper.scrollLeft = scrollPercent * newMaxScroll;
        calculatePageDimensions();
    }, 100);
}

// Изменение ширины текста
function setTextWidth(width) {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    const scrollPercent = wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth) || 0;
    
    readingSettings.textWidth = width;
    
    const widthButtons = document.querySelectorAll('.width-btn');
    widthButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.width === width);
    });
    
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const newMaxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        wrapper.scrollLeft = scrollPercent * newMaxScroll;
        calculatePageDimensions();
    }, 100);
}

// Изменение межстрочного интервала
function setLineHeight(height) {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (!wrapper) return;
    
    const scrollPercent = wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth) || 0;
    
    readingSettings.lineHeight = height;
    
    const heightButtons = document.querySelectorAll('.lh-btn');
    heightButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.height) === height);
    });
    
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const newMaxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        wrapper.scrollLeft = scrollPercent * newMaxScroll;
        calculatePageDimensions();
    }, 100);
}

// Применение настроек
function applySettings() {
    const textContent = document.querySelector('.text-content');
    const readerContainer = document.querySelector('.reader-container');
    
    if (!textContent) return;
    
    // Применяем шрифт и размер
    textContent.style.fontSize = readingSettings.fontSize + 'px';
    textContent.style.fontFamily = readingSettings.fontFamily;
    textContent.style.lineHeight = readingSettings.lineHeight;
    
    // Применяем ширину
    if (readerContainer) {
        readerContainer.classList.remove('narrow', 'medium', 'wide');
        readerContainer.classList.add(readingSettings.textWidth);
    }
    
    // Применяем тему
    document.body.setAttribute('data-theme', readingSettings.theme);
}

// Сохранение настроек
function saveSettings() {
    localStorage.setItem('readerSettings', JSON.stringify(readingSettings));
}

// Загрузка настроек
function loadSettings() {
    const saved = localStorage.getItem('readerSettings');
    if (saved) {
        try {
            readingSettings = { ...readingSettings, ...JSON.parse(saved) };
            applySettings();
            
            // Обновляем UI
            document.getElementById('fontSizeDisplay').textContent = readingSettings.fontSize + 'px';
            
            document.querySelectorAll('.width-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.width === readingSettings.textWidth);
            });
            
            document.querySelectorAll('.lh-btn').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.height) === readingSettings.lineHeight);
            });
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

// Инициализация кнопок
function initializeButtons() {
    // Навигация
    document.querySelector('.prev-btn')?.addEventListener('click', previousPage);
    document.querySelector('.next-btn')?.addEventListener('click', nextPage);
    
    // Настройки шрифта
    document.getElementById('decreaseFont')?.addEventListener('click', () => changeFontSize(-1));
    document.getElementById('increaseFont')?.addEventListener('click', () => changeFontSize(1));
    
    // Остальные кнопки...
    document.querySelector('.settings-btn')?.addEventListener('click', openSettings);
    document.querySelector('.close-modal')?.addEventListener('click', closeSettings);
    document.querySelector('.toc-btn')?.addEventListener('click', openTableOfContents);
    document.querySelector('.close-sidebar')?.addEventListener('click', closeTableOfContents);
    document.querySelector('.back-btn')?.addEventListener('click', () => window.location.href = 'index.html');
    
    // Слушатель скролла для обновления страницы
    const wrapper = document.querySelector('.text-content-wrapper');
    if (wrapper) {
        wrapper.addEventListener('scroll', debounce(() => {
            calculatePageDimensions();
            saveReadingProgress();
        }, 150));
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Остальные вспомогательные функции
function initializeReader() {
    const bookTitle = document.getElementById('bookTitle');
    const bookAuthor = document.getElementById('bookAuthor');
    
    if (bookTitle) bookTitle.textContent = 'Хаджи Гирай';
    if (bookAuthor) bookAuthor.textContent = 'Алим Мидат';
}

function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    saveSettings();
}

function openTableOfContents() {
    document.getElementById('sidebar').classList.add('open');
}

function closeTableOfContents() {
    document.getElementById('sidebar').classList.remove('open');
}

function setTheme(theme) {
    readingSettings.theme = theme;
    applySettings();
    saveSettings();
}

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const wrapper = document.querySelector('.text-content-wrapper');
    
    if (progressBar && wrapper) {
        const progress = (wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth)) * 100;
        progressBar.style.width = Math.min(100, progress) + '%';
    }
}

function scrollToTop() {
    const wrapper = document.querySelector('.text-content-wrapper');
    if (wrapper) {
        wrapper.scrollTo({ left: 0, behavior: 'smooth' });
    }
}

// Копируем главы из оригинального файла (продолжение массива chapters)
// TODO: Добавить все главы

