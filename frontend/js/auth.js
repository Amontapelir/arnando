/**
 * Сервис аутентификации
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.uiUpdateCallbacks = [];
    }

    /**
     * Инициализация сервиса аутентификации
     */
    async initialize() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                this.currentUser = await apiService.getCurrentUser();
                this.isAuthenticated = true;
                await this.updateUI();
            } catch (error) {
                console.error('Failed to get current user:', error);
                this.logout();
            }
        }
    }

    /**
     * Вход в систему
     */
    async login(email, password) {
        try {
            const response = await apiService.login(email, password);
            if (response && response.access_token) {
                this.currentUser = await apiService.getCurrentUser();
                this.isAuthenticated = true;
                await this.updateUI();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Регистрация
     */
    async register(userData) {
        try {
            await apiService.register(userData);
            // Автоматический вход после регистрации
            return await this.login(userData.email, userData.password);
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    /**
     * Выход из системы
     */
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        apiService.clearToken();
        this.updateUI();
    }

    /**
     * Обновление интерфейса в зависимости от статуса аутентификации
     */
    async updateUI() {
        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const accountStatus = document.getElementById('accountStatus');
            const accountBtn = document.getElementById('accountBtn');

            if (!accountStatus || !accountBtn) {
                return; // Элементы еще не созданы, пропускаем
            }

            if (this.isAuthenticated && this.currentUser) {
                accountStatus.textContent = this.currentUser.email || 'Аккаунт';
                accountBtn.innerHTML = '<i class="fas fa-user"></i> ' + (this.currentUser.email || 'Аккаунт');
            } else {
                accountStatus.textContent = 'Войти';
                accountBtn.innerHTML = '<i class="fas fa-user"></i> Войти';
            }
        } catch (error) {
            console.error('Auth UI update error:', error);
        }
    }

    async ensureAuthElements() {
        // Проверяем каждые 100ms в течение 3 секунд
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const accountStatus = document.getElementById('accountStatus');
            const accountBtn = document.getElementById('accountBtn');

            if (accountStatus && accountBtn) {
                console.log('Элементы аутентификации найдены, обновляем UI');
                await this.updateUI();
                return;
            }
        }
        console.warn('Элементы аутентификации не найдены после нескольких попыток');
    }

    /**
     * Проверка авторизации
     */
    requireAuth() {
        if (!this.isAuthenticated) {
            if (window.app && typeof window.app.showAccountModal === 'function') {
                window.app.showAccountModal();
            }
            throw new Error('Authentication required');
        }
    }

    /**
     * Получение типа арендодателя
     */
    getLandlordType() {
        return this.currentUser?.landlord_type || 'self_employed';
    }

    /**
     * Обновление типа арендодателя
     */
    async updateLandlordType(landlordType) {
        if (!this.currentUser) return false;

        try {
            await apiService.updateUser(this.currentUser.id, {
                landlord_type: landlordType
            });
            this.currentUser.landlord_type = landlordType;
            return true;
        } catch (error) {
            console.error('Failed to update landlord type:', error);
            throw error;
        }
    }
}

// Глобальный экземпляр сервиса аутентификации
const authService = new AuthService();