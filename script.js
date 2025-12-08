// Глобальные переменные
let currentUser = null;
let userLibrary = [];
let purchasedBooks = new Set();
let registeredUsers = new Map(); // Хранилище пользователей

// Данные книги (в реальном проекте это будет поступать с сервера)
const bookData = {
    id: 1,
    title: "Хаджи Гирай",
    subtitle: "Тарихий роман",
    author: "Алим Мидат",
    price: 299,
    content: `Хаджи Гирай беш бинъ атлы аскерининъ ортасында эди. О, гъалебе къазанмайджагъыны анълады, амма байыр тёпесинде тургъан Улу-Мухаммедни корип, озь йигитлеринен буюк гъазапнен душмангъа къаршы атылды. Бойле джесюрликни беклемеген могъолларнынъ сыралары дагъылды. Улу-Мухаммед биле атыны къамчылап, къачмагъа ынтылды.

Шу арада, якъындаки орманда сакълангъан он бинъ могъол аскери дженкке къошулды. Олар четтен урып, Хаджи Гирайны уджюм эттилер. Ондан гъайры, могъол ордусындан артта къалгъан даа он бинъ аскер етип кельди. Къырымлыларнынъ онъ къанаты оларгъа къаршы атылды. Чокълукъта олгъан могъоллар онынъ сафларыны авдарып, ордунынъ ортасына кирдилер. Эр шей къарышты, дженк мейданындан акъкъан къан, озен сувларыны къызыл тюске боялады.

Сонъ могъоллар сол къанатны да тар-мар эттилер. Хаджи Гирай озь йигитлеринен уйлегедже урушты ве адетиндже сабырлыгъыны ёкъ этип, яралы арслан киби де онъ, де сол къанаткъа атылды.

Могъоллар ханнынъ «чареси олса, эсирге алмакъ», деген буйругъыны беджерип, Хаджи Гирайнынъ этрафындаки алкъаны эп сыкъа эдилер. О исе, душманларнынъ сафларыны ярып кечмек ичюн, къылычыны йылдырым кучюнен оларнынъ башларына ягъдыра. Вазиет умютсиз олгъаныны анълагъан хан, башлыкъ ве зырхларыны чыкъарып ташлады, тек къылычыны къалдырды. Сонъ атыны чевирип, алкъада тургъан могъол аскерлерни урып йыкъты ве озюни юксек ялыдан озеннинъ къара далгъаларына атты. Бойле арекеттен айретте къалгъан могъол аскерлери, озенни ялдап кечеяткъан хангъа окъ атып башладылар. Хаджи Гирай дерьянынъ ортасына ялдап баргъанда, эки окъ келип онынъ омузына сапланды. Кескин агъры бутюн беденини якъты ве кучьлю далгъа башыны къаплады. Хаджи Гирайнынъ козю огюнде бутюн къыскъа омюри кечип кетти. Сонъ бир ярыкъ корюнди ве ондан:

- Бу дюньяда сенинъ ишлеринъ даа битмеди! – деген сес эшитильди.

Хаджи Гирай озюне кельди, янында олгъан атынынъ ялына япышты ве сувдан чыкъып, тик ялыгъа котерильген сонъ, о ерде къылычыны котерип, Улу-Мухаммедке косьтерди.`
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
                    <p class="yukassa-description">Безопасная оплата онлайн</p>
                </div>
            </div>
            <div class="terms-agreement" style="margin: 1.5rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <label style="display: flex; align-items: start; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="agreeTerms" style="margin-top: 0.25rem; cursor: pointer; width: 18px; height: 18px;">
                    <span style="font-size: 0.9rem; color: #2c3e50; line-height: 1.5;">
                        Я согласен с <a href="terms.html" target="_blank" style="color: #3498db; text-decoration: underline;">Пользовательским соглашением и Публичной офертой</a> и даю согласие на обработку персональных данных
                    </span>
                </label>
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

async function handleRegister(event) {
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
    
    try {
        console.log('🔵 Отправка запроса регистрации на бэкенд:', { name, email });
        
        // Отправляем запрос на бэкенд
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        console.log('📥 Ответ от сервера:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📦 Данные от сервера:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка регистрации');
        }
        
        // Сохраняем токен
        localStorage.setItem('accessToken', data.accessToken);
        
        // Сохраняем данные пользователя локально
        currentUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            library: data.user.library || []
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        registeredUsers.set(email, currentUser);
        saveUsersToStorage();
        
        showNotification('Регистрация прошла успешно!', 'success');
        closeRegisterModal();
        updateAuthInterface();
        
        // Очищаем форму
        document.getElementById('regName').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regPasswordConfirm').value = '';
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Ошибка при регистрации', 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        console.log('🔵 Отправка запроса входа на бэкенд:', { email });
        
        // Отправляем запрос на бэкенд
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('📥 Ответ от сервера:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📦 Данные от сервера:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка входа');
        }
        
        // Сохраняем токен
        localStorage.setItem('accessToken', data.accessToken);
        
        // Сохраняем данные пользователя локально
        currentUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            library: data.user.library || []
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        registeredUsers.set(email, currentUser);
        purchasedBooks = new Set(currentUser.library);
        saveUsersToStorage();
        
        updateAuthInterface();
        closeLoginModal();
        showNotification(`Добро пожаловать, ${currentUser.name}!`, 'success');
        
        // Очищаем форму
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        
        // Переходим в ридер после входа
        setTimeout(() => {
            if (currentUser.library.length > 0) {
                // Если есть купленные книги, переходим в ридер
                window.location.href = 'reader.html';
            } else {
                // Если нет купленных книг, показываем сообщение
                showNotification('У вас пока нет купленных книг. Приобретите книгу для чтения.', 'info');
            }
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Ошибка при входе', 'error');
    }
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

    // Проверяем согласие с условиями
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    if (!agreeTermsCheckbox || !agreeTermsCheckbox.checked) {
        showNotification('Необходимо согласиться с Пользовательским соглашением', 'error');
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
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } else {
            devtools.open = false;
        }
    }
    
    // Запускаем проверку только на десктопе
    if (!isMobile) {
        setInterval(detectDevTools, 500);
    }
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

// Функция загрузки библиотеки пользователя из API
async function loadUserLibraryFromAPI() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || !currentUser) {
        return;
    }
    
    try {
        const response = await fetch('/api/users/library', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Обновляем библиотеку пользователя
            if (data.library && data.library.length > 0) {
                currentUser.library = data.library.map(book => book.id);
                purchasedBooks = new Set(currentUser.library);
                
                // Обновляем в localStorage
                const userEmail = currentUser.email;
                if (registeredUsers.has(userEmail)) {
                    const user = registeredUsers.get(userEmail);
                    user.library = currentUser.library;
                    registeredUsers.set(userEmail, user);
                    saveUsersToStorage();
                }
                
                // Обновляем интерфейс
                updateBookPurchaseStatus();
            }
        }
    } catch (error) {
        console.error('Error loading user library:', error);
    }
}

