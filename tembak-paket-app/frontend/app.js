// frontend/app.js

const app = document.getElementById('app');
const API_BASE_URL = '/api';

// Variabel global untuk menyimpan state aplikasi
let currentUser = null;
let visiblePackages = [];
let phoneAuth = {
    phone: null,
    accessToken: null,
    authId: null
};
let kmspBalance = null; // Diatur ke null untuk menandakan belum dimuat atau error
let latestAnnouncement = null;
let isMaintenanceMode = false; 
let statusIntervalId = null;
let allAdminUsers = [];


// ===============================================
// === INITIALISASI APLIKASI & LOGIKA ROUTING ====
// ===============================================

/**
 * Fungsi utama yang dipanggil saat aplikasi dimuat.
 */
async function main() {
    await checkLoginStatus();

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const isAdminLoginAttempt = params.get('admin_login') === 'true';

    if (isMaintenanceMode && (!currentUser || currentUser.role !== 'admin') && !isAdminLoginAttempt) {
        renderGlobalMaintenancePage();
        return;
    }

    if (currentUser) {
        const loggedInPromises = [
            initKMSPsession(),
            fetchAnnouncement()
        ];
        if (currentUser.role === 'admin') {
            loggedInPromises.push(fetchKMSPBalance());
        }
        await Promise.all(loggedInPromises);
        startStatusPolling(); //
    }
    
    renderApp(isAdminLoginAttempt); 
    
    window.removeEventListener('hashchange', renderApp);
    window.addEventListener('hashchange', () => renderApp(false));
}

/**
 * FUNGSI BARU: Memulai polling status ke server secara berkala.
 */
function startStatusPolling() {
    // Hentikan polling lama jika ada, untuk mencegah duplikasi
    if (statusIntervalId) {
        clearInterval(statusIntervalId);
    }

    statusIntervalId = setInterval(async () => {
        // Jangan jalankan jika pengguna tidak login atau adalah admin
        if (!currentUser || currentUser.role === 'admin') {
            stopStatusPolling(); // Hentikan jika kondisi tidak terpenuhi lagi
            return;
        }
        
        try {
            // Panggil endpoint status baru secara diam-diam
            const response = await fetch(`${API_BASE_URL}/status`);
            if (response.ok) {
                const data = await response.json();
                if (data.maintenanceMode === true) {
                    // Maintenance terdeteksi!
                    console.log("Maintenance mode detected from polling. Rendering maintenance page.");
                    isMaintenanceMode = true;
                    renderGlobalMaintenancePage();
                    stopStatusPolling(); // Hentikan polling setelah maintenance terdeteksi
                }
            }
        } catch (error) {
            console.error("Status polling failed:", error.message);
        }
    }, 30000); // Bertanya setiap 30 detik (30000 milidetik)
}

/**
 * FUNGSI BARU: Menghentikan polling status.
 */
function stopStatusPolling() {
    if (statusIntervalId) {
        clearInterval(statusIntervalId);
        statusIntervalId = null;
        console.log("Status polling stopped.");
    }
}

/**
 * Fungsi BARU untuk merender halaman maintenance global yang menutupi seluruh situs.
 */
function renderGlobalMaintenancePage() {
    // Langsung menimpa seluruh konten elemen #app
    app.innerHTML = `
        <div class="maintenance-container">
            <svg class="maintenance-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.4l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1 0-2.4l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>
            </svg>
            
            <h2>MAINTENANCE</h2>
            <p>Maaf, layanan sedang dalam pemeliharaan untuk meningkatkan kualitas.<br>Silakan coba lagi beberapa saat nanti.</p>
            <p class="by-line">By RyyStore</p>
        </div>
    `;
}
/**
 * Menginisialisasi atau memperpanjang sesi login nomor HP KMSP dari localStorage.
 * Memperbarui objek phoneAuth global.
 */
async function initKMSPsession() {
    try {
        const savedKMSPAuth = JSON.parse(localStorage.getItem('kmspAuth'));
        if (savedKMSPAuth && savedKMSPAuth.phone && savedKMSPAuth.authId) {
            const { data, status } = await apiFetch('/auth/extend-session', {
                method: 'POST',
                body: { phone: savedKMSPAuth.phone, auth_id: savedKMSPAuth.authId }
            });
            // Pastikan status HTTP 200 dan status API true dari backend
            if (status === 200 && data.status && data.data) {
                phoneAuth.phone = savedKMSPAuth.phone;
                phoneAuth.accessToken = data.data.access_token;
                phoneAuth.authId = data.data.auth_id;
                // Simpan ulang info sesi KMSP ke localStorage (mungkin ada token baru)
                localStorage.setItem('kmspAuth', JSON.stringify({ phone: phoneAuth.phone, authId: phoneAuth.authId }));
            } else {
                 // Jika respons tidak valid, lempar error
                 throw new Error(data.message || "Sesi KMSP tidak valid lagi atau respons tidak sesuai.");
            }
        }
    } catch (error) {
        console.error("Gagal memperpanjang sesi KMSP:", error.message);
        localStorage.removeItem('kmspAuth'); // Hapus sesi yang rusak dari localStorage
        phoneAuth = { phone: null, accessToken: null, authId: null }; // Reset objek phoneAuth
    }
}

/**
 * Mengambil saldo KMSP dari backend. Hasilnya disimpan di variabel kmspBalance global.
 * Digunakan terutama untuk panel admin atau kondisi pembelian paket.
 */
async function fetchKMSPBalance() {
    try {
        const { data, status } = await apiFetch('/admin/kmsp-balance');
        // Periksa status HTTP, status dari data API, dan properti 'balance'
        if (status === 200 && data.status && typeof data.data?.balance !== 'undefined') {
            kmspBalance = data.data.balance;
        } else {
            // Jika respons tidak valid, atur kmspBalance ke null dan log peringatan
            kmspBalance = null;
            console.warn("Respons saldo KMSP tidak valid:", data.message || "Format data balance tidak ditemukan.");
            // Tampilkan feedback error di dashboard jika sedang di halaman admin
            if (window.location.hash === '#admin') {
                displayFeedback('balance-feedback', data.message || "Gagal memuat saldo KMSP. Cek API Key & koneksi.", true);
            }
        }
    } catch (error) {
        // Tangani error jika gagal terhubung ke API
        console.warn("Tidak dapat mengambil saldo KMSP:", error.message);
        kmspBalance = null; // Atur ke null jika ada error
        if (window.location.hash === '#admin') {
            displayFeedback('balance-feedback', `Gagal memuat saldo KMSP: ${error.message}`, true);
        }
    }
}

/**
 * Mengambil pengumuman terbaru dari backend. Hasilnya disimpan di variabel latestAnnouncement global.
 */
async function fetchAnnouncement() {
    try {
        const { data, status } = await apiFetch('/user/announcement');
        // Periksa status HTTP, status dari data API, dan properti 'data'
        if (status === 200 && data.status && data.data) {
            latestAnnouncement = data.data;
        } else {
            latestAnnouncement = null; // Atur ke null jika tidak ada pengumuman atau respons tidak valid
            console.warn("Respons pengumuman tidak valid:", data.message || "Data pengumuman tidak ditemukan.");
        }
    } catch (error) {
        console.warn("Tidak dapat mengambil pengumuman:", error.message);
        latestAnnouncement = null;
    }
}

/**
 * Merender tampilan utama aplikasi berdasarkan hash URL.
 */
function renderApp(isAdminLoginAttempt = false) {
    const hash = window.location.hash || '#';
    const cleanHash = hash.split('?')[0] || '#'; 

    app.innerHTML = '<div class="loading-spinner"></div>';

    if (currentUser) {
        const targetHash = (cleanHash === '#' || cleanHash === '#login' || cleanHash === '#register') ? '#dashboard' : cleanHash;
        if (window.location.hash.split('?')[0] !== targetHash) {
            window.location.hash = targetHash;
            return; 
        }

        switch (targetHash) {
            case '#history': renderDashboard('history'); break;
            case '#profile': renderDashboard('profile'); break;
            case '#paket-akrab': renderDashboard('paket-akrab'); break;
            case '#tutorial': renderDashboard('tutorial'); break;
            case '#kontak-admin': renderDashboard('kontak-admin'); break;
            case '#admin':
                if (currentUser.role === 'admin') renderDashboard('admin');
                else window.location.hash = '#dashboard';
                break;
            case '#laporan':
                if (currentUser.role === 'admin') renderDashboard('laporan');
                else window.location.hash = '#dashboard';
                break;
            case '#dashboard':
            default:
                renderDashboard('packages');
                break;
        }
    } else {
        switch (cleanHash) {
            case '#register':
                renderRegisterPage();
                break;
            case '#login':
            default: 
                renderLoginPage();
                break;
        }
    }

    if (isAdminLoginAttempt) {
        // Ganti URL menjadi #login bersih setelah semuanya selesai dirender
        window.history.replaceState(null, null, window.location.pathname + '#login');
    }
}

/**
 * Merender halaman profil pengguna secara lengkap.
 * @param {HTMLElement} container - Elemen DOM (main-content) yang akan diisi.
 */
function renderProfilePage(container) {
    if (!currentUser) {
        container.innerHTML = '<div class="page-content"><p class="error-message">Gagal memuat data pengguna.</p></div>';
        return;
    }

    let announcementHTML = '';
    if (latestAnnouncement && latestAnnouncement.message) {
        announcementHTML = `
            <div class="announcement-banner">
                <p><strong>Informasi:</strong> ${latestAnnouncement.message}</p>
            </div>
        `;
    }
    
    container.innerHTML = `
        ${announcementHTML}
        <div class="page-content">
            <div class="page-header"><h1>Profil Saya</h1></div>
            
            <div class="profile-info-card">
                <h3>Informasi Akun</h3>
                
                <form id="change-name-form" style="margin-bottom: 2rem;">
                    <div class="form-group">
                        <label for="userName">Nama</label>
                        <input type="text" id="userName" value="${currentUser.name}" required>
                    </div>
                    <button type="submit">Simpan Nama</button>
                </form>
                <div id="name-feedback" style="margin-top: 1rem;"></div>
                
                <hr>

                <div class="info-grid">
                    <p><strong>Email:</strong></p><p>${currentUser.email}</p>
                    <p><strong>No. HP Terverifikasi:</strong></p><p>${currentUser.verifiedPhone ? currentUser.verifiedPhone : '<em>Belum ada</em>'}</p>
                </div>
            </div>

            <div class="profile-info-card">
                <h3>Ubah Password</h3>
                <form id="change-password-form">
                    <div class="form-group">
                        <label for="currentPassword">Password Saat Ini</label>
                        <input type="password" id="currentPassword" required autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label for="newPassword">Password Baru (min. 6 karakter)</label>
                        <input type="password" id="newPassword" required minlength="6" autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Konfirmasi Password Baru</label>
                        <input type="password" id="confirmPassword" required minlength="6" autocomplete="new-password">
                    </div>
                    <button type="submit">Ubah Password</button>
                </form>
                <div id="profile-feedback" style="margin-top: 1rem;"></div>
            </div>
        </div>
    `;

    document.getElementById('change-name-form')?.addEventListener('submit', handleChangeName);
    document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);
}

// frontend/app.js -> Pastikan Anda memiliki DUA fungsi ini

/**
 * Merender halaman tutorial cara melakukan pembelian.
 * @param {HTMLElement} container - Elemen DOM yang akan diisi (mainContent).
 */
function renderTutorialPage(container) {
    // Tanda '+=' menambahkan konten ini setelah banner pengumuman (jika ada)
    container.innerHTML += `
        <div class="page-content">
            <div class="page-header"><h1>Cara Pembelian</h1></div>

            <div class="tutorial-card">
                <h2>A. Beli Paket (Verifikasi OTP Terpusat)</h2>
                <ol class="tutorial-steps">
                    <li>Pergi ke halaman <strong>Beli Paket</strong>.</li>
                    <li>Di bagian atas, verifikasi nomor HP Anda <strong>satu kali saja</strong> dengan memasukkan nomor dan kode OTP yang dikirim.</li>
                    <li>Setelah nomor terverifikasi, nomor Anda akan tersimpan selama sesi login.</li>
                    <li>Pilih paket yang Anda inginkan dari dropdown. Anda bisa menggunakan kolom pencarian untuk memfilter daftar.</li>
                    <li>Detail paket akan muncul. Klik <strong>"Beli Sekarang"</strong>.</li>
                    <li>Pilih metode pembayaran (jika ada pilihan) dan selesaikan transaksi.</li>
                </ol>
            </div>

            <div class="tutorial-card">
                <h2>B. Paket Akrab & Lainnya (Tanpa OTP per Transaksi)</h2>
                <ol class="tutorial-steps">
                    <li>Pergi ke halaman <strong>Paket Akrab & Lainnya</strong>.</li>
                    <li>Langsung masukkan <strong>Nomor HP Tujuan</strong> yang berbeda-beda setiap kali transaksi.</li>
                    <li>Pilih paket dari dropdown. Gunakan pencarian jika perlu.</li>
                    <li>Cek deskripsi dan stok (jika ada) yang muncul.</li>
                    <li>Klik <strong>"Beli Sekarang"</strong> untuk memproses. Biaya layanan akan langsung dipotong dari saldo Anda.</li>
                </ol>
            </div>
        </div>
    `;
}

/**
 * Merender halaman statis untuk menampilkan informasi kontak admin.
 * @param {HTMLElement} container - Elemen DOM yang akan diisi (mainContent).
 */
function renderKontakAdminPage(container) {
    // GANTI DENGAN INFORMASI KONTAK ANDA YANG SEBENARNYA
    const adminWhatsapp = "6287767287284"; // Ganti dengan nomor WA Anda (format 62...)
    const adminTelegram = "RyyStorevp1"; // Ganti dengan username Telegram Anda

    container.innerHTML += `
        <div class="page-content">
            <div class="page-header"><h1>Kontak Admin</h1></div>
            <p>Jika Anda mengalami kendala atau memiliki pertanyaan, jangan ragu untuk menghubungi kami melalui kontak di bawah ini.</p>
            
            <div class="contact-card">
                <h3>WhatsApp</h3>
                <p>Klik untuk langsung chat dengan admin. (Respon Cepat)</p>
                <a href="https://wa.me/${adminWhatsapp}?text=Halo%20Admin%20Ryystore,%20saya%20butuh%20bantuan." target="_blank" class="button">Chat via WhatsApp</a>
            </div>

            <div class="contact-card">
                <h3>Telegram</h3>
                <p>Klik untuk memulai percakapan di Telegram.</p>
                <a href="https://t.me/${adminTelegram}" target="_blank" class="button secondary">Chat via Telegram</a>
            </div>
        </div>
    `;
}

/**
 * Handler untuk tombol 'Setujui' pada daftar pengguna baru.
 * VERSI BARU: Tidak memuat ulang seluruh daftar, tapi menghapus item dari DOM secara langsung.
 */
async function handleApproveUser(e) {
    const button = e.currentTarget;
    const userItem = button.closest('.user-item-admin'); // Dapatkan elemen <li>
    const userId = userItem?.dataset.userId;

    if (!userId || !button) return;

    if (!confirm(`Apakah Anda yakin ingin menyetujui pengguna ini?`)) {
        return;
    }

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner small"></span>`;
    displayFeedback('approval-feedback', '', false);

    try {
        const { data, status } = await apiFetch('/admin/approve-user', {
            method: 'POST',
            body: { userId }
        });

        if (status === 200 && data.status) {
            showToast(data.message, false);
            
            // --- PERBAIKAN UTAMA: HAPUS DARI TAMPILAN, JANGAN LOAD ULANG ---
            // Alih-alih memanggil loadUsers(), kita hapus elemennya langsung dari DOM
            // dengan animasi fade-out yang halus.
            userItem.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            userItem.style.opacity = '0';
            userItem.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                userItem.remove();
                // Opsional: Cek jika daftar menjadi kosong
                const pendingList = document.getElementById('pending-users-list');
                if (pendingList && pendingList.children.length === 0) {
                    pendingList.innerHTML = '<li>Tidak ada pengguna yang menunggu persetujuan.</li>';
                }
            }, 400); // Hapus elemen setelah animasi selesai

        } else {
            throw new Error(data.message || "Gagal menyetujui pengguna.");
        }

    } catch (error) {
        showToast(error.message, true);
        displayFeedback('approval-feedback', error.message, true);
        // Kembalikan tombol ke keadaan semula jika gagal
        button.disabled = false;
        button.textContent = 'Setujui';
    }
}

/**
 * Handler untuk tombol 'Tolak' pada daftar pengguna baru.
 */
async function handleRejectUser(e) {
    const button = e.currentTarget;
    const userItem = button.closest('.user-item-admin');
    const userId = userItem?.dataset.userId;

    if (!userId || !button) return;

    // Minta konfirmasi yang jelas karena ini aksi menghapus
    if (!confirm(`YAKIN ingin MENOLAK dan MENGHAPUS pengguna ini? Aksi ini tidak dapat dibatalkan.`)) {
        return;
    }

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner small"></span>`;
    // Nonaktifkan juga tombol setujui agar tidak bisa diklik ganda
    userItem.querySelector('.approve-user-btn')?.setAttribute('disabled', 'true');

    displayFeedback('approval-feedback', '', false);

    try {
        const { data, status } = await apiFetch('/admin/reject-user', {
            method: 'POST',
            body: { userId }
        });

        if (status === 200 && data.status) {
            showToast(data.message, false);

            // Hapus item dari tampilan dengan animasi
            userItem.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            userItem.style.opacity = '0';
            userItem.style.transform = 'translateX(-20px)';

            setTimeout(() => {
                userItem.remove();
                const pendingList = document.getElementById('pending-users-list');
                if (pendingList && pendingList.children.length === 0) {
                    pendingList.innerHTML = '<li>Tidak ada pengguna yang menunggu persetujuan.</li>';
                }
            }, 400);

        } else {
            throw new Error(data.message || "Gagal menolak pengguna.");
        }

    } catch (error) {
        showToast(error.message, true);
        displayFeedback('approval-feedback', error.message, true);
        button.disabled = false;
        button.textContent = 'Tolak';
        userItem.querySelector('.approve-user-btn')?.removeAttribute('disabled');
    }
}

