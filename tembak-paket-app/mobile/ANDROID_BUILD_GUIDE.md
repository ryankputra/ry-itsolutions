# Panduan Build Standalone APK Android (Ry-ITSolutions)

Dokumen ini menjelaskan alur pembuatan (build) file installer APK native resmi Android untuk aplikasi mobile `tembak-paket-app/mobile` menggunakan Expo Application Services (EAS Build), serta integrasi ke web `frontend-v2` (`/Ry-ITSolutions.apk`).

---

## 1. Konfigurasi Proyek

- **Package Name**: `com.ryitsolutions.mobile`
- **Expo SDK**: 58 (React Native 0.88.1, React 19)
- **Engine**: Hermes JS Engine (Bytecode bundle)
- **EAS Project ID**: `c18fb450-48fe-4e56-91e8-78c6e3d23f2b`
- **Output Web Delivery**: `frontend-v2/public/Ry-ITSolutions.apk`

---

## 2. Profil Build (`eas.json`)

File `eas.json` telah dikonfigurasi untuk menghasilkan file APK mandiri (bukan Google Play App Bundle `.aab`):

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    },
    "standalone": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## 3. Menjalankan Build Standalone APK

### Langkah 1: Login EAS CLI (satu kali)
```bash
npx eas-cli login
```

### Langkah 2: Jalankan Build APK di Cloud
Jalankan salah satu perintah berikut dari folder `tembak-paket-app/mobile`:
```bash
# Menggunakan npm script
npm run build:apk

# Atau langsung via EAS CLI
npx eas-cli build -p android --profile preview
```

EAS Build akan meng-compile binary APK native murni di cloud builder Expo.

### Langkah 3: Unduh Binary APK dan Tempatkan di Web
Setelah build selesai:
1. Unduh file `.apk` yang dihasilkan dari link dashboard EAS.
2. Salin/pindahkan file tersebut ke folder:
   `tembak-paket-app/frontend-v2/public/Ry-ITSolutions.apk`
3. Pengguna web dapat langsung mendownload APK native resmi melalui URL:
   - `https://domain-anda/Ry-ITSolutions.apk`
   - `https://domain-anda/download/apk`

---

## 4. Pembaruan OTA (Over-The-Air) Tanpa Rebuild APK
Setelah APK terpasang di perangkat Android pengguna, pembaruan fitur (UI, bug fix, logic) dapat dirilis instan tanpa mengharuskan pengguna mendownload ulang APK:
```bash
npm run update:publish
```
Aplikasi mobile telah dipasangi modul `expo-updates` yang secara otomatis mendeteksi bundle baru saat aplikasi dibuka (`checkAutomatically: ON_LOAD`).
