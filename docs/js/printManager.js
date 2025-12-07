/**
 * Менеджер печати и экспорта документов
 */
class PrintManager {
    constructor() {
        this.templates = {
            contract: this.generateContractTemplate,
            financial_report: this.generateFinancialReport,
            tax_report: this.generateTaxReport,
            payment_schedule: this.generatePaymentSchedule
        };
    }

    /**
     * Установить ссылку на приложение
     */
    setAppInstance(app) {
        this.app = app;
    }

    /**
     * Генерация документа
     */
    async generateDocument(type, options = {}) {
        if (!this.app) {
            throw new Error('Приложение не инициализировано');
        }

        const template = this.templates[type];
        if (!template) {
            throw new Error('Неизвестный тип документа');
        }

        try {
            return await template.call(this, options);
        } catch (error) {
            console.error(`Ошибка генерации документа ${type}:`, error);
            throw new Error(`Не удалось сгенерировать документ: ${error.message}`);
        }
    }

    /**
     * Генерация договора аренды
     */
    async generateContractTemplate(options) {
        try {
            // ✅ Проверка наличия данных
            if (!this.app.contracts || this.app.contracts.length === 0) {
                throw new Error('Нет доступных договоров');
            }

            let contract;
            const contractId = parseInt(options.contractId);

            if (contractId) {
                contract = this.app.contracts.find(c => c.id === contractId);
                if (!contract) {
                    throw new Error(`Договор с ID ${contractId} не найден`);
                }
            } else {
                contract = this.app.contracts.find(c => c.is_active !== false) || this.app.contracts[0];
            }

            if (!contract) {
                throw new Error('Не найден подходящий договор для печати');
            }

            const property = this.app.properties.find(p => p.id === contract.property_id);
            const user = this.app.currentUser;
            const today = new Date().toLocaleDateString('ru-RU');

            // Получаем информацию о типе арендодателя
            const landlordType = user?.landlord_type || 'self_employed';

            // Форматируем даты
            const startDate = new Date(contract.start_date).toLocaleDateString('ru-RU');
            const endDate = new Date(contract.end_date).toLocaleDateString('ru-RU');

            // Рассчитываем общую сумму
            const start = new Date(contract.start_date);
            const end = new Date(contract.end_date);
            const monthsDiff = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
            const totalAmount = (contract.rent_amount || 0) * monthsDiff;

            // Информация о налогах
            let taxInfo = '';
            if (landlordType === 'self_employed') {
                const tenantType = contract.tenant_type || 'physical';
                const taxRate = tenantType === 'physical' ? 4 : 6;
                taxInfo = `
                    <div class="section">
                        <h2>6. НАЛОГООБЛОЖЕНИЕ</h2>
                        <div class="clause">
                            <span class="clause-number">6.1.</span>
                            Арендодатель применяет налоговый режим "Налог на профессиональный доход".
                        </div>
                        <div class="clause">
                            <span class="clause-number">6.2.</span>
                            Ставка налога: ${taxRate}% от суммы дохода.
                        </div>
                    </div>
                `;
            }

            // Информация об арендаторе
            let tenantInfo = '';
            if (contract.tenant_info) {
                tenantInfo = `
                    <div class="party">
                        <strong>Арендатор:</strong><br>
                        ${this.escapeHtml(contract.tenant_name)}<br>
                        ${contract.tenant_info.passport_series && contract.tenant_info.passport_number ?
                            `Паспорт: ${contract.tenant_info.passport_series} ${contract.tenant_info.passport_number}` :
                            'Паспорт: [серия, номер]'}<br>
                        ${contract.tenant_info.passport_issued_by ? `Выдан: ${contract.tenant_info.passport_issued_by}` : 'Выдан: [кем выдан]'}<br>
                        ${contract.tenant_info.registration_address ? `Адрес: ${contract.tenant_info.registration_address}` : 'Адрес: [адрес регистрации]'}<br>
                        ${contract.tenant_info.inn ? `ИНН: ${contract.tenant_info.inn}` : ''}<br>
                        ${contract.tenant_info.phone ? `Телефон: ${contract.tenant_info.phone}` : ''}<br>
                        ${contract.tenant_info.email ? `Email: ${contract.tenant_info.email}` : ''}
                    </div>
                `;
            } else {
                tenantInfo = `
                    <div class="party">
                        <strong>Арендатор:</strong><br>
                        ${this.escapeHtml(contract.tenant_name)}<br>
                        Паспорт: [серия, номер, кем и когда выдан]<br>
                        Адрес регистрации: [адрес]<br>
                        Телефон: [телефон]
                    </div>
                `;
            }

            // Информация о собственнике
            let ownerInfo = '';
            if (user) {
                ownerInfo = `
                    <div class="party">
                        <strong>Арендодатель:</strong><br>
                        ${user.full_name || user.email || '[ФИО]'}<br>
                        Статус: ${this.getLandlordTypeText(landlordType)}<br>
                        ${user.email ? `Email: ${user.email}` : ''}
                    </div>
                `;
            } else {
                ownerInfo = `
                    <div class="party">
                        <strong>Арендодатель:</strong><br>
                        [ФИО/Название организации]<br>
                        Статус: ${this.getLandlordTypeText(landlordType)}<br>
                    </div>
                `;
            }

            return `
<!DOCTYPE html>
<html>
<head>
    <title>Договор аренды №${contract.id}</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 2cm;
            color: #000000;
            font-size: 14px;
        }
        .header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 2px solid #000000;
            padding-bottom: 1em;
        }
        .parties {
            margin: 2em 0;
        }
        .party {
            margin-bottom: 1.5em;
        }
        .section {
            margin: 1.5em 0;
            text-align: justify;
        }
        .section h2 {
            text-align: center;
            margin-bottom: 1em;
            font-size: 16px;
            font-weight: bold;
        }
        .signatures {
            margin-top: 3em;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            width: 45%;
            text-align: center;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #000000;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        .clause {
            margin-bottom: 1em;
            text-align: justify;
        }
        .clause-number {
            font-weight: bold;
        }
        .footer {
            margin-top: 3em;
            font-size: 0.9em;
            color: #666666;
            text-align: center;
        }
        @media print {
            body { margin: 1.5cm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ДОГОВОР АРЕНДЫ №${contract.id}</h1>
        <p>г. ${property?.address ? property.address.split(',')[0] || 'Москва' : 'Москва'}</p>
        <p>${today}</p>
    </div>

    <div class="parties">
        ${ownerInfo}
        ${tenantInfo}
    </div>

    <div class="section">
        <h2>1. ПРЕДМЕТ ДОГОВОРА</h2>
        <div class="clause">
            <span class="clause-number">1.1.</span>
            Арендодатель предоставляет, а Арендатор принимает в аренду недвижимое имущество:
        </div>
        <table>
            <tr><th>Наименование</th><th>Значение</th></tr>
            <tr><td>Объект недвижимости</td><td>${this.escapeHtml(property?.name || 'Не указано')}</td></tr>
            <tr><td>Адрес</td><td>${this.escapeHtml(property?.address || 'Не указано')}</td></tr>
            <tr><td>Тип недвижимости</td><td>${this.getObjectTypeText(property?.type)}</td></tr>
            ${property?.area ? `<tr><td>Площадь</td><td>${property.area} кв.м.</td></tr>` : ''}
            ${property?.rooms ? `<tr><td>Количество комнат</td><td>${property.rooms}</td></tr>` : ''}
        </table>
    </div>

    <div class="section">
        <h2>2. СРОК ДЕЙСТВИЯ ДОГОВОРА</h2>
        <div class="clause">
            <span class="clause-number">2.1.</span>
            Договор вступает в силу с "${startDate}" и действует до "${endDate}".
        </div>
        <div class="clause">
            <span class="clause-number">2.2.</span>
            Общая продолжительность действия договора: ${monthsDiff} ${monthsDiff === 1 ? 'месяц' : monthsDiff < 5 ? 'месяца' : 'месяцев'}.
        </div>
    </div>

    <div class="section">
        <h2>3. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЕТОВ</h2>
        <div class="clause">
            <span class="clause-number">3.1.</span>
            Размер арендной платы составляет ${this.formatCurrency(contract.rent_amount || 0)} в месяц.
        </div>
        <div class="clause">
            <span class="clause-number">3.2.</span>
            Общая сумма арендной платы за весь период действия договора составляет ${this.formatCurrency(totalAmount)}.
        </div>
        <div class="clause">
            <span class="clause-number">3.3.</span>
            Арендная плата вносится ${contract.payment_schedule === 'monthly' ? 'ежемесячно' : 'поквартально'} не позднее 10 числа текущего ${contract.payment_schedule === 'monthly' ? 'месяца' : 'квартала'}.
        </div>
    </div>

    ${taxInfo}

    <div class="section">
        <h2>7. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h2>
        <div class="clause">
            <span class="clause-number">7.1.</span>
            Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из сторон.
        </div>
    </div>

    <div class="signatures">
        <div class="signature">
            _________________________<br>
            <em>Арендодатель</em><br>
            ${user?.full_name || user?.email || '[ФИО полностью]'}<br><br>
            Дата: ________________<br>
            Подпись: _____________
        </div>
        <div class="signature">
            _________________________<br>
            <em>Арендатор</em><br>
            ${this.escapeHtml(contract.tenant_name)}<br><br>
            Дата: ________________<br>
            Подпись: _____________
        </div>
    </div>

    <div class="footer">
        <p>Договор составлен автоматически в системе управления арендой</p>
        <p>Дата формирования: ${today}</p>
    </div>

    <div class="no-print" style="margin-top: 2em; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; font-size: 16px; cursor: pointer;">🖨️ Печать</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; font-size: 16px; cursor: pointer;">❌ Закрыть</button>
    </div>
</body>
</html>`;
        } catch (error) {
            console.error('Ошибка генерации договора:', error);
            throw new Error('Не удалось сформировать договор: ' + error.message);
        }
    }