/**
 * Handler untuk form ubah nama.
 */
async function handleChangeName(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Menyimpan...`;
    displayFeedback('name-feedback', '', false);

    const newName = document.getElementById('userName').value;

    try {
        const { data, status } = await apiFetch('/user/update-profile', {
            method: 'POST',
            body: { name: newName }
        });

        if (status === 200 && data.status && data.user) {
            currentUser = data.user; 
            showToast(data.message);
            renderApp();
        } else {
            throw new Error(data.message || 'Gagal memperbarui nama.');
        }

    } catch (error) {
            showToast(error.message, true);
    } finally {
        const currentButton = document.querySelector('#change-name-form button');
        if(currentButton) {
            currentButton.disabled = false;
            currentButton.textContent = 'Simpan Nama';
        }
    }
}

async function handleCheckActivePackages(e) {
    const button = e.currentTarget;
    const resultContainer = document.getElementById('active-packages-result');

    if (!button || !resultContainer) return;

    // Cek apakah pengguna sudah memverifikasi nomornya
    if (!phoneAuth.accessToken) {
        alert('Silakan verifikasi nomor Anda terlebih dahulu.');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<span class="button-spinner"></span> Mengecek...';
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const { data, status } = await apiFetch(`/user/active-packages?accessToken=${phoneAuth.accessToken}`);

        if (status === 200 && data.status) {
            if (Array.isArray(data.data) && data.data.length > 0) {
                // Buat daftar paket aktif
                const packageListHTML = data.data.map(pkg => `
                    <li style="margin-bottom: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.75rem;">
                        <strong>${pkg.name}</strong><br>
                        <small>Sisa Kuota: ${pkg.total_quota}</small><br>
                        <small>Berlaku Hingga: ${new Date(pkg.expired).toLocaleString('id-ID')}</small>
                    </li>
                `).join('');
                resultContainer.innerHTML = `<ul style="list-style: none; padding: 0;">${packageListHTML}</ul>`;
            } else {
                resultContainer.innerHTML = '<p>Tidak ada paket aktif yang ditemukan untuk nomor ini.</p>';
            }
        } else {
            throw new Error(data.message || 'Gagal mengambil data paket.');
        }

    } catch (error) {
        resultContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Cek Paket Aktif';
    }
}
/**
 * Handler untuk form ubah password.
 */
async function handleChangePassword(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memproses...`;
    displayFeedback('profile-feedback', '', false);

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        displayFeedback('profile-feedback', 'Password baru dan konfirmasi password tidak cocok.', true);
        button.disabled = false;
        button.textContent = 'Ubah Password';
        return;
    }

    try {
        const { data, status } = await apiFetch('/user/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });

        if (status === 200 && data.status) {
            displayFeedback('profile-feedback', data.message, false);
            e.target.reset();
            showToast(data.message);
            handleLogout();
        } else {
            throw new Error(data.message || 'Gagal mengubah password.');
        }

    } catch (error) {
          showToast(error.message, true); 
    } finally {
        button.disabled = false;
        button.textContent = 'Ubah Password';
    }
}
// ===============================================
// === FUNGSI LOGIKA PEMBELIAN & PEMBAYARAN EKSTERNAL ===
// (Dipindahkan ke sini agar dapat diakses sebelum dipanggil di renderPackagesPage)
// ===============================================

/**
 * Memulai alur pembelian paket. Merender modal pilihan pembayaran.
 * @param {Event} e - Objek event dari klik tombol.
 * @param {string} packageId - ID paket yang akan dibeli.
 */
function handlePurchase(e, packageId) {
    const button = e.currentTarget;
    if (!button) return;
    
    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span>`;
    renderPaymentChoiceModal(packageId, button);
}

/**
 * Merender modal untuk memilih metode pembayaran provider.
 * @param {string} packageId - ID paket yang akan dibeli.
 * @param {HTMLElement} originalButton - Tombol "Beli Sekarang" asli untuk direset.
 */
function renderPaymentChoiceModal(packageId, originalButton) {
    const pkg = visiblePackages.find(p => p.package_code === packageId);
    if (!pkg) { 
        alert('Error: Paket tidak ditemukan.');
        if (originalButton) { // Pastikan tombol ada sebelum mengaktifkan
            originalButton.disabled = false;
            originalButton.textContent = 'Beli Sekarang';
        }
        return;
    }

    const platformFee = pkg.platform_fee || 0;
    const originalPrice = pkg.original_price || 0;
    const pkgNameLower = (pkg.name || '').toLowerCase();
    const isPulsaMethod = pkgNameLower.includes('[method pulsa]');
    const paymentMethods = pkg.payment_methods || [];
    
    let paymentSelectionUI = '';

    if (isPulsaMethod) {
        paymentSelectionUI = `
            <div class="form-group">
               <label>Metode Pembayaran:</label>
               <p><strong>Pulsa (Memotong Saldo)</strong></p>
               <input type="hidden" id="payment-method-select" value="balance">
            </div>
        `;
    } else if (paymentMethods.length > 0) {
        const paymentOptionsHTML = paymentMethods.map(method => `<option value="${method.payment_method}">${method.payment_method_display_name}</option>`).join('');
        paymentSelectionUI = `
            <div class="form-group">
               <label for="payment-method-select">Pilih Metode Pembayaran Provider:</label>
               <select id="payment-method-select">${paymentOptionsHTML}</select>
            </div>
        `;
    } else {
        paymentSelectionUI = `<p class="error-message">Tidak ada metode pembayaran yang tersedia untuk paket ini.</p>`;
    }

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return; // Tambahkan pengecekan

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Konfirmasi Pembelian</h2><button class="modal-close">&times;</button></div>
                <h4>${pkg.name}</h4>
                <div class="form-group">
                    <label>Harga dari Provider:</label>
                    <p><strong>Rp ${originalPrice.toLocaleString('id-ID')}</strong></p>
                </div>
                <div class="form-group">
                    <label>Biaya Layanan:</label>
                    <p><strong>Rp ${platformFee.toLocaleString('id-ID')}</strong> (dipotong dari saldo)</p>
                </div>
                ${paymentSelectionUI}
                <div id="modal-error-container"></div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                     <button id="cancel-purchase-btn" class="secondary" style="flex: 1;">Batal</button>
                     <button id="confirm-purchase-btn" style="flex: 1;" ${paymentMethods.length === 0 && !isPulsaMethod ? 'disabled' : ''}>Lanjutkan</button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => {
        modalContainer.innerHTML = '';
        if (originalButton) { // Pastikan tombol ada sebelum mengaktifkan
            originalButton.disabled = false;
            originalButton.textContent = 'Beli Sekarang';
        }
    };

    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    document.getElementById('cancel-purchase-btn')?.addEventListener('click', closeModal);

    const confirmBtn = document.getElementById('confirm-purchase-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async (e) => {
            const selectedMethodElement = document.getElementById('payment-method-select');
            const selectedMethod = selectedMethodElement ? selectedMethodElement.value : '';
            await executePurchase(e.currentTarget, packageId, selectedMethod, platformFee);
        });
    }
}

/**
 * Melakukan pembelian paket dengan memanggil API backend.
 * @param {HTMLElement} button - Tombol yang memicu pembelian.
 * @param {string} packageId - ID paket yang dibeli.
 * @param {string} paymentMethod - Metode pembayaran yang dipilih.
 * @param {number} fee - Biaya layanan paket.
 */
async function executePurchase(button, packageId, paymentMethod, fee) {
    if (!button) return;
    
    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Mengirim...`;
    displayFeedback('modal-error-container', '', false);
    
    try {
        const { data, status } = await apiFetch('/purchase', {
            method: 'POST',
            body: { packageId, phone: phoneAuth.phone, accessToken: phoneAuth.accessToken, paymentMethod }
        });
        
        // Perbarui saldo pengguna di UI setelah pembelian
        if (currentUser && typeof data.newBalance === 'number') {
            currentUser.balance = data.newBalance;
            const userBalanceElement = document.getElementById('user-balance');
            if (userBalanceElement) {
                userBalanceElement.textContent = `Rp ${currentUser.balance.toLocaleString('id-ID')}`;
            }
        }

        if (status === 202) { // Kode status 202 menunjukkan pembayaran eksternal diperlukan
            renderExternalPaymentModal(data.payment_data);
        } else if (status === 200 && data.status) { // Pembelian berhasil langsung
            renderFinalStatusModal("Status Transaksi", data.message || 'Sukses');
        } else { // Pembelian gagal dengan respons non-202/non-200
            throw new Error(data.message || 'Pembelian gagal dengan respons yang tidak diharapkan.');
        }
    } catch (error) {
        let friendlyErrorMessage = "Terjadi kesalahan. Silakan coba lagi.";
        if (error.message.toLowerCase().includes('maximum pending transaction')) {
            friendlyErrorMessage = " Semoga Berhasil! Masuk Tunggu 1 Jam Untuk Menerima Paket. jika tidak masuk, belum hoki. Silakan coba lagi nanti.";
        } else if (error.message) {
            friendlyErrorMessage = error.message; 
        }
        displayFeedback('modal-error-container', friendlyErrorMessage, true);
        button.disabled = false;
        button.textContent = 'Lanjutkan';
    }
}


/**
 * Merender modal untuk menyelesaikan pembayaran eksternal (QRIS/DeepLink).
 * @param {Object} paymentData - Data pembayaran dari backend.
 */
function renderExternalPaymentModal(paymentData) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    let paymentContent = '';
    let hasValidPaymentMethod = false;

    // Cek jika pembayaran QRIS
    if (paymentData.is_qris && paymentData.qris_data && paymentData.qris_data.qr_code) {
        paymentContent = `
            <h3>Scan QR Code di Bawah</h3>
            <div id="qris-image-container" style="padding: 1rem; background: white; display: inline-block; border-radius: 8px; margin: 0 auto;"></div>
            <p>Total Bayar ke Provider: <strong>Rp ${(paymentData.amount || 0).toLocaleString('id-ID')}</strong></p>
        `;
        hasValidPaymentMethod = true;
    }
    // Cek jika pembayaran menggunakan Deeplink (aplikasi lain)
    else if (paymentData.have_deeplink && paymentData.deeplink_data && paymentData.deeplink_data.deeplink_url) {
        paymentContent = `
            <h3>Klik untuk Membayar</h3>
            <a href="${decodeURIComponent(paymentData.deeplink_data.deeplink_url)}" target="_blank" class="button" style="text-decoration: none;">Buka Aplikasi ${paymentData.deeplink_data.payment_method || 'Pembayaran'}</a>
            <p>Total Bayar ke Provider: <strong>Rp ${(paymentData.amount || 0).toLocaleString('id-ID')}</strong></p>
           `;
        hasValidPaymentMethod = true;
    }
    // Jika tidak ada metode pembayaran yang valid
    else {
        paymentContent = `<p class="error-message">Data pembayaran tidak valid dari provider.</p>`;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content" style="text-align: center;">
                <div class="modal-header">
                    <h2>Selesaikan Pembayaran</h2>
                    <button class="modal-close">&times;</button>
                </div>
                ${paymentContent}
                <p style="font-size: 0.9em; margin-top: 1.5rem; color: #555;">Biaya layanan telah dipotong dari saldo Anda. Transaksi ini sudah sukses di sistem kami. Mohon selesaikan pembayaran ini di aplikasi eksternal.</p>
                <p id="payment-status" style="color: var(--success-color);">Transaksi berhasil dibuat!</p>
                <div class="loading-spinner" id="payment-spinner" style="display: none;"></div> <button id="external-payment-close-btn" class="secondary" style="margin-top: 1.5rem; width: 100%; display: block;">Tutup</button>
            </div>
        </div>
    `;

    // Inisialisasi QR Code jika ada data QRIS
    if (hasValidPaymentMethod && paymentData.is_qris && paymentData.qris_data && paymentData.qris_data.qr_code) {
        const qrContainer = document.getElementById('qris-image-container');
        if (qrContainer && typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: paymentData.qris_data.qr_code,
                width: 220,
                height: 220,
            });
        }
    }

    // >>>>>>> Hapus Seluruh Bagian Polling Interval Ini <<<<<<<
    // let pollingInterval = setInterval(async () => {
    //    // ... kode polling yang sekarang tidak perlu ...
    // }, 5000);
    // >>>>>>> Akhir Bagian Polling Interval <<<<<<<

    // Pastikan untuk membersihkan interval polling dan countdown sebelumnya (jika ada dari TopUp QRIS)
    if (window.activeQrisPollingInterval) clearInterval(window.activeQrisPollingInterval);
    if (window.activeQrisCountdownInterval) clearInterval(window.activeQrisCountdownInterval);

    // Fungsi closeModal tetap sama
    const closeModal = () => {
        // Tidak perlu clearInterval(pollingInterval); di sini lagi
        modalContainer.innerHTML = '';
        renderApp(); // Render app untuk update riwayat, saldo dll.
    };
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    // Tombol tutup manual akan selalu terlihat
    document.getElementById('external-payment-close-btn')?.addEventListener('click', closeModal);
}


// ===============================================
// === FUNGSI TEMPLATE & RENDER HALAMAN ==========
// ===============================================

/**
 * Merender halaman login ke elemen 'app'.
 * Mengatur event listener untuk form login.
 */
/**
 * Merender halaman login ke elemen 'app'.
 * VERSI BARU: Dengan tombol aktivasi yang lebih cerdas.
 */
function renderLoginPage() {
    // Nomor WA Admin tetap di sini untuk digunakan oleh handler nanti
    const adminWhatsapp = "6287767287284"; 

    app.innerHTML = `
        <div class="auth-container">
            <div class="auth-banner">
                <img src="assets/images/logo.png" alt="RYYSTORE Logo" style="width: 100px; height: auto;">
            </div>
            <h1>RYYSTORE PANEL</h1>
            <p>Dapatkan Semua Kebutuhan Digitalmu.</p>
            <hr>
            <form id="login-form">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <div class="password-wrapper">
                        <input type="password" id="password" required autocomplete="current-password">
                        <span class="password-toggle" onclick="togglePasswordVisibility(this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </span>
                    </div>
                </div>
                <button type="submit">Login</button>
            </form>
            <div id="feedback-container"></div>
            
            <button type="button" id="request-activation-btn" class="button secondary" style="margin-top: 1rem; width: 100%;">
                Hubungi Admin untuk Aktivasi
            </button>

            <p class="auth-link">Belum punya akun? <a href="#register">Daftar di sini</a></p>
        </div>
    `;

    // Pasang event listener untuk form login dan tombol aktivasi baru
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('request-activation-btn')?.addEventListener('click', handleRequestActivation);
}

/**
 * Handler untuk tombol minta aktivasi via WhatsApp.
 * Mengambil email dari form dan membuat link dinamis.
 */
function handleRequestActivation() {
    const adminWhatsapp = "6287767287284"; // Pastikan nomor ini sama
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value : ''; // Ambil email dari input field

    let prefilledMessage;

    if (email) {
        // Jika pengguna sudah mengetik email
        prefilledMessage = `Halo Admin RyyStore,
Saya ingin meminta aktivasi untuk akun saya.

Email terdaftar: ${email}

Terima kasih.`;
    } else {
        // Jika email masih kosong
        prefilledMessage = `Halo Admin RyyStore,
Saya ingin meminta aktivasi untuk akun baru saya.

Terima kasih.`;
    }

    // Buat link WhatsApp yang sudah di-encode
    const whatsappLink = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(prefilledMessage)}`;
    
    // Buka link di tab baru
    window.open(whatsappLink, '_blank');
}
/**
 * Merender halaman registrasi ke elemen 'app'.
 * Mengatur event listener untuk form registrasi.
 */
function renderRegisterPage() {
    app.innerHTML = `
        <div class="auth-container">
            <h1>Buat Akun Baru</h1>
            <form id="register-form">
                 <div class="form-group">
                    <label for="name">Nama Lengkap</label>
                    <input type="text" id="name" required autocomplete="name">
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="password">Password (min. 6 karakter)</label>
                    <div class="password-wrapper">
                        <input type="password" id="password" minlength="6" required autocomplete="new-password">
                        <span class="password-toggle" onclick="togglePasswordVisibility(this)">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </span>
                    </div>
                </div>
                <button type="submit">Daftar</button>
            </form>
            <div id="feedback-container"></div>
            <p class="auth-link">Sudah punya akun? <a href="#login">Login di sini</a></p>
        </div>
    `;
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
}

/**
 * Merender struktur dashboard utama (header, sidebar, dan area konten).
 * Header berisi judul "RYYSTORE" dan tombol toggle menu.
 * Jika toggle di klik, sidebar akan muncul dan header ikut bergeser (smooth).
 * @param {string} activePage - Halaman yang aktif: 'packages', 'history', atau 'admin'.
 */

// frontend/app.js -> GANTI FUNGSI renderDashboard LAMA ANDA DENGAN INI

