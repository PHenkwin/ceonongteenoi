// ==================== QUOTE-ENGINE.JS ====================
// Quote & Finance Calculation Engine

// Quote State
let quoteCarId = null;
let selectedTerm = 60;
let comparePlans = [];

/**
 * เปิด Modal ใบเสนอราคา
 */
function openQuote(carId) {
    quoteCarId = carId;
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    // Reset form
    document.getElementById('q-name').value = '';
    document.getElementById('q-tel').value = '';
    document.getElementById('q-downPercent').value = window.financeSettings.minDownPayment || 15;
    document.getElementById('calcMode').checked = false;

    renderFinanceChips();
    renderTermChips();
    updateQuotePreview();

    document.getElementById('quoteModal').classList.add('open');
}

// ==================== FINANCE CHIPS ====================
function renderFinanceChips() {
    const container = document.getElementById('financeChips');
    if (!container) return;

    const selectedCompany = window.financeSettings.selectedCompany;

    container.innerHTML = FINANCE_COMPANIES.map(fc => {
        const isActive = fc.id === selectedCompany;
        return `
            <button class="finance-chip ${isActive ? 'active' : ''}"
                style="border-color:${isActive ? fc.color : 'var(--border)'};color:${isActive ? fc.color : 'var(--text-secondary)'}"
                onclick="selectFinance('${fc.id}')">
                ${fc.name}
                ${fc.id !== 'custom' ? `<span style="font-size:clamp(7px, 0.9vw, 8px);opacity:.7">(${fc.defaultRate}%)</span>` : ''}
            </button>
        `;
    }).join('');

    // Show/hide custom rate input
    const customRateBox = document.getElementById('customRateBox');
    if (customRateBox) {
        customRateBox.style.display = selectedCompany === 'custom' ? 'block' : 'none';
        if (selectedCompany === 'custom') {
            document.getElementById('customRateInput').value = window.financeSettings.customRate;
        }
    }
}

function selectFinance(financeId) {
    window.financeSettings.selectedCompany = financeId;
    SafeStore.set('financeSettings', window.financeSettings);
    renderFinanceChips();
    updateQuotePreview();
}

// ==================== TERM CHIPS ====================
function renderTermChips() {
    const container = document.getElementById('termChips');
    if (!container) return;

    container.innerHTML = window.financeSettings.loanTerms.map(months => {
        const isActive = months === selectedTerm;
        const label = months >= 12 ? (months / 12) + ' ปี' : months + ' เดือน';
        return `
            <button class="term-chip ${isActive ? 'active' : ''}"
                onclick="selectTerm(${months})">
                ${label}
            </button>
        `;
    }).join('');
}

function selectTerm(months) {
    selectedTerm = months;
    renderTermChips();
    updateQuotePreview();
}

// ==================== CALCULATION ====================
function updateQuotePreview() {
    if (!quoteCarId) return;

    const car = window.cars.find(c => c.id === quoteCarId);
    if (!car) return;

    const carPrice = parsePrice(car.net);
    const downPercent = parseInt(document.getElementById('q-downPercent')?.value) || 0;
    document.getElementById('downPercentDisplay').textContent = downPercent + '%';

    // Get interest rate
    let annualRate = FINANCE_COMPANIES.find(f => f.id === window.financeSettings.selectedCompany)?.defaultRate || 3.0;
    if (window.financeSettings.selectedCompany === 'custom') {
        annualRate = parseFloat(document.getElementById('customRateInput')?.value) || 3.0;
        window.financeSettings.customRate = annualRate;
        SafeStore.set('financeSettings', window.financeSettings);
    }

    const useAnnuity = document.getElementById('calcMode')?.checked || false;
    const result = calculateInstallment(carPrice, annualRate, selectedTerm, downPercent, useAnnuity);

    const resultBox = document.getElementById('calculationResult');
    if (!resultBox) return;

    if (result.error) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `<div style="color:var(--red);text-align:center">⚠️ ${result.error}</div>`;
        renderQuotePreview();
        return;
    }

    // Update result display
    resultBox.style.display = 'block';
    const fields = {
        'res-carPrice': formatBaht(result.carPrice),
        'res-down': formatBaht(result.downPayment) + ` (${result.downPaymentPercent}%)`,
        'res-loan': formatBaht(result.loanAmount),
        'res-interest': formatBaht(result.totalInterest),
        'res-total': formatBaht(result.totalPayment),
        'res-effRate': result.effectiveRate.toFixed(2) + '% APR',
        'res-monthly': formatBaht(result.monthlyPayment) + '/เดือน',
        'res-calcType': result.type === 'annuity' ? '* คำนวณแบบลดต้นลดดอก (APR)' : '* คำนวณแบบ Flat Rate'
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    renderQuotePreview();
}

