// ==================== FIREBASE-SERVICE.JS ====================
// Firebase Management

let fbRef = null;
let fbListener = null;
let isSyncing = false;
let cloudSaveTimer = null;

// Firebase instances
let auth = null;
let db = null;
let storage = null;

/**
 * เริ่มต้น Firebase
 */
function initFirebase() {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.database();
        storage = firebase.storage();
        try {
            firebase.analytics();
        } catch (e) {
            console.log('Analytics not available');
        }
        console.log('✅ Firebase initialized');
        return true;
    } catch (e) {
        console.warn('Firebase init skipped:', e.message);
        return false;
    }
}

/**
 * ตรวจสอบสถานะ Auth
 */
function checkAuthState() {
    if (!auth) {
        // Firebase ไม่ได้ initialze
        window.currentUser = null;
        window.currentUserId = null;
        window.userRole = 'viewer';
        updateAuthUI(false);
        loadCarsFromLocalStorage();
        applyRoleUI();
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            window.currentUser = user;
            window.currentUserId = user.uid;

            db.ref('users/' + user.uid + '/role').once('value')
                .then(snap => {
                    let role = snap.val();
                    if (!role) {
                        const isFirst = !localStorage.getItem('stockAdminInit');
                        if (isFirst) {
                            role = 'admin';
                            localStorage.setItem('stockAdminInit', 'true');
                            db.ref('users/' + user.uid).set({
                                email: user.email,
                                role: 'admin',
                                createdAt: Date.now()
                            });
                        } else {
                            role = 'user';
                            db.ref('users/' + user.uid).set({
                                email: user.email,
                                role: 'user',
                                createdAt: Date.now()
                            });
                        }
                    }
                    window.userRole = role;
                    updateAuthUI(true);
                    loadCarsFromFirebase();
                    applyRoleUI();
                })
                .catch(() => {
                    window.userRole = 'viewer';
                    loadCarsFromLocalStorage();
                    applyRoleUI();
                });
        } else {
            window.currentUser = null;
            window.currentUserId = null;
            window.userRole = 'viewer';
            updateAuthUI(false);
            loadCarsFromLocalStorage();
            applyRoleUI();
        }
    });
}

/**
 * โหลดข้อมูลจาก Firebase
 */
function loadCarsFromFirebase() {
    if (!window.currentUser) {
        loadCarsFromLocalStorage();
        return;
    }

    db.ref('users/' + window.currentUser.uid + '/cars').once('value')
        .then(snap => {
            const data = snap.val();
            if (data && Object.keys(data).length > 0) {
                window.cars = Object.values(data);
                window.nextId = Math.max(...window.cars.map(c => c.id), 0) + 1;
                SafeStore.set('stockCars', window.cars);
                hideSkeleton();
                render();
                showToast('🔄 โหลดข้อมูลจาก Cloud แล้ว', 'ok');
            } else {
                // ไม่มีข้อมูลบน Cloud ใช้ Local ก่อน
                loadCarsFromLocalStorage();
                hideSkeleton();
                render();
                showToast('📤 ไม่มีข้อมูลบน Cloud ใช้ข้อมูลจากเครื่อง', 'ok');
                saveToFirebase();
            }
        })
        .catch(err => {
            console.error('Firebase load error:', err);
            loadCarsFromLocalStorage();
            hideSkeleton();
            render();
            showToast('⚠️ ไม่สามารถโหลดจาก Cloud ได้ ใช้ข้อมูลจากเครื่อง', 'err');
        });
}

/**
 * บันทึกข้อมูลไป Firebase
 */
function saveToFirebase() {
    if (!window.currentUser || !hasPerm('edit')) return;

    const o = {};
    window.cars.forEach(c => { o[c.id] = c; });

    db.ref('users/' + window.currentUser.uid + '/cars').set(o)
        .then(() => {
            SafeStore.set('stockCars', window.cars);
        })
        .catch(e => {
            console.error('Firebase save error:', e);
            showToast('❌ บันทึก Cloud ไม่สำเร็จ', 'err');
        });
}

/**
 * Cloud Save (หน่วงเวลา)
 */
function cloudSave() {
    if (!window.currentUser || !hasPerm('edit')) return;

    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
        isSyncing = true;
        updateSyncUI('syncing');
        saveToFirebase();
        setTimeout(() => {
            isSyncing = false;
            updateSyncUI('ok');
        }, 350);
    }, 1000);
}

/**
 * อัพโหลดรูปภาพไป Firebase Storage
 */
