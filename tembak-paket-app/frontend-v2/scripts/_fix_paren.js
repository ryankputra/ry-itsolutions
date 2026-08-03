const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/admin/page.tsx', 'utf8');
c = c.replace(/                  \)\)\r?\n                \)\}/g, "                  )))\n                }");
c = c.replace(/                  \)\)\n                \)\}/g, "                  )))\n                }");
fs.writeFileSync('src/app/(main)/admin/page.tsx', c);
console.log('Done');