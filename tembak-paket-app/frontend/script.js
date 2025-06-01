// frontend/script.js

// Alamat dasar backend Anda. Sesuaikan jika backend Anda berjalan di port atau host yang berbeda.
const BACKEND_BASE_URL = '/api'; // Ganti dengan URL backend produksi Anda nantinya

let currentPackages = []; // Akan menyimpan paket yang LOLOS filter dan ditampilkan

function displayResponse(data) {
    document.getElementById('apiResponse').textContent = JSON.stringify(data, null, 2);
}

async function makeApiCall(url, buttonElement = null, method = 'GET', body = null) {
    if (buttonElement) buttonElement.disabled = true;
    let originalButtonText = buttonElement ? buttonElement.textContent : '';
    if (buttonElement) buttonElement.textContent = 'Memproses...';

    try {
        const options = { method };
        if (body && method !== 'GET') { // GET tidak punya body
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        
        console.log(`Frontend: Calling Backend URL: ${url}`); 
        const response = await fetch(url, options);
        
        console.log(`Frontend: Backend Response Status: ${response.status}`);
        if (!response.ok) {
             console.warn(`Frontend: Backend Response not OK. Status Text: ${response.statusText}`);
        }

        const data = await response.json(); 
        displayResponse(data);
        return data;
    } catch (error) {
        const errorData = { status: false, message: "Gagal menghubungi server backend atau memproses respons.", details: error.message };
        displayResponse(errorData);
        console.error('Frontend: API Call Error to Backend:', error); 
        return errorData;
    } finally {
        if (buttonElement) {
            buttonElement.disabled = false;
            if (originalButtonText) buttonElement.textContent = originalButtonText;
        }
    }
}

async function checkAccountBalance(buttonElement) {
    const backendUrl = `${BACKEND_BASE_URL}/balance`;
    const result = await makeApiCall(backendUrl, buttonElement);

    const balanceDisplay = document.getElementById('accountBalanceDisplay');
    if (result && result.status && result.data && result.data.balance !== undefined) {
        const formattedBalance = new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR', 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0  
        }).format(result.data.balance);
        
        balanceDisplay.textContent = formattedBalance;
    } else if (result && result.message) {
        balanceDisplay.textContent = 'Gagal memuat';
        alert(`Gagal mengambil saldo: ${result.message}`);
    } else {
        balanceDisplay.textContent = 'Error';
        alert('Gagal mengambil saldo. Periksa konsol browser atau pastikan backend berjalan.');
    }
}

async function requestOtp(buttonElement) {
    const phone = document.getElementById('phoneReqOtp').value;
    if (!phone || !/^62\d{9,13}$/.test(phone)) {
        alert('Format Nomor HP salah. Gunakan format 628xxxxxxxxxx.');
        return;
    }
    const backendUrl = `${BACKEND_BASE_URL}/request-otp?phone=${phone}`;
    const result = await makeApiCall(backendUrl, buttonElement);

    if (result && result.status && result.data && result.data.auth_id) {
        document.getElementById('authId').value = result.data.auth_id;
        alert(`Sukses: ${result.message}\nAuth ID telah diisi. Silakan cek SMS Anda.`);
    } else if (result && result.message) {
        alert(`Gagal mengirim OTP: ${result.message}`);
    } else {
        alert(`Gagal mengirim OTP. Periksa konsol browser untuk detail atau pastikan backend berjalan.`);
    }
}

async function loginOtp(buttonElement) {
    const phone = document.getElementById('phoneReqOtp').value;
    const authId = document.getElementById('authId').value;
    const otpCode = document.getElementById('otpCode').value;

    if (!phone || !authId || !otpCode) {
        alert('Harap lengkapi Nomor HP, Auth ID, dan Kode OTP.');
        return;
    }
    const backendUrl = `${BACKEND_BASE_URL}/login-otp?phone=${phone}&auth_id=${authId}&otp=${otpCode}`;
    const result = await makeApiCall(backendUrl, buttonElement);

    if (result && result.status && result.data && result.data.access_token) {
        document.getElementById('accessToken').value = result.data.access_token;
        alert(`Sukses: ${result.message}\nAccess Token telah didapatkan.`);
    } else if (result && result.message) {
        alert(`Gagal Login: ${result.message}`);
    } else {
        alert(`Gagal Login. Periksa konsol browser untuk detail atau pastikan backend berjalan.`);
    }
}

