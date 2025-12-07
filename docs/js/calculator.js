class TaxCalculator {
    constructor() {
        this.isInitialized = false;
        console.log('TaxCalculator: constructor called');
    }

    init() {
        if (this.isInitialized) {
            console.log('TaxCalculator уже инициализирован, пропускаем...');
            return;
        }

        try {
            console.log('TaxCalculator: initializing...');

            // Проверяем наличие необходимых элементов
            const calculateBtn = document.getElementById('calculateBtn');
            const rentIncomeInput = document.getElementById('rentIncome');
            const calculatorElement = document.getElementById('calculator');

            if (!calculatorElement) {
                console.error('TaxCalculator: элемент #calculator не найден в DOM');
                return;
            }

            if (!calculateBtn || !rentIncomeInput) {
                console.error('TaxCalculator: необходимые элементы не найдены');
                return;
            }

            console.log('TaxCalculator: found elements, setting up event listeners');
            this.initializeEventListeners();
            this.updateLandlordType();
            this.isInitialized = true;

            // Делаем первоначальный расчет если есть данные
            if (rentIncomeInput.value > 0) {
                this.calculateTax();
            }

            console.log('TaxCalculator успешно инициализирован');

        } catch (error) {
            console.error('Ошибка инициализации TaxCalculator:', error);
        }
    }

    initializeEventListeners() {
        console.log('TaxCalculator: setting up event listeners');

        // Обработчики изменения типа арендодателя
        const landlordTypeRadios = document.querySelectorAll('input[name="landlordType"]');
        if (landlordTypeRadios.length > 0) {
            landlordTypeRadios.forEach(radio => {
                // Удаляем старый обработчик если есть
                radio.removeEventListener('change', this.updateLandlordType);
                // Добавляем новый с правильным контекстом
                radio.addEventListener('change', () => {
                    console.log('Landlord type changed to:', radio.value);
                    this.updateLandlordType();
                    this.calculateTax(); // Автоматически пересчитываем
                });
            });
            console.log('Landlord type listeners added');
        }

        // Обработчик кнопки расчета
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            // Удаляем старый обработчик если есть
            calculateBtn.removeEventListener('click', this.calculateTax);
            // Добавляем новый с правильным контекстом
            calculateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Calculate button clicked');
                this.calculateTax();
            });
            console.log('Calculate button listener added');
        }

        // Обработчики изменения значений для авторасчета
        const inputs = ['rentIncome', 'additionalIncome', 'mortgageExpense',
                       'utilitiesExpense', 'maintenanceExpense', 'otherExpenses'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeEventListener('input', this.calculateTax);
                element.addEventListener('input', () => {
                    console.log(`Input ${id} changed`);
                    this.calculateTax();
                });
            }
        });

        // Обработчики для типа арендатора
        const tenantTypeRadios = document.querySelectorAll('input[name="tenantType"]');
        if (tenantTypeRadios.length > 0) {
            tenantTypeRadios.forEach(radio => {
                radio.removeEventListener('change', this.calculateTax);
                radio.addEventListener('change', () => {
                    console.log('Tenant type changed to:', radio.value);
                    this.calculateTax();
                });
            });
        }

        // Обработчики для типа вычета физлица
        const individualDeductionRadios = document.querySelectorAll('input[name="individualDeduction"]');
        if (individualDeductionRadios.length > 0) {
            individualDeductionRadios.forEach(radio => {
                radio.removeEventListener('change', this.calculateTax);
                radio.addEventListener('change', () => {
                    console.log('Individual deduction changed to:', radio.value);
                    this.calculateTax();
                });
            });
        }

        // Обработчики для системы налогообложения ИП
        const entrepreneurTaxSystemRadios = document.querySelectorAll('input[name="entrepreneurTaxSystem"]');
        if (entrepreneurTaxSystemRadios.length > 0) {
            entrepreneurTaxSystemRadios.forEach(radio => {
                radio.removeEventListener('change', this.calculateTax);
                radio.addEventListener('change', () => {
                    console.log('Entrepreneur tax system changed to:', radio.value);
                    this.calculateTax();
                });
            });
        }

        console.log('All event listeners set up');
    }


    updateLandlordType() {
        console.log('Updating landlord type...');
        const selectedType = document.querySelector('input[name="landlordType"]:checked')?.value;
        console.log('Selected type:', selectedType);

        const tenantTypeSection = document.getElementById('tenantTypeSection');
        const individualOptions = document.getElementById('individualOptionsSection');
        const entrepreneurOptions = document.getElementById('entrepreneurOptionsSection');

        // Показываем/скрываем секцию типа арендатора для самозанятых
        if (tenantTypeSection) {
            tenantTypeSection.style.display = selectedType === 'selfEmployed' ? 'block' : 'none';
            console.log('Tenant type section:', tenantTypeSection.style.display);
        }

        // Показываем/скрываем опции для физлиц
        if (individualOptions) {
            individualOptions.style.display = selectedType === 'individual' ? 'block' : 'none';
        }

        // Показываем/скрываем опции для ИП
        if (entrepreneurOptions) {
            entrepreneurOptions.style.display = selectedType === 'individualEntrepreneur' ? 'block' : 'none';
        }

        // Обновляем информацию о налоге
        this.updateTaxInfo(selectedType);
    }

    updateTaxInfo(landlordType) {
        const taxInfo = document.getElementById('taxInfo');
        const taxLabel = document.getElementById('taxLabel');

        if (!taxInfo || !taxLabel) return;

        switch(landlordType) {
            case 'selfEmployed':
                taxInfo.innerHTML = `
                    <strong>Налог на профессиональный доход (НПД)</strong><br>
                    • Ставка: 4% при сдаче физлицам<br>
                    • Ставка: 6% при сдаче юрлицам<br>
                    • Расходы не уменьшают налоговую базу<br>
                    • Уплата до 28 числа каждого месяца
                `;
                taxLabel.textContent = 'Ставка: 4%';
                break;

            case 'individualEntrepreneur':
                taxInfo.innerHTML = `
                    <strong>Упрощенная система налогообложения (УСН)</strong><br>
                    • Ставка: 6% с доходов<br>
                    • Или 15% с доходов минус расходы<br>
                    • Уплата авансовых платежей ежеквартально<br>
                    • Декларация раз в год
                `;
                taxLabel.textContent = 'Ставка: 6%';
                break;

            case 'individual':
                taxInfo.innerHTML = `
                    <strong>Налог на доходы физлиц (НДФЛ)</strong><br>
                    • Ставка: 13% с доходов<br>
                    • Можно учесть фактические расходы<br>
                    • Или применить вычет 20%<br>
                    • Декларация 3-НДФЛ раз в год
                `;
                taxLabel.textContent = 'Ставка: 13%';
                break;

            default:
                taxInfo.innerHTML = `
                    <strong>Налог на профессиональный доход (НПД)</strong><br>
                    • Ставка: 4% при сдаче физлицам<br>
                    • Ставка: 6% при сдаче юрлицам<br>
                    • Расходы не уменьшают налоговую базу<br>
                    • Уплата до 28 числа каждого месяца
                `;
                taxLabel.textContent = 'Ставка: 4%';
                break;
        }
    }

    calculateTax() {
        try {
            console.log('Calculating tax...');

            // Получаем значения доходов
            const rentIncome = parseFloat(document.getElementById('rentIncome')?.value) || 0;
            const additionalIncome = parseFloat(document.getElementById('additionalIncome')?.value) || 0;

            // Получаем значения расходов
            const mortgageExpense = parseFloat(document.getElementById('mortgageExpense')?.value) || 0;
            const utilitiesExpense = parseFloat(document.getElementById('utilitiesExpense')?.value) || 0;
            const maintenanceExpense = parseFloat(document.getElementById('maintenanceExpense')?.value) || 0;
            const otherExpenses = parseFloat(document.getElementById('otherExpenses')?.value) || 0;

            console.log('Input values:', {
                rentIncome,
                additionalIncome,
                mortgageExpense,
                utilitiesExpense,
                maintenanceExpense,
                otherExpenses
            });

            // Рассчитываем итоги
            const totalIncome = rentIncome + additionalIncome;
            const totalExpenses = mortgageExpense + utilitiesExpense + maintenanceExpense + otherExpenses;

            // Определяем тип налогообложения и рассчитываем налог
            const landlordType = document.querySelector('input[name="landlordType"]:checked')?.value || 'selfEmployed';
            let taxRate = 0;
            let taxAmount = 0;

            console.log('Landlord type for calculation:', landlordType);

            switch(landlordType) {
                case 'selfEmployed':
                    // Для самозанятых - 4% или 6% в зависимости от типа арендатора
                    const tenantType = document.querySelector('input[name="tenantType"]:checked')?.value || 'physical';
                    taxRate = tenantType === 'physical' ? 0.04 : 0.06;
                    taxAmount = totalIncome * taxRate;
                    console.log('Self-employed calculation:', { tenantType, taxRate, taxAmount });
                    break;

                case 'individualEntrepreneur':
                    // Для ИП - 6% с доходов или 15% с прибыли
                    const taxSystem = document.querySelector('input[name="entrepreneurTaxSystem"]:checked')?.value || 'income';
                    if (taxSystem === 'income') {
                        taxRate = 0.06;
                        taxAmount = totalIncome * taxRate;
                    } else {
                        taxRate = 0.15;
                        taxAmount = Math.max(0, totalIncome - totalExpenses) * taxRate;
                    }
                    console.log('Entrepreneur calculation:', { taxSystem, taxRate, taxAmount });
                    break;

                case 'individual':
                    // Для физлиц - 13% с учетом вычетов
                    taxRate = 0.13;
                    const deductionType = document.querySelector('input[name="individualDeduction"]:checked')?.value || 'actual';
                    if (deductionType === 'professional') {
                        // Профессиональный вычет 20%
                        taxAmount = totalIncome * 0.8 * taxRate;
                    } else {
                        // Фактические расходы
                        taxAmount = Math.max(0, totalIncome - totalExpenses) * taxRate;
                    }
                    console.log('Individual calculation:', { deductionType, taxRate, taxAmount });
                    break;

                default:
                    taxRate = 0.04;
                    taxAmount = totalIncome * taxRate;
                    break;
            }

            const netProfit = totalIncome - totalExpenses - taxAmount;

            console.log('Calculation results:', {
                totalIncome,
                totalExpenses,
                taxAmount,
                netProfit,
                taxRate
            });

            // Обновляем UI
            this.updateResults(totalIncome, totalExpenses, taxAmount, netProfit, taxRate);

            // Показываем уведомление
            this.showNotification('Расчет выполнен успешно!', 'success');

        } catch (error) {
            console.error('Ошибка расчета налогов:', error);
            this.showError('Произошла ошибка при расчете налогов: ' + error.message);
        }
    }

    updateResults(totalIncome, totalExpenses, taxAmount, netProfit, taxRate) {
        const totalIncomeEl = document.getElementById('totalIncome');
        const totalExpensesEl = document.getElementById('totalExpenses');
        const taxAmountEl = document.getElementById('taxAmount');
        const netProfitEl = document.getElementById('netProfit');
        const taxLabelEl = document.getElementById('taxLabel');

        if (totalIncomeEl) totalIncomeEl.textContent = `${this.formatCurrency(totalIncome)}`;
        if (totalExpensesEl) totalExpensesEl.textContent = `${this.formatCurrency(totalExpenses)}`;
        if (taxAmountEl) taxAmountEl.textContent = `${this.formatCurrency(taxAmount)}`;
        if (netProfitEl) netProfitEl.textContent = `${this.formatCurrency(netProfit)}`;
        if (taxLabelEl) taxLabelEl.textContent = `Ставка: ${(taxRate * 100)}%`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.innerHTML = `
            <div class="notification-content">
                <strong>${type === 'error' ? '❌ Ошибка' : type === 'success' ? '✅ Успех' : 'ℹ️ Информация'}</strong>
                <div>${message}</div>
            </div>
        `;

        // Добавляем в DOM
        document.body.appendChild(toast);

        // Удаляем после анимации
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    destroy() {
        console.log('TaxCalculator: cleaning up...');

        // Удаляем все обработчики событий
        const calculateBtn = document.getElementById('calculateBtn');
        const landlordTypeRadios = document.querySelectorAll('input[name="landlordType"]');
        const inputs = ['rentIncome', 'additionalIncome', 'mortgageExpense',
                       'utilitiesExpense', 'maintenanceExpense', 'otherExpenses'];

        // Удаляем обработчики кнопки
        if (calculateBtn) {
            calculateBtn.replaceWith(calculateBtn.cloneNode(true));
        }

        // Удаляем обработчики radio кнопок
        landlordTypeRadios.forEach(radio => {
            radio.replaceWith(radio.cloneNode(true));
        });

        // Удаляем обработчики input полей
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.replaceWith(element.cloneNode(true));
            }
        });

        // Удаляем обработчики для опциональных элементов
        const tenantTypeRadios = document.querySelectorAll('input[name="tenantType"]');
        const individualDeductionRadios = document.querySelectorAll('input[name="individualDeduction"]');
        const entrepreneurTaxSystemRadios = document.querySelectorAll('input[name="entrepreneurTaxSystem"]');

        tenantTypeRadios.forEach(radio => radio.replaceWith(radio.cloneNode(true)));
        individualDeductionRadios.forEach(radio => radio.replaceWith(radio.cloneNode(true)));
        entrepreneurTaxSystemRadios.forEach(radio => radio.replaceWith(radio.cloneNode(true)));

        this.isInitialized = false;
        console.log('TaxCalculator: cleanup complete');
    }
}

// Экспортируем класс для глобального использования
window.TaxCalculator = TaxCalculator;

