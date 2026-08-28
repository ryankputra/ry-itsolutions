const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const tourAudios = [
  {
    file: 'step_1.mp3',
    text: 'Selamat datang di Ry IT Solutions. Ini adalah pusat kendali saldo Anda. Lakukan top up otomatis 24 jam via QRIS Nasional, dan saldo akan langsung bertambah seketika dalam hitungan detik tanpa menunggu konfirmasi manual.'
  },
  {
    file: 'step_2.mp3',
    text: 'Kolom pencarian cerdas. Cukup ketik atau tempelkan 15 digit nomor IMEI ataupun ID transaksi Anda, maka sistem akan mendeteksi status sinyal, tipe perangkat, dan riwayat pesanan secara instan.'
  },
  {
    file: 'step_3.mp3',
    text: 'Layanan unggulan Buka Sinyal IMEI All Operator. Masukkan nomor IMEI, unggah tangkapan layar verifikasi, dan tentukan durasi masa aktif yang Anda butuhkan. Proses cepat dan bergaransi resmi.'
  },
  {
    file: 'step_4.mp3',
    text: 'Pemeriksaan Database CEIR dan Bea Cukai. Pastikan histori registrasi dan legalitas perangkat Anda terverifikasi sebelum melakukan aktivasi sinyal.'
  },
  {
    file: 'step_5.mp3',
    text: 'Perlindungan Garansi Digital. Di sini Anda dapat memantau sisa masa aktif garansi, mengunduh nota transaksi resmi, hingga mengajukan bantuan teknis prioritas kapan pun dibutuhkan.'
  },
  {
    file: 'step_voucher.mp3',
    text: 'Pusat Klaim Voucher Promo. Ambil berbagai kupon potongan harga spesial sebelum kuota klaim habis, dan pasang langsung saat checkout pesanan untuk menikmati diskon instan.'
  },
  {
    file: 'step_6.mp3',
    text: 'Program Referral dan Kemitraan. Bagikan tautan referral eksklusif Anda, dan raih komisi saldo otomatis tanpa batas di setiap transaksi pengguna baru.'
  }
];

async function generateSingle(item, outputDir, maxRetries = 3) {
  const destPath = path.join(outputDir, item.file);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}] Generating cinematic male voice for ${item.file}...`);
      const tts = new MsEdgeTTS();
      await tts.setMetadata('id-ID-ArdiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(item.text);

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destPath);
        audioStream.pipe(fileStream);
        audioStream.on('error', reject);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      const size = fs.statSync(destPath).size;
      console.log(`✅ [${item.file}] Saved (${size} bytes) with ArdiNeural voice`);
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

  console.log('🎙️ Starting generation of Cinematic Male Narrator audios (id-ID-ArdiNeural)...');
  for (const item of tourAudios) {
    await generateSingle(item, outputDir);
    // Small delay between requests to ensure clean connection
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('🎬 All 7 Cinematic Male Narrator audio files generated successfully!');
}

generateAll().catch((err) => {
  console.error('Fatal error generating audios:', err);
  process.exit(1);
});
