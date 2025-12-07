class Router {
    constructor() {
        this.routes = {
            'dashboard': 'pages/dashboard.html',
            'objects': 'pages/objects.html',
            'calculator': 'pages/calculator.html',
            'contracts': 'pages/contracts.html',
            'analytics': 'pages/analytics.html',
            'profile': 'pages/profile.html'
        };

        this.currentPage = 'dashboard';
        this.mainContent = document.getElementById('main-content');

        // Инициализируем после полной загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Router initializing...');

        // Обработчик изменения хеша
        window.addEventListener('hashchange', () => this.handleRouteChange());

        // Обработчик кликов по навигации
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.nav-btn');
            if (navBtn && navBtn.dataset.page) {
                e.preventDefault();
                const page = navBtn.dataset.page;
                if (this.routes[page] && page !== this.currentPage) {
                    this.navigateTo(page);
                }
            }
        });

        // Запускаем начальный роут
        this.handleRouteChange();
    }

    handleRouteChange() {
        const hash = window.location.hash.replace('#', '');
        const page = hash || 'dashboard';

        // Уничтожаем предыдущие компоненты перед загрузкой новой страницы
        this.destroyCurrentPageComponents();

        this.loadPage(page);
    }

    destroyCurrentPageComponents() {
        // Уничтожаем компоненты текущей страницы
        switch(this.currentPage) {
            case 'calculator':
                this.destroyCalculator();
                break;
            case 'analytics':
                this.destroyAnalytics();
                break;
        }
    }

    destroyCalculator() {
        // Уничтожаем экземпляр калькулятора если он существует
        if (window.taxCalculator) {
            if (typeof window.taxCalculator.destroy === 'function') {
                window.taxCalculator.destroy();
            }
            window.taxCalculator = null;
        }
    }

    destroyAnalytics() {
        // Уничтожаем графики если они существуют
        if (window.chartsManager) {
            if (typeof window.chartsManager.destroy === 'function') {
                window.chartsManager.destroy();
            }
            window.chartsManager = null;
        }

        // Уничтожаем все экземпляры Chart.js если они остались
        const charts = document.querySelectorAll('canvas');
        charts.forEach(canvas => {
            const chart = Chart.getChart(canvas);
            if (chart) {
                chart.destroy();
            }
        });
    }

    navigateTo(page) {
        if (this.routes[page]) {
            window.location.hash = page;
        }
    }

    async loadPage(page) {
        try {
            if (!this.mainContent) return;

            // Показываем загрузку
            this.mainContent.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Загрузка...</p>
                </div>
            `;

            const response = await fetch(this.routes[page]);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            let pageContent = tempDiv.querySelector('.page') ||
                             tempDiv.querySelector('.profile-page') ||
                             tempDiv.querySelector('.analytics-page') ||
                             tempDiv.querySelector('.dashboard-page') ||
                             tempDiv;

            this.mainContent.innerHTML = pageContent.innerHTML;

            // Обновляем активную кнопку
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`[data-page="${page}"]`);
            if (activeBtn) activeBtn.classList.add('active');

            this.currentPage = page;
            this.initializePage(page);

        } catch (error) {
            console.error('Failed to load page:', error);
            this.mainContent.innerHTML = `
                <div class="error-container">
                    <h2>Ошибка загрузки страницы</h2>
                    <p>${error.message}</p>
                    <button class="btn-primary" onclick="window.router.navigateTo('dashboard')">
                        На главную
                    </button>
                </div>
            `;
        }
    }

    initializePage(page) {
        if (!window.app) {
            setTimeout(() => this.initializePage(page), 100);
            return;
        }

        switch(page) {
            case 'dashboard':
                if (window.app.loadDashboard) window.app.loadDashboard();
                break;
            case 'objects':
                if (window.app.loadObjects) window.app.loadObjects();
                break;
            case 'contracts':
                if (window.app.loadContracts) window.app.loadContracts();
                break;
            case 'calculator':
                this.initializeCalculatorPage();
                break;
            case 'analytics':
                this.initializeAnalyticsPage();
                break;
            case 'profile':
                if (window.app.loadProfilePage) window.app.loadProfilePage();
                break;
        }
    }

    async initializeCalculatorPage() {
        console.log('Инициализация страницы калькулятора...');

        try {
            // Даем время DOM обновиться
            await new Promise(resolve => setTimeout(resolve, 100));

            // Проверяем, есть ли калькулятор на странице
            const calculatorElement = document.getElementById('calculator');

            if (!calculatorElement) {
                console.error('Элемент калькулятора не найден в DOM');
                return;
            }

            console.log('Элемент калькулятора найден, создаем новый экземпляр...');

            // Всегда создаем новый экземпляр калькулятора
            if (typeof TaxCalculator !== 'undefined') {
                // Уничтожаем старый если есть
                if (window.taxCalculator && typeof window.taxCalculator.destroy === 'function') {
                    window.taxCalculator.destroy();
                }

                // Создаем новый экземпляр
                window.taxCalculator = new TaxCalculator();
                window.taxCalculator.init();
                console.log('TaxCalculator создан и инициализирован');
            } else {
                console.error('TaxCalculator class not found');
            }

        } catch (error) {
            console.error('Ошибка инициализации калькулятора:', error);
        }
    }

    async initializeAnalyticsPage() {
        console.log('Инициализация страницы аналитики...');

        try {
            // Ждем полной загрузки DOM страницы аналитики
            await new Promise(resolve => setTimeout(resolve, 100));

            // Проверяем наличие canvas элементов
            const incomeChart = document.getElementById('incomeExpenseChart');
            const objectsChart = document.getElementById('objectsChart');

            if (!incomeChart || !objectsChart) {
                console.error('Не все элементы графиков найдены на странице аналитики');
                return;
            }

            console.log('Элементы графиков найдены, создаем ChartsManager...');

            // Всегда создаем новый экземпляр ChartsManager
            if (typeof ChartsManager !== 'undefined') {
                // Уничтожаем старый если есть
                if (window.chartsManager && typeof window.chartsManager.destroy === 'function') {
                    window.chartsManager.destroy();
                }

                // Создаем новый экземпляр
                window.chartsManager = new ChartsManager();

                // Убедимся, что chartsManager ссылается на правильный app
                if (window.app && window.chartsManager.app !== window.app) {
                    window.chartsManager.app = window.app;
                }

                // Инициализируем графики
                await window.chartsManager.init();

                // Обновляем данные после небольшой задержки
                setTimeout(() => {
                    if (window.chartsManager && window.chartsManager.updateCharts) {
                        window.chartsManager.updateCharts();
                    }
                }, 200);

                console.log('ChartsManager создан и инициализирован');

            } else {
                console.error('ChartsManager class not found');
            }

        } catch (error) {
            console.error('Ошибка инициализации графиков:', error);
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Ошибка загрузки графиков', 'error');
            }
        }
    }
}

// Создаем глобальный экземпляр только после полной загрузки DOM
function initRouter() {
    if (!window.router) {
        window.router = new Router();
        window.navigateTo = function(page) {
            window.router.navigateTo(page);
        };
        console.log('Router initialized');
    }
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRouter);
} else {
    initRouter();
}