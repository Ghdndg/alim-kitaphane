// Глобальные переменные
let currentUser = null;
let userLibrary = [];
let purchasedBooks = new Set();
let registeredUsers = new Map(); // Хранилище пользователей

// Данные книги (в реальном проекте это будет поступать с сервера)
const bookData = {
    id: 1,
    title: "Алим Мидат",
    subtitle: "Хаджи Гирай (Тарихий роман)",
    author: "Исторический роман о крымскотатарском наследии",
    price: 299,
    content: `Къриш

Алим Мидат къалемининъ асери - "Хаджи Гирай" тарихий романы, Къырым Хандырынынъ буйюк шахсиетлеринден биси акъкъында. Бу эсер садедже тарихий вакъалары анлатмай, бельки бир халкънынъ миллий рухыны, адетлерини ве игьтикъадларыны косьтере.

Хаджи Гирай Хан - Къырым тарихининъ эн буйюк шахсиетлеринден биси. Онынъ заманында Къырым Хандыры эвджинде эди. Дипломатия, тиджарет ве санат инкишаф этмишти. Къырым татарлары бутюн дюньяда хюрметле къаралырды.

Романда автор бизни XV-XVI асырларына алып бара. О заман Къырым - Ширк Юлынынъ мархиз ноктъаларындан биси эди. Буюк тиджарет йоллары бу топракъларны кечирди. Шерклерден ве Гъарбдан тджирлер келирди.

Лякин бу романнынъ асыл къыммети онда ки, о бизге эски Къырымнынъ гуньдалыкъ хаятыны косьтере. Халкъ насыл яшайды эди, не фикир этирди, неге инанырды - бутюн бунлар эсерде ачыкъ косьтерильди.

Биринджи фасыл
Хандыр сарайы

Бахчисарай сарайы гунь догъгъанда алтын нурларда ялтырай эди. Хаджи Гирай Хан диванханеде олтуре, девлет ишлерини косьтерир эди. Йанында вязирлери, нукерлери ве алимлери турды.

"Хан хазретлери," деди башвезири Эмин-эфенди, "Османлы падишахындан мектуп кельди. Алтын Орданынъ калдыкълары акъын этмекте девам этелер."

Хаджи Гирай элини сакъалына сурте, дерин фикирге далды. Бильди ки бу меселелер коптан берли девлет ичюн зарарлы. Лякин чёзюм тапмакъ керек эди.

"Балам," дер эди анам, "биз Къырымлыларнынъ тарихы узун ве агъыр. Лякин биз эр заман бу топракъта яшагъан халкъымыз. Денъизлер, тагълар, дагълар - буларнынъ эписи бизим кедергенимиз."

Анамнынъ сёзлери шимди башкъа бир мана казанды. Чюнки мен де артыкъ о ешлерде дегиль эдим. Яшым отуз беш олгъан, ве артыкъ кенди аиле куралы дженгледим. Лякин анамнынъ анлаткъан о икяелер эр заман зиним четинде къалды.

1-чи Болюм
Эски Къайтарылмас Кунлер

1944 сенесинин майысы эди. Анам он беш яшында эди о заман. Бизим аиленинъ бу менъзересини чокъ кере айтты манъа. О кунь анасы сабалы турып, хер заман олгъан киби, намаз окъумакъ учюн къалкъты. Лякин бу кунь башкъа эди.

"Къызым, гедже узакъ ишыкълар ялтырды авлу ёлында," деди анамнынъ анасы къоркъу иле. "Сювюкълер келе билирлер."

Лякин келген сювюкълер дегиль эди. Келгенлер аскерлер эди - о аскерлер ки биз оларны танымайдыкъ, оларнынъ тили де бизимки дегиль эди.

Анам ана айтты ки, о кунь бутюн авда коыдеки тауркълар ойкъаруп жыйналды. Къадынлар агълады, эркяклер суюзсыз къалды. Чокъукълар анъламай, не олгъанына шашыра-шашыра къарады.

"Оплау вакътынъыз он дакъика," деди аскерлерден биси, терджимеджи вастасыйла. "Сиз йеридегиз дегишилджек. Башкъа ерге кетирилиджексиз."

Он дакъика. Бутюн омюрлерини, бутюн хатыраларыны, эр шейлерини он дакъикада топламагъа чалыштылар. Анам айтты ки, анасы садедже бир кесе дагъ чайыны алды - о чай ки онынъ анасы кендисине хедие этмишти эвленгенде.

Вагонларда инек ерлери вар эди. Адамлар ичюн дегиль, хайванлар ичюн ясалгъан ерлер. Йол узун эди ве агъыр. Чокъ адам о йолда ёльды - къартлар ве кичиклер эвель.

Анам айтты ки, вагонда олтурагъанда, кичик пенджереден дышары къарай эди. Къырымнынъ тагълары араларындан ёкъ олуп кете эди. О заман анъламышты ки эвини, ватанымы койып кетемиз.

"Эр заман къайтыр музмыз?" деп сорды анам анасына.

"Аллах билир, къызым," деди анасы, къучагъына алып. "Бельки де къайтырыз. Бельки бутюн бунлар бир рюя."

Лякин рюя дегиль эди. Он уч сене Озбекистанда яшадылар. Он уч сене ки анамнынъ анасы эр кедже агълады, ватаныны хатырлады.

2-чи Болюм  
Озбекистанда Йылларым

Тошкентте олтурдыкъ биз. Къырымдан келген дигер аилелер иле бирге. Озбек халкъы бизге яхшы давранды. Оларнынъ да кендилерининъ дертлери вар эди, лякин къонакъларыны рет этмедилер.

Анам о йылларда мектебе башлады. Озбекча огренмеге меджбур олды. Эвде къырымтатарджа конуштыкъларында, мектебе русча ве озбекча. Лякин эвде анам анасы мутлакъ къырымтатарджа сёйлешир эди.

"Тилимизни унутмагъаджакъсыз," дер эди эр заман. "Тил - бу халкънынъ руху. Эгер тилимизни къайыберсек, кенд озюмизни де къайыбермиш оламыз."

Анамнынъ бабасы эски эди, йеркъа алышамады. Икинджи йыл вефат этти. Сонъ анамнынъ къардашы да хасталанды. Озбекистаннынъ иклими оларгъа мувафыкъ гельмеди.

Лякин хаят девам этти. Анам йеткинлик чагъына гирди. Унутувы ёкъ эди, лякин къабуллениш баша чыкъты. Адам неге къадир олуп кетер о мухитке.

Тошкентте анам беленг де огренди. О заман да эдебиятны чокъ севе эди. Хъусусан къырымтатар шаирлерининъ шиирлерини. Агълай агълай окъуды Джемиль Къадыры, Шамиль Томанынъ китапларыны.

"Бу сёзлер," дер эди, "бизим хатыраларымызнынъ сакълайыджысы. Эгер бу китапларны окъусакъ, Къырымны эр заман хатырлаябилириз."

Он беш яшында анам ишлемеге башлады. Фабрикада ишледи, памукъ чулаканда. Акъшамлары эвге къайтып, анасына ярдым эдер эди, кичик къардашына бакъар эди.

О йылларда анам бир эркякъ иле танышты. Мустафа исми эди онынъ. О да Къырымдан кельген эди, лякин башкъа авдан. Икисинин де хаяли бир эди - бир кунь Къырымгъа къайтмакъ.

3-чи Болюм
Гедерим Ярытув

1957 сенеси эди. Анам йырми учь яшында эди, Мустафа йырми беш яшында. Никяларыны къаблай этти ана бабамлары. Кичик той этти корьпеде кедьгунлеримизи олып этти.

О заман бир хабер келди - Къырымгъа къайтмагъа изин берилди. Лякин тамамиен дегиль. Садедже белли шахыслар ичюн. Ве сартлар вар эди.

Мустафа ильяеди. "Къайтабилириз!" деди къувветле. "Эпимиз биргемизге къайтабилириз!"

Лякин анам башкъа дошунее эди. Шюкюр эди. Мумкинмиди? Герчектен де эвге къайтабилирмизми?

Озбекистанда бизим хаятымыз куруйдылы къалгъан эди. Достларыымз олды, мариш олды. Лякин Къырым эр заман къальбимизде къалды.

Анам ве Мустафа къарар бердилер. Эввель чиппи сепер этерлер Къырымгъа, кормекчюн эски эвлерини не алетте олгъанларыны. Эгер мумкин олса, оранъда къалырлар. Дегилъсе, Озбекистангъа къайтырлар.

Йол узакъ эди. Вагонда олтуриптилар, икисинин де кёзлеринде яшлар парлайып турды. Он уч сенеден сонъ эвлерини корьмекте эдилер.

Къырым стациясына келгенлеринде, анам айтты ки къалби чок сюраатле чарпып турды. Хава таныш кокюйор эди - о тенъиз ависы, кузде япракълар кокюсю.

Лякин эвлерине келгенлеринде, бир башкъа манзара гордюлер. Эв ераде эди, лякин башкъа адамлар яшайор эди оранъда. Рус аилеси. Олар йахшы кишилер эди, лякин эв артыкъ оларнынъ дегиль эди.

"Биз буны билмедик," деди эвнинъ йеники сайыбы. "Бизге дедилер ки бу эв бош. Эгер сиз асыл саиплерисиз, биз чыкъабилириз."

Анам ве Мустафа къарар бередилер. Эв буюк эди, икигее болуп олтурабилирлер. Рус аилеси де разы олды. Бойлиджа беш йыл яшадылар биргу эвде.

4-чи Болюм
Йени Омюр Башлангыджы

Къырымда йени хаят башлады. Эр шей дегишмишти, лякин эр шей де танывы эди. Тагълар олдугъы ерде эди. Тенъиз олдугъы ерде эди. Ве хава - о эски хава, ки анамнынъ балалыгъында солукъ алгъан эди.

Мустафа ишлемеге башлады кольхозда. Анам эв иши иле мешгъуль олды. Озбекистанда огренгенлерини буларда хызмет этти.

Бир йыл сонъ анамнынъ биринджи огълу доды. Мени. Мустафанынъ ады боюнджа Мустафа Младший - Мустафачыкъ деп чагъырдылар мени. Сонъундан - къысасы Муся.

Анам айтты ки мен догъдугъумда чокъ куванды. Чунки мен Къырымда догъдым. Мен - Къырым балась.

"Бу бала," деди анам анасына, "Къырымнынъ топрагъында дюньягъа келди. О бизим умидимиз."

Эр йыл айрен бир бала да доды. Къызым Айше, сонъ огълум Мемет. Уч бала. Уч умид.

Биз Къырымда булюп беттик. Эски эвде, йени комшулар иле. Русджа да огрендик, къырымтатарджаны да унутмадыкъ. Мектебе русча окъудыкъ, эвде ана-бабаджа.

Лякин эр заман бир хисс вар эди ички тарафымызда. Алада хисси. Буюк бир алада. Не олурса олсын, биз буравы сюргюнде дегиль эди. Биз эвде эдик. Лякин эв биз койып кеткен киби дегиль эди артыкъ.

5-чи Болюм
Омюрнинъ Йени Фасыллары

Йыллар кече турды. Мен буйюттуз, мектебни битирдим. Сонъ институтта окъудым Симферопольде. Филология факультесинде. Къырымтатар ве рус эдебияты огрендим.

О заман анъладым ки тиль герчектен халкънынъ рухудыр. Къырымтатар тилинде йазылгъан эр бир сётз - бу бизим тарихимизнинъ бир къысмы. Джемиль Къыдыры окъугъанда, мен садедже китап окъумайым. Мен кенд халкъымнынъ кальбини дуйaм.

Институтны битирдикден сонъ, мектебде муаллим олараг ишлемеге башладым. Къырымтатар тили ве эдебияты огреттим. Балаларгъа деп айттым сюкур сютери ве эски икяелери.

О заман таныштым Асие иле. О да муаллим эди, математика дерси берер эди. Бизим танышувымыз романтик дегиль эди. Адетте мектеп корридорында растлаша-растлаша таныштыкъ.

Лякин Асие мемнунне къыз эди. Акъыллы ве эдепли. Ве энъ мухими - о да Къырымны севе эди. Анынъ аиледси де эски къаытмыш эди Озбекистандан.

Никяымызны 1971 сенесинде қылдыкъ. Къырымтатар адатымызгъа коре той этти. Эски йырлар йырладыкъ, эски халай чекик.

6-чи Болюм
Эвлятларымыз ве Келеджек

Асие иле биргу икки огълумыз олды. Эмиль ве Тимур. Оларны да къырымтатар адетлерине коре буютти. Эвде мутлакъ къырымтатарджа сойледик. Эски икяелери, эски йырларны огретти оларгъа.

Лякин дэвремизди де унтмадыкъ. Балаларымыз чагъдаш эгитим алдылар. Русджа да, украинджа да билдилер. Дюньянынъ дигер халкъларыны да таныдылар.

"Сизнинъ корюнюшюнюз," дедим оларгъа, "халкъымызнынъ келеджегини. Бизим тилимизни, адетлеримизни яшатмакъ сизнинъ боржунъыз."

Эмиль едебиятны севди. Институтда йыхардакъы окъуды. Тимур техник ишлерге раг этти. Икиси де якъшы адам олдылар.

1991 сенесинде Украина мустакъиль олды. Биз учюн бу йени умидлер мана берди. Белки артыкъ биз дэ кенди халкъымыз олараг яшай билириз?

7-чи Болюм  
Йени Асырнынъ Умидлери

2000'ли йыллар келди. Техноlogia инкишаф этти. Интернет поди. Дюнья кичикленди.

Эмиль артыкъ никялы эди, кенди аилеси вар эди. Ички айвасы бир къыз олды - Диляра. Мен де бабу олдум.

Диляраны корьгенимде, анамы хатырладым. О балачыкъта кийимди, чагъдаш технологиялар арасында булюе турды. Лякин мен онъа да эски икяелери айтмагъа башладым.

"Бабу," дер эди майа, "йене о эски икяени айыт ана иле дедесининъ."

Ве мен йене башлардым. Ана иле дедесининъ икяесини. Сюргюн икяесини. Къайтув икяесини.

2014 сенесинде Къырымда йени дегишиклиер олды. Россияgа къошулдыкъ. Йени сиясет, йени умидлер, йени корькулер.

Диляра о заман он дорт яшында эди. Лисейде окъуе эди. Къырымтатарджаны билир эди, лякин русджа да яхшы конушыр эди.

"Бабу," деди бир кунь майа, "биз ким?"

Бу суаль майа дюшюндюрди. Ким биз? Къырымтатарлар. Россия ватандашлары. Совет халкъынынъ мирасчылары. Дигер чокъ шейлер.

"Биз," дедим онъа, "бизим кенд тарихимиз олгъан халкъыз. Биз Къырымнынъ асл сайиплеримиз. Лякин биз де дюньянынъ бир къысымыз. Биз оджагълар арасында кёприлер куранларыз."

Хatиме

Шимди мен алтмыш яшында. Диляра университетте окъуе. О къырымтатар тили ве медениетини огрене. Белки о бизден де яхшы япаджакъ халкъымыз ичюн.

Бу икяе битти. Лякин асл икяе битмез. Чунки хер бир инсаннынъ кенди икяеси бар. Ве биз - халкъ олараг - чокъ адамнынъ икяелеринден ибарет.

Къырым эр заман бизим эвимиз оладжакъ. Денъизлер, тагълар, буюк тарих иле. Биз эр заман Къырымлылар оладжакъыз - къаить не эрде яшасакъ да.

Ве эр заман умидымыз оладжакъ. Умид - бу инсаннынъ энъ куветли сылахы. Умид оламайынджа адам яшамакъ къайди булур.

Менин икяем шу секильде битер. Лякин халкъымызнынъ икяеси девам этер. Эр заман.`
};

