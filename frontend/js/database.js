/**
 * Класс для работы с IndexedDB
 * Обеспечивает хранение и управление данными приложения
 */
class Database {
    constructor() {
        this.dbName = 'RentTaxDB';
        this.version = 2;
        this.db = null;
        this.initialized = false;
        this.initPromise = this.init();
    }

    /**
     * Ожидание инициализации базы данных
     * @async
     * @returns {Promise<IDBDatabase>} - промис с объектом базы данных
     */
    async waitForInit() {
        await this.initPromise;
        this.initialized = true;
        return this.db;
    }

    /**
     * Инициализация базы данных и создание хранилищ
     * @async
     * @returns {Promise<IDBDatabase>} - промис с объектом базы данных
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }

    /**
     * Создание хранилищ объектов при обновлении версии БД
     * @param {IDBDatabase} db - объект базы данных
     */
    createObjectStores(db) {
        // Хранилище объектов недвижимости
        if (!db.objectStoreNames.contains('objects')) {
            const objectsStore = db.createObjectStore('objects', { keyPath: 'id', autoIncrement: true });
            objectsStore.createIndex('name', 'name', { unique: false });
        }

        // Хранилище договоров аренды
        if (!db.objectStoreNames.contains('contracts')) {
            const contractsStore = db.createObjectStore('contracts', { keyPath: 'id', autoIncrement: true });
            contractsStore.createIndex('objectId', 'objectId', { unique: false });
            contractsStore.createIndex('endDate', 'endDate', { unique: false });
        }

        // Хранилище платежей
        if (!db.objectStoreNames.contains('payments')) {
            const paymentsStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
            paymentsStore.createIndex('contractId', 'contractId', { unique: false });
            paymentsStore.createIndex('date', 'date', { unique: false });
        }

        // Хранилище расходов
        if (!db.objectStoreNames.contains('expenses')) {
            const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
            expensesStore.createIndex('objectId', 'objectId', { unique: false });
            expensesStore.createIndex('date', 'date', { unique: false });
        }

        // Хранилище настроек
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }
    }

    /**
     * Базовый метод добавления записи
     * @param {string} storeName - название хранилища
     * @param {Object} data - данные для добавления
     * @async
     * @returns {Promise<number>} - промис с ID добавленной записи
     */
    async add(storeName, data) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Базовый метод получения записи по ID
     * @param {string} storeName - название хранилища
     * @param {number} id - ID записи
     * @async
     * @returns {Promise<Object>} - промис с данными записи
     */
    async get(storeName, id) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Базовый метод получения всех записей
     * @param {string} storeName - название хранилища
     * @param {string|null} indexName - название индекса (опционально)
     * @async
     * @returns {Promise<Array>} - промис с массивом записей
     */
    async getAll(storeName, indexName = null) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const target = indexName ? store.index(indexName) : store;

        return new Promise((resolve, reject) => {
            const request = target.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Базовый метод обновления записи
     * @param {string} storeName - название хранилища
     * @param {number} id - ID записи
     * @param {Object} data - новые данные
     * @async
     * @returns {Promise<number>} - промис с ID обновленной записи
     */
    async update(storeName, id, data) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put({ ...data, id });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Базовый метод удаления записи
     * @param {string} storeName - название хранилища
     * @param {number} id - ID записи
     * @async
     * @returns {Promise<void>} - промис
     */
    async delete(storeName, id) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Специализированные методы для работы с объектами недвижимости

    /**
     * Добавление объекта недвижимости
     * @param {Object} object - данные объекта
     * @async
     * @returns {Promise<number>} - промис с ID объекта
     */
    async addObject(object) {
        // Улучшенная проверка дубликатов
        const existingObjects = await this.getAll('objects');
        const duplicate = existingObjects.find(obj =>
            obj.name.toLowerCase() === object.name.toLowerCase() &&
            obj.address.toLowerCase() === object.address.toLowerCase()
        );

        if (duplicate) {
            throw new Error('Объект с таким названием и адресом уже существует');
        }

        return this.add('objects', {
            ...object,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Получение всех объектов недвижимости
     * @async
     * @returns {Promise<Array>} - промис с массивом объектов
     */
    async getObjects() {
        return this.getAll('objects');
    }

    /**
     * Обновление объекта недвижимости
     * @param {number} id - ID объекта
     * @param {Object} object - новые данные объекта
     * @async
     * @returns {Promise<number>} - промис с ID объекта
     */
    async updateObject(id, object) {
        return this.update('objects', id, {
            ...object,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Удаление объекта недвижимости и связанных данных
     * @param {number} id - ID объекта
     * @async
     * @returns {Promise<void>} - промис
     */
    async deleteObject(id) {
        // Удаляем связанные договоры
        const contracts = await this.getContractsByObject(id);
        for (const contract of contracts) {
            await this.deleteContract(contract.id);
        }

        // Удаляем связанные расходы
        const expenses = await this.getExpensesByObject(id);
        for (const expense of expenses) {
            await this.deleteExpense(expense.id);
        }

        return this.delete('objects', id);
    }

    // Специализированные методы для работы с договорами

    /**
     * Добавление договора аренды
     * @param {Object} contract - данные договора
     * @async
     * @returns {Promise<number>} - промис с ID договора
     */
    async addContract(contract) {
        // Улучшенная проверка дубликатов для договоров
        const existingContracts = await this.getAll('contracts');
        const duplicate = existingContracts.find(c =>
            c.tenantName.toLowerCase() === contract.tenantName.toLowerCase() &&
            c.objectId === contract.objectId &&
            c.startDate === contract.startDate
        );

        if (duplicate) {
            throw new Error('Договор с таким арендатором для этого объекта и даты начала уже существует');
        }

        return this.add('contracts', {
            ...contract,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        });
    }

    /**
     * Получение всех договоров
     * @async
     * @returns {Promise<Array>} - промис с массивом договоров
     */
    async getContracts() {
        return this.getAll('contracts');
    }

    /**
     * Получение договоров по объекту недвижимости
     * @param {number} objectId - ID объекта
     * @async
     * @returns {Promise<Array>} - промис с массивом договоров
     */
    async getContractsByObject(objectId) {
        const allContracts = await this.getContracts();
        return allContracts.filter(contract => contract.objectId === objectId);
    }

    /**
     * Получение активных договоров
     * @async
     * @returns {Promise<Array>} - промис с массивом активных договоров
     */
    async getActiveContracts() {
        const allContracts = await this.getContracts();
        return allContracts.filter(contract => contract.isActive);
    }

    /**
     * Обновление договора
     * @param {number} id - ID договора
     * @param {Object} contract - новые данные договора
     * @async
     * @returns {Promise<number>} - промис с ID договора
     */
    async updateContract(id, contract) {
        return this.update('contracts', id, {
            ...contract,
            tenantType: contract.tenantType || 'physical',
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Удаление договора и связанных платежей
     * @param {number} id - ID договора
     * @async
     * @returns {Promise<void>} - промис
     */
    async deleteContract(id) {
        // Удаляем связанные платежи
        const payments = await this.getPaymentsByContract(id);
        for (const payment of payments) {
            await this.deletePayment(payment.id);
        }

        return this.delete('contracts', id);
    }

    // Специализированные методы для работы с платежами

    /**
     * Добавление платежа
     * @param {Object} payment - данные платежа
     * @async
     * @returns {Promise<number>} - промис с ID платежа
     */
    async addPayment(payment) {
        return this.add('payments', {
            ...payment,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Получение всех платежей
     * @async
     * @returns {Promise<Array>} - промис с массивом платежей
     */
    async getPayments() {
        return this.getAll('payments');
    }

    /**
     * Получение платежей по договору
     * @param {number} contractId - ID договора
     * @async
     * @returns {Promise<Array>} - промис с массивом платежей
     */
    async getPaymentsByContract(contractId) {
        const allPayments = await this.getPayments();
        return allPayments.filter(payment => payment.contractId === contractId);
    }

    /**
     * Получение последних платежей
     * @param {number} limit - количество платежей
     * @async
     * @returns {Promise<Array>} - промис с массивом платежей
     */
    async getRecentPayments(limit = 10) {
        const allPayments = await this.getPayments();
        return allPayments
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }

    /**
     * Удаление платежа
     * @param {number} id - ID платежа
     * @async
     * @returns {Promise<void>} - промис
     */
    async deletePayment(id) {
        return this.delete('payments', id);
    }

    // Специализированные методы для работы с расходами

    /**
     * Добавление расхода
     * @param {Object} expense - данные расхода
     * @async
     * @returns {Promise<number>} - промис с ID расхода
     */
    async addExpense(expense) {
        return this.add('expenses', {
            ...expense,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Получение всех расходов
     * @async
     * @returns {Promise<Array>} - промис с массивом расходов
     */
    async getExpenses() {
        return this.getAll('expenses');
    }

    /**
     * Получение расходов по объекту недвижимости
     * @param {number} objectId - ID объекта
     * @async
     * @returns {Promise<Array>} - промис с массивом расходов
     */
    async getExpensesByObject(objectId) {
        const allExpenses = await this.getExpenses();
        return allExpenses.filter(expense => expense.objectId === objectId);
    }

    /**
     * Удаление расхода
     * @param {number} id - ID расхода
     * @async
     * @returns {Promise<void>} - промис
     */
    async deleteExpense(id) {
        return this.delete('expenses', id);
    }

    // Методы для работы с настройками

    /**
     * Получение настройки по ключу
     * @param {string} key - ключ настройки
     * @async
     * @returns {Promise<any>} - промис со значением настройки
     */
    async getSetting(key) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Обновление настройки
     * @param {string} key - ключ настройки
     * @param {any} value - значение настройки
     * @async
     * @returns {Promise<number>} - промис
     */
    async updateSetting(key, value) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.put({
                key,
                value,
                updatedAt: new Date().toISOString()
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Удаление настройки
     * @param {string} key - ключ настройки
     * @async
     * @returns {Promise<void>} - промис
     */
    async deleteSetting(key) {
        if (!this.initialized) await this.waitForInit();
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Создание глобального экземпляра базы данных
const db = new Database();