async function uploadImageToStorage(file, carId) {
    if (!window.currentUser) {
        showToast('❗ กรุณาเข้าสู่ระบบเพื่ออัพโหลดรูป', 'err');
        return null;
    }

    const ref = storage.ref(`users/${window.currentUser.uid}/cars/${carId}/${Date.now()}_${file.name}`);
    try {
        isUploading = true;
        showUploadProgress(0);

        const snap = await ref.put(file);
        const url = await snap.ref.getDownloadURL();

        showUploadProgress(100);
        setTimeout(() => hideUploadProgress(), 350);
        showToast('✅ อัพโหลดสำเร็จ', 'ok');
        isUploading = false;
        return url;
    } catch (e) {
        hideUploadProgress();
        showToast('❌ อัพโหลดไม่สำเร็จ: ' + e.message, 'err');
        isUploading = false;
        return null;
    }
}

/**
 * แสดง Progress อัพโหลด
 */
function showUploadProgress(p) {
    document.getElementById('uploadProgress').classList.add('show');
    document.getElementById('progressFill').style.width = p + '%';
    document.getElementById('progressText').textContent = p + '%';
}

/**
 * ซ่อน Progress อัพโหลด
 */
function hideUploadProgress() {
    document.getElementById('uploadProgress').classList.remove('show');
}

/**
 * Login
 */
function login() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPassword').value;

    auth.signInWithEmailAndPassword(e, p)
        .then(() => {
            closeModal('authModal');
            showToast('✅ เข้าสู่ระบบสำเร็จ', 'ok');
        })
        .catch(err => {
            document.getElementById('authError').textContent = '❌ ' + err.message;
            document.getElementById('authError').style.display = 'block';
        });
}

/**
 * Register
 */
function register() {
    const e = document.getElementById('registerEmail').value;
    const p = document.getElementById('registerPassword').value;

    if (p.length < 6) {
        document.getElementById('registerError').textContent = '❌ รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร';
        document.getElementById('registerError').style.display = 'block';
        return;
    }

    auth.createUserWithEmailAndPassword(e, p)
        .then(() => {
            closeModal('registerModal');
            showToast('✅ สมัครสมาชิกสำเร็จ', 'ok');
        })
        .catch(err => {
            document.getElementById('registerError').textContent = '❌ ' + err.message;
            document.getElementById('registerError').style.display = 'block';
        });
}

/**
 * Logout
 */
function logout() {
    if (confirm('ออกจากระบบ?')) {
        auth.signOut().then(() => {
            showToast('🚪 ออกจากระบบแล้ว', 'ok');
        });
    }
}

/**
 * อัพเดท UI สถานะ Sync
 */
function updateSyncUI(state) {
    const bar = document.getElementById('syncStatusBar');
    const dot = document.getElementById('syncDot');
    const lbl = document.getElementById('syncLabel');

    if (!bar || !dot || !lbl) return;

    bar.className = 'sync-status-bar';
    dot.className = 'sync-dot';

    switch (state) {
        case 'ok':
            bar.classList.add('ok');
            dot.classList.add('ok');
            lbl.textContent = 'ซิงค์แล้ว';
            break;
        case 'syncing':
            bar.classList.add('syncing');
            dot.classList.add('syncing');
            lbl.textContent = 'กำลังซิงค์…';
            break;
        case 'err':
            bar.classList.add('err');
            dot.classList.add('err');
            lbl.textContent = 'Sync ผิดพลาด';
            break;
        default:
            bar.classList.add('disconnected');
            dot.classList.add('disconnected');
            lbl.textContent = 'ไม่ได้เชื่อมต่อ';
    }
}

/**
 * เปิด Modal Sync
 */
function openSyncModal() {
    if (!requireAdmin('เชื่อมต่อ Cloud')) return;

    const connected = window.currentUser !== null;
    document.getElementById('syncSetupSection').style.display = connected ? 'none' : 'block';
    document.getElementById('syncConnectedSection').style.display = connected ? 'block' : 'none';
    document.getElementById('fbConnectBtn').style.display = connected ? 'none' : 'block';

    if (connected) {
        try {
            const cfg2 = JSON.parse(localStorage.getItem('fbConfig') || '{}');
            document.getElementById('fbProjectInfo').textContent =
                cfg2.projectId || FIREBASE_CONFIG.projectId || '—';
        } catch (e) {
            document.getElementById('fbProjectInfo').textContent = FIREBASE_CONFIG.projectId || '—';
        }

        const fci = document.getElementById('fbCollectionInfo');
        if (fci) fci.textContent = window.fbCollection || 'stockCEO';
    }

    document.getElementById('fbError').style.display = 'none';
    document.getElementById('syncModal').classList.add('open');
}

