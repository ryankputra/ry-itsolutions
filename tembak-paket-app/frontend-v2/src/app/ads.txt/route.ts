import { NextResponse } from 'next/server';

export async function GET() {
  const content = 'google.com, pub-2898811488813299, DIRECT, f08c47fec0942fa0\n';
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
