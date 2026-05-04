// ==================== UI-MODAL.JS ====================
// Modal Management & Lightbox

// Lightbox State
let lbIndex = 0;
let lbImages = [];
let editImgId = null;
let lbTouchX = null;

// Add Car State
let aImages = [];

/**
 * Toast Notification
 */
let toastTimer = null;

function showToast(msg, type = 'ok') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 1500);
}

/**
 * Modal Management
 */
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-bg')) {
        e.target.classList.remove('open');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-bg.open');
        openModals.forEach(modal => {
            if (modal.id !== 'lightbox') {
                modal.classList.remove('open');
            }
        });
        closeLightbox();
    }
});

// ==================== LIGHTBOX ====================
function openLightbox(carId) {
    editImgId = carId;
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    if (!car.images || !car.images.length) {
        car.images = car.img ? [car.img] : [PLACEHOLDER_IMAGE];
    }

    lbImages = [...car.images];
    lbIndex = 0;

    document.getElementById('lbBrand').textContent = car.brand;
    document.getElementById('lbName').textContent = car.name;
    document.getElementById('lbUrlInput').value = '';

    const lbEditSection = document.getElementById('lbEditSection');
    if (lbEditSection) {
        lbEditSection.style.display = hasPerm('edit') ? 'flex' : 'none';
    }

    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    lbRender();
}

function lbRender() {
    const img = document.getElementById('lbImg');
    const src = lbImages[lbIndex] || PLACEHOLDER_IMAGE;

    img.style.opacity = '0';
    setTimeout(() => {
        img.src = src;
        img.style.opacity = '1';
    }, 50);

    const total = lbImages.length;
    document.getElementById('lbCounter').textContent =
        total > 1 ? `${lbIndex + 1}/${total}` : '';

    // Navigation buttons
    const prev = document.getElementById('lbPrev');
    const next = document.getElementById('lbNext');

    if (total > 1) {
        prev.style.display = 'flex';
        next.style.display = 'flex';
        prev.style.opacity = lbIndex === 0 ? '0.3' : '1';
        next.style.opacity = lbIndex === total - 1 ? '0.3' : '1';
    } else {
        prev.style.display = 'none';
        next.style.display = 'none';
    }

    // Dots
    document.getElementById('lbDots').innerHTML = total > 1
        ? lbImages.map((_, i) => `
            <div onclick="lbGoto(${i})"
                style="width:${i === lbIndex ? '14px' : '5px'};height:5px;border-radius:999px;
                    background:${i === lbIndex ? 'var(--gold)' : 'rgba(255,255,255,.2)'};
                    cursor:pointer;transition:all .15s">
            </div>
        `).join('')
        : '';

    // Thumbnail panel
    const panel = document.getElementById('lbThumbPanel');
    if (hasPerm('edit') && total > 0) {
        panel.style.display = 'flex';
        panel.innerHTML = lbImages.map((src, i) => `
            <div onclick="lbGoto(${i})"
                style="border-radius:4px;overflow:hidden;
                    border:2px solid ${i === lbIndex ? 'var(--gold)' : 'transparent'};
                    cursor:pointer;flex-shrink:0;position:relative">
                <img src="${src}" style="width:100%;height:45px;object-fit:cover" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                <div onclick="event.stopPropagation();lbDeleteIdx(${i})"
                    style="position:absolute;top:1px;right:1px;background:rgba(0,0,0,.6);color:#f88;
                        border-radius:50%;width:15px;height:15px;font-size:10px;
                        display:flex;align-items:center;justify-content:center;cursor:pointer">
                    ✕
                </div>
            </div>
        `).join('');
    } else {
        panel.style.display = 'none';
    }

    document.getElementById('lbDelBtn').style.display =
        lbImages.length > 1 ? 'block' : 'none';
}

function lbNav(direction) {
    lbIndex = (lbIndex + direction + lbImages.length) % lbImages.length;
    lbRender();
}

function lbGoto(index) {
    lbIndex = index;
    lbRender();
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.body.style.overflow = '';
    lbImages = [];
    editImgId = null;
}