function renderDashboard(activePage = 'packages') {
    const isAdmin = currentUser.role === 'admin';

    // --- PERBAIKAN UTAMA: PENGECEKAN DIPINDANKAN KE SINI ---
    // Cek status maintenance di level tertinggi dasbor.
    if (isMaintenanceMode && !isAdmin) {
       app.innerHTML = `
        <div class="maintenance-container">
            <svg class="maintenance-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.4l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1 0-2.4l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>
            </svg>
            
            <h2>MODE MAINTENANCE AKTIF</h2>
            <p>Maaf, layanan sedang dalam perbaikan untuk meningkatkan kualitas.<br>Silakan coba lagi beberapa saat nanti.</p>
            <p class="by-line">By RyyStore</p>
        </div>
    `;
    return; // PENTING: Hentikan eksekusi sisa fungsi agar dasbor tidak dirender.
}
    

    app.innerHTML = `
        <header class="main-header" id="main-header">
            <div class="header-inner" style="display: flex; align-items: center; height: 100%;">
                <button class="menu-toggle" id="menu-toggle-btn" aria-label="Buka Menu" style="margin-right: 12px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <h1 class="header-title" style="margin: 0; font-size: 1.4rem; letter-spacing: 2px;">RYYSTORE</h1>
            </div>
        </header>
        <div class="dashboard-container">
            <aside class="sidebar" id="sidebar">
                <h2>Ryystore V2</h2>
                <div class="user-info">
                    <p>Selamat datang,</p>
                    <strong id="user-name">${currentUser.name}</strong>
                    <p>Saldo Anda:</p>
                    <p id="user-balance">Rp ${currentUser.balance.toLocaleString('id-ID')}</p>
                </div>
                <button id="topup-btn">Top Up Saldo</button>
                  <nav>
                    <ul>
                        <li><a href="#dashboard" class="${activePage === 'packages' ? 'active' : ''}">Beli Paket</a></li>
                        <li><a href="#paket-akrab" class="${activePage === 'paket-akrab' ? 'active' : ''}">Paket Akrab & Lainnya</a></li>
                        <li><a href="#history" class="${activePage === 'history' ? 'active' : ''}">Riwayat Transaksi</a></li>
                        <li><a href="#profile" class="${activePage === 'profile' ? 'active' : ''}">Profil Saya</a></li>
                        <li><a href="#tutorial" class="${activePage === 'tutorial' ? 'active' : ''}">Cara Pembelian</a></li>
                        <li><a href="#kontak-admin" class="${activePage === 'kontak-admin' ? 'active' : ''}">Kontak Admin</a></li>
                        ${isAdmin ? `
                        <li><a href="#admin" class="${activePage === 'admin' ? 'active' : ''}">Panel Admin</a></li>
                        <li><a href="#laporan" class="${activePage === 'laporan' ? 'active' : ''}">Laporan Keuangan</a></li> ` : ''}

                    </ul>
                </nav>
                <button id="logout-btn" class="secondary">Logout</button>
            </aside>
            <main class="main-content" id="page-content-area">
                </main>
        </div>
        <div id="modal-container"></div>
    `;
    
    // --- Sisa kode di dalam fungsi ini tetap sama ---
    const mainContent = document.getElementById('page-content-area');
    mainContent.innerHTML = ''; 

    let announcementHTML = '';
    if (latestAnnouncement && latestAnnouncement.message) {
        announcementHTML = `
            <div class="announcement-banner" id="announcement-banner">
                <p><strong>Informasi:</strong> ${latestAnnouncement.message}</p>
                <button class="announcement-close" id="announcement-close-btn">&times;</button>
            </div>
        `;
    }
    mainContent.innerHTML = announcementHTML;

    if (activePage === 'packages') {
        mainContent.innerHTML += renderPhoneVerificationPanel(); 
        renderPackagesPage(mainContent); 
        setupPhoneVerificationListeners();
    } else if (activePage === 'history') {
        renderHistoryPage(mainContent);
    } else if (activePage === 'profile') {
        renderProfilePage(mainContent);
    } else if (activePage === 'tutorial') {
        renderTutorialPage(mainContent);
    } else if (activePage === 'kontak-admin') {
        renderKontakAdminPage(mainContent);
    } else if (activePage === 'paket-akrab') {
        renderNonOtpPage(mainContent);
    } else if (activePage === 'admin') {
        if (isAdmin) {
            renderAdminDashboard(mainContent);
        } else {
            window.location.hash = '#dashboard';
        }
    } 
    // --- PENAMBAHAN BARU DI SINI ---
    else if (activePage === 'laporan') {
        if (isAdmin) {
            // Panggil fungsi render baru untuk halaman laporan
            renderLaporanPage(mainContent); 
        } else {
            // Jika bukan admin mencoba akses, lempar ke dashboard
            window.location.hash = '#dashboard';
        }
    } 
    
    // --- Sisa event listener di fungsi ini juga tetap sama ---
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('topup-btn')?.addEventListener('click', renderTopUpModal);
    document.getElementById('announcement-close-btn')?.addEventListener('click', () => {
        document.getElementById('announcement-banner').style.display = 'none';
    });
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const mainHeader = document.getElementById('main-header');
    const dashboardContainer = document.querySelector('.dashboard-container');

    // Cek elemen sebelum menambahkan listener untuk menghindari error
    if (menuToggleBtn && sidebar && mainHeader && dashboardContainer) {
        
        const openSidebar = () => {
            sidebar.classList.add('open');
            // Buat overlay untuk menggelapkan konten utama
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.onclick = () => closeSidebar();
            dashboardContainer.appendChild(overlay);
        };

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        };

        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Hentikan event agar tidak langsung menutup sidebar lagi
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        // Tambahkan listener untuk menutup saat menekan tombol Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape" && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });
    }
}

/**
 * Merender tampilan panel admin dengan semua fitur manajemen.
 * Ini adalah bagian dari `renderDashboard`.
 * @param {HTMLElement} container - Elemen DOM tempat konten admin akan dirender (misal: page-content-area).
 */

function renderAdminDashboard(container) {
    if (!container) {
        console.error("Container untuk panel admin tidak ditemukan.");
        app.innerHTML = '<p class="error-message">Error: Container untuk panel admin tidak ditemukan. Silakan refresh halaman.</p>';
        return;
    }

    container.innerHTML = `
        <div class="admin-container">
            <div class="admin-section">
                <h1>Panel Kontrol Admin</h1>
                <a href="/#dashboard" style="display: block; text-align: center; margin-bottom: 1rem; color: var(--primary-color);">Kembali ke Dashboard Pengguna</a>
            </div>

            <div class="admin-section">
                <h2>Persetujuan Pengguna Baru</h2>
                <p>Pengguna di bawah ini sedang menunggu persetujuan Anda untuk bisa login.</p>
                <div id="approval-feedback"></div>
                <ul id="pending-users-list" class="user-list-admin"><div class="loading-spinner"></div></ul>
            </div>
            <div class="admin-section">
                <h2>Statistik Ringkas</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Pendapatan Hari Ini (Fee)</h4>
                        <p id="revenue-today">Memuat...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Transaksi Hari Ini</h4>
                        <p id="transactions-today">Memuat...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Pengguna Baru (7 Hari)</h4>
                        <p id="new-users-week">Memuat...</p>
                    </div>
                </div>
            </div>
            <div class="admin-section">
                <h2>5 Paket Terlaris</h2>
                <div style="max-width: 600px; margin: auto; padding: 1rem; background: white; border-radius: 8px;">
                    <canvas id="package-chart"></canvas>
                </div>
            </div>
            <div class="admin-section">
                <h2>Mode Pemeliharaan</h2>
                <div id="maintenance-feedback"></div>
                <p>Status: <strong id="maintenance-status">${isMaintenanceMode ? 'AKTIF' : 'NONAKTIF'}</strong></p>
                <button id="toggle-maintenance-btn" style="width:100%; background: ${isMaintenanceMode ? 'var(--danger-color)' : 'var(--success-color)'};">
                    ${isMaintenanceMode ? 'Nonaktifkan Mode Pemeliharaan' : 'Aktifkan Mode Pemeliharaan'}
                </button>
            </div>

            <div class="admin-section">
                <h2>Manajemen Database</h2>
                <div id="db-feedback"></div>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <button id="backup-db-btn" style="flex: 1;">Unduh Backup Database</button>
                </div>
                <h3>Pulihkan Database (Unggah db.json)</h3>
                <form id="restore-db-form" class="file-upload-form" enctype="multipart/form-data">
                    <input type="file" id="db-file-input" name="dbFile" accept=".json" required>
                    <button type="submit">Pulihkan Database</button>
                </form>
            </div>

           <div class="admin-section">
            <h2>Persetujuan Pengguna Baru</h2>
            </div>

        <div class="admin-section">
            <h2>Lihat Log Transaksi Pengguna</h2>
            <div id="user-log-feedback"></div>
            <div class="form-group">
        <input type="text" id="log-user-search" placeholder="🔍 Ketik nama/email untuk filter..." autocomplete="off">
    </div>
            <div class="form-group">
                <label for="user-log-select">Pilih Pengguna:</label>
                <div style="display: flex; gap: 1rem;">
                    <select id="user-log-select" required style="flex-grow: 1;">
                        <option value="">-- Muat pengguna... --</option>
                    </select>
                    <button id="view-user-log-btn" class="secondary" disabled>Lihat Log</button>
                </div>
            </div>
        </div>
        <div class="admin-section">
            <h2>Informasi & Manajemen Saldo</h2>
            <div id="balance-feedback"></div>
            <hr>
             <div class="form-group">
        <input type="text" id="saldo-user-search" placeholder="🔍 Ketik nama/email untuk filter..." autocomplete="off">
    </div>
            <h3>Tambah/Kurangi Saldo Pengguna</h3>
            <form id="update-balance-form" class="balance-controls">
                <label for="user-select">Pilih Pengguna:</label>
                <select id="user-select" required style="flex-grow: 1;"></select>
                <label for="amount-input">Jumlah (Gunakan '-' untuk mengurangi):</label>
                <input type="number" id="amount-input" placeholder="e.g., 50000 atau -10000" required>
                <button type="submit">Update Saldo</button>
            </form>

            <h3>Hapus Akun Pengguna</h3>
            <form id="delete-user-form" class="balance-controls">
                <label for="user-select-delete">Pilih Pengguna:</label>
                <select id="user-select-delete" required style="flex-grow: 1;"></select>
                <button type="submit" style="background: var(--danger-color); color: #fff;">Hapus Akun</button>
            </form>
        </div>


        <div class="admin-section">
             <h2>Informasi Saldo KMSP</h2>
             <div id="balance-feedback"></div>
             <div class="balance-info-display">
                 <p>Saldo KMSP Anda Saat Ini:</p>
                 <strong id="kmsp-balance-display">${typeof kmspBalance === 'number' ? `Rp ${kmspBalance.toLocaleString('id-ID')}` : 'Memuat...'}</strong>
             </div>
             <button id="check-kmsp-balance-btn" style="width:100%;">Cek Saldo KMSP</button>
        </div>

            <div class="admin-section">
                <h2>Manajemen Paket</h2>
                <div id="sync-feedback"></div>
                <button id="sync-btn" style="width:100%; margin-bottom: 2rem;">Sinkronisasi Ulang Paket dari KMSP</button>
                <div id="manage-feedback"></div>
                <input type="text" id="search-package-input" placeholder="Cari nama paket...">
                <div class="admin-toolbar">
                    <button id="load-packages-btn">Muat Ulang Paket</button>
                    <button id="select-all-btn">Tampilkan Semua</button>
                    <button id="deselect-all-btn">Sembunyikan Semua</button>
                </div>
                <ul id="package-list" class="package-list"><div class="loading-spinner"></div></ul>
                <button id="save-all-btn">Simpan Semua Perubahan</button>
            </div>

            <div class="admin-section">
                <h2>Kirim Pengumuman (Kecil)</h2>
                <div id="announcement-feedback"></div>
                <form id="announcement-form">
                    <div class="form-group">
                        <label for="announcement-message">Pesan Pengumuman:</label>
                        <textarea id="announcement-message" rows="4" placeholder="Ketik pengumuman di sini..." required></textarea>
                    </div>
                    <button type="submit">Kirim Pengumuman</button>
                </form>
            </div>
        </div>
    `;


     // --- TEMPAT ANDA MELETAKKAN KODE YANG DIBERIKAN ---
    document.getElementById('view-user-log-btn')?.addEventListener('click', handleViewUserLog);
    // Event listener untuk tombol 'Toggle Maintenance Mode'
    document.getElementById('toggle-maintenance-btn')?.addEventListener('click', async () => {
        const button = document.getElementById('toggle-maintenance-btn');
        button.disabled = true;
        button.textContent = 'Memperbarui...';
        displayFeedback('maintenance-feedback', '', false);

        const newStatus = !isMaintenanceMode;
        try {
            const { data, status } = await apiFetch('/admin/maintenance', { method: 'POST', body: { enable: newStatus } });
            if (status === 200 && data.status) {
                isMaintenanceMode = newStatus; // Update global state
                document.getElementById('maintenance-status').textContent = newStatus ? 'AKTIF' : 'NONAKTIF';
                button.style.background = newStatus ? 'var(--danger-color)' : 'var(--success-color)';
                button.textContent = newStatus ? 'Nonaktifkan Mode Pemeliharaan' : 'Aktifkan Mode Pemeliharaan';
                displayFeedback('maintenance-feedback', data.message, false);
                renderApp(); // Render ulang untuk melihat efek maintenance di halaman paket
            } else {
                throw new Error(data.message || 'Gagal mengubah status maintenance.');
            }
        } catch (error) {
            displayFeedback('maintenance-feedback', error.message, true);
        } finally {
            button.disabled = false;
        }
    });


    // JavaScript untuk Admin Panel (di dalam fungsi renderAdminDashboard)
    
    /**
     * Merender daftar paket ke elemen list di panel admin.
     * @param {Array<Object>} packages - Array objek paket.
     */
    function renderPackageList(packages) {
    const listElement = document.getElementById('package-list');
    if (!listElement) { console.error("Elemen package-list tidak ditemukan."); return; }
    
    if (!packages || packages.length === 0) {
        listElement.innerHTML = '<li>Tidak ada paket ditemukan. Coba sinkronisasi terlebih dahulu.</li>';
        return;
    }
    packages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    listElement.innerHTML = packages.map(pkg => `
        <li class="package-item" data-package-id="${pkg.package_code}">
            <div class="package-info">
                <strong>${pkg.name || 'Nama Tidak Tersedia'}</strong>
                <small>Harga Provider: Rp ${(pkg.original_price || 0).toLocaleString('id-ID')}</small>
            </div>
            <div class="package-controls">
                <label>Biaya: <input type="number" class="fee-input" value="${pkg.platform_fee || 0}"></label>
                <label>Kategori: 
                    <select class="category-select">
                        <option value="reguler" ${(!pkg.category || pkg.category === 'reguler') ? 'selected' : ''}>Reguler (OTP)</option>
                        <option value="non-otp" ${pkg.category === 'non-otp' ? 'selected' : ''}>Non-OTP (Akrab)</option>
                    </select>
                </label>
                
                <label>Multi Tembak: <input type="checkbox" class="multi-purchase-checkbox" ${pkg.isMultiPurchase ? 'checked' : ''}></label>
                <label>Tampilkan: <input type="checkbox" class="visibility-checkbox" ${pkg.isVisible ? 'checked' : ''}></label>
            </div>
        </li>
    `).join('');
}

/**
 * FUNGSI BARU: Mengisi semua dropdown pengguna dengan data yang sudah difilter.
 */
function populateUserDropdowns(searchTerm = '') {
    const lowercasedTerm = searchTerm.toLowerCase();

    // Filter daftar master pengguna berdasarkan nama atau email
    const filteredUsers = allAdminUsers.filter(user => 
        user.name.toLowerCase().includes(lowercasedTerm) || 
        user.email.toLowerCase().includes(lowercasedTerm)
    );

    const dropdownsToPopulate = [
        document.getElementById('user-select'),
        document.getElementById('user-select-delete'),
        document.getElementById('user-log-select')
    ];

    dropdownsToPopulate.forEach(dropdown => {
        if (dropdown) {
            const selectedValue = dropdown.value; // Simpan nilai terpilih jika ada
            dropdown.innerHTML = ''; // Kosongkan daftar

            if (filteredUsers.length === 0) {
                dropdown.innerHTML = '<option value="">Pengguna tidak ditemukan</option>';
                return;
            }

            dropdown.innerHTML = '<option value="">-- Pilih Pengguna --</option>';
            filteredUsers.forEach(user => {
                if (dropdown.id === 'user-select-delete' && currentUser.id === user.id) {
                    return; // Jangan tampilkan admin di daftar hapus akun
                }
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name} (${user.email}) - Saldo: ${user.balance.toLocaleString('id-ID')}`;
                dropdown.appendChild(option);
            });

            // Coba pulihkan nilai yang tadi dipilih
            if (filteredUsers.some(u => u.id === selectedValue)) {
                dropdown.value = selectedValue;
            }
        }
    });
}
// --- KODE LENGKAP UNTUK FITUR FILTER PENGGUNA ---

/**
 * FUNGSI BARU: Mengisi semua dropdown pengguna dengan data yang sudah difilter.
 */
function populateUserDropdowns(searchTerm = '') {
    const lowercasedTerm = searchTerm.toLowerCase();
    
    // Filter daftar master pengguna berdasarkan nama atau email
    const filteredUsers = allAdminUsers.filter(user => 
        user.name.toLowerCase().includes(lowercasedTerm) || 
        user.email.toLowerCase().includes(lowercasedTerm)
    );

    const dropdownsToPopulate = [
        document.getElementById('user-select'),
        document.getElementById('user-select-delete'),
        document.getElementById('user-log-select')
    ];

    dropdownsToPopulate.forEach(dropdown => {
        if (dropdown) {
            const selectedValue = dropdown.value; // Simpan nilai terpilih jika ada
            dropdown.innerHTML = ''; // Kosongkan daftar

            if (filteredUsers.length === 0) {
                dropdown.innerHTML = '<option value="">Pengguna tidak ditemukan</option>';
            } else {
                dropdown.innerHTML = '<option value="">-- Pilih Pengguna --</option>';
                filteredUsers.forEach(user => {
                    // Jangan tampilkan admin yang sedang login di dropdown Hapus Akun
                    if (dropdown.id === 'user-select-delete' && currentUser.id === user.id) {
                        return;
                    }
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.name} (${user.email}) - Saldo: ${user.balance.toLocaleString('id-ID')}`;
                    dropdown.appendChild(option);
                });
            }

            // Coba pulihkan nilai yang tadi dipilih jika masih ada di daftar hasil filter
            if (filteredUsers.some(u => u.id === selectedValue)) {
                dropdown.value = selectedValue;
            }
        }
    });

    // Perbarui status tombol 'Lihat Log' setelah memfilter
    const logButton = document.getElementById('view-user-log-btn');
    const logSelect = document.getElementById('user-log-select');
    if(logButton && logSelect) {
        logButton.disabled = !logSelect.value;
    }
}

/**
 * FUNGSI LAMA (DIGANTI): Sekarang hanya bertugas mengambil data awal.
 */
