const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// 1. Kita ganti logic pemetaan ceirgoServiceCode agar mencakup semua
// dan juga payload untuk orderCeirgo supaya bisa nangani input array barcode
const orderCeirgoRegex = /async function orderCeirgo\(serviceCode, imei\) \{[\s\S]*?try \{[\s\S]*?const response = await axios\.post\(\\\`\\\$\\{CEIRGO_BASE_URL\\}\/api\/order\\\`, \{[\s\S]*?code: serviceCode,[\s\S]*?data: \{ imeis: \[imei\] \}[\s\S]*?\}, \{/m;

const newOrderCeirgo = `// --- CEIRGO GATEWAY API ---
async function orderCeirgo(serviceCode, payloadData) {
    if (!CEIRGO_API_KEY) throw new Error("CEIRGO_API_KEY tidak dikonfigurasi di .env");
    
    try {
        const response = await axios.post(\`\${CEIRGO_BASE_URL}/api/order\`, {
            code: serviceCode,
            data: payloadData // payloadData sekarang utuh, dikirim dari bawah
        }, {`;

c = c.replace(orderCeirgoRegex, newOrderCeirgo);


const manualOrderLogicRegex = /if \(service_type === 'ceir'\) \{[\s\S]*?const ceirgoServiceCode = [\s\S]*?const ceirResponse = await orderCeirgo\(ceirgoServiceCode, imei\);/m;

const newManualOrderLogic = `if (service_type === 'ceir') {
                try {
                    // Mapping service code langsung dari frontend price_key
                    let ceirgoServiceCode = price_key;
                    if (price_key === 'price_ceir_register') ceirgoServiceCode = 'cek_imei_beacukai';
                    if (price_key === 'price_ceir_history') ceirgoServiceCode = 'cek_history_imei';

                    let payloadData = {};
                    const isBarcode = ceirgoServiceCode.includes('barcode');

                    if (isBarcode) {
                        // Jika layanan barcode, payload nya { items: [{ primary_imei, secondary_imei, theme }] }
                        // Kita asumsikan secondary_imei dikirim via req.body.imei2
                        payloadData = {
                            items: [{
                                primary_imei: imei,
                                secondary_imei: req.body.imei2 || imei,
                                theme: req.body.theme || "dark"
                            }]
                        };
                    } else {
                        // Layanan biasa
                        payloadData = { imeis: [imei] };
                    }

                    const ceirResponse = await orderCeirgo(ceirgoServiceCode, payloadData);`;

c = c.replace(manualOrderLogicRegex, newManualOrderLogic);


// 2. Parse hasil dari Barcode
const resultParserRegex = /\} else if \(ceirgoServiceCode === 'cek_validity' && Array\.isArray\(resultObj\)\) \{[\s\S]*?\} else \{[\s\S]*?\/\/ Untuk SF, DIGI, dll/m;

const newResultParser = `} else if (ceirgoServiceCode === 'cek_validity' && Array.isArray(resultObj)) {
                            const resultItem = resultObj.find(r => r.imei === imei);
                            adminNote = \`Status: \${resultItem?.status || 'UNKNOWN'} | Valid Until: \${resultItem?.valid_until || 'N/A'}\`;
                        } else if (isBarcode && resultObj && resultObj.items && Array.isArray(resultObj.items)) {
                            // Untuk layanan barcode
                            const item = resultObj.items[0];
                            if (item && item.url) {
                                adminImagePath = item.url; // Langsung masukkan URL asli dari Ceirgo ke kolom admin_image!
                                adminNote = \`Barcode berhasil di-generate. Silakan lihat gambar.\`;
                            } else {
                                adminNote = \`Gagal me-render Barcode.\`;
                            }
                        } else {
                            // Untuk SF, DIGI, dll`;

c = c.replace(resultParserRegex, newResultParser);

fs.writeFileSync('server.js', c);
console.log('Backend patched for all CEIR services');