async function lbAddImages(srcs) {
    if (!hasPerm('edit')) return;

    const car = window.cars.find(c => c.id === editImgId);
    if (!car) return;
    if (!car.images) car.images = [];

    if (car.images.length + srcs.length > MAX_IMAGES_PER_CAR) {
        showToast(`⚠️ อัพได้สูงสุด ${MAX_IMAGES_PER_CAR} รูป`, 'err');
        return;
    }

    const newImages = [];
    for (let src of srcs) {
        if (src.startsWith('data:') && window.currentUser) {
            try {
                const response = await fetch(src);
                const blob = await response.blob();
                const file = new File([blob], `img_${Date.now()}.jpg`, { type: 'image/jpeg' });
                const url = await uploadImageToStorage(file, editImgId);
                if (url) newImages.push(url);
            } catch (e) {
                newImages.push(src);
            }
        } else {
            newImages.push(src);
        }
    }

    car.images.push(...newImages);
    lbImages = [...car.images];
    lbIndex = car.images.length - newImages.length;
    car.img = car.images[0];

    saveToLocalStorage();
    cloudSave();
    render();
    lbRender();
    showToast(`🖼️ เพิ่ม ${newImages.length} รูป`, 'ok');
}

function lbApplyUrl() {
    if (!hasPerm('edit')) return;
    const url = document.getElementById('lbUrlInput').value.trim();
    if (!url || !editImgId) return;
    document.getElementById('lbUrlInput').value = '';
    lbAddImages([url]);
}

function lbDeleteCurrent() {
    if (lbImages.length <= 1) return;
    lbDeleteIdx(lbIndex);
}

function lbDeleteIdx(index) {
    if (!hasPerm('edit')) return;
    if (lbImages.length <= 1) return;

    lbImages.splice(index, 1);
    const car = window.cars.find(c => c.id === editImgId);
    if (car) {
        car.images = [...lbImages];
        car.img = lbImages[0];
        saveToLocalStorage();
        cloudSave();
        render();
    }

    lbIndex = Math.min(lbIndex, lbImages.length - 1);
    lbRender();
    showToast('🗑️ ลบรูปแล้ว', 'ok');
}

// Lightbox File Input Handler
document.addEventListener('DOMContentLoaded', () => {
    const lbFileInput = document.getElementById('lbFileInput');
    if (lbFileInput) {
        lbFileInput.addEventListener('change', function(e) {
            const files = [...e.target.files];
            if (!files.length || !editImgId) return;

            const srcs = [];
            let done = 0;

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    srcs.push(ev.target.result);
                    done++;
                    if (done === files.length) {
                        lbAddImages(srcs);
                    }
                };
                reader.readAsDataURL(file);
            });

            e.target.value = '';
        });
    }
});

// Keyboard navigation for lightbox
document.addEventListener('keydown', function(e) {
    if (document.getElementById('lightbox').style.display !== 'flex') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbNav(-1);
    if (e.key === 'ArrowRight') lbNav(1);
});

// Touch navigation for lightbox
document.getElementById('lightbox')?.addEventListener('touchstart', function(e) {
    lbTouchX = e.touches[0].clientX;
}, { passive: true });

document.getElementById('lightbox')?.addEventListener('touchend', function(e) {
    if (lbTouchX !== null && Math.abs(e.changedTouches[0].clientX - lbTouchX) > 40) {
        lbNav(e.changedTouches[0].clientX < lbTouchX ? 1 : -1);
    }
    lbTouchX = null;
}, { passive: true });

