const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/backend/database.sqlite');
db.all('SELECT * FROM settings WHERE key = "ceirgo_services_cache"', (err, rows) => {
  if (rows && rows.length > 0) {
    console.log(rows[0].value.substring(0, 500));
  } else {
    console.log('Not found in cache');
  }
});
