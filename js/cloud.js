// Акаунт і синхронізація через Firebase (REST API, без сторонніх бібліотек).
// Вхід — email і пароль (Firebase Auth). Весь стан гри зберігається одним
// документом Firestore users/{uid}: { state: JSON-рядок, updatedAt: мс }.
//
// Синхронізація «останній запис перемагає»:
//  - rev     — updatedAt хмарної копії, з якою пристрій востаннє зійшовся;
//  - dirty   — на пристрої є зміни, ще не відправлені в хмару;
//  - changedAt — коли їх зроблено.
// При відкритті гри: якщо в хмарі новіша копія (інший пристрій) і локальних змін
// немає або вони старші — беремо хмарну й перезавантажуємо гру; інакше відправляємо свою.
const Cloud = (() => {
    const CFG = (typeof FIREBASE_CONFIG !== 'undefined') ? FIREBASE_CONFIG : {};
    const enabled = !!(CFG.apiKey && CFG.projectId);
    const META_KEY = 'wt_cloud_v1';
    const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:';
    const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token?key=';
    const DOC_BASE = `https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents/users/`;

    let meta = loadMeta();
    let ready = false;        // перша перевірка хмари в цьому запуску завершена
    let pushTimer = null;
    let pushing = null;
    let statusText = '';

    function loadMeta() {
        try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; }
    }
    function saveMeta() {
        try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore */ }
    }
    const signedIn = () => !!(meta.uid && meta.refreshToken);

    // ---------- Firebase Auth ----------
    const AUTH_ERRORS = {
        EMAIL_EXISTS: 'Акаунт із таким email уже є — просто увійдіть.',
        EMAIL_NOT_FOUND: 'Невірний email або пароль.',
        INVALID_PASSWORD: 'Невірний email або пароль.',
        INVALID_LOGIN_CREDENTIALS: 'Невірний email або пароль.',
        INVALID_EMAIL: 'Перевірте email.',
        MISSING_PASSWORD: 'Введіть пароль.',
        WEAK_PASSWORD: 'Пароль має бути щонайменше 6 символів.',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'Забагато спроб. Спробуйте трохи згодом.',
        USER_DISABLED: 'Цей акаунт вимкнено.',
        OPERATION_NOT_ALLOWED: 'Вхід за email вимкнений у налаштуваннях Firebase.'
    };

    async function authCall(method, body) {
        let res;
        try {
            res = await fetch(`${AUTH_URL}${method}?key=${CFG.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (e) {
            throw new Error('Немає з\'єднання з інтернетом.');
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const code = String((data.error && data.error.message) || '').split(' ')[0].split(':')[0];
            throw new Error(AUTH_ERRORS[code] || 'Не вдалося увійти. Спробуйте ще раз.');
        }
        return data;
    }

    function setSession(d) {
        meta.uid = d.localId;
        meta.email = d.email;
        meta.idToken = d.idToken;
        meta.refreshToken = d.refreshToken;
        meta.exp = Date.now() + (parseInt(d.expiresIn, 10) || 3600) * 1000;
        saveMeta();
    }

    async function getToken() {
        if (meta.idToken && Date.now() < meta.exp - 60000) return meta.idToken;
        let res;
        try {
            res = await fetch(TOKEN_URL + CFG.apiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(meta.refreshToken)
            });
        } catch (e) {
            throw new Error('offline');
        }
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
            // Сесія недійсна (змінено пароль, акаунт видалено) — виходимо, дані на пристрої лишаються
            if (res.status === 400) { signOut(); throw new Error('Сесія завершилась — увійдіть знову.'); }
            throw new Error('offline');
        }
        meta.idToken = d.id_token;
        meta.refreshToken = d.refresh_token;
        meta.exp = Date.now() + (parseInt(d.expires_in, 10) || 3600) * 1000;
        saveMeta();
        return meta.idToken;
    }

    // ---------- Firestore ----------
    async function docRequest(method, body, keepalive) {
        const token = await getToken();
        let res;
        try {
            res = await fetch(DOC_BASE + meta.uid, {
                method,
                keepalive: !!keepalive,
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (e) {
            throw new Error('offline');
        }
        if (method === 'GET' && res.status === 404) return null;
        if (res.status === 401 || res.status === 403) throw new Error('Хмара відмовила в доступі (перевірте правила Firestore).');
        if (!res.ok) throw new Error('offline');
        return res.json();
    }

    async function pull() {
        const doc = await docRequest('GET');
        if (!doc || !doc.fields || !doc.fields.state) return null;
        return {
            state: doc.fields.state.stringValue,
            updatedAt: parseInt(doc.fields.updatedAt && doc.fields.updatedAt.integerValue, 10) || 0
        };
    }

    async function push(keepalive) {
        if (!signedIn()) return;
        if (pushing) return pushing;
        clearTimeout(pushTimer);
        const state = localStorage.getItem(STORAGE_KEY);
        if (!state) return;
        const updatedAt = Date.now();
        const uid = meta.uid;
        pushing = docRequest('PATCH', {
            fields: { state: { stringValue: state }, updatedAt: { integerValue: String(updatedAt) } }
        }, keepalive).then(() => {
            if (meta.uid !== uid) return;   // поки відправляли, вийшли з акаунта
            meta.rev = updatedAt;
            // Зміни, зроблені під час відправки, лишаються «брудними»
            if (!meta.changedAt || meta.changedAt <= updatedAt) meta.dirty = false;
            meta.syncedAt = Date.now();
            saveMeta();
            setStatus('');
        }).catch(e => {
            setStatus(e.message === 'offline' ? 'Немає мережі — збережемо в хмару пізніше.' : e.message);
        }).finally(() => {
            pushing = null;
            if (meta.dirty && signedIn() && ready) schedulePush();
        });
        return pushing;
    }

    function schedulePush() {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => push(false), 4000);
    }

    // Хмарна копія замінює дані пристрою — гра перезапускається з ними
    // Поки сторінка перезавантажується, гра не повинна перезаписати нові дані старими
    let reloading = false;
    function applyRemote(remote) {
        try { localStorage.setItem(STORAGE_KEY, remote.state); } catch (e) { return; }
        reloading = true;
        meta.rev = remote.updatedAt;
        meta.dirty = false;
        meta.changedAt = 0;
        meta.syncedAt = Date.now();
        saveMeta();
        location.reload();
    }

    // Перевірка хмари: при відкритті гри та поверненні до неї
    async function sync() {
        if (!enabled || !signedIn()) { ready = true; return; }
        try {
            const remote = await pull();
            if (remote && remote.updatedAt > (meta.rev || 0)
                && (!meta.dirty || remote.updatedAt > (meta.changedAt || 0))) {
                applyRemote(remote);
                return;
            }
            ready = true;
            if (!remote || meta.dirty) await push(false);
            else { meta.syncedAt = Date.now(); saveMeta(); setStatus(''); }
        } catch (e) {
            ready = true;
            setStatus(e.message === 'offline' ? 'Немає мережі — синхронізуємо пізніше.' : e.message);
        }
    }

    // Викликається з saveState(): позначаємо зміни й відкладено відправляємо
    function onLocalSave() {
        if (!enabled || !signedIn() || !ready) return;
        meta.dirty = true;
        meta.changedAt = Date.now();
        saveMeta();
        schedulePush();
    }

    // Гра йде у фон — відправляємо одразу, не чекаючи таймера
    function flush() {
        if (enabled && signedIn() && ready && meta.dirty) push(true);
    }

    // ---------- Вхід / реєстрація / вихід ----------
    async function signUp(email, password) {
        setSession(await authCall('signUp', { email, password, returnSecureToken: true }));
        ready = true;
        meta.dirty = true;
        meta.changedAt = Date.now();
        saveMeta();
        await push(false);
    }

    async function signIn(email, password) {
        setSession(await authCall('signInWithPassword', { email, password, returnSecureToken: true }));
        ready = true;
        const remote = await pull().catch(() => null);
        if (remote) {
            const when = new Date(remote.updatedAt).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
            const take = confirm(`В акаунті є збережена гра (${when}).\n\nOK — завантажити її на цей пристрій (поточні дані тут буде замінено).\nСкасувати — залишити дані цього пристрою і зберегти їх в акаунт.`);
            if (take) { applyRemote(remote); return; }
        }
        meta.dirty = true;
        meta.changedAt = Date.now();
        saveMeta();
        await push(false);
    }

    function signOut() {
        clearTimeout(pushTimer);
        meta = {};
        statusText = '';
        try { localStorage.removeItem(META_KEY); } catch (e) { /* ignore */ }
        render();
    }

    async function resetPassword(email) {
        await authCall('sendOobCode', { requestType: 'PASSWORD_RESET', email });
    }

    // ---------- Інтерфейс ----------
    const el = (id) => document.getElementById(id);

    function setStatus(text) {
        statusText = text;
        render();
    }

    function render() {
        const modal = el('account-modal');
        if (!modal) return;
        const label = el('account-btn-label');
        if (label) label.textContent = signedIn() ? meta.email : 'Акаунт і синхронізація';
        el('account-off').classList.toggle('hidden', enabled);
        el('account-form').classList.toggle('hidden', !enabled || signedIn());
        el('account-info').classList.toggle('hidden', !enabled || !signedIn());
        if (signedIn()) {
            el('account-user').textContent = meta.email;
            const t = meta.syncedAt
                ? new Date(meta.syncedAt).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })
                : '—';
            el('account-synced').textContent = meta.dirty ? 'Є незбережені в хмару зміни' : `Синхронізовано: ${t}`;
        }
        el('account-status').textContent = statusText;
    }

    function busy(on) {
        ['btn-sign-in', 'btn-sign-up', 'btn-reset-password', 'btn-sync-now'].forEach(id => { el(id).disabled = on; });
    }

    function readForm() {
        const email = el('account-email').value.trim();
        const password = el('account-password').value;
        if (!email) { setStatus('Введіть email.'); return null; }
        return { email, password };
    }

    async function run(action, okText) {
        busy(true);
        setStatus('Зачекайте…');
        try {
            await action();
            el('account-password').value = '';
            setStatus(okText || '');
        } catch (e) {
            setStatus(e.message === 'offline' ? 'Немає з\'єднання з інтернетом.' : e.message);
        } finally {
            busy(false);
        }
    }

    function initUI() {
        const modal = el('account-modal');
        if (!modal) return;
        const close = () => modal.classList.add('hidden');
        el('btn-open-account').addEventListener('click', () => {
            el('profile-modal').classList.add('hidden');
            render();
            modal.classList.remove('hidden');
        });
        el('btn-close-account').addEventListener('click', close);
        el('btn-account-back').addEventListener('click', () => {
            close();
            el('profile-modal').classList.remove('hidden');
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

        el('account-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = readForm();
            if (f) run(() => signIn(f.email, f.password), 'Готово! Прогрес зберігається в хмарі.');
        });
        el('btn-sign-up').addEventListener('click', () => {
            const f = readForm();
            if (f) run(() => signUp(f.email, f.password), 'Акаунт створено! Прогрес зберігається в хмарі.');
        });
        el('btn-reset-password').addEventListener('click', () => {
            const email = el('account-email').value.trim();
            if (!email) { setStatus('Введіть email, і ми надішлемо лист для зміни пароля.'); return; }
            run(() => resetPassword(email), 'Лист для зміни пароля надіслано на ' + email + '.');
        });
        el('btn-sync-now').addEventListener('click', () => run(async () => {
            if (meta.dirty) await push(false); else await sync();
        }));
        el('btn-sign-out').addEventListener('click', () => {
            if (meta.dirty) flush();
            if (confirm('Вийти з акаунта? Дані гри залишаться на цьому пристрої.')) signOut();
        });
        render();
    }

    return { enabled, signedIn, sync, onLocalSave, flush, initUI, isReloading: () => reloading };
})();
