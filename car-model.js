// ==================== CAR-MODEL.JS ====================
// Car Data Model & Calculations

/**
 * คำนวณต้นทุนรวมของรถ
 */
function calculateCost(car) {
    const p = car.cost?.purchase || 0;
    const r = car.cost?.repair || 0;
    const o = car.cost?.other || 0;
    return {
        total: p + r + o,
        purchase: p,
        repair: r,
        other: o
    };
}

/**
 * คำนวณกำไรจากการขาย
 */
function calculateProfit(car) {
    if (car.status !== 'sold' || !car.cost) {
        return { profit: 0, margin: 0 };
    }

    const net = parsePrice(car.net);
    const cost = calculateCost(car).total;

    if (net === 0 || cost === 0) {
        return { profit: 0, margin: 0 };
    }

    const profit = net - cost;
    const margin = (profit / net) * 100;

    return {
        profit: profit,
        margin: margin
    };
}

/**
 * คำนวณสินเชื่อแบบ Flat Rate
 */
function calculateInstallmentFlat(price, annualRate, months, downPercent = 0) {
    const carPrice = parsePrice(price);
    const downPayment = carPrice * (downPercent / 100);
    const loanAmount = carPrice - downPayment;

    if (loanAmount <= 0) {
        return {
            error: 'เงินดาวน์สูงกว่าราคารถ',
            carPrice,
            downPayment,
            downPaymentPercent: downPercent,
            loanAmount: 0
        };
    }

    const years = months / 12;
    const totalInterest = loanAmount * (annualRate / 100) * years;
    const totalPayment = loanAmount + totalInterest;
    const monthlyPayment = totalPayment / months;
    const effectiveRate = Math.round(((24 * totalInterest) / (loanAmount * (months + 1))) * 10000) / 100;

    return {
        carPrice,
        downPayment,
        downPaymentPercent: downPercent,
        loanAmount,
        annualRate,
        months,
        totalInterest,
        totalPayment,
        monthlyPayment,
        effectiveRate,
        type: 'flat'
    };
}

/**
 * คำนวณสินเชื่อแบบลดต้นลดดอก (Annuity/APR)
 */
function calculateInstallmentAnnuity(price, annualRate, months, downPercent = 0) {
    const carPrice = parsePrice(price);
    const downPayment = carPrice * (downPercent / 100);
    const loanAmount = carPrice - downPayment;

    if (loanAmount <= 0) {
        return {
            error: 'เงินดาวน์สูงกว่าราคารถ',
            carPrice,
            downPayment,
            downPaymentPercent: downPercent,
            loanAmount: 0
        };
    }

    const monthlyRate = annualRate / 1200;
    const x = Math.pow(1 + monthlyRate, months);
    const monthlyPayment = loanAmount * (monthlyRate * x) / (x - 1);
    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - loanAmount;

    return {
        carPrice,
        downPayment,
        downPaymentPercent: downPercent,
        loanAmount,
        annualRate,
        months,
        totalInterest,
        totalPayment,
        monthlyPayment,
        effectiveRate: annualRate,
        type: 'annuity'
    };
}

/**
 * คำนวณสินเชื่อ (เลือกสูตรอัตโนมัติ)
 */
function calculateInstallment(price, annualRate, months, downPercent = 0, useAnnuity = false) {
    if (useAnnuity) {
        return calculateInstallmentAnnuity(price, annualRate, months, downPercent);
    }
    return calculateInstallmentFlat(price, annualRate, months, downPercent);
}

/**
 * ตรวจสอบสถานะประกัน
 * Returns: 'expired' | 'warning' | 'ok' | ''
 */
function checkWarrantyStatus(warranty) {
    if (!warranty || !warranty.end) return '';

    try {
        let year, month, day;

        if (warranty.end.includes('/')) {
            const parts = warranty.end.split('/');
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
            if (year < 2500) year += 543;
        } else if (warranty.end.includes('-')) {
            const parts = warranty.end.split('-');
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
        } else {
            return '';
        }

        const endDate = new Date(year, month, day);
        const now = new Date();
        const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 90) return 'warning';
        return 'ok';
    } catch (e) {
        return '';
    }
}