async function listAccessTokens(buttonElement) {
    const backendUrl = `${BACKEND_BASE_URL}/access-tokens`;
    const result = await makeApiCall(backendUrl, buttonElement);

    const phoneExtendInput = document.getElementById('phoneExtend');
    const authIdExtendInput = document.getElementById('authIdExtend');

    if (result && result.status && result.data && Array.isArray(result.data)) {
        if (result.data.length > 0) {
            const firstToken = result.data[0];
            phoneExtendInput.value = firstToken.msisdn;
            authIdExtendInput.value = `${firstToken.session_id}:${firstToken.token}`;
            alert(`Token pertama (${firstToken.msisdn}) telah diisikan ke field "Extend Sesi". Anda bisa mencoba memperpanjang sesi token ini.`);
        } else {
            alert('Tidak ada access token aktif yang ditemukan di KMSP-STORE.');
            phoneExtendInput.value = '';
            authIdExtendInput.value = '';
        }
    } else if (result && result.message) {
        alert(`Gagal mengambil daftar token: ${result.message}`);
        phoneExtendInput.value = '';
        authIdExtendInput.value = '';
    } else {
        alert('Gagal mengambil daftar token. Periksa konsol browser atau pastikan backend berjalan.');
        phoneExtendInput.value = '';
        authIdExtendInput.value = '';
    }
}

async function extendSession(buttonElement) {
    const phone = document.getElementById('phoneExtend').value;
    const authIdSessionToken = document.getElementById('authIdExtend').value;

    if (!phone || !authIdSessionToken) {
        alert('Field Nomor HP atau Auth ID untuk extend kosong. Coba dapatkan daftar token terlebih dahulu.');
        return;
    }
    if (!/^62\d{9,13}$/.test(phone)) {
        alert('Format Nomor HP untuk extend salah.');
        return;
    }
     if (!authIdSessionToken.includes(':')) {
        alert('Format Auth ID untuk extend salah. Seharusnya "session_id:token".');
        return;
    }

    const backendUrl = `${BACKEND_BASE_URL}/extend-session?phone=${phone}&auth_id=${encodeURIComponent(authIdSessionToken)}`;
    const result = await makeApiCall(backendUrl, buttonElement);

    if (result && result.status && result.data && result.data.access_token) {
        document.getElementById('accessToken').value = result.data.access_token;
        alert(`Sukses: ${result.message}\nAccess Token telah diperbarui (sesi diperpanjang).`);
    } else if (result && result.message) {
        alert(`Gagal memperpanjang sesi: ${result.message}`);
    } else {
        alert('Gagal memperpanjang sesi. Periksa konsol browser atau pastikan backend berjalan.');
    }
}

