export default function IGTestiPreview() {
  const IG_URL = "https://www.instagram.com/unlocksinyalsolo";
  const HIGHLIGHTS = [
    { title: "TESTI OKT", img: "/ig-testi/ig-testi-0.jpg" },
    { title: "TESTI SEPT", img: "/ig-testi/ig-testi-1.jpg" },
    { title: "TESTI AUGU", img: "/ig-testi/ig-testi-2.jpg" },
    { title: "TESTI JULE", img: "/ig-testi/ig-testi-3.jpg" },
    { title: "TESTI JUNE", img: "/ig-testi/ig-testi-4.jpg" },
    { title: "TESTI MAY", img: "/ig-testi/ig-testi-5.jpg" },
    { title: "TESTI APRIL", img: "/ig-testi/ig-testi-6.jpg" },
  ];

  return (
    <div className="rounded-2xl border border-hairline bg-canvas p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <span className="text-xs font-bold text-ink">Testimoni Highlights</span>
        </div>
        <a
          href={IG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-rose-500 hover:underline flex items-center gap-1"
        >
          @unlocksinyalsolo
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>

      {/* Horizontal Highlights Row */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {HIGHLIGHTS.map((item) => (
          <a
            key={item.title}
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 transition-transform group-active:scale-95 shadow-sm">
              <div className="w-full h-full rounded-full bg-canvas p-[2px]">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
            <span className="text-[9px] font-bold text-ink-muted truncate w-16 text-center group-hover:text-ink">
              {item.title}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
