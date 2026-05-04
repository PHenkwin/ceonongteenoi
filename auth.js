// ==================== AUTH.JS ====================
// PIN Authentication & Permission System

// Auth State
let isEditMode = false;
let pinBuffer = '';
let pinMode = 'unlock'; // 'unlock' | 'set-new' | 'confirm-new'
let newPinTemp = '';

/**
 * Permission Check
 */
function hasPerm(action) {
    return ROLES[window.userRole]?.perms?.includes(action) ?? false;
}

function requireAdmin(msg) {
    if (window.userRole !== 'admin') {
        showToast('❌ ' + (msg || 'เฉพาะ Admin เท่านั้น'), 'err');
        return false;
    }
    return true;
}

/**
 * Apply Role-based UI
 */
function applyRoleUI() {
    // Show/hide admin elements
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = hasPerm('edit') ? '' : 'none';
    });

    document.querySelectorAll('.user-only').forEach(el => {
        el.style.display = hasPerm('edit') ? '' : 'none';
    });

    // If not admin, force view mode
    if (window.userRole !== 'admin') {
        isEditMode = false;
        document.body.classList.add('view-mode');
        document.querySelectorAll('.editable').forEach(el => {
            el.contentEditable = 'false';
        });

        const lockBtn = document.getElementById('lockBtn');
        if (lockBtn) {
            lockBtn.className = 'lock-btn locked';
            lockBtn.innerHTML = '🔒 ดูอย่างเดียว';
        }

        const changePinBtn = document.getElementById('changePinBtn');
        if (changePinBtn) changePinBtn.style.display = 'none';

        const lbEditSection = document.getElementById('lbEditSection');
        if (lbEditSection) lbEditSection.style.display = 'none';
    } else {
        applyEditModeState(isEditMode);
    }
}

/**
 * Apply Edit Mode State
 */
function applyEditModeState(mode) {
    isEditMode = mode;

    // Editable fields
    document.querySelectorAll('.editable').forEach(el => {
        el.contentEditable = mode ? 'true' : 'false';
    });

    // Form elements
    document.querySelectorAll('.status-select, input[type="checkbox"], #stockDate, .topbar-date input').forEach(el => {
        el.disabled = !mode;
    });

    // View mode class
    document.body.classList.toggle('view-mode', !mode);

    // Lock button
    const lockBtn = document.getElementById('lockBtn');
    if (lockBtn) {
        if (mode) {
            lockBtn.className = 'lock-btn unlocked';
            lockBtn.innerHTML = '🔓 กำลังแก้ไข';
        } else {
            lockBtn.className = 'lock-btn locked';
            lockBtn.innerHTML = '🔒 ดูอย่างเดียว';
        }
    }

    // Admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = hasPerm('edit') ? '' : 'none';
    });

    // Lightbox edit section
    const lbEditSection = document.getElementById('lbEditSection');
    if (lbEditSection) {
        lbEditSection.style.display = mode ? 'flex' : 'none';
    }

    // Change PIN button
    const changePinBtn = document.getElementById('changePinBtn');
    if (changePinBtn) {
        changePinBtn.style.display = mode ? 'inline-flex' : 'none';
    }
}

// ==================== PIN SYSTEM ====================
function getPin() {
    return localStorage.getItem('stockPin') || DEFAULT_PIN;
}

function handleLockClick() {
    if (hasPerm('edit') && isEditMode) {
        // Lock
        isEditMode = false;
        applyEditModeState(false);
        showToast('🔒 ล็อกแล้ว', 'ok');
    } else {
        // Unlock - show PIN
        openPinModal('unlock');
    }
}

function openPinModal(mode) {
    pinMode = mode;
    pinBuffer = '';

    if (mode !== 'confirm-new') {
        newPinTemp = '';
    }

    updatePinDots();
    document.getElementById('pinError').textContent = '';

    const changePinLink = document.getElementById('changePinLink');
    if (changePinLink) {
        changePinLink.style.display = mode === 'unlock' ? 'block' : 'none';
    }

    // Set title and subtitle
    const titleEl = document.getElementById('pinTitle');
    const subEl = document.getElementById('pinSub');

    switch (mode) {
        case 'unlock':
            if (titleEl) titleEl.textContent = '🔐 ใส่รหัสผ่าน';
            if (subEl) subEl.textContent = 'กรอก PIN 4 หลักเพื่อเข้าโหมดแก้ไข';
            break;
        case 'set-new':
            if (titleEl) titleEl.textContent = '🔧 ตั้ง PIN ใหม่';
            if (subEl) subEl.textContent = 'กรอก PIN 4 หลักที่ต้องการตั้ง';
            break;
        case 'confirm-new':
            if (titleEl) titleEl.textContent = '✅ ยืนยัน PIN ใหม่';
            if (subEl) subEl.textContent = 'กรอก PIN อีกครั้งเพื่อยืนยัน';
            break;
    }

    document.getElementById('pinModal').classList.add('open');
}

function startChangePin() {
    if (!hasPerm('edit')) return;
    closeModal('pinModal');
    openPinModal('set-new');
}

function pinPress(digit) {
    if (pinBuffer.length >= 4) return;

    pinBuffer += digit;
    updatePinDots();

    if (pinBuffer.length === 4) {
        setTimeout(submitPin, 150);
    }
}

function pinBack() {
    pinBuffer = pinBuffer.slice(0, -1);
    updatePinDots();
}

function pinClear() {
    pinBuffer = '';
    updatePinDots();
}

