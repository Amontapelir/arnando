// Основные функции для приложения

// Инициализация tooltips и popovers
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Bootstrap компонентов
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Форматирование чисел как валюты
    window.formatCurrency = function(value) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    // Подсветка активной ссылки в навигации
    const currentPath = window.location.pathname;
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Установка текущей даты в полях формы
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value && input.hasAttribute('min')) {
            input.value = today;
        }
    });
});

// Функция для подтверждения действий
function confirmAction(message, callback) {
    if (confirm(message || 'Вы уверены?')) {
        callback();
    }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Функция для расчета разницы в днях
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

// В конце файла добавьте:
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем тур, если пользователь авторизован
    if (typeof user !== 'undefined' && user && user.id) {
        setTimeout(() => {
            if (window.appTour) {
                window.appTour.init(user.id);
            }
        }, 1500);
    }
});