const fs = require('fs');
let c = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

const regexBeliPaket = /\{\s*name:\s*"Beli Paket"[\s\S]*?\},/m;
c = c.replace(regexBeliPaket, (match) => {
    return `...(menuSettings.showBeliPaket ? [${match}] : []),`;
});

fs.writeFileSync('src/components/layout/Sidebar.tsx', c);
console.log('Sidebar patched');
