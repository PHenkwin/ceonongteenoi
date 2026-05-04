// ==================== UI-RENDER.JS ====================
// UI Rendering Functions

let currentSort = 'name-asc';
let activeFilter = 'all';
let activeStatusFilter = '';
let currentTab = 'stock';
let compareIds = [];
let searchDebounceTimer = null;

/**
 * Main Render Function
 */
function render() {
    renderStats();
    renderFilters();
    renderGrid();
    checkAlerts();
}

/**
 * Render Stats Bar
 */
function renderStats() {
    const total = window.cars.length;
    const show = window.cars.filter(c => c.status === 'show').length;
    const sold = window.cars.filter(c => c.status === 'sold').length;
    const hold = window.cars.filter(c => c.status === 'hold').length;
    const archived = window.cars.filter(c => c.status === 'archived').length;

    const netSum = window.cars.reduce((a, c) => a + (parsePrice(c.net) || 0), 0);
    const profitSum = window.cars
        .filter(c => c.status === 'sold')
        .reduce((a, c) => a + (calculateProfit(c).profit || 0), 0);

    const statBar = document.getElementById('statsBar');
    if (!statBar) return;

    statBar.innerHTML = `
        <div class="stat" onclick="setFilter('all')">
            <div class="stat-val">${total}</div>
            <div class="stat-lbl">รถทั้งหมด</div>
        </div>
        <div class="stat" onclick="filterByStatus('show')">
            <div class="stat-val" style="color:var(--green)">${show}</div>
            <div class="stat-lbl">จอดโชว์</div>
        </div>
        <div class="stat" onclick="filterByStatus('sold')">
            <div class="stat-val" style="color:var(--red)">${sold}</div>
            <div class="stat-lbl">ขายแล้ว</div>
        </div>
        <div class="stat" onclick="filterByStatus('hold')">
            <div class="stat-val" style="color:var(--gold)">${hold}</div>
            <div class="stat-lbl">จอง</div>
        </div>
        <div class="stat">
            <div class="stat-val" style="font-size:clamp(14px, 1.8vw, 16px)">${netSum.toLocaleString('th-TH')}</div>
            <div class="stat-lbl">มูลค่ารวม</div>
        </div>
        <div class="stat">
            <div class="stat-val" style="font-size:clamp(14px, 1.8vw, 16px);color:var(--green)">${profitSum.toLocaleString('th-TH')}</div>
            <div class="stat-lbl">กำไรขายแล้ว</div>
        </div>`;
}

/**
 * Render Filter Chips
 */
function renderFilters() {
    const brands = ['all', ...new Set(window.cars.map(c => c.brand))];
    const counts = { all: window.cars.length };
    window.cars.forEach(c => {
        counts[c.brand] = (counts[c.brand] || 0) + 1;
    });

    const brandChips = brands.map(b => {
        const isActive = activeFilter === b;
        return `<div class="chip ${isActive ? 'active' : ''}" onclick="setFilter('${b}')">
            ${b === 'all' ? '🚗 ทั้งหมด' : '🏷️ ' + esc(b)}
            <span class="chip-count">${counts[b] || 0}</span>
        </div>`;
    }).join('');

    const compareChip = compareIds.length > 0 ? `
        <div class="chip" style="border-color:var(--blue);color:var(--blue);background:rgba(85,153,238,.08)"
            onclick="switchTab('compare')">
            ⚖️ เปรียบเทียบ ${compareIds.length} คัน
        </div>` : '';

    document.getElementById('filterChips').innerHTML = brandChips + compareChip;
}

/**
 * Get Filtered Cars
 */
function getFilteredCars() {
    const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const priceMin = parseFloat(document.getElementById('filterPriceMin')?.value) || 0;
    const priceMax = parseFloat(document.getElementById('filterPriceMax')?.value) || Infinity;
    const yearMin = parseInt(document.getElementById('filterYearMin')?.value) || 0;
    const yearMax = parseInt(document.getElementById('filterYearMax')?.value) || 9999;

    return window.cars.filter(c => {
        // Filter by brand
        if (activeFilter !== 'all' && c.brand !== activeFilter) return false;

        // Filter by status
        if (activeStatusFilter && c.status !== activeStatusFilter) return false;

        // Filter by price
        const netPrice = parsePrice(c.net);
        if (netPrice < priceMin || netPrice > priceMax) return false;

        // Filter by year
        const year = c.year || 0;
        if (year < yearMin || year > yearMax) return false;

        // Search
        if (query) {
            const searchFields = [
                c.brand, c.name, c.plate, c.vin, c.color,
                String(c.year), c.location, c.status, c.note, c.mileage
            ];
            return searchFields.some(v => (v || '').toLowerCase().includes(query));
        }

        return true;
    });
}

