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
let providerBalance = null; 
let statusIntervalId = null;
let allAdminUsers = [];
// --- PERUBAHAN BARU: Variabel untuk interval polling di halaman riwayat ---
let historyPollingInterval = null;
let currentHistoryPage = 1;
const transactionsPerPage = 5;
let liveChatBubbleElement = null;
let availableTutorials = [];

class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * FUNGSI UTAMA DASHBOARD: Merender halaman dashboard utama (hub).
 * VERSI BARU: Menambahkan menu Laporan khusus untuk admin.
 * @param {HTMLElement} container - Elemen DOM (mainContent) yang akan diisi.
 */
function renderMainDashboardPage(container) {
    if (!currentUser) return;

    // Ikon-ikon yang akan kita gunakan
    const beliPaketIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;
    const paketAkrabIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    const riwayatIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`;
    const profilIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const tutorialIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    const kontakIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    const tentangIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
    const privasiIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const syaratIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    // IKON BARU: Tambahkan ikon untuk Laporan/Statistik
    const laporanIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>`;
    const rekeningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
    const dashboardContentHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1>Selamat Datang, ${currentUser.name}!</h1>
            </div>
            <div class="main-balance-card">
                <div>
                    <span class="balance-label">Saldo Anda Saat Ini</span>
                    <div class="balance-amount-wrapper">
                        <span class="currency">Rp</span>
                        <span class="amount">${currentUser.balance.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <button id="dashboard-topup-btn" class="topup-cta-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Top Up Saldo
                </button>
            </div>
            <div class="quick-access-menu">
                <h2 class="quick-access-title">Menu Cepat</h2>
                <div class="app-menu-grid">
                    <a href="#beli-paket" class="app-menu-item"><div class="app-menu-icon">${beliPaketIcon}</div><span class="app-menu-label">Beli Paket</span></a>
                    <a href="#paket-akrab" class="app-menu-item"><div class="app-menu-icon">${paketAkrabIcon}</div><span class="app-menu-label">Paket Akrab</span></a>
                    <a href="#history" class="app-menu-item"><div class="app-menu-icon">${riwayatIcon}</div><span class="app-menu-label">Riwayat</span></a>
                    <a href="#rekening-koran" class="app-menu-item"><div class="app-menu-icon">${rekeningIcon}</div><span class="app-menu-label">Lap. Keuangan</span></a>
                    <a href="#tutorial" class="app-menu-item"><div class="app-menu-icon">${tutorialIcon}</div><span class="app-menu-label">Cara Beli</span></a>
                    <a href="#kontak-admin" class="app-menu-item"><div class="app-menu-icon">${kontakIcon}</div><span class="app-menu-label">Kontak</span></a>
                    <a href="#tentang-kami" class="app-menu-item"><div class="app-menu-icon">${tentangIcon}</div><span class="app-menu-label">Tentang</span></a>
                    <a href="#kebijakan-privasi" class="app-menu-item"><div class="app-menu-icon">${privasiIcon}</div><span class="app-menu-label">Privasi</span></a>
                    <a href="#syarat-ketentuan" class="app-menu-item"><div class="app-menu-icon">${syaratIcon}</div><span class="app-menu-label">S & K</span></a>
                    <a href="#profile" class="app-menu-item"><div class="app-menu-icon">${profilIcon}</div><span class="app-menu-label">Profil</span></a>

                    ${currentUser.role === 'admin' ? `
                        <a href="#laporan" class="app-menu-item">
                            <div class="app-menu-icon">${laporanIcon}</div>
                            <span class="app-menu-label">Laporan</span>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', dashboardContentHTML);

    document.getElementById('dashboard-topup-btn')?.addEventListener('click', renderTopUpModal);
}
/**
 * FUNGSI BARU & TERISOLASI
 * Fungsi ini hanya punya satu tugas: memeriksa apakah URL saat ini adalah untuk
 * reset password. Jika ya, ia akan merender halaman dan menghentikan alur lain.
 * @returns {boolean} - Mengembalikan `true` jika rute ditangani, `false` jika tidak.
 */
function handleResetPasswordRoute() {
    // Cek hash SEBELUM aplikasi utama dimuat
    if (window.location.hash.startsWith('#reset-password')) {
        console.log('Rute #reset-password terdeteksi, menjalankan fungsi render terisolasi.');
        
        const app = document.getElementById('app');
        
        // Hentikan semua listener yang mungkin berjalan (misalnya dari sesi sebelumnya)
        // dan bersihkan konten sepenuhnya untuk memastikan tidak ada yang tumpang tindih.
        app.innerHTML = ''; 
        
        // Panggil fungsi render spesifik untuk halaman ini
        renderResetPasswordPage(); 
        
        // Kembalikan true untuk memberitahu bahwa rute ini sudah ditangani
        return true;
    }
    
    // Jika bukan rute reset password, kembalikan false
    return false;
}

/**
 * FUNGSI BARU: Menampilkan popup pengumuman jika ada dan belum pernah dilihat.
 * Menggunakan localStorage untuk melacak pengumuman yang sudah dilihat.
 */
function showAnnouncementPopupIfNeeded() {
    // Jangan tampilkan popup jika tidak ada pengumuman atau pengguna tidak login
    if (!latestAnnouncement || !currentUser) {
        return;
    }

    const announcementId = latestAnnouncement.id;
    // Kunci unik untuk localStorage berdasarkan ID pengumuman
    const storageKey = `seen_announcement_${announcementId}`;
    const hasSeenAnnouncement = localStorage.getItem(storageKey);

    // Jika ID pengumuman belum ada di localStorage, tampilkan modalnya.
    if (!hasSeenAnnouncement) {
        console.log(`Menampilkan pengumuman baru dengan ID: ${announcementId}`);
        renderAnnouncementModal(latestAnnouncement);
    } else {
        console.log(`Pengumuman dengan ID: ${announcementId} sudah pernah dilihat.`);
    }
}

function toggleLiveChatBubble(show) {
    if (!liveChatBubbleElement) {
        liveChatBubbleElement = document.querySelector('.we-are-here-bubble');
        console.log("Live Chat Bubble Element:", liveChatBubbleElement); // LOG INI
    }
    if (liveChatBubbleElement) {
        liveChatBubbleElement.style.display = show ? 'block' : 'none';
        console.log("Live Chat Bubble visibility set to:", show); // LOG INI
    }
}


// ===============================================
// === INITIALISASI APLIKASI & LOGIKA ROUTING ====
// ===============================================

/**
 * Fungsi utama yang dipanggil saat aplikasi dimuat.
 */
/**
 * FUNGSI UTAMA BARU: Bertindak sebagai router tunggal untuk seluruh aplikasi.
 * Mengatur semua alur navigasi secara linear untuk menghindari konflik.
 */
async function appRouter() {
    const hash = window.location.hash || '#';
    const cleanHash = hash.split('?')[0];

    // TAHAP 1: Prioritas untuk Reset Password
    if (cleanHash === '#reset-password') {
        app.innerHTML = '';
        renderResetPasswordPage();
        return;
    }

    // TAHAP 2: Cek Login
    await checkLoginStatus();

    // TAHAP 3: Keputusan berdasarkan Login
    if (currentUser) {
        // PENGGUNA SUDAH LOGIN
        await initKMSPsession();
        await fetchAnnouncement();
        const authPages = ['#', '#login', '#register'];
        if (authPages.includes(cleanHash)) {
            window.location.hash = '#dashboard';
            return;
        }
        renderDashboard(cleanHash.substring(1));
        renderUserWatermark();
        showAnnouncementPopupIfNeeded();
        startStatusPolling();
    } else {
        // PENGGUNA BELUM LOGIN
        app.innerHTML = '';
        switch (cleanHash) {
            case '#register':
                renderRegisterPage();
                break;
            default:
                renderLoginPage();
                break;
        }
    }
}
// --- FUNGSI RENDER HALAMAN STATIS ---
function renderTentangKamiPage(container) {
    container.innerHTML += `
        <div class="page-content">
            <div class="page-header"><h1>Tentang RyyStore</h1></div>
            <p><strong>Selamat datang di RyyStore, platform terpercaya Anda untuk semua kebutuhan produk digital.</strong></p>
            <p>Kami menyediakan layanan pembelian paket data dan produk telekomunikasi lainnya dengan proses yang mudah, cepat, dan aman.</p>
            <p>Misi kami adalah memberikan kemudahan akses produk digital bagi seluruh masyarakat Indonesia. Dengan sistem top-up saldo yang praktis, Anda dapat melakukan transaksi kapan saja dan di mana saja.</p>
        </div>
    `;
}
function renderKebijakanPrivasiPage(container) {
    container.innerHTML += `
        <div class="page-content">
            <div class="page-header"><h1>Kebijakan Privasi</h1></div>
            <p>Kami di RyyStore menghargai privasi Anda. Dokumen ini menjelaskan bagaimana kami mengumpulkan dan menggunakan data pribadi Anda.</p>
            <ol style="padding-left: 20px; line-height: 1.8;">
                <li><strong>Data yang Kami Kumpulkan:</strong> Kami mengumpulkan data yang Anda berikan saat registrasi, seperti nama, alamat email, dan nomor telepon untuk keperluan verifikasi dan transaksi.</li>
                <li><strong>Penggunaan Data:</strong> Data Anda digunakan untuk memproses transaksi, mengelola akun, dan memberikan notifikasi terkait layanan kami.</li>
                <li><strong>Keamanan Data:</strong> Kami berkomitmen untuk menjaga keamanan data Anda dan tidak akan membagikan informasi pribadi Anda kepada pihak ketiga tanpa persetujuan Anda, kecuali diwajibkan oleh hukum.</li>
            </ol>
        </div>
    `;
}
function renderSyaratKetentuanPage(container) {
    container.innerHTML += `
        <div class="page-content">
            <div class="page-header"><h1>Syarat & Ketentuan</h1></div>
            <p>Dengan mendaftar dan menggunakan layanan RyyStore, Anda setuju dengan syarat dan ketentuan berikut:</p>
            <ol style="padding-left: 20px; line-height: 1.8;">
                <li><strong>Layanan:</strong> RyyStore menyediakan platform untuk pembelian produk digital. Pengguna wajib memiliki saldo yang cukup untuk melakukan transaksi.</li>
                <li><strong>Akun Pengguna:</strong> Anda bertanggung jawab penuh atas keamanan akun dan password Anda.</li>
                <li><strong>Transaksi:</strong> Semua transaksi yang berhasil bersifat final dan tidak dapat dibatalkan. Jika terjadi kegagalan sistem dari pihak kami, saldo akan dikembalikan.</li>
                <li><strong>Larangan:</strong> Dilarang menggunakan layanan kami untuk aktivitas ilegal atau penipuan. Pelanggaran akan mengakibatkan penangguhan akun.</li>
            </ol>
        </div>
    `;
}

/**
 * FUNGSI BARU: Membuat dan menampilkan watermark dinamis di seluruh layar.
 * Watermark ini tidak akan muncul untuk admin.
 */
function renderUserWatermark() {
    // Hapus watermark lama jika ada, untuk mencegah duplikasi
    const existingWatermark = document.getElementById('dynamic-watermark');
    if (existingWatermark) {
        existingWatermark.remove();
    }

    // Kondisi: Jangan tampilkan watermark jika tidak ada user atau jika rolenya admin
    if (!currentUser || currentUser.role === 'admin') {
        return;
    }

    const watermarkContainer = document.createElement('div');
    watermarkContainer.id = 'dynamic-watermark';
    watermarkContainer.className = 'watermark-container';

    const watermarkText = currentUser.email || currentUser.name; // Gunakan email atau nama

    // Buat banyak elemen teks dan sebarkan secara acak
    for (let i = 0; i < 50; i++) { // Jumlah watermark yang ditampilkan
        const textElement = document.createElement('span');
        textElement.className = 'watermark-text';
        textElement.textContent = watermarkText;
        textElement.style.top = `${Math.random() * 100}%`;
        textElement.style.left = `${Math.random() * 100}%`;
        watermarkContainer.appendChild(textElement);
    }

    document.body.appendChild(watermarkContainer);
}

/**
 * FUNGSI BARU: Memperbarui semua elemen UI yang menampilkan saldo.
 * @param {number} newBalance - Saldo terbaru pengguna.
 */
function updateBalanceUI(newBalance) {
    const formattedBalance = newBalance.toLocaleString('id-ID');

    // Update saldo di kartu dashboard utama
    const amountEl = document.querySelector('.main-balance-card .amount');
    if (amountEl) {
        amountEl.textContent = formattedBalance;
    }

    // Update saldo di sidebar
    const sidebarEl = document.getElementById('user-balance-sidebar');
    if (sidebarEl) {
        sidebarEl.textContent = `Saldo: Rp ${formattedBalance}`;
    }
}

function startStatusPolling() {
    if (statusIntervalId) clearInterval(statusIntervalId);

    statusIntervalId = setInterval(async () => {
        if (!currentUser || currentUser.role === 'admin') {
            stopStatusPolling();
            return;
        }
        
        try {
            const { data, status } = await apiFetch('/status');
            if (status === 200 && data.status) {
                // LOG UNTUK DEBUGGING
                console.log(`Polling... Saldo saat ini (client): ${currentUser.balance}, Saldo dari server: ${data.currentBalance}`);

                if (data.maintenanceMode === true) {
                    isMaintenanceMode = true;
                    renderGlobalMaintenancePage();
                    stopStatusPolling();
                }

                if (data.currentBalance !== null && data.currentBalance !== currentUser.balance) {
                    // LOG SAAT TERJADI PERUBAHAN
                    console.log('%cTERDETEKSI PERUBAHAN SALDO! Memperbarui tampilan...', 'color: green; font-weight: bold;');
                    
                    currentUser.balance = data.currentBalance;
                    updateBalanceUI(currentUser.balance);
                    showToast('Saldo Anda telah berhasil diperbarui!', false);
                }
            }
        } catch (error) {
            console.error("Status polling failed:", error.message);
            stopStatusPolling();
        }
    }, 15000); // Kita percepat jadi 15 detik untuk tes
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


function renderProfilePage(container) {
    if (!currentUser) {
        container.innerHTML = '<div class="page-content"><p class="error-message">Gagal memuat data pengguna.</p></div>';
        return;
    }

    // Daftar menu sekunder
    const secondaryMenus = `
        <div class="profile-menu-list">
            <a href="#kontak-admin" class="profile-menu-item"><span>Kontak Admin</span><span>&rarr;</span></a>
            <a href="#tentang-kami" class="profile-menu-item"><span>Tentang Kami</span><span>&rarr;</span></a>
            <a href="#kebijakan-privasi" class="profile-menu-item"><span>Kebijakan Privasi</span><span>&rarr;</span></a>
            <a href="#syarat-ketentuan" class="profile-menu-item"><span>Syarat & Ketentuan</span><span>&rarr;</span></a>
        </div>
    `;

    container.innerHTML = `
        <div class="page-content profile-page">
            <div class="profile-header">
                <h3>${currentUser.name}</h3>
                <p>${currentUser.email}</p>
            </div>

            <div class="profile-info-card">
                <div class="balance-section">
                    <span>Saldo Saat Ini</span>
                    <strong>Rp ${currentUser.balance.toLocaleString('id-ID')}</strong>
                </div>
                <button id="profile-topup-btn" class="button">Top Up</button>
            </div>

            <div class="profile-info-card">
                <h4>Menu Lainnya</h4>
                ${secondaryMenus}
            </div>
            
            <div class="profile-info-card">
                <h4>Ubah Password</h4>
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

    // Pasang listener untuk tombol Top Up & form
    document.getElementById('profile-topup-btn')?.addEventListener('click', renderTopUpModal);
    document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);
}
/**
 * FUNGSI HALAMAN TUTORIAL (PENDEKATAN BARU)
 * Menampilkan daftar panduan dan menangani klik untuk melihat detail.
 * @param {HTMLElement} container - Elemen DOM (mainContent) yang akan diisi.
 */
async function renderTutorialPage(container) {
    // 1. Siapkan kerangka HTML dengan satu area konten saja
    container.innerHTML = `
        <div class="page-content" id="tutorial-area">
            <div class="page-header">
                <h1>Pilih Panduan Pembelian</h1>
            </div>
            <div id="tutorial-content-wrapper">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

    const contentWrapper = document.getElementById('tutorial-content-wrapper');

    try {
        await loadTutorialList(); // Pastikan data `availableTutorials` ada

        if (availableTutorials.length === 0) {
            contentWrapper.innerHTML = '<p>Belum ada panduan yang tersedia.</p>';
            return;
        }

        // 2. Render daftar kartu panduan ke dalam area konten
        contentWrapper.innerHTML = `
            <div class="tutorial-list-grid">
                ${availableTutorials.map(t => `
                    <button class="tutorial-card" data-tutorial-id="${t.id}">
                        <h3>${t.title}</h3>
                        <p>${t.description || 'Klik untuk melihat panduan lengkap.'}</p>
                    </button>
                `).join('')}
            </div>
        `;

        // 3. Pasang event listener
        contentWrapper.addEventListener('click', (e) => {
            const card = e.target.closest('.tutorial-card');
            if (card) {
                const tutorialId = card.dataset.tutorialId;
                // Panggil fungsi untuk menampilkan detail, menggantikan isi wrapper
                renderTutorialDetailView(tutorialId, contentWrapper);
            }
        });

    } catch (error) {
        console.error("Gagal memuat daftar panduan:", error);
        contentWrapper.innerHTML = `<p class="error-message">Gagal memuat daftar panduan: ${error.message}</p>`;
    }
}

/**
 * FUNGSI HALAMAN TUTORIAL (PENDEKATAN BARU)
 * Menampilkan daftar panduan dan menangani klik untuk melihat detail.
 * @param {HTMLElement} container - Elemen DOM (mainContent) yang akan diisi.
 */
async function renderTutorialPage(container) {
    // 1. Siapkan kerangka HTML dengan satu area konten saja
    container.innerHTML = `
        <div class="page-content" id="tutorial-area">
            <div class="page-header">
                <h1>Pilih Panduan Pembelian</h1>
            </div>
            <div id="tutorial-content-wrapper">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;

    const contentWrapper = document.getElementById('tutorial-content-wrapper');

    try {
        await loadTutorialList(); // Pastikan data `availableTutorials` ada

        if (availableTutorials.length === 0) {
            contentWrapper.innerHTML = '<p>Belum ada panduan yang tersedia.</p>';
            return;
        }

        // 2. Render daftar kartu panduan ke dalam area konten
        contentWrapper.innerHTML = `
            <div class="tutorial-list-grid">
                ${availableTutorials.map(t => `
                    <button class="tutorial-card" data-tutorial-id="${t.id}">
                        <h3>${t.title}</h3>
                        <p>${t.description || 'Klik untuk melihat panduan lengkap.'}</p>
                    </button>
                `).join('')}
            </div>
        `;

        // 3. Pasang event listener
        contentWrapper.addEventListener('click', (e) => {
            const card = e.target.closest('.tutorial-card');
            if (card) {
                const tutorialId = card.dataset.tutorialId;
                // Panggil fungsi untuk menampilkan detail, menggantikan isi wrapper
                renderTutorialDetailView(tutorialId, contentWrapper);
            }
        });

    } catch (error) {
        console.error("Gagal memuat daftar panduan:", error);
        contentWrapper.innerHTML = `<p class="error-message">Gagal memuat daftar panduan: ${error.message}</p>`;
    }
}
/**
 * FUNGSI DETAIL TUTORIAL (PENDEKATAN BARU)
 * Mengganti konten dengan detail panduan yang dipilih.
 * @param {string} tutorialId - ID panduan yang akan ditampilkan.
 * @param {HTMLElement} wrapper - Elemen pembungkus yang isinya akan diganti.
 */
async function renderTutorialDetailView(tutorialId, wrapper) {
    wrapper.innerHTML = `<div class="loading-spinner"></div>`;

    try {
        const { data: responseData, status } = await apiFetch(`/tutorial-content/${tutorialId}`);
        if (status !== 200 || !responseData.status || !responseData.data) {
            throw new Error(responseData.message || "Data tutorial tidak ditemukan.");
        }
        
        const tutorial = responseData.data;

        // Ganti total isi wrapper dengan detail artikel
        wrapper.innerHTML = `
            <div class="tutorial-article-content">
                <div class="article-header">
                    <button id="back-to-tutorial-list" class="button secondary">&larr; Kembali ke Daftar</button>
                    <h1>${tutorial.title}</h1>
                </div>
                <div class="article-body">
                    ${tutorial.content.map(block => {
                        switch (block.type) {
                            case 'text':
                                return `<div class="tutorial-text-block">${marked.parse(block.content)}</div>`;
                            case 'image':
                                return `<div class="tutorial-media-block"><img src="${block.content}" alt="Panduan Gambar"></div>`;
                            case 'video':
                                return `<div class="tutorial-media-block"><video src="${block.content}" controls></video></div>`;
                            default:
                                return '';
                        }
                    }).join('')}
                </div>
            </div>
        `;

        // Pasang listener untuk tombol "Kembali"
        document.getElementById('back-to-tutorial-list').addEventListener('click', () => {
            // Panggil kembali fungsi utama untuk merender ulang daftar panduan
            const mainContainer = document.getElementById('page-content-area');
            renderTutorialPage(mainContainer);
        });

    } catch (error) {
        console.error("Gagal memuat detail tutorial:", error);
        wrapper.innerHTML = `<p class="error-message">Gagal memuat panduan ini: ${error.message}</p>`;
    }
}

/**
 * FUNGSI BARU: Mengambil daftar tutorial dari backend.
 */
async function loadTutorialList() {
    try {
        const { data: responseData, status } = await apiFetch('/tutorial-content');
        if (status === 200 && responseData.status && Array.isArray(responseData.data)) {
            availableTutorials = responseData.data;
        } else {
            throw new Error(responseData.message || "Gagal memuat daftar tutorial.");
        }
    } catch (error) {
        console.error("Error loading tutorial list:", error);
        throw error; // Re-throw untuk ditangani oleh pemanggil
    }
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
        // Panggil backend hanya dengan access_token, karena backend sudah tahu API Key.
        const { data, status } = await apiFetch(`/user/active-packages?access_token=${phoneAuth.accessToken}`);

        if (status === 200 && data.status) {
            // --- PERBAIKAN LOGIKA TAMPILAN ---
            // Sesuaikan dengan struktur respons KMSP yang benar.
            const quotas = data.data?.quotas;
            if (quotas && Array.isArray(quotas) && quotas.length > 0) {
                let packageListHTML = '';

                // Tambahkan teks pengantar dari API jika ada
                if (data.data.text) {
                    packageListHTML += `<p style="font-size: 0.9em; color: #555; margin-bottom: 1rem;">${data.data.text}</p>`;
                }

                packageListHTML += quotas.map(pkg => {
                    const benefitsHTML = pkg.benefits && Array.isArray(pkg.benefits)
                        ? `<ul>${pkg.benefits.map(benefit => `<li>${benefit.name}: <strong>${benefit.remaining_quota}</strong></li>`).join('')}</ul>`
                        : '<p>Tidak ada detail benefit.</p>';

                    return `
                        <li class="active-package-item">
                            <strong>${pkg.name}</strong>
                            <small>Berlaku Hingga: ${pkg.expired_at}</small>
                            ${benefitsHTML}
                        </li>
                    `;
                }).join('');
                resultContainer.innerHTML = `<ul class="active-package-list">${packageListHTML}</ul>`;
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
        if (originalButton) {
            originalButton.disabled = false;
            originalButton.textContent = 'Beli Sekarang';
        }
        return;
    }

    // --- PERBAIKAN PENTING DI SINI ---
    // Mengubah data teks metode pembayaran menjadi array yang bisa digunakan
    const paymentMethods = typeof pkg.payment_methods === 'string' 
        ? JSON.parse(pkg.payment_methods) 
        : (pkg.payment_methods || []);

    const platformFee = pkg.platform_fee || 0;
    const pkgNameLower = (pkg.name || '').toLowerCase();
    const isPulsaMethod = pkgNameLower.includes('[method pulsa]');
    
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
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Konfirmasi Pembelian</h2><button class="modal-close">&times;</button></div>
                <h4>${pkg.name}</h4>
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
        if (originalButton) {
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
            body: {
                packageId,
                phone: phoneAuth.phone,
                access_token: phoneAuth.accessToken,
                paymentMethod,
                purchaseContext: 'paket-satuan' // Konteks untuk paket satuan
            }
        });
        
        if (currentUser && typeof data.newBalance === 'number') {
            currentUser.balance = data.newBalance;
            const userBalanceElement = document.getElementById('user-balance');
            if (userBalanceElement) {
                userBalanceElement.textContent = `Rp ${currentUser.balance.toLocaleString('id-ID')}`;
            }
        }

        if (status === 202) { 
            if (data.payment_data) {
                renderExternalPaymentModal(data.payment_data);
            } else {
                renderFinalStatusModal("Permintaan Diterima", data.message);
            }
        } else if (status === 200 && data.status) {
            renderFinalStatusModal("Status Transaksi", data.message || 'Sukses');
        } else {
            throw new Error(data.message || 'Pembelian gagal dengan respons yang tidak diharapkan.');
        }
    } catch (error) {
        let friendlyErrorMessage = "Terjadi kesalahan. Silakan coba lagi.";
        if (error.message.toLowerCase().includes('maximum pending transaction')) {
            friendlyErrorMessage = " Terjadi kesalahan saat memproses pembelian paket ini. Silakan coba lagi dan pastikan Anda telah membaca deskripsi serta memenuhi syarat dan ketentuan paket! (Error Message: Reach Maximum Pending Transaction)";
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
function renderExternalPaymentModal(paymentData, createdAt = null) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    let paymentContent = '';
    let hasValidPaymentMethod = false;

    // --- PERBAIKAN TIMER DIMULAI DI SINI ---
    // Cek jika pembayaran QRIS
    if (paymentData.is_qris && paymentData.qris_data && paymentData.qris_data.qr_code_base64) {
        // Dapatkan durasi asli dari provider (misal 300 detik), atau default ke 5 menit
        const QRIS_EXPIRATION_DURATION_MS = (paymentData.qris_data.remaining_time || 300) * 1000;
        let timeLeftInSeconds;

        if (createdAt) {
            // Hitung sisa waktu yang sebenarnya berdasarkan waktu pembuatan transaksi
            const timeCreated = new Date(createdAt).getTime();
            const timeRemainingMs = Math.max(0, timeCreated + QRIS_EXPIRATION_DURATION_MS - Date.now());
            timeLeftInSeconds = Math.floor(timeRemainingMs / 1000);
        } else {
            // Fallback jika createdAt tidak tersedia, gunakan nilai dari provider (mungkin tidak akurat)
            timeLeftInSeconds = paymentData.qris_data.remaining_time || 300;
        }

        paymentContent = `
            <h3>Scan QR Code di Bawah</h3>
            <p style="font-size: 0.9em; margin-top: 1rem;">Batas Waktu: <strong id="external-qris-timer">${formatTime(timeLeftInSeconds)}</strong></p>
            <div id="qris-image-container" style="padding: 1rem; background: white; display: inline-block; border-radius: 8px; margin: 0 auto;"></div>
            <img src="${paymentData.qris_data.qr_code_base64}" alt="QR Code Pembayaran" width="220" height="220">
        `;
        hasValidPaymentMethod = true;
    }
    // --- AKHIR PERBAIKAN TIMER ---
    // Cek jika pembayaran menggunakan Deeplink (aplikasi lain)
    else if (paymentData.have_deeplink && paymentData.deeplink_data && paymentData.deeplink_data.deeplink_url) {
        paymentContent = `
            <h3>Klik untuk Membayar</h3>
            <a href="${decodeURIComponent(paymentData.deeplink_data.deeplink_url)}" target="_blank" class="button" style="text-decoration: none;">Buka Aplikasi ${paymentData.deeplink_data.payment_method || 'Pembayaran'}</a>
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

    // Pastikan untuk membersihkan interval polling dan countdown sebelumnya (jika ada dari TopUp QRIS)
    if (window.activeQrisPollingInterval) clearInterval(window.activeQrisPollingInterval);
    if (window.activeQrisCountdownInterval) clearInterval(window.activeQrisCountdownInterval);
    if (window.activeExternalQrisInterval) clearInterval(window.activeExternalQrisInterval);

    // Fungsi closeModal tetap sama
    const closeModal = () => {
        if (window.activeExternalQrisInterval) clearInterval(window.activeExternalQrisInterval);
        modalContainer.innerHTML = '';
        // PERBAIKAN: Render ulang halaman history saja
        renderDashboard('history'); 
    };

    // --- LOGIKA BARU: Countdown Timer untuk QRIS Eksternal ---
    if (paymentData.is_qris && paymentData.qris_data) {
        const QRIS_EXPIRATION_DURATION_MS = (paymentData.qris_data.remaining_time || 300) * 1000;
        let timeLeftInSeconds;

        if (createdAt) {
            const timeCreated = new Date(createdAt).getTime();
            const timeRemainingMs = Math.max(0, timeCreated + QRIS_EXPIRATION_DURATION_MS - Date.now());
            timeLeftInSeconds = Math.floor(timeRemainingMs / 1000);
        } else {
            timeLeftInSeconds = paymentData.qris_data.remaining_time || 300;
        }

        const timerElement = document.getElementById('external-qris-timer');

        if (timerElement && timeLeftInSeconds > 0) {
            // Set interval ke variabel global agar bisa di-clear saat modal ditutup
            window.activeExternalQrisInterval = setInterval(() => {
                if (timeLeftInSeconds <= 0) {
                    clearInterval(window.activeExternalQrisInterval);
                    timerElement.textContent = "Waktu Habis";
                } else {
                    timerElement.textContent = formatTime(timeLeftInSeconds);
                    timeLeftInSeconds--;
                }
            }, 1000);
        }
    }
    // --- AKHIR LOGIKA BARU ---

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
            <div id="modal-container"></div>
            
            <button type="button" id="request-activation-btn" class="button secondary" style="margin-top: 1rem; width: 100%;">
                Hubungi Admin untuk Aktivasi
            </button>

            <p class="auth-link">Belum punya akun? <a href="#register">Daftar</a> | <a href="#" id="forgot-password-link">Lupa Password?</a></p>
        </div>
    `;

    // Pasang event listener untuk form login dan tombol aktivasi baru
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('forgot-password-link')?.addEventListener('click', renderForgotPasswordModal);
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
            <div id="modal-container"></div>
            <p class="auth-link">Sudah punya akun? <a href="#login">Login di sini</a></p>
        </div>
    `;
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
}

/**
 * FUNGSI BARU: Merender modal untuk meminta link reset password.
 */
function renderForgotPasswordModal(e) {
    e.preventDefault();
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Lupa Password</h2><button class="modal-close">&times;</button></div>
                <p>Masukkan alamat email Anda. Jika terdaftar, kami akan mengirimkan link untuk mereset password Anda.</p>
                <form id="forgot-password-form">
                    <div class="form-group">
                        <label for="forgot-email">Email</label>
                        <input type="email" id="forgot-email" required autocomplete="email">
                    </div>
                    <button type="submit">Kirim Link Reset</button>
                </form>
                <div id="forgot-feedback-container" style="margin-top: 1rem;"></div>
            </div>
        </div>
    `;

    const closeModal = () => modalContainer.innerHTML = '';
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    document.getElementById('forgot-password-form')?.addEventListener('submit', handleForgotPasswordRequest);
}

/**
 * FUNGSI BARU: Handler untuk mengirim permintaan reset password.
 */
async function handleForgotPasswordRequest(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    const emailInput = document.getElementById('forgot-email');
    if (!button || !emailInput) return;

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Mengirim...`;
    displayFeedback('forgot-feedback-container', '', false);

    try {
        const { data } = await apiFetch('/auth/forgot-password', {
            method: 'POST',
            body: { email: emailInput.value }
        });
        // Tampilkan pesan sukses generik untuk keamanan
        displayFeedback('forgot-feedback-container', data.message, false);
        button.textContent = 'Terkirim!';
    } catch (error) {
        // Tampilkan pesan error jika server gagal (misal: email service down)
        displayFeedback('forgot-feedback-container', error.message, true);
        button.disabled = false;
        button.textContent = 'Kirim Link Reset';
    }
}

/**
 * FUNGSI BARU: Merender halaman untuk mereset password.
 */
function renderResetPasswordPage() {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const token = params.get('token');

    if (!token) {
        app.innerHTML = `<div class="auth-container"><p class="error-message">Token reset tidak valid atau tidak ditemukan. Silakan minta link baru.</p><a href="#login">Kembali ke Login</a></div>`;
        return;
    }

    app.innerHTML = `
        <div class="auth-container">
            <h1>Reset Password Anda</h1>
            <form id="reset-password-form" data-token="${token}">
                <div class="form-group">
                    <label for="new-password">Password Baru (min. 6 karakter)</label>
                    <input type="password" id="new-password" required minlength="6" autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label for="confirm-password">Konfirmasi Password Baru</label>
                    <input type="password" id="confirm-password" required minlength="6" autocomplete="new-password">
                </div>
                <button type="submit">Reset Password</button>
            </form>
            <div id="feedback-container"></div>
        </div>
    `;
    document.getElementById('reset-password-form')?.addEventListener('submit', handleResetPassword);
}

/**
 * FUNGSI BARU: Handler untuk mengirim password baru ke server.
 */
async function handleResetPassword(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const token = form.dataset.token;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        displayFeedback('feedback-container', 'Password baru dan konfirmasi tidak cocok.', true);
        return;
    }

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memproses...`;
    displayFeedback('feedback-container', '', false);

    try {
        const { data } = await apiFetch('/auth/reset-password', {
            method: 'POST',
            body: { token, password: newPassword }
        });
        displayFeedback('feedback-container', data.message, false);
        showToast(data.message, false);
        setTimeout(() => { window.location.hash = '#login'; }, 2000);
    } catch (error) {
        displayFeedback('feedback-container', error.message, true);
        button.disabled = false;
        button.textContent = 'Reset Password';
    }
}

// frontend/app.js -> GANTI FUNGSI INI SECARA KESELURUHAN
async function renderDashboard(activePage = 'dashboard') {
    const isAdmin = currentUser.role === 'admin';
    let navActivePage = activePage;

    // Alias untuk konsistensi penandaan menu aktif
    if (navActivePage === 'beli-paket') navActivePage = 'packages';
    if (navActivePage === 'laporan') navActivePage = 'admin';

    // Definisikan semua ikon yang akan digunakan di dalam fungsi ini
    const dashboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    const beliPaketIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;
    const paketAkrabIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    const tutorialIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    const riwayatIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`;
    const rekeningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
    const profilIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const adminIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>`;
    const laporanIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>`;
    const menuIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    const logoutIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;

    app.innerHTML = `
        <div class="responsive-container">
            <aside class="sidebar">
                <div class="sidebar-header"><h2>RYYSTORE</h2></div>
                <div class="user-info">
                    <p>Selamat datang, <strong>${currentUser.name}</strong></p>
                    <p id="user-balance-sidebar">Saldo: Rp ${currentUser.balance.toLocaleString('id-ID')}</p>
                </div>
                <nav class="sidebar-nav">
                     <ul>
                        <li><a href="#dashboard" class="${navActivePage === 'dashboard' ? 'active' : ''}">${dashboardIcon}<span>Dashboard</span></a></li>
                        <li><a href="#beli-paket" class="${navActivePage === 'packages' ? 'active' : ''}">${beliPaketIcon}<span>Beli Paket (OTP)</span></a></li>
                        <li><a href="#paket-akrab" class="${navActivePage === 'paket-akrab' ? 'active' : ''}">${paketAkrabIcon}<span>Paket Akrab</span></a></li>
                        <li><a href="#tutorial" class="${navActivePage === 'tutorial' ? 'active' : ''}">${tutorialIcon}<span>Cara Pembelian</span></a></li>
                        <li><a href="#history" class="${navActivePage === 'history' ? 'active' : ''}">${riwayatIcon}<span>Riwayat</span></a></li>
                        <li><a href="#rekening-koran" class="${navActivePage === 'rekening-koran' ? 'active' : ''}">${rekeningIcon}<span>Lap. Keuangan</span></a></li>
                        <li><a href="#profile" class="${navActivePage === 'profile' ? 'active' : ''}">${profilIcon}<span>Profil & Menu Lain</span></a></li>
                        ${isAdmin ? `
                        <li class="admin-menu-divider"></li>
                        <li><a href="#admin" class="${navActivePage === 'admin' ? 'active' : ''}">${adminIcon}<span>Panel Admin</span></a></li>
                        <li><a href="#laporan" class="${navActivePage === 'laporan' ? 'active' : ''}">${laporanIcon}<span>Laporan</span></a></li>` : ''}
                    </ul>
                </nav>
                <div class="sidebar-footer">
                    <button id="logout-btn-sidebar" class="button secondary">Logout</button>
                </div>
            </aside>
            <div class="main-wrapper">
                <header class="app-header">
                    <button class="menu-toggle" id="menu-toggle-btn">${menuIcon}</button>
                    <h1 class="app-title">RYYSTORE</h1>
                    <button id="logout-btn-header" class="header-action-btn">${logoutIcon}</button>
                </header>
                <main class="main-content" id="page-content-area"></main>
            </div>
            <nav class="bottom-nav">
                <a href="#dashboard" class="nav-item ${navActivePage === 'dashboard' ? 'active' : ''}">${dashboardIcon}<span>Dashboard</span></a>
                <a href="#beli-paket" class="nav-item ${navActivePage === 'packages' ? 'active' : ''}">${beliPaketIcon}<span>Beli Paket</span></a>
                <a href="#paket-akrab" class="nav-item ${navActivePage === 'paket-akrab' ? 'active' : ''}">${paketAkrabIcon}<span>Paket Akrab</span></a>
                <a href="#history" class="nav-item ${navActivePage === 'history' ? 'active' : ''}">${riwayatIcon}<span>Riwayat</span></a>
                <a href="#rekening-koran" class="nav-item ${navActivePage === 'rekening-koran' ? 'active' : ''}">${rekeningIcon}<span>Laporan</span></a>
                <a href="#profile" class="nav-item ${navActivePage === 'profile' ? 'active' : ''}">${profilIcon}<span>Profil</span></a>
                ${isAdmin ? `<a href="#admin" class="nav-item ${navActivePage === 'admin' ? 'active' : ''}">${adminIcon}<span>Admin</span></a>` : ''}
            </nav>
            <div id="modal-container"></div>
            <div class="sidebar-overlay"></div>
        </div>
    `;

    const mainContent = document.getElementById('page-content-area');
    if (!mainContent) return;

    if (latestAnnouncement && latestAnnouncement.message) {
        mainContent.insertAdjacentHTML('afterbegin', `
            <div class="announcement-banner" id="announcement-banner">
                <p><strong>Informasi:</strong> ${latestAnnouncement.message}</p>
                <button class="announcement-close" id="announcement-close-btn">&times;</button>
            </div>
        `);
    }

    const pageRenderers = {
        'dashboard': renderMainDashboardPage,
        'packages': () => { mainContent.innerHTML += renderPhoneVerificationPanel(); renderPackagesPage(mainContent); setupPhoneVerificationListeners(); },
        'history': renderHistoryPage,
        'rekening-koran': renderRekeningKoranPage,
        'profile': renderProfilePage,
        'paket-akrab': renderNonOtpPage,
        'tutorial': renderTutorialPage,
        'kontak-admin': renderKontakAdminPage,
        'tentang-kami': renderTentangKamiPage,
        'kebijakan-privasi': renderKebijakanPrivasiPage,
        'syarat-ketentuan': renderSyaratKetentuanPage,
        'admin': isAdmin ? renderAdminDashboard : () => { window.location.hash = '#dashboard'; },
        'laporan': isAdmin ? renderLaporanPage : () => { window.location.hash = '#dashboard'; }
    };
    
    const rendererKey = activePage === 'beli-paket' ? 'packages' : activePage;
    const renderFunction = pageRenderers[rendererKey] || pageRenderers['dashboard'];
    
    if (typeof renderFunction === 'function') {
        renderFunction(mainContent);
    } else {
        console.error(`Tidak ada fungsi renderer untuk halaman: ${rendererKey}`);
        pageRenderers['dashboard'](mainContent);
    }

    document.getElementById('logout-btn-sidebar')?.addEventListener('click', handleLogout);
    document.getElementById('logout-btn-header')?.addEventListener('click', handleLogout);
    document.getElementById('announcement-close-btn')?.addEventListener('click', (e) => e.target.parentElement.remove());

    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (menuToggleBtn && sidebar && overlay) {
        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };
        menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('open'); overlay.classList.add('active'); });
        overlay.addEventListener('click', closeSidebar);
        sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
    }
}


async function renderRekeningKoranPage(container) {
    // Set tanggal default: 30 hari terakhir
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
    const defaultEndDate = today.toISOString().split('T')[0];

    container.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1>Laporan Keuangan Anda</h1>
                <p>Lihat ringkasan dan rincian semua aktivitas keuangan di akun Anda.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Total Saldo Masuk (Top Up)</h4>
                    <p id="summary-total-topup" class="amount-credit">Memuat...</p>
                </div>
                <div class="stat-card">
                    <h4>Total Saldo Keluar (Fee)</h4>
                    <p id="summary-total-spending" class="amount-debit">Memuat...</p>
                </div>
            </div>

            <div class="page-content" style="margin-top: 2rem;">
                <h3>Rincian Aktivitas</h3>
                <div class="filter-controls" style="margin-bottom: 1.5rem;">
                    <div class="form-group">
                        <label for="start-date">Dari Tanggal</label>
                        <input type="date" id="start-date" value="${defaultStartDate}">
                    </div>
                    <div class="form-group">
                        <label for="end-date">Sampai Tanggal</label>
                        <input type="date" id="end-date" value="${defaultEndDate}">
                    </div>
                    <button id="filter-report-btn">Tampilkan</button>
                </div>
                <div id="detailed-report-container">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        </div>
    `;

    const fetchAndDisplayReport = async () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const reportContainer = document.getElementById('detailed-report-container');
        const topupSummaryEl = document.getElementById('summary-total-topup');
        const spendingSummaryEl = document.getElementById('summary-total-spending');
        
        reportContainer.innerHTML = '<div class="loading-spinner"></div>';
        topupSummaryEl.textContent = 'Memuat...';
        spendingSummaryEl.textContent = 'Memuat...';

        try {
            const { data } = await apiFetch(`/user/financial-summary?startDate=${startDate}&endDate=${endDate}`);
            if (!data.status) throw new Error(data.message);

            const summary = data.data.summary;
            const details = data.data.details;

            // Isi kartu ringkasan
            topupSummaryEl.textContent = `Rp ${summary.totalTopup.toLocaleString('id-ID')}`;
            spendingSummaryEl.textContent = `Rp ${summary.totalSpending.toLocaleString('id-ID')}`;

            // Buat tabel rincian
            if (details.length === 0) {
                reportContainer.innerHTML = '<p>Tidak ada aktivitas pada rentang tanggal yang dipilih.</p>';
                return;
            }

            const tableRows = details.map(item => {
                const isCredit = item.amount > 0;
                const amountClass = isCredit ? 'amount-credit' : 'amount-debit';
                const amountSign = isCredit ? '+' : '';
                
                return `
                    <tr>
                        <td data-label="Tanggal">${new Date(item.createdAt).toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</td>
                        <td data-label="Tipe">${item.type}</td>
                        <td data-label="Deskripsi">${item.description}</td>
                        <td data-label="Jumlah" class="${amountClass}">
                            <strong>${amountSign} Rp ${Math.abs(item.amount).toLocaleString('id-ID')}</strong>
                        </td>
                    </tr>
                `;
            }).join('');

            reportContainer.innerHTML = `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Waktu</th>
                            <th>Tipe</th>
                            <th>Deskripsi</th>
                            <th>Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            `;

        } catch (error) {
            reportContainer.innerHTML = `<p class="error-message">Gagal memuat laporan: ${error.message}</p>`;
            topupSummaryEl.textContent = 'Error';
            spendingSummaryEl.textContent = 'Error';
        }
    };

    // Pasang event listener dan panggil pertama kali
    document.getElementById('filter-report-btn').addEventListener('click', fetchAndDisplayReport);
    fetchAndDisplayReport();
}
// frontend/app.js -> GANTI FUNGSI INI SEPENUHNYA
/**
 * FUNGSI BARU: Merender daftar tutorial di panel admin untuk dikelola.
 */
async function renderAdminTutorialList() {
    const listContainer = document.getElementById('tutorial-list-admin-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        await loadTutorialList(); // Muat ulang daftar tutorial dari backend

        if (availableTutorials.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Belum ada tutorial. Klik "Tambah Tutorial Baru" di bawah.</p>';
            return;
        }

        const tutorialListHtml = `
            <ul id="admin-tutorial-sortable-list" class="sortable-list">
                ${availableTutorials.map(t => `
                    <li class="tutorial-item-admin" data-tutorial-id="${t.id}">
                        <span class="drag-handle">☰</span>
                        <div class="tutorial-info">
                            <strong>${t.title}</strong>
                            <small>${t.description || 'Tidak ada deskripsi.'}</small>
                        </div>
                        <div class="tutorial-actions">
                            <button class="edit-tutorial-btn">Edit</button>
                            <button class="delete-tutorial-btn danger">Hapus</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
            <button id="save-tutorial-order-btn" style="width:100%; margin-top: 1rem; background: var(--success-color);">Simpan Urutan</button>
        `;
        listContainer.innerHTML = tutorialListHtml;

        // Inisialisasi Sortable JS untuk drag-and-drop
        new Sortable(document.getElementById('admin-tutorial-sortable-list'), {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: async function (evt) {
                // Saat urutan berubah, aktifkan tombol simpan
                document.getElementById('save-tutorial-order-btn').disabled = false;
            }
        });

        // Event listener untuk tombol Edit dan Hapus
        listContainer.querySelectorAll('.edit-tutorial-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tutorialId = e.currentTarget.closest('.tutorial-item-admin').dataset.tutorialId;
                renderSpecificTutorialEditor(tutorialId);
            });
        });
        listContainer.querySelectorAll('.delete-tutorial-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tutorialId = e.currentTarget.closest('.tutorial-item-admin').dataset.tutorialId;
                handleDeleteTutorial(tutorialId);
            });
        });
        document.getElementById('save-tutorial-order-btn')?.addEventListener('click', handleSaveTutorialOrder);

    } catch (error) {
        listContainer.innerHTML = `<p class="error-message">Gagal memuat daftar tutorial: ${error.message}</p>`;
    }
}

/**
 * FUNGSI BARU: Menampilkan modal editor untuk tutorial spesifik (Tambah/Edit).
 * @param {string} [tutorialId] - ID tutorial jika dalam mode edit, kosong jika tambah baru.
 */
async function renderSpecificTutorialEditor(tutorialId = null) {
    const modalContainer = document.getElementById('specific-tutorial-modal-container');
    if (!modalContainer) return;

    let tutorialData = { id: '', title: '', description: '', content: [] };
    let isEditing = false;

    if (tutorialId) {
        isEditing = true;
        try {
            const { data: responseData, status } = await apiFetch(`/tutorial-content/${tutorialId}`);
            if (status === 200 && responseData.status && responseData.data) {
                tutorialData = responseData.data;
            } else {
                throw new Error(responseData.message || "Gagal memuat data tutorial untuk diedit.");
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, true);
            modalContainer.innerHTML = '';
            return;
        }
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2>${isEditing ? 'Edit Tutorial' : 'Tambah Tutorial Baru'}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="tutorial-editor-form">
                    <input type="hidden" id="tutorial-id" value="${tutorialData.id || ''}">
                    <div class="form-group">
                        <label for="tutorial-title">Judul Tutorial</label>
                        <input type="text" id="tutorial-title" value="${tutorialData.title}" placeholder="Contoh: Cara Beli Paket Akrab" required>
                    </div>
                    <div class="form-group">
                        <label for="tutorial-description">Deskripsi Singkat</label>
                        <input type="text" id="tutorial-description" value="${tutorialData.description}" placeholder="Deskripsi singkat tutorial ini">
                    </div>
                    <hr>
                    <h3>Isi Tutorial (Blok Konten)</h3>
                    <div id="tutorial-content-blocks" class="tutorial-editor-blocks">
                        ${tutorialData.content.length > 0 ? tutorialData.content.map(createBlockElement).join('') : '<p class="empty-state">Belum ada konten. Tambahkan blok di bawah.</p>'}
                    </div>
                    <div class="admin-toolbar" style="margin-top: 1rem; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="button" id="add-text-block-btn">Tambah Teks</button>
                        <button type="button" id="add-image-block-btn">Tambah Gambar</button>
                        <button type="button" id="add-video-block-btn">Tambah Video</button>
                    </div>
                    <div id="editor-feedback" style="margin-top: 1rem;"></div>
                    <button type="submit" style="margin-top: 1.5rem; width: 100%;">Simpan Tutorial</button>
                </form>
            </div>
        </div>
    `;

    const form = document.getElementById('tutorial-editor-form');
    const contentBlocksContainer = document.getElementById('tutorial-content-blocks');

    // Inisialisasi Sortable JS untuk drag-and-drop
    new Sortable(contentBlocksContainer, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost'
    });

    // Pasang event listener untuk tombol tambah blok
    document.getElementById('add-text-block-btn')?.addEventListener('click', () => addBlockToEditor(contentBlocksContainer, 'text'));
    document.getElementById('add-image-block-btn')?.addEventListener('click', () => addBlockToEditor(contentBlocksContainer, 'image'));
    document.getElementById('add-video-block-btn')?.addEventListener('click', () => addBlockToEditor(contentBlocksContainer, 'video'));

    // Pastikan tombol hapus sudah ada event listenernya
    contentBlocksContainer.querySelectorAll('.delete-block-btn').forEach(btn => {
        btn.addEventListener('click', (e) => e.currentTarget.closest('.tutorial-block').remove());
    });

    // Pasang event listener untuk file input yang ada
    contentBlocksContainer.querySelectorAll('.tutorial-file-input').forEach(input => {
        setupFileInputPreview(input);
    });


    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="button-spinner"></span> Menyimpan...`;
        displayFeedback('editor-feedback', '', false);

        const tutorialIdValue = document.getElementById('tutorial-id').value;
        const title = document.getElementById('tutorial-title').value;
        const description = document.getElementById('tutorial-description').value;

        const tutorialBlocks = [];
        const blockElements = contentBlocksContainer.querySelectorAll('.tutorial-block');
        const formData = new FormData();

        for (const el of blockElements) {
            const type = el.dataset.type;
            let content;

            if (type === 'text') {
                content = el.querySelector('.tutorial-text-input').value;
            } else { // Untuk tipe 'image' atau 'video'
                const fileInput = el.querySelector('.tutorial-file-input');
                if (fileInput && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    formData.append('files', file); // Tambahkan file ke FormData
                    content = file.name; // Gunakan nama file sebagai placeholder untuk dicocokkan di backend
                } else if (el.dataset.existingUrl) {
                    content = el.dataset.existingUrl; // Gunakan URL lama jika tidak ada file baru yang dipilih
                }
            }

            if (!content) {
                displayFeedback('editor-feedback', `Konten untuk blok ${type} tidak boleh kosong.`, true);
                submitButton.disabled = false;
                submitButton.textContent = 'Simpan Tutorial';
                return;
            }
            tutorialBlocks.push({ type, content });
        }

        formData.append('tutorialId', tutorialIdValue);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('content', JSON.stringify(tutorialBlocks));

        try {
            const response = await fetch(`${API_BASE_URL}/admin/tutorial-content`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || !data.status) {
                throw new Error(data.message || 'Gagal menyimpan tutorial.');
            }

            displayFeedback('editor-feedback', data.message, false);
            showToast(data.message, false);
            closeModal(); // Tutup modal setelah sukses
            renderAdminTutorialList(); // Muat ulang daftar tutorial di admin panel

        } catch (error) {
            displayFeedback('editor-feedback', error.message, true);
            showToast(error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Simpan Tutorial';
        }
    });

    const closeModal = () => modalContainer.innerHTML = '';
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
}

/**
 * Helper untuk membuat elemen HTML untuk satu blok konten di editor modal.
 * Mirip dengan createBlockElement tapi disesuaikan untuk editor modal.
 */
function createBlockElement(block, index) {
    let contentInput = '';
    const existingUrlAttr = (block.type !== 'text' && block.content) ? `data-existing-url="${block.content}"` : '';
    const fileInputValue = (block.type !== 'text' && block.content && !block.content.startsWith('file-')) ? block.content : ''; // Hanya tampilkan URL jika sudah ada, bukan placeholder file

    switch (block.type) {
        case 'text':
            contentInput = `
                <textarea class="tutorial-text-input" placeholder="Masukkan teks di sini..." required>${block.content}</textarea>
                <small>Anda bisa menggunakan <a href="https://www.markdownguide.org/basic-syntax/" target="_blank">format Markdown</a>.</small>
            `;
            break;
        case 'image':
            contentInput = `
                <div class="file-preview">
                    ${fileInputValue ? `<img src="${fileInputValue}" alt="Preview" style="max-width: 150px; display: block;"/>` : ''}
                </div>
                <input type="file" class="tutorial-file-input" accept="image/*" ${fileInputValue ? '' : 'required'} />
                ${fileInputValue ? `<small>URL Saat Ini: ${fileInputValue}</small>` : ''}
            `;
            break;
        case 'video':
            contentInput = `
                <div class="file-preview">
                    ${fileInputValue ? `<video src="${fileInputValue}" controls style="max-width: 250px; display: block;"></video>` : ''}
                </div>
                <input type="file" class="tutorial-file-input" accept="video/*" ${fileInputValue ? '' : 'required'} />
                ${fileInputValue ? `<small>URL Saat Ini: ${fileInputValue}</small>` : ''}
            `;
            break;
    }

    return `
        <div class="tutorial-block" data-type="${block.type}" ${existingUrlAttr}>
            <span class="drag-handle">☰</span>
            <div class="block-content">
                <strong>Blok ${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</strong>
                ${contentInput}
            </div>
            <button type="button" class="delete-block-btn">&times;</button>
        </div>
    `;
}

/**
 * FUNGSI BARU: Menambahkan blok baru ke editor tutorial (di dalam modal).
 * @param {HTMLElement} container - Kontainer tempat blok akan ditambahkan.
 * @param {string} type - 'text', 'image', atau 'video'.
 */
function addBlockToEditor(container, type) {
    // Hapus pesan 'belum ada konten' jika ada
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const newBlockEl = document.createElement('div');
    newBlockEl.className = 'tutorial-block';
    newBlockEl.dataset.type = type;

    let contentInput = '';
    if (type === 'text') {
        contentInput = `<textarea class="tutorial-text-input" placeholder="Masukkan teks di sini..." required></textarea>`;
    } else {
        contentInput = `
            <div class="file-preview"></div>
            <input type="file" class="tutorial-file-input" accept="${type}/*" required />
        `;
    }

    newBlockEl.innerHTML = `
        <span class="drag-handle">☰</span>
        <div class="block-content">
            <strong>Blok ${type.charAt(0).toUpperCase() + type.slice(1)} (Baru)</strong>
            ${contentInput}
        </div>
        <button type="button" class="delete-block-btn">&times;</button>
    `;

    newBlockEl.querySelector('.delete-block-btn').addEventListener('click', (e) => e.currentTarget.closest('.tutorial-block').remove());

    if (type !== 'text') {
        setupFileInputPreview(newBlockEl.querySelector('.tutorial-file-input'));
    }
    container.appendChild(newBlockEl);
}

/**
 * Helper untuk mengatur preview gambar/video saat file dipilih.
 */
function setupFileInputPreview(fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previewContainer = e.target.previousElementSibling; // div.file-preview
        if (previewContainer) {
            previewContainer.innerHTML = ''; // Clear preview lama
            const url = URL.createObjectURL(file);
            if (file.type.startsWith('image/')) {
                previewContainer.innerHTML = `<img src="${url}" alt="Preview" style="max-width: 150px; display: block;"/>`;
            } else if (file.type.startsWith('video/')) {
                previewContainer.innerHTML = `<video src="${url}" controls style="max-width: 250px; display: block;"></video>`;
            }
        }
        // Hapus atribut 'required' setelah file dipilih
        fileInput.removeAttribute('required');
    });
}

/**
 * FUNGSI BARU: Menghapus tutorial dari database.
 * @param {string} tutorialId - ID tutorial yang akan dihapus.
 */
async function handleDeleteTutorial(tutorialId) {
    if (!confirm('Apakah Anda yakin ingin menghapus tutorial ini? Aksi ini tidak dapat dibatalkan.')) {
        return;
    }

    const tutorialItem = document.querySelector(`.tutorial-item-admin[data-tutorial-id="${tutorialId}"]`);
    if (tutorialItem) {
        tutorialItem.style.opacity = '0.5';
        tutorialItem.style.pointerEvents = 'none';
    }

    try {
        const { data, status } = await apiFetch(`/admin/tutorial-content/${tutorialId}`, {
            method: 'DELETE'
        });

        if (status === 200 && data.status) {
            showToast(data.message, false);
            renderAdminTutorialList(); // Muat ulang daftar setelah dihapus
        } else {
            throw new Error(data.message || "Gagal menghapus tutorial.");
        }
    } catch (error) {
        showToast(error.message, true);
        if (tutorialItem) {
            tutorialItem.style.opacity = '1';
            tutorialItem.style.pointerEvents = 'auto';
        }
    }
}

/**
 * FUNGSI BARU: Menyimpan urutan tutorial setelah drag-and-drop.
 */
async function handleSaveTutorialOrder() {
    const button = document.getElementById('save-tutorial-order-btn');
    if (!button) return;

    button.disabled = true;
    button.innerHTML = '<span class="button-spinner"></span> Menyimpan Urutan...';
    displayFeedback('tutorial-editor-feedback', '', false);

    const orderedTutorialIds = Array.from(document.querySelectorAll('#admin-tutorial-sortable-list .tutorial-item-admin'))
        .map(item => item.dataset.tutorialId);

    try {
        const { data, status } = await apiFetch('/admin/tutorial-content/reorder', {
            method: 'PUT',
            body: { order: orderedTutorialIds }
        });

        if (status === 200 && data.status) {
            showToast(data.message, false);
            displayFeedback('tutorial-editor-feedback', data.message, false);
        } else {
            throw new Error(data.message || 'Gagal menyimpan urutan tutorial.');
        }
    } catch (error) {
        showToast(error.message, true);
        displayFeedback('tutorial-editor-feedback', error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = 'Simpan Urutan';
    }
}


/**
 * Helper untuk membuat elemen HTML untuk satu blok konten di editor.
 * @param {object} block - Objek blok konten {type, content}.
 * @param {number} index - Index blok.
 * @returns {string} - String HTML untuk blok tersebut.
 */
function createBlockElement(block, index) {
    const blockId = `block-${Date.now()}-${index}`;
    let contentInput = '';

    switch (block.type) {
       case 'text':
        contentInput = `
            <textarea class="tutorial-text-input" placeholder="Masukkan teks di sini...">${block.content}</textarea>
            <small>Anda bisa menggunakan <a href="https://www.markdownguide.org/basic-syntax/" target="_blank">format Markdown</a> untuk judul, tebal, miring, dan list.</small>
        `;
        break;
        case 'image':
            contentInput = `
                <div class="file-preview"><img src="${block.content}" alt="Preview" style="max-width: 150px; display: block;"/></div>
                <input type="file" class="tutorial-file-input" accept="image/*" style="display:none;" />
                <small>URL: ${block.content}</small>
            `;
            break;
        case 'video':
            contentInput = `
                <div class="file-preview"><video src="${block.content}" controls style="max-width: 250px; display: block;"></video></div>
                <input type="file" class="tutorial-file-input" accept="video/*" style="display:none;" />
                <small>URL: ${block.content}</small>
            `;
            break;
    }

    return `
        <div class="tutorial-block" data-type="${block.type}" data-existing-url="${block.type !== 'text' ? block.content : ''}">
            <span class="drag-handle">☰</span>
            <div class="block-content">
                <strong>Blok ${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</strong>
                ${contentInput}
            </div>
            <button class="delete-block-btn">&times;</button>
        </div>
    `;
}

/**
 * Menambahkan blok baru ke editor UI.
 * @param {string} type - 'text', 'image', atau 'video'.
 */
function addBlock(type) {
    const container = document.getElementById('tutorial-content-blocks');
    if (!container) return;
    
    // Hapus pesan 'belum ada konten' jika ada
    const emptyState = container.querySelector('.empty-state');
    if(emptyState) emptyState.remove();

    const newBlockEl = document.createElement('div');
    newBlockEl.className = 'tutorial-block';
    newBlockEl.dataset.type = type;

    let contentInput = '';
    if (type === 'text') {
        contentInput = `<textarea class="tutorial-text-input" placeholder="Masukkan teks di sini..."></textarea>`;
    } else {
        contentInput = `
            <input type="file" class="tutorial-file-input" accept="${type}/*" required />
            <div class="file-preview"></div>
        `;
        // Listener untuk preview file
        setTimeout(() => {
            newBlockEl.querySelector('.tutorial-file-input').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const previewContainer = e.target.nextElementSibling;
                previewContainer.innerHTML = ''; // Clear preview lama
                const url = URL.createObjectURL(file);
                if (type === 'image') {
                    previewContainer.innerHTML = `<img src="${url}" alt="Preview" style="max-width: 150px; display: block;"/>`;
                } else {
                    previewContainer.innerHTML = `<video src="${url}" controls style="max-width: 250px; display: block;"></video>`;
                }
            });
        }, 0);
    }
    
    newBlockEl.innerHTML = `
        <span class="drag-handle">☰</span>
        <div class="block-content">
            <strong>Blok ${type.charAt(0).toUpperCase() + type.slice(1)} (Baru)</strong>
            ${contentInput}
        </div>
        <button class="delete-block-btn">&times;</button>
    `;

    newBlockEl.querySelector('.delete-block-btn').addEventListener('click', (e) => e.currentTarget.closest('.tutorial-block').remove());
    container.appendChild(newBlockEl);
}

/**
 * Mengumpulkan data dari editor dan mengirimkannya ke backend.
 */
async function handleSaveTutorialContent(e) {
    const button = e.currentTarget;
    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Menyimpan...`;
    displayFeedback('tutorial-editor-feedback', '', false);

    const formData = new FormData();
    const contentBlocks = [];
    const blockElements = document.querySelectorAll('#tutorial-content-blocks .tutorial-block');

    for (const el of blockElements) {
        const type = el.dataset.type;
        let content;

        if (type === 'text') {
            content = el.querySelector('.tutorial-text-input').value;
        } else {
            const fileInput = el.querySelector('.tutorial-file-input');
            if (fileInput && fileInput.files.length > 0) {
                // Ini adalah file baru yang diupload
                const file = fileInput.files[0];
                formData.append('files', file); // Tambahkan file ke FormData
                content = file.name; // Gunakan nama file sebagai placeholder
            } else {
                // Ini adalah file lama yang sudah ada di server
                content = el.dataset.existingUrl;
            }
        }
        
        if (!content) {
            displayFeedback('tutorial-editor-feedback', `Blok ${type} ada yang kosong. Harap isi atau hapus.`, true);
            button.disabled = false;
            button.innerHTML = 'Simpan Semua Perubahan';
            return;
        }

        contentBlocks.push({ type, content });
    }

    formData.append('contentData', JSON.stringify(contentBlocks));

    try {
        // Gunakan fetch standar karena kita mengirim FormData
        const response = await fetch(`${API_BASE_URL}/admin/tutorial-content`, {
            method: 'PUT',
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            throw new Error(data.message || 'Gagal menyimpan data.');
        }

        displayFeedback('tutorial-editor-feedback', data.message, false);
        // Muat ulang editor untuk menampilkan URL yang benar
        renderTutorialEditor();

    } catch (error) {
        displayFeedback('tutorial-editor-feedback', error.message, true);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Simpan Semua Perubahan';
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

    // Saya menambahkan section 'Manajemen Transaksi' di bawah 'Persetujuan Pengguna Baru'
    container.innerHTML = `
        <div class="admin-container">
            <div class="admin-section">
                <h1>Panel Kontrol Admin</h1>
                <a href="/#dashboard" style="display: block; text-align: center; margin-bottom: 1rem; color: var(--primary-color);">Kembali ke Dashboard Pengguna</a>
            </div>

            <div class="admin-section">
                <h2>Manajemen Konten "Cara Pembelian"</h2>
                <p>Atur daftar tutorial yang tampil di halaman "Cara Pembelian". Anda bisa menambah, mengedit, menghapus, dan mengatur ulang urutan.</p>
                <div id="tutorial-list-admin-container">
                    <div class="loading-spinner"></div>
                </div>
                <button id="add-new-tutorial-btn" class="button">Tambah Tutorial Baru</button>
                <div id="tutorial-editor-feedback" style="margin-top: 1rem;"></div>
            </div>

                        <div id="specific-tutorial-modal-container"></div>
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

            <div class="admin-section">
                <h2>Persetujuan Pengguna Baru</h2>
                <p>Pengguna di bawah ini sedang menunggu persetujuan Anda untuk bisa login.</p>
                <div id="approval-feedback"></div>
                <ul id="pending-users-list" class="user-list-admin"><div class="loading-spinner"></div></ul>
            </div>

            <div class="admin-section">
                <h2>Manajemen Transaksi</h2>
                <p>Lihat semua histori transaksi dan kelola permintaan yang tertunda karena saldo provider kurang.</p>
                <div id="admin-transactions-container"><div class="loading-spinner"></div></div>
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
                <h2>Manajemen Nominal Top Up</h2>
                <p>Atur pilihan nominal yang akan tampil untuk pengguna saat melakukan top up.</p>
                <div id="topup-options-feedback"></div>
                <div id="topup-options-list" style="margin-bottom: 1rem;">
                    <!-- Opsi akan dimuat di sini -->
                    <div class="loading-spinner"></div>
                </div>
                <form id="add-topup-option-form" style="display: flex; gap: 10px; margin-bottom: 1rem;">
                    <input type="number" id="new-topup-value" placeholder="Nominal (e.g., 5000)" required style="flex-grow: 1;">
                    <button type="submit">Tambah</button>
                </form>
                <button id="save-topup-options-btn" style="width: 100%;">Simpan Perubahan</button>
            </div>

           <div class="admin-section">
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
                <ul id="package-list" class="package-list"><div class=""></div></ul>
                
            </div>
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
    const initializeTransactionManagement = () => {
        const transactionsContainer = document.getElementById('admin-transactions-container');
        if (!transactionsContainer) return;

        const loadAndRenderAdminTransactions = async () => {
            transactionsContainer.innerHTML = '<div class="loading-spinner"></div>';
            try {
                const { data, status } = await apiFetch('/admin/transactions');
                if (!status || !data.status) {
                    throw new Error(data.message || 'Gagal memuat data.');
                }

                const transactions = data.data;
                if (transactions.length === 0) {
                    transactionsContainer.innerHTML = '<p>Belum ada transaksi.</p>';
                    return;
                }

                transactionsContainer.innerHTML = `
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="history-table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Pengguna</th>
                                    <th>Paket</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transactions.map(trx => {
                                    let actionButtons = '---';
                                    if (trx.status === 'menunggu_saldo_provider') {
                                        actionButtons = `<button class="button-admin-cancel" data-trx-id="${trx.id}">Tolak</button>`;
                                    }
                                    
                                    let statusClass = (trx.status || 'failed').toLowerCase().replace(/\s/g, '-');
                                    let statusText = trx.api_response; // Default text

                                    if (statusClass === 'menunggu_saldo_provider') statusClass = 'pending-provider';

                                    // --- PERUBAHAN BARU: Menangani pesan error spesifik sebagai sukses ---
                                    const isDirectSuccess = trx.api_response && trx.api_response.includes("422 -> Failed call ipaas purchase");
                                    if (isDirectSuccess) {
                                        statusClass = 'success';
                                        statusText = 'Berhasil.. tunggu 1 jam agar paket masuk (hoki-hokian ya)';
                                    }

                                    return `
                                        <tr>
                                            <td data-label="Tanggal">${new Date(trx.createdAt).toLocaleString('id-ID', {dateStyle: 'short', timeStyle: 'short'})}</td>
                                            <td data-label="Pengguna">${trx.userName || 'N/A'}</td>
                                            <td data-label="Paket">${trx.packageName}</td>
                                            <td data-label="Status"><br><span class="status-badge status-${statusClass}"><br>${statusText}</span></td>
                                            <td data-label="Aksi">${actionButtons}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } catch (error) {
                transactionsContainer.innerHTML = `<p class="error-message">Gagal memuat transaksi: ${error.message}</p>`;
            }
        };

        transactionsContainer.addEventListener('click', async (e) => {
            const button = e.target;
            if (button.matches('.button-admin-cancel')) {
                const trxId = button.dataset.trxId;
                if (!trxId) return;

                if (!confirm(`Apakah Anda yakin ingin menolak transaksi ini? Biaya layanan akan dikembalikan ke saldo pengguna.`)) {
                    return;
                }

                button.disabled = true;
                button.textContent = '...';

                try {
                    const { data } = await apiFetch(`/admin/transactions/${trxId}/cancel`, { method: 'POST' });
                    showToast(data.message, false);
                    loadAndRenderAdminTransactions();
                } catch (error) {
                    showToast(error.message, true);
                    button.disabled = false;
                    button.textContent = 'Tolak';
                }
            }
        });

        loadAndRenderAdminTransactions();
    };


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
    listElement.querySelectorAll('.package-item').forEach(item => {
        const packageId = item.dataset.packageId;
        const feeInput = item.querySelector('.fee-input');
        const visibilityCheckbox = item.querySelector('.visibility-checkbox');
        const categorySelect = item.querySelector('.category-select');
        const multiPurchaseCheckbox = item.querySelector('.multi-purchase-checkbox');

        // Gunakan 'input' event untuk input type 'number' agar setiap perubahan langsung terdeteksi
        feeInput?.addEventListener('input', () => handlePackageChange(packageId, item));

        // Gunakan 'change' event untuk checkbox dan select
        visibilityCheckbox?.addEventListener('change', () => handlePackageChange(packageId, item));
        categorySelect?.addEventListener('change', () => handlePackageChange(packageId, item));
        multiPurchaseCheckbox?.addEventListener('change', () => handlePackageChange(packageId, item));
    });
}

/**
 * Mengirim perubahan pada satu paket ke backend.
 * @param {string} packageId - ID paket yang diubah.
 * @param {HTMLElement} packageItemElement - Elemen <li> dari paket yang diubah.
 */
async function handlePackageChange(packageId, packageItemElement) {
    const feeInput = packageItemElement.querySelector('.fee-input');
    const visibilityCheckbox = packageItemElement.querySelector('.visibility-checkbox');
    const categorySelect = packageItemElement.querySelector('.category-select');
    const multiPurchaseCheckbox = packageItemElement.querySelector('.multi-purchase-checkbox');

    // Buat objek update untuk paket ini saja
    const updatePayload = {
        package_code: packageId,
        platform_fee: parseFloat(feeInput?.value || '0'),
        isVisible: visibilityCheckbox?.checked || false,
        category: categorySelect ? categorySelect.value : 'reguler',
        isMultiPurchase: multiPurchaseCheckbox?.checked || false
    };

    // Tambahkan spinner kecil di samping item yang sedang disimpan
    let currentSpinner = packageItemElement.querySelector('.small-spinner');
    if (!currentSpinner) {
        currentSpinner = document.createElement('span');
        currentSpinner.className = 'small-spinner';
        currentSpinner.style.marginLeft = '10px';
        packageItemElement.querySelector('.package-info')?.appendChild(currentSpinner);
    }
    currentSpinner.innerHTML = `<span class="button-spinner small"></span>`;


    try {
        const { data, status } = await apiFetch('/admin/packages/bulk-update', {
            method: 'PUT',
            body: { packages: [updatePayload] } // Kirim array berisi satu objek paket
        });

        if (status === 200 && data.status) {
            // showToast('Perubahan paket berhasil disimpan!', false);
            currentSpinner.innerHTML = '<span style="color: var(--success-color);">✔</span>'; // Tanda sukses
        } else {
            throw new Error(data.message || 'Gagal menyimpan perubahan.');
        }
    } catch (error) {
        showToast(error.message, true);
        currentSpinner.innerHTML = '<span style="color: var(--danger-color);">✖</span>'; // Tanda error
    } finally {
        // Hilangkan spinner atau tanda setelah beberapa waktu
        setTimeout(() => {
            if (currentSpinner) {
                currentSpinner.remove();
            }
        }, 1500); // Hilangkan setelah 1.5 detik
    }
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
            renderAdminTutorialList(); // BARIS INI AKAN DIUBAH
            document.getElementById('add-new-tutorial-btn')?.addEventListener('click', () => renderSpecificTutorialEditor()); // BARU
        // Inisialisasi Statistik dan Chart
        loadAdminStats();
        
        // Inisialisasi Daftar Pengguna untuk Manajemen Saldo & Log
        loadUsers();

        // Inisialisasi Saldo KMSP
        await fetchKMSPBalance();
        const kmspBalanceDisplay = document.getElementById('kmsp-balance-display');
        if (kmspBalanceDisplay) {
            kmspBalanceDisplay.textContent = typeof kmspBalance === 'number' ? `Rp ${kmspBalance.toLocaleString('id-ID')}` : 'Gagal Muat';
        }

        // >>> PERBAIKAN UTAMA DI SINI: Inisialisasi Manajemen Nominal Top Up <<<
        loadAndRenderTopUpOptions();
        document.getElementById('add-topup-option-form')?.addEventListener('submit', handleAddTopUpOption);
        document.getElementById('save-topup-options-btn')?.addEventListener('click', handleSaveTopUpOptions);

        // Inisialisasi Manajemen Transaksi
        initializeTransactionManagement();

        // Pasang listener untuk semua fitur lainnya
        document.getElementById('check-kmsp-balance-btn')?.addEventListener('click', async (e) => {
            const button = e.target;
            button.disabled = true; button.textContent = 'Mengecek...';
            await fetchKMSPBalance();
            const balanceDisplay = document.getElementById('kmsp-balance-display');
            if (balanceDisplay) {
                balanceDisplay.textContent = typeof kmspBalance === 'number' ? `Rp ${kmspBalance.toLocaleString('id-ID')}` : 'Gagal Muat';
            }
            button.disabled = false; button.textContent = 'Cek Saldo KMSP';
        });

        document.getElementById('log-user-search')?.addEventListener('input', (e) => populateUserDropdowns(e.target.value));
        document.getElementById('saldo-user-search')?.addEventListener('input', (e) => populateUserDropdowns(e.target.value));
        document.getElementById('user-log-select')?.addEventListener('change', (e) => {
            const logButton = document.getElementById('view-user-log-btn');
            if (logButton) logButton.disabled = !e.target.value;
        });
        document.getElementById('view-user-log-btn')?.addEventListener('click', handleViewUserLog);
        document.getElementById('log-user-search')?.addEventListener('input', (e) => {
            populateUserDropdowns(e.target.value);
        });
        document.getElementById('saldo-user-search')?.addEventListener('input', (e) => {
            populateUserDropdowns(e.target.value);
        });

        // --- PERBAIKAN: Tambahkan event listener untuk dropdown log pengguna ---
        const logSelectDropdown = document.getElementById('user-log-select');
        if (logSelectDropdown) {
            logSelectDropdown.addEventListener('change', () => {
                const logButton = document.getElementById('view-user-log-btn');
                if (logButton) {
                    // Aktifkan tombol 'Lihat Log' hanya jika ada pengguna yang dipilih
                    logButton.disabled = !logSelectDropdown.value;
                }
            });
        }

        try {
            const { data: maintenanceData } = await apiFetch('/admin/maintenance');
            if (maintenanceData.status) {
                isMaintenanceMode = maintenanceData.data.enabled;
                document.getElementById('maintenance-status').textContent = isMaintenanceMode ? 'AKTIF' : 'NONAKTIF';
                const toggleBtn = document.getElementById('toggle-maintenance-btn');
                if (toggleBtn) {
                    toggleBtn.style.background = isMaintenanceMode ? 'var(--danger-color)' : 'var(--success-color)';
                    toggleBtn.textContent = isMaintenanceMode ? 'Nonaktifkan Mode Pemeliharaan' : 'Aktifkan Mode Pemeliharaan';
                }
            }
        } catch (error) {
            console.error("Gagal memuat status maintenance di admin:", error);
        }
        initializeTransactionManagement();
        console.log("renderAdminDashboard setTimeout block finished."); // LOG INI
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
 * FUNGSI BARU: Merender modal pengumuman yang mengambang.
 * @param {object} announcement - Objek pengumuman dari database.
 */
 function renderAnnouncementModal(announcement) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="announcement-overlay">
            <div class="announcement-content">
                <div class="announcement-header">
                    <h2>📢 Pengumuman Penting</h2>
                </div>
                <div class="announcement-body">${announcement.message}</div>
                <div class="announcement-footer">
                    <label class="understand-checkbox-label">
                        <input type="checkbox" id="understand-checkbox">
                        Saya sudah membaca dan memahami pengumuman ini.
                    </label>
                    <button id="announcement-popup-close-btn" class="announcement-close-btn" disabled>Tutup</button>
                </div>
            </div>
        </div>
    `;

    const overlay = document.querySelector('.announcement-overlay');
    const closeBtn = document.getElementById('announcement-popup-close-btn');
    const understandCheckbox = document.getElementById('understand-checkbox');

    const closeModal = () => {
        // Tandai bahwa pengguna sudah melihat pengumuman ini di localStorage
        localStorage.setItem(`seen_announcement_${announcement.id}`, 'true');
        
        overlay.classList.add('fade-out');
        setTimeout(() => {
            modalContainer.innerHTML = '';
        }, 300);
    };

    // Event listener untuk checkbox
    understandCheckbox.addEventListener('change', () => {
        // Aktifkan tombol tutup hanya jika checkbox dicentang
        closeBtn.disabled = !understandCheckbox.checked;
    });

    // Event listener untuk tombol tutup
    closeBtn.addEventListener('click', closeModal);

    // (Opsional) Izinkan menutup dengan mengklik area gelap, tapi hanya jika tombol sudah aktif
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay && !closeBtn.disabled) {
            closeModal();
        }
    });
}

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
    const isVerified = !!phoneAuth.accessToken;
    const savedPhones = currentUser?.savedPhones || [];

    const verificationPanelHTML = `
        <div class="page-content phone-verification-panel ${isVerified ? 'verified' : ''}">
            <div class="page-header">
                <h2>${isVerified ? 'Nomor Terverifikasi' : 'Verifikasi & Sesi'}</h2>
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
                : `
                <div class="session-tabs">
                    <button class="tab-btn active" data-tab="new-number">Verifikasi Nomor Baru</button>
                    <button class="tab-btn" data-tab="saved-session" ${savedPhones.length === 0 ? 'disabled' : ''}>Gunakan Sesi Tersimpan</button>
                </div>

                <div id="new-number-tab" class="tab-content active">
                    <p>Masukkan nomor baru untuk mendapatkan kode OTP.</p>
                    <div id="phone-verification-form">
                        <div id="phone-step">
                            <div class="form-group"><label for="targetPhone">Nomor HP Tujuan (Format: 62...)</label><input type="tel" id="targetPhone" required pattern="^62\\d{9,13}$" placeholder="628xxxxxxxxxx"></div>
                            <button type="button" id="request-otp-btn">Kirim OTP</button>
                        </div>
                        <div id="otp-step" style="display: none;">
                            <p>Kode OTP telah dikirim. Masukkan kode di bawah.</p>
                            <div class="form-group"><label for="otp-code">Kode OTP</label><input type="text" id="otp-code" required></div>
                            <button type="button" id="verify-otp-btn">Verifikasi Nomor</button>
                        </div>
                    </div>
                </div>
                
                <div id="saved-session-tab" class="tab-content">
                    <p>Pilih salah satu nomor yang pernah Anda gunakan untuk login kembali tanpa OTP.</p>
                    <div class="form-group">
                        <label for="saved-phones-select">Pilih Nomor Tersimpan</label>
                        <select id="saved-phones-select">
                            ${savedPhones.map(phone => `<option value="${phone}">${phone}</option>`).join('')}
                        </select>
                    </div>
                    <button id="login-saved-phone-btn">Gunakan Sesi Ini</button>
                </div>
                `
            }
            <div id="phone-feedback-container"></div>
        </div>
    `;
    return verificationPanelHTML;
}

// TAMBAHKAN FUNGSI BARU INI DI app.js
async function handleLoginWithSavedPhone(e) {
    const button = e.currentTarget;
    const select = document.getElementById('saved-phones-select');
    if (!button || !select) return;

    const phone = select.value;
    if (!phone) {
        showToast("Silakan pilih nomor terlebih dahulu.", true);
        return;
    }

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memproses...`;

    try {
        const { data, status } = await apiFetch('/phone/login-saved', {
            method: 'POST',
            body: { phone }
        });

        if (status === 200 && data.status && data.data) {
            phoneAuth.phone = phone;
            phoneAuth.accessToken = data.data.access_token;
            phoneAuth.authId = data.data.auth_id;
            localStorage.setItem('kmspAuth', JSON.stringify({ phone, authId: data.data.auth_id }));
            
            showToast(data.message, false);
            renderDashboard('packages'); // Render ulang halaman beli paket
        } else {
            throw new Error(data.message || "Gagal menggunakan sesi tersimpan.");
        }
    } catch (error) {
        showToast(error.message, true);
        button.disabled = false;
        button.textContent = 'Gunakan Sesi Ini';
    }
}

// frontend/app.js -> Ganti fungsi ini sepenuhnya

/**
 * Merender halaman pemilihan paket ke dalam container.
 * Versi ini menggunakan dropdown dengan fitur pencarian dan TIDAK menghapus panel verifikasi.
 * @param {HTMLElement} container - Elemen DOM utama yang akan diisi (mainContent).
 */
async function renderPackagesPage(container) {

//     // KODE BARU: Cek saldo pengguna terlebih dahulu
//     if (currentUser && currentUser.balance <= 0) {
        
//         // Jika saldo 0, tampilkan panel terkunci
//         const lockedHTML = `
//         <div class="packages-locked-container">
//             <svg class="locked-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#icon-gradient)">
//                 <defs>
//                     <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
//                         <stop offset="0%" style="stop-color:#a855f7;" />
//                         <stop offset="100%" style="stop-color:#6d28d9;" />
//                     </linearGradient>
//                 </defs>
//                 <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zM8.25 6.75a3.75 3.75 0 117.5 0v3h-7.5v-3zM12.75 12a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0V12z" clip-rule="evenodd" />
//             </svg>
            
//             <h3>Kepo isinya? Top up solusinya</h3>
//             <p>Saldo Anda saat ini tidak mencukupi untuk melihat dan membeli paket.</p>
//             <button id="locked-topup-btn" class="topup-cta-btn">Top Up Saldo Sekarang</button>
//         </div>
//     `;

//     // Sisa kode di bawahnya tidak perlu diubah...
//     const packageSection = document.getElementById('package-selection-area');
//     if (packageSection) packageSection.remove();
//     container.innerHTML += lockedHTML;
    
//     document.getElementById('locked-topup-btn')?.addEventListener('click', renderTopUpModal);

//     return;
// }
    
    // --- KODE LAMA ANDA YANG AKAN DIJALANKAN JIKA SALDO LEBIH DARI 0 ---
    // (Kode di bawah ini tidak berubah, hanya dipindahkan ke dalam blok 'else')

    const existingSection = document.getElementById('package-selection-area');
    if (existingSection) existingSection.remove();

    try {
        const { data } = await apiFetch(`/user/packages?_=${new Date().getTime()}`);
        if (!data.status || !Array.isArray(data.data)) {
            throw new Error(data.message || "Gagal memuat paket");
        }
        visiblePackages = data.data;
    } catch (error) {
        container.innerHTML += `<div class="page-content"><p class="error-message">Gagal memuat daftar paket: ${error.message}</p></div>`;
        return;
    }

    const packageSection = document.createElement('div');
    packageSection.id = 'package-selection-area';

    // --- LOGIKA FILTER YANG DIPERBAIKI (FINAL) ---
    // Filter ini memastikan hanya paket dengan kategori 'reguler' (OTP) yang tampil di halaman ini.
    const multiPurchasePackages = visiblePackages.filter(pkg => pkg.isMultiPurchase === 1 && pkg.category === 'reguler');
    const regularPackages = visiblePackages.filter(pkg => pkg.isMultiPurchase === 0 && pkg.category === 'reguler');

    const multiPurchaseHTML = multiPurchasePackages.length > 0 ? `
        <div class="page-content" id="multi-purchase-section">
            <div class="page-header"><h3>Beli Multi Paket</h3>
            <p>Pilih satu atau lebih paket di bawah ini untuk dieksekusi secara berurutan.<hr><b>DIHARAP SAAT EKSEKUSI JANGAN KELUAR DARI BROWSER (Gunakan Metode ini sesudah baca "CARA BELI")</p></div>
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
            <div id="package-card-list" class="package-card-list">${regularPackages.map(pkg => `
                <div class="package-card" data-package-id="${pkg.package_code}">
                    <div class="package-card-info">
                        <strong>${pkg.name}</strong>
                        <small>Fee: Rp ${(pkg.platform_fee || 0).toLocaleString('id-ID')}</small>
                    </div>
                    <button class="package-card-select-btn" data-package-id="${pkg.package_code}">Pilih</button>
                </div>`).join('')}</div>
            <div id="package-details-area" style="display: none; margin-top: 2rem;"></div>
        </div>
    ` : '';
    
    packageSection.innerHTML = multiPurchaseHTML + regularPackagesHTML;
    container.appendChild(packageSection);

    // Pasang semua event listener (kode ini tidak berubah)
    document.getElementById('package-search-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.package-card').forEach(card => {
            const packageName = card.querySelector('strong')?.textContent.toLowerCase();
            if (packageName && packageName.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
        displaySelectedPackageDetails('');
    });

    document.getElementById('package-card-list')?.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('.package-card-select-btn');
        if (selectBtn) {
            const packageId = selectBtn.dataset.packageId;
            document.querySelectorAll('.package-card').forEach(c => c.classList.remove('active'));
            selectBtn.closest('.package-card').classList.add('active');
            displaySelectedPackageDetails(packageId);
            const detailsArea = document.getElementById('package-details-area');
            if (detailsArea) {
                setTimeout(() => {
                    detailsArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100); 
            }
        }
    });

    document.getElementById('execute-multi-pulsa-btn')?.addEventListener('click', handleMultiPulsaPurchase);
}


/**
 * Menangani event yang diterima dari stream backend saat multi-pembelian.
 * @param {object} event - Objek event yang di-parse dari JSON stream.
 * @param {HTMLElement} logList - Elemen <ul> untuk menampilkan log.
 * @param {number} totalPackages - Jumlah total paket yang diproses.
 */
function handleStreamEvent(event, logList, totalPackages) {
    let currentCount = logList.getElementsByTagName('li').length;

    if (event.type === 'start') {
        const h4 = logList.previousElementSibling;
        if (h4) h4.textContent = `Memproses ${event.total} paket...`;
    } 
    else if (event.type === 'progress') {
        currentCount++;
        const logItem = document.createElement('li');
        logItem.id = `log-item-${event.name.replace(/\s/g, '-')}`;
        
        // Cek apakah ini adalah kasus "hoki" yang dianggap sukses
        const isIpaasSuccessCase = event.reason && event.reason.includes("422 -> Failed call ipaas purchase");
        
        if (event.status === 'success' || isIpaasSuccessCase) {
            // --- PERUBAHAN DI SINI ---
            logItem.classList.add('log-item-success');
            
            let successMessage = isIpaasSuccessCase 
                ? 'Berhasil.. tunggu 1 jam agar paket masuk (hoki-hokian ya)' 
                : event.message;

            logItem.innerHTML = `
                <div class="log-entry-header">
                    <span class="log-icon success">✔</span>
                    <span>(${currentCount}/${totalPackages}) <strong>${event.name}</strong></span>
                </div>
                <div class="log-message success">${successMessage}</div>
            `;
        } else { // 'failed'
            // --- PERUBAHAN DI SINI ---
            logItem.classList.add('log-item-error');
            
            logItem.innerHTML = `
                <div class="log-entry-header">
                    <span class="log-icon error">❌</span>
                    <span>(${currentCount}/${totalPackages}) <strong>${event.name}</strong></span>
                </div>
                <div class="log-message error">${event.reason}</div>
            `;
        }
        logList.appendChild(logItem);
        logItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } 
    else if (event.type === 'delay') {
        const lastLogItem = logList.lastElementChild;
        if (lastLogItem) {
            const delayMessageDiv = document.createElement('div');
            delayMessageDiv.className = 'log-message';
            delayMessageDiv.innerHTML = `<div class="delay-message">Menunggu jeda ${event.duration / 1000} detik...</div>`;
            lastLogItem.appendChild(delayMessageDiv);
            lastLogItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
    else if (event.type === 'done') {
        if (currentUser && typeof event.newBalance === 'number') {
            currentUser.balance = event.newBalance;
            // Update tampilan saldo di semua tempat
            document.querySelectorAll('#user-balance, #user-balance-sidebar').forEach(el => {
                el.textContent = `Saldo: Rp ${currentUser.balance.toLocaleString('id-ID')}`;
            });
        }
        const h4 = logList.previousElementSibling;
        if (h4) h4.textContent = `✔ Semua Proses Selesai.`;
        showToast(event.message, false);
    }
}

async function handleMultiPulsaPurchase(e) {
    const button = e.currentTarget;
    const feedbackContainer = document.getElementById('multi-pulsa-feedback');
    if (!button || !feedbackContainer) return;

    if (!phoneAuth.accessToken) {
        showToast("Silakan verifikasi nomor Anda terlebih dahulu.", true);
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.pulsa-checkbox:checked');
    const packagesToProcess = Array.from(selectedCheckboxes).map(cb => {
        const label = cb.nextElementSibling;
        return {
            id: cb.dataset.packageId,
            name: label.querySelector('strong').textContent
        };
    });
    
    if (packagesToProcess.length === 0) {
        showToast("Pilih minimal satu paket untuk dieksekusi.", true);
        return;
    }

    if (!confirm(`Anda akan mengeksekusi ${packagesToProcess.length} paket. Proses akan berjalan dengan jeda. Jangan tutup tab ini. Lanjutkan?`)) {
        return;
    }

    button.disabled = true;
    feedbackContainer.innerHTML = `<h4>Memproses ${packagesToProcess.length} paket...</h4><ul id="realtime-log-list" class="realtime-log"></ul>`;
    const logList = document.getElementById('realtime-log-list');

    const KMSP_API_DELAY_MS = 16000;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const [index, pkg] of packagesToProcess.entries()) {
        const logItem = document.createElement('li');
        logItem.className = 'log-item-pending';
        logItem.innerHTML = `
            <div class="log-entry-header">
                <span class="log-icon">⏳</span>
                <span>(${index + 1}/${packagesToProcess.length}) <strong>${pkg.name}</strong></span>
            </div>
            <div class="log-message">Mengirim permintaan...</div>
        `;
        logList.appendChild(logItem);
        logItem.scrollIntoView({ behavior: 'smooth', block: 'end' });

        try {
            const { data, status } = await apiFetch('/purchase', {
                method: 'POST',
                body: {
                    packageId: pkg.id,
                    phone: phoneAuth.phone,
                    access_token: phoneAuth.accessToken,
                    paymentMethod: 'balance',
                    purchaseContext: 'multi-paket' // Konteks untuk multi-paket
                }
            });
            
            if (currentUser && typeof data.newBalance === 'number') {
                currentUser.balance = data.newBalance;
                updateBalanceUI(currentUser.balance);
            }

            logItem.className = 'log-item-success';
            logItem.querySelector('.log-icon').innerHTML = '✔';
            logItem.querySelector('.log-message').textContent = data.message;
            logItem.querySelector('.log-message').className = 'log-message success';

        } catch (error) {
            logItem.className = 'log-item-error';
            logItem.querySelector('.log-icon').innerHTML = '❌';
            logItem.querySelector('.log-message').textContent = error.message;
            logItem.querySelector('.log-message').className = 'log-message error';

            if (currentUser && typeof error.newBalance === 'number') {
                 currentUser.balance = error.newBalance;
                 updateBalanceUI(currentUser.balance);
            }
        }

        if (index < packagesToProcess.length - 1) {
            const delayMessageDiv = document.createElement('div');
            delayMessageDiv.className = 'delay-message';
            delayMessageDiv.textContent = `Menunggu jeda ${KMSP_API_DELAY_MS / 1000} detik...`;
            logItem.appendChild(delayMessageDiv);
            logItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
            await delay(KMSP_API_DELAY_MS);
        }
    }

    feedbackContainer.querySelector('h4').textContent = '✅ Semua Proses Selesai.';
    showToast('Eksekusi multi paket selesai.', false);
    button.disabled = false;
    selectedCheckboxes.forEach(cb => cb.checked = false);
}

/**
 * Menampilkan detail paket di halaman Beli Paket (Reguler/OTP).
 * Versi ini akan menonaktifkan tombol beli jika saldo provider admin tidak cukup.
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
    const providerPrice = pkg.original_price || 0;

    // --- KONDISI PEMBELIAN YANG DIPERBARUI ---
    const hasPhoneSession = !!phoneAuth.accessToken;
    const userHasBalance = currentUser.balance >= platformFee;
    // Hapus pengecekan saldo provider dari frontend. Biarkan backend yang menangani.
    const canPurchase = hasPhoneSession && userHasBalance;
    
    // Tentukan teks tombol berdasarkan kondisi
    let buttonText = 'Beli Sekarang';
    if (!hasPhoneSession) {
        buttonText = "Verifikasi Nomor Dulu";
    } else if (!userHasBalance) {
        buttonText = 'Saldo Anda Kurang';
    } 
    // Logika untuk 'Minta Admin Tambahkan Stok' dihapus.

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
 * Fungsi utilitas untuk memformat detik menjadi format MM:SS.
 * @param {number} seconds - Jumlah detik.
 * @returns {string} - String yang diformat (misal: "05:00").
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
/**
 * Merender halaman riwayat transaksi ke dalam container.
 * VERSI FINAL: Dengan semua tombol aksi yang berfungsi.
 */

async function renderHistoryPage(container) {
    // Hentikan polling lama jika ada saat masuk ke halaman ini
    if (historyPollingInterval) {
        clearInterval(historyPollingInterval);
        historyPollingInterval = null;
    }

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
        const button = e.target.closest('button');
        if (!button) return;

        // ### FUNGSI BARU DITAMBAHKAN KEMBALI ###
        // Aksi untuk tombol "Lihat QRIS" pada top-up yang pending.
        if (button.matches('.view-pending-qris-btn')) {
            const qrisDataString = button.dataset.qrisData;
            const createdAt = button.dataset.createdAt;
            
            if (!qrisDataString || !createdAt) {
                return showToast('Data QRIS untuk transaksi ini tidak ditemukan.', true);
            }

            try {
                const qrisData = JSON.parse(qrisDataString);
                // Hitung waktu kedaluwarsa (asumsi 5 menit dari waktu pembuatan)
                const expiresAtTimestamp = Math.floor((new Date(createdAt).getTime() + 5 * 60 * 1000) / 1000);
                
                // Panggil fungsi render QRIS yang sudah ada
                renderDynamicQrisDisplay(qrisData.base64Image, qrisData.uniqueAmount, expiresAtTimestamp);
            } catch (error) {
                showToast('Gagal menampilkan QRIS: ' + error.message, true);
            } 
            return; // Hentikan eksekusi setelah ini
        }
        // ### AKHIR FUNGSI BARU ###

        // Aksi untuk tombol "Cek Status" pada pembelian internal (non-OTP)
        if (button.matches('.check-status-btn')) {
            const kmspTrxId = button.dataset.kmspTrxId;
            const rowId = button.dataset.rowId;
            if (!kmspTrxId || !rowId) return;

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
                        button.innerHTML = 'Cek Status';
                    }
                } else { throw new Error(data.message || "Gagal memperbarui status."); }
            } catch (error) {
                showToast(`Gagal cek status: ${error.message}`, true);
                button.disabled = false;
                button.innerHTML = 'Cek Status';
            }
        }

        // Aksi untuk tombol pembayaran eksternal (deeplink, dll - tidak berubah)
        if (button.matches('.open-external-payment-btn')) {
            const paymentDetailsString = button.dataset.paymentDetails;
            if (!paymentDetailsString) return showToast('Data pembayaran tidak ditemukan.', true);

            try {
                const paymentData = JSON.parse(paymentDetailsString);

                // --- PERBAIKAN: Buka deeplink langsung, jangan tampilkan modal lagi ---
                if (paymentData.have_deeplink && paymentData.deeplink_data && paymentData.deeplink_data.deeplink_url) {
                    // Jika ini adalah deeplink, langsung buka di tab baru.
                    window.open(decodeURIComponent(paymentData.deeplink_data.deeplink_url), '_blank');
                } else {
                    // Jika bukan deeplink (misalnya QRIS), baru tampilkan modal.
                    const row = button.closest('tr');
                    const createdAt = row ? row.dataset.createdAt : null;
                    renderExternalPaymentModal(paymentData, createdAt);
                }

            } catch (error) {
                showToast(`Gagal memproses pembayaran: ${error.message}`, true);
            }
        }

        // Aksi untuk tombol "Tampilkan QRIS" pada Top Up
        if (button.matches('.open-qris-btn')) {
            const topUpId = button.dataset.topupId;
            const base64Image = button.dataset.base64Image;
            const uniqueAmount = parseFloat(button.dataset.uniqueAmount);
            const createdAt = button.dataset.createdAt;

            if (topUpId && base64Image && !isNaN(uniqueAmount) && createdAt) {
                renderQrisDisplay(base64Image, uniqueAmount, topUpId, createdAt);
            } else {
                showToast('Data QRIS pada tombol ini tidak lengkap.', true);
            }
        }
    }

    // Fungsi untuk merender tabel riwayat
    const drawHistoryTable = (transactions) => {
        if (!transactions || transactions.length === 0) {
            historyContent.innerHTML = `<p>Anda belum memiliki riwayat transaksi.</p>`;
            return;
        }

        const totalPages = Math.ceil(transactions.length / transactionsPerPage);
        if (currentHistoryPage > totalPages && totalPages > 0) currentHistoryPage = totalPages;
        else if (totalPages === 0) currentHistoryPage = 1;

        const startIndex = (currentHistoryPage - 1) * transactionsPerPage;
        const endIndex = startIndex + transactionsPerPage;
        const transactionsToShow = transactions.slice(startIndex, endIndex);

        let tableHtml = `
            <table class="history-table">
                <thead>
                    <tr><th>Tanggal</th><th>Tipe</th><th>Detail</th><th>Jumlah/Fee</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>`;

        tableHtml += transactionsToShow.map(trx => {
            const transactionId = `trx_row_${trx.id.replace(/\W/g, '')}`;
            const type = trx.type === 'topup' ? 'Top Up' : 'Pembelian';
            const nameOrId = trx.packageName || `ID: ...${trx.id.slice(-8)}`; // Tampilkan ID yang lebih pendek
            const amountOrFee = trx.type === 'topup'
                ? `Rp ${(trx.uniqueAmount || trx.baseAmount || 0).toLocaleString('id-ID')}`
                : `Rp ${(trx.platformFee || 0).toLocaleString('id-ID')}`;

            let statusClass = (trx.status || 'failed').toLowerCase().replace(/\s/g, '-');
            let statusText = trx.api_response || trx.status;

            if (typeof statusText === 'string' && statusText.includes("422 -> Failed call ipaas purchase")) {
                statusClass = 'success'; // Tetap anggap sukses di UI
                statusText = 'Berhasil.. tunggu 1 jam agar paket masuk (hoki-hokian ya)';
            }

            if (trx.status === 'menunggu_saldo_provider') {
                statusText = 'Dalam Proses';
            } else if (trx.type === 'topup' && trx.status === 'pending') {
                statusText = 'Menunggu Pembayaran';
            }
            
            let actionButton = `<button class="action-btn" disabled>---</button>`;
            // --- PERBAIKAN: Definisikan ulang state final yang sebenarnya ---
            // Kita tidak lagi menganggap 'success' atau 'failed' sebagai state akhir
            // untuk tujuan menampilkan tombol, karena mungkin masih ada aksi pembayaran.
            const trulyFinalStates = ['completed', 'expired', 'canceled'];

            // --- PERBAIKAN: Cek dan parse trx.paymentDetails dari string ke object ---
            let paymentInfo = null;
            if (trx.type === 'purchase' && trx.paymentDetails && typeof trx.paymentDetails === 'string') {
                try {
                    paymentInfo = JSON.parse(trx.paymentDetails);
                } catch (e) {
                    console.error("Gagal parse paymentDetails JSON:", trx.paymentDetails, e);
                    paymentInfo = null; // Set ke null jika parsing gagal
                }
            }

            // Tampilkan tombol jika ini adalah pembelian, ada info pembayaran, DAN statusnya belum benar-benar final.
            if (trx.type === 'purchase' && paymentInfo && !trulyFinalStates.includes(trx.status)) {
                // Stringify lagi untuk disimpan di data-attribute, karena handler akan mem-parse-nya kembali.
                const paymentDataString = JSON.stringify(paymentInfo).replace(/'/g, "&apos;");
                let buttonText = 'Lanjutkan Pembayaran';
                if (paymentInfo.is_qris) {
                    buttonText = 'Tampil QRIS';
                } else if (paymentInfo.have_deeplink && paymentInfo.deeplink_data && paymentInfo.deeplink_data.deeplink_url) {
                    buttonText = `Bayar via ${paymentInfo.deeplink_data.payment_method_display_name || 'Aplikasi'}`;
                }
                actionButton = `<button class="action-btn primary open-external-payment-btn" data-payment-details='${paymentDataString}' data-created-at="${trx.createdAt}">${buttonText}</button>`;

            // Untuk top-up, qrisData sudah berupa objek dari backend.
            } else if (trx.type === 'topup' && trx.status === 'pending' && trx.qrisData) {
                // Tombol ini berfungsi untuk menampilkan kembali modal QRIS jika pengguna tidak sengaja menutupnya.
                const qrisDataAttr = JSON.stringify(trx.qrisData).replace(/'/g, "&apos;");
                actionButton = `<button class="action-btn primary view-pending-qris-btn" data-qris-data='${qrisDataAttr}' data-created-at="${trx.createdAt}">Lihat QRIS</button>`;
            }

            return `<tr id="${transactionId}" data-transaction-id="${trx.id}" data-status="${trx.status}" data-created-at="${trx.createdAt}">
                <td data-label="Tanggal">${new Date(trx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td data-label="Tipe">${type}</td>
                <td data-label="Detail"><br>${nameOrId}</td>
                <td data-label="Jumlah/Fee">${amountOrFee}</td>
                <td data-label="Status" class="status-cell"><br>
                    <span class="status-badge status-${statusClass}"><br>${statusText}</span>

                </td>
                <td data-label="Aksi" class="action-cell">${actionButton}</td>


            </tr>`;
        }).join('');

        tableHtml += `</tbody></table>
            <div class="pagination-controls" style="margin-top: 1.5rem;">
                <button id="history-prev-page-btn" ${currentHistoryPage === 1 ? 'disabled' : ''}>Sebelumnya</button>
                <span>Halaman <strong id="current-history-page-display">${currentHistoryPage}</strong> dari ${totalPages}</span>
                <button id="history-next-page-btn" ${currentHistoryPage === totalPages ? 'disabled' : ''}>Berikutnya</button>
            </div>`;

        historyContent.innerHTML = tableHtml;
        historyContent.querySelector('.history-table tbody')?.addEventListener('click', handleHistoryActions);

        // Event listener pagination (tidak berubah)
        document.getElementById('history-prev-page-btn')?.addEventListener('click', () => {
            if (currentHistoryPage > 1) {
                currentHistoryPage--;
                fetchAndUpdateHistory();
            }
        });
        document.getElementById('history-next-page-btn')?.addEventListener('click', () => {
            if (currentHistoryPage < totalPages) {
                currentHistoryPage++;
                fetchAndUpdateHistory();
            }
        });
    };

    // Fungsi fetch dan polling (tidak berubah)
    const fetchAndUpdateHistory = async () => {
        try {
            const { data } = await apiFetch('/user/transactions');
            if (!data.status || !Array.isArray(data.data)) {
                throw new Error("Gagal memuat riwayat: Data tidak valid.");
            }
            drawHistoryTable(data.data);
            
            const hasPending = data.data.some(t =>
                t.status === 'menunggu_saldo_provider' ||
                (t.type === 'topup' && t.status === 'pending')
            );

            if (!hasPending && historyPollingInterval) {
                clearInterval(historyPollingInterval);
                historyPollingInterval = null;
            } else if (hasPending && !historyPollingInterval) {
                historyPollingInterval = setInterval(() => fetchAndUpdateHistory(), 30000);
            }
        } catch (error) {
            console.error("Gagal memuat/polling riwayat:", error.message);
            if (historyPollingInterval) {
                clearInterval(historyPollingInterval);
                historyPollingInterval = null;
            }
            if (!document.querySelector('.history-table')) {
                historyContent.innerHTML = `<p class="error-message">Gagal memuat riwayat: ${error.message}</p>`;
            }
        }
    };

        await fetchAndUpdateHistory();
}

// frontend/app.js -> GANTI FUNGSI LAMA ANDA DENGAN INI

/**
 * @function renderTopUpModal
 * @description Merender modal untuk memilih nominal top-up.
 */
async function renderTopUpModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Top Up Saldo</h2><button class="modal-close">&times;</button></div>
                <div id="topup-options-container"><div class="loading-spinner"></div></div>
                <div id="modal-error-container" style="margin-top:1rem;"></div>
            </div>
        </div>
    `;

    const closeModal = () => modalContainer.innerHTML = '';
    document.querySelector('.modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);

    const optionsContainer = document.getElementById('topup-options-container');
    try {
        const { data: responseData, status } = await apiFetch('/admin/topup-options');
        
        if (status !== 200 || !responseData.status || !Array.isArray(responseData.data)) {
            throw new Error(responseData.message || 'Gagal memuat pilihan nominal dari server.');
        }

        const options = responseData.data;

        if (options.length === 0) {
            optionsContainer.innerHTML = '<p>Pilihan top up belum tersedia. Hubungi admin.</p>';
            return;
        }

        optionsContainer.innerHTML = `
            <p>Pilih nominal cepat atau masukkan jumlah lain di bawah.</p>
            <div class="topup-presets">
                ${options.map(opt => `<button class="preset-amount-btn" data-amount="${opt.value}">${opt.label}</button>`).join('')}
            </div>
            <hr>
            <form id="topup-form">
                <div class="form-group">
                    <label for="topup-amount">Atau masukkan jumlah lain (Minimal Rp 5.000)</label>
                    <input type="number" id="topup-amount" min="5000" placeholder="Contoh: 50000" required>
                </div>
                <button type="submit">Lanjutkan ke Pembayaran</button>
            </form>
        `;

        document.getElementById('topup-form')?.addEventListener('submit', handleRequestQris);
        document.querySelectorAll('.preset-amount-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.currentTarget.dataset.amount;
                handleRequestQris(e, amount);
            });
        });

    } catch (error) {
        optionsContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

/**
 * @function handleRequestQris
 * @description Memanggil backend untuk mendapatkan data QRIS, lalu memanggil fungsi render.
 */
async function handleRequestQris(e, presetAmount = null) {
    e.preventDefault();
    const button = e.currentTarget;
    if (button.disabled) return;

    // Menonaktifkan semua tombol agar tidak bisa diklik ganda
    document.querySelectorAll('#topup-form button, .preset-amount-btn').forEach(btn => btn.disabled = true);
    
    let spinnerTarget = e.type === 'submit' ? e.target.querySelector('button[type="submit"]') : button;
    const originalText = spinnerTarget.innerHTML;
    spinnerTarget.innerHTML = `<span class="button-spinner"></span>`;
    
    displayFeedback('modal-error-container', '', false);

    const amountInput = document.getElementById('topup-amount');
    let amount = presetAmount ? parseInt(presetAmount, 10) : (amountInput ? parseInt(amountInput.value, 10) : 0);

    try {
        if (isNaN(amount) || amount < 5000) {
            throw new Error("Jumlah top-up minimal adalah Rp 5.000.");
        }
        
        const { data, status } = await apiFetch('/topup/request-qris', {
            method: 'POST',
            body: { amount }
        });

        if (status === 200 && data.status && data.qrisData) {
            // Panggil fungsi render yang baru dengan data yang diterima dari server
            renderDynamicQrisDisplay(
                data.qrisData.base64Image, 
                data.qrisData.uniqueAmount, 
                data.qrisData.expiresAt,
                data.topUpId // Kirim ID ke fungsi render
            );
        } else {
            throw new Error(data.message || 'Gagal membuat permintaan QRIS.');
        }

    } catch (error) {
        displayFeedback('modal-error-container', error.message, true);
        spinnerTarget.innerHTML = originalText;
        // Aktifkan kembali semua tombol jika gagal
        document.querySelectorAll('#topup-form button, .preset-amount-btn').forEach(btn => btn.disabled = false);
    }
}
/**
 * @function handleCancelQris
 * @description Handler untuk tombol "Batalkan" pada modal QRIS.
 */
async function handleCancelQris(e) {
    const cancelButton = e.currentTarget;
    const modalContent = cancelButton.closest('.modal-content');
    if (!modalContent) return;

    // Nonaktifkan semua tombol di modal
    modalContent.querySelectorAll('button').forEach(btn => btn.disabled = true);
    cancelButton.innerHTML = `<span class="button-spinner"></span> Membatalkan...`;

    // --- PERBAIKAN: Hentikan semua interval saat pembatalan dimulai ---
    if (window.qrisCountdownInterval) clearInterval(window.qrisCountdownInterval);
    if (window.activeQrisPollingInterval) clearInterval(window.activeQrisPollingInterval);
    // --- AKHIR PERBAIKAN ---

    try {
        const { data, status } = await apiFetch('/topup/cancel', { method: 'POST' });

        if (status === 200 && data.status) {
            showToast(data.message, false);
            
            // Tutup modal
            const modalContainer = document.getElementById('modal-container');
            if (modalContainer) modalContainer.innerHTML = '';
            
            // ### PERBAIKAN FINAL DI SINI ###
            // Panggil main() untuk me-refresh seluruh state aplikasi dan tampilan.
            // Ini akan menjalankan ulang semua proses fetch data dan render dari awal.
            main();
            
        } else {
            throw new Error(data.message || 'Gagal membatalkan.');
        }
    } catch (error) {
        showToast(error.message, true);
        // Aktifkan kembali tombol jika gagal
        modalContent.querySelectorAll('button').forEach(btn => btn.disabled = false);
        cancelButton.textContent = 'Batalkan';
    }
}


/**
 * @function renderDynamicQrisDisplay
 * @description FUNGSI BARU untuk merender modal QRIS dengan gambar Base64, timer, dan tombol aksi.
 * @param {string} base64Image - String base64 dari gambar QRIS.
 * @param {number} uniqueAmount - Jumlah unik yang harus dibayar.
 * @param {number} expiresAt - Timestamp Unix (detik) kapan QRIS kedaluwarsa.
 * @param {string} topUpId - ID unik dari transaksi top-up untuk di-polling.
 */
function renderDynamicQrisDisplay(base64Image, uniqueAmount, expiresAt, topUpId) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    // Hentikan interval lama jika ada
    if (window.qrisCountdownInterval) clearInterval(window.qrisCountdownInterval);
    if (window.activeQrisPollingInterval) clearInterval(window.activeQrisPollingInterval);

    // --- LOGIKA BARU: Polling Status Transaksi ---
    window.activeQrisPollingInterval = setInterval(async () => {
        try {
            const { data } = await apiFetch(`/topup/status/${topUpId}`);
            
            // Jika transaksi sudah selesai (berhasil)
            if (data.transactionStatus === 'completed') {
                // 1. Hentikan semua interval
                clearInterval(window.activeQrisPollingInterval);
                if (window.qrisCountdownInterval) clearInterval(window.qrisCountdownInterval);

                // 2. Tutup modal
                if (modalContainer) modalContainer.innerHTML = '';

                // 3. Tampilkan notifikasi sukses
                showToast('Top up berhasil! Saldo Anda telah ditambahkan.', false);

                // 4. Refresh aplikasi untuk memperbarui saldo di UI
                main();
            } 
            // Jika transaksi sudah tidak pending (kedaluwarsa/dibatalkan)
            else if (data.transactionStatus !== 'pending') {
                clearInterval(window.activeQrisPollingInterval);
                console.log(`Polling dihentikan karena status transaksi adalah: ${data.transactionStatus}`);
            }
        } catch (error) {
            console.error('Error saat polling status top-up:', error.message);
            clearInterval(window.activeQrisPollingInterval); // Hentikan jika ada error
        }
    }, 4000); // Cek setiap 4 detik

    // --- Sisa kode untuk merender modal (tidak berubah) ---
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content" style="text-align: center;">
                <div class="modal-header"><h2>Scan untuk Membayar</h2></div>
                
                <p style="margin-top: 1rem; font-weight: bold;">PENTING: Transfer Tepat Sesuai Nominal Unik!</p>
                <h3 style="font-size: 2rem; color: var(--danger-color); margin: 0.5rem 0; letter-spacing: 1px; background: #f0f0f0; padding: 5px; border-radius: 5px;">Rp ${uniqueAmount.toLocaleString('id-ID')}</h3>
                
                <div id="qrcode-image-container" style="padding: 1rem; background: white; display: inline-block; border-radius: 8px; margin: 1rem auto; border: 1px solid #ddd;">
                    <img src="${base64Image}" alt="QR Code Pembayaran" width="220" height="220">
                </div>
                
                <p id="payment-status" style="font-size: 0.9em; margin-top: 1rem;">
                    Batas Waktu: <strong id="qris-countdown-timer">Memuat...</strong>
                </p>
                <p style="font-size: 0.85em; color: #555;">Setelah membayar, saldo akan bertambah otomatis. Anda bisa menutup jendela ini dan cek riwayat nanti.</p>

                <div class="modal-actions" style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button id="cancel-qris-btn" class="secondary" style="flex-grow: 1;">Batalkan</button>
                    <button id="close-qris-modal-btn" style="flex-grow: 1;">Tutup</button>
                </div>
            </div>
        </div>
    `;

    // Logika Countdown Timer
    const countdownElement = document.getElementById('qris-countdown-timer');
    const expiryTime = expiresAt * 1000;

    if (countdownElement) {
        window.qrisCountdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = expiryTime - now;

            if (distance < 0) {
                clearInterval(window.qrisCountdownInterval);
                countdownElement.textContent = "Waktu Habis";
                countdownElement.style.color = 'var(--danger-color)';
                const qrImg = document.querySelector('#qrcode-image-container img');
                if (qrImg) qrImg.style.opacity = '0.3';
                // Nonaktifkan tombol batalkan jika waktu habis
                const cancelBtn = document.getElementById('cancel-qris-btn');
                if(cancelBtn) cancelBtn.disabled = true;
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    // Logika untuk menutup modal (tanpa membatalkan)
    const closeModalOnly = () => {
        if (window.qrisCountdownInterval) {
            clearInterval(window.qrisCountdownInterval);
            clearInterval(window.activeQrisPollingInterval); // <-- PERBAIKAN: Hentikan polling juga
        }
        modalContainer.innerHTML = '';
        if (window.location.hash.includes('#history')) {
           renderDashboard('history');
        }
    };
    
    document.getElementById('close-qris-modal-btn')?.addEventListener('click', closeModalOnly);
    document.getElementById('cancel-qris-btn')?.addEventListener('click', handleCancelQris);
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
    // Listener untuk form OTP
    document.getElementById('request-otp-btn')?.addEventListener('click', handleRequestPhoneOtp);
    document.getElementById('verify-otp-btn')?.addEventListener('click', handlePhoneLogin);

    const phoneInput = document.getElementById('targetPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            // Jika nilai input dimulai dengan '0', ganti dengan '62'
            if (phoneInput.value.startsWith('0')) {
                phoneInput.value = '62' + phoneInput.value.substring(1);
            }
        });
    }
    
    // Listener untuk panel yang sudah terverifikasi
    document.getElementById('check-active-btn')?.addEventListener('click', handleCheckActivePackages);
    document.getElementById('change-phone-btn')?.addEventListener('click', () => {
        if (confirm('Yakin ingin mengganti nomor terverifikasi? Anda perlu verifikasi ulang.')) {
            phoneAuth = { phone: null, accessToken: null, authId: null };
            localStorage.removeItem('kmspAuth');
            renderDashboard('packages');
        }
    });

    // Listener untuk tombol login dengan nomor tersimpan
    document.getElementById('login-saved-phone-btn')?.addEventListener('click', handleLoginWithSavedPhone);

    // Listener untuk logika Tab
    document.querySelectorAll('.session-tabs .tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Hapus kelas aktif dari semua tombol dan konten
            document.querySelectorAll('.session-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Tambahkan kelas aktif ke tombol dan konten yang diklik
            const tabId = button.dataset.tab;
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
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
async function handleManualExtend(e) {
    const button = e.currentTarget;
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memperpanjang...`;
    displayFeedback('token-list-feedback', '', false);

    const phoneInput = document.getElementById('extend-phone');
    const authIdInput = document.getElementById('extend-auth-id');
    
    if (!phoneInput || !authIdInput) return; // defensive check

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
            
            showToast('Sesi berhasil diperpanjang!', false); // Gunakan toast untuk notifikasi

            // PERBAIKAN: Render ulang halaman 'Beli Paket' saja, bukan seluruh aplikasi
            renderDashboard('packages'); 
            
        } else {
            throw new Error(data.message || 'Gagal memperpanjang sesi: Respons tidak valid.');
        }
    } catch (error) {
        displayFeedback('token-list-feedback', error.message, true);
    } finally {
        // Tombol akan di-render ulang oleh renderDashboard, jadi tidak perlu di-reset manual di sini
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

    button.disabled = true;
    button.innerHTML = `<span class="button-spinner"></span> Memverifikasi...`;
    displayFeedback('phone-feedback-container', '', false);

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
            
            // PERBAIKAN: Render ulang halaman 'Beli Paket' saja, bukan seluruh aplikasi
            renderDashboard('packages'); 
            
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

        // --- PERUBAHAN INTI DI SINI ---
        if (response.status === 401 || response.status === 403) {
            // JANGAN REDIRECT DI SINI.
            // Lempar error khusus yang akan ditangkap oleh fungsi pemanggil.
            const errorData = await response.json();
            throw new AuthError(errorData.message || `Akses Ditolak (HTTP ${response.status})`);
        }
        
        const data = await response.json();
        // Cek jika respons TIDAK OK, tapi bukan karena error otentikasi
        if (!response.ok && response.status !== 202) {
            throw new Error(data.message || `Terjadi kesalahan pada server (HTTP ${response.status})`);
        }
        
        return { data, status: response.status };

    } catch (error) {
        // Salurkan AuthError ke atas agar bisa ditangani secara spesifik
        if (error instanceof AuthError) {
            throw error;
        }

        // Tangani error koneksi seperti sebelumnya
        if (error.message.includes('Failed to fetch') || error.message.includes('ENOTFOUND')) {
            throw new Error("Gagal terhubung ke server. Periksa koneksi internet Anda.");
        }
        
        // Untuk error lainnya
        throw error;
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
    displayFeedback('feedback-container', '', false);

    try {
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const { data, status } = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });

        if (status === 200 && data.user) {
            currentUser = data.user; // Simpan data pengguna yang baru login

            // Cek apakah tur perlu dijalankan untuk pengguna baru
            if (currentUser.role !== 'admin') {
                // Anda bisa menambahkan logika pengecekan jika ini login pertama kali
                // setTimeout(startWelcomeTour, 500); 
            }

            // --- PERBAIKAN DI SINI ---
            // Panggil appRouter() untuk merender ulang aplikasi dalam keadaan login,
            // bukan memanggil main() yang sudah tidak ada.
            await appRouter();

        } else {
            throw new Error(data.message || 'Login gagal: Respons tidak valid.');
        }
    } catch (error) {
        displayFeedback('feedback-container', error.message, true);
        button.disabled = false;
        button.textContent = 'Login';
    }
}

/** 
 * FUNGSI BARU: Memulai tur interaktif untuk pengguna baru menggunakan Shepherd.js
 */
function startWelcomeTour() {
    // --- PERBAIKAN UNTUK MOBILE ---
    // Cek lebar layar untuk menentukan apakah tampilan mobile atau desktop.
    const isMobile = window.innerWidth <= 900;

    // Tentukan elemen dan posisi yang akan ditunjuk berdasarkan layout.
    const beliPaketAttachTo = {
        element: isMobile ? '.bottom-nav a[href="#beli-paket"]' : '.sidebar-nav a[href="#beli-paket"]',
        on: isMobile ? 'top' : 'right'
    };

    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shepherd-custom',
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    // Definisikan langkah-langkah tur
    tour.addStep({
        id: 'welcome',
        title: 'Selamat Datang di RYYSTORE!',
        text: 'Mari kita lihat cara membeli paket. Klik "Lanjut" untuk memulai tur singkat ini.',
        buttons: [{ text: 'Lewati', action: tour.cancel, secondary: true }, { text: 'Lanjut', action: tour.next }]
    });

    tour.addStep({
        id: 'menu-beli-paket',
        title: 'Mulai dari Sini',
        text: "Semua pembelian paket (yang butuh OTP) dimulai dari menu ini.",
        attachTo: beliPaketAttachTo, // Gunakan konfigurasi dinamis yang sudah dibuat
        buttons: [{ text: 'Kembali', action: tour.back }, { text: 'Lanjut', action: tour.next }],
        when: { show: () => { if (window.location.hash !== '#dashboard') window.location.hash = '#dashboard'; } }
    });

    tour.addStep({
        id: 'verifikasi-nomor',
        title: 'Langkah 1: Verifikasi Nomor',
        text: 'Di halaman ini, langkah pertama adalah verifikasi nomor HP Anda. Cukup sekali saja untuk banyak transaksi!',
        attachTo: { element: '.phone-verification-panel', on: 'bottom' },
        buttons: [{ text: 'Kembali', action: tour.back }, { text: 'Lanjut', action: tour.next }],
        when: { show: () => { if (window.location.hash.split('?')[0] !== '#beli-paket') window.location.hash = '#beli-paket'; } }
    });
    
    tour.addStep({
        id: 'pilih-paket',
        title: 'Langkah 2: Pilih Paketnya',
        text: 'Setelah nomor terverifikasi, pilih paket yang Anda inginkan dari daftar ini. Anda bisa mencari atau memilih langsung dari kartu.',
        attachTo: { element: '#regular-package-section', on: 'bottom' },
        buttons: [{ text: 'Kembali', action: tour.back }, { text: 'Lanjut', action: tour.next }]
    });

    tour.addStep({
        id: 'balance',
        title: 'Penting: Saldo Anda',
        text: 'Oh ya, pastikan saldo Anda cukup untuk membayar biaya layanan (fee). Anda bisa Top Up di sini kapan saja.',
        attachTo: { element: '.main-balance-card', on: 'bottom' },
        buttons: [{ text: 'Kembali', action: tour.back }, { text: 'Mengerti!', action: tour.next }],
        when: { show: () => { if (window.location.hash !== '#dashboard') window.location.hash = '#dashboard'; } }
    });

    tour.addStep({
        id: 'cara-beli',
        title: 'Butuh Bantuan Lebih Lanjut?',
        text: 'Jika Anda masih bingung, semua panduan lengkap dengan gambar ada di menu "Cara Pembelian" ini.',
        attachTo: { 
            element: isMobile ? '.app-menu-grid a[href="#tutorial"]' : '.sidebar-nav a[href="#tutorial"]',
            on: isMobile ? 'top' : 'right' 
        },
        buttons: [{ text: 'Kembali', action: tour.back }, { text: 'Mengerti!', action: tour.next }],
        when: { show: () => { if (window.location.hash !== '#dashboard') window.location.hash = '#dashboard'; } }
    });

    tour.addStep({
        id: 'finish',
        title: 'Selesai!',
        text: 'Anda sekarang siap untuk mulai bertransaksi. Jika butuh bantuan, kunjungi menu "Cara Beli". Selamat mencoba!',
        buttons: [{ text: 'Selesai', action: tour.complete }]
    });

    tour.start();
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

        // --- PERUBAHAN BARU: Hapus watermark saat logout ---
        const existingWatermark = document.getElementById('dynamic-watermark');
        if (existingWatermark) {
            existingWatermark.remove();
        }
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
    
    try {
    const { data } = await apiFetch('/user/packages');
    visiblePackages = data.data || []; // Selalu perbarui dengan data terbaru
} catch (error) {
    pageContent.innerHTML = '<p class="error-message">Gagal memuat daftar paket.</p>';
    return;
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
    button.innerHTML = '<span class="button-spinner"></span> Mengecek...';
    
    resultsContainer.innerHTML = `
        <div class="page-content" style="padding: 1rem; background: #f9f9f9;">
            <h3>Hasil Pengecekan Stok (Real-time)</h3>
            <ul id="realtime-stock-list" style="list-style: none; padding: 0;"></ul>
            <p id="stock-check-status" style="text-align: center; margin-top: 1rem;"></p>
        </div>
    `;
    const stockListUl = document.getElementById('realtime-stock-list');
    const statusP = document.getElementById('stock-check-status');

    // --- PERBAIKAN DI BARIS INI ---
    const packagesToCheck = visiblePackages.filter(p => 
        p.category === 'non-otp' && 
        p.isVisible && 
        p.name.toLowerCase().includes('akrab') // Hanya sertakan paket yang namanya mengandung "akrab"
    );

    if (packagesToCheck.length === 0) {
        statusP.textContent = "Tidak ada paket Akrab yang aktif untuk diperiksa.";
        button.disabled = false;
        button.textContent = 'Cek Stok Semua Paket Akrab';
        return;
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const [index, pkg] of packagesToCheck.entries()) {
        statusP.textContent = `Mengecek ${index + 1}/${packagesToCheck.length}: ${pkg.name}`;
        
        let stockResult = { success: false, stock: 'Gagal Cek' };
        try {
            const { data } = await apiFetch(`/packages/stock/${pkg.package_code}`);
            if (data.status && data.data) {
                stockResult = { success: true, stock: data.data.stock };
            } else {
                stockResult = { success: false, stock: data.message || 'Gagal' };
            }
        } catch (error) {
            stockResult = { success: false, stock: 'Error' };
        }

        const resultLi = document.createElement('li');
        resultLi.style.cssText = 'display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #eee;';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = pkg.name;

        const stockStrong = document.createElement('strong');
        stockStrong.style.color = stockResult.success && stockResult.stock > 0 ? 'var(--success-color)' : 'var(--danger-color)';
        stockStrong.textContent = stockResult.success ? (stockResult.stock > 0 ? `Stok: ${stockResult.stock}` : 'Stok: 0') : stockResult.stock;
        
        resultLi.appendChild(nameSpan);
        resultLi.appendChild(stockStrong);
        stockListUl.appendChild(resultLi);

        await delay(200);
    }

    statusP.textContent = `✅ Selesai! ${packagesToCheck.length} paket Akrab telah diperiksa.`;
    button.disabled = false;
    button.textContent = 'Cek Ulang Stok Semua Paket Akrab';
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
            body: { phone, packageId } // Hanya phone dan packageId
        });

        if (currentUser && typeof data.newBalance === 'number') {
            currentUser.balance = data.newBalance;
            document.getElementById('user-balance').textContent = `Rp ${currentUser.balance.toLocaleString('id-ID')}`;
        }

        showToast(data.message, false); 

        if (status === 200 || status === 202) {
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
            purchaseBtn.disabled = false;
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
            isMaintenanceMode = data.maintenanceMode !== undefined ? data.maintenanceMode : false;
            providerBalance = data.providerBalance !== undefined ? data.providerBalance : null;
        } else {
            currentUser = null;
        }
    } catch (error) {
        // --- PERUBAHAN LOGIKA PENANGANAN ERROR ---
        if (error instanceof AuthError) {
            // Jika ini error otentikasi (401/403), kita tahu sesi tidak valid.
            // Cukup set currentUser ke null. JANGAN REDIRECT.
            console.log("checkLoginStatus: Sesi tidak valid atau kedaluwarsa.");
            currentUser = null;
        } else {
            // Untuk error lain (misal, jaringan), tampilkan di console.
            console.error("Gagal memeriksa status login:", error);
            currentUser = null;
        }
        // Pastikan state lain juga di-reset jika terjadi error
        isMaintenanceMode = false;
        providerBalance = null;
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
                  <th>Tipe Paket</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Pesan API</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => `
                  <tr>
                    <td data-label="Tanggal">${new Date(log.createdAt).toLocaleString('id-ID')}</td>
                    <td data-label="Tipe Paket">${log.packageName}</td>
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

async function loadAndRenderTopUpOptions() {
    const listContainer = document.getElementById('topup-options-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        // === PERBAIKAN DI BARIS INI ===
        const { data: responseData, status } = await apiFetch('/admin/topup-options');

        if (status !== 200 || !responseData.status || !Array.isArray(responseData.data)) {
            throw new Error(responseData.message || 'Gagal memuat data nominal.');
        }

        const data = responseData.data;

        if (data.length === 0) {
            listContainer.innerHTML = '<p>Belum ada nominal yang diatur.</p>';
            return;
        }

        listContainer.innerHTML = data.map(opt => `
            <div class="topup-option-item" data-value="${opt.value}">
                <span>${opt.label}</span>
                <button class="delete-topup-option-btn">&times;</button>
            </div>
        `).join('');

        listContainer.querySelectorAll('.delete-topup-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.currentTarget.closest('.topup-option-item').remove();
            });
        });

    } catch (error) {
        listContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

/**
 * FUNGSI BARU: Handler untuk form tambah nominal baru di panel admin.
 */
function handleAddTopUpOption(e) {
    e.preventDefault();
    const input = document.getElementById('new-topup-value');
    if (!input) return;

    const value = parseInt(input.value, 10);
    if (isNaN(value) || value <= 0) {
        showToast('Masukkan nominal yang valid.', true);
        return;
    }

    const listContainer = document.getElementById('topup-options-list');
    
    // Cek duplikasi
    if (listContainer.querySelector(`[data-value="${value}"]`)) {
        showToast('Nominal tersebut sudah ada.', true);
        return;
    }

    const newItem = document.createElement('div');
    newItem.className = 'topup-option-item';
    newItem.dataset.value = value;
    newItem.innerHTML = `
        <span>Rp ${value.toLocaleString('id-ID')}</span>
        <button class="delete-topup-option-btn">&times;</button>
    `;

    newItem.querySelector('.delete-topup-option-btn').addEventListener('click', (e) => {
        e.currentTarget.closest('.topup-option-item').remove();
    });

    listContainer.appendChild(newItem);
    input.value = ''; // Kosongkan input
}

/**
 * FUNGSI BARU: Handler untuk tombol "Simpan Perubahan" nominal top-up.
 */async function handleSaveTopUpOptions(e) {
    const button = e.currentTarget;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner"></span> Menyimpan...';
    displayFeedback('topup-options-feedback', '', false);

    try {
        const items = document.querySelectorAll('#topup-options-list .topup-option-item');
        const optionsToSave = Array.from(items).map(item => ({
            value: parseInt(item.dataset.value, 10)
        }));

        // === PERBAIKAN DI BARIS INI ===
        const { data, status } = await apiFetch('/admin/topup-options', {
            method: 'PUT',
            body: { options: optionsToSave }
        });

        if (status !== 200 || !data.status) throw new Error(data.message || "Gagal menyimpan.");

        showToast(data.message, false);
        displayFeedback('topup-options-feedback', data.message, false);

    } catch (error) {
        showToast(error.message, true);
        displayFeedback('topup-options-feedback', error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = 'Simpan Perubahan';
    }
}


window.addEventListener('hashchange', appRouter);
document.addEventListener('DOMContentLoaded', appRouter);