function updatePinDots() {
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('d' + i);
        if (dot) {
            dot.className = 'pin-dot' + (i < pinBuffer.length ? ' filled' : '');
        }
    }
}

function submitPin() {
    document.getElementById('pinError').textContent = '';

    switch (pinMode) {
        case 'unlock':
            if (pinBuffer === getPin()) {
                isEditMode = true;
                applyEditModeState(true);
                closeModal('pinModal');
                showToast('✅ เข้าโหมดแก้ไขแล้ว', 'ok');
            } else {
                document.getElementById('pinError').textContent = '❌ PIN ไม่ถูกต้อง';
                pinBuffer = '';
                updatePinDots();
            }
            break;

        case 'set-new':
            newPinTemp = pinBuffer;
            pinBuffer = '';
            updatePinDots();
            openPinModal('confirm-new');
            break;

        case 'confirm-new':
            if (pinBuffer === newPinTemp) {
                localStorage.setItem('stockPin', pinBuffer);
                closeModal('pinModal');
                showToast('🔑 เปลี่ยน PIN เรียบร้อย', 'ok');
            } else {
                document.getElementById('pinError').textContent = '❌ PIN ไม่ตรงกัน กรุณาลองใหม่';
                pinBuffer = '';
                newPinTemp = '';
                updatePinDots();
                setTimeout(() => openPinModal('set-new'), 800);
            }
            break;
    }
}

// Keyboard support for PIN
document.addEventListener('keydown', function(e) {
    const pinModal = document.getElementById('pinModal');
    if (!pinModal || !pinModal.classList.contains('open')) return;

    if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pinPress(e.key);
    }
    if (e.key === 'Backspace') {
        e.preventDefault();
        pinBack();
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        closeModal('pinModal');
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (pinBuffer.length === 4) submitPin();
    }
});

// ==================== SITE SETTINGS ====================
function applySiteSettings() {
    // Update site name
    const logoText = document.getElementById('logoText');
    if (logoText) {
        logoText.textContent = window.siteSettings.name || 'Stock CEO';
    }
    document.title = window.siteSettings.name || 'Stock CEO';

    // Update logo
    const logoImg = document.getElementById('logoImg');
    const logoWrap = document.getElementById('logoImgWrap');

    if (window.siteSettings.logo) {
        if (logoImg) logoImg.src = window.siteSettings.logo;
        if (logoWrap) logoWrap.style.display = 'block';
    } else {
        if (logoWrap) logoWrap.style.display = 'none';
    }
}

// ==================== UI SETTINGS ====================
function applyUISettings() {
    const settings = window.uiSettings;

    // Theme
    if (settings.theme === 'light') {
        document.documentElement.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
    }

    // View mode
    const carGrid = document.getElementById('carGrid');
    if (carGrid) {
        carGrid.classList.toggle('list-view', settings.view === 'list');
    }

    // Grid size
    if (carGrid) {
        carGrid.classList.remove('small', 'large');
        if (settings.gridSize && settings.gridSize !== 'medium') {
            carGrid.classList.add(settings.gridSize);
        }
    }

    // Update grid size select
    const gridSizeSelect = document.getElementById('gridSizeSelect');
    if (gridSizeSelect && settings.gridSize) {
        gridSizeSelect.value = settings.gridSize;
    }
}

function toggleTheme() {
    window.uiSettings.theme = window.uiSettings.theme === 'dark' ? 'light' : 'dark';
    SafeStore.set('uiSettings', window.uiSettings);
    applyUISettings();
}

function toggleView() {
    window.uiSettings.view = window.uiSettings.view === 'grid' ? 'list' : 'grid';
    SafeStore.set('uiSettings', window.uiSettings);
    applyUISettings();
}

function changeGridSize() {
    const select = document.getElementById('gridSizeSelect');
    if (select) {
        window.uiSettings.gridSize = select.value;
        SafeStore.set('uiSettings', window.uiSettings);
        applyUISettings();
    }
}

// ==================== EXPORT TO PDF ====================
async function exportToPDF() {
    if (typeof window.jspdf === 'undefined') {
        showToast('❌ กำลังโหลด PDF library...', 'err');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setTextColor(201, 168, 76);
    doc.text(window.siteSettings.name || 'Stock CEO', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 24);
    doc.text(`จำนวนรถทั้งหมด: ${window.cars.length} คัน`, 14, 30);

    if (window.cars.length === 0) {
        doc.setTextColor(0, 0, 0);
        doc.text('ไม่มีข้อมูล', 14, 40);
        doc.save(`Stock_CEO_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('📄 Export PDF สำเร็จ', 'ok');
        return;
    }

    // Table
    const tableData = window.cars.map(c => [
        truncateText(c.name, 20),
        c.brand,
        String(c.year),
        c.plate,
        parsePrice(c.net).toLocaleString(),
        statusLabelThai(c.status),
        c.status === 'sold' ? calculateProfit(c).profit.toLocaleString() : '-'
    ]);

    doc.autoTable({
        head: [['รุ่น', 'ยี่ห้อ', 'ปี', 'ทะเบียน', 'ราคา Net', 'สถานะ', 'กำไร']],
        body: tableData,
        startY: 36,
        theme: 'striped',
        headStyles: {
            fillColor: [201, 168, 76],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 35 },
            6: { cellWidth: 25 }
        }
    });

    doc.save(`Stock_CEO_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('📄 Export PDF สำเร็จ', 'ok');
}