// ==================== STORAGE-SERVICE.JS ====================
// LocalStorage Management

const SafeStore = {
    /**
     * อ่านค่าจาก LocalStorage
     */
    get(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : fallback;
        } catch {
            return fallback;
        }
    },

    /**
     * บันทึกค่าลง LocalStorage
     */
    set(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
            return true;
        } catch (e) {
            console.error('LocalStorage full:', e);
            showToast('⚠️ พื้นที่เก็บข้อมูลเต็ม กรุณาลบข้อมูลบางส่วน', 'err');
            return false;
        }
    },

    /**
     * ลบค่าจาก LocalStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('LocalStorage remove error:', e);
        }
    },

    /**
     * ล้างข้อมูลทั้งหมด
     */
    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('LocalStorage clear error:', e);
        }
    },

    /**
     * ตรวจสอบว่ามี key หรือไม่
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },

    /**
     * ดึงข้อมูลทั้งหมดเป็น Object
     */
    getAll() {
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try {
                result[key] = JSON.parse(localStorage.getItem(key));
            } catch {
                result[key] = localStorage.getItem(key);
            }
        }
        return result;
    }
};

/**
 * โหลดข้อมูลรถจาก LocalStorage
 */
function loadCarsFromLocalStorage() {
    try {
        const d = localStorage.getItem('stockCars');
        if (d) {
            window.cars = JSON.parse(d);
            window.nextId = Math.max(...window.cars.map(c => c.id), 0) + 1;

            // Normalize data
            window.cars.forEach(c => {
                if (!c.images || !c.images.length) {
                    c.images = c.img ? [c.img] : [PLACEHOLDER_IMAGE];
                }
                if (!c.cost) {
                    c.cost = { purchase: 0, repair: 0, other: 0 };
                }
                if (!c.warranty) {
                    c.warranty = { start: '', end: '', extra: '-' };
                }
                if (!c.bsi) {
                    c.bsi = { coverage: '', start: '', end: '' };
                }
                if (!c.dateAdded) {
                    c.dateAdded = new Date().toISOString();
                }
            });
        } else {
            // ใช้ข้อมูล Default ถ้ายังไม่มี
            window.cars = deepClone(DEFAULT_CARS);
            window.nextId = Math.max(...window.cars.map(c => c.id), 0) + 1;
        }
    } catch (e) {
        console.error('Error loading cars:', e);
        window.cars = deepClone(DEFAULT_CARS);
        window.nextId = Math.max(...window.cars.map(c => c.id), 0) + 1;
    }

    // โหลดวันที่
    const dt = localStorage.getItem('stockDate');
    document.getElementById('stockDate').value = dt || new Date().toISOString().split('T')[0];
}

/**
 * บันทึกข้อมูลรถลง LocalStorage (พร้อม compress ถ้าจำเป็น)
 */
function saveToLocalStorage() {
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(() => {
        try {
            const light = window.cars.map(c => {
                const l = { ...c };
                if (l.images && l.images.length) {
                    l.images = l.images.filter(i => i && i.length > 0);
                    if (l.images.length === 0) {
                        l.images = [l.img && !l.img.startsWith('data:image') ? l.img : PLACEHOLDER_IMAGE];
                    }
                    l.img = l.images[0];
                }
                return l;
            });

            const saved = SafeStore.set('stockCars', light);
            localStorage.setItem('stockDate', document.getElementById('stockDate').value);

            if (saved) {
                setSaveStatus('ok');
            }
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                // ลองบันทึกแบบไม่มีรูป
                try {
                    SafeStore.set('stockCars', window.cars.map(c => ({
                        ...c,
                        images: [PLACEHOLDER_IMAGE],
                        img: PLACEHOLDER_IMAGE
                    })));
                    setSaveStatus('ok');
                    showToast('⚠️ ลดขนาดรูปอัตโนมัติเพื่อประหยัดพื้นที่', 'ok');
                } catch (e2) {
                    setSaveStatus('err');
                    showToast('❌ พื้นที่เต็ม กรุณาลบข้อมูลที่ไม่จำเป็น', 'err');
                }
            } else {
                setSaveStatus('err');
                showToast('⚠️ บันทึกไม่สำเร็จ', 'err');
            }
        }
    }, 250);
}

/**
 * ตั้งค่าสถานะการบันทึก
 */
function setSaveStatus(s) {
    const el = document.getElementById('saveStatus');
    if (!el) return;

    if (s === 'saving') {
        el.textContent = '⏳…';
        el.style.color = 'var(--text-secondary)';
    } else if (s === 'ok') {
        el.textContent = '✅';
        el.style.color = 'var(--green)';
        setTimeout(() => { el.textContent = ''; }, 1500);
    } else {
        el.textContent = '❌';
        el.style.color = 'var(--red)';
    }
}