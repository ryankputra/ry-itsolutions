const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/dashboard/page.tsx', 'utf8');

// Hapus bagian modal Top Up dari return
const modalStart = c.indexOf('{/* Top Up Modal */}');
if (modalStart !== -1) {
    const mainEnd = c.lastIndexOf('</div>\r\n  );\r\n}');
    if (mainEnd !== -1) {
        c = c.substring(0, modalStart) + '    </div>\r\n  );\r\n}';
    }
}

// Hapus state dan handler top up lama yang tidak terpakai
c = c.replace(/const \[showTopUp, setShowTopUp\] = useState\(false\);[\s\S]*?const \[topUpSuccess, setTopUpSuccess\] = useState\(false\);/m, '');
c = c.replace(/const handleRequestQris[\s\S]*?finally \{ setLoadingTopUp\(false\); \}\r\n  \};/m, '');
c = c.replace(/const handleCloseTopUp[\s\S]*?setErrorTopUp\(""\);\r\n  \};/m, '');
c = c.replace(/\/\/ Listen for realtime balance updates[\s\S]*?\}, \[user\?\.balance, showTopUp, qrisData\]\);/m, '');

fs.writeFileSync('src/app/(main)/dashboard/page.tsx', c);
console.log('Dashboard cleaned up');