function renderQuotePreview() {
    if (!quoteCarId) return;

    const car = window.cars.find(c => c.id === quoteCarId);
    if (!car) return;

    const customerName = document.getElementById('q-name')?.value || '';
    const customerTel = document.getElementById('q-tel')?.value || '';
    const selectedFinance = FINANCE_COMPANIES.find(f => f.id === window.financeSettings.selectedCompany);

    // Finance info box
    let financeHtml = '';
    const resultBox = document.getElementById('calculationResult');
    if (resultBox && resultBox.style.display !== 'none' && !resultBox.querySelector('[style*="color:var(--red)"]')) {
        financeHtml = `
            <div class="quote-finance-box">
                <div class="quote-finance-title">
                    🏦 ${selectedFinance?.name || 'สถาบันการเงิน'} · อัตรา ${document.getElementById('res-effRate')?.textContent || '—'}
                </div>
                <div class="quote-finance-grid">
                    <div>💰 ดาวน์: <strong>${document.getElementById('res-down')?.textContent || '—'}</strong></div>
                    <div>📅 ระยะเวลา: <strong>${selectedTerm} เดือน</strong></div>
                    <div>📊 ดอกเบี้ยรวม: <strong>${document.getElementById('res-interest')?.textContent || '—'}</strong></div>
                    <div>💸 ผ่อน/เดือน: <strong style="color:#c9a84c;font-size:clamp(10px, 1.2vw, 11px)">${document.getElementById('res-monthly')?.textContent || '—'}</strong></div>
                </div>
                <div style="font-size:clamp(7px, 0.9vw, 8px);color:#888;margin-top:clamp(3px, 0.4vw, 4px)">
                    ${document.getElementById('res-calcType')?.textContent || ''}
                </div>
            </div>`;
    }

    const preview = document.getElementById('quotePreview');
    if (!preview) return;

    preview.innerHTML = `
        <div class="quote-preview" id="printableQuote">
            <div class="quote-header">
                <div style="display:flex;align-items:center;gap:clamp(6px, 0.8vw, 8px)">
                    ${window.siteSettings.logo ? `<img src="${window.siteSettings.logo}" style="height:clamp(24px, 3vw, 32px);border-radius:clamp(3px, 0.5vw, 4px)">` : ''}
                    <div class="quote-logo">${esc(window.siteSettings.name || 'Stock CEO')}</div>
                </div>
                <div style="text-align:right;font-size:clamp(9px, 1.1vw, 10px);color:#666">
                    <div>วันที่: ${new Date().toLocaleDateString('th-TH', {year:'numeric', month:'long', day:'numeric'})}</div>
                    ${customerName ? `<div>ลูกค้า: ${esc(customerName)}</div>` : ''}
                    ${customerTel ? `<div>โทร: ${esc(customerTel)}</div>` : ''}
                </div>
            </div>
            <div class="quote-title">📄 ใบเสนอราคา + แผนผ่อน</div>
            <div class="quote-row"><span class="quote-key">ยี่ห้อ</span><span class="quote-val">${esc(car.brand)}</span></div>
            <div class="quote-row"><span class="quote-key">รุ่น</span><span class="quote-val">${esc(car.name)}</span></div>
            <div class="quote-row"><span class="quote-key">ปี</span><span class="quote-val">${car.year}</span></div>
            <div class="quote-row"><span class="quote-key">สี</span><span class="quote-val">${esc(car.color)}</span></div>
            <div class="quote-row"><span class="quote-key">เลขไมล์</span><span class="quote-val">${esc(car.mileage)} กม.</span></div>
            <div class="quote-row"><span class="quote-key">ทะเบียน</span><span class="quote-val">${esc(car.plate)}</span></div>
            <div class="quote-row"><span class="quote-key">เลขตัวถัง</span><span class="quote-val" style="font-family:monospace">${esc(car.vin || '—')}</span></div>
            ${car.warranty?.end ? `<div class="quote-row"><span class="quote-key">ประกัน</span><span class="quote-val">ถึง ${car.warranty.end}</span></div>` : ''}
            ${car.note && car.note !== '-' ? `<div class="quote-row"><span class="quote-key">หมายเหตุ</span><span class="quote-val">${esc(car.note)}</span></div>` : ''}
            ${financeHtml}
            <div class="quote-price-box">
                <div style="font-size:clamp(9px, 1.1vw, 10px);color:#888;margin-bottom:clamp(2px, 0.3vw, 4px)">ราคาพิเศษ (SP): <s>${esc(car.sp)} บาท</s></div>
                <div class="quote-net">${esc(car.net)}</div>
                <div style="font-size:clamp(9px, 1.1vw, 10px);color:#c9a84c;font-weight:600">บาท (Net)</div>
            </div>
            <div class="quote-footer">
                ราคานี้มีผลวันนี้เท่านั้น · ขอบคุณที่ไว้วางใจ ${esc(window.siteSettings.name || 'Stock CEO')}<br>
                <span style="font-size:clamp(7px, 0.9vw, 8px);color:#aaa">* อัตราผ่อนคำนวณแบบประมาณการ</span>
            </div>
        </div>`;
}