// ***** PERUBAHAN UTAMA ADA DI FUNGSI INI *****
async function fetchPackageList(buttonElement) {
    const backendUrl = `${BACKEND_BASE_URL}/packages`;
    const packageSelect = document.getElementById('packageSelect');
    
    const result = await makeApiCall(backendUrl, buttonElement);

    packageSelect.innerHTML = '<option value="">-- Silakan pilih paket --</option>';
    document.getElementById('packageDetailsArea').style.display = 'none';
    if (document.getElementById('selectedPackageCode')) { 
        document.getElementById('selectedPackageCode').value = '';
    }
    if(document.getElementById('btnCheckStock')) document.getElementById('btnCheckStock').disabled = true;


    if (result && result.status && Array.isArray(result.data)) {
        const semuaPaketDariApi = result.data; 
        currentPackages = []; 

        if (semuaPaketDariApi.length === 0) {
            packageSelect.innerHTML = '<option value="">Tidak ada paket tersedia dari API</option>';
            return;
        }
        
        // --- Daftar bagian NAMA PAKET (atau kata kunci) yang ingin ditampilkan ---
        // Sesuaikan string di bawah ini agar cocok dengan bagian unik dari nama paket
        // yang dikembalikan oleh API KMSP. Pencocokan tidak case-sensitive.
        const kataKunciPilihan = [
            "[Method E-Wallet] Unlimited Turbo Premium bayar ke XL Rp50.000 (untuk Xtra Combo)",    // Contoh, cocokkan dengan nama dari API
            "[Method E-Wallet] Unlimited Turbo Super bayar ke XL Rp30.000 (untuk Xtra Combo)",
            "[Method E-Wallet] Unlimited Turbo Basic bayar ke XL Rp10.000 (untuk Xtra Combo)",
            "[Method E-Wallet] Unlimited Turbo Standard bayar ke XL Rp20.000 (untuk Xtra Combo)",
            "[Method E-Wallet] Unlimited Turbo TikTok untuk Xtra Combo",
            "[Method E-Wallet] Unlimited Turbo Joox untuk Xtra Combo",
            "[Method E-Wallet] Unlimited Turbo Netflix untuk Xtra Combo",
            "masa aktif kartu xl 1 tahun",
             "[Method E-Wallet] Xtra Combo Special 8GB Disc (1GB-8GB)"// Atau bagian unik dari nama paket ini
                                          // Periksa nama paket AKTUAL dari API untuk ini.
        ];
        // --- AKHIR DAFTAR ---

        semuaPaketDariApi.forEach(pkg => {
            const namaPaketLower = pkg.package_name.toLowerCase(); 
            let lolosFilter = false;

            // Cek apakah nama paket dari API mengandung salah satu dari kata kunci pilihan kita
            for (const kataKunci of kataKunciPilihan) {
                if (namaPaketLower.includes(kataKunci.toLowerCase())) {
                    lolosFilter = true;
                    break; 
                }
            }
            
            // Anda bisa menambahkan kriteria filter tambahan di sini jika perlu, misalnya berdasarkan harga:
            // const hargaPaketInt = parseInt(pkg.package_harga_int, 10);
            // if (lolosFilter && hargaPaketInt < 50000) { // Hanya jika lolos filter nama DAN harga di bawah 50rb
            //    // Biarkan lolosFilter = true
            // } else if (lolosFilter && hargaPaketInt >= 50000) { // Lolos filter nama TAPI harga tidak sesuai
            //    lolosFilter = false;
            // }


            if (lolosFilter) {
                currentPackages.push(pkg); 
                const option = document.createElement('option');
                option.value = pkg.package_code;
                option.textContent = `${pkg.package_name} (${pkg.package_harga})`; 
                packageSelect.appendChild(option);
            }
        });

        if (currentPackages.length === 0) {
            packageSelect.innerHTML = '<option value="">Tidak ada paket yang sesuai pilihan Anda</option>';
        }

    } else if (result && result.message) {
        packageSelect.innerHTML = `<option value="">Gagal memuat: ${result.message}</option>`;
    } else {
        packageSelect.innerHTML = '<option value="">Gagal memuat paket. Pastikan backend berjalan.</option>';
    }
}
// ***** AKHIR PERUBAHAN UTAMA *****


