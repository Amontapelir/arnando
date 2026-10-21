// Современные функции для RentLedger

document.addEventListener('DOMContentLoaded', function() {
    // Плавные переходы для всех ссылок
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href')?.startsWith('#')) return;
            if (this.getAttribute('target') === '_blank') return;

            // Плавный переход
            document.body.style.opacity = '0.8';
            setTimeout(() => {
                document.body.style.opacity = '1';
            }, 300);
        });
    });

    // Анимация карточек при загрузке
    const cards = document.querySelectorAll('.card, .stat-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });

    // Интерактивные формы
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });

    // Динамическое обновление даты/времени
    function updateDateTime() {
        const now = new Date();
        const dateElements = document.querySelectorAll('.current-datetime');
        dateElements.forEach(el => {
            el.textContent = now.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        });
    }

    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Подтверждение опасных действий
    document.querySelectorAll('[data-confirm]').forEach(button => {
        button.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm') || 'Вы уверены?';
            if (!confirm(message)) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });

    // Динамическая загрузка контента
    window.loadContent = async function(url, containerId) {
        try {
            const container = document.getElementById(containerId);
            container.innerHTML = '<div class="loading-spinner mx-auto my-5"></div>';

            const response = await fetch(url);
            const html = await response.text();

            container.innerHTML = html;

            // Инициализация компонентов в загруженном контенте
            initializeComponents(container);
        } catch (error) {
            console.error('Error loading content:', error);
        }
    };

    // Параллакс эффект
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax');

        parallaxElements.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed') || 0.5);
            el.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // Темная тема
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');

            // Анимация переключения
            document.body.style.transition = 'background 0.5s ease';
        });

        // Проверяем сохраненную тему
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }
});

// Инициализация компонентов
function initializeComponents(container = document) {
    // Инициализация tooltips
    const tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Инициализация popovers
    const popoverTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="popover"]'));
    const popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Инициализация календаря
    if (container.querySelector('.calendar-grid')) {
        initializeCalendar();
    }
}

// Календарь
function initializeCalendar() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    calendarDays.forEach(day => {
        day.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            if (date) {
                // Загружаем события на этот день
                loadContent(`/bookings/day/${date}`, 'day-events');
            }
        });
    });
}

// Уведомления
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// CSS для анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .notification {
        animation: slideIn 0.3s ease-out;
    }

    .dark-theme {
        background: #1a1a2e;
        color: #ffffff;
    }

    .dark-theme .card {
        background: #2d2d44;
        color: #ffffff;
    }
`;
document.head.appendChild(style);

// Экспорт функций
window.showNotification = showNotification;
window.loadContent = loadContent;