// ==================== MAIN.JS ====================
// Application Initialization & Event Listeners

// Global State Variables
window.cars = [];
window.nextId = 20;
window.crmData = SafeStore.get('stockCRM', {});
window.siteSettings = SafeStore.get('siteSettings', { name: 'Stock CEO', logo: '' });
window.uiSettings = SafeStore.get('uiSettings', { theme: 'dark', view: 'grid', gridSize: 'medium' });
window.financeSettings = SafeStore.get('financeSettings', {
    selectedCompany: 'scb',
    customRate: 3.00,
    loanTerms: [12, 24, 36, 48, 60, 72, 84],
    minDownPayment: 15,
    maxLoanAmount: 5000000
});
window.fbCollection = 'stockCEO';

// Auth State
window.currentUser = null;
window.currentUserId = null;
window.userRole = 'viewer';

// UI State
window.isUploading = false;
window.saveTimer = null;
window.compareIds = [];

/**
 * DOM Ready Handler
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Stock CEO Initializing...');

    // 1. Apply saved settings
    applySiteSettings();
    applyUISettings();

    // 2. Initialize Firebase
    const firebaseReady = initFirebase();

    // 3. Load data
    loadCarsFromLocalStorage();

    // 4. Initial render
    hideSkeleton();
    render();

    // 5. Setup event listeners
    setupEventListeners();

    // 6. Check auth state
    if (firebaseReady) {
        checkAuthState();
    } else {
        applyRoleUI();
        updateSyncUI('disconnected');
    }

    // 7. Set default tab
    switchTab('stock');

    console.log('✅ Stock CEO Ready!');
    console.log(`   Cars: ${window.cars.length}`);
    console.log(`   User Role: ${window.userRole}`);
    console.log(`   Firebase: ${firebaseReady ? 'Connected' : 'Offline Mode'}`);
});

/**
 * Setup Global Event Listeners
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounceFilter);
    }

    // Stock date
    const stockDate = document.getElementById('stockDate');
    if (stockDate) {
        stockDate.addEventListener('change', function() {
            saveToLocalStorage();
        });
    }

    // Close modals on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const lightbox = document.getElementById('lightbox');
            if (lightbox && lightbox.style.display === 'flex') {
                closeLightbox();
            } else {
                // Close top-most modal
                const openModals = document.querySelectorAll('.modal-bg.open');
                if (openModals.length > 0) {
                    const topModal = openModals[openModals.length - 1];
                    if (topModal.id !== 'pinModal') { // Don't close PIN modal with Escape
                        topModal.classList.remove('open');
                    }
                }
            }
        }
    });

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW registration failed:', err));
        });
    }

    // Online/Offline detection
    window.addEventListener('online', () => {
        updateSyncUI('ok');
        showToast('🌐 ออนไลน์แล้ว', 'ok');
    });

    window.addEventListener('offline', () => {
        updateSyncUI('disconnected');
        showToast('📡 ออฟไลน์ - ใช้ข้อมูลจากเครื่อง', 'err');
    });

    // Before unload - save data
    window.addEventListener('beforeunload', () => {
        saveToLocalStorage();
    });

    // Handle window resize for responsive
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentTab === 'compare') renderCompare();
        }, 250);
    });
}

/**
 * Expose functions to global scope for HTML onclick handlers
 */
window.handleLogoClick = handleLogoClick;
window.openSyncModal = openSyncModal;
window.showAuthModal = showAuthModal;
window.handleLockClick = handleLockClick;
window.startChangePin = startChangePin;
window.toggleTheme = toggleTheme;
window.toggleView = toggleView;
window.changeGridSize = changeGridSize;
window.switchTab = switchTab;
window.setFilter = setFilter;
window.filterByStatus = filterByStatus;
window.clearFilters = clearFilters;
window.handleSort = handleSort;
window.debounceFilter = debounceFilter;
window.toggleCompare = toggleCompare;
window.clearCompare = clearCompare;
window.closeLightbox = closeLightbox;
window.lbNav = lbNav;
window.lbGoto = lbGoto;
window.lbApplyUrl = lbApplyUrl;
window.lbDeleteCurrent = lbDeleteCurrent;
window.lbDeleteIdx = lbDeleteIdx;
window.openWModal = openWModal;
window.openCostModal = openCostModal;
window.openCRM = openCRM;
window.openQuote = openQuote;
window.openQR = openQR;
window.showUserManagement = showUserManagement;
window.showDataManageModal = showDataManageModal;
window.openContactModal = openContactModal;
window.openAddModal = openAddModal;
window.handleAddCar = handleAddCar;
window.handleDeleteCar = handleDeleteCar;
window.saveWarranty = saveWarranty;
window.saveCostFromModal = saveCostFromModal;
window.saveLogo = saveLogo;
window.login = login;
window.register = register;
window.logout = logout;
window.showRegister = showRegister;
window.connectFirebase = connectFirebase;
window.disconnectSync = disconnectSync;
window.changeUserRole = changeUserRole;

// CRM Functions
window.updateLeadStatus = updateLeadStatus;
window.deleteLead = deleteLead;
window.openAddLead = openAddLead;
window.saveLead = saveLead;
window.loadLeadsFromQuote = loadLeadsFromQuote;

// Quote Functions
window.selectFinance = selectFinance;
window.selectTerm = selectTerm;
window.updateQuotePreview = updateQuotePreview;
window.copyQuote = copyQuote;
window.printQuote = printQuote;
window.addComparePlan = addComparePlan;
window.showComparePlans = showComparePlans;
window.removeComparePlan = removeComparePlan;
window.selectBestPlan = selectBestPlan;
window.copyCompareTable = copyCompareTable;
window.printComparePlans = printComparePlans;
window.exportInstallmentTable = exportInstallmentTable;
window.showQuoteHistory = showQuoteHistory;
window.loadQuoteFromHistory = loadQuoteFromHistory;

// Export Functions
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.backupData = backupData;
window.restoreData = restoreData;
window.importExcel = importExcel;

// Lightbox Functions
window.openLightbox = openLightbox;
window.downloadQR = downloadQR;

// Pin Functions
window.pinPress = pinPress;
window.pinBack = pinBack;
window.pinClear = pinClear;

// Car Field Save
window.saveCarField = saveCarField;

console.log('✅ Global functions exposed');