const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/admin/page.tsx', 'utf8');

// 1. Fix duplicated Ceirgo states
const stateBlockRegex = /\/\/ Ceirgo Admin Top Up State[\s\S]*?const \[ceirgoPaymentData, setCeirgoPaymentData\] = useState<any>\(null\);/g;
let matches = c.match(stateBlockRegex);
if (matches && matches.length > 1) {
    // Keep first, remove subsequent
    let firstFound = false;
    c = c.replace(stateBlockRegex, (match) => {
        if (!firstFound) {
            firstFound = true;
            return match;
        }
        return '';
    });
}

// 2. Fix null index typing (selectedPkgIndex bisa null)
c = c.replace(/packages\[selectedPkgIndex\]/g, 'packages[selectedPkgIndex!]');

// 3. Fix manualActionData spread errors (harus dipastikan tidak null sebelum di spread)
c = c.replace(
    /setManualActionData\(\{...manualActionData, status: e\.target\.value\}\)/g,
    'setManualActionData(prev => prev ? {...prev, status: e.target.value} : null)'
);
c = c.replace(
    /setManualActionData\(\{...manualActionData, note: e\.target\.value\}\)/g,
    'setManualActionData(prev => prev ? {...prev, note: e.target.value} : null)'
);
c = c.replace(
    /setManualActionData\(\{...manualActionData, file: e\.target\.files\?\.\[0\] \|\| null\}\)/g,
    'setManualActionData(prev => prev ? {...prev, file: e.target.files?.[0] || null} : null)'
);

c = c.replace(/manualActionData\.status/g, 'manualActionData?.status || "pending"');
c = c.replace(/manualActionData\.note/g, 'manualActionData?.note || ""');
c = c.replace(/manualActionData\.file/g, 'manualActionData?.file');

// 4. Fix providerBalances.kmsp / ceirgo toLocaleString (karena defaultnya { kmsp: null, ceirgo: null } typescript nganggap type never)
c = c.replace(
    /const \[providerBalances, setProviderBalances\] = useState\(\{ kmsp: null, ceirgo: null \}\);/,
    'const [providerBalances, setProviderBalances] = useState<{kmsp: number | null, ceirgo: number | null}>({ kmsp: null, ceirgo: null });'
);

fs.writeFileSync('src/app/(main)/admin/page.tsx', c);
console.log('Fixes applied.');