// ==================== COPY & PRINT ====================
function copyQuote() {
    const car = window.cars.find(c => c.id === quoteCarId);
    if (!car) return;

    const financeName = FINANCE_COMPANIES.find(f => f.id === window.financeSettings.selectedCompany)?.name || 'สถาบันการเงิน';
    const monthlyText = document.getElementById('res-monthly')?.textContent || '—';
    const downText = document.getElementById('res-down')?.textContent || '—';

    const text = `🚗 ${car.brand} ${car.name}
📅 ปี: ${car.year} | 🎨 สี: ${car.color}
🪪 ทะเบียน: ${car.plate} | VIN: ${car.vin || '—'}
💰 ราคา: ${car.net} บาท

🏦 ${financeName}
💸 ผ่อน: ${monthlyText}
💰 ดาวน์: ${downText}

📞 ${window.siteSettings.name || 'Stock CEO'}
📱 064-924-6689 | Line: @ocshop518`;

    navigator.clipboard?.writeText(text)
        .then(() => showToast('📋 คัดลอกแล้ว', 'ok'))
        .catch(() => showToast('❌ คัดลอกไม่ได้', 'err'));
}

function printQuote() {
    const el = document.getElementById('printableQuote');
    if (!el) return;

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>ใบเสนอราคา</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Noto Sans Thai','Tahoma',sans-serif;padding:24px;background:#fff;color:#111;font-size:11px;line-height:1.5}
                .quote-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #c9a84c}
                .quote-logo{font-family:'Playfair Display',serif;font-size:18px;font-weight:900;color:#c9a84c}
                .quote-title{font-size:14px;font-weight:700;margin:12px 0}
                .quote-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}
                .quote-key{color:#666}
                .quote-val{font-weight:600}
                .quote-price-box{background:#f8f3e8;border:2px solid #c9a84c;border-radius:5px;padding:10px;margin:10px 0;text-align:center}
                .quote-net{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#c9a84c}
                .quote-footer{margin-top:10px;padding-top:8px;border-top:1px solid #eee;font-size:9px;color:#999;text-align:center}
                .quote-finance-box{background:#fff9e6;border:2px solid #c9a84c;border-radius:5px;padding:10px;margin:10px 0}
                .quote-finance-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:10px}
                .quote-finance-title{font-size:9px;color:#888;margin-bottom:4px}
                @media print{body{padding:12px}}
            </style>
        </head>
        <body>${el.outerHTML}</body>
        </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 250);
}

// ==================== COMPARE PLANS ====================
function addComparePlan() {
    if (!quoteCarId) return;

    const car = window.cars.find(c => c.id === quoteCarId);
    if (!car) return;

    const carPrice = parsePrice(car.net);
    let annualRate = FINANCE_COMPANIES.find(f => f.id === window.financeSettings.selectedCompany)?.defaultRate || 3.0;
    if (window.financeSettings.selectedCompany === 'custom') {
        annualRate = parseFloat(document.getElementById('customRateInput')?.value) || 3.0;
    }

    const downPercent = parseInt(document.getElementById('q-downPercent')?.value) || 0;
    const useAnnuity = document.getElementById('calcMode')?.checked || false;
    const result = calculateInstallment(carPrice, annualRate, selectedTerm, downPercent, useAnnuity);

    if (result.error) {
        showToast('⚠️ ' + result.error, 'err');
        return;
    }

    if (comparePlans.length >= MAX_COMPARE_PLANS) {
        showToast(`⚠️ เปรียบเทียบได้สูงสุด ${MAX_COMPARE_PLANS} แผน`, 'err');
        return;
    }

    comparePlans.push({
        id: Date.now(),
        financeId: window.financeSettings.selectedCompany,
        financeName: FINANCE_COMPANIES.find(f => f.id === window.financeSettings.selectedCompany)?.name || 'กำหนดเอง',
        rate: annualRate,
        downPercent: downPercent,
        months: selectedTerm,
        useAnnuity: useAnnuity,
        result: result
    });

    showToast('✅ เพิ่มแผนเปรียบเทียบแล้ว', 'ok');
    updateQuotePreview();
}

function showComparePlans() {
    if (comparePlans.length === 0) return;

    const modal = document.createElement('div');
    modal.className = 'modal-bg open';
    modal.style.zIndex = '500';
    modal.innerHTML = `
        <div class="modal" style="max-width:clamp(750px, 85vw, 850px);max-height:95vh;overflow-y:auto">
            <div class="modal-title">⚖️ เปรียบเทียบแผนผ่อน</div>
            <div class="modal-sub">เลือกรายการที่ดีที่สุด</div>
            <div style="overflow-x:auto;margin:clamp(10px, 1.2vw, 12px) 0">
                <table class="compare-table" style="font-size:clamp(10px, 1.2vw, 11px);min-width:clamp(500px, 60vw, 600px)">
                    <thead>
                        <tr>
                            <th style="width:clamp(100px, 12vw, 120px);background:var(--bg-input)">รายการ</th>
                            ${comparePlans.map(p => {
                                const fc = FINANCE_COMPANIES.find(f => f.id === p.financeId);
                                return `
                                    <th style="position:relative">
                                        <div style="color:${fc?.color || 'var(--gold)'}">${p.financeName}</div>
                                        <div style="font-size:clamp(8px, 1vw, 9px);color:var(--text-secondary)">
                                            ${p.useAnnuity ? 'APR' : 'Flat'} ${p.rate}%
                                        </div>
                                        <button onclick="removeComparePlan(${p.id})"
                                            style="position:absolute;top:2px;right:2px;background:rgba(224,85,85,.15);border:none;border-radius:50%;width:18px;height:18px;color:var(--red);font-size:12px;cursor:pointer">
                                            ✕
                                        </button>
                                    </th>
                                `;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>💰 ราคารถ</td>${comparePlans.map(p => `<td>${formatBaht(p.result.carPrice)}</td>`).join('')}</tr>
                        <tr><td>📥 เงินดาวน์</td>${comparePlans.map(p => `<td>${formatBaht(p.result.downPayment)} (${p.downPercent}%)</td>`).join('')}</tr>
                        <tr><td>🏦 ยอดกู้</td>${comparePlans.map(p => `<td style="color:var(--gold)">${formatBaht(p.result.loanAmount)}</td>`).join('')}</tr>
                        <tr><td>📊 ดอกเบี้ยรวม</td>${comparePlans.map(p => `<td style="color:var(--red)">${formatBaht(p.result.totalInterest)}</td>`).join('')}</tr>
                        <tr><td>💸 รวมจ่ายทั้งหมด</td>${comparePlans.map(p => `<td><strong>${formatBaht(p.result.totalPayment)}</strong></td>`).join('')}</tr>
                        <tr><td>📅 ระยะเวลา</td>${comparePlans.map(p => `<td>${p.months} เดือน</td>`).join('')}</tr>
                        <tr style="background:rgba(201,168,76,.08)">
                            <td><strong>💸 ผ่อน/เดือน</strong></td>
                            ${comparePlans.map(p => {
                                const minMonthly = Math.min(...comparePlans.map(x => x.result.monthlyPayment));
                                const isBest = p.result.monthlyPayment === minMonthly && comparePlans.length > 1;
                                return `<td style="${isBest ? 'color:var(--green);font-weight:700' : ''}">
                                    ${formatBaht(p.result.monthlyPayment)}
                                    ${isBest ? '<div style="font-size:8px;color:var(--green)">✓ ต่ำสุด</div>' : ''}
                                </td>`;
                            }).join('')}
                        </tr>
                        <tr><td>🧮 สูตร</td>${comparePlans.map(p => `<td>${p.useAnnuity ? 'ลดต้นลดดอก' : 'Flat Rate'}</td>`).join('')}</tr>
                    </tbody>
                </table>
            </div>
            <div style="display:flex;gap:clamp(6px, 0.8vw, 8px);flex-wrap:wrap;margin-top:clamp(10px, 1.2vw, 12px)">
                <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">❌ ปิด</button>
                <button class="btn btn-blue" onclick="copyCompareTable()">📋 คัดลอก</button>
                <button class="btn btn-gold" onclick="printComparePlans()">🖨️ พิมพ์</button>
                <button class="btn btn-green" onclick="selectBestPlan()" style="margin-left:auto">✅ เลือกแผนนี้</button>
            </div>
            <div style="font-size:clamp(8px, 1vw, 9px);color:var(--text-secondary);margin-top:clamp(6px, 0.8vw, 8px);text-align:center">
                * การคำนวณเป็นแบบประมาณการ
            </div>
        </div>`;

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

function removeComparePlan(planId) {
    comparePlans = comparePlans.filter(p => p.id !== planId);
    showToast('🗑️ ลบแผนแล้ว', 'ok');

    // Remove all compare modal instances
    document.querySelectorAll('.modal-bg[style*="z-index:500"]').forEach(m => m.remove());

    if (comparePlans.length > 0) {
        showComparePlans();
    } else {
        updateQuotePreview();
    }
}

function selectBestPlan() {
    if (comparePlans.length === 0) return;

    const best = comparePlans.reduce((min, p) =>
        p.result.monthlyPayment < min.result.monthlyPayment ? p : min
    );

    window.financeSettings.selectedCompany = best.financeId;
    document.getElementById('q-downPercent').value = best.downPercent;
    selectedTerm = best.months;
    document.getElementById('calcMode').checked = best.useAnnuity;

    renderFinanceChips();
    renderTermChips();
    updateQuotePreview();

    document.querySelectorAll('.modal-bg[style*="z-index:500"]').forEach(m => m.remove());
    showToast(`✅ เลือกแผน ${best.financeName}`, 'ok');
}

function copyCompareTable() {
    const car = window.cars.find(c => c.id === quoteCarId);
    if (!car) return;

    let text = `🚗 เปรียบเทียบแผนผ่อน: ${car.brand} ${car.name}\nราคา: ${formatBaht(parsePrice(car.net))}\n\n`;

    comparePlans.forEach((p, i) => {
        text += `【${i + 1}】${p.financeName} (${p.useAnnuity ? 'APR' : 'Flat'} ${p.rate}%)\n`;
        text += `💰 ดาวน์: ${formatBaht(p.result.downPayment)}\n`;
        text += `💸 ผ่อน/เดือน: ${formatBaht(p.result.monthlyPayment)} × ${p.months} เดือน\n`;
        text += `📊 ดอกเบี้ยรวม: ${formatBaht(p.result.totalInterest)}\n\n`;
    });

    navigator.clipboard?.writeText(text)
        .then(() => showToast('📋 คัดลอกแล้ว', 'ok'))
        .catch(() => showToast('❌ คัดลอกไม่ได้', 'err'));
}

function printComparePlans() {
    const car = window.cars.find(c => c.id === quoteCarId);
    if (!car) return;

    const win = window.open('', '_blank');
    const monthlyValues = comparePlans.map(p => p.result.monthlyPayment);
    const minMonthly = Math.min(...monthlyValues);

    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>เปรียบเทียบแผนผ่อน</title>
            <style>
                body{font-family:'Noto Sans Thai',Tahoma,sans-serif;padding:16px;font-size:11px}
                table{width:100%;border-collapse:collapse;margin:10px 0}
                th,td{border:1px solid #ddd;padding:6px;text-align:left}
                th{background:#f5f5f5}
                .best{color:#2e7d32;font-weight:700}
            </style>
        </head>
        <body>
            <h2>🚗 เปรียบเทียบแผนผ่อน: ${car.brand} ${car.name}</h2>
            <p>ราคารถ: ${formatBaht(parsePrice(car.net))}</p>
            <table>
                <thead>
                    <tr>
                        <th>รายการ</th>
                        ${comparePlans.map(p => `<th>${p.financeName}<br><small>${p.useAnnuity ? 'APR' : 'Flat'} ${p.rate}%</small></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr><td>💰 เงินดาวน์</td>${comparePlans.map(p => `<td>${formatBaht(p.result.downPayment)} (${p.downPercent}%)</td>`).join('')}</tr>
                    <tr><td>🏦 ยอดกู้</td>${comparePlans.map(p => `<td>${formatBaht(p.result.loanAmount)}</td>`).join('')}</tr>
                    <tr><td>💸 ผ่อน/เดือน</td>${comparePlans.map(p => {
                        const isBest = p.result.monthlyPayment === minMonthly && comparePlans.length > 1;
                        return `<td class="${isBest ? 'best' : ''}">${formatBaht(p.result.monthlyPayment)}${isBest ? ' ✓' : ''}</td>`;
                    }).join('')}</tr>
                    <tr><td>💸 รวมจ่าย</td>${comparePlans.map(p => `<td><strong>${formatBaht(p.result.totalPayment)}</strong></td>`).join('')}</tr>
                </tbody>
            </table>
            <p style="font-size:9px;color:#666;margin-top:16px">* การคำนวณเป็นแบบประมาณการ</p>
        </body>
        </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 250);
}

// ==================== EXPORT INSTALLMENT TABLE ====================
function exportInstallmentTable(carId) {
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    const carPrice = parsePrice(car.net);
    let annualRate = FINANCE_COMPANIES.find(f => f.id === window.financeSettings.selectedCompany)?.defaultRate || 3.0;
    if (window.financeSettings.selectedCompany === 'custom') {
        annualRate = parseFloat(document.getElementById('customRateInput')?.value) || 3.0;
    }

    const downPercent = parseInt(document.getElementById('q-downPercent')?.value) || 0;
    const useAnnuity = document.getElementById('calcMode')?.checked || false;
    const result = calculateInstallment(carPrice, annualRate, selectedTerm, downPercent, useAnnuity);

    if (result.error) {
        showToast('⚠️ ' + result.error, 'err');
        return;
    }

    const rows = [['งวดที่', 'ยอดผ่อน', 'เงินต้น', 'ดอกเบี้ย', 'คงเหลือ']];
    let remaining = result.loanAmount;

    if (result.type === 'annuity') {
        const monthlyRate = annualRate / 1200;
        for (let i = 1; i <= result.months; i++) {
            const interest = remaining * monthlyRate;
            const principal = result.monthlyPayment - interest;
            remaining -= principal;
            rows.push([
                i,
                result.monthlyPayment.toFixed(2),
                principal.toFixed(2),
                interest.toFixed(2),
                Math.max(0, remaining).toFixed(2)
            ]);
        }
    } else {
        const monthlyPrincipal = result.loanAmount / result.months;
        const monthlyInterest = result.totalInterest / result.months;
        for (let i = 1; i <= result.months; i++) {
            remaining -= monthlyPrincipal;
            rows.push([
                i,
                result.monthlyPayment.toFixed(2),
                monthlyPrincipal.toFixed(2),
                monthlyInterest.toFixed(2),
                Math.max(0, remaining).toFixed(2)
            ]);
        }
    }

    // Add summary rows
    rows.push([]);
    rows.push(['สรุป', '', '', '', '']);
    rows.push(['ราคารถ', '', '', '', formatBaht(result.carPrice)]);
    rows.push(['เงินดาวน์', '', '', '', formatBaht(result.downPayment)]);
    rows.push(['ยอดกู้', '', '', '', formatBaht(result.loanAmount)]);
    rows.push(['ดอกเบี้ยรวม', '', '', '', formatBaht(result.totalInterest)]);
    rows.push(['รวมจ่ายทั้งหมด', '', '', '', formatBaht(result.totalPayment)]);
    rows.push(['ผ่อน/เดือน', '', '', '', formatBaht(result.monthlyPayment)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 8 },  // งวด
        { wch: 15 }, // ยอดผ่อน
        { wch: 15 }, // เงินต้น
        { wch: 15 }, // ดอกเบี้ย
        { wch: 15 }  // คงเหลือ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ตารางผ่อน');
    XLSX.writeFile(wb, `ตารางผ่อน_${car.brand}_${car.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('📊 Export ตารางผ่อนสำเร็จ', 'ok');
}

// ==================== QUOTE HISTORY ====================
function saveQuoteHistory(carId, customerName, plan) {
    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    const history = SafeStore.get('quoteHistory', []);
    history.unshift({
        id: Date.now(),
        carId: carId,
        carName: `${car.brand} ${car.name}`,
        carPlate: car.plate,
        customer: customerName || 'ไม่ระบุ',
        tel: document.getElementById('q-tel')?.value || '',
        plan: plan,
        quotedAt: new Date().toISOString(),
        quotedBy: window.currentUser?.email || 'Local'
    });

    // Keep only last 100 records
    if (history.length > 100) history.pop();

    SafeStore.set('quoteHistory', history);
}

function showQuoteHistory() {
    const history = SafeStore.get('quoteHistory', []);

    const modal = document.createElement('div');
    modal.className = 'modal-bg open';
    modal.style.zIndex = '500';

    if (history.length === 0) {
        modal.innerHTML = `
            <div class="modal" style="max-width:clamp(400px, 50vw, 450px)">
                <div class="modal-title">📋 ประวัติใบเสนอราคา</div>
                <div style="text-align:center;padding:clamp(20px, 3vw, 30px);color:var(--text-secondary)">
                    <div style="font-size:clamp(28px, 5vw, 36px);margin-bottom:clamp(8px, 1vw, 12px)">📭</div>
                    <div>ยังไม่มีประวัติ</div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">ปิด</button>
                </div>
            </div>`;
    } else {
        modal.innerHTML = `
            <div class="modal" style="max-width:clamp(550px, 65vw, 600px);max-height:90vh;overflow-y:auto">
                <div class="modal-title">📋 ประวัติใบเสนอราคา</div>
                <div class="modal-sub">ทั้งหมด ${history.length} รายการ</div>
                <div style="display:flex;flex-direction:column;gap:clamp(6px, 0.8vw, 8px)">
                    ${history.map(h => `
                        <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:clamp(6px, 0.8vw, 8px);padding:clamp(8px, 1vw, 10px);cursor:pointer"
                            onclick="loadQuoteFromHistory(${h.id})"
                            onmouseover="this.style.borderColor='var(--gold)'"
                            onmouseout="this.style.borderColor='var(--border)'">
                            <div style="display:flex;justify-content:space-between;align-items:start">
                                <div>
                                    <div style="font-weight:600;color:var(--gold)">${esc(h.carName)}</div>
                                    <div style="font-size:clamp(9px, 1.1vw, 10px);color:var(--text-secondary);margin:clamp(2px, 0.3vw, 4px) 0">
                                        🪪 ${esc(h.carPlate)} | 👤 ${esc(h.customer)} | 📱 ${esc(h.tel || '—')}
                                    </div>
                                    <div style="font-size:clamp(9px, 1.1vw, 10px);color:var(--text-secondary)">
                                        💸 ${formatBaht(h.plan.result.monthlyPayment)}/เดือน × ${h.plan.months} เดือน | 🏦 ${h.plan.financeName}
                                    </div>
                                </div>
                                <div style="text-align:right;font-size:clamp(8px, 1vw, 9px);color:var(--text-secondary)">
                                    ${formatThaiDate(h.quotedAt)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer" style="margin-top:clamp(10px, 1.2vw, 12px)">
                    <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">❌ ปิด</button>
                    <button class="btn btn-red" onclick="if(confirm('ล้างประวัติทั้งหมด?')){localStorage.removeItem('quoteHistory');this.closest('.modal-bg').remove();showToast('🗑️ ล้างประวัติแล้ว','ok')}" style="margin-left:auto">🗑️ ล้างทั้งหมด</button>
                </div>
            </div>`;
    }

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

function loadQuoteFromHistory(historyId) {
    const history = SafeStore.get('quoteHistory', []);
    const item = history.find(h => h.id === historyId);
    if (!item) return;

    quoteCarId = item.carId;
    document.getElementById('q-name').value = item.customer || '';
    document.getElementById('q-tel').value = item.tel || '';
    window.financeSettings.selectedCompany = item.plan.financeId;
    document.getElementById('q-downPercent').value = item.plan.downPercent;
    selectedTerm = item.plan.months;

    // Close all open modals
    document.querySelectorAll('.modal-bg[style*="z-index:500"]').forEach(m => m.remove());
    document.getElementById('quoteModal').classList.add('open');

    renderFinanceChips();
    renderTermChips();
    updateQuotePreview();
    showToast('📋 โหลดประวัติแล้ว', 'ok');
}