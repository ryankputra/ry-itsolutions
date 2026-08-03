const fs = require('fs');

const popupCode = `Swal.fire({
      title: 'Saldo Tidak Mencukupi',
      text: 'Saldo Anda tidak mencukupi. Silakan Top Up terlebih dahulu.',
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

function applyPopup(file, varName) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('import Swal')) {
        content = content.replace('import { useApp } from "@/lib/store";', 'import { useApp } from "@/lib/store";\nimport Swal from "sweetalert2";');
    }
    const target = `if (user && user.balance < ${varName}) return setError("Saldo tidak mencukupi.");`;
    const newCode = `if (user && user.balance < ${varName}) {\n      ${popupCode}\n    }`;
    
    if (content.includes(target)) {
        content = content.replace(target, newCode);
        fs.writeFileSync(file, content);
        console.log('Replaced in ' + file);
    } else {
        console.log('Target not found in ' + file);
    }
}

applyPopup('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/unblock-imei/page.tsx', 'totalPrice');
applyPopup('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/cek-ceir/page.tsx', 'price');
applyPopup('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/frontend-v2/src/app/(main)/barcode/page.tsx', 'price');