async function loadUsers() {
    try {
        const { data } = await apiFetch('/admin/users');
        if (!data.status || !Array.isArray(data.data)) {
            throw new Error(data.message || `Gagal memuat daftar pengguna.`);
        }
        
        // Simpan data master ke variabel global
        allAdminUsers = data.data.sort((a, b) => a.name.localeCompare(b.name));
        
        // Panggil fungsi untuk mengisi dropdown pertama kali (tanpa filter)
        populateUserDropdowns('');

        // Logika untuk daftar persetujuan pengguna (tidak berubah)
        const pendingList = document.getElementById('pending-users-list');
        if (pendingList) {
            const pendingUsers = allAdminUsers.filter(u => u.status === 'pending');
            pendingList.innerHTML = pendingUsers.length > 0 ? pendingUsers.map(user => `
    <li class="user-item-admin" data-user-id="${user.id}">
        <div class="user-info-admin">
            <strong>${user.name}</strong>
            <span>${user.email}</span>
        </div>

        <div class="user-actions">
            <button class="approve-user-btn">Setujui</button>
            <button class="reject-user-btn danger">Tolak</button> 
        </div>
    </li>`).join('') : '<li>Tidak ada pengguna yang menunggu persetujuan.</li>';
            document.querySelectorAll('.approve-user-btn').forEach(button => button.addEventListener('click', handleApproveUser));
            document.querySelectorAll('.reject-user-btn').forEach(button => button.addEventListener('click', handleRejectUser));
        }

    } catch (error) {
        console.error('Gagal memuat pengguna:', error);
        displayFeedback('balance-feedback', `Gagal memuat daftar pengguna: ${error.message}`, true);
    }
}
   
/**
 * Event handler untuk form 'Tambah/Kurangi Saldo Pengguna'.
 * Memanggil API untuk memperbarui saldo pengguna tertentu.
 */
