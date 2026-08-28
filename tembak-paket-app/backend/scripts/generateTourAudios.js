const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const tourAudios = [
  {
    file: 'step_1.mp3',
    text: 'Halo! Selamat datang di Ry IT Solutions. Ini adalah kartu saldo Anda. Anda dapat mengisi saldo kapan saja secara otomatis melalui QRIS 24 jam. Saldo akan langsung bertambah dalam hitungan detik tanpa perlu konfirmasi manual.'
  },
  {
    file: 'step_2.mp3',
    text: 'Ini adalah kolom pencarian cerdas. Anda cukup mengetik atau menempelkan 15 digit nomor IMEI ataupun ID transaksi untuk mengecek tipe perangkat, status sinyal, dan riwayat pesanan secara instan.'
  },
  {
    file: 'step_3.mp3',
    text: 'Menu Buka IMEI adalah layanan utama kami untuk mengaktifkan kembali sinyal HP luar negeri all operator. Masukkan nomor IMEI, upload screenshot bintang pagar nol enam pagar, dan pilih durasi aktif yang Anda inginkan.'
  },
  {
    file: 'step_4.mp3',
    text: 'Gunakan menu Cek Database CEIR untuk memeriksa histori registrasi dan database resmi perangkat Anda sebelum melakukan aktivasi sinyal.'
  },
  {
    file: 'step_5.mp3',
    text: 'Setiap pesanan dilengkapi garansi digital. Di menu Cek Garansi, Anda bisa memantau sisa masa aktif, mengunduh nota resmi, atau mengajukan bantuan teknis kapan saja.'
  },
  {
    file: 'step_voucher.mp3',
    text: 'Ini adalah Pusat Klaim Voucher Promo. Anda bisa mengklaim berbagai kupon potongan harga spesial di sini. Setelah diklaim, voucher bisa langsung Anda pasang saat melakukan pemesanan agar mendapat diskon otomatis!'
  },
  {
    file: 'step_6.mp3',
    text: 'Dapatkan penghasilan tambahan melalui Program Referral! Bagikan link referral unik Anda ke teman atau pelanggan, dan nikmati komisi saldo otomatis di setiap transaksi mereka.'
  }
];

async function generate() {
  const outputDir = path.join(__dirname, '../../frontend-v2/public/audio/tour');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const item of tourAudios) {
    const destPath = path.join(outputDir, item.file);
    console.log(`Generating audio for ${item.file}...`);
    const tts = new MsEdgeTTS();
    await tts.setMetadata('id-ID-GadisNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(item.text);
    
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(destPath);
      audioStream.pipe(fileStream);
      audioStream.on('error', reject);
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    console.log(`✅ Saved ${item.file} (${fs.statSync(destPath).size} bytes)`);
  }
  console.log('🎉 All 6 Neural AI Tour audio files successfully generated!');
}

generate().catch(err => {
  console.error('Error generating audio:', err);
  process.exit(1);
});
