const fs = require('fs');

const replacement = `const ceirgoNameMapping: Record<string, string> = {
  'cek_validity': 'Cek Masa Aktif',
  'create_barcode_samsung': 'Barcode Samsung',
  'create_barcode_redmi': 'Barcode Redmi',
  'create_barcode_ios26': 'Barcode iOS 26',
  'cek_digi': 'Cek DIGI',
  'cek_sf': 'Cek SF',
  'create_barcode': 'Create Barcode',
  'cek_imei_beacukai': 'Cek IMEI Beacukai',
  'cek_history_imei': 'Cek Riwayat IMEI',
  'cek_imei': 'Cek Status IMEI'
};`;

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const ceirgoNameMapping: Record<string, string> = \{[\s\S]*?\};/m, replacement);
  fs.writeFileSync(file, content);
}

fixFile('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/cek-ceir/page.tsx');
fixFile('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/barcode/page.tsx');
console.log('Names updated successfully');
