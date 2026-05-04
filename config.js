// ==================== CONFIG.JS ====================
// ค่าคงที่และการตั้งค่าทั้งระบบ

// Firebase Configuration (ควรย้ายไป Environment Variable ใน Production)
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDKOk5NRhDUhh6JlC2HkPoxy3yWcTLzVTc",
    authDomain: "ceonongteenoi-d5669.firebaseapp.com",
    databaseURL: "https://ceonongteenoi-d5669-default-rtdb.firebaseio.com",
    projectId: "ceonongteenoi-d5669",
    storageBucket: "ceonongteenoi-d5669.firebasestorage.app",
    messagingSenderId: "907492695863",
    appId: "1:907492695863:web:b347a08a8dfd30ced204b2"
};

// Constants
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=80';
const MAX_IMAGES_PER_CAR = 8;
const DEFAULT_PIN = '1234';
const MAX_COMPARE_CARS = 3;
const MAX_COMPARE_PLANS = 4;

// Role & Permission System
const ROLES = {
    admin: {
        label: '👑 Admin',
        perms: ['view', 'edit', 'quote', 'crm', 'report', 'export', 'data', 'sync', 'users', 'contact']
    },
    user: {
        label: '👤 User',
        perms: ['view', 'quote', 'report', 'export', 'contact']
    },
    viewer: {
        label: '👁️ Viewer',
        perms: ['view']
    }
};

// Finance Companies
const FINANCE_COMPANIES = [
    { id: 'scb', name: 'SCB Auto', color: '#4d76b8', defaultRate: 2.99 },
    { id: 'kbank', name: 'KBank Auto', color: '#00a950', defaultRate: 3.15 },
    { id: 'bbl', name: 'BBL Auto', color: '#f89c1c', defaultRate: 3.25 },
    { id: 'ttb', name: 'TTB Auto', color: '#e31e24', defaultRate: 3.05 },
    { id: 'uob', name: 'UOB Auto', color: '#003da5', defaultRate: 3.35 },
    { id: 'custom', name: 'กำหนดเอง', color: '#888', defaultRate: 3.00 }
];

// Default Cars Data
const DEFAULT_CARS = [
    {
        id: 1,
        brand: 'Toyota',
        name: 'Yaris 1.2 e Sport',
        year: 2018,
        color: 'ดำ',
        vin: '1236591',
        plate: 'กข 7556',
        mileage: '122,xxx',
        has360: false,
        warranty: { start: '', end: '', extra: '-' },
        bsi: { coverage: '', start: '', end: '' },
        sp: '279,000',
        net: '269,000',
        location: 'PRS นครปฐม',
        note: 'จอดโชว์',
        status: 'show',
        img: PLACEHOLDER_IMAGE,
        images: [PLACEHOLDER_IMAGE],
        cost: { purchase: 180000, repair: 35000, other: 15000 },
        dateAdded: new Date().toISOString()
    },
    {
        id: 2,
        brand: 'BMW',
        name: '330e M Sport (G20)',
        year: 2021,
        color: 'ขาว',
        vin: 'Y100103',
        plate: '6 ขว 8735',
        mileage: '98,xxx',
        has360: true,
        warranty: { start: '27/9/2021', end: '26/9/2026', extra: '-' },
        bsi: { coverage: '5ปี/100,000 กม.', start: '27/9/2021', end: '26/9/2026' },
        sp: '1,240,000',
        net: '1,190,000',
        location: 'Platinum',
        note: 'จอดโชว์',
        status: 'show',
        img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
        images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80'],
        cost: { purchase: 850000, repair: 120000, other: 50000 },
        dateAdded: new Date().toISOString()
    }
];