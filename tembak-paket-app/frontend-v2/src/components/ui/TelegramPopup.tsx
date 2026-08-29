'use client';  
import { useEffect } from 'react';  
import Swal from '@/lib/sweetalert';  
  
export default function TelegramPopup() {  
  useEffect(() => {
    const hasShown = localStorage.getItem('shownTelegramPopup');  
    if (!hasShown) {  
      Swal.fire({  
        title: 'Gabung Komunitas!',  
        text: 'Dapatkan update terbaru dan promo eksklusif dengan bergabung ke grup Telegram kami.',  
        icon: 'info',  
        showCancelButton: true,  
        confirmButtonText: 'Join Grup',  
        cancelButtonText: 'Nanti saja'  
      }).then((result) => {
        if (result.isConfirmed) {  
          window.open('https://t.me/unblockimeirystore', '_blank');  
        }  
        localStorage.setItem('shownTelegramPopup', 'true');  
      });  
    }  
  }, []);  
  return null;  
}