/**
 * สร้าง Warranty Badge HTML
 */
function warrantyBadgeHTML(warranty) {
    if (!warranty || !warranty.end) return '';

    const status = checkWarrantyStatus(warranty);
    let icon = '🛡️';
    let text = warranty.end;
    let cssClass = '';

    if (status === 'expired') {
        icon = '⚠️';
        text = 'หมดอายุ';
        cssClass = 'badge-expired';
    } else if (status === 'warning') {
        icon = '⏳';
        text = 'ใกล้หมด';
        cssClass = 'badge-warn';
    }

    return `<div class="badge-w ${cssClass}">${icon} ${text}</div>`;
}

/**
 * คำนวณจำนวนวันที่รถอยู่ในสต็อก
 */
function daysInStock(car) {
    if (!car.dateAdded) return 0;
    const added = new Date(car.dateAdded);
    const now = new Date();
    return Math.ceil((now - added) / (1000 * 60 * 60 * 24));
}

/**
 * ตรวจสอบว่าเป็น Dead Stock หรือไม่ (เกิน 60 วัน)
 */
function isDeadStock(car) {
    return car.status === 'show' && daysInStock(car) > 60;
}

/**
 * บันทึกข้อมูล Field ใดๆ ของรถ
 */
function saveCarField(carId, field, value) {
    if (!hasPerm('edit')) return;

    const car = window.cars.find(c => c.id === carId);
    if (!car) return;

    if (field === 'year') {
        value = parseInt(value) || car.year;
    }

    car[field] = value;

    // ถ้าขายแล้ว บันทึกประวัติ
    if (field === 'status' && value === 'sold') {
        saveQuoteHistory(carId, 'ลูกค้า', {
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
    }

    saveToLocalStorage();
    cloudSave();
    renderStats();
    showToast('💾 บันทึกแล้ว', 'ok');
}

/**
 * เพิ่มรถใหม่
 */
function addNewCar(formData, images = []) {
    if (!hasPerm('edit')) return null;

    const car = {
        id: window.nextId++,
        brand: formData.brand || 'Unknown',
        name: formData.name || '',
        year: parseInt(formData.year) || new Date().getFullYear(),
        color: formData.color || '-',
        vin: formData.vin || '',
        mileage: formData.mileage || '-',
        plate: formData.plate || '-',
        sp: formData.sp || '0',
        net: formData.net || '0',
        location: formData.location || '',
        note: formData.note || '-',
        status: 'show',
        has360: formData.has360 || false,
        img: images.length > 0 ? images[0] : PLACEHOLDER_IMAGE,
        images: images.length > 0 ? [...images] : [PLACEHOLDER_IMAGE],
        warranty: { start: '', end: '', extra: '-' },
        bsi: { coverage: '', start: '', end: '' },
        cost: {
            purchase: parsePrice(formData.costPurchase),
            repair: parsePrice(formData.costRepair),
            other: parsePrice(formData.costOther)
        },
        dateAdded: new Date().toISOString()
    };

    window.cars.push(car);
    saveToLocalStorage();
    cloudSave();
    return car;
}

/**
 * ลบรถ
 */
function deleteCarById(carId) {
    if (!hasPerm('edit')) return false;
    if (!confirm('คุณแน่ใจที่จะลบรถคันนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return false;

    window.cars = window.cars.filter(c => c.id !== carId);
    window.compareIds = window.compareIds.filter(id => id !== carId);
    updateCompareCount();

    saveToLocalStorage();
    cloudSave();
    return true;
}

/**
 * อัพเดทข้อมูลประกัน
 */
function updateWarranty(carId, warrantyData, bsiData) {
    if (!hasPerm('edit')) return false;

    const car = window.cars.find(c => c.id === carId);
    if (!car) return false;

    car.warranty = warrantyData;
    car.bsi = bsiData;

    saveToLocalStorage();
    cloudSave();
    return true;
}

/**
 * อัพเดทต้นทุน
 */
function updateCost(carId, costData) {
    if (!hasPerm('edit')) return false;

    const car = window.cars.find(c => c.id === carId);
    if (!car) return false;

    car.cost = costData;

    saveToLocalStorage();
    cloudSave();
    return true;
}