/**
 * เชื่อมต่อ Firebase
 */
async function connectFirebase() {
    try {
        const cfg = JSON.parse(document.getElementById('fbConfigInput').value.trim());
        if (!cfg.databaseURL || !cfg.projectId) throw new Error('ข้อมูลไม่ครบ');

        updateSyncUI('syncing');

        firebase.initializeApp(cfg, 'stockApp_' + Date.now());
        window.fbCollection = document.getElementById('fbCollection').value.trim() || 'stockCEO';
        localStorage.setItem('fbConfig', JSON.stringify(cfg));
        localStorage.setItem('fbCollection', window.fbCollection);

        updateSyncUI('ok');
        closeModal('syncModal');
        showToast('☁️ เชื่อมต่อแล้ว', 'ok');
    } catch (e) {
        updateSyncUI('err');
        document.getElementById('fbError').textContent = '❌ ' + e.message;
        document.getElementById('fbError').style.display = 'block';
    }
}

/**
 * ยกเลิกการเชื่อมต่อ
 */
function disconnectSync() {
    logout();
    updateSyncUI('disconnected');
    closeModal('syncModal');
}

/**
 * แสดง Modal Auth
 */
function showAuthModal() {
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authModal').classList.add('open');
}

/**
 * แสดง Modal Register
 */
function showRegister() {
    closeModal('authModal');
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerModal').classList.add('open');
}

/**
 * อัพเดท UI Auth
 */
function updateAuthUI(logged) {
    const s = document.getElementById('authSection');
    if (!s) return;

    if (logged && window.currentUser) {
        s.innerHTML = `
            <div class="user-info">
                👤 ${esc(window.currentUser.email)}
                <span style="opacity:.7">(${ROLES[window.userRole]?.label || ''})</span>
            </div>
            <button class="btn btn-outline" onclick="logout()"
                style="font-size:clamp(9px, 1.1vw, 10px);padding:clamp(4px, 0.6vw, 6px) clamp(6px, 0.8vw, 8px)">
                🚪 ออก
            </button>`;
    } else {
        s.innerHTML = `
            <button class="btn btn-outline" onclick="showAuthModal()"
                style="font-size:clamp(9px, 1.1vw, 10px);padding:clamp(4px, 0.6vw, 6px) clamp(6px, 0.8vw, 8px)">
                🔑 เข้าสู่ระบบ
            </button>`;
    }
}

/**
 * จัดการผู้ใช้ (Admin เท่านั้น)
 */
function showUserManagement() {
    if (!requireAdmin('เข้าถึงเมนูจัดการผู้ใช้ไม่ได้')) return;

    db.ref('users').once('value').then(snap => {
        const users = snap.val() || {};
        const list = Object.entries(users).map(([uid, data]) => `
            <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:clamp(6px, 0.8vw, 8px);padding:clamp(8px, 1vw, 10px);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-weight:600;font-size:clamp(11px, 1.3vw, 12px)">${esc(data.email || 'ไม่ระบุ')}</div>
                    <div style="font-size:clamp(9px, 1.1vw, 10px);color:var(--text-secondary)">
                        ID: ${uid.slice(0, 8)}... | 📅 ${formatThaiDate(data.createdAt)}
                    </div>
                </div>
                <select onchange="changeUserRole('${uid}', this.value)"
                    style="background:var(--bg-input);border:1px solid var(--border);border-radius:clamp(4px, 0.6vw, 6px);padding:clamp(3px, 0.5vw, 4px);color:var(--text-primary);font-size:clamp(9px, 1.1vw, 10px);outline:none">
                    <option value="user" ${data.role === 'user' ? 'selected' : ''}>👤 User</option>
                    <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                    <option value="viewer" ${data.role === 'viewer' ? 'selected' : ''}>👁️ Viewer</option>
                </select>
            </div>
        `).join('');

        document.getElementById('userList').innerHTML = list ||
            '<div style="text-align:center;color:var(--text-secondary);padding:clamp(16px, 2.5vw, 20px)">ยังไม่มีผู้ใช้ในระบบ</div>';
        document.getElementById('userManageModal').classList.add('open');
    });
}

/**
 * เปลี่ยน Role ผู้ใช้
 */
function changeUserRole(uid, newRole) {
    db.ref('users/' + uid + '/role').set(newRole).then(() => {
        showToast('✅ อัพเดทสิทธิ์แล้ว', 'ok');
        if (uid === window.currentUserId) {
            window.userRole = newRole;
            applyRoleUI();
        }
    });
}