function handlePackageSelection(packageCode) {
    const packageDetailsArea = document.getElementById('packageDetailsArea');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const btnCheckStock = document.getElementById('btnCheckStock');
    
    document.getElementById('selectedPackageCode').value = packageCode;
    paymentMethodSelect.innerHTML = '<option value="">-- Pilih metode --</option>';
    paymentMethodSelect.disabled = true;
    if(btnCheckStock) btnCheckStock.disabled = true;

    if (!packageCode) {
        packageDetailsArea.style.display = 'none';
        return;
    }

    const selectedPkg = currentPackages.find(p => p.package_code === packageCode);
    if (selectedPkg) {
        packageDetailsArea.style.display = 'block';
        document.getElementById('detailPackageName').textContent = selectedPkg.package_name;
        document.getElementById('detailPackagePrice').textContent = selectedPkg.package_harga;
        document.getElementById('detailPackageDesc').textContent = selectedPkg.package_description;
        document.getElementById('detailNeedLogin').textContent = selectedPkg.no_need_login ? 'Tidak' : 'Ya';
        document.getElementById('detailNeedStock').textContent = selectedPkg.need_check_stock ? 'Ya' : 'Tidak';
        if(btnCheckStock) btnCheckStock.disabled = !selectedPkg.need_check_stock;

        document.getElementById('detailCutoff').textContent = selectedPkg.have_cut_off_time ?
            `${selectedPkg.cut_off_time.prohibited_hour_starttime} - ${selectedPkg.cut_off_time.prohibited_hour_endtime} WIB` : '-';

        const pmList = document.getElementById('detailPaymentMethods');
        pmList.innerHTML = '';
        if (selectedPkg.no_need_login) {
             paymentMethodSelect.disabled = true;
             pmList.innerHTML = '<li>Tidak memerlukan metode pembayaran spesifik.</li>';
        } else if (selectedPkg.available_payment_methods && selectedPkg.available_payment_methods.length > 0) {
            paymentMethodSelect.disabled = false;
            selectedPkg.available_payment_methods.forEach(pm => {
                const listItem = document.createElement('li');
                listItem.textContent = `${pm.payment_method_display_name} (${pm.payment_method})`;
                pmList.appendChild(listItem);

                const option = document.createElement('option');
                option.value = pm.payment_method;
                option.textContent = `${pm.payment_method_display_name} (${pm.payment_method})`;
                paymentMethodSelect.appendChild(option);
            });
        } else {
            pmList.innerHTML = '<li>Metode pembayaran tidak dispesifikasi.</li>';
            paymentMethodSelect.disabled = true;
        }
    } else {
        packageDetailsArea.style.display = 'none';
    }
}

async function checkStock(buttonElement) {
    const packageCode = document.getElementById('selectedPackageCode').value;
    if (!packageCode) {
        alert('Harap pilih paket terlebih dahulu untuk cek stok.');
        return;
    }
    const backendUrl = `${BACKEND_BASE_URL}/check-stock?package_id=${packageCode}`;
    const result = await makeApiCall(backendUrl, buttonElement);
    if(result && result.message){
        alert(`Cek Stok: ${result.message} (Stok: ${result.data?.real_stock !== undefined ? result.data.real_stock : 'N/A'})`);
    }
}