// Функции модального окна
function openBookDetails() {
    const modal = document.getElementById('bookModal');
    openModal(modal);
}

function closeBookDetails() {
    const modal = document.getElementById('bookModal');
    closeModal(modal);
}

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    // Закрытие модального окна с деталями книги
    const bookModal = document.getElementById('bookModal');
    if (event.target === bookModal) {
        closeBookDetails();
    }
    
    // Закрытие модального окна регистрации
    const registerModal = document.getElementById('registerModal');
    if (event.target === registerModal) {
        closeRegisterModal();
    }
    
    // Закрытие модального окна входа
    const loginModal = document.getElementById('loginModal');
    if (event.target === loginModal) {
        closeLoginModal();
    }
    
    // Закрытие модального окна профиля
    const profileModal = document.getElementById('profileModal');
    if (event.target === profileModal) {
        closeProfileModal();
    }
    
    // Закрытие модального окна оплаты
    const paymentModal = document.querySelector('.payment-modal');
    if (event.target === paymentModal) {
        closePaymentModal();
    }
    
    // Закрытие модального окна с отрывком
    const sampleModal = document.querySelector('.sample-modal');
    if (event.target === sampleModal) {
        closeSampleModal();
    }
}

// Функция покупки книги
async function purchaseBook() {
    // Проверяем, авторизован ли пользователь
    if (!currentUser) {
        showNotification('Для покупки книги необходимо войти в аккаунт', 'info');
        openLoginModal();
        return;
    }

    // Проверяем, не куплена ли уже книга
    if (currentUser.library && currentUser.library.includes(1)) {
        showNotification('Вы уже приобрели эту книгу', 'info');
        setTimeout(() => {
            window.location.href = 'reader.html';
        }, 1500);
        return;
    }

    if (purchasedBooks.has(bookData.id)) {
        showNotification('Книга уже куплена!', 'info');
        openReader();
        return;
    }

    // Открываем модальное окно оплаты
    showPaymentModal();
}

