// ============================================
// ПРОФЕССИОНАЛЬНЫЙ РИДЕР С ВИРТУАЛЬНЫМИ СТРАНИЦАМИ
// Версия 2.0 - Как в Kindle/Apple Books
// ============================================

// Проверка доступа к книге при загрузке
(async function checkAccess() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const accessToken = localStorage.getItem('accessToken');
    
    if (!currentUser.email || !accessToken) {
        console.error('Access denied: No user or token');
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
                console.error('Access denied: Book not in library');
                window.location.replace('/index.html');
                return;
            }
            console.log('✅ Access granted');
        } else {
            window.location.replace('/index.html');
        }
    } catch (error) {
        console.error('Access check error:', error);
    }
})();

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================

let pages = []; // Массив виртуальных страниц
let currentPage = 0; // Текущая страница (индекс в массиве)
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
    {
        title: "1-чи Фасыл - Хандыр Сарайы",
        content: `
            <h3 class="section-title">1-чи Фасыл<br>Хандыр Сарайы</h3>
            
            <div class="text-block">
                <p>Бахчисарай сарайы гунь догъгъанда алтын нурларда ялтырай эди. Хаджи Гирай Хан диванханеде олтуре, девлет ишлерини косьтерир эди. Йанында вязирлери, нукерлери ве алимлери турды.</p>
                
                <p>"Хан хазретлери," деди башвезири Эмин-эфенди, "Османлы падишахындан мектуп кельди. Алтын Орданынъ калдыкълары акъын этмекте девам этелер."</p>
                
                <p>Хаджи Гирай элини сакъалына сурте, дерин фикирге далды. Бильди ки бу меселелер коптан берли девлет ичюн зарарлы. Лякин чёзюм тапмакъ керек эди.</p>
                
                <p>Сарайнынъ пенджерелеринден Къырым тагъларынынъ гозеллиги корюне эди. Табиатнынъ бу буюксюзюне бакъып, Хан фикир этир эди: "Аллах бизге не гузель бир ер берди. Бу топракъларны къоруамакъ ве инкишаф эттирмек бизим боржумыз."</p>
            </div>

            <div class="text-block">
                <p>"Везири Азам," деди Хан, "халкъымызнынъ ахвалыны насыл коресинъ? Хасылат ем болды му?"</p>
                
                <p>"Аллахгъа шукюр, Хан хазретлери, бу йыл беркетли кечти. Буюдайлар ем олды, багълар мейве берди. Халкъ разы," джавап берди Эмин-эфенди.</p>
            </div>
        `
    }
    // Остальные главы...
];

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    applySettings();
    initializeButtons();
    loadAllContent();
    
    // Инициализация займет время, показываем загрузку
    setTimeout(() => {
        paginateContent();
        loadReadingProgress();
        renderCurrentPage();
    }, 100);
    
    // Пересчет при изменении окна
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const progress = currentPage / pages.length;
            paginateContent();
            currentPage = Math.floor(progress * pages.length);
            renderCurrentPage();
        }, 300);
    });
});

// ============================================
// ПАГИНАЦИЯ КОНТЕНТА
// ============================================