document.getElementById('update-balance-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Memproses...';
    displayFeedback('balance-feedback', '', false);

    try {
        const userId = form.querySelector('#user-select')?.value;
        const amountInput = form.querySelector('#amount-input')?.value;
        
        // Mengubah input menjadi angka, bisa positif atau negatif
        const amount = parseFloat(amountInput);

        if (!userId) {
            throw new Error('Silakan pilih pengguna terlebih dahulu.');
        }
        if (isNaN(amount) || amount === 0) {
            throw new Error("Masukkan jumlah yang valid (bukan nol). Gunakan angka negatif untuk mengurangi, contoh: -10000.");
        }

        const { data, status } = await apiFetch('/admin/update-balance', {
            method: 'POST',
            body: { userId, amount }
        });

        if (status === 200 && data.status) {
            showToast(data.message);
            // Bersihkan input setelah berhasil
            form.querySelector('#amount-input').value = ''; 
            // Muat ulang daftar pengguna untuk memperbarui tampilan saldo di dropdown
            loadUsers(); 
        } else {
            throw new Error(data.message || 'Gagal memperbarui saldo: Respons tidak valid.');
        }
    } catch (error) {
        showToast(error.message, true);
        displayFeedback('balance-feedback', error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});
   

    /**
     * Event handler untuk form 'Hapus Akun Pengguna'.
     * Memanggil API untuk menghapus akun pengguna tertentu.
     */
    document.getElementById('delete-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true; button.textContent = '...';
        displayFeedback('balance-feedback', '', false);
        try {
            const userId = document.getElementById('user-select-delete')?.value;
            if (!userId) {
                throw new Error('Pilih pengguna yang ingin dihapus.');
            }
            if (!confirm('Apakah Anda yakin ingin menghapus akun pengguna ini? Tindakan ini tidak dapat dibatalkan.')) {
                button.disabled = false; button.textContent = originalText;
                return;
            }
            const { data, status } = await apiFetch('/admin/delete-user', { method: 'POST', body: { userId } });
            if (status === 200 && data.status) {
                displayFeedback('balance-feedback', data.message, false);
                loadUsers();
            } else {
                throw new Error(data.message || 'Gagal menghapus pengguna: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('balance-feedback', error.message, true);
        } finally {
            button.disabled = false; button.textContent = originalText;
        }
    });
    
    // Perbarui tampilan saldo KMSP saat admin panel dimuat
    const kmspBalanceDisplay2 = document.getElementById('kmsp-balance-display');
    if (kmspBalanceDisplay2) {
        kmspBalanceDisplay2.textContent = typeof kmspBalance === 'number' ? `Rp ${kmspBalance.toLocaleString('id-ID')}` : 'Memuat...';
    }

    /**
     * Event handler untuk tombol 'Sinkronisasi Ulang Paket dari KMSP'.
     * Memanggil API untuk menyinkronkan daftar paket dari sumber eksternal.
     */
    document.getElementById('sync-btn')?.addEventListener('click', async (e) => {
        if (!confirm('Apakah Anda yakin ingin melakukan sinkronisasi? Ini akan memperbarui daftar paket dari KMSP dan dapat mengatur ulang status terlihat/tidak terlihat dan fee default untuk paket baru.')) return;
        const button = e.target;
        button.disabled = true; button.textContent = 'Menyinkronkan...';
        displayFeedback('sync-feedback', '', false);
        try {
            const { data, status } = await apiFetch('/admin/sync-packages', { method: 'POST' });
            if (status === 200 && data.status) {
                displayFeedback('sync-feedback', data.message, false);
                document.getElementById('load-packages-btn')?.click(); // Muat ulang paket setelah sinkronisasi
            } else {
                throw new Error(data.message || 'Gagal sinkronisasi: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('sync-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = 'Sinkronisasi Ulang Paket dari KMSP';
        }
    });
    
    /**
     * Event handler untuk tombol 'Muat Ulang Paket'.
     * Memanggil API untuk mendapatkan daftar paket yang tersimpan di database lokal.
     */
    document.getElementById('load-packages-btn')?.addEventListener('click', async (e) => {
        const button = e.target;
        button.disabled = true; button.textContent = 'Memuat...';
        displayFeedback('manage-feedback', '', false);
        try {
            const { data, status } = await apiFetch('/admin/packages');
            if (status === 200 && data.status && Array.isArray(data.data)) {
                renderPackageList(data.data);
                displayFeedback('manage-feedback', `Berhasil memuat ${data.data.length} paket.`, false);
            } else {
                throw new Error(data.message || 'Gagal memuat paket: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('manage-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = 'Muat Ulang Paket';
        }
    });

    /**
     * Event handler untuk tombol 'Tampilkan Semua' (paket).
     */
    document.getElementById('select-all-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.visibility-checkbox').forEach(cb => cb.checked = true);
    });

    /**
     * Event handler untuk tombol 'Sembunyikan Semua' (paket).
     */
    document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.visibility-checkbox').forEach(cb => cb.checked = false);
    });

    /**
     * Event handler untuk tombol 'Simpan Semua Perubahan' pada paket.
     * Mengirim semua perubahan fee dan visibilitas paket ke backend.
     */
    document.getElementById('save-all-btn')?.addEventListener('click', async (e) => {
    const button = e.target;
    if (!confirm('Apakah Anda yakin ingin menyimpan semua perubahan pada paket?')) return;

    const updates = [];
    document.querySelectorAll('.package-item').forEach(item => {
        // Ambil semua elemen dari dalam setiap item paket
        const id = item.dataset.packageId;
        const feeInput = item.querySelector('.fee-input');
        const visibilityCheckbox = item.querySelector('.visibility-checkbox');
        const categorySelect = item.querySelector('.category-select'); // Baris ini penting
        const multiPurchaseCheckbox = item.querySelector('.multi-purchase-checkbox');

        // Dorong objek yang lengkap ke array updates
        updates.push({
            package_code: id,
            platform_fee: parseFloat(feeInput?.value || '0'),
            isVisible: visibilityCheckbox?.checked || false,
            category: categorySelect ? categorySelect.value : 'reguler',
            isMultiPurchase: multiPurchaseCheckbox?.checked || false
        });
    });

    button.disabled = true;
    button.textContent = 'Menyimpan...';
    displayFeedback('manage-feedback', '', false);

    try {
        const { data, status } = await apiFetch('/admin/packages/bulk-update', {
            method: 'PUT',
            body: { packages: updates }
        });

        if (status === 200 && data.status) {
            displayFeedback('manage-feedback', data.message, false);
            showToast('Perubahan paket berhasil disimpan!', false);
        } else {
            throw new Error(data.message || 'Gagal menyimpan perubahan.');
        }
    } catch (error) {
        displayFeedback('manage-feedback', error.message, true);
        showToast(error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = 'Simpan Semua Perubahan';
    }
});

    /**
     * Event handler untuk input pencarian paket.
     * Menyaring daftar paket yang ditampilkan berdasarkan nama.
     */
    document.getElementById('search-package-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.package-item').forEach(item => {
            const packageName = item.querySelector('strong')?.textContent.toLowerCase();
            if (packageName && packageName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    /**
     * Event handler untuk form 'Kirim Pengumuman'.
     * Mengirim pesan pengumuman ke backend untuk ditampilkan kepada pengguna.
     */
    document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Mengirim...';
        displayFeedback('announcement-feedback', '', false);
        try {
            const message = document.getElementById('announcement-message')?.value;
            if (!message || !message.trim()) {
                throw new Error('Pesan pengumuman tidak boleh kosong.');
            }
            const { data, status } = await apiFetch('/admin/announcement', {
                method: 'POST',
                body: { message }
            });
            if (status === 200 && data.status) {
                displayFeedback('announcement-feedback', data.message, false);
                const announcementMessageInput = document.getElementById('announcement-message');
                if (announcementMessageInput) announcementMessageInput.value = ''; // Bersihkan input
                fetchAnnouncement(); // Muat ulang pengumuman untuk diperbarui di dashboard pengguna
            } else {
                throw new Error(data.message || 'Gagal mengirim pengumuman: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('announcement-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });

    /**
     * Event handler untuk tombol 'Unduh Backup Database'.
     * Memulai proses unduh file database dari backend.
     */
    document.getElementById('backup-db-btn')?.addEventListener('click', () => {
        window.location.href = `${API_BASE_URL}/admin/backup-database`; // Langsung unduh file
        displayFeedback('db-feedback', 'Proses unduh backup database dimulai. Harap tunggu.', false);
    });

    /**
     * Event handler untuk form 'Pulihkan Database'.
     * Mengunggah file database ke backend untuk dipulihkan.
     */
    document.getElementById('restore-db-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Memulihkan...';
        displayFeedback('db-feedback', '', false);

        const formData = new FormData();
        const fileInput = document.getElementById('db-file-input');
        if (!fileInput || fileInput.files.length === 0) {
            displayFeedback('db-feedback', 'Harap pilih file db.json untuk diunggah.', true);
            button.disabled = false;
            button.textContent = originalText;
            return;
        }
        formData.append('dbFile', fileInput.files[0]); // Tambahkan file ke FormData

        try {
            // Menggunakan fetch standar karena FormData akan mengatur Content-Type secara otomatis
            const response = await fetch(`${API_BASE_URL}/admin/restore-database`, {
                method: 'POST',
                body: formData, 
                credentials: 'include' // Penting untuk mengirim cookie sesi
            });

            const data = await response.json(); // Respons diharapkan JSON

            if (response.ok && data.status) {
                displayFeedback('db-feedback', data.message, false);
                setTimeout(() => {
                    alert('Restore database selesai. Aplikasi akan dimuat ulang untuk menerapkan perubahan.');
                    window.location.reload(); // Muat ulang halaman untuk memuat data database yang baru
                }, 1500);
            } else {
                throw new Error(data.message || 'Gagal memulihkan database.');
            }
        } catch (error) {
            displayFeedback('db-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });

    // Inisialisasi data saat admin panel dimuat
    // Menggunakan setTimeout 0 untuk memastikan DOM sudah dirender sebelum event listener dipasang
        setTimeout(async () => {
        document.getElementById('load-packages-btn')?.click(); // Muat paket
        loadAdminStats();
        loadUsers(); // Muat pengguna
        await fetchKMSPBalance(); // Panggil fetchKMSPBalance untuk menginisialisasi display saldo
          document.getElementById('view-user-log-btn')?.addEventListener('click', handleViewUserLog);
        // ...


        // --- TAMBAHKAN DUA BLOK EVENT LISTENER BARU DI SINI ---

        document.getElementById('log-user-search')?.addEventListener('input', (e) => {
            populateUserDropdowns(e.target.value);
        });

        document.getElementById('saldo-user-search')?.addEventListener('input', (e) => {
            populateUserDropdowns(e.target.value);
        });  
        // Ambil status maintenance saat load admin panel (ini akan memperbarui UI status awal)
        try {
            const { data: maintenanceData } = await apiFetch('/admin/maintenance');
            if (maintenanceData.status) {
                isMaintenanceMode = maintenanceData.data.enabled;
                document.getElementById('maintenance-status').textContent = isMaintenanceMode ? 'AKTIF' : 'NONAKTIF';
                const toggleBtn = document.getElementById('toggle-maintenance-btn');
                if(toggleBtn) {
                    toggleBtn.style.background = isMaintenanceMode ? 'var(--danger-color)' : 'var(--success-color)';
                    toggleBtn.textContent = isMaintenanceMode ? 'Nonaktifkan Mode Pemeliharaan' : 'Aktifkan Mode Pemeliharaan';
                }
            }
        } catch (error) {
            console.error("Gagal memuat status maintenance di admin:", error);
        }
    }, 0);
}


    async function loadUsers() {
        try {
            const { data, status } = await apiFetch('/admin/users');
            const userSelect = document.getElementById('user-select');
            if (!userSelect) { console.error("Elemen user-select tidak ditemukan."); return; }
            
            userSelect.innerHTML = '<option value="">-- Pilih Pengguna --</option>'; // Opsi default
            if (status === 200 && data.status && Array.isArray(data.data)) {
                data.data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.name} (${user.email}) - Saldo: ${user.balance.toLocaleString('id-ID')}`;
                    userSelect.appendChild(option);
                });
            } else {
                 displayFeedback('balance-feedback', data.message || `Gagal memuat daftar pengguna: Respons tidak valid.`, true);
            }
        } catch (error) { 
            console.error('Gagal memuat pengguna:', error);
            displayFeedback('balance-feedback', `Gagal memuat daftar pengguna: ${error.message}`, true);
        }
    }
    
    // Perbarui tampilan saldo KMSP saat admin panel dimuat
    const kmspBalanceDisplay = document.getElementById('kmsp-balance-display');
    if (kmspBalanceDisplay) {
        kmspBalanceDisplay.textContent = typeof kmspBalance === 'number' ? `Rp ${kmspBalance.toLocaleString('id-ID')}` : 'Memuat...';
    }

    /**
     * Event handler untuk tombol 'Cek Saldo KMSP'.
     * Memanggil API untuk mendapatkan saldo KMSP terbaru.
     */
    document.getElementById('check-kmsp-balance-btn')?.addEventListener('click', async (e) => {
        const button = e.target;
        button.disabled = true; button.textContent = 'Mengecek...';
        displayFeedback('balance-feedback', '', false); // Bersihkan feedback sebelumnya
        try {
            const { data, status } = await apiFetch('/admin/kmsp-balance');
            if (status === 200 && data.status && typeof data.data?.balance !== 'undefined') {
                kmspBalance = data.data.balance; // Update variabel global
                const balanceDisplay = document.getElementById('kmsp-balance-display');
                if (balanceDisplay) {
                    balanceDisplay.textContent = `Rp ${kmspBalance.toLocaleString('id-ID')}`;
                }
                displayFeedback('balance-feedback', 'Saldo KMSP berhasil diperbarui.', false);
            } else {
                throw new Error(data.message || 'Respons saldo tidak valid dari server.');
            }
        } catch (error) {
            displayFeedback('balance-feedback', `Gagal cek saldo KMSP: ${error.message}`, true);
        } finally {
            button.disabled = false; button.textContent = 'Cek Saldo KMSP';
        }
    });
    
    /**
     * Event handler untuk form 'Tambah Saldo Pengguna'.
     * Memanggil API untuk memperbarui saldo pengguna tertentu.
     */
    document.getElementById('add-balance-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true; button.textContent = '...';
        displayFeedback('balance-feedback', '', false);
        try {
            const userId = document.getElementById('user-select')?.value;
            const amount = parseFloat(document.getElementById('amount-input')?.value);
            if (!userId || isNaN(amount) || amount <= 0) {
                throw new Error('Pilih pengguna dan masukkan jumlah yang valid.');
            }
            const { data, status } = await apiFetch('/admin/update-balance', { method: 'POST', body: { userId, amount } });
            if (status === 200 && data.status) {
                displayFeedback('balance-feedback', data.message, false);
                const amountInput = document.getElementById('amount-input');
                if (amountInput) amountInput.value = ''; // Bersihkan input
                loadUsers(); // Muat ulang daftar pengguna untuk update saldo
            } else {
                throw new Error(data.message || 'Gagal memperbarui saldo: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('balance-feedback', error.message, true);
        } finally {
            button.disabled = false; button.textContent = originalText;
        }
    });

    /**
     * Event handler untuk form 'Hapus Akun Pengguna'.
     * Memanggil API untuk menghapus akun pengguna tertentu.
     */
    document.getElementById('delete-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true; button.textContent = '...';
        displayFeedback('balance-feedback', '', false);
        try {
            const userId = document.getElementById('user-select-delete')?.value;
            if (!userId) {
                throw new Error('Pilih pengguna yang ingin dihapus.');
            }
            if (!confirm('Apakah Anda yakin ingin menghapus akun pengguna ini? Tindakan ini tidak dapat dibatalkan.')) {
                button.disabled = false; button.textContent = originalText;
                return;
            }
            // Pastikan endpoint benar: /admin/delete-user (POST)
            const { data, status } = await apiFetch('/admin/delete-user', { method: 'POST', body: { userId } });
            if (status === 200 && data.status) {
                displayFeedback('balance-feedback', data.message, false);
                loadUsers();
            } else {
                throw new Error(data.message || 'Gagal menghapus pengguna: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('balance-feedback', error.message, true);
        } finally {
            button.disabled = false; button.textContent = originalText;
        }
    });

    /**
     * Event handler untuk tombol 'Sinkronisasi Ulang Paket dari KMSP'.
     * Memanggil API untuk menyinkronkan daftar paket dari sumber eksternal.
     */
    document.getElementById('sync-btn')?.addEventListener('click', async (e) => {
        if (!confirm('Apakah Anda yakin ingin melakukan sinkronisasi? Ini akan memperbarui daftar paket dari KMSP dan dapat mengatur ulang status terlihat/tidak terlihat dan fee default untuk paket baru.')) return;
        const button = e.target;
        button.disabled = true; button.textContent = 'Menyinkronkan...';
        displayFeedback('sync-feedback', '', false);
        try {
            const { data, status } = await apiFetch('/admin/sync-packages', { method: 'POST' });
            if (status === 200 && data.status) {
                displayFeedback('sync-feedback', data.message, false);
                document.getElementById('load-packages-btn')?.click(); // Muat ulang paket setelah sinkronisasi
            } else {
                throw new Error(data.message || 'Gagal sinkronisasi: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('sync-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = 'Sinkronisasi Ulang Paket dari KMSP';
        }
    });
    
    /**
     * Event handler untuk tombol 'Muat Ulang Paket'.
     * Memanggil API untuk mendapatkan daftar paket yang tersimpan di database lokal.
     */
    document.getElementById('load-packages-btn')?.addEventListener('click', async (e) => {
        const button = e.target;
        button.disabled = true; button.textContent = 'Memuat...';
        displayFeedback('manage-feedback', '', false);
        try {
            const { data, status } = await apiFetch('/admin/packages');
            if (status === 200 && data.status && Array.isArray(data.data)) {
                renderPackageList(data.data);
                displayFeedback('manage-feedback', `Berhasil memuat ${data.data.length} paket.`, false);
            } else {
                throw new Error(data.message || 'Gagal memuat paket: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('manage-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = 'Muat Ulang Paket';
        }
    });

    /**
     * Event handler untuk tombol 'Tampilkan Semua' (paket).
     */
    document.getElementById('select-all-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.visibility-checkbox').forEach(cb => cb.checked = true);
    });

    /**
     * Event handler untuk tombol 'Sembunyikan Semua' (paket).
     */
    document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.visibility-checkbox').forEach(cb => cb.checked = false);
    });

    /**
     * Event handler untuk input pencarian paket.
     * Menyaring daftar paket yang ditampilkan berdasarkan nama.
     */
    document.getElementById('search-package-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.package-item').forEach(item => {
            const packageName = item.querySelector('strong')?.textContent.toLowerCase();
            if (packageName && packageName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    /**
     * Event handler untuk form 'Kirim Pengumuman'.
     * Mengirim pesan pengumuman ke backend untuk ditampilkan kepada pengguna.
     */
    document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Mengirim...';
        displayFeedback('announcement-feedback', '', false);
        try {
            const message = document.getElementById('announcement-message')?.value;
            if (!message || !message.trim()) {
                throw new Error('Pesan pengumuman tidak boleh kosong.');
            }
            const { data, status } = await apiFetch('/admin/announcement', {
                method: 'POST',
                body: { message }
            });
            if (status === 200 && data.status) {
                displayFeedback('announcement-feedback', data.message, false);
                const announcementMessageInput = document.getElementById('announcement-message');
                if (announcementMessageInput) announcementMessageInput.value = ''; // Bersihkan input
                fetchAnnouncement(); // Muat ulang pengumuman untuk diperbarui di dashboard pengguna
            } else {
                throw new Error(data.message || 'Gagal mengirim pengumuman: Respons tidak valid.');
            }
        } catch (error) {
            displayFeedback('announcement-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });

    /**
     * Event handler untuk tombol 'Unduh Backup Database'.
     * Memulai proses unduh file database dari backend.
     */
    document.getElementById('backup-db-btn')?.addEventListener('click', () => {
        window.location.href = `${API_BASE_URL}/admin/backup-database`; // Langsung unduh file
        displayFeedback('db-feedback', 'Proses unduh backup database dimulai. Harap tunggu.', false);
    });

    /**
     * Event handler untuk form 'Pulihkan Database'.
     * Mengunggah file database ke backend untuk dipulihkan.
     */
    document.getElementById('restore-db-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.submitter;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Memulihkan...';
        displayFeedback('db-feedback', '', false);

        const formData = new FormData();
        const fileInput = document.getElementById('db-file-input');
        if (!fileInput || fileInput.files.length === 0) {
            displayFeedback('db-feedback', 'Harap pilih file db.json untuk diunggah.', true);
            button.disabled = false;
            button.textContent = originalText;
            return;
        }
        formData.append('dbFile', fileInput.files[0]); // Tambahkan file ke FormData

        try {
            // Menggunakan fetch standar karena FormData akan mengatur Content-Type secara otomatis
            const response = await fetch(`${API_BASE_URL}/admin/restore-database`, {
                method: 'POST',
                body: formData, 
                credentials: 'include' // Penting untuk mengirim cookie sesi
            });

            const data = await response.json(); // Respons diharapkan JSON

            if (response.ok && data.status) {
                displayFeedback('db-feedback', data.message, false);
                setTimeout(() => {
                    alert('Restore database selesai. Aplikasi akan dimuat ulang untuk menerapkan perubahan.');
                    window.location.reload(); // Muat ulang halaman untuk memuat data database yang baru
                }, 1500);
            } else {
                throw new Error(data.message || 'Gagal memulihkan database.');
            }
        } catch (error) {
            displayFeedback('db-feedback', error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });

    // Inisialisasi data saat admin panel dimuat
    // Menggunakan setTimeout 0 untuk memastikan DOM sudah dirender sebelum event listener dipasang
        setTimeout(async () => {
        document.getElementById('load-packages-btn')?.click(); // Muat paket
        loadUsers(); // Muat pengguna
        await fetchKMSPBalance(); // Panggil fetchKMSPBalance untuk menginisialisasi display saldo

        // Ambil status maintenance saat load admin panel (ini akan memperbarui UI status awal)
        try {
            const { data: maintenanceData } = await apiFetch('/admin/maintenance');
            if (maintenanceData.status) {
                isMaintenanceMode = maintenanceData.data.enabled;
                document.getElementById('maintenance-status').textContent = isMaintenanceMode ? 'AKTIF' : 'NONAKTIF';
                const toggleBtn = document.getElementById('toggle-maintenance-btn');
                if(toggleBtn) {
                    toggleBtn.style.background = isMaintenanceMode ? 'var(--danger-color)' : 'var(--success-color)';
                    toggleBtn.textContent = isMaintenanceMode ? 'Nonaktifkan Mode Pemeliharaan' : 'Aktifkan Mode Pemeliharaan';
                }
            }
        } catch (error) {
            console.error("Gagal memuat status maintenance di admin:", error);
        }
    }, 0);

/**
 * Merender halaman Laporan & Statistik.
 */
function renderLaporanPage(container) {
    // Set tanggal default: 7 hari terakhir
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const defaultStartDate = sevenDaysAgo.toISOString().split('T')[0];
    const defaultEndDate = today.toISOString().split('T')[0];

    container.innerHTML = `
        <div class="page-content">
            <div class="page-header"><h1>Laporan Keuangan & Statistik</h1></div>

            <div class="admin-section filter-controls">
                <div class="form-group">
                    <label for="start-date">Dari Tanggal</label>
                    <input type="date" id="start-date" value="${defaultStartDate}">
                </div>
                <div class="form-group">
                    <label for="end-date">Sampai Tanggal</label>
                    <input type="date" id="end-date" value="${defaultEndDate}">
                </div>
                <div class="form-group">
                    <button id="view-report-btn">Tampilkan Laporan</button>
                </div>
                <div class="form-group">
                     <button id="download-report-btn" class="secondary">Unduh Excel</button>
                </div>
            </div>

            <div id="stats-summary-container" class="admin-section">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

    const viewBtn = document.getElementById('view-report-btn');
    const downloadBtn = document.getElementById('download-report-btn');
    const statsContainer = document.getElementById('stats-summary-container');

    async function fetchAndDisplayStats() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (!startDate || !endDate) {
            alert('Silakan pilih rentang tanggal.');
            return;
        }

        statsContainer.innerHTML = '<div class="loading-spinner"></div>';
        viewBtn.disabled = true; downloadBtn.disabled = true;

        try {
            const { data } = await apiFetch(`/admin/detailed-stats?startDate=${startDate}&endDate=${endDate}`);
            if (data.status) {
                const stats = data.data;
                statsContainer.innerHTML = `
                    <h2>Rangkuman untuk ${startDate} s/d ${endDate}</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Total Transaksi Sukses</h4>
                            <p>${stats.totalSuccessfulTransactions.toLocaleString('id-ID')}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Pendapatan Kotor (Pokok)</h4>
                            <p>Rp ${stats.totalGrossRevenue.toLocaleString('id-ID')}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Pendapatan Bersih (Laba)</h4>
                            <p>Rp ${stats.totalNetRevenue.toLocaleString('id-ID')}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Total Pemasukan</h4>
                            <p>Rp ${stats.totalRevenue.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                `;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            statsContainer.innerHTML = `<p class="error-message">Gagal memuat statistik: ${error.message}</p>`;
        } finally {
            viewBtn.disabled = false; downloadBtn.disabled = false;
        }
    }

    viewBtn.addEventListener('click', fetchAndDisplayStats);
    downloadBtn.addEventListener('click', () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
         if (!startDate || !endDate) {
            alert('Silakan pilih rentang tanggal untuk diunduh.');
            return;
        }
        // Memicu unduhan file dari browser
        window.location.href = `${API_BASE_URL}/admin/download-report?startDate=${startDate}&endDate=${endDate}`;
    });

    // Otomatis muat data saat halaman pertama kali dibuka
    fetchAndDisplayStats();
}


/**
 * Merender panel verifikasi nomor telepon (KMSP).
 * Ini adalah bagian dari halaman dashboard pembelian paket.
 * @returns {string} - HTML string untuk panel verifikasi telepon.
 */
function renderPhoneVerificationPanel() {
    const isVerified = !!phoneAuth.accessToken; // Cek apakah sudah ada accessToken
    const verificationPanelHTML = `
        <div class="page-content phone-verification-panel ${isVerified ? 'verified' : ''}">
            <div class="page-header" style="border-color: ${isVerified ? 'var(--success-color)' : 'var(--border-color)'};">
                <h2 style="color: ${isVerified ? 'var(--success-color)' : 'inherit'};">${isVerified ? 'Nomor Terverifikasi' : 'Verifikasi Nomor Tujuan'}</h2>
            </div>
            ${isVerified 
                ? `<div>
       <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
           <p style="margin:0;">Nomor <strong>${phoneAuth.phone}</strong> siap digunakan.</p>
           <div>
               <button id="check-active-btn" style="margin-right: 0.5rem;">Cek Paket Aktif</button>
               <button id="change-phone-btn" class="secondary" style="width: auto; padding: 0.5rem 1rem;">Ganti Nomor</button>
           </div>
       </div>
       <div id="active-packages-result" class="page-content" style="margin-top: 1rem; padding: 1rem; display: none;"></div>
   </div>`
                : `<p>Verifikasi nomor Anda satu kali untuk melakukan banyak pembelian.</p>
                   <div id="phone-verification-form">
                       <div id="phone-step">
                           <div class="form-group">
                               <label for="targetPhone">Nomor HP Tujuan (Format: 62...)</label>
                               <input type="tel" id="targetPhone" required pattern="^62\\d{9,13}$" placeholder="628xxxxxxxxxx">
                           </div>
                           <button type="button" id="request-otp-btn">Kirim OTP</button>
                       </div>
                       <div id="otp-step" style="display: none;">
                           <p>Kode OTP telah dikirim ke <strong>${phoneAuth.phone || ''}</strong>. Masukkan kode di bawah.</p>
                           <div class="form-group">
                               <label for="otp-code">Kode OTP</label>
                               <input type="text" id="otp-code" required>
                           </div>
                           <button type="button" id="verify-otp-btn">Verifikasi Nomor</button>
                       </div>
                   </div>`
            }
            <div id="phone-feedback-container"></div>
        </div>
    `;
    
    // HTML untuk manajemen sesi (opsional)
    const sessionManagementHTML = `
        <div class="page-content">
             <div class="page-header"><h2>Info Login & Sesi (Opsional)</h2></div>
             <p>Gunakan fitur di bawah ini untuk mengambil atau memperpanjang sesi login nomor HP dari perangkat lain.</p>
             <div class="form-group">
                <label for="active-access-token">Access Token Saat Ini:</label>
                <input type="text" id="active-access-token" value="${phoneAuth.accessToken || 'Didapatkan setelah login OTP atau extend'}" readonly>
             </div>
             <button id="get-token-list-btn" style="margin-bottom: 1.5rem;">Dapatkan Daftar Token Saya</button>
             <div id="token-list-feedback"></div>
             
             <hr style="margin: 1.5rem 0;">

             <div class="form-group">
                <label for="extend-phone">Nomor HP untuk Extend:</label>
                <input type="tel" id="extend-phone" placeholder="Otomatis dari token pertama">
             </div>
             <div class="form-group">
                <label for="extend-auth-id">Auth ID untuk Extend:</label>
                <input type="text" id="extend-auth-id" placeholder="Format: session_id:token">
             </div>
             <button id="extend-session-btn">Perpanjang Sesi Token Ini</button>
        </div>
    `;

    return verificationPanelHTML + sessionManagementHTML;
}

// frontend/app.js -> Ganti fungsi ini sepenuhnya

/**
 * Merender halaman pemilihan paket ke dalam container.
 * Versi ini menggunakan dropdown dengan fitur pencarian dan TIDAK menghapus panel verifikasi.
 * @param {HTMLElement} container - Elemen DOM utama yang akan diisi (mainContent).
 */
async function renderPackagesPage(container) {

    // KODE BARU: Cek saldo pengguna terlebih dahulu
    if (currentUser && currentUser.balance <= 0) {
        
        // Jika saldo 0, tampilkan panel terkunci
        const lockedHTML = `
        <div class="packages-locked-container">
            <svg class="locked-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#icon-gradient)">
                <defs>
                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#a855f7;" />
                        <stop offset="100%" style="stop-color:#6d28d9;" />
                    </linearGradient>
                </defs>
                <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zM8.25 6.75a3.75 3.75 0 117.5 0v3h-7.5v-3zM12.75 12a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0V12z" clip-rule="evenodd" />
            </svg>
            
            <h3>Kepo isinya? Top up solusinya</h3>
            <p>Saldo Anda saat ini tidak mencukupi untuk melihat dan membeli paket.</p>
            <button id="locked-topup-btn" class="topup-cta-btn">Top Up Saldo Sekarang</button>
        </div>
    `;

    // Sisa kode di bawahnya tidak perlu diubah...
    const packageSection = document.getElementById('package-selection-area');
    if (packageSection) packageSection.remove();
    container.innerHTML += lockedHTML;
    
    document.getElementById('locked-topup-btn')?.addEventListener('click', renderTopUpModal);

    return;
}
    
    // --- KODE LAMA ANDA YANG AKAN DIJALANKAN JIKA SALDO LEBIH DARI 0 ---
    // (Kode di bawah ini tidak berubah, hanya dipindahkan ke dalam blok 'else')

    const existingSection = document.getElementById('package-selection-area');
    if (existingSection) existingSection.remove();

    if (visiblePackages.length === 0) {
        try {
            const { data, status } = await apiFetch('/user/packages');
            if (status === 200 && data.status && Array.isArray(data.data)) {
                visiblePackages = data.data;
            } else {
                throw new Error(data.message || "Gagal memuat paket");
            }
        } catch (error) {
            container.innerHTML += `<div class="page-content"><p class="error-message">Gagal memuat daftar paket: ${error.message}</p></div>`;
            return;
        }
    }

    const packageSection = document.createElement('div');
    packageSection.id = 'package-selection-area';

    const multiPurchasePackages = visiblePackages.filter(pkg => pkg.isMultiPurchase === true && pkg.isVisible);
    const regularPackages = visiblePackages.filter(pkg => !pkg.isMultiPurchase && pkg.category !== 'non-otp' && pkg.isVisible);

    const multiPurchaseHTML = multiPurchasePackages.length > 0 ? `
        <div class="page-content" id="multi-purchase-section">
            <div class="page-header"><h3>Beli Multi Paket</h3></div>
            <p>Pilih satu atau lebih paket di bawah ini untuk dieksekusi secara berurutan. (Gunakan Metode ini YTTA)</p>
            <div id="multi-pulsa-feedback"></div>
            <div id="pulsa-package-list" class="checkbox-package-list">
                ${multiPurchasePackages.map(pkg => `
                    <div class="checkbox-item">
                        <input type="checkbox" id="pkg-${pkg.package_code}" data-package-id="${pkg.package_code}" class="pulsa-checkbox">
                        <label for="pkg-${pkg.package_code}">
                            <strong>${pkg.name}</strong>
                            <small>Fee: Rp ${(pkg.platform_fee || 0).toLocaleString('id-ID')}</small>
                        </label>
                    </div>
                `).join('')}
            </div>
            <button id="execute-multi-pulsa-btn" style="margin-top: 1rem;">Tembak Paket Terpilih</button>
        </div>
    ` : '';

    const regularPackagesHTML = regularPackages.length > 0 ? `
        <div class="page-content" id="regular-package-section">
            <div class="page-header"><h3>Beli Paket Satuan</h3></div>
            <div class="form-group">
                <input type="text" id="package-search-input" placeholder="🔍 Cari nama paket reguler...">
            </div>
            <div class="form-group">
                <label for="package-dropdown">Pilih paket yang tersedia:</label>
                <select id="package-dropdown">
                    <option value="">-- Muat paket... --</option>
                </select>
            </div>
            <div id="package-details-area" style="display: none; margin-top: 2rem;"></div>
        </div>
    ` : '';
    
    packageSection.innerHTML = multiPurchaseHTML + regularPackagesHTML;
    container.appendChild(packageSection);

    const packageDropdown = document.getElementById('package-dropdown');
    const searchInput = document.getElementById('package-search-input');
    const populateRegularDropdown = (searchTerm = '') => {
        if (!packageDropdown) return;
        const filtered = regularPackages.filter(pkg => pkg.name.toLowerCase().includes(searchTerm.toLowerCase()));
        packageDropdown.innerHTML = '<option value="">-- Silakan pilih paket --</option>';
        if (filtered.length > 0) {
            filtered.forEach(pkg => {
                const option = document.createElement('option');
                option.value = pkg.package_code;
                option.textContent = `${pkg.name} (Fee: Rp ${(pkg.platform_fee || 0).toLocaleString('id-ID')})`;
                packageDropdown.appendChild(option);
            });
        } else {
            packageDropdown.innerHTML = '<option value="">Paket tidak ditemukan</option>';
        }
    };
    if (packageDropdown) {
        populateRegularDropdown();
        packageDropdown.addEventListener('change', (e) => displaySelectedPackageDetails(e.target.value));
    }
    searchInput?.addEventListener('input', (e) => {
        populateRegularDropdown(e.target.value);
        displaySelectedPackageDetails('');
    });

    document.getElementById('execute-multi-pulsa-btn')?.addEventListener('click', handleMultiPulsaPurchase);
}

async function handleMultiPulsaPurchase(e) {
    const button = e.currentTarget;
    const feedbackContainer = document.getElementById('multi-pulsa-feedback');
    if (!button || !feedbackContainer) return;

    if (!phoneAuth.accessToken) {
        showToast("Silakan verifikasi nomor Anda terlebih dahulu di bagian atas.", true);
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.pulsa-checkbox:checked');
    const packagesToProcess = Array.from(selectedCheckboxes).map(cb => {
        return visiblePackages.find(p => p.package_code === cb.dataset.packageId);
    });

    if (packagesToProcess.length === 0) {
        showToast("Pilih minimal satu paket untuk dieksekusi.", true);
        return;
    }

    if (!confirm(`Anda akan mengeksekusi ${packagesToProcess.length} paket. Proses akan berjalan di browser. JANGAN tutup tab ini sampai proses selesai. Lanjutkan?`)) {
        return;
    }

    button.disabled = true;
    // Buat struktur daftar untuk log
    feedbackContainer.innerHTML = `<h4>Memulai Proses...</h4><ul id="realtime-log-list" class="realtime-log"></ul>`;
    const logList = document.getElementById('realtime-log-list');

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < packagesToProcess.length; i++) {
        const pkg = packagesToProcess[i];
        
        // Buat list item baru untuk setiap paket
        const logItem = document.createElement('li');
        logItem.id = `log-item-${pkg.package_code}`;
        logItem.innerHTML = `
            <div class="log-entry-header">
                <span class="log-icon processing"></span>
                <span>(${i + 1}/${packagesToProcess.length}) Memproses: <strong>${pkg.name}</strong></span>
            </div>
        `;
        logList.appendChild(logItem);

        try {
            const { data, status } = await apiFetch('/purchase', {
                method: 'POST',
                body: {
                    packageId: pkg.package_code,
                    phone: phoneAuth.phone,
                    accessToken: phoneAuth.accessToken,
                    paymentMethod: 'balance'
                }
            });

            if (currentUser && typeof data.newBalance === 'number') {
                currentUser.balance = data.newBalance;
                document.getElementById('user-balance').textContent = `Rp ${currentUser.balance.toLocaleString('id-ID')}`;
            }

            if (status === 200 && data.status) {
                // Update log item menjadi status BERHASIL
                logItem.innerHTML = `
                    <div class="log-entry-header">
                        <span class="log-icon success">✔</span>
                        <span>(${i + 1}/${packagesToProcess.length}) <strong>${pkg.name}</strong></span>
                    </div>
                    <div class="log-message success">${data.message}</div>
                `;
            } else {
                throw new Error(data.message || "Gagal dari provider.");
            }

        } catch (error) {
            // Update log item menjadi status GAGAL
            logItem.innerHTML = `
                <div class="log-entry-header">
                    <span class="log-icon error">❌</span>
                    <span>(${i + 1}/${packagesToProcess.length}) <strong>${pkg.name}</strong></span>
                </div>
                <div class="log-message error">${error.message}</div>
            `;
        }
        
        // Tambahkan pesan jeda jika bukan item terakhir
        if (i < packagesToProcess.length - 1) {
            const delayMessageDiv = document.createElement('div');
            delayMessageDiv.className = 'log-message';
            delayMessageDiv.innerHTML = `<div class="delay-message">Menunggu jeda ${12000 / 1000} detik...</div>`;
            logItem.appendChild(delayMessageDiv);
            await delay(11000);
        }
    }

    feedbackContainer.innerHTML += '<h4 style="margin-top: 1rem; text-align: center; color: var(--success-color);">✔ Semua Proses Selesai.</h4>';
    button.disabled = false;
    selectedCheckboxes.forEach(cb => cb.checked = false);
}

/**
 * Menampilkan detail paket di halaman Beli Paket (Reguler/OTP).
 * Versi ini TIDAK menampilkan atau memeriksa stok.
 */
function displaySelectedPackageDetails(packageCode) {
    const detailsArea = document.getElementById('package-details-area');
    if (!detailsArea) return;

    if (!packageCode) {
        detailsArea.style.display = 'none';
        detailsArea.innerHTML = '';
        return;
    }

    const pkg = visiblePackages.find(p => p.package_code === packageCode);
    if (!pkg) {
        detailsArea.innerHTML = '<p class="error-message">Detail paket tidak ditemukan.</p>';
        detailsArea.style.display = 'block';
        return;
    }

    const platformFee = pkg.platform_fee || 0;
    const isFeeCovered = currentUser.balance >= platformFee;
    const isProviderStocked = !(typeof kmspBalance === 'number' && kmspBalance <= 0 && (pkg.original_price || 0) > 0);
    const canPurchase = phoneAuth.accessToken && isFeeCovered && isProviderStocked;

    let buttonText = 'Beli Sekarang';
    if (!canPurchase) {
        if (!phoneAuth.accessToken) buttonText = "Verifikasi Nomor Dulu";
        else if (!isProviderStocked) buttonText = "Stok (Perkiraan)";
        else buttonText = 'Saldo Kurang';
    }

    detailsArea.innerHTML = `
        <div class="page-content" style="background-color: var(--light-color);">
            <div class="page-header"><h2>Detail Paket Terpilih</h2></div>
            <h4>${pkg.name}</h4>
            <p><strong>Deskripsi:</strong> ${pkg.description || 'Tidak ada deskripsi.'}</p>
            <p><strong>Biaya Layanan:</strong> Rp ${platformFee.toLocaleString('id-ID')}</p>
            <button class="purchase-btn" data-package-id="${pkg.package_code}" ${!canPurchase ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>
    `;
    detailsArea.style.display = 'block';
    
    document.querySelector('.purchase-btn')?.addEventListener('click', (e) => {
        handlePurchase(e, e.currentTarget.dataset.packageId);
    });
}

/**
 * Merender halaman riwayat transaksi ke dalam container.
 * VERSI FINAL LENGKAP: Menangani klik untuk semua jenis tombol aksi.
 */
async function renderHistoryPage(container) {
    container.innerHTML = `
        <div class="page-content">
            <div class="page-header"><h1>Riwayat Transaksi</h1></div>
            <div id="history-content"><div class="loading-spinner"></div></div>
        </div>
    `;
    const historyContent = document.getElementById('history-content');
    if (!historyContent) return;

    // --- FUNGSI HELPER UNTUK MENANGANI SEMUA AKSI DI HALAMAN RIWAYAT ---
    async function handleHistoryActions(e) {
        // Dapatkan elemen button terdekat, ini lebih aman jika di dalam tombol ada elemen lain
        const button = e.target.closest('button'); 
        if (!button) return;

        // Aksi untuk tombol "Cek Status" pada pembelian internal
        if (button.matches('.check-status-btn')) {
            const kmspTrxId = button.dataset.kmspTrxId;
            const rowId = button.dataset.rowId;
            if (!kmspTrxId || !rowId) return;

            const originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="button-spinner small"></span>';

            try {
                const { data } = await apiFetch(`/purchase/status/${kmspTrxId}`);
                if (data.status && data.data) {
                    const newStatus = data.data.status;
                    const newMessage = data.data.message || newStatus;
                    const statusCell = document.querySelector(`#${rowId} .status-cell`);
                    const actionCell = document.querySelector(`#${rowId} .action-cell`);
                    if (statusCell) {
                        statusCell.innerHTML = `<span class="status-badge status-${newStatus}">${newMessage}</span>`;
                    }
                    if (actionCell && (newStatus === 'success' || newStatus === 'failed')) {
                        actionCell.innerHTML = 'Selesai';
                    } else {
                        button.disabled = false;
                        button.innerHTML = originalText;
                    }
                } else { throw new Error(data.message || "Gagal memperbarui status."); }
            } catch (error) {
                showToast(`Gagal cek status: ${error.message}`, true);
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }

        // Aksi untuk tombol pembayaran eksternal (DANA/QRIS Provider)
        if (button.matches('.open-external-payment-btn')) {
            const paymentDetailsString = button.dataset.paymentDetails;
            if (!paymentDetailsString) return showToast('Data pembayaran tidak ditemukan.', true);
            try {
                const paymentData = JSON.parse(paymentDetailsString);
                renderExternalPaymentModal(paymentData);
            } catch (error) {
                showToast('Gagal menampilkan detail pembayaran.', true);
            }
        }
        
        // --- INI BAGIAN YANG DIPERBAIKI: Aksi untuk tombol "Tampilkan QRIS" pada Top Up ---
        if (button.matches('.open-qris-btn')) {
            const topUpId = button.dataset.topupId;
            const base64Image = button.dataset.base64Image;
            const uniqueAmount = parseFloat(button.dataset.uniqueAmount);
            const createdAt = button.dataset.createdAt;

            if (topUpId && base64Image && !isNaN(uniqueAmount) && createdAt) {
                // Panggil kembali fungsi render modal QRIS yang sudah ada
                renderQrisDisplay(base64Image, uniqueAmount, topUpId, createdAt);
            } else {
                showToast('Data QRIS pada tombol ini tidak lengkap.', true);
            }
        }
    }

    try {
        const { data } = await apiFetch('/user/transactions');
        if (data.status && Array.isArray(data.data) && data.data.length > 0) {
            historyContent.innerHTML = `
                <table class="history-table">
                    <thead>
                        <tr><th>Tanggal</th><th>Tipe</th><th>Nama/ID</th><th>Jumlah/Fee</th><th>Status</th><th>Aksi</th></tr>
                    </thead>
                    <tbody>
                        ${data.data.map(trx => {
                            const transactionId = `trx_row_${trx.id.replace(/\W/g, '')}`;
                            const type = trx.type === 'topup' ? 'Top Up' : 'Pembelian';
                            const nameOrId = trx.packageName || trx.id;
                            const amountOrFee = trx.type === 'topup' 
                                ? `Rp ${(trx.uniqueAmount || trx.baseAmount || 0).toLocaleString('id-ID')}`
                                : `Rp ${(trx.platformFee || 0).toLocaleString('id-ID')}`;
                            const statusClass = (trx.status || 'failed').toLowerCase();
                            
                            let actionButton = '---';
                            const isFinalState = ['success', 'failed', 'completed', 'expired', 'canceled'].includes(trx.status);

                            if (trx.type === 'purchase' && trx.paymentDetails) {
                                const paymentDataString = JSON.stringify(trx.paymentDetails);
                                if (trx.paymentDetails.is_qris) {
                                    actionButton = `<button class="open-external-payment-btn" data-payment-details='${paymentDataString}'>Tampilkan QRIS</button>`;
                                } else if (trx.paymentDetails.have_deeplink) {
                                    actionButton = `<button class="open-external-payment-btn" data-payment-details='${paymentDataString}'>Bayar via DANA</button>`;
                                }
                            } else if (trx.type === 'purchase' && trx.kmspTrxId && !isFinalState) {
                                actionButton = `<button class="check-status-btn secondary" data-kmsp-trx-id="${trx.kmspTrxId}" data-row-id="${transactionId}">Cek Status</button>`;
                            } else if (trx.type === 'topup' && trx.status === 'pending' && trx.qrisData?.base64Image) {
                                // Logika ini sudah benar dalam membuat tombol, masalahnya ada di event handler
                                actionButton = `<button class="open-qris-btn"
                                    data-topup-id="${trx.id}"
                                    data-base64-image="${trx.qrisData.base64Image}"
                                    data-unique-amount="${trx.qrisData.uniqueAmount}"
                                    data-created-at="${trx.createdAt}">Tampilkan QRIS</button>`;
                            }

                            return `<tr id="${transactionId}">
                                <td data-label="Tanggal">${new Date(trx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                <td data-label="Tipe">${type}</td>
                                <td data-label="Nama/ID">${nameOrId}</td>
                                <td data-label="Jumlah/Fee">${amountOrFee}</td>
                                <td data-label="Status" class="status-cell"><span class="status-badge status-${statusClass}">${trx.api_response || trx.status}</span></td>
                                <td data-label="Aksi" class="action-cell">${actionButton}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
            historyContent.querySelector('.history-table tbody')?.addEventListener('click', handleHistoryActions);
        } else {
            historyContent.innerHTML = `<p>Anda belum memiliki riwayat transaksi.</p>`;
        }
    } catch (error) {
        historyContent.innerHTML = `<p class="error-message">Gagal memuat riwayat: ${error.message}</p>`;
    }
}

/**
 * Merender modal untuk permintaan top up saldo.
 */
function renderTopUpModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Top Up Saldo</h2><button class="modal-close">&times;</button></div>
                <form id="topup-form">
                    <div class="form-group">
                        <label for="topup-amount">Jumlah Top Up (Minimal Rp 10.000)</label>
                        <input type="number" id="topup-amount" min="10000" placeholder="Contoh: 50000" required>
                    </div>
                    <button type="submit">Lanjutkan ke Pembayaran</button>
                </form>
                <div id="modal-error-container"></div>
            </div>
        </div>
    `;
    const closeModal = () => modalContainer.innerHTML = '';
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    document.getElementById('topup-form')?.addEventListener('submit', handleRequestQris);
}

/**
 * Event handler untuk mengirim permintaan QRIS top up ke backend.
 * Jika ada transaksi pending, akan menampilkan kembali QRIS yang sudah ada.
 */
async function handleRequestQris(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!button) return;
    
    button.disabled = true; button.innerHTML = `<span class="button-spinner"></span> Memproses...`;
    displayFeedback('modal-error-container', '', false); // Bersihkan feedback sebelumnya

    try {
        const amountInput = document.getElementById('topup-amount');
        if (!amountInput) throw new Error("Input jumlah top-up tidak ditemukan.");

        const amount = parseInt(amountInput.value);
        if(isNaN(amount) || amount < 10000) throw new Error("Jumlah top-up minimal adalah Rp 10.000.");
        
        const { data, status } = await apiFetch('/topup/request-qris', { 
            method: 'POST', 
            body: { amount } 
        });
        
        // Skenario 1: Transaksi baru berhasil dibuat (status: true)
        if (status === 200 && data.status && data.base64Image && typeof data.uniqueAmount === 'number' && data.topUpId && data.createdAt) {
            renderQrisDisplay(data.base64Image, data.uniqueAmount, data.topUpId, data.createdAt);
        // Skenario 2: Ada transaksi tertunda (status: false dari backend, tapi ada data QRIS)
        } else if (status === 200 && !data.status && data.topUpId && data.base64Image && typeof data.uniqueAmount === 'number' && data.createdAt) {
            displayFeedback('modal-error-container', data.message, true); // Tampilkan pesan bahwa ada transaksi tertunda
            renderQrisDisplay(data.base64Image, data.uniqueAmount, data.topUpId, data.createdAt); // Tampilkan QRIS yang tertunda
        } else {
            // Skenario 3: Gagal total atau respons tidak sesuai format
            throw new Error(data.message || 'Gagal request QRIS: Respons tidak valid atau tidak lengkap.');
        }

    } catch (error) {
        displayFeedback('modal-error-container', error.message, true);
        button.disabled = false; button.textContent = 'Lanjutkan ke Pembayaran';
    }
}

/**
 * Merender modal tampilan QRIS untuk pembayaran.
 * Mengatur timer hitung mundur dan polling status pembayaran.
 * @param {string} base64Image - Data base64 dari gambar QRIS.
 * @param {number} uniqueAmount - Jumlah unik yang harus dibayar.
 * @param {string} topUpId - ID transaksi top up.
 * @param {string} createdAt - Timestamp ISO string kapan transaksi top up dibuat.
 */
function renderQrisDisplay(base64Image, uniqueAmount, topUpId, createdAt) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    // Pastikan untuk membersihkan interval polling dan countdown sebelumnya
    if (window.activeQrisPollingInterval) clearInterval(window.activeQrisPollingInterval);
    if (window.activeQrisCountdownInterval) clearInterval(window.activeQrisCountdownInterval);

    // Hitung sisa waktu yang sebenarnya berdasarkan waktu pembuatan
    const QRIS_EXPIRATION_DURATION_MS = 5 * 60 * 1000; // 5 menit
    const timeCreated = new Date(createdAt).getTime();
    const timeRemainingMs = Math.max(0, timeCreated + QRIS_EXPIRATION_DURATION_MS - Date.now());
    let timeLeftInSeconds = Math.floor(timeRemainingMs / 1000);

    // Jika waktu sudah habis, beritahu pengguna dan jangan tampilkan modal
    if (timeLeftInSeconds <= 0) {
        alert('QR Code ini sudah kadaluarsa. Silakan buat transaksi top-up baru.');
        modalContainer.innerHTML = ''; // Pastikan modal kosong
        renderApp(); // Render ulang aplikasi untuk update riwayat/status
        return;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Scan untuk Membayar</h2><button class="modal-close" id="qris-modal-close-btn">&times;</button></div>
                <div id="qrcode-container" style="padding: 1rem; background: white; display: inline-block; border-radius: 8px; margin: 0 auto;">
                    <img src="${base64Image}" alt="QR Code Pembayaran" width="220" height="220">
                </div>
                <p style="margin-top: 1.5rem;">Total yang harus dibayar (Pastikan Tepat):</p>
                <h3 style="font-size: 1.8rem; color: var(--danger-color); letter-spacing: 1px;">Rp ${uniqueAmount.toLocaleString('id-ID')}</h3>
                <p id="payment-status">Menunggu pembayaran...</p>
                <p style="font-size: 0.9em; margin-top: 1rem;">Batas Waktu: <strong id="qris-timer">${formatTime(timeLeftInSeconds)}</strong></p>
                <div class="loading-spinner" id="payment-spinner" style="display: block;"></div>
                <button id="cancel-topup-btn" class="secondary" style="margin-top: 1.5rem; width: 100%;">Batalkan Top Up</button>
            </div>
        </div>
    `;

    window.activeQrisPollingInterval = null;
    window.activeQrisCountdownInterval = null;

    /** Fungsi untuk menutup modal dan membersihkan interval */
    const closeModal = () => {
        clearInterval(window.activeQrisPollingInterval);
        clearInterval(window.activeQrisCountdownInterval);
        window.activeQrisPollingInterval = null;
        window.activeQrisCountdownInterval = null;
        modalContainer.innerHTML = '';
        renderApp(); // Render ulang aplikasi untuk update riwayat/saldo
    };

    // Event listener untuk overlay dan tombol close modal
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.getElementById('qris-modal-close-btn')?.addEventListener('click', closeModal);

    // Event listener untuk tombol 'Batalkan Top Up'
    document.getElementById('cancel-topup-btn')?.addEventListener('click', async () => {
        if (confirm('Apakah Anda yakin ingin membatalkan transaksi top up ini?')) {
            try {
                // Panggil API untuk membatalkan transaksi top up
                const { data, status } = await apiFetch(`/topup/cancel/${topUpId}`, { method: 'POST' });
                if (status === 200 && data.status) {
                    alert('Transaksi top up berhasil dibatalkan.');
                    closeModal(); // Tutup modal setelah pembatalan
                } else {
                    alert('Gagal membatalkan transaksi: ' + (data.message || 'Terjadi kesalahan.'));
                }
            } catch (error) {
                alert('Terjadi kesalahan saat membatalkan transaksi: ' + error.message);
            }
        }
    });


    // Mulai timer hitung mundur
    const timerElement = document.getElementById('qris-timer');
    if (timerElement) {
        window.activeQrisCountdownInterval = setInterval(() => {
            timeLeftInSeconds--;
            if (timeLeftInSeconds >= 0) {
                timerElement.textContent = formatTime(timeLeftInSeconds);
            } else {
                clearInterval(window.activeQrisCountdownInterval); // Hentikan countdown
                const statusEl = document.getElementById('payment-status');
                if(statusEl) statusEl.textContent = 'Waktu pembayaran habis.';
                const spinnerEl = document.getElementById('payment-spinner');
                if(spinnerEl) spinnerEl.style.display = 'none';
                document.getElementById('cancel-topup-btn')?.setAttribute('disabled', 'true'); // Nonaktifkan tombol batal
            }
        }, 1000); // Update setiap 1 detik
    }

    // Render QR Code menggunakan library QRCode.js
    if (typeof QRCode !== 'undefined' && base64Image) {
        const qrContainer = document.getElementById('qrcode-container');
        if (qrContainer) {
            // Hapus img tag yang sudah ada jika QR code dirender ulang (dari Lihat QRIS)
            const existingImg = qrContainer.querySelector('img');
            if (existingImg) existingImg.remove();
            
            new QRCode(qrContainer, {
                text: base64Image, // Data base64 dari QRIS
                width: 220,
                height: 220,
            });
        }
    }


    // Mulai polling status pembayaran
    window.activeQrisPollingInterval = setInterval(async () => {
        // Hentikan polling jika waktu habis
        if (timeLeftInSeconds <= 0) {
            clearInterval(window.activeQrisPollingInterval);
            return;
        }
        try {
            const { data, status } = await apiFetch(`/topup/status/${topUpId}`);
            // Periksa status 'completed', 'expired', atau 'canceled' dari backend
            if (status === 200 && (data.status === 'completed' || data.status === 'expired' || data.status === 'canceled')) {
                clearInterval(window.activeQrisPollingInterval); // Hentikan polling
                clearInterval(window.activeQrisCountdownInterval); // Hentikan countdown
                const spinnerEl = document.getElementById('payment-spinner');
                const statusEl = document.getElementById('payment-status');
                const cancelBtn = document.getElementById('cancel-topup-btn');
                if (spinnerEl) spinnerEl.style.display = 'none';
                if (cancelBtn) cancelBtn.style.display = 'none'; // Sembunyikan tombol batal setelah status final
                
                if(data.status === 'completed') {
                    if (statusEl) {
                        statusEl.textContent = 'Pembayaran Berhasil!';
                        statusEl.style.color = 'var(--success-color)';
                    }
                    alert('Top up berhasil! Saldo Anda telah ditambahkan.');
                    await checkLoginStatus(); 
                    closeModal(); // Tutup modal setelah sukses
                } else if (data.status === 'expired') {
                     if (statusEl) statusEl.textContent = 'Waktu pembayaran habis.';
                } else if (data.status === 'canceled') {
                    if (statusEl) {
                        statusEl.textContent = 'Transaksi dibatalkan.';
                        statusEl.style.color = 'var(--danger-color)';
                    }
                }
                setTimeout(() => closeModal(), 2000); // Tutup modal setelah 2 detik menampilkan status
            }
        } catch (error) {
            console.error("Polling error:", error);
            // Jika transaksi tidak ditemukan (misal dihapus dari backend), hentikan polling
            if (error.message.includes('404')) clearInterval(window.activeQrisPollingInterval);
        }
    }, 10000); // Polling setiap 10 detik
}

/**
 * Fungsi helper untuk memformat waktu dari detik ke MM:SS.
 * @param {number} seconds - Jumlah detik.
 * @returns {string} - Waktu dalam format MM:SS.
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Merender modal tampilan status akhir transaksi (sukses/gagal).
 * @param {string} title - Judul modal.
 * @param {string} message - Pesan status.
 */
function renderFinalStatusModal(title, message) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>${title}</h2></div>
                <p>${message}</p>
                <div style="text-align: right; margin-top: 1.5rem;">
                    <button id="close-final-modal" class="secondary" style="width: auto;">Tutup</button>
                </div>
            </div>
        </div>
    `;
    const closeModal = () => {
        modalContainer.innerHTML = '';
        renderApp(); // Render ulang aplikasi setelah modal ditutup
    };
    document.getElementById('close-final-modal')?.addEventListener('click', closeModal);
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if(e.target === e.currentTarget) closeModal(); });
}


// ===============================================
// === FUNGSI TEMPLATE & RENDER HALAMAN ==========
// ===============================================

/**
 * Merender halaman login ke elemen 'app'.
 * Mengatur event listener untuk form login.
 */
// (Fungsi-fungsi seperti renderLoginPage, renderRegisterPage, renderDashboard, renderAdminDashboard,
// renderPhoneVerificationPanel, renderPackagesPage, renderHistoryPage, renderTopUpModal,
// handleRequestQris, renderQrisDisplay, formatTime, renderFinalStatusModal sudah didefinisikan sebelumnya,
// dan tidak diulang di sini untuk brevity)

// ===============================================
// === EVENT HANDLERS & LOGIKA API UMUM ==========
// ===============================================

/**
 * Menyiapkan event listener untuk fitur verifikasi telepon.
 */
function setupPhoneVerificationListeners() {
    document.getElementById('request-otp-btn')?.addEventListener('click', handleRequestPhoneOtp);
    document.getElementById('verify-otp-btn')?.addEventListener('click', handlePhoneLogin);
     document.getElementById('check-active-btn')?.addEventListener('click', handleCheckActivePackages);
    document.getElementById('change-phone-btn')?.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin mengganti nomor terverifikasi?')) {
            phoneAuth = { phone: null, accessToken: null, authId: null };
            localStorage.removeItem('kmspAuth');
            renderApp(); // Render ulang untuk menampilkan form verifikasi
        }
    });
    document.getElementById('extend-session-btn')?.addEventListener('click', handleManualExtend);
    document.getElementById('get-token-list-btn')?.addEventListener('click', handleGetTokenList);
}

/**
 * Event handler untuk mendapatkan daftar token KMSP.
 */
async function handleGetTokenList(e) {
    const button = e.currentTarget;
    if (!button) return;
    
    button.disabled = true;
    button.textContent = 'Mendapatkan...';
    displayFeedback('token-list-feedback', '', false); // Bersihkan feedback sebelumnya
    
    try {
        const { data, status } = await apiFetch('/auth/token-list');
        if (status === 200 && data.status && Array.isArray(data.data) && data.data.length > 0) {
            const firstToken = data.data[0];
            const extendPhoneInput = document.getElementById('extend-phone');
            const extendAuthIdInput = document.getElementById('extend-auth-id');

            if (extendPhoneInput) extendPhoneInput.value = firstToken.msisdn;
            if (extendAuthIdInput) extendAuthIdInput.value = `${firstToken.session_id}:${firstToken.token}`;
            
            displayFeedback('token-list-feedback', 'Token pertama berhasil dimuat ke dalam form.', false);
        } else {
            throw new Error(data.message || 'Tidak ada token aktif yang ditemukan atau respons tidak valid.');
        }
    } catch(error) {
        displayFeedback('token-list-feedback', error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = 'Dapatkan Daftar Token Saya';
    }
}

/**
 * Event handler untuk memperpanjang sesi KMSP secara manual.
 */
async function handleManualExtend(e) {
    const button = e.currentTarget;
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memperpanjang...`;
    displayFeedback('token-list-feedback', '', false); // Bersihkan feedback sebelumnya

    const phoneInput = document.getElementById('extend-phone');
    const authIdInput = document.getElementById('extend-auth-id');
    
    if (!phoneInput || !authIdInput) {
        displayFeedback('token-list-feedback', 'Elemen input telepon atau auth ID tidak ditemukan.', true);
        button.disabled = false;
        button.textContent = 'Perpanjang Sesi Token Ini';
        return;
    }

    const phone = phoneInput.value;
    const authId = authIdInput.value;

    if (!phone || !authId) {
        displayFeedback('token-list-feedback', 'Nomor HP dan Auth ID untuk extend tidak boleh kosong.', true);
        button.disabled = false;
        button.textContent = 'Perpanjang Sesi Token Ini';
        return;
    }

    try {
        const { data, status } = await apiFetch('/auth/extend-session', {
            method: 'POST',
            body: { phone, auth_id: authId }
        });

        if (status === 200 && data.status && data.data) {
            phoneAuth.phone = phone;
            phoneAuth.accessToken = data.data.access_token;
            phoneAuth.authId = data.data.auth_id;
            localStorage.setItem('kmspAuth', JSON.stringify({ phone: phoneAuth.phone, authId: data.data.auth_id }));
            displayFeedback('token-list-feedback', 'Sesi berhasil diperpanjang!', false);
            renderApp(); // Render ulang untuk update status verifikasi
        } else {
            throw new Error(data.message || 'Gagal memperpanjang sesi: Respons tidak valid.');
        }
    } catch (error) {
        displayFeedback('token-list-feedback', error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = 'Perpanjang Sesi Token Ini';
    }
}

/**
 * Event handler untuk meminta kode OTP verifikasi telepon.
 */
async function handleRequestPhoneOtp(e) {
    const button = e.target;
    if (!button) return;

    const phoneInput = document.getElementById('targetPhone');
    if (!phoneInput) {
        displayFeedback('phone-feedback-container', 'Elemen input nomor telepon tidak ditemukan.', true);
        return;
    }

    if (!phoneInput.checkValidity()) {
        displayFeedback('phone-feedback-container', 'Format nomor telepon salah. Gunakan format 62xxx (contoh: 6281234567890).', true);
        return;
    }
    button.disabled = true; button.innerHTML = `<span class="button-spinner"></span> Mengirim...`;
    displayFeedback('phone-feedback-container', '', false); // Bersihkan feedback sebelumnya
    try {
        const { data, status } = await apiFetch('/phone/request-otp', { method: 'POST', body: { phone: phoneInput.value } });
        if (status === 200 && data.status && data.data) {
            phoneAuth.phone = phoneInput.value;
            phoneAuth.authId = data.data.auth_id;
            const phoneStep = document.getElementById('phone-step');
            const otpStep = document.getElementById('otp-step');
            if (phoneStep) phoneStep.style.display = 'none';
            if (otpStep) {
                otpStep.style.display = 'block';
                const otpStrong = otpStep.querySelector('strong');
                if (otpStrong) otpStrong.textContent = phoneAuth.phone;
            }
            displayFeedback('phone-feedback-container', data.message || 'OTP berhasil dikirim!', false);
        } else {
            throw new Error(data.message || 'Gagal meminta OTP dari provider: Respons tidak valid.');
        }
    } catch(error) {
        displayFeedback('phone-feedback-container', error.message, true);
        button.disabled = false; button.textContent = 'Kirim OTP';
    }
}

/**
 * Event handler untuk memverifikasi kode OTP dan login telepon.
 */
async function handlePhoneLogin(e) {
    const button = e.target;
    if (!button) return;

    button.disabled = true; button.innerHTML = `<span class="button-spinner"></span> Memverifikasi...`;
    displayFeedback('phone-feedback-container', '', false); // Bersihkan feedback sebelumnya
    try {
        const otpInput = document.getElementById('otp-code');
        if (!otpInput) throw new Error("Elemen input OTP tidak ditemukan.");
        const otp = otpInput.value;

        if (!phoneAuth.phone || !phoneAuth.authId) {
            throw new Error("Sesi verifikasi nomor tidak lengkap. Coba minta OTP lagi.");
        }

        const { data, status } = await apiFetch('/phone/verify-otp', {
            method: 'POST', body: { phone: phoneAuth.phone, auth_id: phoneAuth.authId, otp }
        });
        
        if (status === 200 && data.status && data.data) {
            phoneAuth.accessToken = data.data.access_token;
            phoneAuth.authId = data.data.auth_id;
            localStorage.setItem('kmspAuth', JSON.stringify({ phone: phoneAuth.phone, authId: phoneAuth.authId }));
            renderApp(); // Render ulang untuk update status verifikasi
        } else {
            throw new Error(data.message || "Gagal memverifikasi OTP, respons tidak valid.");
        }

    } catch(error) {
        displayFeedback('phone-feedback-container', error.message, true);
        button.disabled = false;
        button.textContent = 'Verifikasi Nomor';
    }
}

/**
 * Fungsi utilitas untuk melakukan permintaan API ke backend.
 * Menangani parsing respons, error HTTP, dan redirect otentikasi.
 * @param {string} endpoint - URL endpoint API relatif terhadap API_BASE_URL.
 * @param {Object} options - Opsi fetch, termasuk method, headers, dan body.
 * @returns {Promise<Object>} - Promise yang me-resolve dengan { data, status } dari respons.
 * @throws {Error} - Jika terjadi error jaringan atau respons API tidak valid.
 */
async function apiFetch(endpoint, options = {}) {
    try {
        const config = {
            method: options.method || 'GET',
            headers: { ...options.headers },
            credentials: 'include',
        };

        if (options.body && !(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(options.body);
        } else if (options.body instanceof FormData) {
            config.body = options.body;
        }

        const response = await fetch(API_BASE_URL + endpoint, config);

        // --- PERBAIKAN UTAMA DI SINI ---
        if (response.status === 401 || response.status === 403) {
            currentUser = null;
            localStorage.removeItem('kmspAuth');
            
            const currentHash = window.location.hash.split('?')[0];

            // Hanya redirect paksa jika pengguna TIDAK sedang berada di halaman login atau register.
            // Ini mencegah 'reset' URL saat mencoba admin login.
            if (currentHash !== '#login' && currentHash !== '#register') {
                window.location.hash = '#login';
            }
            
            // Tetap lempar error agar proses lain tahu bahwa permintaan gagal.
            const errorData = await response.json();
            throw new Error(errorData.message || `Akses Ditolak (HTTP ${response.status})`);
        }
        // --- AKHIR PERBAIKAN ---

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (!response.ok && response.status !== 202) {
                 throw new Error(data.message || `Terjadi kesalahan pada server (HTTP ${response.status})`);
            }
            return { data, status: response.status };
        } else {
            const textResponse = await response.text();
            throw new Error(`Respons dari server bukan format JSON. Respons: ${textResponse.substring(0, 150)}...`);
        }
    } catch (error) {
        // Jangan redirect dari sini, biarkan penanganan error di atas yang melakukannya.
        console.error("Kesalahan API Fetch:", error.message);
        if (error.message.includes('Failed to fetch')) {
             throw new Error("Gagal terhubung ke server. Pastikan server backend berjalan.");
        }
        throw error; // Lemparkan kembali error agar bisa ditangani oleh fungsi pemanggil.
    }
}

/**
 * Fungsi utilitas untuk menampilkan pesan feedback (sukses/error) di UI.
 * Pesan akan otomatis hilang setelah beberapa detik.
 * @param {string} containerId - ID elemen HTML tempat pesan akan ditampilkan.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} isError - True jika pesan error, false jika pesan sukses.
 */
function displayFeedback(containerId, message, isError = true) {
    const container = document.getElementById(containerId);
    if(container) {
        // Hapus pesan lama jika ada
        const existingP = container.querySelector('p');
        if (existingP) existingP.remove();

        if (!message) return; // Jangan tampilkan apa-apa jika pesan kosong

        const messageClass = isError ? 'error-message' : 'success-message';
        const p = document.createElement('p');
        p.className = messageClass;
        p.style.margin = '1rem 0'; // Style inline untuk margin
        p.textContent = message;
        container.appendChild(p);

        // Pesan akan hilang setelah 7 detik
        setTimeout(() => {
            if (p.parentNode) {
                p.remove();
            }
        }, 7000);
    }
}

/**
 * Event handler untuk form registrasi.
 * Mengirim data registrasi ke backend.
 */
async function handleRegister(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!button) return;
    
    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memproses...`;
    displayFeedback('feedback-container', '', false); // Bersihkan feedback sebelumnya

    try {
        const name = e.target.elements.name.value;
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const { data, status } = await apiFetch('/auth/register', { method: 'POST', body: { name, email, password } });
        
        // Periksa status HTTP dan status dari data API
        if (status === 201 && data.status) { // Status 201 Created untuk sukses registrasi
            displayFeedback('feedback-container', data.message, false);
            // Arahkan ke halaman login setelah 2 detik
            setTimeout(() => { window.location.hash = 'login'; renderApp() }, 2000);
        } else {
            throw new Error(data.message || 'Registrasi gagal: Respons tidak valid.');
        }
    } catch (error) {
        displayFeedback('feedback-container', error.message, true); // Tampilkan pesan error
        button.disabled = false;
        button.textContent = 'Daftar';
    }
}

/**
 * Event handler untuk form login.
 * Mengirim kredensial login ke backend dan menyimpan data pengguna.
 */
async function handleLogin(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memproses...`;
    displayFeedback('feedback-container', '', false); // Bersihkan feedback sebelumnya

    try {
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const { data, status } = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
        
        // Periksa status HTTP dan data pengguna
        if (status === 200 && data.user) {
            currentUser = data.user; // Simpan data pengguna yang login
            window.location.hash = '#dashboard'; // Arahkan ke dashboard
            main(); // Panggil main untuk inisialisasi ulang dengan pengguna baru
        } else {
            throw new Error(data.message || 'Login gagal: Respons tidak valid.');
        }
    } catch (error) {
        displayFeedback('feedback-container', error.message, true); // Tampilkan pesan error
        button.disabled = false;
        button.textContent = 'Login';
    }
}

/**a
 * Event handler untuk logout.
 * Menghapus sesi pengguna dan mengarahkan ke halaman login.
 */
async function handleLogout() {
     stopStatusPolling(); 
    try {
        // apiFetch akan otomatis menangani 401/403 dan redirect ke login jika perlu
        await apiFetch('/auth/logout', { method: 'POST' }); 
    } catch (error) { 
        console.error("Logout gagal (mungkin sudah ter-redirect oleh API Fetch):", error); 
    } finally {
        // Bersihkan data pengguna dan sesi di frontend
        currentUser = null;
        phoneAuth = { phone: null, accessToken: null, authId: null };
        localStorage.removeItem('kmspAuth');
        window.location.hash = 'login'; // Arahkan ke halaman login
        renderApp(); // Render ulang aplikasi
    }
}
/**
 * Merender halaman untuk pembelian paket Non-OTP (seperti Paket Akrab).
 */
async function renderNonOtpPage(container) {
    container.innerHTML = `<div class="page-content" id="non-otp-page"><div class="loading-spinner"></div></div>`;
    const pageContent = document.getElementById('non-otp-page');

    if (isMaintenanceMode && currentUser.role !== 'admin') {
        pageContent.innerHTML = '<h2>Halaman Tidak Tersedia</h2><p>Layanan sedang dalam pemeliharaan.</p>';
        return;
    }
    
    if (visiblePackages.length === 0) {
        try {
            const { data } = await apiFetch('/user/packages');
            visiblePackages = data.data || [];
        } catch (error) {
            pageContent.innerHTML = '<p class="error-message">Gagal memuat daftar paket.</p>';
            return;
        }
    }

    const nonOtpPackages = visiblePackages.filter(p => p.category === 'non-otp' && p.isVisible);

    if (nonOtpPackages.length === 0) {
        pageContent.innerHTML = '<div class="page-header"><h1>Paket Akrab & Lainnya</h1></div><p>Saat ini tidak ada paket yang tersedia di kategori ini.</p>';
        return;
    }

    const packageOptions = nonOtpPackages.map(pkg => `<option value="${pkg.package_code}">${pkg.name} (Fee: Rp ${(pkg.platform_fee || 0).toLocaleString('id-ID')})</option>`).join('');

    pageContent.innerHTML = `
        <div class="page-header"><h1>Paket Akrab & Lainnya</h1></div>
        <p>Beli paket tanpa perlu verifikasi OTP di halaman ini. Cukup masukkan nomor tujuan.</p>
        
        <div class="page-content" style="margin-top: 1.5rem;">
            <form id="non-otp-purchase-form">
                
                <div class="form-group">
                    <button type="button" id="check-all-stock-btn" class="secondary">Cek Stok Semua Paket Akrab</button>
                </div>
                <div class="form-group">
                    <label for="non-otp-phone">Nomor HP Tujuan (Format: 62...)</label>
                    <input type="tel" id="non-otp-phone" required pattern="^62\\d{9,13}$" placeholder="628xxxxxxxxxx">
                </div>
                <div class="form-group">
                    <input type="text" id="non-otp-search-input" placeholder="🔍 Cari paket...">
                </div>
                <div class="form-group">
                    <label for="non-otp-package">Pilih Paket</label>
                    <select id="non-otp-package" required>
                        <option value="">-- Pilih Paket --</option>
                        ${packageOptions}
                    </select>
                </div>
                <div id="non-otp-details-area" style="margin-top: 1rem;"></div>
                <button type="submit">Beli Sekarang</button>
                 <div id="all-stock-results-container" style="margin-top: 1rem;"></div>
            </form>
            <div id="non-otp-feedback" style="margin-top: 1rem;"></div>
        </div>
    `;
       document.getElementById('check-all-stock-btn')?.addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const resultsContainer = document.getElementById('all-stock-results-container');
        if (!button || !resultsContainer) return;

        button.disabled = true;
        button.innerHTML = '<span class="button-spinner"></span> Mengecek semua...';
        resultsContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        // Buat array "promise" untuk setiap pengecekan stok
        const stockCheckPromises = nonOtpPackages
            // Filter hanya paket yang tidak termasuk kata kunci "stockless"
            .filter(pkg => {
                const stocklessKeywords = ['MASA AKTIF', 'SLOT AKRAB', 'REINVITE'];
                return !stocklessKeywords.some(keyword => pkg.name.toUpperCase().includes(keyword));
            })
            .map(pkg => 
                apiFetch(`/packages/stock/${pkg.package_code}`)
                    .then(response => ({
                        name: pkg.name,
                        stock: response.data.data.stock,
                        success: response.data.status,
                    }))
                    .catch(() => ({
                        name: pkg.name,
                        stock: 'Error',
                        success: false,
                    }))
            );

        // Tunggu semua promise selesai
        const results = await Promise.all(stockCheckPromises);

        // Render hasilnya menjadi daftar HTML
        const resultsHTML = results.map(result => `
            <li style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #eee;">
                <span>${result.name}</span>
                <strong style="color: ${result.stock > 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${result.success ? (result.stock > 0 ? `Stok: ${result.stock}` : '0') : 'Gagal Cek'}
                </strong>
            </li>
        `).join('');

        resultsContainer.innerHTML = `
            <div class="page-content" style="padding: 1rem; background: #f9f9f9;">
                <h3>Hasil Pengecekan Stok</h3>
                <ul style="list-style: none; padding: 0;">${resultsHTML}</ul>
            </div>
        `;

        button.disabled = false;
        button.textContent = 'Cek Stok Semua Paket Akrab';
    });
    document.getElementById('non-otp-search-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const dropdown = document.getElementById('non-otp-package');
        dropdown.innerHTML = '<option value="">-- Pilih Paket --</option>';
        nonOtpPackages
            .filter(pkg => pkg.name.toLowerCase().includes(searchTerm))
            .forEach(pkg => {
                const option = document.createElement('option');
                option.value = pkg.package_code;
                option.textContent = `${pkg.name} (Fee: Rp ${(pkg.platform_fee || 0).toLocaleString('id-ID')})`;
                dropdown.appendChild(option);
            });
    });

     document.getElementById('non-otp-package')?.addEventListener('change', (e) => {
        const packageCode = e.target.value;
        const detailsArea = document.getElementById('non-otp-details-area');
        const purchaseBtn = document.querySelector('#non-otp-purchase-form button[type="submit"]');

        if (!packageCode) {
            detailsArea.innerHTML = '';
            // Jika tidak ada paket yang dipilih, nonaktifkan tombol
            if (purchaseBtn) {
                purchaseBtn.disabled = true;
                purchaseBtn.textContent = 'Beli Sekarang'; // Reset teksnya juga
            }
            return;
        }

        const pkg = nonOtpPackages.find(p => p.package_code === packageCode);
        if (!pkg) {
            detailsArea.innerHTML = '<p class="error-message">Paket tidak ditemukan.</p>';
            return;
        }

        const stocklessKeywords = ['MASA AKTIF', 'SLOT AKRAB', 'REINVITE'];
        const isStockless = stocklessKeywords.some(keyword => pkg.name.toUpperCase().includes(keyword));

        detailsArea.innerHTML = `
            <div class="package-detail-card" style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem;">
                <p><strong>Deskripsi:</strong> ${pkg.description || 'Tidak ada deskripsi.'}</p>
                ${!isStockless ? '<div id="non-otp-stock-info" style="font-weight: bold;"></div>' : ''}
            </div>
        `;
        
        // <-- LOGIKA PERBAIKAN DI SINI -->
        if (isStockless) {
            if (purchaseBtn) {
                purchaseBtn.disabled = false;
                purchaseBtn.textContent = 'Beli Sekarang';
            }
        } else {
            checkPackageStock(packageCode, document.getElementById('non-otp-stock-info'));
        }
    });
    
    // Inisialisasi: nonaktifkan tombol beli di awal
    const initialPurchaseBtn = document.querySelector('#non-otp-purchase-form button[type="submit"]');
    if(initialPurchaseBtn) initialPurchaseBtn.disabled = true;

    document.getElementById('non-otp-purchase-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<span class="button-spinner"></span> Memproses...';
        displayFeedback('non-otp-feedback', '', false);

        const phone = document.getElementById('non-otp-phone').value;
        const packageId = document.getElementById('non-otp-package').value;
        
        try {
            const { data, status } = await apiFetch('/purchase/non-otp', {
                method: 'POST',
                body: { phone, packageId, paymentMethod: 'balance' }
            });

            if (status === 200 && data.status) {
                if (typeof data.newBalance === 'number') {
                    currentUser.balance = data.newBalance;
                    const userBalanceElement = document.getElementById('user-balance');
                    if(userBalanceElement) {
                        userBalanceElement.textContent = `Rp ${currentUser.balance.toLocaleString('id-ID')}`;
                    }
                }
                showToast(data.message); 
                e.target.reset();
                document.getElementById('non-otp-details-area').innerHTML = '';
            } else {
                throw new Error(data.message || "Pembelian gagal.");
            }
        } catch (error) {
            showToast(error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = 'Beli Sekarang';
        }
    });
}

/**
 * Mengecek stok paket ke backend dan memperbarui UI.
 * @param {string} packageId - Kode paket yang akan dicek.
 * @param {HTMLElement} targetElement - Elemen DOM untuk menampilkan info stok.
 */
async function checkPackageStock(packageId, targetElement) {
    if (!targetElement) return;
    if (!packageId) {
        targetElement.innerHTML = '';
        return;
    }
    targetElement.innerHTML = `<p>Memeriksa stok...</p>`;
    
    // Ambil referensi tombol beli sekarang di awal
    const purchaseBtn = targetElement.closest('form')?.querySelector('button[type="submit"]');

    try {
        const { data, status } = await apiFetch(`/packages/stock/${packageId}`);

        if (status === 200 && data.status) {
            const stock = data.data.stock;
            
            // Perbarui teks info stok
            targetElement.innerHTML = `<p style="color: ${stock > 0 ? 'var(--success-color)' : 'var(--danger-color)'};">Stok: ${stock > 0 ? stock : '0'}</p>`;
            
            // --- BAGIAN YANG DIPERBAIKI ---
            if (purchaseBtn) {
                // Nonaktifkan tombol jika stok habis
                purchaseBtn.disabled = (stock <= 0);

                if (stock <= 0) {
                    // Jika stok 0, ubah teks tombol
                    purchaseBtn.textContent = 'Stok 0';
                } else {
                    // JIKA STOK ADA, KEMBALIKAN TEKS TOMBOL KE SEMULA
                    purchaseBtn.textContent = 'Beli Sekarang';
                }
            }
            // --- AKHIR BAGIAN PERBAIKAN ---

        } else {
            throw new Error(data.message || 'Gagal mendapat info stok.');
        }
    } catch (error) {
        console.error("Gagal cek stok:", error.message);
        targetElement.innerHTML = `<p style="color: var(--danger-color);">Gagal memuat stok.</p>`;
        // Jika gagal cek stok, nonaktifkan juga tombolnya
        if (purchaseBtn) {
            purchaseBtn.disabled = true;
            purchaseBtn.textContent = 'Gagal Cek Stok';
        }
    }
}


/**
 * Memeriksa status login pengguna saat ini dari backend.
 * Memperbarui variabel currentUser global.
 */

async function checkLoginStatus() {
    try {
        const { data, status } = await apiFetch('/auth/me');
        if (status === 200 && data.status) {
            currentUser = data.user;
            // Update status maintenance dari respons backend
            isMaintenanceMode = data.maintenanceMode !== undefined ? data.maintenanceMode : false; // <-- UPDATE INI
        } else {
            currentUser = null;
            isMaintenanceMode = false; // Reset jika tidak login atau error
        }
    } catch (error) {
        console.error("Gagal memeriksa status login:", error);
        currentUser = null;
        isMaintenanceMode = false; // Reset jika ada error
    }
}

async function loadAdminStats() {
    try {
        const { data } = await apiFetch('/admin/statistics');
        if (data.status) {
            const stats = data.data;
            document.getElementById('revenue-today').textContent = `Rp ${stats.revenueToday.toLocaleString('id-ID')}`;
            document.getElementById('transactions-today').textContent = stats.transactionsTodayCount;
            document.getElementById('new-users-week').textContent = stats.newUsersThisWeek;
            renderPackageChart(stats.topPackages);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error("Gagal memuat statistik admin:", error.message);
        document.getElementById('revenue-today').textContent = 'Error';
        document.getElementById('transactions-today').textContent = 'Error';
        document.getElementById('new-users-week').textContent = 'Error';
    }
}

function renderPackageChart(topPackages) {
    const ctx = document.getElementById('package-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (window.myPackageChart instanceof Chart) {
        window.myPackageChart.destroy();
    }

    window.myPackageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPackages.map(p => p.name),
            datasets: [{
                label: 'Jumlah Transaksi',
                data: topPackages.map(p => p.count),
                backgroundColor: 'rgba(138, 43, 226, 0.7)',
                borderColor: 'rgba(138, 43, 226, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/**
 * Menampilkan notifikasi toast yang modern.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {boolean} isError - True untuk toast error (merah), false untuk sukses (hijau).
 */
function showToast(message, isError = false) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top", // `top` atau `bottom`
        position: "right", // `left`, `center`, atau `right`
        stopOnFocus: true, // Mencegah toast hilang saat di-hover
        style: {
            background: isError 
                ? "linear-gradient(to right, #e53935, #b71c1c)" 
                : "linear-gradient(to right, #00b09b, #96c93d)",
        }
    }).showToast();
}
/**
 * Fungsi utilitas untuk mengubah visibilitas input password.
 * @param {HTMLElement} icon - Elemen ikon (SVG) yang memicu toggle.
 */
function togglePasswordVisibility(icon) {
    const passwordInput = icon.previousElementSibling;
    if (!passwordInput) return; // Pastikan input password ada
    
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    // Ganti ikon mata terbuka/tertutup
    icon.innerHTML = type === 'password' 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
}

/**
 * Merender modal yang menampilkan log transaksi untuk pengguna tertentu.
 * @param {Object} logData - Data log yang diterima dari API, berisi info user dan array logs.
 */
function renderUserLogModal(logData) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const { user, logs } = logData;

    const logsHTML = logs.length > 0
        ? `<table class="history-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Paket</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Pesan API</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => `
                  <tr>
                    <td data-label="Tanggal">${new Date(log.createdAt).toLocaleString('id-ID')}</td>
                    <td data-label="Nama Paket">${log.packageName}</td>
                    <td data-label="Fee">Rp ${(log.platformFee || 0).toLocaleString('id-ID')}</td>
                    <td data-label="Status"><span class="status-badge status-${log.status}">${log.status}</span></td>
                    <td data-label="Pesan API">${log.api_response}</td>
                  </tr>
                `).join('')}
              </tbody>
           </table>`
        : '<p>Pengguna ini belum memiliki riwayat transaksi pembelian paket.</p>';

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Log Transaksi: ${user.name}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div style="max-height: 60vh; overflow-y: auto;">
                    ${logsHTML}
                </div>
            </div>
        </div>
    `;

    const closeModal = () => modalContainer.innerHTML = '';
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if(e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
}

/**
 * Handler untuk mengambil dan menampilkan log transaksi pengguna.
 */
async function handleViewUserLog(e) {
    const button = e.currentTarget;
    // --- PERBAIKAN DI SINI ---
    // Mengambil nilai dari ID dropdown yang benar: 'user-log-select'
    const userId = document.getElementById('user-log-select')?.value; 

    if (!userId) {
        showToast("Silakan pilih pengguna terlebih dahulu.", true);
        return;
    }

    button.disabled = true;
    button.innerHTML = '<span class="button-spinner"></span>';
    // Ganti feedback container ke yang relevan
    displayFeedback('user-log-feedback', '', false);

    try {
        const { data, status } = await apiFetch(`/admin/user-logs/${userId}`);
        if (status === 200 && data.status) {
            // Panggil modal untuk menampilkan data log
            renderUserLogModal(data.data);
        } else {
            throw new Error(data.message || "Gagal mengambil data log.");
        }
    } catch (error) {
        showToast(error.message, true);
        displayFeedback('user-log-feedback', error.message, true);
    } finally {
        button.disabled = false;
        // Kembalikan teks asli tombol
        button.innerHTML = 'Lihat Log'; 
    }
}


// Jalankan fungsi main saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', main);