// Функция чтения отрывка
function readSample() {
    showSampleModal();
}

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Выбираем иконку в зависимости от типа
    let icon = 'fa-check-circle'; // по умолчанию для success
    if (type === 'error') {
        icon = 'fa-exclamation-circle';
    } else if (type === 'info') {
        icon = 'fa-info-circle';
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Показать уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Скрыть уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Модальное окно оплаты
function showPaymentModal() {
    const paymentModal = document.createElement('div');
    paymentModal.className = 'modal payment-modal';
    paymentModal.innerHTML = `
        <div class="modal-content payment-content">
            <span class="close" id="closePaymentBtn">&times;</span>
            <div class="payment-header">
                <h2>Оплата книги</h2>
                <div class="book-summary">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiByeD0iNCIgZmlsbD0idXJsKCNncmFkaWVudCkiLz4KPHN2ZyB4PSIyMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJtMTAgMTUgNS01LTUtNXoiLz4KPC9zdmc+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I2ZmOWE5ZSIvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZWNmZWYiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=" alt="Обложка">
                    <div>
                        <h3>${bookData.title}</h3>
                        <p>${bookData.subtitle}</p>
                        <span class="price">${bookData.price} ₽</span>
                    </div>
                </div>
            </div>
            <div class="payment-methods">
                <h3>Способ оплаты</h3>
                <div class="yukassa-info">
                    <div class="yukassa-logo">
                        <i class="fas fa-credit-card"></i>
                        <span>ЮKassa</span>
                    </div>
                    <p class="yukassa-description">Безопасная оплата через ЮKassa. Принимаем карты всех банков.</p>
                    <div class="accepted-cards">
                        <i class="fab fa-cc-visa"></i>
                        <i class="fab fa-cc-mastercard"></i>
                        <i class="fab fa-cc-amex"></i>
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                </div>
            </div>
            <button class="pay-button yukassa-pay" id="yuKassaPayBtn">
                <i class="fas fa-shield-alt"></i>
                Оплатить через ЮKassa ${bookData.price} ₽
            </button>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
    
    // Добавляем event listeners после создания элементов
    const closePaymentBtn = paymentModal.querySelector('#closePaymentBtn');
    const yuKassaPayBtn = paymentModal.querySelector('#yuKassaPayBtn');
    
    if (closePaymentBtn) {
        closePaymentBtn.addEventListener('click', closePaymentModal);
    }
    
    if (yuKassaPayBtn) {
        yuKassaPayBtn.addEventListener('click', processYuKassaPayment);
    }
    
    openModal(paymentModal);
}

// Обработка оплаты
function processPayment() {
    // Валидация формы
    const cardNumber = document.getElementById('cardNumber').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCvv = document.getElementById('cardCvv').value;
    const cardHolder = document.getElementById('cardHolder').value;
    
    if (!cardNumber || !cardExpiry || !cardCvv || !cardHolder) {
        showNotification('Заполните все поля!', 'error');
        return;
    }
    
    // Имитация процесса оплаты
    const payButton = document.querySelector('.pay-button');
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
    payButton.disabled = true;
    
    setTimeout(() => {
        purchasedBooks.add(bookData.id);
        userLibrary.push(bookData);
        
        closePaymentModal();
        showNotification('Оплата прошла успешно! Книга добавлена в вашу библиотеку.');
        closeBookDetails();
        
        // Обновляем кнопку покупки
        setTimeout(() => {
            showNotification('Хотите начать чтение?', 'info');
            setTimeout(() => {
                if (confirm('Открыть книгу для чтения?')) {
                    openReader();
                }
            }, 1000);
        }, 2000);
    }, 2000);
}

function closePaymentModal() {
    const paymentModal = document.querySelector('.payment-modal');
    if (paymentModal) {
        closeModal(paymentModal);
        document.body.removeChild(paymentModal);
    }
}

// Модальное окно с отрывком
function showSampleModal() {
    const sampleModal = document.createElement('div');
    sampleModal.className = 'modal sample-modal';
    sampleModal.innerHTML = `
        <div class="modal-content sample-content">
            <span class="close" id="closeSampleBtn">&times;</span>
            <div class="sample-header">
                <h2>Отрывок из книги</h2>
                <p>"${bookData.title}" - ${bookData.subtitle}</p>
            </div>
            <div class="sample-text">
                ${bookData.content.split('\n\n').slice(0, 8).join('\n\n')}
                <div class="sample-fade">
                    <p><em>Чтобы продолжить чтение, приобретите полную версию книги.</em></p>
                    <button class="buy-full-btn" id="buyFullVersionBtn">
                        Купить полную версию за ${bookData.price} ₽
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(sampleModal);
    
    // Добавляем event listeners после создания элементов
    const closeSampleBtn = sampleModal.querySelector('#closeSampleBtn');
    const buyFullVersionBtn = sampleModal.querySelector('#buyFullVersionBtn');
    
    if (closeSampleBtn) {
        closeSampleBtn.addEventListener('click', closeSampleModal);
    }
    
    if (buyFullVersionBtn) {
        buyFullVersionBtn.addEventListener('click', function() {
            closeSampleModal();
            purchaseBook();
        });
    }
    
    openModal(sampleModal);
}

function closeSampleModal() {
    const sampleModal = document.querySelector('.sample-modal');
    if (sampleModal) {
        closeModal(sampleModal);
        setTimeout(() => {
            if (sampleModal.parentNode) {
                sampleModal.remove();
            }
        }, 300);
    }
}

// Открытие ридера
function openReader() {
    if (!currentUser) {
        showNotification('Для чтения необходимо войти в аккаунт!', 'error');
        openLoginModal();
        return;
    }
    
    if (!purchasedBooks.has(bookData.id)) {
        showNotification('Сначала приобретите книгу!', 'error');
        return;
    }
    
    window.location.href = 'reader.html';
}

// Добавляем стили для уведомлений и модальных окон
const additionalStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 1001;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    border-left: 4px solid #4facfe;
}

