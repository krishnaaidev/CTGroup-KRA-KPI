import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 220,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #312e81 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          borderRadius: 90,
          border: '14px solid white',
          letterSpacing: -6,
        }}
      >
        CT
      </div>
    ),
    {
      ...size,
    }
  );
}
