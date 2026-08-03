const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/admin/page.tsx', 'utf8');

c = c.replace(/newPkgs\[selectedPkgIndex\]/g, 'newPkgs[selectedPkgIndex!]');

fs.writeFileSync('src/app/(main)/admin/page.tsx', c);
console.log('Fixes 2 applied.');