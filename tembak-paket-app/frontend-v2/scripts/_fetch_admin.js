const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/ahmadzakiyox/webtembak-frontend-backup/main/admin_page.tsx', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if(data && data.includes('AdminPage')) {
            fs.writeFileSync('src/app/(main)/admin/page.tsx', data);
            console.log('Restored from backup');
        } else {
            console.log('Backup failed to load');
        }
    });
}).on('error', (e) => {
    console.log(e);
});