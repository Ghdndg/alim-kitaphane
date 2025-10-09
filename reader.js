// Проверка доступа к книге при загрузке
(async function checkAccess() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const accessToken = localStorage.getItem('accessToken');
    
    console.log('Reader access check:', {
        hasUser: !!currentUser.email,
        userEmail: currentUser.email,
        hasToken: !!accessToken,
        tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none'
    });
    
    // Проверяем авторизацию
    if (!currentUser.email || !accessToken) {
        console.error('Access denied: No user or token');
        window.location.replace('/index.html');
        return;
    }
    
    // Проверяем покупку книги
    try {
        console.log('Fetching user library...');
        const response = await fetch('/api/users/library', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        console.log('Library API response:', {
            status: response.status,
            ok: response.ok
        });
        
        if (response.ok) {
            const data = await response.json();
            const bookId = 1; // ID книги Хаджи Гирай
            
            console.log('Library data:', {
                hasLibrary: !!data.library,
                libraryLength: data.library?.length || 0,
                books: data.library?.map(b => ({ id: b.id, title: b.title })),
                checkingBookId: bookId,
                bookFound: data.library?.some(book => book.id === bookId)
            });
            
            if (!data.library || data.library.length === 0 || !data.library.some(book => book.id === bookId)) {
                console.error('Access denied: Book not in library');
                window.location.replace('/index.html');
                return;
            }
            // Проверка прошла успешно - продолжаем загрузку
            console.log('✅ Access granted - book is in user library');
        } else {
            const errorText = await response.text();
            console.error('Failed to fetch library:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            window.location.replace('/index.html');
            return;
        }
    } catch (error) {
        console.error('Access check error:', error);
        // При ошибке сети не редиректим - возможно временная проблема
    }
})();

// Глобальные переменные для постраничной навигации
let currentScrollOffset = 0; // Текущее смещение в пикселях
let pageHeight = 0; // Высота одной "страницы" (видимой области)
let totalContentHeight = 0; // Общая высота контента
let currentPage = 1; // Текущая страница (рассчитывается)
let totalPages = 1; // Общее количество страниц (рассчитывается)
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
                
                <p>Диванханенинъ дуварларында эски Хан аталарынынъ сюретлери асыла эди. Эр биси кенди заманында Къырым ичюн харп этмишти, халкъны къорумышты. Шимди бу борч Хаджи Гирайгъа дюшмишти.</p>
            </div>

            <div class="text-block">
                <p>"Везири Азам," деди Хан, "халкъымызнынъ ахвалыны насыл коресинъ? Хасылат ем болды му?"</p>
                
                <p>"Аллахгъа шукюр, Хан хазретлери, бу йыл беркетли кечти. Буюдайлар ем олды, багълар мейве берди. Халкъ разы," джавап берди Эмин-эфенди.</p>
                
                <p>Бу хабер Хаджи Гирайны куванталы. Чюнки билир эди ки девлетнинъ асыл гучи - халкъынынъ гузель яшавы. Тодж халкъ разы олмаса, хандарнынъ да икбали олмаз.</p>
                
                <p>Диванханеде тынчлыкъ чекти. Садедже фонтаннынъ шарылдавы эшитиле эди. Хан башыны котере, языджыларына караде:</p>
                
                <p>"Махзен-и эсрарымыздан Алим Мидат эфендини чагъырынъыз. Онынъ иле мешаверемиз вар."</p>
            </div>
        `
    },
    {
        title: "2-чи Фасыл - Диванханеде Мешавере",
        content: `
            <h3 class="section-title">2-чи Фасыл<br>Диванханеде Мешавере</h3>
            
            <div class="text-block">
                <p>Азда сонъ Алим Мидат эфенди диванханеге кирди. Узун сакъаллы, терин бакъышлы бу киши Хандырынъ эн алим адамларындан эди. Тарих, эдебият ве хукъукъта буюк билгилери вар эди.</p>
                
                <p>"Селям алейкюм, Хан хазретлери," деди Алим Мидат тазим этип.</p>
                
                <p>"Ве алейкюм селям, устазым," джавап берди Хаджи Гирай. "Олтурунъыз, сизинъ иле мушем меселелер акъкъында конушмагъымыз керек."</p>
                
                <p>Алим Мидат озюне махсус ерге олтурды. Онынъ янында языджылык ашаплары вар эди - къялем, мюреккеп ве кагъыт. Чюнки о садедже мешавере бермекле къалмай, мухим карарларны йазып да сакълайдыр эди.</p>
            </div>

            <div class="text-block">
                <p>"Усвазым," деди Хан, "халкъымызнынъ руханий дурумы насыл? Медреселерде талебелер яхшы огренийорлармы?"</p>
                
                <p>"Аллахгъа шукюр, Хан хазретлери, талебелеримиз гайретле окъуйорлар. Араб тили, Коран, фыкъих ве тефсир дерслеринде муваффакъиетлидирлер. Лякин бир дердимиз вар," деди Алим Мидат.</p>
                
                <p>"Не дердинъиз?" деп сорды Хан мераклы.</p>
                
                <p>"Къырымтатар тилинде китаплар азлыкъ. Халкъымызнынъ баласы кенди ана тилинде илим огренмеге мухтадж. Эгер бу ишни халь этмесек, тилимиз зайыфлар."</p>
            </div>
        `
    },
    {
        title: "3-чи Болюм - Гедерим Ярытув",
        content: `
            <h3 class="section-title">3-чи Болюм<br>Гедерим Ярытув</h3>
            
            <div class="text-block">
                <p>1957 сенеси эди. Анам йырми учь яшында эди, Мустафа йырми беш яшында. Никяларыны къаблай этти ана бабамлары. Кичик той этти корьпеде кедьгунлеримизни олып этти.</p>
                
                <p>О заман бир хабер келди - Къырымгъа къайтмагъа изин берилди. Лякин тамамиен дегиль. Садедже белли шахыслар ичюн. Ве сартлар вар эди.</p>
                
                <p>Мустафа ильяеди. "Къайтабилириз!" деди къувветле. "Эпимиз биргемизге къайтабилириз!"</p>
                
                <p>Лякин анам башкъа дошунее эди. Шюкюр эди. Мумкинмиди? Герчектен де эвге къайтабилирмизми?</p>
            </div>

            <div class="text-block">
                <p>Озбекистанда бизим хаятымыз куруйдылы къалгъан эди. Достларыымз олды, мариш олды. Лякин Къырым эр заман къальбимизде къалды.</p>
                
                <p>Анам ве Мустафа къарар бердилер. Эввель чиппи сепер этерлер Къырымгъа, кормекчюн эски эвлерини не алетте олгъанларыны. Эгер мумкин олса, оранъда къалырлар. Дегилъсе, Озбекистангъа къайтырлар.</p>
                
                <p>Йол узакъ эди. Вагонда олтуриптилар, икисинин де кёзлеринде яшлар парлайып турды. Он уч сенеден сонъ эвлерини корьмекте эдилер.</p>
            </div>
        `
    },
    {
        title: "4-чи Болюм - Йени Омюр Башлангыджы",
        content: `
            <h3 class="section-title">4-чи Болюм<br>Йени Омюр Башлангыджы</h3>
            
            <div class="text-block">
                <p>Къырымда йени хаят башлады. Эр шей дегишмишти, лякин эр шей де танывы эди. Тагълар олдугъы ерде эди. Тенъиз олдугъы ерде эди. Ве хава - о эски хава, ки анамнынъ балалыгъында солукъ алгъан эди.</p>
                
                <p>Мустафа ишлемеге башлады кольхозда. Анам эв иши иле мешгъуль олды. Озбекистанда огренгенлерини буларда хызмет этти.</p>
                
                <p>Бир йыл сонъ анамнынъ биринджи огълу доды. Мени. Мустафанынъ ады боюнджа Мустафа Младший - Мустафачыкъ деп чагъырдылар мени. Сонъундан - къысасы Муся.</p>
                
                <p>Анам айтты ки мен догъдугъумда чокъ куванды. Чунки мен Къырымда догъдым. Мен - Къырым балась.</p>
            </div>

            <div class="text-block">
                <p>"Бу бала," деди анам анасына, "Къырымнынъ топрагъында дюньягъа келди. О бизим умидимиз."</p>
                
                <p>Эр йыл айрен бир бала да доды. Къызым Айше, сонъ огълум Мемет. Уч бала. Уч умид.</p>
                
                <p>Биз Къырымда булюп беттик. Эски эвде, йени комшулар иле. Русджа да огрендик, къырымтатарджаны да унутмадыкъ. Мектебе русча окъудыкъ, эвде ана-бабаджа.</p>
                
                <p>Лякин эр заман бир хисс вар эди ички тарафымызда. Алада хисси. Буюк бир алада. Не олурса олсын, биз буравы сюргюнде дегиль эди. Биз эвде эдик. Лякин эв биз койып кеткен киби дегиль эди артыкъ.</p>
            </div>
        `
    }
];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadReadingProgress();
    applySettings();
    initializeReaderProtection(); // Защита читалки
    
    // Инициализация всех кнопок
    initializeButtons();
    
    // Загружаем весь контент книги
    loadAllContent();
    
    // Пересчитываем размеры при изменении размера окна
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            calculatePageDimensions();
            applyContentTransform();
        }, 250);
    });
    
    // Добавляем обработчик для сохранения настроек при изменении семейства шрифтов
    const fontFamilySelect = document.getElementById('fontFamily');
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', function() {
            changeFontFamily(this.value);
        });
    }
});

// Функция инициализации всех кнопок
function initializeButtons() {
    // Кнопка назад
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.addEventListener('click', goBack);
    
    // Кнопка настроек
    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    
    // Кнопка закладки
    const bookmarkBtn = document.querySelector('.bookmark-btn');
    if (bookmarkBtn) bookmarkBtn.addEventListener('click', toggleBookmark);
    
    // Кнопка меню содержания
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', openTableOfContents);
    
    // Кнопка выхода
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleReaderLogout);
    
    // Кнопки навигации
    const prevBtn = document.querySelector('.prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', previousPage);
    
    const nextBtn = document.querySelector('.next-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextPage);
    
    // Кнопка закрытия сайдбара
    const closeSidebarBtn = document.querySelector('.close-sidebar');
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    
    // Кнопка закрытия модалки настроек
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeSettings);
    
    // Кнопки изменения размера шрифта
    const fontSizeBtns = document.querySelectorAll('.font-size-controls button');
    if (fontSizeBtns.length >= 2) {
        fontSizeBtns[0].addEventListener('click', () => changeFontSize(-1));
        fontSizeBtns[1].addEventListener('click', () => changeFontSize(1));
    }
    
    // Кнопки тем
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setTheme(this.getAttribute('data-theme'));
        });
    });
    
    // Кнопки ширины текста
    document.querySelectorAll('.width-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setTextWidth(this.getAttribute('data-width'));
        });
    });
    
    // Кнопки межстрочного интервала
    document.querySelectorAll('.lh-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setLineHeight(parseFloat(this.getAttribute('data-height')));
        });
    });
    
    // Элементы содержания
    document.querySelectorAll('.toc-item').forEach((item, index) => {
        item.addEventListener('click', function() {
            goToChapter(index);
        });
    });
    
    console.log('✅ All buttons initialized');
}

// Функции навигации
function goBack() {
    window.location.href = 'index.html';
}

// Функция выхода из аккаунта в ридере
function handleReaderLogout() {
    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
        // Очищаем данные пользователя
        localStorage.removeItem('currentUser');
        localStorage.removeItem('accessToken');
        
        // Показываем уведомление
        showNotification('Вы вышли из аккаунта');
        
        // Перенаправляем на главную страницу
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Функция показа уведомлений
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        backgroundColor: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#718096',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: '10000',
        fontSize: '14px',
        maxWidth: '300px',
        transform: 'translateX(350px)',
        transition: 'transform 0.3s ease'
    });
    
    // Добавляем в документ
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.transform = 'translateX(350px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Защита контента в читалке
function initializeReaderProtection() {
    // Блокируем контекстное меню
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showNotification('Контекстное меню отключено для защиты авторских прав', 'info');
        return false;
    });

    // Блокируем горячие клавиши
    document.addEventListener('keydown', function(e) {
        // Блокируем F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+P
        if (e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
            (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
            (e.ctrlKey && e.keyCode === 83) || // Ctrl+S
            (e.ctrlKey && e.keyCode === 65) || // Ctrl+A
            (e.ctrlKey && e.keyCode === 67) || // Ctrl+C
            (e.ctrlKey && e.keyCode === 86) || // Ctrl+V
            (e.ctrlKey && e.keyCode === 88) || // Ctrl+X
            (e.ctrlKey && e.keyCode === 80) || // Ctrl+P
            (e.ctrlKey && e.shiftKey && e.keyCode === 67) || // Ctrl+Shift+C
            (e.ctrlKey && e.shiftKey && e.keyCode === 74)) { // Ctrl+Shift+J
            e.preventDefault();
            showNotification('Функция отключена для защиты авторских прав', 'info');
            return false;
        }
    });

    // Блокируем выделение текста
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Блокируем перетаскивание
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Защита от печати
    window.addEventListener('beforeprint', function(e) {
        e.preventDefault();
        showNotification('Печать запрещена для защиты авторских прав', 'info');
        return false;
    });

    // Блокируем правую кнопку мыши
    document.addEventListener('mousedown', function(e) {
        if (e.button === 2) {
            e.preventDefault();
            return false;
        }
    });

    // Защита от скриншотов
    document.addEventListener('keyup', function(e) {
        if (e.keyCode === 44) { // Print Screen
            showNotification('Создание скриншотов нарушает авторские права', 'info');
        }
    });

    // Усиленная защита от DevTools в читалке
    let devtools = { open: false };
    const threshold = 160;
    
    // Проверяем, не мобильное ли устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    function detectDevTools() {
        // Отключаем проверку DevTools на мобильных устройствах
        if (isMobile) {
            return;
        }
        
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            if (!devtools.open) {
                devtools.open = true;
                showNotification('Инструменты разработчика заблокированы', 'info');
                // Скрываем текст книги
                const textContent = document.querySelector('.text-content');
                if (textContent) {
                    textContent.style.display = 'none';
                }
                // Перенаправляем через 3 секунды
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        } else {
            devtools.open = false;
            // Восстанавливаем текст
            const textContent = document.querySelector('.text-content');
            if (textContent) {
                textContent.style.display = 'block';
            }
        }
    }
    
    // Запускаем проверку только на десктопе
    if (!isMobile) {
        setInterval(detectDevTools, 500);
    }
}

// Рассчитываем размеры страницы
function calculatePageDimensions() {
    const container = document.querySelector('.reader-container');
    const textContent = document.getElementById('textContent');
    
    if (!container || !textContent) return;
    
    // Высота видимой области = высота контейнера
    // Это уже учитывает header и navigation благодаря calc() в CSS
    pageHeight = container.clientHeight;
    
    // Если высота слишком маленькая, используем fallback
    if (pageHeight < 100) {
        const viewportHeight = window.innerHeight;
        const headerHeight = document.querySelector('.reader-header')?.offsetHeight || 80;
        const navHeight = document.querySelector('.page-navigation')?.offsetHeight || 70;
        pageHeight = viewportHeight - headerHeight - navHeight - 20; // 20px запас
    }
    
    // Общая высота контента
    totalContentHeight = textContent.scrollHeight;
    
    // Количество страниц = высота контента / высота экрана (округляем вверх)
    totalPages = Math.max(1, Math.ceil(totalContentHeight / pageHeight));
    
    // Текущая страница на основе текущего offset
    currentPage = Math.min(totalPages, Math.floor(currentScrollOffset / pageHeight) + 1);
    
    console.log('Page dimensions:', {
        pageHeight,
        totalContentHeight,
        totalPages,
        currentPage,
        currentScrollOffset,
        containerHeight: container.clientHeight,
        viewportHeight: window.innerHeight
    });
}

// Применяем трансформацию к контенту
function applyContentTransform() {
    const textContent = document.getElementById('textContent');
    if (!textContent) return;
    
    // Ограничиваем offset чтобы не выйти за пределы
    const maxOffset = totalContentHeight - pageHeight;
    currentScrollOffset = Math.max(0, Math.min(currentScrollOffset, maxOffset));
    
    // Применяем transform
    textContent.style.transform = `translateY(-${currentScrollOffset}px)`;
    
    // Обновляем номер страницы
    currentPage = Math.floor(currentScrollOffset / pageHeight) + 1;
    
    updateProgressBar();
    updatePageNumbers();
    updateNavigationButtons();
    saveReadingProgress();
}

function previousPage() {
    if (currentScrollOffset > 0) {
        // Добавляем класс для анимации
        const textContent = document.getElementById('textContent');
        textContent.classList.add('page-turning');
        
        // Сдвигаем на одну страницу вверх
        currentScrollOffset = Math.max(0, currentScrollOffset - pageHeight);
        applyContentTransform();
        
        // Убираем класс анимации
        setTimeout(() => {
            textContent.classList.remove('page-turning');
        }, 600);
    }
}

function nextPage() {
    const maxOffset = totalContentHeight - pageHeight;
    
    if (currentScrollOffset < maxOffset) {
        // Добавляем класс для анимации
        const textContent = document.getElementById('textContent');
        textContent.classList.add('page-turning');
        
        // Сдвигаем на одну страницу вниз
        currentScrollOffset = Math.min(maxOffset, currentScrollOffset + pageHeight);
        applyContentTransform();
        
        // Убираем класс анимации
        setTimeout(() => {
            textContent.classList.remove('page-turning');
        }, 600);
    }
}

function updateNavigationButtons() {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Функции оглавления
function openTableOfContents() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('open');
    
    // Добавляем оверлей
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay active';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
    
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    if (overlay) {
        overlay.remove();
    }
    document.body.style.overflow = 'auto';
}

function goToChapter(chapterIndex) {
    currentChapter = chapterIndex;
    
    // Находим все заголовки глав в контенте
    const textContent = document.getElementById('textContent');
    const chapterTitles = textContent.querySelectorAll('.chapter-title, .section-title');
    
    if (chapterTitles[chapterIndex]) {
        // Получаем позицию заголовка главы относительно контейнера
        const chapterElement = chapterTitles[chapterIndex];
        const offsetTop = chapterElement.offsetTop;
        
        // Устанавливаем scroll offset на позицию главы
        currentScrollOffset = offsetTop;
        
        // Добавляем анимацию
        textContent.classList.add('page-turning');
        applyContentTransform();
        
        setTimeout(() => {
            textContent.classList.remove('page-turning');
        }, 600);
    }
    
    updateActiveChapter();
    closeSidebar();
}

function getChapterStartPage(chapterIndex) {
    const chapterPages = [1, 3, 8, 15, 22, 29, 37, 44, 50];
    return chapterPages[chapterIndex] || 1;
}

function updateActiveChapter() {
    const tocItems = document.querySelectorAll('.toc-item');
    tocItems.forEach((item, index) => {
        item.classList.toggle('active', index === currentChapter);
    });
}

// Загружаем весь контент книги сразу
function loadAllContent() {
    const textContent = document.getElementById('textContent');
    
    // Объединяем весь контент всех глав
    const allContent = chapters.map(chapter => chapter.content).join('');
    textContent.innerHTML = allContent;
    
    // После загрузки контента пересчитываем размеры
    setTimeout(() => {
        calculatePageDimensions();
        applyContentTransform();
        updateActiveChapter();
    }, 100);
}

function updateContent() {
    // Функция для обратной совместимости
    loadAllContent();
}

function getCurrentChapterByPage(page) {
    const chapterPages = [1, 3, 8, 15, 22, 29, 37, 44, 50];
    for (let i = chapterPages.length - 1; i >= 0; i--) {
        if (page >= chapterPages[i]) {
            return i;
        }
    }
    return 0;
}

// Функции закладок
function toggleBookmark() {
    isBookmarked = !isBookmarked;
    const bookmarkBtn = document.querySelector('.bookmark-btn');
    bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
    
    // Сохраняем закладку
    if (isBookmarked) {
        saveBookmark(currentPage);
        showNotification('Закладка добавлена', 'success');
    } else {
        removeBookmark(currentPage);
        showNotification('Закладка удалена', 'info');
    }
}

function saveBookmark(page) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    if (!bookmarks.includes(page)) {
        bookmarks.push(page);
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }
}

function removeBookmark(page) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    bookmarks = bookmarks.filter(p => p !== page);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

// Функции настроек
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Обновляем интерфейс настроек с текущими значениями
    updateSettingsInterface();
}

function updateSettingsInterface() {
    // Обновляем отображение размера шрифта
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    if (fontSizeDisplay) {
        fontSizeDisplay.textContent = readingSettings.fontSize + 'px';
    }
    
    // Обновляем выбор семейства шрифтов
    const fontFamilySelect = document.getElementById('fontFamily');
    if (fontFamilySelect) {
        fontFamilySelect.value = readingSettings.fontFamily;
    }
    
    // Обновляем активные кнопки темы
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === readingSettings.theme);
    });
    
    // Обновляем активные кнопки ширины текста
    document.querySelectorAll('.width-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.width === readingSettings.textWidth);
    });
    
    // Обновляем активные кнопки межстрочного интервала
    document.querySelectorAll('.lh-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.height) === readingSettings.lineHeight);
    });
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    saveSettings();
}

function changeFontSize(delta) {
    readingSettings.fontSize = Math.max(12, Math.min(24, readingSettings.fontSize + delta));
    document.getElementById('fontSizeDisplay').textContent = readingSettings.fontSize + 'px';
    applySettings();
    saveSettings();
    
    // Пересчитываем размеры после изменения шрифта
    setTimeout(() => {
        calculatePageDimensions();
        applyContentTransform();
    }, 100);
}

function changeFontFamily(family) {
    readingSettings.fontFamily = family;
    applySettings();
    saveSettings();
    
    // Пересчитываем размеры после изменения шрифта
    setTimeout(() => {
        calculatePageDimensions();
        applyContentTransform();
    }, 100);
}

function setTheme(theme) {
    readingSettings.theme = theme;
    
    // Обновляем активную кнопку
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    applySettings();
    saveSettings();
}

function setTextWidth(width) {
    readingSettings.textWidth = width;
    
    // Обновляем активную кнопку
    const widthButtons = document.querySelectorAll('.width-btn');
    widthButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.width === width);
    });
    
    applySettings();
    saveSettings();
    
    // Пересчитываем размеры после изменения ширины
    setTimeout(() => {
        calculatePageDimensions();
        applyContentTransform();
    }, 100);
}

function setLineHeight(height) {
    readingSettings.lineHeight = height;
    
    // Обновляем активную кнопку
    const heightButtons = document.querySelectorAll('.lh-btn');
    heightButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.height) === height);
    });
    
    applySettings();
    saveSettings();
    
    // Пересчитываем размеры после изменения межстрочного интервала
    setTimeout(() => {
        calculatePageDimensions();
        applyContentTransform();
    }, 100);
}

function applySettings() {
    const textContent = document.querySelector('.text-content');
    const readerContainer = document.querySelector('.reader-container');
    
    // Применяем размер шрифта
    textContent.style.fontSize = readingSettings.fontSize + 'px';
    
    // Применяем семейство шрифтов
    const fontClasses = ['font-crimson', 'font-georgia', 'font-times', 'font-arial'];
    textContent.classList.remove(...fontClasses);
    
    if (readingSettings.fontFamily !== 'Inter') {
        const fontClass = 'font-' + readingSettings.fontFamily.toLowerCase().replace(' ', '');
        textContent.classList.add(fontClass);
    }
    
    // Применяем тему
    document.body.setAttribute('data-theme', readingSettings.theme);
    
    // Применяем ширину текста
    readerContainer.classList.remove('narrow', 'wide');
    if (readingSettings.textWidth !== 'medium') {
        readerContainer.classList.add(readingSettings.textWidth);
    }
    
    // Применяем межстрочный интервал
    textContent.style.lineHeight = readingSettings.lineHeight;
}

function loadSettings() {
    const saved = localStorage.getItem('readingSettings');
    if (saved) {
        readingSettings = { ...readingSettings, ...JSON.parse(saved) };
    }
    
    // Обновляем интерфейс настроек (если элементы существуют)
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    if (fontSizeDisplay) {
        fontSizeDisplay.textContent = readingSettings.fontSize + 'px';
    }
    
    const fontFamilySelect = document.getElementById('fontFamily');
    if (fontFamilySelect) {
        fontFamilySelect.value = readingSettings.fontFamily;
    }
    
    // Обновляем активные кнопки (если они существуют)
    const themeBtn = document.querySelector(`[data-theme="${readingSettings.theme}"]`);
    if (themeBtn) {
        // Сначала убираем active у всех кнопок темы
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        themeBtn.classList.add('active');
    }
    
    const widthBtn = document.querySelector(`[data-width="${readingSettings.textWidth}"]`);
    if (widthBtn) {
        // Сначала убираем active у всех кнопок ширины
        document.querySelectorAll('.width-btn').forEach(btn => btn.classList.remove('active'));
        widthBtn.classList.add('active');
    }
    
    const heightBtn = document.querySelector(`[data-height="${readingSettings.lineHeight}"]`);
    if (heightBtn) {
        // Сначала убираем active у всех кнопок высоты
        document.querySelectorAll('.lh-btn').forEach(btn => btn.classList.remove('active'));
        heightBtn.classList.add('active');
    }
}

function saveSettings() {
    localStorage.setItem('readingSettings', JSON.stringify(readingSettings));
}

// Сохранение прогресса чтения
function saveReadingProgress() {
    const progressData = {
        currentScrollOffset: currentScrollOffset,
        currentPage: currentPage,
        currentChapter: currentChapter,
        lastReadTime: new Date().toISOString()
    };
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
}

// Загрузка прогресса чтения
function loadReadingProgress() {
    const saved = localStorage.getItem('readingProgress');
    if (saved) {
        const progressData = JSON.parse(saved);
        currentScrollOffset = progressData.currentScrollOffset || 0;
        currentPage = progressData.currentPage || 1;
        currentChapter = progressData.currentChapter || 0;
    }
}

// Функции прогресса
function updateProgressBar() {
    const progress = (currentPage / totalPages) * 100;
    
    // Обновляем прогресс бар в навигации
    const navProgressFill = document.getElementById('navProgressFill');
    if (navProgressFill) {
        navProgressFill.style.width = progress + '%';
    }
}

function updatePageNumbers() {
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
}

// Дублирующаяся функция удалена - используется основная функция выше

// Горячие клавиши
document.addEventListener('keydown', function(e) {
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            previousPage();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextPage();
            break;
        case 'Escape':
            if (document.getElementById('sidebar').classList.contains('open')) {
                closeSidebar();
            } else if (document.getElementById('settingsModal').style.display === 'block') {
                closeSettings();
            }
            break;
        case 'b':
            if (e.ctrlKey) {
                e.preventDefault();
                toggleBookmark();
            }
            break;
        case 's':
            if (e.ctrlKey) {
                e.preventDefault();
                openSettings();
            }
            break;
        case 't':
            if (e.ctrlKey) {
                e.preventDefault();
                openTableOfContents();
            }
            break;
    }
});

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    const settingsModal = document.getElementById('settingsModal');
    if (event.target === settingsModal) {
        closeSettings();
    }
};

// Автосохранение позиции чтения
window.addEventListener('beforeunload', function() {
    localStorage.setItem('lastReadPage', currentPage);
    localStorage.setItem('lastReadChapter', currentChapter);
});

// Восстановление позиции чтения
window.addEventListener('load', function() {
    const lastPage = localStorage.getItem('lastReadPage');
    const lastChapter = localStorage.getItem('lastReadChapter');
    
    if (lastPage) {
        currentPage = parseInt(lastPage);
        currentChapter = parseInt(lastChapter) || 0;
        updateContent();
        updateProgressBar();
        updatePageNumbers();
        updateNavigationButtons();
        updateActiveChapter();
    }
});

// Инициализация
updateNavigationButtons();