.notification.success {
    border-left-color: #48bb78;
}

.notification.error {
    border-left-color: #f56565;
}

.notification.show {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.notification i {
    font-size: 1.2rem;
}

.notification.success i {
    color: #48bb78;
}

.notification.error i {
    color: #f56565;
}

.notification.info i {
    color: #4facfe;
}

.payment-modal .modal-content {
    max-width: 500px;
}

.payment-header {
    text-align: center;
    margin-bottom: 2rem;
}

.book-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #f7fafc;
    padding: 1rem;
    border-radius: 10px;
    margin-top: 1rem;
}

.book-summary img {
    width: 60px;
    height: 80px;
    border-radius: 5px;
}

.book-summary h3 {
    margin: 0;
    font-size: 1.1rem;
}

.book-summary p {
    margin: 0.25rem 0;
    color: #718096;
}

.book-summary .price {
    font-weight: 600;
    color: #4facfe;
    font-size: 1.2rem;
}

.payment-methods h3 {
    margin-bottom: 1rem;
}

.payment-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
}

.payment-option {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.payment-option:hover {
    border-color: #4facfe;
}

.payment-option input[type="radio"]:checked + .option-content {
    color: #4facfe;
}

.payment-option input[type="radio"] {
    margin-right: 0.75rem;
}

.option-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.card-form {
    margin-bottom: 2rem;
}

.card-form h3 {
    margin-bottom: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: #4facfe;
}

.pay-button {
    width: 100%;
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.pay-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}

.pay-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.sample-modal .modal-content {
    max-width: 800px;
    max-height: 90vh;
}

.sample-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
}

