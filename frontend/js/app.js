class RentTaxApp {
    constructor() {
        this.properties = [];
        this.contracts = [];
        this.currentUser = null;
        this.taxCalculator = null;
        this.isInitialized = false;

        this.showErrorScreen = this.showErrorScreen.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.updateAuthUI = this.updateAuthUI.bind(this);
        this.updateUIAfterLogin = this.updateUIAfterLogin.bind(this);

    }

    async init() {
        if (this.isInitialized) {
            console.log('Приложение уже инициализировано');
            return;
        }

        try {
            console.log('Starting app initialization...');

            // Защита от повторной инициализации
            if (this._initializing) return;
            this._initializing = true;

            // Инициализируем аутентификацию
            await authService.initialize();
            this.currentUser = authService.currentUser;

            // Ждем чтобы DOM был готов
            await new Promise(resolve => setTimeout(resolve, 500));

            this.initializeEventListeners();

            // Загружаем данные только если пользователь авторизован
            if (authService.isAuthenticated) {
                await this.loadObjects();
                await this.loadContracts();
            }

            this.initializeFormHandlers();

            this.isInitialized = true;
            this._initializing = false;

            console.log('RentTaxApp initialized successfully');

            // Обновляем UI после полной инициализации
            await this.updateAuthUI(authService.isAuthenticated);

        } catch (error) {
            console.error('Initialization error:', error);
            this._initializing = false;
            this.showErrorScreen(error);
        }
    }


    initializeEventListeners() {
        console.log('Initializing event listeners...');

        // Обработчик аккаунта с защитой от ошибок
        const accountBtn = document.getElementById('accountBtn');
        if (accountBtn) {
            console.log('Account button found, setting up handler');
            accountBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (authService.isAuthenticated) {
                    this.showAccountManagement();
                } else {
                    this.showAccountModal();
                }
            };
        } else {
            console.warn('Account button not found during event listeners initialization');
        }

        // Обработчик печати
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.showPrintModal());
        }

        // Обработчик экспорта
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // Обработчик генерации печати
        const generatePrintBtn = document.getElementById('generatePrintBtn');
        if (generatePrintBtn) {
            generatePrintBtn.addEventListener('click', () => this.handlePrintGeneration());
        }

        // Обработчик выбора типа печати
        const printTypeSelect = document.getElementById('printType');
        if (printTypeSelect) {
            printTypeSelect.addEventListener('change', (e) => {
                const contractSelectGroup = document.getElementById('contractSelectGroup');
                if (e.target.value === 'contract') {
                    contractSelectGroup.style.display = 'block';
                    this.populateContractSelectForPrint();
                } else {
                    contractSelectGroup.style.display = 'none';
                }
            });
        }

        // Обработчик выбора периода
        const printPeriodSelect = document.getElementById('printPeriod');
        if (printPeriodSelect) {
            printPeriodSelect.addEventListener('change', (e) => {
                const customPeriod = document.getElementById('customPeriod');
                if (e.target.value === 'custom') {
                    customPeriod.classList.remove('hidden');
                } else {
                    customPeriod.classList.add('hidden');
                }
            });
        }

        // Обработчики закрытия модальных окон
        const cancelButtons = document.querySelectorAll('#cancelObjectBtn, #cancelAccountBtn, #cancelContractBtn, #cancelPrintBtn');
        cancelButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModals());
            }
        });

        // Обработчик переключения между логином и регистрацией
        const switchToRegister = document.getElementById('switchToRegister');
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthMode();
            });
        }

        // Обработчик темы
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Закрытие модальных окон по клику вне области
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        console.log('Event listeners initialized successfully');
    }

    initializeFormHandlers() {
        // Обработчик формы аккаунта
        const accountForm = document.getElementById('accountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', (e) => this.handleAccountSubmit(e));
        }

        // Обработчик формы объекта
        const objectForm = document.getElementById('objectForm');
        if (objectForm) {
            objectForm.addEventListener('submit', (e) => this.handleObjectSubmit(e));
        }

        // Обработчик формы договора
        const contractForm = document.getElementById('contractForm');
        if (contractForm) {
            contractForm.addEventListener('submit', (e) => this.handleContractSubmit(e));
        }
    }

    switchAuthMode() {
        const title = document.getElementById('accountModalTitle');
        const submitBtn = document.getElementById('accountSubmitBtn');
        const switchBtn = document.getElementById('switchToRegister');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        const landlordTypeGroup = document.getElementById('landlordTypeGroup');

        if (title && title.textContent === 'Вход в аккаунт') {
            // Переключаем на регистрацию
            title.textContent = 'Создание аккаунта';
            if (submitBtn) submitBtn.textContent = 'Зарегистрироваться';
            if (switchBtn) switchBtn.textContent = 'Войти в аккаунт';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
            if (landlordTypeGroup) landlordTypeGroup.style.display = 'block';
        } else if (title) {
            // Переключаем на вход
            title.textContent = 'Вход в аккаунт';
            if (submitBtn) submitBtn.textContent = 'Войти';
            if (switchBtn) switchBtn.textContent = 'Создать аккаунт';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
            if (landlordTypeGroup) landlordTypeGroup.style.display = 'none';
        }
    }

    async handleAccountSubmit(event) {
        event.preventDefault();

        const email = document.getElementById('accountEmail')?.value;
        const password = document.getElementById('accountPassword')?.value;
        const title = document.getElementById('accountModalTitle');
        const isLoginMode = title && title.textContent === 'Вход в аккаунт';

        if (!email || !password) {
            this.showNotification('Email и пароль обязательны для заполнения', 'error');
            return;
        }

        try {
            if (isLoginMode) {
                // Логин
                const success = await authService.login(email, password);
                if (success) {
                    this.currentUser = authService.currentUser;
                    this.showNotification('Вход выполнен успешно!', 'success');
                    this.hideModals();
                    this.updateAuthUI(true);

                    // Загружаем данные после входа
                    await this.loadObjects();
                    await this.loadContracts();

                    // Обновляем текущую страницу если она открыта
                    const currentPage = window.location.hash.replace('#', '') || 'dashboard';
                    if (currentPage === 'dashboard') {
                        await this.loadDashboard();
                    } else if (currentPage === 'analytics') {
                        setTimeout(() => {
                            if (window.chartsManager) {
                                window.chartsManager.updateCharts();
                            }
                        }, 500);
                    }

                    // Обновляем UI
                    this.updateUIAfterLogin();
                }
            } else {
                // Регистрация
                const confirmPassword = document.getElementById('accountConfirmPassword')?.value;
                const landlordTypeElement = document.querySelector('input[name="accountLandlordType"]:checked');
                const landlordType = landlordTypeElement ? landlordTypeElement.value : 'self_employed';

                if (password !== confirmPassword) {
                    this.showNotification('Пароли не совпадают', 'error');
                    return;
                }

                if (password.length < 6) {
                    this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
                    return;
                }

                const userData = {
                    email: email,
                    password: password,
                    full_name: email.split('@')[0],
                    landlord_type: landlordType
                };

                await authService.register(userData);
                this.showNotification('Аккаунт успешно создан! Теперь выполните вход.', 'success');

                // Переключаем на форму входа после успешной регистрации
                this.switchAuthMode();

                // Очищаем только пароли, оставляем email
                const passwordField = document.getElementById('accountPassword');
                const confirmPasswordField = document.getElementById('accountConfirmPassword');
                if (passwordField) passwordField.value = '';
                if (confirmPasswordField) confirmPasswordField.value = '';
            }
        } catch (error) {
            console.error('Auth error:', error);
            let errorMessage = 'Произошла ошибка при авторизации';

            if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Ошибка соединения с сервером. Проверьте подключение к интернету';
            } else if (error.message.includes('401') || error.message.includes('Incorrect email or password')) {
                errorMessage = 'Неверный email или пароль';
            } else if (error.message.includes('409') || error.message.includes('Email already registered')) {
                errorMessage = 'Пользователь с таким email уже существует';
            } else if (error.message.includes('422')) {
                errorMessage = 'Ошибка валидации данных. Проверьте введенные данные';
            } else if (error.message.includes('500')) {
                errorMessage = 'Ошибка на сервере. Попробуйте позже';
            }

            this.showNotification(errorMessage, 'error');
        }
    }


    async editProperty(id) {
        try {
            const property = this.properties.find(p => p.id === id);
            if (!property) {
                this.showNotification('Объект не найден', 'error');
                return;
            }

            // Заполняем форму данными объекта
            document.getElementById('objectId').value = property.id;
            document.getElementById('objectName').value = property.name;
            document.getElementById('objectAddress').value = property.address;
            document.getElementById('objectType').value = property.type;
            document.getElementById('objectRent').value = property.base_rent_rate;
            document.getElementById('objectArea').value = property.area || '';
            document.getElementById('objectRooms').value = property.rooms || '';
            document.getElementById('objectDescription').value = property.description || '';

            // Меняем заголовок модального окна
            document.getElementById('objectModalTitle').textContent = 'Редактировать объект';

            // Показываем модальное окно БЕЗ сброса формы
            const objectModal = document.getElementById('objectModal');
            if (objectModal) {
                objectModal.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error editing property:', error);
            this.showNotification('Ошибка при редактировании объекта', 'error');
        }
    }

    async editContract(id) {
        try {
            const contract = this.contracts.find(c => c.id === id);
            if (!contract) {
                this.showNotification('Договор не найден', 'error');
                return;
            }

            // Заполняем форму данными договора
            document.getElementById('contractId').value = contract.id;

            // Обновляем список объектов перед установкой значения
            this.populateObjectSelect();

            // Небольшая задержка для обновления DOM
            setTimeout(() => {
                document.getElementById('contractObject').value = contract.property_id;
                document.getElementById('contractTenant').value = contract.tenant_name;

                // Устанавливаем тип арендатора для самозанятых
                if (contract.tenant_type) {
                    const tenantTypeRadios = document.querySelectorAll('input[name="contractTenantType"]');
                    tenantTypeRadios.forEach(radio => {
                        radio.checked = radio.value === contract.tenant_type;
                    });
                }

                document.getElementById('contractStart').value = contract.start_date;
                document.getElementById('contractEnd').value = contract.end_date;
                document.getElementById('contractAmount').value = contract.rent_amount;
                document.getElementById('contractSchedule').value = contract.payment_schedule || 'monthly';

                // Заполняем дополнительную информацию об арендаторе
                if (contract.tenant_info) {
                    document.getElementById('tenantPassportSeries').value = contract.tenant_info.passport_series || '';
                    document.getElementById('tenantPassportNumber').value = contract.tenant_info.passport_number || '';
                    document.getElementById('tenantPassportIssuedBy').value = contract.tenant_info.passport_issued_by || '';
                    document.getElementById('tenantPassportIssueDate').value = contract.tenant_info.passport_issue_date || '';
                    document.getElementById('tenantRegistrationAddress').value = contract.tenant_info.registration_address || '';
                    document.getElementById('tenantINN').value = contract.tenant_info.inn || '';
                    document.getElementById('tenantPhone').value = contract.tenant_info.phone || '';
                    document.getElementById('tenantEmail').value = contract.tenant_info.email || '';

                    // Показываем секцию с дополнительной информацией
                    document.getElementById('toggleTenantInfo').checked = true;
                    document.getElementById('tenantInfoSection').style.display = 'block';
                }

                // Заполняем дополнительные условия
                if (contract.additional_terms) {
                    document.getElementById('contractDeposit').value = contract.additional_terms.deposit || '';
                    document.getElementById('contractUtilities').value = contract.additional_terms.utilities || 'included';
                    document.getElementById('contractNotes').value = contract.additional_terms.notes || '';

                    // Показываем секцию с дополнительными условиями
                    document.getElementById('toggleAdditionalTerms').checked = true;
                    document.getElementById('additionalTermsSection').style.display = 'block';
                }

                // Меняем заголовок модального окна
                document.getElementById('contractModalTitle').textContent = 'Редактировать договор';
                document.getElementById('saveContractBtn').textContent = 'Сохранить изменения';

                // Показываем модальное окно
                const contractModal = document.getElementById('contractModal');
                if (contractModal) {
                    contractModal.classList.remove('hidden');
                }
            }, 100);
        } catch (error) {
            console.error('Error editing contract:', error);
            this.showNotification('Ошибка при редактировании договора', 'error');
        }
    }

    async handleObjectSubmit(event) {
        event.preventDefault();

        if (!authService.isAuthenticated) {
            this.showNotification('Для работы с объектами необходимо войти в систему', 'error');
            return;
        }

        const objectId = document.getElementById('objectId').value;
        const isEditMode = !!objectId && objectId !== '';

        console.log('Режим сохранения объекта:', isEditMode ? 'Редактирование' : 'Создание', 'ID:', objectId);

        const objectData = {
            name: document.getElementById('objectName')?.value || '',
            address: document.getElementById('objectAddress')?.value || '',
            type: document.getElementById('objectType')?.value || 'apartment',
            base_rent_rate: parseFloat(document.getElementById('objectRent')?.value) || 0,
            area: document.getElementById('objectArea')?.value ? parseFloat(document.getElementById('objectArea').value) : null,
            rooms: document.getElementById('objectRooms')?.value ? parseInt(document.getElementById('objectRooms').value) : null,
            description: document.getElementById('objectDescription')?.value || ''
        };

        // Валидация
        if (!objectData.name || !objectData.address || !objectData.base_rent_rate) {
            this.showNotification('Заполните обязательные поля: название, адрес и стоимость аренды', 'error');
            return;
        }

        if (objectData.base_rent_rate <= 0) {
            this.showNotification('Стоимость аренды должна быть больше 0', 'error');
            return;
        }

        try {
            if (isEditMode) {
                // Редактирование существующего объекта
                const updatedProperty = await apiService.updateProperty(objectId, objectData);

                // Обновляем в локальном массиве
                const index = this.properties.findIndex(p => p.id === parseInt(objectId));
                if (index !== -1) {
                    this.properties[index] = updatedProperty;
                }

                this.showNotification('Объект успешно обновлен!', 'success');
            } else {
                // Создание нового объекта
                const newProperty = await apiService.createProperty(objectData);
                this.properties.push(newProperty);
                this.showNotification('Объект успешно добавлен!', 'success');
            }

            this.renderObjectsList();
            this.hideModals();

            // Обновляем дашборд если он открыт
            if (document.querySelector('[data-page="dashboard"].active')) {
                await this.loadDashboard();
            }

            // Обновляем графики если они открыты
            if (window.chartsManager) {
                window.chartsManager.updateCharts();
            }

            // Обновляем выпадающий список в форме договора
            this.populateObjectSelect();

            // Очищаем форму
            const objectForm = document.getElementById('objectForm');
            if (objectForm) objectForm.reset();

            // Сбрасываем hidden input
            document.getElementById('objectId').value = '';

            // Возвращаем заголовок
            document.getElementById('objectModalTitle').textContent = 'Добавить объект';

        } catch (error) {
            console.error('Error saving property:', error);
            this.showNotification('Ошибка при сохранении объекта: ' + error.message, 'error');
        }
        if (window.chartsManager) {
            setTimeout(() => {
                window.chartsManager.updateCharts();
            }, 500);
        }
    }

    async handleContractSubmit(event) {
        event.preventDefault();

        if (!authService.isAuthenticated) {
            this.showNotification('Для работы с договорами необходимо войти в систему', 'error');
            return;
        }

        // Проверяем есть ли объекты для привязки
        if (this.properties.length === 0) {
            this.showNotification('Сначала добавьте объект недвижимости', 'error');
            this.hideModals();
            this.showObjectModal();
            return;
        }

        const contractId = document.getElementById('contractId').value;
        const isEditMode = !!contractId && contractId !== '';

        console.log('Режим сохранения договора:', isEditMode ? 'Редактирование' : 'Создание', 'ID:', contractId);

        // Собираем основные данные
        const contractData = {
            property_id: parseInt(document.getElementById('contractObject')?.value) || 0,
            tenant_name: document.getElementById('contractTenant')?.value || '',
            start_date: document.getElementById('contractStart')?.value || '',
            end_date: document.getElementById('contractEnd')?.value || '',
            rent_amount: parseFloat(document.getElementById('contractAmount')?.value) || 0,
            payment_schedule: document.getElementById('contractSchedule')?.value || 'monthly'
        };

        // Добавляем тип арендатора для самозанятых
        const tenantTypeElement = document.querySelector('input[name="contractTenantType"]:checked');
        if (tenantTypeElement) {
            contractData.tenant_type = tenantTypeElement.value;
        }

        // Собираем дополнительную информацию об арендаторе
        if (document.getElementById('toggleTenantInfo')?.checked) {
            contractData.tenant_info = {
                passport_series: document.getElementById('tenantPassportSeries')?.value || '',
                passport_number: document.getElementById('tenantPassportNumber')?.value || '',
                passport_issued_by: document.getElementById('tenantPassportIssuedBy')?.value || '',
                passport_issue_date: document.getElementById('tenantPassportIssueDate')?.value || '',
                registration_address: document.getElementById('tenantRegistrationAddress')?.value || '',
                inn: document.getElementById('tenantINN')?.value || '',
                phone: document.getElementById('tenantPhone')?.value || '',
                email: document.getElementById('tenantEmail')?.value || ''
            };
        }

        // Собираем дополнительные условия
        if (document.getElementById('toggleAdditionalTerms')?.checked) {
            contractData.additional_terms = {
                deposit: document.getElementById('contractDeposit')?.value ? parseFloat(document.getElementById('contractDeposit').value) : null,
                utilities: document.getElementById('contractUtilities')?.value || 'included',
                notes: document.getElementById('contractNotes')?.value || ''
            };
        }

        // Валидация
        if (!contractData.tenant_name || !contractData.start_date || !contractData.end_date || !contractData.rent_amount) {
            this.showNotification('Заполните обязательные поля: арендатор, даты и сумма аренды', 'error');
            return;
        }

        if (!contractData.property_id) {
            this.showNotification('Выберите объект недвижимости', 'error');
            return;
        }

        if (contractData.rent_amount <= 0) {
            this.showNotification('Сумма аренды должна быть больше 0', 'error');
            return;
        }

        if (new Date(contractData.start_date) >= new Date(contractData.end_date)) {
            this.showNotification('Дата начала должна быть раньше даты окончания', 'error');
            return;
        }

        try {
            if (isEditMode) {
                // Редактирование существующего договора
                const updatedContract = await apiService.updateContract(contractId, contractData);

                // Обновляем в локальном массиве
                const index = this.contracts.findIndex(c => c.id === parseInt(contractId));
                if (index !== -1) {
                    this.contracts[index] = updatedContract;
                }

                this.showNotification('Договор успешно обновлен!', 'success');
            } else {
                // Создание нового договора
                const newContract = await apiService.createContract(contractData);
                this.contracts.push(newContract);
                this.showNotification('Договор успешно добавлен!', 'success');
            }

            this.renderContractsList();
            this.hideModals();

            // Обновляем дашборд если он открыт
            if (document.querySelector('[data-page="dashboard"].active')) {
                await this.loadDashboard();
            }

            // Обновляем графики если они открыты
            if (window.chartsManager) {
                window.chartsManager.updateCharts();
            }

            // Обновляем выпадающий список для печати
            this.populateContractSelectForPrint();

            // Очищаем форму
            const contractForm = document.getElementById('contractForm');
            if (contractForm) {
                contractForm.reset();
                // Сбрасываем скрытые секции
                document.getElementById('toggleTenantInfo').checked = false;
                document.getElementById('tenantInfoSection').style.display = 'none';
                document.getElementById('toggleAdditionalTerms').checked = false;
                document.getElementById('additionalTermsSection').style.display = 'none';
            }

            // Сбрасываем hidden input
            document.getElementById('contractId').value = '';

            // Возвращаем заголовок и текст кнопки
            document.getElementById('contractModalTitle').textContent = 'Новый договор';
            document.getElementById('saveContractBtn').textContent = 'Сохранить договор';

        } catch (error) {
            console.error('Error saving contract:', error);
            this.showNotification('Ошибка при сохранении договора: ' + error.message, 'error');
        }
        if (window.chartsManager) {
            setTimeout(() => {
                window.chartsManager.updateCharts();
            }, 500);
        }
    }

    async handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            authService.logout();
            this.currentUser = null;
            this.updateAuthUI(false);
            this.properties = [];
            this.contracts = [];
            this.renderObjectsList();
            this.renderContractsList();
            this.showNotification('Вы вышли из системы', 'success');

            // Обновляем дашборд если он открыт
            if (document.querySelector('[data-page="dashboard"].active')) {
                await this.loadDashboard();
            }
        }
    }

    showErrorScreen(error) {
        console.error('Application error:', error);
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="padding: 40px; text-align: center; color: red;">
                    <h2>Произошла ошибка при загрузке приложения</h2>
                    <p>${error.message || 'Неизвестная ошибка'}</p>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">
                        Перезагрузить страницу
                    </button>
                </div>
            `;
        }
    }

    async loadDashboard() {
        try {
            console.log('Loading dashboard data...');
            const stats = await this.loadDashboardStats();
            this.updateDashboardUI(stats);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadObjects() {
        try {
            console.log('Loading objects...');
            if (authService.isAuthenticated) {
                this.properties = await apiService.getProperties();
            } else {
                const saved = localStorage.getItem('properties');
                if (saved) {
                    this.properties = JSON.parse(saved);
                }
            }
            this.renderObjectsList();
        } catch (error) {
            console.error('Error loading objects:', error);
            const saved = localStorage.getItem('properties');
            if (saved) {
                this.properties = JSON.parse(saved);
            }
        }
    }



    async loadContracts() {
        // Защита от повторной загрузки
        if (this._loadingContracts) {
            console.log('Загрузка контрактов уже в процессе...');
            return;
        }

        this._loadingContracts = true;

        try {
            console.log('Loading contracts...');
            if (authService.isAuthenticated) {
                this.contracts = await apiService.getContracts();
            } else {
                const saved = localStorage.getItem('contracts');
                if (saved) {
                    this.contracts = JSON.parse(saved);
                }
            }
            this.renderContractsList();
        } catch (error) {
            console.error('Error loading contracts:', error);
            const saved = localStorage.getItem('contracts');
            if (saved) {
                this.contracts = JSON.parse(saved);
            }
        } finally {
            this._loadingContracts = false;
        }
    }

    async loadAnalytics() {
        try {
            console.log('Loading analytics data...');
            if (window.chartsManager && typeof window.chartsManager.updateCharts === 'function') {
                window.chartsManager.updateCharts();
            } else if (window.charts && typeof window.charts.updateCharts === 'function') {
                window.charts.updateCharts();
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadDashboardStats() {
        const totalRent = this.contracts
            .filter(contract => contract.is_active !== false)
            .reduce((sum, contract) => sum + contract.rent_amount, 0);

        const activeContracts = this.contracts.filter(contract => contract.is_active !== false).length;

        return {
            totalProfit: totalRent,
            activeObjects: this.properties.length,
            totalObjects: this.properties.length,
            nextTax: Math.round(totalRent * 0.04),
            upcomingPayments: activeContracts
        };
    }

    updateDashboardUI(stats) {
        const totalProfitEl = document.getElementById('totalProfit');
        const activeObjectsEl = document.getElementById('activeObjects');
        const totalObjectsEl = document.getElementById('totalObjects');
        const nextTaxEl = document.getElementById('nextTax');
        const upcomingPaymentsEl = document.getElementById('upcomingPayments');

        if (totalProfitEl) totalProfitEl.textContent = `${stats.totalProfit.toLocaleString()} ₽`;
        if (activeObjectsEl) activeObjectsEl.textContent = stats.activeObjects;
        if (totalObjectsEl) totalObjectsEl.textContent = stats.totalObjects;
        if (nextTaxEl) nextTaxEl.textContent = `${stats.nextTax.toLocaleString()} ₽`;
        if (upcomingPaymentsEl) upcomingPaymentsEl.textContent = stats.upcomingPayments;
    }

    renderObjectsList() {
        const objectsList = document.getElementById('objectsList');
        if (!objectsList) return;

        if (this.properties.length === 0) {
            objectsList.innerHTML = `
                <div class="card text-center no-data-message">
                    <div class="no-data-title">Объекты недвижимости</div>
                    <div class="no-data-description">У вас пока нет добавленных объектов недвижимости</div>
                    <div class="no-data-actions">
                        <button class="btn-primary" id="addFirstObjectBtn">Добавить первый объект</button>
                    </div>
                </div>
            `;

            const addFirstObjectBtn = document.getElementById('addFirstObjectBtn');
            if (addFirstObjectBtn) {
                // Удаляем старый обработчик если есть
                addFirstObjectBtn.removeEventListener('click', this.showObjectModal);
                // Добавляем новый обработчик
                addFirstObjectBtn.addEventListener('click', () => this.showObjectModal());
            }
        } else {
            objectsList.innerHTML = this.properties.map(property => `
                <div class="object-card card">
                    <div class="object-card-header">
                        <div>
                            <h4>${property.name}</h4>
                            <div class="object-details">${property.address}</div>
                        </div>
                    </div>
                    <div class="object-stats">
                        <div><strong>Аренда:</strong> ${property.base_rent_rate.toLocaleString()} ₽/мес</div>
                        <div><strong>Тип:</strong> ${this.getPropertyType(property.type)}</div>
                        ${property.area ? `<div><strong>Площадь:</strong> ${property.area} м²</div>` : ''}
                        ${property.rooms ? `<div><strong>Комнат:</strong> ${property.rooms}</div>` : ''}
                    </div>
                    <div class="object-actions">
                        <button class="action-btn btn-edit" onclick="app.editProperty(${property.id})">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                        <button class="action-btn btn-delete" onclick="app.deleteProperty(${property.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    renderContractsList() {
        const contractsList = document.getElementById('contractsList');
        if (!contractsList) return;

        if (this.contracts.length === 0) {
            contractsList.innerHTML = `
                <div class="card text-center no-data-message">
                    <div class="no-data-title">Договоры аренды</div>
                    <div class="no-data-description">У вас пока нет активных договоров аренды</div>
                    <div class="no-data-actions">
                        <button class="btn-primary" id="addFirstContractBtn">Добавить первый договор</button>
                    </div>
                </div>
            `;

            const addFirstContractBtn = document.getElementById('addFirstContractBtn');
            if (addFirstContractBtn) {
                // Удаляем старый обработчик если есть
                addFirstContractBtn.removeEventListener('click', this.showContractModal);
                // Добавляем новый обработчик
                addFirstContractBtn.addEventListener('click', () => this.showContractModal());
            }
        } else {
            contractsList.innerHTML = this.contracts.map(contract => `
                <div class="contract-card card">
                    <div class="contract-card-header">
                        <div>
                            <h4>${contract.tenant_name}</h4>
                            <div class="contract-details">Объект: ${this.getPropertyName(contract.property_id)}</div>
                        </div>
                        <div class="contract-status ${contract.is_active ? 'active' : 'inactive'}">
                            ${contract.is_active ? 'Активен' : 'Неактивен'}
                        </div>
                    </div>
                    <div class="contract-stats">
                        <div><strong>Сумма:</strong> ${contract.rent_amount.toLocaleString()} ₽/${this.getPaymentScheduleText(contract.payment_schedule)}</div>
                        <div><strong>Период:</strong> ${new Date(contract.start_date).toLocaleDateString()} - ${new Date(contract.end_date).toLocaleDateString()}</div>
                    </div>
                    <div class="contract-actions">
                        <button class="action-btn btn-edit" onclick="app.editContract(${contract.id})">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                        <button class="action-btn btn-delete" onclick="app.deleteContract(${contract.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    getPropertyName(propertyId) {
        const property = this.properties.find(p => p.id === propertyId);
        return property ? property.name : 'Неизвестный объект';
    }

    getPropertyType(type) {
        const types = {
            'apartment': 'Квартира',
            'house': 'Дом',
            'room': 'Комната',
            'commercial': 'Коммерческая'
        };
        return types[type] || type;
    }

    getPaymentScheduleText(schedule) {
        const schedules = {
            'monthly': 'мес',
            'quarterly': 'квартал',
            'yearly': 'год'
        };
        return schedules[schedule] || schedule;
    }

    showAccountModal() {
        const accountModal = document.getElementById('accountModal');
        if (accountModal) {
            // Сбрасываем форму и переключаем на режим входа
            const title = document.getElementById('accountModalTitle');
            const submitBtn = document.getElementById('accountSubmitBtn');
            const switchBtn = document.getElementById('switchToRegister');
            const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
            const landlordTypeGroup = document.getElementById('landlordTypeGroup');

            if (title) title.textContent = 'Вход в аккаунт';
            if (submitBtn) submitBtn.textContent = 'Войти';
            if (switchBtn) switchBtn.textContent = 'Создать аккаунт';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
            if (landlordTypeGroup) landlordTypeGroup.style.display = 'none';

            // Очищаем форму
            const form = document.getElementById('accountForm');
            if (form) form.reset();

            accountModal.classList.remove('hidden');
        }
    }

    showObjectModal() {
        const objectModal = document.getElementById('objectModal');
        if (objectModal) {
            // Сбрасываем форму только для создания нового объекта
            const form = document.getElementById('objectForm');
            if (form) form.reset();
            document.getElementById('objectId').value = '';
            document.getElementById('objectModalTitle').textContent = 'Добавить объект';

            objectModal.classList.remove('hidden');
        }
    }

    showContractModal() {
        // Обновляем список объектов перед показом модального окна
        this.populateObjectSelect();

        // Показываем/скрываем секцию типа арендатора в зависимости от типа пользователя
        const tenantTypeGroup = document.getElementById('contractTenantTypeGroup');
        if (tenantTypeGroup && this.currentUser) {
            if (this.currentUser.landlord_type === 'self_employed') {
                tenantTypeGroup.style.display = 'block';
            } else {
                tenantTypeGroup.style.display = 'none';
            }
        }

        const contractModal = document.getElementById('contractModal');
        if (contractModal) {
            // Сбрасываем форму только для создания нового договора
            const form = document.getElementById('contractForm');
            if (form) {
                form.reset();
                // Сбрасываем скрытые секции
                document.getElementById('toggleTenantInfo').checked = false;
                document.getElementById('tenantInfoSection').style.display = 'none';
                document.getElementById('toggleAdditionalTerms').checked = false;
                document.getElementById('additionalTermsSection').style.display = 'none';
            }
            document.getElementById('contractId').value = '';
            document.getElementById('contractModalTitle').textContent = 'Новый договор';
            document.getElementById('saveContractBtn').textContent = 'Сохранить договор';

            contractModal.classList.remove('hidden');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });

        // Также скрываем панель аккаунта
        const accountPanel = document.getElementById('accountManagementPanel');
        if (accountPanel) {
            accountPanel.classList.add('hidden');
        }
    }

    toggleTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');

        if (body.classList.contains('light-theme')) {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            if (themeToggle) themeToggle.textContent = '☀️ Светлая';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            if (themeToggle) themeToggle.textContent = '🌙 Тёмная';
            localStorage.setItem('theme', 'light');
        }
    }

    updateAuthUI(isAuthenticated) {
        try {
            console.log('Updating auth UI:', isAuthenticated);

            const accountStatus = document.getElementById('accountStatus');
            const accountBtn = document.getElementById('accountBtn');

            if (!accountStatus || !accountBtn) {
                console.warn('Элементы интерфейса аутентификации не найдены в updateAuthUI');
                setTimeout(() => {
                    const retryAccountStatus = document.getElementById('accountStatus');
                    const retryAccountBtn = document.getElementById('accountBtn');
                    if (retryAccountStatus && retryAccountBtn) {
                        this.updateAuthUI(isAuthenticated);
                    }
                }, 500);
                return;
            }

            if (isAuthenticated) {
                accountStatus.textContent = this.currentUser?.email || 'Аккаунт';
                accountBtn.innerHTML = '<i class="fas fa-user"></i> ' + (this.currentUser?.email || 'Аккаунт');

                // Устанавливаем обработчик для показа панели управления
                accountBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAccountManagement();
                };
            } else {
                accountStatus.textContent = 'Войти';
                accountBtn.innerHTML = '<i class="fas fa-user"></i> Войти';
                accountBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAccountModal();
                };
            }

            console.log('Auth UI updated successfully');

        } catch (error) {
            console.error('Ошибка в updateAuthUI:', error);
        }
    }

    updateUIAfterLogin() {
        // Обновляем все списки
        this.renderObjectsList();
        this.renderContractsList();

        // Обновляем выпадающие списки
        this.populateObjectSelect();
        this.populateContractSelectForPrint();

        // Обновляем текущую страницу
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        if (hash === 'dashboard') {
            this.loadDashboard();
        } else if (hash === 'analytics') {
            setTimeout(() => {
                if (window.chartsManager) {
                    window.chartsManager.updateCharts();
                }
            }, 500);
        }
        setTimeout(() => {
            if (window.chartsManager) {
                window.chartsManager.updateCharts();
            }
        }, 1000);
    }

    showAccountManagement() {
        // Создаем или показываем панель управления аккаунтом
        let accountPanel = document.getElementById('accountManagementPanel');

        if (!accountPanel) {
            accountPanel = document.createElement('div');
            accountPanel.id = 'accountManagementPanel';
            accountPanel.className = 'account-panel hidden';
            accountPanel.innerHTML = `
                <div class="account-header">
                    <div class="account-user">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle fa-2x"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${this.currentUser?.email || 'Пользователь'}</div>
                            <div class="user-email">${this.currentUser?.email || ''}</div>
                            <div class="user-type">${this.getUserTypeText(this.currentUser?.landlord_type)}</div>
                        </div>
                    </div>
                </div>
                <div class="account-menu">
                    <button class="account-menu-item" onclick="window.navigateTo('profile')">
                        <i class="fas fa-user-edit"></i>
                        <span>Редактировать профиль</span>
                    </button>
                    <button class="account-menu-item" onclick="app.showNotification('Настройки в разработке', 'info')">
                        <i class="fas fa-cog"></i>
                        <span>Настройки</span>
                    </button>
                    <button class="account-menu-item" onclick="app.showNotification('Синхронизация в разработке', 'info')">
                        <i class="fas fa-sync"></i>
                        <span>Синхронизировать данные</span>
                    </button>
                    <div class="menu-divider"></div>
                    <button class="account-menu-item logout" onclick="app.handleLogout()">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Выйти из аккаунта</span>
                    </button>
                </div>
            `;
            document.body.appendChild(accountPanel);
        }

        // Позиционируем панель правильно
        const accountBtn = document.getElementById('accountBtn');
        if (accountBtn) {
            const rect = accountBtn.getBoundingClientRect();
            accountPanel.style.position = 'fixed';
            accountPanel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            accountPanel.style.right = (window.innerWidth - rect.right) + 'px';
            accountPanel.style.zIndex = '1000';
        }

        // Показываем панель
        accountPanel.classList.remove('hidden');

        // Закрытие при клике вне панели
        const closeHandler = (e) => {
            if (!accountPanel.contains(e.target) && e.target !== document.getElementById('accountBtn')) {
                accountPanel.classList.add('hidden');
                document.removeEventListener('click', closeHandler);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    getUserTypeText(type) {
        const types = {
            'self_employed': 'Самозанятый',
            'individual_entrepreneur': 'Индивидуальный предприниматель',
            'individual': 'Физическое лицо'
        };
        return types[type] || 'Самозанятый';
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

    async handlePrintGeneration(){
        const type = document.getElementById('printType').value;
        const period = document.getElementById('printPeriod').value;
        const format = document.querySelector('input[name="printFormat"]:checked')?.value || 'pdf';
        const customPeriod = document.getElementById('printPeriod').value === 'custom';

        let options = {
            period: customPeriod ? 'custom' : period
        };

        // Проверка данных для произвольного периода
        if (customPeriod) {
            const dateFrom = document.getElementById('printDateFrom').value;
            const dateTo = document.getElementById('printDateTo').value;

            if (!dateFrom || !dateTo) {
                this.showNotification('Заполните обе даты для произвольного периода', 'error');
                return;
            }

            if (new Date(dateFrom) > new Date(dateTo)) {
                this.showNotification('Дата "С" не может быть позже даты "По"', 'error');
                return;
            }

            options.dateFrom = dateFrom;
            options.dateTo = dateTo;
        }

        if (type === 'contract') {
            const contractId = document.getElementById('contractSelect').value;
            if (!contractId) {
                this.showNotification('Выберите договор', 'error');
                return;
            }
            options.contractId = parseInt(contractId);
        }

        try {
            const printManager = window.printManager;
            if (!printManager) {
                throw new Error('Менеджер печати не найден');
            }

            printManager.setAppInstance(this);

            const htmlContent = await printManager.generateDocument(type, options);

            if (format === 'pdf') {
                // Для PDF открываем в новом окне и печатаем
                const printWindow = window.open('', '_blank');
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            } else if (format === 'excel') {
                // Для Excel
                const data = await printManager.prepareDataForExcel(type, options);
                await printManager.exportToExcel(data, `${type}_report_${new Date().toISOString().split('T')[0]}`);
            } else if (format === 'word') {
                // Для Word
                await printManager.exportToWord(htmlContent, `${type}_report_${new Date().toISOString().split('T')[0]}`);
            }

            this.showNotification('Документ сформирован успешно!', 'success');
            this.hideModals();
        } catch (error) {
            console.error('Ошибка генерации документа:', error);
            this.showNotification('Ошибка при генерации документа: ' + error.message, 'error');
        }
    }

    showPrintModal() {
        const printModal = document.getElementById('printModal');
        if (printModal) {
            // Заполняем список договоров для печати
            this.populateContractSelectForPrint();

            // Устанавливаем текущую дату по умолчанию для произвольного периода
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            document.getElementById('printDateFrom').value = firstDayOfMonth.toISOString().split('T')[0];
            document.getElementById('printDateTo').value = today.toISOString().split('T')[0];

            printModal.classList.remove('hidden');
        }
    }

    populateObjectSelect() {
        const objectSelect = document.getElementById('contractObject');
        if (objectSelect) {
            const currentValue = objectSelect.value; // Сохраняем текущее значение

            objectSelect.innerHTML = '<option value="">Выберите объект</option>';
            this.properties.forEach(property => {
                const option = document.createElement('option');
                option.value = property.id;
                option.textContent = `${property.name} - ${property.address}`;
                objectSelect.appendChild(option);
            });

            // Восстанавливаем значение если оно было установлено
            if (currentValue) {
                objectSelect.value = currentValue;
            }
        }
    }

    populateContractSelectForPrint() {
        const contractSelect = document.getElementById('contractSelect');
        if (contractSelect) {
            contractSelect.innerHTML = '<option value="">Выберите договор</option>';
            this.contracts.forEach(contract => {
                const option = document.createElement('option');
                option.value = contract.id;
                const property = this.properties.find(p => p.id === contract.property_id);
                option.textContent = `Договор №${contract.id} - ${contract.tenant_name} (${property ? property.name : 'Неизвестный объект'})`;
                contractSelect.appendChild(option);
            });
        }
    }

    async handleExport() {
        try {
            // Экспорт всех данных в JSON
            const exportData = {
                properties: this.properties,
                contracts: this.contracts,
                user: this.currentUser,
                exportDate: new Date().toISOString()
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const downloadUrl = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `rent-tax-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(downloadUrl);

            this.showNotification('Данные успешно экспортированы!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            this.showNotification('Ошибка при экспорте данных', 'error');
        }
    }

    async loadProfilePage() {
        try {
            if (!this.currentUser) {
                this.showNotification('Для просмотра профиля необходимо войти в систему', 'error');
                this.navigateTo('dashboard');
                return;
            }

            // Заполняем форму данными пользователя
            this.fillProfileForm();

            // Обновляем статистику
            this.updateProfileStats();
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            this.showNotification('Ошибка загрузки профиля', 'error');
        }
    }

    fillProfileForm() {
        if (!this.currentUser) return;

        const profileForm = document.getElementById('profileForm');
        if (!profileForm) return;

        // Основная информация
        const fullNameField = document.getElementById('profileFullName');
        const emailField = document.getElementById('profileEmail');

        if (fullNameField) fullNameField.value = this.currentUser.full_name || '';
        if (emailField) emailField.value = this.currentUser.email || '';

        // Паспортные данные
        const passportSeries = document.getElementById('profilePassportSeries');
        const passportNumber = document.getElementById('profilePassportNumber');
        const passportIssuedBy = document.getElementById('profilePassportIssuedBy');
        const passportIssueDate = document.getElementById('profilePassportIssueDate');

        if (passportSeries) passportSeries.value = this.currentUser.passport_series || '';
        if (passportNumber) passportNumber.value = this.currentUser.passport_number || '';
        if (passportIssuedBy) passportIssuedBy.value = this.currentUser.passport_issued_by || '';

        if (passportIssueDate && this.currentUser.passport_issue_date) {
            passportIssueDate.value = this.currentUser.passport_issue_date.split('T')[0];
        }

        // Контактная информация
        const registrationAddress = document.getElementById('profileRegistrationAddress');
        const innField = document.getElementById('profileINN');
        const snilsField = document.getElementById('profileSNILS');
        const phoneField = document.getElementById('profilePhone');

        if (registrationAddress) registrationAddress.value = this.currentUser.registration_address || '';
        if (innField) innField.value = this.currentUser.inn || '';
        if (snilsField) snilsField.value = this.currentUser.snils || '';
        if (phoneField) phoneField.value = this.currentUser.phone || '';

        // Банковские реквизиты
        const bankName = document.getElementById('profileBankName');
        const bankAccount = document.getElementById('profileBankAccount');
        const bikField = document.getElementById('profileBIK');

        if (bankName) bankName.value = this.currentUser.bank_name || '';
        if (bankAccount) bankAccount.value = this.currentUser.bank_account || '';
        if (bikField) bikField.value = this.currentUser.bik || '';

        // Устанавливаем обработчик формы профиля
        profileForm.addEventListener('submit', (e) => this.saveProfile(e));
    }

    async saveProfile(event) {
        event.preventDefault();

        try {
            const profileData = {
                full_name: document.getElementById('profileFullName')?.value || '',
                passport_series: document.getElementById('profilePassportSeries')?.value || '',
                passport_number: document.getElementById('profilePassportNumber')?.value || '',
                passport_issued_by: document.getElementById('profilePassportIssuedBy')?.value || '',
                passport_issue_date: document.getElementById('profilePassportIssueDate')?.value || '',
                registration_address: document.getElementById('profileRegistrationAddress')?.value || '',
                inn: document.getElementById('profileINN')?.value || '',
                snils: document.getElementById('profileSNILS')?.value || '',
                phone: document.getElementById('profilePhone')?.value || '',
                bank_name: document.getElementById('profileBankName')?.value || '',
                bank_account: document.getElementById('profileBankAccount')?.value || '',
                bik: document.getElementById('profileBIK')?.value || ''
            };

            // Сохраняем в локальное хранилище
            const userData = {
                ...this.currentUser,
                ...profileData
            };

            // Обновляем текущего пользователя
            this.currentUser = userData;

            // Сохраняем в localStorage
            localStorage.setItem('userData', JSON.stringify(userData));

            this.showNotification('Профиль успешно обновлен!', 'success');

        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
            this.showNotification('Ошибка сохранения профиля: ' + error.message, 'error');
        }
    }

    updateProfileStats() {
        // Количество объектов
        const objectsCount = document.getElementById('profileObjectsCount');
        if (objectsCount) {
            objectsCount.textContent = this.properties.length;
        }

        // Количество договоров
        const contractsCount = document.getElementById('profileContractsCount');
        if (contractsCount) {
            contractsCount.textContent = this.contracts.filter(c => c.is_active !== false).length;
        }

        // Месячный доход
        const monthlyIncomeEl = document.getElementById('profileTotalIncome');
        if (monthlyIncomeEl) {
            const monthlyIncome = this.contracts
                .filter(c => c.is_active !== false)
                .reduce((sum, contract) => sum + (contract.rent_amount || 0), 0);
            monthlyIncomeEl.textContent = monthlyIncome.toLocaleString('ru-RU') + ' ₽';
        }

        // Тип налога
        const taxTypeEl = document.getElementById('profileTaxType');
        if (taxTypeEl) {
            const taxType = this.getUserTypeText(this.currentUser?.landlord_type);
            taxTypeEl.textContent = taxType;
        }
    }

    async deleteProperty(id) {
        if (confirm('Вы уверены, что хотите удалить этот объект?')) {
            try {
                if (authService.isAuthenticated) {
                    await apiService.deleteProperty(id);
                }
                this.properties = this.properties.filter(p => p.id !== id);
                this.renderObjectsList();
                this.showNotification('Объект удален', 'success');

                // Обновляем дашборд если он открыт
                if (document.querySelector('[data-page="dashboard"].active')) {
                    await this.loadDashboard();
                }

                // Обновляем графики если они открыты
                if (window.chartsManager) {
                    window.chartsManager.updateCharts();
                }

                // Обновляем выпадающий список в форме договора
                this.populateObjectSelect();

            } catch (error) {
                console.error('Error deleting property:', error);
                this.showNotification('Ошибка при удалении объекта', 'error');
            }
        }
    }

    async deleteContract(id) {
        if (confirm('Вы уверены, что хотите удалить этот договор?')) {
            try {
                if (authService.isAuthenticated) {
                    await apiService.deleteContract(id);
                }
                this.contracts = this.contracts.filter(c => c.id !== id);
                this.renderContractsList();
                this.showNotification('Договор удален', 'success');

                // Обновляем дашборд если он открыт
                if (document.querySelector('[data-page="dashboard"].active')) {
                    await this.loadDashboard();
                }

                // Обновляем графики если они открыты
                if (window.chartsManager) {
                    window.chartsManager.updateCharts();
                }

                // Обновляем выпадающий список для печати
                this.populateContractSelectForPrint();

            } catch (error) {
                console.error('Error deleting contract:', error);
                this.showNotification('Ошибка при удалении договора', 'error');
            }
        }
    }
}


// Безопасная инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('DOM loaded, initializing app...');

        // Восстанавливаем тему
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.add(savedTheme + '-theme');

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'light' ? '🌙 Тёмная' : '☀️ Светлая';
        }

        // Создаем приложение
        if (typeof RentTaxApp !== 'undefined') {
            window.app = new RentTaxApp();
            await window.app.init();
            console.log('Application started successfully');
        } else {
            throw new Error('RentTaxApp class not loaded');
        }
    } catch (error) {
        console.error('Failed to initialize application:', error);
        if (window.app && window.app.showErrorScreen) {
            window.app.showErrorScreen(error);
        }
    }
});