// ==================== ADD CAR MODAL ====================
function openAddModal() {
    if (!hasPerm('edit')) {
        showToast('❌ คุณไม่มีสิทธิ์เพิ่มรถ', 'err');
        return;
    }

    // Clear form
    const fields = [
        'a-name', 'a-brand', 'a-color', 'a-vin', 'a-mileage',
        'a-plate', 'a-location', 'a-sp', 'a-net', 'a-note',
        'a-cost', 'a-repair', 'a-other', 'a-totalcost'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const yearEl = document.getElementById('a-year');
    if (yearEl) yearEl.value = '';

    const has360El = document.getElementById('a-360');
    if (has360El) has360El.value = 'false';

    aImages = [];
    aRenderThumbs();
    document.getElementById('addModal').classList.add('open');
}

function aRenderThumbs() {
    const container = document.getElementById('a-thumbs');
    if (!container) return;

    if (aImages.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:clamp(8px, 1vw, 9px);padding:clamp(3px, 0.5vw, 4px) 0">ยังไม่มีรูป</div>';
        return;
    }

    container.innerHTML = aImages.map((src, i) => `
        <div style="position:relative;width:clamp(50px, 6vw, 60px);height:clamp(50px, 6vw, 60px);
            border-radius:clamp(4px, 0.6vw, 6px);overflow:hidden;
            border:2px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'};flex-shrink:0">
            <img src="${src}" style="width:100%;height:100%;object-fit:cover"
                onerror="this.src='${PLACEHOLDER_IMAGE}'">
            <div onclick="aRemoveImg(${i})"
                style="position:absolute;top:clamp(1px, 0.3vw, 2px);right:clamp(1px, 0.3vw, 2px);
                    background:rgba(0,0,0,.7);color:#f88;
                    width:clamp(14px, 1.8vw, 16px);height:clamp(14px, 1.8vw, 16px);
                    border-radius:50%;font-size:clamp(8px, 1vw, 9px);
                    display:flex;align-items:center;justify-content:center;cursor:pointer">
                ✕
            </div>
            ${i === 0 ? '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(201,168,76,.8);color:#000;font-size:clamp(7px, 0.9vw, 8px);font-weight:700;text-align:center;padding:clamp(1px, 0.3vw, 2px)">ปก</div>' : ''}
        </div>
    `).join('');
}

function aAddImages(srcs) {
    if (aImages.length + srcs.length > MAX_IMAGES_PER_CAR) {
        showToast(`⚠️ อัพได้สูงสุด ${MAX_IMAGES_PER_CAR} รูป`, 'err');
        return;
    }

    aImages.push(...srcs);
    aRenderThumbs();
    showToast(`🖼️ เพิ่ม ${srcs.length} รูป`, 'ok');
}

function aRemoveImg(index) {
    aImages.splice(index, 1);
    aRenderThumbs();
}

function aAddUrl() {
    const input = document.getElementById('a-img-url');
    if (!input || !input.value.trim()) return;

    aAddImages([input.value.trim()]);
    input.value = '';
}

function calcAddCost() {
    const p = parsePrice(document.getElementById('a-cost')?.value || 0);
    const r = parsePrice(document.getElementById('a-repair')?.value || 0);
    const o = parsePrice(document.getElementById('a-other')?.value || 0);
    const totalEl = document.getElementById('a-totalcost');
    if (totalEl) totalEl.value = (p + r + o).toLocaleString();
}

function handleAddCar() {
    if (!hasPerm('edit')) return;

    const name = document.getElementById('a-name')?.value.trim();
    if (!name) {
        showToast('❗ กรุณากรอกชื่อรุ่น', 'err');
        return;
    }

    const formData = {
        brand: document.getElementById('a-brand')?.value.trim() || 'Unknown',
        name: name,
        year: parseInt(document.getElementById('a-year')?.value) || new Date().getFullYear(),
        color: document.getElementById('a-color')?.value.trim() || '-',
        vin: document.getElementById('a-vin')?.value.trim() || '',
        mileage: document.getElementById('a-mileage')?.value.trim() || '-',
        plate: document.getElementById('a-plate')?.value.trim() || '-',
        sp: document.getElementById('a-sp')?.value.trim() || '0',
        net: document.getElementById('a-net')?.value.trim() || '0',
        location: document.getElementById('a-location')?.value.trim() || '',
        note: document.getElementById('a-note')?.value.trim() || '-',
        has360: document.getElementById('a-360')?.value === 'true',
        costPurchase: document.getElementById('a-cost')?.value || '0',
        costRepair: document.getElementById('a-repair')?.value || '0',
        costOther: document.getElementById('a-other')?.value || '0'
    };

    const car = addNewCar(formData, aImages);
    if (car) {
        closeModal('addModal');
        render();
        showToast('✅ เพิ่มรถแล้ว', 'ok');
    }
}

function handleDeleteCar(carId) {
    if (deleteCarById(carId)) {
        render();
        showToast('🗑️ ลบรถแล้ว', 'ok');
    }
}

// ==================== WARRANTY MODAL ====================
let editWId = null;

function openWModal(carId) {
    if (!hasPerm('edit')) return;

    editWId = carId;
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    document.getElementById('wModalSub').textContent = `${car.brand} ${car.name}`;
    const w = car.warranty || {};
    const b = car.bsi || {};

    document.getElementById('wCoverage').value = w.coverage || '';
    document.getElementById('wStart').value = w.start || '';
    document.getElementById('wEnd').value = w.end || '';
    document.getElementById('wExtra').value = w.extra || '';
    document.getElementById('bsiStart').value = b.start || '';
    document.getElementById('bsiEnd').value = b.end || '';

    document.getElementById('wModal').classList.add('open');
}

function saveWarranty() {
    if (!hasPerm('edit')) return;

    const warrantyData = {
        coverage: document.getElementById('wCoverage').value,
        start: document.getElementById('wStart').value,
        end: document.getElementById('wEnd').value,
        extra: document.getElementById('wExtra').value
    };

    const bsiData = {
        coverage: '',
        start: document.getElementById('bsiStart').value,
        end: document.getElementById('bsiEnd').value
    };

    if (updateWarranty(editWId, warrantyData, bsiData)) {
        closeModal('wModal');
        render();
        showToast('🛡️ บันทึกประกันแล้ว', 'ok');
    }
}

// ==================== COST MODAL ====================
function openCostModal(carId) {
    if (!hasPerm('edit')) return;

    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    const co = car.cost || { purchase: 0, repair: 0, other: 0 };

    const modal = document.createElement('div');
    modal.className = 'modal-bg open';
    modal.style.zIndex = '400';
    modal.innerHTML = `
        <div class="modal" style="max-width:clamp(320px, 40vw, 380px)">
            <div class="modal-title">💰 แก้ไขต้นทุน & กำไร</div>
            <div class="modal-sub">${esc(car.brand)} ${esc(car.name)}</div>
            <div class="form-group">
                <label>ราคาซื้อเข้า (บาท)</label>
                <input type="number" id="cost-p" value="${co.purchase}" inputmode="numeric">
            </div>
            <div class="form-group">
                <label>ค่าซ่อม/ตกแต่ง (บาท)</label>
                <input type="number" id="cost-r" value="${co.repair}" inputmode="numeric">
            </div>
            <div class="form-group">
                <label>ค่าดำเนินการอื่นๆ (บาท)</label>
                <input type="number" id="cost-o" value="${co.other}" inputmode="numeric">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">ยกเลิก</button>
                <button class="btn btn-gold" onclick="saveCostFromModal(${carId}, this.closest('.modal-bg'))">บันทึก</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
}

function saveCostFromModal(carId, modal) {
    const costData = {
        purchase: parseFloat(modal.querySelector('#cost-p').value) || 0,
        repair: parseFloat(modal.querySelector('#cost-r').value) || 0,
        other: parseFloat(modal.querySelector('#cost-o').value) || 0
    };

    if (updateCost(carId, costData)) {
        modal.remove();
        render();
        showToast('💰 บันทึกต้นทุนแล้ว', 'ok');
    }
}

// ==================== QR CODE MODAL ====================
function openQR(carId) {
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    document.getElementById('qrSub').textContent = car.brand + ' ' + car.name;
    document.getElementById('qrInfo').textContent =
        `ทะเบียน: ${car.plate} | VIN: ${car.vin || '—'} | ราคา: ${car.net} บาท`;

    const box = document.getElementById('qrBox');
    box.innerHTML = '';

    try {
        new QRCode(box, {
            text: `รถ: ${car.brand} ${car.name}\nปี: ${car.year}\nสี: ${car.color}\nทะเบียน: ${car.plate}\nVIN: ${car.vin || '—'}\nไมล์: ${car.mileage}\nราคา Net: ${car.net} บาท`,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (e) {
        box.innerHTML = '<div style="color:var(--red)">โหลด QR ไม่ได้</div>';
    }

    document.getElementById('qrModal').classList.add('open');
}

function downloadQR() {
    const canvas = document.querySelector('#qrBox canvas');
    if (!canvas) {
        showToast('ไม่มี QR Code', 'err');
        return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qr_car_' + Date.now() + '.png';
    link.click();
    showToast('📥 บันทึก QR แล้ว', 'ok');
}

// ==================== DATA MANAGEMENT MODAL ====================
function showDataManageModal() {
    if (!hasPerm('edit')) return;
    document.getElementById('dataManageModal').classList.add('open');
}

function backupData() {
    const data = {
        cars: window.cars,
        crmData: window.crmData,
        uiSettings: window.uiSettings,
        siteSettings: window.siteSettings,
        date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `StockCEO_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('📤 Backup สำเร็จ', 'ok');
}

function restoreData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.cars) {
                window.cars = data.cars;
                window.nextId = Math.max(...window.cars.map(c => c.id), 0) + 1;
                if (data.crmData) window.crmData = data.crmData;
                if (data.uiSettings) {
                    window.uiSettings = data.uiSettings;
                    applyUISettings();
                }
                SafeStore.set('stockCars', window.cars);
                SafeStore.set('stockCRM', window.crmData);
                render();
                closeModal('dataManageModal');
                showToast('📥 Restore สำเร็จ', 'ok');
            } else {
                throw new Error('ไฟล์ไม่ถูกต้อง');
            }
        } catch (err) {
            showToast('❌ Restore ไม่สำเร็จ: ' + err.message, 'err');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function importExcel(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const wb = XLSX.read(e.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            data.forEach(row => {
                const car = {
                    id: window.nextId++,
                    brand: row['ยี่ห้อ'] || row['brand'] || 'Unknown',
                    name: row['รุ่น'] || row['name'] || '',
                    year: parseInt(row['ปี'] || row['year']) || 2020,
                    color: row['สี'] || row['color'] || '-',
                    vin: row['VIN'] || row['vin'] || '',
                    mileage: row['ไมล์'] || row['mileage'] || '-',
                    plate: row['ทะเบียน'] || row['plate'] || '-',
                    sp: row['ราคา SP'] || row['sp'] || '0',
                    net: row['ราคา Net'] || row['net'] || '0',
                    location: row['สถานที่'] || row['location'] || '',
                    note: row['หมายเหตุ'] || row['note'] || '-',
                    status: 'show',
                    has360: (row['มี 360°'] || row['has360']) === 'มี' || row['has360'] === true,
                    img: PLACEHOLDER_IMAGE,
                    images: [PLACEHOLDER_IMAGE],
                    cost: {
                        purchase: parsePrice(row['ต้นทุน'] || row['cost'] || row['ราคาซื้อ'] || 0),
                        repair: 0,
                        other: 0
                    },
                    dateAdded: new Date().toISOString()
                };
                window.cars.push(car);
            });

            saveToLocalStorage();
            render();
            closeModal('dataManageModal');
            showToast(`📦 Import สำเร็จ ${data.length} คัน`, 'ok');
        } catch (err) {
            showToast('❌ Import ไม่สำเร็จ: ' + err.message, 'err');
        }
    };
    reader.readAsBinaryString(file);
    input.value = '';
}