.sample-text {
    font-size: 1.1rem;
    line-height: 1.8;
    color: #2d3748;
    white-space: pre-line;
    position: relative;
    max-height: 60vh;
    overflow-y: auto;
}

.sample-fade {
    position: sticky;
    bottom: 0;
    background: linear-gradient(transparent, white 50%);
    padding: 2rem 0 1rem;
    text-align: center;
}

.buy-full-btn {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 1rem;
}

.buy-full-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Функции авторизации
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    openModal(modal);
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    closeModal(modal);
    document.getElementById('registerForm').reset();
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    openModal(modal);
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    closeModal(modal);
    document.getElementById('loginForm').reset();
}

function openProfileModal() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    
    // Если у пользователя есть купленные книги, сразу переходим в ридер
    if (currentUser.library.length > 0) {
        window.location.href = 'reader.html';
        return;
    }
    
    // Если нет купленных книг, показываем личный кабинет
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    updateUserLibraryDisplay();
    
    const modal = document.getElementById('profileModal');
    openModal(modal);
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    closeModal(modal);
}

function switchToLogin() {
    closeRegisterModal();
    openLoginModal();
}

function switchToRegister() {
    closeLoginModal();
    openRegisterModal();
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    // Валидация
    if (password !== passwordConfirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    if (registeredUsers.has(email)) {
        showNotification('Пользователь с таким email уже существует', 'error');
        return;
    }
    
    // Создаем пользователя
    const user = {
        name: name,
        email: email,
        password: password,
        library: [],
        registeredAt: new Date()
    };
    
    registeredUsers.set(email, user);
    saveUsersToStorage();
    
    showNotification('Регистрация прошла успешно! Теперь войдите в аккаунт.');
    closeRegisterModal();
    openLoginModal();
    
    // Очищаем форму
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPasswordConfirm').value = '';
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const user = registeredUsers.get(email);
    
    if (!user || user.password !== password) {
        showNotification('Неверный email или пароль', 'error');
        return;
    }
    
    // Авторизуем пользователя
    currentUser = user;
    purchasedBooks = new Set(user.library);
    
    updateAuthInterface();
    closeLoginModal();
    showNotification(`Добро пожаловать, ${user.name}!`);
    
    // Очищаем форму
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    // Переходим в ридер после входа
    setTimeout(() => {
        if (user.library.length > 0) {
            // Если есть купленные книги, переходим в ридер
            window.location.href = 'reader.html';
        } else {
            // Если нет купленных книг, показываем сообщение
            showNotification('У вас пока нет купленных книг. Приобретите книгу для чтения.', 'info');
        }
    }, 1000);
}

function handleLogout() {
    currentUser = null;
    purchasedBooks.clear();
    
    updateAuthInterface();
    closeProfileModal();
    showNotification('Вы вышли из аккаунта');
}

function updateAuthInterface() {
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (currentUser) {
        // Скрываем кнопки для неавторизованных
        if (registerBtn) registerBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
        
        // Показываем кнопки для авторизованных
        if (profileBtn) profileBtn.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'flex';
        
        // Если есть купленные книги, показываем "Читать", иначе имя пользователя
        if (profileBtn) {
            if (currentUser.library && currentUser.library.length > 0) {
                profileBtn.querySelector('span').textContent = 'Читать';
                profileBtn.querySelector('i').className = 'fas fa-book-open';
            } else {
                profileBtn.querySelector('span').textContent = currentUser.name;
                profileBtn.querySelector('i').className = 'fas fa-user';
            }
        }
    } else {
        // Показываем кнопки для неавторизованных
        if (registerBtn) registerBtn.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'flex';
        
        // Скрываем кнопки для авторизованных
        if (profileBtn) profileBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

function updateUserLibraryDisplay() {
    const libraryContainer = document.getElementById('userLibrary');
    
    if (currentUser.library.length === 0) {
        libraryContainer.innerHTML = '<p class="empty-library">У вас пока нет купленных книг</p>';
        return;
    }
    
    let libraryHTML = '';
    currentUser.library.forEach(bookId => {
        if (bookId === bookData.id) {
            libraryHTML += `
                <div class="library-book" onclick="openReader()">
                    <div class="library-book-cover">
                        <i class="fas fa-bow-arrow"></i>
                    </div>
                    <div class="library-book-info">
                        <h4>${bookData.title}</h4>
                        <p>${bookData.subtitle}</p>
                    </div>
                </div>
            `;
        }
    });
    
    libraryContainer.innerHTML = libraryHTML;
}

function saveUsersToStorage() {
    const usersData = {};
    registeredUsers.forEach((user, email) => {
        usersData[email] = user;
    });
    localStorage.setItem('registeredUsers', JSON.stringify(usersData));
}

function loadUsersFromStorage() {
    const saved = localStorage.getItem('registeredUsers');
    if (saved) {
        const usersData = JSON.parse(saved);
        Object.entries(usersData).forEach(([email, user]) => {
            registeredUsers.set(email, user);
        });
    }
}

// Обновляем функцию успешной покупки
function completePurchase() {
    if (currentUser) {
        currentUser.library.push(bookData.id);
        saveUsersToStorage();
    }
    
    purchasedBooks.add(bookData.id);
    userLibrary.push(bookData);
    
    closePaymentModal();
    showNotification('Оплата прошла успешно! Переходим к чтению...');
    closeBookDetails();
    
    // Автоматически переходим в ридер после покупки
    setTimeout(() => {
        window.location.href = 'reader.html';
    }, 2000);
}

// Реальная интеграция с ЮKassa
async function processYuKassaPayment() {
    if (!currentUser) {
        showNotification('Необходимо войти в аккаунт для покупки', 'info');
        return;
    }

    const payButton = document.querySelector('.yukassa-pay');
    const originalText = payButton.innerHTML;
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание платежа...';
    payButton.disabled = true;
    
    try {
        // Создаем платеж через backend API
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
            },
            body: JSON.stringify({
                bookId: 1, // ID книги "Алим Мидат"
                returnUrl: window.location.origin + '/payment-success.html'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка создания платежа');
        }

        const paymentData = await response.json();
        
        // Сохраняем ID платежа для отслеживания
        localStorage.setItem('currentPaymentId', paymentData.payment_id);
        localStorage.setItem('paymentAmount', bookData.price);
        
        payButton.innerHTML = '<i class="fas fa-external-link-alt"></i> Переход на ЮKassa...';
        
        // Перенаправляем пользователя на страницу оплаты ЮKassa
        setTimeout(() => {
            window.location.href = paymentData.confirmation_url;
        }, 1000);
        
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Ошибка при создании платежа: ' + error.message, 'error');
        
        // Восстанавливаем кнопку
        payButton.innerHTML = originalText;
        payButton.disabled = false;
    }
}

// Защита от копирования и скриншотов
function initializeContentProtection() {
    // Блокируем контекстное меню
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showNotification('Контекстное меню отключено для защиты авторских прав', 'info');
        return false;
    });

    // Блокируем горячие клавиши
    document.addEventListener('keydown', function(e) {
        // Блокируем F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+C, Ctrl+V
        if (e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
            (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
            (e.ctrlKey && e.keyCode === 83) || // Ctrl+S
            (e.ctrlKey && e.keyCode === 65) || // Ctrl+A
            (e.ctrlKey && e.keyCode === 67) || // Ctrl+C
            (e.ctrlKey && e.keyCode === 86) || // Ctrl+V
            (e.ctrlKey && e.keyCode === 88) || // Ctrl+X
            (e.ctrlKey && e.shiftKey && e.keyCode === 67) || // Ctrl+Shift+C
            (e.ctrlKey && e.shiftKey && e.keyCode === 74)) { // Ctrl+Shift+J
            e.preventDefault();
            showNotification('Функция отключена для защиты авторских прав', 'info');
            return false;
        }
    });

    // Блокируем выделение текста мышью
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
        if (e.button === 2) { // правая кнопка
            e.preventDefault();
            return false;
        }
    });

    // Защита от скриншотов (ограниченная)
    document.addEventListener('keyup', function(e) {
        // Детект Print Screen
        if (e.keyCode === 44) {
            showNotification('Создание скриншотов нарушает авторские права', 'info');
        }
    });

    // Дополнительная защита от DevTools
    let devtools = {
        open: false,
        orientation: null
    };
    
    const threshold = 160;
    
    function detectDevTools() {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            if (!devtools.open) {
                devtools.open = true;
                showNotification('Инструменты разработчика заблокированы', 'info');
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } else {
            devtools.open = false;
        }
    }
    
    setInterval(detectDevTools, 500);
}