// Функция обновления статуса покупки книги на странице
function updateBookPurchaseStatus() {
    if (!currentUser || !currentUser.library) return;
    
    const bookId = 1; // ID книги Хаджи Гирай
    const isBookPurchased = currentUser.library.includes(bookId);
    
    // Находим все кнопки покупки и заменяем на "Читать" если книга куплена
    const purchaseButtons = document.querySelectorAll('#purchaseBtn, #purchaseBtn2');
    purchaseButtons.forEach(btn => {
        if (isBookPurchased && btn) {
            btn.innerHTML = '<i class="fas fa-book-open"></i> Читать';
            btn.onclick = function() {
                window.location.href = 'reader.html';
            };
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    loadUsersFromStorage();
    updateAuthInterface();
    initializeContentProtection(); // Включаем защиту
    initializeEventListeners(); // Инициализируем обработчики событий
    
    // Проверяем, есть ли сохраненная сессия
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            // Поддерживаем старый формат (строка email) и новый (объект)
            const userEmail = typeof userData === 'string' ? userData : userData.email;
            
            if (userEmail) {
                const user = registeredUsers.get(userEmail);
                if (user) {
                    currentUser = user;
                    purchasedBooks = new Set(user.library || []);
                    updateAuthInterface();
                    
                    // Загружаем актуальную библиотеку из API
                    await loadUserLibraryFromAPI();
                } else if (typeof userData === 'object' && userData.email) {
                    // Если это объект и нет в registeredUsers, используем его напрямую
                    currentUser = userData;
                    purchasedBooks = new Set(currentUser.library || []);
                    registeredUsers.set(currentUser.email, currentUser);
                    updateAuthInterface();
                    
                    // Загружаем актуальную библиотеку из API
                    await loadUserLibraryFromAPI();
                }
            }
        } catch (e) {
            console.error('Error loading saved user:', e);
            localStorage.removeItem('currentUser');
        }
    }
    
    // Сохраняем сессию при изменении
    window.addEventListener('beforeunload', function() {
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
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
