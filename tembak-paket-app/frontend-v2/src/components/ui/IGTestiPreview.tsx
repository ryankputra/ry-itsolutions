export default function IGTestiPreview() {
  const IG_URL = "https://www.instagram.com/unlocksinyalsolo";
  const HIGHLIGHTS = ["TESTI SEPT '26", "TESTI AUG'26", "TESTI JULE '26", "TESTI JUNE '26"];
  const THUMBS = [0, 1, 2, 3, 4, 5, 6];

  return (
    <a
      href={IG_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-3xl border border-hairline bg-canvas overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.99] transition-transform"
    >
      {/* Header gradient IG */}
      <div className="p-5 bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400 text-white">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-white/30" />
            <img
              src="/ig-testi/ig-profile.jpg"
              alt="Foto profil Instagram unlocksinyalsolo"
              width={52}
              height={52}
              className="relative w-[52px] h-[52px] rounded-full object-cover ring-2 ring-white"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-[15px] truncate">unlocksinyalsolo</h3>
              <svg className="h-3.5 w-3.5 shrink-0 fill-white" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.2 14.6l-3.1-3.1 1.4-1.4 1.7 1.7 4.5-4.5 1.4 1.4-5.9 5.9z" /></svg>
            </div>
            <p className="text-[11px] text-white/90 font-medium truncate">add roamer.id · 72 followers</p>
          </div>
        </div>

        {/* Highlight rings */}
        <div className="flex gap-2.5 mt-4 overflow-x-auto no-scrollbar">
          {HIGHLIGHTS.map((h) => (
            <div key={h} className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24"><path d="M9 17.5l-5.5-5.5 1.4-1.4L9 14.7l9.1-9.1 1.4 1.4z" /></svg>
                </div>
              </div>
              <span className="text-[8.5px] font-bold text-white/95 whitespace-nowrap">{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid testi */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-bold text-ink flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 fill-rose-500" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          Ribuan testimoni asli pelanggan
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {THUMBS.map((i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-hairline">
              <img
                src={`/ig-testi/ig-testi-${i}.jpg`}
                alt={`Testimoni pelanggan add roamer ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[11px] font-black text-rose-600">
          Lihat semua testimoni di Instagram
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </div>
      </div>
    </a>
  );
}