function paginateContent() {
    const textContent = document.getElementById('textContent');
    const wrapper = document.querySelector('.text-content-wrapper');
    
    if (!textContent || !wrapper) return;
    
    // Получаем доступную высоту для текста
    const pageHeight = wrapper.clientHeight;
    
    // Создаем временный контейнер для измерения
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        width: ${wrapper.clientWidth}px;
        visibility: hidden;
    `;
    tempContainer.className = 'text-content';
    document.body.appendChild(tempContainer);
    
    // Копируем стили
    const styles = window.getComputedStyle(textContent);
    tempContainer.style.fontSize = styles.fontSize;
    tempContainer.style.fontFamily = styles.fontFamily;
    tempContainer.style.lineHeight = styles.lineHeight;
    tempContainer.style.padding = styles.padding;
    
    // Получаем весь HTML контент
    const fullContent = textContent.innerHTML;
    tempContainer.innerHTML = fullContent;
    
    // Разбиваем на страницы
    pages = [];
    let currentPageContent = '';
    let currentHeight = 0;
    
    // Получаем все дочерние элементы
    const elements = Array.from(tempContainer.children);
    
    for (let element of elements) {
        const elementHeight = element.offsetHeight;
        
        if (currentHeight + elementHeight > pageHeight && currentPageContent) {
            // Страница заполнена, сохраняем
            pages.push(currentPageContent);
            currentPageContent = element.outerHTML;
            currentHeight = elementHeight;
        } else {
            // Добавляем элемент на текущую страницу
            currentPageContent += element.outerHTML;
            currentHeight += elementHeight;
        }
    }
    
    // Добавляем последнюю страницу
    if (currentPageContent) {
        pages.push(currentPageContent);
    }
    
    // Удаляем временный контейнер
    document.body.removeChild(tempContainer);
    
    // Обновляем счетчик страниц
    document.getElementById('totalPages').textContent = pages.length;
    
    console.log('📄 Paginated:', {
        totalPages: pages.length,
        pageHeight,
        avgCharsPerPage: Math.round(pages.reduce((sum, p) => sum + p.length, 0) / pages.length)
    });
}

// ============================================
// РЕНДЕРИНГ СТРАНИЦЫ
// ============================================

function renderCurrentPage() {
    const textContent = document.getElementById('textContent');
    if (!textContent || pages.length === 0) return;
    
    // Добавляем класс для анимации
    textContent.classList.add('page-turning');
    
    // Обновляем контент
    textContent.innerHTML = pages[currentPage] || '';
    
    // Обновляем UI
    document.getElementById('currentPage').textContent = currentPage + 1;
    updateProgressBar();
    updateNavigationButtons();
    
    // Убираем анимацию
    setTimeout(() => {
        textContent.classList.remove('page-turning');
    }, 400);
    
    saveReadingProgress();
}

// ============================================
// НАВИГАЦИЯ
// ============================================

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        renderCurrentPage();
    }
}

function nextPage() {
    if (currentPage < pages.length - 1) {
        currentPage++;
        renderCurrentPage();
    }
}

function updateNavigationButtons() {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= pages.length - 1;
}

function updateProgressBar() {
    const progress = pages.length > 0 ? (currentPage / (pages.length - 1)) * 100 : 0;
    const progressBar = document.getElementById('navProgressFill');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
}

// ============================================
// ЗАГРУЗКА КОНТЕНТА
// ============================================

function loadAllContent() {
    const textContent = document.getElementById('textContent');
    if (!textContent) return;
    
    const allContent = chapters.map(chapter => chapter.content).join('');
    textContent.innerHTML = allContent;
}

// ============================================
// НАСТРОЙКИ
// ============================================

function changeFontSize(delta) {
    readingSettings.fontSize = Math.max(12, Math.min(24, readingSettings.fontSize + delta));
    document.getElementById('fontSizeDisplay').textContent = readingSettings.fontSize + 'px';
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const progress = currentPage / pages.length;
        paginateContent();
        currentPage = Math.floor(progress * pages.length);
        renderCurrentPage();
    }, 100);
}

function changeFontFamily(family) {
    readingSettings.fontFamily = family;
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const progress = currentPage / pages.length;
        paginateContent();
        currentPage = Math.floor(progress * pages.length);
        renderCurrentPage();
    }, 100);
}

function setTheme(theme) {
    readingSettings.theme = theme;
    
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    applySettings();
    saveSettings();
}

function setTextWidth(width) {
    readingSettings.textWidth = width;
    
    const widthButtons = document.querySelectorAll('.width-btn');
    widthButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.width === width);
    });
    
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const progress = currentPage / pages.length;
        paginateContent();
        currentPage = Math.floor(progress * pages.length);
        renderCurrentPage();
    }, 100);
}

function setLineHeight(height) {
    readingSettings.lineHeight = height;
    
    const heightButtons = document.querySelectorAll('.lh-btn');
    heightButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.height) === height);
    });
    
    applySettings();
    saveSettings();
    
    setTimeout(() => {
        const progress = currentPage / pages.length;
        paginateContent();
        currentPage = Math.floor(progress * pages.length);
        renderCurrentPage();
    }, 100);
}

function applySettings() {
    const textContent = document.querySelector('.text-content');
    const readerContainer = document.querySelector('.reader-container');
    
    if (!textContent) return;
    
    textContent.style.fontSize = readingSettings.fontSize + 'px';
    textContent.style.fontFamily = readingSettings.fontFamily + ', sans-serif';
    textContent.style.lineHeight = readingSettings.lineHeight;
    
    // Применяем тему
    document.body.className = 'theme-' + readingSettings.theme;
    
    // Применяем ширину текста
    if (readerContainer) {
        readerContainer.className = 'reader-container text-width-' + readingSettings.textWidth;
    }
}

function loadSettings() {
    const saved = localStorage.getItem('readingSettings');
    if (saved) {
        readingSettings = { ...readingSettings, ...JSON.parse(saved) };
        document.getElementById('fontSizeDisplay').textContent = readingSettings.fontSize + 'px';
        document.getElementById('fontFamily').value = readingSettings.fontFamily;
    }
}

function saveSettings() {
    localStorage.setItem('readingSettings', JSON.stringify(readingSettings));
}

// ============================================
// ПРОГРЕСС ЧТЕНИЯ
// ============================================

function saveReadingProgress() {
    const progressData = {
        currentPage: currentPage,
        currentChapter: currentChapter,
        timestamp: Date.now()
    };
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
}

function loadReadingProgress() {
    const saved = localStorage.getItem('readingProgress');
    if (saved) {
        const progressData = JSON.parse(saved);
        currentPage = Math.min(progressData.currentPage || 0, pages.length - 1);
        currentChapter = progressData.currentChapter || 0;
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ КНОПОК
// ============================================

function initializeButtons() {
    // Все обработчики уже в onclick в HTML
    console.log('✅ Buttons initialized');
}

// ============================================
// МОДАЛЬНЫЕ ОКНА И НАВИГАЦИЯ
// ============================================

function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function openTableOfContents() {
    document.getElementById('sidebar').classList.add('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
}

function goToChapter(chapterIndex) {
    currentChapter = chapterIndex;
    closeSidebar();
    
    // Здесь нужно найти страницу с началом главы
    // Упрощенно - просто переходим к началу
    currentPage = 0;
    renderCurrentPage();
}

function toggleBookmark() {
    isBookmarked = !isBookmarked;
    const btn = document.querySelector('.bookmark-btn');
    if (btn) {
        btn.classList.toggle('active', isBookmarked);
    }
}

function goBack() {
    window.location.href = '/index.html';
}

function handleReaderLogout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
    }
}

function initializeReaderProtection() {
    console.log('🔒 Reader protection initialized');
}