// ==================== CONTACT MODAL ====================
function openContactModal() {
    document.getElementById('contactModal').classList.add('open');
}

// ==================== LOGO SETTINGS MODAL ====================
function handleLogoClick() {
    if (!hasPerm('edit')) return;

    document.getElementById('lm-sitename').value = window.siteSettings.name || '';
    document.getElementById('lm-logoUrl').value = window.siteSettings.logo || '';
    document.getElementById('logoModal').classList.add('open');
}

function saveLogo() {
    const name = document.getElementById('lm-sitename').value.trim();
    const url = document.getElementById('lm-logoUrl').value.trim();

    if (name) window.siteSettings.name = name;
    if (url || url === '') window.siteSettings.logo = url;

    SafeStore.set('siteSettings', window.siteSettings);
    applySiteSettings();
    closeModal('logoModal');
    showToast('✅ บันทึกการตั้งค่าแล้ว', 'ok');
}

// Logo File Input
document.addEventListener('DOMContentLoaded', () => {
    const logoInput = document.getElementById('logoFileInput');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(ev) {
                window.siteSettings.logo = ev.target.result;
                SafeStore.set('siteSettings', window.siteSettings);
                applySiteSettings();
                showToast('🎨 อัพโหลดโลโก้แล้ว', 'ok');
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }

    // Add Image URL Enter Key
    const aImgUrl = document.getElementById('a-img-url');
    if (aImgUrl) {
        aImgUrl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                aAddUrl();
            }
        });
    }

    // Lightbox URL Enter Key
    const lbUrlInput = document.getElementById('lbUrlInput');
    if (lbUrlInput) {
        lbUrlInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                lbApplyUrl();
            }
        });
    }

    // Cost calculation auto update
    ['a-cost', 'a-repair', 'a-other'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calcAddCost);
        }
    });

    // Add car file input
    const aFileInput = document.getElementById('a-file');
    if (aFileInput) {
        aFileInput.addEventListener('change', function(e) {
            const files = [...e.target.files];
            if (!files.length) return;

            const srcs = [];
            let done = 0;

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    srcs.push(ev.target.result);
                    done++;
                    if (done === files.length) {
                        aAddImages(srcs);
                    }
                };
                reader.readAsDataURL(file);
            });

            e.target.value = '';
        });
    }
});

// Export Functions
function exportToExcel() {
    const data = window.cars.map(c => ({
        'ID': c.id,
        'ยี่ห้อ': c.brand,
        'รุ่น': c.name,
        'ปี': c.year,
        'สี': c.color,
        'ทะเบียน': c.plate,
        'VIN': c.vin,
        'ไมล์': c.mileage,
        'ราคา SP': c.sp,
        'ราคา Net': c.net,
        'สถานะ': statusLabelThai(c.status),
        'สถานที่': c.location,
        'ต้นทุนรวม': calculateCost(c).total,
        'กำไร': c.status === 'sold' ? calculateProfit(c).profit : 0,
        'Margin%': c.status === 'sold' ? calculateProfit(c).margin.toFixed(1) : 0,
        'ลูกค้าสนใจ': (window.crmData[c.id] || []).length,
        'วันที่เพิ่ม': c.dateAdded ? new Date(c.dateAdded).toLocaleDateString('th-TH') : '—'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `Stock_CEO_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('📊 Export Excel สำเร็จ', 'ok');
}