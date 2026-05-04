// ==================== UTILS.JS ====================
// Utility Functions

/**
 * แปลงตัวเลขเป็นรูปแบบเงินบาท
 */
function formatBaht(num) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 0
    }).format(num || 0);
}

/**
 * แปลง string ราคาเป็นตัวเลข (ลบ comma, ช่องว่าง, ตัวอักษร)
 */
function parsePrice(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[^0-9.-]+/g, "")) || 0;
}

/**
 * Escape HTML เพื่อป้องกัน XSS
 */
function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Format ราคาให้อ่านง่าย
 */
function formatPrice(num) {
    if (!num) return '—';
    const n = parseFloat(String(num).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '—' : n.toLocaleString('th-TH') + ' บาท';
}

/**
 * Debounce function (หน่วงเวลาการทำงาน)
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * ตรวจสอบว่าเป็น Mobile Device หรือไม่
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Format Date แบบไทย
 */
function formatThaiDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

/**
 * ย่อข้อความยาว
 */
function truncateText(text, maxLength = 30) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * แปลง status เป็นภาษาไทย
 */
function statusLabelThai(status) {
    const labels = {
        'show': '🟢 จอดโชว์',
        'sold': '🔴 ขายแล้ว',
        'hold': '🟡 จอง',
        'archived': '🗄️ เก็บถาวร'
    };
    return labels[status] || status;
}

/**
 * แปลง status เป็น HTML badge
 */
function statusBadgeHTML(status) {
    const badges = {
        'show': '<span class="badge-status status-show">🟢 จอดโชว์</span>',
        'sold': '<span class="badge-status status-sold">🔴 ขายแล้ว</span>',
        'hold': '<span class="badge-status status-hold">🟡 จอง</span>',
        'archived': '<span class="badge-status status-archived">🗄️ เก็บถาวร</span>'
    };
    return badges[status] || '';
}

/**
 * หน่วงเวลา (Promise-based)
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * โคลน Object แบบ Deep Clone
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * ตรวจสอบว่าเป็น JSON String หรือไม่
 */
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}