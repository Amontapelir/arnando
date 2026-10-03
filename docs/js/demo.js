/**
 * Демо-режим: работа без бэкенда.
 *
 * Подменяет сетевые запросы ApiService локальной «базой» в localStorage браузера,
 * поэтому сайт полностью работает на GitHub Pages без сервера.
 * Чтобы вернуться к настоящему бэкенду, поставьте DEMO_MODE = false.
 */
const DEMO_MODE = true;

(function () {
    if (!DEMO_MODE || typeof apiService === 'undefined') return;

    const STORE_KEY = 'arnando_demo_db';
    const DEMO_TOKEN = 'demo-token';

    function seed() {
        const now = new Date().toISOString();
        const p = (id, name, address, type, rent, area, rooms, description) => ({
            id, user_id: 1, name, address, type, base_rent_rate: rent, area, rooms, description, created_at: now, updated_at: null
        });
        const c = (id, property_id, tenant_name, start_date, end_date, rent_amount, is_active) => ({
            id, user_id: 1, property_id, tenant_name, tenant_type: 'physical', start_date, end_date,
            rent_amount, payment_schedule: 'monthly', is_active, tenant_info: null, additional_terms: null,
            created_at: now, updated_at: null
        });
        return {
            seq: { property: 4, contract: 5, user: 2 },
            users: [{ id: 1, email: 'demo@arnando.local', full_name: 'Демо-пользователь', landlord_type: 'self_employed', created_at: now, updated_at: null }],
            properties: [
                p(1, 'Студия у метро', 'г. Королёв, ул. Богомолова, 7', 'apartment', 32000, 28, 1, 'Светлая студия после ремонта, 5 минут до станции'),
                p(2, '2-комнатная в центре', 'г. Королёв, пр-т Космонавтов, 12', 'apartment', 48000, 54, 2, 'Окна во двор, мебель и техника'),
                p(3, 'Офис 40 м²', 'г. Мытищи, ул. Мира, 3', 'commercial', 65000, 40, 2, 'Первый этаж, отдельный вход')
            ],
            contracts: [
                c(1, 1, 'Иванов Сергей Петрович', '2026-03-01', '2027-02-28', 32000, true),
                c(2, 2, 'Смирнова Анна Викторовна', '2026-05-15', '2027-05-14', 48000, true),
                c(3, 3, 'ООО «Ромашка»', '2026-01-10', '2026-12-31', 65000, true),
                c(4, 1, 'Кузнецов Алексей Иванович', '2025-02-01', '2026-02-28', 30000, false)
            ]
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* повреждённые данные — пересоздадим */ }
        const fresh = seed();
        save(fresh);
        return fresh;
    }
    function save(db) { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    const clone = (x) => JSON.parse(JSON.stringify(x));

    function notFound(what) { return new Error(what + ' не найден'); }

    function crud(db, listName, seqName, label, rest, method, body) {
        const list = db[listName];
        const id = rest ? parseInt(rest, 10) : null;
        const now = new Date().toISOString();
        if (!id) {
            if (method === 'POST') {
                const item = Object.assign({}, body, { id: db.seq[seqName]++, user_id: 1, created_at: now, updated_at: null });
                list.push(item); save(db); return clone(item);
            }
            return clone(list);
        }
        const idx = list.findIndex(x => x.id === id);
        if (idx === -1) throw notFound(label);
        if (method === 'PUT') {
            list[idx] = Object.assign({}, list[idx], body, { id, updated_at: now }); save(db); return clone(list[idx]);
        }
        if (method === 'DELETE') {
            list.splice(idx, 1);
            if (listName === 'properties') db.contracts = db.contracts.filter(x => x.property_id !== id);
            save(db); return { ok: true };
        }
        return clone(list[idx]);
    }

    apiService.request = async function (endpoint, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        let body = null;
        if (options.body && typeof options.body === 'string') {
            try { body = JSON.parse(options.body); } catch (e) { body = null; }
        }
        const db = load();
        const path = endpoint.replace(/\/+$/, '');

        if (path === '/token') return { access_token: DEMO_TOKEN, token_type: 'bearer' };
        if (path === '/users/me') return clone(db.users[0]);
        if (path === '/users' && method === 'POST') {
            const u = Object.assign({ landlord_type: 'self_employed' }, body, { id: db.seq.user++, created_at: new Date().toISOString(), updated_at: null });
            delete u.password; db.users[0] = Object.assign({}, db.users[0], u, { id: 1 }); save(db); return clone(db.users[0]);
        }
        const mUser = path.match(/^\/users\/(\d+)$/);
        if (mUser && method === 'PUT') {
            const u = Object.assign({}, body); delete u.password;
            db.users[0] = Object.assign({}, db.users[0], u, { id: 1, updated_at: new Date().toISOString() }); save(db); return clone(db.users[0]);
        }
        const mProp = path.match(/^\/properties(?:\/(\d+))?$/);
        if (mProp) return crud(db, 'properties', 'property', 'Объект', mProp[1], method, body);
        const mCon = path.match(/^\/contracts(?:\/(\d+))?$/);
        if (mCon) return crud(db, 'contracts', 'contract', 'Договор', mCon[1], method, body);
        throw new Error('Демо-режим: запрос ' + endpoint + ' не поддерживается');
    };

    // Автоматический вход: токен есть, пользователь возвращается из локальной базы
    apiService.setToken(DEMO_TOKEN);

    // После полной инициализации приложения перерисовываем дашборд уже с данными
    (function refreshDashboardWhenReady(attempt) {
        if (window.app && window.app.isInitialized) {
            if (document.getElementById('totalProfit') && window.app.loadDashboard) window.app.loadDashboard();
            if (window.chartsManager && document.getElementById('incomeExpenseChart')) window.chartsManager.updateCharts();
        } else if (attempt < 40) {
            setTimeout(function () { refreshDashboardWhenReady(attempt + 1); }, 250);
        }
    })(0);

    // Плашка, чтобы было честно видно, что это демо
    document.addEventListener('DOMContentLoaded', function () {
        const bar = document.createElement('div');
        bar.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;background:rgba(15,23,42,.92);color:#fff;font:13px/1.4 Inter,system-ui,sans-serif;padding:10px 14px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;gap:12px;align-items:center;max-width:calc(100vw - 32px)';
        bar.innerHTML = '<span>Демо-режим: данные хранятся только в этом браузере</span>';
        const btn = document.createElement('button');
        btn.textContent = 'Сбросить';
        btn.style.cssText = 'background:#fff;color:#0f172a;border:0;border-radius:8px;padding:6px 10px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer';
        btn.onclick = function () { localStorage.removeItem(STORE_KEY); location.reload(); };
        bar.appendChild(btn);
        document.body.appendChild(bar);
    });
})();