// Функция для вычисления ширины скроллбара
function getScrollbarWidth() {
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    outer.style.msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);

    const inner = document.createElement('div');
    outer.appendChild(inner);

    const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);
    outer.parentNode.removeChild(outer);

    return scrollbarWidth;
}

// Функции для управления модальными окнами без дергания
function openModal(modal) {
    // Сохраняем текущую позицию скролла
    const scrollY = window.scrollY;
    const scrollbarWidth = getScrollbarWidth();
    
    // Устанавливаем CSS переменные
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    document.documentElement.style.setProperty('--scroll-y', `-${scrollY}px`);
    
    // Фиксируем body
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('modal-open');
    
    // Показываем модалку
    modal.style.display = 'block';
}

function closeModal(modal) {
    // Получаем сохраненную позицию скролла
    const scrollY = document.body.style.top;
    
    // Убираем фиксацию
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    
    // Восстанавливаем позицию скролла
    if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    // Очищаем CSS переменные
    document.documentElement.style.removeProperty('--scrollbar-width');
    document.documentElement.style.removeProperty('--scroll-y');
    
    // Скрываем модалку
    modal.style.display = 'none';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadUsersFromStorage();
    updateAuthInterface();
    initializeContentProtection(); // Включаем защиту
    initializeEventListeners(); // Инициализируем обработчики событий
    
    // Проверяем, есть ли сохраненная сессия
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const userEmail = JSON.parse(savedUser);
        const user = registeredUsers.get(userEmail);
        if (user) {
            currentUser = user;
            purchasedBooks = new Set(user.library);
            updateAuthInterface();
        }
    }
    
    // Сохраняем сессию при изменении
    window.addEventListener('beforeunload', function() {
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser.email));
        } else {
            localStorage.removeItem('currentUser');
        }
    });
});

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Основные кнопки действий
    const purchaseBtn = document.getElementById('purchaseBtn');
    const readSampleBtn = document.getElementById('readSampleBtn');
    const purchaseBtn2 = document.getElementById('purchaseBtn2');
    const readSampleBtn2 = document.getElementById('readSampleBtn2');
    
    if (purchaseBtn) purchaseBtn.addEventListener('click', purchaseBook);
    if (readSampleBtn) readSampleBtn.addEventListener('click', readSample);
    if (purchaseBtn2) purchaseBtn2.addEventListener('click', purchaseBook);
    if (readSampleBtn2) readSampleBtn2.addEventListener('click', readSample);
    
    // Кнопки авторизации
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    
    if (registerBtn) registerBtn.addEventListener('click', openRegisterModal);
    if (loginBtn) loginBtn.addEventListener('click', openLoginModal);
    if (profileBtn) profileBtn.addEventListener('click', openProfileModal);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (profileLogoutBtn) profileLogoutBtn.addEventListener('click', handleLogout);
    
    // Кнопки закрытия модальных окон
    const closeRegisterBtn = document.getElementById('closeRegisterBtn');
    const closeLoginBtn = document.getElementById('closeLoginBtn');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const closeBookDetailsBtn = document.getElementById('closeBookDetailsBtn');
    
    if (closeRegisterBtn) closeRegisterBtn.addEventListener('click', closeRegisterModal);
    if (closeLoginBtn) closeLoginBtn.addEventListener('click', closeLoginModal);
    if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModal);
    if (closeBookDetailsBtn) closeBookDetailsBtn.addEventListener('click', closeBookDetails);
    
    // Переключение между формами
    const switchToLoginBtn = document.getElementById('switchToLoginBtn');
    const switchToRegisterBtn = document.getElementById('switchToRegisterBtn');
    
    if (switchToLoginBtn) switchToLoginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        switchToLogin();
    });
    if (switchToRegisterBtn) switchToRegisterBtn.addEventListener('click', function(e) {
        e.preventDefault();
        switchToRegister();
    });
    
    // Формы авторизации
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
}

// Функции переключения между формами
function switchToLogin() {
    closeRegisterModal();
    openLoginModal();
}

function switchToRegister() {
    closeLoginModal();
    openRegisterModal();
}
