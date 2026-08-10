const fs = require('fs');

let c = fs.readFileSync('src/app/(main)/topup/page.tsx', 'utf8');

const regex = /<div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm">[\s\S]*?<\/div>/m;

const newHTML = \`<div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" alt="QRIS" className="h-5 object-contain" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Logo_OVO.svg" alt="OVO" className="h-3.5 object-contain" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg" alt="DANA" className="h-3.5 object-contain" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg" alt="GoPay" className="h-3.5 object-contain" />
                </div>
              </div>\`;

c = c.replace(regex, newHTML);
fs.writeFileSync('src/app/(main)/topup/page.tsx', c);
