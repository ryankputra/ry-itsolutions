import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RY IT Solution - Solusi Digital & Layanan Premium';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            RY
          </div>
          <span style={{ fontSize: '48px', fontWeight: 'bold', letterSpacing: '-1px' }}>
            RY IT Solution
          </span>
        </div>
        <p
          style={{
            fontSize: '24px',
            color: '#94a3b8',
            maxWidth: '800px',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Solusi Digital Terpercaya: Unblock IMEI, Cek Garansi Digital, dan Layanan Server High-Performance.
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
