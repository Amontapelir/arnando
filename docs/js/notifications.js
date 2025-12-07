class NotificationManager {
    constructor() {
        this.notifications = [];
        this.checkInterval = 1000 * 60 * 60; // Проверка каждый час
        this.initialize();
    }

    async initialize() {
        await this.loadNotifications();
        this.startPeriodicChecking();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('notificationsBtn').addEventListener('click', () => this.toggleNotifications());
        document.getElementById('closeNotifications').addEventListener('click', () => this.hideNotifications());
    }

    async loadNotifications() {
        try {
            const saved = await db.getSetting('notifications');
            this.notifications = saved || [];
            this.updateNotificationCounter();
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
            this.notifications = [];
        }
    }

    async saveNotifications() {
        try {
            await db.updateSetting('notifications', this.notifications);
        } catch (error) {
            console.error('Ошибка сохранения уведомлений:', error);
        }
    }

    async addNotification(type, title, message, priority = 'medium', action = null) {
        const notification = {
            id: Date.now(),
            type,
            title,
            message,
            priority,
            action,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(notification);
        await this.saveNotifications();
        this.updateNotificationCounter();
        this.showBrowserNotification(notification);

        return notification;
    }

    async checkUpcomingPayments() {
        try {
            const contracts = await db.getActiveContracts();
            const today = new Date();
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

            for (const contract of contracts) {
                const nextPaymentDate = this.calculateNextPaymentDate(contract);

                if (nextPaymentDate <= nextWeek && nextPaymentDate >= today) {
                    const daysUntilPayment = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));

                    await this.addNotification(
                        'payment',
                        'Предстоящий платеж',
                        `Платеж по договору с ${contract.tenantName} через ${daysUntilPayment} дней (${this.formatCurrency(contract.rentAmount)})`,
                        'high',
                        { type: 'view_contract', contractId: contract.id }
                    );
                }
            }
        } catch (error) {
            console.error('Ошибка проверки платежей:', error);
        }
    }

    calculateNextPaymentDate(contract) {
        const today = new Date();
        const startDate = new Date(contract.startDate);

        // Простой расчет следующей даты платежа
        let nextPayment = new Date(startDate);
        while (nextPayment <= today) {
            if (contract.paymentSchedule === 'monthly') {
                nextPayment.setMonth(nextPayment.getMonth() + 1);
            } else {
                nextPayment.setMonth(nextPayment.getMonth() + 3);
            }
        }

        return nextPayment;
    }

    async checkTaxDeadlines() {
        const today = new Date();
        const taxDeadline = new Date(today.getFullYear(), today.getMonth(), 28);

        if (taxDeadline >= today && (taxDeadline - today) / (1000 * 60 * 60 * 24) <= 7) {
            await this.addNotification(
                'tax',
                'Срок уплаты налога',
                'До уплаты налога осталось менее 7 дней',
                'high',
                { type: 'view_tax_calculator' }
            );
        }
    }

    async checkContractExpirations() {
        try {
            const contracts = await db.getActiveContracts();
            const today = new Date();
            const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

            for (const contract of contracts) {
                const endDate = new Date(contract.endDate);

                if (endDate <= nextMonth && endDate >= today) {
                    const daysUntilExpiration = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                    await this.addNotification(
                        'contract',
                        'Завершение договора',
                        `Договор с ${contract.tenantName} истекает через ${daysUntilExpiration} дней`,
                        'medium',
                        { type: 'renew_contract', contractId: contract.id }
                    );
                }
            }
        } catch (error) {
            console.error('Ошибка проверки договоров:', error);
        }
    }

    startPeriodicChecking() {
        // Проверка каждые 12 часов
        setInterval(() => {
            this.checkUpcomingPayments();
            this.checkTaxDeadlines();
            this.checkContractExpirations();
        }, 12 * 60 * 60 * 1000);

        // Первоначальная проверка через 5 секунд после загрузки
        setTimeout(() => {
            this.checkUpcomingPayments();
            this.checkTaxDeadlines();
            this.checkContractExpirations();
        }, 5000);
    }

    updateNotificationCounter() {
        const counter = document.getElementById('notificationCounter');
        const unreadCount = this.notifications.filter(n => !n.read).length;

        if (unreadCount > 0) {
            counter.textContent = unreadCount > 99 ? '99+' : unreadCount;
            counter.classList.remove('hidden');
        } else {
            counter.classList.add('hidden');
        }
    }

    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        panel.classList.toggle('hidden');

        if (!panel.classList.contains('hidden')) {
            this.markAllAsRead();
            this.displayNotifications();
        }
    }

    hideNotifications() {
        document.getElementById('notificationsPanel').classList.add('hidden');
    }

    displayNotifications() {
        const container = document.getElementById('notificationsList');
        container.innerHTML = '';

        if (this.notifications.length === 0) {
            container.innerHTML = '<div class="notification-empty">Нет уведомлений</div>';
            return;
        }

        this.notifications.forEach(notification => {
            const element = this.createNotificationElement(notification);
            container.appendChild(element);
        });
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification-item ${notification.priority} ${notification.read ? 'read' : 'unread'}`;
        element.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
            </div>
            <div class="notification-actions">
                ${notification.action ? `<button class="btn-text notification-action-btn" data-id="${notification.id}">Действие</button>` : ''}
                <button class="btn-text notification-delete-btn" data-id="${notification.id}">✕</button>
            </div>
        `;

        // Добавляем обработчики событий
        const actionBtn = element.querySelector('.notification-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleNotificationAction(notification.id);
            });
        }

        const deleteBtn = element.querySelector('.notification-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNotification(notification.id);
        });

        return element;
    }

    getNotificationIcon(type) {
        const icons = {
            'payment': 'fa-money-bill-wave',
            'tax': 'fa-calculator',
            'contract': 'fa-file-contract',
            'system': 'fa-info-circle'
        };
        return icons[type] || 'fa-bell';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

        return date.toLocaleDateString('ru-RU');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    }

    async handleNotificationAction(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && notification.action) {
            switch (notification.action.type) {
                case 'view_contract':
                    app.switchPage('contracts');
                    break;
                case 'view_tax_calculator':
                    app.switchPage('calculator');
                    break;
                case 'renew_contract':
                    await app.editContract(notification.action.contractId);
                    break;
            }
        }
        await this.markAsRead(notificationId);
    }

    async markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            await this.saveNotifications();
            this.updateNotificationCounter();
            this.displayNotifications();
        }
    }

    async markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        await this.saveNotifications();
        this.updateNotificationCounter();
    }

    async deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        await this.saveNotifications();
        this.updateNotificationCounter();
        this.displayNotifications();
    }

    showBrowserNotification(notification) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico'
            });
        }
    }

    async requestNotificationPermission() {
        if ("Notification" in window) {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return false;
    }
}