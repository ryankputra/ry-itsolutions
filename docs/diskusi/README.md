# Papan Diskusi Tim

Tempat "rapat" antar-agent untuk project RY IT Solutions. Setiap task non-trivial punya satu file diskusi di folder ini.

## Cara kerja
1. **Tech lead** membuat file `docs/diskusi/<slug-fitur>.md` dari `_TEMPLATE.md` dan mengisi Konteks, Tujuan, Batasan, Pertanyaan.
2. Setiap peran menulis **hanya di bagiannya sendiri**:
   - `## Pendapat UI/UX` — `ui-ux-designer`
   - `## Pendapat Frontend` — `frontend-developer`
   - `## Pendapat Backend` — `backend-developer`
   - `## Pendapat QA` — `qa-engineer`
3. Agent berikutnya **wajib membaca bagian sebelumnya** sebelum menulis, agar terjadi diskusi (bukan jawaban terpisah).
4. Jika ada perbedaan pendapat, tech lead menjalankan ronde kedua: tulis di `## Ronde 2`, lalu minta pihak terkait menanggapi.
5. **Tech lead** menulis `## Keputusan` (pilihan, alasan, pemilik tugas) dan `## Status deploy`.
6. Setelah selesai, status diubah menjadi `Selesai` atau `Diblokir`.

## Aturan
- Jangan menghapus pendapat pihak lain; tanggapi atau tambahkan koreksi di ronde berikutnya.
- Sertakan bukti: nama file, command, potongan log, atau link.
- Jangan menulis secret/token di file ini.
- Satu file = satu topik. Jangan gabungkan beberapa fitur.
- File diskusi ikut di-commit bersama perubahan kode.

## Konvensi nama
`docs/diskusi/YYYY-MM-DD-<slug>.md` — contoh: `2026-11-08-checkout-qris.md`

## Deployment
Semua perubahan (termasuk file diskusi) mengikuti deployment gate di `DEPLOY_STB.md`. Status deploy diisi dengan hasil verifikasi nyata, bukan asumsi.
