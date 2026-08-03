const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/unblock-imei/page.tsx', 'utf8');

c = c.replace(/prcData\.data\\[\\\`\\\$\{k\}_status\\\`\\]/g, "prcData.data[k + '_status']");
c = c.replace(/speedPricing\\[\\\`\\\$\{k\}_status\\\`\\]/g, "speedPricing[k + '_status']");
c = c.replace(/speedPricing\\[\\\`imei_speed_\\\$\{selectedSpeed\}\\\`\\]/g, "speedPricing['imei_speed_' + selectedSpeed]");
c = c.replace(/\\\`/g, '\`');
c = c.replace(/\\\$/g, '\$');

fs.writeFileSync('src/app/(main)/unblock-imei/page.tsx', c);
console.log('Fixed');