require('dotenv').config();
const db = require('better-sqlite3')('./database.sqlite');
const gwRow = db.prepare("SELECT value FROM settings WHERE key='paymentGateway'").get();
console.log('DB Setting paymentGateway:', gwRow ? gwRow.value : 'kosong');
console.log('GOPAY_GATEWAY_URL:', process.env.GOPAY_GATEWAY_URL);
console.log('GOPAY_GATEWAY_API_KEY:', process.env.GOPAY_GATEWAY_API_KEY);
