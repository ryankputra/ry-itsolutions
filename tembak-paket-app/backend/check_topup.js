const fs = require('fs');
const content = fs.readFileSync('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/backend/server.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('topup') || line.includes('payment-gateway')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