async function purchasePackage(buttonElement) {
    const packageCode = document.getElementById('selectedPackageCode').value;
    const targetPhone = document.getElementById('targetPhone').value;

    if (!packageCode) {
        alert('Harap pilih paket dari daftar.');
        return;
    }
    if (!targetPhone || !/^62\d{9,13}$/.test(targetPhone)) {
        alert('Format Nomor HP Tujuan salah. Gunakan format 628xxxxxxxxxx.');
        return;
    }

    const selectedPkg = currentPackages.find(p => p.package_code === packageCode);
    if (!selectedPkg) {
        alert('Paket tidak ditemukan. Harap muat ulang daftar paket.');
        return;
    }
    
    let queryParams = `package_code=${packageCode}&phone=${targetPhone}`;
    
    if (!selectedPkg.no_need_login) {
        const accessToken = document.getElementById('accessToken').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        if (!accessToken) {
            alert('Access Token diperlukan untuk paket ini. Harap login dahulu.');
            return;
        }
        queryParams += `&access_token=${accessToken}`;
        if (paymentMethod) {
             queryParams += `&payment_method=${paymentMethod}`;
        } else if (selectedPkg.available_payment_methods && selectedPkg.available_payment_methods.length > 0) {
            const paymentOptions = selectedPkg.available_payment_methods.map(p => p.payment_method);
            if (paymentOptions.length > 0 && !paymentOptions.includes(paymentMethod)) { // Hanya error jika ada opsi tapi tidak ada yg dipilih
                 alert('Metode pembayaran diperlukan untuk paket ini. Silakan pilih dari dropdown.');
                 return;
            }
        }
    }
    
    const backendUrl = `${BACKEND_BASE_URL}/purchase?${queryParams}`;
    document.getElementById('qris-area').innerHTML = '';

    const result = await makeApiCall(backendUrl, buttonElement);
    if (result && result.status && result.data) {
        if (result.data.trx_id) {
            document.getElementById('trxId').value = result.data.trx_id;
        }
        const qrisArea = document.getElementById('qris-area');
        
        if (result.data.is_qris && result.data.qris_data && result.data.qris_data.qr_code) {
            new QRCode(qrisArea, {
                text: result.data.qris_data.qr_code,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            qrisArea.insertAdjacentHTML('beforeend', `<p>Sisa waktu: <span id="qrisTimer">${result.data.qris_data.remaining_time || 0}</span> detik</p>`);
            startQrisTimer(result.data.qris_data.remaining_time);
            alert('Pembelian diproses. Silakan scan QRIS. TRX ID: ' + (result.data.trx_id || 'N/A'));
        } else if (result.data.have_deeplink && result.data.deeplink_data && result.data.deeplink_data.deeplink_url) {
             qrisArea.innerHTML = `<p>Lanjutkan pembayaran:</p><button onclick="window.open('${decodeURIComponent(result.data.deeplink_data.deeplink_url)}', '_blank')">Bayar via ${result.data.deeplink_data.payment_method}</button>`;
             alert(`Pembelian diproses. TRX ID: ${result.data.trx_id || 'N/A'}. Lanjutkan via deeplink.`);
        } else {
             alert('Pembelian diproses. TRX ID: ' + (result.data.trx_id || 'N/A') + '. Pesan: ' + result.message + '. Cek status transaksi.');
        }
    } else if (result && result.message) {
        alert('Gagal melakukan pembelian: ' + result.message);
    } else {
        alert('Gagal melakukan pembelian. Periksa konsol browser untuk detail atau pastikan backend berjalan.');
    }
}

let qrisInterval;
function startQrisTimer(duration) {
    let timer = duration;
    const qrisArea = document.getElementById('qris-area');
    let timerDisplay = qrisArea.querySelector('span#qrisTimer');

    if (!timerDisplay && qrisArea) {
        const p = document.createElement('p');
        p.innerHTML = `Sisa waktu: <span id="qrisTimer">${timer}</span> detik`;
        qrisArea.appendChild(p);
        timerDisplay = qrisArea.querySelector('span#qrisTimer');
    } else if (timerDisplay) {
        timerDisplay.textContent = timer;
    }

    clearInterval(qrisInterval);
    qrisInterval = setInterval(function () {
        if (timerDisplay) timerDisplay.textContent = timer;
        else { clearInterval(qrisInterval); return; }
        
        if (--timer < 0) {
            clearInterval(qrisInterval);
            if (timerDisplay) timerDisplay.textContent = "Waktu habis";
        }
    }, 1000);
}

async function checkActivePackages(buttonElement) {
    const accessToken = document.getElementById('accessToken').value;
    if (!accessToken) {
        alert('Access Token diperlukan. Harap login dahulu.');
        return;
    }
    const backendUrl = `${BACKEND_BASE_URL}/active-packages?access_token=${accessToken}`;
    const result = await makeApiCall(backendUrl, buttonElement);
    if(result && result.message){
         alert(`Paket Aktif: ${result.message}`);
    } else if(result && !result.status) {
        alert(`Gagal cek paket aktif: ${result.message || 'Error tidak diketahui'}`);
    }
}

async function checkTransactionStatus(buttonElement) {
    const trxId = document.getElementById('trxId').value;
    if (!trxId) {
        alert('Harap masukkan Transaction ID.');
        return;
    }
    const backendUrl = `${BACKEND_BASE_URL}/transaction-status?trx_id=${trxId}`;
    const result = await makeApiCall(backendUrl, buttonElement);
    if (result && result.message && result.status) {
        alert(`Status Transaksi [${trxId}]: ${result.message}. Detail di area Respons API.`);
    } else if (result && result.message) {
        alert(`Info Transaksi [${trxId}]: ${result.message}. Detail di area Respons API.`);
    } else {
        alert(`Gagal cek status transaksi [${trxId}]. Pastikan backend berjalan atau periksa konsol.`);
    }
}