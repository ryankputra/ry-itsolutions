const fs = require('fs');
let c = fs.readFileSync('src/lib/store.tsx', 'utf8');

c = c.replace(/sse\.addEventListener\("balance_update"[\s\S]*?\}\);\s*sse\.addEventListener\("transaction_status"[\s\S]*?\}\);/m, 
`    sse.addEventListener("balance_update", (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (typeof payload.balance === "number") {
          setUser(prev => {
            if (prev && payload.balance > prev.balance) {
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                new Notification("Saldo Masuk! 🎉", {
                  body: \`Saldo Anda bertambah. Saldo baru: Rp \${payload.balance.toLocaleString('id-ID')}\`,
                  icon: "/icon-192.png"
                });
              }
            }
            return prev ? { ...prev, balance: payload.balance } : null;
          });
        }
      } catch (err) {}
    });

    sse.addEventListener("transaction_status", (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.status === "completed" || payload.status === "success") {
           if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Transaksi Sukses! ✅", {
                body: payload.message || \`Transaksi \${payload.type || ''} telah berhasil diproses.\`,
                icon: "/icon-192.png"
              });
           }
        }
      } catch (err) {}
    });`);

fs.writeFileSync('src/lib/store.tsx', c);
console.log('Store patched');
