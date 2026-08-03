const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/dashboard/page.tsx', 'utf8');

// Cari posisi {/* Top Up Modal */}
const modalStart = c.indexOf('{/* Top Up Modal */}');
if (modalStart !== -1) {
    // Potong file dari awal sampai sebelum modalStart
    c = c.substring(0, modalStart);
    // Tambahkan penutup div dan penutup komponen yang benar
    c += '    </div>\n  );\n}\n';
}

fs.writeFileSync('src/app/(main)/dashboard/page.tsx', c);
console.log('Dashboard JSX cleaned up');
