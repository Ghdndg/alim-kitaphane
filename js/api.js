// API клиент для работы с бэкендом
class ApiClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('accessToken');
    }

    // Установка токена
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
    }

    // Получение заголовков
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Базовый метод для запросов
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            credentials: 'include', // для cookies
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Если токен истек, пробуем обновить
            if (response.status === 403 && this.token) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Повторяем запрос с новым токеном
                    config.headers = this.getHeaders();
                    const retryResponse = await fetch(url, config);
                    return await this.handleResponse(retryResponse);
                }
            }
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API request error:', error);
            throw new Error('Ошибка сети. Проверьте подключение к интернету.');
        }
    }

    // Обработка ответа
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    }

    // Обновление токена
    async refreshToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.setToken(data.accessToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
        }
        
        this.setToken(null);
        return false;
    }

    // AUTH METHODS
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.accessToken) {
            this.setToken(response.accessToken);
        }
        
        return response;
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.accessToken) {
            this.setToken(response.accessToken);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST'
            });
        } finally {
            this.setToken(null);
        }
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // BOOKS METHODS
    async getBooks(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/books${query ? '?' + query : ''}`);
    }

    async getBook(id) {
        return await this.request(`/books/${id}`);
    }

    async getBookContent(id) {
        return await this.request(`/books/${id}/content`);
    }

    async getBookPreview(id) {
        return await this.request(`/books/${id}/preview`);
    }

    async searchBooks(query, limit = 20) {
        return await this.request(`/books/search/${encodeURIComponent(query)}?limit=${limit}`);
    }

    async getGenres() {
        return await this.request('/books/meta/genres');
    }

    // PAYMENTS METHODS
    async createPayment(bookId, returnUrl = null) {
        const response = await this.request('/payments/create', {
            method: 'POST',
            body: JSON.stringify({ 
                bookId, 
                returnUrl: returnUrl || `${window.location.origin}/payment-success.html`
            })
        });
        return response;
    }

    async getPaymentStatus(paymentId) {
        return await this.request(`/payments/status/${paymentId}`);
    }

    async getPaymentHistory(page = 1, limit = 10) {
        return await this.request(`/payments/history?page=${page}&limit=${limit}`);
    }

    // Проверка и завершение платежа
    async checkPaymentAndComplete(paymentId) {
        try {
            const paymentStatus = await this.getPaymentStatus(paymentId);
            
            if (paymentStatus.status === 'completed') {
                // Обновляем локальные данные пользователя
                const currentUser = await this.getCurrentUser();
                if (currentUser && currentUser.user) {
                    // Обновляем библиотеку пользователя в localStorage
                    const users = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
                    const userEmail = JSON.parse(localStorage.getItem('currentUser'));
                    
                    if (users[userEmail]) {
                        if (!users[userEmail].library) {
                            users[userEmail].library = [];
                        }
                        if (!users[userEmail].library.includes(paymentStatus.book.id)) {
                            users[userEmail].library.push(paymentStatus.book.id);
                        }
                        localStorage.setItem('registeredUsers', JSON.stringify(users));
                    }
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Payment check error:', error);
            return false;
        }
    }

    // USER METHODS
    async getUserLibrary(page = 1, limit = 10) {
        return await this.request(`/users/library?page=${page}&limit=${limit}`);
    }

    async getReadingSession(bookId) {
        return await this.request(`/users/reading-session/${bookId}`);
    }

    async updateReadingSession(bookId, sessionData) {
        return await this.request(`/users/reading-session/${bookId}`, {
            method: 'PUT',
            body: JSON.stringify(sessionData)
        });
    }

    async getBookmarks(bookId) {
        return await this.request(`/users/bookmarks/${bookId}`);
    }

    async addBookmark(bookId, bookmarkData) {
        return await this.request(`/users/bookmarks/${bookId}`, {
            method: 'POST',
            body: JSON.stringify(bookmarkData)
        });
    }

    async deleteBookmark(bookmarkId) {
        return await this.request(`/users/bookmarks/${bookmarkId}`, {
            method: 'DELETE'
        });
    }

    async getReadingStats() {
        return await this.request('/users/reading-stats');
    }
}

// Создаем глобальный экземпляр API клиента
window.api = new ApiClient();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}
