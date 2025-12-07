class CloudSyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncEnabled = false;
        this.userAccount = null;
        this.syncInterval = null;
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.checkAuthStatus();
    }

    setupEventListeners() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    async checkAuthStatus() {
        try {
            const savedAccount = await db.getSetting('userAccount');
            if (savedAccount) {
                this.userAccount = savedAccount;
                // Устанавливаем тип арендодателя по умолчанию, если не задан
                if (!this.userAccount.landlordType) {
                    this.userAccount.landlordType = 'selfEmployed';
                    await db.updateSetting('userAccount', this.userAccount);
                }
                this.syncEnabled = true;
                this.updateUI();
                this.startAutoSync();
            }
        } catch (error) {
            console.error('Ошибка проверки статуса авторизации:', error);
        }
    }

    async login(email, password) {
        try {
            const response = await this.mockApiCall('login', { email, password });

            this.userAccount = {
                email: response.email,
                token: response.token,
                userId: response.userId,
                landlordType: response.landlordType || 'selfEmployed', // Сохраняем тип арендодателя
                syncEnabled: true,
                lastSync: new Date().toISOString()
            };

            await db.updateSetting('userAccount', this.userAccount);
            this.syncEnabled = true;
            this.updateUI();

            // Обновляем калькулятор с типом арендодателя пользователя
            if (window.taxCalculator) {
                window.taxCalculator.setLandlordType(this.userAccount.landlordType);
            }

            await this.syncData();
            this.startAutoSync();

            return true;
        } catch (error) {
            throw new Error('Ошибка авторизации: ' + error.message);
        }
    }

    async register(email, password, landlordType = 'selfEmployed') {
        try {
            const response = await this.mockApiCall('register', {
                email,
                password,
                landlordType
            });

            this.userAccount = {
                email: response.email,
                token: response.token,
                userId: response.userId,
                landlordType: landlordType, // Сохраняем выбранный тип
                syncEnabled: true,
                lastSync: new Date().toISOString()
            };

            await db.updateSetting('userAccount', this.userAccount);
            this.syncEnabled = true;
            this.updateUI();

            // Устанавливаем тип арендодателя в калькуляторе
            if (window.taxCalculator) {
                window.taxCalculator.setLandlordType(landlordType);
            }

            await this.syncData();
            this.startAutoSync();

            return true;
        } catch (error) {
            throw new Error('Ошибка регистрации: ' + error.message);
        }
    }

    async updateLandlordType(landlordType) {
        if (this.userAccount) {
            this.userAccount.landlordType = landlordType;
            await db.updateSetting('userAccount', this.userAccount);

            // Обновляем калькулятор
            if (window.taxCalculator) {
                window.taxCalculator.setLandlordType(landlordType);
            }

            // Синхронизируем с облаком
            if (this.syncEnabled && this.isOnline) {
                await this.syncSettings();
            }

            return true;
        }
        return false;
    }

    async syncSettings() {
        try {
            await this.mockApiCall('updateSettings', {
                userId: this.userAccount.userId,
                settings: {
                    landlordType: this.userAccount.landlordType
                }
            });
        } catch (error) {
            console.error('Ошибка синхронизации настроек:', error);
        }
    }

    async logout() {
        this.userAccount = null;
        this.syncEnabled = false;
        await db.updateSetting('userAccount', null);
        this.stopAutoSync();
        this.updateUI();
        app.showNotification('Вы вышли из системы');
    }

    startAutoSync() {
        // Синхронизация каждые 30 минут
        this.syncInterval = setInterval(() => {
            if (this.syncEnabled && this.isOnline) {
                this.syncData();
            }
        }, 30 * 60 * 1000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncData() {
        if (!this.syncEnabled || !this.isOnline) return;

        try {
            const localData = await this.prepareLocalData();
            const response = await this.mockApiCall('sync', {
                userId: this.userAccount.userId,
                data: localData,
                timestamp: new Date().toISOString()
            });

            // Обновляем локальные данные с сервера
            await this.applyRemoteData(response.data);

            // Обновляем время последней синхронизации
            this.userAccount.lastSync = new Date().toISOString();
            await db.updateSetting('userAccount', this.userAccount);

            app.showNotification('Данные синхронизированы с облаком');
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            app.showNotification('Ошибка синхронизации', 'error');
        }
    }

    async prepareLocalData() {
        const [objects, contracts, payments, expenses, settings] = await Promise.all([
            db.getObjects(),
            db.getContracts(),
            db.getPayments(),
            db.getExpenses(),
            db.getSetting('appSettings')
        ]);

        return {
            objects,
            contracts,
            payments,
            expenses,
            settings: settings || {},
            lastSync: this.userAccount?.lastSync || new Date().toISOString()
        };
    }

    async applyRemoteData(remoteData) {
        // Базовая логика слияния - в реальном приложении должна быть сложнее
        if (remoteData.objects) {
            for (const object of remoteData.objects) {
                const existing = await db.get('objects', object.id);
                if (!existing || new Date(object.updatedAt) > new Date(existing.updatedAt)) {
                    await db.updateObject(object.id, object);
                }
            }
        }

        if (remoteData.contracts) {
            for (const contract of remoteData.contracts) {
                const existing = await db.get('contracts', contract.id);
                if (!existing || new Date(contract.updatedAt) > new Date(existing.updatedAt)) {
                    await db.updateContract(contract.id, contract);
                }
            }
        }

        await db.updateSetting('lastSync', new Date().toISOString());
    }

    async backupData() {
        try {
            const data = await this.prepareLocalData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `rent-tax-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            app.showNotification('Резервная копия создана');
        } catch (error) {
            console.error('Ошибка создания резервной копии:', error);
            app.showNotification('Ошибка создания резервной копии', 'error');
        }
    }

    async restoreData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await this.applyRemoteData(data);
                    app.showNotification('Данные восстановлены из резервной копии');
                    resolve();
                } catch (error) {
                    reject(new Error('Неверный формат файла'));
                }
            };
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    handleOnline() {
        this.isOnline = true;
        if (this.syncEnabled) {
            this.syncData();
        }
        app.showNotification('Соединение восстановлено');
    }

    handleOffline() {
        this.isOnline = false;
        app.showNotification('Работа в оффлайн-режиме', 'warning');
    }

    updateUI() {
        const accountBtn = document.getElementById('accountStatus');
        if (this.userAccount) {
            accountBtn.textContent = this.userAccount.email;
            document.getElementById('accountBtn').classList.add('logged-in');
        } else {
            accountBtn.textContent = 'Войти';
            document.getElementById('accountBtn').classList.remove('logged-in');
        }
    }

    // Мок API для демонстрации
    async mockApiCall(endpoint, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (endpoint === 'login' || endpoint === 'register') {
                    if (data.email && data.password) {
                        if (data.password.length < 6) {
                            reject(new Error('Пароль должен содержать не менее 6 символов'));
                            return;
                        }
                        resolve({
                            email: data.email,
                            token: 'mock-jwt-token-' + Math.random().toString(36).substr(2),
                            userId: 'user_' + Math.random().toString(36).substr(2, 9),
                            landlordType: data.landlordType || 'selfEmployed'
                        });
                    } else {
                        reject(new Error('Неверные данные'));
                    }
                } else if (endpoint === 'updateSettings') {
                    resolve({ success: true });
                } else if (endpoint === 'sync') {
                    resolve({ data: {}, success: true });
                } else {
                    reject(new Error('Неизвестный endpoint'));
                }
            }, 1500);
        });
    }
}