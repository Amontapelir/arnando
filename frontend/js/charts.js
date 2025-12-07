class ChartsManager {
    constructor() {
        this.incomeExpenseChart = null;
        this.objectsChart = null;
        this.isInitialized = false;
        this.app = window.app;
        this.currentPeriod = 'quarter';
        this.customStartDate = null;
        this.customEndDate = null;
    }

    async init() {
        console.log('Инициализация графиков...');

        try {
            // Проверяем наличие элементов с несколькими попытками
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;

                const incomeCanvas = document.getElementById('incomeExpenseChart');
                const objectsCanvas = document.getElementById('objectsChart');
                const customPeriodBtn = document.getElementById('customPeriodBtn');
                const customPeriodModal = document.getElementById('customPeriodModal');

                console.log(`Попытка ${attempts}:`, {
                    incomeCanvas: !!incomeCanvas,
                    objectsCanvas: !!objectsCanvas,
                    customPeriodBtn: !!customPeriodBtn,
                    customPeriodModal: !!customPeriodModal
                });

                if (incomeCanvas && objectsCanvas && customPeriodBtn && customPeriodModal) {
                    console.log('✅ Все элементы найдены');
                    break;
                }

                if (attempts === maxAttempts) {
                    console.error('❌ Не все элементы найдены после всех попыток');
                    return;
                }

                // Ждем перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Создаем графики (всегда новые)
            this.createCharts();

            // Инициализируем обработчики событий
            this.initializeEventListeners();

            // Обновляем данные
            this.updateCharts();

            this.isInitialized = true;
            console.log('Графики инициализированы успешно');

        } catch (error) {
            console.error('Ошибка инициализации графиков:', error);
        }
    }

    waitForChart() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = 50;
            const interval = setInterval(() => {
                attempts++;
                if (typeof Chart !== 'undefined') {
                    clearInterval(interval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    console.warn('Chart.js не загрузился');
                    resolve();
                }
            }, 100);
        });
    }

    waitForCanvasElements() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // Увеличим количество попыток
            const interval = 150; // Увеличим интервал

            const checkElements = () => {
                const incomeCanvas = document.getElementById('incomeExpenseChart');
                const objectsCanvas = document.getElementById('objectsChart');
                const customPeriodBtn = document.getElementById('customPeriodBtn');
                const customPeriodModal = document.getElementById('customPeriodModal');

                console.log(`Попытка ${attempts + 1}:`, {
                    incomeCanvas: !!incomeCanvas,
                    objectsCanvas: !!objectsCanvas,
                    customPeriodBtn: !!customPeriodBtn,
                    customPeriodModal: !!customPeriodModal
                });

                if (incomeCanvas && objectsCanvas && customPeriodBtn && customPeriodModal) {
                    console.log('✅ Все элементы найдены');
                    resolve();
                    return;
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    console.error('❌ Не все элементы найдены после максимального количества попыток');
                    reject(new Error('Не все элементы найдены на странице'));
                    return;
                }

                setTimeout(checkElements, interval);
            };

            checkElements();
        });
    }

    setDefaultCustomDates() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        this.customStartDate = thirtyDaysAgo;
        this.customEndDate = now;
    }

    setActivePeriodButton() {
        const buttons = document.querySelectorAll('.period-btn');
        if (!buttons.length) return;

        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-period="${this.currentPeriod}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    setupEventListeners() {
        // Обработчики кнопок периодов
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.currentTarget.dataset.period;
                this.handlePeriodButtonClick(period);
            });
        });

        // Обработчик кнопки экспорта
        const exportBtn = document.getElementById('exportChart');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportChart());
        }

        // Обработчики модального окна произвольного периода
        const customPeriodBtn = document.getElementById('customPeriodBtn');
        if (customPeriodBtn) {
            customPeriodBtn.addEventListener('click', () => this.openCustomPeriodModal());
        }

        const closeModalBtn = document.getElementById('closeCustomPeriodModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeCustomPeriodModal());
        }

        const cancelBtn = document.getElementById('cancelCustomPeriod');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeCustomPeriodModal());
        }

        const applyBtn = document.getElementById('applyCustomPeriod');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyCustomPeriod());
        }

        // Обработчики ввода дат в модальном окне
        const startDateInput = document.getElementById('customPeriodStartDate');
        const endDateInput = document.getElementById('customPeriodEndDate');

        if (startDateInput) {
            startDateInput.addEventListener('change', (e) => {
                this.customStartDate = new Date(e.target.value);
                this.updateCustomRangeInfo();
            });
        }

        if (endDateInput) {
            endDateInput.addEventListener('change', (e) => {
                this.customEndDate = new Date(e.target.value);
                this.updateCustomRangeInfo();
            });
        }

        // Закрытие модального окна при клике вне его
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('customPeriodModal');
            if (modal && !modal.classList.contains('hidden') &&
                e.target === modal) {
                this.closeCustomPeriodModal();
            }
        });

        // Закрытие по Esc
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('customPeriodModal');
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.closeCustomPeriodModal();
            }
        });

        // Обработчик нажатия Enter для применения периода
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('customPeriodModal');
            if (e.key === 'Enter' && modal && !modal.classList.contains('hidden')) {
                e.preventDefault();
                this.applyCustomPeriod();
            }
        });
    }

    handlePeriodButtonClick(period) {
        if (period === 'custom') {
            this.openCustomPeriodModal();
            return;
        }

        // Убираем активный класс у всех кнопок
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Добавляем активный класс нажатой кнопке
        const activeBtn = document.querySelector(`[data-period="${period}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.currentPeriod = period;
        this.updateCharts();

        if (this.app && this.app.showNotification) {
            const periodText = this.getPeriodText();
            this.app.showNotification(`Применен период: ${periodText}`, 'success');
        }
    }

    openCustomPeriodModal() {
        console.log('Открытие модального окна произвольного периода');

        const modal = document.getElementById('customPeriodModal');
        if (!modal) {
            console.error('Модальное окно не найдено!');
            return;
        }

        // Сбрасываем ошибку
        this.hideCustomPeriodError();

        // Устанавливаем даты по умолчанию (последние 30 дней)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        this.customStartDate = thirtyDaysAgo;
        this.customEndDate = now;

        // Заполняем поля ввода
        const startDateInput = document.getElementById('customPeriodStartDate');
        const endDateInput = document.getElementById('customPeriodEndDate');

        if (startDateInput) {
            const formattedStart = this.formatDateForInput(this.customStartDate);
            startDateInput.value = formattedStart;
            startDateInput.max = this.formatDateForInput(now);
            console.log('Установлена дата начала:', formattedStart);
        }

        if (endDateInput) {
            const formattedEnd = this.formatDateForInput(this.customEndDate);
            endDateInput.value = formattedEnd;
            endDateInput.max = this.formatDateForInput(now);
            console.log('Установлена дата окончания:', formattedEnd);
        }

        // Обновляем информацию о диапазоне
        this.updateCustomRangeInfo();

        // Показываем модальное окно с анимацией
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.remove('hidden');
            modal.style.opacity = '1';
        }, 10);

        // Фокусируемся на первом поле ввода
        setTimeout(() => {
            if (startDateInput) {
                startDateInput.focus();
                startDateInput.select();
            }
        }, 100);

        // Добавляем класс для блокировки прокрутки body
        document.body.style.overflow = 'hidden';
    }

    closeCustomPeriodModal() {
        console.log('Закрытие модального окна произвольного периода');

        const modal = document.getElementById('customPeriodModal');
        if (modal) {
            // Анимация закрытия
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.style.display = 'none';
                modal.style.opacity = '1';
            }, 300);
        }

        // Восстанавливаем прокрутку body
        document.body.style.overflow = '';
    }

    updateCustomRangeInfo() {
        if (!this.customStartDate || !this.customEndDate) return;

        const startStr = this.customStartDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const endStr = this.customEndDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const daysDiff = Math.round((this.customEndDate - this.customStartDate) / (1000 * 60 * 60 * 24));

        const textElement = document.getElementById('customRangeText');
        if (textElement) {
            textElement.textContent = `${startStr} - ${endStr} (${daysDiff} дней)`;
        }
    }

    validateCustomPeriod() {
        if (!this.customStartDate || !this.customEndDate) {
            this.showCustomPeriodError('Пожалуйста, выберите обе даты');
            return false;
        }

        // Проверяем, что дата начала раньше даты окончания
        if (this.customStartDate >= this.customEndDate) {
            this.showCustomPeriodError('Дата начала должна быть раньше даты окончания');
            return false;
        }

        // Проверяем минимальный период - 7 дней
        const minPeriod = 7 * 24 * 60 * 60 * 1000;
        const periodDiff = this.customEndDate - this.customStartDate;

        if (periodDiff < minPeriod) {
            this.showCustomPeriodError('Минимальный период для анализа - 7 дней');
            return false;
        }

        // Проверяем, что период не слишком большой (максимум 5 лет)
        const maxPeriod = 5 * 365 * 24 * 60 * 60 * 1000;
        if (periodDiff > maxPeriod) {
            this.showCustomPeriodError('Максимальный период для анализа - 5 лет');
            return false;
        }

        // Проверяем, что даты не в будущем
        const now = new Date();
        if (this.customStartDate > now || this.customEndDate > now) {
            this.showCustomPeriodError('Нельзя выбрать даты в будущем');
            return false;
        }

        return true;
    }

    showCustomPeriodError(message) {
        const errorElement = document.getElementById('customPeriodError');
        const errorTextElement = document.getElementById('customPeriodErrorText');

        if (errorElement && errorTextElement) {
            errorTextElement.textContent = message;
            errorElement.classList.remove('hidden');

            // Прокручиваем к ошибке
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    hideCustomPeriodError() {
        const errorElement = document.getElementById('customPeriodError');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    applyCustomPeriod() {
        if (!this.validateCustomPeriod()) {
            return;
        }

        this.currentPeriod = 'custom';

        // Обновляем активные кнопки
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const customBtn = document.getElementById('customPeriodBtn');
        if (customBtn) {
            customBtn.classList.add('active');
        }

        // Закрываем модальное окно
        this.closeCustomPeriodModal();

        // Обновляем графики
        this.updateCharts();

        // Показываем уведомление
        if (this.app && this.app.showNotification) {
            const periodText = this.getPeriodText();
            this.app.showNotification(`Применен произвольный период: ${periodText}`, 'success');
        }
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getPeriodRange() {
        const now = new Date();
        let startDate, endDate;

        switch (this.currentPeriod) {
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
                endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
                break;

            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;

            case 'custom':
                startDate = new Date(this.customStartDate);
                endDate = new Date(this.customEndDate);
                break;

            default:
                // По умолчанию текущий квартал
                const defaultQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), defaultQuarter * 3, 1);
                endDate = new Date(now.getFullYear(), defaultQuarter * 3 + 3, 0);
        }

        // Устанавливаем время на начало и конец дня
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
    }

    getPeriodText() {
        const { startDate, endDate } = this.getPeriodRange();

        switch (this.currentPeriod) {
            case 'quarter':
                const quarter = Math.floor(startDate.getMonth() / 3) + 1;
                return `${quarter} квартал ${startDate.getFullYear()}`;

            case 'year':
                return startDate.getFullYear().toString();

            case 'custom':
                const startStr = startDate.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                const endStr = endDate.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                return `${startStr} - ${endStr}`;

            default:
                const defaultQuarter = Math.floor(startDate.getMonth() / 3) + 1;
                return `${defaultQuarter} квартал ${startDate.getFullYear()}`;
        }
    }

    initializeCharts() {
        this.createIncomeExpenseChart();
        this.createObjectsChart();
    }

    createIncomeExpenseChart() {
        const canvas = document.getElementById('incomeExpenseChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Уничтожаем старый график если существует
        if (this.incomeExpenseChart) {
            this.incomeExpenseChart.destroy();
        }

        // Определяем цвет текста в зависимости от темы
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#f1f5f9' : '#1e293b';

        this.incomeExpenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Доходы',
                        data: [],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 2,
                        borderRadius: 6,
                        order: 2
                    },
                    {
                        label: 'Налоги',
                        data: [],
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 2,
                        borderRadius: 6,
                        order: 1
                    },
                    {
                        label: 'Прибыль',
                        data: [],
                        type: 'line',
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.4,
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            color: textColor,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${value.toLocaleString('ru-RU')} ₽`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: true
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: textColor,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + ' млн ₽';
                                }
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + ' тыс ₽';
                                }
                                return value + ' ₽';
                            },
                            font: {
                                size: 11
                            },
                            padding: 10
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                }
            }
        });

        // Обновляем заголовок графика
        this.updateChartTitle();
    }

    createObjectsChart() {
        const canvas = document.getElementById('objectsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Уничтожаем старый график если существует
        if (this.objectsChart) {
            this.objectsChart.destroy();
        }

        // Определяем цвет текста в зависимости от темы
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#f1f5f9' : '#1e293b';

        this.objectsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(14, 165, 233, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(249, 115, 22, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 11
                            },
                            color: textColor,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

                                        return {
                                            text: `${label}: ${value.toLocaleString('ru-RU')} ₽ (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor,
                                            lineWidth: data.datasets[0].borderWidth,
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        },
                        align: 'center'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toLocaleString('ru-RU')} ₽ (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '55%',
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    updateChartTitle() {
        const chartTitle = document.getElementById('chartTitle');
        if (chartTitle) {
            const periodText = this.getPeriodText();
            chartTitle.textContent = `Динамика доходов и расходов за ${periodText}`;
        }
    }

    async updateCharts() {
        console.log('Обновление графиков...');

        if (!this.incomeExpenseChart || !this.objectsChart) {
            console.log('Графики не инициализированы, запускаем init...');
            await this.init();
            return;
        }

        // Получаем данные
        const contracts = this.app?.contracts || [];
        const properties = this.app?.properties || [];

        try {
            // Обновляем график доходов/расходов
            await this.updateIncomeExpenseChart(contracts);

            // Обновляем круговую диаграмму
            await this.updateObjectsChart(properties, contracts);

            // Обновляем статистику
            this.updateAnalyticsStats(contracts);

            // Обновляем заголовок
            this.updateChartTitle();

            // Форсируем обновление
            setTimeout(() => {
                if (this.incomeExpenseChart) this.incomeExpenseChart.resize();
                if (this.objectsChart) this.objectsChart.resize();
            }, 100);

        } catch (error) {
            console.error('Ошибка обновления графиков:', error);

            if (this.app && this.app.showNotification) {
                this.app.showNotification('Ошибка обновления графиков', 'error');
            }
        }
    }

    getTimeIntervals(startDate, endDate) {
        const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                          (endDate.getMonth() - startDate.getMonth()) + 1;

        let intervals;

        // Выбираем интервал в зависимости от длительности периода
        if (diffMonths > 60) { // > 5 лет
            intervals = this.getYearIntervals(startDate, endDate);
        } else if (diffMonths > 36) { // 3-5 лет
            intervals = this.getHalfYearIntervals(startDate, endDate);
        } else if (diffMonths > 12) { // 1-3 года
            intervals = this.getQuarterIntervals(startDate, endDate);
        } else { // до 1 года
            intervals = this.getMonthIntervals(startDate, endDate);
        }

        return intervals;
    }

    getMonthIntervals(startDate, endDate) {
        const intervals = [];
        const current = new Date(startDate);

        // Устанавливаем на начало месяца
        current.setDate(1);
        current.setHours(0, 0, 0, 0);

        // Создаем копию конечной даты
        const endDateCopy = new Date(endDate);
        endDateCopy.setDate(1);
        endDateCopy.setHours(0, 0, 0, 0);

        while (current <= endDateCopy) {
            const monthStart = new Date(current);
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

            // Корректируем конечную дату, если это последний интервал
            const intervalEnd = new Date(Math.min(monthEnd.getTime(), endDate.getTime()));

            // Корректируем начальную дату, если это первый интервал
            const intervalStart = new Date(Math.max(monthStart.getTime(), startDate.getTime()));

            // Проверяем, что интервал имеет положительную длительность
            if (intervalStart <= intervalEnd) {
                const label = monthStart.toLocaleDateString('ru-RU', {
                    month: 'short',
                    year: 'numeric'
                }).replace(' г.', '');

                intervals.push({
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    start: intervalStart,
                    end: intervalEnd
                });
            }

            current.setMonth(current.getMonth() + 1);
        }

        return intervals;
    }

    getQuarterIntervals(startDate, endDate) {
        const intervals = [];
        let current = new Date(startDate);

        // Округляем до начала квартала
        const startQuarter = Math.floor(current.getMonth() / 3);
        current.setMonth(startQuarter * 3);
        current.setDate(1);
        current.setHours(0, 0, 0, 0);

        while (current <= endDate) {
            const quarter = Math.floor(current.getMonth() / 3) + 1;
            const quarterEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0);

            // Корректируем конечную дату
            const intervalEnd = new Date(Math.min(quarterEnd.getTime(), endDate.getTime()));

            // Корректируем начальную дату
            const intervalStart = new Date(Math.max(current.getTime(), startDate.getTime()));

            if (intervalStart <= intervalEnd) {
                intervals.push({
                    label: `${quarter} кв. ${current.getFullYear()}`,
                    start: intervalStart,
                    end: intervalEnd
                });
            }

            current.setMonth(current.getMonth() + 3);
        }

        return intervals;
    }

    getHalfYearIntervals(startDate, endDate) {
        const intervals = [];
        let current = new Date(startDate);

        // Округляем до начала полугодия
        const startHalf = Math.floor(current.getMonth() / 6);
        current.setMonth(startHalf * 6);
        current.setDate(1);
        current.setHours(0, 0, 0, 0);

        while (current <= endDate) {
            const half = Math.floor(current.getMonth() / 6) + 1;
            const halfEnd = new Date(current.getFullYear(), current.getMonth() + 6, 0);

            // Корректируем конечную дату
            const intervalEnd = new Date(Math.min(halfEnd.getTime(), endDate.getTime()));

            // Корректируем начальную дату
            const intervalStart = new Date(Math.max(current.getTime(), startDate.getTime()));

            if (intervalStart <= intervalEnd) {
                intervals.push({
                    label: `${half} пол. ${current.getFullYear()}`,
                    start: intervalStart,
                    end: intervalEnd
                });
            }

            current.setMonth(current.getMonth() + 6);
        }

        return intervals;
    }

    getYearIntervals(startDate, endDate) {
        const intervals = [];
        let current = new Date(startDate.getFullYear(), 0, 1);
        current.setHours(0, 0, 0, 0);

        while (current <= endDate) {
            const yearEnd = new Date(current.getFullYear(), 11, 31);

            // Корректируем конечную дату
            const intervalEnd = new Date(Math.min(yearEnd.getTime(), endDate.getTime()));

            // Корректируем начальную дату
            const intervalStart = new Date(Math.max(current.getTime(), startDate.getTime()));

            if (intervalStart <= intervalEnd) {
                intervals.push({
                    label: current.getFullYear().toString(),
                    start: intervalStart,
                    end: intervalEnd
                });
            }

            current.setFullYear(current.getFullYear() + 1);
        }

        return intervals;
    }

    async updateIncomeExpenseChart(contracts) {
        if (!this.incomeExpenseChart) return;

        try {
            const { startDate, endDate } = this.getPeriodRange();
            const intervals = this.getTimeIntervals(startDate, endDate);

            const labels = [];
            const incomeData = [];
            const taxData = [];
            const profitData = [];

            // Рассчитываем данные для каждого интервала
            for (const interval of intervals) {
                const result = this.calculateIncomeForPeriod(contracts, interval);

                labels.push(interval.label);
                incomeData.push(result.income);
                taxData.push(result.tax);
                profitData.push(result.profit);
            }

            // Обновляем данные графика
            this.incomeExpenseChart.data.labels = labels;
            this.incomeExpenseChart.data.datasets[0].data = incomeData;
            this.incomeExpenseChart.data.datasets[1].data = taxData;
            this.incomeExpenseChart.data.datasets[2].data = profitData;

            // Настраиваем ось X в зависимости от количества интервалов
            this.configureXAxis(labels.length);

            this.incomeExpenseChart.update();
        } catch (error) {
            console.error('Ошибка обновления графика доходов и расходов:', error);
            throw error;
        }
    }

    configureXAxis(intervalCount) {
        if (!this.incomeExpenseChart) return;

        const xAxis = this.incomeExpenseChart.options.scales.x;

        if (intervalCount > 24) {
            xAxis.ticks.maxRotation = 90;
            xAxis.ticks.minRotation = 90;
            xAxis.ticks.font.size = 10;
        } else if (intervalCount > 12) {
            xAxis.ticks.maxRotation = 45;
            xAxis.ticks.minRotation = 45;
            xAxis.ticks.font.size = 11;
        } else {
            xAxis.ticks.maxRotation = 0;
            xAxis.ticks.minRotation = 0;
            xAxis.ticks.font.size = 12;
        }
    }

    calculateIncomeForPeriod(contracts, interval) {
        let totalIncome = 0;
        let totalTax = 0;

        contracts.forEach(contract => {
            if (contract.is_active !== false) {
                const contractStart = new Date(contract.start_date);
                const contractEnd = new Date(contract.end_date);

                // Проверяем пересечение периодов
                const overlapStart = new Date(Math.max(contractStart.getTime(), interval.start.getTime()));
                const overlapEnd = new Date(Math.min(contractEnd.getTime(), interval.end.getTime()));

                // Если есть пересечение
                if (overlapStart <= overlapEnd) {
                    const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));

                    if (overlapDays > 0) {
                        // Рассчитываем пропорциональную сумму за пересекающиеся дни
                        const dailyIncome = (contract.rent_amount || 0) / 30.44; // Средняя длина месяца
                        const totalForOverlap = dailyIncome * overlapDays;

                        // Рассчитываем налог
                        const taxRate = this.getTaxRateForContract(contract);
                        const taxForOverlap = totalForOverlap * taxRate;

                        totalIncome += totalForOverlap;
                        totalTax += taxForOverlap;
                    }
                }
            }
        });

        return {
            income: Math.round(totalIncome),
            tax: Math.round(totalTax),
            profit: Math.round(totalIncome - totalTax)
        };
    }

    getTaxRateForContract(contract) {
        if (!this.app.currentUser) return 0.06;

        const userType = this.app.currentUser.landlord_type;
        switch (userType) {
            case 'self_employed':
                return contract.tenant_type === 'physical' ? 0.04 : 0.06;
            case 'individual_entrepreneur':
                return 0.06;
            case 'individual':
                return 0.13;
            default:
                return 0.06;
        }
    }

    async updateObjectsChart(properties, contracts) {
        if (!this.objectsChart) return;

        try {
            const objectRevenues = [];
            const { startDate, endDate } = this.getPeriodRange();

            properties.forEach(property => {
                // Находим все активные договоры для этого объекта
                const objectContracts = contracts.filter(contract =>
                    contract.property_id === property.id &&
                    contract.is_active !== false
                );

                // Суммируем доход от всех договоров за период
                let totalRevenue = 0;

                objectContracts.forEach(contract => {
                    const contractStart = new Date(contract.start_date);
                    const contractEnd = new Date(contract.end_date);

                    if (contractStart <= endDate && contractEnd >= startDate) {
                        // Рассчитываем пересечение периодов
                        const overlapStart = new Date(Math.max(contractStart.getTime(), startDate.getTime()));
                        const overlapEnd = new Date(Math.min(contractEnd.getTime(), endDate.getTime()));

                        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));

                        if (overlapDays > 0) {
                            const dailyIncome = (contract.rent_amount || 0) / 30.44;
                            totalRevenue += dailyIncome * overlapDays;
                        }
                    }
                });

                if (totalRevenue > 0) {
                    objectRevenues.push({
                        name: property.name,
                        revenue: totalRevenue
                    });
                }
            });

            // Сортируем по убыванию дохода
            objectRevenues.sort((a, b) => b.revenue - a.revenue);

            // Ограничиваем количество отображаемых объектов
            const maxObjects = 8;
            const displayObjects = objectRevenues.slice(0, maxObjects);

            // Суммируем остальные объекты в категорию "Прочие"
            const otherRevenue = objectRevenues.slice(maxObjects).reduce((sum, obj) => sum + obj.revenue, 0);

            if (otherRevenue > 0) {
                displayObjects.push({
                    name: 'Прочие объекты',
                    revenue: otherRevenue
                });
            }

            if (displayObjects.length === 0) {
                this.objectsChart.data.labels = ['Нет данных за период'];
                this.objectsChart.data.datasets[0].data = [1];
                this.objectsChart.data.datasets[0].backgroundColor = ['#e5e7eb'];
            } else {
                this.objectsChart.data.labels = displayObjects.map(obj => {
                    // Обрезаем длинные названия
                    return obj.name.length > 25 ? obj.name.substring(0, 22) + '...' : obj.name;
                });
                this.objectsChart.data.datasets[0].data = displayObjects.map(obj => Math.round(obj.revenue));
            }

            this.objectsChart.update();
        } catch (error) {
            console.error('Ошибка обновления круговой диаграммы:', error);
            throw error;
        }
    }

    updateAnalyticsStats(contracts) {
        if (!this.app) return;

        const { startDate, endDate } = this.getPeriodRange();

        let totalIncome = 0;
        let totalTax = 0;
        let activeContracts = 0;

        contracts.forEach(contract => {
            if (contract.is_active !== false) {
                const contractStart = new Date(contract.start_date);
                const contractEnd = new Date(contract.end_date);

                // Проверяем, что договор активен в выбранном периоде
                if (contractStart <= endDate && contractEnd >= startDate) {
                    activeContracts++;

                    // Рассчитываем пересечение периодов
                    const overlapStart = new Date(Math.max(contractStart.getTime(), startDate.getTime()));
                    const overlapEnd = new Date(Math.min(contractEnd.getTime(), endDate.getTime()));

                    if (overlapStart <= overlapEnd) {
                        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));

                        if (overlapDays > 0) {
                            const dailyIncome = (contract.rent_amount || 0) / 30.44;
                            const totalForOverlap = dailyIncome * overlapDays;

                            const taxRate = this.getTaxRateForContract(contract);
                            const taxForOverlap = totalForOverlap * taxRate;

                            totalIncome += totalForOverlap;
                            totalTax += taxForOverlap;
                        }
                    }
                }
            }
        });

        const totalProfit = totalIncome - totalTax;
        const margin = totalIncome > 0 ? ((totalProfit / totalIncome) * 100) : 0;
        const taxBurden = totalIncome > 0 ? ((totalTax / totalIncome) * 100) : 0;

        // Обновляем UI
        this.updateElement('analyticsIncome', Math.round(totalIncome));
        this.updateElement('analyticsTaxes', Math.round(totalTax));
        this.updateElement('analyticsProfit', Math.round(totalProfit));
        this.updateElement('analyticsContracts', activeContracts);
        this.updateElement('analyticsMargin', margin);
        this.updateElement('analyticsTaxBurden', taxBurden);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (!element) return;

        if (id.includes('Income') || id.includes('Taxes') || id.includes('Profit')) {
            element.textContent = this.formatCurrency(value);
        } else if (id.includes('Margin') || id.includes('TaxBurden')) {
            element.textContent = value.toFixed(1) + '%';
        } else {
            element.textContent = value;
        }
    }

    formatCurrency(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1).replace('.', ',') + ' млн ₽';
        }
        if (value >= 1000) {
            return (value / 1000).toFixed(0) + ' тыс ₽';
        }
        return value.toLocaleString('ru-RU') + ' ₽';
    }

    exportChart() {
        if (!this.incomeExpenseChart) return;

        const link = document.createElement('a');
        link.download = `график-доходов-${new Date().toISOString().split('T')[0]}.png`;
        link.href = this.incomeExpenseChart.toBase64Image();
        link.click();
    }

    destroy() {
        console.log('Destroying charts...');

        // Уничтожаем все графики Chart.js
        if (this.incomeExpenseChart) {
            this.incomeExpenseChart.destroy();
            this.incomeExpenseChart = null;
        }

        if (this.objectsChart) {
            this.objectsChart.destroy();
            this.objectsChart = null;
        }

        // Удаляем обработчики событий
        const customPeriodBtn = document.getElementById('customPeriodBtn');
        if (customPeriodBtn && this.customPeriodHandler) {
            customPeriodBtn.removeEventListener('click', this.customPeriodHandler);
        }

        const applyCustomPeriodBtn = document.getElementById('applyCustomPeriod');
        if (applyCustomPeriodBtn && this.applyCustomPeriodHandler) {
            applyCustomPeriodBtn.removeEventListener('click', this.applyCustomPeriodHandler);
        }

        const cancelCustomPeriodBtn = document.getElementById('cancelCustomPeriod');
        if (cancelCustomPeriodBtn && this.cancelCustomPeriodHandler) {
            cancelCustomPeriodBtn.removeEventListener('click', this.cancelCustomPeriodHandler);
        }

        const closeCustomPeriodBtn = document.getElementById('closeCustomPeriodModal');
        if (closeCustomPeriodBtn && this.closeCustomPeriodHandler) {
            closeCustomPeriodBtn.removeEventListener('click', this.closeCustomPeriodHandler);
        }

        // Сбрасываем флаги
        this.isInitialized = false;
        this.customPeriodHandler = null;
        this.applyCustomPeriodHandler = null;
        this.cancelCustomPeriodHandler = null;
        this.closeCustomPeriodHandler = null;

        console.log('Charts destroyed');
    }
}

// Глобальный экземпляр ChartsManager
if (!window.chartsManager) {
    window.chartsManager = new ChartsManager();
}