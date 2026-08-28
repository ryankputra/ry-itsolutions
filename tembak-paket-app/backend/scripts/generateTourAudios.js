const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const tourAudios = [
  {
    file: 'step_1.mp3',
    text: 'Halo! Selamat datang di Ry IT Solutions. Ini adalah kartu saldo Anda. Anda bisa melakukan isi saldo secara instan melalui QRIS otomatis dua puluh empat jam. Begitu transfer, saldo langsung masuk dalam hitungan detik tanpa perlu konfirmasi manual.'
  },
  {
    file: 'step_2.mp3',
    text: 'Ini adalah kolom pencarian cerdas. Cukup masukkan 15 digit nomor IMEI atau nomor pesanan Anda di sini, sistem akan langsung menampilkan tipe perangkat, status sinyal, dan riwayat transaksi secara real-time.'
  },
  {
    file: 'step_3.mp3',
    text: 'Menu Buka Sinyal IMEI adalah layanan utama kami untuk mengaktifkan kembali sinyal HP luar negeri all operator. Masukkan nomor IMEI, lampirkan foto bintang pagar nol enam pagar, pilih durasi yang diinginkan, dan pesanan Anda langsung kami proses.'
  },
  {
    file: 'step_4.mp3',
    text: 'Gunakan menu Cek Database CEIR untuk memeriksa histori registrasi dan database resmi Bea Cukai pada perangkat Anda sebelum aktivasi sinyal.'
  },
  {
    file: 'step_5.mp3',
    text: 'Setiap transaksi di sini dilengkapi dengan garansi digital resmi. Di menu ini, Anda bisa memantau sisa masa garansi, mengunduh nota PDF, ataupun menghubungi bantuan teknis kapan saja.'
  },
  {
    file: 'step_voucher.mp3',
    text: 'Ini adalah Pusat Klaim Voucher Promo. Anda bisa mengambil berbagai kupon potongan harga spesial di sini. Setelah diklaim, voucher bisa langsung Anda pasang saat checkout agar mendapatkan diskon otomatis.'
  },
  {
    file: 'step_6.mp3',
    text: 'Dapatkan penghasilan tambahan melalui Program Referral. Bagikan link referral Anda kepada teman atau pelanggan, dan nikmati komisi saldo otomatis pada setiap transaksi mereka.'
  }
];

async function generateSingle(item, outputDir, maxRetries = 3) {
  const destPath = path.join(outputDir, item.file);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}] Generating Studio HD Human Voice for ${item.file}...`);
      const tts = new MsEdgeTTS();
      await tts.setMetadata('id-ID-GadisNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(item.text, { rate: '+0%', pitch: '+0Hz' });

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destPath);
        audioStream.pipe(fileStream);
        audioStream.on('error', reject);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      const size = fs.statSync(destPath).size;
      console.log(`✅ [${item.file}] Saved Studio HD Human Audio (${size} bytes)`);
      return;
    } catch (err) {
      console.warn(`⚠️ [${item.file}] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      } else {
        throw err;
      }
    }
  }
}

async function generateAll() {
  const outputDir = path.join(__dirname, '../../frontend-v2/public/audio/tour');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎙️ Generating all 7 Realistic Studio HD Tour Audios (96kbps natural cadence)...');
  for (const item of tourAudios) {
    await generateSingle(item, outputDir);
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('🎉 All 7 Realistic Studio HD Audio files generated successfully!');
}

generateAll().catch((err) => {
  console.error('Fatal error generating audios:', err);
  process.exit(1);
});
