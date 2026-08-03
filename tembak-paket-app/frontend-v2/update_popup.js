const fs = require('fs');

const popupCode = `Swal.fire({
      title: 'Saldo Tidak Mencukupi',
      text: 'Saldo Anda kurang untuk melakukan pesanan ini. Silakan isi saldo terlebih dahulu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Top Up Sekarang',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/topup');
      }
    });
    return setError('Saldo tidak mencukupi.');`;

function replaceInFile(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('import Swal')) {
        content = content.replace('import { useApp } from "@/lib/store";', 'import { useApp } from "@/lib/store";\nimport Swal from "sweetalert2";');
    }
    
    // Exact match for the error return logic
    const oldCode = 'if (user && user.balance < price) return setError("Saldo tidak mencukupi.");';
    const newCode = `if (user && user.balance < price) {\n      ${popupCode}\n    }`;
    
    if (content.includes(oldCode)) {
        content = content.replace(oldCode, newCode);
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    } else {
        console.log('Target code not found in ' + file);
    }
}

replaceInFile('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/unblock-imei/page.tsx');
replaceInFile('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/cek-ceir/page.tsx');
replaceInFile('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/barcode/page.tsx');
