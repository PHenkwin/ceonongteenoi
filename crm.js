// ==================== CRM.JS ====================
// Customer Relationship Management

// CRM State
let currentCRMCarId = null;

/**
 * เปิด Modal CRM
 */
function openCRM(carId) {
    if (!hasPerm('crm')) {
        showToast('❌ เฉพาะ Admin เท่านั้นที่เข้าถึง CRM ได้', 'err');
        return;
    }

    currentCRMCarId = carId;
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    document.getElementById('crmCarInfo').textContent =
        `จัดการลูกค้าที่สนใจ: ${car.brand} ${car.name}`;
    renderCRMList();
    document.getElementById('crmModal').classList.add('open');
}

/**
 * Render รายการลูกค้า
 */
function renderCRMList() {
    const leads = window.crmData[currentCRMCarId] || [];
    const container = document.getElementById('crmLeadsList');
    if (!container) return;

    if (!leads.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:clamp(16px, 2.5vw, 20px);color:var(--text-secondary);font-size:clamp(10px, 1.2vw, 11px)">
                📭 ยังไม่มีลูกค้าที่สนใจรถคันนี้<br>
                <small>กดปุ่ม ➕ เพื่อเพิ่ม หรือบันทึกจากใบเสนอราคา</small>
            </div>`;
        return;
    }

    const statusLabels = {
        'contact': 'ติดต่อแล้ว',
        'meeting': 'นัดดูรถ',
        'approve': 'รออนุมัติไฟแนนซ์',
        'close': 'ปิดการขาย',
        'cancel': 'ยกเลิก'
    };

    container.innerHTML = leads.map(lead => `
        <div class="crm-lead-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:clamp(3px, 0.4vw, 4px)">
                <div style="font-weight:600;font-size:clamp(11px, 1.3vw, 12px)">👤 ${esc(lead.name)}</div>
                <span class="crm-status ${lead.status}">${statusLabels[lead.status] || lead.status}</span>
            </div>
            <div style="font-size:clamp(9px, 1.1vw, 10px);color:var(--text-secondary);margin-bottom:clamp(2px, 0.3vw, 3px)">
                📱 ${esc(lead.tel || '—')} | ✉️ ${esc(lead.email || '—')} | 📅 ${formatThaiDate(lead.date)}
            </div>
            ${lead.note ? `<div style="font-size:clamp(9px, 1.1vw, 10px);color:var(--text-secondary);margin-top:clamp(2px, 0.3vw, 3px)">📝 ${esc(lead.note)}</div>` : ''}
            <div style="display:flex;gap:clamp(3px, 0.4vw, 4px);margin-top:clamp(3px, 0.4vw, 4px);flex-wrap:wrap">
                <button class="btn btn-outline" style="padding:clamp(2px, 0.3vw, 3px) clamp(5px, 0.7vw, 6px);font-size:clamp(8px, 1vw, 9px)" onclick="updateLeadStatus('${lead.id}', 'contact')">📞 ติดต่อ</button>
                <button class="btn btn-outline" style="padding:clamp(2px, 0.3vw, 3px) clamp(5px, 0.7vw, 6px);font-size:clamp(8px, 1vw, 9px)" onclick="updateLeadStatus('${lead.id}', 'meeting')">👁️ นัดดู</button>
                <button class="btn btn-outline" style="padding:clamp(2px, 0.3vw, 3px) clamp(5px, 0.7vw, 6px);font-size:clamp(8px, 1vw, 9px)" onclick="updateLeadStatus('${lead.id}', 'approve')">📋 อนุมัติ</button>
                <button class="btn btn-outline" style="padding:clamp(2px, 0.3vw, 3px) clamp(5px, 0.7vw, 6px);font-size:clamp(8px, 1vw, 9px)" onclick="updateLeadStatus('${lead.id}', 'close')">✅ ขาย</button>
                <button class="btn btn-outline" style="padding:clamp(2px, 0.3vw, 3px) clamp(5px, 0.7vw, 6px);font-size:clamp(8px, 1vw, 9px);color:var(--red)" onclick="updateLeadStatus('${lead.id}', 'cancel')">❌ ยกเลิก</button>
                <button class="btn btn-red" style="padding:clamp(2px, 0.3vw, 3px) clamp(5px, 0.7vw, 6px);font-size:clamp(8px, 1vw, 9px);margin-left:auto" onclick="deleteLead('${lead.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

/**
 * เปิด Modal เพิ่มลูกค้า
 */
function openAddLead() {
    if (!hasPerm('edit')) return;

    document.getElementById('lead-name').value = '';
    document.getElementById('lead-tel').value = '';
    document.getElementById('lead-email').value = '';
    document.getElementById('lead-note').value = '';
    document.getElementById('lead-status').value = 'contact';
    document.getElementById('addLeadModal').classList.add('open');
}

/**
 * บันทึกลูกค้าใหม่
 */
function saveLead() {
    if (!hasPerm('edit')) return;

    const name = document.getElementById('lead-name').value.trim();
    if (!name) {
        showToast('❗ กรุณากรอกชื่อลูกค้า', 'err');
        return;
    }

    if (!window.crmData[currentCRMCarId]) {
        window.crmData[currentCRMCarId] = [];
    }

    const newLead = {
        id: generateId(),
        name: name,
        tel: document.getElementById('lead-tel').value.trim(),
        email: document.getElementById('lead-email').value.trim(),
        status: document.getElementById('lead-status').value,
        note: document.getElementById('lead-note').value.trim(),
        date: new Date().toISOString()
    };

    window.crmData[currentCRMCarId].unshift(newLead);
    SafeStore.set('stockCRM', window.crmData);

    closeModal('addLeadModal');
    renderCRMList();
    renderGrid();
    showToast('👤 เพิ่มลูกค้าแล้ว', 'ok');
}

/**
 * โหลดลูกค้าจากใบเสนอราคา
 */
function loadLeadsFromQuote() {
    if (!hasPerm('edit')) return;

    const name = document.getElementById('q-name')?.value.trim();
    const tel = document.getElementById('q-tel')?.value.trim();

    if (!name && !tel) {
        showToast('❗ ไม่มีข้อมูลในใบเสนอราคา', 'err');
        return;
    }

    if (!window.crmData[currentCRMCarId]) {
        window.crmData[currentCRMCarId] = [];
    }

    const newLead = {
        id: generateId(),
        name: name || 'ลูกค้า',
        tel: tel,
        email: '',
        status: 'contact',
        note: 'บันทึกจากใบเสนอราคา',
        date: new Date().toISOString()
    };

    window.crmData[currentCRMCarId].unshift(newLead);
    SafeStore.set('stockCRM', window.crmData);

    renderCRMList();
    renderGrid();
    showToast('📄 โหลดจากใบเสนอราคาแล้ว', 'ok');
}

/**
 * อัพเดทสถานะลูกค้า
 */
function updateLeadStatus(leadId, newStatus) {
    if (!hasPerm('edit')) return;

    const leads = window.crmData[currentCRMCarId] || [];
    const lead = leads.find(l => l.id === leadId);

    if (lead) {
        lead.status = newStatus;

        // ถ้าปิดการขาย ให้เปลี่ยนสถานะรถเป็นขายแล้ว
        if (newStatus === 'close') {
            const car = window.cars.find(c => c.id === currentCRMCarId);
            if (car) {
                car.status = 'sold';
                saveQuoteHistory(currentCRMCarId, lead.name, {
                    financeId: '',
                    financeName: '—',
                    months: 0,
                    downPercent: 0,
                    useAnnuity: false,
                    result: {
                        monthlyPayment: 0,
                        carPrice: parsePrice(car.net),
                        downPayment: 0,
                        loanAmount: 0,
                        totalInterest: 0,
                        totalPayment: 0
                    }
                });
                saveToLocalStorage();
                cloudSave();
            }
        }

        SafeStore.set('stockCRM', window.crmData);
        renderCRMList();
        renderGrid();
        showToast(`✅ อัพเดทสถานะ: ${newStatus}`, 'ok');
    }
}

/**
 * ลบข้อมูลลูกค้า
 */
function deleteLead(leadId) {
    if (!hasPerm('edit')) return;

    if (!confirm('คุณแน่ใจที่จะลบข้อมูลลูกค้านี้?')) return;

    window.crmData[currentCRMCarId] = (window.crmData[currentCRMCarId] || [])
        .filter(l => l.id !== leadId);

    SafeStore.set('stockCRM', window.crmData);
    renderCRMList();
    renderGrid();
    showToast('🗑️ ลบข้อมูลลูกค้าแล้ว', 'ok');
}

/**
 * สรุป CRM Dashboard
 */
function getCRMStats() {
    const stats = {
        total: 0,
        contact: 0,
        meeting: 0,
        approve: 0,
        close: 0,
        cancel: 0
    };

    Object.values(window.crmData).forEach(leads => {
        leads.forEach(lead => {
            stats.total++;
            if (stats[lead.status] !== undefined) {
                stats[lead.status]++;
            }
        });
    });

    return stats;
}