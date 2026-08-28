const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const tourAudios = [
  {
    file: 'step_1.mp3',
    text: 'Halo guys! Ini dompet saldo kamu nih. Mau top up? Gak pake ribet, langsung scan QRIS 24 jam dan saldo auto masuk detik itu juga. No drama nunggu admin!'
  },
  {
    file: 'step_2.mp3',
    text: 'Nah, ini fitur search sat-set! Tinggal tempel 15 digit IMEI atau ID order kamu, sistem bakal langsung spill status sinyal dan tipe HP kamu dalam sekejap.'
  },
  {
    file: 'step_3.mp3',
    text: 'Mau unblock sinyal HP inter all operator? Gas di menu ini! Masukkan IMEI, upload foto bintang pagar nol enam pagar, pilih durasi, dan sinyal kamu langsung on lagi.'
  },
  {
    file: 'step_4.mp3',
    text: 'Sebelum eksekusi, kamu bisa kepoin dulu status IMEI di database CEIR dan Bea Cukai lewat menu ini. Dijamin akurat dan transparan!'
  },
  {
    file: 'step_5.mp3',
    text: 'Tenang aja, semua order di sini ada garansi resminya lho! Kamu bisa cek sisa garansi, download nota PDF, atau chat bantuan teknis kapan aja.'
  },
  {
    file: 'step_voucher.mp3',
    text: 'Ini dia surganya diskon! Klaim semua voucher promo spesial di sini sekarang sebelum kehabisan kuota, terus langsung pasang pas checkout biar makin hemat dan cuan!'
  },
  {
    file: 'step_6.mp3',
    text: 'Mau dapet cuan pasif tiap hari? Share link referral kamu ke temen-temen. Tiap kali mereka order, komisi saldo langsung ngalir ke akun kamu. Auto cuan maksimal!'
  }
];

async function generateSingle(item, outputDir, maxRetries = 3) {
  const destPath = path.join(outputDir, item.file);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}] Generating Gen Z voice for ${item.file}...`);
      const tts = new MsEdgeTTS();
      await tts.setMetadata('id-ID-ArdiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(item.text, { rate: '+8%', pitch: '+3Hz' });

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destPath);
        audioStream.pipe(fileStream);
        audioStream.on('error', reject);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      const size = fs.statSync(destPath).size;
      console.log(`✅ [${item.file}] Saved (${size} bytes) with Gen Z ArdiNeural`);
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

  console.log('⚡ Generating all 7 Gen Z persona tour audios (sat-set & relatable)...');
  for (const item of tourAudios) {
    await generateSingle(item, outputDir);
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('🚀 All 7 Gen Z Tour audio files generated successfully!');
}

generateAll().catch((err) => {
  console.error('Fatal error generating audios:', err);
  process.exit(1);
});
