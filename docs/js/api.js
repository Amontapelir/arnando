/**
 * API сервис для взаимодействия с бэкендом
 */
class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost:8000';
        this.token = localStorage.getItem('auth_token');
    }

    /**
     * Установка токена авторизации
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    /**
     * Удаление токена
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    /**
     * Базовый метод для API запросов
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Добавляем токен авторизации если есть
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
            credentials: 'include' // Важно для работы с куками/сессиями
        };

        try {
            const response = await fetch(url, config);

            // Обработка 401 ошибки
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    const errorText = await response.text();
                    errorData = { detail: errorText || `HTTP error! status: ${response.status}` };
                }

                if (response.status === 422 && errorData.detail) {
                    const validationErrors = Array.isArray(errorData.detail)
                        ? errorData.detail.map(err => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`).join(', ')
                        : errorData.detail;
                    throw new Error(validationErrors);
                }

                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            // Для DELETE запросов может не быть тела
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Аутентификация
    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await this.request('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (response && response.access_token) {
            this.setToken(response.access_token);
            return response;
        }
        throw new Error('Invalid login response');
    }

    async register(userData) {
        // Убедимся, что отправляем правильные поля
        const registrationData = {
            email: userData.email,
            password: userData.password,
            full_name: userData.full_name,
            landlord_type: userData.landlord_type || 'self_employed'
        };

        return await this.request('/users/', {
            method: 'POST',
            body: JSON.stringify(registrationData)
        });
    }

    async getCurrentUser() {
        try {
            const response = await this.request('/users/me/');
            return response;
        } catch (error) {
            console.error('Failed to get current user:', error);
            // Если токен невалидный, очищаем его
            if (error.status === 401) {
                this.clearToken();
            }
            throw error;
        }
    }

    async updateUser(userId, userData) {
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Объекты недвижимости
    async getProperties() {
        return await this.request('/properties/');
    }

    async getProperty(id) {
        return await this.request(`/properties/${id}`);
    }

    async createProperty(propertyData) {
        return await this.request('/properties/', {
            method: 'POST',
            body: JSON.stringify(propertyData)
        });
    }

    async updateProperty(id, propertyData) {
        return await this.request(`/properties/${id}`, {
            method: 'PUT',
            body: JSON.stringify(propertyData)
        });
    }

    async deleteProperty(id) {
        return await this.request(`/properties/${id}`, {
            method: 'DELETE'
        });
    }

    // Договоры
    async getContracts() {
        return await this.request('/contracts/');
    }

    async getContract(id) {
        return await this.request(`/contracts/${id}`);
    }

    async createContract(contractData) {
        return await this.request('/contracts/', {
            method: 'POST',
            body: JSON.stringify(contractData)
        });
    }

    async updateContract(id, contractData) {
        return await this.request(`/contracts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contractData)
        });
    }

    async deleteContract(id) {
        return await this.request(`/contracts/${id}`, {
            method: 'DELETE'
        });
    }
}

// Глобальный экземпляр API
const apiService = new ApiService();