    /**
     * Генерация финансового отчета
     */
    async generateFinancialReport(options) {
        const period = options.period || 'current_month';
        const dateFrom = options.dateFrom;
        const dateTo = options.dateTo;
        const data = await this.getFinancialData(period, dateFrom, dateTo);
        const today = new Date().toLocaleDateString('ru-RU');

        // Получаем информацию о типе арендодателя для отчета
        const user = this.app.currentUser;
        const landlordType = user?.landlord_type || 'self_employed';

        // Определяем заголовок периода
        let periodTitle = this.getPeriodText(period);
        if (period === 'custom' && dateFrom && dateTo) {
            const fromDate = new Date(dateFrom).toLocaleDateString('ru-RU');
            const toDate = new Date(dateTo).toLocaleDateString('ru-RU');
            periodTitle = `${fromDate} - ${toDate}`;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Финансовый отчет</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 1.5cm;
            color: #000000;
            line-height: 1.4;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 2px solid #000000;
            padding-bottom: 1em;
        }
        .summary {
            margin: 2em 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            font-size: 11px;
        }
        th, td {
            border: 1px solid #000000;
            padding: 6px;
            text-align: left;
        }
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        .total {
            font-weight: bold;
            background: #e0e0e0;
        }
        .positive { color: #2e7d32; }
        .negative { color: #c62828; }
        .section-title {
            background: #333333;
            color: white;
            padding: 8px;
            margin: 1.5em 0 0.5em 0;
            font-size: 13px;
        }
        .footer {
            margin-top: 3em;
            font-size: 0.8em;
            color: #666666;
            text-align: center;
        }
        @media print {
            body { margin: 1cm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ФИНАНСОВЫЙ ОТЧЕТ</h1>
        <p>Период: ${periodTitle}</p>
        <p>Тип арендодателя: ${this.getLandlordTypeText(landlordType)}</p>
        <p>Дата формирования: ${today}</p>
    </div>

    <div class="summary">
        <h2>Итоговые показатели</h2>
        <table>
            <tr>
                <td>Общий доход:</td>
                <td class="positive">${this.formatCurrency(data.totalIncome)}</td>
            </tr>
            <tr>
                <td>Общие расходы:</td>
                <td class="negative">${this.formatCurrency(data.totalExpenses)}</td>
            </tr>
            <tr>
                <td>Налоги:</td>
                <td class="negative">${this.formatCurrency(data.taxes)}</td>
            </tr>
            <tr class="total">
                <td>Чистая прибыль:</td>
                <td class="${data.netProfit >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(data.netProfit)}
                </td>
            </tr>
            <tr>
                <td>Рентабельность:</td>
                <td>${data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) : 0}%</td>
            </tr>
        </table>
    </div>

    <div class="section-title">Доходы по объектам</div>
    <table>
        <thead>
            <tr>
                <th>Объект</th>
                <th>Доход</th>
                <th>Расходы</th>
                <th>Прибыль</th>
                <th>Рентабельность</th>
            </tr>
        </thead>
        <tbody>
            ${data.byObject.map(obj => `
                <tr>
                    <td>${this.escapeHtml(obj.name)}</td>
                    <td>${this.formatCurrency(obj.income)}</td>
                    <td>${this.formatCurrency(obj.expenses)}</td>
                    <td class="${obj.profit >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(obj.profit)}
                    </td>
                    <td>${obj.income > 0 ? ((obj.profit / obj.income) * 100).toFixed(1) : 0}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${data.byMonth && data.byMonth.length > 0 ? `
    <div class="section-title">Динамика по месяцам</div>
    <table>
        <thead>
            <tr>
                <th>Месяц</th>
                <th>Доход</th>
                <th>Расходы</th>
                <th>Прибыль</th>
            </tr>
        </thead>
        <tbody>
            ${data.byMonth.map(month => `
                <tr>
                    <td>${this.escapeHtml(month.month)}</td>
                    <td>${this.formatCurrency(month.income)}</td>
                    <td>${this.formatCurrency(month.expenses)}</td>
                    <td class="${month.profit >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(month.profit)}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    <div class="footer">
        <p>Отчет сформирован автоматически в системе управления арендой</p>
        <p>Тип налогообложения: ${this.getLandlordTypeText(landlordType)}</p>
        <p>Период: ${periodTitle}</p>
        <p>Дата формирования: ${today}</p>
    </div>

    <div class="no-print" style="margin-top: 2em; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer;">🖨️ Печать</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer;">❌ Закрыть</button>
    </div>
</body>
</html>`;
    }

    /**
     * Генерация налогового отчета
     */
    async generateTaxReport(options) {
        const period = options.period || 'current_month';
        const dateFrom = options.dateFrom;
        const dateTo = options.dateTo;
        const today = new Date().toLocaleDateString('ru-RU');

        // Получаем информацию о типе арендодателя
        const user = this.app.currentUser;
        const landlordType = user?.landlord_type || 'self_employed';

        // Рассчитываем доходы из договоров с учетом периода
        const contracts = this.app.contracts || [];
        const properties = this.app.properties || [];

        // Фильтрация договоров по периоду
        let filteredContracts = contracts.filter(contract => {
            if (contract.is_active === false) return false;

            // Проверяем, попадает ли договор в выбранный период
            const contractStart = new Date(contract.start_date);
            const contractEnd = new Date(contract.end_date);

            // Если выбран произвольный период
            if (period === 'custom' && dateFrom && dateTo) {
                const periodStart = new Date(dateFrom);
                const periodEnd = new Date(dateTo);
                // Договор считается активным в периоде, если он пересекается с периодом отчета
                return contractStart <= periodEnd && contractEnd >= periodStart;
            } else {
                // Для других периодов возвращаем все активные договоры
                return true;
            }
        });

        let totalIncome = 0;
        filteredContracts.forEach(contract => {
            totalIncome += contract.rent_amount || 0;
        });

        // Расчет налога в зависимости от типа арендодателя
        let taxRate, taxAmount, taxType, taxDetails;

        switch (landlordType) {
            case 'self_employed':
                // Для самозанятых считаем среднюю ставку на основе типов арендаторов
                const selfEmployedContracts = filteredContracts.filter(c => c.tenant_type);
                let physicalIncome = 0;
                let legalIncome = 0;

                selfEmployedContracts.forEach(contract => {
                    if (contract.tenant_type === 'physical') {
                        physicalIncome += contract.rent_amount || 0;
                    } else {
                        legalIncome += contract.rent_amount || 0;
                    }
                });

                taxAmount = (physicalIncome * 0.04) + (legalIncome * 0.06);
                taxRate = totalIncome > 0 ? (taxAmount / totalIncome * 100).toFixed(1) : 0;
                taxType = 'НПД';
                taxDetails = 'Налог на профессиональный доход (4% - физлица, 6% - юрлица)';
                break;

            case 'individual_entrepreneur':
                taxRate = 6;
                taxAmount = totalIncome * (taxRate / 100);
                taxType = 'УСН';
                taxDetails = 'Упрощенная система налогообложения (6% с доходов)';
                break;

            case 'individual':
                taxRate = 13;
                taxAmount = totalIncome * (taxRate / 100);
                taxType = 'НДФЛ';
                taxDetails = 'Налог на доходы физических лиц';
                break;

            default:
                taxRate = 6;
                taxAmount = totalIncome * (taxRate / 100);
                taxType = 'УСН';
                taxDetails = 'Упрощенная система налогообложения';
        }

        // Определяем заголовок периода
        let periodTitle = this.getPeriodText(period);
        if (period === 'custom' && dateFrom && dateTo) {
            const fromDate = new Date(dateFrom).toLocaleDateString('ru-RU');
            const toDate = new Date(dateTo).toLocaleDateString('ru-RU');
            periodTitle = `${fromDate} - ${toDate}`;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Налоговый отчет</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 1.5cm;
            color: #000000;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 2px solid #000000;
            padding-bottom: 1em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            font-size: 11px;
        }
        th, td {
            border: 1px solid #000000;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        .total {
            font-weight: bold;
            background: #e0e0e0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 12px;
            margin: 1em 0;
            border-radius: 4px;
            color: #856404;
        }
        .footer {
            margin-top: 3em;
            font-size: 0.8em;
            color: #666666;
            text-align: center;
        }
        @media print {
            body { margin: 1cm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>НАЛОГОВЫЙ ОТЧЕТ</h1>
        <p>Период: ${periodTitle}</p>
        <p>Тип арендодателя: ${this.getLandlordTypeText(landlordType)}</p>
        <p>Система налогообложения: ${taxType}</p>
        <p>Дата формирования: ${today}</p>
    </div>

    <table>
        <tr><th>Показатель</th><th>Сумма</th></tr>
        <tr><td>Налогооблагаемая база (доход)</td><td>${this.formatCurrency(totalIncome)}</td></tr>
        <tr><td>Система налогообложения</td><td>${taxType}</td></tr>
        <tr><td>Ставка налога</td><td>${taxRate}%</td></tr>
        <tr class="total"><td>Сумма налога к уплате</td><td>${this.formatCurrency(taxAmount)}</td></tr>
        <tr><td>Срок уплаты</td><td>До 28 числа следующего месяца</td></tr>
    </table>

    <div class="warning">
        <strong>Внимание!</strong> ${taxDetails}.<br>
        Данный расчет является предварительным. Для точного расчета налога обратитесь к налоговому консультанту.
    </div>

    <div class="footer">
        <p>Отчет сформирован автоматически в системе управления арендой</p>
        <p>Тип арендодателя: ${this.getLandlordTypeText(landlordType)}</p>
        <p>Период: ${periodTitle}</p>
        <p>Дата формирования: ${today}</p>
    </div>

    <div class="no-print" style="margin-top: 2em; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer;">🖨️ Печать</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer;">❌ Закрыть</button>
    </div>
</body>
</html>`;
    }

    /**
     * Генерация графика платежей
     */
    async generatePaymentSchedule(options) {
        const period = options.period || 'current_month';
        const dateFrom = options.dateFrom;
        const dateTo = options.dateTo;
        const contracts = this.app.contracts || [];
        const properties = this.app.properties || [];
        const today = new Date().toLocaleDateString('ru-RU');

        // Фильтрация договоров по периоду
        let filteredContracts = contracts.filter(contract => {
            if (contract.is_active === false) return false;
            const endDate = new Date(contract.end_date);

            // Проверяем, попадает ли договор в выбранный период
            if (period === 'custom' && dateFrom && dateTo) {
                const periodStart = new Date(dateFrom);
                const periodEnd = new Date(dateTo);
                const contractStart = new Date(contract.start_date);
                // Договор считается активным в периоде, если он пересекается с периодом отчета
                return contractStart <= periodEnd && endDate >= periodStart;
            } else {
                return endDate >= new Date();
            }
        });

        // Получаем информацию о типе арендодателя
        const user = this.app.currentUser;
        const landlordType = user?.landlord_type || 'self_employed';

        // Определяем заголовок периода
        let periodTitle = this.getPeriodText(period);
        if (period === 'custom' && dateFrom && dateTo) {
            const fromDate = new Date(dateFrom).toLocaleDateString('ru-RU');
            const toDate = new Date(dateTo).toLocaleDateString('ru-RU');
            periodTitle = `${fromDate} - ${toDate}`;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <title>График платежей</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 1.5cm;
            color: #000000;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 2px solid #000000;
            padding-bottom: 1em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            font-size: 11px;
        }
        th, td {
            border: 1px solid #000000;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        .status-active { color: #2e7d32; font-weight: bold; }
        .status-expired { color: #c62828; font-weight: bold; }
        .footer {
            margin-top: 3em;
            font-size: 0.8em;
            color: #666666;
            text-align: center;
        }
        @media print {
            body { margin: 1cm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ГРАФИК ПЛАТЕЖЕЙ</h1>
        <p>Период: ${periodTitle}</p>
        <p>Тип арендодателя: ${this.getLandlordTypeText(landlordType)}</p>
        <p>Дата формирования: ${today}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Договор</th>
                <th>Арендатор</th>
                <th>Объект</th>
                <th>Период действия</th>
                <th>Ежемесячный платеж</th>
                ${landlordType === 'self_employed' ? '<th>Тип арендатора</th>' : ''}
                <th>Статус</th>
            </tr>
        </thead>
        <tbody>
            ${filteredContracts.map(contract => {
                const property = properties.find(o => o.id === contract.property_id);
                const startDate = new Date(contract.start_date).toLocaleDateString('ru-RU');
                const endDate = new Date(contract.end_date).toLocaleDateString('ru-RU');
                const isActive = new Date(contract.end_date) >= new Date();

                return `
                    <tr>
                        <td>№${contract.id}</td>
                        <td>${this.escapeHtml(contract.tenant_name)}</td>
                        <td>${this.escapeHtml(property?.name || 'Неизвестно')}</td>
                        <td>${startDate} - ${endDate}</td>
                        <td>${this.formatCurrency(contract.rent_amount)}</td>
                        ${landlordType === 'self_employed' ?
                            `<td>${contract.tenant_type === 'physical' ? 'Физлицо' : 'Юрлицо'}</td>` : ''}
                        <td class="${isActive ? 'status-active' : 'status-expired'}">
                            ${isActive ? 'Активен' : 'Завершен'}
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Всего активных договоров в периоде: ${filteredContracts.length}</p>
        <p>Общая месячная выручка: ${this.formatCurrency(filteredContracts.reduce((sum, c) => sum + (c.rent_amount || 0), 0))}</p>
        <p>Тип арендодателя: ${this.getLandlordTypeText(landlordType)}</p>
        <p>Период: ${periodTitle}</p>
    </div>

    <div class="no-print" style="margin-top: 2em; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer;">🖨️ Печать</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer;">❌ Закрыть</button>
    </div>
</body>
</html>`;
    }

    /**
     * Получение финансовых данных с учетом периода
     */
    async getFinancialData(period, dateFrom, dateTo) {
        const properties = this.app.properties || [];
        const contracts = this.app.contracts || [];
        const byObject = [];
        const byMonth = [];

        // Фильтрация договоров по периоду
        let filteredContracts = contracts.filter(contract => {
            if (contract.is_active === false) return false;

            const contractStart = new Date(contract.start_date);
            const contractEnd = new Date(contract.end_date);

            // Если выбран произвольный период
            if (period === 'custom' && dateFrom && dateTo) {
                const periodStart = new Date(dateFrom);
                const periodEnd = new Date(dateTo);
                return contractStart <= periodEnd && contractEnd >= periodStart;
            }

            return true;
        });

        let totalIncome = 0;
        let totalExpenses = 0;

        // Доходы по объектам с учетом фильтрации
        properties.forEach(property => {
            const objectContracts = filteredContracts.filter(c => c.property_id === property.id);
            const objectIncome = objectContracts.reduce((sum, contract) => sum + (contract.rent_amount || 0), 0);
            const objectExpenses = objectIncome * 0.2; // Примерные расходы 20%
            const objectProfit = objectIncome - objectExpenses;

            if (objectIncome > 0 || objectContracts.length > 0) {
                byObject.push({
                    name: property.name,
                    income: objectIncome,
                    expenses: objectExpenses,
                    profit: objectProfit
                });

                totalIncome += objectIncome;
                totalExpenses += objectExpenses;
            }
        });

        // Данные по месяцам с учетом фильтрации
        const now = new Date();
        const months = [];

        // Определяем диапазон месяцев для отчета
        let startMonth, endMonth;

        if (period === 'custom' && dateFrom && dateTo) {
            startMonth = new Date(dateFrom);
            endMonth = new Date(dateTo);
        } else if (period === 'current_month') {
            startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (period === 'last_month') {
            startMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (period === 'current_quarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            startMonth = new Date(now.getFullYear(), quarter * 3, 1);
            endMonth = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        } else if (period === 'current_year') {
            startMonth = new Date(now.getFullYear(), 0, 1);
            endMonth = new Date(now.getFullYear(), 11, 31);
        } else {
            // По умолчанию последние 6 месяцев
            startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        let currentMonth = new Date(startMonth);
        while (currentMonth <= endMonth) {
            const monthName = currentMonth.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
            const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            let monthlyIncome = 0;
            filteredContracts.forEach(contract => {
                const contractStart = new Date(contract.start_date);
                const contractEnd = new Date(contract.end_date);
                const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

                // Если договор активен в этом месяце, добавляем арендную плату
                if (contractStart <= monthEnd && contractEnd >= monthStart) {
                    monthlyIncome += contract.rent_amount || 0;
                }
            });

            const monthlyExpense = monthlyIncome * 0.2;
            const monthlyProfit = monthlyIncome - monthlyExpense;

            byMonth.push({
                month: formattedMonthName,
                income: monthlyIncome,
                expenses: monthlyExpense,
                profit: monthlyProfit
            });

            // Переход к следующему месяцу
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        // Расчет налогов с учетом отфильтрованных договоров
        const user = this.app.currentUser;
        let taxes = 0;

        if (user) {
            switch(user.landlord_type) {
                case 'self_employed':
                    filteredContracts.forEach(contract => {
                        const tenantType = contract.tenant_type || 'physical';
                        const taxRate = tenantType === 'physical' ? 0.04 : 0.06;
                        taxes += (contract.rent_amount || 0) * taxRate;
                    });
                    break;
                case 'individual_entrepreneur':
                    taxes = totalIncome * 0.06;
                    break;
                case 'individual':
                    taxes = totalIncome * 0.13;
                    break;
                default:
                    taxes = totalIncome * 0.06;
            }
        } else {
            taxes = totalIncome * 0.06;
        }

        const netProfit = totalIncome - totalExpenses - taxes;

        return {
            totalIncome,
            totalExpenses,
            taxes,
            netProfit,
            byObject,
            byMonth
        };
    }

    /**
     * Экспорт в Excel
     */
    async exportToExcel(data, filename) {
        try {
            const wb = XLSX.utils.book_new();

            if (data.type === 'financial_report') {
                const summaryData = [
                    ['ФИНАНСОВЫЙ ОТЧЕТ'],
                    ['Период:', data.period],
                    ['Тип арендодателя:', this.getLandlordTypeText(data.landlordType)],
                    ['Дата формирования:', new Date().toLocaleDateString('ru-RU')],
                    [''],
                    ['ИТОГОВЫЕ ПОКАЗАТЕЛИ', ''],
                    ['Общий доход', data.totalIncome],
                    ['Общие расходы', data.totalExpenses],
                    ['Налоги', data.taxes],
                    ['Чистая прибыль', data.netProfit],
                    ['Рентабельность', data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) + '%' : '0%'],
                    [''],
                    ['ДОХОДЫ ПО ОБЪЕКТАМ', '', '', '', ''],
                    ['Объект', 'Доход', 'Расходы', 'Прибыль', 'Рентабельность']
                ];

                data.byObject.forEach(obj => {
                    summaryData.push([
                        obj.name,
                        obj.income,
                        obj.expenses,
                        obj.profit,
                        obj.income > 0 ? ((obj.profit / obj.income) * 100).toFixed(1) + '%' : '0%'
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(wb, ws, 'Финансовый отчет');

            } else if (data.type === 'tax_report') {
                const taxData = [
                    ['НАЛОГОВЫЙ ОТЧЕТ'],
                    ['Период:', data.period],
                    ['Тип арендодателя:', this.getLandlordTypeText(data.landlordType)],
                    ['Система налогообложения:', data.taxType],
                    ['Дата формирования:', new Date().toLocaleDateString('ru-RU')],
                    [''],
                    ['ПОКАЗАТЕЛЬ', 'ЗНАЧЕНИЕ'],
                    ['Налогооблагаемая база', data.taxBase],
                    ['Ставка налога', data.taxRate + '%'],
                    ['Сумма налога к уплате', data.taxAmount],
                    ['Срок уплаты', data.paymentDeadline]
                ];

                const ws = XLSX.utils.aoa_to_sheet(taxData);
                XLSX.utils.book_append_sheet(wb, ws, 'Налоговый отчет');
            }

            XLSX.writeFile(wb, `${filename}.xlsx`);
            return true;

        } catch (error) {
            console.error('Ошибка экспорта в Excel:', error);
            throw new Error('Не удалось экспортировать в Excel');
        }
    }

    /**
     * Экспорт в Word
     */
    async exportToWord(htmlContent, filename) {
        try {
            const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="UTF-8">
    <title>${this.escapeHtml(filename)}</title>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <style>
        body {
            font-family: "Times New Roman", serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 2cm;
            color: #000000;
            background: #ffffff;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            border: 1px solid #000000;
        }
        td, th {
            border: 1px solid #000000;
            padding: 6pt;
            text-align: left;
            vertical-align: top;
        }
        th {
            background: #f0f0f0;
            font-weight: bold;
        }
        h1, h2, h3 {
            margin-top: 12pt;
            margin-bottom: 6pt;
        }
        h1 {
            font-size: 16pt;
            text-align: center;
        }
        h2 {
            font-size: 14pt;
        }
        .header {
            text-align: center;
            margin-bottom: 24pt;
            border-bottom: 2pt solid #000000;
            padding-bottom: 12pt;
        }
        .footer {
            margin-top: 36pt;
            font-size: 10pt;
            color: #666666;
            text-align: center;
        }
        .no-word {
            display: none !important;
        }
    </style>
</head>
<body>
    ${htmlContent.replace(/<div class="no-print[^>]*>[\s\S]*?<\/div>/gi, '')}
</body>
</html>`;

            const blob = new Blob([wordHtml], {
                type: 'application/msword'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.doc`;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            return true;
        } catch (error) {
            console.error('Ошибка экспорта в Word:', error);
            throw new Error('Не удалось экспортировать в Word');
        }
    }

    /**
     * Открытие предпросмотра печати
     */
    async openPrintPreview(htmlContent) {
        const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

        const cleanHtml = htmlContent.replace(/<div class="no-print[^>]*>[\s\S]*?<\/div>/gi, '');

        printWindow.document.write(cleanHtml);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    }

    /**
     * Подготовка данных для Excel
     */
    async prepareDataForExcel(type, options) {
        switch (type) {
            case 'financial_report':
                const financialData = await this.getFinancialData(options.period, options.dateFrom, options.dateTo);
                const user = this.app.currentUser;
                return {
                    type: 'financial_report',
                    period: this.getPeriodText(options.period),
                    landlordType: user?.landlord_type || 'self_employed',
                    ...financialData
                };

            case 'tax_report':
                const contracts = this.app.contracts || [];
                const userAccount = this.app.currentUser;
                const landlordType = userAccount?.landlord_type || 'self_employed';

                // Фильтрация договоров по периоду
                let filteredContracts = contracts.filter(contract => {
                    if (contract.is_active === false) return false;

                    const contractStart = new Date(contract.start_date);
                    const contractEnd = new Date(contract.end_date);

                    if (options.period === 'custom' && options.dateFrom && options.dateTo) {
                        const periodStart = new Date(options.dateFrom);
                        const periodEnd = new Date(options.dateTo);
                        return contractStart <= periodEnd && contractEnd >= periodStart;
                    }

                    return true;
                });

                let totalIncome = 0;
                filteredContracts.forEach(contract => {
                    totalIncome += contract.rent_amount || 0;
                });

                let taxRate, taxAmount, taxType;
                switch (landlordType) {
                    case 'self_employed':
                        taxRate = 4;
                        taxAmount = totalIncome * 0.04;
                        taxType = 'НПД';
                        break;
                    case 'individual_entrepreneur':
                        taxRate = 6;
                        taxAmount = totalIncome * 0.06;
                        taxType = 'УСН';
                        break;
                    case 'individual':
                        taxRate = 13;
                        taxAmount = totalIncome * 0.13;
                        taxType = 'НДФЛ';
                        break;
                    default:
                        taxRate = 6;
                        taxAmount = totalIncome * 0.06;
                        taxType = 'УСН';
                }

                return {
                    type: 'tax_report',
                    period: this.getPeriodText(options.period),
                    landlordType: landlordType,
                    taxBase: totalIncome,
                    taxRate: taxRate,
                    taxAmount: taxAmount,
                    taxType: taxType,
                    paymentDeadline: 'До 28 числа следующего месяца'
                };

            default:
                throw new Error('Экспорт в Excel для этого типа документа не поддерживается');
        }
    }

    // Вспомогательные методы
    getPeriodText(period) {
        const periods = {
            'current_month': 'Текущий месяц',
            'last_month': 'Прошлый месяц',
            'current_quarter': 'Текущий квартал',
            'current_year': 'Текущий год',
            'custom': 'Произвольный период'
        };
        return periods[period] || period;
    }

    getLandlordTypeText(type) {
        const types = {
            'self_employed': 'Самозанятый (НПД)',
            'individual_entrepreneur': 'Индивидуальный предприниматель (УСН)',
            'individual': 'Физическое лицо (НДФЛ)'
        };
        return types[type] || type;
    }

    getObjectTypeText(type) {
        const types = {
            'apartment': 'Квартира',
            'house': 'Дом',
            'room': 'Комната',
            'commercial': 'Коммерческая недвижимость'
        };
        return types[type] || type;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем глобальный экземпляр
window.printManager = new PrintManager();