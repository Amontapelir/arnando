// Руководство по использованию Arnando
class AppTour {
    constructor() {
        this.steps = [];
        this.currentStep = 0;
        this.userId = null;
        this.tourElement = null;
        this.overlay = null;
        this.hasSeenTour = localStorage.getItem('arnando_tour_seen') === 'true';
    }

    init(userId) {
        this.userId = userId;

        // Проверяем, нужно ли показывать тур
        if (!this.hasSeenTour) {
            // Создаем элементы тура
            this.createTourElements();

            // Определяем шаги тура
            this.defineSteps();

            // Начинаем тур через 1 секунду после загрузки страницы
            setTimeout(() => this.start(), 1000);
        }
    }

    createTourElements() {
        // Оверлей
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9990;
            display: none;
        `;
        document.body.appendChild(this.overlay);

        // Элемент тура
        this.tourElement = document.createElement('div');
        this.tourElement.className = 'tour-step';
        this.tourElement.style.cssText = `
            position: fixed;
            z-index: 9999;
            display: none;
        `;
        document.body.appendChild(this.tourElement);
    }

    defineSteps() {
        this.steps = [
            {
                title: '👋 Добро пожаловать в Arnando!',
                content: `Это система для учёта посуточной аренды. Здесь вы можете:<br><br>
                         • Вести учёт объектов недвижимости<br>
                         • Управлять бронированиями<br>
                         • Отслеживать доходы и расходы<br>
                         • Рассчитывать налоги<br><br>
                         Давайте начнём с основ!`,
                selector: 'body',
                position: 'center'
            },
            {
                title: '🏠 Добавьте первый объект',
                content: 'Начните с добавления вашего объекта недвижимости. Укажите адрес, тип и базовую цену.',
                selector: 'a[href="/properties"]',
                position: 'right',
                action: () => {
                    // Подсвечиваем кнопку "Добавить объект"
                    const addBtn = document.querySelector('a[href="/properties/new"]');
                    if (addBtn) {
                        addBtn.classList.add('highlight-element');
                    }
                }
            },
            {
                title: '📅 Календарь бронирований',
                content: 'Здесь вы видите все бронирования в календарном виде. Вы можете фильтровать по объектам.',
                selector: 'a[href="/bookings/calendar"]',
                position: 'right'
            },
            {
                title: '💰 Финансовый учёт',
                content: `Система поддерживает раздельный учёт:<br><br>
                         <span class="accounting-term white">Белая бухгалтерия</span> — суммы для налоговой<br>
                         <span class="accounting-term black">Чёрная бухгалтерия</span> — реальные суммы<br><br>
                         Вы указываете обе суммы при каждой операции.`,
                selector: 'a[href="/transactions"]',
                position: 'right',
                action: () => {
                    // Показываем пример
                    this.showAccountingExample();
                }
            },
            {
                title: '🧮 Налоговый калькулятор',
                content: 'Автоматический расчёт налогов для разных режимов налогообложения: самозанятый, УСН и другие.',
                selector: 'a[href="/taxes/calculator"]',
                position: 'right'
            },
            {
                title: '📊 Дашборд',
                content: 'На главной странице вы видите ключевые показатели: доходы, расходы, прибыль и ближайшие бронирования.',
                selector: 'a[href="/dashboard"]',
                position: 'right'
            },
            {
                title: '🎉 Готово!',
                content: `Теперь вы готовы использовать Arnando!<br><br>
                         <strong>Советы для начала:</strong><br>
                         1. Добавьте хотя бы один объект<br>
                         2. Создайте тестовое бронирование<br>
                         3. Добавьте несколько транзакций<br>
                         4. Проверьте расчёт налогов<br><br>
                         <em>Вы всегда можете вернуться к этому руководству через меню профиля.</em>`,
                selector: 'body',
                position: 'center'
            }
        ];
    }

    showAccountingExample() {
        const example = document.createElement('div');
        example.className = 'accounting-explanation';
        example.innerHTML = `
            <h6>Пример раздельного учёта:</h6>
            <p><strong>Объект:</strong> Квартира в центре</p>
            <p><strong>Даты:</strong> 15.01 - 20.01 (5 дней)</p>
            <div class="mt-3">
                <div class="d-flex justify-content-between mb-2">
                    <span>Реальная стоимость:</span>
                    <strong>25 000 ₽</strong>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="accounting-term white">Для налоговой:</span>
                    <strong class="text-success">15 000 ₽</strong>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="accounting-term black">Неофициально:</span>
                    <strong class="text-secondary">10 000 ₽</strong>
                </div>
            </div>
        `;

        // Вставляем пример в тур
        this.tourContent.appendChild(example);
    }

    start() {
        if (this.steps.length === 0) return;

        this.currentStep = 0;
        this.showStep(0);
        this.overlay.style.display = 'block';
    }

    showStep(stepIndex) {
        const step = this.steps[stepIndex];
        if (!step) return;

        // Очищаем предыдущие подсветки
        document.querySelectorAll('.highlight-element').forEach(el => {
            el.classList.remove('highlight-element');
        });

        // Выполняем действие шага
        if (step.action) step.action();

        // Показываем элемент шага
        const target = document.querySelector(step.selector);
        if (target) {
            const rect = target.getBoundingClientRect();

            // Позиционируем тур
            let left, top;
            switch (step.position) {
                case 'right':
                    left = rect.right + 20;
                    top = rect.top;
                    break;
                case 'bottom':
                    left = rect.left;
                    top = rect.bottom + 20;
                    break;
                case 'left':
                    left = rect.left - 420;
                    top = rect.top;
                    break;
                case 'center':
                    left = window.innerWidth / 2 - 200;
                    top = window.innerHeight / 2 - 150;
                    break;
                default:
                    left = rect.right + 20;
                    top = rect.top;
            }

            this.tourElement.style.left = `${left}px`;
            this.tourElement.style.top = `${top}px`;

            // Подсвечиваем целевой элемент
            target.classList.add('highlight-element');
        }

        // Обновляем контент тура
        this.tourElement.innerHTML = `
            <div class="tour-content">
                <h5 class="mb-3">${step.title}</h5>
                <div class="tour-body">${step.content}</div>
            </div>
            <div class="tour-footer">
                <div>
                    <span class="text-muted">${stepIndex + 1} из ${this.steps.length}</span>
                </div>
                <div>
                    ${stepIndex > 0 ? '<button class="btn btn-sm btn-outline-secondary me-2" id="tour-prev">Назад</button>' : ''}
                    ${stepIndex < this.steps.length - 1
                        ? '<button class="btn btn-sm btn-primary" id="tour-next">Далее</button>'
                        : '<button class="btn btn-sm btn-success" id="tour-finish">Начать работу</button>'}
                    <button class="btn btn-sm btn-link text-muted" id="tour-skip">Пропустить</button>
                </div>
            </div>
        `;

        this.tourElement.style.display = 'block';
        this.tourContent = this.tourElement.querySelector('.tour-body');

        // Добавляем обработчики событий
        const nextBtn = document.getElementById('tour-next');
        const prevBtn = document.getElementById('tour-prev');
        const finishBtn = document.getElementById('tour-finish');
        const skipBtn = document.getElementById('tour-skip');

        if (nextBtn) nextBtn.addEventListener('click', () => this.next());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
        if (finishBtn) finishBtn.addEventListener('click', () => this.finish());
        if (skipBtn) skipBtn.addEventListener('click', () => this.finish());
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    finish() {
        this.tourElement.style.display = 'none';
        this.overlay.style.display = 'none';

        // Очищаем подсветки
        document.querySelectorAll('.highlight-element').forEach(el => {
            el.classList.remove('highlight-element');
        });

        // Сохраняем, что тур был показан
        localStorage.setItem('arnando_tour_seen', 'true');
        this.hasSeenTour = true;

        // Показываем сообщение об успехе
        this.showSuccessMessage();
    }

    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'alert alert-success alert-dismissible fade show position-fixed';
        message.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        message.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>
            <strong>Готово!</strong> Теперь вы можете начать использовать Arnando.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(message);

        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 5000);
    }

    // Метод для перезапуска тура
    restart() {
        localStorage.removeItem('arnando_tour_seen');
        this.hasSeenTour = false;
        this.start();
    }
}

// Создаем глобальный объект тура
window.appTour = new AppTour();

// Добавляем кнопку для перезапуска тура в меню пользователя
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем пункт меню для перезапуска тура
    const userMenu = document.querySelector('.dropdown-menu-end');
    if (userMenu) {
        const restartTourItem = document.createElement('li');
        restartTourItem.innerHTML = `
            <a class="dropdown-item" href="#" id="restart-tour">
                <i class="bi bi-info-circle me-2"></i> Показать руководство
            </a>
        `;
        userMenu.appendChild(restartTourItem);

        document.getElementById('restart-tour').addEventListener('click', function(e) {
            e.preventDefault();
            window.appTour.restart();
        });
    }
});