/**
 * Sort Cars
 */
function sortCars(arr, sortKey) {
    const sorted = [...arr];
    sorted.sort((a, b) => {
        switch (sortKey) {
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '', 'th');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '', 'th');
            case 'price-asc':
                return parsePrice(a.net) - parsePrice(b.net);
            case 'price-desc':
                return parsePrice(b.net) - parsePrice(a.net);
            case 'year-desc':
                return (b.year || 0) - (a.year || 0);
            case 'year-asc':
                return (a.year || 0) - (b.year || 0);
            default:
                return 0;
        }
    });
    return sorted;
}

/**
 * Render Car Grid
 */
function renderGrid() {
    let list = getFilteredCars();
    list = sortCars(list, currentSort);

    updateResultInfo(list);

    const grid = document.getElementById('carGrid');
    if (!grid) return;

    if (!list.length) {
        grid.innerHTML = `
            <div class="empty">
                <div class="big">🔍</div>
                <div>ไม่พบรถที่ค้นหา</div>
                <div style="font-size:clamp(10px, 1.2vw, 11px);color:var(--text-secondary);margin-top:clamp(4px, 0.6vw, 6px)">
                    ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง
                </div>
            </div>`;
        grid.style.display = 'grid';
        return;
    }

    grid.innerHTML = list.map((c, i) => {
        const isCompareSelected = compareIds.includes(c.id);
        const costTotal = calculateCost(c).total;
        const profit = calculateProfit(c);
        const leadCount = (window.crmData[c.id] || []).length;
        const isSold = c.status === 'sold';

        let profitHtml = '';
        if (hasPerm('edit') && (isSold || costTotal > 0)) {
            profitHtml = `
                <div class="cost-profit-badge" onclick="openCostModal(${c.id})" title="คลิกเพื่อแก้ไขต้นทุน">
                    💰 ต้นทุน: ${formatBaht(costTotal)}
                    ${isSold ? ` | 📈 กำไร: ${formatBaht(profit.profit)} (${profit.margin.toFixed(1)}%)` : ''}
                </div>`;
        }

        return `
        <div class="card ${isCompareSelected ? 'compare-selected' : ''}" id="card-${c.id}"
            style="animation-delay:${i * 0.02}s">
            <div class="card-img-wrap" onclick="openLightbox(${c.id})">
                <img class="card-img" src="${c.img || PLACEHOLDER_IMAGE}" alt="${esc(c.name)}"
                    loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                <div class="img-overlay"><span>🔍 ดูรูปทั้งหมด</span></div>
                <div class="badge-num">${window.cars.indexOf(c) + 1}</div>
                ${statusBadgeHTML(c.status)}
                ${c.has360 ? '<div class="badge-360">360°</div>' : ''}
            </div>
            <div class="card-body">
                <div class="brand-row">
                    <div class="car-brand">${esc(c.brand)}</div>
                    <div class="car-actions">
                        <div class="icon-btn crm" title="CRM/ลูกค้า" onclick="event.stopPropagation();openCRM(${c.id})">
                            👤${leadCount > 0 ? `<span style="position:absolute;top:-2px;right:-2px;background:var(--blue);color:#fff;font-size:clamp(7px, 0.9vw, 8px);width:clamp(12px, 1.5vw, 14px);height:clamp(12px, 1.5vw, 14px);border-radius:50%;display:flex;align-items:center;justify-content:center">${leadCount}</span>` : ''}
                        </div>
                        <div class="icon-btn" title="ใบเสนอราคา" onclick="event.stopPropagation();openQuote(${c.id})">📄</div>
                        <div class="icon-btn" title="QR Code" onclick="event.stopPropagation();openQR(${c.id})">📱</div>
                        <div class="icon-btn" title="ข้อมูลประกัน" onclick="event.stopPropagation();openWModal(${c.id})">🛡️</div>
                        <div class="icon-btn" title="เปรียบเทียบ" onclick="event.stopPropagation();toggleCompare(${c.id})"
                            style="${isCompareSelected ? 'color:var(--blue);border-color:var(--blue)' : ''}">⚖️</div>
                        <div class="icon-btn del" title="ลบรถ" onclick="event.stopPropagation();handleDeleteCar(${c.id})">🗑️</div>
                    </div>
                </div>
                <div class="car-name editable" contenteditable="${hasPerm('edit')}"
                    data-ph="ชื่อรุ่น"
                    onblur="saveCarField(${c.id},'name',this.textContent.trim())">${esc(c.name)}</div>
                <div class="info-chips">
                    <div class="info-chip">
                        <span class="icon">📅</span>
                        <span class="editable" contenteditable="${hasPerm('edit')}" data-ph="ปี"
                            onblur="saveCarField(${c.id},'year',this.textContent.trim())">${c.year}</span>
                    </div>
                    <div class="info-chip">
                        <span class="icon">🎨</span>
                        <span class="editable" contenteditable="${hasPerm('edit')}" data-ph="สี"
                            onblur="saveCarField(${c.id},'color',this.textContent.trim())">${esc(c.color)}</span>
                    </div>
                    <div class="info-chip">
                        <span class="icon">🛣️</span>
                        <span class="editable" contenteditable="${hasPerm('edit')}" data-ph="ไมล์"
                            onblur="saveCarField(${c.id},'mileage',this.textContent.trim())">${esc(c.mileage)}</span>
                    </div>
                </div>
                <div class="plate-box">
                    <span>🪪</span>
                    <span class="editable" contenteditable="${hasPerm('edit')}" data-ph="ทะเบียน"
                        onblur="saveCarField(${c.id},'plate',this.textContent.trim())">${esc(c.plate)}</span>
                </div>
                ${c.note && c.note !== '-' ? `<div class="note-badge">📝 ${esc(c.note)}</div>` : ''}
                ${warrantyBadgeHTML(c.warranty)}
                ${profitHtml}
                <div class="divider"></div>
                <div class="price-row">
                    <div class="price-left">
                        <div class="lbl">ราคาสุทธิ</div>
                        <div class="price-sp">SP: ${esc(c.sp)}</div>
                        <div class="price-net">
                            <span class="editable" contenteditable="${hasPerm('edit')}" data-ph="ราคา Net"
                                onblur="saveCarField(${c.id},'net',this.textContent.trim())">${esc(c.net)}</span>
                            <small> บาท</small>
                        </div>
                    </div>
                    <div class="price-right">
                        <select class="status-select" onchange="saveCarField(${c.id},'status',this.value)"
                            ${!hasPerm('edit') ? 'disabled' : ''}>
                            <option value="show" ${c.status === 'show' ? 'selected' : ''}>🟢 จอดโชว์</option>
                            <option value="hold" ${c.status === 'hold' ? 'selected' : ''}>🟡 จอง</option>
                            <option value="sold" ${c.status === 'sold' ? 'selected' : ''}>🔴 ขายแล้ว</option>
                            <option value="archived" ${c.status === 'archived' ? 'selected' : ''}>🗄️ เก็บถาวร</option>
                        </select>
                        <div class="location-chip">
                            📍 <span class="editable" contenteditable="${hasPerm('edit')}" data-ph="สถานที่"
                                onblur="saveCarField(${c.id},'location',this.textContent.trim())">${esc(c.location || '—')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    grid.style.display = 'grid';
}

/**
 * Update Result Info
 */
function updateResultInfo(filteredList) {
    document.getElementById('resultCount').textContent = filteredList.length;

    const filters = [];
    if (activeFilter !== 'all') filters.push(`ยี่ห้อ: ${activeFilter}`);
    if (activeStatusFilter) {
        filters.push(`สถานะ: ${statusLabelThai(activeStatusFilter)}`);
    }
    const query = document.getElementById('searchInput')?.value.trim();
    if (query) filters.push(`ค้นหา: "${query}"`);

    document.getElementById('activeFilters').textContent =
        filters.length ? '| ' + filters.join(' • ') : '';
}

/**
 * Filter Functions
 */
function setFilter(brand) {
    activeFilter = brand;
    activeStatusFilter = '';
    renderFilters();
    renderGrid();
}

function filterByStatus(status) {
    switchTab('stock');
    activeFilter = 'all';
    activeStatusFilter = status;
    render();
}

function clearFilters() {
    activeFilter = 'all';
    activeStatusFilter = '';
    document.getElementById('filterPriceMin').value = '';
    document.getElementById('filterPriceMax').value = '';
    document.getElementById('filterYearMin').value = '';
    document.getElementById('filterYearMax').value = '';
    document.getElementById('searchInput').value = '';
    renderFilters();
    renderGrid();
}

function handleSort() {
    currentSort = document.getElementById('sortSelect').value;
    renderGrid();
}

function debounceFilter() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => renderGrid(), 200);
}

/**
 * Compare Functions
 */
function toggleCompare(id) {
    if (compareIds.includes(id)) {
        compareIds = compareIds.filter(i => i !== id);
        showToast('⚖️ นำออกจากการเปรียบเทียบแล้ว', 'ok');
    } else {
        if (compareIds.length >= MAX_COMPARE_CARS) {
            showToast(`⚠️ เลือกได้สูงสุด ${MAX_COMPARE_CARS} คัน`, 'err');
            return;
        }
        compareIds.push(id);
        showToast('⚖️ เพิ่มเข้าเปรียบเทียบแล้ว', 'ok');
    }
    updateCompareCount();
    renderFilters();
    renderGrid();
}

function clearCompare() {
    compareIds = [];
    updateCompareCount();
    renderFilters();
    renderGrid();
    showToast('⚖️ ล้างการเปรียบเทียบแล้ว', 'ok');
}

function updateCompareCount() {
    // Update compare tab if needed
    if (currentTab === 'compare') {
        renderCompare();
    }
}

/**
 * Tab Switching
 */
function switchTab(tab) {
    currentTab = tab;
    const panels = {
        'stock': 'stockPanel',
        'report': 'reportPanel',
        'compare': 'comparePanel',
        'alerts': 'alertsPanel'
    };

    // Hide all panels
    Object.values(panels).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Show active panel
    const activePanel = document.getElementById(panels[tab]);
    if (activePanel) activePanel.style.display = 'block';

    // Update tabs
    ['stock', 'report', 'compare', 'alerts'].forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        if (tabEl) tabEl.classList.toggle('active', t === tab);
    });

    // Render specific content
    if (tab === 'report') renderReport();
    if (tab === 'compare') renderCompare();
    if (tab === 'alerts') renderAlerts();
    if (tab === 'stock') renderGrid();
}

/**
 * Render Report
 */
function renderReport() {
    const total = window.cars.length;
    const show = window.cars.filter(c => c.status === 'show').length;
    const sold = window.cars.filter(c => c.status === 'sold').length;
    const hold = window.cars.filter(c => c.status === 'hold').length;
    const archived = window.cars.filter(c => c.status === 'archived').length;

    const netSum = window.cars.reduce((a, c) => a + (parsePrice(c.net) || 0), 0);
    const soldSum = window.cars
        .filter(c => c.status === 'sold')
        .reduce((a, c) => a + (parsePrice(c.net) || 0), 0);
    const avgNet = total > 0 ? netSum / total : 0;
    const w360 = window.cars.filter(c => c.has360).length;
    const profitSum = window.cars
        .filter(c => c.status === 'sold')
        .reduce((a, c) => a + (calculateProfit(c).profit || 0), 0);

    // Report Cards
    document.getElementById('reportCards').innerHTML = `
        <div class="report-card"><div class="rv">${total}</div><div class="rl">รถทั้งหมด</div></div>
        <div class="report-card"><div class="rv" style="color:var(--green)">${show}</div><div class="rl">จอดโชว์อยู่</div></div>
        <div class="report-card"><div class="rv" style="color:var(--red)">${sold}</div><div class="rl">ขายแล้ว</div></div>
        <div class="report-card"><div class="rv" style="color:var(--gold)">${hold}</div><div class="rl">จอง</div></div>
        <div class="report-card"><div class="rv" style="font-size:clamp(14px, 1.8vw, 16px)">${netSum.toLocaleString('th-TH')}</div><div class="rl">มูลค่าสต็อก</div></div>
        <div class="report-card"><div class="rv" style="font-size:clamp(14px, 1.8vw, 16px);color:var(--red)">${soldSum.toLocaleString('th-TH')}</div><div class="rl">ยอดขาย</div></div>
        <div class="report-card"><div class="rv" style="font-size:clamp(14px, 1.8vw, 16px)">${Math.round(avgNet).toLocaleString('th-TH')}</div><div class="rl">ราคาเฉลี่ย</div></div>
        <div class="report-card"><div class="rv" style="font-size:clamp(14px,1.8vw,16px);color:var(--green)">${profitSum.toLocaleString('th-TH')}</div><div class="rl">กำไรรวม</div></div>
        <div class="report-card"><div class="rv" style="color:var(--blue)">${w360}</div><div class="rl">มี 360°</div></div>`;

    // Charts
    const brandCounts = {};
    window.cars.forEach(c => {
        brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
    });
    const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
    const maxBrand = Math.max(...Object.values(brandCounts), 1);
    const chartColors = ['#c9a84c', '#5ab87a', '#5599ee', '#e05555', '#aa77ee', '#ee9955'];

    const statusData = [
        { label: '🟢 จอดโชว์', value: show, color: 'var(--green)' },
        { label: '🔴 ขายแล้ว', value: sold, color: 'var(--red)' },
        { label: '🟡 จอง', value: hold, color: 'var(--gold)' },
        { label: '🗄️ เก็บถาวร', value: archived, color: 'var(--text-secondary)' }
    ].filter(x => x.value > 0);
    const maxStatus = Math.max(...statusData.map(x => x.value), 1);

    document.getElementById('reportCharts').innerHTML = `
        <div class="chart-wrap">
            <div class="chart-title">🏷️ ตามยี่ห้อ</div>
            <div class="bar-chart">
                ${sortedBrands.map(([brand, count], i) => `
                    <div class="bar-row">
                        <div class="bar-label">${esc(brand)}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width:${(count / maxBrand) * 100}%;background:${chartColors[i % chartColors.length]}">${count}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="chart-wrap">
            <div class="chart-title">📊 ตามสถานะ</div>
            <div class="bar-chart">
                ${statusData.map(s => `
                    <div class="bar-row">
                        <div class="bar-label">${s.label}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width:${(s.value / maxStatus) * 100}%;background:${s.color}">${s.value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

/**
 * Render Compare Table
 */
function renderCompare() {
    const container = document.getElementById('compareTable');
    if (!container) return;

    if (!compareIds.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:clamp(30px, 4vw, 40px);color:var(--text-secondary)">
                <div style="font-size:clamp(28px, 5vw, 36px);margin-bottom:clamp(8px, 1vw, 12px)">⚖️</div>
                <div>ยังไม่ได้เลือกรถ<br><small>กดปุ่ม ⚖️ บนการ์ดรถเพื่อเลือก</small></div>
            </div>`;
        return;
    }

    const selected = compareIds
        .map(id => window.cars.find(c => c.id === id))
        .filter(Boolean);

    const getNetPrice = c => parsePrice(c.net);
    const getCost = c => calculateCost(c).total;
    const minPrice = Math.min(...selected.map(getNetPrice));
    const minCost = Math.min(...selected.map(getCost));

    const fields = [
        { label: 'รูปภาพ', render: c => `<img src="${c.img || PLACEHOLDER_IMAGE}" class="compare-img" loading="lazy">` },
        { label: 'ยี่ห้อ/รุ่น', render: c => `<strong>${esc(c.brand)}</strong><br>${esc(c.name)}` },
        { label: 'ปี', render: c => c.year },
        { label: 'สี', render: c => esc(c.color) },
        { label: 'เลขไมล์', render: c => esc(c.mileage) },
        { label: 'ทะเบียน', render: c => `<span style="color:var(--gold);font-weight:700">${esc(c.plate)}</span>` },
        { label: 'เลขตัวถัง', render: c => `<span style="font-family:monospace;font-size:clamp(8px,1vw,9px)">${esc(c.vin || '—')}</span>` },
        { label: 'สถานที่', render: c => esc(c.location || '—') },
        { label: 'สถานะ', render: c => statusLabelThai(c.status) },
        { label: 'ราคา SP', render: c => esc(c.sp) + ' บาท' },
        { label: 'ราคา Net', render: c => {
            const val = getNetPrice(c);
            return `<span class="${val === minPrice && selected.length > 1 ? 'compare-best' : ''}">${esc(c.net)}</span>`;
        }},
        { label: 'ต้นทุนรวม', render: c => {
            const val = getCost(c);
            return val > 0 ? `<span class="${val === minCost && selected.length > 1 ? 'compare-best' : ''}">${formatBaht(val)}</span>` : '—';
        }},
        { label: '360°', render: c => c.has360 ? '✅ มี' : '—' },
        { label: 'ประกัน', render: c => c.warranty?.end || '—' }
    ];

    container.innerHTML = `
        <div style="overflow-x:auto">
            <table class="compare-table">
                <thead>
                    <tr>
                        <th style="width:clamp(80px, 10vw, 100px)">รายการ</th>
                        ${selected.map(c => `
                            <th>
                                ${esc(c.brand)}<br>
                                <small style="font-weight:400;color:var(--text-secondary)">${truncateText(c.name, 18)}</small><br>
                                <button onclick="toggleCompare(${c.id})"
                                    style="margin-top:4px;background:rgba(224,85,85,.1);border:1px solid rgba(224,85,85,.2);color:var(--red);border-radius:4px;padding:2px 6px;font-size:clamp(8px,1vw,9px);cursor:pointer">
                                    ✕ นำออก
                                </button>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${fields.map(f => `
                        <tr>
                            <td>${f.label}</td>
                            ${selected.map(c => `<td>${f.render(c)}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

/**
 * Skeleton Loader
 */
function showSkeleton() {
    document.getElementById('skeletonLoader').style.display = 'grid';
    document.getElementById('carGrid').style.display = 'none';
}

function hideSkeleton() {
    const sk = document.getElementById('skeletonLoader');
    const gr = document.getElementById('carGrid');
    if (sk) sk.style.display = 'none';
    if (gr) gr.style.display = 'grid';
}

/**
 * Alerts System
 */
let alerts = [];

function checkAlerts() {
    alerts = [];
    const now = new Date();

    window.cars.forEach(c => {
        // Check warranty
        const warrantyStatus = checkWarrantyStatus(c.warranty);
        if (warrantyStatus === 'expired') {
            alerts.push({
                type: 'danger',
                msg: `⚠️ ประกัน ${c.brand} ${c.name} (${c.plate}) หมดอายุแล้ว`,
                carId: c.id
            });
        } else if (warrantyStatus === 'warning') {
            const days = getWarrantyDaysLeft(c.warranty);
            alerts.push({
                type: 'warn',
                msg: `⏳ ประกัน ${c.brand} ${c.name} (${c.plate}) จะหมดใน ${days} วัน`,
                carId: c.id
            });
        }

        // Check dead stock
        if (c.status === 'show' && isDeadStock(c)) {
            const days = daysInStock(c);
            alerts.push({
                type: 'info',
                msg: `📦 Dead Stock: ${c.brand} ${c.name} (${c.plate}) จอดนาน ${days} วัน`,
                carId: c.id
            });
        }
    });

    // Show notification if alerts exist and not on alerts tab
    if (alerts.length > 0 && currentTab !== 'alerts') {
        showAlertNotification();
    }
}

function getWarrantyDaysLeft(warranty) {
    if (!warranty?.end) return 0;
    try {
        let y, m, d;
        if (warranty.end.includes('/')) {
            const p = warranty.end.split('/');
            d = parseInt(p[0]);
            m = parseInt(p[1]) - 1;
            y = parseInt(p[2]);
            if (y < 2500) y += 543;
        } else {
            return 0;
        }
        const end = new Date(y, m, d);
        return Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
}

function showAlertNotification() {
    const existing = document.querySelector('.alert-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'alert-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 80px;
        z-index: 998;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px;box-shadow:var(--shadow)">
            <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:6px">
                🔔 มี ${alerts.length} การแจ้งเตือน
            </div>
            ${alerts.slice(0, 3).map(a => `
                <div style="font-size:10px;color:${a.type === 'danger' ? 'var(--red)' : a.type === 'warn' ? 'var(--orange)' : 'var(--blue)'};margin-bottom:3px">
                    ${a.msg}
                </div>
            `).join('')}
            <div style="text-align:center;margin-top:6px">
                <button class="btn btn-outline" style="font-size:9px;padding:3px 6px"
                    onclick="this.closest('.alert-notification').remove()">ปิด</button>
                <button class="btn btn-gold" style="font-size:9px;padding:3px 6px"
                    onclick="switchTab('alerts');this.closest('.alert-notification').remove()">ดูทั้งหมด</button>
            </div>
        </div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 12000);
}

function renderAlerts() {
    const container = document.getElementById('alertList');
    if (!container) return;

    checkAlerts(); // Refresh alerts

    if (!alerts.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:clamp(20px, 3vw, 30px);color:var(--text-secondary)">
                <div style="font-size:clamp(24px, 4vw, 30px);margin-bottom:clamp(6px, 1vw, 8px)">✅</div>
                <div>ไม่มีการแจ้งเตือน</div>
            </div>`;
        return;
    }

    container.innerHTML = alerts.map(a => `
        <div class="alert-item ${a.type}" onclick="openLightbox(${a.carId})" style="cursor:pointer">
            ${a.msg}
        </div>
    `).join('');
}